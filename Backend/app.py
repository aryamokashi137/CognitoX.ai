import os
import json
import pickle
import datetime
import traceback
import numpy as np
from typing import List, Optional, Dict

from fastapi import FastAPI, HTTPException, Depends, Request, Response, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlmodel import Field, SQLModel, Session, create_engine, select
from google import genai
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash, check_password_hash
import jwt

# Load environment variables from .env file
load_dotenv()

# FastAPI Initialization
app = FastAPI(title="CognitoX.ai API", description="AI-powered Learning Intelligence API", version="1.0.0")

# CORS Middleware config
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For production, restrict this to specific origins (e.g. localhost:5173)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SECRET_KEY = os.getenv('SECRET_KEY', 'cognitox_secret_key_123')
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')

# Initialize the Gemini Client if key is available
client = None
available_models = ["models/gemini-2.0-flash", "models/gemini-1.5-flash"]

if GEMINI_API_KEY and GEMINI_API_KEY != "YOUR_GEMINI_API_KEY_HERE":
    try:
        client = genai.Client(api_key=GEMINI_API_KEY, http_options={'api_version': 'v1'})
        print("FastAPI: GenAI Client initialized successfully.")
        
        # Load available models in background
        detected_models = []
        for m in client.models.list():
            if 'gemini' in m.name.lower():
                detected_models.append(m.name)
        if detected_models:
            available_models = detected_models
            print(f"FastAPI: Detected models: {available_models}")
    except Exception as e:
        print(f"Warning: Gemini initialization failed: {e}")

# Database Configuration with SQLModel
DB_PATH = os.path.join(os.path.dirname(__file__), 'database.db')
DATABASE_URL = f"sqlite:///{DB_PATH}"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

# SQLModel Definitions (Maps exactly to the old SQLite table structures)
class User(SQLModel, table=True):
    __tablename__ = "users"
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True)
    email: str = Field(unique=True)
    password: str

class Prediction(SQLModel, table=True):
    __tablename__ = "predictions"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id")
    learning_ability: str
    recommended_strategy: str
    input_features: str
    timestamp: datetime.datetime = Field(
        default_factory=lambda: datetime.datetime.now(datetime.UTC)
    )

class Habit(SQLModel, table=True):
    __tablename__ = "habits"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id")
    name: str

class HabitLog(SQLModel, table=True):
    __tablename__ = "habit_logs"
    id: Optional[int] = Field(default=None, primary_key=True)
    habit_id: int = Field(foreign_key="habits.id")
    date_str: str

# Create Database tables
def init_db():
    SQLModel.metadata.create_all(engine)
    
init_db()

# DB Session Dependency
def get_session():
    with Session(engine) as session:
        yield session

# Security JWT token decoder dependency
security_bearer = HTTPBearer(auto_error=False)

def get_current_user_id(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer)) -> int:
    if not credentials:
        raise HTTPException(status_code=401, detail="Authorization credentials missing")
    
    token = credentials.credentials
    try:
        data = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return data['user_id']
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except Exception:
        raise HTTPException(status_code=401, detail="Token is invalid")

# Scikit-learn Model Loader
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'models', 'learning_ability_model.pkl')

class DummyModel:
    def predict(self, features):
        return [["Visual Learner", "Microlearning Strategy"]]

if os.path.exists(MODEL_PATH):
    try:
        with open(MODEL_PATH, 'rb') as f:
            ml_model = pickle.load(f)
        print(f"ML Model loaded successfully from {MODEL_PATH}")
    except Exception as e:
        print(f"Failed to load model. Error: {e}")
        ml_model = DummyModel()
else:
    ml_model = DummyModel()
    print("Warning: ML model not found. Using DummyModel.")

# Pydantic Schemas
class RegisterSchema(BaseModel):
    username: str
    email: str
    password: str

class LoginSchema(BaseModel):
    username: str
    password: str

class PredictSchema(BaseModel):
    features: List[float]

class HabitCreateSchema(BaseModel):
    name: str

class HabitLogToggleSchema(BaseModel):
    habit_id: int
    date_str: str

# API Endpoints

@app.get('/api/health')
def health_check():
    """Health check endpoint for API monitoring."""
    return {"status": "healthy", "message": "CognitoX.ai FastAPI backend is running!"}

@app.post('/api/register', status_code=201)
def register(data: RegisterSchema, db: Session = Depends(get_session)):
    """Registers a new student user."""
    # Check if username or email exists
    statement = select(User).where((User.username == data.username) | (User.email == data.email))
    existing_user = db.exec(statement).first()
    if existing_user:
        raise HTTPException(status_code=409, detail="Username or email already exists!")
    
    hashed_pwd = generate_password_hash(data.password)
    new_user = User(username=data.username, email=data.email, password=hashed_pwd)
    
    db.add(new_user)
    db.commit()
    return {"message": "User created successfully!"}

@app.post('/api/login')
def login(data: LoginSchema, db: Session = Depends(get_session)):
    """Authenticates the student credentials and returns a JWT token."""
    statement = select(User).where(User.username == data.username)
    user = db.exec(statement).first()
    
    if not user or not check_password_hash(user.password, data.password):
        raise HTTPException(status_code=401, detail="Invalid username or password")
        
    token = jwt.encode(
        {
            'user_id': user.id, 
            'exp': datetime.datetime.now(datetime.UTC) + datetime.timedelta(hours=24)
        }, 
        SECRET_KEY, 
        algorithm="HS256"
    )
    return {"token": token, "username": user.username}

@app.get('/api/dashboard')
def get_dashboard(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_session)):
    """Retrieve history of predictions for the currently logged-in user."""
    statement = select(Prediction).where(Prediction.user_id == user_id).order_by(Prediction.timestamp.desc())
    predictions = db.exec(statement).all()
    
    history = [
        {
            "learning_ability": p.learning_ability, 
            "strategy": p.recommended_strategy, 
            "timestamp": p.timestamp.isoformat(), 
            "features": json.loads(p.input_features) if p.input_features else None
        } 
        for p in predictions
    ]
    return {'history': history}

@app.get('/api/ai/deep-dive')
def get_ai_deep_dive(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_session)):
    """Generates a personalized deep-dive for the user's latest strategy using Gemini."""
    if not GEMINI_API_KEY or GEMINI_API_KEY == "YOUR_GEMINI_API_KEY_HERE" or client is None:
        raise HTTPException(
            status_code=501, 
            detail="Gemini API key is not configured. Add a valid GEMINI_API_KEY to the Backend/.env file."
        )

    statement = select(Prediction).where(Prediction.user_id == user_id).order_by(Prediction.timestamp.desc())
    latest = db.exec(statement).first()
    
    if not latest:
        raise HTTPException(status_code=404, detail="No learning profile found. Please take the questionnaire first.")
        
    ability = latest.learning_ability
    strategy = latest.recommended_strategy
    
    prompt = f"""
    User Learning Profile:
    - Predicted Ability: {ability}
    - Recommended Strategy: {strategy}
    
    The user took a 12-question questionnaire. Based on their answers, the ML model assigned this strategy.
    Please provide a 'Deep Dive' guide to the student.
    1. Explain in 2-3 sentences WHY this strategy ({strategy}) is perfect for a {ability}.
    2. Give 3 actionable, concrete 'Today's Steps' they can take to apply this strategy.
    
    Keep the tone encouraging, professional, and concise. Use Markdown formatting.
    """
    
    explanation = None
    used_model = None
    
    for model_name in available_models:
        try:
            print(f"FastAPI: Trying model {model_name}...")
            response = client.models.generate_content(model=model_name, contents=prompt)
            explanation = response.text
            used_model = model_name
            break
        except Exception as e:
            error_msg = str(e)
            print(f"FastAPI: Model {model_name} failed: {error_msg}")
            if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
                raise HTTPException(
                    status_code=429,
                    detail="Your Gemini API key has exceeded its daily/per-minute quota. Please check your usage."
                )
            continue
            
    if not explanation:
        raise HTTPException(status_code=503, detail="All available AI models failed to generate content.")
        
    print(f"FastAPI: AI Deep Dive successful using {used_model}.")
    return {
        "status": "success",
        "explanation": explanation,
        "strategy": strategy,
        "ability": ability
    }

@app.get('/api/habits')
def get_habits(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_session)):
    """Retrieve all habits and habit logs for the user."""
    statement = select(Habit).where(Habit.user_id == user_id)
    habits_list = db.exec(statement).all()
    
    logs = {}
    for h in habits_list:
        log_statement = select(HabitLog).where(HabitLog.habit_id == h.id)
        logs[str(h.id)] = {item.date_str: True for item in db.exec(log_statement).all()}
        
    return {
        "habits": [{"id": str(h.id), "name": h.name} for h in habits_list],
        "logs": logs
    }

@app.post('/api/habits', status_code=201)
def create_habit(data: HabitCreateSchema, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_session)):
    """Creates a new habit for tracking."""
    new_habit = Habit(user_id=user_id, name=data.name)
    db.add(new_habit)
    db.commit()
    db.refresh(new_habit)
    return {"id": str(new_habit.id), "name": new_habit.name}

@app.delete('/api/habits')
def delete_habit(id: int, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_session)):
    """Deletes an existing habit and its associated logged calendar entries."""
    # Verify ownership
    habit_stmt = select(Habit).where((Habit.id == id) & (Habit.user_id == user_id))
    habit = db.exec(habit_stmt).first()
    if not habit:
        raise HTTPException(status_code=403, detail="Unauthorized or habit not found")
        
    # Delete logs
    log_stmt = select(HabitLog).where(HabitLog.habit_id == id)
    for log in db.exec(log_stmt).all():
        db.delete(log)
        
    db.delete(habit)
    db.commit()
    return {"status": "deleted"}

@app.post('/api/habits/log')
def toggle_habit_log(data: HabitLogToggleSchema, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_session)):
    """Toggles (logs or unlogs) a habit entry for a calendar date."""
    # Verify ownership
    habit_stmt = select(Habit).where((Habit.id == data.habit_id) & (Habit.user_id == user_id))
    habit = db.exec(habit_stmt).first()
    if not habit:
        raise HTTPException(status_code=403, detail="Unauthorized or habit not found")
        
    # Check if log already exists
    log_stmt = select(HabitLog).where((HabitLog.habit_id == data.habit_id) & (HabitLog.date_str == data.date_str))
    log = db.exec(log_stmt).first()
    
    if log:
        db.delete(log)
        status = False
    else:
        new_log = HabitLog(habit_id=data.habit_id, date_str=data.date_str)
        db.add(new_log)
        status = True
        
    db.commit()
    return {"status": status}

@app.post('/api/predict')
def predict_learning_ability(
    data: PredictSchema, 
    request: Request,
    db: Session = Depends(get_session)
):
    """
    Predicts learning ability based on 12 assessment questions.
    If a valid JWT token is sent, saves the result to user history.
    """
    if len(data.features) != 12:
        raise HTTPException(status_code=400, detail="Exactly 12 numerical features are required")
        
    try:
        features_array = np.array(data.features).reshape(1, -1)
        prediction = ml_model.predict(features_array)
        
        ability = prediction[0][0] if len(prediction[0]) > 0 else "Unknown Ability"
        strategy = prediction[0][1] if len(prediction[0]) > 1 else "Standard Strategy"
        
        # Save to database if auth header is present
        auth_header = request.headers.get('Authorization')
        if auth_header:
            try:
                token = auth_header.split(" ")[1] if " " in auth_header else auth_header
                decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
                user_id = decoded['user_id']
                
                new_prediction = Prediction(
                    user_id=user_id,
                    learning_ability=str(ability),
                    recommended_strategy=str(strategy),
                    input_features=json.dumps(data.features)
                )
                db.add(new_prediction)
                db.commit()
            except Exception as db_err:
                print(f"FastAPI: Could not save prediction to db: {db_err}")
                
        return {
            "status": "success",
            "learning_ability": str(ability),
            "recommended_strategy": str(strategy)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

# Mount static files folder to support legacy directories
legacy_frontend = os.path.join(os.path.dirname(__file__), '..', 'Frontend')
if os.path.exists(legacy_frontend):
    app.mount("/Frontend", StaticFiles(directory=legacy_frontend), name="legacy_frontend")

if __name__ == '__main__':
    import uvicorn
    # Use environment port or default to 5000
    port = int(os.environ.get('PORT', 5000))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=True)
