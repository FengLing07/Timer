import type { Subject } from '@/models/subject';

/**
 * 初始科目库。
 *
 * `palette` 用来离线生成 Steam 游戏封面风格的渐变图，不需要任何图片资源。
 * 想换成真实封面时，只要给 `coverImage` 填一个本地 require 出来的资源地址或 file:// 路径，
 * `<SubjectCover />` 会自动优先渲染图片。
 */
export const SEED_SUBJECTS: Subject[] = [
  {
    id: 'data-structure',
    name: '数据结构',
    subtitle: '408 统考 · 专业课',
    category: 'professional',
    weeklyGoalMinutes: 600,
    palette: ['#1B3A33', '#0F201C', '#6FBFA8'],
    monogram: 'DS',
    accent: '#6FBFA8',
    sortOrder: 1,
    archived: false,
    coverImage: null,
  },
  {
    id: 'operating-system',
    name: '操作系统',
    subtitle: '408 统考 · 专业课',
    category: 'professional',
    weeklyGoalMinutes: 480,
    palette: ['#2C2745', '#161327', '#9C8FC7'],
    monogram: 'OS',
    accent: '#9C8FC7',
    sortOrder: 2,
    archived: false,
    coverImage: null,
  },
  {
    id: 'computer-network',
    name: '计算机网络',
    subtitle: '408 统考 · 专业课',
    category: 'professional',
    weeklyGoalMinutes: 420,
    palette: ['#1F3341', '#101C24', '#7FA8C9'],
    monogram: 'CN',
    accent: '#7FA8C9',
    sortOrder: 3,
    archived: false,
    coverImage: null,
  },
  {
    id: 'advanced-math',
    name: '高等数学',
    subtitle: '数学一 · 公共课',
    category: 'public',
    weeklyGoalMinutes: 720,
    palette: ['#3A2A12', '#1D1508', '#D9A96B'],
    monogram: 'MATH',
    accent: '#D9A96B',
    sortOrder: 4,
    archived: false,
    coverImage: null,
  },
  {
    id: 'english',
    name: '英语',
    subtitle: '英语一 · 公共课',
    category: 'public',
    weeklyGoalMinutes: 420,
    palette: ['#33202A', '#1A1016', '#C98A9E'],
    monogram: 'EN',
    accent: '#C98A9E',
    sortOrder: 5,
    archived: false,
    coverImage: null,
  },
  {
    id: 'politics',
    name: '政治',
    subtitle: '思想政治理论 · 公共课',
    category: 'public',
    weeklyGoalMinutes: 300,
    palette: ['#33221A', '#1A110C', '#C98A72'],
    monogram: 'PO',
    accent: '#C98A72',
    sortOrder: 6,
    archived: false,
    coverImage: null,
  },
];

export const SUBJECT_IDS = SEED_SUBJECTS.map((s) => s.id);
