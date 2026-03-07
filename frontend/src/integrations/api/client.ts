const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const TOKEN_STORAGE_KEY = 'tenantflow_access_token';

type SessionData = {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  user?: { id: string; email?: string };
};

type AuthCallback = (_event: string, session: SessionData | null) => void;

const authListeners = new Set<AuthCallback>();

function getToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

function decodeJwt(token: string): Record<string, unknown> {
  try {
    const payload = token.split('.')[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return {};
  }
}

function currentSession(): SessionData | null {
  const token = getToken();
  if (!token) return null;
  const payload = decodeJwt(token);
  return {
    access_token: token,
    refresh_token: token,
    token_type: 'bearer',
    user: {
      id: String(payload.sub || ''),
      email: typeof payload.email === 'string' ? payload.email : undefined,
    },
  };
}

async function apiFetch(path: string, init: RequestInit = {}) {
  const token = getToken();
  const headers = new Headers(init.headers || {});
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  let data: any = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message = data?.detail || data?.message || `HTTP ${response.status}`;
    throw new Error(message);
  }

  return data;
}

class QueryBuilder {
  private filters: Record<string, unknown> = {};
  private inFilters: Record<string, unknown[]> = {};
  private orderBy?: string;
  private ascending = true;
  private singleRow = false;
  private limitRows?: number;
  private operation: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private payload: any = null;

  constructor(private table: string) {}

  select(_columns?: string) {
    return this;
  }

  eq(key: string, value: unknown) {
    this.filters[key] = value;
    return this;
  }

  in(key: string, values: unknown[]) {
    this.inFilters[key] = values;
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderBy = column;
    this.ascending = options?.ascending ?? true;
    return this;
  }

  single() {
    this.singleRow = true;
    return this;
  }

  limit(value: number) {
    this.limitRows = value;
    return this;
  }

  insert(payload: any) {
    this.operation = 'insert';
    this.payload = payload;
    return this;
  }

  update(payload: any) {
    this.operation = 'update';
    this.payload = payload;
    return this;
  }

  delete() {
    this.operation = 'delete';
    return this;
  }

  private async execute() {
    try {
      if (this.table === 'tasks') {
        return this.executeTasks();
      }
      return this.executeGeneric();
    } catch (error) {
      return { data: null, error };
    }
  }

  private async executeTasks() {
    if (this.operation === 'select') {
      const result = await apiFetch('/tasks');
      const tasks = result?.data?.items || [];
      let filtered = tasks as any[];

      Object.entries(this.filters).forEach(([key, value]) => {
        filtered = filtered.filter((item) => String(item[key]) === String(value));
      });

      Object.entries(this.inFilters).forEach(([key, values]) => {
        filtered = filtered.filter((item) => values.map(String).includes(String(item[key])));
      });

      if (this.orderBy) {
        filtered = [...filtered].sort((a, b) => {
          const av = a[this.orderBy!];
          const bv = b[this.orderBy!];
          if (av === bv) return 0;
          if (av == null) return 1;
          if (bv == null) return -1;
          return this.ascending ? (av > bv ? 1 : -1) : (av > bv ? -1 : 1);
        });
      }

      if (typeof this.limitRows === 'number') {
        filtered = filtered.slice(0, this.limitRows);
      }

      const data = this.singleRow ? (filtered[0] || null) : filtered;
      return { data, error: null };
    }

    if (this.operation === 'insert') {
      const payload = Array.isArray(this.payload) ? this.payload[0] : this.payload;
      const result = await apiFetch('/tasks', { method: 'POST', body: JSON.stringify(payload) });
      return { data: this.singleRow ? result.data : [result.data], error: null };
    }

    if (this.operation === 'update') {
      const id = String(this.filters.id || '');
      const result = await apiFetch(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(this.payload) });
      return { data: this.singleRow ? result.data : [result.data], error: null };
    }

    const id = String(this.filters.id || '');
    const result = await apiFetch(`/tasks/${id}`, { method: 'DELETE' });
    return { data: result.data, error: null };
  }

  private async executeGeneric() {
    const eq = Object.entries(this.filters)
      .map(([k, v]) => `${k}:${v}`)
      .join(',');
    const inFilters = Object.entries(this.inFilters)
      .map(([k, values]) => `${k}:${values.join('|')}`)
      .join(';');

    if (this.operation === 'select') {
      const params = new URLSearchParams();
      if (eq) params.set('eq', eq);
      if (inFilters) params.set('in', inFilters);
      if (this.orderBy) params.set('order_by', this.orderBy);
      params.set('ascending', String(this.ascending));
      if (typeof this.limitRows === 'number') params.set('limit', String(this.limitRows));
      if (this.singleRow) params.set('single', 'true');

      const result = await apiFetch(`/users/data/${this.table}?${params.toString()}`);
      return { data: result.data, error: null };
    }

    if (this.operation === 'insert') {
      const result = await apiFetch(`/users/data/${this.table}`, {
        method: 'POST',
        body: JSON.stringify({ payload: this.payload, eq: this.filters }),
      });
      return { data: result.data, error: null };
    }

    if (this.operation === 'update') {
      const result = await apiFetch(`/users/data/${this.table}`, {
        method: 'PUT',
        body: JSON.stringify({ payload: this.payload, eq: this.filters }),
      });
      return { data: result.data, error: null };
    }

    const params = new URLSearchParams();
    params.set('eq', eq);
    const result = await apiFetch(`/users/data/${this.table}?${params.toString()}`, {
      method: 'DELETE',
    });
    return { data: result.data, error: null };
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: any }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled as any, onrejected as any);
  }
}

export const apiClient = {
  async getSession() {
    return { data: { session: currentSession() }, error: null };
  },
  onAuthStateChange(callback: AuthCallback) {
    authListeners.add(callback);
    return {
      data: {
        subscription: {
          unsubscribe: () => authListeners.delete(callback),
        },
      },
    };
  },
  async requestOtp({ phone }: { phone: string }) {
    try {
      await apiFetch('/auth/request-otp', { method: 'POST', body: JSON.stringify({ phone }) });
      return { data: null, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
  async verifyOtp({ phone, token }: { phone: string; token: string; type?: string }) {
    try {
      const data = await apiFetch('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ phone, token }),
      });
      const session = { access_token: data.access_token, refresh_token: data.access_token };
      localStorage.setItem(TOKEN_STORAGE_KEY, session.access_token);
      authListeners.forEach((cb) => cb('SIGNED_IN', currentSession()));
      return { data: { session }, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
  async setSession(tokens: { access_token: string; refresh_token?: string }) {
    localStorage.setItem(TOKEN_STORAGE_KEY, tokens.access_token);
    authListeners.forEach((cb) => cb('SIGNED_IN', currentSession()));
    return { data: { session: currentSession() }, error: null };
  },
  async signOut() {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    authListeners.forEach((cb) => cb('SIGNED_OUT', null));
    return { error: null };
  },
  async invokeFunction(name: string, options?: { body?: any }) {
    try {
      if (name === 'demo-login') {
        const data = await apiFetch('/auth/demo-login', {
          method: 'POST',
          body: JSON.stringify(options?.body || {}),
        });
        return { data, error: null };
      }
      const data = await apiFetch(`/functions/${name}`, {
        method: 'POST',
        body: JSON.stringify(options?.body || {}),
      });
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
  table(table: string) {
    return new QueryBuilder(table);
  },
  channel(_name: string) {
    return {
      on() {
        return this;
      },
      subscribe() {
        return { unsubscribe: () => undefined };
      },
    };
  },
  removeChannel(_channel: unknown) {
    return undefined;
  },
};




