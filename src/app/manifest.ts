import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Tanvir Traders — Fresh Dealership',
    short_name: 'Tanvir Traders',
    description: 'তানভীর ট্রেডার্স — মেঘনা বেভারেজ লিঃ (ফ্রেশ) দৈনিক বিক্রয়, স্টক ও রিপোর্ট ব্যবস্থাপনা',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#f97316',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
