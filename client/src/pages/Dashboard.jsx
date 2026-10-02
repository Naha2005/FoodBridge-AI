import React from 'react';

const Dashboard = () => {
  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">SDG 2 Zero Hunger Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-emerald-500">
          <h3 className="text-gray-500 text-sm font-semibold uppercase">Total Portions Offered</h3>
          <p className="text-3xl font-bold text-gray-800">1,250</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
          <h3 className="text-gray-500 text-sm font-semibold uppercase">Portions Delivered</h3>
          <p className="text-3xl font-bold text-gray-800">980</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-yellow-500">
          <h3 className="text-gray-500 text-sm font-semibold uppercase">NGOs Served</h3>
          <p className="text-3xl font-bold text-gray-800">24</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-bold text-gray-800 mb-4">ML Demand Forecast (Next 7 Days)</h3>
        <p className="text-gray-600 mb-2">Predicted demand across network: <span className="font-bold text-emerald-600">850 portions</span></p>
        <p className="text-sm text-gray-400">Model: Random Forest Regressor | MAE: 12.5</p>
      </div>
    </div>
  );
};

export default Dashboard;
