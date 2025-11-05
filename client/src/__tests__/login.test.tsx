import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Login from '../pages/Login';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../auth/AuthContext';

jest.mock('../api/client', () => {
  const actual = jest.requireActual('../api/client');
  return {
    ...actual,
    api: {
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

describe('Login page', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('logs in and stores token + user', async () => {
    render(<Login />, { wrapper: Wrapper as any });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 't@test.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'secret1' } });
    fireEvent.click(screen.getByRole('button', { name: /Log In/i }));

    // Wait a tick for async
    await new Promise(r => setTimeout(r, 0));

    expect(localStorage.getItem('token')).toBe('T');
    expect(JSON.parse(localStorage.getItem('user') || '{}')?.email).toBe('t@test.com');
  });
});
