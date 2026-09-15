export default function Loading() {
  return <div data-page-pending role="status" aria-label="页面内容加载中" style={{ minHeight: "calc(100dvh - var(--nav-h))" }} />;
}
