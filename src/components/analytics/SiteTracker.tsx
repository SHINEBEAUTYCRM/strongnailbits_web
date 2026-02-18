"use client";

// ================================================================
//  SiteTracker — відправляє події в /api/analytics/event
//  Працює паралельно з GA4 для внутрішнього реалтайм дашборду
// ================================================================

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let sid = sessionStorage.getItem("_ss_sid");
  if (!sid) {
    sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem("_ss_sid", sid);
  }
  return sid;
}

function sendEvent(data: Record<string, unknown>) {
  try {
    const payload = {
      ...data,
      session_id: getSessionId(),
      referrer: document.referrer || null,
    };
    fetch("/api/analytics/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch (err) {
    console.error('[SiteTracker] Send event failed:', err);
  }
}

// Експортуємо для використання в інших компонентах
export function trackSiteEvent(
  eventType: string,
  data?: Record<string, unknown>
) {
  sendEvent({ event_type: eventType, ...data });
}

export function SiteTracker() {
  const pathname = usePathname();
  const prevPath = useRef<string | null>(null);

  useEffect(() => {
    // Не трекаємо адмінку
    if (pathname?.startsWith("/admin")) return;

    // Уникаємо дублів
    if (pathname === prevPath.current) return;
    prevPath.current = pathname;

    sendEvent({
      event_type: "page_view",
      page_path: pathname,
      page_title: document.title,
    });
  }, [pathname]);

  return null;
}
