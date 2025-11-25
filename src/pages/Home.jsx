import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAdmin, getLeaders } from '../utils/firebaseStorage';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMobileAlt, faLock, faRocket, faExclamationCircle, faSpinner } from '@fortawesome/free-solid-svg-icons';
import '../styles/Home.css';

const Home = () => {
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { loginAdmin, loginLeader } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Try admin login first
      console.log('Attempting login with mobile:', mobile);
      const admin = await getAdmin();
      console.log('Admin data retrieved:', admin);
      
      if (admin && mobile === admin.mobile && password === admin.password) {
        console.log('Admin login successful');
        loginAdmin(admin);
        navigate('/admin/dashboard');
        return;
      }

      // Try leader login
      const leaders = await getLeaders();
      console.log('Leaders retrieved:', leaders);
      const leader = leaders.find(
        l => l.mobile === mobile && l.password === password
      );
      
      if (leader) {
        console.log('Leader login successful');
        loginLeader(leader);
        navigate('/leader/dashboard');
      } else {
        console.log('No matching user found');
        setError('Invalid mobile number or password');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(`Login failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };  return (
    <div className="home-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo-circle">
            <span className="logo-icon">🗳️</span>
          </div>
          <h1 className="title">Vote Master</h1>
          <p className="subtitle">Election Poll Management System - Manage polls, track votes, and analyze results</p>
        </div>

        <div className="login-form-wrapper">
          <h2 className="form-title">Welcome Back!</h2>
          <p className="form-subtitle">Sign in to continue to your dashboard</p>

          <form onSubmit={handleSubmit} className="login-form">
            {error && <div className="error-message"><FontAwesomeIcon icon={faExclamationCircle} /> {error}</div>}
            
            <div className="form-group">
              <label>
                <FontAwesomeIcon icon={faMobileAlt} className="label-icon" />
                Mobile Number
              </label>
              <input
                type="text"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="Enter mobile number"
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>
                <FontAwesomeIcon icon={faLock} className="label-icon" />
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin />
                  Signing in...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faRocket} />
                  Sign In
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Home;
