import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <nav className="bg-emerald-600 p-4 text-white shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold">FoodBridge AI</Link>
        <div className="space-x-4">
          <Link to="/" className="hover:text-emerald-200">Dashboard</Link>
          <Link to="/listings" className="hover:text-emerald-200">Food Listings</Link>
          <Link to="/agent" className="hover:text-emerald-200">AI Agent</Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
