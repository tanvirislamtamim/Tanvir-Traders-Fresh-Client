'use client';

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import DashboardOverview from '@/components/DashboardOverview';
import DailySalesEntry from '@/components/DailySalesEntry';
import StockInwardEntry from '@/components/StockInwardEntry';
import ProductPriceManager from '@/components/ProductPriceManager';
import MonthlyReportView from '@/components/MonthlyReportView';
import UserManagement from '@/components/UserManagement';
import PendingApproval from '@/components/PendingApproval';
import AuthPage from '@/components/AuthPage';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Loader2, Lock } from 'lucide-react';

export default function Home() {
  const { user, loading, isDeveloper, isDealer, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  const { data: productsData } = useQuery({
    queryKey: ['products'],
    queryFn: async () => { const res = await api.get('/products'); return res.data; },
    enabled: !!user,
  });

  const { data: pendingData } = useQuery({
    queryKey: ['pending-count'],
    queryFn: async () => {
      const res = await api.get('/pending', { params: { status: 'pending' } });
      return res.data;
    },
    enabled: !!user && (isDealer || isDeveloper),
    refetchInterval: 30000,
  });

  const products = productsData?.data || [];
  const lowStockCount = products.filter((p: any) => p.currentStockPcs <= p.minStockAlert).length;
  const pendingCount: number = pendingData?.pendingCount || 0;

  /* Loading */
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16,
        background: 'linear-gradient(135deg,#fff7ed,#f8f9fb)',
      }}>
        <img
          src="/logo.png"
          alt="Tanvir Traders Logo"
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            objectFit: 'cover',
            boxShadow: '0 8px 24px rgba(249,115,22,0.28)',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94a3b8', fontSize: 13 }}>
          <Loader2 size={16} color="#f97316" style={{ animation: 'spin 1s linear infinite' }} />
          লোড হচ্ছে...
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  /* Not logged in */
  if (!user) return <AuthPage />;

  /* Access denied component */
  const AccessDenied = () => (
    <div style={{
      textAlign: 'center', padding: '80px 20px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 14, background: '#fef2f2',
        display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #fee2e2',
      }}>
        <Lock size={24} color="#ef4444" />
      </div>
      <h2 style={{ fontSize: 17, fontWeight: 800, color: '#0f172a' }}>অ্যাক্সেস নেই</h2>
      <p style={{ fontSize: 13, color: '#64748b', maxWidth: 300 }}>
        আপনার অ্যাকাউন্টে এই পেজ দেখার অনুমতি নেই।
      </p>
    </div>
  );

  /* Main app */
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        lowStockCount={lowStockCount}
        pendingCount={pendingCount}
      />

      <main style={{ flex: 1, maxWidth: 1200, width: '100%', margin: '0 auto', padding: '20px 16px 40px' }}>
        {activeTab === 'dashboard'       && <DashboardOverview setActiveTab={setActiveTab} />}
        {activeTab === 'daily-sales'     && ((isAdmin || isDealer) ? <DailySalesEntry />       : <AccessDenied />)}
        {activeTab === 'stock-inward'    && ((isAdmin || isDealer) ? <StockInwardEntry />      : <AccessDenied />)}
        {activeTab === 'product-pricing' && ((isAdmin || isDealer) ? <ProductPriceManager />  : <AccessDenied />)}
        {activeTab === 'monthly-report'  && ((isAdmin || isDealer) ? <MonthlyReportView />    : <AccessDenied />)}
        {activeTab === 'pending'         && ((isDealer || isAdmin) ? <PendingApproval /> : <AccessDenied />)}
        {activeTab === 'user-management' && (isDeveloper ? <UserManagement />       : <AccessDenied />)}
      </main>

      <footer style={{
        borderTop: '1px solid var(--border)',
        background: '#fff',
        padding: '14px 16px',
        textAlign: 'center',
        fontSize: 11,
        color: '#94a3b8',
      }}>
        <strong style={{ color: '#0f172a' }}>TANVIR TRADERS</strong>
        {' '}• Meghna Beverage Ltd - Fresh • ২০ বেভারেজ আইটেম • সংস্করণ ১.০
      </footer>
    </div>
  );
}
