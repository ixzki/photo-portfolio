import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hasManualProjectOrder, sortProjectsForDisplay } from "../src/lib/project-order-utils.mjs";

describe("project ordering", () => {
  it("orders new projects first when no manual order has been set", () => {
    const projects = [
      { id: "old", slug: "old", order: 0, createdAt: "2024-01-01T00:00:00.000Z" },
      { id: "new", slug: "new", order: 0, createdAt: "2026-01-01T00:00:00.000Z" },
      { id: "middle", slug: "middle", order: 0, createdAt: "2025-01-01T00:00:00.000Z" },
    ];

    assert.equal(hasManualProjectOrder(projects), false);
    assert.deepEqual(sortProjectsForDisplay(projects).map((project) => project.id), ["new", "middle", "old"]);
  });

  it("keeps manual order ahead of created time when order values differ", () => {
    const projects = [
      { id: "new", slug: "new", order: 2, createdAt: "2026-01-01T00:00:00.000Z" },
      { id: "old", slug: "old", order: 0, createdAt: "2024-01-01T00:00:00.000Z" },
      { id: "middle", slug: "middle", order: 1, createdAt: "2025-01-01T00:00:00.000Z" },
    ];

    assert.equal(hasManualProjectOrder(projects), true);
    assert.deepEqual(sortProjectsForDisplay(projects).map((project) => project.id), ["old", "middle", "new"]);
  });
});
