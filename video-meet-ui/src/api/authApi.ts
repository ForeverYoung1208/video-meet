import apiClient, { tokenService } from './apiClient';
import { getUserIdFromToken } from '../lib/jwt';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  role?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
}

export interface User {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}


// Login
export const login = async (credentials: LoginRequest): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>('/api/auth/signin', credentials);

  // Store tokens
  const { accessToken, refreshToken } = response.data;
  tokenService.setTokens(accessToken, refreshToken);

  return response.data;
};

// Register - creates user, then automatically logs in
export const register = async (data: RegisterRequest): Promise<AuthResponse> => {
  // Create user with default role if not specified
  const registerData = { ...data, role: data.role || 'user' };
  await apiClient.post<User>('/api/users', registerData);

  // After successful registration, login with the same credentials
  const loginResponse = await apiClient.post<AuthResponse>('/api/auth/signin', {
    email: data.email,
    password: data.password,
  });

  // Store tokens
  const { accessToken, refreshToken } = loginResponse.data;
  tokenService.setTokens(accessToken, refreshToken);

  return loginResponse.data;
};

// Get current user
export const getCurrentUser = async (): Promise<User> => {
  const token = tokenService.getAccessToken();
  if (!token) {
    throw new Error('No access token available');
  }

  // Extract user ID from JWT token
  const userId = getUserIdFromToken(token);
  if (!userId) {
    throw new Error('Failed to extract user ID from token');
  }

  const response = await apiClient.get<User>(`/api/users/${userId}`);
  return response.data;
};

// Logout - only clears tokens locally (no API endpoint for logout)
export const logout = async (): Promise<void> => {
  tokenService.clearTokens();
};

// Note: Token refresh is handled automatically by apiClient interceptors
