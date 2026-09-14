import assert from "node:assert/strict";
import test from "node:test";
import { moveProjectRow, removeProjectRow, moveProjectImage, removeProjectImage, transferProjectImage, updateProjectImage } from "../src/lib/admin-project-rows.ts";

function fixture() {
  return [
    { id: "first", layout: "half", order: 0, images: [{ id: "a", url: "https://img.ixzki.com/a.jpg", alt: "original", width: 1200, height: 800, order: 0 }, { id: "b", url: "https://img.ixzki.com/b.jpg", alt: null, width: 800, height: 1200, order: 1 }] },
    { id: "second", layout: "portrait", order: 1, images: [{ id: "c", url: "https://img.ixzki.com/c.jpg", alt: null, width: 800, height: 1200, order: 0 }] },
  ];
}

test("moving and removing rows preserves their contents and writes sequential persisted orders", () => {
  const rows = fixture();
  const moved = moveProjectRow(rows, "first", 1);
  assert.deepEqual(moved.map((row) => [row.id, row.order]), [["second", 0], ["first", 1]]);
  assert.deepEqual(moved[1].images, rows[0].images);
  assert.deepEqual(removeProjectRow(moved, "second").map((row) => [row.id, row.order]), [["first", 0]]);
  assert.equal(rows[0].order, 0);
});

test("row and image boundary moves leave the draft untouched", () => {
  const rows = fixture();
  assert.equal(moveProjectRow(rows, "first", -1), rows);
  assert.equal(moveProjectRow(rows, "missing", 1), rows);
  assert.equal(moveProjectImage(rows, "first", "a", -1), rows);
  assert.equal(moveProjectImage(rows, "first", "missing", 1), rows);
});

test("image updates and reordering address the stable ID so description edits cannot move to a different photo", () => {
  const rows = fixture();
  const moved = moveProjectImage(rows, "first", "a", 1);
  const updated = updateProjectImage(moved, "first", "a", { alt: "new description", url: "https://img.ixzki.com/new.jpg" });
  assert.deepEqual(updated[0].images.map((image) => [image.id, image.order]), [["b", 0], ["a", 1]]);
  assert.equal(updated[0].images[1].alt, "new description");
  assert.equal(updated[0].images[0].alt, null);
  assert.equal(rows[0].images[0].alt, "original");
});

test("moving a photo to another row preserves edits without duplication and compacts both row orders", () => {
  const rows = fixture();
  const next = transferProjectImage(rows, "first", "a", "second");
  assert.deepEqual(next[0].images.map((image) => [image.id, image.order]), [["b", 0]]);
  assert.deepEqual(next[1].images.map((image) => [image.id, image.order]), [["c", 0], ["a", 1]]);
  assert.deepEqual(next[1].images[1], { ...rows[0].images[0], order: 1 });
  assert.equal(rows[0].images.length, 2);
  assert.equal(rows[1].images.length, 1);
  assert.equal(transferProjectImage(rows, "first", "a", "missing"), rows);
  assert.equal(transferProjectImage(rows, "first", "a", "first"), rows);
});

test("removing an image keeps other row data unchanged and reindexes the remaining photos", () => {
  const rows = fixture();
  const next = removeProjectImage(rows, "first", "a");
  assert.deepEqual(next[0].images, [{ ...rows[0].images[1], order: 0 }]);
  assert.equal(next[1], rows[1]);
  assert.equal(rows[0].images.length, 2);
});
