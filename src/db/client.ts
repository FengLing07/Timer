import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { DATABASE_NAME, migrateDatabase } from './schema';

/**
 * 单例数据库连接。
 *
 * 为什么不用 `SQLiteProvider` + `useSQLiteContext`：
 * 计时与通知相关逻辑既要在 React 组件里跑（Zustand store），
 * 也要在 App 被杀后由 Android 的 headless 通知任务里跑。
 * 后者没有 React 树，拿不到 context。统一走这个单例，
 * 前台与后台共享同一个连接（WAL 模式），逻辑只有一份。
 */
let databasePromise: Promise<SQLiteDatabase> | null = null;

export function getDatabase(): Promise<SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = openDatabaseAsync(DATABASE_NAME)
      .then(async (db) => {
        await migrateDatabase(db);
        return db;
      })
      .catch((error: unknown) => {
        // 允许下一次调用重试，而不是永久缓存一个失败的 Promise
        databasePromise = null;
        throw error;
      });
  }
  return databasePromise;
}

/** 仅供测试/调试：关闭并丢弃缓存的连接 */
export async function resetDatabaseConnection(): Promise<void> {
  const pending = databasePromise;
  databasePromise = null;
  if (!pending) return;
  const db = await pending.catch(() => null);
  await db?.closeAsync();
}
