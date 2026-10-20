#!/usr/bin/env node
/**
 * ========================================================================
 * SIMPEL-KU - FAST BUILD & BUNDLE AUTOMATION (NODE.JS)
 * BPS Provinsi Kalimantan Barat
 * ========================================================================
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const BASE_DIR = __dirname;

const BACKEND_FILES = [
  "config/Config.gs",
  "utils/Utils.gs",
  "backend/Database.gs",
  "backend/Auth.gs",
  "backend/BuktiDukung.gs",
  "backend/InspeksiMutu.gs",
  "backend/StaffMonitoring.gs",
  "backend/Security.gs",
  "backend/Supervisor.gs",
  "backend/ApiRouter.gs"
];

const CSS_FILES = [
  "css/main.css",
  "css/components.css"
];

const COMPONENTS_PAGES = {
  modals: "components/modals.html",
  login: "pages/login.html",
  sidebar: "components/sidebar.html",
  header: "components/header.html",
  views: [
    "pages/supervisor_dashboard.html",
    "pages/supervisor_monitoring.html",
    "pages/supervisor_shift.html",
    "pages/supervisor_inspeksi.html",
    "pages/staff_dashboard.html",
    "pages/staff_monitoring.html",
    "pages/staff_rekap.html",
    "pages/staff_profile.html",
    "pages/staff_security.html"
  ]
};

const JS_FILES = [
  "config/config.js",
  "utils/utils.js",
  "js/app.js",
  "js/auth.js",
  "js/staff_monitoring.js",
  "js/staff_security.js",
  "js/staff_rekap.js",
  "js/supervisor_dashboard.js",
  "js/supervisor_monitoring.js",
  "js/supervisor_shift.js",
  "js/supervisor_inspeksi.js"
];

function readFile(relPath) {
  const fullPath = path.join(BASE_DIR, relPath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`File tidak ditemukan: ${relPath}`);
  }
  return fs.readFileSync(fullPath, 'utf8');
}

function buildBackend() {
  console.log("[1/3] Membangun master code.gs dari modul backend...");
  const parts = [
    "/**",
    " * ========================================================================",
    " * SISTEM MONITORING PELAYANAN, KEAMANAN & KEBERSIHAN UMUM (SIMPEL-KU)",
    " * BPS Provinsi Kalimantan Barat",
    " * COMPILED MASTER BACKEND - GOOGLE APPS SCRIPT",
    " * ========================================================================",
    " */\n"
  ];

  for (const fpath of BACKEND_FILES) {
    const content = readFile(fpath).trim();
    parts.push(`// >>>>>>>>>> MODUL: ${fpath} >>>>>>>>>>`);
    parts.push(content);
    parts.push(`// <<<<<<<<<< END MODUL: ${fpath} <<<<<<<<<<\n`);
  }

  const masterGs = parts.join('\n\n');
  const outPath = path.join(BASE_DIR, "code.gs");
  fs.writeFileSync(outPath, masterGs, 'utf8');
  console.log(`  [OK] code.gs berhasil dibangun (${Buffer.byteLength(masterGs, 'utf8')} bytes, ${BACKEND_FILES.length} modul)`);
  return masterGs;
}

function buildFrontend() {
  console.log("[2/3] Membangun master index.html dari modul frontend...");
  console.log("  -> Membaca CSS...");
  const combinedCss = CSS_FILES.map(c => readFile(c).trim()).join('\n\n');
  console.log("  -> Membaca Views...");
  const combinedViews = COMPONENTS_PAGES.views.map(v => readFile(v).trim()).join('\n\n');

  console.log("  -> Membaca JS...");
  const jsParts = [];
  for (const jpath of JS_FILES) {
    const content = readFile(jpath).trim();
    jsParts.push(`// >>>>>>>>>> MODUL JS: ${jpath} >>>>>>>>>>`);
    jsParts.push(content);
    jsParts.push(`// <<<<<<<<<< END MODUL JS: ${jpath} <<<<<<<<<<\n`);
  }
  const combinedJs = jsParts.join('\n\n');

  console.log("  -> Membaca Modals, Login, Sidebar, Header...");
  const modalsHtml = readFile(COMPONENTS_PAGES.modals).trim();
  const loginHtml = readFile(COMPONENTS_PAGES.login).trim();
  const sidebarHtml = readFile(COMPONENTS_PAGES.sidebar).trim();
  const headerHtml = readFile(COMPONENTS_PAGES.header).trim();
  console.log("  -> Menggabungkan HTML...");

  const doc = [
    '<!DOCTYPE html>',
    '<html lang="id" class="h-full bg-slate-50">',
    '<head>',
    '  <meta charset="UTF-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">',
    '  <title>SIMPEL-KU | BPS Provinsi Kalimantan Barat</title>',
    '  <meta name="description" content="Sistem Monitoring Pelayanan, Keamanan, dan Kebersihan Umum BPS Provinsi Kalimantan Barat">',
    '  <meta name="theme-color" content="#1e40af">',
    '  <meta name="color-scheme" content="light">',
    '  <meta name="mobile-web-app-capable" content="yes">',
    '  <meta name="application-name" content="SIMPEL-KU">',
    '  <!-- PWA Manifest & App Icons -->',
    '  <link rel="manifest" href="manifest.json">',
    '  <link rel="icon" type="image/png" sizes="192x192" href="img/icon-192.png">',
    '  <link rel="icon" type="image/png" sizes="32x32" href="img/icon-192.png">',
    '  <!-- iOS Safari PWA Meta Tags -->',
    '  <meta name="apple-mobile-web-app-capable" content="yes">',
    '  <meta name="apple-mobile-web-app-status-bar-style" content="default">',
    '  <meta name="apple-mobile-web-app-title" content="SIMPEL-KU">',
    '  <link rel="apple-touch-icon" href="img/apple-touch-icon.png">',
    '  <link rel="apple-touch-icon" sizes="180x180" href="img/apple-touch-icon.png">',
    '  <link rel="apple-touch-icon" sizes="192x192" href="img/icon-192.png">',
    '  <!-- Tailwind CSS CDN & Config -->',
    '  <script src="https://cdn.tailwindcss.com"></script>',
    '  <script id="tailwind-config">',
    '    tailwind.config = {',
    '      theme: {',
    '        extend: {',
    '          colors: {',
    "            brand: { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa', 500: '#2563eb', 600: '#1d4ed8', 700: '#1e40af', 800: '#1e3a8a', 900: '#172554' },",
    "            accent: { 50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 300: '#fdba74', 400: '#fb923c', 500: '#f97316', 600: '#ea580c', 700: '#c2410c', 800: '#9a3412', 900: '#7c2d12' }",
    '          },',
    '          fontFamily: { sans: [\'"Plus Jakarta Sans"\', \'Inter\', \'system-ui\', \'sans-serif\'] }',
    '        }',
    '      }',
    '    };',
    '  </script>',
    '  <!-- FontAwesome CDN -->',
    '  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">',
    '  <!-- Chart.js CDN -->',
    '  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>',
    '  <!-- Google Fonts: Plus Jakarta Sans -->',
    '  <link rel="preconnect" href="https://fonts.googleapis.com">',
    '  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
    '  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">',
    '  <style>',
    combinedCss,
    '  </style>',
    '</head>',
    '<body class="bg-slate-50 text-slate-800 font-sans antialiased min-h-screen">',
    '',
    '  <!-- Global Modals & Overlays -->',
    modalsHtml,
    '',
    '  <!-- Halaman Login -->',
    loginHtml,
    '',
    '  <!-- Aplikasi Utama -->',
    '  <div id="mainApp" class="hidden min-h-screen flex">',
    '    <!-- Sidebar Navigation -->',
    sidebarHtml,
    '',
    '    <!-- Content Area Wrapper -->',
    '    <div id="contentWrapper" class="flex-1 flex flex-col min-w-0 transition-all duration-300 md:ml-64">',
    '      <!-- Header Navbar -->',
    headerHtml,
    '',
    '      <!-- Main Content Pages -->',
    '      <main class="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto space-y-6">',
    combinedViews,
    '      </main>',
    '    </div>',
    '  </div>',
    '',
    '  <!-- Application Logic & Controllers -->',
    '  <script>',
    combinedJs,
    '  </script>',
    '</body>',
    '</html>'
  ];

  let masterHtml = doc.join('\n');

  const simpelkuB64Path = path.join(BASE_DIR, "img", "logo_simpelku_b64.txt");
  if (fs.existsSync(simpelkuB64Path)) {
    const simpelkuB64 = fs.readFileSync(simpelkuB64Path, 'utf8').trim();
    masterHtml = masterHtml.split('src="img/logo_simpelku.png"').join(`src="data:image/png;base64,${simpelkuB64}"`);
  }

  const bpsB64Path = path.join(BASE_DIR, "img", "logo_bps_b64.txt");
  if (fs.existsSync(bpsB64Path)) {
    const bpsB64 = fs.readFileSync(bpsB64Path, 'utf8').trim();
    masterHtml = masterHtml.split('src="img/logo_BPS.png"').join(`src="data:image/png;base64,${bpsB64}"`);
  }

  const outPath = path.join(BASE_DIR, "index.html");
  fs.writeFileSync(outPath, masterHtml, 'utf8');
  console.log(`  [OK] index.html berhasil dibangun (${Buffer.byteLength(masterHtml, 'utf8')} bytes)`);
  return masterHtml;
}

function validateBuild(gsCode, indexHtml) {
  console.log("[3/3] Memvalidasi hasil build sintaks JavaScript & GAS...");

  const sandbox = {
    SpreadsheetApp: {},
    HtmlService: {},
    ContentService: {},
    CacheService: {},
    PropertiesService: {},
    DriveApp: {},
    Session: { getEffectiveUser: () => ({ getEmail: () => "" }), getActiveUser: () => ({ getEmail: () => "" }) },
    Utilities: {},
    Logger: console,
    console: console
  };
  vm.createContext(sandbox);

  try {
    vm.runInContext(gsCode, sandbox);
    console.log("  [OK] code.gs lolos verifikasi sintaks GAS.");
  } catch (e) {
    console.error("  [FAIL] Error sintaks di code.gs:", e.message);
    process.exit(1);
  }

  // Ambil script utama di akhir dokumen
  const lastScriptIdx = indexHtml.lastIndexOf('<script>');
  if (lastScriptIdx !== -1) {
    const jsSnippet = indexHtml.substring(lastScriptIdx + 8, indexHtml.indexOf('</script>', lastScriptIdx));
    try {
      new vm.Script(jsSnippet, { filename: "index_bundled.js" });
      console.log("  [OK] index.html script lolos verifikasi sintaks JS.");
    } catch (e) {
      console.error("  [FAIL] Error sintaks di script index.html:", e.message);
      process.exit(1);
    }
  }

  console.log("\n========================================================");
  console.log("[SUCCESS] BUILD SELESAI & SUKSES 100%! Aplikasi siap digunakan.");
  console.log("========================================================");
}

try {
  const gsCode = buildBackend();
  const indexHtml = buildFrontend();
  validateBuild(gsCode, indexHtml);
} catch (err) {
  console.error(`\n[ERROR] Gagal melakukan build: ${err.message}`);
  process.exit(1);
}
