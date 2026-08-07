import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function Signup() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Basic Validation
    if (!fullName || !email || !username || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('http://127.0.0.1:5000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/');
        }, 2000);
      } else {
        setError(data.error || 'Registration failed.');
      }
    } catch (err) {
      console.error('Error registering:', err);
      setError('Could not connect to the backend server. Is it running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page animate-fade-in">
      <div className="glass-card auth-card">
        <h2>Create Your Account</h2>
        <p className="auth-subtitle">
          Start your personalized learning journey with CognitoX.ai
        </p>

        {error && (
          <div className="error-banner">
            <i className="fa-solid fa-triangle-exclamation"></i>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="success-banner">
            <i className="fa-solid fa-circle-check"></i>
            <span>Account created successfully! Redirecting to login...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <i className="fa-solid fa-user-tag input-icon"></i>
            <input 
              type="text" 
              placeholder="Full Name" 
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input-glass"
              required 
            />
          </div>

          <div className="input-group">
            <i className="fa-solid fa-envelope input-icon"></i>
            <input 
              type="email" 
              placeholder="Email Address" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-glass"
              required 
            />
          </div>

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
              placeholder="Password (Min. 6 chars)" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-glass"
              required 
            />
          </div>

          <div className="input-group">
            <i className="fa-solid fa-shield-halved input-icon"></i>
            <input 
              type="password" 
              placeholder="Confirm Password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input-glass"
              required 
            />
          </div>

          <button type="submit" className="btn-primary w-full" disabled={loading || success}>
            {loading ? (
              <>
                <i className="fa-solid fa-spinner fa-spin"></i> Creating Account...
              </>
            ) : (
              <>
                Sign Up <i className="fa-solid fa-arrow-right-long"></i>
              </>
            )}
          </button>
        </form>

        <p className="auth-footer-text">
          Already have an account? <Link to="/" className="highlight-link">Login</Link>
        </p>
      </div>
    </div>
  );
}
