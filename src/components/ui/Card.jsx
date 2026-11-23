// The app's surface: a rounded, bordered, slightly raised box. Panel adds a title and subtitle.
export default function Card({ as: Tag = "section", className = "", children, ...rest }) {
  return (
    <Tag className={`rounded-card border-line border bg-white/5 p-4 shadow-xl shadow-black/10 backdrop-blur ${className}`} {...rest}>
      {children}
    </Tag>
  );
}
