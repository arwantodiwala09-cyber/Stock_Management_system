import { useAuthStore } from '../features/auth/store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

export const fetchApi = async (endpoint: string, options: RequestInit = {}) => {
  const { session, activeOrganization } = useAuthStore.getState();
  
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }
  
  if (activeOrganization) {
    headers.set('x-organization-id', activeOrganization.id);
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = 'An error occurred';
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch {
      // Not JSON
    }
    
    if (response.status === 401) {
      console.error('API Unauthorized');
    }

    throw new ApiError(response.status, errorMessage);
  }

  return response.json();
};
