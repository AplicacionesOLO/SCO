import React, { useEffect } from 'react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  type: 'danger' | 'warning' | 'info';
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  type,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <i className="ri-error-warning-line text-4xl"></i>;
      case 'warning':
        return <i className="ri-alert-line text-4xl"></i>;
      case 'info':
        return <i className="ri-information-line text-4xl"></i>;
      default:
        return <i className="ri-question-line text-4xl"></i>;
    }
  };

  const getColors = () => {
    switch (type) {
      case 'danger':
        return {
          icon: 'text-red-600',
          confirmBg: 'bg-red-600 hover:bg-red-700',
          confirmText: 'text-white',
        };
      case 'warning':
        return {
          icon: 'text-yellow-600',
          confirmBg: 'bg-yellow-600 hover:bg-yellow-700',
          confirmText: 'text-white',
        };
      case 'info':
        return {
          icon: 'text-blue-600',
          confirmBg: 'bg-blue-600 hover:bg-blue-700',
          confirmText: 'text-white',
        };
      default:
        return {
          icon: 'text-gray-600',
          confirmBg: 'bg-gray-600 hover:bg-gray-700',
          confirmText: 'text-white',
        };
    }
  };

  const colors = getColors();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      ></div>

      {/* Dialog */}
      <div className="relative bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 animate-[scale-in_0.2s_ease-out]">
        {/* Icon */}
        <div className="flex justify-center pt-8 pb-4">
          <div className={`${colors.icon}`}>
            {getIcon()}
          </div>
        </div>

        {/* Content */}
        <div className="px-8 pb-6 text-center">
          <h3 className="text-xl font-semibold text-gray-900 mb-3">
            {title}
          </h3>
          <p className="text-gray-600 leading-relaxed">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-8 pb-8">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors whitespace-nowrap"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 ${colors.confirmBg} ${colors.confirmText} rounded-lg font-medium transition-colors whitespace-nowrap`}
          >
            {confirmText}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default ConfirmationDialog;
