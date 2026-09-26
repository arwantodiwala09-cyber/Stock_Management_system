import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../../../utils/supabase';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { setAuth, setInitialized, logout } = useAuthStore();

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuth(session?.user ?? null, session);
      setInitialized(true);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setAuth(session.user, session);
      } else {
        logout();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setAuth, setInitialized, logout]);

  return <>{children}</>;
};
