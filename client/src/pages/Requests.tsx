import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { Link } from 'react-router-dom';

interface Event { _id: string; title: string; startTime: string; endTime: string; status: 'BUSY' | 'SWAPPABLE' | 'SWAP_PENDING' }
interface SwapRequest {
  _id: string;
  requesterId: string;
  responderId: string;
  mySlotId: Event;
  theirSlotId: Event;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
}

export default function Requests() {
  const qc = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    const socketUrl = (import.meta as any).env?.VITE_API_SOCKET || 'http://localhost:4000';
    const socket: Socket = io(socketUrl, {
      auth: { userId: user?.id },
    });
    socket.on('swap:incoming', () => {
      qc.invalidateQueries({ queryKey: ['requests', 'incoming'] });
    });
    socket.on('swap:updated', () => {
      qc.invalidateQueries({ queryKey: ['requests', 'incoming'] });
      qc.invalidateQueries({ queryKey: ['requests', 'outgoing'] });
      qc.invalidateQueries({ queryKey: ['events'] });
      qc.invalidateQueries({ queryKey: ['market'] });
    });
    return () => { socket.disconnect(); };
  }, [user?.id, qc]);

  const { data: incoming } = useQuery<SwapRequest[]>({
    queryKey: ['requests', 'incoming'],
    queryFn: async () => (await api.get('/requests?type=incoming')).data,
  });
  const { data: outgoing } = useQuery<SwapRequest[]>({
    queryKey: ['requests', 'outgoing'],
    queryFn: async () => (await api.get('/requests?type=outgoing')).data,
  });

  const respond = useMutation({
    mutationFn: async ({ id, accept }: { id: string; accept: boolean }) => (await api.post(`/swap-response/${id}`, { accept })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['requests', 'incoming'] });
      qc.invalidateQueries({ queryKey: ['requests', 'outgoing'] });
      qc.invalidateQueries({ queryKey: ['events'] });
      qc.invalidateQueries({ queryKey: ['market'] });
    }
  });

  return (
    <div>
      <div className="navbar">
        <Link to="/">
          <h1>SlotSwapper</h1>
        </Link>
        <div className="links">
          <Link to="/">Dashboard</Link>
          <Link to="/marketplace">Marketplace</Link>
        </div>
      </div>
      <div className="container">
        <h2 style={{ marginTop: 0 }}>Requests</h2>
        <div className="row">
          <section className="card" style={{ flex: 1 }}>
            <h3 style={{ marginTop: 0 }}>Incoming</h3>
            <ul className="list">
              {(incoming || []).map(r => (
                <li key={r._id}>
                  <div>
                    They offer: <strong>{r.mySlotId.title}</strong> for your <strong>{r.theirSlotId.title}</strong>
                    <div className={`badge ${r.status === 'PENDING' ? 'pending' : r.status === 'ACCEPTED' ? 'success' : 'warn'}`}>{r.status}</div>
                  </div>
                  {r.status === 'PENDING' && (
                    <div>
                      <button className="btn" onClick={() => respond.mutate({ id: r._id, accept: true })}>Accept</button>
                      <button className="btn danger" style={{ marginLeft: 8 }} onClick={() => respond.mutate({ id: r._id, accept: false })}>Reject</button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className="card" style={{ flex: 1 }}>
            <h3 style={{ marginTop: 0 }}>Outgoing</h3>
            <ul className="list">
              {(outgoing || []).map(r => (
                <li key={r._id}>
                  <div>
                    You offered: <strong>{r.mySlotId.title}</strong> for <strong>{r.theirSlotId.title}</strong>
                    <div className={`badge ${r.status === 'PENDING' ? 'pending' : r.status === 'ACCEPTED' ? 'success' : 'warn'}`}>{r.status}</div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
