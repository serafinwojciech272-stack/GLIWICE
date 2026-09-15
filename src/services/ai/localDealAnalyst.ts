import type { DealAnalysis, Verdict } from '../../domain/deal';

export type AIInsight = {
  verdict: Verdict;
  headline: string;
  explanation: string;
  confidence: number;
  action: string;
};

/** Local, deterministic intelligence layer. It never invents market data. */
export function analyzeDealLocally(deal: DealAnalysis): AIInsight {
  const confidence = Math.min(99, Math.round((deal.confidence + (deal.marketMedian ? 10 : 0)) / 1.1));
  if (deal.risk === 'critical' || deal.confidence < 55) {
    return { verdict: 'HIGH RISK', headline: 'Dane są zbyt słabe', explanation: 'Nie podejmuj decyzji zakupowej bez lepszej weryfikacji ceny, sprzedawcy lub historii.', confidence, action: 'PASS / VERIFY' };
  }
  if (deal.score >= 95 && deal.roiPct >= 40 && deal.risk === 'low') {
    return { verdict: 'STRONG BUY', headline: 'Szpieg Elite', explanation: 'Cena, potencjalny zwrot i ryzyko tworzą wyjątkowo mocny profil okazji.', confidence, action: 'ACT FAST' };
  }
  if (deal.score >= 90 && deal.roiPct >= 25 && deal.risk !== 'high') {
    return { verdict: 'BUY NOW', headline: 'Realna okazja', explanation: 'Oferta jest wyraźnie poniżej rynku i zachowuje sensowny potencjał po uwzględnieniu kosztów.', confidence, action: 'CHECK OFFER' };
  }
  if (deal.score >= 80 && deal.roiPct >= 15) {
    return { verdict: 'WATCH', headline: 'Warta obserwacji', explanation: 'Profil jest interesujący, ale dodatkowy spadek ceny poprawiłby margines bezpieczeństwa.', confidence, action: 'WATCH PRICE' };
  }
  return { verdict: 'WAIT', headline: 'Poczekaj na lepszy setup', explanation: 'Oferta nie ma jeszcze wystarczającej przewagi, aby uznać ją za priorytet zakupowy.', confidence, action: 'WAIT' };
}
