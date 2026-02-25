import apiClient from './apiClient';

export interface User {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  role: string;
}

export interface UsersListResponse {
  users: User[];
  total: number;
}

/**
 * Get list of all users
 */
export const getUsers = async (): Promise<UsersListResponse> => {
  const response = await apiClient.get<UsersListResponse>('/users');
  return response.data;
};

/**
 * Create a new user
 */
export const createUser = async (data: CreateUserRequest): Promise<User> => {
  const response = await apiClient.post<User>('/users', data);
  return response.data;
};

/**
 * Delete a user by ID
 */
export const deleteUser = async (userId: string): Promise<void> => {
  await apiClient.delete(`/users/${userId}`);
};

/**
 * Update user role
 */
export const updateUserRole = async (userId: string, role: string): Promise<User> => {
  const response = await apiClient.patch<User>(`/users/${userId}`, { role });
  return response.data;
};
