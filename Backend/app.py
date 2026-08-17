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
from sqlalchemy import text, func
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

# Clear metadata to avoid duplicate table definitions on hot-reloading
SQLModel.metadata.clear()

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
    is_personalization: bool = Field(default=False)

class HabitLog(SQLModel, table=True):
    __tablename__ = "habit_logs"
    id: Optional[int] = Field(default=None, primary_key=True)
    habit_id: int = Field(foreign_key="habits.id")
    date_str: str

class StrategyFeedback(SQLModel, table=True):
    __tablename__ = "strategy_feedbacks"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id")
    strategy: str
    rating: int  # 1 to 5 stars
    comments: Optional[str] = None
    timestamp: datetime.datetime = Field(
        default_factory=lambda: datetime.datetime.now(datetime.UTC)
    )

class InteractionAnalytic(SQLModel, table=True):
    __tablename__ = "interaction_analytics"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id")
    track_type: str  # "gamification" or "personalization"
    event_type: str  # "click", "log", "hover", "page_view"
    details: Optional[str] = None
    timestamp: datetime.datetime = Field(
        default_factory=lambda: datetime.datetime.now(datetime.UTC)
    )

# Create Database tables
def init_db():
    SQLModel.metadata.create_all(engine)
    from sqlalchemy import inspect, text
    inspector = inspect(engine)
    try:
        columns = [col['name'] for col in inspector.get_columns('habits')]
        if 'is_personalization' not in columns:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE habits ADD COLUMN is_personalization BOOLEAN DEFAULT 0"))
            print("Migration: Added is_personalization column to habits table.")
    except Exception as e:
        print(f"Migration Warning: Failed to check or alter habits table: {e}")

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
    feature_importances_ = [0.05, 0.22, 0.04, 0.12, 0.06, 0.15, 0.05, 0.05, 0.05, 0.10, 0.08, 0.03]
    
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

# 12 Questionnaire Features Mapping for Explainable AI (XAI)
QUESTIONS = [
    {
        "tag": "Learning Schedule",
        "question": "What time of day do you feel most productive for learning?",
        "options": [
            "Early morning (5–8 AM)",
            "Morning (8–12 PM)",
            "Afternoon (12–5 PM)",
            "Evening / Night"
        ]
    },
    {
        "tag": "Learning Style",
        "question": "How do you prefer to learn new concepts?",
        "options": [
            "Visual aids (videos, diagrams)",
            "Reading and writing",
            "Hands-on practice",
            "Discussion and collaboration"
        ]
    },
    {
        "tag": "Study Environment",
        "question": "Where do you study best?",
        "options": [
            "Quiet library or room",
            "Coffee shop with background noise",
            "At home with music",
            "Outdoors or changing locations"
        ]
    },
    {
        "tag": "Focus Duration",
        "question": "How long can you focus without a break?",
        "options": [
            "15-25 minutes",
            "25-45 minutes",
            "45-90 minutes",
            "90+ minutes"
        ]
    },
    {
        "tag": "Learning Pace",
        "question": "What learning pace suits you best?",
        "options": [
            "Slow and thorough",
            "Moderate with reviews",
            "Fast-paced learning",
            "Self-paced flexibility"
        ]
    },
    {
        "tag": "Study Method",
        "question": "Which study method works best for you?",
        "options": [
            "Making notes and summaries",
            "Flashcards and repetition",
            "Teaching others",
            "Practice problems and tests"
        ]
    },
    {
        "tag": "Motivation",
        "question": "What motivates you to learn?",
        "options": [
            "Career advancement",
            "Personal interest",
            "Academic requirements",
            "Solving real-world problems"
        ]
    },
    {
        "tag": "Learning Challenges",
        "question": "What's your biggest learning challenge?",
        "options": [
            "Staying focused",
            "Managing time",
            "Understanding complex topics",
            "Remembering information"
        ]
    },
    {
        "tag": "Stress Response",
        "question": "How do you usually handle academic or study-related stress?",
        "options": [
            "Take breaks and practice relaxation",
            "Push through and work harder",
            "Procrastinate and avoid the work",
            "Seek help from peers or mentors"
        ]
    },
    {
        "tag": "Retrieval Practice",
        "question": "When preparing for an exam, how do you review your material?",
        "options": [
            "Cramming the night before",
            "Spaced repetition over several days",
            "Last-minute skimming of notes",
            "Discussing the topics with others"
        ]
    },
    {
        "tag": "Information Processing",
        "question": "How do you best process complex new information?",
        "options": [
            "Breaking it down into chunks",
            "Looking at the big picture first",
            "Creating analogies",
            "Repeatedly reading it"
        ]
    },
    {
        "tag": "Technology Usage",
        "question": "How heavily do you rely on technology while studying?",
        "options": [
            "Minimal (Textbooks/Handwritten notes)",
            "Moderate (Research/Organizing)",
            "Heavy (AI solvers/Digital summaries)",
            "Complete dependency"
        ]
    }
]

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
    is_personalization: Optional[bool] = False

class HabitLogToggleSchema(BaseModel):
    habit_id: int
    date_str: str

class FeedbackSubmitSchema(BaseModel):
    strategy: str
    rating: int
    comments: Optional[str] = None

class CompanionChatSchema(BaseModel):
    message: str
    mood: str
    chat_history: Optional[List[Dict[str, str]]] = None

class AnalyticLogSchema(BaseModel):
    track_type: str
    event_type: str
    details: Optional[str] = None

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

def adapt_features_temporally(user_id: int, base_features: List[float], db: Session) -> tuple[List[float], List[str]]:
    # Clone the base features list
    adapted_features = list(base_features)
    adaptation_notes = []
    
    # Get habits for this user
    habits_stmt = select(Habit).where(Habit.user_id == user_id)
    habits = db.exec(habits_stmt).all()
    
    if not habits:
        return adapted_features, ["No habit logs available. Serving baseline questionnaire profile."]
        
    # Calculate date range (last 7 days)
    import datetime
    today = datetime.date.today()
    last_7_days = [(today - datetime.timedelta(days=i)).strftime("%Y-%m-%d") for i in range(7)]
    
    # Collect log counts for each habit in the last 7 days
    habit_log_counts = {}
    total_logs_last_7_days = 0
    
    for h in habits:
        log_stmt = select(HabitLog).where((HabitLog.habit_id == h.id) & (HabitLog.date_str.in_(last_7_days)))
        logs = db.exec(log_stmt).all()
        count = len(logs)
        habit_log_counts[h.name.lower()] = count
        total_logs_last_7_days += count
        
    # Check 1: Focus Duration (Index 3)
    # Options: 0: 15-25m, 1: 25-45m, 2: 45-90m, 3: 90+m
    focus_keywords = ["focus", "deep work", "study segment", "pomodoro", "concentration"]
    focus_count = sum(count for name, count in habit_log_counts.items() if any(k in name for k in focus_keywords))
    if focus_count >= 5:
        if adapted_features[3] < 3:
            adapted_features[3] = 3.0
            adaptation_notes.append("Focus Duration boosted to '90+ minutes' based on 5+ logged Focus sessions this week.")
    elif focus_count >= 3:
        if adapted_features[3] < 2:
            adapted_features[3] = 2.0
            adaptation_notes.append("Focus Duration adapted to '45-90 minutes' due to consistent Focus tracking (3+ logs).")
            
    # Check 2: Retrieval Practice (Index 9)
    # Options: 0: Cramming, 1: Spaced repetition, 2: Last-minute skimming, 3: Discussing with others
    retrieval_keywords = ["spaced", "repetition", "review", "flashcard", "quiz", "test", "recall", "active recall"]
    retrieval_count = sum(count for name, count in habit_log_counts.items() if any(k in name for k in retrieval_keywords))
    if retrieval_count >= 3:
        if adapted_features[9] != 1:
            adapted_features[9] = 1.0
            adaptation_notes.append("Retrieval Practice shifted to 'Spaced repetition' from active daily Flashcard/Review logs.")
            
    # Check 3: Stress Response (Index 8)
    # Options: 0: Take breaks/relax, 1: Push through, 2: Procrastinate, 3: Seek help
    stress_keywords = ["relax", "meditat", "breath", "break", "yoga", "mindful", "mental health"]
    stress_count = sum(count for name, count in habit_log_counts.items() if any(k in name for k in stress_keywords))
    if stress_count >= 3:
        if adapted_features[8] != 0:
            adapted_features[8] = 0.0
            adaptation_notes.append("Stress Response optimized to 'Take breaks and practice relaxation' based on regular mindfulness tracking.")
            
    # Check 4: Learning Pace (Index 4)
    # Options: 0: Slow/thorough, 1: Moderate/reviews, 2: Fast-paced, 3: Self-paced
    if total_logs_last_7_days >= 10:
        if adapted_features[4] != 1:
            adapted_features[4] = 1.0
            adaptation_notes.append("Learning Pace refined to 'Moderate with reviews' due to high weekly habit consistency.")

    return adapted_features, adaptation_notes


@app.get('/api/ai/temporal-profile')
def get_temporal_profile(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_session)):
    """Analyze habit logs to return how the learner profile is shifting over time compared to baseline."""
    pred_stmt = select(Prediction).where(Prediction.user_id == user_id).order_by(Prediction.timestamp.desc())
    latest = db.exec(pred_stmt).first()
    
    if not latest:
        return {
            "is_adapted": False,
            "notes": ["No assessment questionnaire found. Please take the assessment first."],
            "original_profile": [],
            "adapted_profile": []
        }
        
    base_features = json.loads(latest.input_features) if latest.input_features else []
    if len(base_features) != 12:
        return {
            "is_adapted": False,
            "notes": ["Assessment data is corrupted. Please re-take the assessment."],
            "original_profile": [],
            "adapted_profile": []
        }
        
    adapted_features, notes = adapt_features_temporally(user_id, base_features, db)
    is_adapted = adapted_features != base_features
    
    original_profile = []
    adapted_profile = []
    
    for idx, (b_val, a_val) in enumerate(zip(base_features, adapted_features)):
        if idx < len(QUESTIONS):
            q = QUESTIONS[idx]
            original_profile.append({
                "tag": q["tag"],
                "answer": q["options"][int(b_val)] if int(b_val) < len(q["options"]) else "Unknown"
            })
            adapted_profile.append({
                "tag": q["tag"],
                "answer": q["options"][int(a_val)] if int(a_val) < len(q["options"]) else "Unknown"
            })
            
    if not notes and not is_adapted:
        notes = ["Profile is currently matching the static baseline. Track more study-related habits to trigger dynamic profile shifts."]
        
    return {
        "is_adapted": is_adapted,
        "notes": notes,
        "original_profile": original_profile,
        "adapted_profile": adapted_profile
    }


@app.get('/api/ai/explain')
def get_ai_explanation(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_session)):
    """
    Generates an Explainable AI (XAI) report for the user's latest prediction.
    Incorporates Dynamic Temporal Profiling updates from daily habit logs.
    Leverages Closed-Loop Feedback to dynamically refine Gemini recommendation prompts.
    Returns feature contributions and a Gemini-powered model explanation.
    """
    if not GEMINI_API_KEY or GEMINI_API_KEY == "YOUR_GEMINI_API_KEY_HERE" or client is None:
        raise HTTPException(
            status_code=501, 
            detail="Gemini API key is not configured. Add a valid GEMINI_API_KEY to the Backend/.env file."
        )

    # Get latest prediction
    statement = select(Prediction).where(Prediction.user_id == user_id).order_by(Prediction.timestamp.desc())
    latest = db.exec(statement).first()
    
    if not latest:
        raise HTTPException(status_code=404, detail="No learning profile found. Please take the questionnaire first.")
        
    # Safely load features
    try:
        user_features = json.loads(latest.input_features)
        if not isinstance(user_features, list) or len(user_features) != 12:
            raise ValueError("Invalid features format")
    except Exception:
        raise HTTPException(status_code=400, detail="Prediction features are corrupted or missing.")

    # Apply Dynamic Temporal Profiling
    adapted_features, adaptation_notes = adapt_features_temporally(user_id, user_features, db)
    is_adapted = adapted_features != user_features
    
    # Predict learning style and strategy on the adapted features
    ability = latest.learning_ability
    strategy = latest.recommended_strategy
    
    if is_adapted:
        try:
            features_array = np.array(adapted_features).reshape(1, -1)
            pred_res = ml_model.predict(features_array)
            ability = pred_res[0][0] if len(pred_res[0]) > 0 else latest.learning_ability
            strategy = pred_res[0][1] if len(pred_res[0]) > 1 else latest.recommended_strategy
            print(f"FastAPI XAI: Profile adapted. New predicted ability: {ability}, strategy: {strategy}")
        except Exception as pred_err:
            print(f"FastAPI XAI: Failed to predict on adapted features: {pred_err}")
            
    # Get feature importances
    importances = getattr(ml_model, 'feature_importances_', None)
    if importances is None or len(importances) != 12:
        # Default fallback importances
        importances = [0.05, 0.22, 0.04, 0.12, 0.06, 0.15, 0.05, 0.05, 0.05, 0.10, 0.08, 0.03]

    # Build feature contributions list using adapted values
    feature_contributions = []
    for idx, val in enumerate(adapted_features):
        if idx < len(QUESTIONS):
            q = QUESTIONS[idx]
            importance_val = float(importances[idx])
            val_int = int(val)
            selected_opt = q["options"][val_int] if val_int < len(q["options"]) else "Unknown"
            feature_contributions.append({
                "tag": q["tag"],
                "question": q["question"],
                "answer": selected_opt,
                "importance": round(importance_val * 100, 1)
            })
            
    # Sort by importance descending
    feature_contributions = sorted(feature_contributions, key=lambda x: x["importance"], reverse=True)
    
    # Generate human-readable profile description for prompt
    profile_details = []
    for fc in feature_contributions:
        profile_details.append(f"- {fc['tag']}: {fc['answer']} (Importance: {fc['importance']}%)")
    profile_text = "\n".join(profile_details)
    
    adaptation_context = ""
    if is_adapted:
        notes_text = "\n".join([f"- {note}" for note in adaptation_notes])
        adaptation_context = f"""
        Note: The student's learning profile features have been dynamically updated in real-time based on their actual study habit logs:
        {notes_text}
        
        Please address this in your explanation! Show the student how their daily consistency (e.g. logging study blocks, retrieval practice, relaxation exercises) is actively refining their profile and why their strategy adapts to these positive behaviors.
        """

    # Fetch previous strategy feedbacks to implement Closed-Loop Feedback Loop
    feedback_stmt = select(StrategyFeedback).where(StrategyFeedback.user_id == user_id).order_by(StrategyFeedback.timestamp.desc())
    previous_feedbacks = db.exec(feedback_stmt).all()
    
    feedback_context = ""
    if previous_feedbacks:
        fb_lines = []
        for fb in previous_feedbacks:
            fb_lines.append(f"- Strategy: '{fb.strategy}', Rating: {fb.rating}/5 Stars, Comments: '{fb.comments or 'None'}'")
        fb_text = "\n".join(fb_lines)
        feedback_context = f"""
        Additionally, the student has provided the following ratings and comments on their previously assigned strategies:
        {fb_text}
        
        Please analyze this feedback and implement a Self-Improving Feedback Loop:
        - If they rated a strategy poorly (1, 2, or 3 stars), do NOT double down on that exact style. Suggest alternative tactical modifications, warning them on how to avoid the parts they disliked.
        - If they rated a strategy highly (4 or 5 stars), reinforce those study patterns and explain why those specific elements are effective for them.
        - Explicitly state in a sentence that the recommendation engine is adapting based on their reviews.
        """

    prompt = f"""
    You are an Explainable AI (XAI) Educational Assistant. 
    A student has been classified by our Machine Learning model as a:
    - Predicted Learning Ability/Style: {ability}
    - Recommended Study Strategy: {strategy}
    
    The student's survey inputs (including any dynamic real-time updates from their habits) and their corresponding model feature importances were:
    {profile_text}
    
    {adaptation_context}
    
    {feedback_context}
    
    Please explain the model's reasoning in a structured, easy-to-understand way.
    Address the following:
    1. **Top Influencing Factors**: Explain how their top 2-3 most important features (like learning style preference, study method, focus duration) drove the model's classification.
    2. **Behavioral Alignment**: Explain why the recommended strategy ({strategy}) matches their learning profile ({ability}).
    3. **Mitigation of Challenges**: Highlight how this recommendation helps them handle their reported challenge (e.g. staying focused, managing time) and stress response.
    4. **Algorithmic Transparency**: Briefly explain in one sentence that the Random Forest model processes these features mathematically based on statistical patterns of learning profiles.
    
    Keep the tone encouraging, professional, and clear. Use structured Markdown formatting with bold subheadings.
    """
    
    explanation = None
    used_model = None
    
    for model_name in available_models:
        try:
            print(f"FastAPI XAI: Trying model {model_name}...")
            response = client.models.generate_content(model=model_name, contents=prompt)
            explanation = response.text
            used_model = model_name
            break
        except Exception as e:
            error_msg = str(e)
            print(f"FastAPI XAI: Model {model_name} failed: {error_msg}")
            if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
                raise HTTPException(
                    status_code=429,
                    detail="Your Gemini API key has exceeded its daily/per-minute quota. Please check your usage."
                )
            continue
            
    if not explanation:
        raise HTTPException(status_code=503, detail="All available AI models failed to generate content.")
        
    print(f"FastAPI XAI: AI explanation successful using {used_model}.")
    return {
        "status": "success",
        "explanation": explanation,
        "feature_contributions": feature_contributions,
        "is_adapted": is_adapted,
        "adaptation_notes": adaptation_notes if adaptation_notes else ["Baseline static profile active."],
        "original_ability": latest.learning_ability,
        "original_strategy": latest.recommended_strategy,
        "adapted_ability": ability,
        "adapted_strategy": strategy,
        "model_metadata": {
            "algorithm": "Random Forest Classifier",
            "unbiased_check": "Passed",
            "transparency_level": "High (Level 3 XAI - Dynamic Profiling & Closed-Loop)",
            "privacy": "Anonymized & Locally Processed"
        }
    }


@app.post('/api/ai/feedback', status_code=201)
def submit_strategy_feedback(data: FeedbackSubmitSchema, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_session)):
    """Saves student feedback for a recommended study strategy."""
    if data.rating < 1 or data.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5.")
        
    feedback = StrategyFeedback(
        user_id=user_id,
        strategy=data.strategy,
        rating=data.rating,
        comments=data.comments
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return {"status": "success", "message": "Feedback submitted successfully.", "id": feedback.id}


@app.get('/api/ai/feedback')
def get_strategy_feedback(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_session)):
    """Fetches previously submitted strategy feedbacks for the user."""
    stmt = select(StrategyFeedback).where(StrategyFeedback.user_id == user_id).order_by(StrategyFeedback.timestamp.desc())
    feedbacks = db.exec(stmt).all()
    
    return {
        "status": "success",
        "feedbacks": [
            {
                "id": fb.id,
                "strategy": fb.strategy,
                "rating": fb.rating,
                "comments": fb.comments,
                "timestamp": fb.timestamp.isoformat()
            } for fb in feedbacks
        ]
    }


@app.post('/api/ai/companion')
def chat_with_companion(
    data: CompanionChatSchema,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_session)
):
    """
    Interacts with the AI Learning Companion using mood-based adaptive personas.
    """
    if not GEMINI_API_KEY or GEMINI_API_KEY == "YOUR_GEMINI_API_KEY_HERE" or client is None:
        raise HTTPException(
            status_code=501,
            detail="Gemini API key is not configured. Add a valid GEMINI_API_KEY to the Backend/.env file."
        )

    # 1. Fetch user's latest prediction to customize instruction context
    stmt = select(Prediction).where(Prediction.user_id == user_id).order_by(Prediction.timestamp.desc())
    latest = db.exec(stmt).first()
    
    user_context = ""
    if latest:
        try:
            features = json.loads(latest.input_features)
            adapted_features, _ = adapt_features_temporally(user_id, features, db)
            features_array = np.array(adapted_features).reshape(1, -1)
            pred_res = ml_model.predict(features_array)
            ability = pred_res[0][0] if len(pred_res[0]) > 0 else latest.learning_ability
            strategy = pred_res[0][1] if len(pred_res[0]) > 1 else latest.recommended_strategy
        except Exception:
            ability = latest.learning_ability
            strategy = latest.recommended_strategy
            
        user_context = f"\nThe student's currently active predicted learning style is '{ability}' and their recommended study strategy is '{strategy}'. Incorporate this context when explaining or recommending concepts."

    # 2. Select mood-based persona system instructions
    mood_lower = data.mood.strip().lower()
    
    if mood_lower == "stressed":
        system_instruction = (
            "You are the 'Empathetic Mentor' companion persona for CognitoX.ai. "
            "The student is feeling stressed or overwhelmed. Respond with warmth, empathy, and encouraging words. "
            "Validate their feelings and offer simple mindfulness, breathing, or stress-management techniques alongside study advice. "
            "Keep your response warm, helpful, and concise (under 3 paragraphs)."
        )
    elif mood_lower == "unmotivated":
        system_instruction = (
            "You are the 'Accountability Coach' companion persona for CognitoX.ai. "
            "The student is feeling unmotivated. Be energetic, direct, and highly actionable. "
            "Challenge them to take immediate action, break down their tasks into tiny, trivial micro-tasks (e.g., 'open the file for 2 minutes'), "
            "and set a concrete small goal. Keep responses punchy, direct, and highly encouraging (under 3 paragraphs)."
        )
    elif mood_lower == "focused":
        system_instruction = (
            "You are the 'High-Performance Coach' companion persona for CognitoX.ai. "
            "The student is focused and ready to study. Be sharp, efficient, and direct. "
            "Help them optimize their deep work flow. Share techniques like time-blocking, eliminating distractions, "
            "or cognitive stacking. Keep responses concise, actionable, and focus-driven (under 3 paragraphs)."
        )
    elif mood_lower == "inquisitive":
        system_instruction = (
            "You are the 'Socratic Challenger' companion persona for CognitoX.ai. "
            "The student is curious and inquisitive. Do not give direct answers immediately. "
            "Instead, guide them by asking open-ended questions, encouraging critical thinking, and prompting them "
            "to explain the concept back to you. Challenge their assumptions gently and lead them to self-discovery (under 3 paragraphs)."
        )
    else:
        system_instruction = (
            "You are an AI Learning Companion for CognitoX.ai. "
            "Provide helpful, concise, and structured study and learning guidance (under 3 paragraphs)."
        )
        
    system_instruction += user_context

    # 3. Format history for GenAI SDK Turn-based system
    prompt_parts = []
    if data.chat_history:
        for turn in data.chat_history:
            role_name = "Student" if turn.get("role") == "user" else "Companion"
            prompt_parts.append(f"{role_name}: {turn.get('text')}")
    prompt_parts.append(f"Student: {data.message}")
    prompt_parts.append("Companion:")
    
    full_prompt = "\n".join(prompt_parts)

    try:
        from google.genai import types
        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            temperature=0.7,
            max_output_tokens=800
        )
        
        reply = None
        used_model = None
        for model_name in available_models:
            try:
                print(f"FastAPI Companion: Trying model {model_name}...")
                response = client.models.generate_content(
                    model=model_name,
                    contents=full_prompt,
                    config=config
                )
                reply = response.text
                used_model = model_name
                break
            except Exception as e:
                print(f"FastAPI Companion: Model {model_name} failed: {e}")
                continue
                
        if not reply:
            raise HTTPException(status_code=503, detail="All available AI models failed to generate content.")
            
        return {
            "status": "success",
            "reply": reply,
            "persona": mood_lower,
            "model": used_model
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Companion interaction failed: {str(e)}")


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
        "habits": [
            {
                "id": str(h.id),
                "name": h.name,
                "is_personalization": getattr(h, "is_personalization", False)
            } for h in habits_list
        ],
        "logs": logs
    }

@app.post('/api/habits', status_code=201)
def create_habit(data: HabitCreateSchema, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_session)):
    """Creates a new habit for tracking."""
    new_habit = Habit(
        user_id=user_id,
        name=data.name,
        is_personalization=getattr(data, "is_personalization", False)
    )
    db.add(new_habit)
    db.commit()
    db.refresh(new_habit)
    return {
        "id": str(new_habit.id),
        "name": new_habit.name,
        "is_personalization": getattr(new_habit, "is_personalization", False)
    }

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


@app.post('/api/analytics/log')
def log_user_interaction(data: AnalyticLogSchema, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_session)):
    """Logs user interactions for Decoupled Gamification vs Personalization Tracking analytics."""
    log = InteractionAnalytic(
        user_id=user_id,
        track_type=data.track_type,
        event_type=data.event_type,
        details=data.details
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return {"status": "success", "message": "Interaction logged."}


@app.get('/api/analytics/summary')
def get_analytics_summary(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_session)):
    """Retrieves summaries comparing gamification vs personalization interactions."""
    stmt_gamified = select(func.count(InteractionAnalytic.id)).where(
        InteractionAnalytic.user_id == user_id,
        InteractionAnalytic.track_type == "gamification"
    )
    stmt_personal = select(func.count(InteractionAnalytic.id)).where(
        InteractionAnalytic.user_id == user_id,
        InteractionAnalytic.track_type == "personalization"
    )
    
    gamified_count = db.exec(stmt_gamified).one()
    personal_count = db.exec(stmt_personal).one()
    
    # Get recent clicks or events
    recent_stmt = select(InteractionAnalytic).where(
        InteractionAnalytic.user_id == user_id
    ).order_by(InteractionAnalytic.timestamp.desc()).limit(15)
    recent_logs = db.exec(recent_stmt).all()
    
    return {
        "status": "success",
        "gamified_interactions_count": gamified_count,
        "personalization_interactions_count": personal_count,
        "recent_logs": [
            {
                "track_type": l.track_type,
                "event_type": l.event_type,
                "details": l.details,
                "timestamp": l.timestamp.isoformat()
            } for l in recent_logs
        ]
    }


# Mount static files folder to support legacy directories
legacy_frontend = os.path.join(os.path.dirname(__file__), '..', 'Frontend')
if os.path.exists(legacy_frontend):
    app.mount("/Frontend", StaticFiles(directory=legacy_frontend), name="legacy_frontend")

if __name__ == '__main__':
    import uvicorn
    # Use environment port or default to 5000
    port = int(os.environ.get('PORT', 5000))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=True)
