import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { Link } from 'react-router-dom';

export default function Signup() {
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await signup(name, email, password);
      location.href = '/';
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Signup failed');
    }
  };

  return (
    <div className="container">
      <div className="center">
        <div className="card" style={{maxWidth:420, width:'100%'}}>
          <h2 style={{marginTop:0}}>Create your account</h2>
          <p style={{color:'var(--muted)', marginTop:0}}>Join SlotSwapper</p>
          <form onSubmit={onSubmit}>
            <label className="label" htmlFor="signup-name">Name</label>
            <input id="signup-name" className="input" value={name} onChange={(e) => setName(e.target.value)} required />
            <label className="label" htmlFor="signup-email">Email</label>
            <input id="signup-email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
            <label className="label" htmlFor="signup-password">Password</label>
            <input id="signup-password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
            {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
            <div style={{display:'flex', justifyContent:'space-between', marginTop:12}}>
              <Link to="/login">Have an account? Log in</Link>
              <button className="btn" type="submit">Create Account</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
