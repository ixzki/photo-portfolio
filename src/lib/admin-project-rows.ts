import type { Image, Row } from "./types.ts";

function orderedImages(images: Image[]): Image[] {
  return images.map((image, order) => image.order === order ? image : { ...image, order });
}

export function orderedProjectRows(rows: Row[]): Row[] {
  return rows.map((row, order) => ({ ...row, order, images: orderedImages(row.images) }));
}

/** Moves by stable IDs so edits remain attached to the same row after reordering. */
export function moveProjectRow(rows: Row[], rowId: string, direction: -1 | 1): Row[] {
  const index = rows.findIndex((row) => row.id === rowId);
  const destination = index + direction;
  if (index < 0 || destination < 0 || destination >= rows.length) return rows;
  const next = [...rows];
  [next[index], next[destination]] = [next[destination], next[index]];
  return orderedProjectRows(next);
}

export function removeProjectRow(rows: Row[], rowId: string): Row[] {
  if (!rows.some((row) => row.id === rowId)) return rows;
  return orderedProjectRows(rows.filter((row) => row.id !== rowId));
}

export function updateProjectImage(rows: Row[], rowId: string, imageId: string, patch: Partial<Omit<Image, "id" | "order">>): Row[] {
  return rows.map((row) => row.id !== rowId ? row : {
    ...row,
    images: row.images.map((image) => image.id === imageId ? { ...image, ...patch } : image),
  });
}

export function removeProjectImage(rows: Row[], rowId: string, imageId: string): Row[] {
  return rows.map((row) => row.id !== rowId ? row : {
    ...row, images: orderedImages(row.images.filter((image) => image.id !== imageId)),
  });
}

export function moveProjectImage(rows: Row[], rowId: string, imageId: string, direction: -1 | 1): Row[] {
  const row = rows.find((item) => item.id === rowId);
  const index = row?.images.findIndex((image) => image.id === imageId) ?? -1;
  const destination = index + direction;
  if (!row || index < 0 || destination < 0 || destination >= row.images.length) return rows;
  const images = [...row.images];
  [images[index], images[destination]] = [images[destination], images[index]];
  return rows.map((item) => item.id === rowId ? { ...item, images: orderedImages(images) } : item);
}

/** Transfer rather than duplicate an image, preserving its content and stable ID. */
export function transferProjectImage(rows: Row[], sourceRowId: string, imageId: string, destinationRowId: string): Row[] {
  if (sourceRowId === destinationRowId) return rows;
  const image = rows.find((row) => row.id === sourceRowId)?.images.find((item) => item.id === imageId);
  if (!image || !rows.some((row) => row.id === destinationRowId)) return rows;
  return rows.map((row) => {
    if (row.id === sourceRowId) return { ...row, images: orderedImages(row.images.filter((item) => item.id !== imageId)) };
    if (row.id === destinationRowId) return { ...row, images: [...row.images, { ...image, order: row.images.length }] };
    return row;
  });
}
