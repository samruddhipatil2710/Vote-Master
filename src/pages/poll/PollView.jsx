import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getPollByLink, castVote, checkPollStatus, hasUserVoted, recordUserVote } from '../../utils/firebaseStorage';
import { formatDistanceToNow } from 'date-fns';
import '../../styles/PollView.css';

const PollView = () => {
  const { linkId } = useParams();
  const [poll, setPoll] = useState(null);
  const [pollStatus, setPollStatus] = useState('active');
  const [selectedOption, setSelectedOption] = useState('');
  const [hasVoted, setHasVoted] = useState(false);
  const [sliderValue, setSliderValue] = useState(55);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [voteError, setVoteError] = useState('');
  const [userVotedOption, setUserVotedOption] = useState(null);

  useEffect(() => {
    const loadPoll = async () => {
      const pollData = await getPollByLink(linkId);
      if (pollData) {
        setPoll(pollData);
        const status = checkPollStatus(pollData);
        setPollStatus(status);
        
        // Check if user has already voted using Firestore
        const voteData = await hasUserVoted(pollData.id);
        if (voteData) {
          setHasVoted(true);
          setUserVotedOption(voteData.option);
        }
        
        // Set default slider value for 10-100 range
        if (pollData.inputType === 'slider') {
          setSliderValue(55); // Middle of 10-100 range
        }
      }
    };
    
    loadPoll();
  }, [linkId]);

  useEffect(() => {
    if (!poll || !poll.endDate) return;

    const updateTimeRemaining = () => {
      const now = new Date();
      const end = new Date(poll.endDate);
      
      if (end > now) {
        const distance = formatDistanceToNow(end, { addSuffix: true });
        setTimeRemaining(`Ends ${distance}`);
      } else {
        setTimeRemaining('Poll has ended');
        setPollStatus('expired');
      }
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [poll]);

  const handleVote = async () => {
    setVoteError('');

    // Check poll status
    if (pollStatus === 'expired') {
      setVoteError('This poll has expired and is no longer accepting votes.');
      return;
    }

    if (pollStatus === 'scheduled') {
      setVoteError(`This poll hasn't started yet. It will begin ${formatDistanceToNow(new Date(poll.startDate), { addSuffix: true })}.`);
      return;
    }

    // Validate selection
    if (!selectedOption && poll.inputType === 'radio') {
      setVoteError('Please select an option');
      return;
    }

    let option;
    if (poll.inputType === 'slider') {
      // Slider value is from 10 to 100
      // Map slider value to available options (usually 2 options)
      const optionsCount = options.length;
      const optionIndex = Math.floor(((sliderValue - 10) / 90) * optionsCount);
      const selectedIndex = Math.min(optionIndex, optionsCount - 1);
      option = `option${selectedIndex + 1}`;
      console.log('Slider calculation:', { sliderValue, optionsCount, optionIndex, selectedIndex, option });
    } else {
      option = selectedOption;
    }

    try {
      console.log('Casting vote with option:', option);
      const result = await castVote(poll.id, option);
      
      // Record vote in Firestore
      await recordUserVote(poll.id, option);

      console.log('Vote recorded, setting state:', { option });
      setHasVoted(true);
      setUserVotedOption(option);
      
      // Update poll with new vote data
      const updatedPoll = await getPollByLink(linkId);
      setPoll(updatedPoll);
      
      console.log('After vote - hasVoted:', true, 'userVotedOption:', option);
    } catch (error) {
      console.error('Error casting vote:', error);
      setVoteError('Failed to submit vote. Please try again.');
    }
  };

  if (!poll) {
    return (
      <div className="poll-view-container">
        <div className="poll-not-found">
          <h2>Poll Not Found</h2>
          <p>This poll link is invalid or has been removed.</p>
        </div>
      </div>
    );
  }

  const options = poll.options || [poll.option1, poll.option2];
  const fakeResults = poll.fakeResults || [poll.fakeResultOption1, poll.fakeResultOption2];
  const fakeResultMode = poll.fakeResultMode || 'percentage';
  const canVote = pollStatus === 'active' && !hasVoted;
  
  console.log('PollView State:', {
    hasVoted,
    userVotedOption,
    options,
    fakeResults
  });

  // Calculate adjusted results to show user's vote
  const getAdjustedResults = () => {
    if (!hasVoted || !userVotedOption) {
      return fakeResults;
    }

    // Find which option the user voted for
    // userVotedOption is in "option1", "option2" format
    let votedOptionIndex = -1;
    
    if (typeof userVotedOption === 'string' && userVotedOption.startsWith('option')) {
      const optionNum = parseInt(userVotedOption.replace('option', ''));
      votedOptionIndex = optionNum - 1;
    } else {
      // Fallback: try to find by text match
      votedOptionIndex = options.findIndex(opt => opt === userVotedOption);
    }
    
    if (votedOptionIndex === -1 || votedOptionIndex >= options.length) {
      return fakeResults;
    }

    if (fakeResultMode === 'percentage') {
      // Calculate adjusted percentages to show user's vote impact
      const voteImpact = 1; // User's vote adds 1% to their chosen option
      
      const adjustedResults = fakeResults.map((percent, idx) => {
        if (idx === votedOptionIndex) {
          // Add 1% to the option they voted for
          return Math.min(percent + voteImpact, 100);
        } else {
          // Reduce other options proportionally
          const reductionPerOption = voteImpact / (options.length - 1);
          return Math.max(percent - reductionPerOption, 0);
        }
      });

      // Ensure total is exactly 100%
      const total = adjustedResults.reduce((sum, val) => sum + val, 0);
      const difference = 100 - total;
      
      if (Math.abs(difference) > 0) {
        // Adjust the voted option to make total exactly 100%
        adjustedResults[votedOptionIndex] += difference;
      }

      // Round all values
      return adjustedResults.map(val => Math.round(val));
    } else {
      // Number mode - add 1 vote to the user's choice
      const adjustedResults = fakeResults.map((votes, idx) => {
        if (idx === votedOptionIndex) {
          return votes + 1;
        }
        return votes;
      });
      return adjustedResults;
    }
  };

  const displayResults = getAdjustedResults();

  return (
    <div className="poll-view-container">
      <div className="poll-view-card">
        <div className="poll-header">
          <h1>Vote Master Poll</h1>
          <p className="leader-name">By: {poll.leaderName}</p>
          {timeRemaining && (
            <p className={`poll-timer ${pollStatus === 'expired' ? 'expired' : ''}`}>
              {timeRemaining}
            </p>
          )}
          {pollStatus === 'scheduled' && poll.startDate && (
            <p className="poll-timer scheduled">
              Starts {formatDistanceToNow(new Date(poll.startDate), { addSuffix: true })}
            </p>
          )}
        </div>

        <div className="poll-question">
          <h2>{poll.question}</h2>
        </div>

        {pollStatus === 'expired' && (
          <div className="poll-status-message expired">
            ⏰ This poll has ended
          </div>
        )}

        {pollStatus === 'scheduled' && (
          <div className="poll-status-message scheduled">
            ⏰ This poll hasn't started yet
          </div>
        )}

        {voteError && (
          <div className="vote-error">
            ⚠️ {voteError}
          </div>
        )}

        {canVote ? (
          <div className="voting-section">
            {poll.inputType === 'radio' ? (
              <div className="radio-options">
                {options.map((opt, index) => (
                  <label 
                    key={index}
                    className={`option-label ${selectedOption === `option${index + 1}` ? 'selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="vote"
                      value={`option${index + 1}`}
                      checked={selectedOption === `option${index + 1}`}
                      onChange={(e) => setSelectedOption(e.target.value)}
                    />
                    <span className="option-text">{opt}</span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="slider-option">
                <div className="slider-question-options">
                  {options.map((opt, index) => {
                    const value = fakeResults[index] || 0;
                    const displayValue = fakeResultMode === 'percentage' 
                      ? `${value}%` 
                      : `${value.toLocaleString()}`;
                    const optionsCount = options.length;
                    const optionIndex = Math.floor(((sliderValue - 10) / 90) * optionsCount);
                    const selectedIndex = Math.min(optionIndex, optionsCount - 1);
                    const isSelected = selectedIndex === index;
                    
                    return (
                      <div key={index} className={`slider-option-item ${isSelected ? 'selected-option' : ''}`}>
                        <div className="option-info">
                          <span className="option-name">{opt}</span>
                          {isSelected && <span className="selection-indicator">✓ Selecting</span>}
                        </div>
                        <span className="option-percent">{displayValue}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="slider-labels">
                  <span>Lower</span>
                  <span className="slider-current-value">
                    {(() => {
                      const optionsCount = options.length;
                      const optionIndex = Math.floor(((sliderValue - 10) / 90) * optionsCount);
                      const selectedIndex = Math.min(optionIndex, optionsCount - 1);
                      return options[selectedIndex];
                    })()}
                  </span>
                  <span>Higher</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={sliderValue}
                  onChange={(e) => setSliderValue(e.target.value)}
                  className="vote-slider"
                />
                <p className="slider-value">
                  Slide to select your choice
                </p>
              </div>
            )}

            <button onClick={handleVote} className="vote-btn">
              Submit Vote
            </button>
          </div>
        ) : hasVoted ? (
          <div className="thank-you">
            <h3>✅ Thank you for voting!</h3>
            <p>Your vote has been recorded.</p>
          </div>
        ) : null}

        <div className="results-display">
          <h3>Current Results:</h3>
          {options.map((opt, index) => {
            const value = displayResults[index] || 0;
            const isUserVote = hasVoted && userVotedOption === `option${index + 1}`;
            
            // Calculate bar width percentage
            let barWidth;
            let displayText;
            
            if (fakeResultMode === 'percentage') {
              barWidth = value;
              displayText = `${value}%`;
            } else {
              // Number mode - calculate percentage for bar width
              const totalVotes = displayResults.reduce((sum, v) => sum + (v || 0), 0);
              barWidth = totalVotes > 0 ? ((value / totalVotes) * 100).toFixed(1) : 0;
              displayText = `${value.toLocaleString()} votes`;
            }
            
            return (
              <div key={index} className={`result-item ${isUserVote ? 'user-voted' : ''}`}>
                <div className="result-header">
                  <span>{opt} {isUserVote && '✓'}</span>
                  <span>{displayText}</span>
                </div>
                <div className="result-bar">
                  <div
                    className="result-fill"
                    style={{ width: `${barWidth}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="poll-footer">
          <p>Powered by Vote Master Admin Panel</p>
        </div>
      </div>
    </div>
  );
};

export default PollView;
