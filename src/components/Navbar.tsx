"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar({ siteName }: { siteName: string }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const isDetail = pathname.startsWith("/works/") && pathname !== "/works";

  useEffect(() => {
    if (!isDetail) {
      return;
    }

    const handleScroll = () => {
      const content = document.querySelector<HTMLElement>(".detail-content");
      const shouldShowBar = Boolean(content && content.getBoundingClientRect().top <= 0);
      setScrolled((current) => (current === shouldShowBar ? current : shouldShowBar));
    };

    const frame = window.requestAnimationFrame(handleScroll);
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [isDetail]);

  // Determine active nav item
  const isHome = pathname === "/";
  const isWorks = pathname === "/works";
  const isAbout = pathname === "/about";

  return (
    <nav
      className={`navbar${isDetail && !scrolled ? " navbar-transparent" : ""}`}
      aria-label="主导航"
    >
      <Link className={`logo hover-invert ${isHome ? "is-active" : ""}`} href="/" data-nav="home">
        {siteName}
      </Link>
      <div className="menu">
        <Link
          className={`menu-item hover-invert ${isWorks ? "is-active" : ""}`}
          href="/works"
          data-nav="works"
        >
          作品
        </Link>
        <span className="menu-divider" aria-hidden="true" />
        <Link
          className={`menu-item hover-invert ${isAbout ? "is-active" : ""}`}
          href="/about"
          data-nav="about"
        >
          关于
        </Link>
      </div>
    </nav>
  );
}
