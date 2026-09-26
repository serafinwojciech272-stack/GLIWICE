import type { DealAnalysis } from '../../domain/deal';
import { decideOpportunity } from '../decision/opportunityEngine';

export type AlertType = 'BUY_SIGNAL' | 'HIGH_ROI' | 'HIGH_RISK' | 'PRICE_EDGE';

export type SzpiegAlert = {
  id: string;
  type: AlertType;
  dealId: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  createdAt: string;
};

export function buildAlerts(deals: DealAnalysis[]): SzpiegAlert[] {
  const now = new Date().toISOString();
  return deals.flatMap(deal => {
    const decision = decideOpportunity(deal);
    const alerts: SzpiegAlert[] = [];
    if (decision.decision === 'BUY') alerts.push({
      id: `${deal.id}:buy`, type: 'BUY_SIGNAL', dealId: deal.id,
      title: 'BUY SIGNAL', message: `${deal.title}: opportunity score ${decision.buyScore}/100`,
      severity: 'info', createdAt: now
    });
    if (deal.roiPct >= 30) alerts.push({
      id: `${deal.id}:roi`, type: 'HIGH_ROI', dealId: deal.id,
      title: 'HIGH ROI', message: `${deal.title}: ROI ${deal.roiPct.toFixed(1)}%`,
      severity: 'info', createdAt: now
    });
    if (deal.risk === 'high' || deal.risk === 'critical') alerts.push({
      id: `${deal.id}:risk`, type: 'HIGH_RISK', dealId: deal.id,
      title: 'RISK ALERT', message: `${deal.title}: risk ${deal.risk.toUpperCase()}`,
      severity: deal.risk === 'critical' ? 'critical' : 'warning', createdAt: now
    });
    if (deal.marketAdvantagePct >= 20) alerts.push({
      id: `${deal.id}:edge`, type: 'PRICE_EDGE', dealId: deal.id,
      title: 'MARKET EDGE', message: `${deal.title}: ${deal.marketAdvantagePct.toFixed(1)}% below market`,
      severity: 'info', createdAt: now
    });
    return alerts;
  });
}
