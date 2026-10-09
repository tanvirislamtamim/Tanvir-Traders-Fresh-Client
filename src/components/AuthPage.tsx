'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Eye, EyeOff, Loader2, Lock, Mail, User,
  ShieldCheck, ArrowRight, KeyRound,
} from 'lucide-react';
import toast from 'react-hot-toast';

type AuthMode = 'login' | 'register' | 'forgot';

export default function AuthPage() {
  const { login, loginWithGoogle, register, resetPassword } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const banglaErr: Record<string, string> = {
    'auth/invalid-email':          'সঠিক ইমেইল ঠিকানা লিখুন',
    'auth/user-not-found':         'এই ইমেইলে কোনো অ্যাকাউন্ট নেই',
    'auth/wrong-password':         'পাসওয়ার্ড ভুল হয়েছে',
    'auth/invalid-credential':     'ইমেইল বা পাসওয়ার্ড ভুল',
    'auth/email-already-in-use':   'এই ইমেইলে ইতিমধ্যে অ্যাকাউন্ট আছে',
    'auth/weak-password':          'পাসওয়ার্ড আরও শক্তিশালী করুন (কমপক্ষে ৬ অক্ষর)',
    'auth/too-many-requests':      'অনেকবার চেষ্টা করা হয়েছে, কিছুক্ষণ পরে চেষ্টা করুন',
    'auth/network-request-failed': 'ইন্টারনেট সংযোগ পরীক্ষা করুন',
    'auth/popup-closed-by-user':   'লগইন উইন্ডো বন্ধ করা হয়েছে',
    'auth/popup-blocked':          'ব্রাউজারের পপ-আপ ব্লক করা আছে, অনুগ্রহ করে অনুমতি দিন',
    'auth/operation-not-allowed':  'Firebase কনসোলে Google সাইন-ইন সক্রিয় করুন',
    'auth/account-exists-with-different-credential': 'এই ইমেইলে অন্য পদ্ধতিতে অ্যাকাউন্ট খোলা আছে',
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      toast.success('Google দিয়ে সফলভাবে লগইন হয়েছে!');
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        return;
      }
      toast.error(banglaErr[err?.code] || err?.message || 'Google দিয়ে লগইন ব্যর্থ হয়েছে');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email.trim(), password);
        toast.success('স্বাগতম! সফলভাবে লগইন হয়েছে।');
      } else if (mode === 'register') {
        if (!displayName.trim()) { toast.error('আপনার নাম লিখুন'); return; }
        if (password !== confirmPassword) { toast.error('পাসওয়ার্ড দুটি মিলছে না'); return; }
        if (password.length < 6) { toast.error('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে'); return; }
        await register(email.trim(), password, displayName.trim());
        toast.success('অ্যাকাউন্ট তৈরি হয়েছে! স্বাগতম।');
      } else {
        await resetPassword(email.trim());
        toast.success(`${email}-এ পাসওয়ার্ড রিসেট লিংক পাঠানো হয়েছে।`);
        setMode('login');
      }
    } catch (err: any) {
      toast.error(banglaErr[err?.code] || 'একটি সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m: AuthMode) => {
    setMode(m);
    setPassword(''); setConfirmPassword(''); setDisplayName('');
    setShowPass(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #fff7ed 0%, #f8f9fb 50%, #eff6ff 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>

      {/* Brand */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <img
          src="/logo.png"
          alt="Tanvir Traders Logo"
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            objectFit: 'cover',
            margin: '0 auto 14px',
            display: 'block',
            boxShadow: '0 8px 24px rgba(249,115,22,0.28)',
          }}
        />
        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: 0 }}>
          TANVIR TRADERS
        </h1>
        <p style={{ fontSize: 12, color: '#f97316', fontWeight: 700, marginTop: 3 }}>
          Meghna Beverage Ltd — Fresh
        </p>
        <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
          ডিলারশিপ ম্যানেজমেন্ট সিস্টেম
        </p>
      </div>

      {/* Card */}
      <div style={{
        width: '100%', maxWidth: 420,
        background: '#fff',
        borderRadius: 18,
        border: '1px solid #e2e8f0',
        boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
        overflow: 'hidden',
      }}>

        {/* Tab bar — only for login/register */}
        {mode !== 'forgot' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            borderBottom: '1px solid #e2e8f0',
          }}>
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                style={{
                  padding: '14px 0',
                  fontWeight: 700,
                  fontSize: 13,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  background: mode === m ? '#fff7ed' : '#f8f9fb',
                  color: mode === m ? '#f97316' : '#94a3b8',
                  borderBottom: mode === m ? '2.5px solid #f97316' : '2.5px solid transparent',
                }}
              >
                {m === 'login' ? '🔐 লগইন করুন' : '✏️ নতুন অ্যাকাউন্ট'}
              </button>
            ))}
          </div>
        )}

        {/* Forgot header */}
        {mode === 'forgot' && (
          <div style={{
            padding: '18px 24px 14px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 36, height: 36,
              background: '#fff7ed', borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <KeyRound size={18} color="#f97316" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>পাসওয়ার্ড রিসেট</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>ইমেইলে রিসেট লিংক পাঠানো হবে</div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Display name — register only */}
            {mode === 'register' && (
              <div>
                <label className="form-label">পূর্ণ নাম *</label>
                <div style={{ position: 'relative' }}>
                  <User size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    className="input"
                    style={{ paddingLeft: 36 }}
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="যেমন: Tanvir Ahmed"
                    required
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="form-label">ইমেইল *</label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  className="input"
                  style={{ paddingLeft: 36 }}
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            {mode !== 'forgot' && (
              <div>
                <label className="form-label">পাসওয়ার্ড *</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    className="input"
                    style={{ paddingLeft: 36, paddingRight: 40 }}
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="কমপক্ষে ৬ অক্ষর"
                    required
                    minLength={6}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {mode === 'login' && (
                  <div style={{ textAlign: 'right', marginTop: 6 }}>
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#f97316', fontWeight: 600 }}
                    >
                      পাসওয়ার্ড ভুলে গেছেন?
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Confirm password — register only */}
            {mode === 'register' && (
              <div>
                <label className="form-label">পাসওয়ার্ড নিশ্চিত করুন *</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    className="input"
                    style={{ paddingLeft: 36 }}
                    type={showPass ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="আবার একই পাসওয়ার্ড লিখুন"
                    required
                  />
                </div>
              </div>
            )}

            {/* Submit */}
            <button className="btn-primary" type="submit" disabled={loading || googleLoading} style={{ width: '100%', padding: '12px', marginTop: 4 }}>
              {loading
                ? <><Loader2 size={15} className="animate-spin" /> অপেক্ষা করুন...</>
                : mode === 'login'    ? <><Lock size={14} /> লগইন করুন <ArrowRight size={14} /></>
                : mode === 'register' ? <><User size={14} /> অ্যাকাউন্ট তৈরি করুন <ArrowRight size={14} /></>
                :                      <><Mail size={14} /> রিসেট লিংক পাঠান</>
              }
            </button>

            {/* Google Sign-in for Login & Register */}
            {mode !== 'forgot' && (
              <>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  margin: '2px 0',
                  gap: 12,
                }}>
                  <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                  <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>অথবা</span>
                  <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                </div>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading || googleLoading}
                  style={{
                    width: '100%',
                    padding: '11px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    borderRadius: 10,
                    border: '1.5px solid #e2e8f0',
                    background: '#ffffff',
                    color: '#1e293b',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: (loading || googleLoading) ? 'not-allowed' : 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!loading && !googleLoading) {
                      e.currentTarget.style.background = '#f8fafc';
                      e.currentTarget.style.borderColor = '#cbd5e1';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#ffffff';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                >
                  {googleLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" color="#f97316" />
                      <span>Google-এ সংযোগ হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>
                        {mode === 'login' ? 'Google দিয়ে লগইন করুন' : 'Google দিয়ে সাইন আপ করুন'}
                      </span>
                    </>
                  )}
                </button>
              </>
            )}

            {/* Back to login */}
            {mode === 'forgot' && (
              <button
                type="button"
                onClick={() => switchMode('login')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#f97316', fontWeight: 600, textAlign: 'center' }}
              >
                ← লগইন পেজে ফিরুন
              </button>
            )}
          </div>
        </form>

        {/* Info footer */}
        <div style={{
          margin: '0 16px 16px',
          background: '#f8f9fb',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          padding: '12px 14px',
        }}>
          <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.8 }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 4 }}>
              <ShieldCheck size={13} color="#f97316" style={{ flexShrink: 0, marginTop: 2 }} />
              <span><strong style={{ color: '#0f172a' }}>Admin:</strong> স্টক, রেট আপডেট, মাসিক রিপোর্ট + বিক্রয়</span>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
              <User size={13} color="#10b981" style={{ flexShrink: 0, marginTop: 2 }} />
              <span><strong style={{ color: '#0f172a' }}>User:</strong> শুধু দৈনিক বিক্রয় এন্ট্রি করতে পারবেন</span>
            </div>
          </div>
        </div>
      </div>

      <p style={{ marginTop: 20, fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>
        Tanvir Traders © {new Date().getFullYear()} — Meghna Beverage Ltd Fresh Dealership
      </p>
    </div>
  );
}
