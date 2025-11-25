import { useState } from 'react';

export const useMessageBox = () => {
  const [messages, setMessages] = useState([]);

  const showMessage = (type, message, duration = 4000) => {
    const id = Date.now();
    setMessages(prev => [...prev, { id, type, message, duration }]);
    
    setTimeout(() => {
      setMessages(prev => prev.filter(msg => msg.id !== id));
    }, duration + 500);
  };

  const success = (message, duration) => showMessage('success', message, duration);
  const error = (message, duration) => showMessage('error', message, duration);
  const warning = (message, duration) => showMessage('warning', message, duration);
  const info = (message, duration) => showMessage('info', message, duration);

  const removeMessage = (id) => {
    setMessages(prev => prev.filter(msg => msg.id !== id));
  };

  return {
    messages,
    success,
    error,
    warning,
    info,
    removeMessage
  };
};
