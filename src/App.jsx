import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { RotateCw } from 'lucide-react';

import Login from './pages/Login';
import Hub from './pages/Hub';
import Lobby from './pages/Lobby';
import Room from './pages/Room';

export default function App() {
  const [user, setUser] = useState(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthChecking(false);
    });
    return () => unsubscribe();
  }, []);

  if (isAuthChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-stone-200">
        <RotateCw className="animate-spin text-stone-500 w-12 h-12" />
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={user ? <Navigate to="/hub" /> : <Navigate to="/login" />} />
        <Route path="/login" element={user ? <Navigate to="/hub" /> : <Login />} />
        <Route path="/hub" element={user ? <Hub user={user} /> : <Navigate to="/login" />} />
        <Route path="/lobby/:gameId" element={user ? <Lobby user={user} /> : <Navigate to="/login" />} />
        <Route path="/room/:gameId/:roomId" element={user ? <Room user={user} /> : <Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}
