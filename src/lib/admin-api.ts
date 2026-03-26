/**
 * Utility functions for admin API calls with authentication
 */

export const getAuthHeaders = () => {
  const token = localStorage.getItem('adminToken');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

export const adminApi = {
  get: async (endpoint: string) => {
    const response = await fetch(endpoint, {
      headers: getAuthHeaders(),
    });
    return response;
  },

  post: async (endpoint: string, data?: any) => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });
    return response;
  },

  put: async (endpoint: string, data?: any) => {
    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });
    return response;
  },

  delete: async (endpoint: string) => {
    const response = await fetch(endpoint, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return response;
  },
};