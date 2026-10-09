/**

 * ========================================================================

 * SISTEM MONITORING PELAYANAN, KEAMANAN & KEBERSIHAN UMUM (SIMPEL-KU)

 * BPS Provinsi Kalimantan Barat

 * COMPILED MASTER BACKEND - GOOGLE APPS SCRIPT

 * ========================================================================

 */


// >>>>>>>>>> MODUL: config/Config.gs >>>>>>>>>>

/**
 * ========================================================================
 * SIMPEL-KU - CONFIGURATION MODULE (BACKEND)
 * Sistem Monitoring Pelayanan, Keamanan & Kebersihan Umum
 * BPS Provinsi Kalimantan Barat
 * ========================================================================
 */

// SPREADSHEET ID: Fallback jika tidak terikat ke container
var SPREADSHEET_ID = "1c2XUeoYFt_UEqJruBSciKPAIiPEdNoJvTO9epLWVTqs";
// GOOGLE DRIVE ROOT FOLDER ID: Folder Induk Penyimpanan Bukti Dukung Foto
// URL Folder: https://drive.google.com/drive/folders/1WvFEHzdredv8wQEBRivNY9iDk5C6iktR?usp=sharing
var GOOGLE_DRIVE_ROOT_FOLDER_ID = "1WvFEHzdredv8wQEBRivNY9iDk5C6iktR";
// Nama Folder Cadangan (Fallback) jika Folder Eksternal belum dibagikan langsung ke email deployer:
var GOOGLE_DRIVE_FALLBACK_FOLDER_NAME = "[SIMPEL-KU] Bukti Dukung Foto";
var SESSION_DURATION_SEC = 21600; // Durasi sesi login: 6 Jam
var CACHE_TTL_SEC = 60;           // Cache script data: 60 detik

// Nama-nama sheet standar dalam spreadsheet
var SHEET_NAMES = {
  USERS: 'Users',
  JADWAL_SECURITY: 'JadwalPiketSecurity',
  INSPEKSI_MUTU: 'InspeksiMutu',
  BUKTI_DUKUNG: 'ValidasiDanBuktiDukung'
};

// Mapping Bulan Bahasa Indonesia
var MONTH_MAP_ID = {
  'JANUARI': 1, 'PEBRUARI': 2, 'FEBRUARI': 2, 'MARET': 3,
  'APRIL': 4, 'MEI': 5, 'JUNI': 6, 'JULI': 7,
  'AGUSTUS': 8, 'SEPTEMBER': 9, 'OKTOBER': 10,
  'NOPEMBER': 11, 'NOVEMBER': 11, 'DESEMBER': 12
};

// Array Nama Bulan Standar Bahasa Indonesia
var MONTH_NAMES_ID = [
  '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

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
  'Admin': { canManageUsers: true, canEditAllShifts: true, canViewAll: true, canInspect: true, canValidateChecklist: true },
  'Supervisor': { canManageUsers: false, canEditAllShifts: true, canViewAll: true, canInspect: true, canValidateChecklist: true },
  'Tim Umum dan Humas': { canManageUsers: false, canEditAllShifts: true, canViewAll: true, canInspect: true, canValidateChecklist: true },
  'Koordinator Lapangan': { canManageUsers: false, canEditAllShifts: true, canViewAll: true, canInspect: true, canValidateChecklist: true },
  'Petugas Kebersihan': { canManageUsers: false, canEditAllShifts: false, canViewAll: false, canInspect: false, canValidateChecklist: false },
  'Petugas Pelayanan': { canManageUsers: false, canEditAllShifts: false, canViewAll: false, canInspect: false, canValidateChecklist: false },
  'Petugas Keamanan': { canManageUsers: false, canEditAllShifts: false, canViewAll: false, canInspect: false, canValidateChecklist: false }
};

// <<<<<<<<<< END MODUL: config/Config.gs <<<<<<<<<<


// >>>>>>>>>> MODUL: utils/Utils.gs >>>>>>>>>>

/**
 * ========================================================================
 * SIMPEL-KU - UTILITIES MODULE (BACKEND)
 * ========================================================================
 */

/**
 * Normalisasi string nama (menghapus gelar/nomor urut/tanda baca)
 */
function normalizeName(s) {
  if (!s) return '';
  return String(s)
    .toLowerCase()
    .replace(/^(bpk|bapak|ibu|pak|bu|sdr|sdri|danru|anggota|petugas|satpam|security)[\.\s]+/gi, '')
    .replace(/^[0-9]+[\.\-\s\)\/]+/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/[\.\,\-\_\/\:\;\*\#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getAlphaOnly(s) {
  return normalizeName(s).replace(/[^a-z0-9]/g, '');
}

function cleanPass(p) {
  if (p === null || p === undefined) return '';
  return String(p).replace(/[\r\n\u00a0\u200b\t]/g, '').trim();
}

function cleanStr(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[\r\n\u00a0\u200b\t]/g, ' ').trim();
}

function isUserAliasMatch(inputAlpha, targetAlpha) {
  if (!inputAlpha || !targetAlpha) return false;
  if (inputAlpha === targetAlpha) return true;
  
  var aliases = {
    'syreza': ['syarif', 'reza', 'syarifreza', 'syarifrezanopriadrianalkadri', 'syarifrezanopriadrian', 'syarifrezaalkadri', 'nopriadrian', 'kadri', 'syarifrezanopriadrianalkadrial'],
    'syarifreza': ['syreza', 'syarif', 'reza', 'syarifrezanopriadrianalkadri', 'kadri', 'nopriadrian'],
    'syarifrezanopriadrianalkadri': ['syreza', 'syarifreza', 'syarif', 'reza', 'kadri', 'nopriadrian'],
    'reza': ['syreza', 'syarifreza', 'syarifrezanopriadrianalkadri', 'syarif'],
    'syarif': ['syreza', 'syarifreza', 'syarifrezanopriadrianalkadri', 'reza'],
    'nopriadrian': ['syreza', 'syarifreza', 'syarifrezanopriadrianalkadri', 'reza'],
    'kadri': ['syreza', 'syarifreza', 'syarifrezanopriadrianalkadri', 'reza'],
    'nurramadhanial': ['dede', 'nurramadhani', 'ramadhanial', 'dedenurramadhanial'],
    'dede': ['nurramadhanial', 'nurramadhani', 'ramadhanial'],
    'muhammadsyukri': ['msyukri', 'syukri', 'muhsyukri', 'syukrimuhammad'],
    'msyukri': ['muhammadsyukri', 'syukri', 'muhsyukri'],
    'syukri': ['muhammadsyukri', 'msyukri', 'muhsyukri'],
    'alfianaayuni': ['fifi', 'alfiana', 'ayuni', 'fifialfiana'],
    'fifi': ['alfianaayuni', 'alfiana', 'ayuni'],
    'ranianailahusna': ['rania', 'naila', 'husna'],
    'rania': ['ranianailahusna', 'naila', 'husna'],
    'slametriyadi': ['slamet', 'riyadi'],
    'slamet': ['slametriyadi', 'riyadi'],
    'yunijuniarti': ['yuni', 'juniarti'],
    'yuni': ['yunijuniarti', 'juniarti'],
    'agustetriansyah': ['agus', 'tetriansyah', 'aira'],
    'agus': ['agustetriansyah', 'tetriansyah'],
    'eddysuryadi': ['eddy', 'suryadi', 'edi'],
    'eddy': ['eddysuryadi', 'suryadi', 'edi'],
    'ekoprasetyo': ['eko', 'prasetyo'],
    'eko': ['ekoprasetyo', 'prasetyo'],
    'feriyustami': ['feri', 'yustami', 'ferry'],
    'feri': ['feriyustami', 'yustami', 'ferry'],
    'rizkifadil': ['rizki', 'fadil', 'kiki'],
    'rizki': ['rizkifadil', 'fadil', 'kiki'],
    'mawardi': ['ardi', 'mawardiardi'],
    'ardi': ['mawardi', 'mawardiardi'],
    'ramadhan': ['rama', 'ramadhani'],
    'rama': ['ramadhan', 'ramadhani']
  };

  if (aliases[inputAlpha] && aliases[inputAlpha].indexOf(targetAlpha) >= 0) return true;
  if (aliases[targetAlpha] && aliases[targetAlpha].indexOf(inputAlpha) >= 0) return true;
  return false;
}

function calculateMatchScore(cellVal, user) {
  if (!cellVal) return 0;

  var rawClean = cleanStr(cellVal);
  if (!rawClean) return 0;

  var upper = rawClean.toUpperCase();
  // Filter baris header umum secara aman tanpa menyaring nama orang yang panjang
  var headerPhrases = [
    'JADWAL PIKET', 'BPS PROVINSI', 'KEAMANAN KANTOR', 'REKAPITULASI',
    'SUB TOTAL', 'SELAMA JAM KERJA', 'SHIFT PAGI', 'SHIFT SORE', 'SHIFT MALAM', 'CHECKLIST MONITORING'
  ];
  for (var h = 0; h < headerPhrases.length; h++) {
    if (upper.indexOf(headerPhrases[h]) >= 0) return 0;
  }

  var cellNorm = normalizeName(rawClean);
  var cellAlpha = getAlphaOnly(rawClean);
  if (!cellAlpha || cellAlpha.length < 2) return 0;

  var userFull = normalizeName(user.namaPegawai);
  var userFullAlpha = getAlphaOnly(user.namaPegawai);
  var usernameAlpha = getAlphaOnly(user.username);
  var sheetAlpha = getAlphaOnly(user.namaSheet);

  // 1. Exact Alpha Match
  if (userFullAlpha && cellAlpha === userFullAlpha) return 100;
  if (usernameAlpha && cellAlpha === usernameAlpha) return 98;
  if (sheetAlpha && cellAlpha === sheetAlpha) return 96;

  // 2. Alias Match
  if ((userFullAlpha && isUserAliasMatch(cellAlpha, userFullAlpha)) ||
      (usernameAlpha && isUserAliasMatch(cellAlpha, usernameAlpha)) ||
      (sheetAlpha && isUserAliasMatch(cellAlpha, sheetAlpha))) {
    return 95;
  }

  // 3. Substring & Containment Match
  if ((usernameAlpha && usernameAlpha.length >= 4 && (usernameAlpha.indexOf(cellAlpha) >= 0 || cellAlpha.indexOf(usernameAlpha) >= 0)) ||
      (userFullAlpha && userFullAlpha.length >= 4 && (userFullAlpha.indexOf(cellAlpha) >= 0 || cellAlpha.indexOf(userFullAlpha) >= 0)) ||
      (sheetAlpha && sheetAlpha.length >= 4 && (sheetAlpha.indexOf(cellAlpha) >= 0 || cellAlpha.indexOf(sheetAlpha) >= 0))) {
    return 92;
  }

  // 4. Token & Prefix Matching (panjang token minimal 2 untuk menangani prefix seperti 'sy', 'al', 'm')
  var userTokens = userFull.split(' ').filter(function(t) { return t.length >= 2; });
  if (usernameAlpha && usernameAlpha.length >= 3 && userTokens.indexOf(usernameAlpha) === -1) {
    userTokens.push(usernameAlpha);
  }
  if (sheetAlpha && sheetAlpha.length >= 3 && userTokens.indexOf(sheetAlpha) === -1) {
    userTokens.push(sheetAlpha);
  }

  var cellTokens = cellNorm.split(' ').filter(function(t) { return t.length >= 2; });
  var matchCount = 0;

  for (var i = 0; i < cellTokens.length; i++) {
    var cTok = cellTokens[i];
    var cTokAlpha = getAlphaOnly(cTok);
    for (var j = 0; j < userTokens.length; j++) {
      var uTok = userTokens[j];
      var uTokAlpha = getAlphaOnly(uTok);
      if (cTok === uTok || isUserAliasMatch(cTokAlpha, uTokAlpha)) {
        matchCount++;
        break;
      } else if (uTokAlpha.length >= 3 && cTokAlpha.length >= 3 && (cTokAlpha.indexOf(uTokAlpha) === 0 || uTokAlpha.indexOf(cTokAlpha) === 0)) {
        matchCount++;
        break;
      }
    }
  }

  if (matchCount >= 2) return 90;
  if (matchCount === 1) return 88;

  // 5. Singkatan / Inisial Gabungan (misal: 'syreza' untuk 'syarif reza')
  var testAbbr = usernameAlpha || userFullAlpha;
  if (testAbbr && cellTokens.length >= 2) {
    var firstLetters = '';
    for (var k = 0; k < cellTokens.length; k++) {
      firstLetters += cellTokens[k].charAt(0);
    }
    if (firstLetters.length >= 2 && (testAbbr.indexOf(firstLetters) === 0 || firstLetters.indexOf(testAbbr) === 0)) {
      return 86;
    }
  }

  return 0;
}

/**
 * Memeriksa apakah suatu tugas checklist keamanan sesuai dengan kode shift tertentu.
 * Aturan Shift:
 *   'P' = Pagi (06.00 - 16.00 WIB): Meliputi tugas PAGI (06.00-07.30) dan SELAMA JAM KERJA (07.30-16.00)
 *   'S' = Sore (15.30 - 23.30 WIB): Meliputi tugas SORE dan MALAM (penutupan kantor/patroli)
 *   'M' = Malam (23.00 - 07.30 WIB): Meliputi tugas MALAM (23.00-07.30)
 *   'O' = Libur (Bebas Tugas): Tidak ada tugas
 */
function isKeamananTaskForShift(t, kodeShift) {
  if (!kodeShift || kodeShift === 'O') return false;
  var combined = (String((t && t.ruangan) || '') + ' ' + String((t && t.kegiatan) || '') + ' ' + String((t && t.item) || '')).toUpperCase();

  var hasPagi = combined.indexOf('PAGI') >= 0 || combined.indexOf('JAM KERJA') >= 0 || combined.indexOf('SIANG') >= 0 || combined.indexOf('SHIFT P') >= 0;
  var hasSore = combined.indexOf('SORE') >= 0 || combined.indexOf('SHIFT S') >= 0;
  var hasMalam = combined.indexOf('MALAM') >= 0 || combined.indexOf('SHIFT M') >= 0;

  // Jika tugas umum yang tidak memiliki penanda shift spesifik sama sekali, berlaku untuk semua shift aktif (P, S, M)
  if (!hasPagi && !hasSore && !hasMalam) {
    return true;
  }

  if (kodeShift === 'P') {
    // Shift Pagi: hanya tugas pagi/jam kerja, tidak tugas malam atau sore
    if (hasMalam || hasSore) return false;
    return hasPagi;
  } else if (kodeShift === 'S') {
    // Shift Sore: tugas sore atau malam, tidak tugas pagi
    if (hasPagi) return false;
    return hasSore || hasMalam;
  } else if (kodeShift === 'M') {
    // Shift Malam: tugas malam, tidak tugas pagi
    if (hasPagi) return false;
    return hasMalam;
  }

  return false;
}

// <<<<<<<<<< END MODUL: utils/Utils.gs <<<<<<<<<<


// >>>>>>>>>> MODUL: backend/Database.gs >>>>>>>>>>

/**
 * ========================================================================
 * SIMPEL-KU - DATABASE & SHEET ACCESS MODULE
 * ========================================================================
 */

function getDb() {
  if (_cachedDb) return _cachedDb;

  try {
    _cachedDb = SpreadsheetApp.getActiveSpreadsheet();
    if (_cachedDb) return _cachedDb;
  } catch (e) { /* ignore */ }

  try {
    if (typeof SPREADSHEET_ID !== 'undefined' && SPREADSHEET_ID && SPREADSHEET_ID !== "MASUKKAN_SPREADSHEET_ID_ANDA_DI_SINI") {
      _cachedDb = SpreadsheetApp.openById(SPREADSHEET_ID);
      return _cachedDb;
    }
  } catch (e) { /* ignore */ }

  return null;
}

var _cachedDb = null;
var _cachedSheetsList = null;
var _cachedSheetsMap = null;
var _cachedUserList = null;
var _cachedParsedMonitoring = {};
var _cachedJadwalRawValues = null;
var _cachedJadwalDispValues = null;
var _cachedJadwalGrid = {};

function resetMemoryCache() {
  _cachedSheetsList = null;
  _cachedSheetsMap = null;
  _cachedUserList = null;
  _cachedParsedMonitoring = {};
  _cachedJadwalRawValues = null;
  _cachedJadwalDispValues = null;
  _cachedJadwalGrid = {};
}

function getCachedSheets(ss) {
  if (_cachedSheetsList && _cachedSheetsMap) {
    return { list: _cachedSheetsList, map: _cachedSheetsMap };
  }
  if (!ss) ss = getDb();
  if (!ss) return { list: [], map: {} };

  _cachedSheetsList = ss.getSheets();
  _cachedSheetsMap = {};
  for (var i = 0; i < _cachedSheetsList.length; i++) {
    var sh = _cachedSheetsList[i];
    var raw = sh.getName();
    _cachedSheetsMap[raw] = sh;
    _cachedSheetsMap[raw.toLowerCase()] = sh;
    _cachedSheetsMap[getAlphaOnly(raw)] = sh;
  }
  return { list: _cachedSheetsList, map: _cachedSheetsMap };
}

function getScriptCacheData(key) {
  try {
    var c = CacheService.getScriptCache();
    var val = c.get(key);
    if (val) return JSON.parse(val);
  } catch (e) { /* ignore */ }
  return null;
}

function putScriptCacheData(key, data, ttlSeconds) {
  try {
    var c = CacheService.getScriptCache();
    var str = JSON.stringify(data);
    if (str.length < 95000) {
      c.put(key, str, ttlSeconds || 120);
    }
  } catch (e) { /* ignore */ }
}

function clearScriptCacheKeys(keys) {
  try {
    var c = CacheService.getScriptCache();
    if (keys && keys.length) {
      c.removeAll(keys);
    }
  } catch (e) { /* ignore */ }
}

/**
 * Mencari Sheet secara fleksibel (toleran spasi, huruf besar/kecil, dan alias nama)
 */
function findSheet(ss, sheetName) {
  if (!ss || !sheetName) return null;
  var sName = String(sheetName).trim();
  var sNameLower = sName.toLowerCase();
  var sNameAlpha = getAlphaOnly(sName);

  var cs = getCachedSheets(ss);
  if (cs.map[sName]) return cs.map[sName];
  if (cs.map[sNameLower]) return cs.map[sNameLower];
  if (sNameAlpha && cs.map[sNameAlpha]) return cs.map[sNameAlpha];

  var sNameUpper = sName.toUpperCase();
  var aliases = [sName];
  if (sNameUpper === 'USERS' || sNameUpper === 'USER') {
    aliases = ['Users', 'users', 'User', 'user', 'Pengguna', 'Data Users', 'Data User', 'Daftar User', 'Akun', 'Login'];
  } else if (sNameUpper.includes('JADWAL') || sNameUpper.includes('SECURITY') || sNameUpper.includes('KEAMANAN') || sNameUpper.includes('SATPAM')) {
    aliases = [
      'JadwalPiketSecurity', 'Jadwal Piket Security', 'JadwalPiket', 'Jadwal Piket',
      'Jadwal Keamanan', 'Jadwal Piket Keamanan', 'Jadwal Security', 'Jadwal Satpam',
      'Piket Keamanan', 'Piket Security', 'Jadwal_Piket', 'Jadwal_Piket_Security',
      'Security', 'Keamanan', 'Jadwal'
    ];
  } else if (sNameUpper.includes('INSPEKSI') || sNameUpper.includes('MUTU')) {
    aliases = ['InspeksiMutu', 'Inspeksi Mutu', 'Log Inspeksi Mutu', 'Data Inspeksi Mutu', 'Inspeksi'];
  }

  for (var a = 0; a < aliases.length; a++) {
    var al = aliases[a];
    if (cs.map[al]) return cs.map[al];
    if (cs.map[al.toLowerCase()]) return cs.map[al.toLowerCase()];
    var alAlpha = getAlphaOnly(al);
    if (alAlpha && cs.map[alAlpha]) return cs.map[alAlpha];
  }

  // Exact alpha match in list
  for (var i = 0; i < cs.list.length; i++) {
    var shNorm = getAlphaOnly(cs.list[i].getName());
    if (shNorm === sNameAlpha) return cs.list[i];
  }

  // Substring match
  if (sNameAlpha && sNameAlpha.length >= 4) {
    for (var i = 0; i < cs.list.length; i++) {
      var shNorm = getAlphaOnly(cs.list[i].getName());
      if (shNorm && (shNorm.indexOf(sNameAlpha) >= 0 || sNameAlpha.indexOf(shNorm) >= 0)) {
        return cs.list[i];
      }
    }
  }

  return null;
}

function findJadwalSheet(ss) {
  if (!ss) ss = getDb();
  if (!ss) return null;

  var sh = findSheet(ss, "JadwalPiketSecurity");
  if (sh) return sh;

  var cs = getCachedSheets(ss);
  for (var i = 0; i < cs.list.length; i++) {
    var nameUpper = cs.list[i].getName().toUpperCase();
    if (nameUpper.includes('JADWAL') || nameUpper.includes('SECURITY') || nameUpper.includes('KEAMANAN') || nameUpper.includes('SATPAM')) {
      return cs.list[i];
    }
  }
  return null;
}

function findEmployeeSheet(ss, namaSheet, namaPegawai, username) {
  if (!ss) return null;
  if (namaSheet) {
    var sh = findSheet(ss, namaSheet);
    if (sh) return sh;
  }
  if (namaPegawai) {
    var sh = findSheet(ss, namaPegawai);
    if (sh) return sh;
  }
  if (username) {
    var sh = findSheet(ss, username);
    if (sh) return sh;
  }

  var cs = getCachedSheets(ss);
  var uAlpha = getAlphaOnly(username || '');
  var pAlpha = getAlphaOnly(namaPegawai || '');
  var sAlpha = getAlphaOnly(namaSheet || '');

  for (var i = 0; i < cs.list.length; i++) {
    var sNameNorm = getAlphaOnly(cs.list[i].getName());
    if (!sNameNorm) continue;
    if (sNameNorm === uAlpha || sNameNorm === pAlpha || sNameNorm === sAlpha) return cs.list[i];
    if (isUserAliasMatch(sNameNorm, uAlpha) || isUserAliasMatch(sNameNorm, pAlpha) || isUserAliasMatch(sNameNorm, sAlpha)) {
      return cs.list[i];
    }
  }

  if (namaPegawai) {
    var tokens = normalizeName(namaPegawai).split(/\s+/).filter(function(t) { return t.length >= 3; });
    for (var i = 0; i < cs.list.length; i++) {
      var sNameNorm = getAlphaOnly(cs.list[i].getName());
      for (var t = 0; t < tokens.length; t++) {
        var tokNorm = getAlphaOnly(tokens[t]);
        if (tokNorm.length >= 3 && sNameNorm.indexOf(tokNorm) >= 0) {
          return cs.list[i];
        }
      }
    }
  }
  return null;
}

// <<<<<<<<<< END MODUL: backend/Database.gs <<<<<<<<<<


// >>>>>>>>>> MODUL: backend/Auth.gs >>>>>>>>>>

/**
 * ========================================================================
 * SIMPEL-KU - AUTHENTICATION & USER MANAGEMENT MODULE
 * ========================================================================
 */

function getSheetJenis(sheet, matchedUser, ss) {
  if (matchedUser) {
    const rawUser = String(matchedUser.username || '').toLowerCase();
    const rawNama = String(matchedUser.namaPegawai || '').toLowerCase();
    const userAlpha = getAlphaOnly(rawUser || rawNama);

    // 1. Definitif Kebersihan
    const kebersihanNames = [
      'yuni juniarti', 'yuni', 'yunijuniarti',
      'slamet riyadi', 'slamet', 'slametriyadi',
      'nurramadhanial', 'dede',
      'muhammad syukri', 'm syukri', 'syukri', 'msyukri',
      'ramadhan', 'rama'
    ];
    for (let k = 0; k < kebersihanNames.length; k++) {
      if (userAlpha === getAlphaOnly(kebersihanNames[k])) {
        return 'PIKET KEBERSIHAN KANTOR';
      }
    }

    // 2. Definitif Pelayanan / Resepsionis
    const pelayananNames = [
      'mawardi', 'ardi',
      'rania naila husna', 'rania', 'ranianailahusna',
      'alfiana ayuni', 'alfiana', 'alfianaayuni'
    ];
    for (let k = 0; k < pelayananNames.length; k++) {
      if (userAlpha === getAlphaOnly(pelayananNames[k])) {
        return 'RESEPSIONIS';
      }
    }

    // 3. Definitif Keamanan
    const securityNames = [
      'eddy suryadi', 'eddy', 'syarif reza nopriadrian al kadri', 'syarif reza', 'sy reza', 'syreza', 'reza',
      'feri yustami', 'feri', 'rizki fadil', 'rizki', 'eko prasetyo', 'eko', 'agus tetriansyah', 'agus'
    ];
    for (let k = 0; k < securityNames.length; k++) {
      if (userAlpha === getAlphaOnly(securityNames[k])) {
        return 'KEAMANAN KANTOR';
      }
    }
  }

  if (sheet) {
    try {
      const sName = sheet.getName();
      const sNameUpper = String(sName || '').toUpperCase();
      const isJadwalOrUsers = sNameUpper.includes('USERS') || sNameUpper.includes('JADWAL') || sNameUpper.includes('INSPEKSI');

      if (!isJadwalOrUsers) {
        const maxCols = Math.min(sheet.getMaxColumns(), 15);
        const maxRows = Math.min(sheet.getMaxRows(), 10);
        const vals = sheet.getRange(1, 1, maxRows, maxCols).getValues();

        for (let r = 0; r < vals.length; r++) {
          for (let c = 0; c < vals[r].length; c++) {
            const v = String(vals[r][c] || '').toUpperCase().trim();
            if (v.includes('RESEPSIONIS') || v.includes('PELAYANAN') || v.includes('PST') || v.includes('STANDAR PELAYANAN')) {
              return 'RESEPSIONIS';
            }
            if (v.includes('KEBERSIHAN') || v.includes('KEBERSIHAN KANTOR')) {
              return 'PIKET KEBERSIHAN KANTOR';
            }
            if (v.includes('KEAMANAN') || v.includes('SECURITY')) {
              return 'KEAMANAN KANTOR';
            }
          }
        }

        if (sNameUpper.includes('RESEPSIONIS') || sNameUpper.includes('PELAYANAN') || sNameUpper.includes('PST')) return 'RESEPSIONIS';
        if (sNameUpper.includes('KEBERSIHAN')) return 'PIKET KEBERSIHAN KANTOR';
        if (sNameUpper.includes('KEAMANAN') || sNameUpper.includes('SECURITY')) return 'KEAMANAN KANTOR';

        return 'PIKET KEBERSIHAN KANTOR';
      }
    } catch (e) { /* ignore */ }
  }

  if (matchedUser && ss && !sheet) {
    try {
      const jadwalSheet = findJadwalSheet(ss);
      if (jadwalSheet) {
        const jVals = jadwalSheet.getDataRange().getValues();
        const rowInJadwal = findEmployeeRowInJadwal(jVals, matchedUser, 0);
        if (rowInJadwal !== -1) {
          return 'KEAMANAN KANTOR';
        }
      }
    } catch (e) { /* ignore */ }
  }

  return 'PIKET KEBERSIHAN KANTOR';
}

function determineUnit(jenis, role, customUnit) {
  if (customUnit) {
    const cu = String(customUnit).trim().toLowerCase();
    if (cu.includes('kebersihan')) return 'Kebersihan';
    if (cu.includes('pelayanan') || cu.includes('resepsionis')) return 'Pelayanan';
    if (cu.includes('keamanan') || cu.includes('security') || cu.includes('satpam')) return 'Keamanan';
    if (cu.includes('manajemen') || cu.includes('pimpinan') || cu.includes('tu') || cu.includes('umum')) return 'Manajemen';
  }

  const rUpper = String(role || '').toUpperCase();
  if (rUpper.includes('ADMIN') || rUpper.includes('SUPERVISOR') || rUpper.includes('KABAG') || rUpper.includes('MANAJEMEN')) return 'Manajemen';
  if (rUpper.includes('HUMAS') || rUpper.includes('KORLAP')) return 'Umum';
  if (rUpper.includes('RESEPSIONIS') || rUpper.includes('PELAYANAN')) return 'Pelayanan';
  if (rUpper.includes('KEAMANAN') || rUpper.includes('SECURITY') || rUpper.includes('SATPAM')) return 'Keamanan';
  if (rUpper.includes('KEBERSIHAN')) return 'Kebersihan';

  const jUpper = String(jenis || '').toUpperCase();
  if (jUpper.includes('RESEPSIONIS') || jUpper.includes('PELAYANAN')) return 'Pelayanan';
  if (jUpper.includes('KEAMANAN') || jUpper.includes('SECURITY')) return 'Keamanan';
  if (jUpper.includes('KEBERSIHAN')) return 'Kebersihan';

  return 'Kebersihan';
}

/**
 * Autentikasi Pengguna & Sesi Berbasis Spreadsheet
 */
function login(username, password) {
  try {
    if (!username || !password) {
      return { success: false, message: "Username dan Password wajib diisi." };
    }

    const ss = getDb();
    if (!ss) {
      return { success: false, message: "Koneksi database spreadsheet gagal. Pastikan SPREADSHEET_ID valid." };
    }

    const userSheet = findSheet(ss, "Users");
    if (!userSheet) {
      return { success: false, message: "Sheet 'Users' tidak ditemukan pada spreadsheet." };
    }

    const rawValues = userSheet.getDataRange().getValues();
    if (rawValues.length < 2) {
      return { success: false, message: "Sheet 'Users' belum memiliki data akun." };
    }

    const inputUserNorm = normalizeName(username);
    const inputUserAlpha = getAlphaOnly(username);
    const inputPassClean = cleanPass(password);

    let colUser = 0, colNama = 1, colSheet = 2, colPass = 3, colRole = -1, colUnit = -1, colNip = -1;
    let headerRowIdx = 0;

    for (let r = 0; r < Math.min(5, rawValues.length); r++) {
      const row = rawValues[r];
      for (let c = 0; c < row.length; c++) {
        const h = cleanStr(row[c]).toLowerCase();
        if (h.includes('sheet')) colSheet = c;
        else if (h.includes('user')) colUser = c;
        else if (h.includes('nama') || h.includes('pegawai')) colNama = c;
        else if (h.includes('pass') || h === 'password' || h.includes('sandi')) colPass = c;
        else if (h.includes('role') || h.includes('jabatan')) colRole = c;
        else if (h.includes('unit') || h.includes('kategori')) colUnit = c;
        else if (h.includes('nip') || h.includes('id')) colNip = c;
      }
      if (colUser !== -1 && colPass !== -1) {
        headerRowIdx = r;
        break;
      }
    }

    let matchedUser = null;
    for (let i = headerRowIdx + 1; i < rawValues.length; i++) {
      const row = rawValues[i];
      const rowUser = cleanStr(row[colUser]);
      const rowNama = cleanStr(row[colNama]);
      const rowSheet = cleanStr(row[colSheet]);
      const rowPass = cleanPass(row[colPass]);
      const rowRole = colRole !== -1 ? cleanStr(row[colRole]) : '';
      const rowUnit = colUnit !== -1 ? cleanStr(row[colUnit]) : '';
      const rowNip = colNip !== -1 ? cleanStr(row[colNip]) : '';

      if (!rowUser && !rowNama) continue;

      const rowUserAlpha = getAlphaOnly(rowUser);
      const rowNamaAlpha = getAlphaOnly(rowNama);

      const isMatchUser = (
        inputUserAlpha === rowUserAlpha ||
        inputUserAlpha === rowNamaAlpha ||
        isUserAliasMatch(inputUserAlpha, rowUserAlpha) ||
        isUserAliasMatch(inputUserAlpha, rowNamaAlpha)
      );

      if (isMatchUser && inputPassClean === rowPass) {
        matchedUser = {
          username: rowUser || rowNama,
          namaPegawai: rowNama || rowUser,
          namaSheet: rowSheet || rowUser,
          role: rowRole,
          unit: rowUnit,
          nip: rowNip
        };
        break;
      }
    }

    if (!matchedUser) {
      return { success: false, message: "Username atau Password salah. Pastikan kredensial sesuai dengan sheet 'Users'." };
    }

    let targetSheet = findEmployeeSheet(ss, matchedUser.namaSheet, matchedUser.namaPegawai, matchedUser.username);
    let actualSheetName = targetSheet ? targetSheet.getName() : (matchedUser.namaSheet || matchedUser.namaPegawai);
    let jenisSheet = getSheetJenis(targetSheet, matchedUser, ss);

    let detectedRole = matchedUser.role;
    const uLower = matchedUser.username.toLowerCase();
    const nLower = matchedUser.namaPegawai.toLowerCase();
    const rLower = (matchedUser.role || '').toLowerCase();

    if (rLower.includes('admin') || uLower === 'admin' || uLower.includes('admin') || nLower.includes('admin')) {
      detectedRole = 'Admin';
    } else if (rLower.includes('supervisor') || uLower === 'supervisor' || uLower.includes('supervisor') || uLower.includes('kabag') || uLower.includes('kasubbag') || nLower.includes('kabag') || nLower.includes('kasubbag')) {
      detectedRole = 'Supervisor';
    } else if (rLower.includes('humas') || uLower.includes('humas') || nLower.includes('humas') || uLower.includes('timumum')) {
      detectedRole = 'Tim Umum dan Humas';
    } else if (rLower.includes('korlap') || uLower.includes('korlap') || nLower.includes('korlap') || nLower.includes('koordinator')) {
      detectedRole = 'Koordinator Lapangan';
    } else if (rLower.includes('keamanan') || rLower.includes('satpam') || rLower.includes('security') || jenisSheet === 'KEAMANAN KANTOR') {
      detectedRole = 'Petugas Keamanan';
    } else if (rLower.includes('resepsionis') || rLower.includes('pelayanan') || jenisSheet === 'RESEPSIONIS') {
      detectedRole = 'Petugas Pelayanan';
    } else {
      detectedRole = 'Petugas Kebersihan';
    }

    const detectedUnit = determineUnit(jenisSheet, detectedRole, matchedUser.unit);

    const token = Utilities.getUuid();
    const cache = CacheService.getScriptCache();

    const sessionPayload = {
      username: matchedUser.username,
      namaPegawai: matchedUser.namaPegawai,
      namaSheet: actualSheetName,
      jenis: jenisSheet,
      role: detectedRole,
      unit: detectedUnit,
      nip: matchedUser.nip || '',
      loginTime: new Date().toISOString()
    };

    const sessDuration = (typeof SESSION_DURATION_SEC !== 'undefined' && SESSION_DURATION_SEC) ? SESSION_DURATION_SEC : 21600;
    cache.put(token, JSON.stringify(sessionPayload), sessDuration);

    return {
      success: true,
      token: token,
      user: {
        username: matchedUser.username,
        namaPegawai: matchedUser.namaPegawai,
        jenis: jenisSheet,
        role: detectedRole,
        unit: detectedUnit,
        nip: matchedUser.nip || ''
      }
    };

  } catch (err) {
    return { success: false, message: "Terjadi kesalahan server: " + err.message };
  }
}

function getSessionUser(token) {
  if (!token) return null;
  const cache = CacheService.getScriptCache();
  const raw = cache.get(token);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function changeCredentials(token, oldPassword, newUsername, newPassword) {
  try {
    const session = getSessionUser(token);
    if (!session) {
      return { success: false, message: "Sesi telah berakhir atau tidak valid. Silakan login kembali." };
    }

    if (!oldPassword) {
      return { success: false, message: "Password saat ini wajib diisi untuk verifikasi keamanan." };
    }

    const cleanOldPass = cleanPass(oldPassword);
    const cleanNewUser = newUsername ? cleanStr(newUsername) : '';
    const cleanNewPass = newPassword ? cleanPass(newPassword) : '';

    if (!cleanNewUser && !cleanNewPass) {
      return { success: false, message: "Harap masukkan username baru atau password baru yang ingin diubah." };
    }

    if (cleanNewUser && cleanNewUser.length < 3) {
      return { success: false, message: "Username baru minimal harus terdiri dari 3 karakter." };
    }

    if (cleanNewPass && cleanNewPass.length < 4) {
      return { success: false, message: "Password baru minimal harus terdiri dari 4 karakter." };
    }

    const ss = getDb();
    if (!ss) {
      return { success: false, message: "Koneksi database spreadsheet gagal." };
    }

    const userSheet = findSheet(ss, "Users");
    if (!userSheet) {
      return { success: false, message: "Sheet 'Users' tidak ditemukan pada spreadsheet." };
    }

    const rawValues = userSheet.getDataRange().getValues();
    const displayValues = userSheet.getDataRange().getDisplayValues();
    if (rawValues.length < 2) {
      return { success: false, message: "Data pengguna kosong." };
    }

    // Temukan baris header dan indeks kolom secara dinamis
    let colUser = 0, colNama = 1, colSheet = 2, colPass = 3;
    let headerRowIdx = 0;

    for (let r = 0; r < Math.min(5, rawValues.length); r++) {
      const row = rawValues[r];
      for (let c = 0; c < row.length; c++) {
        const h = cleanStr(row[c]).toLowerCase();
        if (h.includes('sheet')) colSheet = c;
        else if (h.includes('user')) colUser = c;
        else if (h.includes('nama') || h.includes('pegawai')) colNama = c;
        else if (h.includes('password') || h.includes('pass') || h.includes('sandi')) colPass = c;
      }
      if (cleanStr(row[colUser]).toLowerCase().includes('user') || cleanStr(row[colPass]).toLowerCase().includes('pass')) {
        headerRowIdx = r;
        break;
      }
    }

    // Pastikan header kolom log timestamp ada jika belum ada
    if (rawValues[headerRowIdx].length < 5 || !rawValues[headerRowIdx][4]) {
      userSheet.getRange(headerRowIdx + 1, 5).setValue("Terakhir Ganti Kredensial");
      userSheet.getRange(headerRowIdx + 1, 5)
        .setBackground("#1e40af")
        .setFontColor("#ffffff")
        .setFontWeight("bold");
    }

    // Cari baris pengguna saat ini di sheet Users
    let userRowIndex = -1;
    let currentStoredUser = null;
    const sessionUserLower = cleanStr(session.username).toLowerCase();
    const sessionNamaAlpha = getAlphaOnly(session.namaPegawai);
    const sessionSheetAlpha = getAlphaOnly(session.namaSheet);

    for (let i = headerRowIdx + 1; i < rawValues.length; i++) {
      const uName = cleanStr(rawValues[i][colUser]).toLowerCase();
      const nPegAlpha = getAlphaOnly(rawValues[i][colNama]);
      const nSheetAlpha = getAlphaOnly(rawValues[i][colSheet]);

      const isMatch = (
        uName === sessionUserLower ||
        (sessionNamaAlpha && nPegAlpha === sessionNamaAlpha) ||
        (sessionSheetAlpha && nSheetAlpha === sessionSheetAlpha) ||
        isUserAliasMatch(getAlphaOnly(session.username), getAlphaOnly(rawValues[i][colUser])) ||
        isUserAliasMatch(sessionNamaAlpha, nPegAlpha)
      );

      if (isMatch) {
        userRowIndex = i + 1;
        const rawPass = cleanPass(rawValues[i][colPass]);
        const dispPass = displayValues[i] ? cleanPass(displayValues[i][colPass]) : '';

        currentStoredUser = {
          username: cleanStr(rawValues[i][colUser]),
          namaPegawai: cleanStr(rawValues[i][colNama]),
          namaSheet: cleanStr(rawValues[i][colSheet]),
          password: rawPass || dispPass
        };
        break;
      }
    }

    if (!currentStoredUser || userRowIndex === -1) {
      return { success: false, message: "Data akun tidak ditemukan pada sheet Users." };
    }

    // Verifikasi kesesuaian password saat ini
    const storedPassClean = cleanPass(currentStoredUser.password);
    if (storedPassClean !== cleanOldPass && storedPassClean.toLowerCase() !== cleanOldPass.toLowerCase()) {
      return { success: false, message: "Password saat ini salah. Perubahan kredensial ditolak." };
    }

    // Validasi duplikasi username baru dengan pengguna lain
    const targetUsername = cleanNewUser ? cleanNewUser : currentStoredUser.username;
    if (cleanNewUser && cleanNewUser.toLowerCase() !== currentStoredUser.username.toLowerCase()) {
      for (let i = headerRowIdx + 1; i < rawValues.length; i++) {
        if (i + 1 !== userRowIndex) {
          const otherUser = cleanStr(rawValues[i][colUser]).toLowerCase();
          if (otherUser === cleanNewUser.toLowerCase()) {
            return {
              success: false,
              message: "Username '" + cleanNewUser + "' sudah digunakan oleh pegawai lain. Silakan pilih username lain."
            };
          }
        }
      }
    }

    const targetPassword = cleanNewPass ? cleanNewPass : currentStoredUser.password;
    const nowTimestamp = Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss");

    // TULIS PERUBAHAN LANGSUNG KE SHEET USERS
    userSheet.getRange(userRowIndex, colUser + 1).setValue(String(targetUsername));
    userSheet.getRange(userRowIndex, colPass + 1).setValue(String(targetPassword));
    userSheet.getRange(userRowIndex, 5).setValue(nowTimestamp);

    // FLUSH LANGSUNG KE SPREADSHEET AGAR TERSIMPAN PERMANEN
    SpreadsheetApp.flush();

    // Perbarui sesi aktif di Cache
    const cache = CacheService.getScriptCache();
    const updatedPayload = {
      username: targetUsername,
      namaPegawai: session.namaPegawai,
      namaSheet: session.namaSheet,
      jenis: session.jenis,
      loginTime: session.loginTime || new Date().toISOString()
    };
    const sessDuration = (typeof SESSION_DURATION_SEC !== 'undefined' && SESSION_DURATION_SEC) ? SESSION_DURATION_SEC : 21600;
    cache.put(token, JSON.stringify(updatedPayload), sessDuration);

    return {
      success: true,
      message: "Username dan password berhasil disimpan di spreadsheet pada sheet Users!",
      user: {
        username: targetUsername,
        namaPegawai: session.namaPegawai,
        jenis: session.jenis
      }
    };

  } catch (err) {
    return { success: false, message: "Terjadi kesalahan: " + err.message };
  }
}

/**
 * Logout & Menghapus Sesi Pengguna
 */

function logout(token) {
  try {
    if (token) {
      const cache = CacheService.getScriptCache();
      cache.remove(token);
    }
    return { success: true };
  } catch (err) {
    return { success: true };
  }
}

/**
 * FUNGSI SETUP DATABASE USERS OTOMATIS
 */

function getAllUsersList(ss) {
  if (_cachedUserList && _cachedUserList.length > 0) {
    return _cachedUserList;
  }

  if (!ss) ss = getDb();
  if (!ss) return [];

  const userSheet = findSheet(ss, "Users");
  if (!userSheet) return [];

  const rawValues = userSheet.getDataRange().getValues();
  if (rawValues.length < 2) return [];

  let colUser = 0, colNama = 1, colSheet = 2, colPass = 3, colRole = -1, colUnit = -1, colNip = -1;
  let headerRowIdx = 0;

  for (let r = 0; r < Math.min(5, rawValues.length); r++) {
    const row = rawValues[r];
    let headerKeywords = 0;
    for (let c = 0; c < row.length; c++) {
      const h = cleanStr(row[c]).toLowerCase();
      if (h.includes('sheet')) { colSheet = c; headerKeywords++; }
      else if (h.includes('user')) { colUser = c; headerKeywords++; }
      else if (h.includes('nama') || h.includes('pegawai')) { colNama = c; headerKeywords++; }
      else if (h.includes('role') || h.includes('jabatan')) { colRole = c; headerKeywords++; }
      else if (h.includes('unit') || h.includes('kategori')) { colUnit = c; headerKeywords++; }
      else if (h.includes('nip') || h.includes('id')) { colNip = c; headerKeywords++; }
    }
    if (headerKeywords >= 2) {
      headerRowIdx = r;
      break;
    }
  }

  const list = [];
  for (let i = headerRowIdx + 1; i < rawValues.length; i++) {
    const row = rawValues[i];
    const uName = cleanStr(row[colUser]);
    const nNama = cleanStr(row[colNama]);
    if (!uName && !nNama) continue;

    const uObj = {
      username: uName || nNama,
      namaPegawai: nNama || uName,
      namaSheet: cleanStr(row[colSheet]) || (uName || nNama),
      role: colRole !== -1 ? cleanStr(row[colRole]) : '',
      unit: colUnit !== -1 ? cleanStr(row[colUnit]) : '',
      nip: colNip !== -1 ? cleanStr(row[colNip]) : ''
    };

    const targetSheet = findEmployeeSheet(ss, uObj.namaSheet, uObj.namaPegawai, uObj.username);
    uObj.jenis = getSheetJenis(targetSheet, uObj, ss);
    uObj.unit = determineUnit(uObj.jenis, uObj.role, uObj.unit);

    if (!uObj.role) {
      const uLower = uObj.username.toLowerCase();
      if (uLower.includes('admin')) uObj.role = 'Admin';
      else if (uLower.includes('supervisor') || uLower.includes('kabag')) uObj.role = 'Supervisor';
      else if (uLower.includes('humas')) uObj.role = 'Tim Umum dan Humas';
      else if (uLower.includes('korlap')) uObj.role = 'Koordinator Lapangan';
      else if (uObj.jenis === 'KEAMANAN KANTOR') uObj.role = 'Petugas Keamanan';
      else if (uObj.jenis === 'RESEPSIONIS') uObj.role = 'Petugas Pelayanan';
      else uObj.role = 'Petugas Kebersihan';
    }

    list.push(uObj);
  }

  _cachedUserList = list;
  return list;
}

// <<<<<<<<<< END MODUL: backend/Auth.gs <<<<<<<<<<


// >>>>>>>>>> MODUL: backend/BuktiDukung.gs >>>>>>>>>>

/**
 * ========================================================================
 * SIMPEL-KU - BUKTI DUKUNG & SUPERVISOR CHECKLIST VALIDATION MODULE
 * BPS Provinsi Kalimantan Barat
 * ========================================================================
 */

/**
 * Inisialisasi Sheet ValidasiDanBuktiDukung jika belum ada di Spreadsheet
 */
function setupBuktiDukungSheet(ss) {
  if (!ss) ss = getDb();
  if (!ss) return null;

  var sheetName = (typeof SHEET_NAMES !== 'undefined' && SHEET_NAMES.BUKTI_DUKUNG) ? SHEET_NAMES.BUKTI_DUKUNG : 'ValidasiDanBuktiDukung';
  var sh = findSheet(ss, sheetName);
  if (!sh) {
    sh = ss.insertSheet(sheetName);
    var headers = [
      "TaskKey", "Timestamp", "Tahun", "Bulan", "BulanNama", "Tanggal", "Waktu",
      "UnitKerja", "NamaPegawai", "Username", "Ruangan", "NamaTugas",
      "StatusPetugas", "StatusPengawas", "NamaPengawas", "WaktuValidasiPengawas",
      "AdaBuktiDukung", "FileIdDrive", "FileUrlDrive", "FileName",
      "Koordinat", "Lokasi", "Catatan"
    ];
    sh.appendRow(headers);
    sh.getRange(1, 1, 1, headers.length)
      .setBackground("#1e40af")
      .setFontColor("#ffffff")
      .setFontWeight("bold");
    sh.setFrozenRows(1);
  }
  return sh;
}

/**
 * Menghasilkan kunci unik task untuk integrasi data checklist & bukti dukung
 */
function generateTaskKey(tahun, bulan, tanggal, namaPegawaiOrUsername, ruangan, namaTugas) {
  var tThn = Number(tahun || 0);
  var tBln = Number(bulan || 0);
  var tTgl = Number(tanggal || 0);
  var pAlpha = getAlphaOnly(namaPegawaiOrUsername || '');
  var rAlpha = getAlphaOnly(ruangan || 'umum');
  var kAlpha = getAlphaOnly(namaTugas || '');
  return [tThn, tBln, tTgl, pAlpha, rAlpha, kAlpha].join('_');
}

/**
 * Resolves the precise Unit Kerja ('Kebersihan', 'Pelayanan', 'Keamanan') for an officer
 * based on officer name, username, payload unit, and session.
 */
function resolveUnitKerja(payloadUnit, empName, username, session) {
  var nameCheck = getAlphaOnly(empName || username || (session ? (session.namaPegawai || session.username) : ''));

  // 1. Cek daftar definitif Petugas Pelayanan / Resepsionis
  var pelayananNames = ['mawardi', 'ardi', 'ranianailahusna', 'rania', 'alfianaayuni', 'alfiana'];
  for (var i = 0; i < pelayananNames.length; i++) {
    var pAlpha = getAlphaOnly(pelayananNames[i]);
    if (nameCheck === pAlpha || (nameCheck.length >= 4 && (nameCheck.indexOf(pAlpha) >= 0 || pAlpha.indexOf(nameCheck) >= 0))) {
      return 'Pelayanan';
    }
  }

  // 2. Cek daftar definitif Petugas Keamanan / Satpam
  var securityNames = ['eddysuryadi', 'eddy', 'syarifrezanopriadrianalkadri', 'syarifreza', 'syreza', 'reza', 'feriyustami', 'feri', 'rizkifadil', 'rizki', 'ekoprasetyo', 'eko', 'agustetriansyah', 'agus'];
  for (var j = 0; j < securityNames.length; j++) {
    var sAlpha = getAlphaOnly(securityNames[j]);
    if (nameCheck === sAlpha || (nameCheck.length >= 4 && (nameCheck.indexOf(sAlpha) >= 0 || sAlpha.indexOf(nameCheck) >= 0))) {
      return 'Keamanan';
    }
  }

  // 3. Cek daftar definitif Petugas Kebersihan
  var kebersihanNames = ['yunijuniarti', 'yuni', 'slametriyadi', 'slamet', 'nurramadhanial', 'dede', 'muhammadsyukri', 'msyukri', 'syukri', 'ramadhan', 'rama'];
  for (var k = 0; k < kebersihanNames.length; k++) {
    var kAlpha = getAlphaOnly(kebersihanNames[k]);
    if (nameCheck === kAlpha || (nameCheck.length >= 4 && (nameCheck.indexOf(kAlpha) >= 0 || kAlpha.indexOf(nameCheck) >= 0))) {
      return 'Kebersihan';
    }
  }

  // 4. Jika payloadUnit diberikan secara eksplisit dan valid
  if (payloadUnit) {
    var pLower = String(payloadUnit).toLowerCase().trim();
    if (pLower === 'pelayanan' || pLower.includes('resepsionis') || pLower.includes('pst')) return 'Pelayanan';
    if (pLower === 'keamanan' || pLower.includes('security') || pLower.includes('satpam')) return 'Keamanan';
    if (pLower === 'kebersihan') return 'Kebersihan';
  }

  // 5. Cek session.unit
  if (session && session.unit) {
    var sLower = String(session.unit).toLowerCase().trim();
    if (sLower === 'pelayanan' || sLower.includes('resepsionis') || sLower.includes('pst')) return 'Pelayanan';
    if (sLower === 'keamanan' || sLower.includes('security') || sLower.includes('satpam')) return 'Keamanan';
    if (sLower === 'kebersihan') return 'Kebersihan';
  }

  return 'Kebersihan';
}

/**
 * Mendapatkan atau membuat folder anak di Google Drive (Mencegah duplikasi folder)
 */
function getOrCreateChildFolder(parentFolder, folderName) {
  var nameClean = String(folderName || '').trim();
  if (!nameClean) nameClean = 'Lainnya';

  try {
    var folders = parentFolder.getFoldersByName(nameClean);
    if (folders.hasNext()) {
      return folders.next();
    }
    return parentFolder.createFolder(nameClean);
  } catch (err) {
    try {
      var checkFolders = parentFolder.getFoldersByName(nameClean);
      if (checkFolders.hasNext()) {
        return checkFolders.next();
      }
    } catch (eCheck) { /* ignore */ }
    throw new Error("Gagal membuat folder '" + nameClean + "': " + err.message);
  }
}

/**
 * Resolver Cerdas & Adaptif Folder Induk Google Drive:
 * 1. Mencoba mengakses Folder ID yang dikonfigurasi (GOOGLE_DRIVE_ROOT_FOLDER_ID)
 * 2. Menguji akses tulis ke folder target
 * 3. Jika folder target tidak dapat diakses (karena link belum ditambahkan ke Drive deployer,
 *    atau restriksi domain Workspace):
 *    - Otomatis fallback ke folder cadangan di My Drive deployer: "[SIMPEL-KU] Bukti Dukung Foto"
 *    - Menjamin proses upload bukti foto petugas TIDAK PERNAH MACET / GAGAL
 */
function resolveRootFolder(targetFolderId) {
  var configuredId = targetFolderId || (typeof GOOGLE_DRIVE_ROOT_FOLDER_ID !== 'undefined' ? GOOGLE_DRIVE_ROOT_FOLDER_ID : '');
  var fallbackFolderName = (typeof GOOGLE_DRIVE_FALLBACK_FOLDER_NAME !== 'undefined' ? GOOGLE_DRIVE_FALLBACK_FOLDER_NAME : '[SIMPEL-KU] Bukti Dukung Foto');
  
  var effectiveEmail = '';
  try {
    effectiveEmail = Session.getEffectiveUser().getEmail() || Session.getActiveUser().getEmail() || '';
  } catch (eEmail) { /* ignore */ }

  var issues = [];

  // Strategi 1: Coba akses folder ID yang dikonfigurasi
  if (configuredId) {
    try {
      var folder = DriveApp.getFolderById(configuredId);
      var folderName = folder.getName();
      return {
        folder: folder,
        folderId: configuredId,
        folderName: folderName,
        isFallback: false,
        note: "Menggunakan Folder Induk Utama (" + folderName + ")"
      };
    } catch (eTarget) {
      issues.push("Folder ID '" + configuredId + "' gagal diakses: " + eTarget.message);
    }
  }

  // Strategi 2: Cari apakah ada folder cadangan yang sudah dibuat sebelumnya di My Drive
  try {
    var existingFolders = DriveApp.getFoldersByName(fallbackFolderName);
    if (existingFolders.hasNext()) {
      var f = existingFolders.next();
      return {
        folder: f,
        folderId: f.getId(),
        folderName: f.getName(),
        isFallback: true,
        note: "Menggunakan folder cadangan: " + fallbackFolderName + " (Folder target ID " + configuredId + " belum dapat diakses)"
      };
    }
  } catch (eSearch) {
    issues.push("Pencarian folder cadangan gagal: " + eSearch.message);
  }

  // Strategi 3: Buat folder cadangan baru di Drive deployer
  try {
    var newFolder = DriveApp.createFolder(fallbackFolderName);
    try {
      newFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (eShare) { /* batasan domain */ }

    return {
      folder: newFolder,
      folderId: newFolder.getId(),
      folderName: fallbackFolderName,
      isFallback: true,
      note: "Dibuat otomatis folder cadangan: " + fallbackFolderName + " karena folder induk belum dihubungkan ke email script (" + (effectiveEmail || "deployer") + ")"
    };
  } catch (eCreate) {
    issues.push("Gagal membuat folder cadangan di Drive: " + eCreate.message);
  }

  // Jika semua gagal, kemungkinan besar OAuth scope DriveApp belum diotorisasi
  throw new Error(
    "Layanan Google Drive tidak dapat diakses (" + (issues.join(' | ') || 'Izin belum diotorisasi') + "). " +
    "Pastikan akun Google Apps Script (" + (effectiveEmail || "deployer") + ") telah mengotorisasi izin Google Drive."
  );
}

/**
 * Membaca seluruh data bukti dukung & status validasi pengawas pada bulan & tahun tertentu
 */
function getBuktiDukungMap(ss, bulan, tahun) {
  if (!ss) ss = getDb();
  if (!ss) return { map: {}, fallbackMap: {} };

  var sheetName = (typeof SHEET_NAMES !== 'undefined' && SHEET_NAMES.BUKTI_DUKUNG) ? SHEET_NAMES.BUKTI_DUKUNG : 'ValidasiDanBuktiDukung';
  var sh = findSheet(ss, sheetName);
  if (!sh) return { map: {}, fallbackMap: {} };

  var values = sh.getDataRange().getValues();
  if (values.length < 2) return { map: {}, fallbackMap: {} };

  var map = {};
  var fallbackMap = {};
  var selMonth = bulan ? Number(bulan) : null;
  var selYear = tahun ? Number(tahun) : null;

  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    var taskKey = String(row[0] || '').trim();
    var rYear = Number(row[2] || 0);
    var rMonth = Number(row[3] || 0);
    var rDay = Number(row[5] || 0);

    if (selYear && rYear && rYear !== selYear) continue;
    if (selMonth && rMonth && rMonth !== selMonth) continue;

    var record = {
      rowIndex: r + 1,
      taskKey: taskKey,
      timestamp: row[1] ? new Date(row[1]).toISOString() : '',
      tahun: rYear,
      bulan: rMonth,
      bulanNama: String(row[4] || ''),
      tanggal: rDay,
      waktu: String(row[6] || ''),
      unitKerja: String(row[7] || ''),
      namaPegawai: String(row[8] || ''),
      username: String(row[9] || ''),
      ruangan: String(row[10] || ''),
      namaTugas: String(row[11] || ''),
      statusPetugas: (row[12] === true || row[12] === 1 || String(row[12]).toUpperCase() === 'TRUE'),
      statusPengawas: (row[13] === true || row[13] === 1 || String(row[13]).toUpperCase() === 'TRUE'),
      namaPengawas: String(row[14] || ''),
      waktuValidasiPengawas: String(row[15] || ''),
      adaBuktiDukung: (row[16] === true || row[16] === 1 || String(row[16]).toUpperCase() === 'TRUE'),
      fileIdDrive: String(row[17] || ''),
      fileUrlDrive: String(row[18] || ''),
      fileName: String(row[19] || ''),
      koordinat: String(row[20] || ''),
      lokasi: String(row[21] || ''),
      catatan: String(row[22] || '')
    };

    if (taskKey) {
      map[taskKey] = record;
    }

    // Fallback key: tanggal_namaPegawaiAlpha_tugasAlpha
    var fKey = [rDay, getAlphaOnly(record.namaPegawai || record.username), getAlphaOnly(record.namaTugas)].join('_');
    fallbackMap[fKey] = record;
  }

  return { map: map, fallbackMap: fallbackMap };
}

/**
 * Mengunggah Foto Bukti Dukung ke Google Drive dengan struktur folder otomatis & bebas duplikat
 */
function uploadBuktiDukungFoto(token, payload) {
  try {
    var session = getSessionUser(token);
    if (!session) {
      return { success: false, message: "Sesi telah berakhir atau tidak valid. Silakan login kembali." };
    }

    if (!payload || !payload.imageBase64) {
      return { success: false, message: "Data foto bukti dukung tidak ditemukan." };
    }

    var ss = getDb();
    if (!ss) {
      return { success: false, message: "Koneksi spreadsheet gagal." };
    }

    var now = new Date();
    var currentYear = now.getFullYear();
    var currentMonth = now.getMonth() + 1;
    var currentDay = now.getDate();

    var targetTahun = payload.tahun ? Number(payload.tahun) : currentYear;
    var targetBulan = payload.bulan ? Number(payload.bulan) : currentMonth;
    var targetTanggal = payload.tanggal ? Number(payload.tanggal) : (payload.dayNum ? Number(payload.dayNum) : currentDay);

    var empName = cleanStr(payload.targetNamaPegawai || payload.namaPegawai || session.namaPegawai || session.username);
    var username = cleanStr(payload.targetUsername || payload.username || session.username);
    var unitKerja = resolveUnitKerja(payload.unit, empName, username, session);
    var namaTugas = cleanStr(payload.namaTugas || payload.kegiatan || payload.item || 'Pelaksanaan Tugas');
    var ruangan = cleanStr(payload.ruangan || 'Area Umum');

    var monthNames = (typeof MONTH_NAMES_ID !== 'undefined' && MONTH_NAMES_ID) ? MONTH_NAMES_ID : [
      '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    var namaBulanStr = monthNames[targetBulan] || ('Bulan_' + targetBulan);

    // 1. Ekstrak dan Konversi Base64 ke Blob Foto
    var base64Content = payload.imageBase64;
    if (base64Content.indexOf('base64,') >= 0) {
      base64Content = base64Content.split('base64,')[1];
    }
    var imageBytes = Utilities.base64Decode(base64Content);

    // Format Nama File: [NamaTugas]_[YYYY-MM-DD]_[HH-mm].jpg
    var cleanTaskSlug = namaTugas.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').substring(0, 30);
    if (!cleanTaskSlug) cleanTaskSlug = 'Bukti_Tugas';

    var datePart = targetTahun + '-' +
      (targetBulan < 10 ? '0' + targetBulan : targetBulan) + '-' +
      (targetTanggal < 10 ? '0' + targetTanggal : targetTanggal);

    var timePart = '';
    if (payload.waktuWib) {
      var numsOnly = String(payload.waktuWib).replace(/[^0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').substring(0, 5);
      if (numsOnly) timePart = numsOnly;
    }
    if (!timePart) {
      timePart = Utilities.formatDate(now, "GMT+7", "HH-mm");
    }

    var fileName = cleanTaskSlug + '_' + datePart + '_' + timePart + '.jpg';
    var imageBlob = Utilities.newBlob(imageBytes, 'image/jpeg', fileName);

    // 2. Akses Folder Induk Google Drive (Menggunakan Resolver Cerdas & Fallback)
    var rootFolderInfo;
    try {
      rootFolderInfo = resolveRootFolder(GOOGLE_DRIVE_ROOT_FOLDER_ID);
    } catch (eDrive) {
      return {
        success: false,
        message: "Gagal mengakses Google Drive: " + eDrive.message
      };
    }
    var rootFolder = rootFolderInfo.folder;

    // 3. Bangun Struktur Folder Secara Berjenjang Tanpa Duplikasi:
    // Folder Induk -> [Tahun] -> [Unit Kerja] -> [Bulan] -> [Nama Pegawai]
    var yearFolder = getOrCreateChildFolder(rootFolder, String(targetTahun));
    var unitFolder = getOrCreateChildFolder(yearFolder, unitKerja);
    var monthFolder = getOrCreateChildFolder(unitFolder, namaBulanStr);
    var employeeFolder = getOrCreateChildFolder(monthFolder, empName);

    // 4. Simpan File Foto ke Folder Pegawai
    var driveFile = employeeFolder.createFile(imageBlob);
    try {
      driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (eShare) { /* abaikan jika pembatasan domain */ }

    var fileId = driveFile.getId();
    var fileUrl = driveFile.getUrl();

    // 5. Simpan / Perbarui Record di Sheet ValidasiDanBuktiDukung
    var sh = setupBuktiDukungSheet(ss);
    var taskKey = generateTaskKey(targetTahun, targetBulan, targetTanggal, username || empName, ruangan, namaTugas);

    var waktuStr = payload.waktuWib || (Utilities.formatDate(now, "GMT+7", "HH:mm:ss") + " WIB");
    var koordinatStr = cleanStr(payload.koordinat || '-');
    var lokasiStr = cleanStr(payload.lokasi || '-');
    var catatanStr = cleanStr(payload.catatan || '-');

    var values = sh.getDataRange().getValues();
    var existingRowIdx = -1;

    for (var r = 1; r < values.length; r++) {
      if (String(values[r][0] || '').trim() === taskKey) {
        existingRowIdx = r + 1;
        break;
      }
    }

    var recordRow = [
      taskKey,
      now,
      targetTahun,
      targetBulan,
      namaBulanStr,
      targetTanggal,
      waktuStr,
      unitKerja,
      empName,
      username,
      ruangan,
      namaTugas,
      true, // StatusPetugas = TRUE karena ada bukti pelaksanaan
      existingRowIdx > 0 ? values[existingRowIdx - 1][13] : false, // StatusPengawas tetap
      existingRowIdx > 0 ? values[existingRowIdx - 1][14] : '',    // NamaPengawas tetap
      existingRowIdx > 0 ? values[existingRowIdx - 1][15] : '',    // WaktuValidasiPengawas tetap
      true, // AdaBuktiDukung = TRUE
      fileId,
      fileUrl,
      fileName,
      koordinatStr,
      lokasiStr,
      catatanStr
    ];

    if (existingRowIdx > 0) {
      sh.getRange(existingRowIdx, 1, 1, recordRow.length).setValues([recordRow]);
    } else {
      sh.appendRow(recordRow);
    }

    SpreadsheetApp.flush();

    // Invalidate script caches
    clearScriptCacheKeys([
      "cache_spv_dash_" + targetBulan + "_" + targetTahun,
      "cache_rekap_terpadu_" + targetBulan + "_" + targetTahun
    ]);
    resetMemoryCache();

    var successMsg = rootFolderInfo.isFallback
      ? "Bukti foto berhasil disimpan ke Google Drive (" + rootFolderInfo.folderName + ")! Catatan: " + rootFolderInfo.note
      : "Bukti dukung foto berhasil diunggah ke Google Drive!";

    return {
      success: true,
      message: successMsg,
      isFallbackFolder: rootFolderInfo.isFallback,
      data: {
        taskKey: taskKey,
        fileId: fileId,
        fileUrl: fileUrl,
        fileName: fileName,
        folderUsed: rootFolderInfo.folderName,
        isFallbackFolder: rootFolderInfo.isFallback,
        folderNote: rootFolderInfo.note,
        koordinat: koordinatStr,
        lokasi: lokasiStr,
        waktu: waktuStr,
        tanggal: targetTanggal,
        bulan: targetBulan,
        tahun: targetTahun,
        namaPegawai: empName,
        namaTugas: namaTugas,
        ruangan: ruangan,
        unitKerja: unitKerja
      }
    };

  } catch (err) {
    return {
      success: false,
      message: "Gagal mengunggah bukti foto: " + err.message
    };
  }
}

/**
 * Memperbarui Status Checklist / Validasi Pengawas (Bisa Centang & Uncheck)
 */
function updateSupervisorChecklist(token, payload) {
  try {
    var session = getSessionUser(token);
    if (!session) {
      return { success: false, message: "Sesi telah berakhir. Silakan login kembali." };
    }

    // Validasi Hak Akses Pengawas
    var isManager = (session.role === 'Admin' ||
                     session.role === 'Supervisor' ||
                     session.role === 'Tim Umum dan Humas' ||
                     session.role === 'Koordinator Lapangan');

    if (!isManager) {
      return { success: false, message: "Akses ditolak. Hanya Pengawas atau Admin yang dapat memvalidasi checklist tugas." };
    }

    if (!payload) {
      return { success: false, message: "Data validasi tidak lengkap." };
    }

    var ss = getDb();
    if (!ss) {
      return { success: false, message: "Koneksi spreadsheet gagal." };
    }

    var now = new Date();
    var targetTahun = payload.tahun ? Number(payload.tahun) : now.getFullYear();
    var targetBulan = payload.bulan ? Number(payload.bulan) : (now.getMonth() + 1);
    var targetTanggal = payload.tanggal ? Number(payload.tanggal) : (payload.dayNum ? Number(payload.dayNum) : now.getDate());

    var empName = cleanStr(payload.namaPegawai || payload.pegawai || '');
    var username = cleanStr(payload.username || '');
    var ruangan = cleanStr(payload.ruangan || 'Area Umum');
    var namaTugas = cleanStr(payload.namaTugas || payload.item || payload.kegiatan || '');
    var unitKerja = resolveUnitKerja(payload.unit || payload.unitKerja, empName, username, session);

    var newStatus = (payload.newStatus === true || payload.newStatus === '1' || payload.newStatus === 1 || String(payload.newStatus).toUpperCase() === 'TRUE');

    var taskKey = payload.taskKey || generateTaskKey(targetTahun, targetBulan, targetTanggal, username || empName, ruangan, namaTugas);

    var sh = setupBuktiDukungSheet(ss);
    var values = sh.getDataRange().getValues();
    var existingRowIdx = -1;

    for (var r = 1; r < values.length; r++) {
      if (String(values[r][0] || '').trim() === taskKey) {
        existingRowIdx = r + 1;
        break;
      }
    }

    // Jika belum ada row taskKey exact, cari fallback (tanggal + nama + tugas)
    if (existingRowIdx === -1 && empName && namaTugas) {
      var searchAlpha = [targetTanggal, getAlphaOnly(username || empName), getAlphaOnly(namaTugas)].join('_');
      for (var r = 1; r < values.length; r++) {
        var row = values[r];
        var rDay = Number(row[5] || 0);
        var rUser = getAlphaOnly(String(row[9] || row[8] || ''));
        var rTugas = getAlphaOnly(String(row[11] || ''));
        if (rDay === targetTanggal && rUser === getAlphaOnly(username || empName) && rTugas === getAlphaOnly(namaTugas)) {
          existingRowIdx = r + 1;
          break;
        }
      }
    }

    var supervisorName = session.namaPegawai || session.username || 'Pengawas';
    var waktuValidasiStr = Utilities.formatDate(now, "GMT+7", "dd/MM/yyyy HH:mm:ss") + " WIB";

    var monthNames = (typeof MONTH_NAMES_ID !== 'undefined' && MONTH_NAMES_ID) ? MONTH_NAMES_ID : [
      '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    var namaBulanStr = monthNames[targetBulan] || ('Bulan_' + targetBulan);

    var willCheckStaff = (newStatus && (payload.alsoCheckStaff === true || payload.statusPetugas === true));

    if (existingRowIdx > 0) {
      // Perbarui kolom status pengawas, nama pengawas, waktu validasi, dan timestamp
      sh.getRange(existingRowIdx, 2).setValue(now); // Timestamp
      sh.getRange(existingRowIdx, 14).setValue(newStatus); // StatusPengawas
      sh.getRange(existingRowIdx, 15).setValue(newStatus ? supervisorName : ''); // NamaPengawas
      sh.getRange(existingRowIdx, 16).setValue(newStatus ? waktuValidasiStr : ''); // WaktuValidasiPengawas
      if (willCheckStaff) {
        sh.getRange(existingRowIdx, 13).setValue(true); // StatusPetugas = TRUE
      }
      if (payload.catatan) {
        sh.getRange(existingRowIdx, 23).setValue(payload.catatan);
      }
    } else {
      // Buat row baru
      var newRow = [
        taskKey,
        now,
        targetTahun,
        targetBulan,
        namaBulanStr,
        targetTanggal,
        Utilities.formatDate(now, "GMT+7", "HH:mm:ss") + " WIB",
        unitKerja,
        empName,
        username,
        ruangan,
        namaTugas,
        (willCheckStaff ? true : (payload.statusPetugas !== undefined ? Boolean(payload.statusPetugas) : false)), // StatusPetugas
        newStatus, // StatusPengawas
        newStatus ? supervisorName : '',
        newStatus ? waktuValidasiStr : '',
        false, // AdaBuktiDukung
        '',    // FileIdDrive
        '',    // FileUrlDrive
        '',    // FileName
        '',    // Koordinat
        '',    // Lokasi
        payload.catatan || '-'
      ];
      sh.appendRow(newRow);
    }

    // Jika willCheckStaff, perbarui juga sheet personal pegawai jika ada
    if (willCheckStaff) {
      try {
        var empSheet = findEmployeeSheet(ss, payload.targetSheetName, empName, username);
        if (empSheet) {
          var rIdx = Number(payload.sheetRowIndex || 0);
          var cIdx = Number(payload.colIndex || 0);
          if (rIdx >= 1 && cIdx >= 1) {
            empSheet.getRange(rIdx, cIdx).setValue(true);
          }
        }
      } catch (eEmpSh) {}
    }

    SpreadsheetApp.flush();

    // Invalidate script caches
    clearScriptCacheKeys([
      "cache_spv_dash_" + targetBulan + "_" + targetTahun,
      "cache_rekap_terpadu_" + targetBulan + "_" + targetTahun
    ]);
    resetMemoryCache();

    return {
      success: true,
      message: newStatus ? "Tugas berhasil divalidasi oleh Pengawas!" : "Checklist validasi Pengawas berhasil dibatalkan.",
      data: {
        taskKey: taskKey,
        statusPengawas: newStatus,
        namaPengawas: newStatus ? supervisorName : '',
        waktuValidasiPengawas: newStatus ? waktuValidasiStr : '',
        namaPegawai: empName,
        namaTugas: namaTugas,
        tanggal: targetTanggal,
        bulan: targetBulan,
        tahun: targetTahun
      }
    };

  } catch (err) {
    return {
      success: false,
      message: "Gagal memperbarui checklist pengawas: " + err.message
    };
  }
}

/**
 * Mengambil data bukti dukung untuk tabel atau laporan
 */
function getBuktiDukungData(token, bulan, tahun, unit, namaPegawai) {
  try {
    var session = getSessionUser(token);
    if (!session) {
      return { success: false, message: "Sesi telah berakhir." };
    }

    var ss = getDb();
    if (!ss) return { success: false, message: "Koneksi spreadsheet gagal." };

    var bMap = getBuktiDukungMap(ss, bulan, tahun);
    var list = Object.values(bMap.map);

    if (unit && unit !== 'SEMUA') {
      list = list.filter(function(item) {
        return (item.unitKerja || '').toUpperCase() === unit.toUpperCase();
      });
    }

    if (namaPegawai && namaPegawai !== 'SEMUA') {
      var nAlpha = getAlphaOnly(namaPegawai);
      list = list.filter(function(item) {
        return getAlphaOnly(item.namaPegawai) === nAlpha || getAlphaOnly(item.username) === nAlpha;
      });
    }

    list.sort(function(a, b) {
      return (b.tanggal || 0) - (a.tanggal || 0);
    });

    return {
      success: true,
      data: list
    };

  } catch (err) {
    return {
      success: false,
      message: "Gagal memuat data bukti dukung: " + err.message
    };
  }
}

/**
 * ========================================================================
 * FUNGSI DIAGNOSTIK & OTORISASI GOOGLE DRIVE
 * ========================================================================
 * Jalankan fungsi ini langsung dari Editor Google Apps Script (Run / Jalankan)
 * untuk:
 * 1. Memicu dialog otorisasi izin Drive (Review Permissions -> Allow) jika belum.
 * 2. Menguji apakah akun deployer dapat mengakses folder target 1WvFEHzdredv8wQEBRivNY9iDk5C6iktR.
 * 3. Menguji hak akses baca, tulis (create folder/file), dan hapus.
 * 4. Menghasilkan rekomendasi tindakan jika ada kendala hak akses.
 */
function testGoogleDriveAccess() {
  var report = {
    timestamp: new Date().toISOString(),
    configuredFolderId: (typeof GOOGLE_DRIVE_ROOT_FOLDER_ID !== 'undefined') ? GOOGLE_DRIVE_ROOT_FOLDER_ID : '',
    activeUser: '',
    effectiveUser: '',
    driveServiceReady: false,
    targetFolderAccessible: false,
    targetFolderName: '',
    canCreateFile: false,
    fallbackFolderAccessible: false,
    recommendations: []
  };

  try {
    report.effectiveUser = Session.getEffectiveUser().getEmail() || '(Akun Deployer)';
    report.activeUser = Session.getActiveUser().getEmail() || '(Akun Aktif)';
  } catch (e) {
    report.effectiveUser = 'Tidak terdeteksi';
  }

  // 1. Uji Layanan Drive Dasar
  try {
    var rootDrive = DriveApp.getRootFolder();
    report.driveServiceReady = !!rootDrive;
    Logger.log("[OK] Layanan DriveApp berhasil diakses oleh akun: " + report.effectiveUser);
  } catch (eDrive) {
    report.driveServiceReady = false;
    report.recommendations.push(
      "KRUSIAL: Izin akses Google Drive belum diotorisasi di Apps Script. " +
      "Klik tombol 'Run / Jalankan' pada fungsi testGoogleDriveAccess di editor Apps Script, " +
      "lalu klik 'Review Permissions' dan 'Allow' untuk memberikan izin akses Google Drive."
    );
    Logger.log("[FAIL] Layanan DriveApp gagal: " + eDrive.message);
    return report;
  }

  // 2. Uji Akses Folder Target yang Dikonfigurasi
  var folderId = report.configuredFolderId;
  if (!folderId) {
    report.recommendations.push("Konfigurasi GOOGLE_DRIVE_ROOT_FOLDER_ID masih kosong.");
  } else {
    try {
      var targetFolder = DriveApp.getFolderById(folderId);
      report.targetFolderAccessible = true;
      report.targetFolderName = targetFolder.getName();
      Logger.log("[OK] Folder target terdeteksi: " + report.targetFolderName + " (ID: " + folderId + ")");

      // Uji izin tulis (membuat file dummy sementara)
      try {
        var testBlob = Utilities.newBlob("SIMPEL-KU Test Access: " + new Date().toISOString(), "text/plain", "simpelku_test_write.tmp");
        var testFile = targetFolder.createFile(testBlob);
        report.canCreateFile = true;
        testFile.setTrashed(true); // Langsung hapus file uji
        Logger.log("[OK] Berhasil membuat dan menghapus file uji di folder target. Hak akses Editor LENGKAP & VALID!");
      } catch (eWrite) {
        report.canCreateFile = false;
        report.recommendations.push(
          "Folder target dapat dilihat tapi TIDAK DAPAT DITULIS (Read-Only): " + eWrite.message + ". " +
          "Pastikan folder induk dibagikan sebagai 'Editor' ke email: " + report.effectiveUser
        );
        Logger.log("[FAIL] Gagal menulis ke folder target: " + eWrite.message);
      }

    } catch (eTarget) {
      report.targetFolderAccessible = false;
      Logger.log("[FAIL] Folder target ID '" + folderId + "' tidak dapat diakses: " + eTarget.message);
      report.recommendations.push(
        "PENYEBAB: Folder Google Drive (" + folderId + ") dibagikan dengan link 'Siapa saja yang memiliki link', " +
        "tetapi akun Google script (" + report.effectiveUser + ") belum memiliki folder tersebut di inventaris Drive-nya.\n" +
        "SOLUSI:\n" +
        "1. Buka folder di browser: https://drive.google.com/drive/folders/" + folderId + "\n" +
        "2. Klik 'Bagikan' (Share) dan masukkan email akun deployer script (" + report.effectiveUser + ") sebagai 'Editor'.\n" +
        "3. ATAU buka link tersebut saat login dengan akun script (" + report.effectiveUser + "), lalu klik 'Tambahkan pintasan ke Drive' (Add shortcut to Drive)."
      );
    }
  }

  // 3. Uji Kesiapan Folder Cadangan Fallback
  try {
    var fallbackName = (typeof GOOGLE_DRIVE_FALLBACK_FOLDER_NAME !== 'undefined') ? GOOGLE_DRIVE_FALLBACK_FOLDER_NAME : '[SIMPEL-KU] Bukti Dukung Foto';
    var fallbackFolders = DriveApp.getFoldersByName(fallbackName);
    report.fallbackFolderAccessible = true;
    if (fallbackFolders.hasNext()) {
      Logger.log("[OK] Folder cadangan fallback siap di Drive: " + fallbackName);
    } else {
      Logger.log("[INFO] Folder cadangan fallback akan dibuat otomatis saat pertama kali upload diperlukan.");
    }
  } catch (eFb) {
    report.fallbackFolderAccessible = false;
    Logger.log("[FAIL] Folder fallback bermasalah: " + eFb.message);
  }

  Logger.log("=== LAPORAN DIAGNOSTIK GOOGLE DRIVE SELESAI ===");
  Logger.log(JSON.stringify(report, null, 2));
  return report;
}

// <<<<<<<<<< END MODUL: backend/BuktiDukung.gs <<<<<<<<<<


// >>>>>>>>>> MODUL: backend/InspeksiMutu.gs >>>>>>>>>>

/**
 * ========================================================================
 * SIMPEL-KU - INSPEKSI MUTU / QUALITY INSPECTION MODULE
 * ========================================================================
 */

/**
 * ========================================================================
 * 7. AUDIT & INSPEKSI STANDAR MUTU LAYANAN
 * ========================================================================
 */
function setupInspeksiMutuSheet(ss) {
  if (!ss) ss = getDb();
  let sh = findSheet(ss, "InspeksiMutu");
  if (!sh) {
    sh = ss.insertSheet("InspeksiMutu");
    sh.appendRow([
      "Timestamp", "Tanggal Inspeksi", "Bulan", "Tahun", "Unit", "Pegawai / Area",
      "Kerapihan & Kebersihan (1-5)", "Ketepatan Waktu (1-5)", "Kepatuhan SOP (1-5)",
      "Kelengkapan Atribut/Alat (1-5)", "Skor Rata-Rata", "Catatan Temuan",
      "Status Rekomendasi", "Inspektor"
    ]);
    sh.getRange(1, 1, 1, 14).setBackground("#4f46e5").setFontColor("#ffffff").setFontWeight("bold");
    sh.setFrozenRows(1);
  }
  return sh;
}

function getInspeksiMutuData(token, bulan, tahun, unit) {
  try {
    const ss = getDb();
    if (!ss) return { success: false, message: "Spreadsheet tidak ditemukan." };

    const sh = findSheet(ss, "InspeksiMutu");
    if (!sh) return { success: true, data: [] };

    const values = sh.getDataRange().getValues();
    if (values.length < 2) return { success: true, data: [] };

    const list = [];
    const selectedMonth = bulan ? Number(bulan) : null;
    const selectedYear = tahun ? Number(tahun) : null;

    for (let r = 1; r < values.length; r++) {
      const row = values[r];
      const rowBulan = Number(row[2]);
      const rowTahun = Number(row[3]);
      const rowUnit = cleanStr(row[4]);

      if (selectedMonth && rowBulan && rowBulan !== selectedMonth) continue;
      if (selectedYear && rowTahun && rowTahun !== selectedYear) continue;
      if (unit && unit !== 'SEMUA' && rowUnit && rowUnit.toUpperCase() !== unit.toUpperCase()) continue;

      list.push({
        rowIndex: r + 1,
        timestamp: row[0] ? new Date(row[0]).toISOString() : '',
        tanggal: row[1],
        bulan: rowBulan,
        tahun: rowTahun,
        unit: rowUnit,
        pegawaiArea: row[5],
        skorKerapihan: Number(row[6] || 0),
        skorKetepatan: Number(row[7] || 0),
        skorKepatuhan: Number(row[8] || 0),
        skorKelengkapan: Number(row[9] || 0),
        skorRataRata: Number(row[10] || 0),
        catatan: row[11] || '',
        statusRekomendasi: row[12] || 'Sesuai Standar',
        inspektor: row[13] || 'Supervisor'
      });
    }

    list.reverse();
    return { success: true, data: list };
  } catch (err) {
    return { success: false, message: "Gagal memuat data inspeksi: " + err.message };
  }
}

function saveInspeksiMutu(token, payload) {
  try {
    const session = getSessionUser(token);
    if (!session) return { success: false, message: "Sesi telah berakhir." };

    const ss = getDb();
    if (!ss) return { success: false, message: "Spreadsheet tidak ditemukan." };

    const sh = setupInspeksiMutuSheet(ss);
    const now = new Date();
    const bulan = payload.bulan || (now.getMonth() + 1);
    const tahun = payload.tahun || now.getFullYear();
    const tanggal = payload.tanggal || `${now.getDate()}/${bulan}/${tahun}`;

    const skor1 = Number(payload.skorKerapihan || 5);
    const skor2 = Number(payload.skorKetepatan || 5);
    const skor3 = Number(payload.skorKepatuhan || 5);
    const skor4 = Number(payload.skorKelengkapan || 5);
    const avg = Number(((skor1 + skor2 + skor3 + skor4) / 4).toFixed(2));

    sh.appendRow([
      now,
      tanggal,
      bulan,
      tahun,
      payload.unit || 'Kebersihan',
      payload.pegawaiArea || 'Semua Area',
      skor1,
      skor2,
      skor3,
      skor4,
      avg,
      payload.catatan || '-',
      payload.statusRekomendasi || 'Sesuai Standar',
      session.namaPegawai || session.username || 'Supervisor'
    ]);

    clearScriptCacheKeys([
      "cache_spv_dash_" + bulan + "_" + tahun,
      "cache_rekap_terpadu_" + bulan + "_" + tahun
    ]);
    resetMemoryCache();

    return { success: true, message: "Data inspeksi mutu berhasil disimpan!", skorRataRata: avg };
  } catch (err) {
    return { success: false, message: "Gagal menyimpan inspeksi: " + err.message };
  }
}

// <<<<<<<<<< END MODUL: backend/InspeksiMutu.gs <<<<<<<<<<


// >>>>>>>>>> MODUL: backend/StaffMonitoring.gs >>>>>>>>>>

/**
 * ========================================================================
 * SIMPEL-KU - STAFF MONITORING MODULE (CLEANING, RECEPTIONIST, ETC.)
 * ========================================================================
 */

/**
 * Mengambil Data Dashboard Ringkasan Pegawai
 */

function getDashboardData(token, bulan, tahun) {
  try {
    const session = getSessionUser(token);
    if (!session) {
      return { success: false, message: "Sesi telah berakhir atau tidak valid. Silakan login kembali." };
    }

    const ss = getDb();
    const sheet = findEmployeeSheet(ss, session.namaSheet, session.namaPegawai, session.username);
    if (!sheet) {
      // Jika petugas keamanan dan belum memiliki sheet kebersihan terpisah
      if (session.jenis === 'KEAMANAN KANTOR') {
        const resKeamanan = getJadwalKeamanan(token, bulan, tahun);
        if (resKeamanan && resKeamanan.success && resKeamanan.data) {
          const kData = resKeamanan.data;
          const totalHari = kData.totalHariKerja || 0;
          return {
            success: true,
            data: {
              namaPegawai: session.namaPegawai,
              username: session.username,
              jenis: session.jenis,
              totalKegiatan: totalHari,
              kegiatanSelesai: totalHari,
              kegiatanBelum: 0,
              persenPenyelesaian: 100,
              progressRuangan: [
                { ruangan: 'Jadwal Shift Keamanan', total: totalHari, selesai: totalHari, persen: 100 }
              ],
              totalItemMonitoring: kData.jadwal ? kData.jadwal.length : 0
            }
          };
        }
      }

      return {
        success: true,
        data: {
          namaPegawai: session.namaPegawai,
          username: session.username,
          jenis: session.jenis || 'Kebersihan',
          totalKegiatan: 0,
          kegiatanSelesai: 0,
          kegiatanBelum: 0,
          persenPenyelesaian: 0,
          progressRuangan: [],
          totalItemMonitoring: 0
        }
      };
    }

    const parsedData = readSheetMonitoring(sheet, bulan, tahun);

    let totalKegiatan = 0;
    let kegiatanSelesai = 0;
    let kegiatanBelum = 0;
    const progressPerRuangan = {};

    parsedData.items.forEach(item => {
      totalKegiatan += item.totalHariAktif;
      kegiatanSelesai += item.selesaiCount;
      kegiatanBelum += (item.totalHariAktif - item.selesaiCount);

      if (!progressPerRuangan[item.ruangan]) {
        progressPerRuangan[item.ruangan] = {
          ruangan: item.ruangan,
          total: 0,
          selesai: 0
        };
      }
      progressPerRuangan[item.ruangan].total += item.totalHariAktif;
      progressPerRuangan[item.ruangan].selesai += item.selesaiCount;
    });

    const persenTotal = totalKegiatan > 0 ? Math.round((kegiatanSelesai / totalKegiatan) * 100) : 0;

    const listRuangan = Object.values(progressPerRuangan).map(r => ({
      ruangan: r.ruangan,
      total: r.total,
      selesai: r.selesai,
      persen: r.total > 0 ? Math.round((r.selesai / r.total) * 100) : 0
    }));

    return {
      success: true,
      data: {
        namaPegawai: session.namaPegawai,
        username: session.username,
        jenis: parsedData.jenis,
        totalKegiatan: totalKegiatan,
        kegiatanSelesai: kegiatanSelesai,
        kegiatanBelum: kegiatanBelum,
        persenPenyelesaian: persenTotal,
        progressRuangan: listRuangan,
        totalItemMonitoring: parsedData.items.length
      }
    };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Mengambil Data Matriks Monitoring Lengkap
 */

function getMonitoringData(token, jenis, bulan, tahun, filterRuangan, filterStatus) {
  try {
    const session = getSessionUser(token);
    if (!session) {
      return { success: false, message: "Sesi telah berakhir. Silakan login kembali." };
    }

    const ss = getDb();
    const sheet = findEmployeeSheet(ss, session.namaSheet, session.namaPegawai, session.username);
    if (!sheet) {
      return { success: false, message: "Sheet monitoring '" + session.namaSheet + "' tidak ditemukan pada spreadsheet." };
    }

    const parsedData = readSheetMonitoring(sheet, bulan, tahun);

    let filteredItems = parsedData.items;
    if (filterRuangan && filterRuangan !== "SEMUA") {
      filteredItems = filteredItems.filter(item => item.ruangan === filterRuangan);
    }

    if (filterStatus && filterStatus !== "SEMUA") {
      filteredItems = filteredItems.filter(item => {
        const isCompleted = item.selesaiCount === item.totalHariAktif && item.totalHariAktif > 0;
        if (filterStatus === "SELESAI") return isCompleted;
        if (filterStatus === "BELUM") return !isCompleted;
        return true;
      });
    }

    const bMap = getBuktiDukungMap(ss, bulan, tahun);
    filteredItems.forEach(item => {
      item.dailyEvidence = {};
      parsedData.activeDays.forEach(d => {
        const tKey = generateTaskKey(tahun, bulan, d, session.username || session.namaPegawai, item.ruangan, item.kegiatan);
        const fKey = [d, getAlphaOnly(session.namaPegawai || session.username), getAlphaOnly(item.kegiatan)].join('_');
        const rec = bMap.map[tKey] || bMap.fallbackMap[fKey];
        if (rec) {
          item.dailyEvidence[d] = {
            adaBukti: rec.adaBuktiDukung,
            fileId: rec.fileIdDrive,
            fileUrl: rec.fileUrlDrive,
            fileName: rec.fileName,
            koordinat: rec.koordinat,
            lokasi: rec.lokasi,
            waktu: rec.waktu,
            statusPengawas: rec.statusPengawas,
            namaPengawas: rec.namaPengawas,
            waktuValidasiPengawas: rec.waktuValidasiPengawas,
            taskKey: rec.taskKey || tKey
          };
        } else {
          item.dailyEvidence[d] = {
            adaBukti: false,
            fileId: '',
            fileUrl: '',
            fileName: '',
            koordinat: '',
            lokasi: '',
            waktu: '',
            statusPengawas: false,
            namaPengawas: '',
            waktuValidasiPengawas: '',
            taskKey: tKey
          };
        }
      });
    });

    return {
      success: true,
      data: {
        namaPegawai: session.namaPegawai,
        jenis: parsedData.jenis,
        daysInMonth: parsedData.daysInMonth,
        activeDays: parsedData.activeDays,
        headers: parsedData.headers,
        items: filteredItems,
        daftarRuangan: parsedData.daftarRuangan
      }
    };

  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Toggle Status Checklist
 */

/**
 * Memperbarui status monitoring (Centang checkbox) secara aman & atomik
 * Mendukung pembatalan untuk hari ini, dan mengunci tanggal lampau
 * Mendukung targetSheetName jika dipanggil oleh Admin / Supervisor
 */
function updateMonitoringStatus(token, rowIndex, colIndex, newStatus, dayNum, monthNum, yearNum, targetSheetName) {
  try {
    const session = getSessionUser(token);
    if (!session) {
      return { success: false, message: "Sesi telah berakhir. Silakan login kembali." };
    }

    const ss = getDb();
    if (!ss) {
      return { success: false, message: "Koneksi spreadsheet gagal." };
    }

    let sheet = null;
    const isManager = (session.role === 'Admin' || session.role === 'Supervisor' || session.role === 'Tim Umum dan Humas' || session.role === 'Koordinator Lapangan');
    if (targetSheetName && isManager) {
      sheet = findSheet(ss, targetSheetName);
    }
    if (!sheet) {
      sheet = findEmployeeSheet(ss, session.namaSheet, session.namaPegawai, session.username);
    }
    if (!sheet) {
      return { success: false, message: "Sheet data pegawai tidak ditemukan." };
    }

    const rIdx = Number(rowIndex);
    const cIdx = Number(colIndex);

    if (!rIdx || !cIdx || rIdx < 1 || cIdx < 1) {
      return { success: false, message: "Koordinat cell tidak valid (Baris: " + rIdx + ", Kolom: " + cIdx + ")." };
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();

    const targetDay = Number(dayNum);
    const targetMonth = Number(monthNum);
    const targetYear = Number(yearNum);

    const isToday = (targetYear === currentYear && targetMonth === currentMonth && targetDay === currentDay);
    const isPastDate = (
      targetYear < currentYear ||
      (targetYear === currentYear && targetMonth < currentMonth) ||
      (targetYear === currentYear && targetMonth === currentMonth && targetDay < currentDay)
    );

    const cellRange = sheet.getRange(rIdx, cIdx);
    const rawVal = cellRange.getValue();
    const currentValUpper = String(rawVal || '').toUpperCase().trim();
    const isCurrentlyChecked = (rawVal === true || rawVal === 1 || rawVal === '1' || currentValUpper === 'TRUE' || currentValUpper === 'V');

    // Validasi aturan bisnis: Tanggal lampau yang sudah TRUE tidak boleh diubah kecuali oleh Admin
    if (isPastDate && isCurrentlyChecked && !isManager) {
      return {
        success: false,
        message: "Data tanggal lampau (" + targetDay + "/" + targetMonth + "/" + targetYear + ") yang telah selesai tidak dapat diubah kembali."
      };
    }

    // Tentukan nilai baru yang akan disimpan ke cell spreadsheet
    const valToSet = (newStatus === true || newStatus === '1' || newStatus === 1 || String(newStatus).toUpperCase() === 'TRUE') ? true : false;

    cellRange.setValue(valToSet);
    SpreadsheetApp.flush();

    return {
      success: true,
      message: valToSet ? "Checklist berhasil ditandai selesai." : "Checklist berhasil dibatalkan.",
      newStatus: valToSet,
      rowIndex: rIdx,
      colIndex: cIdx,
      isToday: isToday
    };

  } catch (err) {
    return { success: false, message: "Gagal memperbarui status checklist: " + err.message };
  }
}

function getRekapMonitoring(token, bulan, tahun) {
  try {
    const session = getSessionUser(token);
    if (!session) {
      return { success: false, message: "Sesi tidak valid." };
    }

    const ss = getDb();
    const sheet = findEmployeeSheet(ss, session.namaSheet, session.namaPegawai, session.username);
    if (!sheet) {
      return { success: false, message: "Sheet tidak ditemukan." };
    }

    const parsedData = readSheetMonitoring(sheet, bulan, tahun);

    const rekapJenis = {};
    const rekapRuangan = {};

    const rekapHarianMap = {};
    const rekapHarian = parsedData.activeDays.map((d, i) => {
      rekapHarianMap[d] = i;
      return { hari: d, tanggal: d, total: 0, selesai: 0, done: 0 };
    });

    parsedData.items.forEach(item => {
      const jns = item.jenis || "Kebersihan";
      if (!rekapJenis[jns]) rekapJenis[jns] = { total: 0, selesai: 0 };
      rekapJenis[jns].total += item.totalHariAktif;
      rekapJenis[jns].selesai += item.selesaiCount;

      if (!rekapRuangan[item.ruangan]) {
        rekapRuangan[item.ruangan] = { ruangan: item.ruangan, total: 0, selesai: 0, itemCount: 0 };
      }
      rekapRuangan[item.ruangan].total += item.totalHariAktif;
      rekapRuangan[item.ruangan].selesai += item.selesaiCount;
      rekapRuangan[item.ruangan].itemCount += 1;

      parsedData.activeDays.forEach(d => {
        const st = item.dailyStatus[d];
        if (st === "1" || st === "0" || st === 1 || st === 0) {
          const idx = rekapHarianMap[d];
          if (idx !== undefined) {
            rekapHarian[idx].total += 1;
            if (st === "1" || st === 1) {
              rekapHarian[idx].selesai += 1;
              rekapHarian[idx].done += 1;
            }
          }
        }
      });
    });

    return {
      success: true,
      data: {
        namaPegawai: session.namaPegawai,
        jenis: parsedData.jenis,
        rekapJenis: rekapJenis,
        rekapRuangan: Object.values(rekapRuangan),
        rekapHarian: rekapHarian,
        totalItems: parsedData.items.length
      }
    };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * ENGINE PARSER DATA SPREADSHEET (Dengan Caching Pintar untuk Akselerasi Cepat)
 */

function readSheetMonitoring(sheet, bulan, tahun) {
  const now = new Date();
  const selectedMonth = bulan ? Number(bulan) : (now.getMonth() + 1);
  const selectedYear = tahun ? Number(tahun) : now.getFullYear();

  // Cek in-memory cache dan Script Cache untuk menghindari re-parsing berulang
  const memKey = sheet.getName() + "_" + selectedMonth + "_" + selectedYear;
  if (typeof _cachedParsedMonitoring !== 'undefined' && _cachedParsedMonitoring && _cachedParsedMonitoring[memKey]) {
    return _cachedParsedMonitoring[memKey];
  }

  const cacheKey = "cache_m_" + sheet.getName() + "_" + selectedMonth + "_" + selectedYear;
  try {
    const cached = CacheService.getScriptCache().get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (typeof _cachedParsedMonitoring !== 'undefined' && _cachedParsedMonitoring) {
        _cachedParsedMonitoring[memKey] = parsed;
      }
      return parsed;
    }
  } catch (ce) { /* ignore cache read error */ }

  const values = sheet.getDataRange().getValues();
  if (!values || values.length < 3) {
    return { items: [], daysInMonth: 30, activeDays: [], daftarRuangan: [], headers: [], jenis: 'Kebersihan' };
  }

  function isDayValue(v) {
    if (typeof v === 'number' && v >= 1 && v <= 31) return true;
    if (typeof v === 'string') {
      const s = v.trim();
      if (/^\d{1,2}$/.test(s)) {
        const n = Number(s);
        return n >= 1 && n <= 31;
      }
    }
    return false;
  }

  function parseDayNum(v) {
    if (typeof v === 'number') return v;
    if (typeof v === 'string') {
      const s = v.trim();
      if (/^\d{1,2}$/.test(s)) return Number(s);
    }
    return null;
  }

  // 1. Temukan baris tanggal
  let dateRowIdx = -1;
  for (let r = 0; r < Math.min(8, values.length); r++) {
    const numCount = values[r].filter(v => isDayValue(v)).length;
    if (numCount >= 15) {
      dateRowIdx = r;
      break;
    }
  }

  if (dateRowIdx === -1) {
    let maxCount = 0;
    for (let r = 0; r < Math.min(8, values.length); r++) {
      const numCount = values[r].filter(v => isDayValue(v)).length;
      if (numCount > maxCount) { maxCount = numCount; dateRowIdx = r; }
    }
    if (maxCount < 5) {
      return { items: [], daysInMonth: 30, activeDays: [], daftarRuangan: [], headers: [], jenis: 'Kebersihan' };
    }
  }

  const monthHeaderRowIdx = dateRowIdx - 1;

  // 2. Ekstrak jenis monitoring
  let jenis = 'Kebersihan';
  for (let r = 0; r <= Math.max(0, monthHeaderRowIdx); r++) {
    for (let c = 0; c < Math.min(values[r].length, 6); c++) {
      const cellVal = String(values[r][c] || '').toUpperCase().trim();
      if (cellVal.includes('RESEPSIONIS') || cellVal.includes('PELAYANAN') || cellVal.includes('PST') || cellVal.includes('STANDAR PELAYANAN')) {
        jenis = 'Pelayanan';
        break;
      } else if (cellVal.includes('KEAMANAN') || cellVal.includes('SECURITY')) {
        jenis = 'Keamanan';
        break;
      } else if (cellVal.includes('KEBERSIHAN')) {
        jenis = 'Kebersihan';
      }
    }
  }

  if (jenis === 'Kebersihan' && sheet) {
    const sNameUpper = String(sheet.getName() || '').toUpperCase();
    const sNameAlpha = getAlphaOnly(sNameUpper);
    if (sNameUpper.includes('PELAYANAN') || sNameUpper.includes('RESEPSIONIS') || sNameUpper.includes('PST')) {
      jenis = 'Pelayanan';
    } else if (sNameUpper.includes('KEAMANAN') || sNameUpper.includes('SECURITY')) {
      jenis = 'Keamanan';
    } else {
      const pelayananNames = ['mawardi', 'ardi', 'ranianailahusna', 'rania', 'alfianaayuni', 'alfiana'];
      for (let p = 0; p < pelayananNames.length; p++) {
        const pAlpha = getAlphaOnly(pelayananNames[p]);
        if (sNameAlpha === pAlpha || (sNameAlpha.length >= 4 && (sNameAlpha.indexOf(pAlpha) >= 0 || pAlpha.indexOf(sNameAlpha) >= 0))) {
          jenis = 'Pelayanan';
          break;
        }
      }
      if (jenis === 'Kebersihan') {
        const securityNames = ['eddysuryadi', 'eddy', 'syarifrezanopriadrianalkadri', 'syarifreza', 'syreza', 'reza', 'feriyustami', 'feri', 'rizkifadil', 'rizki', 'ekoprasetyo', 'eko', 'agustetriansyah', 'agus'];
        for (let s = 0; s < securityNames.length; s++) {
          const sAlpha = getAlphaOnly(securityNames[s]);
          if (sNameAlpha === sAlpha || (sNameAlpha.length >= 4 && (sNameAlpha.indexOf(sAlpha) >= 0 || sAlpha.indexOf(sNameAlpha) >= 0))) {
            jenis = 'Keamanan';
            break;
          }
        }
      }
    }
  }

  // 3. Bangun peta bulan
  const monthStartColMap = {};
  if (monthHeaderRowIdx >= 0) {
    values[monthHeaderRowIdx].forEach((cell, colIdx) => {
      if (cell && typeof cell === 'string') {
        const cellUpper = cell.trim().toUpperCase();
        for (const mName in MONTH_MAP_ID) {
          if (cellUpper === mName || cellUpper.indexOf(mName) >= 0) {
            monthStartColMap[MONTH_MAP_ID[mName]] = colIdx;
          }
        }
      }
    });
  }

  // 4. Kolom kegiatan
  const dateRow = values[dateRowIdx];
  let firstDateColIdx = -1;
  for (let c = 0; c < dateRow.length; c++) {
    if (isDayValue(dateRow[c])) {
      firstDateColIdx = c;
      break;
    }
  }

  if (firstDateColIdx < 0) {
    return { items: [], daysInMonth: 30, activeDays: [], daftarRuangan: [], headers: [], jenis };
  }

  const kegiatanColIdx = firstDateColIdx > 0 ? firstDateColIdx - 1 : 0;

  // 5. Rentang kolom bulan terpilih
  let monthStartCol = monthStartColMap[selectedMonth];

  if (monthStartCol === undefined) {
    if (Object.keys(monthStartColMap).length === 0) {
      monthStartCol = firstDateColIdx;
    } else {
      return { items: [], daysInMonth: 30, activeDays: [], daftarRuangan: [], headers: [], jenis };
    }
  }

  let monthEndCol = dateRow.length - 1;
  Object.values(monthStartColMap).forEach(startCol => {
    if (startCol > monthStartCol && startCol <= monthEndCol) {
      monthEndCol = startCol - 1;
    }
  });

  // 6. Peta hari -> kolom aktual
  const dayColMap = {};
  const activeDays = [];

  for (let c = monthStartCol; c <= monthEndCol; c++) {
    const dayNum = parseDayNum(dateRow[c]);
    if (dayNum !== null && dayNum >= 1 && dayNum <= 31) {
      dayColMap[dayNum] = c + 1;
      activeDays.push(dayNum);
    }
  }

  activeDays.sort((a, b) => a - b);
  const daysInMonth = activeDays.length > 0 ? Math.max.apply(null, activeDays) : 30;

  // 7. Parse baris kegiatan
  let dataStartRow = dateRowIdx + 1;
  if (dataStartRow < values.length) {
    const nextRow = values[dataStartRow];
    const HARI_REGEX = /^(sen|sel|rab|kam|jum|sab|min|senin|selasa|rabu|kamis|jumat|sabtu|minggu|s|r|k|j|m|ju|sa|mi|ra|ka)$/i;
    let hariCount = 0;
    for (let c = 0; c < nextRow.length; c++) {
      const cell = String(nextRow[c] || '').trim();
      if (cell && HARI_REGEX.test(cell)) hariCount++;
    }
    if (hariCount >= 4) {
      dataStartRow = dateRowIdx + 2;
    }
  }
  let currentRuangan = 'Umum';
  const items = [];
  const ruanganSet = new Set();

  for (let r = dataStartRow; r < values.length; r++) {
    const row = values[r];
    const kegiatanRaw = row[kegiatanColIdx];
    const kegiatanText = String(kegiatanRaw !== null && kegiatanRaw !== undefined ? kegiatanRaw : '').trim();

    if (!kegiatanText) continue;

    const upperText = kegiatanText.toUpperCase();
    let shouldSkip = false;
    for (let k = 0; k < SKIP_ROW_KEYWORDS.length; k++) {
      if (upperText === SKIP_ROW_KEYWORDS[k] || upperText.indexOf(SKIP_ROW_KEYWORDS[k]) === 0) {
        shouldSkip = true;
        break;
      }
    }
    if (shouldSkip) continue;

    let hasCheckboxData = false;
    for (let di = 0; di < activeDays.length; di++) {
      const d = activeDays[di];
      const val = row[dayColMap[d] - 1];
      const valStr = String(val || '').trim().toUpperCase();
      if (val === true || val === false || val === 1 || val === 0 || val === '1' || val === '0' || val === '✓' || valStr === 'TRUE' || valStr === 'FALSE' || valStr === 'V') {
        hasCheckboxData = true;
        break;
      }
    }

    if (!hasCheckboxData) {
      currentRuangan = kegiatanText;
      ruanganSet.add(currentRuangan);
      continue;
    }

    ruanganSet.add(currentRuangan);

    const dailyStatus = {};
    let selesaiCount = 0;
    let scheduledDaysCount = 0;

    activeDays.forEach(d => {
      const colIdx0 = dayColMap[d] - 1;
      const val = row[colIdx0];
      const dateObj = new Date(selectedYear, selectedMonth - 1, d);
      const isWeekend = (dateObj.getDay() === 0 || dateObj.getDay() === 6);

      if (val === true || val === 1 || val === '1' || val === '✓') {
        dailyStatus[d] = '1';
        selesaiCount++;
        scheduledDaysCount++;
      } else if (val === false || val === 0 || val === '0') {
        // Jika akhir pekan (Sabtu/Minggu) pada unit Kebersihan/Pelayanan dan tidak ada tugas khusus, tandai non-aktif
        if (isWeekend && jenis !== 'Keamanan') {
          dailyStatus[d] = '-';
        } else {
          dailyStatus[d] = '0';
          scheduledDaysCount++;
        }
      } else {
        dailyStatus[d] = '-';
      }
    });

    items.push({
      sheetRowIndex: r + 1,
      ruangan: currentRuangan,
      jenis: jenis,
      kegiatan: kegiatanText,
      dailyStatus: dailyStatus,
      colMapping: dayColMap,
      totalHariAktif: scheduledDaysCount,
      selesaiCount: selesaiCount
    });
  }

  const result = {
    items: items,
    daysInMonth: daysInMonth,
    activeDays: activeDays,
    headers: dateRow,
    daftarRuangan: Array.from(ruanganSet),
    jenis: jenis
  };

  // Simpan ke in-memory cache dan CacheService untuk akselerasi
  if (typeof _cachedParsedMonitoring !== 'undefined' && _cachedParsedMonitoring) {
    _cachedParsedMonitoring[memKey] = result;
  }

  try {
    const ttl = (typeof CACHE_TTL_SEC !== 'undefined' && CACHE_TTL_SEC) ? CACHE_TTL_SEC : 60;
    CacheService.getScriptCache().put(cacheKey, JSON.stringify(result), ttl);
  } catch (ce) { /* ignore cache write error */ }

  return result;
}

// <<<<<<<<<< END MODUL: backend/StaffMonitoring.gs <<<<<<<<<<


// >>>>>>>>>> MODUL: backend/Security.gs >>>>>>>>>>

/**
 * ========================================================================
 * SIMPEL-KU - SECURITY SCHEDULE & SHIFT MANAGEMENT MODULE
 * ========================================================================
 */

function findEmployeeRowInJadwal(values, session, dataStartRow) {
  let bestMatch = { rowIdx: -1, score: 0, cellText: '' };
  const startRow = (typeof dataStartRow === 'number' && dataStartRow >= 0) ? dataStartRow : 0;

  for (let r = startRow; r < values.length; r++) {
    const row = values[r];
    if (!row || row.length === 0) continue;

    for (let c = 0; c < Math.min(row.length, 6); c++) {
      const cellVal = row[c];
      const score = calculateMatchScore(cellVal, session);
      if (score > bestMatch.score) {
        bestMatch = { rowIdx: r, score: score, cellText: String(cellVal) };
        if (score === 100) break;
      }
    }
    if (bestMatch.score === 100) break;
  }

  return (bestMatch.score >= 85) ? bestMatch.rowIdx : -1;
}

/**
 * Dynamic Grid Parser untuk Sheet Jadwal Piket
 * Mampu mendeteksi posisi baris tanggal, baris hari, serta mempartisi kolom per bulan
 * sehingga hanya menampilkan hari aktif untuk bulan terpilih (tidak berulang 105 hari).
 */

function parseJadwalGrid(values, selectedMonth) {
  if (!values || values.length < 3) return null;

  // 1. Temukan baris tanggal (mencari baris dengan jumlah angka 1..31 terbanyak pada 8 baris pertama)
  let dateRowIdx = -1;
  let maxDateCount = 0;

  for (let r = 0; r < Math.min(8, values.length); r++) {
    let count = 0;
    const row = values[r] || [];
    for (let c = 0; c < row.length; c++) {
      const v = row[c];
      const num = typeof v === 'number' ? v : (typeof v === 'string' && /^\d{1,2}$/.test(v.trim()) ? Number(v.trim()) : null);
      if (num !== null && num >= 1 && num <= 31) {
        count++;
      }
    }
    if (count > maxDateCount) {
      maxDateCount = count;
      dateRowIdx = r;
    }
  }

  if (dateRowIdx === -1 || maxDateCount < 5) {
    return { error: "Baris tanggal tidak ditemukan pada sheet jadwal." };
  }

  const dateRow = values[dateRowIdx];

  // 2. Temukan baris nama hari (Sen, Sel, Rab, Kam, Jum, Sab, Min / Ju, Sa, Mi, dll)
  let dayRowIdx = -1;
  const HARI_REGEX = /^(sen|sel|rab|kam|jum|sab|min|senin|selasa|rabu|kamis|jumat|sabtu|minggu|s|r|k|j|m|ju|sa|mi|ra|ka)$/i;

  const candidateRows = [dateRowIdx + 1, dateRowIdx - 1];
  for (let ci = 0; ci < candidateRows.length; ci++) {
    const cr = candidateRows[ci];
    if (cr >= 0 && cr < values.length) {
      let hariCount = 0;
      for (let c = 0; c < values[cr].length; c++) {
        const cell = String(values[cr][c] || '').trim();
        if (cell && HARI_REGEX.test(cell)) hariCount++;
      }
      if (hariCount >= 4) {
        dayRowIdx = cr;
        break;
      }
    }
  }

  const dayRow = dayRowIdx !== -1 ? values[dayRowIdx] : [];

  // 3. Peta kolom awal per bulan dari baris-baris di atas baris tanggal
  const monthStartColMap = {};
  for (let r = 0; r < dateRowIdx; r++) {
    const row = values[r] || [];
    for (let c = 0; c < row.length; c++) {
      const cellVal = row[c];
      if (cellVal && typeof cellVal === 'string') {
        const cellUpper = cellVal.trim().toUpperCase();
        for (const mName in MONTH_MAP_ID) {
          if (cellUpper === mName || cellUpper.indexOf(mName) >= 0) {
            const mNum = MONTH_MAP_ID[mName];
            if (monthStartColMap[mNum] === undefined || c < monthStartColMap[mNum]) {
              monthStartColMap[mNum] = c;
            }
          }
        }
      }
    }
  }

  // 4. Deteksi semua kolom tanggal yang valid
  const allDateCols = [];
  for (let c = 0; c < dateRow.length; c++) {
    const v = dateRow[c];
    const dayNum = typeof v === 'number' ? v : (typeof v === 'string' && /^\d{1,2}$/.test(v.trim()) ? Number(v.trim()) : null);
    if (dayNum !== null && dayNum >= 1 && dayNum <= 31) {
      allDateCols.push({
        colIdx: c,
        tanggal: dayNum,
        hari: dayRow[c] ? String(dayRow[c]).trim() : ''
      });
    }
  }

  if (allDateCols.length === 0) {
    return { error: "Tidak ada kolom tanggal yang ditemukan." };
  }

  let targetCols = [];

  // 5. Filter kolom sesuai selectedMonth jika ada monthStartColMap
  const monthKeys = Object.keys(monthStartColMap).map(Number).sort(function(a, b) { return a - b; });

  if (monthKeys.length > 0 && monthStartColMap[selectedMonth] !== undefined) {
    const startCol = monthStartColMap[selectedMonth];
    let nextStartCol = Infinity;
    for (let k = 0; k < monthKeys.length; k++) {
      const m = monthKeys[k];
      if (monthStartColMap[m] > startCol && monthStartColMap[m] < nextStartCol) {
        nextStartCol = monthStartColMap[m];
      }
    }

    targetCols = allDateCols.filter(function(col) {
      return col.colIdx >= startCol && col.colIdx < nextStartCol;
    });
  }

  // 6. Jika tidak ditemukan lewat monthStartColMap, partisi berdasarkan blok siklus tanggal
  if (targetCols.length === 0) {
    const blocks = [];
    let currentBlock = [];

    for (let i = 0; i < allDateCols.length; i++) {
      const curr = allDateCols[i];
      const prev = allDateCols[i - 1];

      if (prev) {
        if ((prev.tanggal >= 28 && curr.tanggal === 1) || (curr.colIdx - prev.colIdx > 3)) {
          blocks.push(currentBlock);
          currentBlock = [];
        }
      }
      currentBlock.push(curr);
    }
    if (currentBlock.length > 0) {
      blocks.push(currentBlock);
    }

    if (blocks.length > 1) {
      const blockIdx = (selectedMonth - 1) % blocks.length;
      targetCols = blocks[blockIdx];
    } else {
      targetCols = blocks[0] || allDateCols;
    }
  }

  // 7. Bersihkan duplikasi tanggal agar pas 1 bulan penuh (28..31 hari)
  const schedCols = [];
  for (let i = 0; i < targetCols.length; i++) {
    const col = targetCols[i];
    if (schedCols.length >= 28 && col.tanggal === 1) {
      break;
    }
    schedCols.push(col);
  }

  const dataStartRow = Math.max(dateRowIdx, dayRowIdx) + 1;

  return {
    schedCols: schedCols,
    dataStartRow: dataStartRow
  };
}

/**
 * Mengambil Jadwal Piket Keamanan dari sheet JadwalPiketSecurity / JadwalPiket
 */

function getJadwalKeamanan(token, bulan, tahun) {
  try {
    const session = getSessionUser(token);
    if (!session) {
      return { success: false, message: "Sesi tidak valid. Silakan login kembali." };
    }

    const ss = getDb();
    const jadwalSheet = findJadwalSheet(ss);
    if (!jadwalSheet) {
      return { success: false, message: "Sheet jadwal piket keamanan tidak ditemukan pada spreadsheet." };
    }

    const selectedMonth = bulan ? Number(bulan) : (new Date().getMonth() + 1);

    let rawValues = (typeof _cachedJadwalRawValues !== 'undefined' && _cachedJadwalRawValues) ? _cachedJadwalRawValues : null;
    let displayValues = (typeof _cachedJadwalDispValues !== 'undefined' && _cachedJadwalDispValues) ? _cachedJadwalDispValues : null;
    if (!rawValues || !displayValues) {
      rawValues = jadwalSheet.getDataRange().getValues();
      displayValues = jadwalSheet.getDataRange().getDisplayValues();
      if (typeof _cachedJadwalRawValues !== 'undefined') _cachedJadwalRawValues = rawValues;
      if (typeof _cachedJadwalDispValues !== 'undefined') _cachedJadwalDispValues = displayValues;
    }

    let gridResult = (typeof _cachedJadwalGrid !== 'undefined' && _cachedJadwalGrid[selectedMonth]) ? _cachedJadwalGrid[selectedMonth] : null;
    if (!gridResult) {
      gridResult = parseJadwalGrid(rawValues, selectedMonth);
      if (typeof _cachedJadwalGrid !== 'undefined' && gridResult && !gridResult.error) {
        _cachedJadwalGrid[selectedMonth] = gridResult;
      }
    }
    if (!gridResult || gridResult.error) {
      return { success: false, message: gridResult ? gridResult.error : "Format tabel jadwal tidak dapat dibaca." };
    }

    const schedCols = gridResult.schedCols;
    if (!schedCols || schedCols.length === 0) {
      return { success: false, message: "Data tanggal jadwal untuk bulan terpilih belum tersedia." };
    }

    // Pencarian baris pegawai dengan smart matching di seluruh baris sheet
    let employeeRowIdx = findEmployeeRowInJadwal(rawValues, session, 0);
    if (employeeRowIdx === -1 && displayValues) {
      employeeRowIdx = findEmployeeRowInJadwal(displayValues, session, 0);
    }

    if (employeeRowIdx === -1) {
      return {
        success: false,
        message: "Jadwal piket untuk '" + session.namaPegawai + "' (" + session.username + ") tidak ditemukan pada sheet " + jadwalSheet.getName() + "."
      };
    }

    const SHIFT_LABEL = { 'P': 'Pagi', 'S': 'Sore', 'M': 'Malam', 'O': 'Libur' };
    const empRow = rawValues[employeeRowIdx];
    const empDispRow = displayValues && displayValues[employeeRowIdx] ? displayValues[employeeRowIdx] : empRow;

    const jadwal = schedCols.map(function(col) {
      var rawKode = String(empRow[col.colIdx] !== undefined && empRow[col.colIdx] !== null ? empRow[col.colIdx] : (empDispRow[col.colIdx] || '')).trim().toUpperCase();
      var kode = 'O';

      if (rawKode === 'P' || rawKode.indexOf('PAGI') >= 0 || rawKode === '1') {
        kode = 'P';
      } else if (rawKode === 'S' || rawKode.indexOf('SORE') >= 0 || rawKode.indexOf('SIANG') >= 0 || rawKode === '2') {
        kode = 'S';
      } else if (rawKode === 'M' || rawKode.indexOf('MALAM') >= 0 || rawKode === '3') {
        kode = 'M';
      } else {
        kode = 'O';
      }

      return {
        tanggal: col.tanggal,
        hari: col.hari,
        kodeShift: kode,
        namaShift: SHIFT_LABEL[kode] || 'Libur',
        isLibur: kode === 'O'
      };
    });

    var summary = { P: 0, S: 0, M: 0, O: 0 };
    jadwal.forEach(function(j) {
      if (j.kodeShift in summary) summary[j.kodeShift]++;
    });

    let taskItems = [];
    const empSheet = findEmployeeSheet(ss, session.namaSheet, session.namaPegawai, session.username);
    if (empSheet) {
      const parsedTasks = readSheetMonitoring(empSheet, bulan, tahun);
      taskItems = parsedTasks.items || [];
    } else {
      // Standar checklist tugas keamanan jika belum memiliki sheet personal terpisah
      const defaultTasks = [
        { row: 101, ruangan: 'PAGI (06.00-07.30)', kegiatan: 'Mengatur lalu lintas dan membantu menyeberangkan karyawan ke kantor' },
        { row: 102, ruangan: 'PAGI (06.00-07.30)', kegiatan: 'Mengatur dan mengarahkan parkiran kendaraan roda-4' },
        { row: 103, ruangan: 'PAGI (06.00-07.30)', kegiatan: 'Menyambut dan membukakan pintu kendaraan pimpinan' },
        { row: 104, ruangan: 'PAGI (06.00-07.30)', kegiatan: 'Merapikan susunan kendaraan roda 2 di parkiran samping dan belakang' },
        { row: 105, ruangan: 'SELAMA JAM KERJA (07.30-16.00)', kegiatan: 'Patroli keamanan gedung, aset dan karyawan kantor secara berkala setiap 2 jam dan memeriksa area kantor melalui CCTV' },
        { row: 106, ruangan: 'SELAMA JAM KERJA (07.30-16.00)', kegiatan: 'Mengawasi keluar masuk orang, barang dan kendaraan, mendokumentasikan dan melaporkan hal mencurigakan' },
        { row: 107, ruangan: 'SELAMA JAM KERJA (07.30-16.00)', kegiatan: 'Menyambut tamu, memeriksa identitas dan mengarahkan tamu ke front office/ruang tunggu' },
        { row: 108, ruangan: 'MALAM', kegiatan: 'Patroli keamanan gedung secara berkala dan memeriksa area kantor melalui CCTV' },
        { row: 109, ruangan: 'MALAM', kegiatan: 'Memastikan pintu, jendela, dan ruangan penting terkunci dengan baik' },
        { row: 110, ruangan: 'MALAM', kegiatan: 'Mencegah potensi bahaya seperti kebakaran atau pencurian' }
      ];

      const colMapping = {};
      schedCols.forEach(function(sc) { colMapping[sc.tanggal] = sc.colIdx + 1; });

      taskItems = defaultTasks.map(function(t) {
        const dailyStatus = {};
        schedCols.forEach(function(sc) { dailyStatus[sc.tanggal] = '0'; });
        return {
          sheetRowIndex: t.row,
          ruangan: t.ruangan,
          jenis: 'Keamanan',
          kegiatan: t.kegiatan,
          dailyStatus: dailyStatus,
          colMapping: colMapping
        };
      });
    }

    const curYearNum = tahun ? Number(tahun) : new Date().getFullYear();
    const bMap = getBuktiDukungMap(ss, selectedMonth, curYearNum);
    taskItems.forEach(function(t) {
      t.dailyEvidence = {};
      schedCols.forEach(function(sc) {
        const d = sc.tanggal;
        const tKey = generateTaskKey(curYearNum, selectedMonth, d, session.username || session.namaPegawai, t.ruangan, t.kegiatan);
        const fKey = [d, getAlphaOnly(session.namaPegawai || session.username), getAlphaOnly(t.kegiatan)].join('_');
        const rec = bMap.map[tKey] || bMap.fallbackMap[fKey];
        if (rec) {
          t.dailyEvidence[d] = {
            adaBukti: rec.adaBuktiDukung,
            fileId: rec.fileIdDrive,
            fileUrl: rec.fileUrlDrive,
            fileName: rec.fileName,
            koordinat: rec.koordinat,
            lokasi: rec.lokasi,
            waktu: rec.waktu,
            statusPengawas: rec.statusPengawas,
            namaPengawas: rec.namaPengawas,
            waktuValidasiPengawas: rec.waktuValidasiPengawas,
            taskKey: rec.taskKey || tKey
          };
        } else {
          t.dailyEvidence[d] = {
            adaBukti: false,
            fileId: '',
            fileUrl: '',
            fileName: '',
            koordinat: '',
            lokasi: '',
            waktu: '',
            statusPengawas: false,
            namaPengawas: '',
            waktuValidasiPengawas: '',
            taskKey: tKey
          };
        }
      });
    });

    return {
      success: true,
      data: {
        namaPegawai: session.namaPegawai,
        jadwal: jadwal,
        summary: summary,
        totalHariKerja: (summary.P || 0) + (summary.S || 0) + (summary.M || 0),
        taskItems: taskItems
      }
    };

  } catch (err) {
    return { success: false, message: "Gagal memuat jadwal: " + err.message };
  }
}

function getJadwalKeamananInternal(ss, userObj, bulan, tahun) {
  try {
    const jadwalSheet = findJadwalSheet(ss);
    if (!jadwalSheet) return null;

    const rawValues = jadwalSheet.getDataRange().getValues();
    const displayValues = jadwalSheet.getDataRange().getDisplayValues();
    const grid = parseJadwalGrid(rawValues, bulan);
    if (!grid || !grid.schedCols) return null;

    let employeeRowIdx = findEmployeeRowInJadwal(rawValues, userObj, 0);
    if (employeeRowIdx === -1 && displayValues) {
      employeeRowIdx = findEmployeeRowInJadwal(displayValues, userObj, 0);
    }
    if (employeeRowIdx === -1) return null;

    const SHIFT_LABEL = { 'P': 'Pagi', 'S': 'Sore', 'M': 'Malam', 'O': 'Libur' };
    const empRow = rawValues[employeeRowIdx];
    const empDispRow = (displayValues && displayValues[employeeRowIdx]) ? displayValues[employeeRowIdx] : empRow;

    const jadwal = grid.schedCols.map(col => {
      const rawKode = String(empRow[col.colIdx] !== undefined && empRow[col.colIdx] !== null ? empRow[col.colIdx] : (empDispRow[col.colIdx] || '')).trim().toUpperCase();
      let kode = 'O';
      if (rawKode === 'P' || rawKode.includes('PAGI') || rawKode === '1') kode = 'P';
      else if (rawKode === 'S' || rawKode.includes('SORE') || rawKode.includes('SIANG') || rawKode === '2') kode = 'S';
      else if (rawKode === 'M' || rawKode.includes('MALAM') || rawKode === '3') kode = 'M';
      else kode = 'O';

      return {
        tanggal: col.tanggal,
        hari: col.hari,
        kodeShift: kode,
        namaShift: SHIFT_LABEL[kode] || 'Libur',
        isLibur: kode === 'O'
      };
    });

    const defaultTasks = [
      { row: 101, ruangan: 'PAGI (06.00-07.30)', kegiatan: 'Mengatur lalu lintas dan membantu menyeberangkan karyawan ke kantor' },
      { row: 102, ruangan: 'PAGI (06.00-07.30)', kegiatan: 'Mengatur dan mengarahkan parkiran kendaraan roda-4' },
      { row: 103, ruangan: 'PAGI (06.00-07.30)', kegiatan: 'Menyambut dan membukakan pintu kendaraan pimpinan' },
      { row: 104, ruangan: 'PAGI (06.00-07.30)', kegiatan: 'Merapikan susunan kendaraan roda 2 di parkiran samping dan belakang' },
      { row: 105, ruangan: 'SELAMA JAM KERJA (07.30-16.00)', kegiatan: 'Patroli keamanan gedung, aset dan karyawan kantor secara berkala setiap 2 jam dan memeriksa area kantor melalui CCTV' },
      { row: 106, ruangan: 'SELAMA JAM KERJA (07.30-16.00)', kegiatan: 'Mengawasi keluar masuk orang, barang dan kendaraan, mendokumentasikan dan melaporkan hal mencurigakan' },
      { row: 107, ruangan: 'SELAMA JAM KERJA (07.30-16.00)', kegiatan: 'Menyambut tamu, memeriksa identitas dan mengarahkan tamu ke front office/ruang tunggu' },
      { row: 108, ruangan: 'MALAM (23.00-07.30)', kegiatan: 'Patroli keamanan gedung secara berkala dan memeriksa area kantor melalui CCTV' },
      { row: 109, ruangan: 'MALAM (23.00-07.30)', kegiatan: 'Memastikan pintu, jendela, dan ruangan penting terkunci dengan baik' },
      { row: 110, ruangan: 'MALAM (23.00-07.30)', kegiatan: 'Mencegah potensi bahaya seperti kebakaran atau pencurian' }
    ];

    const colMapping = {};
    grid.schedCols.forEach(sc => { colMapping[sc.tanggal] = sc.colIdx + 1; });

    let finalTasks = defaultTasks;
    const empSheet = findEmployeeSheet(ss, userObj.namaSheet, userObj.namaPegawai, userObj.username);
    if (empSheet) {
      const parsedTasks = readSheetMonitoring(empSheet, bulan, tahun);
      if (parsedTasks && parsedTasks.items && parsedTasks.items.length > 0) {
        finalTasks = parsedTasks.items;
      }
    }

    return {
      success: true,
      jadwal: jadwal,
      taskItems: finalTasks,
      colMapping: colMapping,
      sheetRowIndex: employeeRowIdx + 1
    };
  } catch (err) {
    return null;
  }
}

function getJadwalPiketSecurityMatrix(token, bulan, tahun) {
  try {
    const session = getSessionUser(token);
    if (!session) return { success: false, message: "Sesi tidak valid." };

    const selectedMonth = bulan ? Number(bulan) : (new Date().getMonth() + 1);
    const selectedYear = tahun ? Number(tahun) : new Date().getFullYear();

    const cacheKey = "cache_sec_matrix_" + selectedMonth + "_" + selectedYear;
    const cached = getScriptCacheData(cacheKey);
    if (cached) return { success: true, data: cached };

    const ss = getDb();
    if (!ss) return { success: false, message: "Koneksi spreadsheet gagal." };

    const jadwalSheet = findJadwalSheet(ss);
    if (!jadwalSheet) {
      return { success: false, message: "Sheet JadwalPiketSecurity tidak ditemukan." };
    }

    const rawValues = jadwalSheet.getDataRange().getValues();
    const dispValues = jadwalSheet.getDataRange().getDisplayValues();
    const grid = parseJadwalGrid(rawValues, selectedMonth);

    if (!grid || !grid.schedCols || !grid.schedCols.length) {
      return { success: false, message: "Format kolom tanggal pada jadwal security bulan " + selectedMonth + " tidak terdeteksi." };
    }

    const allUsers = getAllUsersList(ss);
    const secOfficers = allUsers.filter(u => {
      const r = (u.role || '').toLowerCase();
      const unit = (u.unit || '').toLowerCase();
      return r.includes('keamanan') || unit.includes('keamanan') || r.includes('satpam') || r.includes('security');
    });

    const officersMatrix = [];

    secOfficers.forEach(officer => {
      const empRowIdx = findEmployeeRowInJadwal(rawValues, officer, 0);
      const rowData = empRowIdx !== -1 ? rawValues[empRowIdx] : null;
      const rowDisp = empRowIdx !== -1 ? (dispValues[empRowIdx] || rowData) : null;

      const schedule = grid.schedCols.map(col => {
        let kode = 'O';
        if (rowData) {
          const rawKode = String(rowData[col.colIdx] !== undefined && rowData[col.colIdx] !== null ? rowData[col.colIdx] : (rowDisp[col.colIdx] || '')).trim().toUpperCase();
          if (rawKode === 'P' || rawKode.includes('PAGI') || rawKode === '1') kode = 'P';
          else if (rawKode === 'S' || rawKode.includes('SORE') || rawKode.includes('SIANG') || rawKode === '2') kode = 'S';
          else if (rawKode === 'M' || rawKode.includes('MALAM') || rawKode === '3') kode = 'M';
          else kode = 'O';
        }
        return {
          tanggal: col.tanggal,
          hari: col.hari,
          colIdx: col.colIdx,
          kodeShift: kode
        };
      });

      const summary = { P: 0, S: 0, M: 0, O: 0, totalHariKerja: 0 };
      schedule.forEach(s => {
        summary[s.kodeShift] = (summary[s.kodeShift] || 0) + 1;
        if (s.kodeShift !== 'O') summary.totalHariKerja++;
      });

      officersMatrix.push({
        namaPegawai: officer.namaPegawai,
        username: officer.username,
        nip: officer.nip,
        rowIdx: empRowIdx + 1,
        schedule: schedule,
        summary: summary
      });
    });

    const resultPayload = {
      bulan: selectedMonth,
      tahun: selectedYear,
      schedCols: grid.schedCols,
      officers: officersMatrix
    };

    putScriptCacheData(cacheKey, resultPayload, 120);

    return {
      success: true,
      data: resultPayload
    };

  } catch (err) {
    return { success: false, message: "Gagal memuat matriks jadwal security: " + err.message };
  }
}

function updateSecurityShift(token, namaPegawai, tanggal, shiftBaru, bulan, tahun) {
  try {
    const session = getSessionUser(token);
    if (!session) return { success: false, message: "Sesi telah berakhir." };

    const role = (session.role || '').toLowerCase();
    if (!role.includes('admin') && !role.includes('supervisor') && !role.includes('kabag') && !role.includes('korlap') && !role.includes('koordinator') && !role.includes('humas')) {
      return { success: false, message: "Akses ditolak. Anda tidak memiliki wewenang mengubah jadwal." };
    }

    const ss = getDb();
    if (!ss) return { success: false, message: "Koneksi spreadsheet gagal." };

    const empName = (typeof namaPegawai === 'object' && namaPegawai !== null)
      ? (namaPegawai.namaPegawai || namaPegawai.nama || namaPegawai.username)
      : namaPegawai;
    const targetDay = (typeof tanggal === 'object' && tanggal !== null)
      ? (tanggal.tanggal || tanggal.dayNum)
      : Number(tanggal);
    const newShiftCode = String(shiftBaru || 'O').toUpperCase();

    const jadwalSheet = findJadwalSheet(ss);
    if (!jadwalSheet) return { success: false, message: "Sheet JadwalPiketSecurity tidak ditemukan." };

    const rawValues = jadwalSheet.getDataRange().getValues();
    const selectedMonth = bulan ? Number(bulan) : (new Date().getMonth() + 1);
    const selectedYear = tahun ? Number(tahun) : new Date().getFullYear();
    const grid = parseJadwalGrid(rawValues, selectedMonth);

    if (!grid || !grid.schedCols) return { success: false, message: "Kolom jadwal tidak valid." };

    const targetCol = grid.schedCols.find(c => c.tanggal === Number(targetDay));
    if (!targetCol) return { success: false, message: "Kolom tanggal " + targetDay + " tidak ditemukan." };

    const fakeUser = { username: empName, namaPegawai: empName };
    const employeeRowIdx = findEmployeeRowInJadwal(rawValues, fakeUser, 0);

    if (employeeRowIdx === -1) {
      return { success: false, message: "Pegawai " + empName + " tidak ditemukan dalam sheet jadwal." };
    }

    const rowNum = employeeRowIdx + 1;
    const colNum = targetCol.colIdx + 1;

    jadwalSheet.getRange(rowNum, colNum).setValue(newShiftCode);

    clearScriptCacheKeys([
      "cache_sec_matrix_" + selectedMonth + "_" + selectedYear,
      "cache_spv_dash_" + selectedMonth + "_" + selectedYear,
      "cache_rekap_terpadu_" + selectedMonth + "_" + selectedYear
    ]);
    resetMemoryCache();

    return {
      success: true,
      message: `Jadwal ${empName} tgl ${targetDay} berhasil diubah ke Shift ${newShiftCode}.`,
      updated: { namaPegawai: empName, tanggal: targetDay, shiftBaru: newShiftCode }
    };
  } catch (err) {
    return { success: false, message: "Gagal memperbarui shift: " + err.message };
  }
}

function swapSecurityShift(token, pegawai1, pegawai2, tanggal1, tanggal2, bulan, tahun) {
  try {
    const session = getSessionUser(token);
    if (!session) return { success: false, message: "Sesi telah berakhir." };

    const role = (session.role || '').toLowerCase();
    if (!role.includes('admin') && !role.includes('supervisor') && !role.includes('kabag') && !role.includes('korlap') && !role.includes('koordinator') && !role.includes('humas')) {
      return { success: false, message: "Akses ditolak." };
    }

    const ss = getDb();
    if (!ss) return { success: false, message: "Koneksi spreadsheet gagal." };

    // Support flexible arguments (objects, single date vs two dates, etc.)
    let name1 = pegawai1;
    let name2 = pegawai2;
    let d1 = tanggal1;
    let d2 = tanggal2;
    let m = bulan;
    let y = tahun;

    if (pegawai1 && typeof pegawai1 === 'object') {
      name1 = pegawai1.namaPegawai || pegawai1.nama || pegawai1.username;
      d1 = pegawai1.tanggal || pegawai1.dayNum;
      if (pegawai2 && typeof pegawai2 === 'object') {
        name2 = pegawai2.namaPegawai || pegawai2.nama || pegawai2.username;
        d2 = pegawai2.tanggal || pegawai2.dayNum;
      }
      m = tanggal1;
      y = tanggal2;
    } else if (y === undefined) {
      if (typeof tanggal2 === 'number' && typeof bulan === 'number' && bulan >= 2020) {
        y = bulan;
        m = tanggal2;
        d2 = d1;
      } else if (d2 === undefined || d2 === null) {
        d2 = d1;
      }
    }
    if (!d2) d2 = d1;

    const jadwalSheet = findJadwalSheet(ss);
    if (!jadwalSheet) return { success: false, message: "Sheet jadwal tidak ditemukan." };

    const rawValues = jadwalSheet.getDataRange().getValues();
    const selectedMonth = m ? Number(m) : (new Date().getMonth() + 1);
    const selectedYear = y ? Number(y) : new Date().getFullYear();
    const grid = parseJadwalGrid(rawValues, selectedMonth);

    if (!grid || !grid.schedCols) return { success: false, message: "Kolom jadwal tidak valid." };

    const targetCol1 = grid.schedCols.find(c => c.tanggal === Number(d1));
    const targetCol2 = grid.schedCols.find(c => c.tanggal === Number(d2));
    if (!targetCol1 || !targetCol2) return { success: false, message: "Tanggal tidak ditemukan dalam sheet jadwal." };

    const rIdx1 = findEmployeeRowInJadwal(rawValues, { username: name1, namaPegawai: name1 }, 0);
    const rIdx2 = findEmployeeRowInJadwal(rawValues, { username: name2, namaPegawai: name2 }, 0);

    if (rIdx1 === -1 || rIdx2 === -1) {
      return { success: false, message: "Salah satu pegawai tidak ditemukan dalam jadwal." };
    }

    const val1 = rawValues[rIdx1][targetCol1.colIdx] || 'O';
    const val2 = rawValues[rIdx2][targetCol2.colIdx] || 'O';

    jadwalSheet.getRange(rIdx1 + 1, targetCol1.colIdx + 1).setValue(val2);
    jadwalSheet.getRange(rIdx2 + 1, targetCol2.colIdx + 1).setValue(val1);

    clearScriptCacheKeys([
      "cache_sec_matrix_" + selectedMonth + "_" + selectedYear,
      "cache_spv_dash_" + selectedMonth + "_" + selectedYear,
      "cache_rekap_terpadu_" + selectedMonth + "_" + selectedYear
    ]);
    resetMemoryCache();

    const tglInfo = (d1 === d2) ? `tgl ${d1}` : `tgl ${d1} dan tgl ${d2}`;
    return {
      success: true,
      message: `Shift antara ${name1} (${val1}) dan ${name2} (${val2}) pada ${tglInfo} berhasil ditukar.`
    };
  } catch (err) {
    return { success: false, message: "Gagal menukar shift: " + err.message };
  }
}

// <<<<<<<<<< END MODUL: backend/Security.gs <<<<<<<<<<


// >>>>>>>>>> MODUL: backend/Supervisor.gs >>>>>>>>>>

/**
 * ========================================================================
 * SIMPEL-KU - SUPERVISOR & ADMIN DASHBOARD / REKAPITULASI MODULE
 * ========================================================================
 */

/**
 * ========================================================================
 * 2. DASHBOARD SUPERVISOR / KASUBBAG UMUM DATA AGGREGATOR (OPTIMIZED & ROBUST)
 * ========================================================================
 */
function getSupervisorDashboardData(token, bulan, tahun) {
  try {
    const session = getSessionUser(token);
    if (!session) {
      return { success: false, message: "Sesi telah berakhir. Silakan login kembali." };
    }

    const now = new Date();
    const selectedMonth = bulan ? Number(bulan) : (now.getMonth() + 1);
    const selectedYear = tahun ? Number(tahun) : now.getFullYear();

    const cacheKey = "cache_spv_dash_" + selectedMonth + "_" + selectedYear;
    const cachedData = getScriptCacheData(cacheKey);
    if (cachedData) {
      return { success: true, data: cachedData };
    }

    const ss = getDb();
    if (!ss) return { success: false, message: "Koneksi spreadsheet gagal." };

    const allUsers = getAllUsersList(ss);
    const nonManagementStaff = allUsers.filter(u => {
      const r = (u.role || '').toLowerCase();
      return !r.includes('admin') && !r.includes('supervisor') && !r.includes('kabag');
    });

    let totalGlobalTarget = 0;
    let totalGlobalSelesai = 0;
    let totalGlobalBelum = 0;

    const unitSummary = {
      'Kebersihan': { unit: 'Kebersihan', total: 0, selesai: 0, done: 0, belum: 0, persen: 0, totalPegawai: 0 },
      'Pelayanan':  { unit: 'Pelayanan',  total: 0, selesai: 0, done: 0, belum: 0, persen: 0, totalPegawai: 0 },
      'Keamanan':   { unit: 'Keamanan',   total: 0, selesai: 0, done: 0, belum: 0, persen: 0, totalPegawai: 0 }
    };

    const rekapPegawaiList = [];
    const dataTindakLanjut = [];

    const jadwalSheet = findJadwalSheet(ss);
    let securityGrid = null;
    let secRawValues = [];
    let secDispValues = [];
    if (jadwalSheet) {
      secRawValues = jadwalSheet.getDataRange().getValues();
      secDispValues = jadwalSheet.getDataRange().getDisplayValues();
      securityGrid = parseJadwalGrid(secRawValues, selectedMonth);
    }

    const shiftSecuritySummary = {
      P: 0, S: 0, M: 0, O: 0,
      todayP: 0, todayS: 0, todayM: 0, todayO: 0,
      totalHariKerja: 0,
      petugasAktifHariIni: { P: [], S: [], M: [], O: [] },
      satpamTodayList: []
    };

    const todayDateNum = (now.getMonth() + 1 === selectedMonth && now.getFullYear() === selectedYear) ? now.getDate() : 31;

    // Process all staff
    nonManagementStaff.forEach(emp => {
      const empUnit = emp.unit || 'Kebersihan';
      if (unitSummary[empUnit]) unitSummary[empUnit].totalPegawai++;

      let empTotal = 0;
      let empSelesai = 0;
      let empBelum = 0;

      if (empUnit === 'Keamanan') {
        const resK = getJadwalKeamananInternal(ss, emp, selectedMonth, selectedYear);
        let tasksToUse = (resK && resK.taskItems && resK.taskItems.length > 0) ? resK.taskItems : [];
        const empSheet = findEmployeeSheet(ss, emp.namaSheet, emp.namaPegawai, emp.username);
        if (empSheet) {
          const parsedSecSheet = readSheetMonitoring(empSheet, selectedMonth, selectedYear);
          if (parsedSecSheet && parsedSecSheet.items && parsedSecSheet.items.length > 0) {
            tasksToUse = parsedSecSheet.items;
          }
        }

        if (resK && resK.jadwal && resK.jadwal.length > 0) {
          resK.jadwal.forEach(j => {
            const d = j.tanggal;
            const shiftKode = j.kodeShift || 'O';
            const namaShift = j.namaShift || (shiftKode === 'P' ? 'Pagi' : shiftKode === 'S' ? 'Sore' : shiftKode === 'M' ? 'Malam' : 'Libur');

            shiftSecuritySummary[shiftKode] = (shiftSecuritySummary[shiftKode] || 0) + 1;
            if (d === todayDateNum) {
              if (shiftKode === 'P') shiftSecuritySummary.todayP++;
              else if (shiftKode === 'S') shiftSecuritySummary.todayS++;
              else if (shiftKode === 'M') shiftSecuritySummary.todayM++;
              else if (shiftKode === 'O') shiftSecuritySummary.todayO++;

              shiftSecuritySummary.petugasAktifHariIni[shiftKode].push(emp.namaPegawai);
              if (shiftKode !== 'O') {
                shiftSecuritySummary.satpamTodayList.push({
                  nama: emp.namaPegawai,
                  username: emp.username,
                  shift: shiftKode,
                  posisi: shiftKode === 'P' ? 'Piket Pagi (06.00 - 16.00)' : (shiftKode === 'S' ? 'Piket Sore (15.30 - 23.30)' : 'Piket Malam (23.00 - 07.30)')
                });
              }
            }

            if (shiftKode === 'O') return;
            shiftSecuritySummary.totalHariKerja++;

            const shiftTasks = tasksToUse.filter(t => isKeamananTaskForShift(t, shiftKode));
            shiftTasks.forEach(t => {
              empTotal++;
              let isDone = false;
              if (t.dailyStatus && (t.dailyStatus[d] !== undefined && t.dailyStatus[d] !== null)) {
                const st = t.dailyStatus[d];
                isDone = (st === '1' || st === 1 || st === true);
              } else {
                const isPastOrToday = (selectedYear < now.getFullYear()) ||
                  (selectedYear === now.getFullYear() && selectedMonth < (now.getMonth() + 1)) ||
                  (selectedYear === now.getFullYear() && selectedMonth === (now.getMonth() + 1) && d <= now.getDate());
                isDone = isPastOrToday;
              }

              if (isDone) {
                empSelesai++;
              } else {
                empBelum++;
                if (d === todayDateNum && dataTindakLanjut.length < 15) {
                  dataTindakLanjut.push({
                    unit: 'Keamanan',
                    namaPegawai: emp.namaPegawai,
                    ruangan: t.ruangan || ('Shift ' + namaShift),
                    kegiatan: t.kegiatan,
                    status: 'Belum Selesai',
                    tanggal: `${todayDateNum}/${selectedMonth}/${selectedYear}`
                  });
                }
              }
            });
          });
        }
      } else {
        // Kebersihan & Pelayanan
        const empSheet = findEmployeeSheet(ss, emp.namaSheet, emp.namaPegawai, emp.username);
        let parsedSheet = null;
        if (empSheet) {
          parsedSheet = readSheetMonitoring(empSheet, selectedMonth, selectedYear);
        }

        if (parsedSheet && parsedSheet.items && parsedSheet.items.length > 0) {
          parsedSheet.items.forEach(it => {
            empTotal += (it.totalHariAktif || 0);
            empSelesai += (it.selesaiCount || 0);
            empBelum += Math.max(0, (it.totalHariAktif || 0) - (it.selesaiCount || 0));

            const stToday = it.dailyStatus ? it.dailyStatus[todayDateNum] : '-';
            if ((stToday === '0' || stToday === 0) && dataTindakLanjut.length < 15) {
              dataTindakLanjut.push({
                unit: empUnit,
                namaPegawai: emp.namaPegawai,
                ruangan: it.ruangan,
                kegiatan: it.kegiatan,
                status: 'Belum Selesai',
                tanggal: `${todayDateNum}/${selectedMonth}/${selectedYear}`
              });
            }
          });
        }
      }

      empBelum = Math.max(0, empTotal - empSelesai);
      const empPersen = (empTotal > 0 && !isNaN(empTotal)) ? Math.round((empSelesai / empTotal) * 100) : 0;

      totalGlobalTarget += empTotal;
      totalGlobalSelesai += empSelesai;
      totalGlobalBelum += empBelum;

      if (unitSummary[empUnit]) {
        unitSummary[empUnit].total += empTotal;
        unitSummary[empUnit].selesai += empSelesai;
        unitSummary[empUnit].done = unitSummary[empUnit].selesai;
        unitSummary[empUnit].belum += empBelum;
      }

      rekapPegawaiList.push({
        username: emp.username,
        namaPegawai: emp.namaPegawai,
        unit: empUnit,
        role: emp.role,
        total: empTotal,
        selesai: empSelesai,
        done: empSelesai,
        belum: empBelum,
        persen: empPersen,
        statusBadge: empPersen >= 90 ? 'Optimal' : (empPersen >= 70 ? 'Cukup' : 'Perlu Perhatian')
      });
    });

    Object.keys(unitSummary).forEach(k => {
      const u = unitSummary[k];
      u.done = u.selesai;
      u.belum = Math.max(0, u.total - u.selesai);
      u.persen = (u.total > 0 && !isNaN(u.total)) ? Math.round((u.selesai / u.total) * 100) : 0;
    });

    const persenGlobal = (totalGlobalTarget > 0 && !isNaN(totalGlobalTarget)) ? Math.round((totalGlobalSelesai / totalGlobalTarget) * 100) : 0;

    const resultPayload = {
      bulan: selectedMonth,
      tahun: selectedYear,
      totalTarget: totalGlobalTarget,
      totalSelesai: totalGlobalSelesai,
      totalDone: totalGlobalSelesai,
      totalBelum: totalGlobalBelum,
      persenSelesai: persenGlobal,
      persen: persenGlobal,
      unitSummary: unitSummary,
      shiftSecurity: shiftSecuritySummary,
      rekapPegawai: rekapPegawaiList,
      tindakLanjut: dataTindakLanjut
    };

    putScriptCacheData(cacheKey, resultPayload, 60);

    return {
      success: true,
      data: resultPayload
    };

  } catch (err) {
    return { success: false, message: "Gagal memuat dashboard supervisor: " + err.message };
  }
}

/**
 * ========================================================================
 * 3. MONITORING TERPADU ADMIN & SUPERVISOR (FILTER MULTI-KRITERIA)
 * ========================================================================
 */
function getIntegratedMonitoringData(token, bulan, tahun, filterUnit, filterPegawai, filterRuangan, filterStatus) {
  try {
    const session = getSessionUser(token);
    if (!session) {
      return { success: false, message: "Sesi telah berakhir. Silakan login kembali." };
    }

    const ss = getDb();
    if (!ss) return { success: false, message: "Koneksi spreadsheet gagal." };

    const now = new Date();
    const selectedMonth = bulan ? Number(bulan) : (now.getMonth() + 1);
    const selectedYear = tahun ? Number(tahun) : now.getFullYear();

    const allUsers = getAllUsersList(ss);
    let targetUsers = allUsers.filter(u => {
      const r = (u.role || '').toLowerCase();
      return !r.includes('admin') && !r.includes('supervisor') && !r.includes('kabag');
    });

    if (filterUnit && filterUnit !== 'SEMUA') {
      targetUsers = targetUsers.filter(u => u.unit === filterUnit);
    }

    if (filterPegawai && filterPegawai !== 'SEMUA') {
      targetUsers = targetUsers.filter(u => u.username === filterPegawai || u.namaPegawai === filterPegawai);
    }

    let aggregatedItems = [];
    const activeDaysSet = new Set();
    const allRuanganSet = new Set();
    const daftarPegawaiFilter = [];

    allUsers.forEach(u => {
      const r = (u.role || '').toLowerCase();
      if (!r.includes('admin') && !r.includes('supervisor') && !r.includes('kabag')) {
        daftarPegawaiFilter.push({ username: u.username, namaPegawai: u.namaPegawai, unit: u.unit });
      }
    });

    targetUsers.forEach(emp => {
      const empUnit = emp.unit || 'Kebersihan';

      if (empUnit === 'Keamanan') {
        const resK = getJadwalKeamananInternal(ss, emp, selectedMonth, selectedYear);
        if (resK && resK.jadwal && resK.jadwal.length > 0) {
          // Kumpulkan task items: gunakan sheet pegawai jika tersedia, atau standar defaultTasks
          let tasksToUse = (resK.taskItems && resK.taskItems.length > 0) ? resK.taskItems : [];
          const empSheet = findEmployeeSheet(ss, emp.namaSheet, emp.namaPegawai, emp.username);
          if (empSheet) {
            const parsedSecSheet = readSheetMonitoring(empSheet, selectedMonth, selectedYear);
            if (parsedSecSheet && parsedSecSheet.items && parsedSecSheet.items.length > 0) {
              tasksToUse = parsedSecSheet.items;
            }
          }

          resK.jadwal.forEach(j => {
            const d = j.tanggal;
            activeDaysSet.add(d);

            const shiftKode = j.kodeShift || 'O';
            const namaShift = j.namaShift || (shiftKode === 'P' ? 'Pagi' : shiftKode === 'S' ? 'Sore' : shiftKode === 'M' ? 'Malam' : 'Libur');

            // 1. Jika shift Off / Libur ('O'): pegawai bebas tugas, tidak ada checklist tugas yang muncul pada tanggal ini
            if (shiftKode === 'O') {
              return;
            }

            // 2. Filter checklist terpadu per tanggal HANYA memunculkan tugas yang harus dilakukan pada shift pegawai tersebut
            const shiftTasks = tasksToUse.filter(t => isKeamananTaskForShift(t, shiftKode));

            shiftTasks.forEach(t => {
              const rName = t.ruangan || ('Shift ' + namaShift);
              allRuanganSet.add(rName);

              let isDone = false;
              if (t.dailyStatus && (t.dailyStatus[d] !== undefined && t.dailyStatus[d] !== null)) {
                const st = t.dailyStatus[d];
                isDone = (st === '1' || st === 1 || st === true);
              } else {
                // Jika jadwal terisi dan tanggal sudah berjalan/hari ini, tandai telah terlaksana sesuai shift
                const isPastOrToday = (selectedYear < now.getFullYear()) ||
                  (selectedYear === now.getFullYear() && selectedMonth < (now.getMonth() + 1)) ||
                  (selectedYear === now.getFullYear() && selectedMonth === (now.getMonth() + 1) && d <= now.getDate());
                isDone = isPastOrToday;
              }

              aggregatedItems.push({
                unit: 'Keamanan',
                pegawai: emp.namaPegawai,
                namaPegawai: emp.namaPegawai,
                username: emp.username,
                ruangan: rName,
                item: t.kegiatan,
                dayNum: d,
                weekNum: Math.min(5, Math.ceil(d / 7)),
                shift: shiftKode,
                namaShift: namaShift,
                isDone: isDone,
                sheetRowIndex: t.sheetRowIndex || null,
                colIndex: (t.colMapping && t.colMapping[d]) ? t.colMapping[d] : (d + 1),
                targetSheetName: emp.namaSheet || null,
                updatedAt: isDone
                  ? `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d).padStart(2, '0')} (Shift ${shiftKode})`
                  : `Shift ${shiftKode} (Belum)`
              });
            });
          });
        }
      } else {
        // Unit Kerja lain (Kebersihan, Pelayanan, dll.)
        const empSheet = findEmployeeSheet(ss, emp.namaSheet, emp.namaPegawai, emp.username);
        let parsed = null;
        if (empSheet) {
          parsed = readSheetMonitoring(empSheet, selectedMonth, selectedYear);
        }

        if (parsed && parsed.items && parsed.items.length > 0) {
          parsed.activeDays.forEach(d => activeDaysSet.add(d));

          parsed.items.forEach(it => {
            parsed.activeDays.forEach(d => {
              const st = it.dailyStatus ? it.dailyStatus[d] : null;

              // Cek apakah hari tersebut adalah akhir pekan (Sabtu / Minggu)
              const dateObj = new Date(selectedYear, selectedMonth - 1, d);
              const dow = dateObj.getDay(); // 0 = Minggu, 6 = Sabtu
              const isWeekend = (dow === 0 || dow === 6);

              // Aturan kemunculan tugas yang harus dikerjakan pada hari tersebut:
              // - Jika status '-' / null / kosong: tugas tidak dijadwalkan pada hari tersebut, jangan munculkan
              // - Jika akhir pekan (Sabtu/Minggu) dan tidak ditandai selesai (st !== '1'): hari libur operasional, jangan munculkan
              const isDone = (st === '1' || st === 1 || st === true);
              const isScheduled = (st === '1' || st === 1 || st === true || st === '0' || st === 0 || st === false);

              if (!isScheduled || st === '-') {
                return; // Tidak ada kewajiban tugas pada hari dan tanggal ini
              }

              if (isWeekend && !isDone) {
                return; // Libur akhir pekan operasional kantor
              }

              allRuanganSet.add(it.ruangan);

              aggregatedItems.push({
                unit: empUnit,
                pegawai: emp.namaPegawai,
                namaPegawai: emp.namaPegawai,
                username: emp.username,
                ruangan: it.ruangan,
                item: it.kegiatan,
                dayNum: d,
                weekNum: Math.min(5, Math.ceil(d / 7)),
                isDone: isDone,
                sheetRowIndex: it.sheetRowIndex || null,
                colIndex: (it.colMapping && it.colMapping[d]) ? it.colMapping[d] : (d + 1),
                targetSheetName: emp.namaSheet || null,
                updatedAt: isDone
                  ? `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d).padStart(2, '0')} 16:00`
                  : '-'
              });
            });
          });
        }
      }
    });

    // Perkaya data dengan status bukti dukung foto & checklist pengawas
    const bMap = getBuktiDukungMap(ss, selectedMonth, selectedYear);
    aggregatedItems.forEach(it => {
      const tKey = generateTaskKey(selectedYear, selectedMonth, it.dayNum, it.username || it.pegawai, it.ruangan, it.item);
      const fKey = [it.dayNum, getAlphaOnly(it.pegawai || it.username), getAlphaOnly(it.item)].join('_');
      const rec = bMap.map[tKey] || bMap.fallbackMap[fKey];
      if (rec) {
        it.taskKey = rec.taskKey || tKey;
        it.statusPengawas = rec.statusPengawas;
        it.namaPengawas = rec.namaPengawas;
        it.waktuValidasi = rec.waktuValidasiPengawas;
        it.adaBukti = rec.adaBuktiDukung;
        it.fileId = rec.fileIdDrive;
        it.fileUrl = rec.fileUrlDrive;
        it.fileName = rec.fileName;
        it.koordinat = rec.koordinat;
        it.lokasi = rec.lokasi;
        it.waktuPelaksanaan = rec.waktu;
      } else {
        it.taskKey = tKey;
        it.statusPengawas = false;
        it.namaPengawas = '';
        it.waktuValidasi = '';
        it.adaBukti = false;
        it.fileId = '';
        it.fileUrl = '';
        it.fileName = '';
        it.koordinat = '';
        it.lokasi = '';
        it.waktuPelaksanaan = '';
      }
    });

    if (filterRuangan && filterRuangan !== 'SEMUA') {
      aggregatedItems = aggregatedItems.filter(it => it.ruangan === filterRuangan);
    }

    if (filterStatus && filterStatus !== 'SEMUA') {
      aggregatedItems = aggregatedItems.filter(it => {
        if (filterStatus === 'SELESAI') return it.isDone;
        if (filterStatus === 'BELUM') return !it.isDone;
        if (filterStatus === 'VALID' || filterStatus === 'TERVALIDASI') return it.statusPengawas === true;
        if (filterStatus === 'BELUM_VALID' || filterStatus === 'BELUM_TERVALIDASI') return it.statusPengawas !== true;
        if (filterStatus === 'ADA_BUKTI') return it.adaBukti === true;
        if (filterStatus === 'TANPA_BUKTI') return it.adaBukti !== true;
        return true;
      });
    }

    const sortedActiveDays = Array.from(activeDaysSet).sort((a, b) => a - b);
    const distinctPegawai = Array.from(new Set(daftarPegawaiFilter.map(p => p.namaPegawai)));
    const distinctRuangan = Array.from(allRuanganSet);

    return {
      success: true,
      data: {
        bulan: selectedMonth,
        tahun: selectedYear,
        activeDays: sortedActiveDays.length > 0 ? sortedActiveDays : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        daysInMonth: sortedActiveDays.length > 0 ? Math.max.apply(null, sortedActiveDays) : 30,
        items: aggregatedItems,
        pegawaiList: distinctPegawai,
        ruanganList: distinctRuangan,
        daftarPegawai: daftarPegawaiFilter,
        daftarRuangan: distinctRuangan,
        totalItems: aggregatedItems.length
      }
    };

  } catch (err) {
    return { success: false, message: "Gagal memuat monitoring terpadu: " + err.message };
  }
}

/**
 * ========================================================================
 * 4. REKAPITULASI MONITORING TERPADU (KEBERSIHAN, PELAYANAN, KEAMANAN)
 * ========================================================================
 */
function getIntegratedRekapMonitoring(token, bulan, tahun) {
  try {
    const session = getSessionUser(token);
    if (!session) {
      return { success: false, message: "Sesi telah berakhir. Silakan login kembali." };
    }

    const now = new Date();
    const selectedMonth = bulan ? Number(bulan) : (now.getMonth() + 1);
    const selectedYear = tahun ? Number(tahun) : now.getFullYear();

    const cacheKey = "cache_rekap_terpadu_" + selectedMonth + "_" + selectedYear;
    const cachedData = getScriptCacheData(cacheKey);
    if (cachedData) {
      return { success: true, data: cachedData };
    }

    const ss = getDb();
    if (!ss) return { success: false, message: "Koneksi spreadsheet gagal." };

    const allUsers = getAllUsersList(ss);
    const nonManagementStaff = allUsers.filter(u => {
      const r = (u.role || '').toLowerCase();
      return !r.includes('admin') && !r.includes('supervisor') && !r.includes('kabag');
    });

    let globalTotal = 0;
    let globalSelesai = 0;

    const unitSummary = {
      'Kebersihan': { unit: 'Kebersihan', total: 0, selesai: 0, done: 0, belum: 0, persen: 0 },
      'Pelayanan':  { unit: 'Pelayanan',  total: 0, selesai: 0, done: 0, belum: 0, persen: 0 },
      'Keamanan':   { unit: 'Keamanan',   total: 0, selesai: 0, done: 0, belum: 0, persen: 0 }
    };

    const rekapRuanganMap = {};
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const rekapHarian = [];
    for (let d = 1; d <= daysInMonth; d++) {
      rekapHarian.push({ tanggal: d, total: 0, selesai: 0, done: 0 });
    }

    const todayDateNum = (now.getMonth() + 1 === selectedMonth && now.getFullYear() === selectedYear) ? now.getDate() : 31;

    // Process all staff
    nonManagementStaff.forEach(emp => {
      const empUnit = emp.unit || 'Kebersihan';

      if (empUnit === 'Keamanan') {
        const resK = getJadwalKeamananInternal(ss, emp, selectedMonth, selectedYear);
        if (resK && resK.jadwal && resK.jadwal.length > 0) {
          let tasksToUse = (resK.taskItems && resK.taskItems.length > 0) ? resK.taskItems : [];
          const empSheet = findEmployeeSheet(ss, emp.namaSheet, emp.namaPegawai, emp.username);
          if (empSheet) {
            const parsedSecSheet = readSheetMonitoring(empSheet, selectedMonth, selectedYear);
            if (parsedSecSheet && parsedSecSheet.items && parsedSecSheet.items.length > 0) {
              tasksToUse = parsedSecSheet.items;
            }
          }

          resK.jadwal.forEach(j => {
            const d = j.tanggal;
            const shiftKode = j.kodeShift || 'O';
            const namaShift = j.namaShift || (shiftKode === 'P' ? 'Pagi' : shiftKode === 'S' ? 'Sore' : shiftKode === 'M' ? 'Malam' : 'Libur');

            if (shiftKode === 'O') return;

            const shiftTasks = tasksToUse.filter(t => isKeamananTaskForShift(t, shiftKode));
            shiftTasks.forEach(t => {
              const rName = t.ruangan || ('Shift ' + namaShift);
              if (!rekapRuanganMap[rName]) {
                rekapRuanganMap[rName] = { ruangan: rName, unit: 'Keamanan', total: 0, selesai: 0, done: 0, belum: 0, persen: 0, itemCount: 0 };
              }
              rekapRuanganMap[rName].itemCount++;

              let isDone = false;
              if (t.dailyStatus && (t.dailyStatus[d] !== undefined && t.dailyStatus[d] !== null)) {
                const st = t.dailyStatus[d];
                isDone = (st === '1' || st === 1 || st === true);
              } else {
                const isPastOrToday = (selectedYear < now.getFullYear()) ||
                  (selectedYear === now.getFullYear() && selectedMonth < (now.getMonth() + 1)) ||
                  (selectedYear === now.getFullYear() && selectedMonth === (now.getMonth() + 1) && d <= now.getDate());
                isDone = isPastOrToday;
              }

              rekapRuanganMap[rName].total++;
              globalTotal++;
              if (unitSummary['Keamanan']) unitSummary['Keamanan'].total++;
              if (d >= 1 && d <= daysInMonth) {
                rekapHarian[d - 1].total++;
              }

              if (isDone) {
                rekapRuanganMap[rName].selesai++;
                globalSelesai++;
                if (unitSummary['Keamanan']) unitSummary['Keamanan'].selesai++;
                if (d >= 1 && d <= daysInMonth) {
                  rekapHarian[d - 1].selesai++;
                  rekapHarian[d - 1].done++;
                }
              }
            });
          });
        }
      } else {
        // Kebersihan & Pelayanan
        const empSheet = findEmployeeSheet(ss, emp.namaSheet, emp.namaPegawai, emp.username);
        let parsed = null;
        if (empSheet) {
          parsed = readSheetMonitoring(empSheet, selectedMonth, selectedYear);
        }

        if (parsed && parsed.items && parsed.items.length > 0) {
          parsed.items.forEach(it => {
            const rName = it.ruangan || 'Umum';
            if (!rekapRuanganMap[rName]) {
              rekapRuanganMap[rName] = { ruangan: rName, unit: empUnit, total: 0, selesai: 0, done: 0, belum: 0, persen: 0, itemCount: 0 };
            }
            rekapRuanganMap[rName].itemCount++;

            if (parsed.activeDays) {
              parsed.activeDays.forEach(d => {
                const st = it.dailyStatus ? it.dailyStatus[d] : null;

                const dateObj = new Date(selectedYear, selectedMonth - 1, d);
                const dow = dateObj.getDay(); // 0 = Minggu, 6 = Sabtu
                const isWeekend = (dow === 0 || dow === 6);
                const isDone = (st === '1' || st === 1 || st === true);
                const isScheduled = (st === '1' || st === 1 || st === true || st === '0' || st === 0 || st === false);

                if (!isScheduled || st === '-') return;
                if (isWeekend && !isDone) return; // Libur akhir pekan operasional

                rekapRuanganMap[rName].total++;
                globalTotal++;
                if (unitSummary[empUnit]) unitSummary[empUnit].total++;
                if (d >= 1 && d <= daysInMonth) {
                  rekapHarian[d - 1].total++;
                }

                if (isDone) {
                  rekapRuanganMap[rName].selesai++;
                  globalSelesai++;
                  if (unitSummary[empUnit]) unitSummary[empUnit].selesai++;
                  if (d >= 1 && d <= daysInMonth) {
                    rekapHarian[d - 1].selesai++;
                    rekapHarian[d - 1].done++;
                  }
                }
              });
            }
          });
        }
      }
    });

    Object.keys(unitSummary).forEach(k => {
      const u = unitSummary[k];
      u.done = u.selesai;
      u.belum = Math.max(0, u.total - u.selesai);
      u.persen = (u.total > 0 && !isNaN(u.total)) ? Math.round((u.selesai / u.total) * 100) : 0;
    });

    const rekapRuanganList = Object.values(rekapRuanganMap).map(r => {
      r.done = r.selesai;
      r.belum = Math.max(0, r.total - r.selesai);
      r.persen = (r.total > 0 && !isNaN(r.total)) ? Math.round((r.selesai / r.total) * 100) : 0;
      return r;
    });

    rekapHarian.forEach(h => {
      h.hari = h.tanggal;
      h.done = h.selesai;
    });

    const resultPayload = {
      bulan: selectedMonth,
      tahun: selectedYear,
      totalMonitoring: globalTotal,
      totalDone: globalSelesai,
      monitoringSelesai: globalSelesai,
      monitoringBelum: Math.max(0, globalTotal - globalSelesai),
      progresPersen: (globalTotal > 0 && !isNaN(globalTotal)) ? Math.round((globalSelesai / globalTotal) * 100) : 0,
      rekapUnit: Object.values(unitSummary),
      rekapRuangan: rekapRuanganList,
      rekapHarian: rekapHarian
    };

    putScriptCacheData(cacheKey, resultPayload, 60);

    return {
      success: true,
      data: resultPayload
    };
  } catch (err) {
    return { success: false, message: "Gagal memuat rekap terpadu: " + err.message };
  }
}

function getEmployeeDetailProgress(token, employeeIdentifier, bulan, tahun) {
  try {
    const session = getSessionUser(token);
    if (!session) return { success: false, message: "Sesi tidak valid." };

    const ss = getDb();
    if (!ss) return { success: false, message: "Koneksi spreadsheet gagal." };

    if (!employeeIdentifier) {
      return { success: false, message: "Nama pegawai tidak boleh kosong." };
    }

    const allUsers = getAllUsersList(ss);
    const empAlpha = getAlphaOnly(employeeIdentifier);

    let targetUser = allUsers.find(u =>
      u.username === employeeIdentifier ||
      u.namaPegawai === employeeIdentifier ||
      getAlphaOnly(u.username) === empAlpha ||
      getAlphaOnly(u.namaPegawai) === empAlpha
    );

    if (!targetUser) {
      targetUser = allUsers.find(u => {
        const uAlpha = getAlphaOnly(u.namaPegawai || u.username);
        return uAlpha && empAlpha && (uAlpha.includes(empAlpha) || empAlpha.includes(uAlpha));
      });
    }

    if (!targetUser) {
      // Fallback: create temporary user target
      targetUser = {
        username: employeeIdentifier,
        namaPegawai: employeeIdentifier,
        namaSheet: employeeIdentifier,
        unit: 'Kebersihan',
        role: 'Petugas Kebersihan'
      };
      const testSh = findEmployeeSheet(ss, employeeIdentifier, employeeIdentifier, employeeIdentifier);
      if (testSh) {
        targetUser.jenis = getSheetJenis(testSh, targetUser, ss);
        targetUser.unit = determineUnit(targetUser.jenis, targetUser.role, targetUser.unit);
      }
    }

    const selectedMonth = bulan ? Number(bulan) : (new Date().getMonth() + 1);
    const selectedYear = tahun ? Number(tahun) : new Date().getFullYear();
    const todayDate = (new Date().getMonth() + 1 === selectedMonth) ? new Date().getDate() : 1;

    if (targetUser.unit === 'Keamanan') {
      const resK = getJadwalKeamananInternal(ss, targetUser, selectedMonth, selectedYear);
      const allSecTasks = (resK && resK.taskItems) ? resK.taskItems : [];

      let todayShift = 'O';
      if (resK && resK.jadwal) {
        const jToday = resK.jadwal.find(j => j.tanggal === todayDate);
        if (jToday) todayShift = jToday.kodeShift;
      }

      const formattedTasks = allSecTasks.map(t => {
        const rUpper = String(t.ruangan || '').toUpperCase();
        let appliesToShift = false;
        if (todayShift === 'P' && (rUpper.includes('PAGI') || rUpper.includes('JAM KERJA'))) appliesToShift = true;
        else if ((todayShift === 'S' || todayShift === 'M') && rUpper.includes('MALAM')) appliesToShift = true;
        else if (todayShift === 'S' && rUpper.includes('JAM KERJA')) appliesToShift = true;

        return {
          item: t.kegiatan,
          ruangan: t.ruangan,
          periode: 'Shift ' + todayShift,
          isDone: appliesToShift
        };
      });

      const totalTasks = formattedTasks.length;
      const doneTasks = formattedTasks.filter(t => t.isDone).length;
      const pct = (totalTasks > 0 && !isNaN(totalTasks)) ? Math.round((doneTasks / totalTasks) * 100) : 0;

      return {
        success: true,
        data: {
          namaPegawai: targetUser.namaPegawai,
          username: targetUser.username,
          unit: targetUser.unit,
          role: targetUser.role || 'Petugas Keamanan',
          totalTasks: totalTasks,
          doneTasks: doneTasks,
          persen: pct,
          isKeamanan: true,
          todayShift: todayShift,
          jadwalShift: resK ? resK.jadwal : [],
          tasks: formattedTasks
        }
      };
    } else {
      const empSheet = findEmployeeSheet(ss, targetUser.namaSheet, targetUser.namaPegawai, targetUser.username);
      if (!empSheet) {
        return {
          success: true,
          data: {
            namaPegawai: targetUser.namaPegawai,
            username: targetUser.username,
            unit: targetUser.unit,
            role: targetUser.role || 'Petugas Teknis',
            totalTasks: 0,
            doneTasks: 0,
            persen: 0,
            isKeamanan: false,
            tasks: []
          }
        };
      }
      const parsed = readSheetMonitoring(empSheet, selectedMonth, selectedYear);

      const formattedTasks = (parsed.items || []).map(it => {
        const isDoneToday = it.dailyStatus && (it.dailyStatus[todayDate] === '1' || it.dailyStatus[todayDate] === 1);
        return {
          item: it.kegiatan,
          ruangan: it.ruangan,
          periode: it.periode || 'Harian',
          isDone: isDoneToday
        };
      });

      const totalTasks = formattedTasks.length;
      const doneTasks = formattedTasks.filter(t => t.isDone).length;
      const pct = (totalTasks > 0 && !isNaN(totalTasks)) ? Math.round((doneTasks / totalTasks) * 100) : 0;

      return {
        success: true,
        data: {
          namaPegawai: targetUser.namaPegawai,
          username: targetUser.username,
          unit: targetUser.unit,
          role: targetUser.role || 'Petugas Kebersihan',
          totalTasks: totalTasks,
          doneTasks: doneTasks,
          persen: pct,
          isKeamanan: false,
          tasks: formattedTasks
        }
      };
    }

  } catch (err) {
    return { success: false, message: "Gagal memuat detail pegawai: " + err.message };
  }
}

/**
 * ========================================================================
 * 6. FITUR EXPORT LAPORAN (SEMUA PEGAWAI / INDIVIDU SETIAP BULAN)
 * ========================================================================
 */
function getExportLaporanData(token, tipe, bulan, tahun, targetUsername) {
  try {
    const session = getSessionUser(token);
    if (!session) {
      return { success: false, message: "Sesi telah berakhir atau tidak valid. Silakan login kembali." };
    }

    const ss = getDb();
    if (!ss) return { success: false, message: "Koneksi spreadsheet gagal." };

    const now = new Date();
    const selectedMonth = bulan ? Number(bulan) : (now.getMonth() + 1);
    const selectedYear = tahun ? Number(tahun) : now.getFullYear();
    const NAMA_BULAN = [
      "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    const namaBulanStr = NAMA_BULAN[selectedMonth] || ("Bulan " + selectedMonth);
    const userRoleLower = (session.role || '').toLowerCase();
    const isManager = userRoleLower.includes('admin') || userRoleLower.includes('supervisor') || userRoleLower.includes('kabag') || userRoleLower.includes('humas') || userRoleLower.includes('koordinator') || userRoleLower.includes('korlap');

    // JIKA TIPE 'semua' (Hanya untuk Admin / Supervisor)
    if (tipe === 'semua' && isManager) {
      const allUsers = getAllUsersList(ss);
      const nonManagementStaff = allUsers.filter(u => {
        const r = (u.role || '').toLowerCase();
        return !r.includes('admin') && !r.includes('supervisor') && !r.includes('kabag');
      });

      const rekapPegawai = [];
      let totalSemua = 0;
      let selesaiSemua = 0;

      nonManagementStaff.forEach(emp => {
        const empUnit = emp.unit || 'Kebersihan';
        let empTotal = 0;
        let empSelesai = 0;

        if (empUnit === 'Keamanan') {
          const resK = getJadwalKeamananInternal(ss, emp, selectedMonth, selectedYear);
          let tasksToUse = (resK && resK.taskItems && resK.taskItems.length > 0) ? resK.taskItems : [];
          const empSheet = findEmployeeSheet(ss, emp.namaSheet, emp.namaPegawai, emp.username);
          if (empSheet) {
            const parsedSecSheet = readSheetMonitoring(empSheet, selectedMonth, selectedYear);
            if (parsedSecSheet && parsedSecSheet.items && parsedSecSheet.items.length > 0) {
              tasksToUse = parsedSecSheet.items;
            }
          }

          if (resK && resK.jadwal) {
            resK.jadwal.forEach(j => {
              if (j.kodeShift === 'O') return;
              const shiftTasks = tasksToUse.filter(t => isKeamananTaskForShift(t, j.kodeShift));
              shiftTasks.forEach(t => {
                empTotal++;
                let isDone = false;
                if (t.dailyStatus && (t.dailyStatus[j.tanggal] !== undefined && t.dailyStatus[j.tanggal] !== null)) {
                  const st = t.dailyStatus[j.tanggal];
                  isDone = (st === '1' || st === 1 || st === true);
                } else {
                  const isPastOrToday = (selectedYear < now.getFullYear()) ||
                    (selectedYear === now.getFullYear() && selectedMonth < (now.getMonth() + 1)) ||
                    (selectedYear === now.getFullYear() && selectedMonth === (now.getMonth() + 1) && j.tanggal <= now.getDate());
                  isDone = isPastOrToday;
                }
                if (isDone) empSelesai++;
              });
            });
          }
        } else {
          const empSheet = findEmployeeSheet(ss, emp.namaSheet, emp.namaPegawai, emp.username);
          if (empSheet) {
            const parsed = readSheetMonitoring(empSheet, selectedMonth, selectedYear);
            if (parsed && parsed.items) {
              parsed.items.forEach(it => {
                empTotal += (it.totalHariAktif || 0);
                empSelesai += (it.selesaiCount || 0);
              });
            }
          }
        }

        const belum = Math.max(0, empTotal - empSelesai);
        const persen = (empTotal > 0 && !isNaN(empTotal)) ? Math.round((empSelesai / empTotal) * 100) : 0;
        totalSemua += empTotal;
        selesaiSemua += empSelesai;

        rekapPegawai.push({
          namaPegawai: emp.namaPegawai,
          username: emp.username,
          unit: empUnit,
          role: emp.role || empUnit,
          totalTarget: empTotal,
          selesai: empSelesai,
          belum: belum,
          persen: persen,
          status: persen >= 90 ? 'Optimal' : (persen >= 70 ? 'Cukup' : 'Perlu Perhatian')
        });
      });

      const persenSemua = (totalSemua > 0 && !isNaN(totalSemua)) ? Math.round((selesaiSemua / totalSemua) * 100) : 0;

      return {
        success: true,
        data: {
          tipe: 'semua',
          periode: {
            bulan: selectedMonth,
            tahun: selectedYear,
            namaBulan: namaBulanStr,
            labelPeriode: namaBulanStr + " " + selectedYear
          },
          summary: {
            totalPegawai: rekapPegawai.length,
            totalTarget: totalSemua,
            totalSelesai: selesaiSemua,
            totalBelum: Math.max(0, totalSemua - selesaiSemua),
            persen: persenSemua
          },
          rekapPegawai: rekapPegawai
        }
      };
    } else {
      // EXPORT PER PEGAWAI (INDIVIDU)
      let targetUser = null;
      const allUsers = getAllUsersList(ss);
      const queryUsername = (isManager && targetUsername) ? targetUsername : session.username;
      const queryAlpha = getAlphaOnly(queryUsername);

      targetUser = allUsers.find(u =>
        u.username === queryUsername ||
        u.namaPegawai === queryUsername ||
        (queryAlpha && getAlphaOnly(u.username) === queryAlpha) ||
        (queryAlpha && getAlphaOnly(u.namaPegawai) === queryAlpha)
      );
      if (!targetUser) {
        targetUser = session;
      }

      const empUnit = targetUser.unit || 'Kebersihan';
      const itemsList = [];
      let jadwalSatpam = [];
      let totalTarget = 0;
      let totalSelesai = 0;
      const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();

      if (empUnit === 'Keamanan') {
        const resK = getJadwalKeamananInternal(ss, targetUser, selectedMonth, selectedYear);
        let tasksToUse = (resK && resK.taskItems && resK.taskItems.length > 0) ? resK.taskItems : [];
        const empSheet = findEmployeeSheet(ss, targetUser.namaSheet, targetUser.namaPegawai, targetUser.username);
        if (empSheet) {
          const parsedSecSheet = readSheetMonitoring(empSheet, selectedMonth, selectedYear);
          if (parsedSecSheet && parsedSecSheet.items && parsedSecSheet.items.length > 0) {
            tasksToUse = parsedSecSheet.items;
          }
        }

        if (resK && resK.jadwal) {
          jadwalSatpam = resK.jadwal;
          tasksToUse.forEach((t, idx) => {
            let taskTarget = 0;
            let taskSelesai = 0;
            const dailyMap = {};

            resK.jadwal.forEach(j => {
              const d = j.tanggal;
              if (j.kodeShift === 'O') {
                dailyMap[d] = '-';
                return;
              }
              const applies = isKeamananTaskForShift(t, j.kodeShift);
              if (applies) {
                taskTarget++;
                let isDone = false;
                if (t.dailyStatus && (t.dailyStatus[d] !== undefined && t.dailyStatus[d] !== null)) {
                  isDone = (t.dailyStatus[d] === '1' || t.dailyStatus[d] === 1 || t.dailyStatus[d] === true);
                } else {
                  const isPastOrToday = (selectedYear < now.getFullYear()) ||
                    (selectedYear === now.getFullYear() && selectedMonth < (now.getMonth() + 1)) ||
                    (selectedYear === now.getFullYear() && selectedMonth === (now.getMonth() + 1) && d <= now.getDate());
                  isDone = isPastOrToday;
                }
                dailyMap[d] = isDone ? '1' : '0';
                if (isDone) taskSelesai++;
              } else {
                dailyMap[d] = '-';
              }
            });

            totalTarget += taskTarget;
            totalSelesai += taskSelesai;

            itemsList.push({
              no: idx + 1,
              ruangan: t.ruangan || 'Area Satpam',
              kegiatan: t.kegiatan,
              target: taskTarget,
              selesai: taskSelesai,
              belum: Math.max(0, taskTarget - taskSelesai),
              persen: taskTarget > 0 ? Math.round((taskSelesai / taskTarget) * 100) : 0,
              dailyStatus: dailyMap
            });
          });
        }
      } else {
        // Kebersihan & Pelayanan
        const empSheet = findEmployeeSheet(ss, targetUser.namaSheet, targetUser.namaPegawai, targetUser.username);
        if (empSheet) {
          const parsed = readSheetMonitoring(empSheet, selectedMonth, selectedYear);
          if (parsed && parsed.items) {
            parsed.items.forEach((it, idx) => {
              totalTarget += (it.totalHariAktif || 0);
              totalSelesai += (it.selesaiCount || 0);
              itemsList.push({
                no: idx + 1,
                ruangan: it.ruangan,
                kegiatan: it.kegiatan,
                target: it.totalHariAktif || 0,
                selesai: it.selesaiCount || 0,
                belum: Math.max(0, (it.totalHariAktif || 0) - (it.selesaiCount || 0)),
                persen: (it.totalHariAktif > 0) ? Math.round(((it.selesaiCount || 0) / it.totalHariAktif) * 100) : 0,
                dailyStatus: it.dailyStatus || {}
              });
            });
          }
        }
      }

      const totalBelum = Math.max(0, totalTarget - totalSelesai);
      const persen = (totalTarget > 0 && !isNaN(totalTarget)) ? Math.round((totalSelesai / totalTarget) * 100) : 0;

      return {
        success: true,
        data: {
          tipe: 'individu',
          pegawai: {
            namaPegawai: targetUser.namaPegawai,
            username: targetUser.username,
            unit: empUnit,
            role: targetUser.role || ('Petugas ' + empUnit)
          },
          periode: {
            bulan: selectedMonth,
            tahun: selectedYear,
            namaBulan: namaBulanStr,
            labelPeriode: namaBulanStr + " " + selectedYear,
            daysInMonth: daysInMonth
          },
          summary: {
            totalTarget: totalTarget,
            totalSelesai: totalSelesai,
            totalBelum: totalBelum,
            persen: persen,
            status: persen >= 90 ? 'Optimal' : (persen >= 70 ? 'Cukup' : 'Perlu Perhatian')
          },
          jadwalShift: jadwalSatpam,
          items: itemsList
        }
      };
    }
  } catch (err) {
    return { success: false, message: "Gagal menyiapkan data export: " + err.message };
  }
}

/**
 * ========================================================================
 * 7. FITUR PENGAWAS MENCENTANG TUGAS PEGAWAI (YANG BELUM DICEKLIST PEGAWAI)
 * ========================================================================
 */
function supervisorToggleStaffTaskCheck(token, payload) {
  try {
    const session = getSessionUser(token);
    if (!session) {
      return { success: false, message: "Sesi telah berakhir. Silakan login kembali." };
    }

    const isManager = (session.role === 'Admin' ||
                       session.role === 'Supervisor' ||
                       session.role === 'Tim Umum dan Humas' ||
                       session.role === 'Koordinator Lapangan');

    if (!isManager) {
      return { success: false, message: "Akses ditolak. Hanya Pengawas atau Admin yang dapat mencentang tugas pegawai." };
    }

    if (!payload) {
      return { success: false, message: "Data checklist tidak lengkap." };
    }

    const ss = getDb();
    if (!ss) return { success: false, message: "Koneksi spreadsheet gagal." };

    const targetUsername = cleanStr(payload.username || '');
    const targetNamaPegawai = cleanStr(payload.namaPegawai || payload.pegawai || '');
    const targetSheetName = cleanStr(payload.targetSheetName || '');
    const dayNum = Number(payload.dayNum || payload.tanggal || new Date().getDate());
    const monthNum = Number(payload.bulan || (new Date().getMonth() + 1));
    const yearNum = Number(payload.tahun || new Date().getFullYear());
    const newStatus = (payload.newStatus === true || payload.newStatus === 1 || payload.newStatus === '1' || String(payload.newStatus).toUpperCase() === 'TRUE');
    let rIdx = Number(payload.sheetRowIndex || 0);
    let cIdx = Number(payload.colIndex || 0);
    const namaTugas = cleanStr(payload.namaTugas || payload.item || payload.kegiatan || '');
    const ruangan = cleanStr(payload.ruangan || 'Area Umum');
    const unitKerja = cleanStr(payload.unit || 'Kebersihan');

    // 1. Temukan sheet pegawai & perbarui cell jika sheet personal ada
    let sheetUpdated = false;
    let empSheet = null;
    if (targetSheetName) empSheet = findSheet(ss, targetSheetName);
    if (!empSheet) empSheet = findEmployeeSheet(ss, targetSheetName, targetNamaPegawai, targetUsername);

    if (empSheet) {
      if (!rIdx || rIdx < 1 || !cIdx || cIdx < 1) {
        const parsed = readSheetMonitoring(empSheet, monthNum, yearNum);
        if (parsed && parsed.items) {
          const found = parsed.items.find(i => i.kegiatan === namaTugas || getAlphaOnly(i.kegiatan) === getAlphaOnly(namaTugas));
          if (found) {
            rIdx = found.sheetRowIndex;
            cIdx = (found.colMapping && found.colMapping[dayNum]) ? found.colMapping[dayNum] : (dayNum + 1);
          }
        }
      }

      if (rIdx >= 1 && cIdx >= 1) {
        empSheet.getRange(rIdx, cIdx).setValue(newStatus);
        sheetUpdated = true;
      }
    }

    // 2. Simpan / Perbarui statusPetugas di sheet ValidasiDanBuktiDukung
    const sh = setupBuktiDukungSheet(ss);
    const taskKey = payload.taskKey || generateTaskKey(yearNum, monthNum, dayNum, targetUsername || targetNamaPegawai, ruangan, namaTugas);
    const values = sh.getDataRange().getValues();
    let existingRowIdx = -1;

    for (let r = 1; r < values.length; r++) {
      if (String(values[r][0] || '').trim() === taskKey) {
        existingRowIdx = r + 1;
        break;
      }
    }

    if (existingRowIdx === -1 && targetNamaPegawai && namaTugas) {
      for (let r = 1; r < values.length; r++) {
        const row = values[r];
        const rDay = Number(row[5] || 0);
        const rUser = getAlphaOnly(String(row[9] || row[8] || ''));
        const rTugas = getAlphaOnly(String(row[11] || ''));
        if (rDay === dayNum && rUser === getAlphaOnly(targetUsername || targetNamaPegawai) && rTugas === getAlphaOnly(namaTugas)) {
          existingRowIdx = r + 1;
          break;
        }
      }
    }

    const now = new Date();
    const supervisorName = session.namaPegawai || session.username || 'Pengawas';

    if (existingRowIdx > 0) {
      sh.getRange(existingRowIdx, 2).setValue(now); // Timestamp
      sh.getRange(existingRowIdx, 13).setValue(newStatus); // StatusPetugas
      if (!values[existingRowIdx - 1][14] && newStatus) {
        sh.getRange(existingRowIdx, 23).setValue('Diceklist oleh Pengawas (' + supervisorName + ')');
      }
    } else {
      const NAMA_BULAN = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      const newRow = [
        taskKey,
        now,
        yearNum,
        monthNum,
        NAMA_BULAN[monthNum] || ('Bulan_' + monthNum),
        dayNum,
        Utilities.formatDate(now, "GMT+7", "HH:mm:ss") + " WIB",
        unitKerja,
        targetNamaPegawai,
        targetUsername,
        ruangan,
        namaTugas,
        newStatus, // StatusPetugas
        false,     // StatusPengawas
        '',        // NamaPengawas
        '',        // WaktuValidasiPengawas
        false,     // AdaBuktiDukung
        '', '', '', '', '',
        'Checklist diisi oleh Pengawas (' + supervisorName + ')'
      ];
      sh.appendRow(newRow);
    }

    SpreadsheetApp.flush();

    // Invalidate script caches
    clearScriptCacheKeys([
      "cache_spv_dash_" + monthNum + "_" + yearNum,
      "cache_rekap_terpadu_" + monthNum + "_" + yearNum,
      empSheet ? ("cache_m_" + empSheet.getName() + "_" + monthNum + "_" + yearNum) : null
    ]);
    resetMemoryCache();

    return {
      success: true,
      message: newStatus ? "Tugas pegawai berhasil dicentang selesai oleh Pengawas!" : "Centang tugas pegawai berhasil dibatalkan.",
      data: {
        taskKey: taskKey,
        isDone: newStatus,
        sheetUpdated: sheetUpdated,
        namaPegawai: targetNamaPegawai,
        namaTugas: namaTugas,
        dayNum: dayNum
      }
    };
  } catch (err) {
    return { success: false, message: "Gagal memperbarui status tugas pegawai: " + err.message };
  }
}

// <<<<<<<<<< END MODUL: backend/Supervisor.gs <<<<<<<<<<


// >>>>>>>>>> MODUL: backend/ApiRouter.gs >>>>>>>>>>

/**
 * ========================================================================
 * SIMPEL-KU - API ROUTER & DISPATCHER MODULE
*/

function doGet(e) {
  if (e && e.parameter && e.parameter.action) {
    return handleApiRequest(e.parameter);
  }
  const template = HtmlService.createTemplateFromFile('Index');
  return template.evaluate()
    .setTitle('Sistem Monitoring Pelayanan, Keamanan & Kebersihan (SIMPEL-KU)')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Entry point untuk request POST API dari deployment eksternal
 */
function doPost(e) {
  var params = {};
  try {
    if (e && e.postData && e.postData.contents) {
      params = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      params = e.parameter;
    }
  } catch (err) {
    params = (e && e.parameter) || {};
  }
  return handleApiRequest(params);
}

/**
 * Handler pemrosesan API untuk integrasi deployment standalone / eksternal
 */
function handleApiRequest(params) {
  var result = { success: false, message: 'Invalid action' };
  var action = params.action;
  try {
    if (action === 'login') {
      result = login(params.username, params.password);
    } else if (action === 'logout') {
      result = logout(params.token);
    } else if (action === 'getDashboardData') {
      result = getDashboardData(params.token, params.bulan, params.tahun);
    } else if (action === 'getSupervisorDashboardData') {
      result = getSupervisorDashboardData(params.token, params.bulan, params.tahun);
    } else if (action === 'getMonitoringData') {
      result = getMonitoringData(
        params.token,
        params.jenis,
        params.bulan,
        params.tahun,
        params.filterRuangan || 'SEMUA',
        params.filterStatus || 'SEMUA'
      );
    } else if (action === 'getIntegratedMonitoringData') {
      result = getIntegratedMonitoringData(
        params.token,
        params.bulan,
        params.tahun,
        params.filterUnit || 'SEMUA',
        params.filterPegawai || 'SEMUA',
        params.filterRuangan || 'SEMUA',
        params.filterStatus || 'SEMUA'
      );
    } else if (action === 'updateMonitoringStatus') {
      result = updateMonitoringStatus(
        params.token,
        params.rowIndex || params.sheetRowIndex,
        params.colIndex,
        params.newStatus,
        params.dayNum,
        params.monthNum || params.bulan,
        params.yearNum || params.tahun,
        params.targetSheetName
      );
    } else if (action === 'getRekapMonitoring') {
      result = getRekapMonitoring(params.token, params.bulan, params.tahun);
    } else if (action === 'getIntegratedRekapMonitoring') {
      result = getIntegratedRekapMonitoring(params.token, params.bulan, params.tahun);
    } else if (action === 'getEmployeeDetailProgress') {
      result = getEmployeeDetailProgress(
        params.token,
        params.employeeIdentifier || params.namaPegawai || params.username || params.employeeName,
        params.bulan,
        params.tahun
      );
    } else if (action === 'getJadwalKeamanan') {
      result = getJadwalKeamanan(params.token, params.bulan, params.tahun);
    } else if (action === 'getJadwalPiketSecurityMatrix') {
      result = getJadwalPiketSecurityMatrix(params.token, params.bulan, params.tahun);
    } else if (action === 'updateSecurityShift') {
      result = updateSecurityShift(
        params.token,
        params.namaPegawai || params.nama || params.employeeNameOrId || params.employeeIdentifier,
        params.tanggal || params.dayNum,
        params.shiftBaru || params.newShift,
        params.bulan,
        params.tahun
      );
    } else if (action === 'swapSecurityShift') {
      const p1 = params.petugas1 ? (params.petugas1.namaPegawai || params.petugas1.nama) : (params.pegawai1 || params.nama1 || params.emp1Name);
      const t1 = params.petugas1 ? params.petugas1.tanggal : (params.tanggal1 || params.tanggal || params.dayNum);
      const p2 = params.petugas2 ? (params.petugas2.namaPegawai || params.petugas2.nama) : (params.pegawai2 || params.nama2 || params.emp2Name);
      const t2 = params.petugas2 ? params.petugas2.tanggal : (params.tanggal2 || params.tanggal || params.dayNum);
      result = swapSecurityShift(
        params.token,
        p1,
        p2,
        t1,
        t2,
        params.bulan,
        params.tahun
      );
    } else if (action === 'getExportLaporanData') {
      result = getExportLaporanData(params.token, params.tipe, params.bulan, params.tahun, params.username || params.targetUsername);
    } else if (action === 'uploadBuktiDukung') {
      result = uploadBuktiDukungFoto(params.token, params);
    } else if (action === 'updateSupervisorChecklist') {
      result = updateSupervisorChecklist(params.token, params);
    } else if (action === 'supervisorToggleStaffTaskCheck') {
      result = supervisorToggleStaffTaskCheck(params.token, params);
    } else if (action === 'getBuktiDukungData') {
      result = getBuktiDukungData(params.token, params.bulan, params.tahun, params.unit, params.namaPegawai);
    } else if (action === 'getInspeksiMutuData') {
      result = getInspeksiMutuData(params.token, params.bulan, params.tahun, params.unit);
    } else if (action === 'saveInspeksiMutu') {
      result = saveInspeksiMutu(params.token, params);
    } else if (action === 'changeCredentials') {
      result = changeCredentials(params.token, params.oldPassword, params.newUsername, params.newPassword);
    } else if (action === 'setupAllUsers') {
      result = { success: true, message: setupAllUsers() };
    } else if (action === 'testGoogleDriveAccess') {
      result = { success: true, data: testGoogleDriveAccess() };
    } else {
      result = { success: false, message: 'Aksi "' + action + '" tidak dikenali.' };
    }
  } catch (e) {
    result = { success: false, message: 'Server error: ' + e.message };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// <<<<<<<<<< END MODUL: backend/ApiRouter.gs <<<<<<<<<<
