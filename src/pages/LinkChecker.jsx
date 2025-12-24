import { useState } from 'react';
import { getPollByLink } from '../utils/firebaseStorage';
import '../styles/LinkChecker.css';

const LinkChecker = () => {
    const [linkId, setLinkId] = useState('');
    const [pollData, setPollData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const checkLink = async () => {
        if (!linkId.trim()) {
            setError('Please enter a poll link or name');
            return;
        }

        setLoading(true);
        setError('');
        setPollData(null);

        try {
            // Extract just the link ID from full URL if provided
            let cleanLinkId = linkId.trim();

            // If user pasted full URL, extract the link ID
            if (cleanLinkId.includes('/')) {
                const parts = cleanLinkId.split('/');
                cleanLinkId = parts[parts.length - 1];
            }

            const poll = await getPollByLink(cleanLinkId);

            if (poll) {
                setPollData(poll);
                setError('');
            } else {
                setError('❌ Poll not found. This link does not exist in the database.');
                setPollData(null);
            }
        } catch (err) {
            console.error('Error checking link:', err);
            setError(`Error: ${err.message}`);
            setPollData(null);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            checkLink();
        }
    };

    return (
        <div className="link-checker-container">
            <div className="link-checker-card">
                <div className="link-checker-header">
                    <h1>🔍 Poll Link Checker</h1>
                    <p>Test and verify your poll links</p>
                </div>

                <div className="link-checker-input-section">
                    <label>Enter Poll Link or Name</label>
                    <div className="input-group">
                        <input
                            type="text"
                            value={linkId}
                            onChange={(e) => setLinkId(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="e.g., election-2024 or full URL"
                            className="link-input"
                        />
                        <button
                            onClick={checkLink}
                            disabled={loading}
                            className="check-btn"
                        >
                            {loading ? '🔄 Checking...' : '🔍 Check Link'}
                        </button>
                    </div>
                    <small className="hint">
                        Enter poll name (e.g., "election-2024") or paste full URL
                    </small>
                </div>

                {error && (
                    <div className="error-message">
                        {error}
                    </div>
                )}

                {pollData && (
                    <div className="poll-data-display">
                        <div className="success-message">
                            ✅ Poll Found! Link is working correctly.
                        </div>

                        <div className="data-section">
                            <h3>📋 Poll Information</h3>
                            <div className="data-grid">
                                <div className="data-item">
                                    <span className="label">Poll ID:</span>
                                    <span className="value">{pollData.id}</span>
                                </div>
                                <div className="data-item">
                                    <span className="label">Link/Name:</span>
                                    <span className="value highlight">{pollData.uniqueLink}</span>
                                </div>
                                <div className="data-item">
                                    <span className="label">Question:</span>
                                    <span className="value">{pollData.question}</span>
                                </div>
                                <div className="data-item">
                                    <span className="label">Leader:</span>
                                    <span className="value">{pollData.leaderName}</span>
                                </div>
                                <div className="data-item">
                                    <span className="label">Input Type:</span>
                                    <span className="value">{pollData.inputType}</span>
                                </div>
                                <div className="data-item">
                                    <span className="label">Status:</span>
                                    <span className="value status-active">Active</span>
                                </div>
                            </div>
                        </div>

                        <div className="data-section">
                            <h3>📊 Options</h3>
                            <div className="options-list">
                                {pollData.options?.map((option, index) => (
                                    <div key={index} className="option-item">
                                        <span className="option-number">Option {index + 1}:</span>
                                        <span className="option-text">{option}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="data-section">
                            <h3>🎯 Fake Results (What voters see)</h3>
                            <div className="results-list">
                                {pollData.fakeResults?.map((result, index) => (
                                    <div key={index} className="result-item">
                                        <span className="result-option">{pollData.options[index]}</span>
                                        <span className="result-value">
                                            {pollData.fakeResultMode === 'percentage'
                                                ? `${result}%`
                                                : `${result.toLocaleString()} votes`}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="data-section">
                            <h3>📈 Real Stats</h3>
                            <div className="stats-grid">
                                <div className="stat-card">
                                    <div className="stat-value">{pollData.viewCount || 0}</div>
                                    <div className="stat-label">Views</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-value">
                                        {Object.values(pollData.votes || {}).reduce((sum, v) => sum + v, 0)}
                                    </div>
                                    <div className="stat-label">Votes</div>
                                </div>
                            </div>
                        </div>

                        <div className="data-section">
                            <h3>🔗 Full Poll Link</h3>
                            <div className="link-box">
                                <input
                                    type="text"
                                    value={`${window.location.origin}/${pollData.uniqueLink}`}
                                    readOnly
                                    className="link-display"
                                    onClick={(e) => e.target.select()}
                                />
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(`${window.location.origin}/${pollData.uniqueLink}`);
                                        alert('Link copied to clipboard!');
                                    }}
                                    className="copy-btn-small"
                                >
                                    📋 Copy
                                </button>
                            </div>
                            <button
                                onClick={() => window.open(`/${pollData.uniqueLink}`, '_blank')}
                                className="open-poll-btn"
                            >
                                🚀 Open Poll in New Tab
                            </button>
                        </div>

                        <div className="data-section">
                            <h3>🔧 Technical Details</h3>
                            <div className="technical-details">
                                <pre>{JSON.stringify(pollData, null, 2)}</pre>
                            </div>
                        </div>
                    </div>
                )}

                {!pollData && !error && !loading && (
                    <div className="empty-state">
                        <div className="empty-icon">🔍</div>
                        <h3>No Poll Checked Yet</h3>
                        <p>Enter a poll link above to check if it exists and view its data</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LinkChecker;
