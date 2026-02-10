const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  role?: 'USER' | 'ADMIN';
  emailVerified?: Date | null;
  createdAt?: string;
  accounts?: { provider: string; createdAt: string }[];
}

export interface AuthResponse {
  message: string;
  user: User;
  accessToken: string;
  // 2FA fields
  requires2FA?: boolean;
  tempToken?: string;
}

export interface ApiError {
  error: string;
  details?: { message: string }[];
}

class AuthService {
  private accessToken: string | null = null;

  constructor() {
    // Load token from localStorage on init
    this.accessToken = localStorage.getItem('accessToken');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include', // Include cookies
    });

    const data = await response.json();

    if (!response.ok) {
      throw data as ApiError;
    }

    return data as T;
  }

  setAccessToken(token: string | null) {
    this.accessToken = token;
    if (token) {
      localStorage.setItem('accessToken', token);
    } else {
      localStorage.removeItem('accessToken');
    }
  }

  getAccessToken() {
    return this.accessToken;
  }

  async register(data: { email: string; password: string; name?: string }): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.setAccessToken(response.accessToken);
    return response;
  }

  async login(data: { email: string; password: string }): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    // Only set token if login is complete (not requiring 2FA)
    if (response.accessToken) {
      this.setAccessToken(response.accessToken);
    }
    return response;
  }

  async logout(): Promise<void> {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } finally {
      this.setAccessToken(null);
    }
  }

  async getMe(): Promise<{ user: User }> {
    return this.request<{ user: User }>('/api/auth/me');
  }

  async refreshToken(): Promise<{ accessToken: string }> {
    const response = await this.request<{ message: string; accessToken: string }>(
      '/api/auth/refresh',
      { method: 'POST' }
    );
    this.setAccessToken(response.accessToken);
    return response;
  }

  async getLinkedAccounts(): Promise<{ accounts: { id: string; provider: string; createdAt: string }[] }> {
    return this.request('/api/auth/accounts');
  }

  async unlinkAccount(provider: string): Promise<{ message: string }> {
    return this.request(`/api/auth/accounts/${provider}`, { method: 'DELETE' });
  }

  // OAuth URLs
  getGoogleLoginUrl() {
    return `${API_URL}/api/auth/google`;
  }

  getFacebookLoginUrl() {
    return `${API_URL}/api/auth/facebook`;
  }

  getMicrosoftLoginUrl() {
    return `${API_URL}/api/auth/microsoft`;
  }

  getDiscordLoginUrl() {
    return `${API_URL}/api/auth/discord`;
  }

  getGithubLoginUrl() {
    return `${API_URL}/api/auth/github`;
  }

  // Admin APIs
  async checkAdminRegistration(): Promise<{ registrationOpen: boolean; message: string }> {
    return this.request('/api/admin/check-registration');
  }

  async adminRegister(data: { email: string; password: string; name?: string }): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/api/admin/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.setAccessToken(response.accessToken);
    return response;
  }

  async adminLogin(data: { email: string; password: string }): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.setAccessToken(response.accessToken);
    return response;
  }

  async getAdminMe(): Promise<{ user: User }> {
    return this.request<{ user: User }>('/api/admin/me');
  }

  async getAdminStats(): Promise<{ stats: { totalUsers: number; totalAdmins: number; recentUsers: number; totalHostings: number; activeHostings: number; suspendedHostings: number } }> {
    return this.request('/api/admin/stats');
  }

  async getUsers(page = 1, limit = 10): Promise<{ 
    users: User[]; 
    pagination: { page: number; limit: number; total: number; totalPages: number } 
  }> {
    return this.request(`/api/admin/users?page=${page}&limit=${limit}`);
  }

  async deleteUser(id: string): Promise<{ message: string }> {
    return this.request(`/api/admin/users/${id}`, { method: 'DELETE' });
  }

  // Settings APIs
  async getOAuthSettings(): Promise<{ settings: OAuthSettings }> {
    return this.request('/api/settings/oauth');
  }

  async updateOAuthProvider(provider: string, config: OAuthConfig): Promise<{ message: string }> {
    return this.request('/api/settings/oauth', {
      method: 'PUT',
      body: JSON.stringify({ provider, config }),
    });
  }

  async updateAllOAuthSettings(settings: Partial<OAuthSettings>): Promise<{ message: string }> {
    return this.request('/api/settings/oauth/all', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  async testOAuthProvider(provider: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/api/settings/oauth/test/${provider}`, { method: 'POST' });
  }

  async getOAuthStatus(): Promise<OAuthStatus> {
    return this.request('/api/settings/oauth/status');
  }
}

// OAuth Types
export interface OAuthConfig {
  enabled: boolean;
  clientId: string;
  clientSecret: string;
  callbackUrl?: string;
}

export interface OAuthSettings {
  google: OAuthConfig;
  facebook: OAuthConfig;
  microsoft: OAuthConfig;
  discord: OAuthConfig;
  github: OAuthConfig;
}

export interface OAuthStatus {
  google: boolean;
  facebook: boolean;
  microsoft: boolean;
  discord: boolean;
  github: boolean;
}

export const authService = new AuthService();
export default authService;
