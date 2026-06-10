export default function Panel({ title, subtitle, children }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/10 backdrop-blur">
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-400">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}
