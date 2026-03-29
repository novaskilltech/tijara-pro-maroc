import { createContext, useContext, ReactNode } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import type { PermissionAction, PermissionResource } from "@/hooks/usePermissions";

interface PermissionsContextType {
  can: (action: PermissionAction, resource: PermissionResource) => boolean;
  isValidator: (module?: string) => boolean;
  canAccessModule: (module: string) => boolean;
  loading: boolean;
}

const PermissionsContext = createContext<PermissionsContextType>({
  can: () => false,
  isValidator: () => false,
  canAccessModule: () => false,
  loading: true,
});

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { can, isValidator, canAccessModule, loading } = usePermissions();

  return (
    <PermissionsContext.Provider value={{ can, isValidator, canAccessModule, loading }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function useAppPermissions() {
  return useContext(PermissionsContext);
}
