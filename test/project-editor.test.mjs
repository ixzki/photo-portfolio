import assert from "node:assert/strict";
import test from "node:test";
import { prepareProjectDraft } from "../src/lib/project-editor.ts";

const draft = () => ({ id: "p1", slug: "test", titleZh: "标题", design: "", city: "", time: "", equipment: "", order: 0, visible: false,
  coverUrl: "https://img.ixzki.com/cover.jpg", thumbUrl: "https://img.ixzki.com/list.jpg", coverW: 6000, coverH: 4000, thumbW: 600, thumbH: 400,
  rows: [{ id: "r1", order: 6, layout: "half", images: [{ id: "i1", url: "https://img.ixzki.com/1.jpg", alt: "最新输入的描述", order: 7, width: 1440, height: 960 }] }] });

test("saving rejects unfinished photos with the exact row and image to correct", () => {
  const value = draft(); value.rows[0].images.push({ ...value.rows[0].images[0], id: "pending", url: "" });
  assert.throws(() => prepareProjectDraft(value), error => error.section === "rows" && error.imageId === "pending" && /第 1 行第 2 张/.test(error.message));
  value.rows[0].images[1].url = "https://img.ixzki.com/2.jpg"; value.rows[0].images[1].width = 0;
  assert.throws(() => prepareProjectDraft(value), error => error.imageId === "pending" && /尺寸/.test(error.message));
});

test("save normalizes ordering and legacy hosts without mutating the draft or dropping captions", () => {
  const value = draft(); value.coverUrl = "https://upyun.ixzki.com/cover.jpg";
  const saved = prepareProjectDraft(value);
  assert.equal(saved.coverUrl, "https://img.ixzki.com/cover.jpg"); assert.equal(saved.featureUrl, saved.coverUrl);
  assert.equal(saved.rows[0].order, 0); assert.equal(saved.rows[0].images[0].order, 0);
  assert.equal(saved.rows[0].images[0].alt, "最新输入的描述"); assert.equal(value.rows[0].order, 6);
});

test("invalid metadata and executable photo links point to the matching editor section", () => {
  assert.throws(() => prepareProjectDraft({ ...draft(), slug: "bad slug" }), error => error.section === "settings");
  assert.throws(() => prepareProjectDraft({ ...draft(), titleZh: " " }), error => error.section === "information");
  assert.throws(() => prepareProjectDraft({ ...draft(), coverUrl: "javascript:alert(1)" }), error => error.section === "pictures");
});
