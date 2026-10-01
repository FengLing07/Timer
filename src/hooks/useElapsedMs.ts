import { useEffect, useState } from 'react';

import { elapsedMs, type ActiveTimer } from '@/services/timerEngine';

/**
 * 显示用的秒表。
 *
 * 注意这不是"计时器"：`setInterval` 只负责触发重渲染，
 * 每一次渲染出的数字仍然由 `now - segmentStartedAt` 现算。
 * 所以掉帧、后台、甚至 App 被杀都不会让时长产生漂移。
 */
export function useElapsedMs(timer: ActiveTimer | null, intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  const timerId = timer?.id ?? null;
  const phase = timer?.phase ?? null;
  const segmentStartedAt = timer?.segmentStartedAt ?? null;

  useEffect(() => {
    if (!timerId) return;
    // 暂停状态下数字不会变，没必要每秒重渲染
    if (phase !== 'running') return;
    // 用 0ms 定时器立刻对齐一次时钟；setState 只在回调里发生，
    // 既避免 effect 内同步 setState，也保证新会话不会先显示 00:00:00
    const align = setTimeout(() => setNow(Date.now()), 0);
    const handle = setInterval(() => setNow(Date.now()), intervalMs);
    return () => {
      clearTimeout(align);
      clearInterval(handle);
    };
  }, [timerId, phase, segmentStartedAt, intervalMs]);

  return timer ? elapsedMs(timer, now) : 0;
}

/** 通用「每隔一段时间更新一次 now」，用于统计页刷新"今天"的归属 */
export function useNow(intervalMs = 30_000, enabled = true): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    const align = setTimeout(() => setNow(Date.now()), 0);
    const handle = setInterval(() => setNow(Date.now()), intervalMs);
    return () => {
      clearTimeout(align);
      clearInterval(handle);
    };
  }, [intervalMs, enabled]);
  return now;
}
