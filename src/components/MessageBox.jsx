import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faExclamationCircle, faInfoCircle, faTimesCircle, faTimes } from '@fortawesome/free-solid-svg-icons';
import '../styles/MessageBox.css';

const MessageBox = ({ type = 'info', message, onClose, duration = 4000 }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (duration && duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      if (onClose) onClose();
    }, 300);
  };

  if (!isVisible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return faCheckCircle;
      case 'error':
        return faTimesCircle;
      case 'warning':
        return faExclamationCircle;
      default:
        return faInfoCircle;
    }
  };

  return (
    <div className={`message-box-overlay ${isExiting ? 'exiting' : ''}`}>
      <div className={`message-box ${type} ${isExiting ? 'slide-out' : 'slide-in'}`}>
        <div className="message-icon">
          <FontAwesomeIcon icon={getIcon()} />
        </div>
        <div className="message-content">
          <p>{message}</p>
        </div>
        <button className="message-close" onClick={handleClose}>
          <FontAwesomeIcon icon={faTimes} />
        </button>
      </div>
    </div>
  );
};

export default MessageBox;
