'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Clock, CheckCircle2, XCircle, ChevronDown,
  RefreshCw, Search, ShoppingBag, Truck, Tag, Trash2, Edit3, Plus,
  AlertTriangle, User, Calendar, TrendingUp, TrendingDown, ArrowRight,
  ShieldCheck, Filter, FileText, Layers,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';

/* --- Types --------------------------------------------------------------- */
type PendingStatus = 'pending' | 'approved' | 'rejected';
type EntityType = 'daily_sale' | 'stock_inward' | 'product';
type ActionType = 'CREATE' | 'UPDATE' | 'DELETE';

interface ComparisonItem {
  productId?: string;
  name: string;
  banglaName?: string;
  sku: string;
  cartonSize?: number;
  changeType: 'added' | 'modified' | 'removed' | 'unchanged';
  before: any;
  after: any;
  diffDescription?: string;
}
interface SummaryMetrics {
  beforeTotalAmount?: number; afterTotalAmount?: number; amountDiff?: number;
  beforeTotalCartons?: number; afterTotalCartons?: number; cartonsDiff?: number;
  beforeTotalPcs?: number; afterTotalPcs?: number; pcsDiff?: number;
  changedItemsCount?: number;
}
interface PendingAction {
  _id: string;
  actionType: ActionType;
  entityType: EntityType;
  entityId?: string;
  title: string;
  summary: string;
  status: PendingStatus;
  submittedBy: { uid: string; email: string; displayName: string; role: string };
  reviewedBy?: { uid: string; email: string; displayName: string; role: string };
  reviewNotes?: string;
  reviewedAt?: string;
  summaryMetrics?: SummaryMetrics;
  comparison?: ComparisonItem[];
  createdAt: string;
  updatedAt: string;
}

/* --- Config Maps ---------------------------------------------------------- */
const ENTITY_CFG = {
  daily_sale: { label: 'দৈনিক বিক্রয়', color: '#ea580c', bg: '#fff7ed', border: '#fed7aa', Icon: ShoppingBag },
  stock_inward: { label: 'স্টক চালান', color: '#059669', bg: '#f0fdf4', border: '#a7f3d0', Icon: Truck },
  product: { label: 'পণ্য ও রেট', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', Icon: Tag },
} as const;

const ACTION_CFG = {
  CREATE: { label: 'নতুন যোগ', color: '#059669', bg: '#f0fdf4', border: '#bbf7d0', Icon: Plus },
  UPDATE: { label: 'পরিবর্তন', color: '#d97706', bg: '#fffbeb', border: '#fde68a', Icon: Edit3 },
  DELETE: { label: 'মুছে ফেলা', color: '#dc2626', bg: '#fef2f2', border: '#fecaca', Icon: Trash2 },
} as const;

const STATUS_CFG = {
  pending: { label: 'অপেক্ষারত', color: '#d97706', bg: '#fffbeb', border: '#fde68a', Icon: Clock },
  approved: { label: 'অনুমোদিত', color: '#059669', bg: '#f0fdf4', border: '#a7f3d0', Icon: CheckCircle2 },
  rejected: { label: 'বাতিল', color: '#dc2626', bg: '#fef2f2', border: '#fca5a5', Icon: XCircle },
} as const;

/* --- Helpers -------------------------------------------------------------- */
const fmtBDT = (n?: number) =>
  n == null ? '—' : '৳' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 });

function DiffChip({ value }: { value?: number }) {
  if (value == null) return null;
  const pos = value > 0, zero = value === 0;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 99,
      background: zero ? '#f1f5f9' : pos ? '#dcfce7' : '#fee2e2',
      color: zero ? '#64748b' : pos ? '#15803d' : '#b91c1c',
    }}>
      {!zero && (pos ? <TrendingUp size={10} /> : <TrendingDown size={10} />)}
      {pos && '+'}{value.toFixed(1)}
    </span>
  );
}

function MetricBox({ label, before, after, diff, money }: {
  label: string; before?: number; after?: number; diff?: number; money?: boolean;
}) {
  const fmt = (v?: number) => money ? fmtBDT(v) : (v?.toFixed(1) ?? '—');
  return (
    <div style={{ flex: 1, minWidth: 140, padding: '12px 14px', background: '#fff', borderRadius: 10, border: '1.5px solid #e2e8f0' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: '#94a3b8', textDecoration: 'line-through', fontFamily: 'monospace' }}>{fmt(before)}</span>
        <ArrowRight size={12} color="#94a3b8" />
        <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>{fmt(after)}</span>
        <DiffChip value={diff} />
      </div>
    </div>
  );
}

function ChangeTypeBadge({ type }: { type: ComparisonItem['changeType'] }) {
  const c = {
    added: { color: '#059669', bg: '#f0fdf4', border: '#bbf7d0', label: '+ নতুন' },
    modified: { color: '#d97706', bg: '#fffbeb', border: '#fde68a', label: '~ পরিবর্তন' },
    removed: { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', label: '− বাদ' },
    unchanged: { color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0', label: '= একই' },
  }[type];
  return <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: c.bg, color: c.color, border: `1px solid ${c.border}`, whiteSpace: 'nowrap' }}>{c.label}</span>;
}

/* --- PendingCard ---------------------------------------------------------- */
function PendingCard({ action, canReview, onApprove, onReject, isProcessing }: {
  action: PendingAction;
  canReview: boolean;
  onApprove: (id: string, notes: string) => void;
  onReject: (id: string, notes: string) => void;
  isProcessing: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [confirm, setConfirm] = useState<'approve' | 'reject' | null>(null);

  const ec = ENTITY_CFG[action.entityType] ?? ENTITY_CFG.daily_sale;
  const ac = ACTION_CFG[action.actionType] ?? ACTION_CFG.UPDATE;
  const sc = STATUS_CFG[action.status] ?? STATUS_CFG.pending;
  const m = action.summaryMetrics;
  const isPending = action.status === 'pending';
  const changedItems = action.comparison?.filter(c => c.changeType !== 'unchanged') ?? [];

  const EntityIcon = ec.Icon;
  const ActionIcon = ac.Icon;
  const StatusIcon = sc.Icon;

  return (
    <div style={{ background: '#fff', borderRadius: 14, border: `1.5px solid ${isPending ? '#e2e8f0' : sc.border}`, overflow: 'hidden', boxShadow: isPending ? '0 2px 8px rgba(0,0,0,0.06)' : '0 1px 3px rgba(0,0,0,0.03)' }}>

      {/* Header */}
      <div onClick={() => setOpen(o => !o)} style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{ width: 42, height: 42, borderRadius: 11, flexShrink: 0, background: ec.bg, border: `1.5px solid ${ec.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <EntityIcon size={19} color={ec.color} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 5 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 99, background: ac.bg, color: ac.color, border: `1px solid ${ac.border}` }}>
              <ActionIcon size={10} />{ac.label}
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: ec.bg, color: ec.color, border: `1px solid ${ec.border}` }}>{ec.label}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
              <StatusIcon size={10} />{sc.label}
            </span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 3, lineHeight: 1.4 }}>{action.title}</div>
          <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5, marginBottom: 6 }}>{action.summary}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#94a3b8' }}>
              <User size={12} /><strong style={{ color: '#475569' }}>{action.submittedBy.displayName || action.submittedBy.email}</strong>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#94a3b8' }}>
              <Calendar size={12} />{new Date(action.createdAt).toLocaleString('bn-BD', { dateStyle: 'medium', timeStyle: 'short' })}
            </span>
            {changedItems.length > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 99, background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0' }}>
                <Layers size={10} />{changedItems.length}টি পণ্য পরিবর্তিত
              </span>
            )}
          </div>
        </div>

        <div style={{ color: '#cbd5e1', flexShrink: 0, paddingTop: 2, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}>
          <ChevronDown size={18} />
        </div>
      </div>

      {/* Expanded body */}
      {open && (
        <div style={{ borderTop: '1px solid #f1f5f9', background: '#f8fafc', padding: '18px 20px 20px' }}>

          {/* Metrics */}
          {m && (m.amountDiff !== undefined || m.pcsDiff !== undefined || m.cartonsDiff !== undefined) && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <FileText size={12} /> পরিবর্তনের সারসংক্ষেপ
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {m.amountDiff !== undefined && <MetricBox label="মোট টাকা" before={m.beforeTotalAmount} after={m.afterTotalAmount} diff={m.amountDiff} money />}
                {m.pcsDiff !== undefined && <MetricBox label="মোট পিস" before={m.beforeTotalPcs} after={m.afterTotalPcs} diff={m.pcsDiff} />}
                {m.cartonsDiff !== undefined && <MetricBox label="মোট কার্টুন" before={m.beforeTotalCartons} after={m.afterTotalCartons} diff={m.cartonsDiff} />}
              </div>
            </div>
          )}

          {/* Comparison table */}
          {changedItems.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Layers size={12} /> আইটেম বিবরণ ({changedItems.length}টি)
              </div>
              <div style={{ background: '#fff', borderRadius: 10, border: '1.5px solid #e2e8f0', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table" style={{ minWidth: 560 }}>
                    <thead><tr>
                      <th>পণ্য</th>
                      <th style={{ textAlign: 'center' }}>ধরন</th>
                      <th style={{ textAlign: 'center' }}>আগে</th>
                      <th style={{ textAlign: 'center' }}>পরে</th>
                      <th>বিবরণ</th>
                    </tr></thead>
                    <tbody>
                      {changedItems.map((item, i) => (
                        <tr key={i} style={{ background: item.changeType === 'added' ? '#f0fdf4' : item.changeType === 'removed' ? '#fef2f2' : '#fff' }}>
                          <td>
                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 13 }}>{item.name}</div>
                            {item.banglaName && <div style={{ fontSize: 11, color: '#ea580c', fontWeight: 600 }}>{item.banglaName}</div>}
                            <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace', background: '#f1f5f9', padding: '1px 5px', borderRadius: 4 }}>{item.sku}</span>
                          </td>
                          <td style={{ textAlign: 'center' }}><ChangeTypeBadge type={item.changeType} /></td>
                          <td style={{ textAlign: 'center', fontFamily: 'monospace', color: '#94a3b8', fontSize: 12 }}>
                            {item.before?.totalPcs !== undefined ? `${item.before.cartons ?? 0} কাটুন. ${item.before.pcs ?? 0} পিচ. (${item.before.totalPcs ?? 0})` : item.before?.tradePrice !== undefined ? `TP ৳${item.before.tradePrice} / IP ৳${item.before.dealerPrice}` : '—'}
                          </td>
                          <td style={{ textAlign: 'center', fontFamily: 'monospace', color: '#0f172a', fontSize: 13, fontWeight: 800 }}>
                            {item.after?.totalPcs !== undefined ? `${item.after.cartons ?? 0}কাটুন. ${item.after.pcs ?? 0}পিচ. (${item.after.totalPcs ?? 0})` : item.after?.tradePrice !== undefined ? `TP ৳${item.after.tradePrice} / IP ৳${item.after.dealerPrice}` : '—'}
                          </td>
                          <td style={{ fontSize: 12, color: '#475569' }}>{item.diffDescription || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Reviewed info */}
          {!isPending && action.reviewedBy && (
            <div style={{ background: sc.bg, border: `1.5px solid ${sc.border}`, borderRadius: 10, padding: '12px 14px', marginBottom: 14, fontSize: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <StatusIcon size={14} color={sc.color} />
                <span style={{ fontWeight: 800, color: sc.color }}>{sc.label}</span>
                <span style={{ color: '#94a3b8', marginLeft: 'auto' }}>
                  {action.reviewedAt && new Date(action.reviewedAt).toLocaleString('bn-BD', { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </div>
              <div style={{ color: '#475569' }}>পর্যালোচক: <strong style={{ color: '#0f172a' }}>{action.reviewedBy.displayName || action.reviewedBy.email}</strong></div>
              {action.reviewNotes && <div style={{ color: '#64748b', marginTop: 4, fontStyle: 'italic' }}>"{action.reviewNotes}"</div>}
            </div>
          )}

          {/* Review buttons */}
          {isPending && (
            <div>
              {canReview ? (
                !confirm ? (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button onClick={() => setConfirm('approve')} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 20px', borderRadius: 9, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#059669,#047857)', color: '#fff', fontWeight: 800, fontSize: 13, boxShadow: '0 3px 10px rgba(5,150,105,0.22)' }}>
                      <CheckCircle2 size={15} /> অনুমোদন করুন
                    </button>
                    <button onClick={() => setConfirm('reject')} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 20px', borderRadius: 9, cursor: 'pointer', background: '#fff', border: '1.5px solid #fca5a5', color: '#dc2626', fontWeight: 800, fontSize: 13 }}>
                      <XCircle size={15} /> বাতিল করুন
                    </button>
                  </div>
                ) : (
                  <div style={{ background: confirm === 'approve' ? '#f0fdf4' : '#fef2f2', border: `1.5px solid ${confirm === 'approve' ? '#a7f3d0' : '#fca5a5'}`, borderRadius: 10, padding: 14 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10, color: confirm === 'approve' ? '#059669' : '#dc2626' }}>
                      {confirm === 'approve' ? '✅ অনুমোদন নিশ্চিত করুন' : '❌ বাতিলের কারণ লিখুন'}
                    </div>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder={confirm === 'approve' ? 'মন্তব্য (ঐচ্ছিক)...' : 'বাতিলের কারণ লিখুন...'} rows={2} className="input" style={{ resize: 'vertical', marginBottom: 10 }} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button disabled={isProcessing} onClick={() => { if (confirm === 'approve') onApprove(action._id, notes); else onReject(action._id, notes); setConfirm(null); setNotes(''); }} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', cursor: isProcessing ? 'not-allowed' : 'pointer', background: confirm === 'approve' ? '#059669' : '#dc2626', color: '#fff', fontWeight: 800, fontSize: 13, opacity: isProcessing ? 0.6 : 1 }}>
                        {isProcessing ? 'প্রক্রিয়া হচ্ছে...' : 'নিশ্চিত করুন'}
                      </button>
                      <button onClick={() => { setConfirm(null); setNotes(''); }} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                        বাতিল
                      </button>
                    </div>
                  </div>
                )
              ) : (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, color: '#92400e', fontSize: 11, fontWeight: 700 }}>
                  <Clock size={13} color="#d97706" /> ডিলারের অনুমোদনের অপেক্ষায়
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* --- Main ----------------------------------------------------------------- */
export default function PendingApproval() {
  const { isDealer, isDeveloper, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<'all' | PendingStatus>('pending');
  const [typeFilter, setTypeFilter] = useState<'all' | EntityType>('all');
  const [search, setSearch] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const canReview = isDealer || isDeveloper;

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['pending-actions', statusFilter, typeFilter, search],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (typeFilter !== 'all') params.entityType = typeFilter;
      if (search) params.search = search;
      const res = await api.get('/pending', { params });
      return res.data;
    },
    refetchInterval: 30000,
  });

  const actions: PendingAction[] = data?.data || [];
  const pendingCount: number = data?.pendingCount || 0;

  const approveMut = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => { const res = await api.post(`/pending/${id}/approve`, { notes }); return res.data; },
    onSuccess: res => {
      toast.success(res.message || 'সফলভাবে অনুমোদন করা হয়েছে!', { duration: 5000, icon: '✅' });
      setProcessingId(null);
      ['pending-actions', 'pending-count', 'products', 'daily-sale-sheet', 'stock-inwards', 'dashboard-summary'].forEach(k => queryClient.invalidateQueries({ queryKey: [k] }));
      refetch();
    },
    onError: (err: any) => { toast.error(err.response?.data?.message || 'অনুমোদন করতে সমস্যা হয়েছে!'); setProcessingId(null); },
  });

  const rejectMut = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => { const res = await api.post(`/pending/${id}/reject`, { notes }); return res.data; },
    onSuccess: res => {
      toast.success(res.message || 'রিকোয়েস্ট বাতিল করা হয়েছে।', { duration: 4000, icon: '❌' });
      setProcessingId(null);
      ['pending-actions', 'pending-count'].forEach(k => queryClient.invalidateQueries({ queryKey: [k] }));
      refetch();
    },
    onError: (err: any) => { toast.error(err.response?.data?.message || 'বাতিল করতে সমস্যা হয়েছে!'); setProcessingId(null); },
  });

  const handleApprove = (id: string, notes: string) => { setProcessingId(id); approveMut.mutate({ id, notes }); };
  const handleReject = (id: string, notes: string) => { setProcessingId(id); rejectMut.mutate({ id, notes }); };

  if (!isDealer && !isDeveloper && !isAdmin) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #fecaca' }}>
          <AlertTriangle size={26} color="#ef4444" />
        </div>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0 }}>অ্যাক্সেস নেই</h2>
        <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>এই পেজটি শুধুমাত্র ডিলার বা ডেভেলপার দেখতে পারবেন।</p>
      </div>
    );
  }

  const approvedCount = actions.filter(a => a.status === 'approved').length;
  const rejectedCount = actions.filter(a => a.status === 'rejected').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* Header */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #e2e8f0', padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: 'linear-gradient(135deg,#f97316,#ea580c)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(249,115,22,0.25)' }}>
              <ShieldCheck size={22} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: 17, fontWeight: 900, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>Pending Approvals</h1>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                {canReview ? 'অ্যাডমিনের আবেদনসমূহ পর্যালোচনা ও অনুমোদন করুন' : 'আপনার জমা দেওয়া আবেদনের অবস্থা দেখুন'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {pendingCount > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#fffbeb', borderRadius: 9, border: '1px solid #fde68a' }}>
                <Clock size={13} color="#d97706" />
                <span style={{ fontWeight: 900, fontSize: 14, color: '#d97706' }}>{pendingCount}</span>
                <span style={{ fontSize: 11, color: '#92400e', fontWeight: 700 }}>অপেক্ষারত</span>
              </div>
            )}
            <button onClick={() => refetch()} disabled={isFetching} style={{ border: '1.5px solid #e2e8f0', background: '#fff', borderRadius: 9, padding: '7px 13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: '#64748b' }}>
              <RefreshCw size={13} style={isFetching ? { animation: 'spin 0.9s linear infinite' } : {}} /> রিফ্রেশ
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #e2e8f0', padding: '14px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.03)', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <Filter size={14} color="#94a3b8" style={{ flexShrink: 0 }} />
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input type="text" placeholder="শিরোনাম বা এন্ট্রিকারী খুঁজুন..." value={search} onChange={e => setSearch(e.target.value)} className="input" style={{ paddingLeft: 32 }} />
        </div>
        <div style={{ width: 1, height: 28, background: '#e2e8f0', flexShrink: 0 }} />
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {([['all', 'সব', '#475569'], ['pending', 'অপেক্ষারত', '#d97706'], ['approved', 'অনুমোদিত', '#059669'], ['rejected', 'বাতিল', '#dc2626']] as const).map(([k, l, c]) => (
            <button key={k} onClick={() => setStatusFilter(k as any)} style={{ padding: '5px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, background: statusFilter === k ? c : '#f8fafc', color: statusFilter === k ? '#fff' : '#64748b', border: statusFilter === k ? `1px solid ${c}` : '1px solid #e2e8f0', transition: 'all 0.12s' }}>{l}</button>
          ))}
        </div>
        <div style={{ width: 1, height: 28, background: '#e2e8f0', flexShrink: 0 }} />
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {([['all', 'সব ধরন', null], ['daily_sale', 'বিক্রয়', 'daily_sale'], ['stock_inward', 'চালান', 'stock_inward'], ['product', 'পণ্য/রেট', 'product']] as const).map(([k, l, ek]) => {
            const ec2 = ek ? ENTITY_CFG[ek as EntityType] : null;
            const active = typeFilter === k;
            return <button key={k} onClick={() => setTypeFilter(k as any)} style={{ padding: '5px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, background: active ? (ec2?.bg ?? '#fff7ed') : '#f8fafc', color: active ? (ec2?.color ?? '#ea580c') : '#64748b', border: active ? `1px solid ${ec2?.border ?? '#fed7aa'}` : '1px solid #e2e8f0', transition: 'all 0.12s' }}>{l}</button>;
          })}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
          <RefreshCw size={28} color="#f97316" style={{ margin: '0 auto 12px', animation: 'spin 0.9s linear infinite' }} />
          <div style={{ fontSize: 13, fontWeight: 600 }}>লোড হচ্ছে...</div>
        </div>
      ) : actions.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #e2e8f0', textAlign: 'center', padding: '60px 20px' }}>
          <CheckCircle2 size={44} color="#10b981" style={{ margin: '0 auto 14px' }} />
          <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>কোনো রেকর্ড নেই</h3>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>{statusFilter === 'pending' ? 'এই মুহূর্তে কোনো অনুমোদনের অপেক্ষায় নেই।' : 'নির্বাচিত ফিল্টারে কোনো রেকর্ড পাওয়া যায়নি।'}</p>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, paddingLeft: 2 }}>
            {actions.length}টি রেকর্ড
            {approvedCount > 0 && <span style={{ color: '#059669' }}> • {approvedCount} অনুমোদিত</span>}
            {rejectedCount > 0 && <span style={{ color: '#dc2626' }}> • {rejectedCount} বাতিল</span>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {actions.map(action => (
              <PendingCard key={action._id} action={action} canReview={canReview} onApprove={handleApprove} onReject={handleReject} isProcessing={processingId === action._id && (approveMut.isPending || rejectMut.isPending)} />
            ))}
          </div>
        </>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}