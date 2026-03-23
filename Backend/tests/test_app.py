import json
import pytest
import sys
import os

# Add the parent directory (Backend) to sys.path so we can import app.py
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

try:
    from app import app
except ImportError:
    pytest.fail("Could not import 'app' from Backend folder.")

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_health_check(client):
    """Test the health check endpoint to ensure the API is running."""
    response = client.get('/api/health')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['status'] == 'healthy'

def test_predict_endpoint_missing_features(client):
    """Test the prediction endpoint fails gracefully without 'features' payload."""
    response = client.post('/api/predict', json={})
    assert response.status_code == 400
    data = json.loads(response.data)
    assert 'error' in data

def test_predict_endpoint_success(client):
    """Test prediction endpoint with valid mock features."""
    response = client.post('/api/predict', json={"features": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]})
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['status'] == 'success'
    assert 'learning_ability' in data
    assert 'recommended_strategy' in data
