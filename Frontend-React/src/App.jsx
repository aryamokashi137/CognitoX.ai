import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Signup from './pages/Signup';
import Questionnaire from './pages/Questionnaire';
import Dashboard from './pages/Dashboard';
import Tracker from './pages/Tracker';
import './App.css';

export default function App() {
  return (
    <Router>
      <div className="app-layout">
        <Navbar />
        <main className="main-content-flow">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/signup" element={<Signup />} />
            
            {/* Protected Student Operations */}
            <Route 
              path="/questionnaire" 
              element={
                <ProtectedRoute>
                  <Questionnaire />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/tracker" 
              element={
                <ProtectedRoute>
                  <Tracker />
                </ProtectedRoute>
              } 
            />

            {/* Fallback routing redirects to landing */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}
