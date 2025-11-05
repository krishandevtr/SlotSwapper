import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Requests from '../pages/Requests';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../auth/AuthContext';
import { api } from '../api/client';

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({ on: jest.fn(), disconnect: jest.fn() }))
}));

jest.mock('../api/client', () => {
  const actual = jest.requireActual('../api/client');
  return {
    ...actual,
    api: {
      get: jest.fn(async (url: string) => {
        if (url.startsWith('/requests?type=incoming')) {
          return { data: [
            { _id: 'r1', status: 'PENDING', mySlotId: { _id: 'm1', title: 'Offer A', startTime: '', endTime: '', status: 'SWAPPABLE' }, theirSlotId: { _id: 't1', title: 'Your B', startTime: '', endTime: '', status: 'SWAPPABLE' } }
          ] };
        }
        if (url.startsWith('/requests?type=outgoing')) {
          return { data: [
            { _id: 'r2', status: 'PENDING', mySlotId: { _id: 'm2', title: 'My C', startTime: '', endTime: '', status: 'SWAPPABLE' }, theirSlotId: { _id: 't2', title: 'Their D', startTime: '', endTime: '', status: 'SWAPPABLE' } }
          ] };
        }
        return { data: [] };
      }),
      post: jest.fn(async (url: string, body: any) => {
        if (url.startsWith('/swap-response/')) return { data: { ok: true } };
        return { data: {} };
      }),
    }
  };
});

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient();
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}

describe('Requests', () => {
  beforeEach(() => {
    localStorage.setItem('token', 'T');
    localStorage.setItem('user', JSON.stringify({ id: 'u1', name: 'User', email: 'u@test.com' }));
  });

  it('accepts and rejects requests', async () => {
    render(<Requests />, { wrapper: Wrapper as any });
    await screen.findByText(/Incoming/i);

    // Accept first incoming
    const acceptBtn = await screen.findByRole('button', { name: /Accept/i });
    fireEvent.click(acceptBtn);
    await waitFor(() => expect((api as any).post).toHaveBeenCalledWith('/swap-response/r1', { accept: true }));

    // Reject scenario
    const rejectBtn = await screen.findByRole('button', { name: /Reject/i });
    fireEvent.click(rejectBtn);
    await waitFor(() => expect((api as any).post).toHaveBeenCalledWith('/swap-response/r1', { accept: false }));
  });
});
