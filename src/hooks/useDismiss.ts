import { useEffect, type RefObject } from "react";

/**
 * While `open`, calls onDismiss when Escape is pressed or, if `containerRef` is given, when the
 * pointer goes down outside that element. Used by menus, drawers and dialogs.
 */
export function useDismiss(open: boolean, onDismiss: () => void, { containerRef }: { containerRef?: RefObject<HTMLElement | null> } = {}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onDismiss();
    const onPointer = (event: PointerEvent) =>
      containerRef?.current && !containerRef.current.contains(event.target as Node | null) && onDismiss();
    document.addEventListener("keydown", onKey);
    if (containerRef) document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open, onDismiss, containerRef]);
}
