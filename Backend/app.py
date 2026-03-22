import os
import json
import pickle
import numpy as np
import sqlite3
import jwt
import datetime
from functools import wraps
from werkzeug.security import generate_password_hash, check_password_hash
from flask import Flask, request, jsonify, g, send_from_directory
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend integration
app.config['SECRET_KEY'] = 'cognitox_secret_key_123'  # Change this in production
DB_PATH = os.path.join(os.path.dirname(__file__), 'database.db')

def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS predictions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                learning_ability TEXT,
                recommended_strategy TEXT,
                input_features TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS habits (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                name TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS habit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                habit_id INTEGER,
                date_str TEXT NOT NULL,
                FOREIGN KEY(habit_id) REFERENCES habits(id)
            )
        ''')
        
        # Migration: add input_features column if table was previously created without it
        try:
            cursor.execute("ALTER TABLE predictions ADD COLUMN input_features TEXT")
        except sqlite3.OperationalError:
            pass # Column likely already exists
            
        conn.commit()

init_db()

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'Token is missing!'}), 401
            
        try:
            token = token.split(" ")[1] if " " in token else token
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            request.user_id = data['user_id']
        except Exception as e:
            return jsonify({'error': 'Token is invalid!'}), 401
            
        return f(*args, **kwargs)
    return decorated

# Path to the predictive model
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'models', 'learning_ability_model.pkl')

class DummyModel:
    """A dummy model for predicting learning ability and strategy if no .pkl is found."""
    def predict(self, features):
        return [["Visual Learner", "Microlearning Strategy"]]

# Load the ML model if it exists, otherwise use a dummy
if os.path.exists(MODEL_PATH):
    try:
        with open(MODEL_PATH, 'rb') as f:
            model = pickle.load(f)
        print(f"Model loaded successfully from {MODEL_PATH}")
    except Exception as e:
        print(f"Failed to load model from {MODEL_PATH}. Error: {e}")
        model = DummyModel()
else:
    model = DummyModel()
    print("Warning: Model file not found. Using a dummy model for predictions.")
    print(f"Please place your trained .pkl file at: {MODEL_PATH}")

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint useful for CI/CD and monitoring."""
    return jsonify({"status": "healthy", "message": "CognitoX.ai backend is running!"}), 200

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data or not data.get('username') or not data.get('password') or not data.get('email'):
        return jsonify({'error': 'Missing required fields (username, email, password)'}), 400
        
    hashed_password = generate_password_hash(data['password'])
    
    try:
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("INSERT INTO users (username, email, password) VALUES (?, ?, ?)", 
                           (data['username'], data['email'], hashed_password))
            conn.commit()
        return jsonify({'message': 'User created successfully!'}), 201
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Username or email already exists!'}), 409

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Username and password required'}), 401

    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, password FROM users WHERE username = ?", (data['username'],))
        user = cursor.fetchone()

    if not user or not check_password_hash(user[1], data['password']):
        return jsonify({'error': 'Invalid username or password'}), 401

    # Token expires in 24 hours
    token = jwt.encode({'user_id': user[0], 'exp': datetime.datetime.now(datetime.UTC) + datetime.timedelta(hours=24)}, 
                       app.config['SECRET_KEY'], algorithm="HS256")

    return jsonify({'token': token, 'username': data['username']}), 200

@app.route('/api/dashboard', methods=['GET'])
@token_required
def get_dashboard():
    """Retrieve history of predictions for the currently logged-in user."""
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT learning_ability, recommended_strategy, timestamp, input_features FROM predictions WHERE user_id = ? ORDER BY timestamp DESC", (request.user_id,))
        predictions = cursor.fetchall()
        
    history = [{"learning_ability": p[0], "strategy": p[1], "timestamp": p[2], "features": json.loads(p[3]) if p[3] else None} for p in predictions]
    return jsonify({'history': history}), 200

@app.route('/api/habits', methods=['GET', 'POST', 'DELETE'])
@token_required
def modify_habits():
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        if request.method == 'GET':
            cursor.execute("SELECT id, name FROM habits WHERE user_id = ?", (request.user_id,))
            habits_data = cursor.fetchall()
            
            logs = {}
            for h in habits_data:
                cursor.execute("SELECT date_str FROM habit_logs WHERE habit_id = ?", (h[0],))
                logs[str(h[0])] = {date_str[0]: True for date_str in cursor.fetchall()}
            
            return jsonify({
                "habits": [{"id": str(h[0]), "name": h[1]} for h in habits_data],
                "logs": logs
            }), 200
            
        elif request.method == 'POST':
            data = request.get_json()
            if not data or not data.get('name'):
                return jsonify({"error": "Name required"}), 400
            cursor.execute("INSERT INTO habits (user_id, name) VALUES (?, ?)", (request.user_id, data['name']))
            conn.commit()
            return jsonify({"id": str(cursor.lastrowid), "name": data['name']}), 201
            
        elif request.method == 'DELETE':
            habit_id = request.args.get('id')
            if habit_id:
                cursor.execute("DELETE FROM habit_logs WHERE habit_id = ? AND habit_id IN (SELECT id FROM habits WHERE user_id = ?)", (habit_id, request.user_id))
                cursor.execute("DELETE FROM habits WHERE id = ? AND user_id = ?", (habit_id, request.user_id))
                conn.commit()
            return jsonify({"status": "deleted"}), 200

@app.route('/api/habits/log', methods=['POST'])
@token_required
def toggle_habit_log():
    data = request.get_json()
    habit_id = data.get('habit_id')
    date_str = data.get('date_str')
    
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM habits WHERE id = ? AND user_id = ?", (habit_id, request.user_id))
        if not cursor.fetchone(): return jsonify({"error": "Unauthorized"}), 403
        
        cursor.execute("SELECT id FROM habit_logs WHERE habit_id = ? AND date_str = ?", (habit_id, date_str))
        log = cursor.fetchone()
        if log:
            cursor.execute("DELETE FROM habit_logs WHERE id = ?", (log[0],))
            status = False
        else:
            cursor.execute("INSERT INTO habit_logs (habit_id, date_str) VALUES (?, ?)", (habit_id, date_str))
            status = True
        conn.commit()
    return jsonify({"status": status}), 200

@app.route('/api/predict', methods=['POST'])
def predict_learning_ability():
    """
    Endpoint to predict learning ability and strategy based on questionnaire features.
    Expected JSON payload: {"features": [0.5, 1.2, 3.4, ...]}
    """
    data = request.get_json()
    
    if not data or 'features' not in data:
        return jsonify({"error": "Missing 'features' in request payload. Please provide a list of numeric features."}), 400
        
    features = data.get('features')
    
    if not isinstance(features, list) or len(features) != 12:
        return jsonify({"error": "'features' must be a list of exactly 12 numerical values."}), 400
        
    try:
        # Convert to numpy array and reshape for real scikit-learn models
        features_array = np.array(features).reshape(1, -1)
        
        # Make the prediction
        prediction = model.predict(features_array)
        
        # Assuming the model returns a 2D array: [['FastLearner', 'Explorer']]
        ability = prediction[0][0] if len(prediction[0]) > 0 else "Unknown Ability"
        strategy = prediction[0][1] if len(prediction[0]) > 1 else "Standard Strategy"
        
        # Save to database if the user provided a valid auth token
        auth_header = request.headers.get('Authorization')
        if auth_header:
            try:
                token = auth_header.split(" ")[1] if " " in auth_header else auth_header
                data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
                user_id = data['user_id']
                
                with sqlite3.connect(DB_PATH) as conn:
                    cursor = conn.cursor()
                    cursor.execute("INSERT INTO predictions (user_id, learning_ability, recommended_strategy, input_features) VALUES (?, ?, ?, ?)", 
                                   (user_id, str(ability), str(strategy), json.dumps(features)))
                    conn.commit()
            except Exception:
                pass # Silently proceed without saving if token is invalid or missing
        
        return jsonify({
            "status": "success",
            "learning_ability": str(ability),
            "recommended_strategy": str(strategy)
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Prediction failed: {str(e)}"}), 500

@app.route('/<path:filename>')
@app.route('/Frontend/<path:filename>')
def serve_frontend(filename):
    """Serve any file from the Frontend directory (like style.css)."""
    frontend_dir = os.path.join(os.path.dirname(__file__), '..', 'Frontend')
    return send_from_directory(frontend_dir, filename)

@app.route('/')
def home():
    """Redirect or serve the main index.html file when visiting localhost:5000/."""
    frontend_dir = os.path.join(os.path.dirname(__file__), '..', 'Frontend')
    return send_from_directory(frontend_dir, 'index.html')

if __name__ == '__main__':
    # Ensure the models directory exists
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    
    # Use environment variable for port or default to 5000
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
