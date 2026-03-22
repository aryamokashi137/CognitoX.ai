import os
import pickle
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend integration

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
        
        return jsonify({
            "status": "success",
            "learning_ability": str(ability),
            "recommended_strategy": str(strategy)
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Prediction failed: {str(e)}"}), 500

if __name__ == '__main__':
    # Ensure the models directory exists
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    
    # Use environment variable for port or default to 5000
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
