import { TAResult } from '../types';

export type SetupDirection = 'LONG' | 'SHORT' | 'NO_TRADE';

export type SetupRejectionReason = 
  | 'UNCLEAR_STRUCTURE'
  | 'CONTRADICTORY_EVIDENCE'
  | 'TRAPPED_IN_RANGE'
  | 'MISSING_CONFIRMATION'
  | 'STALE_DATA'
  | 'CONFLICTING_TIMEFRAMES'
  | 'INSUFFICIENT_RR'
  | 'UNSUITABLE_VOLATILITY'
  | 'TOO_CLOSE_TO_RESISTANCE'
  | 'TOO_CLOSE_TO_SUPPORT'
  | 'NO_CLEAR_SETUP';

export interface SetupEvidence {
  category: string;
  finding: string;
  direction: 'bullish' | 'bearish' | 'neutral';
}

export interface SetupEvaluation {
  direction: SetupDirection;
  supportingEvidence: SetupEvidence[];
  conflictingEvidence: SetupEvidence[];
  rejectionReasons?: SetupRejectionReason[];
  summary: string;
  
  // Back-reference to the TA data used for this evaluation
  taResult: TAResult;
}
