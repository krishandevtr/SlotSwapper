import { useMemo, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { api } from '../api/client';
import { Link } from 'react-router-dom';

interface Event {
  _id: string;
  title: string;
  startTime: string;
  endTime: string;
  status: 'BUSY' | 'SWAPPABLE' | 'SWAP_PENDING';
  userId: string;
}

export default function Marketplace() {
  const qc = useQueryClient();
  const { data: others } = useQuery<Event[]>({
    queryKey: ['market'],
    queryFn: async () => (await api.get('/swappable-slots')).data,
  });
  const { data: myEvents } = useQuery<Event[]>({
    queryKey: ['events'],
    queryFn: async () => (await api.get('/events')).data,
  });

  const mySwappable = useMemo(() => (myEvents || []).filter(e => e.status === 'SWAPPABLE'), [myEvents]);

  const [offerFor, setOfferFor] = useState<string | null>(null);
  const [myChoice, setMyChoice] = useState<string | null>(null);

  const sendRequest = useMutation({
    mutationFn: async ({ mySlotId, theirSlotId }: { mySlotId: string; theirSlotId: string }) =>
      (await api.post('/swap-request', { mySlotId, theirSlotId })).data,
    onSuccess: () => {
      setOfferFor(null);
      setMyChoice(null);
      qc.invalidateQueries({ queryKey: ['market'] });
      qc.invalidateQueries({ queryKey: ['events'] });
      qc.invalidateQueries({ queryKey: ['requests', 'outgoing'] });
    },
  });

  return (
    <div>
      <div className="navbar">
        <h1>SlotSwapper</h1>
        <div className="links">
          <Link to="/">Dashboard</Link>
          <Link to="/requests">Requests</Link>
        </div>
      </div>
      <div className="container">
        <h2 style={{marginTop:0}}>Marketplace</h2>
        <ul className="list card">
          {(others || []).map(slot => (
            <li key={slot._id}>
              <div>
                <strong>{slot.title}</strong>
                <div className="badge">{new Date(slot.startTime).toLocaleString()} — {new Date(slot.endTime).toLocaleString()}</div>
              </div>
              <div>
                <button className="btn" onClick={() => setOfferFor(slot._id)}>Request Swap</button>
              </div>
              {offerFor === slot._id && (
                <div className="card" style={{marginTop:8, width:'100%'}}>
                  <p style={{marginTop:0}}>Select one of your swappable slots to offer:</p>
                  <div className="row">
                    <select className="input" value={myChoice ?? ''} onChange={e => setMyChoice(e.target.value)}>
                      <option value="" disabled>Choose your slot</option>
                      {mySwappable.map(e => (
                        <option key={e._id} value={e._id}>
                          {e.title} ({new Date(e.startTime).toLocaleString()})
                        </option>
                      ))}
                    </select>
                    <button className="btn" disabled={!myChoice} onClick={() => myChoice && sendRequest.mutate({ mySlotId: myChoice, theirSlotId: slot._id })}>Send</button>
                    <button className="btn ghost" onClick={() => { setOfferFor(null); setMyChoice(null); }}>Cancel</button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
