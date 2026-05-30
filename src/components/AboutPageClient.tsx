"use client";

import ImageLoader from "@/components/ImageLoader";
import type { ContactItem } from "@/lib/types";

interface Settings {
  avatarUrl: string;
  aboutText: string;
  email: string;
  location: string;
  contacts?: ContactItem[];
}

export default function AboutPageClient({ settings }: { settings: Settings }) {
  const contacts = settings.contacts && settings.contacts.length > 0
    ? settings.contacts
    : [
        { id: "email", label: "email", value: settings.email },
        { id: "location", label: "base", value: settings.location },
      ].filter((item) => item.value);

  return (
    <section
      className="view about-page is-active"
      id="about"
      data-view="about"
      aria-label="关于摄影师"
    >
      <div className="avatar-container">
        <ImageLoader src={settings.avatarUrl} alt="关于" className="avatar load-fade" priority />
      </div>
      <div className="about-text-container">
        <div className="about-text">
          {(settings.aboutText || "").split("\n").filter(Boolean).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        <div className="contact" aria-label="联系方式">
          {contacts.map((item) => {
            const value = item.value.trim();
            const isEmail = value.includes("@") && !value.includes(" ");

            return (
              <p key={item.id}>
                <span>{item.label}</span>
                <span aria-hidden="true"> / </span>
                {isEmail ? <a href={`mailto:${value}`}>{value}</a> : <span>{value}</span>}
              </p>
            );
          })}
        </div>
      </div>
    </section>
  );
}
