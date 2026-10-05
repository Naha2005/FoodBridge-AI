import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, XCircle, Search, Filter, RefreshCw, Trash2, Eye, Bot } from 'lucide-react';
import { foodApi, agentApi, statusBadge, statusLabel, relativeTime, getUser } from '../services/api';

const STATUSES = ['all', 'available', 'matched', 'accepted', 'scheduled', 'picked_up', 'delivered', 'cancelled'];

const MyDonations = () => {
  const navigate = useNavigate();
  const user = getUser();

  const [donations,  setDonations]  = useState([]);
  const [total,      setTotal]       = useState(0);
  const [page,       setPage]        = useState(1);
  const [search,     setSearch]      = useState('');
  const [statusFilter, setStatus]    = useState('all');
  const [loading,    setLoading]     = useState(true);
  const [error,      setError]       = useState('');
  const [actionLoad, setActionLoad]  = useState('');
  const [toast,      setToast]       = useState('');

  // Detail modal
  const [selected, setSelected] = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await foodApi.myDonations({ page, limit: 10, status: statusFilter !== 'all' ? statusFilter : undefined });
      setDonations(res.donations || []);
      setTotal(res.total || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    load();
  }, [load]);

  // Client-side search filter
  const filtered = search
    ? donations.filter((d) => d.name?.toLowerCase().includes(search.toLowerCase()) || d.category?.toLowerCase().includes(search.toLowerCase()))
    : donations;

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this donation?')) return;
    setActionLoad(id + '-cancel');
    try {
      await foodApi.cancel(id);
      showToast('Donation cancelled.');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoad('');
    }
  };

  const handleRescue = async (donation) => {
    setActionLoad(donation.id + '-rescue');
    try {
      const res = await agentApi.rescue({ donation_id: donation.id });
      navigate('/ai-agent', { state: { rescueResult: res, donationId: donation.id } });
    } catch (err) {
      showToast('AI agent unavailable. Try the AI Agent page directly.');
    } finally {
      setActionLoad('');
    }
  };

  const totalPages = Math.ceil(total / 10);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-brand-600 text-white px-5 py-3 rounded-2xl shadow-lg text-sm font-medium">
          {toast}
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-navy">My Donations</h2>
          <p className="text-muted mt-1">Manage and track all your food donations.</p>
        </div>
        <Link
          to="/donations/new"
          className="bg-brand-900 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-brand-600 transition-colors text-sm"
        >
          + New Donation
        </Link>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm">
          {error} <button onClick={load} className="underline ml-2">Retry</button>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Toolbar */}
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row gap-3 items-center">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search by name or category…"
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl outline-none focus:border-brand-600 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="p-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-brand-600 bg-white"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s === 'all' ? 'All statuses' : statusLabel(s)}</option>
            ))}
          </select>
          <button
            onClick={load}
            disabled={loading}
            className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40"
            title="Refresh"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin text-brand-600' : 'text-muted'} />
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/60">
                <th className="px-5 py-3 text-xs font-semibold text-muted uppercase">Food Item</th>
                <th className="px-5 py-3 text-xs font-semibold text-muted uppercase">Qty</th>
                <th className="px-5 py-3 text-xs font-semibold text-muted uppercase">Expiry</th>
                <th className="px-5 py-3 text-xs font-semibold text-muted uppercase">Status</th>
                <th className="px-5 py-3 text-xs font-semibold text-muted uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((__, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: `${40 + (j * 15) % 50}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-5 py-10 text-center text-muted">
                    {search ? 'No donations match your search.' : 'No donations found.'}{' '}
                    {!search && <Link to="/donations/new" className="text-brand-600 font-semibold hover:underline">Post one now →</Link>}
                  </td>
                </tr>
              ) : (
                filtered.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-navy text-sm">{d.name}</div>
                      <div className="text-xs text-muted mt-0.5">{d.category}</div>
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-navy">{d.quantity} {d.unit}</td>
                    <td className="px-5 py-4 text-sm text-muted">{d.expiry_time ? relativeTime(d.expiry_time) : '—'}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${statusBadge(d.status)}`}>
                        {statusLabel(d.status)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => setSelected(d)}
                          className="text-xs text-brand-600 hover:underline font-semibold flex items-center gap-1"
                        >
                          <Eye size={13} /> View
                        </button>
                        {d.status === 'available' && (
                          <button
                            onClick={() => handleRescue(d)}
                            disabled={!!actionLoad}
                            className="text-xs bg-brand-100 text-brand-900 px-2.5 py-1 rounded-lg font-semibold hover:bg-brand-600 hover:text-white transition-colors disabled:opacity-50 flex items-center gap-1"
                          >
                            {actionLoad === d.id + '-rescue' ? '…' : <><Bot size={12} /> Rescue</>}
                          </button>
                        )}
                        {!['delivered', 'cancelled'].includes(d.status) && (
                          <button
                            onClick={() => handleCancel(d.id)}
                            disabled={!!actionLoad}
                            className="text-xs text-red-500 hover:text-red-700 font-semibold disabled:opacity-50 flex items-center gap-1"
                          >
                            {actionLoad === d.id + '-cancel' ? '…' : <><Trash2 size={12} /> Cancel</>}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between text-sm">
            <span className="text-muted">Showing {filtered.length} of {total}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
              >
                ← Prev
              </button>
              <span className="px-3 py-1 text-navy font-medium">{page} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || loading}
                className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-xl font-bold text-navy">{selected.name}</h3>
              <button onClick={() => setSelected(null)} className="text-muted hover:text-navy">✕</button>
            </div>
            <div className="space-y-3 text-sm">
              {[
                ['Category',   selected.category],
                ['Quantity',   `${selected.quantity} ${selected.unit}`],
                ['Status',     statusLabel(selected.status)],
                ['Storage',    selected.storage],
                ['Prep Time',  selected.prep_time  ? new Date(selected.prep_time).toLocaleString()  : '—'],
                ['Expiry',     selected.expiry_time ? new Date(selected.expiry_time).toLocaleString() : '—'],
                ['Deadline',   selected.collection_deadline ? new Date(selected.collection_deadline).toLocaleString() : '—'],
                ['Notes',      selected.notes || '—'],
                ['Matched NGO', selected.matched_ngo_name || '—'],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-muted font-medium">{label}</span>
                  <span className="text-navy font-semibold text-right max-w-xs">{val}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 flex gap-3">
              {selected.status === 'available' && (
                <button
                  onClick={() => { setSelected(null); handleRescue(selected); }}
                  className="flex-1 bg-brand-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-brand-900 transition-colors flex items-center justify-center gap-2"
                >
                  <Bot size={16} /> Smart Rescue
                </button>
              )}
              <button
                onClick={() => setSelected(null)}
                className="flex-1 bg-gray-100 text-navy py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyDonations;
