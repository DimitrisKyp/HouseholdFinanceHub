import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

/**
 * `as` picks the element ("section" by default, or "article", "li", …). The remaining props are
 * those of a generic HTML element (id, aria-*, data-*, …); see the note on the type below.
 */
type CardProps = {
  as?: ElementType;
  className?: string;
  children?: ReactNode;
} & Omit<ComponentPropsWithoutRef<"section">, "className" | "children">;

// The app's surface: a rounded, bordered, slightly raised box. Panel adds a title and subtitle.
// (A fully polymorphic type — props that change with `as` — needs a generic; this app only passes
// global HTML attributes, so <section>'s props are an honest, simpler description.)
export default function Card({ as: Tag = "section", className = "", children, ...rest }: CardProps) {
  return (
    <Tag className={`rounded-card border-line border bg-white/5 p-4 shadow-xl shadow-black/10 backdrop-blur ${className}`} {...rest}>
      {children}
    </Tag>
  );
}
