import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Markdown from "react-markdown";
import { journeyMarkdownOptions, journeyMarkdownUrl } from "../src/lib/journey-markdown.ts";

const render = (markdown) => renderToStaticMarkup(createElement(Markdown, {
  ...journeyMarkdownOptions,
  components: { img: ({ src, alt }) => src ? createElement("img", { src, alt }) : null },
}, markdown));

test("public stories and admin preview render Markdown without executable HTML or URL schemes", () => {
  const html = render('Hello **world**\n\n<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n\n[unsafe](javascript:alert%281%29)\n\n![inline](data:image/svg+xml;base64,PHN2Zz4=)');
  assert.match(html, /<strong>world<\/strong>/);
  assert.doesNotMatch(html, /<script|onerror|javascript:|data:image/);
  assert.equal(journeyMarkdownUrl("javascript:alert(1)", "href"), "");
  assert.equal(journeyMarkdownUrl("data:image/svg+xml;base64,abc", "src"), "");
  assert.equal(journeyMarkdownUrl("https://img.ixzki.com/photo.jpg", "src"), "https://img.ixzki.com/photo.jpg");
});

test("Markdown supports photo host migration and GFM tables and lists", () => {
  const html = render('![山](https://upyun.ixzki.com/2026/photo.jpg)\n\n| 地点 | 天气 |\n| --- | --- |\n| 伊宁 | 晴 |\n\n- [x] 已到达\n- [ ] 下一站');
  assert.match(html, /https:\/\/img\.ixzki\.com\/2026\/photo.jpg/);
  assert.doesNotMatch(html, /upyun\.ixzki\.com/);
  assert.match(html, /<table>/);
  assert.match(html, /type="checkbox"/);
  assert.equal(journeyMarkdownUrl("/local-photo.jpg", "src"), "/local-photo.jpg");
});
