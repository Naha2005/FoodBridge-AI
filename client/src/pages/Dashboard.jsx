import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Leaf, Heart, Users, Clock, CheckCircle, AlertCircle, AlertTriangle, TrendingUp, Bot, RefreshCw, ArrowRight, Activity, ShoppingBag, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { foodApi, getUser, statusBadge, statusLabel, relativeTime } from '../services/api';

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

const Dashboard = () => {
  const user    = getUser();
  const navigate = useNavigate();

  const [donations, setDonations] = useState([]);
  const [stats,     setStats]     = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [showHotspotModal, setShowHotspotModal] = useState(false);
  const [pledgeSuccess, setPledgeSuccess] = useState(false);
  const [pledgeLoad, setPledgeLoad] = useState(false);
  const [pledgeForm, setPledgeForm] = useState({ name: '', quantity: '', prep_time: '', address: 'My Storefront (Direct Walk-in)' });

  const handlePledgeSubmit = async (e) => {
    e.preventDefault();
    setPledgeLoad(true);
    try {
      await foodApi.create({
        name: pledgeForm.name,
        category: 'Cooked Meals',
        quantity: parseInt(pledgeForm.quantity),
        unit: 'portions',
        storage: 'Room Temperature',
        prep_time: new Date().toISOString(),
        expiry_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        notes: `Direct Hotspot Pledge: ${pledgeForm.address}. Ready By: ${pledgeForm.prep_time}`,
        address: pledgeForm.address
      });
      setPledgeSuccess(true);
      load();
      setTimeout(() => {
        setShowHotspotModal(false);
        setPledgeSuccess(false);
        setPledgeForm({ name: '', quantity: '', prep_time: '', address: 'My Storefront (Direct Walk-in)' });
      }, 2000);
    } catch (err) {
      alert("Could not save pledge: " + err.message);
    } finally {
      setPledgeLoad(false);
    }
  };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [donRes, statsRes] = await Promise.all([
        foodApi.myDonations({ limit: 5 }),
        foodApi.donorStats(),
      ]);
      setDonations(donRes.donations || []);
      setStats(statsRes);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    load();
  }, []);

  const urgent = donations.filter((d) => {
    if (d.status !== 'available' || !d.expiry_time) return false;
    const hrs = (new Date(d.expiry_time) - Date.now()) / 3600000;
    return hrs >= 0 && hrs < 6;
  });

  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Dynamic Header with Banner */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-slate-900 rounded-[2.5rem] overflow-hidden p-10 shadow-2xl flex flex-col md:flex-row justify-between items-center md:items-end gap-6"
      >
        <div className="absolute inset-0 opacity-40 mix-blend-overlay">
          <img src="https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=1200&q=80" alt="Food background" className="w-full h-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-slate-900 via-slate-900/90 to-transparent"></div>
        
        <div className="relative z-10 w-full">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 text-xs font-bold mb-4 backdrop-blur-md border border-brand-500/30">
            <Activity size={14} className="animate-pulse" /> Donor Dashboard Active
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-2 tracking-tight">Welcome back, {firstName}!</h2>
          <p className="text-slate-300 font-medium text-lg max-w-xl">Your surplus food is making a massive difference. Let's see your impact today.</p>
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

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <StatCard delay={0.1} icon={Leaf}         color="bg-gradient-to-br from-emerald-100 to-green-50 border-emerald-200 text-emerald-800"   value={stats?.pending}   label="Active Listings"    loading={loading} />
        <StatCard delay={0.2} icon={Heart}        color="bg-gradient-to-br from-blue-100 to-sky-50 border-blue-200 text-blue-800"       value={stats?.total_qty} label="Total Portions" loading={loading} />
        <StatCard delay={0.3} icon={Users}        color="bg-gradient-to-br from-purple-100 to-fuchsia-50 border-purple-200 text-purple-800" value={stats?.delivered} label="NGO Deliveries" loading={loading} />
        <StatCard delay={0.4} icon={Clock}        color="bg-gradient-to-br from-orange-100 to-amber-50 border-orange-200 text-orange-800" value={stats?.total}     label="All-time Posts"  loading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Urgent alert */}
          {urgent.length > 0 && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-orange-600 p-6 rounded-[2rem] shadow-xl shadow-orange-600/20 text-white relative overflow-hidden">
              <div className="absolute right-0 top-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
              <div className="flex items-start gap-4 relative z-10">
                <div className="bg-white/20 p-3 rounded-2xl">
                  <AlertCircle className="text-white" size={28} />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-black mb-1">Urgent Rescue Needed</h3>
                  <p className="text-orange-100 font-medium mb-4">
                    <strong>{urgent.length}</strong> donation{urgent.length > 1 ? 's' : ''} expiring within 6 hours.
                    Use the AI Agent to route this immediately before it spoils.
                  </p>
                  <Link
                    to="/ai-agent"
                    className="inline-flex items-center gap-2 bg-white text-orange-700 px-6 py-2.5 rounded-xl font-bold hover:bg-orange-50 transition-colors shadow-sm"
                  >
                    <Bot size={18} /> Open Smart Rescue Agent
                  </Link>
                </div>
              </div>
            </motion.div>
          )}

          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-6">
            <Link to="/donations/new" className="bg-white border border-slate-200 p-6 rounded-[2rem] hover:border-brand-500 hover:shadow-xl hover:shadow-brand-500/10 transition-all group overflow-hidden relative">
              <div className="absolute -right-6 -top-6 w-32 h-32 bg-brand-50 rounded-full blur-2xl group-hover:bg-brand-100 transition-colors z-0"></div>
              <div className="relative z-10">
                <div className="w-14 h-14 bg-brand-600 text-white flex items-center justify-center rounded-2xl mb-4 shadow-lg shadow-brand-600/30 group-hover:scale-110 transition-transform">
                  <Leaf size={24} />
                </div>
                <div className="text-xl font-black text-slate-800">Post Donation</div>
                <div className="text-sm font-medium text-slate-500 mt-1">List new surplus food</div>
              </div>
            </Link>
            <Link to="/ai-agent" className="bg-white border border-slate-200 p-6 rounded-[2rem] hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/10 transition-all group overflow-hidden relative">
              <div className="absolute -right-6 -top-6 w-32 h-32 bg-blue-50 rounded-full blur-2xl group-hover:bg-blue-100 transition-colors z-0"></div>
              <div className="relative z-10">
                <div className="w-14 h-14 bg-blue-600 text-white flex items-center justify-center rounded-2xl mb-4 shadow-lg shadow-blue-600/30 group-hover:scale-110 transition-transform">
                  <Bot size={24} />
                </div>
                <div className="text-xl font-black text-slate-800">Smart Match</div>
                <div className="text-sm font-medium text-slate-500 mt-1">Auto-route with AI</div>
              </div>
            </Link>
          </div>

          {/* Recent donations table */}
          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-2xl font-black text-slate-800">Recent Activity</h3>
              <Link to="/donations" className="text-sm font-bold text-brand-600 hover:text-brand-800 transition-colors flex items-center gap-1">
                View all <ArrowRight size={16} />
              </Link>
            </div>
            <div className="overflow-x-auto p-4">
              <table className="w-full text-left border-separate border-spacing-y-2">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Food Item</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Qty</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider hidden md:table-cell">Expiry</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="bg-slate-50 rounded-xl">
                        {Array.from({ length: 4 }).map((__, j) => (
                          <td key={j} className={`px-4 py-4 rounded-xl ${j===2?'hidden md:table-cell':''}`}>
                            <div className="h-4 bg-slate-200 rounded animate-pulse w-full" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : donations.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="py-12 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full text-slate-400 mb-4">
                          <ShoppingBag size={24} />
                        </div>
                        <div className="text-slate-500 font-medium mb-3">No active donations.</div>
                        <Link to="/donations/new" className="inline-flex items-center gap-2 bg-brand-600 text-white px-5 py-2.5 rounded-full font-bold hover:bg-brand-700 transition-colors shadow-md">
                          Post your first item
                        </Link>
                      </td>
                    </tr>
                  ) : (
                    donations.map((d) => (
                      <tr key={d.id} className="group">
                        <td className="px-4 py-4 bg-white border border-slate-100 rounded-l-2xl group-hover:border-brand-200 transition-colors shadow-sm group-hover:shadow-md">
                          <div className="font-bold text-slate-800">{d.name}</div>
                          <div className="text-xs font-medium text-slate-500 mt-1">{d.category}</div>
                        </td>
                        <td className="px-4 py-4 bg-white border-y border-slate-100 group-hover:border-brand-200 transition-colors shadow-sm group-hover:shadow-md font-bold text-brand-600">
                          {d.quantity} <span className="text-xs text-slate-400">{d.unit}</span>
                        </td>
                        <td className="px-4 py-4 bg-white border-y border-slate-100 group-hover:border-brand-200 transition-colors shadow-sm group-hover:shadow-md hidden md:table-cell text-sm font-medium text-slate-600">
                          {d.expiry_time ? relativeTime(d.expiry_time) : '—'}
                        </td>
                        <td className="px-4 py-4 bg-white border-y border-r border-slate-100 rounded-r-2xl group-hover:border-brand-200 transition-colors shadow-sm group-hover:shadow-md">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border ${statusBadge(d.status)}`}>
                            {d.status === 'delivered' && <CheckCircle size={12} />}
                            {d.status === 'available' && <Clock size={12} />}
                            {statusLabel(d.status)}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* AI Advisor Banner */}
          <div className="bg-slate-900 rounded-[2rem] overflow-hidden relative shadow-xl">
            <div className="absolute inset-0 opacity-20">
              <img src="https://images.unsplash.com/photo-1593113630400-ea4288922497?auto=format&fit=crop&w=600&q=80" alt="Tech" className="w-full h-full object-cover"/>
            </div>
            <div className="relative z-10 p-8">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6">
                <Bot size={24} className="text-white" />
              </div>
              <h3 className="text-2xl font-black text-white mb-3">AI Rescue Agent</h3>
              <p className="text-sm text-slate-300 font-medium mb-6 leading-relaxed">
                Automatically analyze spoilage risk and route food to NGOs based on live capacity and distance.
              </p>
              <Link to="/ai-agent" className="block w-full text-center bg-white text-slate-900 px-4 py-3 rounded-xl text-sm font-bold hover:bg-slate-100 transition-colors shadow-lg">
                Activate Agent
              </Link>
            </div>
          </div>

          {/* New Community Hotspot / Beggar Relief Feature */}
          <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-[2rem] overflow-hidden relative shadow-xl text-white p-8">
            <div className="absolute right-0 bottom-0 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl transform translate-x-1/3 translate-y-1/3"></div>
            <div className="relative z-10">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4">
                <Heart size={24} className="text-white" />
              </div>
              <h3 className="text-lg font-black mb-2">Community Hotspot Drop</h3>
              <p className="text-sm font-medium text-orange-100 mb-6 leading-relaxed">
                Want to help directly? Pledge surplus food to Open Community Fridges or Hotspots where individuals in need and beggars can access fresh food instantly.
              </p>
              <button onClick={() => setShowHotspotModal(true)} className="inline-flex items-center gap-2 bg-white text-orange-700 px-5 py-2.5 rounded-xl font-bold hover:bg-orange-50 transition-colors text-sm shadow-md w-full justify-center">
                Pledge Direct Meals <ArrowRight size={16} />
              </button>
            </div>
          </div>

          {/* ML Forecast link */}
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 relative overflow-hidden group">
            <div className="absolute right-0 bottom-0 w-32 h-32 bg-blue-50 rounded-full blur-2xl transform translate-x-1/2 translate-y-1/2 group-hover:bg-blue-100 transition-colors"></div>
            <div className="relative z-10">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
                <TrendingUp size={24} />
              </div>
              <h3 className="text-lg font-black text-slate-800 mb-2">Demand Forecast</h3>
              <p className="text-sm font-medium text-slate-500 mb-6">
                View the 7-day ML prediction of food requirements for NGOs in your area to plan your prep.
              </p>
              <Link to="/forecast" className="inline-flex items-center gap-2 text-blue-600 font-bold hover:text-blue-800 transition-colors">
                View Forecast <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          {/* Safety compliance */}
          <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-200">
            <h3 className="text-base font-black text-slate-800 mb-4">Safety Checklist</h3>
            <div className="space-y-3">
              {[
                "All items require expiry time",
                "Storage conditions are mandatory",
                "Expired items cannot be matched",
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 text-sm font-medium text-slate-600">
                  <div className="bg-green-100 text-green-600 p-1 rounded-full mt-0.5"><CheckCircle size={12} /></div>
                  <span className="flex-1">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Community Hotspot Modal */}
      <AnimatePresence>
        {showHotspotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2rem] shadow-2xl max-w-lg w-full overflow-hidden relative"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-orange-50/50">
                <div className="flex items-center gap-3">
                  <div className="bg-orange-500 text-white p-2 rounded-xl">
                    <Heart size={20} />
                  </div>
                  <h3 className="text-xl font-black text-slate-800">Pledge to Community Hotspot</h3>
                </div>
                <button onClick={() => setShowHotspotModal(false)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              {pledgeSuccess ? (
                <div className="p-12 text-center">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="inline-flex items-center justify-center w-20 h-20 bg-green-100 text-green-600 rounded-full mb-6">
                    <CheckCircle size={40} />
                  </motion.div>
                  <h4 className="text-2xl font-black text-slate-800 mb-2">Pledge Confirmed!</h4>
                  <p className="text-slate-500 font-medium">Thank you for directly supporting individuals in need. We will notify the nearest hotspot manager.</p>
                </div>
              ) : (
                <form onSubmit={handlePledgeSubmit} className="p-6 space-y-5">
                  <p className="text-sm text-slate-500 font-medium leading-relaxed">
                    By pledging direct meals, you bypass standard NGO routing. We will direct begging individuals and homeless people directly to your storefront or a nearby open fridge.
                  </p>
                  
                  <div className="mb-4 bg-red-50 border border-red-200 p-4 rounded-xl flex items-start gap-3">
                    <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={20} />
                    <div className="text-xs font-medium text-red-700 leading-relaxed">
                      <strong>Important:</strong> You are strictly liable for the safety of these meals. Do not pledge expired or unsafe food.
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Food Type / Meal Description</label>
                    <input type="text" required placeholder="e.g. 10 Fresh Sandwiches" value={pledgeForm.name} onChange={(e) => setPledgeForm({ ...pledgeForm, name: e.target.value })} disabled={pledgeLoad} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Quantity (Digits only)</label>
                      <input 
                        type="number" 
                        min="1" 
                        step="1"
                        required 
                        placeholder="e.g. 10" 
                        value={pledgeForm.quantity}
                        onChange={(e) => setPledgeForm({ ...pledgeForm, quantity: e.target.value })}
                        disabled={pledgeLoad}
                        onKeyDown={(e) => {
                          if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '.') e.preventDefault();
                        }}
                        className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Ready By</label>
                      <input type="time" required value={pledgeForm.prep_time} onChange={(e) => setPledgeForm({ ...pledgeForm, prep_time: e.target.value })} disabled={pledgeLoad} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Drop-off Location</label>
                    <select value={pledgeForm.address} onChange={(e) => setPledgeForm({ ...pledgeForm, address: e.target.value })} disabled={pledgeLoad} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all font-medium text-slate-700">
                      <option>My Storefront (Direct Walk-in)</option>
                      <option>Central Park Community Fridge (1.2km)</option>
                      <option>Downtown Shelter Drop (2.5km)</option>
                    </select>
                  </div>

                  <div className="pt-2 flex justify-end gap-3">
                    <button type="button" onClick={() => setShowHotspotModal(false)} disabled={pledgeLoad} className="px-5 py-2.5 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50">Cancel</button>
                    <button type="submit" disabled={pledgeLoad} className="bg-orange-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-orange-700 shadow-md shadow-orange-600/20 transition-colors disabled:opacity-50">
                      {pledgeLoad ? 'Confirming...' : 'Confirm Pledge'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
