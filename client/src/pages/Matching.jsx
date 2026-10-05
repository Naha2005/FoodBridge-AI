import React, { useEffect, useState } from 'react';
import { MapPin, RefreshCw, AlertTriangle } from 'lucide-react';
import { foodApi, agentApi } from '../services/api';

const Matching = () => {

  const [donations,  setDonations]  = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [matches,    setMatches]    = useState([]);
  const [agentRes,   setAgentRes]   = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [fetchLoad,  setFetchLoad]  = useState(true);
  const [error,      setError]      = useState('');
  const [approveLoad, setApprove]   = useState('');
  const [toast,      setToast]      = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  useEffect(() => {
    const loadDonations = async () => {
      try {
        const res = await foodApi.myDonations({ status: 'available', limit: 20 });
        const avail = (res.donations || []).filter((d) => d.status === 'available');
        setDonations(avail);
        if (avail.length > 0) setSelectedId(avail[0].id);
      } catch {}
      setFetchLoad(false);
    };
    loadDonations();
  }, []);

  const runMatching = async () => {
    if (!selectedId) return;
    setLoading(true);
    setError('');
    setMatches([]);
    setAgentRes(null);
    try {
      const res = await agentApi.rescue({ donation_id: selectedId });
      setAgentRes(res);
      setMatches(res.matches || []);
      if (!res.safe) {
        setError(`Safety issue: ${res.urgency_note}`);
      }
    } catch (err) {
      setError(err.message || 'Matching failed. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (ngoId, ngoName) => {
    if (!agentRes?.recommendation_id) return;
    if (!window.confirm(`Approve match with ${ngoName}?`)) return;
    setApprove(ngoId);
    try {
      const res = await agentApi.approveRescue({
        recommendation_id: agentRes.recommendation_id,
        ngo_id: ngoId,
      });
      showToast(`✓ ${res.message}`);
      setAgentRes(null);
      setMatches([]);
      // Reload donations
      const dr = await foodApi.myDonations({ status: 'available', limit: 20 });
      setDonations((dr.donations || []).filter((d) => d.status === 'available'));
    } catch (err) {
      showToast(`Error: ${err.message}`);
    } finally {
      setApprove('');
    }
  };

  const handleReject = async () => {
    if (!agentRes?.recommendation_id) return;
    try {
      await agentApi.rejectRescue({ recommendation_id: agentRes.recommendation_id, reason: 'User rejected' });
      showToast('Recommendation rejected. Donation remains available.');
      setAgentRes(null);
      setMatches([]);
    } catch (err) {
      showToast(`Error: ${err.message}`);
    }
  };

  const selectedDonation = donations.find((d) => d.id === selectedId);

  return (
    <div className="max-w-6xl mx-auto">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-brand-600 text-white px-5 py-3 rounded-2xl shadow-lg text-sm font-medium">
          {toast}
        </div>
      )}

      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-navy">Smart Rescue Matching</h2>
          <p className="text-muted mt-1">AI-powered NGO matching using ML models. You approve every action.</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mb-8">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[220px]">
            <label className="block text-sm font-medium text-navy mb-2">Select Your Donation</label>
            {fetchLoad ? (
              <div className="h-11 bg-gray-100 rounded-xl animate-pulse" />
            ) : (
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-brand-600 bg-white text-sm"
              >
                {donations.length === 0
                  ? <option value="">No available donations</option>
                  : donations.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} — {d.quantity} {d.unit} ({d.category})
                    </option>
                  ))
                }
              </select>
            )}
          </div>
          <button
            onClick={runMatching}
            disabled={loading || !selectedId || fetchLoad}
            className="flex items-center gap-2 bg-brand-900 text-white px-6 py-3 rounded-xl font-semibold hover:bg-brand-600 transition-colors disabled:opacity-50"
          >
            {loading ? <RefreshCw size={16} className="animate-spin" /> : '🤖'}
            {loading ? 'Running…' : 'Run Smart Matching'}
          </button>
        </div>

        {/* Selected donation info */}
        {selectedDonation && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-4 text-sm text-muted">
            <span><strong className="text-navy">Category:</strong> {selectedDonation.category}</span>
            <span><strong className="text-navy">Storage:</strong> {selectedDonation.storage}</span>
            {selectedDonation.expiry_time && (
              <span><strong className="text-navy">Expires:</strong> {new Date(selectedDonation.expiry_time).toLocaleString()}</span>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-sm flex items-center gap-2">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* Agent recommendation summary */}
      {agentRes && (
        <div className={`mb-6 p-5 rounded-2xl border text-sm ${
          agentRes.urgency === 'Critical' ? 'bg-red-50 border-red-200 text-red-800'
          : agentRes.urgency === 'High'   ? 'bg-orange-50 border-orange-200 text-orange-800'
          : 'bg-brand-50 border-brand-200 text-brand-900'
        }`}>
          <div className="flex items-start gap-3">
            <span className="text-2xl">🤖</span>
            <div>
              <div className="font-bold mb-1">Smart Rescue Agent Recommendation</div>
              <p className="leading-relaxed">{agentRes.recommendation}</p>
              {agentRes.spoilage && (
                <p className="mt-2 text-xs opacity-80">
                  Spoilage model ({agentRes.spoilage.model}): {agentRes.spoilage.risk_level} risk
                  ({(agentRes.spoilage.spoilage_probability * 100).toFixed(0)}% probability)
                </p>
              )}
              <p className="mt-2 text-xs opacity-60">{agentRes.disclaimer}</p>
            </div>
          </div>
          {agentRes.recommendation_id && (
            <div className="mt-4 flex gap-3">
              <button
                onClick={handleReject}
                className="px-4 py-2 border border-current rounded-xl text-xs font-semibold hover:bg-white/50 transition-colors"
              >
                ✕ Reject Recommendation
              </button>
            </div>
          )}
        </div>
      )}

      {/* Match cards */}
      {matches.length > 0 && (
        <div className="space-y-5">
          {matches.map((rec, i) => (
            <div key={rec.ngo_id || i} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-start md:items-center gap-5">
              <div className="flex-shrink-0 w-14 h-14 bg-brand-100 text-brand-600 rounded-2xl flex items-center justify-center text-2xl font-bold">
                {i + 1}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-navy">{rec.ngo_name}</h3>
                {rec.ngo_org && <p className="text-sm text-muted">{rec.ngo_org}</p>}
                <p className="text-muted text-sm flex items-center gap-1 mt-1">
                  <MapPin size={14} /> {rec.distance_km} km away
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full font-medium">
                    Needs: {rec.portions_needed} portions
                  </span>
                  <span className="text-xs bg-green-50 text-green-700 border border-green-100 px-2 py-0.5 rounded-full font-medium">
                    Prefers: {rec.preferred_category}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                    rec.urgency_label === 'Critical' ? 'bg-red-50 text-red-700 border-red-100'
                    : rec.urgency_label === 'High'   ? 'bg-orange-50 text-orange-700 border-orange-100'
                    : 'bg-gray-50 text-gray-600 border-gray-200'
                  }`}>
                    {rec.urgency_label} urgency
                  </span>
                  <span className="text-xs bg-gray-50 text-gray-600 border border-gray-200 px-2 py-0.5 rounded-full">
                    Score: {rec.score_source}
                  </span>
                </div>
              </div>

              <div className="hidden md:block border-l border-r px-5 min-w-[180px]">
                <h4 className="text-xs font-bold text-navy mb-2 uppercase tracking-wide">Why recommended?</h4>
                <ul className="text-xs text-muted space-y-1">
                  {rec.reasons.slice(0, 3).map((r, j) => (
                    <li key={j} className="flex items-start gap-1.5">
                      <span className="text-brand-600 mt-0.5">•</span> {r}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col items-center gap-3">
                <div className="text-3xl font-bold text-brand-600">{rec.score.toFixed(0)}</div>
                <div className="text-xs text-muted font-medium uppercase">/ 100</div>
                {agentRes?.recommendation_id ? (
                  <button
                    onClick={() => handleApprove(rec.ngo_id, rec.ngo_name)}
                    disabled={!!approveLoad}
                    className="bg-brand-600 text-white text-sm px-5 py-2 rounded-xl font-semibold hover:bg-brand-900 transition-colors disabled:opacity-50 whitespace-nowrap"
                  >
                    {approveLoad === rec.ngo_id ? 'Approving…' : '✓ Approve'}
                  </button>
                ) : (
                  <button
                    onClick={runMatching}
                    className="bg-gray-100 text-navy text-sm px-5 py-2 rounded-xl font-semibold hover:bg-gray-200 transition-colors whitespace-nowrap"
                  >
                    Re-run
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && matches.length === 0 && !error && agentRes && (
        <div className="text-center py-12 text-muted">
          <p className="text-lg font-medium">No eligible NGOs found.</p>
          <p className="text-sm mt-2">There may be no registered NGOs yet, or none in range.</p>
        </div>
      )}

      {!loading && !agentRes && donations.length === 0 && !fetchLoad && (
        <div className="text-center py-12 bg-white rounded-3xl border border-gray-100">
          <p className="text-lg font-medium text-navy">No available donations to match.</p>
          <p className="text-sm text-muted mt-2">Post a donation first, then come back here to run matching.</p>
        </div>
      )}
    </div>
  );
};

export default Matching;
