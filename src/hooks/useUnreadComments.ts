import { useState, useCallback, useEffect, useRef } from 'react';

const LS_PREFIX = 'monitor_lv_';

export interface TareaCommentDigest {
  tareaId: string;
  latestCommentAt: string;
  commentCount: number;
}

interface UnreadState {
  ids: Set<string>;
  counts: Map<string, number>;
  total: number;
}

interface UseUnreadCommentsReturn {
  unreadTareaIds: Set<string>;
  unreadCounts: Map<string, number>;
  hasUnread: boolean;
  totalUnread: number;
  markAsRead: (tareaId: string) => void;
  markAllAsRead: () => void;
  getLatestCommentDate: (tareaId: string) => string | null;
}

// ─── Helpers seguros de localStorage ──────────────────

let _lsAvailable: boolean | null = null;

function isLocalStorageAvailable(): boolean {
  if (_lsAvailable !== null) return _lsAvailable;
  try {
    const testKey = '__monitor_ls_test__';
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    _lsAvailable = true;
  } catch {
    _lsAvailable = false;
    console.warn('[useUnreadComments] localStorage no disponible — usando memoria volátil');
  }
  return _lsAvailable;
}

function safeGetItem(key: string, fallbackStore: Map<string, string>): string | null {
  if (isLocalStorageAvailable()) {
    try { return localStorage.getItem(key); } catch { /* fall through */ }
  }
  return fallbackStore.get(key) || null;
}

function safeSetItem(key: string, value: string, fallbackStore: Map<string, string>): void {
  if (isLocalStorageAvailable()) {
    try { localStorage.setItem(key, value); return; } catch { /* fall through */ }
  }
  fallbackStore.set(key, value);
}

// ─── Hook ──────────────────────────────────────────────

export function useUnreadComments(
  userId: string,
  commentDigests: TareaCommentDigest[]
): UseUnreadCommentsReturn {
  const fallbackStoreRef = useRef<Map<string, string>>(new Map());

  const getKey = (tareaId: string) => `${LS_PREFIX}${userId}_${String(tareaId)}`;

  const compute = useCallback((): UnreadState => {
    const ids = new Set<string>();
    const counts = new Map<string, number>();
    let total = 0;

    for (const d of commentDigests) {
      const lastViewed = safeGetItem(getKey(d.tareaId), fallbackStoreRef.current);
      const latestMs = new Date(d.latestCommentAt).getTime();
      const viewedMs = lastViewed ? new Date(lastViewed).getTime() : 0;

      if (latestMs > viewedMs) {
        ids.add(d.tareaId);
        counts.set(d.tareaId, d.commentCount);
        total++;
      }
    }

    return { ids, counts, total };
  }, [userId, commentDigests]);

  const [state, setState] = useState<UnreadState>(compute);

  const prevDigestRef = useRef<string>('');
  const currentDigestStr = JSON.stringify(commentDigests);

  useEffect(() => {
    if (prevDigestRef.current !== currentDigestStr) {
      prevDigestRef.current = currentDigestStr;
      setState(compute());
    }
  }, [currentDigestStr, compute]);

  const persistRead = useCallback((tareaId: string) => {
    const normalizedId = String(tareaId);
    safeSetItem(getKey(normalizedId), new Date().toISOString(), fallbackStoreRef.current);
  }, [userId]);

  const markAsRead = useCallback((tareaId: string) => {
    const normalizedId = String(tareaId);
    persistRead(normalizedId);
    setState(prev => {
      const newIds = new Set(prev.ids);
      newIds.delete(normalizedId);
      const newCounts = new Map(prev.counts);
      newCounts.delete(normalizedId);
      return { ids: newIds, counts: newCounts, total: newIds.size };
    });
  }, [persistRead]);

  const markAllAsRead = useCallback(() => {
    // Usamos el state actual via callback para evitar race conditions
    setState(prev => {
      const now = new Date().toISOString();
      for (const tareaId of prev.ids) {
        safeSetItem(getKey(String(tareaId)), now, fallbackStoreRef.current);
      }
      return { ids: new Set(), counts: new Map(), total: 0 };
    });
  }, [userId]);

  const getLatestCommentDate = useCallback((tareaId: string): string | null => {
    const normalizedId = String(tareaId);
    const digest = commentDigests.find(d => String(d.tareaId) === normalizedId);
    return digest?.latestCommentAt || null;
  }, [commentDigests]);

  return {
    unreadTareaIds: state.ids,
    unreadCounts: state.counts,
    hasUnread: state.total > 0,
    totalUnread: state.total,
    markAsRead,
    markAllAsRead,
    getLatestCommentDate
  };
}