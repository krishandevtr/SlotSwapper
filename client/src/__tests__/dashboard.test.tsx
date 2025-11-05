import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Dashboard from '../pages/Dashboard';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../auth/AuthContext';
import { api } from '../api/client';

jest.mock('../api/client', () => {
  const actual = jest.requireActual('../api/client');
  return {
    ...actual,
    api: {
      get: jest.fn(async (url: string) => {
        if (url === '/events') {
          return { data: [
            { _id: '1', title: 'Busy 1', startTime: new Date().toISOString(), endTime: new Date().toISOString(), status: 'BUSY' },
            { _id: '2', title: 'Swap 1', startTime: new Date().toISOString(), endTime: new Date().toISOString(), status: 'SWAPPABLE' },
          ] };
        }
        return { data: [] };
      }),
      post: jest.fn(async (url: string, body: any) => {
        if (url === '/events') {
          return { data: { _id: '3', ...body } };
        }
        return { data: {} };
      }),
      put: jest.fn(async () => ({ data: {} }))
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

describe('Dashboard', () => {
  beforeEach(() => {
    localStorage.setItem('token', 'T');
    localStorage.setItem('user', JSON.stringify({ id: 'u1', name: 'User', email: 'u@test.com' }));
  });

  it('lists events and toggles status', async () => {
    render(<Dashboard />, { wrapper: Wrapper as any });
    // Wait for lists
    await screen.findByText(/Busy 1/i);
    // Toggle Busy -> Swappable
    fireEvent.click(screen.getByRole('button', { name: /Make Swappable/i }));
    await waitFor(() => expect((api as any).put).toHaveBeenCalled());
  });

  it('creates a new event', async () => {
    render(<Dashboard />, { wrapper: Wrapper as any });
    const title = screen.getByPlaceholderText(/Title/i);
    fireEvent.change(title, { target: { value: 'New Event' } });
    const start = screen.getByLabelText(/Start Time/i);
    const end = screen.getByLabelText(/End Time/i);
    fireEvent.change(start, { target: { value: '2025-01-01T10:00' } });
    fireEvent.change(end, { target: { value: '2025-01-01T11:00' } });
    fireEvent.click(screen.getByRole('button', { name: /Add/i }));
    await waitFor(() => expect((api as any).post).toHaveBeenCalledWith('/events', expect.any(Object)));
  });
});
