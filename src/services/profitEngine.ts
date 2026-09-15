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
  const revenue = Math.max(0, input.resalePrice);
  const marketplaceFee = input.marketplaceFee ?? revenue * ((input.marketplaceFeePct ?? 0) / 100);
  const paymentFee = input.paymentFee ?? revenue * ((input.paymentFeePct ?? 0) / 100);
  const fees = marketplaceFee + paymentFee;
  const totalCost = Math.max(0, input.purchasePrice) + (input.shippingIn ?? 0) + fees + (input.packagingCost ?? 0) + (input.otherCosts ?? 0);
  const profit = revenue - totalCost;
  return {
    totalCost,
    revenue,
    fees,
    profit,
    marginPct: revenue > 0 ? (profit / revenue) * 100 : 0,
    roiPct: totalCost > 0 ? (profit / totalCost) * 100 : 0,
    breakEvenPrice: totalCost,
  };
}
