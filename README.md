# CognitoX.ai 🧠
**Personalized Learning Paths for Every Student, Powered by AI.**

CognitoX.ai is an intelligent platform designed to identify learning patterns and provide personalized study strategies. By combining predictive **Machine Learning** with **Generative AI (Gemini)**, it analyzes behavioral features to suggest the most effective learning modality and study habits for each individual student.

---

## ✨ Key Features

- **🤖 AI-Powered Assessment:** An intelligent 12-feature questionnaire that uses Machine Learning to analyze your productivity, focus, and information processing styles.
- **✨ Explainable AI (XAI) Model Interpretation:** A custom-built transparency screen showing exact model weights (feature attribution) on the left, paired with a Gemini-powered narrative explanation of the prediction logic on the right.
- **📊 Interactive Intelligence Dashboard:** View your distinct learning pattern (e.g., Visual, Kinesthetic) through dynamic charts, including a "Learning Power Index" radar chart and modality progress bars.
- **📅 Advanced Habit Tracker:** Build consistency with a dedicated habit tracking system. Log daily actions and visualize progress through sleek Pie and Bar charts with streak tracking.
- **🔐 Secure JWT-Based Auth:** Robust user management system with FastAPI dependency-injection based JWT (JSON Web Token) authentication and secure password hashing.
- **🎨 Premium Modern UI:** A stunning React interface featuring **Glassmorphism**, smooth micro-animations, and a custom-styled premium scrollbar for a seamless user experience.
- **🚀 Automated CI/CD:** Integrated GitHub Actions pipeline for automated environment setup, dependency management, and testing.

---

## 🛠️ Tech Stack

- **Frontend:** React, Vite, Chart.js, React-ChartJS-2, Font Awesome 7.0.
- **Backend:** Python, **FastAPI**, **SQLModel (SQLAlchemy)** with **SQLite3** for persistent data storage.
- **AI & Machine Learning:**
  - **Generative AI:** Google Gemini (google-genai SDK).
  - **Predictive ML:** Scikit-learn (RandomForest/DecisionTree), NumPy, Pickle.
- **Authentication:** PyJWT, Werkzeug (Security Hashing).
- **Environment & Dev:** virtualenv, python-dotenv.

---

## 🚀 Quick Start Guide (Run on Any Laptop)

### 1. Setup the Backend (FastAPI)
1. **Navigate to the project root directory:**
   ```bash
   cd CognitoX.ai
   ```
2. **Create and activate a virtual environment:**
   - **Windows (PowerShell/CMD):**
     ```powershell
     python -m venv venv
     venv\Scripts\activate
     ```
   - **Mac/Linux (Terminal):**
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```
3. **Install python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
4. **Configure Environment Variables:**
   Make sure there is a `.env` file inside the `Backend/` directory with the following keys:
   ```env
   GEMINI_API_KEY=your_actual_gemini_api_key
   SECRET_KEY=cognitox_secret_key_123
   ```
5. **Start the FastAPI backend server:**
   ```bash
   python Backend/app.py
   ```
   *The server will run on [http://localhost:5000](http://localhost:5000)*

### 2. Setup the Frontend (React)
1. **Open a new terminal session and navigate to the frontend folder:**
   ```bash
   cd Frontend-React
   ```
2. **Install node dependencies:**
   ```bash
   npm install
   ```
3. **Start the React Vite development server:**
   ```bash
   npm run dev
   ```
   *The client will run on [http://localhost:5173](http://localhost:5173)*

### 3. Open the Application
- Open [http://localhost:5173](http://localhost:5173) in your browser.
- Register an account, log in, complete the questionnaire, and view your personalized Explainable AI dashboard!

---

## 📂 Project Structure

```text
CognitoX.ai/
├── Backend/
│   ├── app.py           # FastAPI Server & XAI Logic
│   ├── .env             # API Keys & Secrets
│   ├── database.db      # SQLite Database (Automatically generated at startup)
│   ├── models/          # Trained ML (.pkl) files
│   └── tests/           # Unit tests (run using `pytest Backend/tests/`)
├── Frontend-React/     # React Single Page App
│   ├── src/
│   │   ├── pages/       # Pages (Dashboard, Questionnaire, Habit Tracker, Auth)
│   │   ├── components/  # Layout elements (Navbar, Footer, ProtectedRoute)
│   │   ├── App.jsx      # Route Configuration
│   │   └── App.css      # Core Design System (Glassmorphic)
│   ├── package.json     # Node Dependencies
│   └── vite.config.js   # Vite configuration
├── requirements.txt     # Python Dependencies
├── .github/             # CI/CD Workflows
└── README.md            # Documentation
```

---

Developed with ❤️ by the CognitoX Team.
