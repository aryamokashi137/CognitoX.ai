import React from 'react';
import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem('authToken');
  
  if (!token) {
    // Redirect to home if not authenticated
    return <Navigate to="/" replace />;
  }

  return children;
}
