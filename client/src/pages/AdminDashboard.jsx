import React, { useState, useEffect } from 'react';
import {
  Users, Package, CheckCircle, XCircle, AlertTriangle,
  RefreshCw, Shield, Ban, Eye, BarChart2,
} from 'lucide-react';
import { statusBadge, statusLabel, relativeTime } from '../services/api';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const getToken = () => localStorage.getItem('fb_token');

async function adminFetch(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
  return body;
}

const StatCard = ({ icon: Icon, label, value, color = 'brand' }) => (
  <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 bg-${color}-100`}>
      <Icon size={18} className={`text-${color}-600`} />
    </div>
    <div className="text-2xl font-bold text-navy">{value ?? '—'}</div>
    <div className="text-xs text-muted mt-0.5">{label}</div>
  </div>
);

const RoleBadge = ({ role }) => {
  const cls = {
    admin:     'bg-purple-50 text-purple-700 border-purple-200',
    donor:     'bg-blue-50 text-blue-700 border-blue-200',
    ngo:       'bg-green-50 text-green-700 border-green-200',
    volunteer: 'bg-orange-50 text-orange-700 border-orange-200',
  }[role] || 'bg-gray-50 text-gray-600 border-gray-200';
  return (
    <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium capitalize ${cls}`}>{role}</span>
  );
};

const AdminDashboard = () => {
  const [tab,      setTab]      = useState('users');
  const [users,    setUsers]    = useState([]);
  const [donations,setDonations]= useState([]);
  const [stats,    setStats]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [toast,    setToast]    = useState('');
  const [acting,   setActing]   = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const loadStats = async () => {
    try {
      const s = await adminFetch('/api/admin/stats');
      setStats(s);
    } catch {}
  };

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminFetch('/api/admin/users');
      setUsers(res.users || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadDonations = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminFetch('/api/admin/donations?limit=50');
      setDonations(res.donations || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    if (tab === 'users')     loadUsers();
    if (tab === 'donations') loadDonations();
  }, [tab]);

  const handleRoleChange = async (userId, newRole) => {
    if (!window.confirm(`Change this user's role to "${newRole}"?`)) return;
    setActing(userId);
    try {
      await adminFetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role: newRole }),
      });
      showToast(`Role updated to ${newRole}`);
      loadUsers();
    } catch (err) {
      showToast(`Error: ${err.message}`);
    } finally {
      setActing('');
    }
  };

  const handleVerifyNGO = async (userId, verified) => {
    setActing(userId);
    try {
      await adminFetch(`/api/admin/users/${userId}/verify`, {
        method: 'PUT',
        body: JSON.stringify({ verified }),
      });
      showToast(verified ? '✓ NGO verified' : 'NGO unverified');
      loadUsers();
    } catch (err) {
      showToast(`Error: ${err.message}`);
    } finally {
      setActing('');
    }
  };

  const handleCancelDonation = async (id) => {
    if (!window.confirm('Cancel this donation?')) return;
    setActing(id);
    try {
      await adminFetch(`/api/food/${id}`, { method: 'DELETE' });
      showToast('Donation cancelled');
      loadDonations();
    } catch (err) {
      showToast(`Error: ${err.message}`);
    } finally {
      setActing('');
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-brand-600 text-white px-5 py-3 rounded-2xl shadow-lg text-sm font-medium">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-navy">Admin Dashboard</h2>
          <p className="text-muted mt-1">Platform management, user verification, and donation moderation.</p>
        </div>
        <button
          onClick={() => { loadStats(); tab === 'users' ? loadUsers() : loadDonations(); }}
          disabled={loading}
          className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-muted disabled:opacity-40"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard icon={Users}    label="Total Users"        value={stats.total_users}      color="blue"   />
          <StatCard icon={Package}  label="Total Donations"    value={stats.total_donations}  color="brand"  />
          <StatCard icon={CheckCircle} label="Delivered"       value={stats.delivered}        color="green"  />
          <StatCard icon={BarChart2}   label="Portions Saved"  value={stats.delivered_qty ? Math.round(stats.delivered_qty) : 0} color="purple" />
        </div>
      )}

      {error && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 px-5 py-3 rounded-2xl text-sm flex items-center gap-2">
          <AlertTriangle size={15} /> {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { id: 'users',     label: '👥 Users' },
          { id: 'donations', label: '📦 Donations' },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
              tab === id
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-navy hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Users Tab ── */}
      {tab === 'users' && (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-bold text-navy">Registered Users ({users.length})</h3>
          </div>
          {loading ? (
            <div className="p-8 text-center">
              <RefreshCw size={24} className="animate-spin text-gray-300 mx-auto" />
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-muted text-sm">No users found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase">Joined</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50/50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                            {(u.name || '?').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-navy">{u.name}</div>
                            {u.org_name && <div className="text-xs text-muted">{u.org_name}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted">{u.email}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <RoleBadge role={u.role} />
                          {u.role === 'ngo' && (
                            u.verified
                              ? <span className="text-xs text-green-600 flex items-center gap-0.5"><Shield size={11} /> Verified</span>
                              : <span className="text-xs text-orange-500">Unverified</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted text-xs">{relativeTime(u.created_at)}</td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1">
                          {u.role === 'ngo' && !u.verified && (
                            <button
                              onClick={() => handleVerifyNGO(u.id, true)}
                              disabled={acting === u.id}
                              className="flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
                            >
                              <Shield size={11} /> Verify NGO
                            </button>
                          )}
                          {u.role === 'ngo' && u.verified && (
                            <button
                              onClick={() => handleVerifyNGO(u.id, false)}
                              disabled={acting === u.id}
                              className="flex items-center gap-1 text-xs bg-gray-50 text-gray-600 border border-gray-200 px-2.5 py-1 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                            >
                              <Ban size={11} /> Unverify
                            </button>
                          )}
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            disabled={acting === u.id}
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-navy disabled:opacity-50"
                          >
                            <option value="donor">Donor</option>
                            <option value="ngo">NGO</option>
                            <option value="volunteer">Volunteer</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Donations Tab ── */}
      {tab === 'donations' && (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-bold text-navy">All Donations ({donations.length})</h3>
          </div>
          {loading ? (
            <div className="p-8 text-center">
              <RefreshCw size={24} className="animate-spin text-gray-300 mx-auto" />
            </div>
          ) : donations.length === 0 ? (
            <div className="p-8 text-center text-muted text-sm">No donations found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase">Food</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase">Donor</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase">Qty</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase">Created</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {donations.map((d) => (
                    <tr key={d.id} className="hover:bg-gray-50/50">
                      <td className="px-5 py-3">
                        <div className="font-medium text-navy">{d.name}</div>
                        <div className="text-xs text-muted">{d.category}</div>
                      </td>
                      <td className="px-4 py-3 text-muted">{d.donor_name || '—'}</td>
                      <td className="px-4 py-3 text-muted">{d.quantity} {d.unit}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${statusBadge(d.status)}`}>
                          {statusLabel(d.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted text-xs">{relativeTime(d.created_at)}</td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1">
                          <a
                            href={`/api/food/${d.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-muted border border-gray-200 px-2.5 py-1 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <Eye size={11} /> View
                          </a>
                          {d.status !== 'cancelled' && d.status !== 'delivered' && (
                            <button
                              onClick={() => handleCancelDonation(d.id)}
                              disabled={acting === d.id}
                              className="flex items-center gap-1 text-xs bg-red-50 text-red-600 border border-red-200 px-2.5 py-1 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                            >
                              {acting === d.id ? <RefreshCw size={11} className="animate-spin" /> : <XCircle size={11} />}
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
