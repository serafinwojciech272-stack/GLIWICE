import {
  allowedTransitions,
  initialDealActionState,
  transitionDealAction,
} from '../src/services/decision/actionState.ts';

const assert = (condition, message) => {
  if (!condition) throw new Error(`ACTION STATE SMOKE FAILED: ${message}`);
};

assert(initialDealActionState() === 'DISCOVERED', 'new deal starts discovered');
assert(initialDealActionState(true) === 'ANALYZED', 'analyzed deal starts analyzed');

assert(allowedTransitions('DISCOVERED').includes('ANALYZED'), 'discovered -> analyzed is allowed');
assert(allowedTransitions('ANALYZED').includes('BUY'), 'analyzed -> buy is allowed');
assert(allowedTransitions('ANALYZED').includes('WATCH'), 'analyzed -> watch is allowed');
assert(allowedTransitions('ANALYZED').includes('PASS'), 'analyzed -> pass is allowed');
assert(allowedTransitions('BUY').length === 0, 'buy is terminal');
assert(allowedTransitions('PASS').length === 0, 'pass is terminal');

assert(transitionDealAction('DISCOVERED', 'ANALYZED') === 'ANALYZED', 'valid transition works');
assert(transitionDealAction('ANALYZED', 'WATCH') === 'WATCH', 'watch transition works');
assert(transitionDealAction('WATCH', 'BUY') === 'BUY', 'watch -> buy works');

let rejected = false;
try {
  transitionDealAction('BUY', 'WATCH');
} catch {
  rejected = true;
}
assert(rejected, 'terminal state cannot transition');

console.log('ACTION STATE SMOKE PASS');
