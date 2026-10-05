import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Info, MapPin, AlertTriangle, CheckCircle, Loader } from 'lucide-react';
import { foodApi, mlApi } from '../services/api';

const CATEGORIES = [
  'Cooked Meals', 'Raw Vegetables', 'Fruits', 'Dairy',
  'Bread & Bakery', 'Canned Goods', 'Beverages', 'Grains & Rice',
  'Snacks', 'Other',
];

const STORAGE_OPTIONS = ['Refrigerated', 'Room Temperature', 'Frozen'];

// Map category to spoilage model category name
const CATEGORY_TO_MODEL = {
  'Cooked Meals':   'cooked_meal',
  'Raw Vegetables': 'raw_vegetables',
  'Fruits':         'fruits',
  'Dairy':          'dairy',
  'Bread & Bakery': 'bread_bakery',
  'Canned Goods':   'canned_goods',
  'Beverages':      'beverages',
  'Grains & Rice':  'raw_vegetables',
  'Snacks':         'cooked_meal',
  'Other':          'cooked_meal',
};

const STORAGE_TEMP = {
  'Refrigerated':      4,
  'Room Temperature':  22,
  'Frozen':           -18,
};

const PostDonation = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name:                '',
    category:            'Cooked Meals',
    quantity:            '',
    unit:                'portions',
    storage:             'Room Temperature',
    notes:               '',
    address:             '',
    lat:                 '',
    lng:                 '',
    prep_time:           '',
    expiry_time:         '',
    collection_deadline: '',
  });

  const [spoilage,      setSpoilage]      = useState(null);
  const [spoilageLoad,  setSpoilageLoad]  = useState(false);
  const [submitLoad,    setSubmitLoad]    = useState(false);
  const [error,         setError]         = useState('');
  const [success,       setSuccess]       = useState(false);
  const [fieldErrors,   setFieldErrors]   = useState({});

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const errs = {};
    if (!form.name.trim())        errs.name     = 'Food name is required';
    if (!form.quantity || Number(form.quantity) <= 0) errs.quantity = 'Enter a valid quantity';
    if (!form.expiry_time)        errs.expiry_time = 'Expiry time is required. Make sure to enter both date AND time.';
    else if (new Date(form.expiry_time) <= new Date()) errs.expiry_time = 'Expiry time must be in the future';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Run spoilage prediction when category, storage, or prep_time changes
  const runSpoilagePrediction = async () => {
    if (!form.category || !form.storage) return;
    setSpoilageLoad(true);
    setSpoilage(null);
    try {
      const prepTime = form.prep_time ? new Date(form.prep_time) : new Date();
      const ageHours = Math.max(0, (Date.now() - prepTime.getTime()) / 3600000);
      const tempC    = STORAGE_TEMP[form.storage] ?? 22;
      const result   = await mlApi.predictSpoilage({
        category:         CATEGORY_TO_MODEL[form.category] || 'cooked_meal',
        age_hours:        parseFloat(ageHours.toFixed(1)),
        storage_temp_c:   tempC,
        humidity_pct:     60,
        hours_to_deliver: 4,
      });
      setSpoilage(result);
    } catch {
      // Prediction unavailable — not blocking
    } finally {
      setSpoilageLoad(false);
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          lat: pos.coords.latitude.toFixed(6),
          lng: pos.coords.longitude.toFixed(6),
        }));
      },
      () => setError('Could not get your location. Please enter the address manually.'),
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;

    setSubmitLoad(true);
    try {
      const payload = {
        ...form,
        quantity: parseFloat(form.quantity),
        lat:      form.lat ? parseFloat(form.lat) : null,
        lng:      form.lng ? parseFloat(form.lng) : null,
        prep_time:           form.prep_time           || null,
        expiry_time:         form.expiry_time         || null,
        collection_deadline: form.collection_deadline || null,
      };
      await foodApi.create(payload);
      setSuccess(true);
      setTimeout(() => navigate('/donations'), 1500);
    } catch (err) {
      setError(err.message || 'Could not submit donation. Please try again.');
    } finally {
      setSubmitLoad(false);
    }
  };

  const riskColor = spoilage?.risk_level === 'High'   ? 'text-red-700 bg-red-50 border-red-200'
                  : spoilage?.risk_level === 'Medium' ? 'text-yellow-700 bg-yellow-50 border-yellow-200'
                  : 'text-green-700 bg-green-50 border-green-200';

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-3xl font-bold text-navy mb-2">Post a Food Donation</h2>
      <p className="text-muted mb-8">Fill in the details below. Fields marked <span className="text-red-500">*</span> are required.</p>

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 p-4 rounded-2xl text-sm flex items-center gap-2">
          <CheckCircle size={18} /> Donation submitted successfully! Redirecting to My Donations…
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main form */}
        <div className="flex-1 bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          {error && (
            <div className="mb-5 bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* Important Warning */}
          <div className="mb-6 bg-red-50 border border-red-200 p-5 rounded-2xl flex items-start gap-3">
            <AlertTriangle className="text-red-600 shrink-0 mt-1" size={24} />
            <div>
              <h4 className="text-red-800 font-black text-sm uppercase tracking-wider mb-1">Important Liability Notice</h4>
              <p className="text-red-700 text-sm font-medium leading-relaxed">
                By submitting this donation, you confirm that the food is safe for human consumption and strictly adhere to the entered expiry times. FoodBridge and partner NGOs are not liable for illnesses resulting from knowingly donating spoiled items.
              </p>
            </div>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit} noValidate>
            <h3 className="text-lg font-bold text-navy border-b pb-2">Food Details</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-navy mb-1">
                  Food Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text" value={form.name} onChange={set('name')} required
                  className={`w-full p-3 border rounded-xl bg-gray-50 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100 ${fieldErrors.name ? 'border-red-400' : 'border-gray-200'}`}
                  placeholder="e.g. Cooked Rice"
                  disabled={submitLoad || success}
                />
                {fieldErrors.name && <p className="text-xs text-red-500 mt-1">{fieldErrors.name}</p>}
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-navy mb-1">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.category}
                  onChange={(e) => { set('category')(e); setTimeout(runSpoilagePrediction, 100); }}
                  className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 outline-none focus:border-brand-600"
                  disabled={submitLoad || success}
                >
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-navy mb-1">
                  Quantity <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="number" 
                    min="1" 
                    step={form.unit === 'portions' || form.unit === 'items' ? "1" : "0.1"}
                    value={form.quantity} 
                    onChange={set('quantity')} 
                    required
                    onKeyDown={(e) => {
                      if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault();
                    }}
                    className={`flex-1 p-3 border rounded-xl bg-gray-50 outline-none focus:border-brand-600 ${fieldErrors.quantity ? 'border-red-400' : 'border-gray-200'}`}
                    placeholder="25"
                    disabled={submitLoad || success}
                  />
                  <select
                    value={form.unit} onChange={set('unit')}
                    className="w-28 p-3 border border-gray-200 rounded-xl bg-gray-50 outline-none focus:border-brand-600"
                    disabled={submitLoad || success}
                  >
                    <option>portions</option>
                    <option>kg</option>
                    <option>litres</option>
                    <option>packs</option>
                    <option>items</option>
                  </select>
                </div>
                {fieldErrors.quantity && <p className="text-xs text-red-500 mt-1">{fieldErrors.quantity}</p>}
              </div>

              {/* Storage */}
              <div>
                <label className="block text-sm font-medium text-navy mb-1">Storage Conditions</label>
                <select
                  value={form.storage}
                  onChange={(e) => { set('storage')(e); setTimeout(runSpoilagePrediction, 100); }}
                  className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 outline-none focus:border-brand-600"
                  disabled={submitLoad || success}
                >
                  {STORAGE_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>

              {/* Prep time */}
              <div>
                <label className="block text-sm font-medium text-navy mb-1">Preparation / Pack Time</label>
                <input
                  type="datetime-local" value={form.prep_time}
                  onChange={(e) => { set('prep_time')(e); setTimeout(runSpoilagePrediction, 100); }}
                  className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 outline-none focus:border-brand-600"
                  disabled={submitLoad || success}
                />
                <p className="text-xs text-gray-400 mt-1">Please ensure you select both date AND time</p>
              </div>

              {/* Expiry */}
              <div>
                <label className="block text-sm font-medium text-navy mb-1">
                  Expiry / Best-Before Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local" value={form.expiry_time} onChange={set('expiry_time')} required
                  className={`w-full p-3 border rounded-xl bg-gray-50 outline-none focus:border-brand-600 ${fieldErrors.expiry_time ? 'border-red-400' : 'border-gray-200'}`}
                  disabled={submitLoad || success}
                />
                <p className="text-xs text-gray-400 mt-1">Please ensure you select both date AND time</p>
                {fieldErrors.expiry_time && <p className="text-xs text-red-500 mt-1">{fieldErrors.expiry_time}</p>}
              </div>

              {/* Collection deadline */}
              <div>
                <label className="block text-sm font-medium text-navy mb-1">Collection Deadline</label>
                <input
                  type="datetime-local" value={form.collection_deadline} onChange={set('collection_deadline')}
                  className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 outline-none focus:border-brand-600"
                  disabled={submitLoad || success}
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-navy mb-1">Notes / Dietary Info</label>
                <input
                  type="text" value={form.notes} onChange={set('notes')}
                  placeholder="e.g. Vegetarian, no nuts, freshly cooked"
                  className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 outline-none focus:border-brand-600"
                  disabled={submitLoad || success}
                />
              </div>
            </div>

            {/* Spoilage prediction */}
            {spoilageLoad && (
              <div className="flex items-center gap-2 text-sm text-muted bg-gray-50 p-3 rounded-xl">
                <Loader size={16} className="animate-spin" /> Analysing spoilage risk…
              </div>
            )}
            {spoilage && !spoilageLoad && (
              <div className={`flex items-start gap-3 p-4 rounded-xl border text-sm ${riskColor}`}>
                {spoilage.risk_level === 'High' ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
                <div>
                  <strong>Spoilage Risk: {spoilage.risk_level}</strong>
                  {' '}(probability: {(spoilage.spoilage_probability * 100).toFixed(0)}%)
                  {spoilage.risk_level === 'High' && (
                    <p className="mt-1 text-xs">Consider refrigerating, reducing delivery time, or marking an earlier expiry.</p>
                  )}
                  <p className="mt-1 text-xs opacity-70">Prediction by {spoilage.model}. For food safety, always follow applicable guidelines.</p>
                </div>
              </div>
            )}

            <h3 className="text-lg font-bold text-navy border-b pb-2 mt-6">Pickup Location</h3>
            <div>
              <label className="block text-sm font-medium text-navy mb-1">Pickup Address</label>
              <div className="flex gap-2">
                <input
                  type="text" value={form.address} onChange={set('address')}
                  placeholder="Street, area, city"
                  className="flex-1 p-3 border border-gray-200 rounded-xl bg-gray-50 outline-none focus:border-brand-600"
                  disabled={submitLoad || success}
                />
                <button
                  type="button"
                  onClick={useMyLocation}
                  disabled={submitLoad || success}
                  className="flex items-center gap-1.5 bg-brand-100 text-brand-900 px-3 py-2 rounded-xl text-sm font-medium hover:bg-brand-600 hover:text-white transition-colors whitespace-nowrap"
                >
                  <MapPin size={16} /> Use location
                </button>
              </div>
              {form.lat && form.lng && (
                <p className="text-xs text-brand-600 mt-1">
                  📍 Coordinates: {parseFloat(form.lat).toFixed(4)}, {parseFloat(form.lng).toFixed(4)}
                </p>
              )}
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={submitLoad || success}
                className="w-full bg-brand-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-brand-600 transition-colors shadow-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitLoad ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Submitting…
                  </>
                ) : '✓ Submit Donation'}
              </button>
            </div>
          </form>
        </div>

        {/* Sidebar info */}
        <div className="w-full lg:w-80 space-y-5">
          <div className="bg-brand-100 p-6 rounded-3xl border border-brand-600/20 sticky top-8">
            <h4 className="flex items-center gap-2 text-brand-900 font-bold text-lg mb-4">
              <Info size={22} /> Food Safety First
            </h4>
            <ul className="space-y-3 text-brand-900/80 text-sm">
              <li className="flex gap-2 items-start">
                <span className="text-brand-600 mt-0.5">✓</span>
                Food must be safe, properly stored, and suitable for consumption.
              </li>
              <li className="flex gap-2 items-start">
                <span className="text-brand-600 mt-0.5">✓</span>
                Provide accurate expiry time and storage temperature.
              </li>
              <li className="flex gap-2 items-start">
                <span className="text-brand-600 mt-0.5">✓</span>
                Expired or unsafe food will not be matched to NGOs.
              </li>
              <li className="flex gap-2 items-start">
                <span className="text-brand-600 mt-0.5">✓</span>
                Exact pickup address is only shared with the matched NGO.
              </li>
            </ul>

            <div className="mt-6 pt-4 border-t border-brand-600/20">
              <button
                type="button"
                onClick={runSpoilagePrediction}
                disabled={spoilageLoad}
                className="w-full bg-white text-brand-900 border border-brand-600/30 py-2 rounded-xl text-sm font-semibold hover:bg-brand-600 hover:text-white hover:border-brand-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {spoilageLoad ? <Loader size={15} className="animate-spin" /> : '🔬'}
                Check Spoilage Risk
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostDonation;
