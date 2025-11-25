import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import AdminDashboard from './pages/admin/AdminDashboard';
import LeaderDashboard from './pages/leader/LeaderDashboard';
import PollView from './pages/poll/PollView';
import { initializeSampleData } from './utils/storage';
import { useEffect } from 'react';
import './App.css';

function App() {
  useEffect(() => {
    // Initialize sample admin data on first load
    initializeSampleData();
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/leader/dashboard"
            element={
              <ProtectedRoute allowedRoles={['leader']}>
                <LeaderDashboard />
              </ProtectedRoute>
            }
          />
          
          <Route path="/poll/:linkId" element={<PollView />} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
