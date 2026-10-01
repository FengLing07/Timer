import { create } from 'zustand';

import { getDatabase } from '@/db/client';
import {
  aggregateDailyTotals,
  aggregateSubjectTotals,
  deleteAllSessions,
} from '@/db/sessionRepository';
import { listSubjects, updateWeeklyGoal } from '@/db/subjectRepository';
import type { Subject } from '@/models/subject';
import type { DailyBucket, LibrarySnapshot, LibraryTotals, SubjectStats } from '@/models/stats';
import { buildLibrarySnapshot } from '@/services/statsService';

type LibraryStatus = 'idle' | 'loading' | 'ready' | 'error';

interface LibraryState {
  subjects: Subject[];
  statsBySubject: Record<string, SubjectStats>;
  dailyAll: DailyBucket[];
  totals: LibraryTotals;
  status: LibraryStatus;
  error: string | null;
  /** 上次成功加载的时间戳 */
  loadedAt: number | null;
  load: (options?: { silent?: boolean }) => Promise<void>;
  setWeeklyGoal: (subjectId: string, minutes: number) => Promise<void>;
  resetAllSessions: () => Promise<void>;
}

const EMPTY_TOTALS: LibraryTotals = {
  totalMs: 0,
  last14DaysMs: 0,
  last30DaysMs: 0,
  weekMs: 0,
  monthMs: 0,
  todayMs: 0,
  sessionCount: 0,
};

export const useLibraryStore = create<LibraryState>()((set, get) => ({
  subjects: [],
  statsBySubject: {},
  dailyAll: [],
  totals: EMPTY_TOTALS,
  status: 'idle',
  error: null,
  loadedAt: null,

  load: async (options) => {
    if (!options?.silent) set({ status: 'loading', error: null });
    try {
      const db = await getDatabase();
      const now = Date.now();
      const [subjects, dailyRows, subjectRows] = await Promise.all([
        listSubjects(db),
        aggregateDailyTotals(db),
        aggregateSubjectTotals(db),
      ]);
      const snapshot: LibrarySnapshot = buildLibrarySnapshot(subjects, dailyRows, subjectRows, now);
      set({
        subjects: snapshot.subjects,
        statsBySubject: snapshot.statsBySubject,
        dailyAll: snapshot.dailyAll,
        totals: snapshot.totals,
        status: 'ready',
        error: null,
        loadedAt: now,
      });
    } catch (error) {
      set({
        status: 'error',
        error: error instanceof Error ? error.message : '学习数据加载失败',
      });
    }
  },

  setWeeklyGoal: async (subjectId, minutes) => {
    const db = await getDatabase();
    await updateWeeklyGoal(db, subjectId, minutes);
    await get().load({ silent: true });
  },

  resetAllSessions: async () => {
    const db = await getDatabase();
    await deleteAllSessions(db);
    await get().load({ silent: true });
  },
}));

export function useSubject(subjectId: string | null): Subject | null {
  return useLibraryStore((state) =>
    subjectId ? (state.subjects.find((subject) => subject.id === subjectId) ?? null) : null
  );
}

export function useSubjectStats(subjectId: string | null): SubjectStats | null {
  return useLibraryStore((state) => (subjectId ? (state.statsBySubject[subjectId] ?? null) : null));
}
