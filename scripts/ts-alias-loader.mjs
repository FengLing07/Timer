/**
 * 只用于本地验证：让 Node 能直接跑 src 下的 TypeScript 模块，
 * 解析 `@/...` 别名以及省略扩展名的相对导入（Metro 支持、Node 原生不支持）。
 * React Native 运行时不会用到这个文件。
 */
const srcRoot = new URL('../src/', import.meta.url);
const EXTENSIONS = ['.ts', '.tsx', '/index.ts', '/index.tsx'];

export async function resolve(specifier, context, nextResolve) {
  let target;
  if (specifier.startsWith('@/')) {
    target = new URL(specifier.slice(2), srcRoot).href;
  } else if (specifier.startsWith('.') && context.parentURL) {
    target = new URL(specifier, context.parentURL).href;
  } else {
    return nextResolve(specifier, context);
  }

  try {
    return await nextResolve(target, context);
  } catch (error) {
    for (const extension of EXTENSIONS) {
      try {
        return await nextResolve(target + extension, context);
      } catch {
        // 尝试下一个候选扩展名
      }
    }
    throw error;
  }
}
