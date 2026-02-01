const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface ApiOptions extends RequestInit {
  token?: string;
}

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data.error?.code || 'UNKNOWN_ERROR',
      data.error?.message || 'An error occurred',
      data.error?.details,
    );
  }

  return data.data;
}

export async function api<T>(
  endpoint: string,
  options: ApiOptions = {},
): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  return handleResponse<T>(response);
}

// Auth API
export const authApi = {
  login: (data: { email?: string; phone?: string; password: string }) =>
    api<any>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  register: (data: {
    email?: string;
    phone?: string;
    password: string;
    firstName: string;
    lastName: string;
  }) =>
    api<any>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  refresh: (refreshToken: string) =>
    api<any>('/api/v1/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),

  me: (token: string) =>
    api<any>('/api/v1/auth/me', { token }),

  logout: (token: string, refreshToken?: string) =>
    api<any>('/api/v1/auth/logout', {
      method: 'POST',
      token,
      body: JSON.stringify({ refreshToken }),
    }),
};

// Products API
export const productsApi = {
  list: (params?: Record<string, any>) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.set(key, String(value));
      });
    }
    return api<any>(`/api/v1/products?${searchParams}`);
  },

  getById: (id: string) => api<any>(`/api/v1/products/${id}`),

  getBySlug: (slug: string) => api<any>(`/api/v1/products/slug/${slug}`),

  getFeatured: () => api<any>('/api/v1/products/featured'),

  create: (token: string, data: any) =>
    api<any>('/api/v1/products', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }),

  update: (token: string, id: string, data: any) =>
    api<any>(`/api/v1/products/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(data),
    }),

  updateStock: (token: string, id: string, data: any) =>
    api<any>(`/api/v1/products/${id}/stock`, {
      method: 'PATCH',
      token,
      body: JSON.stringify(data),
    }),

  delete: (token: string, id: string) =>
    api<any>(`/api/v1/products/${id}`, {
      method: 'DELETE',
      token,
    }),
};

// Categories API
export const categoriesApi = {
  list: (includeInactive = false) =>
    api<any>(`/api/v1/categories?includeInactive=${includeInactive}`),

  getById: (id: string) => api<any>(`/api/v1/categories/${id}`),

  getBySlug: (slug: string) => api<any>(`/api/v1/categories/slug/${slug}`),

  create: (token: string, data: any) =>
    api<any>('/api/v1/categories', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }),

  update: (token: string, id: string, data: any) =>
    api<any>(`/api/v1/categories/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(data),
    }),

  delete: (token: string, id: string) =>
    api<any>(`/api/v1/categories/${id}`, {
      method: 'DELETE',
      token,
    }),
};

// Cart API
export const cartApi = {
  get: (token: string) => api<any>('/api/v1/cart', { token }),

  addItem: (token: string, productId: string, quantity: number) =>
    api<any>('/api/v1/cart/items', {
      method: 'POST',
      token,
      body: JSON.stringify({ productId, quantity }),
    }),

  updateItem: (token: string, productId: string, quantity: number) =>
    api<any>(`/api/v1/cart/items/${productId}`, {
      method: 'PUT',
      token,
      body: JSON.stringify({ quantity }),
    }),

  removeItem: (token: string, productId: string) =>
    api<any>(`/api/v1/cart/items/${productId}`, {
      method: 'DELETE',
      token,
    }),

  clear: (token: string) =>
    api<any>('/api/v1/cart', {
      method: 'DELETE',
      token,
    }),

  sync: (token: string, items: Array<{ productId: string; quantity: number }>) =>
    api<any>('/api/v1/cart/sync', {
      method: 'POST',
      token,
      body: JSON.stringify({ items }),
    }),
};

// Orders API
export const ordersApi = {
  create: (token: string, data: any) =>
    api<any>('/api/v1/orders', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }),

  list: (token: string, params?: Record<string, any>) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.set(key, String(value));
      });
    }
    return api<any>(`/api/v1/orders?${searchParams}`, { token });
  },

  getById: (token: string, id: string) =>
    api<any>(`/api/v1/orders/${id}`, { token }),

  cancel: (token: string, id: string, reason: string) =>
    api<any>(`/api/v1/orders/${id}/cancel`, {
      method: 'POST',
      token,
      body: JSON.stringify({ reason }),
    }),

  // Admin
  listAll: (token: string, params?: Record<string, any>) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.set(key, String(value));
      });
    }
    return api<any>(`/api/v1/orders/admin/all?${searchParams}`, { token });
  },

  updateStatus: (token: string, id: string, status: string, notes?: string) =>
    api<any>(`/api/v1/orders/admin/${id}/status`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ status, notes }),
    }),
};

// Addresses API
export const addressesApi = {
  list: (token: string) => api<any>('/api/v1/addresses', { token }),

  create: (token: string, data: any) =>
    api<any>('/api/v1/addresses', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }),

  update: (token: string, id: string, data: any) =>
    api<any>(`/api/v1/addresses/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(data),
    }),

  delete: (token: string, id: string) =>
    api<any>(`/api/v1/addresses/${id}`, {
      method: 'DELETE',
      token,
    }),

  setDefault: (token: string, id: string) =>
    api<any>(`/api/v1/addresses/${id}/default`, {
      method: 'PATCH',
      token,
    }),
};

// Admin API
export const adminApi = {
  getDashboard: (token: string) =>
    api<any>('/api/v1/admin/dashboard', { token }),

  getStoreConfig: (token: string) =>
    api<any>('/api/v1/admin/store-config', { token }),

  updateStoreConfig: (token: string, data: any) =>
    api<any>('/api/v1/admin/store-config', {
      method: 'PUT',
      token,
      body: JSON.stringify(data),
    }),

  getSalesReport: (token: string, startDate: string, endDate: string) =>
    api<any>(`/api/v1/admin/reports/sales?startDate=${startDate}&endDate=${endDate}`, { token }),

  getInventoryReport: (token: string) =>
    api<any>('/api/v1/admin/reports/inventory', { token }),
};

// Payments API
export const paymentsApi = {
  initiate: (token: string, orderId: string) =>
    api<any>(`/api/v1/payments/initiate/${orderId}`, {
      method: 'POST',
      token,
    }),

  verify: (token: string, data: any) =>
    api<any>('/api/v1/payments/verify', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }),
};
