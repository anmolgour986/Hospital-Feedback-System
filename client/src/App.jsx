import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import { Loader } from './components/ui';
import Login from './pages/Login';
import Register from './pages/Register';
import { ForgotPassword, ResetPassword } from './pages/PasswordPages';
import PublicFeedback from './pages/PublicFeedback';
import Dashboard from './pages/Dashboard';
import FeedbackNew from './pages/FeedbackNew';
import FeedbackList from './pages/FeedbackList';
import Complaints from './pages/Complaints';
import ComplaintNew from './pages/ComplaintNew';
import ComplaintDetail from './pages/ComplaintDetail';
import Requests from './pages/Requests';
import Notifications from './pages/Notifications';
import Analytics from './pages/Analytics';
import Performance from './pages/Performance';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Departments from './pages/Departments';
import QRCodes from './pages/QRCodes';
import Security from './pages/Security';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  return user ? children : <Navigate to="/login" replace />;
}

function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  return user ? <Navigate to="/" replace /> : children;
}

function Roles({ allow, children }) {
  const { user } = useAuth();
  return allow.includes(user.role) ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
      <Route path="/admin/login" element={<GuestOnly><Login initialMode="admin" /></GuestOnly>} />
      <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
      <Route path="/forgot-password" element={<GuestOnly><ForgotPassword /></GuestOnly>} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      <Route path="/feedback/public" element={<PublicFeedback />} />

      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<Dashboard />} />
        <Route path="feedback" element={<FeedbackList />} />
        <Route path="feedback/new" element={<Roles allow={['patient']}><FeedbackNew /></Roles>} />
        <Route path="complaints" element={<Complaints />} />
        <Route path="complaints/new" element={<Roles allow={['patient']}><ComplaintNew /></Roles>} />
        <Route path="complaints/:id" element={<ComplaintDetail />} />
        <Route path="requests" element={<Requests />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="analytics" element={<Roles allow={['admin', 'staff']}><Analytics /></Roles>} />
        <Route path="performance" element={<Roles allow={['admin']}><Performance /></Roles>} />
        <Route path="reports" element={<Roles allow={['admin']}><Reports /></Roles>} />
        <Route path="users" element={<Roles allow={['admin']}><Users /></Roles>} />
        <Route path="departments" element={<Roles allow={['admin']}><Departments /></Roles>} />
        <Route path="qr" element={<Roles allow={['admin', 'staff']}><QRCodes /></Roles>} />
        <Route path="security" element={<Roles allow={['admin']}><Security /></Roles>} />
        <Route path="profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
