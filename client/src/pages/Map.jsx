import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { foodApi } from '../services/api';
import { Info } from 'lucide-react';

// Fix default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Colored markers
const donorIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});
const ngoIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});

const MapTilerKey = import.meta.env.VITE_MAPTILER_API_KEY;

const MapView = () => {
  // Sample locations (shown when no real data yet)
  const SAMPLE_LOCATIONS = [
    { id: 1, type: 'donor', name: 'Demo Donor', pos: [28.6139, 77.2090], desc: 'Donation: 25 portions Cooked Rice', isDemo: true },
    { id: 2, type: 'ngo',   name: 'Green Hope Foundation', pos: [28.5355, 77.3910], desc: 'Needs: 60 portions of cooked meals', isDemo: true },
    { id: 3, type: 'donor', name: 'Sunrise Caterers', pos: [19.0760, 72.8777], desc: 'Donation: 40 portions Mixed Veg', isDemo: true },
    { id: 4, type: 'ngo',   name: 'Helping Hands NGO', pos: [12.9716, 77.5946], desc: 'Needs: 30 portions of fruits', isDemo: true },
  ];

  const [locations, setLocations] = useState(SAMPLE_LOCATIONS);
  const [activeTab, setActiveTab] = useState('all');
  const [hasReal,   setHasReal]   = useState(false);

  useEffect(() => {
    // Try to load real donation locations
    foodApi.list({ status: 'available', limit: 50 })
      .then((res) => {
        const real = (res.donations || [])
          .filter((d) => d.lat && d.lng)
          .map((d) => ({
            id:   d.id,
            type: 'donor',
            name: d.donor_name || 'Donor',
            pos:  [parseFloat(d.lat), parseFloat(d.lng)],
            desc: `${d.name} — ${d.quantity} ${d.unit}`,
            isDemo: false,
          }));
        if (real.length > 0) {
          setLocations(real);
          setHasReal(true);
        }
      })
      .catch(() => {});
  }, []);

  const filtered = activeTab === 'all'
    ? locations
    : locations.filter((l) => l.type === activeTab);

  const center = [20.5937, 78.9629]; // Center of India

  return (
    <div className="max-w-6xl mx-auto h-[80vh] flex flex-col md:flex-row gap-5">
      {/* Map */}
      <div className="flex-1 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden relative">
        {/* Map key notice */}
        {!MapTilerKey && (
          <div className="absolute top-3 left-3 right-3 z-[1000] bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs px-3 py-2 rounded-xl flex items-start gap-2">
            <Info size={14} className="shrink-0 mt-0.5" />
            <span>
              MapTiler key not configured. Map tiles may not load. Set{' '}
              <code className="bg-yellow-100 px-1 rounded">VITE_MAPTILER_API_KEY</code> in{' '}
              <code className="bg-yellow-100 px-1 rounded">client/.env</code>.
              Donation locations and markers still work on the OpenStreetMap fallback below.
            </span>
          </div>
        )}

        <MapContainer center={center} zoom={5} style={{ height: '100%', width: '100%', borderRadius: '1.5rem', zIndex: 0 }}>
          {MapTilerKey ? (
            <TileLayer
              attribution='&copy; <a href="https://www.maptiler.com/copyright/" target="_blank">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url={`https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=${MapTilerKey}`}
            />
          ) : (
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          )}
          {filtered.map((loc) => (
            <Marker
              key={loc.id}
              position={loc.pos}
              icon={loc.type === 'donor' ? donorIcon : ngoIcon}
            >
              <Popup>
                <div className="text-center min-w-[140px]">
                  <h4 className="font-bold text-navy text-sm">{loc.name}</h4>
                  <p className="text-xs font-semibold uppercase mt-1" style={{ color: loc.type === 'donor' ? '#07865B' : '#F59E0B' }}>
                    {loc.type}
                    {loc.isDemo && ' (demo)'}
                  </p>
                  <p className="text-xs mt-1 text-gray-600">{loc.desc}</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Sidebar */}
      <div className="w-full md:w-72 bg-white rounded-3xl shadow-sm border border-gray-100 p-5 flex flex-col">
        <h3 className="text-lg font-bold text-navy mb-3">Locations</h3>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 mb-4 gap-1">
          {[
            { id: 'all',   label: 'All' },
            { id: 'donor', label: 'Donors' },
            { id: 'ngo',   label: 'NGOs' },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 pb-2 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === id
                  ? 'border-brand-600 text-brand-900'
                  : 'border-transparent text-muted hover:text-navy'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {!hasReal && (
          <div className="text-xs text-muted bg-yellow-50 border border-yellow-100 p-2 rounded-lg mb-3">
            Showing demo locations. Add lat/lng when posting donations to appear on the map.
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-3">
          {filtered.map((loc) => (
            <div
              key={loc.id}
              className="p-3 border border-gray-100 rounded-xl hover:border-brand-600 cursor-pointer transition-colors"
            >
              <div className="flex justify-between items-start">
                <h4 className="font-semibold text-navy text-sm">{loc.name}</h4>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                  loc.type === 'ngo' ? 'bg-orange-100 text-orange-700' : 'bg-brand-100 text-brand-700'
                }`}>
                  {loc.type}
                </span>
              </div>
              <p className="text-xs text-muted mt-1">{loc.desc}</p>
              {loc.isDemo && <p className="text-xs text-yellow-600 mt-0.5">Demo</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MapView;
