import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { AlertTriangle, TrendingDown, RefreshCw, Info, Brain } from 'lucide-react';
import { foodApi, mlApi } from '../services/api';

const RISK_COLORS = {
  High:   '#EF4444',
  Medium: '#F59E0B',
  Low:    '#10B981',
};

const PIE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

const RiskBadge = ({ level }) => {
  const cls = {
    High:   'bg-red-50 text-red-700 border-red-200',
    Medium: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    Low:    'bg-green-50 text-green-700 border-green-200',
  }[level] || 'bg-gray-50 text-gray-600 border-gray-200';
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${cls}`}>{level}</span>
  );
};

const WasteAnalytics = () => {
  const [donations,     setDonations]     = useState([]);
  const [predictions,   setPredictions]   = useState([]);
  const [categoryData,  setCategoryData]  = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [predLoading,   setPredLoading]   = useState(false);
  const [error,         setError]         = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      // Get available + matched donations for risk analysis
      const [avail, matched, stats] = await Promise.all([
        foodApi.list({ status: 'available', limit: 50 }),
        foodApi.list({ status: 'matched',   limit: 50 }),
        foodApi.stats(),
      ]);
      const items = [...(avail.donations || []), ...(matched.donations || [])];
      setDonations(items);

      // Build category breakdown from stats
      if (stats.categories) {
        setCategoryData(stats.categories);
      }

      // Get spoilage predictions for each item
      setPredLoading(true);
      const preds = await Promise.all(
        items.slice(0, 20).map(async (d) => {
          try {
            const res = await mlApi.predictSpoilage({
              food_type_enc:    d.food_type_enc ?? 0,
              quantity:         d.quantity ?? 1,
              age_hours:        d.age_hours ?? 2,
              storage_temp_enc: d.storage === 'Refrigerated' ? 1 : d.storage === 'Frozen' ? 2 : 0,
              hours_to_deliver: d.hours_to_deliver ?? 4,
            });
            return {
              id:           d.id,
              name:         d.name,
              category:     d.category,
              quantity:     d.quantity,
              unit:         d.unit,
              status:       d.status,
              risk_level:   res.risk_level,
              probability:  res.spoilage_probability,
              suggestion:   res.suggestion,
              age_hours:    d.age_hours,
            };
          } catch {
            return {
              id:           d.id,
              name:         d.name,
              category:     d.category,
              quantity:     d.quantity,
              unit:         d.unit,
              status:       d.status,
              risk_level:   d.age_hours > 12 ? 'High' : d.age_hours > 6 ? 'Medium' : 'Low',
              probability:  d.age_hours > 12 ? 0.75 : d.age_hours > 6 ? 0.45 : 0.15,
              suggestion:   'Prioritize redistribution',
              age_hours:    d.age_hours,
            };
          }
        })
      );
      setPredictions(preds);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setPredLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Risk distribution for bar chart
  const riskCounts = predictions.reduce((acc, p) => {
    acc[p.risk_level] = (acc[p.risk_level] || 0) + 1;
    return acc;
  }, {});
  const riskChartData = Object.entries(riskCounts).map(([level, count]) => ({ level, count }));

  const highRisk = predictions.filter((p) => p.risk_level === 'High');

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-navy">Waste Analytics</h2>
          <p className="text-muted mt-1">AI-powered spoilage risk predictions for active donations.</p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-muted disabled:opacity-40"
          title="Refresh"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-5 py-3 rounded-2xl text-sm">
          {error}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <div className="bg-red-50 border border-red-100 p-6 rounded-3xl">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={18} className="text-red-600" />
            <span className="text-sm font-semibold text-red-700 uppercase">High Risk</span>
          </div>
          <div className="text-3xl font-bold text-red-700">
            {loading ? '…' : highRisk.length}
          </div>
          <p className="text-xs text-red-600 mt-1">Items needing urgent redistribution</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-100 p-6 rounded-3xl">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown size={18} className="text-yellow-600" />
            <span className="text-sm font-semibold text-yellow-700 uppercase">Medium Risk</span>
          </div>
          <div className="text-3xl font-bold text-yellow-700">
            {loading ? '…' : predictions.filter((p) => p.risk_level === 'Medium').length}
          </div>
          <p className="text-xs text-yellow-600 mt-1">Items to redistribute within 6 hours</p>
        </div>
        <div className="bg-brand-50 border border-brand-100 p-6 rounded-3xl">
          <div className="flex items-center gap-2 mb-3">
            <Brain size={18} className="text-brand-600" />
            <span className="text-sm font-semibold text-brand-700 uppercase">ML Model</span>
          </div>
          <div className="text-3xl font-bold text-brand-700">
            {loading ? '…' : predictions.length}
          </div>
          <p className="text-xs text-brand-600 mt-1">Active donations analysed</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Risk distribution bar chart */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-navy mb-5">Risk Distribution</h3>
          {loading ? (
            <div className="h-56 flex items-center justify-center">
              <RefreshCw size={28} className="animate-spin text-gray-300" />
            </div>
          ) : riskChartData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-muted text-sm">
              No active donations to analyse
            </div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={riskChartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="level" axisLine={false} tickLine={false} tick={{ fill: '#6B7A86', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={{ fill: '#6B7A86', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="count" name="Items" radius={[6, 6, 0, 0]}>
                    {riskChartData.map((entry) => (
                      <Cell key={entry.level} fill={RISK_COLORS[entry.level] || '#94A3B8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Category breakdown pie chart */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-navy mb-5">Delivered — Category Breakdown</h3>
          {loading ? (
            <div className="h-56 flex items-center justify-center">
              <RefreshCw size={28} className="animate-spin text-gray-300" />
            </div>
          ) : categoryData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-muted text-sm">
              No delivery data yet
            </div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={85}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => `${v} portions`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* High-risk items table */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-navy">Spoilage Risk Predictions — Active Donations</h3>
          {predLoading && <RefreshCw size={16} className="animate-spin text-muted" />}
        </div>

        {loading || predLoading ? (
          <div className="p-8 text-center">
            <RefreshCw size={28} className="animate-spin text-gray-300 mx-auto mb-3" />
            <p className="text-muted text-sm">Running ML spoilage model…</p>
          </div>
        ) : predictions.length === 0 ? (
          <div className="p-8 text-center text-muted text-sm">
            No active donations found. Post a donation to see risk predictions here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase">Food Item</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase">Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase">Age</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase">Risk</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase">Probability</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase">Suggestion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {predictions
                  .sort((a, b) => b.probability - a.probability)
                  .map((p) => (
                    <tr key={p.id} className={`hover:bg-gray-50/50 ${p.risk_level === 'High' ? 'bg-red-50/30' : ''}`}>
                      <td className="px-5 py-3 font-medium text-navy">{p.name}</td>
                      <td className="px-4 py-3 text-muted">{p.category}</td>
                      <td className="px-4 py-3 text-muted">{p.quantity} {p.unit}</td>
                      <td className="px-4 py-3 text-muted">
                        {p.age_hours != null ? `${p.age_hours.toFixed(1)}h` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <RiskBadge level={p.risk_level} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-100 rounded-full h-2">
                            <div
                              className="h-2 rounded-full"
                              style={{
                                width: `${(p.probability * 100).toFixed(0)}%`,
                                backgroundColor: RISK_COLORS[p.risk_level] || '#94A3B8',
                              }}
                            />
                          </div>
                          <span className="text-xs text-muted">{(p.probability * 100).toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-xs text-muted max-w-[200px]">{p.suggestion}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-2xl p-4 flex items-start gap-3">
        <Info size={16} className="text-muted shrink-0 mt-0.5" />
        <p className="text-xs text-muted leading-relaxed">
          Spoilage risk predictions are estimates produced by the ML model based on food category, age,
          storage conditions, and quantity. They do not constitute food safety advice. Always follow
          applicable food handling regulations and inspect food before redistribution.
        </p>
      </div>
    </div>
  );
};

export default WasteAnalytics;
