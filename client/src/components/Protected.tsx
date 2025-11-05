import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import React, { useEffect } from 'react';

export function Protected({ children }: { children: React.ReactElement }) {
  const { token, initialized } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (initialized && !token) {
      navigate('/login', { replace: true });
    }
  }, [initialized, token, navigate]);
  if (!initialized) return <div style={{display:'grid',placeItems:'center',minHeight:'60vh'}}>Loading...</div>;
  if (!token) return null;
  return children;
}
