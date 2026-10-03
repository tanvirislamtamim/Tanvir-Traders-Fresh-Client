const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Ensure output dirs exist
const clientDir = path.resolve(__dirname, '..');
const publicDir = path.join(clientDir, 'public');
const appDir = path.join(clientDir, 'src', 'app');

if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
if (!fs.existsSync(appDir)) fs.mkdirSync(appDir, { recursive: true });

// Primary Brand SVG matching Navbar
// Navbar: width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#f97316,#ea580c)', PackageCheck size: 20
const brandSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f97316" />
      <stop offset="100%" stop-color="#ea580c" />
    </linearGradient>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#ea580c" flood-opacity="0.35" />
    </filter>
  </defs>

  <!-- Gradient Background with rounded squircle matching navbar (border-radius: 10/38 ratio) -->
  <rect width="512" height="512" rx="130" fill="url(#brandGrad)" />

  <!-- Subtle inner border highlight -->
  <rect x="8" y="8" width="496" height="496" rx="122" fill="none" stroke="#ffffff" stroke-width="6" stroke-opacity="0.22" />

  <!-- PackageCheck Icon centered -->
  <!-- Scaled from 24x24 Lucide icon: (512 - 270)/2 = 121, scale = 11.25 -->
  <g transform="translate(121, 121) scale(11.25)" fill="none" stroke="#ffffff" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 22V12" />
    <path d="m16 17 2 2 4-4" />
    <path d="M21 11.127V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.729l7 4a2 2 0 0 0 2 .001l1.32-.753" />
    <path d="M3.29 7 12 12l8.71-5" />
    <path d="m7.5 4.27 8.997 5.148" />
  </g>
</svg>`;

// Helper to construct a multi-size ICO buffer from PNG buffers
function createIco(pngEntries) {
  const numImages = pngEntries.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const dirSize = headerSize + numImages * dirEntrySize;

  let currentOffset = dirSize;
  const dirEntries = [];

  for (const item of pngEntries) {
    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(item.width === 256 ? 0 : item.width, 0);
    entry.writeUInt8(item.height === 256 ? 0 : item.height, 1);
    entry.writeUInt8(0, 2); // color count
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(item.buffer.length, 8); // image size
    entry.writeUInt32LE(currentOffset, 12); // image offset
    dirEntries.push(entry);
    currentOffset += item.buffer.length;
  }

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // icon type (1)
  header.writeUInt16LE(numImages, 4); // image count

  return Buffer.concat([header, ...dirEntries, ...pngEntries.map(e => e.buffer)]);
}

// Generate Open Graph 1200x630 banner SVG
function generateOgSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0b1120" />
      <stop offset="50%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#1e293b" />
    </linearGradient>

    <radialGradient id="orangeGlow1" cx="20%" cy="30%" r="50%">
      <stop offset="0%" stop-color="#ea580c" stop-opacity="0.32" />
      <stop offset="100%" stop-color="#ea580c" stop-opacity="0" />
    </radialGradient>

    <radialGradient id="orangeGlow2" cx="85%" cy="80%" r="45%">
      <stop offset="0%" stop-color="#f97316" stop-opacity="0.22" />
      <stop offset="100%" stop-color="#f97316" stop-opacity="0" />
    </radialGradient>

    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.07" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.02" />
    </linearGradient>

    <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f97316" />
      <stop offset="100%" stop-color="#ea580c" />
    </linearGradient>

    <filter id="logoShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="20" flood-color="#f97316" flood-opacity="0.45" />
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bgGrad)" />
  <rect width="1200" height="630" fill="url(#orangeGlow1)" />
  <rect width="1200" height="630" fill="url(#orangeGlow2)" />

  <!-- Subtle grid pattern -->
  <g stroke="#ffffff" stroke-opacity="0.03" stroke-width="1">
    <line x1="0" y1="90" x2="1200" y2="90" />
    <line x1="0" y1="180" x2="1200" y2="180" />
    <line x1="0" y1="270" x2="1200" y2="270" />
    <line x1="0" y1="360" x2="1200" y2="360" />
    <line x1="0" y1="450" x2="1200" y2="450" />
    <line x1="0" y1="540" x2="1200" y2="540" />
    <line x1="150" y1="0" x2="150" y2="630" />
    <line x1="300" y1="0" x2="300" y2="630" />
    <line x1="450" y1="0" x2="450" y2="630" />
    <line x1="600" y1="0" x2="600" y2="630" />
    <line x1="750" y1="0" x2="750" y2="630" />
    <line x1="900" y1="0" x2="900" y2="630" />
    <line x1="1050" y1="0" x2="1050" y2="630" />
  </g>

  <!-- Main Container Card -->
  <rect x="60" y="50" width="1080" height="530" rx="28" fill="url(#cardGrad)" stroke="#ffffff" stroke-opacity="0.12" stroke-width="1.5" />

  <!-- Top Dealership Badge -->
  <g transform="translate(100, 95)">
    <rect width="390" height="38" rx="19" fill="#f97316" fill-opacity="0.15" stroke="#f97316" stroke-opacity="0.5" stroke-width="1" />
    <circle cx="20" cy="19" r="6" fill="#f97316" />
    <text x="36" y="24" font-family="Inter, -apple-system, sans-serif" font-size="14" font-weight="700" fill="#fb923c" letter-spacing="1">
      MEGHNA BEVERAGE LTD • AUTHORIZED DEALER
    </text>
  </g>

  <!-- Brand Section (Logo + Names) -->
  <g transform="translate(100, 160)">
    <!-- Logo Box (110x110) -->
    <rect width="110" height="110" rx="28" fill="url(#logoGrad)" filter="url(#logoShadow)" />
    <rect x="3" y="3" width="104" height="104" rx="25" fill="none" stroke="#ffffff" stroke-width="2" stroke-opacity="0.25" />
    <!-- PackageCheck icon -->
    <g transform="translate(25, 25) scale(2.5)" fill="none" stroke="#ffffff" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 22V12" />
      <path d="m16 17 2 2 4-4" />
      <path d="M21 11.127V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.729l7 4a2 2 0 0 0 2 .001l1.32-.753" />
      <path d="M3.29 7 12 12l8.71-5" />
      <path d="m7.5 4.27 8.997 5.148" />
    </g>

    <!-- Brand Titles -->
    <text x="140" y="52" font-family="Inter, -apple-system, sans-serif" font-size="46" font-weight="900" fill="#ffffff" letter-spacing="-0.5">
      TANVIR TRADERS
    </text>
    <text x="140" y="88" font-family="Inter, -apple-system, sans-serif" font-size="20" font-weight="700" fill="#f97316">
      Meghna Beverage Ltd — Fresh
    </text>
  </g>

  <!-- Tagline / Description (Bangla + English) -->
  <text x="100" y="325" font-family="'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="600" fill="#e2e8f0">
    দৈনিক বিক্রয়, স্টক ইনওয়ার্ড ও ইনভেন্টরি অটোমেশন প্ল্যাটফর্ম
  </text>
  <text x="100" y="362" font-family="Inter, -apple-system, sans-serif" font-size="16" font-weight="400" fill="#94a3b8">
    Enterprise distribution ERP for daily sales tracking, inward stock, rate manager &amp; financial reports
  </text>

  <!-- 4 Feature Pills -->
  <g transform="translate(100, 405)">
    <!-- Pill 1 -->
    <rect x="0" y="0" width="220" height="52" rx="14" fill="#1e293b" fill-opacity="0.8" stroke="#334155" stroke-width="1" />
    <text x="20" y="32" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="600" fill="#f8fafc">
      📦 পণ্য ও রেট তালিকা
    </text>

    <!-- Pill 2 -->
    <rect x="235" y="0" width="215" height="52" rx="14" fill="#1e293b" fill-opacity="0.8" stroke="#334155" stroke-width="1" />
    <text x="20" y="32" transform="translate(235, 0)" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="600" fill="#f8fafc">
      📊 দৈনিক বিক্রয় হিসাব
    </text>

    <!-- Pill 3 -->
    <rect x="465" y="0" width="225" height="52" rx="14" fill="#1e293b" fill-opacity="0.8" stroke="#334155" stroke-width="1" />
    <text x="20" y="32" transform="translate(465, 0)" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="600" fill="#f8fafc">
      🚚 চালান ও স্টক ইনওয়ার্ড
    </text>

    <!-- Pill 4 -->
    <rect x="705" y="0" width="215" height="52" rx="14" fill="#1e293b" fill-opacity="0.8" stroke="#334155" stroke-width="1" />
    <text x="20" y="32" transform="translate(705, 0)" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="600" fill="#f8fafc">
      📈 অটোমেটেড রিপোর্ট
    </text>
  </g>

  <!-- Bottom Bar Info -->
  <g transform="translate(100, 520)">
    <text x="0" y="0" font-family="Inter, -apple-system, sans-serif" font-size="13" font-weight="500" fill="#64748b">
      📍 Dhaka, Bangladesh  •  ⚡ Real-Time Inventory &amp; Cloud Sync  •  🔒 Role-Based Multi-Level Access
    </text>
  </g>
</svg>`;
}

async function run() {
  console.log('--- Generating Brand Icons and SEO Assets ---');

  // 1. Write SVG icons
  const brandSvgBuffer = Buffer.from(brandSvg);
  fs.writeFileSync(path.join(appDir, 'icon.svg'), brandSvg, 'utf-8');
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), brandSvg, 'utf-8');
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), brandSvg, 'utf-8');
  console.log('✔ Generated icon.svg in src/app and public/');

  // 2. Generate standard PNG icon sizes
  const sizes = [
    { size: 16,  filename: 'favicon-16x16.png' },
    { size: 32,  filename: 'favicon-32x32.png' },
    { size: 48,  filename: 'favicon-48x48.png' },
    { size: 180, filename: 'apple-touch-icon.png' },
    { size: 192, filename: 'icon-192.png' },
    { size: 512, filename: 'icon-512.png' },
  ];

  const icoPngEntries = [];

  for (const { size, filename } of sizes) {
    const pngBuf = await sharp(brandSvgBuffer)
      .resize(size, size)
      .png()
      .toBuffer();

    fs.writeFileSync(path.join(publicDir, filename), pngBuf);
    console.log(`✔ Generated public/${filename} (${size}x${size})`);

    // For ICO inclusion (16, 32, 48)
    if ([16, 32, 48].includes(size)) {
      icoPngEntries.push({ width: size, height: size, buffer: pngBuf });
    }

    // Also copy 180 for apple-icon in app dir
    if (size === 180) {
      fs.writeFileSync(path.join(appDir, 'apple-icon.png'), pngBuf);
      console.log('✔ Generated src/app/apple-icon.png');
    }
  }

  // 3. Generate multi-size ICO file
  const icoBuffer = createIco(icoPngEntries);
  fs.writeFileSync(path.join(appDir, 'favicon.ico'), icoBuffer);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
  console.log(`✔ Generated multi-size favicon.ico (${icoBuffer.length} bytes) in src/app and public/`);

  // 4. Generate Open Graph 1200x630 banner
  const ogSvg = generateOgSvg();
  fs.writeFileSync(path.join(publicDir, 'og-image.svg'), ogSvg, 'utf-8');
  const ogPngBuffer = await sharp(Buffer.from(ogSvg))
    .resize(1200, 630)
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(publicDir, 'og-image.png'), ogPngBuffer);
  console.log('✔ Generated public/og-image.png (1200x630)');

  // 5. Generate site.webmanifest
  const manifest = {
    name: 'Tanvir Traders — Fresh Dealership',
    short_name: 'Tanvir Traders',
    description: 'তানভীর ট্রেডার্স — মেঘনা বেভারেজ লিঃ (ফ্রেশ) দৈনিক বিক্রয়, স্টক ও রিপোর্ট ব্যবস্থাপনা',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#f97316',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable'
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable'
      },
      {
        src: '/favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml'
      }
    ]
  };
  fs.writeFileSync(path.join(publicDir, 'site.webmanifest'), JSON.stringify(manifest, null, 2), 'utf-8');
  console.log('✔ Generated public/site.webmanifest');

  console.log('=== All Assets Successfully Generated ===');
}

run().catch(err => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
