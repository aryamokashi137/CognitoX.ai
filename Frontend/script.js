
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
        loginForm.addEventListener("submit", function (event) {
            event.preventDefault(); // stop page refresh

            const username = loginForm.querySelector("input[type='text']").value;
            const password = loginForm.querySelector("input[type='password']").value;

            if (username === "" || password === "") {
                alert("Please fill in both username and password.");
                return;
            }

            // Temporary success message (backend later)
            alert("Login successful (demo).");

            // Clear fields
            loginForm.reset();
        });
    }

    // -------------Navbar active link----------------
    const sections = document.querySelectorAll(".main1, .main2, .main3");
    const navLinks = document.querySelectorAll(".navbar a");

    window.addEventListener("scroll", function () {
        let currentSection = "";

        sections.forEach(section => {
            const sectionTop = section.offsetTop - 120;
            const sectionHeight = section.clientHeight;

            if (pageYOffset >= sectionTop && pageYOffset < sectionTop + sectionHeight) {
                currentSection = section.getAttribute("id");
            }
        });

        navLinks.forEach(link => {
            link.style.color = "white";

            if (link.getAttribute("href") === "#" + currentSection) {
                link.style.color = "rgb(247, 165, 165)";
            }
        });
    });

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
function finishAssessment() {
    localStorage.setItem('assessmentAnswers', JSON.stringify(answers));
    alert('Assessment completed! Redirecting to dashboard...');
    window.location.href = 'dashboard.html';
}

// Load first question
window.onload = function () {
    loadQuestion();
};

//--------signup page--------

document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector(".auth-form");

    form.addEventListener("submit", (e) => {
        e.preventDefault();

        const inputs = form.querySelectorAll("input");

        const fullName = inputs[0].value.trim();
        const username = inputs[1].value.trim();
        const password = inputs[2].value;
        const confirmPassword = inputs[3].value;

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

        // Check if user already exists
        const users = JSON.parse(localStorage.getItem("users")) || [];

        const userExists = users.some(user => user.username === username);
        if (userExists) {
            alert("Username already exists. Please choose another.");
            return;
        }

        // Save user
        const newUser = {
            fullName,
            username,
            password // NOTE: Do NOT store plaintext passwords in real apps
        };

        users.push(newUser);
        localStorage.setItem("users", JSON.stringify(users));

        alert("Account created successfully! Redirecting to login...");

        // Redirect to login page
        window.location.href = "login.html";
    });
});
