export default function Footer({ copyright, icp }: { copyright: string; icp: string }) {
  const year = new Date().getFullYear();
  return (
    <footer className="footer">
      <p>© {year} {copyright}{icp ? ` | ${icp}` : ""}</p>
    </footer>
  );
}
