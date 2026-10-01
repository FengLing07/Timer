/** 封面渐变的三段配色（顶 / 底 / 高光），全部离线生成 */
export type CoverPalette = [string, string, string];

export type SubjectCategory = 'professional' | 'public';

export interface Subject {
  id: string;
  /** 科目名称，例如「数据结构」 */
  name: string;
  /** 副标题，例如「408 统考 · 专业课」 */
  subtitle: string;
  category: SubjectCategory;
  /** 每周目标时长（分钟），用于 Steam 成就式进度条 */
  weeklyGoalMinutes: number;
  /** 可选：本地或远程封面图。未设置时使用程序化渐变封面 */
  coverImage?: string | null;
  palette: CoverPalette;
  /** 封面上的大字，例如 "DS" */
  monogram: string;
  /** 该科目的强调色 */
  accent: string;
  sortOrder: number;
  archived: boolean;
}
