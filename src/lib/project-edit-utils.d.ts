import type { Image, Row } from "./types";

export function reindexImages(images: Image[]): Image[];

export function reindexRows(rows: Row[]): Row[];

export function removeRowById(rows: Row[], rowId: string): Row[];
