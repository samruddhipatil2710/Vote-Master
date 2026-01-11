import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { db } from '../firebase/config';

// ============================================
// ADMIN FUNCTIONS
// ============================================

export const initializeAdmin = async () => {
  try {
    const adminRef = doc(db, 'users', 'admin');
    const adminSnap = await getDoc(adminRef);
    
    // Always update admin credentials to ensure they match the latest
    const adminData = {
      mobile: '7385711985',
      password: 'password',
      role: 'admin',
      updatedAt: serverTimestamp()
    };
    
    if (!adminSnap.exists()) {
      adminData.createdAt = serverTimestamp();
    }
    
    await setDoc(adminRef, adminData, { merge: true });
    return { mobile: '7385711985', password: 'password', role: 'admin' };
  } catch (error) {
    console.error('Error initializing admin:', error);
    throw error;
  }
};

export const getAdmin = async () => {
  try {
    const adminRef = doc(db, 'users', 'admin');
    const adminSnap = await getDoc(adminRef);
    return adminSnap.exists() ? adminSnap.data() : null;
  } catch (error) {
    console.error('Error getting admin:', error);
    throw error;
  }
};

// ============================================
// LEADER FUNCTIONS
// ============================================

export const saveLeader = async (leader) => {
  try {
    const leaderId = leader.id || `leader_${Date.now()}`;
    const leaderRef = doc(db, 'leaders', leaderId);
    
    const leaderData = {
      ...leader,
      id: leaderId,
      createdAt: leader.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    await setDoc(leaderRef, leaderData);
    return leaderData;
  } catch (error) {
    console.error('Error saving leader:', error);
    throw error;
  }
};

export const getLeaders = async () => {
  try {
    const leadersRef = collection(db, 'leaders');
    const snapshot = await getDocs(leadersRef);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : data.createdAt || Date.now(),
        updatedAt: data.updatedAt?.toMillis ? data.updatedAt.toMillis() : data.updatedAt || Date.now()
      };
    });
  } catch (error) {
    console.error('Error getting leaders:', error);
    return [];
  }
};

export const getLeaderById = async (id) => {
  try {
    const leaderRef = doc(db, 'leaders', id);
    const leaderSnap = await getDoc(leaderRef);
    return leaderSnap.exists() ? { id: leaderSnap.id, ...leaderSnap.data() } : null;
  } catch (error) {
    console.error('Error getting leader:', error);
    return null;
  }
};

export const updateLeader = async (id, updates) => {
  try {
    const leaderRef = doc(db, 'leaders', id);
    await updateDoc(leaderRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error updating leader:', error);
    throw error;
  }
};

export const deleteLeader = async (id) => {
  try {
    const leaderRef = doc(db, 'leaders', id);
    await deleteDoc(leaderRef);
    
    // Delete all polls by this leader
    const pollsRef = collection(db, 'polls');
    const q = query(pollsRef, where('leaderId', '==', id));
    const snapshot = await getDocs(q);
    
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    return true;
  } catch (error) {
    console.error('Error deleting leader:', error);
    throw error;
  }
};

// ============================================
// POLL FUNCTIONS
// ============================================

export const savePoll = async (poll) => {
  try {
    const pollId = poll.id || `poll_${Date.now()}`;
    
    // Use the custom poll name provided by the user
    let uniqueLink = poll.uniqueLink || poll.pollName;
    
    if (!uniqueLink) {
      throw new Error('Poll name is required');
    }
    
    // Check if this poll name already exists (only for new polls)
    if (!poll.id) {
      const pollsRef = collection(db, 'polls');
      const q = query(pollsRef, where('uniqueLink', '==', uniqueLink));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        throw new Error('This poll name is already taken. Please choose a different name.');
      }
    }
    
    const pollRef = doc(db, 'polls', pollId);
    
    const pollData = {
      ...poll,
      id: pollId,
      uniqueLink: uniqueLink,
      votes: poll.votes || {},
      viewCount: poll.viewCount || 0,
      voteHistory: poll.voteHistory || [],
      createdAt: poll.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    await setDoc(pollRef, pollData);
    return pollData;
  } catch (error) {
    console.error('Error saving poll:', error);
    throw error;
  }
};

export const getPolls = async () => {
  try {
    const pollsRef = collection(db, 'polls');
    const snapshot = await getDocs(pollsRef);
    
    const polls = await Promise.all(snapshot.docs.map(async (docSnap) => {
      const data = docSnap.data();
      
      // Generate uniqueLink if missing
      let uniqueLink = data.uniqueLink;
      if (!uniqueLink) {
        uniqueLink = `${docSnap.id}_${Math.random().toString(36).substr(2, 9)}`;
        // Update the document with the new uniqueLink
        await updateDoc(docSnap.ref, { uniqueLink });
      }
      
      return {
        id: docSnap.id,
        ...data,
        uniqueLink,
        createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : data.createdAt || Date.now(),
        updatedAt: data.updatedAt?.toMillis ? data.updatedAt.toMillis() : data.updatedAt || Date.now(),
        startDate: data.startDate || null,
        endDate: data.endDate || null
      };
    }));
    
    return polls;
  } catch (error) {
    console.error('Error getting polls:', error);
    return [];
  }
};

export const getPollById = async (id) => {
  try {
    const pollRef = doc(db, 'polls', id);
    const pollSnap = await getDoc(pollRef);
    
    if (pollSnap.exists()) {
      const data = pollSnap.data();
      
      // Generate uniqueLink if missing
      let uniqueLink = data.uniqueLink;
      const updates = { viewCount: increment(1) };
      
      if (!uniqueLink) {
        uniqueLink = `${pollSnap.id}_${Math.random().toString(36).substr(2, 9)}`;
        updates.uniqueLink = uniqueLink;
      }
      
      // Increment view count and add uniqueLink if needed
      await updateDoc(pollRef, updates);
      
      const pollData = { 
        id: pollSnap.id, 
        ...data, 
        uniqueLink,
        viewCount: (data.viewCount || 0) + 1 
      };
      
      return pollData;
    }
    return null;
  } catch (error) {
    console.error('Error getting poll:', error);
    return null;
  }
};

export const getPollByLink = async (uniqueLink) => {
  try {
    console.log('[getPollByLink] Searching for poll with uniqueLink:', uniqueLink);
    
    const pollsRef = collection(db, 'polls');
    const q = query(pollsRef, where('uniqueLink', '==', uniqueLink));
    const snapshot = await getDocs(q);
    
    console.log('[getPollByLink] Query completed. Found', snapshot.size, 'polls');
    
    if (snapshot.empty) {
      console.log('[getPollByLink] No poll found with uniqueLink. Trying fallback by ID...');
      
      // Try to find by ID as fallback (for old polls without uniqueLink)
      const pollRef = doc(db, 'polls', uniqueLink);
      const pollSnap = await getDoc(pollRef);
      
      if (pollSnap.exists()) {
        console.log('[getPollByLink] Found poll by ID (fallback)');
        const data = pollSnap.data();
        
        // Generate and save uniqueLink
        const newUniqueLink = `${pollSnap.id}_${Math.random().toString(36).substr(2, 9)}`;
        await updateDoc(pollRef, {
          uniqueLink: newUniqueLink,
          viewCount: increment(1)
        });
        
        return {
          id: pollSnap.id,
          ...data,
          uniqueLink: newUniqueLink,
          viewCount: (data.viewCount || 0) + 1
        };
      }
      
      console.error('[getPollByLink] Poll not found by uniqueLink or ID:', uniqueLink);
      
      // Debug: List all polls to help troubleshoot
      const allPollsSnapshot = await getDocs(pollsRef);
      console.log('[getPollByLink] Total polls in database:', allPollsSnapshot.size);
      allPollsSnapshot.forEach(doc => {
        const data = doc.data();
        console.log('[getPollByLink] Poll found:', {
          id: doc.id,
          uniqueLink: data.uniqueLink,
          question: data.question,
          leaderName: data.leaderName
        });
      });
      
      return null;
    }
    
    const pollDoc = snapshot.docs[0];
    const pollData = { id: pollDoc.id, ...pollDoc.data() };
    
    console.log('[getPollByLink] Poll found successfully:', {
      id: pollData.id,
      question: pollData.question,
      uniqueLink: pollData.uniqueLink
    });
    
    // Increment view count
    await updateDoc(pollDoc.ref, {
      viewCount: increment(1)
    });
    
    return { ...pollData, viewCount: (pollData.viewCount || 0) + 1 };
  } catch (error) {
    console.error('[getPollByLink] Error getting poll by link:', error);
    console.error('[getPollByLink] Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    return null;
  }
};

export const getPollsByLeaderId = async (leaderId) => {
  try {
    const pollsRef = collection(db, 'polls');
    const q = query(pollsRef, where('leaderId', '==', leaderId));
    const snapshot = await getDocs(q);
    
    const polls = await Promise.all(snapshot.docs.map(async (docSnap) => {
      const data = docSnap.data();
      
      // Generate uniqueLink if missing
      let uniqueLink = data.uniqueLink;
      if (!uniqueLink) {
        uniqueLink = `${docSnap.id}_${Math.random().toString(36).substr(2, 9)}`;
        // Update the document with the new uniqueLink
        await updateDoc(docSnap.ref, { uniqueLink });
      }
      
      return {
        id: docSnap.id,
        ...data,
        uniqueLink
      };
    }));
    
    return polls;
  } catch (error) {
    console.error('Error getting polls by leader:', error);
    return [];
  }
};

export const updatePoll = async (id, updates) => {
  try {
    const pollRef = doc(db, 'polls', id);
    await updateDoc(pollRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error updating poll:', error);
    throw error;
  }
};

export const deletePoll = async (id) => {
  try {
    const pollRef = doc(db, 'polls', id);
    await deleteDoc(pollRef);
    return true;
  } catch (error) {
    console.error('Error deleting poll:', error);
    throw error;
  }
};

// ============================================
// VOTE FUNCTIONS
// ============================================

export const castVote = async (pollId, option) => {
  try {
    const pollRef = doc(db, 'polls', pollId);
    const pollSnap = await getDoc(pollRef);
    
    if (!pollSnap.exists()) {
      throw new Error('Poll not found');
    }
    
    const pollData = pollSnap.data();
    const votes = pollData.votes || {};
    const voteHistory = pollData.voteHistory || [];
    
    // Update vote count
    votes[option] = (votes[option] || 0) + 1;
    
    // Add to vote history
    const now = new Date();
    voteHistory.push({
      option,
      timestamp: now.toISOString(),
      hour: now.getHours()
    });
    
    await updateDoc(pollRef, {
      votes,
      voteHistory,
      updatedAt: serverTimestamp()
    });
    
    return { votes, voteHistory };
  } catch (error) {
    console.error('Error casting vote:', error);
    throw error;
  }
};

// ============================================
// ANALYTICS FUNCTIONS
// ============================================

export const getPollAnalytics = async (pollId) => {
  try {
    const poll = await getPollById(pollId);
    
    if (!poll) {
      return null;
    }
    
    const votes = poll.votes || {};
    const voteHistory = poll.voteHistory || [];
    const totalVotes = Object.values(votes).reduce((sum, count) => sum + count, 0);
    
    // Calculate hourly stats
    const hourlyStats = {};
    for (let i = 0; i < 24; i++) {
      hourlyStats[i] = 0;
    }
    
    voteHistory.forEach(vote => {
      const hour = vote.hour || new Date(vote.timestamp).getHours();
      hourlyStats[hour] = (hourlyStats[hour] || 0) + 1;
    });
    
    // Find peak hour
    let peakHour = { hour: 0, count: 0 };
    Object.entries(hourlyStats).forEach(([hour, count]) => {
      if (count > peakHour.count) {
        peakHour = { hour: parseInt(hour), count };
      }
    });
    
    return {
      pollId: poll.id,
      question: poll.question,
      totalVotes,
      totalViews: poll.viewCount || 0,
      conversionRate: poll.viewCount > 0 ? ((totalVotes / poll.viewCount) * 100).toFixed(2) : 0,
      votes,
      votesByHour: hourlyStats,
      hourlyStats,
      peakHour,
      voteHistory,
      status: poll.status || 'active'
    };
  } catch (error) {
    console.error('Error getting poll analytics:', error);
    return null;
  }
};

// ============================================
// POLL STATUS CHECKS
// ============================================

export const checkPollStatus = (poll) => {
  if (!poll) return 'unknown';
  
  const now = new Date();
  
  // Check if poll has expiry date
  if (poll.expiryDate) {
    const expiry = new Date(poll.expiryDate);
    if (now > expiry) {
      return 'expired';
    }
  }
  
  // Check if poll has start date
  if (poll.startDate) {
    const start = new Date(poll.startDate);
    if (now < start) {
      return 'scheduled';
    }
  }
  
  // Check if poll has end date
  if (poll.endDate) {
    const end = new Date(poll.endDate);
    if (now > end) {
      return 'ended';
    }
  }
  
  return poll.status || 'active';
};

export const isPollActive = (poll) => {
  const status = checkPollStatus(poll);
  return status === 'active';
};

// ============================================
// USER VOTE TRACKING (Firestore-based)
// ============================================

// Generate a browser fingerprint for tracking votes
const getBrowserFingerprint = () => {
  const nav = window.navigator;
  const screen = window.screen;
  let fingerprint = nav.userAgent + nav.language + screen.colorDepth + screen.width + screen.height;
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'user_' + Math.abs(hash).toString(36);
};

export const hasUserVoted = async (pollId) => {
  try {
    const userId = getBrowserFingerprint();
    const voteRef = doc(db, 'userVotes', `${pollId}_${userId}`);
    const voteSnap = await getDoc(voteRef);
    
    if (voteSnap.exists()) {
      return voteSnap.data();
    }
    return null;
  } catch (error) {
    console.error('Error checking if user voted:', error);
    return null;
  }
};

export const recordUserVote = async (pollId, option) => {
  try {
    const userId = getBrowserFingerprint();
    const voteRef = doc(db, 'userVotes', `${pollId}_${userId}`);
    
    await setDoc(voteRef, {
      pollId,
      userId,
      option,
      votedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error recording user vote:', error);
    throw error;
  }
};
