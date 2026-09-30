export type DealActionState = 'DISCOVERED' | 'ANALYZED' | 'WATCH' | 'BUY' | 'PASS';

const transitions: Record<DealActionState, readonly DealActionState[]> = {
  DISCOVERED: ['ANALYZED'],
  ANALYZED: ['WATCH', 'BUY', 'PASS'],
  WATCH: ['BUY', 'PASS'],
  BUY: [],
  PASS: [],
};

export function allowedTransitions(state: DealActionState): readonly DealActionState[] {
  return transitions[state];
}

export function isDealActionState(value: unknown): value is DealActionState {
  return typeof value === 'string' && value in transitions;
}

export function transitionDealAction(
  current: DealActionState,
  next: DealActionState,
): DealActionState {
  if (current === next) return current;
  if (!transitions[current].includes(next)) {
    throw new Error(`Invalid deal action transition: ${current} -> ${next}`);
  }
  return next;
}

export function initialDealActionState(hasAnalysis = false): DealActionState {
  return hasAnalysis ? 'ANALYZED' : 'DISCOVERED';
}
