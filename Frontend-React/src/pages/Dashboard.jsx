import React, { useState, useEffect } from 'react';
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

  // Dashboard data state
  const [dashboardData, setDashboardData] = useState(null);
  const [loadingData, setLoadingData] = useState(true);

  // Load dashboard data
  useEffect(() => {
    fetchDashboardData();
    // Load local custom profile if saved
    const savedName = localStorage.getItem('customProfileName');
    const savedEmail = localStorage.getItem('customProfileEmail');
    const savedPic = localStorage.getItem('customProfilePic');
    if (savedName) setProfileName(savedName);
    if (savedEmail) setProfileEmail(savedEmail);
    if (savedPic) setProfilePic(savedPic);
  }, []);

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

    try {
      const res = await fetch('http://localhost:5000/api/ai/deep-dive', {
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

      {/* AI Deep Dive Modal Popup */}
      {showAiModal && (
        <div className="modal-overlay-backdrop" onClick={() => setShowAiModal(false)}>
          <div className="glass-card modal-content-card ai-deep-dive-card animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setShowAiModal(false)}>
              <i className="fa-solid fa-xmark"></i>
            </button>
            
            <h2>
              <i className="fa-solid fa-brain text-indigo-glow"></i> AI Strategy Deep-Dive
            </h2>

            {aiLoading ? (
              <div className="modal-loading-box">
                <i className="fa-solid fa-spinner fa-spin loader-icon"></i>
                <p>Consulting CognitoX AI Engine...</p>
              </div>
            ) : (
              <div className="modal-scroll-body">
                <div 
                  className="ai-markdown-content" 
                  dangerouslySetInnerHTML={{ __html: aiContent }} 
                />
                <button onClick={() => setShowAiModal(false)} className="btn-primary w-full mt-4">
                  Got It!
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
