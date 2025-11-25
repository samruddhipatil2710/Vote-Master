import { createContext, useContext, useState, useEffect } from 'react';
import { initializeAdmin } from '../utils/firebaseStorage';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize admin in Firestore and check stored session
    const initialize = async () => {
      try {
        await initializeAdmin();
        
        // Check if user is logged in from localStorage (session persistence)
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }0
    };
    
    initialize();
  }, []);

  const loginAdmin = (adminData) => {
    const userData = { ...adminData, role: 'admin' };
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const loginLeader = (leaderData) => {
    const userData = { ...leaderData, role: 'leader' };
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, loginAdmin, loginLeader, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
