import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import MainLayout from './layouts/MainLayout';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import ResetPassword from './pages/Auth/ResetPassword';
import Dashboard from './pages/Dashboard';
import DailyLogForm from './pages/DailyLogForm';
import LogHistory from './pages/LogHistory';
import WeeklyJournalForm from './pages/WeeklyJournalForm';
import JournalHistory from './pages/JournalHistory';
import Profile from './pages/Profile';
import WeeklySummary from './pages/WeeklySummary';

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        
        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/daily-log" element={<DailyLogForm />} />
            <Route path="/logs" element={<LogHistory />} />
            <Route path="/weekly-journal" element={<WeeklyJournalForm />} />
            <Route path="/journals" element={<JournalHistory />} />
            <Route path="/weekly-summary" element={<WeeklySummary />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
        </Route>
        
        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App; 