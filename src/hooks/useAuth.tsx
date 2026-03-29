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
  mfaFactors: any[];
  aal: 'aal1' | 'aal2' | null;
  enrollMFA: () => Promise<{ id?: string; qrCode?: string; secret?: string; error?: any }>;
  verifyMFA: (factorId: string, code: string, challengeId?: string) => Promise<{ success: boolean; error?: any }>;
  unenrollMFA: (factorId: string) => Promise<{ success: boolean; error?: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [mfaFactors, setMfaFactors] = useState<any[]>([]);
  const [aal, setAal] = useState<'aal1' | 'aal2' | null>(null);

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

  const fetchMfaStatus = async () => {
    const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (!aalError && aalData) {
      setAal(aalData.currentLevel as 'aal1' | 'aal2');
      
      const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (!factorsError && factorsData) {
        setMfaFactors(factorsData.all);
      } else {
        setMfaFactors([]);
      }
    } else {
      setAal(null);
      setMfaFactors([]);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await Promise.all([fetchProfile(user.id), fetchRoles(user.id), fetchMfaStatus()]);
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
          fetchMfaStatus();
        } else {
          setProfile(null);
          setRoles([]);
          setAal(null);
          setMfaFactors([]);
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
        fetchMfaStatus();
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

  const enrollMFA = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        issuer: 'Tijara Pro Maroc'
      });
      if (error) throw error;
      return { 
        id: data.id, 
        qrCode: data.totp.qr_code, 
        secret: data.totp.secret 
      };
    } catch (error: any) {
      console.error("MFA Enrollment error:", error);
      return { error };
    }
  };

  const verifyMFA = async (factorId: string, code: string, challengeId?: string) => {
    try {
      let currentChallengeId = challengeId;
      if (!currentChallengeId) {
        const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
        if (challengeError) throw challengeError;
        currentChallengeId = challengeData.id;
      }

      const { data: verificationData, error: verificationError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: currentChallengeId,
        code
      });
      if (verificationError) throw verificationError;
      
      await fetchMfaStatus();
      return { success: true };
    } catch (error: any) {
      console.error("MFA Verification error:", error);
      return { success: false, error };
    }
  };

  const unenrollMFA = async (factorId: string) => {
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      await fetchMfaStatus();
      return { success: true };
    } catch (error: any) {
      console.error("MFA Unenrollment error:", error);
      return { success: false, error };
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, session, profile, roles, loading, signOut, hasRole, isAdmin, refreshProfile,
      mfaFactors, aal, enrollMFA, verifyMFA, unenrollMFA 
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
