import type { EnrichedEmpfaenger } from '@/types/enriched';
import type { Empfaenger, Transfers } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface EmpfaengerMaps {
  transfersMap: Map<string, Transfers>;
}

export function enrichEmpfaenger(
  empfaenger: Empfaenger[],
  maps: EmpfaengerMaps
): EnrichedEmpfaenger[] {
  return empfaenger.map(r => ({
    ...r,
    transfer_referenzName: resolveDisplay(r.fields.transfer_referenz, maps.transfersMap, 'sender_vorname'),
  }));
}
