import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('authToken');
  const username = localStorage.getItem('username') || 'User';

  const handleSignOut = (e) => {
    e.preventDefault();
    localStorage.removeItem('authToken');
    localStorage.removeItem('username');
    localStorage.removeItem('latestPrediction');
    localStorage.removeItem('assessmentAnswers');
    navigate('/');
  };

  const scrollToSection = (sectionId) => {
    if (location.pathname !== '/') {
      navigate('/', { state: { scrollTo: sectionId } });
    } else {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="navbar-container">
      <div className="navbar-content">
        <Link to="/" className="navbar-logo">
          <i className="fa-solid fa-head-side-virus logo-icon"></i>
          <span>CognitoX.ai</span>
        </Link>
        
        <nav className="navbar-links">
          <button onClick={() => scrollToSection('home')} className="nav-link-btn">
            <i className="fa-solid fa-house"></i> Home
          </button>
          <button onClick={() => scrollToSection('how-it-works')} className="nav-link-btn">
            <i className="fa-solid fa-gear"></i> How It Works
          </button>
          <button onClick={() => scrollToSection('features')} className="nav-link-btn">
            <i className="fa-solid fa-book-open"></i> Features
          </button>

          {token && (
            <>
              <Link to="/questionnaire" className={`nav-btn ${isActive('/questionnaire') ? 'active' : ''}`}>
                <i className="fa-solid fa-circle-question"></i> Questionnaire
              </Link>
              <Link to="/dashboard" className={`nav-btn ${isActive('/dashboard') ? 'active' : ''}`}>
                <i className="fa-solid fa-chart-line"></i> Dashboard
              </Link>
              <Link to="/tracker" className={`nav-btn ${isActive('/tracker') ? 'active' : ''}`}>
                <i className="fa-solid fa-chart-column"></i> Tracker
              </Link>
            </>
          )}
        </nav>

        <div className="navbar-auth">
          <button 
            onClick={toggleTheme} 
            className="theme-toggle-btn" 
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            style={{ marginRight: '16px' }}
          >
            {theme === 'dark' ? (
              <i className="fa-solid fa-sun sun-icon"></i>
            ) : (
              <i className="fa-solid fa-moon moon-icon"></i>
            )}
          </button>

          {token ? (
            <div className="auth-profile-group">
              <div className="user-profile-chip">
                <img 
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=14b8a6&color=ffffff`} 
                  alt={username} 
                />
                <span>{username}</span>
              </div>
              <button onClick={handleSignOut} className="sign-out-btn" title="Sign Out">
                <i className="fa-solid fa-power-off"></i>
              </button>
            </div>
          ) : (
            <Link to="/signup" className="signup-link-btn">
              <i className="fa-solid fa-user-plus"></i> Sign Up
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
