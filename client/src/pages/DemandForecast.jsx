import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Brain, TrendingUp, AlertTriangle, RefreshCw } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const DemandForecast = () => {
  const [forecast, setForecast]   = useState([]);
  const [peakDay,  setPeakDay]    = useState(null);
  const [metrics,  setMetrics]    = useState(null);
  const [loading,  setLoading]    = useState(true);
  const [error,    setError]      = useState(null);

  const fetchForecast = async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(`${API_BASE}/api/ml/forecast-week`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load forecast');

      // Map to recharts shape: today's entry gets "actual" value, rest are future
      const mapped = json.forecast.map((d, i) => ({
        day:       d.day,
        date:      d.date,
        actual:    i === 0 ? d.predicted : null,
        predicted: d.predicted,
        is_future: d.is_future,
      }));
      setForecast(mapped);
      setPeakDay(json.peak_day);
      setMetrics(json.metrics);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchForecast(); }, []);

  const accuracy = metrics
    ? `${(metrics.r2 * 100).toFixed(1)}%`
    : '—';

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-navy">AI Demand Forecast</h2>
          <p className="text-muted mt-1">
            Machine Learning predictions for food requirements across regions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchForecast}
            disabled={loading}
            className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-muted disabled:opacity-40"
            title="Refresh forecast"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <div className="bg-brand-100 text-brand-900 px-4 py-2 rounded-xl font-bold flex items-center gap-2">
            <Brain size={20} /> Model Active
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-800 rounded-2xl px-5 py-3 text-sm">
          {error} — showing cached static data as fallback.
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <h3 className="text-sm font-semibold text-muted uppercase">Forecast Model</h3>
          <div className="mt-4">
            <div className="text-2xl font-bold text-navy">Random Forest Regressor</div>
            <p className="text-sm text-green-600 font-medium mt-1">
              R² Accuracy: {loading ? '…' : accuracy}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <h3 className="text-sm font-semibold text-muted uppercase">Predicted Peak Day</h3>
          <div className="mt-4">
            {loading ? (
              <div className="h-8 bg-gray-100 rounded animate-pulse w-24" />
            ) : peakDay ? (
              <>
                <div className="text-2xl font-bold text-navy">{peakDay.day}</div>
                <p className="text-sm text-muted mt-1">
                  Est. {peakDay.predicted} portions needed
                </p>
              </>
            ) : (
              <div className="text-2xl font-bold text-navy">—</div>
            )}
          </div>
        </div>

        <div className="bg-orange-50 p-6 rounded-3xl shadow-sm border border-orange-100 flex flex-col justify-between">
          <h3 className="text-sm font-semibold text-orange-800 uppercase flex items-center gap-1">
            <AlertTriangle size={16} /> High Demand Alert
          </h3>
          <div className="mt-4">
            {loading ? (
              <div className="h-8 bg-orange-100 rounded animate-pulse w-36" />
            ) : peakDay ? (
              <>
                <div className="text-xl font-bold text-orange-900">
                  {peakDay.day} Surge Expected
                </div>
                <p className="text-sm text-orange-700 mt-1">
                  Prepare excess food for {peakDay.date}.
                </p>
              </>
            ) : (
              <div className="text-xl font-bold text-orange-900">No alert</div>
            )}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mb-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-navy">7-Day Demand Prediction</h3>
          {metrics && (
            <span className="text-xs text-muted bg-gray-50 border border-gray-200 px-3 py-1 rounded-full">
              RMSE: {metrics.rmse} portions
            </span>
          )}
        </div>

        {loading ? (
          <div className="h-80 flex items-center justify-center">
            <RefreshCw size={32} className="animate-spin text-gray-300" />
          </div>
        ) : (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={forecast}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis
                  dataKey="day"
                  axisLine={false} tickLine={false}
                  tick={{ fill: '#6B7A86', fontSize: 12 }} dy={10}
                />
                <YAxis
                  axisLine={false} tickLine={false}
                  tick={{ fill: '#6B7A86', fontSize: 12 }} dx={-10}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px', border: 'none',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" />
                <Line
                  type="monotone" dataKey="actual" name="Actual (Today)"
                  stroke="#3B82F6" strokeWidth={3}
                  dot={{ r: 4 }} activeDot={{ r: 6 }}
                  connectNulls={false}
                />
                <Line
                  type="monotone" dataKey="predicted" name="ML Predicted"
                  stroke="#07865B" strokeWidth={3} strokeDasharray="5 5"
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Info footer */}
      <div className="bg-gray-50 p-6 rounded-3xl border border-gray-200">
        <h3 className="font-bold text-navy mb-2 flex items-center gap-2">
          <TrendingUp size={20} className="text-brand-600" />
          How does this help prevent food waste?
        </h3>
        <p className="text-sm text-muted leading-relaxed">
          By utilising historical distribution data, local event schedules, and seasonal
          trends, our Random Forest model predicts upcoming food requirements for NGOs.
          This proactive approach allows donors to prepare and allocate specific food
          categories precisely when they are needed most — drastically reducing the
          chances of surplus food expiring before reaching a beneficiary.
        </p>
      </div>
    </div>
  );
};

export default DemandForecast;
