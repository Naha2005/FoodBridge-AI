import React, { useState } from 'react';
import { User, Mail, Phone, MapPin, Shield, Edit2, Save, X } from 'lucide-react';
import { authApi, getUser, saveAuth, getToken } from '../services/api';

const Profile = () => {
  const [user,    setUser]    = useState(getUser());
  const [editing, setEditing] = useState(false);
  const [form,    setForm]    = useState({});
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const startEdit = () => {
    setForm({
      name:     user?.name     || '',
      org_name: user?.org_name || '',
      phone:    user?.phone    || '',
      address:  user?.address  || '',
    });
    setEditing(true);
    setError('');
    setSuccess('');
  };

  const cancelEdit = () => {
    setEditing(false);
    setError('');
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    if (!form.name?.trim()) { setError('Name is required'); return; }
    setLoading(true);
    setError('');
    try {
      await authApi.updateProfile(form);
      // Re-fetch current user to get fresh data
      const fresh = await authApi.me();
      setUser(fresh);
      // Update localStorage
      const token = getToken();
      if (token) saveAuth(token, fresh);
      setSuccess('Profile updated successfully!');
      setEditing(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="p-8 text-center text-muted">
        Please <a href="/login" className="text-brand-600 underline">log in</a> to view your profile.
      </div>
    );
  }

  const roleLabel = (r) => ({ donor: 'Food Donor', ngo: 'NGO / Food Bank', volunteer: 'Delivery Volunteer', admin: 'Administrator' }[r] || r);
  const initials  = (user.name || 'U').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-3xl font-bold text-navy mb-8">My Profile</h2>

      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 p-3 rounded-xl text-sm">
          ✓ {success}
        </div>
      )}

      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
        {/* Avatar + header */}
        <div className="flex items-center gap-6 mb-8 pb-8 border-b border-gray-100">
          <div className="w-20 h-20 bg-brand-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shrink-0">
            {initials}
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-navy">{user.name}</h3>
            {user.org_name && <p className="text-muted">{user.org_name}</p>}
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-semibold bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full capitalize">
                {roleLabel(user.role)}
              </span>
              {user.verified && (
                <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Shield size={10} /> Verified
                </span>
              )}
            </div>
          </div>
          {!editing && (
            <button
              onClick={startEdit}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-navy hover:bg-gray-50 transition-colors"
            >
              <Edit2 size={15} /> Edit
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {editing ? (
          <form onSubmit={saveProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-navy mb-1">Full Name <span className="text-red-500">*</span></label>
              <input
                type="text" value={form.name} onChange={set('name')} required
                className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy mb-1">Organization Name</label>
              <input
                type="text" value={form.org_name} onChange={set('org_name')}
                className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:border-brand-600"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy mb-1">Phone</label>
              <input
                type="tel" value={form.phone} onChange={set('phone')}
                className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:border-brand-600"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy mb-1">City / Address</label>
              <input
                type="text" value={form.address} onChange={set('address')}
                className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:border-brand-600"
                disabled={loading}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-brand-600 text-white py-2.5 rounded-xl font-semibold hover:bg-brand-900 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading
                  ? <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  : <Save size={15} />
                }
                {loading ? 'Saving…' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-navy hover:bg-gray-50 transition-colors"
              >
                <X size={15} /> Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-5">
            {[
              { icon: Mail,   label: 'Email',        val: user.email },
              { icon: Phone,  label: 'Phone',        val: user.phone    || 'Not set' },
              { icon: MapPin, label: 'Location',     val: user.address  || 'Not set' },
              { icon: User,   label: 'Organization', val: user.org_name || 'Not set' },
              { icon: Shield, label: 'Account ID',   val: user.id },
            ].map(({ icon: Icon, label, val }) => (
              <div key={label} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500 shrink-0">
                  <Icon size={18} />
                </div>
                <div>
                  <p className="text-xs text-muted uppercase font-medium">{label}</p>
                  <p className="font-semibold text-navy text-sm mt-0.5">{val}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
