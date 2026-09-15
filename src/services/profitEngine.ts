export type ProfitInput = {
  purchasePrice: number;
  resalePrice: number;
  shippingIn?: number;
  marketplaceFee?: number;
  marketplaceFeePct?: number;
  paymentFee?: number;
  paymentFeePct?: number;
  packagingCost?: number;
  otherCosts?: number;
};

export type ProfitResult = {
  totalCost: number;
  revenue: number;
  fees: number;
  profit: number;
  marginPct: number;
  roiPct: number;
  breakEvenPrice: number;
};

export function calculateProfit(input: ProfitInput): ProfitResult {
  const purchase = Math.max(0, input.purchasePrice);
  const fixedCosts = Math.max(0, input.shippingIn ?? 0) + Math.max(0, input.packagingCost ?? 0) + Math.max(0, input.otherCosts ?? 0);
  const marketplacePct = Math.max(0, input.marketplaceFeePct ?? 0) / 100;
  const paymentPct = Math.max(0, input.paymentFeePct ?? 0) / 100;
  const percentageRate = marketplacePct + paymentPct;
  const revenue = Math.max(0, input.resalePrice);
  const marketplaceFee = input.marketplaceFee ?? revenue * marketplacePct;
  const paymentFee = input.paymentFee ?? revenue * paymentPct;
  const fees = marketplaceFee + paymentFee;
  const totalCost = purchase + fixedCosts + fees;
  const profit = revenue - totalCost;
  const denominator = Math.max(0.0001, 1 - percentageRate);
  const breakEvenPrice = (purchase + fixedCosts) / denominator;
  return {
    totalCost,
    revenue,
    fees,
    profit,
    marginPct: revenue > 0 ? (profit / revenue) * 100 : 0,
    roiPct: totalCost > 0 ? (profit / totalCost) * 100 : 0,
    breakEvenPrice,
  };
}
