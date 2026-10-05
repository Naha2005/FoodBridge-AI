import React, { useState, useEffect } from 'react';
import {
  Clock, CheckCircle, Truck, Package, XCircle,
  RefreshCw, ChevronDown, ChevronUp, MapPin, Filter,
} from 'lucide-react';
import { foodApi, statusBadge, statusLabel, relativeTime } from '../services/api';

const STATUS_STEPS = [
  { key: 'available',  label: 'Available',    icon: Package },
  { key: 'matched',    label: 'Matched',      icon: Clock   },
  { key: 'accepted',   label: 'Accepted',     icon: CheckCircle },
  { key: 'scheduled',  label: 'Scheduled',    icon: Clock   },
  { key: 'picked_up',  label: 'Picked Up',    icon: Truck   },
  { key: 'delivered',  label: 'Delivered',    icon: CheckCircle },
];

const StatusTimeline = ({ status }) => {
  const activeIdx = STATUS_STEPS.findIndex((s) => s.key === status);
  if (status === 'cancelled' || status === 'expired') return null;
  return (
    <div className="flex items-center gap-0 mt-3">
      {STATUS_STEPS.map((step, i) => {
        const Icon = step.icon;
        const done    = i < activeIdx;
        const current = i === activeIdx;
        return (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center" style={{ minWidth: 52 }}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                done    ? 'bg-brand-600 text-white' :
                current ? 'bg-brand-100 text-brand-700 ring-2 ring-brand-600' :
                          'bg-gray-100 text-gray-400'
              }`}>
                <Icon size={12} />
              </div>
              <span className={`text-[10px] mt-1 leading-tight text-center ${current ? 'text-brand-700 font-semibold' : 'text-muted'}`}>
                {step.label}
              </span>
            </div>
            {i < STATUS_STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mb-4 ${done ? 'bg-brand-600' : 'bg-gray-200'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

const DonationTracking = () => {
  const [donations, setDonations] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [filter,    setFilter]    = useState('all');
  const [expanded,  setExpanded]  = useState(null);
  const [page,      setPage]      = useState(1);
  const [total,     setTotal]     = useState(0);

  const LIMIT = 15;

  const load = async (pg = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = { limit: LIMIT, page: pg };
      if (filter !== 'all') params.status = filter;
      const res = await foodApi.list(params);
      setDonations(res.donations || []);
      setTotal(res.total || 0);
      setPage(pg);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(1); }, [filter]);

  const pages = Math.ceil(total / LIMIT);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-navy">Donation Tracking</h2>
          <p className="text-muted mt-1">Follow the journey of every food donation through the platform.</p>
        </div>
        <button
          onClick={() => load(page)}
          disabled={loading}
          className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-muted disabled:opacity-40"
          title="Refresh"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-5 py-3 rounded-2xl text-sm">{error}</div>
      )}

      {/* Status filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <div className="flex items-center gap-1.5 text-sm text-muted mr-1">
          <Filter size={14} /> Filter:
        </div>
        {[
          { id: 'all',       label: 'All' },
          { id: 'available', label: 'Available' },
          { id: 'matched',   label: 'Matched' },
          { id: 'accepted',  label: 'Accepted' },
          { id: 'picked_up', label: 'In Transit' },
          { id: 'delivered', label: 'Delivered' },
          { id: 'cancelled', label: 'Cancelled' },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              filter === id
                ? 'bg-brand-600 text-white'
                : 'bg-white border border-gray-200 text-navy hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Donations */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
              <div className="h-5 bg-gray-100 rounded w-48 mb-3" />
              <div className="h-3 bg-gray-100 rounded w-72" />
            </div>
          ))}
        </div>
      ) : donations.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 p-16 text-center">
          <Package size={40} className="text-gray-300 mx-auto mb-4" />
          <p className="text-navy font-semibold">No donations found</p>
          <p className="text-muted text-sm mt-1">
            {filter === 'all' ? 'No donations on the platform yet.' : `No donations with "${filter}" status.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {donations.map((d) => {
            const isOpen = expanded === d.id;
            return (
              <div key={d.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Row */}
                <div
                  className="flex items-start gap-4 p-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
                  onClick={() => setExpanded(isOpen ? null : d.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-bold text-navy">{d.name}</h3>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${statusBadge(d.status)}`}>
                        {statusLabel(d.status)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted">
                      <span>{d.category}</span>
                      <span>·</span>
                      <span>{d.quantity} {d.unit}</span>
                      {d.matched_ngo_name && (
                        <>
                          <span>·</span>
                          <span>NGO: {d.matched_ngo_name}</span>
                        </>
                      )}
                      <span>·</span>
                      <span>{relativeTime(d.created_at)}</span>
                    </div>
                  </div>
                  <div className="shrink-0 text-muted">
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="border-t border-gray-100 px-4 pb-5 pt-4">
                    {/* Timeline */}
                    {d.status !== 'cancelled' && d.status !== 'expired' && (
                      <div className="mb-4 overflow-x-auto">
                        <StatusTimeline status={d.status} />
                      </div>
                    )}

                    {d.status === 'cancelled' && (
                      <div className="flex items-center gap-2 text-red-600 text-sm mb-4">
                        <XCircle size={16} /> Donation was cancelled
                      </div>
                    )}

                    {/* Details grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <div className="text-muted mb-0.5">Donor</div>
                        <div className="text-navy font-medium">{d.donor_name || '—'}</div>
                      </div>
                      <div>
                        <div className="text-muted mb-0.5">Storage</div>
                        <div className="text-navy font-medium">{d.storage || '—'}</div>
                      </div>
                      {d.address && (
                        <div className="col-span-2 sm:col-span-1">
                          <div className="text-muted mb-0.5 flex items-center gap-1">
                            <MapPin size={11} /> Pickup location
                          </div>
                          <div className="text-navy font-medium truncate">{d.address}</div>
                        </div>
                      )}
                      {d.expiry_time && (
                        <div>
                          <div className="text-muted mb-0.5">Expiry</div>
                          <div className="text-navy font-medium">
                            {new Date(d.expiry_time).toLocaleString([], {
                              month: 'short', day: 'numeric',
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </div>
                        </div>
                      )}
                      {d.accepted_at && (
                        <div>
                          <div className="text-muted mb-0.5">Accepted</div>
                          <div className="text-navy font-medium">{relativeTime(d.accepted_at)}</div>
                        </div>
                      )}
                      {d.picked_up_at && (
                        <div>
                          <div className="text-muted mb-0.5">Picked up</div>
                          <div className="text-navy font-medium">{relativeTime(d.picked_up_at)}</div>
                        </div>
                      )}
                      {d.delivered_at && (
                        <div>
                          <div className="text-muted mb-0.5">Delivered</div>
                          <div className="text-navy font-medium">{relativeTime(d.delivered_at)}</div>
                        </div>
                      )}
                    </div>
                    {d.notes && (
                      <div className="mt-3 text-xs text-muted bg-gray-50 rounded-xl p-3">
                        <span className="font-medium">Notes:</span> {d.notes}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => load(page - 1)}
            disabled={page <= 1 || loading}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-navy hover:bg-gray-50 disabled:opacity-40"
          >
            ← Prev
          </button>
          <span className="px-4 py-2 text-sm text-muted">
            Page {page} of {pages} · {total} total
          </span>
          <button
            onClick={() => load(page + 1)}
            disabled={page >= pages || loading}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-navy hover:bg-gray-50 disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
};

export default DonationTracking;
