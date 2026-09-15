import { useMemo, useState } from 'react';
import { Bell, ChevronRight, ExternalLink, Heart, Search, ShieldCheck, SlidersHorizontal, Sparkles, TrendingDown, Zap } from 'lucide-react';
import type { DealAnalysis } from './domain/deal';
import { mockSource } from './sources/mockSource';
import { runScan } from './services/scanEngine';

const categories = ['Wszystko', 'Audio', 'Laptopy', 'Smartfony', 'Hobby'];
const money = (value: number) => `${Math.round(value).toLocaleString('pl-PL')} zł`;

export default function App() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Wszystko');
  const [watched, setWatched] = useState<string[]>([]);
  const [deals, setDeals] = useState<DealAnalysis[]>([]);
  const [selected, setSelected] = useState<DealAnalysis | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanInfo, setScanInfo] = useState('Gotowy do skanu');

  const filtered = useMemo(() => deals.filter((d) => {
    const matchesCategory = category === 'Wszystko' || d.category === category;
    const haystack = `${d.title} ${d.store} ${d.category} ${d.brand ?? ''}`.toLowerCase();
    return matchesCategory && haystack.includes(query.toLowerCase());
  }), [deals, category, query]);

  const runSzpieg = async () => {
    setScanning(true);
    setScanInfo('Skanowanie rynku...');
    try {
      const result = await runScan([mockSource]);
      setDeals(result.deals);
      setScanInfo(`${result.offersFound} ofert • ${result.durationMs} ms • ${result.errors.length ? 'częściowy wynik' : 'źródło OK'}`);
    } finally {
      setScanning(false);
    }
  };

  const toggleWatch = (id: string) => setWatched((current) => current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);

  return <div className="app">
    <aside>
      <div className="brand"><div className="logo">SZ</div><div><b>EXTRA SZPIEG</b><span>AI DEAL INTELLIGENCE</span></div></div>
      <nav><a className="active"><Sparkles/> Radar okazji</a><a><TrendingDown/> Największe spadki</a><a><Heart/> Obserwowane</a><a><Bell/> Alerty</a></nav>
      <div className="sideBottom"><ShieldCheck/><span>Silnik analityczny<br/><b>CORE ONLINE</b></span></div>
    </aside>
    <main>
      <header><div><p className="eyebrow">AI DEAL INTELLIGENCE ENGINE</p><h1>Radar okazji</h1><p className="muted">Znajdź cenę, policz zysk, oceń ryzyko.</p></div><button className="scanButton" onClick={runSzpieg} disabled={scanning}><Zap/> {scanning ? 'SZPIEG SKANUJE' : 'URUCHOM SZPIEGA'}</button></header>
      <section className="scanStatus"><span className={scanning ? 'pulse' : ''}></span>{scanInfo}</section>
      <section className="search"><Search/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Szukaj produktu, kategorii lub sklepu..."/><button><SlidersHorizontal/> Filtry</button></section>
      <div className="chips">{categories.map((c) => <button className={category === c ? 'chip activeChip' : 'chip'} onClick={() => setCategory(c)} key={c}>{c}</button>)}</div>
      <section className="stats"><div><span>Oferty w skanie</span><strong>{deals.length}</strong></div><div><span>Mega okazje</span><strong>{deals.filter((d) => d.score >= 90).length}</strong></div><div><span>Potencjalny zysk</span><strong>{money(deals.reduce((sum, d) => sum + Math.max(0, d.potentialProfit), 0))}</strong></div><div><span>Obserwowane</span><strong>{watched.length}</strong></div></section>
      <div className="sectionHead"><div><h2>{deals.length ? 'Najlepsze okazje teraz' : 'Uruchom pierwszy skan'}</h2><p className="muted">Każda oferta przechodzi przez cenę, koszt, zysk, ROI, ryzyko i Szpieg Score.</p></div><button className="link" onClick={runSzpieg}>Skanuj ponownie <ChevronRight/></button></div>
      {deals.length === 0 ? <div className="empty heroEmpty"><Sparkles/><h3>Szpieg czeka na rozkaz</h3><p>Uruchom skan, aby przepuścić oferty przez prawdziwy pipeline analityczny.</p><button className="dealBtn" onClick={runSzpieg}>URUCHOM SZPIEGA</button></div> : <section className="grid">{filtered.map((d) => <article className="card" key={d.id}>
        <div className="cardTop"><span className="tag">{d.category}</span><button className="heart" onClick={() => toggleWatch(d.id)}><Heart fill={watched.includes(d.id) ? 'currentColor' : 'none'}/></button></div>
        <div className="productImage"><Sparkles/></div><h3>{d.title}</h3><p className="store">{d.store} · {d.condition}</p>
        <div className="prices"><strong>{money(d.price)}</strong>{d.previousPrice && <del>{money(d.previousPrice)}</del>}<em>-{d.discountPct}%</em></div>
        <div className="dealMetrics"><span>ZYSK <b>{money(d.potentialProfit)}</b></span><span>ROI <b>{d.roiPct.toFixed(1)}%</b></span></div>
        <div className="confidence"><span><ShieldCheck/> Szpieg Score <b>{d.score}/100</b></span><span>Ryzyko <b>{d.risk.toUpperCase()}</b> · {d.confidence}% confidence</span></div>
        <button className="dealBtn" onClick={() => setSelected(d)}>Analizuj okazję <ChevronRight/></button>
      </article>)}</section>}
      {selected && <div className="modalBackdrop" onClick={() => setSelected(null)}><section className="detailPanel" onClick={(e) => e.stopPropagation()}>
        <div className="detailHeader"><div><p className="eyebrow">SZPIEG ANALYSIS</p><h2>{selected.title}</h2><p className="muted">{selected.store}</p></div><button className="close" onClick={() => setSelected(null)}>×</button></div>
        <div className="detailGrid"><div><span>CENA ZAKUPU</span><b>{money(selected.price)}</b></div><div><span>RYNEK</span><b>{money(selected.marketMedian ?? selected.price)}</b></div><div><span>POT. ODSPRZEDAŻ</span><b>{money(selected.estimatedResalePrice ?? selected.price)}</b></div><div><span>KOSZT CAŁKOWITY</span><b>{money(selected.totalCost)}</b></div><div><span>ZYSK</span><b>{money(selected.potentialProfit)}</b></div><div><span>ROI</span><b>{selected.roiPct.toFixed(1)}%</b></div></div>
        <div className="verdict"><strong>{selected.verdict}</strong><span>Score {selected.score}/100 · Confidence {selected.confidence}% · Risk {selected.risk}</span></div><ul>{selected.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
        <button className="dealBtn" onClick={() => window.open(selected.sourceUrl, '_blank')}><ExternalLink/> Sprawdź źródło</button>
      </section></div>}
    </main>
  </div>;
}
