import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const QUESTIONS = [
  {
    tag: "Learning Schedule",
    question: "What time of day do you feel most productive for learning?",
    options: [
      "Early morning (5–8 AM)",
      "Morning (8–12 PM)",
      "Afternoon (12–5 PM)",
      "Evening / Night"
    ]
  },
  {
    tag: "Learning Style",
    question: "How do you prefer to learn new concepts?",
    options: [
      "Visual aids (videos, diagrams)",
      "Reading and writing",
      "Hands-on practice",
      "Discussion and collaboration"
    ]
  },
  {
    tag: "Study Environment",
    question: "Where do you study best?",
    options: [
      "Quiet library or room",
      "Coffee shop with background noise",
      "At home with music",
      "Outdoors or changing locations"
    ]
  },
  {
    tag: "Focus Duration",
    question: "How long can you focus without a break?",
    options: [
      "15-25 minutes",
      "25-45 minutes",
      "45-90 minutes",
      "90+ minutes"
    ]
  },
  {
    tag: "Learning Pace",
    question: "What learning pace suits you best?",
    options: [
      "Slow and thorough",
      "Moderate with reviews",
      "Fast-paced learning",
      "Self-paced flexibility"
    ]
  },
  {
    tag: "Study Method",
    question: "Which study method works best for you?",
    options: [
      "Making notes and summaries",
      "Flashcards and repetition",
      "Teaching others",
      "Practice problems and tests"
    ]
  },
  {
    tag: "Motivation",
    question: "What motivates you to learn?",
    options: [
      "Career advancement",
      "Personal interest",
      "Academic requirements",
      "Solving real-world problems"
    ]
  },
  {
    tag: "Learning Challenges",
    question: "What's your biggest learning challenge?",
    options: [
      "Staying focused",
      "Managing time",
      "Understanding complex topics",
      "Remembering information"
    ]
  },
  {
    tag: "Stress Response",
    question: "How do you usually handle academic or study-related stress?",
    options: [
      "Take breaks and practice relaxation",
      "Push through and work harder",
      "Procrastinate and avoid the work",
      "Seek help from peers or mentors"
    ]
  },
  {
    tag: "Retrieval Practice",
    question: "When preparing for an exam, how do you review your material?",
    options: [
      "Cramming the night before",
      "Spaced repetition over several days",
      "Last-minute skimming of notes",
      "Discussing the topics with others"
    ]
  },
  {
    tag: "Information Processing",
    question: "How do you best process complex new information?",
    options: [
      "Breaking it down into chunks",
      "Looking at the big picture first",
      "Creating analogies",
      "Repeatedly reading it"
    ]
  },
  {
    tag: "Technology Usage",
    question: "How heavily do you rely on technology while studying?",
    options: [
      "Minimal (Textbooks/Handwritten notes)",
      "Moderate (Research/Organizing)",
      "Heavy (AI solvers/Digital summaries)",
      "Complete dependency"
    ]
  }
];

export default function Questionnaire() {
  const navigate = useNavigate();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selections, setSelections] = useState(Array(QUESTIONS.length).fill(null));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const currentQuestion = QUESTIONS[currentIdx];
  const progressPercent = ((currentIdx + 1) / QUESTIONS.length) * 100;

  const handleOptionSelect = (optionIndex) => {
    const updated = [...selections];
    updated[currentIdx] = optionIndex;
    setSelections(updated);
  };

  const handleNext = () => {
    if (selections[currentIdx] === null) {
      setError('Please select an option before continuing.');
      return;
    }
    setError('');

    if (currentIdx < QUESTIONS.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      submitAssessment();
    }
  };

  const handleBack = () => {
    setError('');
    if (currentIdx > 0) {
      setCurrentIdx(currentIdx - 1);
    }
  };

  const submitAssessment = async () => {
    setSubmitting(true);
    setError('');
    const token = localStorage.getItem('authToken');

    try {
      const response = await fetch('http://127.0.0.1:5000/api/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({ features: selections })
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('latestPrediction', JSON.stringify(data));
        // Save answers for local fallback reference
        const formattedAnswers = QUESTIONS.map((q, idx) => ({
          question: q.question,
          answer: q.options[selections[idx]]
        }));
        localStorage.setItem('assessmentAnswers', JSON.stringify(formattedAnswers));
        navigate('/dashboard');
      } else {
        setError(data.error || 'Failed to generate prediction from model.');
      }
    } catch (err) {
      console.error('Error submitting questionnaire:', err);
      setError('Could not connect to the backend server. Make sure it is running.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="assessment-container animate-fade-in">
      <main className="assessment-card-wrapper">
        <div className="assessment-header">
          <h1>
            <i className="fa-solid fa-user-pen text-teal-glow"></i> Learning Assessment
          </h1>
          <span className="question-count">
            Question {currentIdx + 1} of {QUESTIONS.length}
          </span>
        </div>

        <div className="progress-bar-container">
          <div 
            className="progress-bar-fill" 
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>

        {error && (
          <div className="error-banner">
            <i className="fa-solid fa-triangle-exclamation"></i>
            <span>{error}</span>
          </div>
        )}

        <div className="glass-card question-display-card">
          <span className="question-category-tag">
            <i className="fa-solid fa-tags"></i> {currentQuestion.tag}
          </span>
          
          <h2 className="question-text">{currentQuestion.question}</h2>
          
          <div className="options-selection-grid">
            {currentQuestion.options.map((option, idx) => {
              const isSelected = selections[currentIdx] === idx;
              return (
                <label 
                  key={idx} 
                  className={`option-selection-label glass-card ${isSelected ? 'selected' : ''}`}
                >
                  <input
                    type="radio"
                    name={`q-${currentIdx}`}
                    value={idx}
                    checked={isSelected}
                    onChange={() => handleOptionSelect(idx)}
                    className="option-radio-hidden"
                  />
                  <div className="option-indicator">
                    {String.fromCharCode(65 + idx)}
                  </div>
                  <span className="option-label-text">{option}</span>
                  {isSelected && <i className="fa-solid fa-circle-check option-check-icon"></i>}
                </label>
              );
            })}
          </div>

          <div className="questionnaire-navigation">
            {currentIdx > 0 ? (
              <button onClick={handleBack} className="btn-secondary" disabled={submitting}>
                <i className="fa-solid fa-arrow-left"></i> Back
              </button>
            ) : (
              <div />
            )}

            <button onClick={handleNext} className="btn-primary" disabled={submitting}>
              {submitting ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i> Submitting...
                </>
              ) : currentIdx === QUESTIONS.length - 1 ? (
                <>
                  Finish Assessment <i className="fa-solid fa-circle-check"></i>
                </>
              ) : (
                <>
                  Next Question <i className="fa-solid fa-arrow-right"></i>
                </>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
