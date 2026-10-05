import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, PlusCircle, List, Map, MessageSquare,
  User, LogOut, TrendingUp, BarChart2, Target, Menu, X, Leaf,
  Truck, AlertOctagon, Route, ShieldCheck,
} from 'lucide-react';
import { getUser, clearAuth } from '../services/api';

// Nav items by role
const NAV_BY_ROLE = {
  donor: [
    { name: 'Dashboard',        path: '/dashboard',        icon: LayoutDashboard },
    { name: 'Post Donation',    path: '/donations/new',    icon: PlusCircle },
    { name: 'My Donations',     path: '/donations',        icon: List },
    { name: 'Track Donations',  path: '/tracking',         icon: Route },
    { name: 'Smart Matching',   path: '/matches',          icon: Target },
    { name: 'Waste Analytics',  path: '/waste-analytics',  icon: AlertOctagon },
    { name: 'AI Agent',         path: '/ai-agent',         icon: MessageSquare },
    { name: 'Map View',         path: '/map',              icon: Map },
    { name: 'ML Forecast',      path: '/forecast',         icon: TrendingUp },
    { name: 'Impact',           path: '/impact',           icon: BarChart2 },
    { name: 'Profile',          path: '/profile',          icon: User },
  ],
  ngo: [
    { name: 'NGO Dashboard',    path: '/ngo/dashboard',    icon: LayoutDashboard },
    { name: 'Available Food',   path: '/donations',        icon: List },
    { name: 'Track Donations',  path: '/tracking',         icon: Route },
    { name: 'Smart Matching',   path: '/matches',          icon: Target },
    { name: 'AI Agent',         path: '/ai-agent',         icon: MessageSquare },
    { name: 'Map View',         path: '/map',              icon: Map },
    { name: 'ML Forecast',      path: '/forecast',         icon: TrendingUp },
    { name: 'Impact',           path: '/impact',           icon: BarChart2 },
    { name: 'Profile',          path: '/profile',          icon: User },
  ],
  volunteer: [
    { name: 'My Tasks',         path: '/volunteer/dashboard', icon: Truck },
    { name: 'Available Food',   path: '/donations',           icon: List },
    { name: 'Track Donations',  path: '/tracking',            icon: Route },
    { name: 'Map View',         path: '/map',                 icon: Map },
    { name: 'Profile',          path: '/profile',             icon: User },
  ],
  admin: [
    { name: 'Admin Panel',      path: '/admin',            icon: ShieldCheck },
    { name: 'All Donations',    path: '/donations',        icon: List },
    { name: 'Track Donations',  path: '/tracking',         icon: Route },
    { name: 'Smart Matching',   path: '/matches',          icon: Target },
    { name: 'Waste Analytics',  path: '/waste-analytics',  icon: AlertOctagon },
    { name: 'AI Agent',         path: '/ai-agent',         icon: MessageSquare },
    { name: 'Map View',         path: '/map',              icon: Map },
    { name: 'ML Forecast',      path: '/forecast',         icon: TrendingUp },
    { name: 'Impact',           path: '/impact',           icon: BarChart2 },
    { name: 'Profile',          path: '/profile',          icon: User },
  ],
};

const NavLink = ({ item, isActive, onClick }) => {
  const Icon = item.icon;
  return (
    <Link
      to={item.path}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-150 text-sm ${
        isActive
          ? 'bg-brand-600 text-white font-semibold shadow-sm'
          : 'text-brand-100/70 hover:bg-brand-600/40 hover:text-white'
      }`}
    >
      <Icon size={18} className="shrink-0" />
      <span>{item.name}</span>
    </Link>
  );
};

// ─── Extracted as a module-level component to avoid lint/react-compiler warnings ───
const SidebarContent = ({ user, navItems, path, onClose, onLogout }) => (
  <div className="flex flex-col h-full">
    {/* Logo */}
    <div className="p-5 flex items-center gap-3 border-b border-brand-600/30">
      <div className="bg-white p-1.5 rounded-lg">
        <Leaf className="text-brand-600 w-5 h-5" />
      </div>
      <span className="text-lg font-bold tracking-wide">FoodBridge AI</span>
    </div>

    {/* User badge */}
    {user && (
      <div className="px-5 py-3 border-b border-brand-600/20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
            {(user.name || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white truncate">{user.name}</div>
            <div className="text-xs text-brand-100/60 capitalize">{user.role}</div>
          </div>
        </div>
      </div>
    )}

    {/* Nav */}
    <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          item={item}
          isActive={path === item.path || path.startsWith(item.path + '/')}
          onClick={onClose}
        />
      ))}
    </nav>

    {/* Logout */}
    <div className="p-4 border-t border-brand-600/30">
      <button
        onClick={onLogout}
        className="flex items-center gap-3 px-4 py-3 text-brand-100/70 hover:text-white hover:bg-brand-600/40 w-full rounded-xl transition-colors text-sm"
      >
        <LogOut size={18} className="shrink-0" />
        <span>Logout</span>
      </button>
    </div>
  </div>
);

const Sidebar = () => {
  const location  = useLocation();
  const navigate  = useNavigate();
  const path      = location.pathname;
  const user      = getUser();
  // Key the mobile drawer state on the path so it resets on navigation
  // without calling setState inside an effect.
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = NAV_BY_ROLE[user?.role] || NAV_BY_ROLE.donor;

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="bg-brand-900 text-white w-64 min-h-screen hidden md:flex flex-col fixed h-full shadow-xl z-20">
        <SidebarContent
          user={user} navItems={navItems} path={path}
          onClose={closeMobile} onLogout={handleLogout}
        />
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-brand-900 text-white h-14 flex items-center justify-between px-4 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="bg-white p-1 rounded-lg">
            <Leaf className="text-brand-600 w-4 h-4" />
          </div>
          <span className="font-bold text-sm">FoodBridge AI</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg hover:bg-brand-600/40 transition-colors"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile drawer — key on path so it unmounts (closes) on route change */}
      {mobileOpen && (
        <React.Fragment key={path}>
          <div
            className="md:hidden fixed inset-0 bg-black/40 z-40"
            onClick={closeMobile}
          />
          <aside className="md:hidden fixed top-0 left-0 h-full w-72 bg-brand-900 text-white z-50 shadow-2xl">
            <div className="pt-14">
              <SidebarContent
                user={user} navItems={navItems} path={path}
                onClose={closeMobile} onLogout={handleLogout}
              />
            </div>
          </aside>
        </React.Fragment>
      )}
    </>
  );
};

export default Sidebar;
