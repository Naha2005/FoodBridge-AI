import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { clearAuth } from '../services/api';

const DashboardLayout = ({ children }) => {
  const navigate = useNavigate();

  // Handle session expiry fired from the API service
  useEffect(() => {
    const handler = () => {
      clearAuth();
      navigate('/login');
    };
    window.addEventListener('fb:session-expired', handler);
    return () => window.removeEventListener('fb:session-expired', handler);
  }, [navigate]);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      {/* Desktop: offset by sidebar width. Mobile: offset by top bar height */}
      <div className="flex-1 md:ml-64 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile spacer to avoid overlap with fixed top bar */}
        <div className="md:hidden h-14 shrink-0" />
        <main className="flex-1 p-4 md:p-8 overflow-y-auto w-full max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
