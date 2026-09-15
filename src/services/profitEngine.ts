export type ProfitInput = {
  purchasePrice: number;
  resalePrice: number;
  shippingIn?: number;
  marketplaceFee?: number;
  paymentFee?: number;
  packagingCost?: number;
  otherCosts?: number;
};

export type ProfitResult = {
  totalCost: number;
  revenue: number;
  profit: number;
  marginPct: number;
  roiPct: number;
  breakEvenPrice: number;
};

export function calculateProfit(input: ProfitInput): ProfitResult {
  const totalCost = input.purchasePrice + (input.shippingIn ?? 0) + (input.marketplaceFee ?? 0) + (input.paymentFee ?? 0) + (input.packagingCost ?? 0) + (input.otherCosts ?? 0);
  const revenue = input.resalePrice;
  const profit = revenue - totalCost;
  return {
    totalCost,
    revenue,
    profit,
    marginPct: revenue > 0 ? (profit / revenue) * 100 : 0,
    roiPct: totalCost > 0 ? (profit / totalCost) * 100 : 0,
    breakEvenPrice: totalCost,
  };
}
