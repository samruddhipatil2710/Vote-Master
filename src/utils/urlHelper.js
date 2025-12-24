/**
 * Get the base URL for the application
 * Automatically uses the current domain (works with Vercel, localhost, etc.)
 * Can be overridden with VITE_APP_URL environment variable
 */
export const getBaseUrl = () => {
  // Check if we have a custom URL configured
  const envUrl = import.meta.env.VITE_APP_URL;
  
  // Use custom URL if provided and not empty
  if (envUrl && envUrl.trim() !== '') {
    return envUrl;
  }
  
  // Use current origin (automatically works on Vercel, localhost, etc.)
  return window.location.origin;
};

/**
 * Generate a full poll URL
 * Now uses cleaner format: domain.com/ram-chate instead of domain.com/poll/random-id
 */
export const getPollUrl = (uniqueLink) => {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/${uniqueLink}`;
};

/**
 * Copy URL to clipboard
 */
export const copyToClipboard = async (text) => {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    }
  } catch (err) {
    console.error('Failed to copy:', err);
    return false;
  }
};
