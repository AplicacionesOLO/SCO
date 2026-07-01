// =====================================================
// HOOK: useNotifications
// =====================================================
// Hook centralizado para notificaciones multi-módulo.
// Soporta polling, realtime subscriptions, y marca de leídos.

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { notificationService } from '../services/notificationService';
import { useAuth } from './useAuth';
import type { AppNotification } from '../types/notificacion';

const POLL_INTERVAL = 30000; // 30 segundos entre polls

interface UseNotificationsReturn {
  notificaciones: AppNotification[];
  noLeidas: number;
  loading: boolean;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  refetch: () => Promise<void>;
}

export function useNotifications(): UseNotificationsReturn {
  const { permissions, profile, user, isAdmin, isAuthenticated } = useAuth();
  const [notificaciones, setNotificaciones] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const tiendaId = profile?.id ? null : null; // Se obtiene del contexto

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated || !user) return;

    try {
      const notifs = await notificationService.getNotifications(
        permissions,
        isAdmin,
        user.id,
        null
      );
      if (mountedRef.current) {
        setNotificaciones(notifs);
      }
    } catch (err) {
      console.warn('[useNotifications] Error fetching:', err);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [isAuthenticated, user, permissions, isAdmin]);

  // Carga inicial + polling
  useEffect(() => {
    mountedRef.current = true;
    
    if (isAuthenticated) {
      fetchNotifications();
      pollTimerRef.current = setInterval(fetchNotifications, POLL_INTERVAL);
    }

    return () => {
      mountedRef.current = false;
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [isAuthenticated, fetchNotifications]);

  // ─── Realtime: nuevos comentarios ──────────────────
  useEffect(() => {
    if (!isAuthenticated) return;

    const channel = supabase
      .channel('notif-comentarios')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'tarea_comentarios' },
        () => {
          // Refetch al recibir un comentario nuevo
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [isAuthenticated, fetchNotifications]);

  // ─── Realtime: nuevas alertas de inventario ────────
  useEffect(() => {
    if (!isAuthenticated) return;

    const channel = supabase
      .channel('notif-inventario')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'inventario_alertas' },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [isAuthenticated, fetchNotifications]);

  // ─── Realtime: cambios de estado en tareas ─────────
  useEffect(() => {
    if (!isAuthenticated) return;

    const channel = supabase
      .channel('notif-tareas')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tareas' },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [isAuthenticated, fetchNotifications]);

  const noLeidas = notificaciones.filter(n => !n.leida).length;

  const markAsRead = useCallback(async (id: string) => {
    // Optimistic update
    setNotificaciones(prev =>
      prev.map(n => n.id === id ? { ...n, leida: true } : n)
    );
    await notificationService.markAsRead(id);
  }, []);

  const markAllAsRead = useCallback(async () => {
    const ids = notificaciones.filter(n => !n.leida).map(n => n.id);
    // Optimistic update
    setNotificaciones(prev =>
      prev.map(n => ({ ...n, leida: true }))
    );
    await notificationService.markAllAsRead(ids);
  }, [notificaciones]);

  const refetch = useCallback(async () => {
    setLoading(true);
    await fetchNotifications();
  }, [fetchNotifications]);

  return {
    notificaciones,
    noLeidas,
    loading,
    markAsRead,
    markAllAsRead,
    refetch,
  };
}