import './App.css';
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import LandingPage from './pages/LandingPage';
import SolvePage from './pages/SolvePage';
import { useState } from 'react';
import LoginPage from './pages/LoginPage';
import { AuthProvider } from './AuthContext';

export default function App() {
  const [selectedMazeId, setSelectedMazeId] = useState(null);

  return (
    
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            
            <Route path="/maze" element={<LandingPage selectedMazeId={selectedMazeId} setSelectedMazeId={setSelectedMazeId}/>} />
            <Route path="/solve" element={<SolvePage selectedMazeId={selectedMazeId}/>} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="*" element={<Navigate to="/maze" replace />} />
            
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    
  );
}

