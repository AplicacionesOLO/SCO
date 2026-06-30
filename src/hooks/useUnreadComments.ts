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
  getLatestCommentDate: (tareaId: string) => string | null;
}

export function useUnreadComments(
  userId: string,
  commentDigests: TareaCommentDigest[]
): UseUnreadCommentsReturn {
  const getKey = (tareaId: string) => `${LS_PREFIX}${userId}_${tareaId}`;

  const compute = useCallback((): UnreadState => {
    const ids = new Set<string>();
    const counts = new Map<string, number>();
    let total = 0;

    for (const d of commentDigests) {
      const lastViewed = localStorage.getItem(getKey(d.tareaId));
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

  const markAsRead = useCallback((tareaId: string) => {
    localStorage.setItem(getKey(tareaId), new Date().toISOString());
    setState(prev => {
      const newIds = new Set(prev.ids);
      newIds.delete(tareaId);
      const newCounts = new Map(prev.counts);
      newCounts.delete(tareaId);
      return { ids: newIds, counts: newCounts, total: newIds.size };
    });
  }, [userId]);

  const getLatestCommentDate = useCallback((tareaId: string): string | null => {
    const digest = commentDigests.find(d => d.tareaId === tareaId);
    return digest?.latestCommentAt || null;
  }, [commentDigests]);

  return {
    unreadTareaIds: state.ids,
    unreadCounts: state.counts,
    hasUnread: state.total > 0,
    totalUnread: state.total,
    markAsRead,
    getLatestCommentDate
  };
}