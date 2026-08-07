import React, { useState, useEffect } from 'react';
import { Pie, Bar } from 'react-chartjs-2';
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
  const token = localStorage.getItem('authToken');

  // Month navigation state
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  // Habits state
  const [habits, setHabits] = useState([]);
  const [habitLogs, setHabitLogs] = useState({});
  const [newHabitName, setNewHabitName] = useState('');
  const [loading, setLoading] = useState(true);

  // Load habits on mount & month changes
  useEffect(() => {
    fetchHabits();
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
        body: JSON.stringify({ name })
      });
      
      const data = await res.json();
      if (res.ok) {
        setHabits([...habits, { id: data.id, name: data.name }]);
        setHabitLogs({
          ...habitLogs,
          [data.id]: {}
        });
        setNewHabitName('');
      }
    } catch (err) {
      console.error('Error adding habit:', err);
    }
  };

  const handleDeleteHabit = async (habitId) => {
    if (!token) return;
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
      }
    } catch (err) {
      console.error('Error deleting habit:', err);
    }
  };

  const handleToggleHabit = async (habitId, day) => {
    const key = `${currentYear}-${currentMonth}-${day}`;
    
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
  };

  const getDaysInMonth = () => {
    return new Date(currentYear, currentMonth + 1, 0).getDate();
  };

  // Stats calculation
  const totalDays = getDaysInMonth();
  const totalHabits = habits.length;
  const totalPossibleLogs = totalHabits * totalDays;
  
  let completedLogsCount = 0;
  habits.forEach(habit => {
    const logsForHabit = habitLogs[habit.id] || {};
    for (let day = 1; day <= totalDays; day++) {
      const key = `${currentYear}-${currentMonth}-${day}`;
      if (logsForHabit[key]) completedLogsCount++;
    }
  });

  const completionRate = totalPossibleLogs > 0 ? Math.round((completedLogsCount / totalPossibleLogs) * 100) : 0;

  // Calculate current streak (consecutive days from today backward where all active habits were checked)
  const getStreak = () => {
    const today = new Date();
    let streakCount = 0;

    if (currentYear === today.getFullYear() && currentMonth === today.getMonth()) {
      for (let day = today.getDate(); day >= 1; day--) {
        let allCompleted = true;
        
        // If there are no habits, streak is 0
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

  // Pie Chart config
  const pieData = {
    labels: ['Completed Logs', 'Remaining Logs'],
    datasets: [{
      data: [completedLogsCount, Math.max(0, totalPossibleLogs - completedLogsCount)],
      backgroundColor: ['#14b8a6', 'rgba(255, 255, 255, 0.05)'],
      borderColor: ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.1)'],
      borderWidth: 1
    }]
  };

  const pieOptions = {
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#f8fafc',
          font: { family: 'Outfit', size: 13 }
        }
      }
    },
    maintainAspectRatio: false
  };

  // Bar Chart config (completed logs per day of the month)
  const dailyCompletedData = [];
  const barLabels = [];
  for (let day = 1; day <= totalDays; day++) {
    let completedCount = 0;
    habits.forEach(habit => {
      const key = `${currentYear}-${currentMonth}-${day}`;
      if (habitLogs[habit.id]?.[key]) completedCount++;
    });
    dailyCompletedData.push(completedCount);
    barLabels.push(String(day));
  }

  const barData = {
    labels: barLabels,
    datasets: [{
      label: 'Habits Completed',
      data: dailyCompletedData,
      backgroundColor: 'rgba(99, 102, 241, 0.65)',
      borderColor: '#6366f1',
      borderWidth: 1.5,
      borderRadius: 4
    }]
  };

  const barOptions = {
    scales: {
      y: {
        beginAtZero: true,
        ticks: { 
          stepSize: 1, 
          color: '#94a3b8',
          font: { family: 'Plus Jakarta Sans', size: 10 } 
        },
        grid: { color: 'rgba(255, 255, 255, 0.06)' }
      },
      x: {
        ticks: { 
          color: '#94a3b8',
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

  // Render day numbers for Table headers
  const dayHeaders = [];
  for (let d = 1; d <= totalDays; d++) {
    dayHeaders.push(d);
  }

  return (
    <div className="tracker-page animate-fade-in">
      <header className="dashboard-header-container">
        <div className="header-text-group">
          <h1>Habit Tracker</h1>
          <p>Optimize consistency by logging daily learning activities</p>
        </div>
      </header>

      {/* Stats Cards Section */}
      <section className="tracker-stats-grid">
        <div className="glass-card stat-card-node">
          <div className="stat-icon-wrapper color-orange">
            <i className="fa-solid fa-fire"></i>
          </div>
          <div className="stat-node-values">
            <h2>{streak}</h2>
            <p>Day Streak</p>
          </div>
        </div>

        <div className="glass-card stat-card-node">
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
            <p>Active Habits</p>
          </div>
        </div>
      </section>

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
              placeholder="Enter a new habit (e.g. Solve LeetCode, Read Docs)"
              value={newHabitName}
              onChange={(e) => setNewHabitName(e.target.value)}
              className="input-glass"
              required
            />
            <button type="submit" className="btn-primary">
              <i className="fa-solid fa-plus"></i> Add Habit
            </button>
          </form>
        </div>
      </div>

      {/* Habit Calendar Grid */}
      <section className="glass-card habit-grid-card">
        {loading ? (
          <div className="grid-loading-box">
            <i className="fa-solid fa-spinner fa-spin loader-icon"></i>
            <p>Loading habit scheduler...</p>
          </div>
        ) : habits.length === 0 ? (
          <div className="empty-tracker-state">
            <i className="fa-solid fa-calendar-xmark empty-icon"></i>
            <h3>No Habits Programmed</h3>
            <p>Add some study habits above to start tracking your daily progress.</p>
          </div>
        ) : (
          <div className="calendar-table-responsive">
            <table className="habit-calendar-table">
              <thead>
                <tr>
                  <th>Habit Name</th>
                  {dayHeaders.map(day => (
                    <th key={day} className="day-num-th">{day}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {habits.map(habit => (
                  <tr key={habit.id}>
                    <td className="habit-name-cell">
                      <div className="habit-cell-wrapper">
                        <span className="habit-title-text">{habit.name}</span>
                        <button 
                          onClick={() => handleDeleteHabit(habit.id)} 
                          className="delete-habit-btn" 
                          title="Delete Habit"
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

      {/* Habit Metrics & Progress Charts */}
      {habits.length > 0 && (
        <section className="tracker-charts-row">
          <div className="glass-card tracker-chart-container">
            <h3><i className="fa-solid fa-chart-pie color-teal-glow"></i> Habit Completion Overview</h3>
            <div className="chart-wrapper-box">
              <Pie data={pieData} options={pieOptions} />
            </div>
          </div>

          <div className="glass-card tracker-chart-container">
            <h3><i className="fa-solid fa-chart-bar color-indigo-glow"></i> Daily Progress</h3>
            <div className="chart-wrapper-box">
              <Bar data={barData} options={barOptions} />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
