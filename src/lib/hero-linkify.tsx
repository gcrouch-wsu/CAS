import { Fragment } from "react";
import type { ReactNode } from "react";

/**
 * Split on http(s), mailto, or bare email. Capturing group keeps delimiters in split() output.
 * Order: mailto before bare email so addresses inside mailto: are not double-matched.
 */
const LINK_TOKEN_RE =
  /(https?:\/\/[^\s<]+[^\s<.,:;"')\]]*|mailto:[^\s<]+[^\s<.,:;"')\]]*|\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b)/gi;

function stripTrailingLinkJunk(s: string): string {
  return s.replace(/[\].,;:!?)]+$/u, "");
}

/** Returns a usable mailto href, or null if invalid (avoid blank compose window). */
export function normalizeMailtoHref(raw: string): string | null {
  let s = raw.trim();
  if (!/^mailto:/i.test(s)) return null;
  while (/^mailto:mailto:/i.test(s)) {
    s = `mailto:${s.slice(14)}`;
  }
  let addr = s.slice("mailto:".length).trim();
  if (!addr) return null;
  addr = stripTrailingLinkJunk(addr);
  if (!addr.includes("@")) return null;
  return `mailto:${addr}`;
}

function linkStyleClass() {
  return "font-medium text-wsu-crimson underline decoration-wsu-crimson/40 underline-offset-2 hover:decoration-wsu-crimson";
}

/** One line of hero body: auto-link URLs, mailto:, and plain emails. */
export function linkifyHeroSegment(segment: string): ReactNode[] {
  const parts = segment.split(LINK_TOKEN_RE);
  return parts.map((part, i) => {
    if (/^https?:\/\//i.test(part)) {
      const href = stripTrailingLinkJunk(part);
      return (
        <a
          key={i}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={linkStyleClass()}
        >
          {part.trim()}
        </a>
      );
    }
    if (/^mailto:/i.test(part)) {
      const href = normalizeMailtoHref(part);
      if (!href) return <Fragment key={i}>{part}</Fragment>;
      const display = href.slice("mailto:".length);
      return (
        <a key={i} href={href} className={linkStyleClass()}>
          {display}
        </a>
      );
    }
    if (/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(part)) {
      const addr = stripTrailingLinkJunk(part);
      const href = `mailto:${addr}`;
      return (
        <a key={i} href={href} className={linkStyleClass()}>
          {addr}
        </a>
      );
    }
    return part;
  });
}
