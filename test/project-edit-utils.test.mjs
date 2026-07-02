import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { removeRowById } from "../src/lib/project-edit-utils.mjs";

describe("project edit utilities", () => {
  it("removes a row and reindexes remaining rows and images", () => {
    const rows = [
      { id: "a", order: 0, layout: "landscape", images: [{ id: "a1", order: 2 }] },
      { id: "b", order: 1, layout: "half", images: [{ id: "b1", order: 4 }] },
      { id: "c", order: 2, layout: "portrait", images: [{ id: "c1", order: 9 }] },
    ];

    assert.deepEqual(removeRowById(rows, "b"), [
      { id: "a", order: 0, layout: "landscape", images: [{ id: "a1", order: 0 }] },
      { id: "c", order: 1, layout: "portrait", images: [{ id: "c1", order: 0 }] },
    ]);
  });
});
