import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Leaf, Eye, EyeOff } from 'lucide-react';
import { authApi } from '../services/api';

const ROLES = [
  { value: 'donor',     label: 'Food Donor (Restaurant, Caterer, Event)' },
  { value: 'ngo',       label: 'NGO / Food Bank / Community Kitchen' },
  { value: 'volunteer', label: 'Delivery Volunteer' },
];

const Register = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    role: 'donor', org_name: '', phone: '', address: '',
  });
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [success,  setSuccess]  = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const { confirmPassword: _confirmPassword, ...payload } = form;
      await authApi.register(payload);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
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
          <h2 className="text-4xl font-bold mb-4 leading-tight">Join the movement.</h2>
          <p className="text-brand-100/70 text-lg">
            Help connect surplus food to communities in need. Every account makes a difference.
          </p>
        </div>
        <div className="relative z-10 bg-white/10 rounded-2xl p-5 backdrop-blur-sm">
          <p className="text-sm text-brand-100/80 font-medium">
            🤝 Together we can ensure zero food goes to waste.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background overflow-y-auto">
        <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-lg border border-gray-100 my-6">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-navy">Create an Account</h3>
            <p className="text-muted mt-2 text-sm">Join FoodBridge AI to start making a difference</p>
          </div>

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-xl mb-4 text-sm text-center">
              ✓ Account created! Redirecting to login…
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl mb-4 text-sm">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleRegister}>
            <div>
              <label className="block text-sm font-medium text-navy mb-1">Full Name / Organization Name <span className="text-red-500">*</span></label>
              <input
                type="text" required value={form.name} onChange={set('name')}
                className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                placeholder="Your name or organization"
                disabled={loading || success}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-navy mb-1">Role <span className="text-red-500">*</span></label>
              <select
                value={form.role} onChange={set('role')}
                className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:border-brand-600 bg-white"
                disabled={loading || success}
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-navy mb-1">Email <span className="text-red-500">*</span></label>
              <input
                type="email" required value={form.email} onChange={set('email')}
                className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                placeholder="you@example.com"
                disabled={loading || success}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-navy mb-1">Password <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'} required value={form.password} onChange={set('password')}
                    minLength={6}
                    className="w-full p-3 pr-10 border border-gray-300 rounded-xl outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                    placeholder="Min 6 chars"
                    disabled={loading || success}
                  />
                  <button type="button" tabIndex={-1}
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-navy mb-1">Confirm Password <span className="text-red-500">*</span></label>
                <input
                  type="password" required value={form.confirmPassword} onChange={set('confirmPassword')}
                  className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                  placeholder="Repeat password"
                  disabled={loading || success}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-navy mb-1">Organization Name (optional)</label>
              <input
                type="text" value={form.org_name} onChange={set('org_name')}
                className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:border-brand-600"
                placeholder="e.g. Green Hope Foundation"
                disabled={loading || success}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-navy mb-1">Phone (optional)</label>
                <input
                  type="tel" value={form.phone} onChange={set('phone')}
                  className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:border-brand-600"
                  placeholder="+91 9000000000"
                  disabled={loading || success}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy mb-1">City / Area (optional)</label>
                <input
                  type="text" value={form.address} onChange={set('address')}
                  className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:border-brand-600"
                  placeholder="e.g. New Delhi"
                  disabled={loading || success}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="w-full bg-brand-600 text-white py-3 rounded-xl font-semibold hover:bg-brand-900 transition-colors shadow-md mt-2 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Creating account…
                </>
              ) : 'Create Account'}
            </button>
          </form>

          <p className="text-center mt-6 text-muted text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-600 font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
