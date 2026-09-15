export default function Loading() {
  return <div data-page-pending role="status" aria-label="旅行内容加载中" style={{ minHeight: "calc(100dvh - var(--nav-h))", background: "#f1f1f1" }} />;
}
