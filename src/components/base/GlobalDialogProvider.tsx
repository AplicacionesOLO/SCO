import { useState, useEffect, useCallback } from 'react';
import NotificationPopup from './NotificationPopup';
import ConfirmationDialog from './ConfirmationDialog';
import {
  registerAlertHandler,
  registerConfirmHandler,
  autoConfirmType,
  autoConfirmTitle,
  type AlertOptions,
  type AlertType,
  type ConfirmOptions,
  type ConfirmType,
} from '../../utils/dialog';

interface AlertState {
  isOpen: boolean;
  message: string;
  type: AlertType;
}

interface ConfirmState {
  isOpen: boolean;
  message: string;
  title: string;
  type: ConfirmType;
  confirmText: string;
  cancelText: string;
  resolve: ((value: boolean) => void) | null;
}

function autoAlertType(msg: string): AlertType {
  const lower = msg.toLowerCase();
  if (lower.includes('error') || lower.includes('falló') || lower.includes('fallo') || lower.includes('❌') || lower.includes('no se pudo')) return 'error';
  if (
    lower.includes('exitosamente') || lower.includes('éxito') || lower.includes('exito') ||
    lower.includes('creado') || lower.includes('creada') || lower.includes('guardado') ||
    lower.includes('actualizado') || lower.includes('actualizada') || lower.includes('eliminado') ||
    lower.includes('eliminada') || lower.includes('confirmado') || lower.includes('cancelado') ||
    lower.includes('importad') || lower.includes('completad') || lower.includes('cargado') || lower.includes('✅')
  ) return 'success';
  if (lower.includes('advertencia') || lower.includes('⚠️') || lower.includes('no se puede') || lower.includes('revisar')) return 'warning';
  return 'info';
}

export default function GlobalDialogProvider() {
  const [alertState, setAlertState] = useState<AlertState>({
    isOpen: false,
    message: '',
    type: 'info',
  });

  const [confirmState, setConfirmState] = useState<ConfirmState>({
    isOpen: false,
    message: '',
    title: '',
    type: 'warning',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    resolve: null,
  });

  const handleShowAlert = useCallback((msg: string, opts?: AlertOptions) => {
    setAlertState({
      isOpen: true,
      message: msg,
      type: opts?.type ?? autoAlertType(msg),
    });
  }, []);

  const handleShowConfirm = useCallback((msg: string, opts?: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        message: msg,
        title: opts?.title ?? autoConfirmTitle(msg),
        type: opts?.type ?? autoConfirmType(msg),
        confirmText: opts?.confirmText ?? 'Confirmar',
        cancelText: opts?.cancelText ?? 'Cancelar',
        resolve,
      });
    });
  }, []);

  useEffect(() => {
    registerAlertHandler(handleShowAlert);
    registerConfirmHandler(handleShowConfirm);
  }, [handleShowAlert, handleShowConfirm]);

  const closeAlert = useCallback(() => {
    setAlertState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const handleConfirmYes = useCallback(() => {
    const resolver = confirmState.resolve;
    setConfirmState((prev) => ({ ...prev, isOpen: false, resolve: null }));
    resolver?.(true);
  }, [confirmState.resolve]);

  const handleConfirmNo = useCallback(() => {
    const resolver = confirmState.resolve;
    setConfirmState((prev) => ({ ...prev, isOpen: false, resolve: null }));
    resolver?.(false);
  }, [confirmState.resolve]);

  return (
    <>
      <NotificationPopup
        isOpen={alertState.isOpen}
        type={alertState.type}
        message={alertState.message}
        onClose={closeAlert}
        duration={4000}
      />
      <ConfirmationDialog
        isOpen={confirmState.isOpen}
        type={confirmState.type}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        onConfirm={handleConfirmYes}
        onCancel={handleConfirmNo}
      />
    </>
  );
}
