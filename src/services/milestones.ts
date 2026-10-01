import type { Milestone } from '@/models/stats';
import { formatHours } from '@/utils/format';

const MS_PER_HOUR = 3_600_000;

/** 与需求一致的四个里程碑：10 / 50 / 100 / 500 小时 */
export const MILESTONES: Milestone[] = [
  { hours: 10, title: '入门', description: '累计学习满 10 小时' },
  { hours: 50, title: '渐入佳境', description: '累计学习满 50 小时' },
  { hours: 100, title: '学有所成', description: '累计学习满 100 小时' },
  { hours: 500, title: '上岸', description: '累计学习满 500 小时' },
];

export interface MilestoneStatus {
  milestone: Milestone;
  unlocked: boolean;
  /** 0 ~ 1，距离该里程碑的完成度 */
  progress: number;
}

export function evaluateMilestones(totalMs: number): MilestoneStatus[] {
  const hours = totalMs / MS_PER_HOUR;
  return MILESTONES.map((milestone) => {
    const progress = milestone.hours <= 0 ? 1 : Math.min(1, hours / milestone.hours);
    return { milestone, unlocked: hours >= milestone.hours, progress };
  });
}

export function nextMilestone(totalMs: number): Milestone | null {
  const hours = totalMs / MS_PER_HOUR;
  return MILESTONES.find((milestone) => hours < milestone.hours) ?? null;
}

export function milestoneHeadline(totalMs: number): string {
  const next = nextMilestone(totalMs);
  if (!next) return '全部里程碑已解锁，稳住节奏';
  return `距离「${next.title}」还差 ${formatHours(next.hours * MS_PER_HOUR - totalMs)} 小时`;
}
