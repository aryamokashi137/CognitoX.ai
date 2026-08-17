import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
} from 'chart.js';
import { Radar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

export default function Dashboard() {
  const token = localStorage.getItem('authToken');
  const savedUsername = localStorage.getItem('username') || 'User';

  // Profile states
  const [profileName, setProfileName] = useState(savedUsername);
  const [profileEmail, setProfileEmail] = useState('arya.mokashi@example.com');
  const [profilePic, setProfilePic] = useState('https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y');
  const [showSettings, setShowSettings] = useState(false);

  // Settings form temp state
  const [tempName, setTempName] = useState(profileName);
  const [tempEmail, setTempEmail] = useState(profileEmail);

  // AI Deep Dive modal states
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiContent, setAiContent] = useState('');
  const [xaiData, setXaiData] = useState(null);

  // Dashboard data state
  const [dashboardData, setDashboardData] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [temporalProfile, setTemporalProfile] = useState(null);

  // Dynamic AI Learning Companion states
  const [showCompanion, setShowCompanion] = useState(false);
  const [companionMood, setCompanionMood] = useState('focused');
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([
    { role: 'model', text: "Outstanding. You're in the zone. What complex topic are we mastering today?" }
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Closed-loop Strategy Feedback states
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComments, setFeedbackComments] = useState('');
  const [feedbackHistory, setFeedbackHistory] = useState([]);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Load dashboard data
  useEffect(() => {
    fetchDashboardData();
    fetchTemporalProfile();
    fetchFeedbackHistory();
    // Load local custom profile if saved
    const savedName = localStorage.getItem('customProfileName');
    const savedEmail = localStorage.getItem('customProfileEmail');
    const savedPic = localStorage.getItem('customProfilePic');
    if (savedName) setProfileName(savedName);
    if (savedEmail) setProfileEmail(savedEmail);
    if (savedPic) setProfilePic(savedPic);
  }, []);

  const fetchTemporalProfile = async () => {
    if (!token) return;
    try {
      const response = await fetch('http://localhost:5000/api/ai/temporal-profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setTemporalProfile(data);
      }
    } catch (error) {
      console.error('Error fetching temporal profile:', error);
    }
  };

  const fetchFeedbackHistory = async () => {
    if (!token) return;
    try {
      const response = await fetch('http://localhost:5000/api/ai/feedback', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setFeedbackHistory(data.feedbacks || []);
      }
    } catch (error) {
      console.error('Error fetching feedback history:', error);
    }
  };

  const showToastNotification = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 4000);
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!token) return;
    setSubmittingFeedback(true);
    try {
      const response = await fetch('http://localhost:5000/api/ai/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          strategy: strategy || 'Visual / Spaced Repetition',
          rating: feedbackRating,
          comments: feedbackComments
        })
      });
      if (response.ok) {
        setFeedbackComments('');
        setFeedbackRating(5);
        fetchFeedbackHistory();
        showToastNotification("Strategy feedback submitted! Recommendation engine updated.");
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // Companion scroll to bottom effect
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, chatLoading, showCompanion]);

  const handleMoodChange = (newMood) => {
    setCompanionMood(newMood);
    let welcomeText = "";
    if (newMood === 'stressed') {
      welcomeText = "Take a deep breath. I'm here for you. How are you feeling right now, and what's on your mind?";
    } else if (newMood === 'unmotivated') {
      welcomeText = "Let's get moving! What is one tiny thing we can accomplish in the next 2 minutes?";
    } else if (newMood === 'focused') {
      welcomeText = "Outstanding. You're in the zone. What complex topic are we mastering today?";
    } else if (newMood === 'inquisitive') {
      welcomeText = "Excellent! Curiosity is the engine of intellect. What concept shall we dissect today?";
    }
    setChatHistory([
      { role: 'model', text: welcomeText }
    ]);
  };

  const handleSendMessage = async (e, textOverride = '') => {
    if (e) e.preventDefault();
    const msgToSend = textOverride || chatMessage;
    if (!msgToSend.trim()) return;

    const updatedHistory = [...chatHistory, { role: 'user', text: msgToSend }];
    setChatHistory(updatedHistory);
    setChatMessage('');
    setChatLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/ai/companion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: msgToSend,
          mood: companionMood,
          chat_history: updatedHistory.slice(1, -1)
        })
      });
      const data = await response.json();
      if (response.ok) {
        setChatHistory([...updatedHistory, { role: 'model', text: data.reply }]);
      } else {
        setChatHistory([...updatedHistory, { role: 'model', text: `Sorry, I hit a snag: ${data.detail || 'Connection failed'}` }]);
      }
    } catch (error) {
      console.error('Error in companion chat:', error);
      setChatHistory([...updatedHistory, { role: 'model', text: "Sorry, I can't connect to my brain. Please check your network." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    if (!token) return;
    setLoadingData(true);
    try {
      const response = await fetch('http://localhost:5000/api/dashboard', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && data.history && data.history.length > 0) {
        setDashboardData(data.history[0]); // Get newest
      } else {
        setDashboardData(null);
      }
      fetchTemporalProfile();
    } catch (error) {
      console.error('Error fetching dashboard details:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleProfileUpdate = (e) => {
    e.preventDefault();
    setProfileName(tempName);
    setProfileEmail(tempEmail);
    localStorage.setItem('customProfileName', tempName);
    localStorage.setItem('customProfileEmail', tempEmail);
    setShowSettings(false);
  };

  const handlePicUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setProfilePic(uploadEvent.target.result);
        localStorage.setItem('customProfilePic', uploadEvent.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const openAIDeepDive = async () => {
    setShowAiModal(true);
    setAiLoading(true);
    setAiContent('');
    setXaiData(null);

    try {
      const res = await fetch('http://localhost:5000/api/ai/explain', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setAiLoading(false);

      if (res.ok) {
        // Parse simple markdown to HTML strings
        const formatted = data.explanation
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/### (.*?)\n/g, '<h3>$1</h3>')
          .replace(/\n\* (.*?)\n/g, '<li>$1</li>')
          .replace(/\n\d\. (.*?)\n/g, '<li>$1</li>')
          .replace(/\n/g, '<br>');
        setAiContent(formatted);
        setXaiData({
          features: data.feature_contributions,
          metadata: data.model_metadata
        });
      } else {
        const errorTitle = res.status === 429 ? 'Quota Limit Reached' : 
                            res.status === 501 ? 'AI Feature Not Configured' : 'AI Service Unavailable';
        setAiContent(`
          <div class="ai-error-box">
            <h4>${errorTitle}</h4>
            <p>${data.message || data.error}</p>
          </div>
        `);
      }
    } catch (err) {
      setAiLoading(false);
      setAiContent('<p class="text-error">Error connecting to AI service. Ensure backend is running.</p>');
    }
  };

  // Calculations based on 12 questionnaire features
  const getProcrastinationRisk = (features) => {
    if (!features) return 'Low';
    let score = 0;
    if (features[0] === 0) score += 2;
    if (features[7] === 1 || features[7] === 2) score += 3;
    if (features[8] === 2) score += 4;
    if (features[9] === 0) score += 2;

    if (score >= 7) return 'High';
    if (score >= 4) return 'Moderate';
    return 'Low';
  };

  const getModalityPercentages = (features) => {
    if (!features) return { visual: 30, reading: 30, kinesthetic: 30 };
    const styleIdx = features[1];
    let v = 30, r = 30, k = 30;
    if (styleIdx === 0) { v = 85; r = 35; k = 20; }
    if (styleIdx === 1) { r = 85; v = 35; k = 20; }
    if (styleIdx === 2) { k = 85; v = 35; r = 35; }
    return { visual: v, reading: r, kinesthetic: k };
  };

  const getPersonalityTraits = (features) => {
    if (!features) return { openness: 'Mid', conscientiousness: 'Mid', extraversion: 'Mid', agreeableness: 'Mid', neuroticism: 'Mid' };
    const openness = (features[11] === 1) ? 'High' : 'Moderate';
    const conscientiousness = (features[9] === 1) ? 'High' : 'Moderate';
    const extraversion = (features[2] === 1) ? 'High' : 'Moderate';
    const agreeableness = (features[3] === 2) ? 'High' : 'Moderate';
    const neuroticism = (features[8] === 2) ? 'High' : 'Moderate';
    return { openness, conscientiousness, extraversion, agreeableness, neuroticism };
  };

  const getPlayerType = (features) => {
    if (!features) return { type: 'Explorer', desc: 'Curious, discovery-driven learner.' };
    if (features[11] === 1) {
      return { type: 'Architect', desc: 'You see the big picture and build complex mental frameworks.' };
    } else if (features[5] === 1) {
      return { type: 'Perfectionist', desc: 'You value detail, spaced repetition, and absolute clarity.' };
    } else {
      return { type: 'Explorer', desc: 'Curious, discovery-driven learner who loves new challenges.' };
    }
  };

  const getStudyRecommendations = (strategy, styleIdx) => {
    const all = [
      { icon: 'fa-diagram-project', title: 'Visual Mapping', desc: 'Use diagrams & mind maps to link ideas' },
      { icon: 'fa-lightbulb', title: 'Problem-First', desc: 'Start with practice challenges before reading' },
      { icon: 'fa-hand', title: 'Hands-On Study', desc: 'Build quick prototypes and write mock codes' },
      { icon: 'fa-users', title: 'Collaborative Groups', desc: 'Host peer tutoring and group reviews' },
      { icon: 'fa-brain', title: 'Active Recall', desc: 'Use active retrieval practice like flashcards' },
      { icon: 'fa-calendar-days', title: 'Spaced Repetition', desc: 'Distribute study sessions over several days' }
    ];

    if (strategy && strategy.toLowerCase().includes('social')) {
      return [all[3], all[1], all[4], all[5]];
    }
    if (strategy && strategy.toLowerCase().includes('visual')) {
      return [all[0], all[1], all[2], all[5]];
    }
    if (styleIdx === 2) {
      return [all[2], all[1], all[4], all[0]];
    }
    return [all[0], all[1], all[2], all[3]];
  };

  // Render variables
  const hasData = dashboardData !== null;
  const features = dashboardData?.features;
  const strategy = dashboardData?.recommended_strategy || '';
  const ability = dashboardData?.learning_ability || '';

  const procRisk = getProcrastinationRisk(features);
  const modalities = getModalityPercentages(features);
  const traits = getPersonalityTraits(features);
  const player = getPlayerType(features);
  const recommendations = getStudyRecommendations(strategy, features ? features[1] : null);

  // Radar Chart Config
  const pFocus = features ? (features[3] + 1) * 20 + 10 : 50;
  const pSpeed = features ? (features[4] === 0 ? 90 : features[4] === 1 ? 60 : 30) : 50;
  const pResilience = features ? (features[8] === 0 ? 85 : 40) : 50;
  const pConsistency = features ? (features[9] === 1 ? 95 : 50) : 50;
  const pBigPicture = features ? (features[10] === 1 ? 90 : 40) : 50;

  const radarData = {
    labels: ['Focus', 'Speed', 'Resilience', 'Consistency', 'Big Picture'],
    datasets: [{
      label: 'Learning Power Index',
      data: [pFocus, pSpeed, pResilience, pConsistency, pBigPicture],
      backgroundColor: 'rgba(20, 184, 166, 0.2)',
      borderColor: 'rgb(20, 184, 166)',
      pointBackgroundColor: 'rgb(99, 102, 241)',
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: 'rgb(20, 184, 166)',
      borderWidth: 2
    }]
  };

  const radarOptions = {
    scales: {
      r: {
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
        angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
        pointLabels: { color: '#94a3b8', font: { family: 'Outfit', size: 12, weight: '600' } },
        ticks: { display: false },
        suggestedMin: 0,
        suggestedMax: 100
      }
    },
    plugins: {
      legend: { display: false }
    },
    maintainAspectRatio: false
  };

  return (
    <div className="dashboard-page animate-fade-in">
      <header className="dashboard-header-container">
        <div className="header-text-group">
          <h1>Learning Dashboard</h1>
          <p>Your personalized learning intelligence report</p>
        </div>
        <button onClick={() => { setTempName(profileName); setTempEmail(profileEmail); setShowSettings(true); }} className="btn-secondary">
          <i className="fa-solid fa-gear"></i> Profile Settings
        </button>
      </header>

      {loadingData ? (
        <div className="dashboard-loading-state">
          <i className="fa-solid fa-spinner fa-spin-pulse loader-icon"></i>
          <p>Analyzing learning patterns...</p>
        </div>
      ) : !hasData ? (
        <div className="glass-card no-data-state">
          <i className="fa-solid fa-head-side-virus no-data-icon"></i>
          <h2>No Learning Profile Found</h2>
          <p>Complete the intelligence questionnaire to generate your custom AI insights and recommendation models.</p>
          <Link to="/questionnaire" className="btn-primary">
            <i className="fa-solid fa-circle-question"></i> Take Questionnaire
          </Link>
        </div>
      ) : (
        <>
          {/* Profile Overview Card */}
          <section className="glass-card profile-overview-card">
            <div className="profile-summary-grid">
              <div className="profile-avatar-details">
                <div className="avatar-wrapper">
                  <img src={profilePic} alt="Profile" />
                </div>
                <div className="profile-meta-text">
                  <h2>{profileName}</h2>
                  <span className="badge-tag">IT Student</span>
                </div>
              </div>
              
              <div className="profile-quick-stats">
                <div className="stat-node">
                  <h3>85%</h3>
                  <p>Efficiency</p>
                </div>
                <div className="stat-node">
                  <h3>{ability || 'Visual Explorer'}</h3>
                  <p>Learning Style</p>
                </div>
                <div className="stat-node">
                  <h3>{player.type}</h3>
                  <p>Personality Type</p>
                </div>
                <div className="stat-node">
                  <h3 className={`risk-tag risk-${procRisk.toLowerCase()}`}>{procRisk}</h3>
                  <p>Procrastination Risk</p>
                </div>
              </div>
            </div>
          </section>

          {/* AI Recommendation System */}
          <section className="glass-card ai-recommendations-section">
            <div className="ai-section-title">
              <h2>
                <i className="fa-solid fa-wand-magic-sparkles text-teal-glow"></i> AI Study Recommendations
              </h2>
              <p>Tailored strategies derived from your machine learning profile.</p>
            </div>

            <div className="recommendations-grid">
              {recommendations.map((rec, index) => (
                <div key={index} className="glass-card recommendation-card-item">
                  <div className="rec-icon-wrapper">
                    <i className={`fa-solid ${rec.icon}`}></i>
                  </div>
                  <h4>{rec.title}</h4>
                  <p>{rec.desc}</p>
                </div>
              ))}
            </div>

            <div className="ai-insight-banner">
              <div className="insight-text-group">
                <i className="fa-solid fa-robot insight-robot"></i>
                <div className="insight-statement">
                  <strong>AI Insights Summary:</strong> You are identified as a dominant <b>{ability}</b>. Recommended Strategy: {strategy || 'Structured Visuals with Hands-on Experiments.'}
                </div>
              </div>
              <button onClick={openAIDeepDive} className="btn-primary explain-tips-btn">
                <i className="fa-solid fa-brain"></i> Explain & Get Tips
              </button>
            </div>
          </section>

          {/* Dynamic Temporal Learner Profile Section */}
          <section className="glass-card temporal-profile-section">
            <div className="temporal-section-title-group">
              <div className="title-left">
                <h2>
                  <i className="fa-solid fa-clock-rotate-left text-indigo-glow"></i> Dynamic Temporal Profile
                </h2>
                <p>Real-time learner profile adaptations computed from your habit tracking history.</p>
              </div>
              <span className={`temporal-status-badge ${temporalProfile?.is_adapted ? 'status-active' : 'status-baseline'}`}>
                <i className={`fa-solid ${temporalProfile?.is_adapted ? 'fa-bolt animate-pulse text-teal-glow' : 'fa-circle-check text-gray'}`}></i>{' '}
                {temporalProfile?.is_adapted ? 'Dynamic Profile: Adapted' : 'Dynamic Profile: Baseline'}
              </span>
            </div>

            <div className="temporal-content-grid">
              {/* Left Column: Recent profile shift logs */}
              <div className="temporal-notes-card glass-card">
                <h4><i className="fa-solid fa-list-check"></i> Behavioral Adaptations (Last 7 Days)</h4>
                <ul className="temporal-notes-list">
                  {temporalProfile?.notes && temporalProfile.notes.map((note, idx) => (
                    <li key={idx} className={temporalProfile?.is_adapted ? 'note-adapted' : 'note-baseline'}>
                      <i className={`fa-solid ${temporalProfile?.is_adapted && !note.includes("Serving") && !note.includes("matching") ? 'fa-square-plus text-teal-glow' : 'fa-info-circle text-gray'}`}></i>
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Right Column: Comparative Profile view */}
              <div className="temporal-comparison-card glass-card">
                <h4><i className="fa-solid fa-right-left"></i> Baseline vs. Active Profile</h4>
                <div className="comparison-table-wrapper">
                  <table className="comparison-table">
                    <thead>
                      <tr>
                        <th>Trait / Parameter</th>
                        <th>Baseline Questionnaire</th>
                        <th>Active Profile (Dynamic)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {temporalProfile?.original_profile && temporalProfile.original_profile.map((p, idx) => {
                        const adaptedVal = temporalProfile?.adapted_profile[idx]?.answer;
                        const isChanged = p.answer !== adaptedVal;
                        return (
                          <tr key={idx} className={isChanged ? 'row-changed' : 'row-unchanged'}>
                            <td className="param-tag">{p.tag}</td>
                            <td className="param-baseline">{p.answer}</td>
                            <td className={`param-active ${isChanged ? 'active-changed' : ''}`}>
                              {isChanged ? (
                                <>
                                  <i className="fa-solid fa-arrow-right-long mr-2 text-teal-glow"></i>
                                  <strong>{adaptedVal}</strong>
                                </>
                              ) : (
                                p.answer
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>

          {/* Closed-Loop Strategy Feedback Section */}
          <section className="glass-card feedback-loop-section animate-fade-in">
            <div className="feedback-section-title-group">
              <h2>
                <i className="fa-solid fa-arrows-spin text-purple-glow mr-2"></i> Self-Improving Recommendation Loop
              </h2>
              <p>Your ratings and comments dynamically refine the XAI engine prompts to personalize future recommendations.</p>
            </div>

            <div className="feedback-content-grid">
              {/* Form to submit feedback */}
              <div className="submit-feedback-card glass-card">
                <h4><i className="fa-solid fa-pen-to-square mr-2"></i> Rate Active Strategy</h4>
                <div className="active-strategy-pill">
                  <span className="pill-label">Active Strategy:</span>
                  <strong>{dashboardData?.recommended_strategy || 'Visual / Spaced Repetition'}</strong>
                </div>

                <form onSubmit={handleFeedbackSubmit} className="feedback-submission-form">
                  <div className="rating-selector-group">
                    <span className="rating-label">Effectiveness:</span>
                    <div className="star-rating-row">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          className={`star-btn ${star <= feedbackRating ? 'star-filled' : 'star-empty'}`}
                          onClick={() => setFeedbackRating(star)}
                        >
                          <i className="fa-solid fa-star"></i>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-input-node">
                    <label>Comments / Adjustments needed</label>
                    <textarea
                      placeholder="Tell us what worked or what didn't. (e.g., 'Too many breaks, I prefer longer focus periods.')"
                      value={feedbackComments}
                      onChange={(e) => setFeedbackComments(e.target.value)}
                      className="input-glass textarea-glass"
                      rows="3"
                    ></textarea>
                  </div>

                  <button type="submit" className="btn-primary w-full feedback-submit-btn" disabled={submittingFeedback}>
                    {submittingFeedback ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin mr-2"></i> Submitting...
                      </>
                    ) : (
                      <>
                        Submit Feedback <i className="fa-solid fa-paper-plane ml-2"></i>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* List of past feedbacks */}
              <div className="feedback-history-card glass-card">
                <h4><i className="fa-solid fa-clock-rotate-left mr-2"></i> Adaptation Log</h4>
                <div className="feedback-history-list">
                  {feedbackHistory.length === 0 ? (
                    <div className="empty-feedback-state">
                      <i className="fa-solid fa-comment-slash empty-icon"></i>
                      <p>No feedback logged yet. Rate the recommendation above to begin closed-loop tuning.</p>
                    </div>
                  ) : (
                    feedbackHistory.map((fb, idx) => (
                      <div key={idx} className="feedback-history-item">
                        <div className="fb-item-header">
                          <span className="fb-strategy-title">{fb.strategy}</span>
                          <div className="fb-stars">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <i
                                key={i}
                                className={`fa-solid fa-star ${i < fb.rating ? 'star-gold' : 'star-muted'}`}
                              ></i>
                            ))}
                          </div>
                        </div>
                        {fb.comments && <p className="fb-comment-text">"{fb.comments}"</p>}
                        <span className="fb-time-stamp">
                          {new Date(fb.timestamp).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Learning Modality, Personality and Radar analytics */}
          <section className="dashboard-analytics-grid">
            {/* 1. Learning Modality */}
            <div className="glass-card analytics-box-card">
              <h3>Learning Modality</h3>
              <p className="card-subtitle">Visual, auditory, and tactile strength distribution.</p>
              
              <div className="modality-meters-group">
                <div className="modality-meter">
                  <div className="meter-label">
                    <span>Visual</span>
                    <span>{modalities.visual}%</span>
                  </div>
                  <div className="meter-track">
                    <div className="meter-fill fill-teal" style={{ width: `${modalities.visual}%` }}></div>
                  </div>
                </div>

                <div className="modality-meter">
                  <div className="meter-label">
                    <span>Reading / Text</span>
                    <span>{modalities.reading}%</span>
                  </div>
                  <div className="meter-track">
                    <div className="meter-fill fill-indigo" style={{ width: `${modalities.reading}%` }}></div>
                  </div>
                </div>

                <div className="modality-meter">
                  <div className="meter-label">
                    <span>Kinesthetic</span>
                    <span>{modalities.kinesthetic}%</span>
                  </div>
                  <div className="meter-track">
                    <div className="meter-fill fill-purple" style={{ width: `${modalities.kinesthetic}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Personality Profile */}
            <div className="glass-card analytics-box-card">
              <h3>Personality Profile</h3>
              <p className="card-subtitle">Big-Five trait scores and cognitive type indicators.</p>

              <div className="personality-traits-list">
                {Object.entries(traits).map(([trait, level]) => (
                  <div key={trait} className="personality-trait-node">
                    <span className="trait-name">{trait.charAt(0).toUpperCase() + trait.slice(1)}</span>
                    <span className={`trait-badge badge-${level.toLowerCase()}`}>{level}</span>
                  </div>
                ))}
              </div>

              <div className="glass-card player-archetype-box">
                <strong>Player Archetype: {player.type}</strong>
                <p>{player.desc}</p>
              </div>
            </div>

            {/* 3. Radar charts */}
            <div className="glass-card analytics-box-card">
              <h3>Productivity Index</h3>
              <p className="card-subtitle">AI-calculated focus, speed, consistency and resilient indicators.</p>
              
              <div className="radar-chart-wrapper">
                <Radar data={radarData} options={radarOptions} />
              </div>

              <div className="additional-metrics-row">
                <div className="metric-tag-bubble">
                  <span>Focus Score</span>
                  <strong>{features ? (features[3] * 25) + 10 : 50}%</strong>
                </div>
                <div className="metric-tag-bubble">
                  <span>Stress Resistance</span>
                  <strong>{features ? (features[8] === 0 ? 90 : features[8] === 1 ? 50 : 20) : 50}%</strong>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {/* Settings Modal Popup */}
      {showSettings && (
        <div className="modal-overlay-backdrop" onClick={() => setShowSettings(false)}>
          <div className="glass-card modal-content-card animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setShowSettings(false)}>
              <i className="fa-solid fa-xmark"></i>
            </button>
            <h2>Edit Profile Settings</h2>
            
            <div className="profile-photo-modifier">
              <div className="preview-avatar-circle">
                <img src={profilePic} alt="Avatar" />
              </div>
              <input type="file" id="avatar-uploader" accept="image/*" onChange={handlePicUpload} />
              <label htmlFor="avatar-uploader" className="upload-label-btn">
                <i className="fa-solid fa-camera"></i> Change Photo
              </label>
            </div>

            <form onSubmit={handleProfileUpdate} className="settings-panel-form">
              <div className="form-input-node">
                <label>Display Name</label>
                <input 
                  type="text" 
                  value={tempName} 
                  onChange={(e) => setTempName(e.target.value)} 
                  className="input-glass" 
                  required 
                />
              </div>

              <div className="form-input-node">
                <label>Email Address</label>
                <input 
                  type="email" 
                  value={tempEmail} 
                  onChange={(e) => setTempEmail(e.target.value)} 
                  className="input-glass" 
                  required 
                />
              </div>

              <button type="submit" className="btn-primary w-full">
                Save Changes <i className="fa-solid fa-floppy-disk"></i>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* AI Deep Dive Modal Popup with XAI Explainability */}
      {showAiModal && (
        <div className="modal-overlay-backdrop" onClick={() => setShowAiModal(false)}>
          <div className="glass-card modal-content-card ai-deep-dive-card xai-modal-card animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setShowAiModal(false)}>
              <i className="fa-solid fa-xmark"></i>
            </button>
            
            <h2>
              <i className="fa-solid fa-brain text-indigo-glow"></i> Explainable AI (XAI) Model Interpretation
            </h2>

            {aiLoading ? (
              <div className="modal-loading-box">
                <i className="fa-solid fa-spinner fa-spin loader-icon"></i>
                <p>Consulting CognitoX XAI Engine...</p>
              </div>
            ) : (
              <div className="modal-scroll-body">
                <div className="xai-split-grid">
                  {/* Left Panel: Feature Contributions */}
                  <div className="xai-left-panel">
                    <div className="xai-section-title-tag">
                      <i className="fa-solid fa-chart-simple"></i> Model Attribution (Weights)
                    </div>
                    <div className="xai-features-list">
                      {xaiData && xaiData.features && xaiData.features.map((feat, index) => (
                        <div key={index} className="xai-feature-row">
                          <div className="xai-feature-info">
                            <span className="xai-feature-name">{feat.tag}</span>
                            <span className="xai-feature-importance">{feat.importance}% Importance</span>
                          </div>
                          <span className="xai-feature-answer">Your choice: {feat.answer}</span>
                          <div className="xai-progress-track">
                            <div 
                              className="xai-progress-fill" 
                              style={{ width: `${(feat.importance / 22) * 100}%` }} 
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Panel: Gemini Explanation */}
                  <div className="xai-right-panel">
                    <div className="xai-section-title-tag">
                      <i className="fa-solid fa-wand-magic-sparkles"></i> AI Narrative Explanation
                    </div>
                    <div 
                      className="ai-markdown-content" 
                      dangerouslySetInnerHTML={{ __html: aiContent }} 
                    />
                  </div>

                  {/* Footer: Metadata and Badges */}
                  {xaiData && xaiData.metadata && (
                    <div className="xai-metadata-footer">
                      <div className="xai-meta-badge">
                        <i className="fa-solid fa-microchip"></i>
                        <span>Algorithm: <strong>{xaiData.metadata.algorithm}</strong></span>
                      </div>
                      <div className="xai-meta-badge">
                        <i className="fa-solid fa-shield-halved"></i>
                        <span>Privacy: <strong>{xaiData.metadata.privacy}</strong></span>
                      </div>
                      <div className="xai-meta-badge">
                        <i className="fa-solid fa-circle-check"></i>
                        <span>Bias Audit: <strong>{xaiData.metadata.unbiased_check}</strong></span>
                      </div>
                      <div className="xai-meta-badge">
                        <i className="fa-solid fa-eye"></i>
                        <span>Transparency: <strong>{xaiData.metadata.transparency_level}</strong></span>
                      </div>
                    </div>
                  )}
                </div>
                <button onClick={() => setShowAiModal(false)} className="btn-primary w-full mt-6">
                  Got It, Thank You!
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dynamic Toast Notification Banner */}
      {toastMessage && (
        <div className="alert-toast animate-slide-in">
          <i className="fa-solid fa-circle-info text-teal-glow mr-2"></i>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Floating Chat Trigger Button */}
      {!showCompanion && (
        <button onClick={() => setShowCompanion(true)} className="companion-fab-btn animate-pulse">
          <i className="fa-solid fa-robot"></i>
          <span className="fab-tooltip">AI Companion</span>
        </button>
      )}

      {/* Companion Chat Drawer */}
      {showCompanion && (
        <div className="companion-chat-drawer glass-card animate-slide-in-right">
          <div className="drawer-header">
            <div className="header-info">
              <i className="fa-solid fa-robot text-teal-glow header-robot-icon"></i>
              <div>
                <h3>AI Companion</h3>
                <span className="persona-badge">
                  Persona: <strong>{
                    companionMood === 'focused' ? 'High-Performance Coach 🎯' :
                    companionMood === 'stressed' ? 'Empathetic Mentor 😫' :
                    companionMood === 'unmotivated' ? 'Accountability Coach 😴' :
                    'Socratic Challenger 💡'
                  }</strong>
                </span>
              </div>
            </div>
            <button onClick={() => setShowCompanion(false)} className="drawer-close-btn">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>

          {/* Mood Selector / Mood check-in */}
          <div className="drawer-mood-checkin">
            <span className="mood-prompt-text">How is your current study mood?</span>
            <div className="mood-icons-row">
              {[
                { mood: 'focused', icon: 'fa-bullseye', label: 'Focused', color: 'focused' },
                { mood: 'stressed', icon: 'fa-face-frown-open', label: 'Stressed', color: 'stressed' },
                { mood: 'unmotivated', icon: 'fa-bed', label: 'Sluggish', color: 'unmotivated' },
                { mood: 'inquisitive', icon: 'fa-lightbulb', label: 'Curious', color: 'inquisitive' }
              ].map((m) => (
                <button
                  key={m.mood}
                  type="button"
                  onClick={() => handleMoodChange(m.mood)}
                  className={`mood-icon-btn ${companionMood === m.mood ? `active-mood-${m.color}` : ''}`}
                  title={m.label}
                >
                  <i className={`fa-solid ${m.icon}`}></i>
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Chat Message Thread */}
          <div className="drawer-chat-thread">
            {chatHistory.map((msg, idx) => (
              <div key={idx} className={`chat-bubble-wrapper ${msg.role === 'user' ? 'bubble-user' : 'bubble-model'}`}>
                <div className="chat-bubble">
                  <p>{msg.text}</p>
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="chat-bubble-wrapper bubble-model">
                <div className="chat-bubble bubble-typing">
                  <span className="dot"></span>
                  <span className="dot"></span>
                  <span className="dot"></span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Prompts Panel */}
          <div className="drawer-quick-prompts">
            {companionMood === 'focused' && (
              <>
                <button type="button" onClick={(e) => handleSendMessage(e, 'Suggest a deep work study block structure')} className="quick-btn">
                  🎯 Deep work block
                </button>
                <button type="button" onClick={(e) => handleSendMessage(e, 'How can I limit notifications and multi-tasking?')} className="quick-btn">
                  🚫 Limit distractions
                </button>
              </>
            )}
            {companionMood === 'stressed' && (
              <>
                <button type="button" onClick={(e) => handleSendMessage(e, 'Guide me through a quick breathing exercise')} className="quick-btn">
                  😫 Breathing exercise
                </button>
                <button type="button" onClick={(e) => handleSendMessage(e, 'How to overcome task paralysis and anxiety?')} className="quick-btn">
                  🧘 Handling overwhelm
                </button>
              </>
            )}
            {companionMood === 'unmotivated' && (
              <>
                <button type="button" onClick={(e) => handleSendMessage(e, 'Give me a 5-minute micro-task to get started')} className="quick-btn">
                  ⚡ 5-minute task
                </button>
                <button type="button" onClick={(e) => handleSendMessage(e, 'Help me set a tiny study goal for the next hour')} className="quick-btn">
                  📝 Set tiny goal
                </button>
              </>
            )}
            {companionMood === 'inquisitive' && (
              <>
                <button type="button" onClick={(e) => handleSendMessage(e, 'Ask me a challenging question to test my understanding')} className="quick-btn">
                  💡 Test my knowledge
                </button>
                <button type="button" onClick={(e) => handleSendMessage(e, 'Explain a complex concept in simple terms')} className="quick-btn">
                  🧩 Socratic prompt
                </button>
              </>
            )}
          </div>

          {/* Footer input form */}
          <form onSubmit={handleSendMessage} className="drawer-input-form">
            <input
              type="text"
              placeholder={
                companionMood === 'focused' ? 'Ask for optimization tips...' :
                companionMood === 'stressed' ? 'Talk to your mentor...' :
                companionMood === 'unmotivated' ? 'Tell me what you need to start...' :
                'Ask something curious...'
              }
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              className="input-glass chat-text-input"
            />
            <button type="submit" className="chat-send-btn" disabled={chatLoading || !chatMessage.trim()}>
              <i className="fa-solid fa-paper-plane"></i>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
