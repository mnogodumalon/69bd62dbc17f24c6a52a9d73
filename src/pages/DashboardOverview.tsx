import { useState, useMemo } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichEmpfaenger } from '@/lib/enrich';
import type { EnrichedEmpfaenger } from '@/types/enriched';
import type { Transfers } from '@/types/app';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import { APP_IDS } from '@/types/app';
import { formatDate } from '@/lib/formatters';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { TransfersDialog } from '@/components/dialogs/TransfersDialog';
import { EmpfaengerDialog } from '@/components/dialogs/EmpfaengerDialog';
import {
  IconAlertCircle, IconPlus, IconSend, IconUsers, IconCheck,
  IconClock, IconTrash, IconLink, IconCopy, IconEye,
  IconLock, IconLockOpen, IconFile, IconMail, IconPencil,
  IconChevronDown, IconChevronUp,
} from '@tabler/icons-react';

type TransferWithRecipients = Transfers & { recipients: EnrichedEmpfaenger[] };

function getStatusColor(status: string | undefined) {
  switch (status) {
    case 'aktiv': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'abgelaufen': return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'geloescht': return 'bg-red-100 text-red-700 border-red-200';
    default: return 'bg-muted text-muted-foreground border-border';
  }
}

function getDownloadStatusColor(status: string | undefined) {
  switch (status) {
    case 'heruntergeladen': return 'bg-emerald-100 text-emerald-700';
    case 'link_geoeffnet': return 'bg-blue-100 text-blue-700';
    case 'nicht_heruntergeladen': return 'bg-muted text-muted-foreground';
    default: return 'bg-muted text-muted-foreground';
  }
}

function countFiles(transfer: Transfers) {
  const fields = transfer.fields;
  return [
    fields.transfer_datei_1, fields.transfer_datei_2, fields.transfer_datei_3,
    fields.transfer_datei_4, fields.transfer_datei_5,
  ].filter(Boolean).length;
}

export default function DashboardOverview() {
  const {
    transfers, empfaenger,
    transfersMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedEmpfaenger = enrichEmpfaenger(empfaenger, { transfersMap });

  const [transferDialog, setTransferDialog] = useState<{ open: boolean; record?: Transfers }>({ open: false });
  const [empfaengerDialog, setEmpfaengerDialog] = useState<{ open: boolean; record?: EnrichedEmpfaenger; transferId?: string }>({ open: false });
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: 'transfer' | 'empfaenger' } | null>(null);
  const [expandedTransfer, setExpandedTransfer] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const transfersWithRecipients = useMemo((): TransferWithRecipients[] => {
    return transfers.map(t => ({
      ...t,
      recipients: enrichedEmpfaenger.filter(e => {
        const id = extractRecordId(e.fields.transfer_referenz);
        return id === t.record_id;
      }),
    }));
  }, [transfers, enrichedEmpfaenger]);

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return transfersWithRecipients;
    return transfersWithRecipients.filter(t => t.fields.transfer_status?.key === statusFilter);
  }, [transfersWithRecipients, statusFilter]);

  const stats = useMemo(() => {
    const aktiv = transfers.filter(t => t.fields.transfer_status?.key === 'aktiv').length;
    const abgelaufen = transfers.filter(t => t.fields.transfer_status?.key === 'abgelaufen').length;
    const downloaded = enrichedEmpfaenger.filter(e => e.fields.download_status?.key === 'heruntergeladen').length;
    return { total: transfers.length, aktiv, abgelaufen, downloaded, recipients: enrichedEmpfaenger.length };
  }, [transfers, enrichedEmpfaenger]);

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(link);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'transfer') {
      await LivingAppsService.deleteTransfer(deleteTarget.id);
    } else {
      await LivingAppsService.deleteEmpfaengerEntry(deleteTarget.id);
    }
    fetchAll();
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transfers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gesendete Dateien und Empfänger-Status</p>
        </div>
        <Button onClick={() => setTransferDialog({ open: true })} className="shrink-0">
          <IconPlus size={16} className="mr-2 shrink-0" />
          <span>Neuer Transfer</span>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Aktive Transfers"
          value={String(stats.aktiv)}
          description="Laufen noch"
          icon={<IconSend size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Empfänger"
          value={String(stats.recipients)}
          description="Gesamt"
          icon={<IconUsers size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Heruntergeladen"
          value={String(stats.downloaded)}
          description="Von Empfängern"
          icon={<IconCheck size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Abgelaufen"
          value={String(stats.abgelaufen)}
          description="Transfers"
          icon={<IconClock size={18} className="text-muted-foreground" />}
        />
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all', label: 'Alle' },
          { key: 'aktiv', label: 'Aktiv' },
          { key: 'abgelaufen', label: 'Abgelaufen' },
          { key: 'geloescht', label: 'Gelöscht' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors border ${
              statusFilter === f.key
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
            }`}
          >
            {f.label}
            {f.key !== 'all' && (
              <span className="ml-1.5 opacity-70">
                {transfersWithRecipients.filter(t => t.fields.transfer_status?.key === f.key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Transfer cards */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
            <IconSend size={28} stroke={1.5} className="text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground">Keine Transfers</p>
            <p className="text-sm text-muted-foreground mt-1">Erstelle deinen ersten Transfer</p>
          </div>
          <Button variant="outline" onClick={() => setTransferDialog({ open: true })}>
            <IconPlus size={16} className="mr-2" />
            Transfer erstellen
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(transfer => {
            const isExpanded = expandedTransfer === transfer.record_id;
            const fileCount = countFiles(transfer);
            const status = transfer.fields.transfer_status?.key;
            const statusLabel = transfer.fields.transfer_status?.label ?? '—';
            const hasPassword = transfer.fields.transfer_passwort_aktiv;
            const downloadedCount = transfer.recipients.filter(r => r.fields.download_status?.key === 'heruntergeladen').length;

            return (
              <div
                key={transfer.record_id}
                className="rounded-[20px] bg-card border border-border shadow-sm overflow-hidden"
              >
                {/* Card header */}
                <div className="p-4 flex flex-wrap items-start gap-3">
                  {/* Sender info */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <IconSend size={18} className="text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">
                        {[transfer.fields.sender_vorname, transfer.fields.sender_nachname].filter(Boolean).join(' ') || 'Unbekannter Absender'}
                      </p>
                      {transfer.fields.sender_email && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                          <IconMail size={11} className="shrink-0" />
                          {transfer.fields.sender_email}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(status)}`}>
                      {statusLabel}
                    </span>
                    {hasPassword && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">
                        <IconLock size={11} />
                        Passwort
                      </span>
                    )}
                    {fileCount > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">
                        <IconFile size={11} />
                        {fileCount} {fileCount === 1 ? 'Datei' : 'Dateien'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Meta row */}
                <div className="px-4 pb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {transfer.fields.transfer_ablaufdatum && (
                    <span className="flex items-center gap-1">
                      <IconClock size={12} className="shrink-0" />
                      Läuft ab: {formatDate(transfer.fields.transfer_ablaufdatum)}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <IconUsers size={12} className="shrink-0" />
                    {transfer.recipients.length} Empfänger
                    {transfer.recipients.length > 0 && ` · ${downloadedCount} heruntergeladen`}
                  </span>
                  <span className="flex items-center gap-1">
                    <IconClock size={12} className="shrink-0" />
                    {formatDate(transfer.createdat)}
                  </span>
                </div>

                {/* Recipients inline (if expanded) */}
                {isExpanded && transfer.recipients.length > 0 && (
                  <div className="border-t border-border mx-4 pt-3 pb-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Empfänger</p>
                      <button
                        className="text-xs text-primary hover:underline"
                        onClick={() => setEmpfaengerDialog({ open: true, transferId: transfer.record_id })}
                      >
                        + Hinzufügen
                      </button>
                    </div>
                    <div className="space-y-2">
                      {transfer.recipients.map(recipient => {
                        const dlStatus = recipient.fields.download_status?.key;
                        const dlLabel = recipient.fields.download_status?.label ?? 'Unbekannt';
                        return (
                          <div key={recipient.record_id} className="flex flex-wrap items-center gap-2 py-1.5 px-3 rounded-xl bg-muted/50">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                                <span className="text-xs font-semibold text-primary">
                                  {(recipient.fields.empfaenger_vorname?.[0] ?? recipient.fields.empfaenger_email?.[0] ?? '?').toUpperCase()}
                                </span>
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {[recipient.fields.empfaenger_vorname, recipient.fields.empfaenger_nachname].filter(Boolean).join(' ') || recipient.fields.empfaenger_email || '—'}
                                </p>
                                {recipient.fields.empfaenger_email && (
                                  <p className="text-xs text-muted-foreground truncate">{recipient.fields.empfaenger_email}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getDownloadStatusColor(dlStatus)}`}>
                                {dlLabel}
                              </span>
                              {recipient.fields.download_datum && (
                                <span className="text-xs text-muted-foreground hidden sm:block">
                                  {formatDate(recipient.fields.download_datum)}
                                </span>
                              )}
                              <button
                                className="p-1 rounded hover:bg-muted transition-colors"
                                onClick={() => setEmpfaengerDialog({ open: true, record: recipient })}
                                title="Bearbeiten"
                              >
                                <IconPencil size={13} className="text-muted-foreground" />
                              </button>
                              <button
                                className="p-1 rounded hover:bg-destructive/10 transition-colors"
                                onClick={() => setDeleteTarget({ id: recipient.record_id, type: 'empfaenger' })}
                                title="Löschen"
                              >
                                <IconTrash size={13} className="text-destructive/70" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* No recipients expanded state */}
                {isExpanded && transfer.recipients.length === 0 && (
                  <div className="border-t border-border mx-4 pt-3 pb-4 text-center">
                    <p className="text-sm text-muted-foreground mb-2">Noch keine Empfänger</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEmpfaengerDialog({ open: true, transferId: transfer.record_id })}
                    >
                      <IconPlus size={14} className="mr-1" />
                      Empfänger hinzufügen
                    </Button>
                  </div>
                )}

                {/* Action bar */}
                <div className="border-t border-border px-4 py-2.5 flex flex-wrap items-center gap-2 bg-muted/30">
                  <button
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-muted"
                    onClick={() => setExpandedTransfer(isExpanded ? null : transfer.record_id)}
                  >
                    <IconEye size={14} className="shrink-0" />
                    <span className="hidden sm:inline">{isExpanded ? 'Schließen' : 'Empfänger'}</span>
                    {isExpanded ? <IconChevronUp size={13} /> : <IconChevronDown size={13} />}
                  </button>

                  {transfer.fields.transfer_link && (
                    <>
                      <a
                        href={transfer.fields.transfer_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-muted"
                      >
                        <IconLink size={14} className="shrink-0" />
                        <span className="hidden sm:inline">Link öffnen</span>
                      </a>
                      <button
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-muted"
                        onClick={() => handleCopyLink(transfer.fields.transfer_link!)}
                      >
                        {copiedLink === transfer.fields.transfer_link ? (
                          <IconCheck size={14} className="shrink-0 text-emerald-600" />
                        ) : (
                          <IconCopy size={14} className="shrink-0" />
                        )}
                        <span className="hidden sm:inline">
                          {copiedLink === transfer.fields.transfer_link ? 'Kopiert!' : 'Link kopieren'}
                        </span>
                      </button>
                    </>
                  )}

                  {!transfer.fields.transfer_passwort_aktiv ? (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground px-2 py-1">
                      <IconLockOpen size={14} className="shrink-0" />
                      <span className="hidden sm:inline">Kein Passwort</span>
                    </span>
                  ) : null}

                  <div className="ml-auto flex items-center gap-1">
                    <button
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-muted"
                      onClick={() => setTransferDialog({ open: true, record: transfer })}
                    >
                      <IconPencil size={14} className="shrink-0" />
                      <span className="hidden sm:inline">Bearbeiten</span>
                    </button>
                    <button
                      className="flex items-center gap-1.5 text-xs text-destructive/70 hover:text-destructive transition-colors px-2 py-1 rounded-lg hover:bg-destructive/5"
                      onClick={() => setDeleteTarget({ id: transfer.record_id, type: 'transfer' })}
                    >
                      <IconTrash size={14} className="shrink-0" />
                      <span className="hidden sm:inline">Löschen</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      <TransfersDialog
        open={transferDialog.open}
        onClose={() => setTransferDialog({ open: false })}
        onSubmit={async (fields) => {
          if (transferDialog.record) {
            await LivingAppsService.updateTransfer(transferDialog.record.record_id, fields);
          } else {
            await LivingAppsService.createTransfer(fields);
          }
          fetchAll();
        }}
        defaultValues={transferDialog.record?.fields}
        enablePhotoScan={AI_PHOTO_SCAN['Transfers']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Transfers']}
      />

      <EmpfaengerDialog
        open={empfaengerDialog.open}
        onClose={() => setEmpfaengerDialog({ open: false })}
        onSubmit={async (fields) => {
          if (empfaengerDialog.record) {
            await LivingAppsService.updateEmpfaengerEntry(empfaengerDialog.record.record_id, fields);
          } else {
            await LivingAppsService.createEmpfaengerEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={
          empfaengerDialog.record
            ? empfaengerDialog.record.fields
            : empfaengerDialog.transferId
              ? { transfer_referenz: createRecordUrl(APP_IDS.TRANSFERS, empfaengerDialog.transferId) }
              : undefined
        }
        transfersList={transfers}
        enablePhotoScan={AI_PHOTO_SCAN['Empfaenger']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Empfaenger']}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title={deleteTarget?.type === 'transfer' ? 'Transfer löschen' : 'Empfänger löschen'}
        description={
          deleteTarget?.type === 'transfer'
            ? 'Soll dieser Transfer wirklich gelöscht werden? Alle zugehörigen Empfänger bleiben erhalten.'
            : 'Soll dieser Empfänger wirklich gelöscht werden?'
        }
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 rounded-[20px]" />)}
      </div>
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">{error.message}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>Erneut versuchen</Button>
    </div>
  );
}
