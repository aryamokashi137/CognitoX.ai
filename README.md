# CognitoX.ai 🧠
**Personalized Learning Paths for Every Student, Powered by AI.**

CognitoX.ai is an intelligent platform designed to identify learning patterns and provide personalized study strategies. By combining predictive **Machine Learning** with **Generative AI (Gemini)**, it analyzes behavioral features to suggest the most effective learning modality and study habits for each individual student.

---

## ✨ Key Features

- **🤖 AI-Powered Assessment:** An intelligent 12-feature questionnaire that uses Machine Learning to analyze your productivity, focus, and information processing styles.
- **✨ AI Strategy Deep-Dive (Gemini):** A "Deep-Dive" feature powered by **Google Gemini** that generates personalized, actionable study tips and explanations based on your unique learning profile.
- **📊 Interactive Intelligence Dashboard:** View your distinct learning pattern (e.g., Visual, Kinesthetic) through dynamic charts, including a "Learning Power Index" radar chart and modality progress bars.
- **📅 Advanced Habit Tracker:** Build consistency with a dedicated habit tracking system. Log daily actions and visualize progress through sleek Pie and Bar charts with streak tracking.
- **🔐 Secure JWT-Based Auth:** Robust user management system with JWT (JSON Web Token) authentication and secure password hashing.
- **🎨 Premium Modern UI:** A stunning, responsive interface featuring **Glassmorphism**, smooth micro-animations, and a custom-styled premium scrollbar for a seamless user experience.
- **🚀 Automated CI/CD:** Integrated GitHub Actions pipeline for automated environment setup, dependency management, and testing.

---

## 🛠️ Tech Stack

- **Frontend:** HTML5, CSS3 (Modern Vanilla), JavaScript (ES6+), **Chart.js**, Font Awesome 7.0.
- **Backend:** Python (Flask), **SQLite3** for persistent data storage.
- **AI & Machine Learning:**
  - **Generative AI:** Google Gemini (google-genai SDK).
  - **Predictive ML:** Scikit-learn (RandomForest/DecisionTree), NumPy, Pickle.
- **Authentication:** PyJWT, Werkzeug (Security Hashing).
- **Environment & Dev:** virtualenv, python-dotenv, DVC (Data Version Control).

---

## 🚀 Getting Started

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
4. **Configure Environment Variables:**
   Create a `.env` file in the `Backend/` directory:
   ```env
   GEMINI_API_KEY=your_actual_gemini_api_key
   SECRET_KEY=your_custom_secret_key
   ```
5. **Start the Flask server:**
   ```bash
   python Backend/app.py
   ```
   *The server will run on [http://127.0.0.1:5000](http://127.0.0.1:5000)*

### 2. Access the Application
- Open [http://127.0.0.1:5000](http://127.0.0.1:5000) in your browser.
- Create an account, take the assessment, and explore your AI-powered learning path!

---

## 📂 Project Structure

```text
CognitoX.ai/
├── Backend/
│   ├── app.py           # Flask Server & AI Logic
│   ├── .env             # API Keys & Secrets (User Created)
│   ├── database.db      # SQLite Database
│   ├── models/          # Trained ML (.pkl) files
│   └── tests/           # Unit tests
├── Frontend/           # All UI assets (served via Backend or staticly)
│   ├── dashboard.html   # User Analytics & Prediction Results
│   ├── questionaire.html# AI Assessment Form
│   ├── tracker.html     # Habit Tracker & Charts
│   ├── style.css        # Premium Design System
│   └── script.js        # Frontend Logic & API Integration
├── requirements.txt     # Python Dependencies
├── .github/             # CI/CD Workflows
└── README.md            # Documentation
```

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
Developed with ❤️ by the CognitoX Team.
