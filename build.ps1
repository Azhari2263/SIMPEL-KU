# SIMPEL-KU PowerShell Build Script
param()

$ErrorActionPreference = "Stop"
$baseDir = $PSScriptRoot

$backendFiles = @(
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
)

$cssFiles = @(
    "css/main.css",
    "css/components.css"
)

$viewFiles = @(
    "pages/supervisor_dashboard.html",
    "pages/supervisor_monitoring.html",
    "pages/supervisor_shift.html",
    "pages/supervisor_inspeksi.html",
    "pages/staff_dashboard.html",
    "pages/staff_monitoring.html",
    "pages/staff_rekap.html",
    "pages/staff_profile.html",
    "pages/staff_security.html"
)

$jsFiles = @(
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
)

Write-Host "[1/2] Building code.gs..."
$backendParts = @(
    "/**",
    " * ========================================================================",
    " * SISTEM MONITORING PELAYANAN, KEAMANAN & KEBERSIHAN UMUM (SIMPEL-KU)",
    " * BPS Provinsi Kalimantan Barat",
    " * COMPILED MASTER BACKEND - GOOGLE APPS SCRIPT",
    " * ========================================================================",
    " */`n"
)

foreach ($fpath in $backendFiles) {
    $fullPath = Join-Path $baseDir $fpath
    $content = (Get-Content $fullPath -Raw -Encoding utf8).Trim()
    $backendParts += "// >>>>>>>>>> MODUL: $fpath >>>>>>>>>>"
    $backendParts += $content
    $backendParts += "// <<<<<<<<<< END MODUL: $fpath <<<<<<<<<<`n"
}

$masterGs = $backendParts -join "`n`n"
$codeGsPath = Join-Path $baseDir "code.gs"
[System.IO.File]::WriteAllText($codeGsPath, $masterGs, [System.Text.Encoding]::UTF8)
Write-Host "  [OK] code.gs built successfully ($($masterGs.Length) chars)"

Write-Host "[2/2] Building index.html..."
$cssBundle = foreach ($c in $cssFiles) {
    (Get-Content (Join-Path $baseDir $c) -Raw -Encoding utf8).Trim()
}
$combinedCss = $cssBundle -join "`n`n"

$viewsBundle = foreach ($v in $viewFiles) {
    (Get-Content (Join-Path $baseDir $v) -Raw -Encoding utf8).Trim()
}
$combinedViews = $viewsBundle -join "`n`n"

$jsBundle = @()
foreach ($j in $jsFiles) {
    $c = (Get-Content (Join-Path $baseDir $j) -Raw -Encoding utf8).Trim()
    $jsBundle += "// >>>>>>>>>> MODUL JS: $j >>>>>>>>>>"
    $jsBundle += $c
    $jsBundle += "// <<<<<<<<<< END MODUL JS: $j <<<<<<<<<<`n"
}
$combinedJs = $jsBundle -join "`n`n"

$modalsHtml = (Get-Content (Join-Path $baseDir "components/modals.html") -Raw -Encoding utf8).Trim()
$loginHtml = (Get-Content (Join-Path $baseDir "pages/login.html") -Raw -Encoding utf8).Trim()
$sidebarHtml = (Get-Content (Join-Path $baseDir "components/sidebar.html") -Raw -Encoding utf8).Trim()
$headerHtml = (Get-Content (Join-Path $baseDir "components/header.html") -Raw -Encoding utf8).Trim()

$doc = @()
$doc += "<!DOCTYPE html>"
$doc += "<html lang=`"id`" class=`"h-full bg-slate-50`">"
$doc += "<head>"
$doc += "  <meta charset=`"UTF-8`">"
$doc += "  <meta name=`"viewport`" content=`"width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover`">"
$doc += "  <title>SIMPEL-KU | BPS Provinsi Kalimantan Barat</title>"
$doc += "  <meta name=`"description`" content=`"Sistem Monitoring Pelayanan, Keamanan, dan Kebersihan Umum BPS Provinsi Kalimantan Barat`">"
$doc += "  <meta name=`"theme-color`" content=`"#1e40af`">"
$doc += "  <meta name=`"color-scheme`" content=`"light`">"
$doc += "  <meta name=`"mobile-web-app-capable`" content=`"yes`">"
$doc += "  <meta name=`"application-name`" content=`"SIMPEL-KU`">"
$doc += "  <!-- PWA Manifest & App Icons -->"
$doc += "  <link rel=`"manifest`" href=`"manifest.json`">"
$doc += "  <link rel=`"icon`" type=`"image/png`" sizes=`"192x192`" href=`"img/icon-192.png`">"
$doc += "  <link rel=`"icon`" type=`"image/png`" sizes=`"32x32`" href=`"img/icon-192.png`">"
$doc += "  <!-- iOS Safari PWA Meta Tags -->"
$doc += "  <meta name=`"apple-mobile-web-app-capable`" content=`"yes`">"
$doc += "  <meta name=`"apple-mobile-web-app-status-bar-style`" content=`"default`">"
$doc += "  <meta name=`"apple-mobile-web-app-title`" content=`"SIMPEL-KU`">"
$doc += "  <link rel=`"apple-touch-icon`" href=`"img/apple-touch-icon.png`">"
$doc += "  <link rel=`"apple-touch-icon`" sizes=`"180x180`" href=`"img/apple-touch-icon.png`">"
$doc += "  <link rel=`"apple-touch-icon`" sizes=`"192x192`" href=`"img/icon-192.png`">"
$doc += "  <!-- Tailwind CSS CDN & Config -->"
$doc += "  <script src=`"https://cdn.tailwindcss.com`"></script>"
$doc += "  <script id=`"tailwind-config`">"
$doc += "    tailwind.config = {"
$doc += "      theme: {"
$doc += "        extend: {"
$doc += "          colors: {"
$doc += "            brand: { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa', 500: '#2563eb', 600: '#1d4ed8', 700: '#1e40af', 800: '#1e3a8a', 900: '#172554' },"
$doc += "            accent: { 50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 300: '#fdba74', 400: '#fb923c', 500: '#f97316', 600: '#ea580c', 700: '#c2410c', 800: '#9a3412', 900: '#7c2d12' }"
$doc += "          },"
$doc += '          fontFamily: { sans: [''"Plus Jakarta Sans"'', ''Inter'', ''system-ui'', ''sans-serif''] }'
$doc += "        }"
$doc += "      }"
$doc += "    };"
$doc += "  </script>"
$doc += "  <!-- FontAwesome CDN -->"
$doc += "  <link rel=`"stylesheet`" href=`"https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css`">"
$doc += "  <!-- Chart.js CDN -->"
$doc += "  <script src=`"https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js`"></script>"
$doc += "  <!-- Google Fonts: Plus Jakarta Sans -->"
$doc += "  <link rel=`"preconnect`" href=`"https://fonts.googleapis.com`">"
$doc += "  <link rel=`"preconnect`" href=`"https://fonts.gstatic.com`" crossorigin>"
$doc += "  <link href=`"https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap`" rel=`"stylesheet`">"
$doc += "  <style>"
$doc += $combinedCss
$doc += "  </style>"
$doc += "</head>"
$doc += "<body class=`"bg-slate-50 text-slate-800 font-sans antialiased min-h-screen`">"
$doc += ""
$doc += "  <!-- Global Modals & Overlays -->"
$doc += $modalsHtml
$doc += ""
$doc += "  <!-- Halaman Login -->"
$doc += $loginHtml
$doc += ""
$doc += "  <!-- Aplikasi Utama -->"
$doc += "  <div id=`"mainApp`" class=`"hidden min-h-screen flex`">"
$doc += "    <!-- Sidebar Navigation -->"
$doc += $sidebarHtml
$doc += ""
$doc += "    <!-- Content Area Wrapper -->"
$doc += "    <div id=`"contentWrapper`" class=`"flex-1 flex flex-col min-w-0 transition-all duration-300 md:ml-64`">"
$doc += "      <!-- Header Navbar -->"
$doc += $headerHtml
$doc += ""
$doc += "      <!-- Main Content Pages -->"
$doc += "      <main class=`"flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto space-y-6`">"
$doc += $combinedViews
$doc += "      </main>"
$doc += "    </div>"
$doc += "  </div>"
$doc += ""
$doc += "  <!-- Application Logic & Controllers -->"
$doc += "  <script>"
$doc += $combinedJs
$doc += "  </script>"
$doc += "</body>"
$doc += "</html>"

$masterHtml = $doc -join "`n"

$simpelkuB64Path = Join-Path $baseDir "img/logo_simpelku_b64.txt"
if (Test-Path $simpelkuB64Path) {
    $simpelkuB64 = (Get-Content $simpelkuB64Path -Raw -Encoding utf8).Trim()
    $masterHtml = $masterHtml.Replace('src="img/logo_simpelku.png"', "src=`"data:image/png;base64,$simpelkuB64`"")
}

$bpsB64Path = Join-Path $baseDir "img/logo_bps_b64.txt"
if (Test-Path $bpsB64Path) {
    $bpsB64 = (Get-Content $bpsB64Path -Raw -Encoding utf8).Trim()
    $masterHtml = $masterHtml.Replace('src="img/logo_BPS.png"', "src=`"data:image/png;base64,$bpsB64`"")
}

$indexHtmlPath = Join-Path $baseDir "index.html"
[System.IO.File]::WriteAllText($indexHtmlPath, $masterHtml, [System.Text.Encoding]::UTF8)
Write-Host "  [OK] index.html built successfully ($($masterHtml.Length) chars)"
Write-Host "BUILD SUCCESSFUL!"
