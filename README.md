# CognitoX.ai 🧠
**Personalized Learning Paths for Every Student, Powered by AI.**

CognitoX.ai is an intelligent platform designed to identify learning patterns and provide personalized study strategies. By combining predictive **Machine Learning** with **Generative AI (Gemini)**, it analyzes behavioral features to suggest the most effective learning modality, gamified quest paths, and study habits for each individual student.

---

## ✨ Key Features & Recent Upgrades

- **🌗 Dual Light & Dark Theme Engine:** Seamless global dark and light mode toggle powered by `ThemeContext`, `localStorage` persistence, zero-flash initialization script, and theme-adaptive dynamic charts (`Chart.js` grid and color palette auto-tuning).
- **🎮 Gamified Quests & Habit Tracker:** Decoupled Habit & Quest system with an interactive **Level / XP / Rank HUD**, daily streak counters, and visual progress tracking using dynamic Pie, Bar, and Radar charts.
- **🤖 AI-Powered Behavioral Assessment:** An intelligent 12-feature questionnaire using trained Machine Learning models (RandomForest/DecisionTree) to evaluate focus, productivity, and information processing modalities.
- **✨ Explainable AI (XAI) Model Interpretation:** Transparent prediction interface displaying exact ML feature attribution weights side-by-side with Gemini-powered narrative insights explaining the model's logic.
- **📊 Interactive Intelligence Dashboard:** Comprehensive visualization of learning modalities (Visual, Auditory, Kinesthetic, Reading/Writing) with a custom "Learning Power Index" radar chart.
- **🔐 Secure JWT Authentication:** Robust FastAPI dependency-injection authentication system with JSON Web Tokens (JWT) and secure password hashing (`Werkzeug`).
- **🎨 Modern Glassmorphic UI:** Modern React interface with glassmorphism, micro-animations, theme-aware CSS custom variables, and responsive layout styling.
- **🚀 Automated CI/CD:** GitHub Actions workflow for automated linting, dependency management, and test suite execution.

---

## 🛠️ Tech Stack

- **Frontend:** React, Vite, `react-chartjs-2`, `Chart.js`, Font Awesome 7.0, ThemeContext API.
- **Backend:** Python, **FastAPI**, **SQLModel (SQLAlchemy)** with **SQLite3** database.
- **AI & Machine Learning:**
  - **Generative AI:** Google Gemini (`google-genai` SDK).
  - **Predictive ML:** Scikit-learn (RandomForest, DecisionTree), NumPy, Pickle.
- **Authentication & Security:** PyJWT, Werkzeug Security Hashing.
- **DevOps & Testing:** Pytest, GitHub Actions, `python-dotenv`.

---

## 🚀 Quick Start Guide

### 1. Setup the Backend (FastAPI)

1. **Navigate to the project root directory:**
   ```bash
   cd CognitoX.ai
   ```

2. **Create and activate a virtual environment:**
   - **Windows (PowerShell):**
     ```powershell
     python -m venv venv
     venv\Scripts\activate
     ```
   - **Mac/Linux (Terminal):**
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

3. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure Environment Variables:**
   Ensure a `.env` file exists in the `Backend/` directory with your credentials:
   ```env
   GEMINI_API_KEY=your_actual_gemini_api_key
   SECRET_KEY=cognitox_secret_key_123
   ```

5. **Start the FastAPI backend server:**
   ```bash
   python Backend/app.py
   ```
   *The backend server will run on [http://localhost:5000](http://localhost:5000)*

---

### 2. Setup the Frontend (React)

1. **Open a new terminal and navigate to the frontend directory:**
   ```bash
   cd Frontend-React
   ```

2. **Install Node dependencies:**
   ```bash
   npm install
   ```

3. **Start the React Vite development server:**
   ```bash
   npm run dev
   ```
   *The client application will run on [http://localhost:5173](http://localhost:5173)*

---

### 3. Open the Application
- Open [http://localhost:5173](http://localhost:5173) in your browser.
- Register an account, switch themes (Dark/Light mode), complete the assessment questionnaire, track your habits/quests, and view your Explainable AI dashboard!

---

## 📂 Project Structure

```text
CognitoX.ai/
├── Backend/
│   ├── app.py           # FastAPI Server, Authentication & XAI API
│   ├── .env             # API Keys & Secret Credentials
│   ├── database.db      # SQLite Database (Auto-created on launch)
│   ├── models/          # Trained ML (.pkl) Model Binaries
│   └── tests/           # Integration & Unit Tests (`pytest Backend/tests/`)
├── Frontend-React/      # React SPA Application
│   ├── src/
│   │   ├── pages/       # Core Views (Dashboard, Questionnaire, Tracker, Auth)
│   │   ├── components/  # Reusable UI (Navbar, Footer, ProtectedRoute)
│   │   ├── context/     # ThemeContext & Global State Management
│   │   ├── App.jsx      # React Router Configuration
│   │   ├── App.css      # Component & Global Styles
│   │   └── index.css    # Design System & Theme CSS Variables
│   ├── index.html       # Entry HTML with anti-flash theme script
│   ├── package.json     # Node Dependencies & Scripts
│   └── vite.config.js   # Vite Server Configuration
├── requirements.txt     # Python Dependencies
├── .github/             # GitHub Actions Workflows
└── README.md            # Project Documentation
```

---

Developed with ❤️ by the CognitoX Team.
