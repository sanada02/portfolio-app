// src/components/Notification.jsx
import { X, CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';

export default function Notification({ notifications, onRemove }) {
  const getIcon = (type) => {
    switch(type) {
      case 'success':
        return <CheckCircle size={20} color="#10b981" />;
      case 'error':
        return <XCircle size={20} color="#ef4444" />;
      case 'warning':
        return <AlertCircle size={20} color="#f59e0b" />;
      default:
        return <Info size={20} color="#3b82f6" />;
    }
  };

  return (
    <div className="notification-container">
      {notifications.map(notification => (
        <div key={notification.id} className={`notification ${notification.type}`}>
          {getIcon(notification.type)}
          <div className="notification-message">{notification.message}</div>
          <button 
            onClick={() => onRemove(notification.id)}
            style={{ 
              border: 'none', 
              background: 'transparent', 
              cursor: 'pointer',
              color: '#6b7280',
              padding: '0.25rem',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}