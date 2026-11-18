export default function Panel({ title, subtitle, children, className = "", contentClassName = "" }) {
  return (
    <section className={`rounded-2xl border border-white/10 bg-white/5 p-4 shadow-xl shadow-black/10 backdrop-blur ${className}`}>
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className="mt-1 text-xs leading-5 text-slate-400">{subtitle}</p>
      </div>
      <div className={contentClassName}>{children}</div>
    </section>
  );
}
