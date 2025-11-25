// Storage utilities for managing data in localStorage

// Leaders Storage
export const getLeaders = () => {
  const leaders = localStorage.getItem('leaders');
  return leaders ? JSON.parse(leaders) : [];
};

export const saveLeader = (leader) => {
  const leaders = getLeaders();
  const newLeader = {
    ...leader,
    id: Date.now().toString(),
    createdAt: new Date().toISOString()
  };
  leaders.push(newLeader);
  localStorage.setItem('leaders', JSON.stringify(leaders));
  return newLeader;
};

export const updateLeader = (id, updatedData) => {
  const leaders = getLeaders();
  const index = leaders.findIndex(l => l.id === id);
  if (index !== -1) {
    leaders[index] = { ...leaders[index], ...updatedData };
    localStorage.setItem('leaders', JSON.stringify(leaders));
    return leaders[index];
  }
  return null;
};

export const deleteLeader = (id) => {
  const leaders = getLeaders();
  const filtered = leaders.filter(l => l.id !== id);
  localStorage.setItem('leaders', JSON.stringify(filtered));
};

// Polls Storage
export const getPolls = (leaderId = null) => {
  const polls = localStorage.getItem('polls');
  const allPolls = polls ? JSON.parse(polls) : [];
  return leaderId ? allPolls.filter(p => p.leaderId === leaderId) : allPolls;
};

export const savePoll = (poll) => {
  const polls = getPolls();
  
  // Initialize votes object based on number of options
  const votes = {};
  if (poll.options && Array.isArray(poll.options)) {
    poll.options.forEach((_, index) => {
      votes[`option${index + 1}`] = 0;
    });
  } else {
    // Backward compatibility with 2 options
    votes.option1 = 0;
    votes.option2 = 0;
  }
  
  const newPoll = {
    ...poll,
    id: Date.now().toString(),
    uniqueLink: generateUniqueLink(),
    createdAt: new Date().toISOString(),
    votes,
    status: 'active', // active, expired, closed
    viewCount: 0,
    voteHistory: [] // Track votes over time for analytics
  };
  polls.push(newPoll);
  localStorage.setItem('polls', JSON.stringify(polls));
  return newPoll;
};

export const updatePoll = (id, updatedData) => {
  const polls = getPolls();
  const index = polls.findIndex(p => p.id === id);
  if (index !== -1) {
    polls[index] = { ...polls[index], ...updatedData };
    localStorage.setItem('polls', JSON.stringify(polls));
    return polls[index];
  }
  return null;
};

export const getPollByLink = (link) => {
  const polls = getPolls();
  return polls.find(p => p.uniqueLink === link);
};

export const addVote = (pollId, option) => {
  const polls = getPolls();
  const poll = polls.find(p => p.id === pollId);
  if (poll) {
    // Check if poll has expired
    if (poll.endDate && new Date(poll.endDate) < new Date()) {
      poll.status = 'expired';
      localStorage.setItem('polls', JSON.stringify(polls));
      return { error: 'Poll has expired', poll };
    }
    
    // Check if poll has started
    if (poll.startDate && new Date(poll.startDate) > new Date()) {
      return { error: 'Poll has not started yet', poll };
    }
    
    poll.votes[option]++;
    
    // Add to vote history for analytics
    if (!poll.voteHistory) poll.voteHistory = [];
    poll.voteHistory.push({
      option,
      timestamp: new Date().toISOString(),
      hour: new Date().getHours()
    });
    
    localStorage.setItem('polls', JSON.stringify(polls));
    return { success: true, poll };
  }
  return { error: 'Poll not found' };
};

export const deletePoll = (id) => {
  const polls = getPolls();
  const filtered = polls.filter(p => p.id !== id);
  localStorage.setItem('polls', JSON.stringify(filtered));
};

// Generate unique link for polls
const generateUniqueLink = () => {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
};

// Check poll status and update if needed
export const checkPollStatus = (poll) => {
  const now = new Date();
  
  if (poll.endDate && new Date(poll.endDate) < now) {
    return 'expired';
  }
  
  if (poll.startDate && new Date(poll.startDate) > now) {
    return 'scheduled';
  }
  
  return 'active';
};

// Get poll analytics
export const getPollAnalytics = (pollId) => {
  const polls = getPolls();
  const poll = polls.find(p => p.id === pollId);
  
  if (!poll) return null;
  
  const totalVotes = Object.values(poll.votes).reduce((sum, val) => sum + val, 0);
  const voteHistory = poll.voteHistory || [];
  
  // Votes by hour
  const votesByHour = {};
  for (let i = 0; i < 24; i++) {
    votesByHour[i] = 0;
  }
  voteHistory.forEach(vote => {
    if (vote.hour !== undefined) {
      votesByHour[vote.hour]++;
    }
  });
  
  // Votes over time (last 7 days)
  const votesOverTime = [];
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    last7Days.push(dateStr);
    
    const votesOnDay = voteHistory.filter(vote => 
      vote.timestamp.startsWith(dateStr)
    ).length;
    votesOverTime.push({ date: dateStr, votes: votesOnDay });
  }
  
  // Peak voting hour
  const peakHour = Object.entries(votesByHour).reduce((max, [hour, count]) => 
    count > max.count ? { hour: parseInt(hour), count } : max,
    { hour: 0, count: 0 }
  );
  
  return {
    totalVotes,
    votesByHour,
    votesOverTime,
    peakHour,
    averageVotesPerDay: totalVotes / 7,
    viewCount: poll.viewCount || 0,
    conversionRate: poll.viewCount ? ((totalVotes / poll.viewCount) * 100).toFixed(2) : 0
  };
};

// Increment view count
export const incrementViewCount = (pollId) => {
  const polls = getPolls();
  const poll = polls.find(p => p.id === pollId);
  if (poll) {
    poll.viewCount = (poll.viewCount || 0) + 1;
    localStorage.setItem('polls', JSON.stringify(polls));
  }
};

// Initialize sample admin if not exists
export const initializeSampleData = () => {
  const admin = localStorage.getItem('admin');
  if (!admin) {
    localStorage.setItem('admin', JSON.stringify({
      username: 'admin',
      password: 'admin123',
      name: 'Main Admin',
      email: 'admin@votemaster.com'
    }));
  }
};
