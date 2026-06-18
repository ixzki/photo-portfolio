"use client";

import { memo, useState } from "react";
import AdminImageField from "@/components/AdminImageField";
import AdminPreviewImage from "@/components/AdminPreviewImage";
import { LAYOUT_OPTIONS, Image, LayoutType, Row } from "@/lib/types";

type DraggedImage = { rowId: string; imageId: string } | null;

interface RowImageAdderProps {
  onAdd: (image: Omit<Image, "id" | "order">) => Promise<void>;
}

function RowImageAdder({ onAdd }: RowImageAdderProps) {
  const [url, setUrl] = useState("");
  const [width, setWidth] = useState(1440);
  const [height, setHeight] = useState(960);
  const [alt, setAlt] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!url) return;
    setSaving(true);
    await onAdd({ url, width, height, alt: alt || null });
    setSaving(false);
    setUrl("");
    setAlt("");
    setWidth(1440);
    setHeight(960);
  };

  return (
    <div className="admin-row-image-adder">
      <AdminImageField
        value={url}
        onChange={setUrl}
        onAlt={setAlt}
        onSize={(nextWidth, nextHeight) => {
          setWidth(nextWidth || 1440);
          setHeight(nextHeight || 960);
        }}
        placeholder="粘贴图片 URL"
      />
      <div className="admin-form-row">
        <input value={alt} onChange={(event) => setAlt(event.target.value)} className="admin-input" placeholder="描述 / alt" />
        <button type="button" onClick={handleAdd} disabled={!url || saving} className="admin-btn-sm">
          {saving ? "添加中..." : "添加图片"}
        </button>
      </div>
    </div>
  );
}

interface AdminProjectImageCardProps {
  image: Image;
  rowId: string;
  isDragging: boolean;
  onDragStart: (rowId: string, imageId: string) => void;
  onDragOver: (rowId: string, imageId: string) => void;
  onDragEnd: (rowId: string) => void;
  onUpdateAlt: (rowId: string, imageId: string, alt: string) => void;
  onDelete: (rowId: string, imageId: string) => void;
}

const AdminProjectImageCard = memo(function AdminProjectImageCard({
  image,
  rowId,
  isDragging,
  onDragStart,
  onDragOver,
  onDragEnd,
  onUpdateAlt,
  onDelete,
}: AdminProjectImageCardProps) {
  return (
    <div
      className={`admin-image-card${isDragging ? " admin-dragging" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onDragOver(rowId, image.id);
      }}
    >
      <span
        className="admin-drag-handle"
        draggable
        title="拖动排序"
        onDragStart={(event) => {
          event.stopPropagation();
          event.dataTransfer.effectAllowed = "move";
          onDragStart(rowId, image.id);
        }}
        onDragEnd={(event) => {
          event.stopPropagation();
          onDragEnd(rowId);
        }}
      >
        ::
      </span>
      <AdminPreviewImage src={image.url} alt={image.alt || ""} width={320} height={240} sizes="320px" />
      <input
        defaultValue={image.alt || ""}
        onBlur={(event) => onUpdateAlt(rowId, image.id, event.target.value || "")}
        className="admin-input"
        placeholder="描述 / alt"
      />
      <div className="admin-image-meta">{image.width} x {image.height}</div>
      <button type="button" onClick={() => onDelete(rowId, image.id)} className="admin-image-delete">×</button>
    </div>
  );
});

interface AdminProjectRowsEditorProps {
  rows: Row[];
  newRowLayout: LayoutType;
  draggedRowId: string | null;
  draggedImage: DraggedImage;
  onNewRowLayoutChange: (layout: LayoutType) => void;
  onAddRow: () => void;
  onDeleteRow: (rowId: string) => void;
  onUpdateRowLayout: (rowId: string, layout: LayoutType) => void;
  onRowDragStart: (rowId: string) => void;
  onRowDragOver: (rowId: string) => void;
  onRowDragEnd: () => void;
  onAddImage: (rowId: string, image: Omit<Image, "id" | "order">) => Promise<void>;
  onImageDragStart: (rowId: string, imageId: string) => void;
  onImageDragOver: (rowId: string, imageId: string) => void;
  onImageDragEnd: (rowId: string) => void;
  onUpdateImageAlt: (rowId: string, imageId: string, alt: string) => void;
  onDeleteImage: (rowId: string, imageId: string) => void;
}

export default memo(function AdminProjectRowsEditor({
  rows,
  newRowLayout,
  draggedRowId,
  draggedImage,
  onNewRowLayoutChange,
  onAddRow,
  onDeleteRow,
  onUpdateRowLayout,
  onRowDragStart,
  onRowDragOver,
  onRowDragEnd,
  onAddImage,
  onImageDragStart,
  onImageDragOver,
  onImageDragEnd,
  onUpdateImageAlt,
  onDeleteImage,
}: AdminProjectRowsEditorProps) {
  return (
    <>
      <div className="admin-section-title-row">
        <h2 className="admin-subheading">图片行 ({rows.length})</h2>
        <select value={newRowLayout} onChange={(event) => onNewRowLayoutChange(event.target.value as LayoutType)} className="admin-input admin-layout-select">
          {LAYOUT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <button type="button" onClick={onAddRow} className="admin-btn-sm">添加行</button>
      </div>

      {rows.map((row, rowIndex) => (
        <div
          key={row.id}
          className={`admin-project-row${draggedRowId === row.id ? " admin-dragging" : ""}`}
          onDragOver={(event) => {
            if (!draggedRowId || draggedRowId === row.id) return;
            event.preventDefault();
            onRowDragOver(row.id);
          }}
        >
          <div className="admin-project-row-head">
            <div className="admin-row-layout-control">
              <span
                className="admin-drag-handle"
                draggable
                title="拖动排序"
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "move";
                  onRowDragStart(row.id);
                }}
                onDragEnd={onRowDragEnd}
              >
                ::
              </span>
              <span className="admin-muted">行 #{rowIndex}</span>
              <select
                value={row.layout}
                onChange={(event) => onUpdateRowLayout(row.id, event.target.value as LayoutType)}
                className="admin-input admin-layout-select"
              >
                {LAYOUT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <span className="admin-muted">
                {LAYOUT_OPTIONS.find((option) => option.value === row.layout)?.desc}
              </span>
            </div>
            <button type="button" onClick={() => onDeleteRow(row.id)} className="admin-btn-sm admin-btn-danger">删除行</button>
          </div>

          <RowImageAdder onAdd={(image) => onAddImage(row.id, image)} />

          <div className="admin-image-grid">
            {row.images.map((image) => (
              <AdminProjectImageCard
                key={image.id}
                image={image}
                rowId={row.id}
                isDragging={draggedImage?.imageId === image.id}
                onDragStart={onImageDragStart}
                onDragOver={onImageDragOver}
                onDragEnd={onImageDragEnd}
                onUpdateAlt={onUpdateImageAlt}
                onDelete={onDeleteImage}
              />
            ))}
          </div>
        </div>
      ))}
    </>
  );
});
