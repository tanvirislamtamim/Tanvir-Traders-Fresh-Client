'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, ShieldCheck, User, Code2,
  RefreshCw, Search, UserX,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';

type UserRole = 'developer' | 'dealer' | 'admin' | 'user';

interface AppUser {
  _id: string; uid: string; email: string;
  displayName: string; role: UserRole; createdAt: string;
}

const RC: Record<UserRole, { label: string; bangla: string; color: string; bg: string; Icon: any }> = {
  developer: { label: 'Developer', bangla: 'ডেভেলপার',    color: '#7c3aed', bg: '#f5f3ff', Icon: Code2 },
  dealer:    { label: 'Dealer',    bangla: 'ডিলার',        color: '#0ea5e9', bg: '#f0f9ff', Icon: Users },
  admin:     { label: 'Admin',     bangla: 'অ্যাডমিন',     color: '#f97316', bg: '#fff7ed', Icon: ShieldCheck },
  user:      { label: 'User',      bangla: 'ব্যবহারকারী',  color: '#10b981', bg: '#f0fdf4', Icon: User },
};

const card: React.CSSProperties = {
  background: '#fff', border: '1px solid #e2e8f0',
  borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
};

export default function UserManagement() {
  const { user: me, isDeveloper } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['app-users'],
    queryFn: async () => { const res = await api.get('/users'); return res.data; },
    enabled: isDeveloper,
  });

  const users: AppUser[] = data?.data || [];
  const filtered = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.displayName.toLowerCase().includes(search.toLowerCase())
  );

  const roleMut = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: UserRole }) => {
      const res = await api.patch(`/users/${id}/role`, { role, requestorUid: me?.uid });
      return res.data;
    },
    onSuccess: d => { toast.success(d.message); qc.invalidateQueries({ queryKey: ['app-users'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'ভূমিকা পরিবর্তন ব্যর্থ'),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/users/${id}`, { data: { requestorUid: me?.uid } });
      return res.data;
    },
    onSuccess: d => { toast.success(d.message); qc.invalidateQueries({ queryKey: ['app-users'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'ডিলিট ব্যর্থ'),
  });

  const changeRole = (u: AppUser, r: UserRole) => {
    if (u.uid === me?.uid) { toast.error('নিজের ভূমিকা পরিবর্তন করা যাবে না!'); return; }
    if (!window.confirm(`${u.displayName || u.email}-এর ভূমিকা "${RC[r].label}" করবেন?`)) return;
    roleMut.mutate({ id: u._id, role: r });
  };

  const del = (u: AppUser) => {
    if (u.uid === me?.uid) { toast.error('নিজেকে সরানো যাবে না!'); return; }
    if (!window.confirm(`"${u.displayName || u.email}" কে সরাবেন?`)) return;
    delMut.mutate(u._id);
  };

  const stats: Record<UserRole, number> = { developer: 0, dealer: 0, admin: 0, user: 0 };
  users.forEach(u => { if (stats[u.role] !== undefined) stats[u.role]++; });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* Header */}
      <div style={{ ...card, padding: '20px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, background: '#f5f3ff', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #ede9fe' }}>
              <Users size={20} color="#7c3aed" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                User Management
                <span style={{ fontSize: 10, background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ede9fe', padding: '2px 8px', borderRadius: 99, fontWeight: 700 }}>Developer Only</span>
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>ব্যবহারকারীদের ভূমিকা পরিবর্তন করুন</div>
            </div>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            style={{ border: '1px solid #e2e8f0', background: '#fff', borderRadius: 9, padding: '7px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#64748b' }}
          >
            <RefreshCw size={14} style={isFetching ? { animation: 'spin 1s linear infinite' } : {}} />
            রিফ্রেশ
          </button>
        </div>

        {/* Role stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 16, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
          {(Object.keys(RC) as UserRole[]).map(r => {
            const c = RC[r]; const Icon = c.Icon;
            return (
              <div key={r} style={{ background: c.bg, border: `1px solid ${c.color}20`, borderRadius: 10, padding: '12px', textAlign: 'center' }}>
                <Icon size={16} color={c.color} style={{ margin: '0 auto 4px' }} />
                <div style={{ fontSize: 22, fontWeight: 900, color: c.color }}>{stats[r]}</div>
                <div style={{ fontSize: 10, color: '#94a3b8' }}>{c.bangla}</div>
              </div>
            );
          })}
        </div>

        {/* Role info */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8, marginTop: 12 }}>
          {[
            { role: 'developer' as UserRole, desc: 'সব কিছু + User Management' },
            { role: 'dealer' as UserRole, desc: 'পেন্ডিং অনুমোদন/বাতিল (ডিলার)' },
            { role: 'admin' as UserRole, desc: 'স্টক, রেট, রিপোর্ট + বিক্রয় (অনুমোদন সাপেক্ষে)' },
            { role: 'user' as UserRole, desc: 'শুধুমাত্র Dashboard দেখতে পারবে' },
          ].map(({ role, desc }) => {
            const c = RC[role]; const Icon = c.Icon;
            return (
              <div key={role} style={{ background: c.bg, border: `1px solid ${c.color}25`, borderRadius: 9, padding: '9px 12px', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <Icon size={13} color={c.color} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: c.color }}>{c.label}</div>
                  <div style={{ fontSize: 10, color: '#64748b' }}>{desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div style={{ ...card, overflow: 'hidden' }}>
        {/* Search */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ position: 'relative', maxWidth: 320 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              className="input"
              style={{ paddingLeft: 32, fontSize: 12 }}
              type="text"
              placeholder="নাম বা ইমেইল দিয়ে খুঁজুন..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Responsive table wrapper */}
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>ব্যবহারকারী</th>
                <th style={{ textAlign: 'center' }}>বর্তমান ভূমিকা</th>
                <th style={{ textAlign: 'center' }}>যোগদান</th>
                <th style={{ textAlign: 'center' }}>ভূমিকা পরিবর্তন</th>
                <th style={{ textAlign: 'center' }}>সরান</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  <RefreshCw size={20} color="#f97316" style={{ margin: '0 auto 8px', display: 'block', animation: 'spin 1s linear infinite' }} />
                  লোড হচ্ছে...
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: 13 }}>কোনো ব্যবহারকারী পাওয়া যায়নি</td></tr>
              ) : filtered.map((u, i) => {
                const c = RC[u.role]; const Icon = c.Icon;
                const isSelf = u.uid === me?.uid;
                return (
                  <tr key={u._id} style={{ background: isSelf ? '#fffbeb' : undefined }}>
                    <td style={{ color: '#94a3b8', width: 36 }}>{i + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, background: c.bg, border: `1.5px solid ${c.color}30`, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Icon size={15} color={c.color} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 5 }}>
                            {u.displayName || '(নাম নেই)'}
                            {isSelf && <span style={{ fontSize: 9, background: '#f5f3ff', color: '#7c3aed', padding: '1px 6px', borderRadius: 99, fontWeight: 700, border: '1px solid #ede9fe' }}>আপনি</span>}
                          </div>
                          <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 99, background: c.bg, color: c.color, fontWeight: 700, fontSize: 11, border: `1px solid ${c.color}30` }}>
                        <Icon size={11} /> {c.bangla}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8' }}>
                      {new Date(u.createdAt).toLocaleDateString('bn-BD')}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {isSelf ? <span style={{ fontSize: 11, color: '#cbd5e1' }}>—</span> : (
                        <select
                          value={u.role}
                          onChange={e => changeRole(u, e.target.value as UserRole)}
                          disabled={roleMut.isPending}
                          style={{
                            border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '5px 10px',
                            fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            background: '#fff', color: '#0f172a', outline: 'none',
                          }}
                        >
                          <option value="developer">Developer</option>
                          <option value="dealer">Dealer (ডিলার)</option>
                          <option value="admin">Admin</option>
                          <option value="user">User</option>
                        </select>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {isSelf ? <span style={{ color: '#cbd5e1' }}>—</span> : (
                        <button
                          onClick={() => del(u)}
                          disabled={delMut.isPending}
                          style={{ border: '1px solid #fee2e2', background: '#fef2f2', color: '#ef4444', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                          title="সরান"
                        >
                          <UserX size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
