/**
 * Typed API client for CampusConnect backend.
 * Uses fetch with credentials for session cookie auth.
 * Vite proxy forwards /api to Flask (no CORS needed in development).
 */

import type {
  ApiResponse,
  User,
  ServiceType,
  Provider,
  AvailabilitySlot,
  Appointment,
  QueueEntry,
  Notification,
  AuditEvent,
  RequestTraceStep,
  ServiceMetadata,
} from '@/types';

const BASE = '/api/v1';

class ApiError extends Error {
  public code: string;
  public status: number;
  public correlationId: string | null;

  constructor(message: string, code: string, status: number, correlationId: string | null = null) {
    super(message);
    this.code = code;
    this.status = status;
    this.correlationId = correlationId;
    this.name = 'ApiError';
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  extraHeaders?: Record<string, string>,
): Promise<ApiResponse<T>> {
  const correlationId = crypto.randomUUID();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Correlation-ID': correlationId,
    ...extraHeaders,
  };

  const res = await fetch(`${BASE}${path}`, {
    method,
    credentials: 'include',
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data: ApiResponse<T> = await res.json().catch(() => ({
    success: false,
    error: { code: 'PARSE_ERROR', message: 'Failed to parse response.' },
    correlation_id: null,
  }));

  if (!res.ok) {
    const msg = data.error?.message || `HTTP ${res.status}`;
    const code = data.error?.code || 'HTTP_ERROR';
    throw new ApiError(msg, code, res.status, data.correlation_id ?? null);
  }

  return data;
}

const get = <T>(path: string) => request<T>('GET', path);
const post = <T>(path: string, body?: unknown) => request<T>('POST', path, body);
const del = <T>(path: string) => request<T>('DELETE', path);

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    post<User>('/auth/login', { email, password }),
  logout: () => post<null>('/auth/logout'),
  me: () => get<User>('/auth/me'),
};

// Catalog
export const catalogApi = {
  services: () => get<ServiceType[]>('/catalog/services'),
  providers: (serviceType?: string) =>
    get<Provider[]>(`/catalog/providers${serviceType ? `?service_type=${serviceType}` : ''}`),
};

// Availability
export const availabilityApi = {
  list: (params: {
    service_type?: string;
    provider_id?: number;
    from?: string;
    to?: string;
  }) => {
    const qs = new URLSearchParams();
    if (params.service_type) qs.set('service_type', params.service_type);
    if (params.provider_id) qs.set('provider_id', String(params.provider_id));
    if (params.from) qs.set('from', params.from);
    if (params.to) qs.set('to', params.to);
    return get<AvailabilitySlot[]>(`/availability?${qs}`);
  },
  staffSlots: (providerId?: number) => {
    const qs = providerId ? `?provider_id=${providerId}` : '';
    return get<AvailabilitySlot[]>(`/staff/slots${qs}`);
  },
  addSlot: (data: {
    provider_id: number;
    start_at: string;
    end_at: string;
  }) => post<AvailabilitySlot>('/admin/availability', data),
  blockSlot: (slotId: number) =>
    post<AvailabilitySlot>(`/admin/availability/${slotId}/block`),
  unblockSlot: (slotId: number) =>
    post<AvailabilitySlot>(`/admin/availability/${slotId}/unblock`),
};

// Appointments
export const appointmentsApi = {
  create: (data: {
    service_type: string;
    slot_id: number;
    provider_id: number;
    request_id?: string;
    notes?: string;
  }) => post<Appointment>('/appointments', data),
  myAppointments: (status?: string) =>
    get<Appointment[]>(`/appointments/me${status ? `?status=${status}` : ''}`),
  getById: (id: string) => get<Appointment>(`/appointments/${id}`),
  cancel: (id: string, reason?: string) =>
    post<Appointment>(`/appointments/${id}/cancel`, { reason }),
  reschedule: (id: string, newSlotId: number) =>
    post<Appointment>(`/appointments/${id}/reschedule`, { new_slot_id: newSlotId }),
};

// Queue
export const queueApi = {
  myQueue: () => get<QueueEntry | null>('/clinic/queue/me'),
  staffQueue: (date?: string) =>
    get<QueueEntry[]>(`/staff/clinic/queue${date ? `?date=${date}` : ''}`),
  callNext: (date?: string) =>
    post<QueueEntry | null>('/staff/clinic/queue/next', { date }),
  updateStatus: (entryId: number, status: string) =>
    post<QueueEntry>(`/staff/clinic/queue/${entryId}/status`, { status }),
};

// Advising staff
export const advisingApi = {
  appointments: () => get<Appointment[]>('/staff/advising/appointments'),
  updateStatus: (id: string, status: string, outcomeNotes?: string) =>
    post<Appointment>(`/staff/advising/appointments/${id}/status`, {
      status,
      outcome_notes: outcomeNotes,
    }),
};

// Notifications
export const notificationsApi = {
  list: () => get<{ notifications: Notification[]; unread_count: number }>('/notifications/me'),
  markRead: (id: number) => post<Notification>(`/notifications/${id}/read`),
  markAllRead: () => post<{ marked_read: number }>('/notifications/read-all'),
};

// Admin
export const adminApi = {
  overview: () => get<{
    appointments_today: number;
    upcoming_bookings: number;
    cancellations: number;
    active_queue_entries: number;
  }>('/admin/overview'),
  bookingsChart: (days?: number) =>
    get<{ date: string; service: string; count: number }[]>(
      `/admin/charts/bookings${days ? `?days=${days}` : ''}`
    ),
  statusDistribution: () =>
    get<{ status: string; count: number }[]>('/admin/charts/status-distribution'),
  auditEvents: (page?: number) =>
    get<{
      events: AuditEvent[];
      total: number;
      page: number;
      pages: number;
    }>(`/admin/audit-events${page ? `?page=${page}` : ''}`),
  traces: (page?: number, correlationId?: string) => {
    const qs = new URLSearchParams();
    if (page) qs.set('page', String(page));
    if (correlationId) qs.set('correlation_id', correlationId);
    return get<{
      traces?: { correlation_id: string; step_count: number; started_at: string }[];
      steps?: RequestTraceStep[];
      correlation_id?: string;
      total?: number;
      page?: number;
    }>(`/admin/traces?${qs}`);
  },
  services: () => get<ServiceMetadata[]>('/admin/services'),
  policies: () => get<Record<string, unknown>>('/admin/policies'),
  contracts: (service?: string) =>
    get<unknown[]>(`/admin/contracts${service ? `?service=${encodeURIComponent(service)}` : ''}`),
  health: () => get<Record<string, { status: string; note: string }>>('/admin/health'),
  getFaultFlags: () => get<Record<string, boolean>>('/admin/fault-lab/flags'),
  setFaultFlags: (flags: Record<string, boolean>) =>
    post<Record<string, boolean>>('/admin/fault-lab/flags', flags),
};

// Health
export const healthApi = {
  check: () =>
    fetch('/api/health', { credentials: 'include' }).then((r) => r.json() as Promise<{
      status: string;
      version: string;
      database: string;
      demo_mode: boolean;
    }>),
};

export { ApiError };
