import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import QueryProvider from '@/providers/QueryProvider';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Tanvir Traders | Meghna Beverage Ltd - Fresh Dealership',
  description: 'তানভীর ট্রেডার্স — মেঘনা বেভারেজ লিঃ (ফ্রেশ) দৈনিক বিক্রয়, স্টক ও রিপোর্ট ব্যবস্থাপনা',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn" className={inter.variable}>
      <body style={{ background: 'var(--bg)', color: 'var(--text)', minHeight: '100vh' }}>
        <QueryProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: '#fff',
                color: '#0f172a',
                border: '1px solid #e2e8f0',
                fontSize: '13px',
                fontWeight: '500',
                borderRadius: '10px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.10)',
              },
              success: { iconTheme: { primary: '#f97316', secondary: '#fff' } },
              error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
            }}
          />
        </QueryProvider>
      </body>
    </html>
  );
}
