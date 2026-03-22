# CognitoX.ai 🧠
**Personalized Learning Paths for Every Student, Powered by AI.**

CognitoX.ai is an intelligent platform designed to identify learning patterns and provide personalized study strategies. By leveraging Machine Learning, it analyzes 12 core behavioral features to suggest the most effective learning modality and study habits for each individual student.

---

## ✨ Key Features

- **🤖 AI-Powered Questionnaire:** Undergo an intelligent 12-feature assessment that feeds directly into our Machine Learning models to analyze your productivity, focus, and study methods.
- **📊 Personalized Dashboard:** View your distinct learning pattern (e.g., Visual, Kinesthetic) and access tailored recommendations for optimizing your study sessions.
- **📅 Habit Tracker:** Build consistency by logging your daily study actions, visualizing your progress through interactive charts (Bar & Pie), and maintaining "study streaks."
- **🔐 Secure Authentication:** Robust user management system with JWT (JSON Web Token) based authentication for data privacy and security.
- **🎨 Modern Glassmorphism UI:** A sleek, responsive interface designed with vanilla CSS, featuring smooth transitions and premium aesthetics.
- **🚀 Automated CI/CD:** Integrated GitHub Actions pipeline for automated environment setup, dependency management, and testing.

---

## 🛠️ Tech Stack

- **Frontend:** HTML5, CSS3 (Modern Vanilla), JavaScript (ES6+), Font Awesome 7.0 for iconography.
- **Backend:** Python (Flask), SQLite3 for lightweight and reliable data storage.
- **Machine Learning:** NumPy, Scikit-learn, and Pickle for predictive modeling.
- **Authentication:** PyJWT, Werkzeug (Password Hashing).
- **Environment:** virtualenv, pip.

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+ installed on your system.
- Browser (Chrome, Firefox, or Edge).

### 1. Setup the Backend
1. **Navigate to the project root:**
   ```bash
   cd CognitoX.ai
   ```
2. **Create and activate a virtual environment:**
   - **Windows:**
     ```bash
     python -m venv venv
     venv\Scripts\activate
     ```
   - **Mac/Linux:**
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```
3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
4. **Start the Flask server:**
   ```bash
   python Backend/app.py
   ```
   *The server will run on [http://127.0.0.1:5000](http://127.0.0.1:5000)*

### 2. Run the Frontend
You can run the frontend in two ways:
- **Easiest:** Simply open `Frontend/index.html` in your web browser.
- **Via Local Server:** Run a separate Python server:
  ```bash
  python -m http.server 8000
  ```
  *Then visit [http://localhost:8000/Frontend/index.html](http://localhost:8000/Frontend/index.html)*

---

## 📂 Project Structure

```text
CognitoX.ai/
├── Backend/
│   ├── app.py           # Flask Server & API Endpoints
│   ├── database.db      # SQLite Database
│   ├── models/          # Trained ML (.pkl) files
│   └── tests/           # Unit tests for backend logic
├── Frontend/
│   ├── index.html       # Landing Page & Login
│   ├── dashboard.html   # User Analytics & Prediction Results
│   ├── questionaire.html# AI Assessment Form
│   ├── tracker.html     # Habit Tracker & Charts
│   ├── style.css        # Core Design System
│   └── script.js        # Frontend Logic & API Integration
├── requirements.txt     # Python Dependencies
├── .github/             # CI/CD Workflows
└── README.md            # Documentation
```

---

## 🧪 CI/CD Pipeline
The project includes a GitHub Actions workflow (`.github/workflows/ci-cd.yml`) that automatically:
1. Sets up the Python environment.
2. Installs dependencies.
3. Runs the test suite in `Backend/tests/` upon every push or pull request to the `main` branch.

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
Developed with ❤️ by the CognitoX Team.
