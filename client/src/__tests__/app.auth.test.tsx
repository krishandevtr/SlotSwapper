import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../App';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../auth/AuthContext';

jest.mock('../api/client', () => {
  const actual = jest.requireActual('../api/client');
  return {
    ...actual,
    api: {
      get: jest.fn(async (url: string) => {
        if (url === '/events') return { data: [] };
        if (url.startsWith('/requests')) return { data: [] };
        if (url === '/swappable-slots') return { data: [] };
        return { data: [] };
      }),
      post: jest.fn(async () => ({ data: { token: 'T', user: { id: 'u1', name: 'Test', email: 't@test.com' } } }))
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

describe('App auth and protected routes', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows dashboard when token exists', async () => {
    localStorage.setItem('token', 'T');
    localStorage.setItem('user', JSON.stringify({ id: 'u1', name: 'Test', email: 't@test.com' }));
    render(<App />, { wrapper: Wrapper as any });
    await waitFor(() => expect(screen.getByText(/My Events/i)).toBeInTheDocument());
  });
});
