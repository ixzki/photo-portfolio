"use client";

import { memo, useState } from "react";
import AdminImageField from "@/components/AdminImageField";
import AdminPreviewImage from "@/components/AdminPreviewImage";
import { isCompleteHttpUrl } from "@/lib/admin-image-utils.mjs";
import { moveProjectImage, moveProjectRow, removeProjectImage, removeProjectRow, transferProjectImage, updateProjectImage } from "@/lib/admin-project-rows";
import { LAYOUT_OPTIONS, type Image, type LayoutType, type Row } from "@/lib/types";
import styles from "./AdminProjectRowsEditor.module.css";

interface AdminProjectRowsEditorProps {
  rows: Row[];
  disabled?: boolean;
  onChange: (update: (rows: Row[]) => Row[]) => void;
  onNotice?: (message: string) => void;
  focusImageId?: string;
  focusRequest?: number;
}

function LayoutDiagram({ layout }: { layout: LayoutType }) {
  return (
    <span className={styles.diagram} data-layout={layout} aria-hidden="true">
      <span /><span />{layout === "wrap" && <><span /><span /></>}
    </span>
  );
}

function ImagePreview({ image, thumbnail = false }: { image: Image; thumbnail?: boolean }) {
  if (!isCompleteHttpUrl(image.url)) {
    return <span className={styles.imagePlaceholder}>{thumbnail ? "+" : "待填写图片地址"}</span>;
  }
  const ratio = image.width > 0 && image.height > 0 ? image.height / image.width : 2 / 3;
  return <AdminPreviewImage src={image.url} alt="" width={thumbnail ? 100 : 680} height={thumbnail ? 70 : Math.max(1, Math.round(680 * ratio))} sizes={thumbnail ? "70px" : "(max-width: 700px) 90vw, 680px"} />;
}

export default memo(function AdminProjectRowsEditor({ rows, disabled = false, onChange, onNotice, focusImageId, focusRequest = 0 }: AdminProjectRowsEditorProps) {
  const [selectedRowId, setSelectedRowId] = useState<string | null>(() => rows.find((row) => row.images.some((image) => image.id === focusImageId))?.id ?? rows[0]?.id ?? null);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(focusImageId ?? null);
  const [confirmation, setConfirmation] = useState<{ kind: "row" | "image"; id: string } | null>(null);
  const [destinationRowId, setDestinationRowId] = useState("");
  const [notice, setNotice] = useState("");
  const focusKey = `${focusImageId ?? ""}:${focusRequest}`;
  const [handledFocusKey, setHandledFocusKey] = useState(focusKey);
  if (handledFocusKey !== focusKey) {
    setHandledFocusKey(focusKey);
    const targetRow = rows.find((row) => row.images.some((image) => image.id === focusImageId));
    if (targetRow && focusImageId) {
      setSelectedRowId(targetRow.id);
      setSelectedImageId(focusImageId);
      setConfirmation(null);
    }
  }
  const selectedRow = rows.find((row) => row.id === selectedRowId) ?? rows[0];
  const rowIndex = selectedRow ? rows.findIndex((row) => row.id === selectedRow.id) : -1;
  const selectedImage = selectedRow?.images.find((image) => image.id === selectedImageId) ?? selectedRow?.images[0];
  const imageIndex = selectedImage ? selectedRow!.images.findIndex((image) => image.id === selectedImage.id) : -1;
  const totalImages = rows.reduce((total, row) => total + row.images.length, 0);
  const layout = LAYOUT_OPTIONS.find((option) => option.value === selectedRow?.layout);
  const destination = rows.some((row) => row.id === destinationRowId && row.id !== selectedRow?.id) ? destinationRowId : "";

  function announce(message: string) {
    setNotice(message);
    onNotice?.(message);
  }

  function selectRow(rowId: string) {
    setSelectedRowId(rowId);
    setSelectedImageId(null);
    setConfirmation(null);
    setDestinationRowId("");
  }

  function addRow() {
    const id = crypto.randomUUID();
    onChange((current) => [...current, { id, layout: "landscape", order: current.length, images: [] }]);
    selectRow(id);
    announce("已在草稿中新增图片行，可以选择版式并添加图片。");
  }

  function addImage() {
    if (!selectedRow) return;
    const id = crypto.randomUUID();
    const rowId = selectedRow.id;
    onChange((current) => current.map((row) => row.id === rowId ? {
      ...row, images: [...row.images, { id, url: "", alt: null, width: 1440, height: 960, order: row.images.length }],
    } : row));
    setSelectedImageId(id);
    setConfirmation(null);
    announce("已添加到草稿。请填写图片地址或从媒体库选择图片。");
  }

  function updateImage(patch: Partial<Omit<Image, "id" | "order">>) {
    if (!selectedRow || !selectedImage) return;
    const rowId = selectedRow.id;
    const imageId = selectedImage.id;
    onChange((current) => updateProjectImage(current, rowId, imageId, patch));
  }

  function deleteRow() {
    if (!selectedRow) return;
    const rowId = selectedRow.id;
    selectRow(rows[rowIndex + 1]?.id ?? rows[rowIndex - 1]?.id ?? "");
    onChange((current) => removeProjectRow(current, rowId));
    announce(`已从草稿删除第 ${rowIndex + 1} 行。保存作品后生效。`);
  }

  function deleteImage() {
    if (!selectedRow || !selectedImage) return;
    const rowId = selectedRow.id;
    const imageId = selectedImage.id;
    setSelectedImageId(selectedRow.images[imageIndex + 1]?.id ?? selectedRow.images[imageIndex - 1]?.id ?? null);
    setConfirmation(null);
    onChange((current) => removeProjectImage(current, rowId, imageId));
    announce("已从草稿移除图片，媒体库中的原图仍可使用。");
  }

  function transferImage() {
    if (!selectedRow || !selectedImage || !destination) return;
    const rowId = selectedRow.id;
    const imageId = selectedImage.id;
    const nextRowId = destination;
    onChange((current) => transferProjectImage(current, rowId, imageId, nextRowId));
    setSelectedRowId(nextRowId);
    setSelectedImageId(imageId);
    setDestinationRowId("");
    setConfirmation(null);
    announce(`图片已移至第 ${rows.findIndex((row) => row.id === nextRowId) + 1} 行末尾。`);
  }

  return (
    <fieldset className={styles.editor} disabled={disabled} aria-label="图片编排">
      <div className={styles.heading}>
        <div><h2>图片编排</h2><span className={styles.meta}>{rows.length} 行 · {totalImages} 张图片</span></div>
        <button type="button" onClick={addRow}>+ 新增图片行</button>
      </div>
      <p className={styles.hint}>选择一行调整版式，点击预览中的图片编辑。所有修改随「保存作品」一起保存。</p>
      <div className={styles.workspace}>
        <aside className={styles.directory} aria-label="图片行目录">
          <ol className={styles.rowList}>
            {rows.map((row, index) => (
              <li key={row.id} className={styles.rowItem} data-selected={selectedRow?.id === row.id}>
                <button type="button" className={styles.rowSelect} onClick={() => selectRow(row.id)} aria-current={selectedRow?.id === row.id ? "true" : undefined} aria-label={`选择第 ${index + 1} 行，${LAYOUT_OPTIONS.find((option) => option.value === row.layout)?.label}，${row.images.length} 张图片`}>
                  <span className={styles.number}>{String(index + 1).padStart(2, "0")}</span>
                  <span className={styles.rowThumb}>{row.images[0] ? <ImagePreview image={row.images[0]} thumbnail /> : <LayoutDiagram layout={row.layout} />}</span>
                  <span className={styles.rowTitle}>{LAYOUT_OPTIONS.find((option) => option.value === row.layout)?.label}<small>{row.images.length} 张图片</small></span>
                </button>
                <div className={styles.rowActions}>
                  <button type="button" disabled={disabled || index === 0} aria-label={`第 ${index + 1} 行上移`} title="上移一行" onClick={() => onChange((current) => moveProjectRow(current, row.id, -1))}>↑</button>
                  <button type="button" disabled={disabled || index === rows.length - 1} aria-label={`第 ${index + 1} 行下移`} title="下移一行" onClick={() => onChange((current) => moveProjectRow(current, row.id, 1))}>↓</button>
                </div>
              </li>
            ))}
          </ol>
          {rows.length === 0 && <p className={styles.emptyDirectory}>还没有图片行</p>}
        </aside>

        {selectedRow ? (
          <section className={styles.content} aria-label={`编辑第 ${rowIndex + 1} 行`}>
            <div className={styles.sectionHeader}>
              <h3>第 {rowIndex + 1} 行</h3>
              <button type="button" onClick={() => setConfirmation({ kind: "row", id: selectedRow.id })}>删除本行</button>
            </div>
            {confirmation?.kind === "row" && confirmation.id === selectedRow.id && (
              <div className={styles.confirmation} role="alert">
                <span>删除本行及其中 {selectedRow.images.length} 张图片？</span>
                <div className={styles.actions}><button type="button" onClick={deleteRow}>确认删除</button><button type="button" onClick={() => setConfirmation(null)}>取消</button></div>
              </div>
            )}
            <div className={styles.layouts} role="group" aria-label="本行版式">
              {LAYOUT_OPTIONS.map((option) => (
                <button type="button" key={option.value} aria-pressed={selectedRow.layout === option.value} className={styles.layoutChoice} title={option.desc} onClick={() => onChange((current) => current.map((row) => row.id === selectedRow.id ? { ...row, layout: option.value } : row))}>
                  <LayoutDiagram layout={option.value} /><span>{option.label}</span>
                </button>
              ))}
            </div>
            <p className={styles.hint}>{layout?.desc}。</p>
            <div className={styles.previewHeader}><span>排列预览</span><button type="button" onClick={addImage}>+ 添加图片</button></div>
            {selectedRow.images.length > 0 ? (
              <div className={styles.previewViewport}>
                <div className={styles.rowPreview} data-layout={selectedRow.layout}>
                  {selectedRow.images.map((image, index) => (
                    <button type="button" key={image.id} className={styles.previewImage} aria-pressed={selectedImage?.id === image.id} aria-label={`编辑第 ${index + 1} 张图片${image.alt ? `：${image.alt}` : ""}`} onClick={() => { setSelectedImageId(image.id); setConfirmation(null); }}>
                      <ImagePreview image={image} /><span className={styles.imageNumber}>{index + 1}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : <div className={styles.empty}>本行还没有图片。添加后即可预览版式。</div>}

            {selectedImage && (
              <div className={styles.imageEditor} key={selectedImage.id}>
                <div className={styles.sectionHeader}>
                  <h4>图片 {imageIndex + 1} / {selectedRow.images.length}</h4>
                  <div className={styles.actions}>
                    <button type="button" aria-label="当前图片前移" disabled={disabled || imageIndex === 0} title="前移一张" onClick={() => onChange((current) => moveProjectImage(current, selectedRow.id, selectedImage.id, -1))}>←</button>
                    <button type="button" aria-label="当前图片后移" disabled={disabled || imageIndex === selectedRow.images.length - 1} title="后移一张" onClick={() => onChange((current) => moveProjectImage(current, selectedRow.id, selectedImage.id, 1))}>→</button>
                    <button type="button" onClick={() => setConfirmation({ kind: "image", id: selectedImage.id })}>移除图片</button>
                  </div>
                </div>
                {confirmation?.kind === "image" && confirmation.id === selectedImage.id && (
                  <div className={styles.confirmation} role="alert"><span>从本行移除这张图片？</span><div className={styles.actions}><button type="button" onClick={deleteImage}>确认移除</button><button type="button" onClick={() => setConfirmation(null)}>取消</button></div></div>
                )}
                <AdminImageField key={selectedImage.id} label={`第 ${rowIndex + 1} 行 · 图片 ${imageIndex + 1} 地址`} value={selectedImage.url} onChange={(url) => updateImage({ url })} onAlt={(alt) => updateImage({ alt: alt || null })} onSize={(width, height) => { if (width > 0 && height > 0) updateImage({ width, height }); }} placeholder="粘贴图片地址，或从媒体库选择" />
                <label className={styles.field}>图片描述（alt）<input className="admin-input" value={selectedImage.alt ?? ""} onChange={(event) => updateImage({ alt: event.target.value || null })} placeholder="描述照片中的地点或画面" /></label>
                <details className={styles.details}>
                  <summary>图片尺寸 · {selectedImage.width} × {selectedImage.height}</summary>
                  <div className={styles.dimensions}>
                    <label className={styles.field}>宽度（像素）<input type="number" className="admin-input" min="1" max="100000" value={selectedImage.width || ""} onChange={(event) => updateImage({ width: Number(event.target.value) })} /></label>
                    <label className={styles.field}>高度（像素）<input type="number" className="admin-input" min="1" max="100000" value={selectedImage.height || ""} onChange={(event) => updateImage({ height: Number(event.target.value) })} /></label>
                  </div>
                  <p className={styles.hint}>选择图片后自动读取原图尺寸；读取失败时可以手动填写。</p>
                </details>
                {rows.length > 1 && <div className={styles.transfer}>
                  <label className={styles.field}>移到其他行<select aria-label="移到其他行" className="admin-input" value={destination} onChange={(event) => setDestinationRowId(event.target.value)}><option value="">选择目标行</option>{rows.map((row, index) => row.id === selectedRow.id ? null : <option key={row.id} value={row.id}>第 {index + 1} 行 · {LAYOUT_OPTIONS.find((option) => option.value === row.layout)?.label}</option>)}</select></label>
                  <button type="button" disabled={disabled || !destination} onClick={transferImage}>移动图片</button>
                </div>}
              </div>
            )}
          </section>
        ) : <div className={styles.empty}>从「新增图片行」开始编排作品图片。</div>}
      </div>
      {!onNotice && <p className={styles.notice} role="status" aria-live="polite">{notice}</p>}
    </fieldset>
  );
});
