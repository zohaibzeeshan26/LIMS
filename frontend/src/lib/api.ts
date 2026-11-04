const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export const TOKEN_KEY = 'cp_lims_token';
export const REFRESH_KEY = 'cp_lims_refresh_token';
export const USER_KEY = 'cp_lims_user';
export const REMEMBER_KEY = 'cp_lims_remember_identifier';

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}

export function getStoredRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_KEY) || sessionStorage.getItem(REFRESH_KEY);
}

export function getStoredUser<T>(): T | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch (e) {
    return null;
  }
}

export function setStoredSession(
  accessToken: string,
  refreshToken: string,
  user: any,
  rememberMe: boolean = true,
) {
  if (typeof window === 'undefined') return;
  
  // Clear any opposing storage to prevent conflicting states
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_KEY);
  sessionStorage.removeItem(USER_KEY);

  // Always store in localStorage so cross-tab links and refreshes maintain authenticated state
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));

  if (!rememberMe) {
    sessionStorage.setItem(TOKEN_KEY, accessToken);
    sessionStorage.setItem(REFRESH_KEY, refreshToken);
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  if (rememberMe) {
    localStorage.setItem(REMEMBER_KEY, user.email || user.employeeId);
  } else {
    localStorage.removeItem(REMEMBER_KEY);
  }
}

export function clearStoredSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_KEY);
  sessionStorage.removeItem(USER_KEY);
}

class ApiClient {
  private isRefreshing = false;
  private refreshSubscribers: ((token: string) => void)[] = [];

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    const token = getStoredToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  private onTokenRefreshed(token: string) {
    this.refreshSubscribers.forEach((cb) => cb(token));
    this.refreshSubscribers = [];
  }

  private addRefreshSubscriber(cb: (token: string) => void) {
    this.refreshSubscribers.push(cb);
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const headers = { ...this.getHeaders(), ...(options.headers || {}) };

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers,
      });
    } catch (networkError: any) {
      console.warn(`[LIMS API] Network error on ${url}:`, networkError?.message || networkError);
      throw new Error(`Failed to fetch from backend server (${url}). Please check if the backend service is running.`);
    }

    // Check for 401 Unauthorized (Access token expired or invalid)
    if (response.status === 401) {
      const isAuthEndpoint = endpoint.includes('/auth/login') || endpoint.includes('/auth/refresh');
      if (!isAuthEndpoint) {
        const refreshToken = getStoredRefreshToken();

        if (refreshToken) {
          if (!this.isRefreshing) {
            this.isRefreshing = true;

            try {
              const refreshResponse = await fetch(`${API_BASE}/auth/refresh`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Accept: 'application/json',
                },
                body: JSON.stringify({ refreshToken }),
              });

              if (refreshResponse.ok) {
                const data = await refreshResponse.json();
                const rememberMe = !!localStorage.getItem(TOKEN_KEY);
                setStoredSession(data.accessToken, data.refreshToken, data.user, rememberMe);
                this.isRefreshing = false;
                this.onTokenRefreshed(data.accessToken);

                // Retry original request with new token
                const retryHeaders = {
                  ...this.getHeaders(),
                  ...(options.headers || {}),
                  Authorization: `Bearer ${data.accessToken}`,
                };
                const retryResponse = await fetch(url, { ...options, headers: retryHeaders });
                if (!retryResponse.ok) {
                  throw new Error(`HTTP Error ${retryResponse.status}`);
                }
                if (retryResponse.status === 204) return {} as T;
                return retryResponse.json();
              } else {
                throw new Error('Refresh failed');
              }
            } catch (err) {
              this.isRefreshing = false;
              clearStoredSession();
              if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
                window.location.href = '/login?error=session_expired';
              }
              throw new Error('Session expired. Please log in again.');
            }
          } else {
            // Queue waiting requests while token refreshes
            return new Promise<T>((resolve, reject) => {
              this.addRefreshSubscriber(async (newToken: string) => {
                try {
                  const retryHeaders = {
                    ...this.getHeaders(),
                    ...(options.headers || {}),
                    Authorization: `Bearer ${newToken}`,
                  };
                  const retryResponse = await fetch(url, { ...options, headers: retryHeaders });
                  if (!retryResponse.ok) throw new Error(`HTTP Error ${retryResponse.status}`);
                  if (retryResponse.status === 204) resolve({} as T);
                  else resolve(await retryResponse.json());
                } catch (e) {
                  reject(e);
                }
              });
            });
          }
        } else {
          clearStoredSession();
          if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
            window.location.href = '/login';
          }
        }
      }
    }

    if (!response.ok) {
      let errorMessage = `HTTP Error ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = Array.isArray(errorData.message)
          ? errorData.message.join(', ')
          : errorData.message || errorMessage;
      } catch (e) {
        // fallback
      }
      throw new Error(errorMessage);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  get<T>(endpoint: string, options?: RequestInit) {
    return this.request<T>(endpoint, { method: 'GET', ...options });
  }

  post<T>(endpoint: string, body?: any, options?: RequestInit) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    });
  }

  put<T>(endpoint: string, body?: any, options?: RequestInit) {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    });
  }

  patch<T>(endpoint: string, body?: any, options?: RequestInit) {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    });
  }

  delete<T>(endpoint: string, options?: RequestInit) {
    return this.request<T>(endpoint, { method: 'DELETE', ...options });
  }

  async upload<T>(endpoint: string, formData: FormData): Promise<T> {
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const token = getStoredToken();
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = Array.isArray(errorData.message)
          ? errorData.message.join(', ')
          : errorData.message || errorMessage;
      } catch (e) {}
      throw new Error(errorMessage);
    }

    return response.json();
  }
}

export const api = new ApiClient();
