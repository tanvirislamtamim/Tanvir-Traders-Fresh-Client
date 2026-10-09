'use client';

import React, { useState } from 'react';
import {
  Store, CalendarDays, Truck, Tag, BarChart3,
  LogOut, ShieldCheck, User,
  Code2, Users, Menu, X, Clock, Handshake,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  lowStockCount?: number;
  pendingCount?: number;
}

const allNavItems = [
  { id: 'dashboard', label: 'Dashboard', bangla: 'ড্যাশবোর্ড', icon: Store, minRole: 'user' },
  { id: 'daily-sales', label: 'Daily Sales', bangla: 'দৈনিক বিক্রয়', icon: CalendarDays, minRole: 'admin' },
  { id: 'stock-inward', label: 'Stock Inward', bangla: 'মাল গ্রহণ', icon: Truck, minRole: 'admin' },
  { id: 'product-pricing', label: 'Products & Price', bangla: 'পণ্য ও রেট', icon: Tag, minRole: 'admin' },
  { id: 'monthly-report', label: 'Reports', bangla: 'মাসিক রিপোর্ট', icon: BarChart3, minRole: 'admin' },
  { id: 'pending', label: 'Pending', bangla: 'অনুমোদন তালিকা', icon: Clock, minRole: 'dealer' },
  { id: 'user-management', label: 'Users', bangla: 'ব্যবহারকারী', icon: Users, minRole: 'developer' },
];

const ROLE_CFG: Record<string, { label: string; bangla: string; color: string; bg: string; Icon: any }> = {
  developer: { label: 'Developer', bangla: 'ডেভেলপার', color: '#7c3aed', bg: '#f5f3ff', Icon: Code2 },
  dealer: { label: 'Dealer', bangla: 'ডিলার', color: '#0ea5e9', bg: '#f0f9ff', Icon: Handshake },
  admin: { label: 'Admin', bangla: 'অ্যাডমিন', color: '#f97316', bg: '#fff7ed', Icon: ShieldCheck },
  user: { label: 'User', bangla: 'ব্যবহারকারী', color: '#10b981', bg: '#f0fdf4', Icon: User },
};

export default function Navbar({ activeTab, setActiveTab, lowStockCount = 0, pendingCount = 0 }: NavbarProps) {
  const { user, logout, isDeveloper, isDealer, isAdmin } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const role = isDeveloper ? 'developer' : isDealer ? 'dealer' : isAdmin ? 'admin' : 'user';
  const cfg = ROLE_CFG[role];
  const RoleIcon = cfg.Icon;

  const canAccess = (minRole: string) => {
    if (isDeveloper) return true;
    if (minRole === 'user') return true;
    if (minRole === 'admin') return isAdmin;
    if (minRole === 'dealer') return isDealer || isAdmin;
    if (minRole === 'developer') return isDeveloper;
    return false;
  };

  const navItems = allNavItems.filter(item => canAccess(item.minRole));

  const handleNav = (id: string) => {
    setActiveTab(id);
    setMobileOpen(false);
  };

  return (
    <>
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: '#fff',
        borderBottom: '1px solid #e2e8f0',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>

            {/* Brand */}
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
              onClick={() => handleNav('dashboard')}
            >
              <img
                src="/logo.png"
                alt="Tanvir Traders Logo"
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  objectFit: 'cover',
                  boxShadow: '0 3px 10px rgba(249,115,22,0.25)',
                  flexShrink: 0,
                }}
              />
              <div>
                <div style={{ fontWeight: 900, fontSize: 15, color: '#0f172a', lineHeight: 1.2 }}>
                  TANVIR TRADERS
                </div>
                <div style={{ fontSize: 10, color: '#f97316', fontWeight: 700 }}>
                  Meghna Beverage Ltd - Fresh
                </div>
              </div>
            </div>

            {/* Desktop nav */}
            <nav style={{ display: 'flex', alignItems: 'center', gap: 2 }} className="desktop-nav">
              {navItems.map(item => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                const isPending = item.id === 'pending';
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNav(item.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '7px 12px',
                      borderRadius: 9,
                      border: 'none', cursor: 'pointer',
                      fontWeight: active ? 700 : 500,
                      fontSize: 12,
                      background: active ? (isPending ? '#eff6ff' : '#fff7ed') : 'transparent',
                      color: active ? (isPending ? '#2563eb' : '#f97316') : '#64748b',
                      transition: 'all 0.15s',
                      position: 'relative',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = '#f8f9fb'; }}
                    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <Icon size={14} />
                    <span>{item.label}</span>
                    {item.id === 'product-pricing' && lowStockCount > 0 && (
                      <span style={{
                        position: 'absolute', top: -4, right: -4,
                        background: '#ef4444', color: '#fff',
                        fontSize: 9, fontWeight: 800,
                        padding: '1px 5px', borderRadius: 99,
                      }}>{lowStockCount}</span>
                    )}
                    {item.id === 'pending' && pendingCount > 0 && (
                      <span style={{
                        position: 'absolute', top: -4, right: -4,
                        background: '#2563eb', color: '#fff',
                        fontSize: 9, fontWeight: 800,
                        padding: '1px 5px', borderRadius: 99,
                      }}>{pendingCount}</span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Right: Role badge + Logout + Mobile menu */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Role badge */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 7,
                background: cfg.bg, borderRadius: 9,
                padding: '5px 10px',
                border: `1px solid ${cfg.color}30`,
              }} className="role-badge">
                <RoleIcon size={14} color={cfg.color} />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: cfg.color }}>
                    {cfg.label}
                  </div>
                  <div style={{ fontSize: 10, color: '#94a3b8', maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.displayName || user?.email?.split('@')[0]}
                  </div>
                </div>
              </div>

              {/* Logout */}
              <button
                onClick={() => { if (window.confirm('লগআউট করবেন?')) logout(); }}
                style={{
                  border: '1px solid #e2e8f0', background: '#fff',
                  borderRadius: 9, padding: 7, cursor: 'pointer',
                  color: '#94a3b8', display: 'flex', alignItems: 'center',
                  transition: 'all 0.15s',
                }}
                title="লগআউট"
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#ef4444'; (e.currentTarget as HTMLElement).style.color = '#ef4444'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0'; (e.currentTarget as HTMLElement).style.color = '#94a3b8'; }}
              >
                <LogOut size={16} />
              </button>

              {/* Mobile hamburger */}
              <button
                className="mobile-menu-btn"
                onClick={() => setMobileOpen(!mobileOpen)}
                style={{
                  border: '1px solid #e2e8f0', background: '#fff',
                  borderRadius: 9, padding: 7, cursor: 'pointer',
                  color: '#64748b', display: 'flex', alignItems: 'center',
                }}
              >
                {mobileOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileOpen && (
          <div style={{
            borderTop: '1px solid #e2e8f0',
            background: '#fff',
            padding: '8px 16px 12px',
          }} className="mobile-menu">
            {navItems.map(item => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', padding: '10px 12px',
                    borderRadius: 9, border: 'none', cursor: 'pointer',
                    background: active ? '#fff7ed' : 'transparent',
                    color: active ? '#f97316' : '#475569',
                    fontWeight: active ? 700 : 500,
                    fontSize: 13,
                    marginBottom: 2,
                    textAlign: 'left',
                    position: 'relative',
                  }}
                >
                  <Icon size={15} />
                  <div>
                    <div>{item.label}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8' }}>{item.bangla}</div>
                  </div>
                  {item.id === 'pending' && pendingCount > 0 && (
                    <span style={{
                      marginLeft: 'auto',
                      background: '#2563eb', color: '#fff',
                      fontSize: 10, fontWeight: 800,
                      padding: '2px 7px', borderRadius: 99,
                    }}>{pendingCount}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* Responsive CSS */}
      <style>{`
        .desktop-nav { display: flex; }
        .role-badge  { display: flex; }
        .mobile-menu-btn { display: none !important; }
        .mobile-menu { display: block; }

        @media (max-width: 768px) {
          .desktop-nav    { display: none !important; }
          .role-badge     { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </>
  );
}
