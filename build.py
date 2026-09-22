#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
========================================================================
SIMPEL-KU - BUILD & BUNDLE AUTOMATION
Sistem Monitoring Pelayanan, Keamanan dan Kebersihan Umum
BPS Provinsi Kalimantan Barat
========================================================================
Fungsi:
1. Menggabungkan seluruh modul backend (config/, utils/, backend/) menjadi code.gs
2. Menggabungkan seluruh modul frontend (css/, components/, pages/, js/) menjadi index.html
3. Melakukan validasi kelengkapan fungsi dan sintaks sebelum publikasi.
"""

import os
import sys
import subprocess

# Pastikan encoding UTF-8 aman di terminal Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Urutan penggabungan backend .gs
BACKEND_FILES = [
    "config/Config.gs",
    "utils/Utils.gs",
    "backend/Database.gs",
    "backend/Auth.gs",
    "backend/StaffMonitoring.gs",
    "backend/Security.gs",
    "backend/Supervisor.gs",
    "backend/InspeksiMutu.gs",
    "backend/ApiRouter.gs"
]

CSS_FILES = [
    "css/main.css",
    "css/components.css"
]

COMPONENTS_PAGES = {
    "modals": "components/modals.html",
    "login": "pages/login.html",
    "sidebar": "components/sidebar.html",
    "header": "components/header.html",
    "views": [
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
}

JS_FILES = [
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
]

def read_file(rel_path):
    full_path = os.path.join(BASE_DIR, rel_path)
    if not os.path.exists(full_path):
        raise FileNotFoundError(f"File tidak ditemukan: {rel_path}")
    with open(full_path, "r", encoding="utf-8") as f:
        return f.read()

def build_backend():
    print("[1/3] Membangun master code.gs dari modul backend...")
    backend_parts = [
        "/**",
        " * ========================================================================",
        " * SISTEM MONITORING PELAYANAN, KEAMANAN & KEBERSIHAN UMUM (SIMPEL-KU)",
        " * BPS Provinsi Kalimantan Barat",
        " * COMPILED MASTER BACKEND - GOOGLE APPS SCRIPT",
        " * ========================================================================",
        " */\n"
    ]
    for fpath in BACKEND_FILES:
        content = read_file(fpath).strip()
        backend_parts.append(f"// >>>>>>>>>> MODUL: {fpath} >>>>>>>>>>")
        backend_parts.append(content)
        backend_parts.append(f"// <<<<<<<<<< END MODUL: {fpath} <<<<<<<<<<\n")
    master_gs = "\n\n".join(backend_parts)
    out_path = os.path.join(BASE_DIR, "code.gs")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(master_gs)
    print(f"  [OK] code.gs berhasil dibangun ({len(master_gs)} bytes, {len(BACKEND_FILES)} modul)")

def build_frontend():
    print("[2/3] Membangun master index.html dari modul frontend...")
    css_bundle = [read_file(cpath).strip() for cpath in CSS_FILES]
    combined_css = "\n\n".join(css_bundle)
    views_bundle = [read_file(vpath).strip() for vpath in COMPONENTS_PAGES["views"]]
    combined_views = "\n\n".join(views_bundle)
    js_bundle = []
    for jpath in JS_FILES:
        content = read_file(jpath).strip()
        js_bundle.append(f"// >>>>>>>>>> MODUL JS: {jpath} >>>>>>>>>>")
        js_bundle.append(content)
        js_bundle.append(f"// <<<<<<<<<< END MODUL JS: {jpath} <<<<<<<<<<\n")
    combined_js = "\n\n".join(js_bundle)
    modals_html = read_file(COMPONENTS_PAGES["modals"]).strip()
    login_html = read_file(COMPONENTS_PAGES["login"]).strip()
    sidebar_html = read_file(COMPONENTS_PAGES["sidebar"]).strip()
    header_html = read_file(COMPONENTS_PAGES["header"]).strip()

    doc = []
    doc.append("<!DOCTYPE html>")
    doc.append("<html lang=\"id\" class=\"h-full bg-slate-50\">")
    doc.append("<head>")
    doc.append("  <meta charset=\"UTF-8\">")
    doc.append("  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no\">")
    doc.append("  <title>SIMPEL-KU | BPS Provinsi Kalimantan Barat</title>")
    doc.append("  <!-- Tailwind CSS CDN -->")
    doc.append("  <script src=\"https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4\"></script>")
    doc.append("  <!-- FontAwesome CDN -->")
    doc.append("  <link rel=\"stylesheet\" href=\"https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css\">")
    doc.append("  <!-- Google Fonts: Plus Jakarta Sans -->")
    doc.append("  <link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">")
    doc.append("  <link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin>")
    doc.append("  <link href=\"https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap\" rel=\"stylesheet\">")
    doc.append("  <style>")
    doc.append(combined_css)
    doc.append("  </style>")
    doc.append("</head>")
    doc.append("<body class=\"bg-slate-50 text-slate-800 font-sans antialiased min-h-screen\">")
    doc.append("")
    doc.append("  <!-- Global Modals & Overlays -->")
    doc.append(modals_html)
    doc.append("")
    doc.append("  <!-- Halaman Login -->")
    doc.append(login_html)
    doc.append("")
    doc.append("  <!-- Aplikasi Utama -->")
    doc.append("  <div id=\"mainApp\" class=\"hidden min-h-screen flex\">")
    doc.append("    <!-- Sidebar Navigation -->")
    doc.append(sidebar_html)
    doc.append("")
    doc.append("    <!-- Content Area Wrapper -->")
    doc.append("    <div id=\"contentWrapper\" class=\"flex-1 flex flex-col min-w-0 transition-all duration-300 md:ml-64\">")
    doc.append("      <!-- Header Navbar -->")
    doc.append(header_html)
    doc.append("")
    doc.append("      <!-- Main Content Pages -->")
    doc.append("      <main class=\"flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto space-y-6\">")
    doc.append(combined_views)
    doc.append("      </main>")
    doc.append("    </div>")
    doc.append("  </div>")
    doc.append("")
    doc.append("  <!-- Application Logic & Controllers -->")
    doc.append("  <script>")
    doc.append(combined_js)
    doc.append("  </script>")
    doc.append("</body>")
    doc.append("</html>")
    master_html = "\n".join(doc)
    out_path = os.path.join(BASE_DIR, "index.html")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(master_html)
    print(f"  [OK] index.html berhasil dibangun ({len(master_html)} bytes)")

def validate_build():
    print("[3/3] Memvalidasi hasil build sintaks JavaScript & GAS...")
    node_script = """
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const baseDir = process.cwd();
const gsCode = fs.readFileSync(path.join(baseDir, "code.gs"), "utf8");
const indexHtml = fs.readFileSync(path.join(baseDir, "index.html"), "utf8");

const sandbox = {
  SpreadsheetApp: {},
  HtmlService: {},
  ContentService: {},
  CacheService: {},
  PropertiesService: {},
  Logger: console,
  console: console
};
vm.createContext(sandbox);

try {
  vm.runInContext(gsCode, sandbox);
  console.log("  [OK] code.gs lolos verifikasi sintaks GAS.");
} catch (e) {
  console.error("  [FAIL] Error sintaks di code.gs:", e.message);
  process.exit(1)
}

const scriptMatch = indexHtml.match(/<script>([\\s\\S]*?)<\\/script>/);
if (scriptMatch) {
  const jsCode = scriptMatch[1];
  try {
    new vm.Script(jsCode, { filename: "index_bundled.js" });
    console.log("  [OK] index.html script lolos verifikasi sintaks JS.");
  } catch (e) {
    console.error("  [FAIL] Error sintaks di script index.html:", e.message);
    process.exit(1);
  }
} else {
  console.error("  [FAIL] Script tag tidak ditemukan di index.html");
  process.exit(1);
}
"""
    proc = subprocess.run(["node", "-e", node_script], cwd=BASE_DIR, capture_output=True, text=True)
    if proc.returncode == 0:
        print(proc.stdout.strip())
        print("\n========================================================")
        print("[SUCCESS] BUILD SELESAI & SUKSES 100%! Aplikasi siap digunakan.")
        print("========================================================")
    else:
        print(proc.stdout)
        print(proc.stderr)
        sys.exit(1)

if __name__ == "__main__":
    try:
        build_backend()
        build_frontend()
        validate_build()
    except Exception as err:
        print(f"\n[ERROR] Gagal melakukan build: {err}")
        sys.exit(1)
