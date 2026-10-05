import type { Enquiry, Paged, Status } from './types';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export class ApiError extends Error {
  status: number;
  fields?: Record<string, string[]>;
  constructor(message: string, status: number, fields?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

// sessionStorage: the token is cleared when the tab closes
export const auth = {
  get: () => sessionStorage.getItem('token'),
  set: (t: string) => sessionStorage.setItem('token', t),
  clear: () => sessionStorage.removeItem('token'),
};

async function request<T>(path: string, init: RequestInit = {}, withAuth = false): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (withAuth && auth.get()) headers.Authorization = `Bearer ${auth.get()}`;

  let res: Response;
  try {
    res = await fetch(BASE + path, { ...init, headers });
  } catch {
    throw new ApiError('Cannot reach the server. Is the backend running?', 0);
  }
  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || 'Request failed', res.status, data.fields);
  return data as T;
}

export interface EnquiryInput {
  name: string;
  email: string;
  phone: string;
  service: string;
  message: string;
}

export interface ListParams {
  search?: string;
  status?: string;
  service?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

export const api = {
  chat: (message: string) =>
    request<{ reply: string; suggestions: string[]; startEnquiry?: boolean }>('/chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),
  createEnquiry: (d: EnquiryInput) =>
    request<{ id: number }>('/enquiries', { method: 'POST', body: JSON.stringify(d) }),
  login: (email: string, password: string) =>
    request<{ token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  list: (p: ListParams) => {
    const qs = new URLSearchParams();
    Object.entries(p).forEach(([k, v]) => {
      if (v !== undefined && v !== '') qs.set(k, String(v));
    });
    return request<Paged>(`/enquiries?${qs}`, {}, true);
  },
  setStatus: (id: number, status: Status) =>
    request<Enquiry>(`/enquiries/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }, true),
  remove: (id: number) => request<void>(`/enquiries/${id}`, { method: 'DELETE' }, true),
};