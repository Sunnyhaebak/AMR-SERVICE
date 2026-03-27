import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import type { Role } from '../types';

interface Props {
  roles: Role[];
}

export default function ProtectedRoute({ roles }: Props) {
  const { user, token } = useAuthStore();
  const hasHydrated = useAuthStore.persist.hasHydrated();

  // Wait for zustand to hydrate from localStorage before redirecting
  if (!hasHydrated) {
    return null; // or a loading spinner
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  const hasAccess = roles.some((r) => user.roles.includes(r));
  if (!hasAccess) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
