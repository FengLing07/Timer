export type SessionSource = 'timer' | 'manual' | 'recovered';

/**
 * 一条已完成的学习记录。
 *
 * 所有时长都来自 `endedAt - startedAt` 的时间戳差值，
 * `pausedMs` 只用于展示与审计，真正写库的 `durationMs` 已经把暂停时间扣掉。
 */
export interface StudySession {
  id: string;
  subjectId: string;
  /** 首次点击「开始学习」的时间戳（本段学习第一次开始的时刻） */
  startedAt: number;
  /** 点击「结束学习」的时间戳 */
  endedAt: number;
  /** 有效学习时长 = 各运行分段之和（毫秒） */
  durationMs: number;
  /** 暂停累计时长（毫秒） */
  pausedMs: number;
  /** 本地日期键 YYYY-MM-DD，按天聚合时直接使用，避免时区换算出错 */
  dayKey: string;
  source: SessionSource;
  note: string | null;
  createdAt: number;
}

/** 从计时器结算出来、尚未写入数据库的记录 */
export type SessionDraft = Omit<StudySession, 'id' | 'createdAt'> & {
  id?: string;
  createdAt?: number;
};
