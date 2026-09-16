"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminImageField from "./AdminImageField";
import AdminProjectRowsEditor from "./AdminProjectRowsEditor";
import { prepareProjectDraft, ProjectEditorError } from "@/lib/project-editor";
import type { Project, Row } from "@/lib/types";
import styles from "./AdminProjectEditor.module.css";

export default function AdminProjectEditor({ initial, readOnly, isFeatured }: { initial: Project; readOnly: boolean; isFeatured: boolean }) {
  const router = useRouter();
  const [project, setProject] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [focusImageId, setFocusImageId] = useState<string>();
  const [focusRequest, setFocusRequest] = useState(0);
  const busy = useRef(false);
  const isDirty = useRef(false);
  const sections = useRef(new Map<string, HTMLElement>());
  const locked = readOnly || saving;
  const imageCount = project.rows.reduce((sum, row) => sum + row.images.length, 0);

  useEffect(() => { isDirty.current = dirty; }, [dirty]);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => { if (isDirty.current) event.preventDefault(); };
    const navigate = (event: MouseEvent) => {
      const anchor = (event.target as Element).closest("a[href]") as HTMLAnchorElement | null;
      if (!isDirty.current || !anchor || anchor.target === "_blank" || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (new URL(anchor.href).pathname === location.pathname && new URL(anchor.href).hash) return;
      if (!confirm("作品有尚未保存的更改，确定离开？")) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", navigate, true);
    return () => { window.removeEventListener("beforeunload", beforeUnload); document.removeEventListener("click", navigate, true); };
  }, []);

  const update = useCallback((change: (current: Project) => Project) => {
    if (readOnly || busy.current) return;
    setProject(change); isDirty.current = true; setDirty(true); setMessage("");
  }, [readOnly]);
  const updateRows = useCallback((change: (rows: Row[]) => Row[]) => update((current) => ({ ...current, rows: change(current.rows) })), [update]);
  function field<K extends keyof Project>(key: K, value: Project[K]) { update((current) => ({ ...current, [key]: value })); }
  function notice(text: string, failure = false) { setMessage(text); setError(failure); }
  const rowNotice = useCallback((text: string) => { setMessage(text); setError(false); }, []);
  function openSection(id: string) {
    const section = sections.current.get(id);
    if (section instanceof HTMLDetailsElement) section.open = true;
    section?.scrollIntoView({ block: "start", behavior: "instant" });
  }
  function updateCover(src: string) {
    update((current) => ({ ...current, coverUrl: src,
      featureUrl: !current.featureUrl || current.featureUrl === current.coverUrl ? src : current.featureUrl }));
  }
  const handleSave = useCallback(async () => {
    if (busy.current || readOnly || !isDirty.current) return;
    let payload: Project;
    try { payload = prepareProjectDraft(project); }
    catch (cause) {
      if (cause instanceof ProjectEditorError) { openSection(cause.section); setFocusImageId(cause.imageId); setFocusRequest((value) => value + 1); }
      notice(cause instanceof Error ? cause.message : "请检查作品内容。", true); return;
    }
    busy.current = true; setSaving(true); setMessage("");
    try {
      const response = await fetch(`/api/projects?id=${encodeURIComponent(project.id)}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "保存失败，请稍后重试。当前更改仍保留在编辑器中。");
      if (!data?.id) throw new Error("未收到保存结果，请确认网络后重试。");
      setProject(data); setSaved(data); setDirty(false); isDirty.current = false; setFocusImageId(undefined);
      notice(data.visible ? "作品已保存，展示页面已更新。" : "草稿已保存，作品暂未公开。");
      if (data.slug !== saved.slug) router.replace(`/admin/projects/${data.slug}`);
      router.refresh();
    } catch (cause) { notice(cause instanceof Error ? cause.message : "网络异常，当前更改已保留，请重试。", true); }
    finally { busy.current = false; setSaving(false); }
  }, [project, readOnly, router, saved.slug]);

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") { event.preventDefault(); void handleSave(); }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [handleSave]);

  async function deleteProject() {
    if (locked || busy.current || !confirm(`确定删除“${saved.titleZh}”？作品及关联的首页精选将被删除。`)) return;
    busy.current = true; setSaving(true);
    try {
      const response = await fetch(`/api/projects?id=${encodeURIComponent(project.id)}`, { method: "DELETE" });
      if (!response.ok) { const data = await response.json().catch(() => null); throw new Error(data?.error || "删除失败，请稍后重试。"); }
      isDirty.current = false; setDirty(false); router.push("/admin/projects"); router.refresh();
    } catch (cause) { notice(cause instanceof Error ? cause.message : "网络异常，删除失败。", true); busy.current = false; setSaving(false); }
  }
  function resetChanges() {
    if (!dirty || !confirm("放弃本次未保存的更改，恢复到最近一次保存的作品？")) return;
    setProject(saved); setDirty(false); isDirty.current = false; setFocusImageId(undefined); notice("已恢复最近一次保存的内容。");
  }

  return <div className={styles.editor}>
    <header className={styles.header}>
      <div><h1>编辑作品</h1><div className={styles.status}><span>{saved.visible ? "已发布" : "草稿"}</span>{isFeatured && <span>首页精选中</span>}<span>{project.rows.length} 行 / {imageCount} 张照片</span></div></div>
      <Link href="/admin/projects" className="admin-btn-sm">作品管理</Link>
    </header>
    <nav className={styles.sectionNav} aria-label="作品编辑分区">
      <button type="button" onClick={() => openSection("information")}>作品信息</button><button type="button" onClick={() => openSection("pictures")}>展示图片</button><button type="button" onClick={() => openSection("rows")}>图片编排</button><button type="button" onClick={() => openSection("settings")}>更多设置</button>
    </nav>
    {readOnly && <p role="status" className={styles.notice}>当前为只读预览，不能修改作品。</p>}
    <form onSubmit={(event) => { event.preventDefault(); void handleSave(); }} noValidate>
      <fieldset disabled={locked} className={styles.fields}>
        <section className={styles.panel} ref={(node) => { if (node) sections.current.set("information", node); }}>
          <h2>作品信息</h2><div className={styles.infoFields}>
            <label className={styles.titleField}>作品标题<input className="admin-input" value={project.titleZh} onChange={(event) => field("titleZh", event.target.value)} placeholder="作品名称" /></label>
            <label>分类<input className="admin-input" value={project.design} onChange={(event) => field("design", event.target.value)} placeholder="风光摄影" /></label>
            <label>城市<input className="admin-input" value={project.city} onChange={(event) => field("city", event.target.value)} placeholder="拍摄地点" /></label>
            <label>时间<input className="admin-input" value={project.time} onChange={(event) => field("time", event.target.value)} placeholder="2024 / 05" /></label>
            <label>拍摄器材<input className="admin-input" value={project.equipment} onChange={(event) => field("equipment", event.target.value)} placeholder="相机与镜头" /></label>
          </div>
        </section>
        <details className={styles.panel} ref={(node) => { if (node) sections.current.set("pictures", node); }}>
          <summary>展示图片<span>详情首屏 · 作品列表 · 首页精选</span></summary>
          <div className={styles.covers}>
            <div className={styles.coverCard}><h3>详情首屏</h3><p>进入作品后的全屏大图。</p>
              <AdminImageField label="详情首屏图链接" value={project.coverUrl} onChange={updateCover}
                onSize={(width, height) => update((current) => ({ ...current, coverW: width, coverH: height }))} />
            </div>
            <div className={styles.coverCard}><h3>作品列表</h3><p>“作品”页面中的缩略图。</p>
              <AdminImageField label="作品列表图链接" value={project.thumbUrl} onChange={(value) => field("thumbUrl", value)}
                onSize={(width, height) => update((current) => ({ ...current, thumbW: width, thumbH: height }))} />
              <button type="button" onClick={() => update((current) => ({ ...current, thumbUrl: current.coverUrl, thumbW: current.coverW, thumbH: current.coverH }))}>使用首屏图</button>
            </div>
            <div className={styles.coverCard}><h3>首页精选</h3><p>加入首页精选后使用的图片。</p>
              <AdminImageField label="首页精选图链接" value={project.featureUrl || ""} onChange={(value) => field("featureUrl", value)} />
              <button type="button" onClick={() => field("featureUrl", project.coverUrl)}>使用首屏图</button>
              <Link href="/admin/features">管理首页精选 ↗</Link>
            </div>
          </div>
          <details className={styles.dimensions}><summary>手动调整图片尺寸</summary><p>选择或粘贴图片后会自动读取尺寸，只有识别不准确时才需要修改。</p>
            <div className={styles.dimensionGrid}>{([
              ["coverW", "首屏图宽度"], ["coverH", "首屏图高度"], ["thumbW", "列表图宽度"], ["thumbH", "列表图高度"],
            ] as const).map(([key, label]) => <label key={key}>{label}<input className="admin-input" type="number" min="1" value={project[key]} onChange={(event) => field(key, Number(event.target.value))} /></label>)}</div>
          </details>
        </details>
        <section className={styles.rowsPanel} ref={(node) => { if (node) sections.current.set("rows", node); }}>
          <AdminProjectRowsEditor rows={project.rows} disabled={locked} onChange={updateRows} onNotice={rowNotice} focusImageId={focusImageId} focusRequest={focusRequest} />
        </section>
        <details className={styles.panel} ref={(node) => { if (node) sections.current.set("settings", node); }}>
          <summary>更多设置<span>网址 · 排序 · 删除</span></summary>
          <div className={styles.moreFields}>
            <label>网址标识<input className="admin-input" value={project.slug} onChange={(event) => field("slug", event.target.value)} /><span className={styles.hint}>/works/{project.slug || "…"}</span></label>
            <label>作品排序<input className="admin-input" type="number" step="1" value={project.order} onChange={(event) => field("order", Number(event.target.value))} /><span className={styles.hint}>数字越小越靠前，也可在作品管理中调整。</span></label>
          </div>
          <button type="button" onClick={deleteProject}>删除作品</button>
        </details>
      </fieldset>
      <div className={styles.saveBar}>
        <label className={styles.publish}><input type="checkbox" checked={project.visible} disabled={locked} onChange={(event) => field("visible", event.target.checked)} />公开展示</label>
        <span className={styles.saveState}>{saving ? "正在保存…" : dirty ? "有未保存的更改" : "所有更改已保存"}</span>
        <div className={styles.saveActions}>
          <button type="button" disabled={locked || !dirty} onClick={resetChanges}>放弃更改</button>
          {saved.visible && <Link href={`/works/${saved.slug}`} target="_blank" rel="noopener noreferrer">查看已保存页面 ↗</Link>}
          <button type="submit" className={styles.primary} disabled={locked || !dirty} title="Ctrl / ⌘ + S">{saving ? "保存中…" : project.visible ? "保存并发布" : "保存草稿"}</button>
        </div>
      </div>
      {message && <p className={styles.message} data-error={error} role={error ? "alert" : "status"}>{message}</p>}
    </form>
  </div>;
}
