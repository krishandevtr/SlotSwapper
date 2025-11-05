import { useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

interface Event {
  _id: string;
  title: string;
  startTime: string;
  endTime: string;
  status: 'BUSY' | 'SWAPPABLE' | 'SWAP_PENDING';
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const qc = useQueryClient();
  const { data: events } = useQuery<Event[]>({
    queryKey: ['events'],
    queryFn: async () => (await api.get('/events')).data,
  });

  const [form, setForm] = useState({ title: '', startTime: '', endTime: '' });

  const createMutation = useMutation({
    mutationFn: async (data: any) => (await api.post('/events', data)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Event['status'] }) =>
      (await api.put(`/events/${id}`, { status })).data,
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ['events'] });
      const prev = qc.getQueryData<Event[]>(['events']);
      if (prev) qc.setQueryData<Event[]>(['events'], prev.map(e => e._id === id ? { ...e, status } : e));
      return { prev };
    },
    onError: (_err, _vars, ctx) => ctx?.prev && qc.setQueryData(['events'], ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['events'] }),
  });

  const busy = useMemo(() => events?.filter(e => e.status === 'BUSY') || [], [events]);
  const swappable = useMemo(() => events?.filter(e => e.status === 'SWAPPABLE') || [], [events]);
  const pending = useMemo(() => events?.filter(e => e.status === 'SWAP_PENDING') || [], [events]);

  return (
    <div>
      <div className="navbar">
        <h1>SlotSwapper</h1>
        <div className="links">
          <Link to="/marketplace">Marketplace</Link>
          <Link to="/requests">Requests</Link>
          <button className="btn ghost" onClick={logout}>Logout</button>
        </div>
      </div>
      <div className="container">
        <h2 style={{marginTop:0}}>My Events — {user?.name}</h2>

        <section className="section card">
          <h3 style={{marginTop:0}}>Create Event</h3>
          <form className="row" onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }}>
            <label className="label" htmlFor="ev-title" style={{position:'absolute', left:'-10000px'}}>Title</label>
            <input id="ev-title" className="input" placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
            <label className="label" htmlFor="ev-start" style={{position:'absolute', left:'-10000px'}}>Start Time</label>
            <input id="ev-start" aria-label="Start Time" className="input" type="datetime-local" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} required />
            <label className="label" htmlFor="ev-end" style={{position:'absolute', left:'-10000px'}}>End Time</label>
            <input id="ev-end" aria-label="End Time" className="input" type="datetime-local" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} required />
            <button className="btn" type="submit">Add</button>
          </form>
        </section>

        <section className="section card">
          <h3 style={{marginTop:0}}>Busy</h3>
          <ul className="list">
          {busy.map(e => (
            <li key={e._id}>
              {e.title} ({new Date(e.startTime).toLocaleString()} - {new Date(e.endTime).toLocaleString()})
              {e.status === 'BUSY' && (
                <button style={{ marginLeft: 8 }} onClick={() => updateStatus.mutate({ id: e._id, status: 'SWAPPABLE' })}>Make Swappable</button>
              )}
            </li>
          ))}
        </ul>
        </section>

        <section className="section card">
          <h3 style={{marginTop:0}}>Swappable</h3>
          <ul className="list">
          {swappable.map(e => (
            <li key={e._id}>
              {e.title} ({new Date(e.startTime).toLocaleString()} - {new Date(e.endTime).toLocaleString()})
              {e.status === 'SWAPPABLE' && (
                <button style={{ marginLeft: 8 }} onClick={() => updateStatus.mutate({ id: e._id, status: 'BUSY' })}>Make Busy</button>
              )}
            </li>
          ))}
        </ul>
      </section>

      {pending.length > 0 && (
        <section className="section card">
          <h3 style={{marginTop:0}}>Swap Pending</h3>
          <ul className="list">
            {pending.map(e => (
              <li key={e._id}>{e.title} ({new Date(e.startTime).toLocaleString()}) — Pending</li>
            ))}
          </ul>
        </section>
      )}
      </div>
    </div>
  );
}
