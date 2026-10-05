import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Leaf, Eye, EyeOff } from 'lucide-react';
import { authApi, saveAuth } from '../services/api';

const Login = () => {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await authApi.login({ email: email.trim(), password });
      saveAuth(data.token, data.user);
      if (data.user.role === 'ngo') navigate('/ngo/dashboard');
      else navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left panel */}
      <div className="hidden md:flex flex-1 bg-brand-900 text-white flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&q=80&w=1000')] bg-cover bg-center opacity-20 mix-blend-overlay" />
        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-2 mb-12">
            <div className="bg-white text-brand-900 p-1.5 rounded-lg"><Leaf size={24} /></div>
            <span className="text-2xl font-bold">FoodBridge AI</span>
          </Link>
          <h2 className="text-4xl font-bold mb-4 leading-tight">
            Real food.<br />Real people.<br />Real impact.
          </h2>
          <p className="text-brand-100/70 text-lg">
            Join the movement to redistribute surplus food and fight hunger across communities.
          </p>
        </div>
        <div className="relative z-10 bg-white/10 rounded-2xl p-5 backdrop-blur-sm">
          <p className="text-sm text-brand-100/80 font-medium">
            🌍 SDG 2: Zero Hunger — Ensuring access to safe, nutritious food for all people.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-lg border border-gray-100">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-brand-100 p-3 rounded-2xl">
                <Leaf size={28} className="text-brand-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-navy">Welcome back</h3>
            <p className="text-muted mt-2 text-sm">Sign in to your FoodBridge account</p>
          </div>

          {/* Demo hint */}
          <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl mb-5">
            <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-2">Demo Accounts (Password: password123)</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white p-2 rounded border border-indigo-50">
                <span className="font-bold text-slate-700 block">Donor 1:</span>
                <span className="text-indigo-600 cursor-pointer hover:underline" onClick={() => { setEmail('hotel@demo.com'); setPassword('password123'); }}>hotel@demo.com</span>
              </div>
              <div className="bg-white p-2 rounded border border-indigo-50">
                <span className="font-bold text-slate-700 block">Donor 2:</span>
                <span className="text-indigo-600 cursor-pointer hover:underline" onClick={() => { setEmail('bakery@demo.com'); setPassword('password123'); }}>bakery@demo.com</span>
              </div>
              <div className="bg-white p-2 rounded border border-indigo-50 col-span-2">
                <span className="font-bold text-slate-700 block">NGO:</span>
                <span className="text-indigo-600 cursor-pointer hover:underline" onClick={() => { setEmail('ngo1@demo.com'); setPassword('password123'); }}>ngo1@demo.com</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-navy mb-1">Email</label>
              <input
                type="email"
                required
                autoComplete="email"
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-600 focus:border-brand-600 outline-none transition"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <label className="block text-sm font-medium text-navy">Password</label>
              </div>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  className="w-full p-3 pr-11 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-600 focus:border-brand-600 outline-none transition"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-600 text-white py-3 rounded-xl font-semibold hover:bg-brand-900 transition-colors shadow-md mt-2 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Signing in…
                </>
              ) : 'Sign In'}
            </button>
          </form>

          <p className="text-center mt-6 text-muted text-sm">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="text-brand-600 font-semibold hover:underline">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
