import { useEffect } from "react";

/**
 * While `open`, calls onDismiss when Escape is pressed or, if `containerRef` is given, when the
 * pointer goes down outside that element. Used by menus, drawers and dialogs.
 */
export function useDismiss(open, onDismiss, { containerRef } = {}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = event => event.key === "Escape" && onDismiss();
    const onPointer = event => containerRef?.current && !containerRef.current.contains(event.target) && onDismiss();
    document.addEventListener("keydown", onKey);
    if (containerRef) document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open, onDismiss, containerRef]);
}
