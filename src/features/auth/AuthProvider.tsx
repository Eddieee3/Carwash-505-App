import type { Session } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { isSupabaseConfigured } from "@/api/env";
import { supabase } from "@/api/supabase";
import { unregisterPushToken } from "@/features/push/usePushNotifications";
import { resolveAppRole, resolveView, type AppRole, type AppView, type CustomerLite, type ProfileLite } from "./role";

type AuthContextValue = {
  view: AppView;
  session: Session | null;
  role: AppRole | null;
  signOut: () => Promise<void>;
  retryRole: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchRole(userId: string): Promise<AppRole> {
  if (!supabase) throw new Error("supabase_not_configured");
  const [profile, customer] = await Promise.all([
    supabase.from("profiles").select("role,status").eq("id", userId).maybeSingle<ProfileLite>(),
    supabase.from("customers").select("status").eq("id", userId).maybeSingle<CustomerLite>(),
  ]);
  if (profile.error) throw profile.error;
  if (customer.error) throw customer.error;
  return resolveAppRole(profile.data, customer.data);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured();
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(configured);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setSessionLoading(false);
    });
    // No llamar a Supabase dentro de este callback (puede bloquearse): solo actualizar estado.
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const userId = session?.user.id ?? null;
  const roleQuery = useQuery({
    queryKey: ["app-role", userId],
    queryFn: () => fetchRole(userId as string),
    enabled: userId !== null,
    staleTime: 5 * 60_000,
    retry: 2,
  });
  const { refetch } = roleQuery;

  const role = userId ? (roleQuery.data ?? null) : null;
  const view = resolveView({
    configured,
    sessionLoading,
    hasSession: session !== null,
    role,
    roleError: roleQuery.isError,
  });

  const value = useMemo<AuthContextValue>(
    () => ({
      view,
      session,
      role,
      signOut: async () => {
        await unregisterPushToken().catch(() => undefined); // el dispositivo deja de recibir avisos de esta cuenta
        await supabase?.auth.signOut();
        queryClient.clear();
      },
      retryRole: () => void refetch(),
    }),
    [view, session, role, queryClient, refetch],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
