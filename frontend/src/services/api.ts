import { useAuthStore } from '../features/auth/store/authStore';
import { supabase } from '../utils/supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const fetchApi = async <T = any>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  const requestWithSession = (accessToken?: string) => {
    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');

    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }

    const { activeOrganization } = useAuthStore.getState();
    if (activeOrganization) {
      headers.set('x-organization-id', activeOrganization.id);
    }

    return fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });
  };

  const session = useAuthStore.getState().session;
  let response = await requestWithSession(session?.access_token);

  if (response.status === 401 && session?.refresh_token) {
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: session.refresh_token,
    });

    if (!error && data.session) {
      useAuthStore.getState().setAuth(data.session.user, data.session);
      response = await requestWithSession(data.session.access_token);
    } else {
      await supabase.auth.signOut({ scope: 'local' });
      useAuthStore.getState().logout();
    }
  }

  if (!response.ok) {
    let errorMessage = 'An error occurred';
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch {
      // Not JSON
    }
    
    throw new ApiError(response.status, errorMessage);
  }

  return response.json();
};
