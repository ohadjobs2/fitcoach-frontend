import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Auth from './Auth';

export default function App() {
  const [userData, setUserData] = useState(() => {
    const saved = localStorage.getItem('fitcoach_user');
    return saved ? JSON.parse(saved) : null;
  });

  const handleLoginSuccess = (data) => {
    localStorage.setItem('fitcoach_user', JSON.stringify(data));
    // אם השרת מחזיר טוקן בתוך data.token, נשמור אותו גם כאן:
    if (data.token) {
      localStorage.setItem('token', data.token);
    }
    setUserData(data);
  };

  const handleLogout = () => {
    localStorage.removeItem('fitcoach_user');
    localStorage.removeItem('token'); // <--- הוסף את השורה הזו כדי לנקות גם את הטוקן
    setUserData(null);
  };

  return (
    <Router>
      <Routes>
        <Route 
          path="/auth" 
          element={!userData ? <Auth onLoginSuccess={handleLoginSuccess} /> : <Navigate to="/" replace />} 
        />
        <Route 
          path="/" 
          element={
            userData ? (
              <Dashboard 
                userData={userData}
                setUserData={setUserData}
                onLogout={handleLogout}
              />
            ) : (
              <Navigate to="/auth" replace />
            )
          } 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}