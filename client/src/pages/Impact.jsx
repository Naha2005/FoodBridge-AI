import React, { useEffect, useState } from 'react';
import { Heart, Users, Share2, Clock, RefreshCw } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { foodApi } from '../services/api';

const PIE_COLORS = ['#07865B', '#3B82F6', '#F59E0B', '#8B5CF6', '#EF4444', '#6B7A86', '#14B8A6'];

const Impact = () => {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await foodApi.stats();
      setStats(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const pieData = (stats?.categories || []).map((c, i) => ({
    name:  c.name,
    value: c.value,
    color: PIE_COLORS[i % PIE_COLORS.length],
  }));

  // Fallback skeleton while loading
  const S = ({ w = 'w-20', h = 'h-8' }) => (
    <div className={`${w} ${h} bg-gray-100 rounded animate-pulse`} />
  );

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-navy">Impact Dashboard</h2>
          <p className="text-muted mt-2">Actual food redistributed through FoodBridge AI — from real completed donations.</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-muted disabled:opacity-40"
          title="Refresh"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm">
          Could not load stats: {error}{' '}
          <button onClick={load} className="underline font-semibold">Retry</button>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        {[
          { icon: Heart,  label: 'Portions Delivered', val: stats?.delivered_qty,   color: 'text-brand-600' },
          { icon: Users,  label: 'NGOs Registered',    val: stats?.ngo_count,        color: 'text-blue-500'  },
          { icon: Share2, label: 'Total Donations',    val: stats?.total_donations,  color: 'text-purple-500' },
          { icon: Clock,  label: 'Completed',          val: stats?.delivered,        color: 'text-orange-500' },
        ].map(({ icon: Icon, label, val, color }) => (
          <div key={label} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between items-center text-center">
            <Icon className={`${color} mb-2`} size={32} />
            {loading ? <S /> : <div className="text-3xl font-bold text-navy">{val ?? 0}</div>}
            <div className="text-xs font-semibold text-muted uppercase mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Pie chart */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <h3 className="text-xl font-bold text-navy mb-4">Food Categories Delivered</h3>
          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <RefreshCw size={24} className="animate-spin text-gray-300" />
            </div>
          ) : pieData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted text-sm">
              No delivered donations yet. Data will appear once donations are completed.
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-1/2 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%" cy="50%"
                      innerRadius={55} outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => `${v} portions`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="w-1/2 space-y-2">
                {pieData.map((item) => {
                  const total = pieData.reduce((s, d) => s + d.value, 0);
                  return (
                    <li key={item.name} className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-navy">{item.name}</span>
                      </div>
                      <span className="font-semibold text-muted">
                        {total > 0 ? Math.round((item.value / total) * 100) : 0}%
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Bar chart — monthly trend */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <h3 className="text-xl font-bold text-navy mb-4">Monthly Activity (Last 6 Months)</h3>
          {loading ? (
            <div className="h-56 flex items-center justify-center">
              <RefreshCw size={24} className="animate-spin text-gray-300" />
            </div>
          ) : (stats?.monthly || []).length === 0 ? (
            <div className="h-56 flex items-center justify-center text-muted text-sm">
              No monthly data yet. Post and complete donations to see trends.
            </div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.monthly}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7A86', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7A86', fontSize: 12 }} dx={-10} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend />
                  <Bar dataKey="saved"  name="Delivered (portions)" fill="#07865B" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="wasted" name="Cancelled (portions)"  fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-100 p-5 rounded-2xl text-sm text-blue-800">
        <strong>Note:</strong> These statistics reflect only verified, completed donations recorded in the FoodBridge AI database.
        Cancelled or pending donations are not counted as impact. Statistics update in real time.
      </div>
    </div>
  );
};

export default Impact;
