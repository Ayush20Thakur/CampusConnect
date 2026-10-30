import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiError, authApi, healthApi } from '../api/client';

describe('ApiClient', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('ApiError instantiates with status, code and correlationId', () => {
    const err = new ApiError('Slot unavailable', 'SLOT_UNAVAILABLE', 409, 'trace-123');
    expect(err.message).toBe('Slot unavailable');
    expect(err.code).toBe('SLOT_UNAVAILABLE');
    expect(err.status).toBe(409);
    expect(err.correlationId).toBe('trace-123');
    expect(err.name).toBe('ApiError');
  });

  it('login sends credentials and returns parsed user response', async () => {
    const mockUser = { id: 1, email: 'alex.kim@students.edu', full_name: 'Alex Kim', role: 'STUDENT' };
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: mockUser,
        correlation_id: 'corr-1',
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const res = await authApi.login('alex.kim@students.edu', 'student1234');
    expect(res.success).toBe(true);
    expect(res.data?.email).toBe('alex.kim@students.edu');
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/v1/auth/login',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ email: 'alex.kim@students.edu', password: 'student1234' }),
      })
    );
  });

  it('throws ApiError with server code and message on HTTP failure', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({
        success: false,
        error: { code: 'SLOT_UNAVAILABLE', message: 'The selected slot is already taken.' },
        correlation_id: 'corr-err',
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await expect(authApi.login('alex.kim@students.edu', 'wrong')).rejects.toThrow(ApiError);
  });

  it('healthApi calls /api/health directly', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: async () => ({ status: 'ok', version: '1.0.0', database: 'ok', demo_mode: true }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const health = await healthApi.check();
    expect(health.status).toBe('ok');
    expect(health.database).toBe('ok');
    expect(mockFetch).toHaveBeenCalledWith('/api/health', { credentials: 'include' });
  });
});

