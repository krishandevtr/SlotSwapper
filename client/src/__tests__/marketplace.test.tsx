import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Marketplace from '../pages/Marketplace';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../auth/AuthContext';
import { api } from '../api/client';

jest.mock('../api/client', () => {
  const actual = jest.requireActual('../api/client');
  return {
    ...actual,
    api: {
      get: jest.fn(async (url: string) => {
        if (url === '/swappable-slots') {
          return { data: [
            { _id: 's1', title: 'Their Slot', startTime: new Date().toISOString(), endTime: new Date().toISOString(), status: 'SWAPPABLE', userId: 'userB' }
          ] };
        }
        if (url === '/events') {
          return { data: [
            { _id: 'm1', title: 'My Swap', startTime: new Date().toISOString(), endTime: new Date().toISOString(), status: 'SWAPPABLE' }
          ] };
        }
        return { data: [] };
      }),
      post: jest.fn(async (url: string, body: any) => {
        if (url === '/swap-request') return { data: { ok: true } };
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

describe('Marketplace', () => {
  beforeEach(() => {
    localStorage.setItem('token', 'T');
    localStorage.setItem('user', JSON.stringify({ id: 'u1', name: 'User', email: 'u@test.com' }));
  });

  it('requests a swap', async () => {
    render(<Marketplace />, { wrapper: Wrapper as any });
    await screen.findByText(/Their Slot/i);
    fireEvent.click(screen.getByRole('button', { name: /Request Swap/i }));
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'm1' } });
    fireEvent.click(screen.getByRole('button', { name: /^Send$/i }));
    await waitFor(() => expect((api as any).post).toHaveBeenCalledWith('/swap-request', { mySlotId: 'm1', theirSlotId: 's1' }));
  });
});
