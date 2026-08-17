import pytest
import sys
import os
import random
from fastapi.testclient import TestClient

# Add the parent directory (Backend) to sys.path so we can import app.py
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

try:
    from app import app
except ImportError:
    pytest.fail("Could not import 'app' from Backend folder.")

client = TestClient(app)

def test_health_check():
    """Test the health check endpoint to ensure the API is running."""
    response = client.get('/api/health')
    assert response.status_code == 200
    data = response.json()
    assert data['status'] == 'healthy'

def test_predict_endpoint_missing_features():
    """Test the prediction endpoint fails validation without 'features' payload."""
    response = client.post('/api/predict', json={})
    # FastAPI returns 422 Unprocessable Entity for body validation errors
    assert response.status_code == 422
    data = response.json()
    assert 'detail' in data

def test_predict_endpoint_invalid_length():
    """Test prediction endpoint fails when length is not exactly 12."""
    response = client.post('/api/predict', json={"features": [1.0, 2.0, 3.0]})
    # Our endpoint raises a 400 bad request if length != 12
    assert response.status_code == 400
    data = response.json()
    assert 'detail' in data

def test_predict_endpoint_success():
    """Test prediction endpoint with valid mock features."""
    response = client.post('/api/predict', json={"features": [1.0] * 12})
    assert response.status_code == 200
    data = response.json()
    assert data['status'] == 'success'
    assert 'learning_ability' in data
    assert 'recommended_strategy' in data

def test_user_flow_and_explanation():
    """Test complete flow: registration, login, prediction, and explainability endpoint."""
    unique_id = random.randint(10000, 99999)
    username = f"testuser_{unique_id}"
    email = f"test_{unique_id}@example.com"
    password = "password123"

    # 1. Register
    reg_response = client.post('/api/register', json={
        "username": username,
        "email": email,
        "password": password
    })
    assert reg_response.status_code == 201

    # 2. Login
    login_response = client.post('/api/login', json={
        "username": username,
        "password": password
    })
    assert login_response.status_code == 200
    token = login_response.json()['token']
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Predict with Auth Header
    predict_response = client.post('/api/predict', 
        json={"features": [1.0] * 12},
        headers=headers
    )
    assert predict_response.status_code == 200

    # 4. Get XAI Explanation
    explain_response = client.get('/api/ai/explain', headers=headers)
    # The API might return 501 if Gemini is not configured, or 429/503 if the quota is hit,
    # or 200 if it successfully connects to Gemini. All these statuses represent clean exit points.
    assert explain_response.status_code in [200, 429, 501, 503]
    
    if explain_response.status_code == 200:
        data = explain_response.json()
        assert data['status'] == 'success'
        assert 'explanation' in data
        assert 'feature_contributions' in data
        assert len(data['feature_contributions']) == 12
        assert 'model_metadata' in data


def test_dynamic_temporal_profiling():
    """Test the Dynamic Temporal Profiling system using custom habit logs."""
    unique_id = random.randint(10000, 99999)
    username = f"temporal_{unique_id}"
    email = f"temporal_{unique_id}@example.com"
    password = "password123"

    # Register and login
    client.post('/api/register', json={"username": username, "email": email, "password": password})
    login_res = client.post('/api/login', json={"username": username, "password": password})
    token = login_res.json()['token']
    headers = {"Authorization": f"Bearer {token}"}

    # Post baseline prediction
    # Index 3: Focus Duration = 0.0 (15-25 minutes)
    # Index 8: Stress Response = 1.0 (Push through)
    # Index 9: Retrieval Practice = 0.0 (Cramming)
    baseline_features = [1.0, 1.0, 1.0, 0.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.0, 1.0, 1.0]
    client.post('/api/predict', json={"features": baseline_features}, headers=headers)

    # Fetch temporal profile - initially it should not be adapted
    profile_res = client.get('/api/ai/temporal-profile', headers=headers)
    assert profile_res.status_code == 200
    profile_data = profile_res.json()
    assert profile_data['is_adapted'] is False

    # Create a focus-related habit
    habit_res = client.post('/api/habits', json={"name": "Pomodoro Focus session"}, headers=headers)
    assert habit_res.status_code == 201
    habit_id = habit_res.json()['id']

    # Log completions for this habit for the last 5 days
    import datetime
    today = datetime.date.today()
    for i in range(5):
        date_str = (today - datetime.timedelta(days=i)).strftime("%Y-%m-%d")
        log_res = client.post('/api/habits/log', json={"habit_id": int(habit_id), "date_str": date_str}, headers=headers)
        assert log_res.status_code == 200

    # Fetch temporal profile - it should now be adapted!
    profile_res_after = client.get('/api/ai/temporal-profile', headers=headers)
    assert profile_res_after.status_code == 200
    profile_data_after = profile_res_after.json()
    assert profile_data_after['is_adapted'] is True
    assert len(profile_data_after['notes']) > 0
    # The notes should explain that focus duration is boosted/adapted
    assert any("Focus Duration" in note for note in profile_data_after['notes'])


def test_closed_loop_feedback():
    """Test the Self-Improving Closed-Loop Feedback API endpoints."""
    unique_id = random.randint(10000, 99999)
    username = f"feedback_{unique_id}"
    email = f"feedback_{unique_id}@example.com"
    password = "password123"

    # Register and login
    client.post('/api/register', json={"username": username, "email": email, "password": password})
    login_res = client.post('/api/login', json={"username": username, "password": password})
    token = login_res.json()['token']
    headers = {"Authorization": f"Bearer {token}"}

    # Post baseline prediction
    baseline_features = [1.0] * 12
    client.post('/api/predict', json={"features": baseline_features}, headers=headers)

    # Submit feedback
    fb_res = client.post('/api/ai/feedback', json={
        "strategy": "Microlearning Strategy",
        "rating": 2,
        "comments": "Too short, I want longer focus blocks."
    }, headers=headers)
    assert fb_res.status_code == 201
    assert fb_res.json()['status'] == 'success'
    assert 'id' in fb_res.json()

    # Submit second feedback with invalid rating to test validation
    fb_invalid = client.post('/api/ai/feedback', json={
        "strategy": "Microlearning Strategy",
        "rating": 6,
        "comments": "Invalid rating"
    }, headers=headers)
    assert fb_invalid.status_code == 400

    # Fetch feedback history
    history_res = client.get('/api/ai/feedback', headers=headers)
    assert history_res.status_code == 200
    history_data = history_res.json()
    assert history_data['status'] == 'success'
    assert len(history_data['feedbacks']) == 1
    assert history_data['feedbacks'][0]['rating'] == 2
    assert history_data['feedbacks'][0]['comments'] == "Too short, I want longer focus blocks."


def test_companion_chat():
    """Test the AI Companion Chat API endpoint with different moods."""
    unique_id = random.randint(10000, 99999)
    username = f"companion_{unique_id}"
    email = f"companion_{unique_id}@example.com"
    password = "password123"

    # Register and login
    client.post('/api/register', json={"username": username, "email": email, "password": password})
    login_res = client.post('/api/login', json={"username": username, "password": password})
    token = login_res.json()['token']
    headers = {"Authorization": f"Bearer {token}"}

    # Post baseline prediction
    baseline_features = [1.0] * 12
    client.post('/api/predict', json={"features": baseline_features}, headers=headers)

    # Test Stressed mood
    chat_res_stressed = client.post('/api/ai/companion', json={
        "message": "I have an exam in 2 hours and I am shaking.",
        "mood": "Stressed",
        "chat_history": []
    }, headers=headers)
    
    assert chat_res_stressed.status_code in [200, 501, 503, 429]
    if chat_res_stressed.status_code == 200:
        data = chat_res_stressed.json()
        assert data['status'] == 'success'
        assert data['persona'] == 'stressed'
        assert 'reply' in data

    # Test Unmotivated mood
    chat_res_unmotivated = client.post('/api/ai/companion', json={
        "message": "I do not want to study today.",
        "mood": "Unmotivated",
        "chat_history": [{"role": "user", "text": "Hello"}, {"role": "model", "text": "Hi there"}]
    }, headers=headers)
    assert chat_res_unmotivated.status_code in [200, 501, 503, 429]


def test_decoupled_gamification_personalization_tracking():
    """Test the decoupled habit quests and interaction analytics telemetry endpoints."""
    unique_id = random.randint(10000, 99999)
    username = f"telemetry_{unique_id}"
    email = f"telemetry_{unique_id}@example.com"
    password = "password123"

    # Register and login
    client.post('/api/register', json={"username": username, "email": email, "password": password})
    login_res = client.post('/api/login', json={"username": username, "password": password})
    token = login_res.json()['token']
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create a Gamified Habit
    res_habit = client.post('/api/habits', json={
        "name": "Drink water & study",
        "is_personalization": False
    }, headers=headers)
    assert res_habit.status_code == 201
    habit_data = res_habit.json()
    assert habit_data['is_personalization'] is False

    # 2. Create an AI Personalized Quest
    res_quest = client.post('/api/habits', json={
        "name": "Feynman technique review",
        "is_personalization": True
    }, headers=headers)
    assert res_quest.status_code == 201
    quest_data = res_quest.json()
    assert quest_data['is_personalization'] is True

    # 3. Retrieve Habits to verify they exist and match flags
    res_get = client.get('/api/habits', headers=headers)
    assert res_get.status_code == 200
    get_data = res_get.json()
    
    # Filter the habits list to only look at habits created in this test
    created_habits = [h for h in get_data['habits'] if h['name'] in ["Drink water & study", "Feynman technique review"]]
    assert len(created_habits) == 2

    # 4. Log telemetry interactions for both tracks
    log_res1 = client.post('/api/analytics/log', json={
        "track_type": "gamification",
        "event_type": "hover",
        "details": "Hovered over streak counter"
    }, headers=headers)
    assert log_res1.status_code == 200
    assert log_res1.json()['status'] == 'success'

    log_res2 = client.post('/api/analytics/log', json={
        "track_type": "personalization",
        "event_type": "click",
        "details": "Clicked AI Feynman Quest checkbox"
    }, headers=headers)
    assert log_res2.status_code == 200
    
    # 5. Fetch telemetry summary to verify counts and log entries
    summary_res = client.get('/api/analytics/summary', headers=headers)
    assert summary_res.status_code == 200
    summary_data = summary_res.json()
    assert summary_data['status'] == 'success'
    assert summary_data['gamified_interactions_count'] >= 1
    assert summary_data['personalization_interactions_count'] >= 1
    assert len(summary_data['recent_logs']) >= 2


