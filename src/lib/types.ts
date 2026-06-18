// ============================================================
// 版式类型说明
// ============================================================
export const LAYOUT_OPTIONS = [
  { value: "landscape", label: "横版全宽", desc: "单张或多张横版图片，每张占满整行宽度，适合展示宽阔的场景" },
  { value: "half", label: "双列并排", desc: "两张图片左右并排各占50%，适合对比或并列展示" },
  { value: "portrait", label: "竖版居中", desc: "竖版图片居中排列，适合竖向构图的肖像或建筑细节" },
  { value: "wrap", label: "自适应换行", desc: "图片自动换行排列，每张占约50%宽度，适合不规则比例混排" },
  { value: "wrap-collage", label: "拼贴换行", desc: "首张占60%宽、其余占40%宽的拼贴式布局，视觉层次丰富" },
  { value: "landscape-collage", label: "横版拼贴", desc: "横版图片纵向堆叠，每张占满宽度，适合全景系列展示" },
] as const;

export type LayoutType = typeof LAYOUT_OPTIONS[number]["value"];

// ============================================================
// 首页精选项
// ============================================================
export interface FeatureItem {
  id: string;
  type: "project" | "image";       // project=带详情页的项目 / image=单张图片
  projectSlug?: string;            // type=project 时关联的项目slug
  projectTitle?: string;           // type=project 时的显示标题(中文)
  projectCoverUrl?: string;        // type=project 时的封面图
  imageUrl?: string;               // type=image 时的图片URL
  imageTitle?: string;             // type=image 时的标题
  order: number;
}

// ============================================================
// 图片
// ============================================================
export interface Image {
  id: string;
  url: string;
  width: number;
  height: number;
  alt: string | null;
  order: number;
}

// ============================================================
// 图片行
// ============================================================
export interface Row {
  id: string;
  layout: LayoutType;
  order: number;
  images: Image[];
}

// ============================================================
// 项目
// ============================================================
export interface Project {
  id: string;
  slug: string;
  createdAt?: string;
  titleZh: string;
  design: string;           // 设计/分类
  city: string;
  time: string;             // 时间（替代了英文标题、年份、状态）
  equipment: string;        // 设备器材
  featureUrl?: string;      // 首页精选图
  coverUrl: string;         // 项目详情首屏大图
  thumbUrl: string;         // works 页面缩略图
  coverW: number;
  coverH: number;
  thumbW: number;
  thumbH: number;
  order: number;
  visible: boolean;
  rows: Row[];
}

// ============================================================
// 媒体库
// ============================================================
export interface MediaItem {
  id: string;
  url: string;
  title: string;
  alt: string | null;
  width: number;
  height: number;
  createdAt: string;
}

// ============================================================
// 网站设置
// ============================================================
export interface SiteSettings {
  id: string;
  siteName: string;
  aboutText: string;        // 合并后的简介（含合作方向）
  email: string;
  location: string;
  contacts: ContactItem[];
  avatarUrl: string;
  faviconUrl: string;
  copyright: string;        // 版权信息
  icp: string;              // 备案号
}

export interface ContactItem {
  id: string;
  label: string;
  value: string;
}
