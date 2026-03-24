import React, { useEffect, useState } from 'react';

interface NotificationPopupProps {
  isOpen: boolean;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  onClose: () => void;
  duration?: number;
}

const NotificationPopup: React.FC<NotificationPopupProps> = ({
  isOpen,
  type,
  message,
  onClose,
  duration = 4000,
}) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (isOpen) {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev <= 0) {
            clearInterval(interval);
            onClose();
            return 0;
          }
          return prev - (100 / (duration / 100));
        });
      }, 100);

      return () => clearInterval(interval);
    } else {
      setProgress(100);
    }
  }, [isOpen, duration, onClose]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <i className="ri-checkbox-circle-line text-2xl"></i>;
      case 'error':
        return <i className="ri-close-circle-line text-2xl"></i>;
      case 'warning':
        return <i className="ri-alert-line text-2xl"></i>;
      case 'info':
        return <i className="ri-information-line text-2xl"></i>;
      default:
        return <i className="ri-notification-line text-2xl"></i>;
    }
  };

  const getColors = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          icon: 'text-green-600',
          text: 'text-green-800',
          progress: 'bg-green-600',
        };
      case 'error':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          icon: 'text-red-600',
          text: 'text-red-800',
          progress: 'bg-red-600',
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          icon: 'text-yellow-600',
          text: 'text-yellow-800',
          progress: 'bg-yellow-600',
        };
      case 'info':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          icon: 'text-blue-600',
          text: 'text-blue-800',
          progress: 'bg-blue-600',
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          icon: 'text-gray-600',
          text: 'text-gray-800',
          progress: 'bg-gray-600',
        };
    }
  };

  const colors = getColors();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      {/* Notification Card */}
      <div className="pointer-events-auto animate-[slide-up_0.3s_ease-out]">
        <div className={`${colors.bg} ${colors.border} border rounded-lg shadow-2xl max-w-md w-full mx-4 overflow-hidden`}>
          <div className="flex items-start gap-4 p-6">
            {/* Icon */}
            <div className={`${colors.icon} flex-shrink-0`}>
              {getIcon()}
            </div>

            {/* Message */}
            <div className="flex-1 min-w-0">
              <p className={`${colors.text} text-sm leading-relaxed`}>
                {message}
              </p>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className={`${colors.icon} hover:opacity-70 transition-opacity flex-shrink-0`}
            >
              <i className="ri-close-line text-xl"></i>
            </button>
          </div>

          {/* Progress Bar */}
          <div className="h-1 bg-gray-200">
            <div
              className={`h-full ${colors.progress} transition-all duration-100 ease-linear`}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default NotificationPopup;
