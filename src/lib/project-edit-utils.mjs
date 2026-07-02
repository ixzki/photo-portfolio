export function reindexImages(images) {
  return images.map((image, order) => ({ ...image, order }));
}

export function reindexRows(rows) {
  return rows.map((row, order) => ({ ...row, order, images: reindexImages(row.images || []) }));
}

export function removeRowById(rows, rowId) {
  return reindexRows(rows.filter((row) => row.id !== rowId));
}
