/**
 * Convert a name to a URL-friendly slug
 * Example: "Ram Chate" -> "ram-chate"
 */
export const createSlug = (name) => {
  if (!name || typeof name !== 'string') {
    return '';
  }
  
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')        // Replace spaces with hyphens
    .replace(/[^\w\-]+/g, '')    // Remove all non-word chars except hyphens
    .replace(/\-\-+/g, '-')      // Replace multiple hyphens with single hyphen
    .replace(/^-+/, '')          // Trim hyphens from start
    .replace(/-+$/, '');         // Trim hyphens from end
};

/**
 * Create a unique poll slug using leader name and poll ID
 * Example: "ram-chate-poll-123"
 */
export const createPollSlug = (leaderName, pollId) => {
  const nameSlug = createSlug(leaderName);
  const pollIdShort = pollId.substring(pollId.length - 6); // Last 6 chars for uniqueness
  return `${nameSlug}-${pollIdShort}`;
};

/**
 * Create a leader profile slug
 * Example: "Ram Chate" -> "ram-chate"
 */
export const createLeaderSlug = (leaderName, leaderId) => {
  const nameSlug = createSlug(leaderName);
  // Add a short unique identifier to prevent conflicts
  const uniqueId = leaderId.substring(leaderId.length - 4);
  return `${nameSlug}-${uniqueId}`;
};
