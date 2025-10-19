import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { handleContractExecution } from '../contract-execution/handler.ts';

describe('contract-execution handler', () => {
  const buildSupabaseMock = () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    const updateEqMock = vi.fn().mockResolvedValue({ error: null });
    const updateMock = vi.fn(() => ({ eq: updateEqMock }));
    const selectSingleMock = vi.fn().mockResolvedValue({
      data: {
        id: 'contract-1',
        producer_id: 'user-1',
        artist_id: 'user-2',
        producer_signature: null,
        artist_signature: null,
        signed_at: null,
      },
      error: null,
    });
    const selectEqMock = vi.fn(() => ({ single: selectSingleMock }));
    const selectMock = vi.fn(() => ({ eq: selectEqMock }));

    const fromMock = vi.fn((table: string) => {
      if (table === 'licensing_contracts') {
        return {
          select: selectMock,
          update: updateMock,
        };
      }

      if (table === 'contract_signatures') {
        return {
          insert: insertMock,
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const authGetUserMock = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    return {
      supabase: {
        auth: { getUser: authGetUserMock },
        from: fromMock,
      },
      insertMock,
      updateMock,
      updateEqMock,
      selectSingleMock,
    } as const;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-04-12T15:30:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('captures forwarded ip and user agent metadata', async () => {
    const mocks = buildSupabaseMock();

    const request = new Request('https://example.com', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer token',
        'x-forwarded-for': '203.0.113.7, 70.0.0.1',
        'user-agent': 'Vitest/1.0',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contractId: 'contract-1',
        signature: 'signed-producer',
        signerType: 'producer',
      }),
    });

    const response = await handleContractExecution(request, { supabase: mocks.supabase });

    expect(response.status).toBe(200);

    const insertPayload = mocks.insertMock.mock.calls[0][0];
    expect(insertPayload.ip_address).toBe('203.0.113.7');
    expect(insertPayload.user_agent).toBe('Vitest/1.0');

    const updatePayload = mocks.updateMock.mock.calls[0][0];
    expect(updatePayload.producer_ip_address).toBe('203.0.113.7');

    const body = await response.json();
    expect(body.metadata).toEqual({
      ipAddress: '203.0.113.7',
      userAgent: 'Vitest/1.0',
      signedAt: '2024-04-12T15:30:00.000Z',
      signerType: 'producer',
    });
  });

  it('falls back to cf-connecting-ip and marks contract signed when both parties sign', async () => {
    const mocks = buildSupabaseMock();

    (mocks.supabase.auth.getUser as any).mockResolvedValueOnce({
      data: { user: { id: 'artist-1' } },
      error: null,
    });

    mocks.selectSingleMock.mockResolvedValueOnce({
      data: {
        id: 'contract-1',
        producer_id: 'user-1',
        artist_id: 'artist-1',
        producer_signature: 'signed-producer',
        artist_signature: null,
        signed_at: null,
      },
      error: null,
    });

    const request = new Request('https://example.com', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer token',
        'cf-connecting-ip': '198.51.100.5',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contractId: 'contract-1',
        signature: 'signed-artist',
        signerType: 'artist',
      }),
    });

    const response = await handleContractExecution(request, { supabase: mocks.supabase });

    expect(response.status).toBe(200);

    const insertPayload = mocks.insertMock.mock.calls[0][0];
    expect(insertPayload.ip_address).toBe('198.51.100.5');
    expect(insertPayload.user_agent).toBe('unknown');

    const updatePayload = mocks.updateMock.mock.calls[0][0];
    expect(updatePayload.artist_ip_address).toBe('198.51.100.5');
    expect(updatePayload.status).toBe('signed');
    expect(updatePayload.signed_at).toBe('2024-04-12T15:30:00.000Z');

    const body = await response.json();
    expect(body.metadata).toEqual({
      ipAddress: '198.51.100.5',
      userAgent: 'unknown',
      signedAt: '2024-04-12T15:30:00.000Z',
      signerType: 'artist',
    });
  });
});
