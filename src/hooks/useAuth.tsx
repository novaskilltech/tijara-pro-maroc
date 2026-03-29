import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import type { AppRole, Profile } from "@/types/auth";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  loading: boolean;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  isAdmin: () => boolean;
  refreshProfile: () => Promise<void>;
  // MFA Scaffolding
  mfaEnabled: boolean;
  mfaVerified: boolean;
  enrollMFA: () => Promise<{ qrCode?: string; secret?: string }>;
  verifyMFA: (code: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaVerified, setMfaVerified] = useState(false);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();
    if (data) setProfile(data as unknown as Profile);
  };

  const fetchRoles = async (userId: string) => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .not("role", "is", null);
    
    if (error) {
      console.error("Error fetching roles:", error);
      return;
    }
    
    if (data) {
      setRoles(data.map((r: any) => r.role as AppRole).filter(Boolean));
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await Promise.all([fetchProfile(user.id), fetchRoles(user.id)]);
    }
  };

  useEffect(() => {
    // Set up auth listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          fetchProfile(newSession.user.id);
          fetchRoles(newSession.user.id);
        } else {
          setProfile(null);
          setRoles([]);
        }

        if (event === "INITIAL_SESSION") {
          setLoading(false);
        }
      }
    );

    // THEN check existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      if (existingSession?.user) {
        setSession(existingSession);
        setUser(existingSession.user);
        fetchProfile(existingSession.user.id);
        fetchRoles(existingSession.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
  };

  const hasRole = (role: AppRole) => roles.includes(role);
  const isAdmin = () => roles.includes("super_admin") || roles.includes("admin");

  // MFA Stubs (Implementation for Lot 3/SEC)
  const enrollMFA = async () => {
    console.log("MFA Enrollment started (Stub)");
    return { qrCode: "dummy_qr", secret: "dummy_secret" };
  };

  const verifyMFA = async (code: string) => {
    console.log("Verifying MFA code:", code);
    if (code === "000000") {
      setMfaVerified(true);
      return true;
    }
    return false;
  };

  return (
    <AuthContext.Provider value={{ 
      user, session, profile, roles, loading, signOut, hasRole, isAdmin, refreshProfile,
      mfaEnabled, mfaVerified, enrollMFA, verifyMFA 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
