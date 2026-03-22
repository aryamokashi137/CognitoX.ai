
// ---------index page----------


document.addEventListener("DOMContentLoaded", function () {

    // -------------get started button----------------
    const getStartedBtn = document.getElementById("get-started-btn");

    if (getStartedBtn) {
        getStartedBtn.addEventListener("click", function () {
            // Scroll to "How It Works" section
            document.getElementById("how-it-works").scrollIntoView({
                behavior: "smooth"
            });
        });
    }

     // -------------login form validation----------------
    const loginForm = document.querySelector(".login-box form");

    if (loginForm) {
        loginForm.addEventListener("submit", async function (event) {
            event.preventDefault(); // stop page refresh

            const username = loginForm.querySelector("input[type='text']").value;
            const password = loginForm.querySelector("input[type='password']").value;

            if (username === "" || password === "") {
                alert("Please fill in both username and password.");
                return;
            }

            try {
                const response = await fetch("http://127.0.0.1:5000/api/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username, password })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    alert("Login successful!");
                    // Save JWT token
                    localStorage.setItem("authToken", data.token);
                    localStorage.setItem("username", data.username);
                    window.location.href = "dashboard.html";
                } else {
                    alert("Login failed: " + data.error);
                }
            } catch (error) {
                console.error("Error logging in:", error);
                alert("Could not connect to the backend server. Is it running?");
            }

            // Clear fields
            loginForm.reset();
        });
    }

   

});

        // ------questionaire page--------
        const questions = [
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

       // Store user answers
let currentQuestion = 0;
let answers = [];

// Load current question
function loadQuestion() {
    const q = questions[currentQuestion];

    // Update question tag
    document.querySelector('.question-tag').textContent = q.tag;

    // Update question text
    document.querySelector('.question-card h2').textContent = q.question;

    // Update question counter
    document.querySelector('.question-count').textContent =
        `Question ${currentQuestion + 1} of ${questions.length}`;

    // Update progress bar
    const progress = ((currentQuestion + 1) / questions.length) * 100;
    document.querySelector('.progress-fill').style.width = progress + '%';

    // Create options HTML
    let optionsHTML = '<form onsubmit="return false;">';

    q.options.forEach((option, index) => {
        const checked =
            answers[currentQuestion] &&
            answers[currentQuestion].answer === option
                ? 'checked'
                : '';

        optionsHTML += `
            <label class="option-card">
                <input type="radio" name="q${currentQuestion}" value="${index}" ${checked}>
                <span>${option}</span>
            </label>
        `;
    });

    // Button text
    const buttonText =
        currentQuestion === questions.length - 1 ? 'Finish' : 'Next';

    // Back + Next buttons
    optionsHTML += `
        <div class="button-container">
            ${
                currentQuestion > 0
                    ? `<button type="button" class="back-btn" onclick="handleBack()">
                           <i class="fa-solid fa-arrow-left"></i> Back
                       </button>`
                    : '<div></div>'
            }

            <button type="button" class="next-btn" onclick="handleNext()">
                ${buttonText} <i class="fa-solid fa-arrow-right"></i>
            </button>
        </div>
    </form>`;

    // Update form
    document.querySelector('.options-form').innerHTML = optionsHTML;
}

// Handle next button click
function handleNext() {
    const selected = document.querySelector(
        `input[name="q${currentQuestion}"]:checked`
    );

    if (!selected) {
        alert('Please select an option before continuing');
        return;
    }

    // Save answer
    answers[currentQuestion] = {
        question: questions[currentQuestion].question,
        answer: questions[currentQuestion].options[selected.value]
    };

    if (currentQuestion < questions.length - 1) {
        currentQuestion++;
        loadQuestion();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        finishAssessment();
    }
}

// Handle back button click
function handleBack() {
    if (currentQuestion > 0) {
        currentQuestion--;
        loadQuestion();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Finish assessment
async function finishAssessment() {
    localStorage.setItem('assessmentAnswers', JSON.stringify(answers));
    
    // Extract the exact index numbers (0, 1, 2, or 3) selected for the 12 questions
    const features = answers.map((ans, idx) => {
        return questions[idx].options.indexOf(ans.answer);
    });

    const token = localStorage.getItem("authToken");
    
    try {
        const response = await fetch("http://127.0.0.1:5000/api/predict", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(token && { "Authorization": `Bearer ${token}` })
            },
            body: JSON.stringify({ features })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('Assessment completed! Redirecting to dashboard...');
            // Save the prediction to local storage so the dashboard can display it immediately
            localStorage.setItem("latestPrediction", JSON.stringify(data));
            window.location.href = 'dashboard.html';
        } else {
            alert('Prediction Failed: ' + data.error);
        }
    } catch (error) {
        console.error("Error predicting:", error);
        alert("Could not connect to the backend server. Make sure it is running.");
    }
}

// Load first question
if (document.querySelector('.question-card')) {
    window.addEventListener('load', function () {
        loadQuestion();
    });
}

//--------signup page--------

document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector(".auth-form");

    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();

            const inputs = form.querySelectorAll("input");

            const fullName = inputs[0].value.trim();
            const username = inputs[1].value.trim();
            const password = inputs[2].value;
            const confirmPassword = inputs[3].value;
            
            // Assume the first available email field, or create a dummy email if none exists on signup UI yet
            const email = username + "@cognitox.ai"; // Placeholder if form doesn't have an email field

            // Basic validation
            if (!fullName || !username || !password || !confirmPassword) {
                alert("Please fill in all fields");
                return;
            }

            if (password.length < 6) {
                alert("Password must be at least 6 characters long");
                return;
            }

            if (password !== confirmPassword) {
                alert("Passwords do not match");
                return;
            }

            try {
                const response = await fetch("http://127.0.0.1:5000/api/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username, email, password })
                });

                const data = await response.json();

                if (response.ok) {
                    alert("Account created successfully! Redirecting to login...");
                    window.location.href = "login.html";
                } else {
                    alert("Registration failed: " + data.error);
                }
            } catch (error) {
                console.error("Error registering:", error);
                alert("Could not connect to the backend server.");
            }
        });
    }
});


//--------tracker page--------

let currentMonth = 0;
        let currentYear = 2026;
        let habits = [{ id: 'dummy', name: 'Read for 30 minutes' }];
        let habitData = {
            dummy: {
                '2026-0-1': true,
                '2026-0-2': true,
                '2026-0-4': true,
                '2026-0-5': false,
                '2026-0-6': true,
                '2026-0-8': true,
            }
        };
        let pieChart, barChart;

        const monthNames = ["January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"];

        function initializeApp() {
            updateMonthLabel();
            renderHabitTable();
            updateStats();
            initializeCharts();
            
            document.getElementById('prevMonth').addEventListener('click', () => changeMonth(-1));
            document.getElementById('nextMonth').addEventListener('click', () => changeMonth(1));
            document.getElementById('addHabitBtn').addEventListener('click', addHabit);
            document.getElementById('habitInput').addEventListener('keypress', (e) => {
                if (e.key === 'Enter') addHabit();
            });
        }

        function changeMonth(delta) {
            currentMonth += delta;
            if (currentMonth > 11) {
                currentMonth = 0;
                currentYear++;
            } else if (currentMonth < 0) {
                currentMonth = 11;
                currentYear--;
            }
            updateMonthLabel();
            renderHabitTable();
            updateStats();
            updateCharts();
        }

        function updateMonthLabel() {
            document.getElementById('monthLabel').textContent = `${monthNames[currentMonth]} ${currentYear}`;
        }

        function addHabit() {
            const input = document.getElementById('habitInput');
            const habitName = input.value.trim();
            
            if (habitName) {
                const habitId = Date.now().toString();
                habits.push({ id: habitId, name: habitName });
                habitData[habitId] = {};
                input.value = '';
                renderHabitTable();
                updateStats();
                updateCharts();
            }
        }

        function deleteHabit(habitId) {
            habits = habits.filter(h => h.id !== habitId);
            delete habitData[habitId];
            renderHabitTable();
            updateStats();
            updateCharts();
        }

        function getDaysInMonth() {
            return new Date(currentYear, currentMonth + 1, 0).getDate();
        }

        function renderHabitTable() {
            const days = getDaysInMonth();
            const header = document.getElementById('tableHeader');
            const body = document.getElementById('habitBody');
            
            // Render header
            header.innerHTML = '<th>Habit Name</th>';
            for (let i = 1; i <= days; i++) {
                header.innerHTML += `<th>${i}</th>`;
            }
            
            // Render body
            if (habits.length === 0) {
                body.innerHTML = `
                    <tr>
                        <td colspan="${days + 1}">
                            <div class="empty-state">
                                <i class="fas fa-inbox"></i>
                                <p>No habits yet. Add your first habit above!</p>
                            </div>
                        </td>
                    </tr>
                `;
                return;
            }
            
            body.innerHTML = '';
            habits.forEach(habit => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>
                        ${habit.name}
                        <button class="delete-habit" onclick="deleteHabit('${habit.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                
                for (let day = 1; day <= days; day++) {
                    const key = `${currentYear}-${currentMonth}-${day}`;
                    const isChecked = habitData[habit.id]?.[key] || false;
                    
                    const cell = document.createElement('td');
                    cell.className = 'checkbox-cell';
                    cell.innerHTML = `<input type="checkbox" ${isChecked ? 'checked' : ''} 
                        onchange="toggleHabit('${habit.id}', ${day})">`;
                    row.appendChild(cell);
                }
                
                body.appendChild(row);
            });
        }

        function toggleHabit(habitId, day) {
            if (!habitData[habitId]) habitData[habitId] = {};
            const key = `${currentYear}-${currentMonth}-${day}`;
            habitData[habitId][key] = !habitData[habitId][key];
            updateStats();
            updateCharts();
        }

        function updateStats() {
            // Update habit count
            document.getElementById('habitCount').textContent = habits.length;
            
            // Calculate completion rate
            const days = getDaysInMonth();
            let totalPossible = habits.length * days;
            let totalCompleted = 0;
            
            habits.forEach(habit => {
                for (let day = 1; day <= days; day++) {
                    const key = `${currentYear}-${currentMonth}-${day}`;
                    if (habitData[habit.id]?.[key]) totalCompleted++;
                }
            });
            
            const completionRate = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;
            document.getElementById('completion').textContent = completionRate + '%';
            
            // Calculate streak (consecutive days with all habits completed)
            let streak = 0;
            const today = new Date();
            
            if (currentYear === today.getFullYear() && currentMonth === today.getMonth()) {
                for (let day = today.getDate(); day >= 1; day--) {
                    let allCompleted = true;
                    habits.forEach(habit => {
                        const key = `${currentYear}-${currentMonth}-${day}`;
                        if (!habitData[habit.id]?.[key]) allCompleted = false;
                    });
                    if (allCompleted && habits.length > 0) streak++;
                    else break;
                }
            }
            
            document.getElementById('streak').textContent = streak;
        }

        function initializeCharts() {
            // Pie Chart
            const pieCtx = document.getElementById('pieChart').getContext('2d');
            pieChart = new Chart(pieCtx, {
                type: 'pie',
                data: {
                    labels: ['Completed', 'Pending'],
                    datasets: [{
                        data: [0, 100],
                        backgroundColor: ['rgb(9, 107, 104)', 'rgb(144, 209, 202)']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: 'rgb(26, 42, 79)',
                                font: {
                                    size: 14,
                                    weight: 600
                                }
                            }
                        }
                    }
                }
            });
            
            // Bar Chart
            const barCtx = document.getElementById('barChart').getContext('2d');
            barChart = new Chart(barCtx, {
                type: 'bar',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Habits Completed',
                        data: [],
                        backgroundColor: 'rgb(9, 107, 104)',
                        borderColor: 'rgb(26, 42, 79)',
                        borderWidth: 2,
                        borderRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1,
                                color: 'rgb(26, 42, 79)',
                                font: {
                                    weight: 600
                                }
                            },
                            grid: {
                                color: 'rgba(26, 42, 79, 0.1)'
                            }
                        },
                        x: {
                            ticks: {
                                color: 'rgb(26, 42, 79)',
                                font: {
                                    weight: 600
                                }
                            },
                            grid: {
                                display: false
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        }
                    }
                }
            });
        }

        function updateCharts() {
            const days = getDaysInMonth();
            
            // Update Pie Chart
            let totalPossible = habits.length * days;
            let totalCompleted = 0;
            
            habits.forEach(habit => {
                for (let day = 1; day <= days; day++) {
                    const key = `${currentYear}-${currentMonth}-${day}`;
                    if (habitData[habit.id]?.[key]) totalCompleted++;
                }
            });
            
            pieChart.data.datasets[0].data = [totalCompleted, totalPossible - totalCompleted];
            pieChart.update();
            
            // Update Bar Chart
            const dailyData = [];
            const labels = [];
            
            for (let day = 1; day <= Math.min(days, 15); day++) {
                let completed = 0;
                habits.forEach(habit => {
                    const key = `${currentYear}-${currentMonth}-${day}`;
                    if (habitData[habit.id]?.[key]) completed++;
                });
                dailyData.push(completed);
                labels.push(`Day ${day}`);
            }
            
            barChart.data.labels = labels;
            barChart.data.datasets[0].data = dailyData;
            barChart.update();
        }

        // Initialize app on load
        if (document.getElementById('monthLabel')) {
            initializeApp();
        }

// ---------dashboard page----------
document.addEventListener("DOMContentLoaded", function () {
    const settingsBtn = document.querySelector(".settings-btn");
    const popup = document.getElementById("settings-popup");
    const closeBtn = document.querySelector(".close-btn");
    const profilePicUpload = document.getElementById("profile-pic-upload");
    const popupProfilePic = document.getElementById("popup-profile-pic");
    const settingsForm = document.getElementById("settings-form");

    if (settingsBtn) {
        settingsBtn.addEventListener("click", () => {
            popup.style.display = "flex";
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener("click", () => {
            popup.style.display = "none";
        });
    }

    window.addEventListener("click", (e) => {
        if (e.target == popup) {
            popup.style.display = "none";
        }
    });

    if (profilePicUpload) {
        profilePicUpload.addEventListener("change", function () {
            const reader = new FileReader();
            reader.onload = function (e) {
                popupProfilePic.src = e.target.result;
            }
            reader.readAsDataURL(this.files[0]);
        });
    }

    if (settingsForm) {
        settingsForm.addEventListener("submit", function (e) {
            e.preventDefault();
            const name = document.getElementById("name").value;
            const email = document.getElementById("email").value;

            // Update profile card
            document.querySelector(".profile-info h2").textContent = name;
            
            // You can also update the email if you have a place to display it.
            
            popup.style.display = "none";
        });
    }
});
