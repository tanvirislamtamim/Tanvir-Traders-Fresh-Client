import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import QueryProvider from '@/providers/QueryProvider';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tanvirtraders.com';

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f97316' },
    { media: '(prefers-color-scheme: dark)', color: '#ea580c' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'Tanvir Traders | Meghna Beverage Ltd - Fresh Dealership',
    template: '%s | Tanvir Traders — Fresh Dealership',
  },
  description:
    'তানভীর ট্রেডার্স — মেঘনা বেভারেজ লিমিটেড (ফ্রেশ)-এর অনুমোদিত ডিলারশিপ। দৈনিক বিক্রয়, স্টক ইনওয়ার্ড, পণ্য মূল্য নির্ধারণ, ইনভেন্টরি ও স্বয়ংক্রিয় আর্থিক হিসাবের ডিজিটাল ব্যবস্থাপনা প্ল্যাটফর্ম।',
  applicationName: 'Tanvir Traders Fresh ERP',
  authors: [{ name: 'Tanvir Traders', url: baseUrl }],
  generator: 'Next.js',
  keywords: [
    'Tanvir Traders',
    'Tanvir Traders Fresh',
    'Meghna Beverage Ltd',
    'Fresh Beverage Dealership',
    'Meghna Group of Industries',
    'Fresh Drinking Water',
    'Fresh Cola',
    'Fresh Drinks Distributor',
    'তানভীর ট্রেডার্স',
    'মেঘনা বেভারেজ লিমিটেড',
    'ফ্রেশ ডিলারশিপ',
    'ফ্রেশ ড্রিংকস ডিস্ট্রিবিউটর',
    'দৈনিক বিক্রয় হিসাব',
    'স্টক ইনওয়ার্ড ম্যানেজমেন্ট',
    'ডিলারশিপ ইনভেন্টরি সফটওয়্যার',
    'Beverage Distributor Bangladesh',
    'Dhaka Beverage Distributor',
    'FMCG Distribution Management',
  ],
  creator: 'Tanvir Traders',
  publisher: 'Tanvir Traders',
  category: 'Business & Industrial / Beverage Distribution',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: '/',
    languages: {
      'bn-BD': '/',
      'en-US': '/',
    },
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: ['/icon.svg'],
  },
  manifest: '/site.webmanifest',
  openGraph: {
    type: 'website',
    locale: 'bn_BD',
    alternateLocale: ['en_US'],
    url: '/',
    siteName: 'Tanvir Traders — Meghna Beverage Ltd (Fresh)',
    title: 'Tanvir Traders | Meghna Beverage Ltd - Fresh Dealership',
    description:
      'তানভীর ট্রেডার্স — মেঘনা বেভারেজ লিমিটেড (ফ্রেশ) অনুমোদিত ডিলারশিপ। দৈনিক বিক্রয়, স্টক ইনওয়ার্ড ও ইনভেন্টরি ব্যবস্থাপনা প্ল্যাটফর্ম।',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Tanvir Traders - Meghna Beverage Ltd Fresh Dealership',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tanvir Traders | Meghna Beverage Ltd - Fresh Dealership',
    description:
      'তানভীর ট্রেডার্স — মেঘনা বেভারেজ লিমিটেড (ফ্রেশ) অনুমোদিত ডিলারশিপ। দৈনিক বিক্রয় ও ইনভেন্টরি প্ল্যাটফর্ম।',
    images: ['/og-image.png'],
    creator: '@tanvirtraders',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': ['WholesaleStore', 'Organization'],
      '@id': `${baseUrl}/#organization`,
      name: 'Tanvir Traders',
      alternateName: [
        'তানভীর ট্রেডার্স',
        'Tanvir Traders Fresh',
        'Tanvir Traders Meghna Beverage Dealership',
      ],
      legalName: 'Tanvir Traders - Authorized Dealer of Meghna Beverage Ltd',
      description:
        'Authorized Dealership of Meghna Beverage Ltd (Fresh) in Bangladesh. Distribution of beverage products, daily sales, stock management, and retail supply.',
      url: baseUrl,
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/icon-512.png`,
        width: 512,
        height: 512,
      },
      image: `${baseUrl}/og-image.png`,
      priceRange: '৳৳',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Dhaka',
        addressRegion: 'Dhaka',
        addressCountry: 'BD',
      },
      parentOrganization: {
        '@type': 'Organization',
        name: 'Meghna Group of Industries (MGI) - Meghna Beverage Ltd',
        url: 'https://meghnagroup.biz',
      },
      makesOffer: [
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Product',
            name: 'Fresh Drinking Water',
            brand: 'Fresh',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Product',
            name: 'Fresh Cola & Carbonated Beverages',
            brand: 'Fresh',
          },
        },
      ],
    },
    {
      '@type': 'WebSite',
      '@id': `${baseUrl}/#website`,
      url: baseUrl,
      name: 'Tanvir Traders',
      description: 'Meghna Beverage Ltd (Fresh) Dealership Management Portal',
      publisher: {
        '@id': `${baseUrl}/#organization`,
      },
      inLanguage: ['bn-BD', 'en-US'],
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${baseUrl}/#software`,
      name: 'Tanvir Traders ERP Portal',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'All modern browsers, Android, iOS, Windows',
      description:
        'Enterprise Dealership Management System for daily sales, inward stock, and rate management.',
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn" className={inter.variable}>
      <head>
        {/* Direct links for instant browser tab icon display & caching bypass */}
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <meta name="theme-color" content="#f97316" />

        {/* Structured Data (JSON-LD) for Search Engines */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
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

        {/* Noscript fallback for crawlers without JavaScript */}
        <noscript>
          <div style={{ padding: '24px', background: '#fff', textAlign: 'center' }}>
            <h1>তানভীর ট্রেডার্স — মেঘনা বেভারেজ লিমিটেড (ফ্রেশ) ডিলারশিপ</h1>
            <p>
              দৈনিক বিক্রয়, চালান স্টক ইনওয়ার্ড এবং ইনভেন্টরি ম্যানেজমেন্ট সিস্টেম। ব্রাউজারে JavaScript সক্রিয় করুন।
            </p>
          </div>
        </noscript>
      </body>
    </html>
  );
}
