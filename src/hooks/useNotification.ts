import { useState, useCallback } from 'react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';
export type ConfirmationType = 'danger' | 'warning' | 'info';

interface NotificationState {
  isOpen: boolean;
  type: NotificationType;
  title: string;
  message: string;
}

interface ConfirmationState {
  isOpen: boolean;
  type: ConfirmationType;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const useNotification = () => {
  const [notification, setNotification] = useState<NotificationState>({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
  });

  const [confirmation, setConfirmation] = useState<ConfirmationState>({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
    onConfirm: () => {},
    onCancel: () => {},
  });

  const showNotification = useCallback((type: NotificationType, title: string, message: string) => {
    setNotification({
      isOpen: true,
      type,
      title,
      message,
    });
  }, []);

  const showSuccess = useCallback((title: string, message: string) => {
    showNotification('success', title, message);
  }, [showNotification]);

  const showError = useCallback((title: string, message: string) => {
    showNotification('error', title, message);
  }, [showNotification]);

  const showWarning = useCallback((title: string, message: string) => {
    showNotification('warning', title, message);
  }, [showNotification]);

  const showInfo = useCallback((title: string, message: string) => {
    showNotification('info', title, message);
  }, [showNotification]);

  const hideNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, isOpen: false }));
  }, []);

  const showConfirmation = useCallback((
    type: ConfirmationType,
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void
  ) => {
    setConfirmation({
      isOpen: true,
      type,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmation(prev => ({ ...prev, isOpen: false }));
      },
      onCancel: () => {
        if (onCancel) onCancel();
        setConfirmation(prev => ({ ...prev, isOpen: false }));
      },
    });
  }, []);

  const hideConfirmation = useCallback(() => {
    setConfirmation(prev => ({ ...prev, isOpen: false }));
  }, []);

  return {
    notification,
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    hideNotification,
    confirmation,
    showConfirmation,
    hideConfirmation,
  };
};
