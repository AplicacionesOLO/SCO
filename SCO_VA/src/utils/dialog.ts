// ============================================================
//  Sistema global de diálogos  (showAlert / showConfirm)
// ============================================================

export type AlertType = 'success' | 'error' | 'warning' | 'info';
export type ConfirmType = 'danger' | 'warning' | 'info';

export interface AlertOptions {
  type?: AlertType;
  title?: string;
}

export interface ConfirmOptions {
  type?: ConfirmType;
  title?: string;
  confirmText?: string;
  cancelText?: string;
}

// Handlers registrados por GlobalDialogProvider
let _alertHandler: ((msg: string, opts?: AlertOptions) => void) | null = null;
let _confirmHandler: ((msg: string, opts?: ConfirmOptions) => Promise<boolean>) | null = null;

export function registerAlertHandler(fn: typeof _alertHandler): void {
  _alertHandler = fn;
}

export function registerConfirmHandler(fn: typeof _confirmHandler): void {
  _confirmHandler = fn;
}

// ── Auto-detectar tipo de notificación ──────────────────────
function autoAlertType(msg: string): AlertType {
  const lower = msg.toLowerCase();
  if (
    lower.includes('error') ||
    lower.includes('falló') ||
    lower.includes('fallo') ||
    lower.includes('❌') ||
    lower.includes('no se pudo') ||
    lower.includes('problema')
  ) return 'error';
  if (
    lower.includes('exitosamente') ||
    lower.includes('éxito') ||
    lower.includes('exito') ||
    lower.includes('creado') ||
    lower.includes('creada') ||
    lower.includes('guardado') ||
    lower.includes('actualizado') ||
    lower.includes('actualizada') ||
    lower.includes('eliminado') ||
    lower.includes('eliminada') ||
    lower.includes('confirmado') ||
    lower.includes('cancelado') ||
    lower.includes('importad') ||
    lower.includes('completad') ||
    lower.includes('cargado') ||
    lower.includes('✅')
  ) return 'success';
  if (
    lower.includes('advertencia') ||
    lower.includes('cuidado') ||
    lower.includes('⚠️') ||
    lower.includes('no se puede') ||
    lower.includes('revisar')
  ) return 'warning';
  return 'info';
}

// ── Auto-detectar tipo de confirm ───────────────────────────
export function autoConfirmType(msg: string): ConfirmType {
  const lower = msg.toLowerCase();
  if (lower.includes('eliminar') || lower.includes('borrar') || lower.includes('deshacer')) return 'danger';
  return 'warning';
}

// ── Auto-generar título para confirm ───────────────────────
export function autoConfirmTitle(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes('eliminar') || lower.includes('borrar')) return 'Confirmar eliminación';
  if (lower.includes('cancelar')) return 'Confirmar cancelación';
  if (lower.includes('confirmar')) return 'Confirmar acción';
  return '¿Estás seguro?';
}

// ── API pública ─────────────────────────────────────────────

/** Muestra un popup de notificación centrado en pantalla */
export function showAlert(msg: string, options?: AlertOptions): void {
  if (_alertHandler) {
    _alertHandler(msg, options);
  } else {
    window.alert(msg); // fallback si el provider aún no está montado
  }
}

/** Muestra un mini-modal de confirmación y devuelve Promise<boolean> */
export function showConfirm(msg: string, options?: ConfirmOptions): Promise<boolean> {
  if (_confirmHandler) {
    return _confirmHandler(msg, options);
  }
  return Promise.resolve(window.confirm(msg)); // fallback
}

// ── Atajos convenientes ─────────────────────────────────────
export const showSuccess = (msg: string) => showAlert(msg, { type: 'success' });
export const showError   = (msg: string) => showAlert(msg, { type: 'error' });
export const showWarning = (msg: string) => showAlert(msg, { type: 'warning' });
export const showInfo    = (msg: string) => showAlert(msg, { type: 'info' });
