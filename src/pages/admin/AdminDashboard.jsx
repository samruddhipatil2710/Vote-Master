import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { getLeaders, saveLeader, deleteLeader, updateLeader, getPolls, deletePoll, checkPollStatus, getPollAnalytics } from "../../utils/firebaseStorage";
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartLine, faUsers, faClipboardList, faChartBar, faCog, faSignOutAlt, faUser, faPlus, faEdit, faTrash, faCheckCircle, faTimesCircle, faCopy, faQrcode, faDownload, faVoteYea, faEye, faCalendarAlt, faClock, faSearch } from '@fortawesome/free-solid-svg-icons';
import { faWhatsapp, faFacebook, faTwitter } from '@fortawesome/free-brands-svg-icons';
import { useMessageBox } from '../../hooks/useMessageBox';
import MessageBox from '../../components/MessageBox';
import { getPollUrl } from '../../utils/urlHelper';
import "../../styles/AdminDashboard.css";

// Icons as Font Awesome constants
const ICONS = {
  dashboard: faChartLine,
  leaders: faUsers,
  polls: faClipboardList,
  analytics: faChartBar,
  settings: faCog,
  logout: faSignOutAlt,
  user: faUser,
  add: faPlus,
  edit: faEdit,
  delete: faTrash,
  view: faEye,
  calendar: faCalendarAlt,
  clock: faClock,
  share: faCopy,
  whatsapp: faWhatsapp,
  qr: faQrcode,
  stats: faChartBar,
  trending: faChartLine,
  active: faCheckCircle,
  inactive: faTimesCircle,
  vote: faVoteYea
};

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { messages, success, error, warning, removeMessage } = useMessageBox();
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'leaders', 'polls'
  const [leaders, setLeaders] = useState([]);
  const [polls, setPolls] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingLeader, setEditingLeader] = useState(null);
  const [showQR, setShowQR] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(null);
  const [selectedLeaderPolls, setSelectedLeaderPolls] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    password: "",
    email: "",
    constituency: "",
    party: "",
    photo: ""
  });

  useEffect(() => {
    loadLeaders();
    loadPolls();
    const interval = setInterval(loadPolls, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const loadLeaders = async () => {
    const leadersData = await getLeaders();
    setLeaders(leadersData);
  };

  const loadPolls = async () => {
    const allPolls = await getPolls();
    // Update poll statuses
    const updatedPolls = allPolls.map(poll => ({
      ...poll,
      status: checkPollStatus(poll)
    }));
    setPolls(updatedPolls);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingLeader) {
        await updateLeader(editingLeader.id, formData);
        success('Leader updated successfully!');
      } else {
        await saveLeader(formData);
        success('Leader created successfully!');
      }

      resetForm();
      loadLeaders();
    } catch (error) {
      console.error('Error saving leader:', error);
      error('Failed to save leader. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      mobile: "",
      password: "",
      email: "",
      constituency: "",
      party: "",
      photo: ""
    });
    setShowForm(false);
    setEditingLeader(null);
  };

  const handleEdit = (leader) => {
    setEditingLeader(leader);
    setFormData({
      name: leader.name,
      mobile: leader.mobile,
      password: leader.password,
      email: leader.email,
      constituency: leader.constituency,
      party: leader.party,
      photo: leader.photo || ""
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this leader?")) {
      try {
        await deleteLeader(id);
        success('Leader deleted successfully!');
        loadLeaders();
      } catch (error) {
        console.error('Error deleting leader:', error);
        error('Failed to delete leader. Please try again.');
      }
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };



  const handleDeletePoll = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this poll?')) {
      try {
        await deletePoll(id);
        success('Poll deleted successfully!');
        loadPolls();
      } catch (error) {
        console.error('Error deleting poll:', error);
        error('Failed to delete poll. Please try again.');
      }
    }
  };

  const copyLink = async (link) => {
    const fullLink = getPollUrl(link);
    try {
      await navigator.clipboard.writeText(fullLink);
      success('Poll link copied to clipboard!');
    } catch (err) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = fullLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      success('Poll link copied to clipboard!');
    }
  };

  const shareWhatsApp = (link) => {
    const fullLink = getPollUrl(link);
    const message = `🗳️ Vote in this poll:\n${fullLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const downloadQR = (linkId) => {
    const svg = document.getElementById(`qr-${linkId}`);
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const url = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `poll-qr-${linkId}.png`;
        link.href = url;
        link.click();
      };
      
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: { text: 'Active', class: 'status-active' },
      scheduled: { text: 'Scheduled', class: 'status-scheduled' },
      expired: { text: 'Expired', class: 'status-expired' },
      closed: { text: 'Closed', class: 'status-closed' }
    };
    const badge = badges[status] || badges.active;
    return <span className={`status-badge ${badge.class}`}>{badge.text}</span>;
  };

  return (
    <div className="admin-dashboard-modern">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-icon">🗳️</span>
            <span className="logo-text">VoteMaster</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <FontAwesomeIcon icon={ICONS.dashboard} className="nav-icon" />
            <span className="nav-text">Dashboard</span>
          </button>
          <button 
            className={`nav-item ${activeTab === 'leaders' ? 'active' : ''}`}
            onClick={() => setActiveTab('leaders')}
          >
            <FontAwesomeIcon icon={ICONS.leaders} className="nav-icon" />
            <span className="nav-text">Leaders</span>
          </button>
          <button 
            className={`nav-item ${activeTab === 'polls' ? 'active' : ''}`}
            onClick={() => setActiveTab('polls')}
          >
            <FontAwesomeIcon icon={ICONS.polls} className="nav-icon" />
            <span className="nav-text">Polls</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <button className="nav-item logout-item" onClick={handleLogout}>
            <FontAwesomeIcon icon={ICONS.logout} className="nav-icon" />
            <span className="nav-text">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {/* Top Bar */}
        <header className="top-bar">
          <div className="page-title">
            <h1>
              {activeTab === 'dashboard' && <><FontAwesomeIcon icon={ICONS.dashboard} /> Dashboard Overview</>}
              {activeTab === 'leaders' && <><FontAwesomeIcon icon={ICONS.leaders} /> Leaders Management</>}
              {activeTab === 'polls' && <><FontAwesomeIcon icon={ICONS.polls} /> Polls Management</>}
            </h1>
            <p className="subtitle">Welcome back, <strong>{user?.name}</strong></p>
          </div>
          <div className="top-bar-actions">
            <div className="user-profile">
              <span className="user-avatar"><FontAwesomeIcon icon={ICONS.user} /></span>
              <div className="user-info">
                <span className="user-name">{user?.name}</span>
                <span className="user-role">Administrator</span>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="dashboard-body">
          {/* Dashboard Overview */}
          {activeTab === 'dashboard' && (
            <div className="dashboard-overview">
              <div className="stats-grid">
                <div className="stat-card-modern primary">
                  <div className="stat-icon"><FontAwesomeIcon icon={ICONS.leaders} /></div>
                  <h3 className="stat-value">{leaders.length}</h3>
                  <p className="stat-label">Total Leaders</p>
                  <span className="stat-trend positive">↑ Active</span>
                </div>
                <div className="stat-card-modern success">
                  <div className="stat-icon"><FontAwesomeIcon icon={ICONS.polls} /></div>
                  <h3 className="stat-value">{polls.length}</h3>
                  <p className="stat-label">Total Polls</p>
                  <span className="stat-trend">All time</span>
                </div>
                <div className="stat-card-modern warning">
                  <div className="stat-icon"><FontAwesomeIcon icon={ICONS.active} /></div>
                  <h3 className="stat-value">{polls.filter(p => p.status === 'active').length}</h3>
                  <p className="stat-label">Active Polls</p>
                  <span className="stat-trend positive">↑ Live now</span>
                </div>
                <div className="stat-card-modern info">
                  <div className="stat-icon"><FontAwesomeIcon icon={ICONS.vote} /></div>
                  <h3 className="stat-value">
                    {polls.reduce((sum, p) => sum + (p.votes ? Object.values(p.votes).reduce((a, b) => a + b, 0) : 0), 0)}
                  </h3>
                  <p className="stat-label">Total Votes</p>
                  <span className="stat-trend positive">↑ Growing</span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="quick-actions">
                <h2 className="section-title">Quick Actions</h2>
                <div className="action-cards">
                  <button className="action-card" onClick={() => { setActiveTab('leaders'); setShowForm(true); }}>
                    <FontAwesomeIcon icon={ICONS.add} className="action-icon" />
                    <h3>Add New Leader</h3>
                    <p>Register a new leader account</p>
                  </button>
                  <button className="action-card" onClick={() => setActiveTab('polls')}>
                    <FontAwesomeIcon icon={ICONS.view} className="action-icon" />
                    <h3>View Analytics</h3>
                    <p>Check poll performance</p>
                  </button>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="recent-activity">
                <h2 className="section-title">Recent Polls</h2>
                <div className="activity-list">
                  {polls.slice(0, 5).map(poll => (
                    <div key={poll.id} className="activity-item">
                      <span className={`status-dot ${poll.status}`}></span>
                      <div className="activity-content">
                        <h4>{poll.question}</h4>
                        <p>{poll.status} • Created {poll.createdAt && !isNaN(new Date(poll.createdAt).getTime()) ? format(new Date(poll.createdAt), 'MMM dd, yyyy') : 'N/A'}</p>
                      </div>
                      <button className="activity-action" onClick={() => { setActiveTab('polls'); }}>
                        View →
                      </button>
                    </div>
                  ))}
                  {polls.length === 0 && <p className="no-data">No polls created yet</p>}
                </div>
              </div>
            </div>
          )}

        {activeTab === 'leaders' && (
          <div className="leaders-section">
          <div className="section-header">
            <h2>Leaders Management</h2>
            <button onClick={() => setShowForm(!showForm)} className="add-btn">
              {showForm ? "Cancel" : "+ Add New Leader"}
            </button>
          </div>

          {showForm && (
            <div className="leader-form-card">
              <h3>{editingLeader ? "Edit Leader" : "Create New Leader"}</h3>
              <form onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Full Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter full name"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Mobile Number *</label>
                    <input
                      type="tel"
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                      placeholder="Enter mobile number"
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="Enter email"
                    />
                  </div>
                  <div className="form-group">
                    <label>Password *</label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Enter password"
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Constituency</label>
                    <input
                      type="text"
                      value={formData.constituency}
                      onChange={(e) => setFormData({ ...formData, constituency: e.target.value })}
                      placeholder="Enter constituency"
                    />
                  </div>
                  <div className="form-group">
                    <label>Party Name</label>
                    <input
                      type="text"
                      value={formData.party}
                      onChange={(e) => setFormData({ ...formData, party: e.target.value })}
                      placeholder="Enter party name"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Photo URL</label>
                  <input
                    type="text"
                    value={formData.photo}
                    onChange={(e) => setFormData({ ...formData, photo: e.target.value })}
                    placeholder="Enter photo URL"
                  />
                </div>

                <div className="form-actions">
                  <button type="submit" className="submit-btn">
                    {editingLeader ? "Update Leader" : "Create Leader"}
                  </button>
                  <button type="button" onClick={resetForm} className="cancel-btn">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="leaders-grid">
            {leaders.length === 0 ? (
              <p className="no-data">No leaders created yet. Click "Add New Leader" to create one.</p>
            ) : (
              leaders.map((leader) => {
                const leaderPolls = polls.filter(p => 
                  p.leaderId === leader.id || 
                  p.createdBy === leader.id ||
                  p.leaderMobile === leader.mobile
                );
                const activeLeaderPolls = leaderPolls.filter(p => p.status === 'active');
                
                return (
                  <div key={leader.id} className="leader-card">
                    {leader.photo && (
                      <img src={leader.photo} alt={leader.name} className="leader-photo" />
                    )}
                    <div className="leader-info">
                      <h3>{leader.name}</h3>
                      <p><strong>Mobile:</strong> {leader.mobile}</p>
                      <p><strong>Email:</strong> {leader.email || "N/A"}</p>
                      <p><strong>Party:</strong> {leader.party || "N/A"}</p>
                      <p><strong>Constituency:</strong> {leader.constituency || "N/A"}</p>
                      <div className="leader-poll-stats">
                        <span className="poll-count">📊 {leaderPolls.length} Polls</span>
                        {activeLeaderPolls.length > 0 && (
                          <span className="active-poll-count">✅ {activeLeaderPolls.length} Active</span>
                        )}
                      </div>
                    </div>
                    <div className="leader-actions">
                      <button 
                        onClick={() => setSelectedLeaderPolls(selectedLeaderPolls === leader.id ? null : leader.id)} 
                        className="preview-btn"
                        disabled={leaderPolls.length === 0}
                      >
                        <FontAwesomeIcon icon={ICONS.view} /> Preview
                      </button>
                      <button onClick={() => handleEdit(leader)} className="edit-btn">
                        <FontAwesomeIcon icon={ICONS.edit} /> Edit
                      </button>
                      <button onClick={() => handleDelete(leader.id)} className="delete-btn">
                        <FontAwesomeIcon icon={ICONS.delete} /> Delete
                      </button>
                    </div>
                    
                    {selectedLeaderPolls === leader.id && leaderPolls.length > 0 && (
                      <div className="leader-polls-preview">
                        <h4>Polls created by {leader.name}:</h4>
                        <div className="preview-polls-list">
                          {leaderPolls.map(poll => (
                            <div key={poll.id} className="preview-poll-item">
                              <div className="preview-poll-header">
                                <span className="preview-poll-question">{poll.question}</span>
                                {getStatusBadge(poll.status)}
                              </div>
                              <div className="preview-poll-meta">
                                <span>📅 {poll.createdAt && !isNaN(new Date(poll.createdAt).getTime()) ? format(new Date(poll.createdAt), 'MMM dd, yyyy') : 'N/A'}</span>
                                <span>🗳️ {poll.votes ? Object.values(poll.votes).reduce((a, b) => a + b, 0) : 0} votes</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
        )}

        {activeTab === 'polls' && (
          <div className="polls-section">
          <div className="section-header">
            <h2>Polls Management</h2>
            <div className="poll-stats-summary">
              <span className="stat-badge">Total: {polls.length}</span>
              <span className="stat-badge active">Active: {polls.filter(p => p.status === 'active').length}</span>
              <span className="stat-badge expired">Expired: {polls.filter(p => p.status === 'expired' || p.status === 'ended').length}</span>
            </div>
          </div>

          <div className="polls-grid">
            {polls.length === 0 ? (
              <p className="no-data">No polls available yet. Leaders can create polls from their dashboard.</p>
            ) : (
              polls.map((poll) => {
                const options = poll.options || [poll.option1, poll.option2];
                const fakeResults = poll.fakeResults || [poll.fakeResultOption1, poll.fakeResultOption2];
                const votes = poll.votes || {};
                const totalVotes = Object.values(votes).reduce((sum, val) => sum + val, 0);
                const analytics = getPollAnalytics(poll.id);

                return (
                  <div key={poll.id} className="poll-card">
                    <div className="poll-header">
                      <div>
                        <h3>{poll.question}</h3>
                        <div className="poll-meta">
                          <span className="poll-type">{poll.inputType}</span>
                          {getStatusBadge(poll.status)}
                        </div>
                      </div>
                    </div>

                    {poll.startDate && !isNaN(new Date(poll.startDate).getTime()) && (
                      <p className="poll-schedule">
                        <strong>Start:</strong> {format(new Date(poll.startDate), 'PPp')}
                      </p>
                    )}
                    {poll.endDate && !isNaN(new Date(poll.endDate).getTime()) && (
                      <p className="poll-schedule">
                        <strong>End:</strong> {format(new Date(poll.endDate), 'PPp')}
                      </p>
                    )}

                    <div className="poll-options">
                      {options.map((opt, idx) => (
                        <p key={idx}><strong>Option {idx + 1}:</strong> {opt}</p>
                      ))}
                    </div>

                    <div className="results-section">
                      <h4>Real Results:</h4>
                      {options.map((opt, idx) => {
                        const optVotes = votes[`option${idx + 1}`] || 0;
                        const percent = totalVotes > 0 ? ((optVotes / totalVotes) * 100).toFixed(1) : 0;
                        return (
                          <div key={idx} className="result-bar">
                            <span>{opt}: {optVotes} votes ({percent}%)</span>
                            <div className="bar">
                              <div className="fill actual" style={{ width: `${percent}%` }}></div>
                            </div>
                          </div>
                        );
                      })}

                      <h4 style={{ marginTop: '15px' }}>Fake Results (Voters see):</h4>
                      {options.map((opt, idx) => {
                        const fakePercent = fakeResults[idx] || 0;
                        return (
                          <div key={idx} className="result-bar">
                            <span>{opt}: {fakePercent}%</span>
                            <div className="bar">
                              <div className="fill fake" style={{ width: `${fakePercent}%` }}></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {analytics && (
                      <div className="analytics-summary">
                        <p><strong>Views:</strong> {analytics.viewCount} | <strong>Votes:</strong> {analytics.totalVotes}</p>
                        <p><strong>Conversion:</strong> {analytics.conversionRate}%</p>
                        <button onClick={() => setShowAnalytics(showAnalytics === poll.id ? null : poll.id)} className="analytics-btn">
                          {showAnalytics === poll.id ? 'Hide' : 'Show'} Analytics
                        </button>
                      </div>
                    )}

                    {showAnalytics === poll.id && analytics && (
                      <div className="analytics-details">
                        {analytics.peakHour && (
                          <>
                            <h4>Peak Hour:</h4>
                            <p>{analytics.peakHour.hour}:00 - {analytics.peakHour.count} votes</p>
                          </>
                        )}
                        {analytics.votesByHour && Object.keys(analytics.votesByHour).length > 0 && (
                          <>
                            <h4>Votes by Hour:</h4>
                            <div className="hour-chart">
                              {Object.entries(analytics.votesByHour).slice(0, 24).map(([hour, count]) => (
                                <div key={hour} className="hour-bar" title={`${hour}:00 - ${count} votes`}>
                                  <div className="bar-fill" style={{ height: `${(count / Math.max(...Object.values(analytics.votesByHour))) * 100}%` }}></div>
                                  <span className="hour-label">{hour}</span>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    <div className="poll-link">
                      <small>Poll Link:</small>
                      <input
                        type="text"
                        readOnly
                        value={getPollUrl(poll.uniqueLink)}
                      />
                      <button onClick={() => copyLink(poll.uniqueLink)} className="copy-btn">
                        📋 Copy
                      </button>
                    </div>

                    <div className="share-section">
                      <button onClick={() => shareWhatsApp(poll.uniqueLink)} className="share-btn whatsapp">
                        WhatsApp
                      </button>
                      <button onClick={() => setShowQR(showQR === poll.id ? null : poll.id)} className="share-btn qr">
                        QR Code
                      </button>
                    </div>

                    {showQR === poll.id && (
                      <div className="qr-section">
                        <QRCodeSVG
                          id={`qr-${poll.uniqueLink}`}
                          value={getPollUrl(poll.uniqueLink)}
                          size={200}
                          level="H"
                          includeMargin={true}
                        />
                        <button onClick={() => downloadQR(poll.uniqueLink)} className="download-qr-btn">
                          Download QR
                        </button>
                      </div>
                    )}

                    <div className="poll-actions">
                      <button onClick={(e) => handleDeletePoll(e, poll.id)} className="delete-btn">Delete</button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
        )}
      </div>
      </main>
      
      {/* Render message boxes */}
      {messages.map(msg => (
        <MessageBox 
          key={msg.id} 
          type={msg.type}
          message={msg.message}
          duration={msg.duration}
          onClose={() => removeMessage(msg.id)} 
        />
      ))}
    </div>
  );
};

export default AdminDashboard;
