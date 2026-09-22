/**
 * ========================================================================
 * SIMPEL-KU - CONFIGURATION MODULE (BACKEND)
 * Sistem Monitoring Pelayanan, Keamanan & Kebersihan Umum
 * BPS Provinsi Kalimantan Barat
 * ========================================================================
 */

// SPREADSHEET ID: Fallback jika tidak terikat ke container
var SPREADSHEET_ID = "1c2XUeoYFt_UEqJruBSciKPAIiPEdNoJvTO9epLWVTqs";
var SESSION_DURATION_SEC = 21600; // Durasi sesi login: 6 Jam
var CACHE_TTL_SEC = 60;           // Cache script data: 60 detik

// Nama-nama sheet standar dalam spreadsheet
var SHEET_NAMES = {
  USERS: 'Users',
  JADWAL_SECURITY: 'JadwalPiketSecurity',
  INSPEKSI_MUTU: 'InspeksiMutu'
};

// Mapping Bulan Bahasa Indonesia
var MONTH_MAP_ID = {
  'JANUARI': 1, 'PEBRUARI': 2, 'FEBRUARI': 2, 'MARET': 3,
  'APRIL': 4, 'MEI': 5, 'JUNI': 6, 'JULI': 7,
  'AGUSTUS': 8, 'SEPTEMBER': 9, 'OKTOBER': 10,
  'NOPEMBER': 11, 'NOVEMBER': 11, 'DESEMBER': 12
};

// Daftar kata kunci header yang diabaikan saat pencarian nama pegawai
var IGNORE_HEADER_WORDS = [
  'JADWAL', 'PIKET', 'PETUGAS', 'BULAN', 'TAHUN', 'SHIFT', 'PAGI', 'SIANG',
  'SORE', 'MALAM', 'LIBUR', 'HARI', 'TANGGAL', 'NO', 'NAMA', 'KEGIATAN',
  'RUANGAN', 'LOKASI', 'STANDAR', 'PELAYANAN', 'KEBERSIHAN', 'KEAMANAN',
  'REKAP', 'REKAPITULASI', 'TOTAL', 'JUMLAH', 'PERSEN', 'STATUS',
  'URAIAN', 'CHECKLIST', 'MONITORING', 'BPS', 'PROVINSI', 'KALIMANTAN', 'BARAT'
];

// Daftar baris kegiatan yang dilewati dalam sheet checklist
var SKIP_ROW_KEYWORDS = [
  'NO', 'RUANGAN', 'NAMA RUANGAN', 'KEGIATAN', 'URAIAN KEGIATAN',
  'JADWAL', 'BULAN', 'TAHUN', 'TANGGAL', 'HARI', 'SUB TOTAL', 'TOTAL',
  'PARAF', 'KETERANGAN', 'CHECKLIST', 'CATATAN', 'STANDAR'
];

// Role dan Kewenangan Akses
var ROLE_PERMISSIONS = {
  'Admin': { canManageUsers: true, canEditAllShifts: true, canViewAll: true, canInspect: true },
  'Supervisor': { canManageUsers: false, canEditAllShifts: true, canViewAll: true, canInspect: true },
  'Tim Umum dan Humas': { canManageUsers: false, canEditAllShifts: true, canViewAll: true, canInspect: true },
  'Koordinator Lapangan': { canManageUsers: false, canEditAllShifts: true, canViewAll: true, canInspect: true },
  'Petugas Kebersihan': { canManageUsers: false, canEditAllShifts: false, canViewAll: false, canInspect: false },
  'Petugas Pelayanan': { canManageUsers: false, canEditAllShifts: false, canViewAll: false, canInspect: false },
  'Petugas Keamanan': { canManageUsers: false, canEditAllShifts: false, canViewAll: false, canInspect: false }
};
