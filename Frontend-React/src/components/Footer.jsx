import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

export default function Footer() {
  const navigate = useNavigate();
  const location = useLocation();

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

  return (
    <footer className="footer-section">
      <div className="footer-content">
        <div className="footer-brand">
          <h3>CognitoX.ai</h3>
          <p className="footer-tagline">Identify Learning Patterns using AI</p>
        </div>
        
        <nav className="footer-links">
          <button onClick={() => scrollToSection('home')} className="footer-btn-link">Home</button>  
          <button onClick={() => scrollToSection('how-it-works')} className="footer-btn-link">How It Works</button>
          <button onClick={() => scrollToSection('features')} className="footer-btn-link">Features</button>
          <Link to="/questionnaire">Questionnaire</Link>
        </nav>
        
        <div className="footer-meta">
          <p>© 2026 CognitoX.ai. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
