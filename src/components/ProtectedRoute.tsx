import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ROLE_MODULE_ACCESS, type AppRole } from "@/types/auth";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: AppRole[];
}

export function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const { user, roles, loading, aal, mfaFactors } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // Redirect to MFA challenge if required and not verified (AAL1 but factors exist)
  const hasActiveMFA = mfaFactors && mfaFactors.some(f => f.status === 'verified');
  if (hasActiveMFA && aal === 'aal1' && location.pathname !== '/auth/mfa') {
    return <Navigate to="/auth/mfa" state={{ from: location }} replace />;
  }

  // Check required roles if specified
  if (requiredRoles && requiredRoles.length > 0) {
    const hasAccess = requiredRoles.some((r) => roles.includes(r));
    if (!hasAccess) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // Check module access from path
  const pathKey = Object.keys(ROLE_MODULE_ACCESS)
    .filter((k) => k !== "/home")
    .sort((a, b) => b.length - a.length)
    .find((k) => location.pathname.startsWith(k)) || "/home";

  const allowedRoles = ROLE_MODULE_ACCESS[pathKey];
  if (allowedRoles && roles.length > 0) {
    const hasModuleAccess = allowedRoles.some((r) => roles.includes(r));
    if (!hasModuleAccess) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
}
