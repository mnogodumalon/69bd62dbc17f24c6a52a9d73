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
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { TransfersDialog } from '@/components/dialogs/TransfersDialog';
import { EmpfaengerDialog } from '@/components/dialogs/EmpfaengerDialog';
import {
  IconAlertCircle, IconPlus, IconSend, IconUsers, IconCheck,
  IconClock, IconTrash, IconLink, IconCopy, IconEye, IconEyeOff,
  IconLock, IconLockOpen, IconFile, IconMail, IconPencil,
  IconDownload, IconShare, IconShield,
  IconCalendarOff, IconRefresh,
} from '@tabler/icons-react';

type TransferWithRecipients = Transfers & { recipients: EnrichedEmpfaenger[] };

function getStatusMeta(status: string | undefined) {
  switch (status) {
    case 'aktiv': return { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', label: 'Aktiv', pulse: true };
    case 'abgelaufen': return { dot: 'bg-amber-400', badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200', label: 'Abgelaufen', pulse: false };
    case 'geloescht': return { dot: 'bg-red-400', badge: 'bg-red-50 text-red-600 ring-1 ring-red-200', label: 'Gelöscht', pulse: false };
    default: return { dot: 'bg-muted-foreground/40', badge: 'bg-muted text-muted-foreground ring-1 ring-border', label: 'Unbekannt', pulse: false };
  }
}

function getDownloadMeta(status: string | undefined) {
  switch (status) {
    case 'heruntergeladen': return { color: 'text-emerald-600', bg: 'bg-emerald-50 ring-1 ring-emerald-200', icon: IconCheck, label: 'Heruntergeladen' };
    case 'link_geoeffnet': return { color: 'text-blue-600', bg: 'bg-blue-50 ring-1 ring-blue-200', icon: IconEye, label: 'Link geöffnet' };
    case 'nicht_heruntergeladen': return { color: 'text-muted-foreground', bg: 'bg-muted ring-1 ring-border', icon: IconClock, label: 'Ausstehend' };
    default: return { color: 'text-muted-foreground', bg: 'bg-muted ring-1 ring-border', icon: IconClock, label: 'Ausstehend' };
  }
}

function countFiles(transfer: Transfers) {
  const f = transfer.fields;
  return [f.transfer_datei_1, f.transfer_datei_2, f.transfer_datei_3, f.transfer_datei_4, f.transfer_datei_5].filter(Boolean).length;
}

function senderInitials(transfer: Transfers) {
  const first = transfer.fields.sender_vorname?.[0] ?? '';
  const last = transfer.fields.sender_nachname?.[0] ?? '';
  return (first + last).toUpperCase() || (transfer.fields.sender_email?.[0]?.toUpperCase() ?? '?');
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
    const opened = enrichedEmpfaenger.filter(e => e.fields.download_status?.key === 'link_geoeffnet').length;
    const pending = enrichedEmpfaenger.filter(e => !e.fields.download_status || e.fields.download_status.key === 'nicht_heruntergeladen').length;
    return { total: transfers.length, aktiv, abgelaufen, downloaded, opened, pending, recipients: enrichedEmpfaenger.length };
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

  const downloadRate = stats.recipients > 0
    ? Math.round((stats.downloaded / stats.recipients) * 100)
    : 0;

  return (
    <div className="space-y-8 pb-12">

      {/* ── Hero Header ─────────────────────────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary/90 to-primary p-6 sm:p-8 text-primary-foreground shadow-lg">
        {/* decorative blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5" />
          <div className="absolute bottom-0 left-1/3 w-32 h-32 rounded-full bg-white/5" />
        </div>
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                <IconShare size={18} className="text-white" />
              </div>
              <span className="text-sm font-medium text-white/70">FileFlow Dashboard</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Deine Transfers</h1>
            <p className="mt-1 text-sm text-white/70">
              {stats.aktiv} aktiv · {stats.recipients} Empfänger · {downloadRate}% heruntergeladen
            </p>
          </div>
          <Button
            onClick={() => setTransferDialog({ open: true })}
            className="bg-white text-primary hover:bg-white/90 font-semibold shadow-sm shrink-0"
          >
            <IconPlus size={16} className="mr-2 shrink-0" />
            Neuer Transfer
          </Button>
        </div>
      </div>

      {/* ── KPI Row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: 'Aktive Transfers',
            value: stats.aktiv,
            icon: IconSend,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
          },
          {
            label: 'Empfänger gesamt',
            value: stats.recipients,
            icon: IconUsers,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
          },
          {
            label: 'Heruntergeladen',
            value: stats.downloaded,
            icon: IconDownload,
            color: 'text-violet-600',
            bg: 'bg-violet-50',
          },
          {
            label: 'Abgelaufen',
            value: stats.abgelaufen,
            icon: IconCalendarOff,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
          },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow">
            <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}>
              <Icon size={18} className={`${color} shrink-0`} />
            </div>
            <div>
              <p className="text-2xl font-bold tracking-tight">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Download-Rate Bar ─────────────────────────────────────────── */}
      {stats.recipients > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold">Empfänger-Aktivität</p>
              <p className="text-xs text-muted-foreground mt-0.5">Status aller {stats.recipients} Empfänger</p>
            </div>
            <span className="text-lg font-bold text-primary">{downloadRate}%</span>
          </div>
          <div className="w-full h-3 rounded-full bg-muted overflow-hidden flex">
            {stats.downloaded > 0 && (
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${(stats.downloaded / stats.recipients) * 100}%` }}
              />
            )}
            {stats.opened > 0 && (
              <div
                className="h-full bg-blue-400 transition-all"
                style={{ width: `${(stats.opened / stats.recipients) * 100}%` }}
              />
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              Heruntergeladen ({stats.downloaded})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400 shrink-0" />
              Link geöffnet ({stats.opened})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30 shrink-0" />
              Ausstehend ({stats.pending})
            </span>
          </div>
        </div>
      )}

      {/* ── Filter Tabs ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all', label: 'Alle', count: transfers.length },
          { key: 'aktiv', label: 'Aktiv', count: stats.aktiv },
          { key: 'abgelaufen', label: 'Abgelaufen', count: stats.abgelaufen },
          { key: 'geloescht', label: 'Gelöscht', count: transfers.filter(t => t.fields.transfer_status?.key === 'geloescht').length },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all border ${
              statusFilter === f.key
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
            }`}
          >
            {f.label}
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
              statusFilter === f.key ? 'bg-white/20' : 'bg-muted'
            }`}>
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Transfer List ─────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-5">
          <div className="w-20 h-20 rounded-3xl bg-muted flex items-center justify-center">
            <IconSend size={36} stroke={1.2} className="text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground text-lg">Keine Transfers</p>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-xs">
              {statusFilter === 'all' ? 'Teile Dateien sicher mit deinen Empfängern.' : `Keine Transfers mit Status "${statusFilter}".`}
            </p>
          </div>
          {statusFilter === 'all' && (
            <Button onClick={() => setTransferDialog({ open: true })}>
              <IconPlus size={16} className="mr-2" />
              Ersten Transfer erstellen
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(transfer => {
            const isExpanded = expandedTransfer === transfer.record_id;
            const fileCount = countFiles(transfer);
            const status = transfer.fields.transfer_status?.key;
            const statusMeta = getStatusMeta(status);
            const downloadedCount = transfer.recipients.filter(r => r.fields.download_status?.key === 'heruntergeladen').length;
            const openedCount = transfer.recipients.filter(r => r.fields.download_status?.key === 'link_geoeffnet').length;
            const senderName = [transfer.fields.sender_vorname, transfer.fields.sender_nachname].filter(Boolean).join(' ') || 'Unbekannter Absender';
            const initials = senderInitials(transfer);
            const recipientProgress = transfer.recipients.length > 0
              ? Math.round((downloadedCount / transfer.recipients.length) * 100)
              : 0;

            return (
              <div
                key={transfer.record_id}
                className="group rounded-2xl bg-card border border-border shadow-sm hover:shadow-md transition-all overflow-hidden"
              >
                {/* ── Card Top ── */}
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shrink-0 font-bold text-primary text-sm">
                      {initials}
                    </div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <p className="font-semibold text-sm truncate">{senderName}</p>
                        {/* Status badge */}
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${statusMeta.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot} ${statusMeta.pulse ? 'animate-pulse' : ''} shrink-0`} />
                          {statusMeta.label}
                        </span>
                        {transfer.fields.transfer_passwort_aktiv && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground ring-1 ring-border">
                            <IconShield size={10} className="shrink-0" />
                            Geschützt
                          </span>
                        )}
                      </div>

                      {transfer.fields.sender_email && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2 truncate">
                          <IconMail size={11} className="shrink-0" />
                          {transfer.fields.sender_email}
                        </p>
                      )}

                      {/* Meta pills */}
                      <div className="flex flex-wrap gap-2">
                        {fileCount > 0 && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-lg">
                            <IconFile size={11} className="shrink-0" />
                            {fileCount} {fileCount === 1 ? 'Datei' : 'Dateien'}
                          </span>
                        )}
                        {transfer.fields.transfer_ablaufdatum && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-lg">
                            <IconClock size={11} className="shrink-0" />
                            bis {formatDate(transfer.fields.transfer_ablaufdatum)}
                          </span>
                        )}
                        {!transfer.fields.transfer_passwort_aktiv && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-lg">
                            <IconLockOpen size={11} className="shrink-0" />
                            Kein Passwort
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ── Recipient Progress ── */}
                  {transfer.recipients.length > 0 && (
                    <div className="mt-4 p-3 rounded-xl bg-muted/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                          <IconUsers size={12} className="shrink-0" />
                          {transfer.recipients.length} Empfänger
                        </span>
                        <span className="text-xs font-bold text-primary">{recipientProgress}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden flex">
                        {downloadedCount > 0 && (
                          <div
                            className="h-full bg-emerald-500"
                            style={{ width: `${(downloadedCount / transfer.recipients.length) * 100}%` }}
                          />
                        )}
                        {openedCount > 0 && (
                          <div
                            className="h-full bg-blue-400"
                            style={{ width: `${(openedCount / transfer.recipients.length) * 100}%` }}
                          />
                        )}
                      </div>
                      <div className="mt-1.5 flex gap-3 text-xs text-muted-foreground">
                        <span>{downloadedCount} heruntergeladen</span>
                        <span>{openedCount} geöffnet</span>
                        <span>{transfer.recipients.length - downloadedCount - openedCount} ausstehend</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Expanded Recipients ── */}
                {isExpanded && (
                  <div className="border-t border-border bg-muted/20 px-5 py-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Empfänger</p>
                      <button
                        className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        onClick={() => setEmpfaengerDialog({ open: true, transferId: transfer.record_id })}
                      >
                        <IconPlus size={13} />
                        Hinzufügen
                      </button>
                    </div>

                    {transfer.recipients.length === 0 ? (
                      <div className="flex flex-col items-center py-6 gap-3">
                        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                          <IconUsers size={20} stroke={1.5} className="text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground">Noch keine Empfänger</p>
                        <Button size="sm" variant="outline" onClick={() => setEmpfaengerDialog({ open: true, transferId: transfer.record_id })}>
                          <IconPlus size={14} className="mr-1" />
                          Empfänger hinzufügen
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {transfer.recipients.map(recipient => {
                          const dlMeta = getDownloadMeta(recipient.fields.download_status?.key);
                          const DlIcon = dlMeta.icon;
                          const rName = [recipient.fields.empfaenger_vorname, recipient.fields.empfaenger_nachname].filter(Boolean).join(' ') || recipient.fields.empfaenger_email || '—';
                          const rInitial = (recipient.fields.empfaenger_vorname?.[0] ?? recipient.fields.empfaenger_email?.[0] ?? '?').toUpperCase();
                          return (
                            <div key={recipient.record_id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/60 hover:border-border transition-colors">
                              {/* Avatar */}
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-bold text-primary">
                                {rInitial}
                              </div>
                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{rName}</p>
                                {recipient.fields.empfaenger_email && (
                                  <p className="text-xs text-muted-foreground truncate">{recipient.fields.empfaenger_email}</p>
                                )}
                              </div>
                              {/* Status */}
                              <div className="flex items-center gap-2 shrink-0">
                                <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${dlMeta.bg} ${dlMeta.color}`}>
                                  <DlIcon size={11} className="shrink-0" />
                                  <span className="hidden sm:inline">{dlMeta.label}</span>
                                </span>
                                {recipient.fields.download_datum && (
                                  <span className="text-xs text-muted-foreground hidden md:block">
                                    {formatDate(recipient.fields.download_datum)}
                                  </span>
                                )}
                                <button
                                  className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                                  onClick={() => setEmpfaengerDialog({ open: true, record: recipient })}
                                  title="Bearbeiten"
                                >
                                  <IconPencil size={13} className="text-muted-foreground" />
                                </button>
                                <button
                                  className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
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
                    )}
                  </div>
                )}

                {/* ── Action Bar ── */}
                <div className="border-t border-border px-4 py-2.5 flex flex-wrap items-center gap-1 bg-muted/20">
                  {/* Expand recipients */}
                  <button
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isExpanded
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                    onClick={() => setExpandedTransfer(isExpanded ? null : transfer.record_id)}
                  >
                    {isExpanded ? <IconEyeOff size={14} className="shrink-0" /> : <IconEye size={14} className="shrink-0" />}
                    <span className="hidden sm:inline">{isExpanded ? 'Schließen' : 'Empfänger'}</span>
                    {!isExpanded && transfer.recipients.length > 0 && (
                      <span className="w-4 h-4 bg-primary/15 text-primary rounded-full text-[10px] font-bold flex items-center justify-center">
                        {transfer.recipients.length}
                      </span>
                    )}
                  </button>

                  {/* Link actions */}
                  {transfer.fields.transfer_link && (
                    <>
                      <a
                        href={transfer.fields.transfer_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                      >
                        <IconLink size={14} className="shrink-0" />
                        <span className="hidden sm:inline">Öffnen</span>
                      </a>
                      <button
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          copiedLink === transfer.fields.transfer_link
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        }`}
                        onClick={() => handleCopyLink(transfer.fields.transfer_link!)}
                      >
                        {copiedLink === transfer.fields.transfer_link ? (
                          <IconCheck size={14} className="shrink-0" />
                        ) : (
                          <IconCopy size={14} className="shrink-0" />
                        )}
                        <span className="hidden sm:inline">
                          {copiedLink === transfer.fields.transfer_link ? 'Kopiert!' : 'Kopieren'}
                        </span>
                      </button>
                    </>
                  )}

                  {/* Security indicator */}
                  {transfer.fields.transfer_passwort_aktiv ? (
                    <span className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground">
                      <IconLock size={12} className="shrink-0 text-amber-500" />
                      <span className="hidden sm:inline">Passwortgeschützt</span>
                    </span>
                  ) : null}

                  {/* Edit / Delete pushed right */}
                  <div className="ml-auto flex items-center gap-1">
                    <button
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                      onClick={() => setTransferDialog({ open: true, record: transfer })}
                    >
                      <IconPencil size={14} className="shrink-0" />
                      <span className="hidden sm:inline">Bearbeiten</span>
                    </button>
                    <button
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-destructive/70 hover:text-destructive hover:bg-destructive/5 transition-all"
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

      {/* ── Dialogs ──────────────────────────────────────────────────── */}
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
    <div className="space-y-8">
      <Skeleton className="h-36 rounded-2xl" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
      <Skeleton className="h-24 rounded-2xl" />
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
      </div>
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={24} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">{error.message}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
        <IconRefresh size={14} />
        Erneut versuchen
      </Button>
    </div>
  );
}
