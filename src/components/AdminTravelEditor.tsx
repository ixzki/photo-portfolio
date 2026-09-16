"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminImageField from "./AdminImageField";
import JourneyMarkdown from "./JourneyMarkdown";
import type { Coordinate, Journey, JourneyStop } from "@/lib/journey";
import type { TravelDocument } from "@/lib/travel-content";
import { validateTravelDocument } from "@/lib/travel-content";
import { parseTravelTimestamp, type TravelCsvResult, type TravelCsvWorkerResponse } from "@/lib/travel-csv";
import { appendDrawnRoute, removeRouteSegment, sortJourneyStops, stopMarkdown } from "@/lib/admin-travel-geometry";
import { formatJourneyTime, getStopMetadata } from "@/lib/journey-metadata";
import { formatJourneyDuration, getJourneySummary } from "@/lib/journey-summary";
import { metadataImportIssue, updateJourneyMetadata } from "@/lib/travel-metadata-import";
import type { TravelMapMode } from "./AdminTravelMap";
import styles from "./AdminTravelEditor.module.css";

const EditorMap = dynamic(() => import("./AdminTravelMap"), { ssr: false, loading: () => <div className={styles.mapLoading}>地图加载中</div> });
type Imported = TravelCsvResult;

export default function AdminTravelEditor({ initial, readOnly = false }: { initial: TravelDocument; readOnly?: boolean }) {
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [selectedId, setSelectedId] = useState(initial.journey.stops[0]?.id ?? "");
  const [mode, setMode] = useState<TravelMapMode>("browse");
  const [rangeStart, setRangeStart] = useState<number | null>(null);
  const [drawing, setDrawing] = useState<Coordinate[]>([]);
  const [preview, setPreview] = useState(false);
  const [insertImage, setInsertImage] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [maxAccuracy, setMaxAccuracy] = useState(100);
  const [importing, setImporting] = useState(false);
  const [detectingRange, setDetectingRange] = useState(false);
  const [percent, setPercent] = useState(0);
  const [imported, setImported] = useState<Imported | null>(null);
  const worker = useRef<Worker | null>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const points = useMemo(() => draft.journey.segments.flat(), [draft.journey.segments]);
  const selected = draft.journey.stops.find((stop) => stop.id === selectedId);
  const selectedMetadata = useMemo(() => selected ? getStopMetadata(draft.journey, selected) : null, [draft.journey, selected]);
  const importSummary = useMemo(() => imported ? getJourneySummary({ title: "", segments: imported.segments, pointMeta: imported.pointMeta, stops: [] }) : null, [imported]);
  const metadataIssue = useMemo(() => imported ? metadataImportIssue({ segments: draft.journey.segments }, imported) : null, [draft.journey.segments, imported]);
  const locked = readOnly || saving;

  useEffect(() => () => worker.current?.terminate(), []);
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    const navigate = (event: MouseEvent) => {
      const anchor = (event.target as Element).closest("a[href]") as HTMLAnchorElement | null;
      if (anchor && anchor.target !== "_blank" && !anchor.href.endsWith("#") && !window.confirm("有尚未保存的旅行内容，确定离开？")) {
        event.preventDefault(); event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", navigate, true);
    return () => { window.removeEventListener("beforeunload", beforeUnload); document.removeEventListener("click", navigate, true); };
  }, [dirty]);

  function notice(text: string, isError = false) { setMessage(text); setError(isError); }
  function update(change: (value: TravelDocument) => TravelDocument) {
    if (locked) return;
    setDraft(change); setDirty(true); setMessage("");
  }
  function updateJourney(change: (journey: Journey) => Journey) { update((value) => ({ ...value, journey: change(value.journey) })); }
  function updateStop(id: string, patch: Partial<JourneyStop>) {
    updateJourney((journey) => ({ ...journey, stops: sortJourneyStops(journey.stops.map((stop) => stop.id === id ? { ...stop, ...patch } : stop)) }));
  }
  function changeMode(next: TravelMapMode) { setMode(next); setRangeStart(null); setDrawing([]); }
  function addStop(start: number, end?: number) {
    const id = crypto.randomUUID();
    const stop: JourneyStop = { id, title: end === undefined ? "新地点" : "新路段", position: points[start], routePointIndex: start,
      ...(end === undefined ? {} : { routeEndPointIndex: end }), markdown: "", paragraphs: [], images: [] };
    updateJourney((journey) => ({ ...journey, stops: sortJourneyStops([...journey.stops, stop]) }));
    setSelectedId(id); changeMode("browse"); setPreview(false);
  }
  function moveStop(id: string, index: number) {
    const stop = draft.journey.stops.find((entry) => entry.id === id);
    if (!stop || !points[index]) return;
    if (stop.routeEndPointIndex !== undefined && index >= stop.routeEndPointIndex) {
      notice("路段起点必须在终点之前，请先调整终点。", true); return;
    }
    updateStop(id, { routePointIndex: index, position: points[index] });
  }
  function pick(index: number) {
    if (locked) return;
    if (mode === "point") addStop(index);
    else if (mode === "range") {
      if (rangeStart === null) setRangeStart(index);
      else if (rangeStart !== index) addStop(Math.min(rangeStart, index), Math.max(rangeStart, index));
      else notice("请选择不同的路段终点。", true);
    } else if (selected && (mode === "move" || mode === "start")) { moveStop(selected.id, index); changeMode("browse"); }
    else if (selected && mode === "end") {
      if (index <= (selected.routePointIndex ?? 0)) { notice("路段终点必须在起点之后。", true); return; }
      updateStop(selected.id, { routeEndPointIndex: index }); changeMode("browse");
    }
  }
  function finishDrawing() {
    if (drawing.length < 2) return;
    const start = points.length;
    const id = crypto.randomUUID();
    updateJourney((journey) => ({ ...appendDrawnRoute(journey, drawing), stops: [...journey.stops,
      { id, title: "新路段", position: drawing[0], routePointIndex: start, routeEndPointIndex: start + drawing.length - 1, markdown: "", paragraphs: [], images: [] }] }));
    setSelectedId(id); changeMode("browse"); setPreview(false);
  }
  function cancelImport() { worker.current?.terminate(); worker.current = null; setImporting(false); setDetectingRange(false); }
  function readCsv(task: "range" | "import", selectedFile = file) {
    if (!selectedFile || locked) return;
    cancelImport(); setImported(null); setImporting(true); setPercent(0); setMessage("");
    setDetectingRange(task === "range");
    if (task === "range") { setFrom(""); setTo(""); }
    const nextWorker = new Worker(new URL("../workers/travel-csv.worker.ts", import.meta.url));
    worker.current = nextWorker;
    nextWorker.onmessage = ({ data }: MessageEvent<TravelCsvWorkerResponse>) => {
      if (worker.current !== nextWorker) return;
      if (data.type === "progress") setPercent(data.percent);
      if (data.type === "range") {
        setFrom(data.from); setTo(data.to); cancelImport();
        notice(data.from === data.to ? "CSV 只记录了一个时间，无法生成连续行程，请检查文件。" : "已自动填入 CSV 起止时间（北京时间），可调整范围后读取轨迹。", data.from === data.to);
      }
      if (data.type === "complete") { setImported(data); cancelImport(); }
      if (data.type === "error") { notice(data.error, true); cancelImport(); }
    };
    nextWorker.onerror = () => { if (worker.current !== nextWorker) return; notice("CSV 读取失败，请检查文件格式后重试。", true); cancelImport(); };
    nextWorker.postMessage({ task, file: selectedFile, options: { from, to, maxAccuracy, gapMinutes: 60, gapKm: 5 } });
  }
  function applyImport() {
    if (!imported) return;
    if (draft.journey.segments.length && !window.confirm("应用 CSV 将替换当前轨迹，并清空关联点位、路段和正文。保存前不会影响数据库，确定应用？")) return;
    updateJourney((journey) => ({ ...journey, segments: imported.segments, pointMeta: imported.pointMeta, stops: [] }));
    setSelectedId(""); setImported(null); changeMode("browse");
    notice("轨迹已导入。点击“添加点位”或“选取路段”，然后在地图上选择位置。保存后写入数据库。");
  }
  function applyMetadata() {
    if (!imported || locked) return;
    const issue = metadataImportIssue(draft.journey, imported);
    if (issue) { notice(issue, true); return; }
    updateJourney((journey) => updateJourneyMetadata(journey, imported));
    setImported(null);
    notice("时间和海拔已更新，路线、正文、图片及精选点位均保留。点击保存后写入数据库。");
  }
  async function save() {
    if (locked) return;
    let document: TravelDocument;
    try { document = validateTravelDocument(draft); }
    catch (cause) { notice(cause instanceof Error ? cause.message : "请检查旅行内容。", true); return; }
    const body = JSON.stringify(document);
    if (new Blob([body]).size > 3_500_000) { notice("旅行数据过大，请缩小 CSV 日期范围或减少轨迹点后保存。", true); return; }
    setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/travel", { method: draft.revision ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "保存失败，请重试。");
      setDraft(result); setDirty(false); notice(result.visible ? "已保存，旅行页已更新。" : "草稿已保存，暂不在旅行页公开。");
      if (!draft.revision) router.replace(`/admin/travel/${result.id}`);
      router.refresh();
    } catch (cause) { notice(cause instanceof Error ? cause.message : "网络异常，请重试。", true); }
    finally { setSaving(false); }
  }
  async function deleteTravel() {
    if (locked || !draft.revision || !window.confirm(`确定删除“${draft.journey.title}”及其全部旅行内容？`)) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/travel?id=${encodeURIComponent(draft.id)}&revision=${draft.revision}`, { method: "DELETE" });
      if (!response.ok) { const result = await response.json(); throw new Error(result.error || "删除失败。"); }
      setDirty(false); router.push("/admin/travel"); router.refresh();
    } catch (cause) { notice(cause instanceof Error ? cause.message : "网络异常，请重试。", true); setSaving(false); }
  }
  const mapHint = mode === "point" ? "点击地图添加点位，位置会吸附到轨迹。" : mode === "range" ? (rangeStart === null ? "先点击路段起点，再点击终点。" : `已选择起点 #${rangeStart + 1}，请点击终点。`)
    : mode === "draw" ? "依次点击地图绘制线路；点击“完成线路”添加正文。" : mode === "browse" ? "拖动地图查看路线；选中点位后可拖动调整。正文按行程顺序排列。" : "点击地图重新选择位置，或在右侧输入轨迹点序号。";

  return <div className={styles.editor}>
    <div className={styles.header}><div><h1 className="admin-heading">{initial.revision ? "编辑旅行" : "新建旅行"}</h1><div className={styles.status}><span className={`admin-status-badge ${initial.visible ? "is-live" : "is-draft"}`}>{initial.visible ? "已发布" : "草稿"}</span><span>{draft.journey.stops.length} 段正文 / {points.length.toLocaleString()} 个轨迹点</span></div></div><Link href="/admin/travel" className="admin-btn-sm">旅行管理</Link></div>
    {readOnly && <p role="status">当前为只读预览，不能保存旅行内容。</p>}
    <fieldset disabled={locked} className={styles.fields}>
      <section className={styles.panel}><h2>旅行信息</h2><div className={styles.settings}>
        <label>标题<input className="admin-input" value={draft.journey.title} onChange={(event) => updateJourney((journey) => ({ ...journey, title: event.target.value }))} /></label>
        <label>网址标识<input className="admin-input" value={draft.slug} onChange={(event) => update((value) => ({ ...value, slug: event.target.value }))} placeholder="example-journey" /></label>
        <label>路线灰度<select className="admin-input" value={draft.shade} onChange={(event) => update((value) => ({ ...value, shade: event.target.value }))}>
          {Array.from(new Set([draft.shade, "#333333", "#626262", "#888888", "#aaaaaa"])).map((shade) => <option key={shade} value={shade}>{shade === "#333333" ? "深灰" : shade === "#626262" ? "灰色" : shade === "#888888" ? "中灰" : shade === "#aaaaaa" ? "浅灰" : shade}</option>)}
        </select></label>
      </div></section>
      <details className={styles.details}><summary>首屏大图</summary><div className={styles.coverFields}>
        <AdminImageField label="封面图片" value={draft.cover.src} onChange={(src) => update((value) => ({ ...value, cover: { ...value.cover, src } }))}
          onSize={(width, height) => update((value) => ({ ...value, cover: { ...value.cover, width, height } }))}
          onAlt={(alt) => update((value) => ({ ...value, cover: { ...value.cover, alt } }))} />
        <label>图片描述<input className="admin-input" value={draft.cover.alt} onChange={(event) => update((value) => ({ ...value, cover: { ...value.cover, alt: event.target.value } }))} /></label>
      </div></details>
      <details className={styles.details} open={!initial.journey.segments.length || undefined}><summary>导入 CSV</summary>
        <div className={styles.importFields}>
          <label className={styles.fileField}>足迹文件<input type="file" accept=".csv,text/csv" onChange={(event) => {
            const selectedFile = event.target.files?.[0] ?? null;
            cancelImport(); setFile(selectedFile); setImported(null); setFrom(""); setTo(""); setMessage("");
            if (selectedFile) readCsv("range", selectedFile);
          }} /></label>
          <label>开始时间（北京时间）<input type="datetime-local" step="1" disabled={detectingRange} className="admin-input" value={from} onChange={(event) => { cancelImport(); setFrom(event.target.value); setImported(null); }} /></label>
          <label>结束时间（北京时间）<input type="datetime-local" step="1" disabled={detectingRange} className="admin-input" value={to} onChange={(event) => { cancelImport(); setTo(event.target.value); setImported(null); }} /></label>
          <label>最大定位误差 / 米<input className="admin-input" type="number" disabled={detectingRange} min="0" step="10" value={maxAccuracy} onChange={(event) => { cancelImport(); setMaxAccuracy(Number(event.target.value)); setImported(null); }} /></label>
        </div>
        <p className={styles.hint}>选择 CSV 后自动识别起止时间（北京时间），可手动缩小到本次旅行。使用 WGS84 经纬度，误差填 0 不筛选。超过 1 小时或 5 公里的采样间隔会断开，避免连出不存在的道路。</p>
        <div className={styles.toolbar}>
          <button type="button" onClick={() => readCsv("import")} disabled={!file || !from || !to || importing}>读取 CSV</button>
          <button type="button" onClick={() => readCsv("range")} disabled={!file || importing}>重新识别时间</button>
          {importing && <><span role="status">{detectingRange ? "识别时间中" : "读取中"} {Math.round(percent)}%</span><button type="button" onClick={cancelImport}>取消读取</button></>}
        </div>
        {imported && <div className={styles.importResult} role="status">
          <p>已读取 {imported.stats.rows.toLocaleString()} 行 · 筛选 {imported.stats.matched.toLocaleString()} 条 · {imported.stats.points.toLocaleString()} 个轨迹点 · {imported.stats.segments} 条线路 · 跳过 {imported.stats.invalid} 条无效记录</p>
          <p>{formatJourneyTime(parseTravelTimestamp(imported.stats.from))} — {formatJourneyTime(parseTravelTimestamp(imported.stats.to))}</p>
          {importSummary && <div aria-label="导入路线距离与时间">
            <p>{new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(importSummary.distanceMeters / 1000)} KM · {formatJourneyDuration(importSummary.durationSeconds) || "暂无时间记录"}</p>
            <p>实际记录：{formatJourneyTime(importSummary.startTime)} — {formatJourneyTime(importSummary.endTime)}</p>
          </div>}
          {draft.journey.segments.length > 0 && <>
            <button type="button" onClick={applyMetadata} disabled={metadataIssue !== null} aria-describedby="metadata-import-status">仅更新时间和海拔（保留正文）</button>
            <p id="metadata-import-status" className={styles.hint}>{metadataIssue || "轨迹逐点及分段一致，可仅更新记录，保留全部正文、图片、点位和精选选择。"}</p>
          </>}
          <button type="button" onClick={applyImport}>应用导入轨迹</button>
        </div>}
      </details>
      <div className={styles.workspace}>
        <div className={styles.mapColumn}>
          <h2 className={styles.workspaceTitle}>路线与点位</h2>
          <div className={styles.toolbar} role="group" aria-label="地图编辑工具">
            <button type="button" aria-pressed={mode === "browse"} onClick={() => changeMode("browse")}>浏览</button>
            <button type="button" aria-pressed={mode === "point"} disabled={!points.length} onClick={() => changeMode("point")}>添加点位</button>
            <button type="button" aria-pressed={mode === "range"} disabled={!points.length} onClick={() => changeMode("range")}>选取路段</button>
            <button type="button" aria-pressed={mode === "draw"} onClick={() => changeMode("draw")}>手绘线路</button>
          </div>
          <p className={styles.hint} role="status">{mapHint}</p>
          {mode === "draw" && <div className={styles.toolbar}><button type="button" disabled={drawing.length < 2} onClick={finishDrawing}>完成线路</button><button type="button" disabled={!drawing.length} onClick={() => setDrawing((value) => value.slice(0, -1))}>撤销一笔</button><button type="button" onClick={() => changeMode("browse")}>取消绘制</button></div>}
          <EditorMap segments={draft.journey.segments} stops={draft.journey.stops} selectedId={selectedId} mode={mode} drawing={drawing} rangeStart={rangeStart}
            onPick={pick} onDraw={(point) => { if (!locked) setDrawing((value) => [...value, point]); }}
            onSelect={(id) => { setSelectedId(id); changeMode("browse"); }} onMove={moveStop} />
          <details className={styles.details}><summary>轨迹管理 · {draft.journey.segments.length} 条线路 / {points.length.toLocaleString()} 个点</summary>
            <div className={styles.routeParts}>{draft.journey.segments.map((segment, index) => <div key={index}><span>线路 {index + 1} · {segment.length.toLocaleString()} 个点</span>
              <button type="button" onClick={() => {
                if (!window.confirm("删除这条线路也会删除与它相交的点位、路段和正文，确定删除？")) return;
                updateJourney((journey) => removeRouteSegment(journey, index)); changeMode("browse");
              }}>删除</button></div>)}</div>
          </details>
          <ol className={styles.stopList} aria-label="行程正文列表">{draft.journey.stops.map((stop, index) => <li key={stop.id}>
            <button type="button" aria-pressed={stop.id === selectedId} onClick={() => { setSelectedId(stop.id); changeMode("browse"); setPreview(false); }}>
              <span className={styles.number}>{String(index + 1).padStart(2, "0")}</span><span>{stop.title || "未命名"}</span><span className={styles.kind}>{stop.featured && <span className={styles.featuredBadge}>精选</span>}{stop.routeEndPointIndex === undefined ? "点位" : "路段"}</span>
            </button></li>)}</ol>
        </div>
        <div className={styles.contentColumn}>
          {selected ? <>
            <div className={styles.sectionHeader}><h2>{selected.routeEndPointIndex === undefined ? "点位正文" : "路段正文"}</h2><button type="button" onClick={() => {
              if (!window.confirm("确定删除这个点位或路段及其正文？轨迹本身会保留。")) return;
              updateJourney((journey) => ({ ...journey, stops: journey.stops.filter((stop) => stop.id !== selected.id) })); setSelectedId(""); changeMode("browse");
            }}>删除</button></div>
            <label>地点或路段名称<input className="admin-input" value={selected.title} onChange={(event) => updateStop(selected.id, { title: event.target.value })} /></label>
            <details className={styles.locationDetails}><summary>点位与精选设置</summary><div className={styles.featuredField}>
              <label className={styles.featuredToggle}><input type="checkbox" checked={selected.featured === true} disabled={locked}
                onChange={(event) => updateStop(selected.id, { featured: event.target.checked })} />设为全程地图精选点位</label>
              <p className={styles.hint}>滚动全程地图到达这里时，显示名称、时间和海拔；路段显示时间与海拔范围。</p>
              {selected.featured && <div className={styles.featuredPreview} aria-label="精选点位标注预览">
                <strong>{selected.title || "未命名"}</strong>
                <span>{selectedMetadata?.time || "暂无时间记录"}</span>
                <span>{selectedMetadata?.altitude || "暂无海拔记录"}</span>
              </div>}
            </div>
            <div className={styles.anchorFields}>
              <label>{selected.routeEndPointIndex === undefined ? "轨迹点序号" : "起点序号"}<input aria-label="起点轨迹点序号" className="admin-input" type="number" min="1" max={points.length} value={(selected.routePointIndex ?? 0) + 1} onChange={(event) => { const index = Number(event.target.value) - 1; if (Number.isInteger(index) && points[index]) moveStop(selected.id, index); }} /></label>
              {selected.routeEndPointIndex !== undefined && <label>终点序号<input aria-label="终点轨迹点序号" className="admin-input" type="number" min={(selected.routePointIndex ?? 0) + 2} max={points.length} value={selected.routeEndPointIndex + 1} onChange={(event) => {
                const index = Number(event.target.value) - 1;
                if (Number.isInteger(index) && points[index] && index > (selected.routePointIndex ?? 0)) updateStop(selected.id, { routeEndPointIndex: index });
              }} /></label>}
            </div>
            <div className={styles.toolbar}>
              <button type="button" onClick={() => changeMode(selected.routeEndPointIndex === undefined ? "move" : "start")}>{selected.routeEndPointIndex === undefined ? "在地图上重新定位" : "在地图上选起点"}</button>
              {selected.routeEndPointIndex !== undefined && <button type="button" onClick={() => changeMode("end")}>在地图上选终点</button>}
            </div>
            <p className={styles.hint}>{selected.position.map((value) => value.toFixed(6)).join(", ")}</p>
            </details>
            <div className={styles.toolbar} role="group" aria-label="正文编辑模式">
              <button type="button" aria-pressed={!preview} onClick={() => setPreview(false)}>Markdown</button><button type="button" aria-pressed={preview} onClick={() => setPreview(true)}>预览</button>
              <button type="button" onClick={() => setInsertImage((value) => !value)}>插入图片</button>
            </div>
            {insertImage && <div className={styles.imageInsert}><AdminImageField label="正文图片" value={imageUrl} onChange={setImageUrl} />
              <button type="button" disabled={!/^https?:\/\//i.test(imageUrl)} onClick={() => {
                const text = stopMarkdown(selected); const cursor = textarea.current?.selectionStart ?? text.length;
                updateStop(selected.id, { markdown: `${text.slice(0, cursor)}\n\n![照片](${imageUrl.replace(/\s/g, "%20").replace(/\)/g, "%29")})\n\n${text.slice(cursor)}`, paragraphs: [], images: [] });
                setInsertImage(false); setImageUrl(""); setPreview(false);
              }}>插入正文</button></div>}
            {preview ? <div className={styles.markdownPreview}><JourneyMarkdown markdown={stopMarkdown(selected)} /></div> :
              <label className={styles.markdownLabel}><span>Markdown 正文</span><textarea ref={textarea} aria-label="Markdown 正文" className={styles.markdownInput} value={stopMarkdown(selected)} onChange={(event) => updateStop(selected.id, { markdown: event.target.value, paragraphs: [], images: [] })} placeholder={"在这里写下这段旅程。\n\n![照片描述](https://cdn.example.com/photo.jpg)"} /></label>}
            <p className={styles.hint}>支持段落、图片、标题、列表、引用、链接和表格。保存后，正文滚动会推动地图上的路线延伸。</p>
          </> : <div className={styles.empty}>在地图上添加点位或选取路段，即可为它编写正文。</div>}
        </div>
      </div>
      {draft.revision > 0 && <details className={styles.details}><summary>更多设置</summary><button className={styles.danger} type="button" disabled={locked} onClick={deleteTravel}>删除旅行</button></details>}
    </fieldset>
    <div className={styles.saveBar}>
      <label className={styles.publish}><input type="checkbox" disabled={locked} checked={draft.visible} onChange={(event) => update((value) => ({ ...value, visible: event.target.checked }))} />公开展示</label>
      <span>{dirty ? "有未保存的更改" : draft.revision ? "已保存" : "尚未保存"}</span>
      <div className={styles.saveActions}>
        {initial.visible && initial.revision > 0 && <Link href={`/travel/${initial.slug}`} target="_blank" rel="noopener noreferrer">查看页面 ↗</Link>}
        <button type="button" className={styles.saveButton} disabled={locked || importing} onClick={save}>{saving ? "保存中…" : draft.visible ? "保存并发布" : "保存草稿"}</button>
      </div>
    </div>
    {message && <p className={styles.message} data-error={error} role={error ? "alert" : "status"}>{message}</p>}
  </div>;
}
