import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getPollsByLeaderId, savePoll, deletePoll, updatePoll, checkPollStatus, getPollAnalytics } from '../../utils/firebaseStorage';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartLine, faClipboardList, faCheckCircle, faCalendarAlt, faClock, faChartBar, faSignOutAlt, faPlus, faTimes, faEdit, faTrash, faCopy, faQrcode, faDownload, faEye, faVoteYea } from '@fortawesome/free-solid-svg-icons';
import { faWhatsapp, faFacebook, faTwitter } from '@fortawesome/free-brands-svg-icons';
import { useMessageBox } from '../../hooks/useMessageBox';
import MessageBox from '../../components/MessageBox';
import { getPollUrl } from '../../utils/urlHelper';
import '../../styles/LeaderDashboard.css';

const LeaderDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { messages, success, error, warning, removeMessage } = useMessageBox();
  const [polls, setPolls] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingPoll, setEditingPoll] = useState(null);
  const [showQR, setShowQR] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(null);
  const [pollAnalytics, setPollAnalytics] = useState({});
  const [showShareModal, setShowShareModal] = useState(null);
  const [expandedPoll, setExpandedPoll] = useState(null);
  const [optionCount, setOptionCount] = useState(2);
  const [activeTab, setActiveTab] = useState('overview');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [formData, setFormData] = useState({
    question: '',
    pollName: '',
    options: ['', ''],
    inputType: 'radio',
    fakeResults: [50, 50],
    fakeResultMode: 'percentage',
    startDate: null,
    endDate: null,
    enableExpiry: false
  });

  useEffect(() => {
    loadPolls();
    const interval = setInterval(loadPolls, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const loadPolls = async () => {
    const userPolls = await getPollsByLeaderId(user.id);
    // Update poll statuses
    const updatedPolls = userPolls.map(poll => ({
      ...poll,
      status: checkPollStatus(poll)
    }));
    setPolls(updatedPolls);
  };

  const addOption = () => {
    if (optionCount < 10) {
      const newCount = optionCount + 1;
      setOptionCount(newCount);
      const newOptions = [...formData.options, ''];
      const newFakeResults = [...formData.fakeResults, 0];
      // Distribute percentages equally
      const equalPercent = Math.floor(100 / newCount);
      const distributed = newFakeResults.map(() => equalPercent);
      distributed[0] += 100 - (equalPercent * newCount); // Add remainder to first option
      setFormData({
        ...formData,
        options: newOptions,
        fakeResults: distributed
      });
    }
  };

  const removeOption = (index) => {
    if (optionCount > 2) {
      const newOptions = formData.options.filter((_, i) => i !== index);
      const newFakeResults = formData.fakeResults.filter((_, i) => i !== index);
      setOptionCount(optionCount - 1);
      // Redistribute percentages
      const total = newFakeResults.reduce((sum, val) => sum + val, 0);
      const adjusted = newFakeResults.map(val => Math.round((val / total) * 100));
      setFormData({
        ...formData,
        options: newOptions,
        fakeResults: adjusted
      });
    }
  };

  const updateOption = (index, value) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
  };

  const updateFakeResult = (index, value) => {
    const newFakeResults = [...formData.fakeResults];
    newFakeResults[index] = parseInt(value) || 0;
    setFormData({ ...formData, fakeResults: newFakeResults });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate poll name
    if (!formData.pollName || formData.pollName.trim() === '') {
      warning('Please provide a poll name');
      return;
    }

    // Validate options
    const validOptions = formData.options.filter(opt => opt.trim() !== '');
    if (validOptions.length < 2) {
      warning('Please provide at least 2 options');
      return;
    }

    // Validate fake results
    if (formData.fakeResultMode === 'percentage') {
      const totalPercent = formData.fakeResults.reduce((sum, val) => sum + val, 0);
      if (totalPercent !== 100) {
        warning('Fake results must total 100%');
        return;
      }
    } else {
      // For number mode, just check all values are non-negative
      const hasNegative = formData.fakeResults.some(val => val < 0);
      if (hasNegative) {
        warning('Vote numbers cannot be negative');
        return;
      }
    }

    const pollData = {
      question: formData.question,
      pollName: formData.pollName.trim(),
      options: validOptions,
      inputType: formData.inputType,
      fakeResults: formData.fakeResults.slice(0, validOptions.length),
      fakeResultMode: formData.fakeResultMode,
      leaderId: user.id,
      leaderName: user.name,
      startDate: formData.startDate ? formData.startDate.toISOString() : null,
      endDate: formData.enableExpiry && formData.endDate ? formData.endDate.toISOString() : null
    };

    try {
      if (editingPoll) {
        await updatePoll(editingPoll.id, pollData);
        success('Poll updated successfully!');
      } else {
        await savePoll(pollData);
        success('Poll created successfully!');
      }

      resetForm();
      loadPolls();
    } catch (error) {
      console.error('Error saving poll:', error);
      error('Failed to save poll. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      question: '',
      pollName: '',
      options: ['', ''],
      inputType: 'radio',
      fakeResults: [50, 50],
      fakeResultMode: 'percentage',
      startDate: null,
      endDate: null,
      enableExpiry: false
    });
    setOptionCount(2);
    setShowForm(false);
    setEditingPoll(null);
  };

  const handleEdit = (poll) => {
    setEditingPoll(poll);
    const options = poll.options || [poll.option1, poll.option2];
    const fakeResults = poll.fakeResults || [poll.fakeResultOption1, poll.fakeResultOption2];
    setOptionCount(options.length);
    setFormData({
      question: poll.question,
      pollName: poll.uniqueLink || '',
      options: options,
      inputType: poll.inputType,
      fakeResults: fakeResults,
      fakeResultMode: poll.fakeResultMode || 'percentage',
      startDate: poll.startDate ? new Date(poll.startDate) : null,
      endDate: poll.endDate ? new Date(poll.endDate) : null,
      enableExpiry: !!poll.endDate
    });
    setShowForm(true);
  };

  const handleDelete = async (pollId) => {
    setDeleteConfirm(pollId);
  };

  const confirmDelete = async () => {
    if (deleteConfirm) {
      try {
        await deletePoll(deleteConfirm);
        success('Poll deleted successfully!');
        setDeleteConfirm(null);
        loadPolls();
      } catch (err) {
        console.error('Error deleting poll:', err);
        error('Failed to delete poll. Please try again.');
      }
    }
  };

  const cancelDelete = () => {
    setDeleteConfirm(null);
  };

  const copyLink = async (link) => {
    const fullLink = getPollUrl(link);
    try {
      await navigator.clipboard.writeText(fullLink);
      success('Poll link copied to clipboard!');
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = fullLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      success('Poll link copied to clipboard!');
    }
  };

  const openShareModal = (pollId) => {
    setShowShareModal(pollId);
  };

  const closeShareModal = () => {
    setShowShareModal(null);
  };

  const shareWhatsApp = (link, question) => {
    const fullLink = getPollUrl(link);
    const message = `🗳️ Vote in this poll: ${question}\n${fullLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const shareFacebook = (link) => {
    const fullLink = getPollUrl(link);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fullLink)}`, '_blank');
  };

  const shareTwitter = (link, question) => {
    const fullLink = getPollUrl(link);
    const text = `🗳️ Vote on: ${question}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(fullLink)}`, '_blank');
  };

  const shareReddit = (link, question) => {
    const fullLink = getPollUrl(link);
    window.open(`https://reddit.com/submit?url=${encodeURIComponent(fullLink)}&title=${encodeURIComponent(question)}`, '_blank');
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

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getFilteredPolls = () => {
    if (activeTab === 'overview' || activeTab === 'polls') return polls;
    if (activeTab === 'active') return polls.filter(p => p.status === 'active');
    if (activeTab === 'scheduled') return polls.filter(p => p.status === 'scheduled');
    if (activeTab === 'expired') return polls.filter(p => p.status === 'expired');
    if (activeTab === 'analytics') return polls.filter(p => (p.viewCount || 0) > 0);
    return polls;
  };

  const loadPollAnalytics = async (pollId) => {
    const data = await getPollAnalytics(pollId);
    setPollAnalytics(prev => ({ ...prev, [pollId]: data }));
  };

  const toggleAnalytics = (pollId) => {
    if (showAnalytics === pollId) {
      setShowAnalytics(null);
    } else {
      setShowAnalytics(pollId);
      if (!pollAnalytics[pollId]) {
        loadPollAnalytics(pollId);
      }
    }
  };

  const togglePollExpand = (pollId) => {
    setExpandedPoll(expandedPoll === pollId ? null : pollId);
  };

  const renderPollCard = (poll) => {
    const options = poll.options || [poll.option1, poll.option2];
    const fakeResults = poll.fakeResults || [poll.fakeResultOption1, poll.fakeResultOption2];
    const votes = poll.votes || {};
    const totalVotes = Object.values(votes).reduce((sum, val) => sum + val, 0);
    const analytics = pollAnalytics[poll.id];
    const isExpanded = expandedPoll === poll.id;

    // Debug: Log poll uniqueLink to help diagnose URL issues
    if (!poll.uniqueLink) {
      console.warn('[LeaderDashboard] Poll missing uniqueLink:', {
        pollId: poll.id,
        question: poll.question,
        pollData: poll
      });
    }

    return (
      <div key={poll.id} className={`poll-card-compact ${isExpanded ? 'expanded' : ''}`}>
        {/* Compact Header - Always Visible */}
        <div className="poll-card-compact-header" onClick={() => togglePollExpand(poll.id)}>
          <div className="poll-compact-info">
            <h3 className="poll-compact-title">{poll.question}</h3>
            <div className="poll-compact-stats">
              {getStatusBadge(poll.status)}
              <span className="compact-stat">
                <FontAwesomeIcon icon={faEye} /> {poll.viewCount || 0}
              </span>
              <span className="compact-stat">
                <FontAwesomeIcon icon={faVoteYea} /> {totalVotes}
              </span>
            </div>
          </div>
          <div className="poll-card-actions">
            <button
              className="quick-action-btn edit-quick-btn"
              onClick={(e) => { e.stopPropagation(); handleEdit(poll); }}
              title="Edit Poll"
            >
              <FontAwesomeIcon icon={faEdit} />
            </button>
            <button
              className="expand-toggle-btn"
              onClick={(e) => { e.stopPropagation(); togglePollExpand(poll.id); }}
            >
              <FontAwesomeIcon icon={isExpanded ? faTimes : faChartBar} />
            </button>
          </div>
        </div>

        {/* Expanded Details - Show only when expanded */}
        {isExpanded && (
          <div className="poll-card-expanded-content">
            {poll.startDate && (
              <p className="poll-schedule">
                <strong>Start:</strong> {format(new Date(poll.startDate), 'PPp')}
              </p>
            )}
            {poll.endDate && (
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
              <div className="results-header">
                <h4>📊 Real Results</h4>
                <span className="results-badge private">🔒 Private - Only you can see</span>
              </div>
              {options.map((opt, idx) => {
                const optVotes = votes[`option${idx + 1}`] || 0;
                const percent = totalVotes > 0 ? ((optVotes / totalVotes) * 100).toFixed(1) : 0;
                return (
                  <div key={idx} className="result-item-modern">
                    <div className="result-label-row">
                      <span className="result-option-name">{opt}</span>
                      <span className="result-stats">
                        <strong>{optVotes}</strong> votes · <strong>{percent}%</strong>
                      </span>
                    </div>
                    <div className="result-bar-modern">
                      <div className="result-fill-modern actual" style={{ width: `${percent}%` }}>
                        {percent > 5 && <span className="result-percent-label">{percent}%</span>}
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="results-header" style={{ marginTop: '24px' }}>
                <h4>👁️ Public Results</h4>
                <span className="results-badge public">🌍 Public - Voters see this</span>
              </div>
              {options.map((opt, idx) => {
                const fakeValue = fakeResults[idx] || 0;
                const fakeResultMode = poll.fakeResultMode || 'percentage';

                // Calculate display values
                let displayValue, barWidth;
                if (fakeResultMode === 'percentage') {
                  displayValue = `${fakeValue}%`;
                  barWidth = fakeValue;
                } else {
                  // Number mode
                  const totalFakeVotes = fakeResults.reduce((sum, v) => sum + (v || 0), 0);
                  const percentage = totalFakeVotes > 0 ? ((fakeValue / totalFakeVotes) * 100).toFixed(1) : 0;
                  displayValue = `${fakeValue.toLocaleString()} votes`;
                  barWidth = percentage;
                }

                return (
                  <div key={idx} className="result-item-modern">
                    <div className="result-label-row">
                      <span className="result-option-name">{opt}</span>
                      <span className="result-stats">
                        <strong>{displayValue}</strong>
                      </span>
                    </div>
                    <div className="result-bar-modern">
                      <div className="result-fill-modern fake" style={{ width: `${barWidth}%` }}>
                        {barWidth > 5 && <span className="result-percent-label">{displayValue}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="analytics-summary">
              <p><strong>👁️ Views:</strong> {poll.viewCount || 0}</p>
              <p><strong>🗳️ Votes:</strong> {totalVotes}</p>
              <p><strong>📊 Conversion Rate:</strong> {poll.viewCount > 0 ? ((totalVotes / poll.viewCount) * 100).toFixed(1) : 0}%</p>
              <button onClick={() => toggleAnalytics(poll.id)} className="analytics-btn">
                {showAnalytics === poll.id ? 'Hide' : 'Show'} Analytics
              </button>
            </div>

            {showAnalytics === poll.id && (
              <div className="analytics-details">
                {!analytics && <p style={{ textAlign: 'center', padding: '20px' }}>Loading analytics...</p>}
                {analytics && analytics.peakHour && analytics.peakHour.count > 0 && (
                  <>
                    <h4>Peak Hour:</h4>
                    <p>{analytics.peakHour.hour}:00 - {analytics.peakHour.count} votes</p>
                  </>
                )}
                {analytics && analytics.votesByHour && Object.keys(analytics.votesByHour).length > 0 && (
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
                {analytics && (!analytics.voteHistory || analytics.voteHistory.length === 0) && (
                  <p style={{ textAlign: 'center', padding: '20px', color: '#666' }}>No vote data available yet</p>
                )}
              </div>
            )}

            <div className="poll-link">
              <small>Poll Link:</small>
              <input
                type="text"
                readOnly
                value={poll.uniqueLink ? getPollUrl(poll.uniqueLink) : 'Error: Poll link not generated'}
                style={!poll.uniqueLink ? { color: 'red', fontStyle: 'italic' } : {}}
              />
              <button
                onClick={() => copyLink(poll.uniqueLink)}
                className="copy-btn"
                disabled={!poll.uniqueLink}
              >
                Copy
              </button>
            </div>

            <div className="share-section">
              <button onClick={() => openShareModal(poll.id)} className="share-btn-modern">
                <FontAwesomeIcon icon={faQrcode} />
                Share Poll
              </button>
            </div>

            <div className="poll-actions">
              <button onClick={(e) => { e.stopPropagation(); handleEdit(poll); }} className="edit-btn">
                <FontAwesomeIcon icon={faEdit} /> Edit
              </button>
              <button onClick={(e) => { e.stopPropagation(); handleDelete(poll.id); }} className="delete-btn">
                <FontAwesomeIcon icon={faTrash} /> Delete
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const totalVotes = polls.reduce((sum, p) => {
    const votes = p.votes;
    if (typeof votes === 'object') {
      return sum + Object.values(votes).reduce((s, v) => s + v, 0);
    }
    return sum;
  }, 0);

  return (
    <div className="leader-dashboard">
      {/* Sidebar */}
      <aside className="leader-sidebar">
        <div className="sidebar-header-leader">
          <div className="sidebar-logo-leader">🗳️</div>
          <div className="sidebar-title-leader">
            <h1>Vote Master</h1>
            <p>Leader Panel</p>
          </div>
        </div>

        <nav className="sidebar-nav-leader">
          <button
            className={`nav-item-leader ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <FontAwesomeIcon icon={faChartLine} className="nav-icon" />
            <span className="nav-text">Overview</span>
          </button>
          <button
            className={`nav-item-leader ${activeTab === 'polls' ? 'active' : ''}`}
            onClick={() => setActiveTab('polls')}
          >
            <FontAwesomeIcon icon={faClipboardList} className="nav-icon" />
            <span className="nav-text">My Polls</span>
          </button>
          <button
            className={`nav-item-leader ${activeTab === 'active' ? 'active' : ''}`}
            onClick={() => setActiveTab('active')}
          >
            <FontAwesomeIcon icon={faCheckCircle} className="nav-icon" />
            <span className="nav-text">Active Polls</span>
            <span className="badge-count">{polls.filter(p => p.status === 'active').length}</span>
          </button>
          <button
            className={`nav-item-leader ${activeTab === 'scheduled' ? 'active' : ''}`}
            onClick={() => setActiveTab('scheduled')}
          >
            <FontAwesomeIcon icon={faCalendarAlt} className="nav-icon" />
            <span className="nav-text">Scheduled</span>
            <span className="badge-count">{polls.filter(p => p.status === 'scheduled').length}</span>
          </button>
          <button
            className={`nav-item-leader ${activeTab === 'expired' ? 'active' : ''}`}
            onClick={() => setActiveTab('expired')}
          >
            <FontAwesomeIcon icon={faClock} className="nav-icon" />
            <span className="nav-text">Expired</span>
            <span className="badge-count">{polls.filter(p => p.status === 'expired').length}</span>
          </button>
          <button
            className={`nav-item-leader ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <FontAwesomeIcon icon={faChartBar} className="nav-icon" />
            <span className="nav-text">Analytics</span>
          </button>
        </nav>

        <div className="sidebar-footer-leader">
          <div className="user-info-leader">
            <div className="user-avatar-leader">👤</div>
            <div className="user-details-leader">
              <p className="user-name-leader">{user?.name}</p>
              <p className="user-role-leader">Poll Leader</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="leader-main-content">
        {/* Top Bar */}
        <div className="leader-topbar">
          <div className="topbar-left-leader">
            <h1>Leader Dashboard</h1>
            <p>Welcome, {user?.name}</p>
          </div>
          <button onClick={handleLogout} className="logout-btn">
            <FontAwesomeIcon icon={faSignOutAlt} /> Logout
          </button>
        </div>

        {/* Content Wrapper */}
        <div className="leader-content-wrapper">
          <div className="dashboard-content">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <>
                <div className="stats-section">
                  <div className="stat-card stat-card-modern blue">
                    <div className="stat-card-header">
                      <div className="stat-icon-wrapper blue">
                        <FontAwesomeIcon icon={faClipboardList} className="stat-icon" />
                      </div>
                    </div>
                    <div className="stat-card-body">
                      <h3 className="stat-value">{polls.length}</h3>
                      <p className="stat-label">Total Polls</p>
                      <span className="stat-trend">All time</span>
                    </div>
                  </div>
                  <div className="stat-card stat-card-modern green">
                    <div className="stat-card-header">
                      <div className="stat-icon-wrapper green">
                        <FontAwesomeIcon icon={faCheckCircle} className="stat-icon" />
                      </div>
                    </div>
                    <div className="stat-card-body">
                      <h3 className="stat-value">{polls.filter(p => p.status === 'active').length}</h3>
                      <p className="stat-label">Active Polls</p>
                      <span className="stat-trend positive">↑ Live now</span>
                    </div>
                  </div>
                  <div className="stat-card stat-card-modern orange">
                    <div className="stat-card-header">
                      <div className="stat-icon-wrapper orange">
                        <FontAwesomeIcon icon={faVoteYea} className="stat-icon" />
                      </div>
                    </div>
                    <div className="stat-card-body">
                      <h3 className="stat-value">{totalVotes}</h3>
                      <p className="stat-label">Total Votes</p>
                      <span className="stat-trend positive">↑ Growing</span>
                    </div>
                  </div>
                  <div className="stat-card stat-card-modern purple">
                    <div className="stat-card-header">
                      <div className="stat-icon-wrapper purple">
                        <FontAwesomeIcon icon={faCalendarAlt} className="stat-icon" />
                      </div>
                    </div>
                    <div className="stat-card-body">
                      <h3 className="stat-value">{polls.filter(p => p.status === 'scheduled').length}</h3>
                      <p className="stat-label">Scheduled</p>
                      <span className="stat-trend">Upcoming</span>
                    </div>
                  </div>
                </div>

                {/* Quick Stats Bar - StrawPoll Style */}
                <div className="quick-stats-bar">
                  <div className="quick-stat-item">
                    <FontAwesomeIcon icon={faEye} />
                    <span className="quick-stat-value">{polls.reduce((sum, p) => sum + (p.viewCount || 0), 0).toLocaleString()}</span>
                    <span className="quick-stat-label">Total Views</span>
                  </div>
                  <div className="quick-stat-divider"></div>
                  <div className="quick-stat-item">
                    <FontAwesomeIcon icon={faVoteYea} />
                    <span className="quick-stat-value">{totalVotes.toLocaleString()}</span>
                    <span className="quick-stat-label">Total Votes</span>
                  </div>
                  <div className="quick-stat-divider"></div>
                  <div className="quick-stat-item">
                    <span className="quick-stat-value">
                      {polls.reduce((sum, p) => sum + (p.viewCount || 0), 0) > 0
                        ? ((totalVotes / polls.reduce((sum, p) => sum + (p.viewCount || 0), 0)) * 100).toFixed(1)
                        : '0'}%
                    </span>
                    <span className="quick-stat-label">Avg. Response Rate</span>
                  </div>
                </div>
              </>
            )}

            {/* Polls Tab */}
            {(activeTab === 'polls' || activeTab === 'overview') && (
              <>

                <div className="polls-section">
                  <div className="section-header">
                    <h2>My Polls</h2>
                    <button onClick={() => setShowForm(!showForm)} className="add-btn-modern">
                      <FontAwesomeIcon icon={showForm ? faTimes : faPlus} />
                      {showForm ? 'Cancel' : 'Create Poll'}
                    </button>
                  </div>

                  {showForm && (
                    <div className="poll-form-card">
                      <h3>{editingPoll ? 'Edit Poll' : 'Create New Poll'}</h3>
                      <form onSubmit={handleSubmit}>
                        <div className="form-group">
                          <label>Poll Question *</label>
                          <input
                            type="text"
                            value={formData.question}
                            onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                            placeholder="Enter your poll question"
                            required
                          />
                        </div>

                        <div className="form-group">
                          <label>Poll Name (URL) *</label>
                          <input
                            type="text"
                            value={formData.pollName || ''}
                            onChange={(e) => {
                              const value = e.target.value
                                .toLowerCase()
                                .replace(/\s+/g, '-')
                                .replace(/[^\w\-]+/g, '')
                                .replace(/\-\-+/g, '-');
                              setFormData({ ...formData, pollName: value });
                            }}
                            placeholder="e.g., election-2024, favorite-movie"
                            required
                          />
                          <small style={{ color: '#666', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                            This will be your poll link: <strong>{window.location.host}/{formData.pollName || 'your-poll-name'}</strong>
                          </small>
                        </div>

                        <div className="form-group">
                          <label>Number of Options ({optionCount}/10)</label>
                          <div className="option-controls">
                            <button type="button" onClick={addOption} disabled={optionCount >= 10}>
                              + Add Option
                            </button>
                          </div>
                        </div>

                        {formData.options.map((option, index) => (
                          <div key={index} className="option-input-group">
                            <label>Option {index + 1} *</label>
                            <div className="option-input-row">
                              <input
                                type="text"
                                value={option}
                                onChange={(e) => updateOption(index, e.target.value)}
                                placeholder={`Enter option ${index + 1}`}
                                required
                              />
                              {optionCount > 2 && (
                                <button type="button" onClick={() => removeOption(index)} className="remove-btn">

                                </button>
                              )}
                            </div>
                          </div>
                        ))}

                        <div className="form-group">
                          <label>Input Type</label>
                          <select
                            value={formData.inputType}
                            onChange={(e) => setFormData({ ...formData, inputType: e.target.value })}
                          >
                            <option value="radio">Radio Button</option>
                            <option value="slider">Slider</option>
                          </select>
                        </div>

                        <div className="form-group">
                          <label>
                            <input
                              type="checkbox"
                              checked={formData.enableExpiry}
                              onChange={(e) => setFormData({ ...formData, enableExpiry: e.target.checked })}
                            />
                            {' '}Enable Poll Scheduling/Expiry
                          </label>
                        </div>

                        {formData.enableExpiry && (
                          <div className="form-row">
                            <div className="form-group">
                              <label>Start Date (Optional)</label>
                              <DatePicker
                                selected={formData.startDate}
                                onChange={(date) => setFormData({ ...formData, startDate: date })}
                                showTimeSelect
                                dateFormat="Pp"
                                placeholderText="Select start date/time"
                                className="date-input"
                              />
                            </div>
                            <div className="form-group">
                              <label>End Date</label>
                              <DatePicker
                                selected={formData.endDate}
                                onChange={(date) => setFormData({ ...formData, endDate: date })}
                                showTimeSelect
                                dateFormat="Pp"
                                placeholderText="Select end date/time"
                                minDate={formData.startDate || new Date()}
                                className="date-input"
                              />
                            </div>
                          </div>
                        )}

                        <div className="fake-results-section">
                          <h4>Set Fake Results (What voters will see)</h4>
                          <div className="fake-result-mode-selector">
                            <label>
                              <input
                                type="radio"
                                name="fakeResultMode"
                                value="percentage"
                                checked={formData.fakeResultMode === 'percentage'}
                                onChange={(e) => setFormData({ ...formData, fakeResultMode: e.target.value })}
                              />
                              {' '}Show as Percentage (%)
                            </label>
                            <label>
                              <input
                                type="radio"
                                name="fakeResultMode"
                                value="number"
                                checked={formData.fakeResultMode === 'number'}
                                onChange={(e) => setFormData({ ...formData, fakeResultMode: e.target.value })}
                              />
                              {' '}Show as Vote Count (Numbers)
                            </label>
                          </div>

                          <div className="fake-results-inputs">
                            {formData.options.length > 0 ? (
                              formData.options.map((option, index) => {
                                // Show input for all options, use placeholder text if option is empty
                                const displayText = option && option.trim() ? option : `Option ${index + 1}`;

                                return (
                                  <div key={index} className="fake-result-input-row">
                                    <div className="fake-result-option-info">
                                      <span className="fake-result-option-number">Option {index + 1}</span>
                                      <label className="fake-result-label">
                                        {displayText}
                                      </label>
                                    </div>
                                    <div className="fake-result-input-group">
                                      <input
                                        type="number"
                                        min="0"
                                        max={formData.fakeResultMode === 'percentage' ? "100" : undefined}
                                        step="1"
                                        value={formData.fakeResults[index] || 0}
                                        onChange={(e) => updateFakeResult(index, e.target.value)}
                                        placeholder={formData.fakeResultMode === 'number' ? 'e.g., 5000, 10000' : '0-100'}
                                        className="fake-result-input"
                                      />
                                      <span className="fake-result-display">
                                        {formData.fakeResultMode === 'percentage'
                                          ? `${formData.fakeResults[index] || 0}%`
                                          : `${(formData.fakeResults[index] || 0).toLocaleString()} votes`}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
                                Add options above to set fake results
                              </p>
                            )}
                          </div>

                          <p className="hint">
                            {formData.fakeResultMode === 'percentage' ? (
                              <>
                                Total: {formData.fakeResults.reduce((s, v) => s + v, 0)}%
                                {formData.fakeResults.reduce((s, v) => s + v, 0) !== 100 && ' (Must equal 100%)'}
                              </>
                            ) : (
                              <>
                                Total votes shown: {formData.fakeResults.reduce((s, v) => s + v, 0).toLocaleString()}
                              </>
                            )}
                          </p>
                        </div>

                        <div className="form-actions">
                          <button type="submit" className="submit-btn">
                            {editingPoll ? 'Update Poll' : 'Create Poll'}
                          </button>
                          <button type="button" onClick={resetForm} className="cancel-btn">
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  <div className="polls-grid">
                    {getFilteredPolls().length === 0 ? (
                      <p className="no-data">No polls created yet. Click "Create New Poll" to start.</p>
                    ) : (
                      getFilteredPolls().map((poll) => renderPollCard(poll))
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Active Polls Tab */}
            {activeTab === 'active' && (
              <div className="polls-section">
                <div className="section-header">
                  <h2>Active Polls</h2>
                </div>
                <div className="polls-grid">
                  {getFilteredPolls().length === 0 ? (
                    <p className="no-data">No active polls at the moment.</p>
                  ) : (
                    getFilteredPolls().map((poll) => renderPollCard(poll))
                  )}
                </div>
              </div>
            )}

            {/* Scheduled Tab */}
            {activeTab === 'scheduled' && (
              <div className="polls-section">
                <div className="section-header">
                  <h2>Scheduled Polls</h2>
                </div>
                <div className="polls-grid">
                  {getFilteredPolls().length === 0 ? (
                    <p className="no-data">No scheduled polls.</p>
                  ) : (
                    getFilteredPolls().map((poll) => renderPollCard(poll))
                  )}
                </div>
              </div>
            )}

            {/* Expired Tab */}
            {activeTab === 'expired' && (
              <div className="polls-section">
                <div className="section-header">
                  <h2>Expired Polls</h2>
                </div>
                <div className="polls-grid">
                  {getFilteredPolls().length === 0 ? (
                    <p className="no-data">No expired polls.</p>
                  ) : (
                    getFilteredPolls().map((poll) => renderPollCard(poll))
                  )}
                </div>
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div className="polls-section">
                <div className="section-header">
                  <h2>Poll Analytics</h2>
                </div>
                <div className="analytics-overview">
                  <div className="analytics-stats">
                    <div className="analytics-stat-card">
                      <h3>Total Views</h3>
                      <p className="big-number">{polls.reduce((sum, p) => sum + (p.viewCount || 0), 0)}</p>
                    </div>
                    <div className="analytics-stat-card">
                      <h3>Total Votes</h3>
                      <p className="big-number">{totalVotes}</p>
                    </div>
                    <div className="analytics-stat-card">
                      <h3>Avg. Conversion</h3>
                      <p className="big-number">
                        {(() => {
                          if (polls.length === 0) return '0';
                          const totalViews = polls.reduce((sum, p) => sum + (p.viewCount || 0), 0);
                          if (totalViews === 0) return '0';
                          return ((totalVotes / totalViews) * 100).toFixed(1);
                        })()}%
                      </p>
                    </div>
                    <div className="analytics-stat-card">
                      <h3>Best Performing</h3>
                      <p className="big-number">{polls.length > 0 ?
                        (() => {
                          const bestPoll = polls.reduce((max, p) => {
                            const pVotes = Object.values(p.votes || {}).reduce((s, v) => s + v, 0);
                            const maxVotes = Object.values(max.votes || {}).reduce((s, v) => s + v, 0);
                            return pVotes > maxVotes ? p : max;
                          }, polls[0]);
                          const bestVotes = Object.values(bestPoll.votes || {}).reduce((s, v) => s + v, 0);
                          return `${bestVotes} votes`;
                        })()
                        : 'N/A'}
                      </p>
                      {polls.length > 0 && (
                        <p style={{ fontSize: '12px', marginTop: '5px', color: '#666' }}>
                          {polls.reduce((max, p) => {
                            const pVotes = Object.values(p.votes || {}).reduce((s, v) => s + v, 0);
                            const maxVotes = Object.values(max.votes || {}).reduce((s, v) => s + v, 0);
                            return pVotes > maxVotes ? p : max;
                          }, polls[0]).question.substring(0, 40)}{polls.reduce((max, p) => {
                            const pVotes = Object.values(p.votes || {}).reduce((s, v) => s + v, 0);
                            const maxVotes = Object.values(max.votes || {}).reduce((s, v) => s + v, 0);
                            return pVotes > maxVotes ? p : max;
                          }, polls[0]).question.length > 40 ? '...' : ''}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

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

      {/* Delete confirmation dialog */}
      {deleteConfirm && (
        <div className="confirm-dialog-overlay">
          <div className="confirm-dialog">
            <h3>Confirm Delete</h3>
            <p>Are you sure you want to delete this poll?</p>
            <div className="confirm-actions">
              <button onClick={confirmDelete} className="confirm-btn">OK</button>
              <button onClick={cancelDelete} className="cancel-btn">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Professional Share Modal - StrawPoll Style */}
      {showShareModal && (() => {
        const poll = polls.find(p => p.id === showShareModal);
        if (!poll) return null;
        const pollLink = getPollUrl(poll.uniqueLink);

        return (
          <div className="share-modal-overlay" onClick={closeShareModal}>
            <div className="share-modal" onClick={(e) => e.stopPropagation()}>
              <div className="share-modal-header">
                <div className="share-modal-icon">🔗</div>
                <h2>Share Poll</h2>
                <button onClick={closeShareModal} className="share-modal-close">
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              </div>

              <div className="share-modal-body">
                {/* Share via Link */}
                <div className="share-section-modal">
                  <h3>📋 Share via link</h3>
                  <p className="share-description">Use this link to share the poll with your participants.</p>
                  <div className="share-link-input">
                    <input
                      type="text"
                      value={pollLink}
                      readOnly
                      onClick={(e) => e.target.select()}
                    />
                    <button onClick={() => copyLink(poll.uniqueLink)} className="copy-link-btn">
                      <FontAwesomeIcon icon={faCopy} /> Copy
                    </button>
                  </div>
                </div>

                {/* Share on Social Media */}
                <div className="share-section-modal">
                  <h3>🌐 Share on social media</h3>
                  <p className="share-description">Share this poll with friends & followers on social media channels.</p>
                  <div className="social-share-buttons">
                    <button
                      onClick={() => { shareWhatsApp(poll.uniqueLink, poll.question); closeShareModal(); }}
                      className="social-btn whatsapp-btn"
                    >
                      <FontAwesomeIcon icon={faWhatsapp} /> WhatsApp
                    </button>
                    <button
                      onClick={() => { shareTwitter(poll.uniqueLink, poll.question); closeShareModal(); }}
                      className="social-btn twitter-btn"
                    >
                      <FontAwesomeIcon icon={faTwitter} /> Twitter
                    </button>
                    <button
                      onClick={() => { shareFacebook(poll.uniqueLink); closeShareModal(); }}
                      className="social-btn facebook-btn"
                    >
                      <FontAwesomeIcon icon={faFacebook} /> Facebook
                    </button>
                    <button
                      onClick={() => { shareReddit(poll.uniqueLink, poll.question); closeShareModal(); }}
                      className="social-btn reddit-btn"
                    >
                      Reddit
                    </button>
                  </div>
                </div>

                {/* Share with Live Audience */}
                <div className="share-section-modal">
                  <h3>👥 Share with live audience</h3>
                  <p className="share-description">Easy access for your live audience while sharing your screen.</p>
                  <div className="live-share-buttons">
                    <button
                      onClick={() => setShowQR(showQR === poll.id ? null : poll.id)}
                      className="live-btn qr-btn"
                    >
                      <FontAwesomeIcon icon={faQrcode} /> QR Code
                    </button>
                    <button
                      onClick={() => window.open(pollLink, '_blank')}
                      className="live-btn preview-btn"
                    >
                      <FontAwesomeIcon icon={faEye} /> Preview Poll
                    </button>
                  </div>

                  {showQR === poll.id && (
                    <div className="qr-display">
                      <QRCodeSVG
                        id={`qr-${poll.uniqueLink}`}
                        value={pollLink}
                        size={200}
                        level="H"
                        includeMargin={true}
                      />
                      <button onClick={() => downloadQR(poll.uniqueLink)} className="download-qr-btn-modern">
                        <FontAwesomeIcon icon={faDownload} /> Download QR Code
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="share-modal-footer">
                <button onClick={closeShareModal} className="close-modal-btn">Close</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default LeaderDashboard;
