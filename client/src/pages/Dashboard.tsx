import { useCallback, useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api, ApiError, auth } from '../api';
import { SERVICES, serviceLabel } from '../types';
import type { Enquiry, Paged, Status } from '../types';

export default function Dashboard() {
  const nav = useNavigate();
  const [data, setData] = useState<Paged | null>(null);
  const [search, setSearch] = useState('');
  const [q, setQ] = useState(''); // search value after a short delay
  const [status, setStatus] = useState('');
  const [service, setService] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Enquiry | null>(null);

  const logout = useCallback(() => {
    auth.clear();
    nav('/admin');
  }, [nav]);

  // Wait 300ms after typing stops before searching
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await api.list({ search: q, status, service, sort, page, limit: 8 }));
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        logout();
        return;
      }
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [q, status, service, sort, page, logout]);

  useEffect(() => {
    load();
  }, [load]);

  if (!auth.get()) return <Navigate to="/admin" replace />;

  async function changeStatus(id: number, s: Status) {
    try {
      await api.setStatus(id, s);
      setSelected((sel) => (sel && sel.id === id ? { ...sel, status: s } : sel));
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    }
  }

  async function remove(id: number) {
    if (!window.confirm('Delete this enquiry permanently?')) return;
    try {
      await api.remove(id);
      setSelected(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  const filter = (set: (v: string) => void) => (e: { target: { value: string } }) => {
    set(e.target.value);
    setPage(1);
  };

  return (
    <main className="dash">
      <div className="dash-head">
        <h2>Enquiries {data && <small>({data.total})</small>}</h2>
        <button className="btn ghost" onClick={logout}>Log out</button>
      </div>

      <div className="filters">
        <input placeholder="Search name, email, message..." value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search" />
        <select value={status} onChange={filter(setStatus)} aria-label="Status filter">
          <option value="">All statuses</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="closed">Closed</option>
        </select>
        <select value={service} onChange={filter(setService)} aria-label="Service filter">
          <option value="">All services</option>
          {SERVICES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <select value={sort} onChange={filter(setSort)} aria-label="Sort">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="name">Name A-Z</option>
        </select>
      </div>

      {error && <div className="err banner" role="alert">{error}</div>}

      {loading && !data ? (
        <p>Loading...</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th><th>Email</th><th>Service</th><th>Date</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((e) => (
                <tr key={e.id}>
                  <td>{e.name}</td>
                  <td>{e.email}</td>
                  <td>{serviceLabel(e.service)}</td>
                  <td>{e.created_at.slice(0, 10)}</td>
                  <td>
                    <select className={`pill ${e.status}`} value={e.status} onChange={(ev) => changeStatus(e.id, ev.target.value as Status)} aria-label={`Status for ${e.name}`}>
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="closed">Closed</option>
                    </select>
                  </td>
                  <td className="actions">
                    <button className="link" onClick={() => setSelected(e)}>View</button>
                    <button className="link danger" onClick={() => remove(e.id)}>Delete</button>
                  </td>
                </tr>
              ))}
              {data && !data.items.length && (
                <tr><td colSpan={6} className="empty">No enquiries found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {data && (
        <div className="pager">
          <button className="btn ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span>Page {data.page} of {data.pages}</span>
          <button className="btn ghost" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}

      {selected && (
        <div className="modal-bg" onClick={() => setSelected(null)}>
          <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h3>{selected.name}</h3>
            <p><b>Email:</b> {selected.email}</p>
            <p><b>Phone:</b> {selected.phone || '-'}</p>
            <p><b>Service:</b> {serviceLabel(selected.service)}</p>
            <p><b>Received:</b> {selected.created_at}</p>
            <p className="msg">{selected.message}</p>
            <div className="modal-actions">
              <select value={selected.status} onChange={(ev) => changeStatus(selected.id, ev.target.value as Status)} aria-label="Change status">
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="closed">Closed</option>
              </select>
              <button className="btn ghost" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}