import type { Empfaenger } from './app';

export type EnrichedEmpfaenger = Empfaenger & {
  transfer_referenzName: string;
};
