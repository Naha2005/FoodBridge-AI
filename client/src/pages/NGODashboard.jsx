import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { RefreshCw, Leaf, Target, Users, CheckCircle, PackageSearch, AlertCircle, ArrowRight, Globe, X, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { foodApi, needsApi, relativeTime, getUser } from '../services/api';

const StatCard = ({ icon: Icon, color, value, label, loading, delay }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5 }}
    className={`${color} p-6 rounded-[2rem] shadow-sm border flex flex-col justify-between h-36 relative overflow-hidden group`}
  >
    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform duration-500">
      <Icon size={80} />
    </div>
    {loading ? <div className="w-8 h-8 rounded-xl bg-white/40 animate-pulse relative z-10" /> : <Icon size={28} className="relative z-10" />}
    <div className="relative z-10">
      {loading
        ? <div className="h-8 w-16 bg-white/40 rounded-lg animate-pulse mb-1" />
        : <div className="text-3xl font-black tracking-tight">{value ?? '—'}</div>
      }
      <div className="text-xs font-bold uppercase mt-1 opacity-80 tracking-wider">{label}</div>
    </div>
  </motion.div>
);

const NGODashboard = () => {
  const navigate = useNavigate();
  const user = getUser();

  const [stats,      setStats]    = useState(null);
  const [incoming,   setIncoming] = useState([]);
  const [myNeeds,    setMyNeeds]  = useState([]);
  const [loading,    setLoading]  = useState(true);
  const [error,      setError]    = useState('');
  const [actionLoad, setAction]   = useState('');
  const [toast,      setToast]    = useState('');
  
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [dispatchSuccess, setDispatchSuccess] = useState(false);

  const handleDispatchSubmit = (e) => {
    e.preventDefault();
    setDispatchSuccess(true);
    setTimeout(() => {
      setShowDispatchModal(false);
      setDispatchSuccess(false);
    }, 2500);
  };

  const showToast = (msg, isErr) => {
    setToast({ msg, isErr });
    setTimeout(() => setToast(''), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, avail, needs] = await Promise.all([
        foodApi.ngoStats(),
        foodApi.list({ status: 'available', limit: 10 }),
        needsApi.myNeeds(),
      ]);
      setStats(statsRes);
      setIncoming(avail.donations || []);
      setMyNeeds(needs.needs || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user || user.role !== 'ngo') { navigate('/login'); return; }
    load();
  }, [load]);

  const handleAccept = async (donationId, donorName) => {
    if (!window.confirm(`Accept donation from ${donorName}?`)) return;
    setAction(donationId + '-accept');
    try {
      await foodApi.accept(donationId);
      showToast('Donation accepted!', false);
      load();
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setAction('');
    }
  };

  const handleCloseNeed = async (needId) => {
    if (!window.confirm('Close this need?')) return;
    try {
      await needsApi.delete(needId);
      showToast('Need closed.', false);
      load();
    } catch (err) {
      showToast(err.message, true);
    }
  };

  const firstName = user?.name?.split(' ')[0] || 'NGO';

  return (
    <div className="max-w-6xl mx-auto pb-12 space-y-8">
      {/* Toast */}
      {toast && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-2xl shadow-lg text-sm font-medium ${toast.isErr ? 'bg-red-600' : 'bg-brand-600'} text-white`}>
          {toast.msg}
        </motion.div>
      )}

      {/* Dynamic Header */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-emerald-900 rounded-[2.5rem] overflow-hidden p-10 shadow-2xl flex flex-col md:flex-row justify-between items-center md:items-end gap-6"
      >
        <div className="absolute inset-0 opacity-40 mix-blend-overlay">
          <img src="https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=1200&q=80" alt="NGO background" className="w-full h-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-emerald-900 via-emerald-900/90 to-transparent"></div>
        
        <div className="relative z-10 w-full">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold mb-4 backdrop-blur-md border border-emerald-500/30">
            <Target size={14} className="animate-pulse" /> NGO Dashboard Active
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-2 tracking-tight">Welcome, {firstName}!</h2>
          <p className="text-emerald-100 font-medium text-lg max-w-xl">Find available food donations and manage your active needs.</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="relative z-10 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-5 py-3 rounded-2xl font-bold transition-colors flex items-center gap-2 border border-white/20 shadow-xl"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> Refresh Data
        </button>
      </motion.div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-2xl text-sm font-medium flex items-center gap-3">
          <AlertCircle size={20}/> Could not load dashboard data: {error} 
          <button onClick={load} className="underline font-bold hover:text-red-900">Retry</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <StatCard delay={0.1} icon={Target}       label="Active Needs"   value={stats?.active_needs} color="bg-gradient-to-br from-emerald-100 to-green-50 border-emerald-200 text-emerald-800" />
        <StatCard delay={0.2} icon={CheckCircle}  label="Accepted"       value={stats?.accepted}     color="bg-gradient-to-br from-blue-100 to-sky-50 border-blue-200 text-blue-800" />
        <StatCard delay={0.3} icon={RefreshCw}    label="In Progress"    value={stats?.in_progress}  color="bg-gradient-to-br from-purple-100 to-fuchsia-50 border-purple-200 text-purple-800" />
        <StatCard delay={0.4} icon={PackageSearch} label="Delivered"     value={stats?.delivered}    color="bg-gradient-to-br from-orange-100 to-amber-50 border-orange-200 text-orange-800" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Available donations */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="text-2xl font-black text-slate-800">Available Donations</h3>
            <Link to="/matches" className="text-sm font-bold text-brand-600 hover:text-brand-800 transition-colors flex items-center gap-1">
              AI Match <ArrowRight size={16} />
            </Link>
          </div>
          <div className="overflow-x-auto p-4 flex-1">
            <table className="w-full text-left border-separate border-spacing-y-2">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Food Item</th>
                  <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Details</th>
                  <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="bg-slate-50 rounded-xl">
                      {Array.from({ length: 3 }).map((__, j) => (
                        <td key={j} className="px-4 py-4 rounded-xl">
                          <div className="h-4 bg-slate-200 rounded animate-pulse w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : incoming.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="py-12 text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full text-slate-400 mb-4">
                        <Leaf size={24} />
                      </div>
                      <div className="text-slate-500 font-medium mb-3">No available donations right now.</div>
                    </td>
                  </tr>
                ) : (
                  incoming.map((d) => (
                    <tr key={d.id} className="group">
                      <td className="px-4 py-4 bg-white border border-slate-100 rounded-l-2xl group-hover:border-brand-200 transition-colors shadow-sm group-hover:shadow-md">
                        <div className="font-bold text-slate-800">{d.name}</div>
                        <div className="text-xs font-medium text-slate-500 mt-1">{d.category}</div>
                      </td>
                      <td className="px-4 py-4 bg-white border-y border-slate-100 group-hover:border-brand-200 transition-colors shadow-sm group-hover:shadow-md">
                        <div className="text-sm font-bold text-brand-600">{d.quantity} {d.unit}</div>
                        <div className="text-xs text-slate-400 mt-1">Exp: {d.expiry_time ? relativeTime(d.expiry_time) : '—'}</div>
                      </td>
                      <td className="px-4 py-4 bg-white border-y border-r border-slate-100 rounded-r-2xl group-hover:border-brand-200 transition-colors shadow-sm group-hover:shadow-md text-right">
                        <button
                          onClick={() => handleAccept(d.id, d.donor_name || 'donor')}
                          disabled={!!actionLoad}
                          className="bg-brand-600 text-white text-xs px-4 py-2 rounded-xl font-bold hover:bg-brand-900 transition-colors shadow-sm disabled:opacity-50"
                        >
                          {actionLoad === d.id + '-accept' ? '...' : 'Accept'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SAMPLE DELIVERY TRACKING */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col mt-8 lg:col-span-1">
          <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-blue-50/50">
            <h3 className="text-2xl font-black text-slate-800">In-Progress Deliveries</h3>
            <span className="text-[10px] bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-bold uppercase tracking-wider">Sample Demo</span>
          </div>
          <div className="overflow-x-auto p-4 flex-1">
            <table className="w-full text-left border-separate border-spacing-y-2">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Food & Donor</th>
                  <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Track</th>
                </tr>
              </thead>
              <tbody>
                <tr className="group">
                  <td className="px-4 py-4 bg-white border border-slate-100 rounded-l-2xl border-l-4 border-l-blue-500 shadow-sm">
                    <div className="font-bold text-slate-800">Fresh Bread Batches</div>
                    <div className="text-xs font-medium text-slate-500 mt-1">From: Fresh Bakery</div>
                  </td>
                  <td className="px-4 py-4 bg-white border-y border-slate-100 shadow-sm">
                    <div className="flex flex-col gap-1">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold bg-purple-100 text-purple-700 w-fit">
                        <PackageSearch size={12} /> Picked Up
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">ETA: 15 mins • Vol: John</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 bg-white border-y border-r border-slate-100 rounded-r-2xl text-right shadow-sm">
                    <Link to="/map" className="bg-blue-600 text-white text-[10px] px-4 py-2 rounded-xl font-bold shadow-sm hover:bg-blue-700 transition-colors">
                      Live Map
                    </Link>
                  </td>
                </tr>
                <tr className="group">
                  <td className="px-4 py-4 bg-white border border-slate-100 rounded-l-2xl border-l-4 border-l-orange-500 shadow-sm">
                    <div className="font-bold text-slate-800">Cooked Pasta</div>
                    <div className="text-xs font-medium text-slate-500 mt-1">From: Grand Hotel</div>
                  </td>
                  <td className="px-4 py-4 bg-white border-y border-slate-100 shadow-sm">
                    <div className="flex flex-col gap-1">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold bg-green-100 text-green-700 w-fit">
                        <CheckCircle size={12} /> Accepted
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">Awaiting Volunteer</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 bg-white border-y border-r border-slate-100 rounded-r-2xl text-right shadow-sm">
                    <button disabled className="bg-slate-200 text-slate-500 text-[10px] px-4 py-2 rounded-xl font-bold shadow-sm opacity-50 cursor-not-allowed">
                      Pending
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        {/* END SAMPLE DELIVERY TRACKING */}

        <div className="flex flex-col gap-8">
          {/* My needs */}
          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden flex-1">
            <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-black text-slate-800">My Food Needs</h3>
              <Link to="/needs/new" className="text-sm bg-brand-100 text-brand-900 px-4 py-2 rounded-xl font-bold hover:bg-brand-600 hover:text-white transition-colors">
                + Add Need
              </Link>
            </div>
            <div className="overflow-x-auto p-4">
              <table className="w-full text-left border-separate border-spacing-y-2">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Need</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Urgency</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="3" className="px-4 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse w-full" /></td></tr>
                  ) : myNeeds.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="py-8 text-center text-slate-500 font-medium text-sm">
                        No active needs. Add one to get AI matches.
                      </td>
                    </tr>
                  ) : (
                    myNeeds.map((n) => (
                      <tr key={n.id} className="group">
                        <td className="px-4 py-4 bg-white border border-slate-100 rounded-l-2xl group-hover:border-brand-200 transition-colors shadow-sm group-hover:shadow-md">
                          <div className="font-bold text-slate-800 text-sm">{n.category}</div>
                          <div className="text-xs text-brand-600 font-bold mt-1">{n.portions_needed} pt.</div>
                        </td>
                        <td className="px-4 py-4 bg-white border-y border-slate-100 group-hover:border-brand-200 transition-colors shadow-sm group-hover:shadow-md">
                          <span className={`text-[10px] uppercase tracking-wider font-black px-3 py-1 rounded-full ${
                            n.urgency === 4 ? 'bg-red-100 text-red-700'
                            : n.urgency === 3 ? 'bg-orange-100 text-orange-700'
                            : n.urgency === 2 ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-slate-100 text-slate-600'
                          }`}>
                            {n.urgency_label || 'Mod'}
                          </span>
                        </td>
                        <td className="px-4 py-4 bg-white border-y border-r border-slate-100 rounded-r-2xl group-hover:border-brand-200 transition-colors shadow-sm group-hover:shadow-md text-right">
                          <button onClick={() => handleCloseNeed(n.id)} className="text-xs text-slate-400 hover:text-red-500 font-bold transition-colors">
                            Close
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Impact Banner */}
          <div className="bg-gradient-to-r from-blue-900 to-indigo-800 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-xl">
             <div className="absolute right-0 top-0 w-48 h-48 bg-white opacity-10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/4"></div>
             <div className="relative z-10 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black mb-2">Track Your Impact</h3>
                  <p className="text-indigo-200 text-sm font-medium">See how much food you've rescued this month.</p>
                </div>
                <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                  <Users size={32} className="text-white" />
                </div>
             </div>
             <Link to="/impact" className="relative z-10 mt-6 inline-flex items-center gap-2 bg-white text-indigo-900 px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-50 transition-colors text-sm shadow-sm">
                View Impact Report
             </Link>
          </div>

          {/* New Feature: Street Dispatch (Beggar / Hotspot Relief) */}
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[2rem] overflow-hidden relative shadow-xl text-white p-8">
            <div className="absolute left-0 bottom-0 w-48 h-48 bg-white opacity-10 rounded-full blur-3xl transform -translate-x-1/3 translate-y-1/3"></div>
            <div className="relative z-10">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4">
                <Globe size={24} className="text-white" />
              </div>
              <h3 className="text-lg font-black mb-2">Street Relief Dispatch</h3>
              <p className="text-sm font-medium text-emerald-100 mb-6 leading-relaxed">
                Dispatch your volunteers directly to mapped begging hotspots and street shelters. Connect the hungry directly with ready-to-eat surplus.
              </p>
              <button onClick={() => setShowDispatchModal(true)} className="inline-flex items-center gap-2 bg-white text-teal-700 px-5 py-2.5 rounded-xl font-bold hover:bg-teal-50 transition-colors text-sm shadow-md w-full justify-center">
                Deploy Street Team <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Street Team Dispatch Modal */}
      <AnimatePresence>
        {showDispatchModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2rem] shadow-2xl max-w-2xl w-full overflow-hidden relative flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-teal-50/50">
                <div className="flex items-center gap-3">
                  <div className="bg-teal-600 text-white p-2 rounded-xl">
                    <Globe size={20} />
                  </div>
                  <h3 className="text-xl font-black text-slate-800">Dispatch Street Relief Team</h3>
                </div>
                <button onClick={() => setShowDispatchModal(false)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              {dispatchSuccess ? (
                <div className="p-16 text-center">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="inline-flex items-center justify-center w-24 h-24 bg-teal-100 text-teal-600 rounded-full mb-6 shadow-inner">
                    <CheckCircle size={48} />
                  </motion.div>
                  <h4 className="text-3xl font-black text-slate-800 mb-3">Team Deployed!</h4>
                  <p className="text-slate-500 font-medium text-lg">Your volunteers have been dispatched to the hotspot. Tracking link sent.</p>
                </div>
              ) : (
                <div className="flex flex-col md:flex-row overflow-y-auto">
                  {/* Map mockup */}
                  <div className="w-full md:w-2/5 bg-slate-100 p-6 flex flex-col justify-center items-center border-r border-slate-200">
                    <div className="relative w-full aspect-square bg-slate-200 rounded-3xl overflow-hidden shadow-inner flex items-center justify-center">
                       <img src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=400&q=80" alt="Map" className="absolute inset-0 w-full h-full object-cover opacity-50 mix-blend-multiply" />
                       <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="relative z-10 text-red-500 drop-shadow-xl">
                         <MapPin size={48} fill="currentColor" className="text-white" />
                       </motion.div>
                    </div>
                    <div className="mt-4 text-center">
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Target Hotspot</div>
                      <div className="text-sm font-black text-slate-800">Downtown Station Underpass</div>
                    </div>
                  </div>
                  
                  {/* Form */}
                  <form onSubmit={handleDispatchSubmit} className="p-6 flex-1 space-y-5">
                    <div className="mb-2 bg-red-50 border border-red-200 p-3 rounded-xl flex items-start gap-2">
                      <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={16} />
                      <div className="text-[11px] font-bold text-red-700 leading-snug">
                        Warning: Volunteers must strictly verify that dispatched food is uncompromised upon arrival. NGOs are liable for the distribution of safe goods.
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Select Volunteer Team</label>
                      <select className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all font-medium text-slate-700">
                        <option>Alpha Team (3 members available)</option>
                        <option>Bravo Team (2 members available)</option>
                        <option>Charlie Team (On Route)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Food Inventory to Distribute</label>
                      <select className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all font-medium text-slate-700">
                        <option>40x Buffet Leftovers (Rice & Curry)</option>
                        <option>20x Fresh Sandwiches</option>
                        <option>15kg Apples & Oranges</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Dispatch Notes</label>
                      <textarea rows="3" placeholder="e.g. Park near the south entrance. Look for the red tent..." className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all resize-none"></textarea>
                    </div>

                    <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-2">
                      <button type="button" onClick={() => setShowDispatchModal(false)} className="px-5 py-2.5 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                      <button type="submit" className="bg-teal-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-teal-700 shadow-md shadow-teal-600/20 transition-colors">Confirm Dispatch</button>
                    </div>
                  </form>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NGODashboard;
