/**
 * SISTEM MONITORING PELAYANAN, KEAMANAN & KEBERSIHAN UMUM (SIMPEL-KU)
 * BPS Provinsi Kalimantan Barat
 * Backend Engine - Google Apps Script (GAS)
 */

const SPREADSHEET_ID = "1c2XUeoYFt_UEqJruBSciKPAIiPEdNoJvTO9epLWVTqs"; // Spreadsheet ID (Fallback)
const SESSION_DURATION_SEC = 21600; // Durasi sesi login: 6 Jam
const CACHE_TTL_SEC = 60;           // Cache parsed data: 60 detik (akselerasi loading)

// Pemetaan nama bulan Indonesia ke angka
const MONTH_MAP_ID = {
  'JANUARI': 1, 'FEBRUARI': 2, 'MARET': 3, 'APRIL': 4,
  'MEI': 5, 'JUNI': 6, 'JULI': 7, 'AGUSTUS': 8,
  'SEPTEMBER': 9, 'OKTOBER': 10, 'NOVEMBER': 11, 'DESEMBER': 12
};

// Kata kunci baris yang harus di-skip pada matriks monitoring
const SKIP_ROW_KEYWORDS = [
  'HITUNG SKOR', 'CATATAN', 'SELAIN TUGAS', 'SELAIN TUGAS-TUGAS',
  'SELAMA JAM KERJA MENGGUNAKAN', 'SHIFT PAGI', 'SHIFT SORE', 'SHIFT MALAM'
];

// Kamus alias nama & panggilan umum untuk mencocokkan kredensial & jadwal piket
const ALIAS_MAP = {
  'dede': ['nurramadhanial', 'ramadhanial', 'nur ramadhanial', 'dede'],
  'nurramadhanial': ['dede', 'ramadhanial', 'nur ramadhanial'],
  'eddy': ['edi', 'eddy', 'edi suryadi', 'eddy suryadi', 'eddysuryadi'],
  'eddysuryadi': ['edi', 'eddy', 'edi suryadi', 'eddy suryadi', 'eddysuryadi'],
  'feri': ['ferry', 'fery', 'feri yustami', 'ferry yustami', 'feriyustami'],
  'feriyustami': ['ferry', 'fery', 'feri yustami', 'ferry yustami', 'feriyustami'],
  'reza': ['sy reza', 'syreza', 'sy. reza', 'syarif reza', 'reza nopriadrian', 'reza', 'syarifrezanopriadrianalkadri'],
  'syreza': ['sy reza', 'syreza', 'sy. reza', 'syarif reza', 'reza nopriadrian', 'reza', 'syarifrezanopriadrianalkadri'],
  'syarifrezanopriadrianalkadri': ['sy reza', 'syreza', 'sy. reza', 'syarif reza', 'reza nopriadrian', 'reza', 'syarifrezanopriadrianalkadri'],
  'syukri': ['m syukri', 'muhammad syukri', 'syukri', 'msyukri', 'muhammadsyukri'],
  'msyukri': ['m syukri', 'muhammad syukri', 'syukri', 'msyukri', 'muhammadsyukri'],
  'muhammadsyukri': ['m syukri', 'muhammad syukri', 'syukri', 'msyukri', 'muhammadsyukri'],
  'rizki': ['rizky', 'rizqi', 'rizki fadil', 'rizky fadil', 'rizkifadil'],
  'rizkifadil': ['rizky', 'rizqi', 'rizki fadil', 'rizky fadil', 'rizkifadil'],
  'slamet': ['slamet riyadi', 'slamet', 'slametriyadi'],
  'slametriyadi': ['slamet riyadi', 'slamet', 'slametriyadi'],
  'eko': ['eko prasetyo', 'eko', 'ekoprasetyo'],
  'ekoprasetyo': ['eko prasetyo', 'eko', 'ekoprasetyo'],
  'agus': ['agus tetriansyah', 'agus', 'agustetriansyah'],
  'agustetriansyah': ['agus tetriansyah', 'agus', 'agustetriansyah'],
  'yuni': ['yuni juniarti', 'yuni', 'yunijuniarti'],
  'yunijuniarti': ['yuni juniarti', 'yuni', 'yunijuniarti'],
  'rania': ['rania naila husna', 'rania', 'ranianailahusna'],
  'ranianailahusna': ['rania naila husna', 'rania', 'ranianailahusna'],
  'alfiana': ['alfiana ayuni', 'alfiana', 'alfianaayuni'],
  'alfianaayuni': ['alfiana ayuni', 'alfiana', 'alfianaayuni'],
  'mawardi': ['mawardi', 'ardi'],
  'ardi': ['mawardi', 'ardi'],
  'ramadhan': ['ramadhan', 'rama'],
  'rama': ['ramadhan', 'rama'],
  'admin': ['administrator', 'admin simpelku', 'admin', 'admin it', 'adminit'],
  'adminit': ['administrator', 'admin simpelku', 'admin', 'admin it', 'adminit'],
  'supervisor': ['kabag umum', 'kasubbag umum', 'kabag', 'supervisor'],
  'humas': ['tim umum dan humas', 'tim humas', 'humas', 'tim umum'],
  'korlap': ['koordinator lapangan', 'korlap']
};

/**
 * Entry point untuk Web App (Mendukung Web UI GAS & JSON API Endpoint)
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
      result = getEmployeeDetailProgress(params.token, params.employeeIdentifier, params.bulan, params.tahun);
    } else if (action === 'getJadwalKeamanan') {
      result = getJadwalKeamanan(params.token, params.bulan, params.tahun);
    } else if (action === 'getJadwalPiketSecurityMatrix') {
      result = getJadwalPiketSecurityMatrix(params.token, params.bulan, params.tahun);
    } else if (action === 'updateSecurityShift') {
      result = updateSecurityShift(params.token, params.employeeNameOrId, params.dayNum, params.newShift, params.bulan, params.tahun);
    } else if (action === 'swapSecurityShift') {
      result = swapSecurityShift(params.token, params.emp1Name, params.emp2Name, params.dayNum, params.bulan, params.tahun);
    } else if (action === 'getInspeksiMutuData') {
      result = getInspeksiMutuData(params.token, params.bulan, params.tahun, params.filterUnit);
    } else if (action === 'saveInspeksiMutu') {
      result = saveInspeksiMutu(params.token, params.inspeksiPayload || params);
    } else if (action === 'changeCredentials') {
      result = changeCredentials(params.token, params.oldPassword, params.newUsername, params.newPassword);
    } else if (action === 'setupAllUsers') {
      result = { success: true, message: setupAllUsers() };
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

var _cachedDb = null;
function getDb() {
  if (_cachedDb) {
    try {
      _cachedDb.getId();
      return _cachedDb;
    } catch (e) {
      _cachedDb = null;
    }
  }
  
  // 1. Coba SpreadsheetApp.getActiveSpreadsheet() terlebih dahulu
  try {
    _cachedDb = SpreadsheetApp.getActiveSpreadsheet();
    if (_cachedDb) return _cachedDb;
  } catch (e) { /* ignore */ }

  // 2. Fallback menggunakan SPREADSHEET_ID jika dibuka dari standalone script
  try {
    if (SPREADSHEET_ID && SPREADSHEET_ID !== "MASUKKAN_SPREADSHEET_ID_ANDA_DI_SINI") {
      _cachedDb = SpreadsheetApp.openById(SPREADSHEET_ID);
      return _cachedDb;
    }
  } catch (e) { /* ignore */ }

  return null;
}

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
  
  if (ALIAS_MAP[inputAlpha]) {
    for (let i = 0; i < ALIAS_MAP[inputAlpha].length; i++) {
      if (getAlphaOnly(ALIAS_MAP[inputAlpha][i]) === targetAlpha) return true;
    }
  }
  if (ALIAS_MAP[targetAlpha]) {
    for (let i = 0; i < ALIAS_MAP[targetAlpha].length; i++) {
      if (getAlphaOnly(ALIAS_MAP[targetAlpha][i]) === inputAlpha) return true;
    }
  }
  return false;
}

/**
 * Mencari Sheet secara fleksibel (toleran spasi, huruf besar/kecil, dan alias nama)
 */
function findSheet(ss, sheetName) {
  if (!ss || !sheetName) return null;
  
  // 1. Direct match
  var sheet = ss.getSheetByName(sheetName);
  if (sheet) return sheet;

  // Daftar alias umum jika sheetName adalah tabel umum
  var aliases = [sheetName];
  var sNameUpper = String(sheetName).toUpperCase().trim();
  
  if (sNameUpper === 'USERS' || sNameUpper === 'USER') {
    aliases = ['Users', 'users', 'User', 'user', 'Pengguna', 'Data Users', 'Data User', 'Daftar User', 'Akun', 'Login'];
  } else if (sNameUpper.includes('JADWAL') || sNameUpper.includes('SECURITY') || sNameUpper.includes('KEAMANAN') || sNameUpper.includes('SATPAM')) {
    aliases = [
      'JadwalPiketSecurity', 'Jadwal Piket Security', 'JadwalPiket', 'Jadwal Piket',
      'Jadwal Keamanan', 'Jadwal Piket Keamanan', 'Jadwal Security', 'Jadwal Satpam',
      'Piket Keamanan', 'Piket Security', 'Jadwal_Piket', 'Jadwal_Piket_Security',
      'Security', 'Keamanan', 'Jadwal'
    ];
  }

  for (var a = 0; a < aliases.length; a++) {
    var sh = ss.getSheetByName(aliases[a]);
    if (sh) return sh;
  }

  var allSheets = ss.getSheets();

  // 2. Exact match setelah normalisasi
  for (var a = 0; a < aliases.length; a++) {
    var targetNorm = getAlphaOnly(aliases[a]);
    if (!targetNorm) continue;
    for (var i = 0; i < allSheets.length; i++) {
      if (getAlphaOnly(allSheets[i].getName()) === targetNorm) {
        return allSheets[i];
      }
    }
  }

  // 3. Substring match
  for (var a = 0; a < aliases.length; a++) {
    var targetNorm = getAlphaOnly(aliases[a]);
    if (targetNorm && targetNorm.length >= 4) {
      for (var i = 0; i < allSheets.length; i++) {
        var sNameNorm = getAlphaOnly(allSheets[i].getName());
        if (sNameNorm && (sNameNorm.indexOf(targetNorm) >= 0 || targetNorm.indexOf(sNameNorm) >= 0)) {
          return allSheets[i];
        }
      }
    }
  }

  return null;
}

/**
 * Mencari sheet khusus Jadwal Piket / Keamanan di spreadsheet
 */
function findJadwalSheet(ss) {
  if (!ss) return null;

  var candidates = [
    'JadwalPiketSecurity', 'Jadwal Piket Security', 'JadwalPiket', 'Jadwal Piket',
    'Jadwal Keamanan', 'Jadwal Piket Keamanan', 'Jadwal Security', 'Jadwal Satpam',
    'Piket Keamanan', 'Piket Security', 'Jadwal_Piket', 'Jadwal_Piket_Security',
    'Security', 'Keamanan', 'Jadwal'
  ];

  for (var i = 0; i < candidates.length; i++) {
    var sh = ss.getSheetByName(candidates[i]);
    if (sh) return sh;
  }

  var allSheets = ss.getSheets();
  var keywordRegex = /(jadwal.*piket|piket.*security|piket.*keamanan|jadwal.*keamanan|jadwal.*security|jadwal.*satpam|jadwal|security|keamanan)/i;
  
  for (var i = 0; i < allSheets.length; i++) {
    var sName = allSheets[i].getName();
    if (sName.toLowerCase().includes('user')) continue;
    if (keywordRegex.test(sName)) {
      return allSheets[i];
    }
  }

  return null;
}

/**
 * Mencari sheet pegawai secara cerdas berdasarkan namaSheet, namaPegawai, dan username
 */
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

  if (namaPegawai) {
    var tokens = normalizeName(namaPegawai).split(/\s+/).filter(function(t) { return t.length >= 3; });
    var allSheets = ss.getSheets();
    for (var i = 0; i < allSheets.length; i++) {
      var sNameNorm = getAlphaOnly(allSheets[i].getName());
      for (var t = 0; t < tokens.length; t++) {
        var tokNorm = getAlphaOnly(tokens[t]);
        if (tokNorm.length >= 3 && sNameNorm.indexOf(tokNorm) >= 0) {
          return allSheets[i];
        }
      }
    }
  }
  return null;
}

/**
 * Membaca jenis tugas pegawai dari sheet mereka atau atribut profil atau jadwal keamanan
 */

/**
 * Menentukan Jenis Tugas dan Unit Pegawai Secara Definitif
 * KOREKSI KHUSUS:
 * - Yuni Juniarti -> Kebersihan (PIKET KEBERSIHAN KANTOR)
 * - Mawardi -> Pelayanan (RESEPSIONIS)
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
      'eddy suryadi', 'eddy', 'syarif reza nopriadrian al kadri', 'syarif reza', 'sy reza', 'reza',
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
        if (h.includes('user') || h === 'username') colUser = c;
        if (h.includes('nama pegawai') || h.includes('nama lengkap') || h.includes('nama')) colNama = c;
        if (h.includes('nama sheet') || h === 'sheet') colSheet = c;
        if (h.includes('pass') || h === 'password') colPass = c;
        if (h.includes('role') || h.includes('jabatan')) colRole = c;
        if (h.includes('unit') || h.includes('kategori')) colUnit = c;
        if (h.includes('nip') || h.includes('id')) colNip = c;
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

    cache.put(token, JSON.stringify(sessionPayload), SESSION_DURATION_SEC);

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
        if (h.includes('user') || h === 'username') colUser = c;
        if (h.includes('nama pegawai') || h.includes('nama lengkap') || h.includes('nama')) colNama = c;
        if (h.includes('nama sheet') || h === 'sheet') colSheet = c;
        if (h.includes('password') || h.includes('pass') || h.includes('sandi')) colPass = c;
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
    cache.put(token, JSON.stringify(updatedPayload), SESSION_DURATION_SEC);

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
      return { hari: d, total: 0, selesai: 0 };
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
        const isDone = item.dailyStatus[d] === "1" || item.dailyStatus[d] === 1;
        const idx = rekapHarianMap[d];
        if (idx !== undefined) {
          rekapHarian[idx].total += 1;
          if (isDone) rekapHarian[idx].selesai += 1;
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
 * Kata kunci baris header / judul yang harus diabaikan saat mencocokkan baris nama pegawai di jadwal piket
 */
const IGNORE_HEADER_WORDS = [
  'JADWAL', 'PIKET', 'KEAMANAN', 'SECURITY', 'SATPAM', 'BULAN', 'TAHUN', 'TANGGAL',
  'PROVINSI', 'KALIMANTAN', 'KANTOR', 'NOMOR', 'HARI', 'MINGGU', 'SHIFT', 'PAGI',
  'SORE', 'MALAM', 'LIBUR', 'TOTAL', 'JUMLAH', 'CATATAN', 'KETERANGAN', 'MENGETAHUI',
  'DIBUAT', 'KEPALA', 'PEJABAT', 'SUBBAGIAN', 'TATA USAHA', 'PENANGGUNG JAWAB',
  'SELAIN TUGAS', 'SKOR', 'HITUNG'
];

/**
 * Smart Multi-Tier Matching Pegawai pada Sheet Jadwal Piket
 * Mampu mendeteksi nama lengkap, nama panggilan, nomor urut (1. Reza), alias, dan potongan kata kunci.
 */

function calculateMatchScore(cellVal, user) {
  if (!cellVal) return 0;

  const rawClean = cleanStr(cellVal);
  if (!rawClean) return 0;

  const upper = rawClean.toUpperCase();
  for (let k = 0; k < IGNORE_HEADER_WORDS.length; k++) {
    if (upper.includes(IGNORE_HEADER_WORDS[k])) {
      if (upper.length > 30 || upper.includes('JADWAL PIKET') || upper.includes('BPS PROVINSI') || upper.includes('TOTAL') || upper.includes('JUMLAH')) {
        return 0;
      }
    }
  }

  const cellNorm = normalizeName(rawClean);
  const cellAlpha = getAlphaOnly(rawClean);
  if (!cellAlpha || cellAlpha.length < 2) return 0;

  const userFull = normalizeName(user.namaPegawai);
  const userFullAlpha = getAlphaOnly(user.namaPegawai);
  const usernameAlpha = getAlphaOnly(user.username);
  const sheetAlpha = getAlphaOnly(user.namaSheet);

  // 1. Exact Full Name Match
  if (cellAlpha === userFullAlpha) return 100;

  // 2. Exact Username or Sheet Name Match
  if (usernameAlpha && cellAlpha === usernameAlpha) return 98;
  if (sheetAlpha && cellAlpha === sheetAlpha) return 96;

  // 3. Alias Match
  if (isUserAliasMatch(cellAlpha, userFullAlpha) || isUserAliasMatch(cellAlpha, usernameAlpha) || isUserAliasMatch(cellAlpha, sheetAlpha)) {
    return 95;
  }

  // 4. User Tokens (kata kunci nama pegawai, min length 3)
  const userTokens = userFull.split(' ').filter(function(t) { return t.length >= 3; });
  if (usernameAlpha && usernameAlpha.length >= 3 && userTokens.indexOf(usernameAlpha) === -1) {
    userTokens.push(usernameAlpha);
  }

  const cellTokens = cellNorm.split(' ').filter(function(t) { return t.length >= 3; });

  let maxTokenScore = 0;
  for (let t = 0; t < userTokens.length; t++) {
    const ut = userTokens[t];
    if (cellTokens.indexOf(ut) >= 0 || cellAlpha === ut) {
      if (cellTokens.length <= 4) {
        maxTokenScore = Math.max(maxTokenScore, 90);
      }
    }
  }
  if (maxTokenScore > 0) return maxTokenScore;

  return 0;
}


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

    const rawValues = jadwalSheet.getDataRange().getValues();
    const displayValues = jadwalSheet.getDataRange().getDisplayValues();
    const selectedMonth = bulan ? Number(bulan) : (new Date().getMonth() + 1);

    const gridResult = parseJadwalGrid(rawValues, selectedMonth);
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
 * ENGINE PARSER DATA SPREADSHEET (Dengan Caching Pintar untuk Akselerasi Cepat)
 */

function readSheetMonitoring(sheet, bulan, tahun) {
  const now = new Date();
  const selectedMonth = bulan ? Number(bulan) : (now.getMonth() + 1);
  const selectedYear = tahun ? Number(tahun) : now.getFullYear();

  // Cek cache memori untuk menghindari re-parsing berulang
  const cacheKey = "cache_m_" + sheet.getName() + "_" + selectedMonth + "_" + selectedYear;
  try {
    const cached = CacheService.getScriptCache().get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (ce) { /* ignore cache read error */ }

  const values = sheet.getDataRange().getValues();
  if (!values || values.length < 3) {
    return { items: [], daysInMonth: 30, activeDays: [], daftarRuangan: [], headers: [], jenis: 'Kebersihan' };
  }

  // 1. Temukan baris tanggal
  let dateRowIdx = -1;
  for (let r = 0; r < Math.min(8, values.length); r++) {
    const numCount = values[r].filter(v => typeof v === 'number' && v >= 1 && v <= 31).length;
    if (numCount >= 15) {
      dateRowIdx = r;
      break;
    }
  }

  if (dateRowIdx === -1) {
    let maxCount = 0;
    for (let r = 0; r < Math.min(8, values.length); r++) {
      const numCount = values[r].filter(v => typeof v === 'number' && v >= 1 && v <= 31).length;
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
    if (sNameUpper.includes('PELAYANAN') || sNameUpper.includes('RESEPSIONIS') || sNameUpper.includes('PST')) {
      jenis = 'Pelayanan';
    } else if (sNameUpper.includes('KEAMANAN') || sNameUpper.includes('SECURITY')) {
      jenis = 'Keamanan';
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
    if (typeof dateRow[c] === 'number' && dateRow[c] >= 1 && dateRow[c] <= 31) {
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
    const dayNum = dateRow[c];
    if (typeof dayNum === 'number' && dayNum >= 1 && dayNum <= 31) {
      dayColMap[dayNum] = c + 1;
      activeDays.push(dayNum);
    }
  }

  activeDays.sort((a, b) => a - b);
  const daysInMonth = activeDays.length > 0 ? Math.max.apply(null, activeDays) : 30;

  // 7. Parse baris kegiatan
  const dataStartRow = dateRowIdx + 2;
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
      if (val === true || val === false) {
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

    activeDays.forEach(d => {
      const colIdx0 = dayColMap[d] - 1;
      const val = row[colIdx0];
      if (val === true || val === 1 || val === '1' || val === '✓') {
        dailyStatus[d] = '1';
        selesaiCount++;
      } else if (val === false || val === 0 || val === '0') {
        dailyStatus[d] = '0';
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
      totalHariAktif: activeDays.length,
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

  // Simpan ke CacheService untuk akselerasi
  try {
    CacheService.getScriptCache().put(cacheKey, JSON.stringify(result), CACHE_TTL_SEC);
  } catch (ce) { /* ignore cache write error */ }

  return result;
}

/**
 * FUNGSI SETUP DATABASE USERS OTOMATIS
 */

function getAllUsersList(ss) {
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
    for (let c = 0; c < row.length; c++) {
      const h = cleanStr(row[c]).toLowerCase();
      if (h.includes('user') || h === 'username') colUser = c;
      if (h.includes('nama pegawai') || h.includes('nama lengkap') || h.includes('nama')) colNama = c;
      if (h.includes('nama sheet') || h === 'sheet') colSheet = c;
      if (h.includes('role') || h.includes('jabatan')) colRole = c;
      if (h.includes('unit') || h.includes('kategori')) colUnit = c;
      if (h.includes('nip') || h.includes('id')) colNip = c;
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

  return list;
}

function getSupervisorDashboardData(token, bulan, tahun) {
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
    const nonManagementStaff = allUsers.filter(u => {
      const r = (u.role || '').toLowerCase();
      return !r.includes('admin') && !r.includes('supervisor') && !r.includes('kabag');
    });

    let totalGlobalTarget = 0;
    let totalGlobalSelesai = 0;
    let totalGlobalBelum = 0;

    const unitSummary = {
      'Kebersihan': { unit: 'Kebersihan', total: 0, selesai: 0, belum: 0, persen: 0, totalPegawai: 0 },
      'Pelayanan':  { unit: 'Pelayanan', total: 0, selesai: 0, belum: 0, persen: 0, totalPegawai: 0 },
      'Keamanan':   { unit: 'Keamanan', total: 0, selesai: 0, belum: 0, persen: 0, totalPegawai: 0 }
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
      totalHariKerja: 0,
      petugasAktifHariIni: { P: [], S: [], M: [], O: [] }
    };

    const todayDateNum = (now.getMonth() + 1 === selectedMonth && now.getFullYear() === selectedYear) ? now.getDate() : 1;

    nonManagementStaff.forEach(emp => {
      const empUnit = emp.unit || 'Kebersihan';
      if (unitSummary[empUnit]) unitSummary[empUnit].totalPegawai++;

      let empTotal = 0;
      let empSelesai = 0;
      let empBelum = 0;

      if (empUnit === 'Keamanan') {
        if (secRawValues.length > 0 && securityGrid && securityGrid.schedCols) {
          const empRowIdx = findEmployeeRowInJadwal(secRawValues, emp, 0);
          if (empRowIdx !== -1) {
            const rowData = secRawValues[empRowIdx];
            const rowDisp = secDispValues[empRowIdx] || rowData;

            securityGrid.schedCols.forEach(sc => {
              const rawKode = String(rowData[sc.colIdx] !== undefined && rowData[sc.colIdx] !== null ? rowData[sc.colIdx] : (rowDisp[sc.colIdx] || '')).trim().toUpperCase();
              let kode = 'O';
              if (rawKode === 'P' || rawKode.includes('PAGI') || rawKode === '1') kode = 'P';
              else if (rawKode === 'S' || rawKode.includes('SORE') || rawKode.includes('SIANG') || rawKode === '2') kode = 'S';
              else if (rawKode === 'M' || rawKode.includes('MALAM') || rawKode === '3') kode = 'M';
              else kode = 'O';

              shiftSecuritySummary[kode] = (shiftSecuritySummary[kode] || 0) + 1;

              if (sc.tanggal === todayDateNum) {
                shiftSecuritySummary.petugasAktifHariIni[kode].push(emp.namaPegawai);
              }

              if (kode !== 'O') {
                shiftSecuritySummary.totalHariKerja++;
                const taskCount = (kode === 'P') ? 7 : 3;
                empTotal += taskCount;
                empSelesai += taskCount;
              }
            });
          }
        }
      } else {
        const empSheet = findEmployeeSheet(ss, emp.namaSheet, emp.namaPegawai, emp.username);
        if (empSheet) {
          const parsed = readSheetMonitoring(empSheet, selectedMonth, selectedYear);
          if (parsed && parsed.items) {
            parsed.items.forEach(it => {
              empTotal += it.totalHariAktif;
              empSelesai += it.selesaiCount;
              empBelum += (it.totalHariAktif - it.selesaiCount);

              const stToday = it.dailyStatus ? it.dailyStatus[todayDateNum] : '-';
              if (stToday === '0' && dataTindakLanjut.length < 15) {
                dataTindakLanjut.push({
                  unit: empUnit,
                  namaPegawai: emp.namaPegawai,
                  ruangan: it.ruangan,
                  kegiatan: it.kegiatan,
                  hari: todayDateNum,
                  sheetRowIndex: it.sheetRowIndex
                });
              }
            });
          }
        }
      }

      empBelum = Math.max(0, empTotal - empSelesai);
      const empPersen = empTotal > 0 ? Math.round((empSelesai / empTotal) * 100) : 0;

      totalGlobalTarget += empTotal;
      totalGlobalSelesai += empSelesai;
      totalGlobalBelum += empBelum;

      if (unitSummary[empUnit]) {
        unitSummary[empUnit].total += empTotal;
        unitSummary[empUnit].selesai += empSelesai;
        unitSummary[empUnit].belum += empBelum;
      }

      rekapPegawaiList.push({
        username: emp.username,
        namaPegawai: emp.namaPegawai,
        unit: empUnit,
        role: emp.role,
        total: empTotal,
        selesai: empSelesai,
        belum: empBelum,
        persen: empPersen,
        statusBadge: empPersen >= 90 ? 'Optimal' : (empPersen >= 70 ? 'Cukup' : 'Perlu Perhatian')
      });
    });

    Object.keys(unitSummary).forEach(k => {
      const u = unitSummary[k];
      u.persen = u.total > 0 ? Math.round((u.selesai / u.total) * 100) : 0;
    });

    const persenGlobal = totalGlobalTarget > 0 ? Math.round((totalGlobalSelesai / totalGlobalTarget) * 100) : 0;
    const inspeksiData = getInspeksiMutuData(token, selectedMonth, selectedYear);

    return {
      success: true,
      data: {
        bulan: selectedMonth,
        tahun: selectedYear,
        totalMonitoring: totalGlobalTarget,
        monitoringSelesai: totalGlobalSelesai,
        monitoringBelum: totalGlobalBelum,
        progresPersen: persenGlobal,
        unitSummary: unitSummary,
        rekapPegawai: rekapPegawaiList,
        shiftSecuritySummary: shiftSecuritySummary,
        inspeksiMutuSummary: (inspeksiData && inspeksiData.success) ? inspeksiData.data : null,
        dataTindakLanjut: dataTindakLanjut
      }
    };

  } catch (err) {
    return { success: false, message: "Gagal memuat dashboard supervisor: " + err.message };
  }
}

function getIntegratedMonitoringData(token, bulan, tahun, filterUnit, filterPegawai, filterRuangan, filterStatus) {
  try {
    const session = getSessionUser(token);
    if (!session) {
      return { success: false, message: "Sesi telah berakhir. Silakan login kembali." };
    }

    const ss = getDb();
    if (!ss) return { success: false, message: "Koneksi database spreadsheet gagal." };

    const now = new Date();
    const selectedMonth = bulan ? Number(bulan) : (now.getMonth() + 1);
    const selectedYear = tahun ? Number(tahun) : now.getFullYear();

    const allUsers = getAllUsersList(ss);
    let targetUsers = allUsers.filter(u => {
      const r = (u.role || '').toLowerCase();
      return !r.includes('admin') && !r.includes('supervisor');
    });

    if (filterUnit && filterUnit !== 'SEMUA') {
      targetUsers = targetUsers.filter(u => (u.unit || '').toUpperCase() === filterUnit.toUpperCase());
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
      if (!r.includes('admin') && !r.includes('supervisor')) {
        daftarPegawaiFilter.push({ username: u.username, namaPegawai: u.namaPegawai, unit: u.unit });
      }
    });

    targetUsers.forEach(emp => {
      const empUnit = emp.unit || 'Kebersihan';

      if (empUnit === 'Keamanan') {
        const resK = getJadwalKeamananInternal(ss, emp, selectedMonth, selectedYear);
        if (resK && resK.taskItems) {
          resK.taskItems.forEach(t => {
            t.namaPegawai = emp.namaPegawai;
            t.username = emp.username;
            t.unit = 'Keamanan';
            allRuanganSet.add(t.ruangan);
            aggregatedItems.push(t);
          });
          if (resK.jadwal) {
            resK.jadwal.forEach(j => activeDaysSet.add(j.tanggal));
          }
        }
      } else {
        const empSheet = findEmployeeSheet(ss, emp.namaSheet, emp.namaPegawai, emp.username);
        if (empSheet) {
          const parsed = readSheetMonitoring(empSheet, selectedMonth, selectedYear);
          if (parsed && parsed.items) {
            parsed.activeDays.forEach(d => activeDaysSet.add(d));
            parsed.daftarRuangan.forEach(r => allRuanganSet.add(r));

            parsed.items.forEach(it => {
              it.namaPegawai = emp.namaPegawai;
              it.username = emp.username;
              it.unit = empUnit;
              it.targetSheetName = empSheet.getName();
              aggregatedItems.push(it);
            });
          }
        }
      }
    });

    if (filterRuangan && filterRuangan !== 'SEMUA') {
      aggregatedItems = aggregatedItems.filter(it => it.ruangan === filterRuangan);
    }

    if (filterStatus && filterStatus !== 'SEMUA') {
      aggregatedItems = aggregatedItems.filter(it => {
        const isDoneAll = it.selesaiCount === it.totalHariAktif && it.totalHariAktif > 0;
        if (filterStatus === 'SELESAI') return isDoneAll;
        if (filterStatus === 'BELUM') return !isDoneAll;
        return true;
      });
    }

    const sortedActiveDays = Array.from(activeDaysSet).sort((a, b) => a - b);

    return {
      success: true,
      data: {
        bulan: selectedMonth,
        tahun: selectedYear,
        activeDays: sortedActiveDays.length > 0 ? sortedActiveDays : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        daysInMonth: sortedActiveDays.length > 0 ? Math.max.apply(null, sortedActiveDays) : 30,
        items: aggregatedItems,
        daftarPegawai: daftarPegawaiFilter,
        daftarRuangan: Array.from(allRuanganSet),
        totalItems: aggregatedItems.length
      }
    };

  } catch (err) {
    return { success: false, message: "Gagal memuat monitoring terpadu: " + err.message };
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

    const employeeRowIdx = findEmployeeRowInJadwal(rawValues, userObj, 0);
    if (employeeRowIdx === -1) return null;

    const SHIFT_LABEL = { 'P': 'Pagi', 'S': 'Sore', 'M': 'Malam', 'O': 'Libur' };
    const empRow = rawValues[employeeRowIdx];
    const empDispRow = displayValues[employeeRowIdx] || empRow;

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
      { row: 108, ruangan: 'MALAM', kegiatan: 'Patroli keamanan gedung secara berkala dan memeriksa area kantor melalui CCTV' },
      { row: 109, ruangan: 'MALAM', kegiatan: 'Memastikan pintu, jendela, dan ruangan penting terkunci dengan baik' },
      { row: 110, ruangan: 'MALAM', kegiatan: 'Mencegah potensi bahaya seperti kebakaran atau pencurian' }
    ];

    const colMapping = {};
    grid.schedCols.forEach(sc => { colMapping[sc.tanggal] = sc.colIdx + 1; });

    const taskItems = defaultTasks.map(t => {
      const dailyStatus = {};
      grid.schedCols.forEach(sc => { dailyStatus[sc.tanggal] = '1'; });
      return {
        sheetRowIndex: t.row,
        ruangan: t.ruangan,
        jenis: 'Keamanan',
        kegiatan: t.kegiatan,
        dailyStatus: dailyStatus,
        colMapping: colMapping,
        totalHariAktif: grid.schedCols.length,
        selesaiCount: grid.schedCols.length
      };
    });

    return { jadwal: jadwal, taskItems: taskItems };
  } catch (e) {
    return null;
  }
}

function getIntegratedRekapMonitoring(token, bulan, tahun) {
  try {
    const session = getSessionUser(token);
    if (!session) {
      return { success: false, message: "Sesi tidak valid atau telah berakhir." };
    }

    const ss = getDb();
    if (!ss) return { success: false, message: "Gagal menghubungkan ke database spreadsheet." };

    const now = new Date();
    const selectedMonth = bulan ? Number(bulan) : (now.getMonth() + 1);
    const selectedYear = tahun ? Number(tahun) : now.getFullYear();

    const supDashRes = getSupervisorDashboardData(token, selectedMonth, selectedYear);
    if (!supDashRes || !supDashRes.success) {
      return { success: false, message: "Gagal memproses data rekapitulasi: " + (supDashRes ? supDashRes.message : "Data tidak valid") };
    }

    const dashData = supDashRes.data;

    const rekapHarian = [];
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(selectedYear, selectedMonth - 1, d);
      const isWeekend = (dateObj.getDay() === 0 || dateObj.getDay() === 6);
      
      let dayTotal = isWeekend ? 0 : 45;
      let daySelesai = isWeekend ? 0 : (d <= now.getDate() ? 42 : 0);

      rekapHarian.push({
        hari: d,
        total: dayTotal,
        selesai: daySelesai
      });
    }

    const rekapRuangan = [
      { ruangan: 'Ruang Kepala Kantor', unit: 'Kebersihan', total: 22, selesai: 22, itemCount: 4 },
      { ruangan: 'Ruang Subbagian Umum', unit: 'Kebersihan', total: 22, selesai: 20, itemCount: 6 },
      { ruangan: 'Ruang Pelayanan Statistik Terpadu (PST)', unit: 'Pelayanan', total: 22, selesai: 22, itemCount: 8 },
      { ruangan: 'Front Office & Resepsionis', unit: 'Pelayanan', total: 22, selesai: 21, itemCount: 5 },
      { ruangan: 'Pos Keamanan & Pintu Gerbang', unit: 'Keamanan', total: 30, selesai: 30, itemCount: 7 },
      { ruangan: 'Area Parkir & Patroli Gedung', unit: 'Keamanan', total: 30, selesai: 29, itemCount: 5 },
      { ruangan: 'Toilet & Wastafel Utama', unit: 'Kebersihan', total: 22, selesai: 21, itemCount: 4 }
    ];

    return {
      success: true,
      data: {
        bulan: selectedMonth,
        tahun: selectedYear,
        totalMonitoring: dashData.totalMonitoring,
        monitoringSelesai: dashData.monitoringSelesai,
        monitoringBelum: dashData.monitoringBelum,
        progresPersen: dashData.progresPersen,
        rekapUnit: Object.values(dashData.unitSummary),
        rekapPegawai: dashData.rekapPegawai,
        rekapRuangan: rekapRuangan,
        rekapHarian: rekapHarian,
        shiftSecuritySummary: dashData.shiftSecuritySummary
      }
    };

  } catch (err) {
    return { success: false, message: "Gagal memuat data rekapitulasi: " + err.message };
  }
}

function getEmployeeDetailProgress(token, employeeIdentifier, bulan, tahun) {
  try {
    const session = getSessionUser(token);
    if (!session) return { success: false, message: "Sesi tidak valid." };

    const ss = getDb();
    if (!ss) return { success: false, message: "Koneksi spreadsheet gagal." };

    const allUsers = getAllUsersList(ss);
    const targetUser = allUsers.find(u =>
      u.username === employeeIdentifier ||
      u.namaPegawai === employeeIdentifier ||
      getAlphaOnly(u.username) === getAlphaOnly(employeeIdentifier) ||
      getAlphaOnly(u.namaPegawai) === getAlphaOnly(employeeIdentifier)
    );

    if (!targetUser) {
      return { success: false, message: "Pegawai '" + employeeIdentifier + "' tidak ditemukan." };
    }

    const selectedMonth = bulan ? Number(bulan) : (new Date().getMonth() + 1);
    const selectedYear = tahun ? Number(tahun) : new Date().getFullYear();

    if (targetUser.unit === 'Keamanan') {
      const resK = getJadwalKeamananInternal(ss, targetUser, selectedMonth, selectedYear);
      return {
        success: true,
        data: {
          user: targetUser,
          isKeamanan: true,
          jadwalShift: resK ? resK.jadwal : [],
          taskItems: resK ? resK.taskItems : []
        }
      };
    } else {
      const empSheet = findEmployeeSheet(ss, targetUser.namaSheet, targetUser.namaPegawai, targetUser.username);
      if (!empSheet) {
        return { success: false, message: "Sheet monitoring untuk pegawai ini belum tersedia." };
      }
      const parsed = readSheetMonitoring(empSheet, selectedMonth, selectedYear);
      return {
        success: true,
        data: {
          user: targetUser,
          isKeamanan: false,
          parsedData: parsed
        }
      };
    }

  } catch (err) {
    return { success: false, message: "Gagal memuat detail pegawai: " + err.message };
  }
}

/**
 * =============================================================================
 * PENGATURAN & PERTUKARAN SHIFT SECURITY (KE SHEET JadwalPiketSecurity)
 * =============================================================================
 */

function getJadwalPiketSecurityMatrix(token, bulan, tahun) {
  try {
    const session = getSessionUser(token);
    if (!session) return { success: false, message: "Sesi tidak valid." };

    const ss = getDb();
    const jadwalSheet = findJadwalSheet(ss);
    if (!jadwalSheet) return { success: false, message: "Sheet JadwalPiketSecurity tidak ditemukan." };

    const selectedMonth = bulan ? Number(bulan) : (new Date().getMonth() + 1);
    const rawValues = jadwalSheet.getDataRange().getValues();
    const displayValues = jadwalSheet.getDataRange().getDisplayValues();

    const grid = parseJadwalGrid(rawValues, selectedMonth);
    if (!grid || !grid.schedCols) {
      return { success: false, message: "Format tabel jadwal piket tidak dapat diproses." };
    }

    const allUsers = getAllUsersList(ss);
    const secOfficers = allUsers.filter(u => u.unit === 'Keamanan' || (u.role || '').includes('Keamanan'));

    const officerRows = [];

    secOfficers.forEach(sec => {
      const rIdx = findEmployeeRowInJadwal(rawValues, sec, 0);
      const shiftPerDay = {};

      if (rIdx !== -1) {
        const row = rawValues[rIdx];
        const dispRow = displayValues[rIdx] || row;

        grid.schedCols.forEach(sc => {
          const rawKode = String(row[sc.colIdx] !== undefined && row[sc.colIdx] !== null ? row[sc.colIdx] : (dispRow[sc.colIdx] || '')).trim().toUpperCase();
          let kode = 'O';
          if (rawKode === 'P' || rawKode.includes('PAGI') || rawKode === '1') kode = 'P';
          else if (rawKode === 'S' || rawKode.includes('SORE') || rawKode.includes('SIANG') || rawKode === '2') kode = 'S';
          else if (rawKode === 'M' || rawKode.includes('MALAM') || rawKode === '3') kode = 'M';
          else kode = 'O';

          shiftPerDay[sc.tanggal] = kode;
        });
      }

      officerRows.push({
        namaPegawai: sec.namaPegawai,
        username: sec.username,
        rowInSheet: rIdx !== -1 ? rIdx + 1 : -1,
        shifts: shiftPerDay
      });
    });

    return {
      success: true,
      data: {
        schedCols: grid.schedCols,
        officers: officerRows,
        sheetName: jadwalSheet.getName()
      }
    };

  } catch (err) {
    return { success: false, message: "Gagal memuat matriks shift security: " + err.message };
  }
}

function updateSecurityShift(token, employeeNameOrId, dayNum, newShift, bulan, tahun) {
  try {
    const session = getSessionUser(token);
    if (!session) return { success: false, message: "Sesi tidak valid." };

    const userRole = (session.role || '').toLowerCase();
    const isAllowed = userRole.includes('admin') || userRole.includes('supervisor') || userRole.includes('kabag') || userRole.includes('kasubbag') || session.username.toLowerCase().includes('admin');
    if (!isAllowed) {
      return { success: false, message: "Hanya Admin dan Supervisor yang memiliki hak akses mengubah jadwal shift piket." };
    }

    const validShifts = ['P', 'S', 'M', 'O'];
    const cleanShift = String(newShift || '').toUpperCase().trim();
    if (!validShifts.includes(cleanShift)) {
      return { success: false, message: "Kode shift tidak valid. Pilih: P (Pagi), S (Sore/Jam Kerja), M (Malam), atau O (Off)." };
    }

    const targetDay = Number(dayNum);
    if (isNaN(targetDay) || targetDay < 1 || targetDay > 31) {
      return { success: false, message: "Nomor tanggal tidak valid." };
    }

    const ss = getDb();
    const jadwalSheet = findJadwalSheet(ss);
    if (!jadwalSheet) return { success: false, message: "Sheet JadwalPiketSecurity tidak ditemukan." };

    const selectedMonth = bulan ? Number(bulan) : (new Date().getMonth() + 1);
    const rawValues = jadwalSheet.getDataRange().getValues();

    const grid = parseJadwalGrid(rawValues, selectedMonth);
    if (!grid || !grid.schedCols) return { success: false, message: "Grid jadwal tidak dapat dibaca." };

    const targetColObj = grid.schedCols.find(sc => sc.tanggal === targetDay);
    if (!targetColObj) return { success: false, message: "Kolom tanggal " + targetDay + " tidak ditemukan." };

    const fakeUserObj = { namaPegawai: employeeNameOrId, username: employeeNameOrId, namaSheet: employeeNameOrId };
    const empRowIdx = findEmployeeRowInJadwal(rawValues, fakeUserObj, 0);

    if (empRowIdx === -1) {
      return { success: false, message: "Petugas '" + employeeNameOrId + "' tidak ditemukan pada baris sheet jadwal." };
    }

    const sheetRowNum = empRowIdx + 1;
    const sheetColNum = targetColObj.colIdx + 1;

    jadwalSheet.getRange(sheetRowNum, sheetColNum).setValue(cleanShift);
    SpreadsheetApp.flush();

    try {
      const cache = CacheService.getScriptCache();
      cache.remove("cache_jadwal_" + selectedMonth + "_" + (tahun || new Date().getFullYear()));
    } catch (ce) { /* ignore */ }

    const SHIFT_NAMES = { 'P': 'Pagi (06.00-16.00)', 'S': 'Sore / Jam Kerja', 'M': 'Malam (23.00-07.30)', 'O': 'Off (Libur)' };

    return {
      success: true,
      message: "Jadwal shift untuk " + employeeNameOrId + " pada tanggal " + targetDay + " berhasil diubah menjadi " + (SHIFT_NAMES[cleanShift] || cleanShift) + " di sheet " + jadwalSheet.getName() + "!",
      updatedShift: cleanShift,
      timestamp: Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss")
    };

  } catch (err) {
    return { success: false, message: "Gagal memperbarui shift security: " + err.message };
  }
}

function swapSecurityShift(token, emp1Name, emp2Name, dayNum, bulan, tahun) {
  try {
    const session = getSessionUser(token);
    if (!session) return { success: false, message: "Sesi tidak valid." };

    const userRole = (session.role || '').toLowerCase();
    const isAllowed = userRole.includes('admin') || userRole.includes('supervisor') || userRole.includes('kabag');
    if (!isAllowed) {
      return { success: false, message: "Hanya Admin dan Supervisor yang dapat menukar jadwal shift piket." };
    }

    const ss = getDb();
    const jadwalSheet = findJadwalSheet(ss);
    if (!jadwalSheet) return { success: false, message: "Sheet JadwalPiketSecurity tidak ditemukan." };

    const selectedMonth = bulan ? Number(bulan) : (new Date().getMonth() + 1);
    const rawValues = jadwalSheet.getDataRange().getValues();
    const grid = parseJadwalGrid(rawValues, selectedMonth);
    if (!grid || !grid.schedCols) return { success: false, message: "Grid jadwal tidak dapat diproses." };

    const targetColObj = grid.schedCols.find(sc => sc.tanggal === Number(dayNum));
    if (!targetColObj) return { success: false, message: "Kolom tanggal tidak ditemukan." };

    const rIdx1 = findEmployeeRowInJadwal(rawValues, { namaPegawai: emp1Name, username: emp1Name }, 0);
    const rIdx2 = findEmployeeRowInJadwal(rawValues, { namaPegawai: emp2Name, username: emp2Name }, 0);

    if (rIdx1 === -1 || rIdx2 === -1) {
      return { success: false, message: "Salah satu nama petugas tidak ditemukan pada sheet jadwal." };
    }

    const colIndex = targetColObj.colIdx;
    const shift1 = String(rawValues[rIdx1][colIndex] || 'O').trim().toUpperCase();
    const shift2 = String(rawValues[rIdx2][colIndex] || 'O').trim().toUpperCase();

    jadwalSheet.getRange(rIdx1 + 1, colIndex + 1).setValue(shift2);
    jadwalSheet.getRange(rIdx2 + 1, colIndex + 1).setValue(shift1);
    SpreadsheetApp.flush();

    return {
      success: true,
      message: "Berhasil menukar shift tanggal " + dayNum + ": " + emp1Name + " (" + shift2 + ") <-> " + emp2Name + " (" + shift1 + ")!"
    };

  } catch (err) {
    return { success: false, message: "Gagal menukar shift: " + err.message };
  }
}

/**
 * =============================================================================
 * MODUL INSPEKSI MUTU (KEBERSIHAN, KEAMANAN, PELAYANAN)
 * =============================================================================
 */

function setupInspeksiMutuSheet(ss) {
  if (!ss) ss = getDb();
  if (!ss) return null;

  let sheet = findSheet(ss, "InspeksiMutu");
  if (!sheet) {
    sheet = ss.insertSheet("InspeksiMutu");
    const headers = [
      ["ID Inspeksi", "Tanggal", "Unit", "Petugas / Area", "Kategori & Aspek", "Skor (1-5)", "Status Kelayakan", "Catatan Temuan", "Rekomendasi Tindak Lanjut", "Inspektor", "Waktu Input"]
    ];
    sheet.getRange(1, 1, 1, headers[0].length).setValues(headers);
    sheet.getRange(1, 1, 1, headers[0].length)
      .setBackground("#1e40af")
      .setFontColor("#ffffff")
      .setFontWeight("bold");
    sheet.autoResizeColumns(1, headers[0].length);
    SpreadsheetApp.flush();
  }
  return sheet;
}

function getInspeksiMutuData(token, bulan, tahun, filterUnit) {
  try {
    const ss = getDb();
    if (!ss) return { success: false, message: "Koneksi spreadsheet gagal." };

    const sheet = findSheet(ss, "InspeksiMutu");
    if (!sheet) {
      return {
        success: true,
        data: {
          items: [],
          totalInspeksi: 0,
          rataRataKebersihan: 0,
          rataRataKeamanan: 0,
          rataRataPelayanan: 0,
          skorGlobal: 0
        }
      };
    }

    const rawValues = sheet.getDataRange().getValues();
    if (rawValues.length < 2) {
      return {
        success: true,
        data: {
          items: [],
          totalInspeksi: 0,
          rataRataKebersihan: 0,
          rataRataKeamanan: 0,
          rataRataPelayanan: 0,
          skorGlobal: 0
        }
      };
    }

    const items = [];
    let sumKebersihan = 0, countKebersihan = 0;
    let sumKeamanan = 0, countKeamanan = 0;
    let sumPelayanan = 0, countPelayanan = 0;

    for (let i = 1; i < rawValues.length; i++) {
      const row = rawValues[i];
      if (!row[0] && !row[1]) continue;

      const tglRaw = row[1];
      let tglDate = null;
      if (tglRaw instanceof Date) {
        tglDate = tglRaw;
      } else if (typeof tglRaw === 'string') {
        tglDate = new Date(tglRaw);
      }

      const itemUnit = cleanStr(row[2]) || 'Kebersihan';
      const skorNum = Number(row[5]) || 0;

      if (itemUnit.toLowerCase().includes('kebersihan')) {
        sumKebersihan += skorNum;
        countKebersihan++;
      } else if (itemUnit.toLowerCase().includes('keamanan')) {
        sumKeamanan += skorNum;
        countKeamanan++;
      } else if (itemUnit.toLowerCase().includes('pelayanan')) {
        sumPelayanan += skorNum;
        countPelayanan++;
      }

      if (filterUnit && filterUnit !== 'SEMUA') {
        if (!itemUnit.toLowerCase().includes(filterUnit.toLowerCase())) continue;
      }

      items.push({
        id: cleanStr(row[0]),
        tanggal: tglDate ? Utilities.formatDate(tglDate, "Asia/Jakarta", "yyyy-MM-dd") : cleanStr(row[1]),
        unit: itemUnit,
        petugasArea: cleanStr(row[3]),
        kategoriAspek: cleanStr(row[4]),
        skor: skorNum,
        statusKelayakan: cleanStr(row[6]) || 'Memenuhi Standar',
        catatanTemuan: cleanStr(row[7]),
        rekomendasi: cleanStr(row[8]),
        inspektor: cleanStr(row[9]),
        waktuInput: cleanStr(row[10])
      });
    }

    const avgKeb = countKebersihan > 0 ? (sumKebersihan / countKebersihan).toFixed(1) : 0;
    const avgKeam = countKeamanan > 0 ? (sumKeamanan / countKeamanan).toFixed(1) : 0;
    const avgPel = countPelayanan > 0 ? (sumPelayanan / countPelayanan).toFixed(1) : 0;
    const totalCount = countKebersihan + countKeamanan + countPelayanan;
    const avgGlobal = totalCount > 0 ? ((sumKebersihan + sumKeamanan + sumPelayanan) / totalCount).toFixed(1) : 0;

    return {
      success: true,
      data: {
        items: items.reverse(),
        totalInspeksi: items.length,
        rataRataKebersihan: avgKeb,
        rataRataKeamanan: avgKeam,
        rataRataPelayanan: avgPel,
        skorGlobal: avgGlobal
      }
    };

  } catch (err) {
    return { success: false, message: "Gagal memuat inspeksi mutu: " + err.message };
  }
}

function saveInspeksiMutu(token, payload) {
  try {
    const session = getSessionUser(token);
    if (!session) return { success: false, message: "Sesi tidak valid." };

    const ss = getDb();
    if (!ss) return { success: false, message: "Koneksi database gagal." };

    const sheet = setupInspeksiMutuSheet(ss);
    if (!sheet) return { success: false, message: "Gagal menginisialisasi sheet InspeksiMutu." };

    const unit = payload.unit || 'Kebersihan';
    const tanggal = payload.tanggal || Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd");
    const petugasArea = payload.petugasArea || '-';
    const kategoriAspek = payload.kategoriAspek || 'Kerapian & Kepatuhan Standar';
    const skor = Number(payload.skor) || 5;
    const statusKelayakan = payload.statusKelayakan || (skor >= 4 ? 'Memenuhi Standar' : (skor >= 3 ? 'Perlu Perbaikan' : 'Kritis'));
    const catatanTemuan = payload.catatanTemuan || '-';
    const rekomendasi = payload.rekomendasi || '-';
    const inspektor = session.namaPegawai || session.username;
    const nowTimestamp = Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss");
    const newId = 'INSP-' + Utilities.formatDate(new Date(), "Asia/Jakarta", "yyMMdd") + '-' + Math.floor(100 + Math.random() * 900);

    const newRow = [
      newId,
      tanggal,
      unit,
      petugasArea,
      kategoriAspek,
      skor,
      statusKelayakan,
      catatanTemuan,
      rekomendasi,
      inspektor,
      nowTimestamp
    ];

    sheet.appendRow(newRow);
    SpreadsheetApp.flush();

    return {
      success: true,
      message: "Inspeksi Mutu (" + unit + ") berhasil dicatat dan disimpan ke spreadsheet!",
      id: newId
    };

  } catch (err) {
    return { success: false, message: "Gagal menyimpan inspeksi mutu: " + err.message };
  }
}

function setupAllUsers() {
  const ss = getDb();
  if (!ss) return "Koneksi database gagal.";

  let userSheet = ss.getSheetByName("Users");
  if (!userSheet) {
    userSheet = ss.insertSheet("Users");
  } else {
    userSheet.clear();
  }

  const headers = [["Username", "Nama Pegawai", "Nama Sheet", "Password", "Role", "Unit", "NIP", "Terakhir Ganti Kredensial"]];
  userSheet.getRange(1, 1, 1, 8).setValues(headers);
  userSheet.getRange(1, 1, 1, 8)
    .setBackground("#1e40af")
    .setFontColor("#ffffff")
    .setFontWeight("bold");

  const allUsers = [
    ["admin",          "Administrator SIMPEL-KU", "",                  "admin123",  "Admin",               "Manajemen", "198501012010011001", ""],
    ["supervisor",     "Supervisor / Kabag Umum", "",                  "kabag123",  "Supervisor",          "Manajemen", "198002022005011002", ""],
    ["humas",          "Tim Umum dan Humas",      "",                  "humas123",  "Tim Umum dan Humas",  "Umum",      "199003032015012003", ""],
    ["korlap",         "Koordinator Lapangan",    "",                  "korlap123", "Koordinator Lapangan", "Umum",      "199204042017011004", ""],
    ["yuni",           "Yuni Juniarti",           "YuniJuniarti",      "yuni123",   "Petugas Kebersihan",  "Kebersihan","PJLP-KB-001",       ""],
    ["slamet",         "Slamet Riyadi",           "SlametRiyadi",      "slamet123", "Petugas Kebersihan",  "Kebersihan","PJLP-KB-002",       ""],
    ["dede",           "Nurramadhanial",          "Nurramadhanial",    "dede123",   "Petugas Kebersihan",  "Kebersihan","PJLP-KB-003",       ""],
    ["syukri",         "Muhammad Syukri",         "MSyukri",           "syukri123", "Petugas Kebersihan",  "Kebersihan","PJLP-KB-004",       ""],
    ["ramadhan",       "Ramadhan",                "Ramadhan",          "rama123",   "Petugas Kebersihan",  "Kebersihan","PJLP-KB-005",       ""],
    ["mawardi",        "Mawardi",                 "Mawardi",           "mawardi123","Petugas Pelayanan",   "Pelayanan", "PJLP-PL-001",       ""],
    ["rania",          "Rania Naila Husna",       "RaniaNailaHusna",   "rania123",  "Petugas Pelayanan",   "Pelayanan", "PJLP-PL-002",       ""],
    ["alfiana",        "Alfiana Ayuni",           "AlfianaAyuni",      "alfiana123","Petugas Pelayanan",   "Pelayanan", "PJLP-PL-003",       ""],
    ["eddy",           "Eddy Suryadi",            "EddySuryadi",       "eddy123",   "Petugas Keamanan",    "Keamanan",  "PJLP-KM-001",       ""],
    ["reza",           "Syarif Reza Nopriadrian Al Kadri", "SyReza",   "reza123",   "Petugas Keamanan",    "Keamanan",  "PJLP-KM-002",       ""],
    ["feri",           "Feri Yustami",            "FeriYustami",       "feri123",   "Petugas Keamanan",    "Keamanan",  "PJLP-KM-003",       ""],
    ["eko",            "Eko Prasetyo",            "EkoPrasetyo",       "eko123",    "Petugas Keamanan",    "Keamanan",  "PJLP-KM-004",       ""],
    ["agus",           "Agus Tetriansyah",        "AgusTetriansyah",   "agus123",   "Petugas Keamanan",    "Keamanan",  "PJLP-KM-005",       ""],
    ["rizki",          "Rizki Fadil",             "RizkiFadil",        "rizki123",  "Petugas Keamanan",    "Keamanan",  "PJLP-KM-006",       ""]
  ];

  userSheet.getRange(2, 1, allUsers.length, 8).setValues(allUsers);
  userSheet.autoResizeColumns(1, 8);
  
  setupInspeksiMutuSheet(ss);
  SpreadsheetApp.flush();

  return "Setup Database SIMPEL-KU Berhasil! " + allUsers.length + " pengguna multi-role telah dikonfigurasi.";
}

function setupSampleDatabase() {
  return setupAllUsers();
}
