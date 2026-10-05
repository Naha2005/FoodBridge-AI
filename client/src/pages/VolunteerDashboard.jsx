import React, { useState, useEffect } from 'react';
import { Truck, CheckCircle, Clock, MapPin, RefreshCw, Package, ChevronRight } from 'lucide-react';
import { foodApi, statusBadge, statusLabel, relativeTime } from '../services/api';

const StatCard = ({ icon: Icon, label, value, color = 'brand' }) => (
  <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-${color}-100`}>
      <Icon size={20} className={`text-${color}-600`} />
    </div>
    <div className="text-2xl font-bold text-navy">{value ?? '—'}</div>
    <div className="text-sm text-muted mt-1">{label}</div>
  </div>
);

const VolunteerDashboard = () => {
  const [tasks,   setTasks]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [toast,   setToast]   = useState('');
  const [filter,  setFilter]  = useState('all');
  const [acting,  setActing]  = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      // Volunteers see all accepted/scheduled/picked_up donations
      const [acc, sched, pick] = await Promise.all([
        foodApi.list({ status: 'accepted',   limit: 50 }),
        foodApi.list({ status: 'scheduled',  limit: 50 }),
        foodApi.list({ status: 'picked_up',  limit: 50 }),
      ]);
      const all = [
        ...(acc.donations   || []),
        ...(sched.donations || []),
        ...(pick.donations  || []),
      ];
      setTasks(all);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handlePickup = async (id) => {
    if (!window.confirm('Mark this donation as picked up?')) return;
    setActing(id);
    try {
      await foodApi.pickup(id);
      showToast('✓ Marked as picked up');
      load();
    } catch (err) {
      showToast(`Error: ${err.message}`);
    } finally {
      setActing('');
    }
  };

  const handleDeliver = async (id) => {
    if (!window.confirm('Mark this donation as delivered?')) return;
    setActing(id);
    try {
      await foodApi.deliver(id);
      showToast('✓ Marked as delivered');
      load();
    } catch (err) {
      showToast(`Error: ${err.message}`);
    } finally {
      setActing('');
    }
  };

  const filtered = filter === 'all' ? tasks : tasks.filter((t) => t.status === filter);

  const stats = {
    accepted:  tasks.filter((t) => t.status === 'accepted').length,
    scheduled: tasks.filter((t) => t.status === 'scheduled').length,
    picked_up: tasks.filter((t) => t.status === 'picked_up').length,
  };

  return (
    <div className="max-w-5xl mx-auto">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-brand-600 text-white px-5 py-3 rounded-2xl shadow-lg text-sm font-medium">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-navy">Volunteer Dashboard</h2>
          <p className="text-muted mt-1">Pickup and delivery tasks available in your area.</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-muted disabled:opacity-40"
          title="Refresh"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <StatCard icon={Clock}       label="Awaiting Pickup"    value={stats.accepted}  color="orange" />
        <StatCard icon={Truck}       label="Scheduled"          value={stats.scheduled} color="blue"   />
        <StatCard icon={Package}     label="In Transit"         value={stats.picked_up} color="purple" />
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-5 py-3 rounded-2xl text-sm">
          {error}
        </div>
      )}

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2 mb-5">
        {[
          { id: 'all',       label: 'All Tasks' },
          { id: 'accepted',  label: 'Awaiting Pickup' },
          { id: 'scheduled', label: 'Scheduled' },
          { id: 'picked_up', label: 'In Transit' },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === id
                ? 'bg-brand-600 text-white'
                : 'bg-white border border-gray-200 text-navy hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Task list */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
              <div className="h-5 bg-gray-100 rounded w-48 mb-3" />
              <div className="h-4 bg-gray-100 rounded w-72" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 p-16 text-center">
          <Truck size={40} className="text-gray-300 mx-auto mb-4" />
          <p className="text-navy font-semibold">No tasks found</p>
          <p className="text-muted text-sm mt-1">
            {filter === 'all'
              ? 'No donations are currently awaiting volunteer pickup.'
              : `No donations in "${filter.replace('_', ' ')}" status.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((task) => (
            <div
              key={task.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col sm:flex-row gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-bold text-navy text-lg leading-tight">{task.name}</h3>
                  <span className={`text-xs px-2.5 py-1 rounded-full border font-medium shrink-0 ${statusBadge(task.status)}`}>
                    {statusLabel(task.status)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                  <span className="flex items-center gap-1">
                    <Package size={13} /> {task.quantity} {task.unit} · {task.category}
                  </span>
                  {task.address && (
                    <span className="flex items-center gap-1">
                      <MapPin size={13} /> {task.address}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock size={13} /> {relativeTime(task.created_at)}
                  </span>
                </div>
                {task.matched_ngo_name && (
                  <p className="text-xs text-brand-700 mt-2 font-medium">
                    → Recipient: {task.matched_ngo_name}
                  </p>
                )}
                {task.donor_name && (
                  <p className="text-xs text-muted mt-0.5">Donor: {task.donor_name}</p>
                )}
              </div>

              <div className="flex sm:flex-col gap-2 items-start sm:items-end justify-start shrink-0">
                {task.status === 'accepted' || task.status === 'scheduled' ? (
                  <button
                    onClick={() => handlePickup(task.id)}
                    disabled={acting === task.id}
                    className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
                  >
                    {acting === task.id ? <RefreshCw size={13} className="animate-spin" /> : <Truck size={13} />}
                    Mark Picked Up
                  </button>
                ) : task.status === 'picked_up' ? (
                  <button
                    onClick={() => handleDeliver(task.id)}
                    disabled={acting === task.id}
                    className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-900 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
                  >
                    {acting === task.id ? <RefreshCw size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                    Mark Delivered
                  </button>
                ) : (
                  <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
                    <CheckCircle size={13} /> Delivered
                  </span>
                )}
                <button
                  onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(task.address || '')}`, '_blank')}
                  className="flex items-center gap-1 text-xs text-muted hover:text-brand-600 transition-colors"
                >
                  <MapPin size={12} /> Directions <ChevronRight size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VolunteerDashboard;
