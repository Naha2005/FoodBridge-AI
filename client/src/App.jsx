import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import AgentChat from './pages/AgentChat';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <Navbar />
        <main className="flex-grow container mx-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/agent" element={<AgentChat />} />
            <Route path="/listings" element={<div className="p-8 text-center text-xl text-gray-600">Food Listings component coming here soon.</div>} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
