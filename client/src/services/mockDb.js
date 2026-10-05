// client/src/services/mockDb.js

const INITIAL_DATA = {
  users: [
    { id: '1', email: 'donor@demo.com', password: 'demo', role: 'donor', name: 'Rahul (Demo Donor)' },
    { id: '2', email: 'ngo@demo.com', password: 'demo', role: 'ngo', name: 'Green Hope Foundation' }
  ],
  donations: [
    { id: 'd1', donorId: '1', item: 'Cooked Rice', category: 'Cooked Meals', quantity: 25, expiry: 'Today 4:00 PM', status: 'Matched' },
    { id: 'd2', donorId: '1', item: 'Sandwiches', category: 'Cooked Meals', quantity: 40, expiry: 'Today 6:00 PM', status: 'Pending' },
    { id: 'd3', donorId: '1', item: 'Fruit Box', category: 'Fruits', quantity: 30, expiry: 'Today 8:00 PM', status: 'Pending' }
  ],
  needs: [
    { id: 'n1', ngoId: '2', category: 'Vegetables', required: 50, remaining: 20, pickupTime: 'Today 5:00 PM' },
    { id: 'n2', ngoId: '2', category: 'Cooked Meals', required: 100, remaining: 60, pickupTime: 'Today 6:00 PM' }
  ],
  matches: []
};

const initDb = () => {
  if (!localStorage.getItem('foodbridge_db')) {
    localStorage.setItem('foodbridge_db', JSON.stringify(INITIAL_DATA));
  }
};

const getDb = () => JSON.parse(localStorage.getItem('foodbridge_db'));
const saveDb = (db) => localStorage.setItem('foodbridge_db', JSON.stringify(db));

// Execute once on import
initDb();

export const loginUser = (email, password) => {
  const db = getDb();
  const user = db.users.find(u => u.email === email && u.password === password);
  if (user) {
    const { password: _password, ...safeUser } = user;
    localStorage.setItem('currentUser', JSON.stringify(safeUser));
    return safeUser;
  }
  throw new Error('Invalid credentials');
};

export const getCurrentUser = () => JSON.parse(localStorage.getItem('currentUser'));
export const logoutUser = () => localStorage.removeItem('currentUser');

export const getDonations = () => {
  const user = getCurrentUser();
  const db = getDb();
  if (user?.role === 'donor') return db.donations.filter(d => d.donorId === user.id);
  return db.donations; // NGO sees all (or filtered)
};

export const addDonation = (donation) => {
  const user = getCurrentUser();
  const db = getDb();
  const newDonation = { 
    ...donation, 
    id: 'd' + Date.now(), 
    donorId: user.id, 
    status: 'Pending' 
  };
  db.donations.unshift(newDonation);
  saveDb(db);
  return newDonation;
};

export const getNeeds = () => {
  const user = getCurrentUser();
  const db = getDb();
  if (user?.role === 'ngo') return db.needs.filter(n => n.ngoId === user.id);
  return db.needs;
};

export const getStats = () => {
  const db = getDb();
  const user = getCurrentUser();
  
  if (user?.role === 'donor') {
    const myDonations = db.donations.filter(d => d.donorId === user.id);
    return {
      active: myDonations.filter(d => d.status === 'Pending').length,
      totalPortions: myDonations.reduce((sum, d) => sum + parseInt(d.quantity || 0), 0),
      matched: myDonations.filter(d => d.status === 'Matched').length,
      pending: myDonations.filter(d => d.status === 'Pending').length
    };
  } else {
    const myNeeds = db.needs.filter(n => n.ngoId === user.id);
    return {
      activeNeeds: myNeeds.length,
      matches: 3, // Mocked for now
      deliveries: 2 // Mocked for now
    };
  }
};
