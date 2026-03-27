import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/auth.store';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';

// Manager pages
import AttendanceMarkingPage from './pages/manager/AttendanceMarkingPage';
import AttendanceAnalyticsPage from './pages/manager/AttendanceAnalyticsPage';
import TicketsPage from './pages/manager/TicketsPage';
import ServiceEngineersPage from './pages/manager/ServiceEngineersPage';
import SmrPage from './pages/manager/SmrPage';
import ChangeHistoryPage from './pages/manager/ChangeHistoryPage';

// Engineer pages
import EngineerTicketsPage from './pages/engineer/EngineerTicketsPage';
import EngineerAnalyticsPage from './pages/engineer/EngineerAnalyticsPage';
import EngineerSchedulePage from './pages/engineer/EngineerSchedulePage';

// Admin pages
import UserManagementPage from './pages/admin/UserManagementPage';

export default function App() {
  const user = useAuthStore((s) => s.user);

  const getDefaultRoute = () => {
    if (!user) return '/login';
    if (user.roles.includes('ADMIN')) return '/admin/users';
    if (user.roles.includes('MANAGER')) return '/manager/attendance';
    if (user.roles.includes('ENGINEER')) return '/engineer/tickets';
    return '/login';
  };

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute roles={['MANAGER']} />}>
        <Route element={<AppLayout />}>
          <Route path="/manager/attendance" element={<AttendanceMarkingPage />} />
          <Route path="/manager/attendance-analytics" element={<AttendanceAnalyticsPage />} />
          <Route path="/manager/tickets" element={<TicketsPage />} />
          <Route path="/manager/engineers" element={<ServiceEngineersPage />} />
          <Route path="/manager/smr" element={<SmrPage />} />
          <Route path="/manager/change-history" element={<ChangeHistoryPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={['ENGINEER']} />}>
        <Route element={<AppLayout />}>
          <Route path="/engineer/tickets" element={<EngineerTicketsPage />} />
          <Route path="/engineer/analytics" element={<EngineerAnalyticsPage />} />
          <Route path="/engineer/schedule" element={<EngineerSchedulePage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={['ADMIN']} />}>
        <Route element={<AppLayout />}>
          <Route path="/admin/users" element={<UserManagementPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to={getDefaultRoute()} replace />} />
    </Routes>
  );
}
