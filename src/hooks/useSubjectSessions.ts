import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { getDatabase } from '@/db/client';
import { listSessions } from '@/db/sessionRepository';
import type { StudySession } from '@/models/session';
import { useTimerStore } from '@/store/useTimerStore';

/** 读取某个科目的学习记录（详情页时间线用） */
export function useSubjectSessions(subjectId: string | null, limit = 30) {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(false);
  // 计时结束后自动重新拉一次，时间线里马上能看到新记录
  const timerId = useTimerStore((state) => state.timer?.id ?? null);

  const reload = useCallback(async () => {
    if (!subjectId) {
      setSessions([]);
      return;
    }
    setLoading(true);
    try {
      const db = await getDatabase();
      const rows = await listSessions(db, { subjectId, limit });
      setSessions(rows);
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [subjectId, limit]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  return { sessions, loading, reload, timerId };
}
