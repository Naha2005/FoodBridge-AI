import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage       from './pages/LandingPage';
import Login             from './pages/Login';
import Register          from './pages/Register';
import Dashboard         from './pages/Dashboard';
import AgentChat         from './pages/AgentChat';
import PostDonation      from './pages/PostDonation';
import Matching          from './pages/Matching';
import MapView           from './pages/Map';
import NGODashboard      from './pages/NGODashboard';
import Impact            from './pages/Impact';
import MyDonations       from './pages/MyDonations';
import DemandForecast    from './pages/DemandForecast';
import Profile           from './pages/Profile';
import VolunteerDashboard from './pages/VolunteerDashboard';
import WasteAnalytics    from './pages/WasteAnalytics';
import DonationTracking  from './pages/DonationTracking';
import AdminDashboard    from './pages/AdminDashboard';
import DashboardLayout   from './components/DashboardLayout';
import { getUser }       from './services/api';

// Route guard: redirect to login if not authenticated
const Protected = ({ children, allowedRoles }) => {
  const user = getUser();
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const home = {
      ngo:       '/ngo/dashboard',
      volunteer: '/volunteer/dashboard',
      admin:     '/admin',
    }[user.role] || '/dashboard';
    return <Navigate to={home} replace />;
  }
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public */}
        <Route path="/"         element={<LandingPage />} />
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Donor / Admin routes */}
        <Route path="/dashboard" element={
          <Protected allowedRoles={['donor', 'admin']}>
            <DashboardLayout><Dashboard /></DashboardLayout>
          </Protected>
        } />
        <Route path="/donations/new" element={
          <Protected allowedRoles={['donor', 'admin']}>
            <DashboardLayout><PostDonation /></DashboardLayout>
          </Protected>
        } />
        <Route path="/donations" element={
          <Protected>
            <DashboardLayout><MyDonations /></DashboardLayout>
          </Protected>
        } />

        {/* NGO routes */}
        <Route path="/ngo/dashboard" element={
          <Protected allowedRoles={['ngo']}>
            <DashboardLayout><NGODashboard /></DashboardLayout>
          </Protected>
        } />

        {/* Volunteer routes */}
        <Route path="/volunteer/dashboard" element={
          <Protected allowedRoles={['volunteer']}>
            <DashboardLayout><VolunteerDashboard /></DashboardLayout>
          </Protected>
        } />

        {/* Admin routes */}
        <Route path="/admin" element={
          <Protected allowedRoles={['admin']}>
            <DashboardLayout><AdminDashboard /></DashboardLayout>
          </Protected>
        } />

        {/* Shared authenticated routes */}
        <Route path="/matches" element={
          <Protected>
            <DashboardLayout><Matching /></DashboardLayout>
          </Protected>
        } />
        <Route path="/map" element={
          <Protected>
            <DashboardLayout><MapView /></DashboardLayout>
          </Protected>
        } />
        <Route path="/ai-agent" element={
          <Protected>
            <DashboardLayout><AgentChat /></DashboardLayout>
          </Protected>
        } />
        <Route path="/impact" element={
          <Protected>
            <DashboardLayout><Impact /></DashboardLayout>
          </Protected>
        } />
        <Route path="/forecast" element={
          <Protected>
            <DashboardLayout><DemandForecast /></DashboardLayout>
          </Protected>
        } />
        <Route path="/waste-analytics" element={
          <Protected>
            <DashboardLayout><WasteAnalytics /></DashboardLayout>
          </Protected>
        } />
        <Route path="/tracking" element={
          <Protected>
            <DashboardLayout><DonationTracking /></DashboardLayout>
          </Protected>
        } />
        <Route path="/profile" element={
          <Protected>
            <DashboardLayout><Profile /></DashboardLayout>
          </Protected>
        } />

        {/* Catch-all → role-aware home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
