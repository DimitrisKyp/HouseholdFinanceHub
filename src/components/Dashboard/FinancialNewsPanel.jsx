import Panel from "@/components/Panel";

export default function FinancialNewsPanel({ news }) {
  return (
    <Panel title="Financial news" subtitle="Story-style market updates for a real dashboard feel.">
      <div className="grid gap-4 md:grid-cols-3">
        {news.map(item => (
          <article key={item.title} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
            <p className="text-xs tracking-[0.2em] text-cyan-300 uppercase">{item.source}</p>
            <h3 className="mt-3 font-semibold text-white">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">{item.summary}</p>
          </article>
        ))}
      </div>
    </Panel>
  );
}
