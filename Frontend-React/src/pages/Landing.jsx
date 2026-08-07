import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('authToken');
  const savedUsername = localStorage.getItem('username');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle scroll trigger from navigation
  useEffect(() => {
    if (location.state && location.state.scrollTo) {
      const sectionId = location.state.scrollTo;
      const element = document.getElementById(sectionId);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
      // Reset state so it doesn't re-scroll on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in both fields.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await fetch('http://127.0.0.1:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('username', data.username);
        // Toast style alert could be shown here
        navigate('/dashboard');
      } else {
        setError(data.error || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      console.error('Error logging in:', err);
      setError('Could not connect to the backend server. Is it running?');
    } finally {
      setLoading(false);
    }
  };

  const handleGetStarted = () => {
    const element = document.getElementById('how-it-works');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="landing-page animate-fade-in">
      {/* 1st part: Home Hero */}
      <section className="hero-section-main" id="home">
        <div className="hero-container">
          <div className="hero-left-content">
            <div className="badge-tag">
              <i className="fa-solid fa-gears"></i>
              <span>Identify Learning Patterns using AI</span>
            </div>
            
            <h1 className="hero-title">
              Personalized Learning Paths for Every Student, <br />
              <span className="gradient-text">Powered by AI</span>
            </h1>
            
            <p className="hero-description">
              Transform your learning experience with our AI-powered platform. 
              Understand your learning patterns, build consistency, and optimize study strategies.
            </p>
            
            <button onClick={handleGetStarted} className="btn-primary get-started-btn">
              Get Started <i className="fa-solid fa-arrow-right-long"></i>
            </button>
          </div>

          <div className="hero-right-content">
            {token ? (
              <div className="glass-card welcome-card animate-fade-in">
                <i className="fa-solid fa-face-smile welcome-icon"></i>
                <h2>Welcome Back, {savedUsername}!</h2>
                <p>Ready to continue your AI-powered learning journey?</p>
                <div className="welcome-actions">
                  <Link to="/dashboard" className="btn-primary w-full">
                    <i className="fa-solid fa-chart-line"></i> Go to Dashboard
                  </Link>
                  <Link to="/questionnaire" className="btn-secondary w-full">
                    <i className="fa-solid fa-circle-question"></i> Take Assessment
                  </Link>
                </div>
              </div>
            ) : (
              <div className="glass-card login-card">
                <h2>Login to Your Account</h2>
                
                {error && (
                  <div className="error-banner">
                    <i className="fa-solid fa-triangle-exclamation"></i>
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleLogin} className="login-form">
                  <div className="input-group">
                    <i className="fa-solid fa-user input-icon"></i>
                    <input 
                      type="text" 
                      placeholder="Username" 
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="input-glass" 
                      required 
                    />
                  </div>
                  
                  <div className="input-group">
                    <i className="fa-solid fa-lock input-icon"></i>
                    <input 
                      type="password" 
                      placeholder="Password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input-glass" 
                      required 
                    />
                  </div>

                  <button type="submit" className="btn-primary w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin"></i> Logging in...
                      </>
                    ) : (
                      <>
                        Login <i className="fa-solid fa-arrow-right-long"></i>
                      </>
                    )}
                  </button>

                  <p className="auth-footer-text">
                    Don't have an account? <Link to="/signup" className="highlight-link">Sign Up</Link>
                  </p>
                </form>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 2nd part: How It Works */}
      <section className="info-section-how" id="how-it-works">
        <div className="section-header">
          <h2 className="section-title">How It Works</h2>
          <p className="section-subtitle">Our three-step process transforms raw data into actionable insights.</p>
        </div>

        <div className="steps-grid">
          <div className="glass-card step-card-item">
            <div className="step-number">
              <i className="fa-solid fa-1"></i>
            </div>
            <h3>Data Collection</h3>
            <p>
              We gather interaction data from quizzes, assignments, habits, and problem-solving patterns to model your learning style.
            </p>
          </div>

          <div className="glass-card step-card-item">
            <div className="step-number">
              <i className="fa-solid fa-2"></i>
            </div>
            <h3>Pattern Analysis</h3>
            <p>
              Machine learning algorithms analyze behavioral features, identify cognitive patterns, and assess efficiency or procrastination risks.
            </p>
          </div>

          <div className="glass-card step-card-item">
            <div className="step-number">
              <i className="fa-solid fa-3"></i>
            </div>
            <h3>Personalized Recommendations</h3>
            <p>
              Generate personalized study strategies, learning modalities, and structured recommendations to optimize learning outcomes.
            </p>
          </div>
        </div>
      </section>

      {/* 3rd part: Key Features */}
      <section className="info-section-features" id="features">
        <div className="section-header">
          <h2 className="section-title">Key Features</h2>
          <p className="section-subtitle">Powerful tools to boost consistency and learning power.</p>
        </div>

        <div className="features-grid">
          <div className="glass-card feature-card-item">
            <i className="fa-solid fa-brain feature-icon color-teal"></i>
            <h3>AI Questionnaire</h3>
            <p>Undergo an intelligent assessment that feeds directly into our Machine Learning models.</p>
          </div>

          <div className="glass-card feature-card-item">
            <i className="fa-solid fa-chart-line feature-icon color-indigo"></i>
            <h3>Personalized Dashboard</h3>
            <p>View tailored study recommendations, your learning modality, and your distinct personality profile.</p>
          </div>

          <div className="glass-card feature-card-item">
            <i className="fa-solid fa-calendar-check feature-icon color-purple"></i>
            <h3>Habit Tracker</h3>
            <p>Build consistency by interactively logging your daily study actions and visualizing your streaks.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
