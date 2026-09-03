import type { ReactNode } from 'react';
import { useAuthStore } from '@stores/authStore';
import { RouteRedirect } from '../RouteRedirect';

/** Gate authenticated areas. KYC/capability guards layer on top for money flows. */
export function AuthGuard({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasOnboarded = useAuthStore((s) => s.hasOnboarded);

  if (!isAuthenticated) return <RouteRedirect to="/auth/login" />;
  if (!hasOnboarded) return <RouteRedirect to="/onboarding" />;
  return <>{children}</>;
}
