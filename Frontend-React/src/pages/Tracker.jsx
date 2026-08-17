import React, { useState, useEffect } from 'react';
import { Pie, Bar } from 'react-chartjs-2';
import { useTheme } from '../context/ThemeContext';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
} from 'chart.js';

// Register ChartJS modules
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function Tracker() {
  const { theme } = useTheme();
  const token = localStorage.getItem('authToken');
  const isDark = theme === 'dark';

  // Month navigation state
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  // Habits state
  const [habits, setHabits] = useState([]);
  const [habitLogs, setHabitLogs] = useState({});
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitIsPersonalization, setNewHabitIsPersonalization] = useState(false);
  const [loading, setLoading] = useState(true);

  // Decoupled category tab
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'gamification', 'personalization'

  // Research Analytics log state
  const [analyticsSummary, setAnalyticsSummary] = useState({
    gamified_interactions_count: 0,
    personalization_interactions_count: 0,
    recent_logs: []
  });

  // Load habits and analytics on mount & month changes
  useEffect(() => {
    fetchHabits();
    fetchAnalyticsSummary();
    logInteraction('gamification', 'page_view', 'Loaded Tracker analytics page');
  }, []);

  const fetchHabits = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/habits', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setHabits(data.habits || []);
        setHabitLogs(data.logs || {});
      }
    } catch (e) {
      console.error('Error fetching habits:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalyticsSummary = async () => {
    if (!token) return;
    try {
      const response = await fetch('http://localhost:5000/api/analytics/summary', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setAnalyticsSummary({
          gamified_interactions_count: data.gamified_interactions_count,
          personalization_interactions_count: data.personalization_interactions_count,
          recent_logs: data.recent_logs || []
        });
      }
    } catch (e) {
      console.error('Error fetching analytics summary:', e);
    }
  };

  const logInteraction = async (trackType, eventType, details) => {
    if (!token) return;
    try {
      await fetch('http://localhost:5000/api/analytics/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          track_type: trackType,
          event_type: eventType,
          details: details
        })
      });
      fetchAnalyticsSummary();
    } catch (e) {
      console.error('Error logging interaction:', e);
    }
  };

  const handleAddHabit = async (e) => {
    e.preventDefault();
    const name = newHabitName.trim();
    if (!name || !token) return;

    try {
      const res = await fetch('http://localhost:5000/api/habits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          name,
          is_personalization: newHabitIsPersonalization
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        setHabits([...habits, { 
          id: data.id, 
          name: data.name,
          is_personalization: data.is_personalization 
        }]);
        setHabitLogs({
          ...habitLogs,
          [data.id]: {}
        });
        setNewHabitName('');
        logInteraction(
          data.is_personalization ? 'personalization' : 'gamification',
          'create_quest',
          `Created quest/habit: "${data.name}"`
        );
      }
    } catch (err) {
      console.error('Error adding quest/habit:', err);
    }
  };

  const handleDeleteHabit = async (habitId) => {
    if (!token) return;
    const targetHabit = habits.find(h => String(h.id) === String(habitId));
    const track = targetHabit?.is_personalization ? 'personalization' : 'gamification';

    try {
      const res = await fetch(`http://localhost:5000/api/habits?id=${habitId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        setHabits(habits.filter(h => String(h.id) !== String(habitId)));
        const updatedLogs = { ...habitLogs };
        delete updatedLogs[habitId];
        setHabitLogs(updatedLogs);
        
        logInteraction(
          track,
          'delete_quest',
          `Deleted quest/habit: "${targetHabit?.name || habitId}"`
        );
      }
    } catch (err) {
      console.error('Error deleting habit:', err);
    }
  };

  const handleToggleHabit = async (habitId, day) => {
    const key = `${currentYear}-${currentMonth}-${day}`;
    const targetHabit = habits.find(h => String(h.id) === String(habitId));
    const track = targetHabit?.is_personalization ? 'personalization' : 'gamification';

    // Optimistic local state update
    const currentHabitLogs = habitLogs[habitId] || {};
    const isChecked = !!currentHabitLogs[key];
    
    const updatedHabitLogs = {
      ...habitLogs,
      [habitId]: {
        ...currentHabitLogs,
        [key]: !isChecked
      }
    };
    setHabitLogs(updatedHabitLogs);

    if (token) {
      try {
        await fetch('http://localhost:5000/api/habits/log', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ habit_id: habitId, date_str: key })
        });
        logInteraction(
          track,
          isChecked ? 'uncheck' : 'check',
          `${isChecked ? 'Removed log entry' : 'Completed log entry'} for "${targetHabit?.name}" on day ${day}`
        );
      } catch (err) {
        console.error('Error logging habit toggle:', err);
        // Revert local state on error
        setHabitLogs({
          ...habitLogs,
          [habitId]: {
            ...currentHabitLogs,
            [key]: isChecked
          }
        });
      }
    }
  };

  const changeMonth = (delta) => {
    let nextMonth = currentMonth + delta;
    let nextYear = currentYear;

    if (nextMonth > 11) {
      nextMonth = 0;
      nextYear++;
    } else if (nextMonth < 0) {
      nextMonth = 11;
      nextYear--;
    }

    setCurrentMonth(nextMonth);
    setCurrentYear(nextYear);
    logInteraction('gamification', 'change_month', `Navigated calendar to ${MONTH_NAMES[nextMonth]} ${nextYear}`);
  };

  const getDaysInMonth = () => {
    return new Date(currentYear, currentMonth + 1, 0).getDate();
  };

  // Stats calculation
  const totalDays = getDaysInMonth();
  const totalHabits = habits.length;
  const totalPossibleLogs = totalHabits * totalDays;
  
  let completedLogsCount = 0;
  let gamifiedCompletedCount = 0;
  let personalizationCompletedCount = 0;

  habits.forEach(habit => {
    const logsForHabit = habitLogs[habit.id] || {};
    for (let day = 1; day <= totalDays; day++) {
      const key = `${currentYear}-${currentMonth}-${day}`;
      if (logsForHabit[key]) {
        completedLogsCount++;
        if (habit.is_personalization) personalizationCompletedCount++;
        else gamifiedCompletedCount++;
      }
    }
  });

  const completionRate = totalPossibleLogs > 0 ? Math.round((completedLogsCount / totalPossibleLogs) * 100) : 0;

  // Calculate current streak
  const getStreak = () => {
    const today = new Date();
    let streakCount = 0;

    if (currentYear === today.getFullYear() && currentMonth === today.getMonth()) {
      for (let day = today.getDate(); day >= 1; day--) {
        let allCompleted = true;
        
        if (habits.length === 0) {
          allCompleted = false;
        } else {
          habits.forEach(habit => {
            const key = `${currentYear}-${currentMonth}-${day}`;
            if (!habitLogs[habit.id]?.[key]) {
              allCompleted = false;
            }
          });
        }

        if (allCompleted) {
          streakCount++;
        } else {
          break;
        }
      }
    }
    return streakCount;
  };

  const streak = getStreak();

  // Gamification HUD calculations
  // Gamified Habits = 10 XP, Personalized Quests = 25 XP
  const totalXP = (gamifiedCompletedCount * 10) + (personalizationCompletedCount * 25);
  const level = Math.floor(totalXP / 100) + 1;
  const levelXP = totalXP % 100;
  
  const getRankName = (lvl) => {
    if (lvl >= 10) return "Omnipresent Sage 🌌";
    if (lvl >= 7) return "Deep Work Master 🧠";
    if (lvl >= 5) return "Flow State Pioneer ⚡";
    if (lvl >= 3) return "Consistency Athlete 🏃";
    return "Apprentice Scholar 📚";
  };

  // Pie Chart config
  const pieData = {
    labels: ['Completed Quests & Habits', 'Remaining'],
    datasets: [{
      data: [completedLogsCount, Math.max(0, totalPossibleLogs - completedLogsCount)],
      backgroundColor: ['#14b8a6', isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'],
      borderColor: [isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)', isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'],
      borderWidth: 1
    }]
  };

  const pieOptions = {
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: isDark ? '#f8fafc' : '#0f172a',
          font: { family: 'Outfit', size: 13 }
        }
      }
    },
    maintainAspectRatio: false
  };

  // Decoupled Analytics Bar Chart config
  const comparisonBarData = {
    labels: ['Gamified Habits 🎮', 'AI Quests 🧠'],
    datasets: [{
      label: 'Logged Check-Ins',
      data: [gamifiedCompletedCount, personalizationCompletedCount],
      backgroundColor: ['rgba(20, 184, 166, 0.65)', 'rgba(139, 92, 246, 0.65)'],
      borderColor: ['#14b8a6', '#8b5cf6'],
      borderWidth: 1.5,
      borderRadius: 4
    }]
  };

  const comparisonBarOptions = {
    scales: {
      y: {
        beginAtZero: true,
        ticks: { 
          stepSize: 2, 
          color: isDark ? '#94a3b8' : '#475569',
          font: { family: 'Plus Jakarta Sans', size: 10 } 
        },
        grid: { color: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)' }
      },
      x: {
        ticks: { 
          color: isDark ? '#94a3b8' : '#475569',
          font: { family: 'Plus Jakarta Sans', size: 10 } 
        },
        grid: { display: false }
      }
    },
    plugins: {
      legend: { display: false }
    },
    maintainAspectRatio: false
  };

  // Filtering habits based on the active tab
  const filteredHabits = habits.filter(h => {
    if (activeTab === 'all') return true;
    if (activeTab === 'gamification') return !h.is_personalization;
    if (activeTab === 'personalization') return h.is_personalization;
    return true;
  });

  const dayHeaders = [];
  for (let d = 1; d <= totalDays; d++) {
    dayHeaders.push(d);
  }

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    logInteraction(
      tab === 'all' ? 'gamification' : tab,
      'tab_switch',
      `Switched quest view category to: "${tab}"`
    );
  };

  return (
    <div className="tracker-page animate-fade-in">
      <header className="dashboard-header-container">
        <div className="header-text-group">
          <h1>Quest & Habit Tracker</h1>
          <p>Decoupled evaluation of gamified incentives versus AI-personalized curriculum quests</p>
        </div>
      </header>

      {/* Gamified HUD Progress Bar Card */}
      <section className="glass-card quest-hud-card">
        <div className="hud-header">
          <div className="hud-rank-info">
            <span className="scholar-rank-badge">{getRankName(level)}</span>
            <span className="level-badge">LEVEL {level}</span>
          </div>
          <div className="hud-xp-details">
            <span>{totalXP} Total XP</span>
            <span className="xp-gain-rates">(🎮 Habit: +10 XP | 🧠 AI Quest: +25 XP)</span>
          </div>
        </div>
        <div className="hud-xp-progress-bar-container">
          <div className="hud-xp-progress-bar-fill" style={{ width: `${levelXP}%` }}>
            <span className="xp-floating-label">{levelXP} / 100 XP</span>
          </div>
        </div>
      </section>

      {/* Stats Cards Section */}
      <section className="tracker-stats-grid">
        <div 
          className="glass-card stat-card-node clickable-stat"
          onMouseEnter={() => logInteraction('gamification', 'hover', 'Hovered over streak dashboard node')}
        >
          <div className="stat-icon-wrapper color-orange">
            <i className="fa-solid fa-fire"></i>
          </div>
          <div className="stat-node-values">
            <h2>{streak}</h2>
            <p>Day Streak</p>
          </div>
        </div>

        <div 
          className="glass-card stat-card-node clickable-stat"
          onMouseEnter={() => logInteraction('personalization', 'hover', 'Hovered over AI Quest completion metric')}
        >
          <div className="stat-icon-wrapper color-teal">
            <i className="fa-solid fa-square-check"></i>
          </div>
          <div className="stat-node-values">
            <h2>{completionRate}%</h2>
            <p>Completion Rate</p>
          </div>
        </div>

        <div className="glass-card stat-card-node">
          <div className="stat-icon-wrapper color-indigo">
            <i className="fa-solid fa-layer-group"></i>
          </div>
          <div className="stat-node-values">
            <h2>{totalHabits}</h2>
            <p>Active Quests</p>
          </div>
        </div>
      </section>

      {/* Decoupled Track Navigation Tabs */}
      <div className="track-navigation-tabs-row">
        <div className="quest-tabs-container">
          <button 
            onClick={() => handleTabChange('all')} 
            className={`quest-tab-btn ${activeTab === 'all' ? 'active-quest-tab' : ''}`}
          >
            📋 All Activities ({habits.length})
          </button>
          <button 
            onClick={() => handleTabChange('gamification')} 
            className={`quest-tab-btn ${activeTab === 'gamification' ? 'active-quest-tab' : ''}`}
          >
            🎮 Gamified Habits ({habits.filter(h => !h.is_personalization).length})
          </button>
          <button 
            onClick={() => handleTabChange('personalization')} 
            className={`quest-tab-btn ${activeTab === 'personalization' ? 'active-quest-tab' : ''}`}
          >
            🧠 AI Personalized Quests ({habits.filter(h => h.is_personalization).length})
          </button>
        </div>
      </div>

      {/* Month Control & Add Habit Section */}
      <div className="tracker-forms-row">
        <div className="glass-card month-navigator-card">
          <button onClick={() => changeMonth(-1)} className="btn-secondary compact-btn">
            <i className="fa-solid fa-chevron-left"></i> Prev
          </button>
          <span className="month-display-label">{MONTH_NAMES[currentMonth]} {currentYear}</span>
          <button onClick={() => changeMonth(1)} className="btn-secondary compact-btn">
            Next <i className="fa-solid fa-chevron-right"></i>
          </button>
        </div>

        <div className="glass-card add-habit-form-card">
          <form onSubmit={handleAddHabit} className="add-habit-inline-form">
            <input
              type="text"
              placeholder={newHabitIsPersonalization ? "Enter AI Quest (e.g. Solve Spaced Repetition quiz)" : "Enter standard habit (e.g. Drink 2L water, Gym)"}
              value={newHabitName}
              onChange={(e) => setNewHabitName(e.target.value)}
              className="input-glass"
              required
            />
            <div className="inline-checkbox-label">
              <label className="custom-checkbox-container label-text-xs">
                <input
                  type="checkbox"
                  checked={newHabitIsPersonalization}
                  onChange={(e) => {
                    setNewHabitIsPersonalization(e.target.checked);
                    logInteraction('personalization', 'click', `Toggled Create category to ${e.target.checked ? 'AI Quest' : 'Gamified Habit'}`);
                  }}
                />
                <span className="checkbox-checkmark"></span>
                <span className="label-words">AI Quest 🧠</span>
              </label>
            </div>
            <button type="submit" className="btn-primary">
              <i className="fa-solid fa-plus"></i> Add
            </button>
          </form>
        </div>
      </div>

      {/* Habit Calendar Grid */}
      <section className="glass-card habit-grid-card">
        {loading ? (
          <div className="grid-loading-box">
            <i className="fa-solid fa-spinner fa-spin loader-icon"></i>
            <p>Loading activities...</p>
          </div>
        ) : filteredHabits.length === 0 ? (
          <div className="empty-tracker-state">
            <i className="fa-solid fa-calendar-xmark empty-icon"></i>
            <h3>No Tasks Found</h3>
            <p>Add some study quests or standard habits to begin logs in this track.</p>
          </div>
        ) : (
          <div className="calendar-table-responsive">
            <table className="habit-calendar-table">
              <thead>
                <tr>
                  <th>Quest / Habit Name</th>
                  {dayHeaders.map(day => (
                    <th key={day} className="day-num-th">{day}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredHabits.map(habit => (
                  <tr key={habit.id} className={habit.is_personalization ? 'row-personalization-quest' : 'row-gamified-habit'}>
                    <td className="habit-name-cell">
                      <div className="habit-cell-wrapper">
                        <div className="habit-title-container">
                          <span className="habit-title-text">{habit.name}</span>
                          <span className={`quest-track-pill ${habit.is_personalization ? 'pill-personalization' : 'pill-gamification'}`}>
                            {habit.is_personalization ? 'AI Quest 🧠' : 'Habit 🎮'}
                          </span>
                        </div>
                        <button 
                          onClick={() => handleDeleteHabit(habit.id)} 
                          className="delete-habit-btn" 
                          title="Delete"
                        >
                          <i className="fa-solid fa-trash-can"></i>
                        </button>
                      </div>
                    </td>
                    {dayHeaders.map(day => {
                      const key = `${currentYear}-${currentMonth}-${day}`;
                      const isChecked = !!(habitLogs[habit.id]?.[key]);
                      return (
                        <td key={day} className="checkbox-calendar-td">
                          <label className="custom-checkbox-container">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleHabit(habit.id, day)}
                            />
                            <span className="checkbox-checkmark"></span>
                          </label>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Decoupled scientific charts & live research log feed */}
      {habits.length > 0 && (
        <section className="tracker-charts-row grid-decoupled-analytics">
          <div className="glass-card tracker-chart-container">
            <h3><i className="fa-solid fa-chart-pie color-teal-glow"></i> Overall Completion</h3>
            <div className="chart-wrapper-box">
              <Pie data={pieData} options={pieOptions} />
            </div>
          </div>

          <div className="glass-card tracker-chart-container">
            <h3><i className="fa-solid fa-chart-bar color-indigo-glow"></i> Gamification vs. AI Quests</h3>
            <div className="chart-wrapper-box">
              <Bar data={comparisonBarData} options={comparisonBarOptions} />
            </div>
          </div>

          {/* Research analytics live log feed */}
          <div className="glass-card tracker-chart-container full-width-grid-card">
            <div className="analytics-header">
              <h3><i className="fa-solid fa-satellite-dish text-teal-glow"></i> Scientific Telemetry: Gamification vs. AI Curriculum Analytics</h3>
              <div className="telemetry-badge-scores">
                <span className="track-score-badge bg-gamified-badge">🎮 Habits Clicks: {analyticsSummary.gamified_interactions_count}</span>
                <span className="track-score-badge bg-personalized-badge">🧠 Quest Clicks: {analyticsSummary.personalization_interactions_count}</span>
              </div>
            </div>
            <p className="scientific-description-p">
              This terminal decodes live database interaction metrics to study if students engage more with standard gamified triggers (badges, basic routines) or the custom AI-personalized study recommendations.
            </p>
            <div className="telemetry-log-table-wrapper">
              <table className="telemetry-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Track Category</th>
                    <th>Event Logged</th>
                    <th>Activity Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {analyticsSummary.recent_logs.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="text-center-cell">No telemetry events logged yet. Check or hover over elements to record telemetry.</td>
                    </tr>
                  ) : (
                    analyticsSummary.recent_logs.map((log, idx) => (
                      <tr key={idx} className={log.track_type === 'personalization' ? 'telemetry-row-personalization' : 'telemetry-row-gamification'}>
                        <td className="telemetry-time-td">{new Date(log.timestamp).toLocaleTimeString()}</td>
                        <td className="telemetry-category-td">
                          <span className={`telemetry-pill ${log.track_type === 'personalization' ? 'pill-purple' : 'pill-teal'}`}>
                            {log.track_type.toUpperCase()}
                          </span>
                        </td>
                        <td className="telemetry-event-td"><code>{log.event_type}</code></td>
                        <td className="telemetry-detail-td">{log.details}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
