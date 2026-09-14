"use client";

export default function ProjectError({ retry }: { retry: () => void }) {
  return <div><h1 className="admin-heading">作品暂时无法加载</h1><p>请检查网络后重试。</p>
    <button type="button" className="admin-btn" onClick={retry}>重新加载</button></div>;
}
