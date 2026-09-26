"use client";

import { useEffect, type ReactNode } from "react";

export function ContentGuard({ children }: { children: ReactNode }) {
  useEffect(() => {
    const onContextMenu = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      e.preventDefault();
    };
    const onCopy = (e: ClipboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      e.preventDefault();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      const key = (e.key ?? "").toLowerCase();
      const block =
        e.key === "PrintScreen" ||
        (e.ctrlKey && ["s", "p", "u"].includes(key)) ||
        (e.ctrlKey && e.shiftKey && ["i", "j", "c"].includes(key)) ||
        (e.metaKey && ["s", "p"].includes(key));
      if (block) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen") {
        document.body.classList.add("capture-warn");
        window.setTimeout(() => document.body.classList.remove("capture-warn"), 2400);
      }
    };
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("copy", onCopy);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("keyup", onKeyUp);
    return () => {
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  return <div className="security-content min-h-screen">{children}</div>;
}
