import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { handleContractExecution } from '../contract-execution/handler.ts';

describe('contract-execution handler', () => {
  const buildSupabaseMock = () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    const auditInsertMock = vi.fn().mockResolvedValue({ error: null });
    const finalizeUpdateEqMock = vi.fn().mockResolvedValue({ error: null });
    const selectAfterUpdateMock = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'contract-1',
          producer_signature: null,
          artist_signature: null,
          signed_at: null,
          status: 'pending',
        },
      ],
      error: null,
    });
    const signatureUpdateEqMock = vi.fn(() => ({ select: selectAfterUpdateMock }));
    const updateMock = vi.fn((payload: Record<string, unknown>) => {
      if (payload.status === 'signed') {
        return { eq: finalizeUpdateEqMock };
      }

      return { eq: signatureUpdateEqMock };
    });
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

      if (table === 'security_audit_log') {
        return {
          insert: auditInsertMock,
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
      auditInsertMock,
      updateMock,
      finalizeUpdateEqMock,
      signatureUpdateEqMock,
      selectAfterUpdateMock,
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

    expect(mocks.updateMock).toHaveBeenCalledTimes(1);
    const insertPayload = mocks.insertMock.mock.calls[0][0];
    expect(insertPayload.ip_address).toBe('203.0.113.7');
    expect(insertPayload.user_agent).toBe('Vitest/1.0');

    const auditPayload = mocks.auditInsertMock.mock.calls[0][0];
    expect(auditPayload).toEqual({
      user_id: 'user-1',
      table_name: 'licensing_contracts',
      action: 'contract_signed_producer',
      record_id: 'contract-1',
      ip_address: '203.0.113.7',
      user_agent: 'Vitest/1.0',
      created_at: '2024-04-12T15:30:00.000Z',
    });

    const updatePayload = mocks.updateMock.mock.calls[0][0] as Record<string, unknown>;
    expect(updatePayload.producer_ip_address).toBe('203.0.113.7');
    expect(mocks.signatureUpdateEqMock).toHaveBeenCalled();
    expect(mocks.selectAfterUpdateMock).toHaveBeenCalledWith('id, producer_signature, artist_signature, signed_at, status');
    expect(mocks.finalizeUpdateEqMock).not.toHaveBeenCalled();

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

    mocks.selectAfterUpdateMock.mockResolvedValueOnce({
      data: [
        {
          id: 'contract-1',
          producer_signature: 'signed-producer',
          artist_signature: 'signed-artist',
          signed_at: null,
          status: 'pending',
        },
      ],
      error: null,
    });

    const response = await handleContractExecution(request, { supabase: mocks.supabase });

    expect(response.status).toBe(200);

    const insertPayload = mocks.insertMock.mock.calls[0][0];
    expect(insertPayload.ip_address).toBe('198.51.100.5');
    expect(insertPayload.user_agent).toBe('unknown');

    const auditPayload = mocks.auditInsertMock.mock.calls[0][0];
    expect(auditPayload).toEqual({
      user_id: 'artist-1',
      table_name: 'licensing_contracts',
      action: 'contract_signed_artist',
      record_id: 'contract-1',
      ip_address: '198.51.100.5',
      user_agent: 'unknown',
      created_at: '2024-04-12T15:30:00.000Z',
    });

    const updatePayload = mocks.updateMock.mock.calls[0][0] as Record<string, unknown>;
    expect(updatePayload.artist_ip_address).toBe('198.51.100.5');
    expect(mocks.finalizeUpdateEqMock).toHaveBeenCalledTimes(1);
    const finalizePayload = mocks.updateMock.mock.calls[1][0] as Record<string, unknown>;
    expect(finalizePayload).toMatchObject({
      status: 'signed',
      signed_at: '2024-04-12T15:30:00.000Z',
      updated_at: '2024-04-12T15:30:00.000Z',
    });

    const body = await response.json();
    expect(body.metadata).toEqual({
      ipAddress: '198.51.100.5',
      userAgent: 'unknown',
      signedAt: '2024-04-12T15:30:00.000Z',
      signerType: 'artist',
    });
  });
});
