import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { Link } from 'react-router-dom';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
      location.href = '/';
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="container">
      <div className="center">
        <div className="card" style={{maxWidth:420, width:'100%'}}>
          <h2 style={{marginTop:0}}>Welcome back</h2>
          <p style={{color:'var(--muted)', marginTop:0}}>Log in to continue to SlotSwapper</p>
          <form onSubmit={onSubmit}>
            <label className="label" htmlFor="login-email">Email</label>
            <input id="login-email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
            <label className="label" htmlFor="login-password">Password</label>
            <input id="login-password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
            {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
            <div style={{display:'flex', justifyContent:'space-between', marginTop:12}}>
              <Link to="/signup">Create account</Link>
              <button className="btn" type="submit">Log In</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
