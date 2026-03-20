import { useState, useEffect, useMemo, useCallback } from 'react';
import type { TransferSenden, Transfers, Empfaenger } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [transferSenden, setTransferSenden] = useState<TransferSenden[]>([]);
  const [transfers, setTransfers] = useState<Transfers[]>([]);
  const [empfaenger, setEmpfaenger] = useState<Empfaenger[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [transferSendenData, transfersData, empfaengerData] = await Promise.all([
        LivingAppsService.getTransferSenden(),
        LivingAppsService.getTransfers(),
        LivingAppsService.getEmpfaenger(),
      ]);
      setTransferSenden(transferSendenData);
      setTransfers(transfersData);
      setEmpfaenger(empfaengerData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const transfersMap = useMemo(() => {
    const m = new Map<string, Transfers>();
    transfers.forEach(r => m.set(r.record_id, r));
    return m;
  }, [transfers]);

  return { transferSenden, setTransferSenden, transfers, setTransfers, empfaenger, setEmpfaenger, loading, error, fetchAll, transfersMap };
}