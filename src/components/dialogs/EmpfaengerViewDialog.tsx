import type { Empfaenger, Transfers } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { IconPencil } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

interface EmpfaengerViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Empfaenger | null;
  onEdit: (record: Empfaenger) => void;
  transfersList: Transfers[];
}

export function EmpfaengerViewDialog({ open, onClose, record, onEdit, transfersList }: EmpfaengerViewDialogProps) {
  function getTransfersDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return transfersList.find(r => r.record_id === id)?.fields.sender_vorname ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Empfänger anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Transfer</Label>
            <p className="text-sm">{getTransfersDisplayName(record.fields.transfer_referenz)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Vorname des Empfängers</Label>
            <p className="text-sm">{record.fields.empfaenger_vorname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nachname des Empfängers</Label>
            <p className="text-sm">{record.fields.empfaenger_nachname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">E-Mail des Empfängers</Label>
            <p className="text-sm">{record.fields.empfaenger_email ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Download-Status</Label>
            <Badge variant="secondary">{record.fields.download_status?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Datum des Downloads</Label>
            <p className="text-sm">{formatDate(record.fields.download_datum)}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}