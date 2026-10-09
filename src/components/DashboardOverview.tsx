'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp, ShoppingBag, Truck, AlertTriangle,
  ArrowRight, CalendarDays, Layers,
} from 'lucide-react';
import api from '@/lib/axios';
import { formatBDT } from '@/lib/pdfExport';
import { IDashboardSummary } from '@/types';
import { useAuth } from '@/context/AuthContext';

interface Props { setActiveTab: (tab: string) => void; }

const S = {
  card: {
    background: '#fff', border: '1px solid #e2e8f0',
    borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', padding: '20px 22px',
  } as React.CSSProperties,
  label: { fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 4 },
  value: { fontSize: 26, fontWeight: 900, color: '#0f172a', lineHeight: 1.1 },
  sub: { fontSize: 12, color: '#64748b', marginTop: 4 },
};

export default function DashboardOverview({ setActiveTab }: Props) {
  const { isAdmin, isDealer, isDeveloper } = useAuth();
  const { data: dashData, isLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => { const res = await api.get('/reports/dashboard'); return res.data; },
  });

  const { data: productsData } = useQuery({
    queryKey: ['products'],
    queryFn: async () => { const res = await api.get('/products'); return res.data; },
  });

  const dashboard: IDashboardSummary = dashData || {
    today: { date: new Date().toISOString().slice(0, 10), hasEntry: false, saleAmount: 0, profitAmount: 0, pcsSold: 0, cartonsSold: 0 },
    monthly: { month: new Date().toISOString().slice(0, 7), salesAmount: 0, profitAmount: 0, inwardCount: 0, inwardAmount: 0 },
    inventory: { totalProductsCount: 59, totalStockPcs: 0, totalStockValueDP: 0, totalStockValueTP: 0, lowStockCount: 0 },
  };

  const products = productsData?.data || [];
  const lowStockProducts = products.filter((p: any) => p.currentStockPcs <= p.minStockAlert).slice(0, 6);

  const today = new Date().toLocaleDateString('bn-BD', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const monthName = new Date().toLocaleDateString('bn-BD', { year: 'numeric', month: 'long' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
        borderRadius: 16, padding: '22px 24px',
        boxShadow: '0 6px 24px rgba(249,115,22,0.22)',
        color: '#fff',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img
            src="/logo.png"
            alt="Tanvir Traders Logo"
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              objectFit: 'cover',
              border: '2px solid rgba(255,255,255,0.4)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              flexShrink: 0,
            }}
          />
          <div>
            <div style={{ fontSize: 18, fontWeight: 900 }}>TANVIR TRADERS</div>
            <div style={{ fontSize: 11, opacity: 0.85 }}>Meghna Beverage Ltd — Fresh</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 4 }}>
          <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 8, padding: '4px 12px', fontSize: 12, fontWeight: 600 }}>
            📅 {today}
          </span>
          <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 8, padding: '4px 12px', fontSize: 12, fontWeight: 600 }}>
            📦 {dashboard.inventory.totalProductsCount} টি পণ্য সক্রিয়
          </span>
          {dashboard.inventory.lowStockCount > 0 && (
            <span style={{ background: 'rgba(239,68,68,0.85)', borderRadius: 8, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>
              ⚠️ {dashboard.inventory.lowStockCount} পণ্য কম স্টক!
            </span>
          )}
        </div>

        {/* Quick Actions - only visible to admin/dealer/developer */}
        {isAdmin && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
            {[
              { id: 'daily-sales', icon: '📝', label: 'বিক্রয় এন্ট্রি' },
              { id: 'stock-inward', icon: '🚛', label: 'চালান এন্ট্রি' },
              { id: 'monthly-report', icon: '📊', label: 'রিপোর্ট' },
            ].map(a => (
              <button
                key={a.id}
                onClick={() => setActiveTab(a.id)}
                style={{
                  background: 'rgba(255,255,255,0.95)', borderRadius: 9, padding: '6px 14px',
                  border: 'none', cursor: 'pointer',
                  color: '#f97316', fontWeight: 700, fontSize: 12,
                  display: 'flex', alignItems: 'center', gap: 5,
                }}
              >
                {a.icon} {a.label} <ArrowRight size={12} />
              </button>
            ))}
            {(isDealer || isDeveloper) && (
              <button
                onClick={() => setActiveTab('pending')}
                style={{
                  background: 'rgba(255,255,255,0.95)', borderRadius: 9, padding: '6px 14px',
                  border: 'none', cursor: 'pointer',
                  color: '#2563eb', fontWeight: 700, fontSize: 12,
                  display: 'flex', alignItems: 'center', gap: 5,
                }}
              >
                ⏳ পেন্ডিং তালিকা <ArrowRight size={12} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Today's Stats */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <CalendarDays size={15} color="#f97316" />
          আজকের সারসংক্ষেপ
          {!dashboard.today.hasEntry && (
            <span style={{ fontSize: 10, background: '#fef9c3', color: '#a16207', padding: '2px 8px', borderRadius: 99, fontWeight: 600, border: '1px solid #fde047' }}>
              আজ কোনো এন্ট্রি নেই
            </span>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          {[
            { label: 'আজকের বিক্রয়', value: formatBDT(dashboard.today.saleAmount), color: '#2563eb', bg: '#eff6ff', icon: '💰' },
            { label: 'আজকের মুনাফা', value: formatBDT(dashboard.today.profitAmount), color: '#10b981', bg: '#f0fdf4', icon: '📈' },
            { label: 'পিস বিক্রি', value: `${dashboard.today.pcsSold} পিস`, color: '#f97316', bg: '#fff7ed', icon: '📦' },
            { label: 'কার্টন বিক্রি', value: `${dashboard.today.cartonsSold} কার্টন`, color: '#8b5cf6', bg: '#f5f3ff', icon: '🗃️' },
          ].map(stat => (
            <div key={stat.label} style={{ ...S.card, borderLeft: `4px solid ${stat.color}`, background: stat.bg, padding: '16px 18px' }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>{stat.icon}</div>
              <div style={S.label}>{stat.label}</div>
              <div style={{ ...S.value, color: stat.color, fontSize: 20 }}>{isLoading ? '...' : stat.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly + Inventory */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>

        {/* Monthly */}
        <div style={S.card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
            <TrendingUp size={15} color="#2563eb" />
            <span style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{monthName} সারসংক্ষেপ</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'মাসিক বিক্রয়', value: formatBDT(dashboard.monthly.salesAmount), color: '#2563eb' },
              { label: 'মাসিক মুনাফা', value: formatBDT(dashboard.monthly.profitAmount), color: '#10b981' },
              { label: 'মাল গ্রহণ (চালান)', value: `${dashboard.monthly.inwardCount} বার`, color: '#f97316' },
              { label: 'মোট গ্রহণ মূল্য', value: formatBDT(dashboard.monthly.inwardAmount), color: '#8b5cf6' },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>{row.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: row.color }}>{isLoading ? '...' : row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Inventory */}
        <div style={S.card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
            <Layers size={15} color="#8b5cf6" />
            <span style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>বর্তমান গোডাউন স্টক</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'মোট স্টক (পিস)', value: `${dashboard.inventory.totalStockPcs.toLocaleString('bn-BD')} পিস`, color: '#0f172a' },
              { label: 'ক্রয় মূল্যে স্টক মূল্য', value: formatBDT(dashboard.inventory.totalStockValueDP), color: '#2563eb' },
              { label: 'বিক্রয় মূল্যে স্টক মূল্য', value: formatBDT(dashboard.inventory.totalStockValueTP), color: '#10b981' },
              { label: 'কম স্টক সতর্কতা', value: `${dashboard.inventory.lowStockCount} পণ্য`, color: dashboard.inventory.lowStockCount > 0 ? '#ef4444' : '#10b981' },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>{row.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: row.color }}>{isLoading ? '...' : row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <div style={{ ...S.card, borderLeft: '4px solid #ef4444', background: '#fef2f2' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
            <AlertTriangle size={15} color="#ef4444" />
            <span style={{ fontWeight: 700, fontSize: 13, color: '#991b1b' }}>
              কম স্টক সতর্কতা ({dashboard.inventory.lowStockCount} পণ্য)
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {lowStockProducts.map((p: any) => (
              <div key={p._id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: '#fff', borderRadius: 8, padding: '8px 12px', border: '1px solid #fee2e2',
              }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>{p.name}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', background: '#fef2f2', padding: '2px 8px', borderRadius: 99 }}>
                  {p.currentStockPcs} পিস বাকি
                </span>
              </div>
            ))}
          </div>
          {isAdmin && (
            <button
              onClick={() => setActiveTab('stock-inward')}
              style={{
                marginTop: 12, background: '#ef4444', color: '#fff', border: 'none',
                borderRadius: 9, padding: '8px 16px', cursor: 'pointer',
                fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <Truck size={13} /> মাল অর্ডার দিন <ArrowRight size={12} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
