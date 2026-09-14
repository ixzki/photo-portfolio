import { LAYOUT_OPTIONS, type Project } from "./types.ts";

export class ProjectEditorError extends Error {
  section: "information" | "pictures" | "settings" | "rows";
  imageId?: string;
  constructor(message: string, section: ProjectEditorError["section"], imageId?: string) {
    super(message); this.name = "ProjectEditorError"; this.section = section; this.imageId = imageId;
  }
}

function photoUrl(value: string, label: string, section: ProjectEditorError["section"], imageId?: string) {
  try {
    const url = new URL(value.trim());
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) throw new Error();
    if (url.hostname.toLowerCase() === "upyun.ixzki.com") url.hostname = "img.ixzki.com";
    return url.href;
  } catch { throw new ProjectEditorError(`请填写${label}的有效图片链接。`, section, imageId); }
}

function dimension(value: number, label: string, section: ProjectEditorError["section"], imageId?: string) {
  if (!Number.isSafeInteger(value) || value < 1 || value > 100000) {
    throw new ProjectEditorError(`${label}的尺寸需要填写 1 至 100000 的整数。`, section, imageId);
  }
  return value;
}

/** Prepare one complete save without mutating the current editing state. */
export function prepareProjectDraft(project: Project): Project {
  if (!project.titleZh.trim()) throw new ProjectEditorError("请填写作品标题。", "information");
  const slug = project.slug.trim();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new ProjectEditorError("网址标识只能使用小写字母、数字和连字符。", "settings");
  if (!Number.isSafeInteger(project.order)) throw new ProjectEditorError("作品排序需要填写整数。", "settings");
  const coverUrl = photoUrl(project.coverUrl, "详情首屏图", "pictures");
  const thumbUrl = photoUrl(project.thumbUrl, "作品列表图", "pictures");
  const featureUrl = photoUrl(project.featureUrl?.trim() || coverUrl, "首页精选图", "pictures");
  const ids = new Set<string>();
  return {
    ...project, titleZh: project.titleZh.trim(), slug, coverUrl, thumbUrl, featureUrl,
    coverW: dimension(project.coverW, "首屏图宽度", "pictures"), coverH: dimension(project.coverH, "首屏图高度", "pictures"),
    thumbW: dimension(project.thumbW, "列表图宽度", "pictures"), thumbH: dimension(project.thumbH, "列表图高度", "pictures"),
    rows: project.rows.map((row, order) => {
      if (!LAYOUT_OPTIONS.some((layout) => layout.value === row.layout)) throw new ProjectEditorError(`第 ${order + 1} 行的版式无效。`, "rows");
      return { ...row, order, images: row.images.map((image, imageOrder) => {
        const label = `第 ${order + 1} 行第 ${imageOrder + 1} 张图片`;
        if (ids.has(image.id)) throw new ProjectEditorError(`${label}重复，请删除后重新添加。`, "rows", image.id);
        ids.add(image.id);
        return { ...image, order: imageOrder, url: photoUrl(image.url, label, "rows", image.id),
          width: dimension(image.width, label, "rows", image.id), height: dimension(image.height, label, "rows", image.id), alt: image.alt || null };
      }) };
    }),
  };
}
