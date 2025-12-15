// src/components/Notification.jsx
import { X } from 'lucide-react';

export default function Notification({ notifications, onRemove }) {
  return (
    <div className="notification-container">
      {notifications.map((notification) => (
        <div key={notification.id} className={`notification notification-${notification.type}`}>
          <div className="notification-content">
            <span className="notification-icon">
              {notification.type === 'success' && '✓'}
              {notification.type === 'error' && '✗'}
              {notification.type === 'warning' && '⚠'}
              {notification.type === 'info' && 'ℹ'}
            </span>
            <span className="notification-message">{notification.message}</span>
          </div>
          <button className="notification-close" onClick={() => onRemove(notification.id)}>
            <X size={18} />
          </button>
        </div>
      ))}
    </div>
  );
}