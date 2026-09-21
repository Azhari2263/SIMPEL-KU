/**
 * SISTEM MONITORING PELAYANAN, KEAMANAN & KEBERSIHAN UMUM (SIMPEL-KU)
 * Backend Engine - Google Apps Script (GAS)
 */

const SPREADSHEET_ID = "1c2XUeoYFt_UEqJruBSciKPAIiPEdNoJvTO9epLWVTqs"; // Spreadsheet ID (Fallback)
const SESSION_DURATION_SEC = 21600; // Durasi sesi login: 6 Jam
const CACHE_TTL_SEC = 60;           // Cache parsed data: 60 detik (akselerasi loading)

// Pemetaan nama bulan Indonesia & singkatan ke angka (fleksibel)
const MONTH_MAP_ID = {
  'JANUARI': 1, 'JAN': 1, 'JANUARY': 1, '01': 1, '1': 1,
  'FEBRUARI': 2, 'FEB': 2, 'FEBRUARY': 2, '02': 2, '2': 2,
  'MARET': 3, 'MAR': 3, 'MARCH': 3, '03': 3, '3': 3,
  'APRIL': 4, 'APR': 4, '04': 4, '4': 4,
  'MEI': 5, 'MAY': 5, '05': 5, '5': 5,
  'JUNI': 6, 'JUN': 6, 'JUNE': 6, '06': 6, '6': 6,
  'JULI': 7, 'JUL': 7, 'JULY': 7, '07': 7, '7': 7,
  'AGUSTUS': 8, 'AGU': 8, 'AGS': 8, 'AUG': 8, 'AUGUST': 8, '08': 8, '8': 8,
  'SEPTEMBER': 9, 'SEP': 9, 'SEPT': 9, '09': 9, '9': 9,
  'OKTOBER': 10, 'OKT': 10, 'OCT': 10, 'OCTOBER': 10, '10': 10,
  'NOVEMBER': 11, 'NOV': 11, '11': 11,
  'DESEMBER': 12, 'DES': 12, 'DEC': 12, 'DECEMBER': 12, '12': 12
};

// Deteksi apakah nama sheet merupakan sheet sistem (bukan sheet monitoring perorangan)
function isSystemSheet(sheetName) {
  if (!sheetName) return true;
  const s = String(sheetName).trim().toLowerCase();
  return (
    s === 'users' || s === 'user' || s === 'daftar user' || s === 'data_users' ||
    s === 'quality_audits' || s === 'quality_audit' || s === 'inspeksi_mutu' || s === 'qa' ||
    s === 'monthly_approvals' || s === 'monthly_approval' || s === 'approval' || s === 'approvals' ||
    s.includes('jadwal') || s.includes('security') || s.includes('satpam') || s.includes('piket')
  );
}

// Kata kunci baris yang harus di-skip pada matriks monitoring
const SKIP_ROW_KEYWORDS = [
  'HITUNG SKOR', 'CATATAN', 'SELAIN TUGAS', 'SELAIN TUGAS-TUGAS',
  'SELAMA JAM KERJA MENGGUNAKAN', 'SHIFT PAGI', 'SHIFT SORE', 'SHIFT MALAM'
];

// Kamus alias nama & panggilan umum untuk mencocokkan kredensial & jadwal piket
const ALIAS_MAP = {
  'dede': ['nurramadhanial', 'ramadhanial', 'nur ramadhanial', 'dede'],
  'nurramadhanial': ['dede', 'ramadhanial', 'nur ramadhanial'],
  'eddy': ['edi', 'eddy', 'edi suryadi', 'eddy suryadi'],
  'eddysuryadi': ['edi', 'eddy', 'edi suryadi', 'eddy suryadi'],
  'feri': ['ferry', 'fery', 'feri yustami', 'ferry yustami'],
  'feriyustami': ['ferry', 'fery', 'feri yustami', 'ferry yustami'],
  'reza': ['sy reza', 'syreza', 'sy. reza', 'syarif reza', 'reza nopriadrian', 'reza'],
  'syreza': ['sy reza', 'syreza', 'sy. reza', 'syarif reza', 'reza nopriadrian', 'reza'],
  'syarifrezanopriadrianalkadri': ['sy reza', 'syreza', 'sy. reza', 'syarif reza', 'reza nopriadrian', 'reza'],
  'syukri': ['m syukri', 'muhammad syukri', 'syukri'],
  'msyukri': ['m syukri', 'muhammad syukri', 'syukri'],
  'rizki': ['rizky', 'rizqi', 'rizki fadil', 'rizky fadil'],
  'rizkifadil': ['rizky', 'rizqi', 'rizki fadil', 'rizky fadil'],
  'slamet': ['slamet riyadi', 'slamet'],
  'slametriyadi': ['slamet riyadi', 'slamet'],
  'eko': ['eko prasetyo', 'eko'],
  'ekoprasetyo': ['eko prasetyo', 'eko'],
  'agus': ['agus tetriansyah', 'agus'],
  'agustetriansyah': ['agus tetriansyah', 'agus'],
  'yuni': ['yuni juniarti', 'yuni'],
  'yunijuniarti': ['yuni juniarti', 'yuni'],
  'rania': ['rania naila husna', 'rania'],
  'ranianailahusna': ['rania naila husna', 'rania'],
  'mawardi': ['mawardi', 'ardi'],
  'ramadhan': ['ramadhan', 'rama']
};

// Pemetaan baku definitif personil ke lembar sheet dan perannya masing-masing
// Yuni Juniarti = CS (Kebersihan), Mawardi = PELAYANAN (PST / Resepsionis)
const KNOWN_EMPLOYEE_SHEET_MAP = {
  // Unit Pelayanan (PST)
  'mawardi': { sheetCandidates: ['Mawardi', 'mawardi', 'PST Mawardi', 'Pelayanan Mawardi', 'Mawardi PST', 'Mawardi (PST)'], role: 'PELAYANAN', jenis: 'RESEPSIONIS' },
  'ardi': { sheetCandidates: ['Mawardi', 'mawardi'], role: 'PELAYANAN', jenis: 'RESEPSIONIS' },
  'rania': { sheetCandidates: ['RaniaNailaHusna', 'Rania Naila Husna', 'Rania', 'PST Rania'], role: 'PELAYANAN', jenis: 'RESEPSIONIS' },
  'ranianailahusna': { sheetCandidates: ['RaniaNailaHusna', 'Rania Naila Husna', 'Rania'], role: 'PELAYANAN', jenis: 'RESEPSIONIS' },
  'alfiana': { sheetCandidates: ['AlfianaAyuni', 'Alfiana Ayuni', 'Alfiana', 'PST Alfiana'], role: 'PELAYANAN', jenis: 'RESEPSIONIS' },
  'alfianaayuni': { sheetCandidates: ['AlfianaAyuni', 'Alfiana Ayuni', 'Alfiana'], role: 'PELAYANAN', jenis: 'RESEPSIONIS' },

  // Unit Kebersihan (CS)
  'yuni': { sheetCandidates: ['YuniJuniarti', 'Yuni Juniarti', 'Yuni', 'CS Yuni', 'Yuni CS', 'Yuni (CS)'], role: 'CS', jenis: 'PIKET KEBERSIHAN KANTOR' },
  'yunijuniarti': { sheetCandidates: ['YuniJuniarti', 'Yuni Juniarti', 'Yuni', 'CS Yuni', 'Yuni CS', 'Yuni (CS)'], role: 'CS', jenis: 'PIKET KEBERSIHAN KANTOR' },
  'dede': { sheetCandidates: ['Nurramadhanial', 'Dede', 'Nur Ramadhanial'], role: 'CS', jenis: 'PIKET KEBERSIHAN KANTOR' },
  'nurramadhanial': { sheetCandidates: ['Nurramadhanial', 'Dede', 'Nur Ramadhanial'], role: 'CS', jenis: 'PIKET KEBERSIHAN KANTOR' },
  'slamet': { sheetCandidates: ['SlametRiyadi', 'Slamet Riyadi', 'Slamet'], role: 'CS', jenis: 'PIKET KEBERSIHAN KANTOR' },
  'slametriyadi': { sheetCandidates: ['SlametRiyadi', 'Slamet Riyadi', 'Slamet'], role: 'CS', jenis: 'PIKET KEBERSIHAN KANTOR' },
  'syukri': { sheetCandidates: ['MSyukri', 'Muhammad Syukri', 'M. Syukri', 'Syukri'], role: 'CS', jenis: 'PIKET KEBERSIHAN KANTOR' },
  'msyukri': { sheetCandidates: ['MSyukri', 'Muhammad Syukri', 'M. Syukri', 'Syukri'], role: 'CS', jenis: 'PIKET KEBERSIHAN KANTOR' },
  'ramadhan': { sheetCandidates: ['Ramadhan', 'Rama'], role: 'CS', jenis: 'PIKET KEBERSIHAN KANTOR' }
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
    } else if (action === 'getMonitoringData') {
      result = getMonitoringData(
        params.token,
        params.jenis,
        params.bulan,
        params.tahun,
        params.filterRuangan || 'SEMUA',
        params.filterStatus || 'SEMUA',
        params.targetUser || ''
      );
    } else if (action === 'updateMonitoringStatus') {
      result = updateMonitoringStatus(
        params.token,
        params.rowIndex || params.sheetRowIndex,
        params.colIndex,
        params.newStatus,
        params.dayNum,
        params.monthNum || params.bulan,
        params.yearNum || params.tahun
      );
    } else if (action === 'getRekapMonitoring') {
      result = getRekapMonitoring(params.token, params.bulan, params.tahun, params.targetUser || '');
    } else if (action === 'getJadwalKeamanan') {
      result = getJadwalKeamanan(params.token, params.bulan, params.tahun, params.targetUser || '');
    } else if (action === 'changeCredentials') {
      result = changeCredentials(params.token, params.oldPassword, params.newUsername, params.newPassword);
    } else if (action === 'getSupervisorDashboardData') {
      result = getSupervisorDashboardData(params.token, params.bulan, params.tahun, params.filterUnit, params.filterLantai);
    } else if (action === 'getQualityAudits') {
      result = getQualityAudits(params.token, params.bulan, params.tahun);
    } else if (action === 'submitQualityAudit') {
      result = submitQualityAudit(params.token, params);
    } else if (action === 'approveMonthlyReport') {
      result = approveMonthlyReport(params.token, params);
    } else if (action === 'getMonthlyApprovals') {
      result = getMonthlyApprovals(params.token, params.bulan, params.tahun);
    } else if (action === 'getSecurityScheduleMatrix') {
      result = getSecurityScheduleMatrix(params.token, params.bulan, params.tahun);
    } else if (action === 'updateSecurityShift') {
      result = updateSecurityShift(params.token, params.username || params.targetUserOrName, params.tanggal, params.newShift || params.shift, params.bulan, params.tahun);
    } else if (action === 'swapSecurityShift') {
      result = swapSecurityShift(params.token, params.user1 || params.targetUser1, params.tanggal1 || params.day1 || params.tanggal, params.user2 || params.targetUser2, params.tanggal2 || params.day2, params.bulan, params.tahun);
    } else {
      result = { success: false, message: 'Aksi "' + action + '" tidak dikenali.' };
    }
  } catch (e) {
    result = { success: false, message: 'Server error: ' + e.message };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Helper untuk menyertakan file HTML parsial
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Instance Spreadsheet aktif (Mengutamakan Spreadsheet Aktif tempat script berjalan)
 */
let _cachedDb = null;
function getDb() {
  if (_cachedDb) return _cachedDb;
  
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

  // 2. Exact match setelah normalisasi alpha
  for (var a = 0; a < aliases.length; a++) {
    var targetNorm = getAlphaOnly(aliases[a]);
    if (!targetNorm) continue;
    for (var i = 0; i < allSheets.length; i++) {
      if (getAlphaOnly(allSheets[i].getName()) === targetNorm) {
        return allSheets[i];
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
 * Mencari sheet pegawai secara cerdas dan mendalam berdasarkan namaSheet, namaPegawai, dan username
 * Mengabaikan sheet sistem dan mencari kesamaan exact, alias, dan token terverifikasi.
 */
function findEmployeeSheet(ss, namaSheet, namaPegawai, username) {
  if (!ss) return null;

  // 1. Prioritas Utama: Cek kamus pemetaan baku personil (Known Employee Map)
  const keysToCheck = [username, namaPegawai, namaSheet];
  for (let k = 0; k < keysToCheck.length; k++) {
    const raw = keysToCheck[k];
    if (!raw) continue;
    const alpha = getAlphaOnly(raw);
    if (KNOWN_EMPLOYEE_SHEET_MAP[alpha]) {
      const cands = KNOWN_EMPLOYEE_SHEET_MAP[alpha].sheetCandidates || [];
      for (let c = 0; c < cands.length; c++) {
        const sh = ss.getSheetByName(cands[c]);
        if (sh && !isSystemSheet(sh.getName())) return sh;
        const shNorm = findSheet(ss, cands[c]);
        if (shNorm && !isSystemSheet(shNorm.getName())) return shNorm;
      }
    }
  }

  // 2. Coba direct match findSheet untuk namaSheet, namaPegawai, username
  if (namaSheet) {
    var sh = findSheet(ss, namaSheet);
    if (sh && !isSystemSheet(sh.getName())) return sh;
  }
  if (namaPegawai) {
    var sh = findSheet(ss, namaPegawai);
    if (sh && !isSystemSheet(sh.getName())) return sh;
  }
  if (username) {
    var sh = findSheet(ss, username);
    if (sh && !isSystemSheet(sh.getName())) return sh;
  }

  var allSheets = ss.getSheets();
  var candidates = [];
  if (namaSheet) candidates.push(cleanStr(namaSheet));
  if (namaPegawai) candidates.push(cleanStr(namaPegawai));
  if (username) candidates.push(cleanStr(username));

  // 3. Exact match setelah normalisasi alpha & alias
  for (var i = 0; i < allSheets.length; i++) {
    var sName = allSheets[i].getName();
    if (isSystemSheet(sName)) continue;
    var sNameAlpha = getAlphaOnly(sName);

    for (var c = 0; c < candidates.length; c++) {
      var candAlpha = getAlphaOnly(candidates[c]);
      if (sNameAlpha && candAlpha && sNameAlpha === candAlpha) {
        return allSheets[i];
      }
      if (isUserAliasMatch(sNameAlpha, candAlpha)) {
        return allSheets[i];
      }
    }
  }

  return null;
}

/**
 * Memastikan Sheet Checklist Khusus Petugas Keamanan Ada (Otomatis Buat Format Baku jika Belum Ada)
 */
function ensureSecuritySheet(ss, sheetName, empName) {
  if (!ss) return null;
  const targetName = sheetName || (empName ? empName.replace(/\s+/g, '') : 'Security');
  let sheet = ss.getSheetByName(targetName);
  if (sheet) return sheet;

  try {
    sheet = ss.insertSheet(targetName);
    const headers = ["No", "Ruangan / Pos", "Kegiatan Tugas Keamanan"];
    for (let d = 1; d <= 31; d++) headers.push(d);

    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground("#1e40af")
      .setFontColor("#ffffff")
      .setFontWeight("bold");

    const rows = [
      [1, "PAGI (06.00-07.30)", "Mengatur lalu lintas dan membantu menyeberangkan karyawan ke kantor"],
      [2, "PAGI (06.00-07.30)", "Mengatur dan mengarahkan parkiran kendaraan roda-4"],
      [3, "PAGI (06.00-07.30)", "Menyambut dan membukakan pintu kendaraan pimpinan"],
      [4, "PAGI (06.00-07.30)", "Merapikan susunan kendaraan roda 2 di parkiran samping dan belakang"],
      [5, "SELAMA JAM KERJA (07.30-16.00)", "Patroli keamanan gedung, aset dan karyawan kantor secara berkala setiap 2 jam dan memeriksa area kantor melalui CCTV"],
      [6, "SELAMA JAM KERJA (07.30-16.00)", "Mengawasi keluar masuk orang, barang dan kendaraan, mendokumentasikan dan melaporkan hal mencurigakan"],
      [7, "SELAMA JAM KERJA (07.30-16.00)", "Menyambut tamu, memeriksa identitas dan mengarahkan tamu ke front office/ruang tunggu"],
      [8, "MALAM", "Patroli keamanan gedung secara berkala dan memeriksa area kantor melalui CCTV"],
      [9, "MALAM", "Memastikan pintu, jendela, dan ruangan penting terkunci dengan baik"],
      [10, "MALAM", "Mencegah potensi bahaya seperti kebakaran atau pencurian"]
    ];

    const dataRows = rows.map(r => {
      const fullRow = [r[0], r[1], r[2]];
      for (let d = 1; d <= 31; d++) fullRow.push(false);
      return fullRow;
    });

    sheet.getRange(2, 1, dataRows.length, headers.length).setValues(dataRows);
    sheet.getRange(2, 4, dataRows.length, 31).insertCheckboxes();
    sheet.autoResizeColumns(1, headers.length);
    SpreadsheetApp.flush();
    return sheet;
  } catch (e) {
    return null;
  }
}

/**
 * Membaca jenis tugas pegawai dari sheet mereka atau atribut profil atau jadwal keamanan
 */
function getSheetJenis(sheet, matchedUser, ss) {
  // 1. Cek identitas matchedUser terlebih dahulu (Deterministic Role)
  if (matchedUser) {
    const userAlpha = getAlphaOnly(matchedUser.namaPegawai) || getAlphaOnly(matchedUser.username);
    if (userAlpha) {
      if (KNOWN_EMPLOYEE_SHEET_MAP[userAlpha]) {
        return KNOWN_EMPLOYEE_SHEET_MAP[userAlpha].jenis;
      }
    }

    if (matchedUser.role === 'CS' || matchedUser.explicitRole === 'CS') {
      return 'PIKET KEBERSIHAN KANTOR';
    }
    if (matchedUser.role === 'PELAYANAN' || matchedUser.explicitRole === 'PELAYANAN') {
      return 'RESEPSIONIS';
    }
    if (matchedUser.role === 'SECURITY' || matchedUser.explicitRole === 'SECURITY') {
      return 'KEAMANAN KANTOR';
    }

    const uStr = (matchedUser.username + ' ' + matchedUser.namaPegawai + ' ' + (matchedUser.namaSheet || '')).toLowerCase();
    if (uStr.includes('resepsionis') || uStr.includes('pelayanan') || uStr.includes('pst') || uStr.includes('mawardi') || uStr.includes('rania') || uStr.includes('alfiana')) {
      return 'RESEPSIONIS';
    }
    if (uStr.includes('keamanan') || uStr.includes('satpam') || uStr.includes('security')) {
      return 'KEAMANAN KANTOR';
    }
    if (uStr.includes('kebersihan') || uStr.includes('yuni') || uStr.includes('slamet') || uStr.includes('syukri') || uStr.includes('dede') || uStr.includes('ramadhan')) {
      return 'PIKET KEBERSIHAN KANTOR';
    }
  }

  // 2. Cek nama sheet jika objek sheet diberikan
  if (sheet) {
    const sName = sheet.getName();
    const sNameUpper = String(sName || '').toUpperCase();
    const sAlpha = getAlphaOnly(sName);

    if (KNOWN_EMPLOYEE_SHEET_MAP[sAlpha]) {
      return KNOWN_EMPLOYEE_SHEET_MAP[sAlpha].jenis;
    }

    if (sNameUpper.includes('RESEPSIONIS') || sNameUpper.includes('PELAYANAN') || sNameUpper.includes('PST') || sNameUpper.includes('MAWARDI') || sNameUpper.includes('RANIA') || sNameUpper.includes('ALFIANA')) {
      return 'RESEPSIONIS';
    }
    if (sNameUpper.includes('KEAMANAN') || sNameUpper.includes('SECURITY') || sNameUpper.includes('SATPAM')) {
      return 'KEAMANAN KANTOR';
    }
    if (sNameUpper.includes('KEBERSIHAN') || sNameUpper.includes('YUNI') || sNameUpper.includes('SLAMET') || sNameUpper.includes('SYUKRI') || sNameUpper.includes('DEDE') || sNameUpper.includes('NURRAMADHANIAL') || sNameUpper.includes('RAMADHAN')) {
      return 'PIKET KEBERSIHAN KANTOR';
    }

    // Cek judul header sheet (Baris 1 saja)
    try {
      if (!isSystemSheet(sName)) {
        const val1 = String(sheet.getRange(1, 1).getValue() || '').toUpperCase();
        const val2 = String(sheet.getRange(1, 2).getValue() || '').toUpperCase();
        const headerText = val1 + ' ' + val2;
        if (headerText.includes('STANDAR PELAYANAN') || headerText.includes('RESEPSIONIS')) {
          return 'RESEPSIONIS';
        }
        if (headerText.includes('KEBERSIHAN')) {
          return 'PIKET KEBERSIHAN KANTOR';
        }
      }
    } catch (e) { /* ignore */ }
  }

  // 3. Fallback jadwal security
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

/**
 * Autentikasi Pengguna & Pembuatan Sesi Langsung dari Sheet Users pada Spreadsheet
 * Mendukung pencocokan username, nama pegawai, nama sheet, alias, dan password secara fleksibel & akurat.
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
    const displayValues = userSheet.getDataRange().getDisplayValues();
    if (rawValues.length < 2) {
      return { success: false, message: "Data pengguna pada sheet 'Users' masih kosong." };
    }

    const cleanInputUser = cleanStr(username).toLowerCase();
    const inputAlpha = getAlphaOnly(username);
    const cleanInputPass = cleanPass(password);
    const inputPassNoSpace = cleanInputPass.replace(/\s+/g, '');

    // 1. Temukan baris header dan indeks kolom secara dinamis
    let colUser = 0, colNama = 1, colSheet = 2, colPass = 3, colRole = -1;
    let headerRowIdx = 0;

    for (let r = 0; r < Math.min(5, rawValues.length); r++) {
      const row = rawValues[r];
      for (let c = 0; c < row.length; c++) {
        const h = cleanStr(row[c]).toLowerCase();
        if (h === 'username' || (h.includes('user') && !h.includes('nama') && !h.includes('daftar'))) colUser = c;
        if (h === 'nama pegawai' || h === 'nama lengkap' || (h.includes('nama') && !h.includes('sheet') && !h.includes('user'))) colNama = c;
        if (h === 'nama sheet' || h === 'sheet' || (h.includes('sheet') && !h.includes('pegawai'))) colSheet = c;
        if (h === 'password' || h === 'pass' || h.includes('sandi') || h.includes('password')) colPass = c;
        if (h === 'role' || h === 'peran' || h === 'jabatan' || (h.includes('role') || h.includes('akses'))) colRole = c;
      }
      if (cleanStr(row[colUser]).toLowerCase().includes('user') || cleanStr(row[colPass]).toLowerCase().includes('pass')) {
        headerRowIdx = r;
        break;
      }
    }

    let matchedUser = null;

    // 2. Iterasi setiap baris data pengguna
    for (let i = headerRowIdx + 1; i < rawValues.length; i++) {
      const rowUser = cleanStr(rawValues[i][colUser]);
      const rowNama = cleanStr(rawValues[i][colNama]);
      const rowSheet = cleanStr(rawValues[i][colSheet]);
      const explicitRole = (colRole !== -1 && rawValues[i][colRole]) ? cleanStr(rawValues[i][colRole]).toUpperCase() : '';
      
      if (!rowUser && !rowNama) continue; // Skip baris kosong

      const rawPass = cleanPass(rawValues[i][colPass]);
      const dispPass = displayValues[i] ? cleanPass(displayValues[i][colPass]) : '';

      const rowUserLower = rowUser.toLowerCase();
      const rowNamaLower = rowNama.toLowerCase();
      const rowSheetLower = rowSheet.toLowerCase();
      const rowUserAlpha = getAlphaOnly(rowUser);
      const rowNamaAlpha = getAlphaOnly(rowNama);
      const rowSheetAlpha = getAlphaOnly(rowSheet);

      // Cocokkan username input terhadap Username, Nama Pegawai, Nama Sheet, dan Alias
      const isUserMatch = (
        cleanInputUser === rowUserLower ||
        cleanInputUser === rowNamaLower ||
        cleanInputUser === rowSheetLower ||
        (inputAlpha && inputAlpha === rowUserAlpha) ||
        (inputAlpha && inputAlpha === rowNamaAlpha) ||
        (inputAlpha && inputAlpha === rowSheetAlpha) ||
        isUserAliasMatch(inputAlpha, rowUserAlpha) ||
        isUserAliasMatch(inputAlpha, rowNamaAlpha) ||
        isUserAliasMatch(inputAlpha, rowSheetAlpha)
      );

      // Cocokkan password
      const isPassMatch = (
        cleanInputPass === rawPass ||
        cleanInputPass === dispPass ||
        inputPassNoSpace === rawPass.replace(/\s+/g, '') ||
        inputPassNoSpace === dispPass.replace(/\s+/g, '') ||
        cleanInputPass.toLowerCase() === rawPass.toLowerCase() ||
        cleanInputPass.toLowerCase() === dispPass.toLowerCase()
      );

      if (isUserMatch && isPassMatch) {
        matchedUser = {
          username: rowUser || rowNama,
          namaPegawai: rowNama || rowUser,
          namaSheet: rowSheet || rowUser,
          explicitRole: explicitRole
        };
        break;
      }
    }

    if (!matchedUser) {
      return { success: false, message: "Username atau Password salah. Pastikan kredensial sesuai dengan sheet 'Users'." };
    }

    // 3. Cari sheet target pegawai & jenis tugas
    let targetSheet = findEmployeeSheet(ss, matchedUser.namaSheet, matchedUser.namaPegawai, matchedUser.username);
    let actualSheetName = targetSheet ? targetSheet.getName() : (matchedUser.namaSheet || matchedUser.namaPegawai);
    let jenisSheet = getSheetJenis(targetSheet, matchedUser, ss);

    if (!targetSheet && jenisSheet === 'KEAMANAN KANTOR') {
      const jadwalSheet = findJadwalSheet(ss);
      if (jadwalSheet) {
        actualSheetName = jadwalSheet.getName();
      }
    }

    // 4. Tentukan Role Pengguna Berjenjang
    let finalRole = 'CS';
    const explicitRole = matchedUser.explicitRole;
    const uAlpha = getAlphaOnly(matchedUser.username) || getAlphaOnly(matchedUser.namaPegawai);

    if (KNOWN_EMPLOYEE_SHEET_MAP[uAlpha]) {
      finalRole = KNOWN_EMPLOYEE_SHEET_MAP[uAlpha].role;
    } else if (['CS', 'PELAYANAN', 'SECURITY', 'SUPERVISOR', 'ADMIN'].includes(explicitRole)) {
      finalRole = explicitRole;
    } else {
      const uComb = (matchedUser.username + ' ' + matchedUser.namaPegawai + ' ' + matchedUser.namaSheet).toLowerCase();
      if (uComb.includes('supervisor') || uComb.includes('kasubbag') || uComb.includes('ppk') || uComb.includes('koordinator') || uComb.includes('pimpinan')) {
        finalRole = 'SUPERVISOR';
      } else if (uComb.includes('admin')) {
        finalRole = 'ADMIN';
      } else if (jenisSheet === 'RESEPSIONIS' || uComb.includes('pelayanan') || uComb.includes('resepsionis') || uComb.includes('pst') || uComb.includes('mawardi') || uComb.includes('rania') || uComb.includes('alfiana')) {
        finalRole = 'PELAYANAN';
      } else if (jenisSheet === 'KEAMANAN KANTOR' || uComb.includes('keamanan') || uComb.includes('satpam') || uComb.includes('security')) {
        finalRole = 'SECURITY';
      } else {
        finalRole = 'CS';
      }
    }

    const token = Utilities.getUuid();
    const cache = CacheService.getScriptCache();

    const sessionPayload = {
      username: matchedUser.username,
      namaPegawai: matchedUser.namaPegawai,
      namaSheet: actualSheetName,
      jenis: jenisSheet,
      role: finalRole,
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
        role: finalRole
      }
    };

  } catch (err) {
    return { success: false, message: "Terjadi kesalahan server: " + err.message };
  }
}

/**
 * Validasi Session Token dari Cache
 */
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

/**
 * Mengubah Username dan/atau Password Pengguna Langsung ke Sheet Users pada Spreadsheet
 * Setiap perubahan langsung ditulis dan disimpan ke spreadsheet seketika.
 */
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
    let colUser = 0, colNama = 1, colSheet = 2, colPass = 3, colRole = -1, colLog = -1;
    let headerRowIdx = 0;

    for (let r = 0; r < Math.min(5, rawValues.length); r++) {
      const row = rawValues[r];
      for (let c = 0; c < row.length; c++) {
        const h = cleanStr(row[c]).toLowerCase();
        if (h.includes('user') || h === 'username') colUser = c;
        if (h.includes('nama pegawai') || h.includes('nama lengkap') || h.includes('nama')) colNama = c;
        if (h.includes('nama sheet') || h === 'sheet') colSheet = c;
        if (h.includes('password') || h.includes('pass') || h.includes('sandi')) colPass = c;
        if (h.includes('role') || h.includes('peran') || h.includes('jabatan')) colRole = c;
        if (h.includes('terakhir') || h.includes('kredensial') || h.includes('log') || h.includes('timestamp')) colLog = c;
      }
      if (cleanStr(row[colUser]).toLowerCase().includes('user') || cleanStr(row[colPass]).toLowerCase().includes('pass')) {
        headerRowIdx = r;
        break;
      }
    }

    if (colLog === -1) {
      colLog = rawValues[headerRowIdx].length >= 5 ? rawValues[headerRowIdx].length : 5;
      userSheet.getRange(headerRowIdx + 1, colLog + 1).setValue("Terakhir Ganti Kredensial");
      userSheet.getRange(headerRowIdx + 1, colLog + 1)
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
    userSheet.getRange(userRowIndex, colLog + 1).setValue(nowTimestamp);

    // FLUSH LANGSUNG KE SPREADSHEET AGAR TERSIMPAN PERMANEN
    SpreadsheetApp.flush();

    // Perbarui sesi aktif di Cache
    const cache = CacheService.getScriptCache();
    const updatedPayload = {
      username: targetUsername,
      namaPegawai: session.namaPegawai,
      namaSheet: session.namaSheet,
      jenis: session.jenis,
      role: session.role || 'CS',
      loginTime: session.loginTime || new Date().toISOString()
    };
    cache.put(token, JSON.stringify(updatedPayload), SESSION_DURATION_SEC);

    return {
      success: true,
      message: "Username dan password berhasil disimpan di spreadsheet pada sheet Users!",
      user: {
        username: targetUsername,
        namaPegawai: session.namaPegawai,
        jenis: session.jenis,
        role: session.role || 'CS'
      }
    };

  } catch (err) {
    return { success: false, message: "Terjadi kesalahan: " + err.message };
  }
}

/**
 * Mengambil Data Dashboard Ringkasan Pegawai
 */
/**
 * Mengambil Data Dashboard Ringkasan Pegawai (Mendukung Multi-Role)
 */
function getDashboardData(token, bulan, tahun) {
  try {
    const session = getSessionUser(token);
    if (!session) {
      return { success: false, message: "Sesi telah berakhir atau tidak valid. Silakan login kembali." };
    }

    const isSupervisorOrAdmin = (session.role === 'SUPERVISOR' || session.role === 'ADMIN');
    if (isSupervisorOrAdmin) {
      const supData = getSupervisorDashboardData(token, bulan, tahun, 'SEMUA', 'SEMUA');
      if (supData && supData.success && supData.data) {
        const m = supData.data.macro;
        return {
          success: true,
          data: {
            namaPegawai: session.namaPegawai,
            username: session.username,
            jenis: 'Supervisi Manajerial',
            totalKegiatan: m.totalTarget || 0,
            kegiatanSelesai: m.totalSelesai || 0,
            kegiatanBelum: Math.max(0, (m.totalTarget || 0) - (m.totalSelesai || 0)),
            persenPenyelesaian: m.kepatuhanTotal || 0,
            progressRuangan: [
              { ruangan: 'Unit Kebersihan (CS)', total: m.totalTarget, selesai: m.totalSelesai, persen: m.kepatuhanCs || 0 },
              { ruangan: 'Unit Pelayanan (PST)', total: m.totalTarget, selesai: m.totalSelesai, persen: m.kepatuhanPst || 0 },
              { ruangan: 'Unit Keamanan (Satpam)', total: m.totalTarget, selesai: m.totalSelesai, persen: m.kepatuhanSecurity || 0 }
            ],
            totalItemMonitoring: m.totalPegawai || 0
          }
        };
      }
    }

    const ss = getDb();
    const sheet = findEmployeeSheet(ss, session.namaSheet, session.namaPegawai, session.username);
    if (!sheet) {
      // Jika petugas keamanan dan belum memiliki sheet kebersihan terpisah
      if (session.jenis === 'KEAMANAN KANTOR' || session.role === 'SECURITY') {
        const resKeamanan = getJadwalKeamanan(token, bulan, tahun);
        if (resKeamanan && resKeamanan.success && resKeamanan.data) {
          const kData = resKeamanan.data;
          const pCount = (kData.summary && kData.summary.P) || 0;
          const sCount = (kData.summary && kData.summary.S) || 0;
          const mCount = (kData.summary && kData.summary.M) || 0;
          const pTarget = pCount * 4;
          const jamTarget = pCount * 3;
          const malTarget = (sCount + mCount) * 3;
          return {
            success: true,
            data: {
              namaPegawai: session.namaPegawai,
              username: session.username,
              jenis: 'Keamanan',
              totalKegiatan: kData.totalTarget !== undefined ? kData.totalTarget : (pTarget + jamTarget + malTarget),
              kegiatanSelesai: kData.totalSelesai !== undefined ? kData.totalSelesai : 0,
              kegiatanBelum: kData.totalBelum !== undefined ? kData.totalBelum : 0,
              persenPenyelesaian: kData.persen !== undefined ? kData.persen : 0,
              progressRuangan: [
                { ruangan: 'PAGI (06.00-07.30)', total: pTarget, selesai: 0, persen: 0 },
                { ruangan: 'SELAMA JAM KERJA (07.30-16.00)', total: jamTarget, selesai: 0, persen: 0 },
                { ruangan: 'MALAM (Patroli & Gedung)', total: malTarget, selesai: 0, persen: 0 }
              ],
              totalItemMonitoring: kData.taskItems ? kData.taskItems.length : 10
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
 * Mengambil Data Matriks Monitoring Lengkap (Mendukung Unit Kebersihan, Pelayanan, dan Keamanan)
 */
function getMonitoringData(token, jenis, bulan, tahun, filterRuangan, filterStatus, targetUser) {
  try {
    const session = getSessionUser(token);
    if (!session) {
      return { success: false, message: "Sesi telah berakhir. Silakan login kembali." };
    }

    const ss = getDb();
    if (!ss) return { success: false, message: "Koneksi database spreadsheet gagal." };

    const isSupervisorOrAdmin = (session.role === 'SUPERVISOR' || session.role === 'ADMIN');
    const allStaff = getAllStaffList(ss);

    // KASUS KHUSUS: UNIT KEAMANAN (SATPAM)
    if (jenis === 'Keamanan' || session.role === 'SECURITY' || session.jenis === 'KEAMANAN KANTOR') {
      const resKeamanan = getJadwalKeamanan(token, bulan, tahun, targetUser);
      if (resKeamanan && resKeamanan.success) {
        const kData = resKeamanan.data;
        const secEmployees = allStaff.filter(s => s.role === 'SECURITY').map(s => ({
          username: s.username,
          namaPegawai: s.namaPegawai,
          namaSheet: s.namaSheet
        }));

        return {
          success: true,
          data: {
            namaPegawai: kData.namaPegawai,
            namaSheet: 'JadwalPiketSecurity',
            jenis: 'Keamanan',
            isSecurity: true,
            jadwal: kData.jadwal,
            summary: kData.summary,
            totalHariKerja: kData.totalHariKerja,
            taskItems: kData.taskItems,
            availableEmployees: secEmployees
          }
        };
      } else {
        return resKeamanan || { success: false, message: "Gagal memuat jadwal keamanan." };
      }
    }

    // KASUS: UNIT KEBERSIHAN (CS) & UNIT PELAYANAN (PST)
    let targetSheetName = session.namaSheet;
    let targetNamaPegawai = session.namaPegawai;
    let targetUsername = session.username;

    if (isSupervisorOrAdmin) {
      if (targetUser && targetUser !== 'SEMUA' && targetUser !== 'ALL') {
        targetUsername = targetUser;
        const matched = allStaff.find(s => s.username.toLowerCase() === targetUser.toLowerCase() || s.namaPegawai.toLowerCase() === targetUser.toLowerCase());
        if (matched) {
          targetNamaPegawai = matched.namaPegawai;
          targetSheetName = matched.namaSheet;
        } else {
          targetNamaPegawai = targetUser;
          targetSheetName = targetUser;
        }
      } else {
        // Otomatis cari sheet pertama yang sesuai jenis unit
        const matchingStaff = allStaff.filter(s => (jenis === 'Pelayanan' ? s.role === 'PELAYANAN' : s.role === 'CS'));
        if (matchingStaff.length > 0) {
          targetSheetName = matchingStaff[0].namaSheet;
          targetNamaPegawai = matchingStaff[0].namaPegawai;
          targetUsername = matchingStaff[0].username;
        } else {
          const allSheets = ss.getSheets();
          for (let i = 0; i < allSheets.length; i++) {
            const s = allSheets[i];
            if (isSystemSheet(s.getName())) continue;
            const j = getSheetJenis(s, null, ss);
            if (jenis === 'Pelayanan' && j === 'RESEPSIONIS') {
              targetSheetName = s.getName();
              targetNamaPegawai = s.getName();
              break;
            } else if (jenis === 'Kebersihan' && j === 'PIKET KEBERSIHAN KANTOR') {
              targetSheetName = s.getName();
              targetNamaPegawai = s.getName();
              break;
            }
          }
        }
      }
    }

    let sheet = findEmployeeSheet(ss, targetSheetName, targetNamaPegawai, targetUsername);
    if (!sheet) {
      const allSheets = ss.getSheets();
      for (let i = 0; i < allSheets.length; i++) {
        if (!isSystemSheet(allSheets[i].getName())) {
          sheet = allSheets[i];
          targetNamaPegawai = sheet.getName();
          break;
        }
      }
    }

    if (!sheet) {
      return { success: false, message: "Sheet monitoring untuk '" + (targetNamaPegawai || targetUsername) + "' tidak ditemukan." };
    }

    const parsedData = readSheetMonitoring(sheet, bulan, tahun);

    let filteredItems = parsedData.items || [];
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

    // Ambil daftar pegawai yang sesuai dengan unit aktif (Kebersihan atau Pelayanan)
    const availableEmployees = allStaff
      .filter(s => (jenis === 'Pelayanan' ? s.role === 'PELAYANAN' : s.role === 'CS'))
      .map(s => ({
        username: s.username,
        namaPegawai: s.namaPegawai,
        namaSheet: s.namaSheet
      }));

    return {
      success: true,
      data: {
        namaPegawai: targetNamaPegawai || sheet.getName(),
        namaSheet: sheet.getName(),
        jenis: parsedData.jenis,
        isSecurity: false,
        daysInMonth: parsedData.daysInMonth,
        activeDays: parsedData.activeDays,
        headers: parsedData.headers,
        items: filteredItems,
        daftarRuangan: parsedData.daftarRuangan,
        availableEmployees: availableEmployees
      }
    };

  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Toggle Status Checklist
 */
function updateMonitoringStatus(token, rowIndex, colIndex, newStatus, dayNum, monthNum, yearNum) {
  try {
    const session = getSessionUser(token);
    if (!session) {
      return { success: false, message: "Sesi telah berakhir. Silakan login kembali." };
    }

    const ss = getDb();
    let sheet = findEmployeeSheet(ss, session.namaSheet, session.namaPegawai, session.username);
    if (!sheet) {
      if (session.role === 'SECURITY' || session.jenis === 'KEAMANAN KANTOR') {
        sheet = ensureSecuritySheet(ss, session.namaSheet, session.namaPegawai);
      }
    }

    if (!sheet) {
      return { success: false, message: "Sheet monitoring tidak ditemukan." };
    }

    let targetRow = Number(rowIndex);
    let targetCol = Number(colIndex);

    const now = new Date();
    const todayNum = now.getDate();
    const todayMonth = now.getMonth() + 1;
    const todayYear = now.getFullYear();

    const targetDay = dayNum ? Number(dayNum) : todayNum;
    const targetMonth = monthNum ? Number(monthNum) : todayMonth;
    const targetYear = yearNum ? Number(yearNum) : todayYear;

    // Penyesuaian baris/kolom khusus jika template default tugas satpam (101-110)
    if (targetRow >= 101 && targetRow <= 110) {
      targetRow = targetRow - 101 + 2; // Baris 2..11 pada sheet
      targetCol = targetDay + 3;       // Kolom D (4) adalah Tanggal 1
    }

    const cellDate = new Date(targetYear, targetMonth - 1, targetDay);
    const currentDate = new Date(todayYear, todayMonth - 1, todayNum);

    const currentVal = sheet.getRange(targetRow, targetCol).getValue();
    const isAlreadyTrue = (currentVal === true || currentVal === 1 || currentVal === '1' || currentVal === '✓');

    if (cellDate < currentDate && isAlreadyTrue && (newStatus === false || newStatus === 0 || newStatus === '0' || !newStatus)) {
      return { success: false, message: "Data pada tanggal lampau yang sudah diisi (TRUE) tidak dapat diubah kembali." };
    }

    const cellValue = (newStatus === true || newStatus === 1 || newStatus === "1" || newStatus === "✓") ? true : false;
    sheet.getRange(targetRow, targetCol).setValue(cellValue);
    
    // FLUSH LANGSUNG KE SPREADSHEET
    SpreadsheetApp.flush();

    // Hapus cache parsed sheet agar request berikutnya selalu up-to-date
    try {
      const cache = CacheService.getScriptCache();
      const cacheKey = "cache_m_" + sheet.getName() + "_" + targetMonth + "_" + targetYear;
      cache.remove(cacheKey);
    } catch (ce) { /* ignore */ }

    return { success: true, message: "Status berhasil diperbarui." };
  } catch (err) {
    return { success: false, message: "Gagal menyimpan status: " + err.message };
  }
}

/**
 * Mengambil daftar seluruh personil lapangan (CS, PST, Security) beserta peran & label unit
 */
function getAllStaffList(ss) {
  const staffList = [];
  const addedUsernames = new Set();

  const userSheet = findSheet(ss, "Users");
  if (userSheet) {
    const uVals = userSheet.getDataRange().getValues();
    let colU = 0, colN = 1, colS = 2, colR = -1;
    for (let r = 0; r < Math.min(5, uVals.length); r++) {
      for (let c = 0; c < uVals[r].length; c++) {
        const h = cleanStr(uVals[r][c]).toLowerCase();
        if (h === 'username' || (h.includes('user') && !h.includes('nama') && !h.includes('daftar'))) colU = c;
        if (h === 'nama pegawai' || h === 'nama lengkap' || (h.includes('nama') && !h.includes('sheet') && !h.includes('user'))) colN = c;
        if (h === 'nama sheet' || h === 'sheet' || (h.includes('sheet') && !h.includes('pegawai'))) colS = c;
        if (h === 'role' || h === 'peran' || h === 'jabatan' || (h.includes('role') || h.includes('akses'))) colR = c;
      }
    }

    for (let r = 1; r < uVals.length; r++) {
      const u = cleanStr(uVals[r][colU]);
      const n = cleanStr(uVals[r][colN]);
      const s = cleanStr(uVals[r][colS]);
      const rol = (colR !== -1 && uVals[r][colR]) ? cleanStr(uVals[r][colR]).toUpperCase() : '';
      if (!u && !n) continue;

      const uAlpha = getAlphaOnly(u) || getAlphaOnly(n);
      let role = 'CS';
      if (KNOWN_EMPLOYEE_SHEET_MAP[uAlpha]) {
        role = KNOWN_EMPLOYEE_SHEET_MAP[uAlpha].role;
      } else if (['CS', 'PELAYANAN', 'SECURITY', 'SUPERVISOR', 'ADMIN'].includes(rol)) {
        role = rol;
      } else {
        const uComb = (u + ' ' + n + ' ' + s).toLowerCase();
        if (uComb.includes('supervisor') || uComb.includes('kasubbag') || uComb.includes('ppk') || uComb.includes('koordinator') || uComb.includes('pimpinan')) {
          role = 'SUPERVISOR';
        } else if (uComb.includes('admin')) {
          role = 'ADMIN';
        } else if (uComb.includes('pelayanan') || uComb.includes('resepsionis') || uComb.includes('pst') || uComb.includes('mawardi') || uComb.includes('rania') || uComb.includes('alfiana')) {
          role = 'PELAYANAN';
        } else if (uComb.includes('keamanan') || uComb.includes('satpam') || uComb.includes('security') || uComb.includes('eddy') || uComb.includes('reza') || uComb.includes('feri') || uComb.includes('eko') || uComb.includes('agus') || uComb.includes('rizki')) {
          role = 'SECURITY';
        } else {
          role = 'CS';
        }
      }

      if (role === 'SUPERVISOR' || role === 'ADMIN') continue;

      const unKey = (u || n).toLowerCase();
      if (!addedUsernames.has(unKey)) {
        addedUsernames.add(unKey);
        staffList.push({
          username: u || unKey,
          namaPegawai: n || u,
          namaSheet: s || n,
          role: role,
          unitLabel: role === 'CS' ? 'Unit Kebersihan (CS)' : (role === 'PELAYANAN' ? 'Unit Pelayanan (PST)' : 'Unit Keamanan (Satpam)'),
          icon: role === 'CS' ? 'fa-sparkles' : (role === 'PELAYANAN' ? 'fa-hand-holding-heart' : 'fa-shield-halved')
        });
      }
    }
  }

  // Fallback jika users sheet kosong
  if (staffList.length === 0) {
    const allSheets = ss.getSheets();
    for (let i = 0; i < allSheets.length; i++) {
      const sh = allSheets[i];
      const sName = sh.getName();
      if (isSystemSheet(sName)) continue;
      const sAlpha = getAlphaOnly(sName);
      let rType = 'CS';
      if (KNOWN_EMPLOYEE_SHEET_MAP[sAlpha]) {
        rType = KNOWN_EMPLOYEE_SHEET_MAP[sAlpha].role;
      } else {
        const j = getSheetJenis(sh, null, ss);
        rType = (j === 'RESEPSIONIS') ? 'PELAYANAN' : 'CS';
      }
      staffList.push({
        username: sName.toLowerCase().replace(/\s+/g, ''),
        namaPegawai: sName,
        namaSheet: sName,
        role: rType,
        unitLabel: rType === 'CS' ? 'Unit Kebersihan (CS)' : 'Unit Pelayanan (PST)',
        icon: rType === 'CS' ? 'fa-sparkles' : 'fa-hand-holding-heart'
      });
    }

    const secDefaults = [
      { username: 'eddy', namaPegawai: 'Eddy Suryadi', namaSheet: 'JadwalPiketSecurity', role: 'SECURITY', unitLabel: 'Unit Keamanan (Satpam)', icon: 'fa-shield-halved' },
      { username: 'reza', namaPegawai: 'Syarif Reza Nopriadrian Al Kadri', namaSheet: 'JadwalPiketSecurity', role: 'SECURITY', unitLabel: 'Unit Keamanan (Satpam)', icon: 'fa-shield-halved' },
      { username: 'feri', namaPegawai: 'Feri Yustami', namaSheet: 'JadwalPiketSecurity', role: 'SECURITY', unitLabel: 'Unit Keamanan (Satpam)', icon: 'fa-shield-halved' },
      { username: 'eko', namaPegawai: 'Eko Prasetyo', namaSheet: 'JadwalPiketSecurity', role: 'SECURITY', unitLabel: 'Unit Keamanan (Satpam)', icon: 'fa-shield-halved' },
      { username: 'agus', namaPegawai: 'Agus Tetriansyah', namaSheet: 'JadwalPiketSecurity', role: 'SECURITY', unitLabel: 'Unit Keamanan (Satpam)', icon: 'fa-shield-halved' },
      { username: 'rizki', namaPegawai: 'Rizki Fadil', namaSheet: 'JadwalPiketSecurity', role: 'SECURITY', unitLabel: 'Unit Keamanan (Satpam)', icon: 'fa-shield-halved' }
    ];
    secDefaults.forEach(sd => staffList.push(sd));
  }

  return staffList;
}

/**
 * Mengambil Data Rekapitulasi Lengkap (Mendukung Agregat Makro & Rekap Individu Per Pegawai)
 */
function getRekapMonitoring(token, bulan, tahun, targetUser) {
  try {
    const session = getSessionUser(token);
    if (!session) {
      return { success: false, message: "Sesi tidak valid atau telah berakhir." };
    }

    const ss = getDb();
    if (!ss) return { success: false, message: "Koneksi database spreadsheet gagal." };

    const isSupervisorOrAdmin = (session.role === 'SUPERVISOR' || session.role === 'ADMIN');
    const allStaffList = getAllStaffList(ss);

    // KASUS 1: Rekap Gabungan (Agregat Makro Seluruh Ruangan & Unit)
    if (isSupervisorOrAdmin && (!targetUser || targetUser === 'ALL' || targetUser === 'SEMUA')) {
      const allSheets = ss.getSheets();
      const allItems = [];
      const activeDaysSet = new Set();
      const rekapJenis = {
        'Kebersihan': { total: 0, selesai: 0 },
        'Pelayanan': { total: 0, selesai: 0 },
        'Keamanan': { total: 0, selesai: 0 }
      };
      const rekapRuangan = {};
      const rekapHarianMap = {};

      for (let i = 0; i < allSheets.length; i++) {
        const sh = allSheets[i];
        const sName = sh.getName();
        if (isSystemSheet(sName)) continue;

        const parsed = readSheetMonitoring(sh, bulan, tahun);
        (parsed.activeDays || []).forEach(d => activeDaysSet.add(d));

        (parsed.items || []).forEach(item => {
          allItems.push(item);
          const jns = item.jenis || "Kebersihan";
          if (!rekapJenis[jns]) rekapJenis[jns] = { total: 0, selesai: 0 };
          rekapJenis[jns].total += item.totalHariAktif;
          rekapJenis[jns].selesai += item.selesaiCount;

          if (!rekapRuangan[item.ruangan]) {
            rekapRuangan[item.ruangan] = { ruangan: item.ruangan, total: 0, selesai: 0, itemCount: 0, jenis: jns };
          }
          rekapRuangan[item.ruangan].total += item.totalHariAktif;
          rekapRuangan[item.ruangan].selesai += item.selesaiCount;
          rekapRuangan[item.ruangan].itemCount += 1;
        });
      }

      // Masukkan juga ringkasan Security ke Rekapitulasi jika ada
      const jadwalSheet = findJadwalSheet(ss);
      if (jadwalSheet) {
        const jVals = jadwalSheet.getDataRange().getValues();
        const jGrid = parseJadwalGrid(jVals, bulan);
        if (jGrid && !jGrid.error && jGrid.schedCols) {
          jGrid.schedCols.forEach(col => activeDaysSet.add(col.tanggal));
          const secOfficers = allStaffList.filter(s => s.role === 'SECURITY');
          let secTotalTarget = 0, secTotalSelesai = 0;
          let secPagiTarget = 0, secPagiSelesai = 0;
          let secJamKerjaTarget = 0, secJamKerjaSelesai = 0;
          let secMalamTarget = 0, secMalamSelesai = 0;

          secOfficers.forEach(off => {
            const secM = calculateSecurityOfficerMetrics(ss, off, jGrid.schedCols, jVals, null, bulan, tahun);
            secTotalTarget += secM.totalTarget;
            secTotalSelesai += secM.totalSelesai;
            if (secM.rekapRuangan && secM.rekapRuangan.length >= 3) {
              secPagiTarget += secM.rekapRuangan[0].total;
              secPagiSelesai += secM.rekapRuangan[0].selesai;
              secJamKerjaTarget += secM.rekapRuangan[1].total;
              secJamKerjaSelesai += secM.rekapRuangan[1].selesai;
              secMalamTarget += secM.rekapRuangan[2].total;
              secMalamSelesai += secM.rekapRuangan[2].selesai;
            }
          });

          if (secTotalTarget > 0) {
            rekapJenis['Keamanan'].total += secTotalTarget;
            rekapJenis['Keamanan'].selesai += secTotalSelesai;
            rekapRuangan['PAGI (06.00-07.30)'] = { ruangan: 'PAGI (06.00-07.30)', total: secPagiTarget, selesai: secPagiSelesai, itemCount: 4, jenis: 'Keamanan' };
            rekapRuangan['SELAMA JAM KERJA (07.30-16.00)'] = { ruangan: 'SELAMA JAM KERJA (07.30-16.00)', total: secJamKerjaTarget, selesai: secJamKerjaSelesai, itemCount: 3, jenis: 'Keamanan' };
            rekapRuangan['MALAM (Patroli & Penguncian)'] = { ruangan: 'MALAM (Patroli & Penguncian)', total: secMalamTarget, selesai: secMalamSelesai, itemCount: 3, jenis: 'Keamanan' };
          }
        }
      }

      const sortedActiveDays = Array.from(activeDaysSet).sort((a,b) => a - b);
      if (sortedActiveDays.length === 0) {
        for (let d = 1; d <= 30; d++) sortedActiveDays.push(d);
      }

      const rekapHarian = sortedActiveDays.map((d, idx) => {
        rekapHarianMap[d] = idx;
        return { hari: d, total: 0, selesai: 0 };
      });

      allItems.forEach(item => {
        sortedActiveDays.forEach(d => {
          const isDone = (item.dailyStatus && (item.dailyStatus[d] === "1" || item.dailyStatus[d] === 1));
          const idx = rekapHarianMap[d];
          if (idx !== undefined) {
            rekapHarian[idx].total += 1;
            if (isDone) rekapHarian[idx].selesai += 1;
          }
        });
      });

      let macroTotalTarget = 0, macroTotalSelesai = 0;
      Object.values(rekapJenis).forEach(rj => {
        macroTotalTarget += rj.total;
        macroTotalSelesai += rj.selesai;
      });
      const macroPersen = macroTotalTarget > 0 ? Math.round((macroTotalSelesai / macroTotalTarget) * 100) : 0;

      return {
        success: true,
        data: {
          namaPegawai: 'Seluruh Pegawai & Unit (Makro)',
          username: 'ALL',
          role: 'MAKRO',
          unitLabel: 'Semua Unit (Makro Kantor)',
          jenis: 'Semua Unit',
          isMacro: true,
          totalTarget: macroTotalTarget,
          totalSelesai: macroTotalSelesai,
          totalBelum: Math.max(0, macroTotalTarget - macroTotalSelesai),
          persen: macroPersen,
          rekapJenis: rekapJenis,
          rekapRuangan: Object.values(rekapRuangan),
          rekapHarian: rekapHarian,
          totalItems: allItems.length,
          employeeList: allStaffList
        }
      };
    }

    // KASUS 2: Rekap Per Pegawai Tertentu (Individual Employee Progress)
    let selectedUsername = session.username;
    let selectedNamaPegawai = session.namaPegawai;
    let selectedSheetName = session.namaSheet;

    if (isSupervisorOrAdmin && targetUser) {
      selectedUsername = targetUser;
      // Cocokkan di allStaffList
      const matchedStaff = allStaffList.find(s => 
        s.username.toLowerCase() === targetUser.toLowerCase() || 
        s.namaPegawai.toLowerCase() === targetUser.toLowerCase() ||
        getAlphaOnly(s.namaPegawai) === getAlphaOnly(targetUser) ||
        getAlphaOnly(s.username) === getAlphaOnly(targetUser)
      );
      if (matchedStaff) {
        selectedUsername = matchedStaff.username;
        selectedNamaPegawai = matchedStaff.namaPegawai;
        selectedSheetName = matchedStaff.namaSheet;
      } else {
        selectedNamaPegawai = targetUser;
        selectedSheetName = targetUser;
      }
    }

    // Cek Peran Target Pegawai
    const uAlpha = getAlphaOnly(selectedUsername) || getAlphaOnly(selectedNamaPegawai);
    let targetRole = 'CS';
    if (KNOWN_EMPLOYEE_SHEET_MAP[uAlpha]) {
      targetRole = KNOWN_EMPLOYEE_SHEET_MAP[uAlpha].role;
    } else {
      const foundInList = allStaffList.find(s => s.username === selectedUsername);
      if (foundInList) targetRole = foundInList.role;
    }

    // SUB-KASUS 2A: Pegawai Satpam / Security
    if (targetRole === 'SECURITY') {
      const jadwalSheet = findJadwalSheet(ss);
      if (jadwalSheet) {
        const jVals = jadwalSheet.getDataRange().getValues();
        const jGrid = parseJadwalGrid(jVals, bulan);
        if (jGrid && !jGrid.error && jGrid.schedCols) {
          const secM = calculateSecurityOfficerMetrics(ss, { namaPegawai: selectedNamaPegawai, username: selectedUsername, namaSheet: selectedSheetName, role: 'SECURITY' }, jGrid.schedCols, jVals, null, bulan, tahun);
          return {
            success: true,
            data: {
              namaPegawai: secM.namaPegawai,
              username: selectedUsername,
              role: 'SECURITY',
              unitLabel: 'Unit Keamanan (Satpam)',
              jenis: 'Keamanan',
              isMacro: false,
              totalTarget: secM.totalTarget,
              totalSelesai: secM.totalSelesai,
              totalBelum: secM.totalBelum,
              persen: secM.persen,
              rekapRuangan: secM.rekapRuangan,
              rekapHarian: secM.rekapHarian,
              totalItems: secM.taskItems ? secM.taskItems.length : 10,
              employeeList: allStaffList
            }
          };
        }
      }

      return {
        success: true,
        data: {
          namaPegawai: selectedNamaPegawai,
          username: selectedUsername,
          role: 'SECURITY',
          unitLabel: 'Unit Keamanan (Satpam)',
          jenis: 'Keamanan',
          isMacro: false,
          totalTarget: 0,
          totalSelesai: 0,
          totalBelum: 0,
          persen: 0,
          rekapRuangan: [],
          rekapHarian: [],
          totalItems: 0,
          employeeList: allStaffList
        }
      };
    }

    // SUB-KASUS 2B: Pegawai CS (Kebersihan) atau PELAYANAN (PST)
    let sheet = findEmployeeSheet(ss, selectedSheetName, selectedNamaPegawai, selectedUsername);
    if (!sheet) {
      const allSheets = ss.getSheets();
      for (let i = 0; i < allSheets.length; i++) {
        if (!isSystemSheet(allSheets[i].getName())) {
          sheet = allSheets[i];
          break;
        }
      }
    }

    if (!sheet) {
      return { success: false, message: "Lembar monitoring untuk '" + (selectedNamaPegawai || selectedUsername) + "' tidak ditemukan." };
    }

    const parsedData = readSheetMonitoring(sheet, bulan, tahun);
    const rekapJenis = {};
    const rekapRuangan = {};
    const rekapHarianMap = {};

    const rekapHarian = (parsedData.activeDays || []).map((d, i) => {
      rekapHarianMap[d] = i;
      return { hari: d, total: 0, selesai: 0 };
    });

    let totalTarget = 0;
    let totalSelesai = 0;

    (parsedData.items || []).forEach(item => {
      const jns = item.jenis || "Kebersihan";
      if (!rekapJenis[jns]) rekapJenis[jns] = { total: 0, selesai: 0 };
      rekapJenis[jns].total += item.totalHariAktif;
      rekapJenis[jns].selesai += item.selesaiCount;

      totalTarget += item.totalHariAktif;
      totalSelesai += item.selesaiCount;

      if (!rekapRuangan[item.ruangan]) {
        rekapRuangan[item.ruangan] = { ruangan: item.ruangan, total: 0, selesai: 0, itemCount: 0, jenis: jns };
      }
      rekapRuangan[item.ruangan].total += item.totalHariAktif;
      rekapRuangan[item.ruangan].selesai += item.selesaiCount;
      rekapRuangan[item.ruangan].itemCount += 1;

      (parsedData.activeDays || []).forEach(d => {
        const isDone = item.dailyStatus && (item.dailyStatus[d] === "1" || item.dailyStatus[d] === 1);
        const idx = rekapHarianMap[d];
        if (idx !== undefined) {
          rekapHarian[idx].total += 1;
          if (isDone) rekapHarian[idx].selesai += 1;
        }
      });
    });

    const persen = totalTarget > 0 ? Math.round((totalSelesai / totalTarget) * 100) : 0;
    const unitTitle = parsedData.jenis === 'Pelayanan' ? 'Unit Pelayanan (PST)' : 'Unit Kebersihan (CS)';

    return {
      success: true,
      data: {
        namaPegawai: selectedNamaPegawai || sheet.getName(),
        username: selectedUsername,
        role: targetRole,
        unitLabel: unitTitle,
        jenis: parsedData.jenis,
        isMacro: false,
        totalTarget: totalTarget,
        totalSelesai: totalSelesai,
        totalBelum: Math.max(0, totalTarget - totalSelesai),
        persen: persen,
        rekapJenis: rekapJenis,
        rekapRuangan: Object.values(rekapRuangan),
        rekapHarian: rekapHarian,
        totalItems: (parsedData.items || []).length,
        employeeList: allStaffList
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
 * Standar Definisi 10 Tugas Petugas Keamanan BPS (3 Shift / Kategori)
 */
const DEFAULT_SECURITY_TASKS = [
  { row: 101, ruangan: 'PAGI (06.00-07.30)', kegiatan: 'Mengatur lalu lintas dan membantu menyeberangkan karyawan ke kantor', category: 'PAGI' },
  { row: 102, ruangan: 'PAGI (06.00-07.30)', kegiatan: 'Mengatur dan mengarahkan parkiran kendaraan roda-4', category: 'PAGI' },
  { row: 103, ruangan: 'PAGI (06.00-07.30)', kegiatan: 'Menyambut dan membukakan pintu kendaraan pimpinan', category: 'PAGI' },
  { row: 104, ruangan: 'PAGI (06.00-07.30)', kegiatan: 'Merapikan susunan kendaraan roda 2 di parkiran samping dan belakang', category: 'PAGI' },
  { row: 105, ruangan: 'SELAMA JAM KERJA (07.30-16.00)', kegiatan: 'Patroli keamanan gedung, aset dan karyawan kantor secara berkala setiap 2 jam dan memeriksa area kantor melalui CCTV', category: 'JAM_KERJA' },
  { row: 106, ruangan: 'SELAMA JAM KERJA (07.30-16.00)', kegiatan: 'Mengawasi keluar masuk orang, barang dan kendaraan, mendokumentasikan dan melaporkan hal mencurigakan', category: 'JAM_KERJA' },
  { row: 107, ruangan: 'SELAMA JAM KERJA (07.30-16.00)', kegiatan: 'Menyambut tamu, memeriksa identitas dan mengarahkan tamu ke front office/ruang tunggu', category: 'JAM_KERJA' },
  { row: 108, ruangan: 'MALAM', kegiatan: 'Patroli keamanan gedung secara berkala dan memeriksa area kantor melalui CCTV', category: 'MALAM' },
  { row: 109, ruangan: 'MALAM', kegiatan: 'Memastikan pintu, jendela, dan ruangan penting terkunci dengan baik', category: 'MALAM' },
  { row: 110, ruangan: 'MALAM', kegiatan: 'Mencegah potensi bahaya seperti kebakaran atau pencurian', category: 'MALAM' }
];

/**
 * ENGINE PERHITUNGAN KINERJA & PROGRES SHIFT SATPAM (TERPADU & PRESISI)
 * Menghitung Target, Selesai, Belum, % Kepatuhan berdasarkan Shift Harian:
 * - Shift P (Pagi): 4 Pagi + 3 Selama Jam Kerja = 7 Target per hari
 * - Shift S/M (Sore/Malam): 3 Malam = 3 Target per hari
 * - Shift O (Libur): 0 Target
 */
function calculateSecurityOfficerMetrics(ss, officer, schedCols, jVals, displayValues, bulan, tahun) {
  const selectedMonth = bulan ? Number(bulan) : (new Date().getMonth() + 1);
  const selectedYear = tahun ? Number(tahun) : new Date().getFullYear();

  // 1. Temukan baris pegawai di Jadwal
  let rowIdx = findEmployeeRowInJadwal(jVals, officer, 0);
  if (rowIdx === -1 && displayValues) {
    rowIdx = findEmployeeRowInJadwal(displayValues, officer, 0);
  }

  const empRow = (rowIdx !== -1) ? jVals[rowIdx] : [];
  const empDispRow = (rowIdx !== -1 && displayValues && displayValues[rowIdx]) ? displayValues[rowIdx] : empRow;

  let matchedEmpName = officer.namaPegawai || officer.username;
  if (rowIdx !== -1) {
    for (let c = 0; c < Math.min(empRow.length, 6); c++) {
      const v = cleanStr(empRow[c]);
      if (v && v.length >= 3 && !v.includes('JADWAL') && !v.includes('BPS') && !v.includes('TOTAL') && !v.includes('JUMLAH')) {
        matchedEmpName = v;
        break;
      }
    }
  }

  const SHIFT_LABEL = { 'P': 'Pagi', 'S': 'Sore', 'M': 'Malam', 'O': 'Libur' };

  // 2. Parse Jadwal Shift per Hari
  const shiftsMap = {};
  let pCount = 0, sCount = 0, mCount = 0, oCount = 0;

  const jadwal = schedCols.map(function(col) {
    let rawKode = String(empRow[col.colIdx] !== undefined && empRow[col.colIdx] !== null ? empRow[col.colIdx] : (empDispRow[col.colIdx] || '')).trim().toUpperCase();
    let kode = 'O';

    if (rawKode === 'P' || rawKode.indexOf('PAGI') >= 0 || rawKode === '1') {
      kode = 'P';
      pCount++;
    } else if (rawKode === 'S' || rawKode.indexOf('SORE') >= 0 || rawKode.indexOf('SIANG') >= 0 || rawKode === '2') {
      kode = 'S';
      sCount++;
    } else if (rawKode === 'M' || rawKode.indexOf('MALAM') >= 0 || rawKode === '3') {
      kode = 'M';
      mCount++;
    } else {
      kode = 'O';
      oCount++;
    }

    shiftsMap[col.tanggal] = kode;

    return {
      tanggal: col.tanggal,
      hari: col.hari,
      kodeShift: kode,
      namaShift: SHIFT_LABEL[kode] || 'Libur',
      isLibur: kode === 'O'
    };
  });

  // 3. Ambil Checklist Status dari Sheet Pegawai atau Default Tasks
  let taskItems = [];
  const empSheet = findEmployeeSheet(ss, officer.namaSheet, officer.namaPegawai, officer.username);
  if (empSheet) {
    const parsedTasks = readSheetMonitoring(empSheet, selectedMonth, selectedYear);
    taskItems = parsedTasks.items || [];
  }

  if (!taskItems || taskItems.length === 0) {
    const colMapping = {};
    schedCols.forEach(function(sc) { colMapping[sc.tanggal] = sc.colIdx + 1; });

    taskItems = DEFAULT_SECURITY_TASKS.map(function(t) {
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

  // 4. Hitung Target & Selesai berdasarkan Shift
  const pagiTasks = taskItems.filter(t => {
    const rUpper = String(t.ruangan || '').toUpperCase();
    return rUpper.includes('PAGI') || rUpper.includes('06.00');
  });
  const jamKerjaTasks = taskItems.filter(t => {
    const rUpper = String(t.ruangan || '').toUpperCase();
    return rUpper.includes('JAM KERJA') || rUpper.includes('07.30') || rUpper.includes('16.00');
  });
  const malamTasks = taskItems.filter(t => {
    const rUpper = String(t.ruangan || '').toUpperCase();
    return rUpper.includes('MALAM') || rUpper.includes('SORE') || rUpper.includes('PATROLI');
  });

  let pagiCheckedCount = 0;
  let jamKerjaCheckedCount = 0;
  let malamCheckedCount = 0;

  const rekapHarian = [];

  schedCols.forEach(col => {
    const tgl = col.tanggal;
    const shiftCode = shiftsMap[tgl] || 'O';
    let dailyTarget = 0;
    let dailySelesai = 0;

    if (shiftCode === 'P') {
      // 4 Pagi + 3 Jam Kerja = 7 Target
      dailyTarget = 7;
      pagiTasks.forEach(t => {
        if (t.dailyStatus && (t.dailyStatus[tgl] === '1' || t.dailyStatus[tgl] === 1 || t.dailyStatus[tgl] === true || t.dailyStatus[tgl] === '✓')) {
          pagiCheckedCount++;
          dailySelesai++;
        }
      });
      jamKerjaTasks.forEach(t => {
        if (t.dailyStatus && (t.dailyStatus[tgl] === '1' || t.dailyStatus[tgl] === 1 || t.dailyStatus[tgl] === true || t.dailyStatus[tgl] === '✓')) {
          jamKerjaCheckedCount++;
          dailySelesai++;
        }
      });
    } else if (shiftCode === 'S' || shiftCode === 'M') {
      // 3 Malam = 3 Target
      dailyTarget = 3;
      malamTasks.forEach(t => {
        if (t.dailyStatus && (t.dailyStatus[tgl] === '1' || t.dailyStatus[tgl] === 1 || t.dailyStatus[tgl] === true || t.dailyStatus[tgl] === '✓')) {
          malamCheckedCount++;
          dailySelesai++;
        }
      });
    }

    rekapHarian.push({
      hari: tgl,
      total: dailyTarget,
      selesai: dailySelesai,
      belum: Math.max(0, dailyTarget - dailySelesai),
      shift: shiftCode
    });
  });

  const pagiTarget = pCount * 4;
  const jamKerjaTarget = pCount * 3;
  const malamTarget = (sCount + mCount) * 3;

  const totalTarget = pagiTarget + jamKerjaTarget + malamTarget;
  const totalSelesai = pagiCheckedCount + jamKerjaCheckedCount + malamCheckedCount;
  const totalBelum = Math.max(0, totalTarget - totalSelesai);
  const persen = totalTarget > 0 ? Math.round((totalSelesai / totalTarget) * 100) : 0;

  const rekapRuangan = [
    { ruangan: 'PAGI (06.00-07.30)', total: pagiTarget, selesai: pagiCheckedCount, itemCount: pagiTasks.length || 4, jenis: 'Keamanan' },
    { ruangan: 'SELAMA JAM KERJA (07.30-16.00)', total: jamKerjaTarget, selesai: jamKerjaCheckedCount, itemCount: jamKerjaTasks.length || 3, jenis: 'Keamanan' },
    { ruangan: 'MALAM (Patroli & Penguncian Gedung)', total: malamTarget, selesai: malamCheckedCount, itemCount: malamTasks.length || 3, jenis: 'Keamanan' }
  ];

  return {
    officer: officer,
    namaPegawai: matchedEmpName,
    username: officer.username,
    role: 'SECURITY',
    unitLabel: 'Unit Keamanan (Satpam)',
    jenis: 'Keamanan',
    jadwal: jadwal,
    summary: { P: pCount, S: sCount, M: mCount, O: oCount, totalKerja: pCount + sCount + mCount },
    totalHariKerja: pCount + sCount + mCount,
    totalTarget: totalTarget,
    totalSelesai: totalSelesai,
    totalBelum: totalBelum,
    persen: persen,
    rekapRuangan: rekapRuangan,
    rekapHarian: rekapHarian,
    taskItems: taskItems,
    roomsSummary: ['PAGI (06.00-07.30)', 'SELAMA JAM KERJA (07.30-16.00)', 'MALAM']
  };
}

/**
 * Mengambil Jadwal Piket Keamanan dari sheet JadwalPiketSecurity / JadwalPiket
 */
function getJadwalKeamanan(token, bulan, tahun, targetUser) {
  try {
    const session = getSessionUser(token);
    if (!session) {
      return { success: false, message: "Sesi tidak valid. Silakan login kembali." };
    }

    const ss = getDb();
    if (!ss) return { success: false, message: "Koneksi database spreadsheet gagal." };

    const jadwalSheet = findJadwalSheet(ss);
    if (!jadwalSheet) {
      return { success: false, message: "Sheet jadwal piket keamanan (JadwalPiketSecurity) tidak ditemukan." };
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

    const isSupervisorOrAdmin = (session.role === 'SUPERVISOR' || session.role === 'ADMIN');
    let searchTarget = session;

    if (isSupervisorOrAdmin) {
      if (targetUser && targetUser !== 'SEMUA' && targetUser !== 'ALL') {
        searchTarget = { namaPegawai: targetUser, username: targetUser, namaSheet: targetUser, role: 'SECURITY' };
      }
    }

    const secMetrics = calculateSecurityOfficerMetrics(ss, searchTarget, schedCols, rawValues, displayValues, selectedMonth, tahun);

    return {
      success: true,
      data: {
        namaPegawai: secMetrics.namaPegawai,
        jadwal: secMetrics.jadwal,
        summary: secMetrics.summary,
        totalHariKerja: secMetrics.totalHariKerja,
        totalTarget: secMetrics.totalTarget,
        totalSelesai: secMetrics.totalSelesai,
        totalBelum: secMetrics.totalBelum,
        persen: secMetrics.persen,
        taskItems: secMetrics.taskItems
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
  const sName = sheet ? sheet.getName() : '';
  const sAlpha = getAlphaOnly(sName);

  if (KNOWN_EMPLOYEE_SHEET_MAP[sAlpha]) {
    jenis = KNOWN_EMPLOYEE_SHEET_MAP[sAlpha].jenis === 'RESEPSIONIS' ? 'Pelayanan' : (KNOWN_EMPLOYEE_SHEET_MAP[sAlpha].jenis === 'KEAMANAN KANTOR' ? 'Keamanan' : 'Kebersihan');
  } else {
    const sNameUpper = String(sName || '').toUpperCase();
    if (sNameUpper.includes('PELAYANAN') || sNameUpper.includes('RESEPSIONIS') || sNameUpper.includes('PST') || sNameUpper.includes('MAWARDI') || sNameUpper.includes('RANIA') || sNameUpper.includes('ALFIANA')) {
      jenis = 'Pelayanan';
    } else if (sNameUpper.includes('KEAMANAN') || sNameUpper.includes('SECURITY') || sNameUpper.includes('SATPAM')) {
      jenis = 'Keamanan';
    } else if (sNameUpper.includes('YUNI') || sNameUpper.includes('SLAMET') || sNameUpper.includes('SYUKRI') || sNameUpper.includes('DEDE') || sNameUpper.includes('NURRAMADHANIAL') || sNameUpper.includes('RAMADHAN')) {
      jenis = 'Kebersihan';
    } else {
      for (let r = 0; r <= Math.min(2, values.length - 1); r++) {
        for (let c = 0; c < Math.min(values[r].length, 6); c++) {
          const cellVal = String(values[r][c] || '').toUpperCase().trim();
          if (cellVal.includes('STANDAR PELAYANAN') || cellVal.includes('MONITORING PELAYANAN')) {
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

  // 5. Rentang kolom bulan terpilih (Pencarian Cerdas & Fallback Aman)
  let monthStartCol = monthStartColMap[selectedMonth];

  if (monthStartCol === undefined) {
    const availableStartCols = Object.values(monthStartColMap).sort((a, b) => a - b);
    if (availableStartCols.length === 1) {
      monthStartCol = availableStartCols[0];
    } else {
      monthStartCol = firstDateColIdx;
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
      if (val === true || val === false || val === 1 || val === 0 || val === '1' || val === '0' || val === '✓') {
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
 * Helper untuk mendeteksi Lantai / Lokasi Gedung dari Nama Ruangan
 */
function getLantaiFromRuangan(ruangan) {
  if (!ruangan) return 'Lantai 1';
  const r = String(ruangan).toLowerCase();
  if (r.includes('lantai 2') || r.includes('lt 2') || r.includes('lt. 2') || r.includes('lt.2') || r.includes('lantai ii') || r.includes('lt ii')) {
    return 'Lantai 2';
  }
  if (r.includes('lantai 3') || r.includes('lt 3') || r.includes('lt. 3') || r.includes('lt.3') || r.includes('lantai iii') || r.includes('lt iii')) {
    return 'Lantai 3';
  }
  if (r.includes('halaman') || r.includes('parkir') || r.includes('taman') || r.includes('luar') || r.includes('pos satpam') || r.includes('pagar') || r.includes('posko')) {
    return 'Luar / Halaman';
  }
  return 'Lantai 1';
}

/**
 * Mengambil Data Dashboard Eksekutif Supervisor / Kasubbag Umum / PPK
 * Secara komprehensif membaca seluruh personil, jadwal security, dan lembar monitoring per unit
 */
function getSupervisorDashboardData(token, bulan, tahun, filterUnit, filterLantai) {
  try {
    const session = getSessionUser(token);
    if (!session) {
      return { success: false, message: "Sesi telah berakhir. Silakan login kembali." };
    }

    const ss = getDb();
    if (!ss) {
      return { success: false, message: "Koneksi database spreadsheet gagal." };
    }

    const now = new Date();
    const selBulan = bulan ? Number(bulan) : (now.getMonth() + 1);
    const selTahun = tahun ? Number(tahun) : now.getFullYear();

    let userSheet = findSheet(ss, "Users");
    if (!userSheet) {
      // Coba cari sheet yang mengandung nama 'user'
      const allS = ss.getSheets();
      for (let i = 0; i < allS.length; i++) {
        if (allS[i].getName().toLowerCase().includes('user')) {
          userSheet = allS[i];
          break;
        }
      }
    }

    let rawUsers = [];
    let colUser = 0, colNama = 1, colSheet = 2, colRole = -1;
    let headerRowIdx = 0;

    if (userSheet) {
      const rawValues = userSheet.getDataRange().getValues();
      for (let r = 0; r < Math.min(5, rawValues.length); r++) {
        const row = rawValues[r];
        let hasHeader = false;
        for (let c = 0; c < row.length; c++) {
          const h = cleanStr(row[c]).toLowerCase();
          if (h === 'username' || (h.includes('user') && !h.includes('nama') && !h.includes('daftar'))) { colUser = c; hasHeader = true; }
          if (h === 'nama pegawai' || h === 'nama lengkap' || (h.includes('nama') && !h.includes('sheet') && !h.includes('user'))) colNama = c;
          if (h === 'nama sheet' || h === 'sheet' || (h.includes('sheet') && !h.includes('pegawai'))) colSheet = c;
          if (h === 'role' || h === 'peran' || h === 'jabatan' || (h.includes('role') || h.includes('akses'))) colRole = c;
        }
        if (hasHeader) {
          headerRowIdx = r;
          break;
        }
      }

      for (let i = headerRowIdx + 1; i < rawValues.length; i++) {
        const u = cleanStr(rawValues[i][colUser]);
        const n = cleanStr(rawValues[i][colNama]);
        const s = cleanStr(rawValues[i][colSheet]);
        const rol = (colRole !== -1 && rawValues[i][colRole]) ? cleanStr(rawValues[i][colRole]).toUpperCase() : '';
        if (u || n) {
          rawUsers.push({ username: u, namaPegawai: n, namaSheet: s, role: rol });
        }
      }
    }

    // Jika Users sheet kosong atau tidak ada, otomatis pindai seluruh sheet di spreadsheet
    if (rawUsers.length === 0) {
      const allSheets = ss.getSheets();
      for (let i = 0; i < allSheets.length; i++) {
        const sh = allSheets[i];
        const sName = sh.getName();
        if (isSystemSheet(sName)) continue;
        const j = getSheetJenis(sh, null, ss);
        let rType = (j === 'RESEPSIONIS') ? 'PELAYANAN' : 'CS';
        rawUsers.push({ username: sName.toLowerCase().replace(/\s+/g, ''), namaPegawai: sName, namaSheet: sName, role: rType });
      }

      // Tambahkan satpam default jika JadwalPiketSecurity ada
      const jadwalSheet = findJadwalSheet(ss);
      if (jadwalSheet) {
        const secDefaults = [
          { username: 'eddy', namaPegawai: 'Eddy Suryadi', namaSheet: 'JadwalPiketSecurity', role: 'SECURITY' },
          { username: 'reza', namaPegawai: 'Syarif Reza Nopriadrian Al Kadri', namaSheet: 'JadwalPiketSecurity', role: 'SECURITY' },
          { username: 'feri', namaPegawai: 'Feri Yustami', namaSheet: 'JadwalPiketSecurity', role: 'SECURITY' },
          { username: 'eko', namaPegawai: 'Eko Prasetyo', namaSheet: 'JadwalPiketSecurity', role: 'SECURITY' },
          { username: 'agus', namaPegawai: 'Agus Tetriansyah', namaSheet: 'JadwalPiketSecurity', role: 'SECURITY' },
          { username: 'rizki', namaPegawai: 'Rizki Fadil', namaSheet: 'JadwalPiketSecurity', role: 'SECURITY' }
        ];
        secDefaults.forEach(sd => rawUsers.push(sd));
      }
    }

    const employees = [];
    let macroCsTarget = 0, macroCsSelesai = 0;
    let macroPstTarget = 0, macroPstSelesai = 0;
    let macroSecTarget = 0, macroSecSelesai = 0;

    // Cache jadwal sheet sekali saja agar eksekusi cepat
    let jadwalVals = null;
    let jadwalGrid = null;
    const jadwalSheet = findJadwalSheet(ss);
    if (jadwalSheet) {
      jadwalVals = jadwalSheet.getDataRange().getValues();
      jadwalGrid = parseJadwalGrid(jadwalVals, selBulan);
    }

    for (let i = 0; i < rawUsers.length; i++) {
      const uName = rawUsers[i].username;
      const nNama = rawUsers[i].namaPegawai;
      const nSheet = rawUsers[i].namaSheet;
      const expRole = rawUsers[i].role;
      const uAlpha = getAlphaOnly(uName) || getAlphaOnly(nNama);

      let role = 'CS';
      if (KNOWN_EMPLOYEE_SHEET_MAP[uAlpha]) {
        role = KNOWN_EMPLOYEE_SHEET_MAP[uAlpha].role;
      } else if (['CS', 'PELAYANAN', 'SECURITY', 'SUPERVISOR', 'ADMIN'].includes(expRole)) {
        role = expRole;
      } else {
        const uComb = (uName + ' ' + nNama + ' ' + nSheet).toLowerCase();
        if (uComb.includes('supervisor') || uComb.includes('kasubbag') || uComb.includes('ppk') || uComb.includes('koordinator') || uComb.includes('pimpinan')) {
          role = 'SUPERVISOR';
        } else if (uComb.includes('admin')) {
          role = 'ADMIN';
        } else if (uComb.includes('pelayanan') || uComb.includes('resepsionis') || uComb.includes('pst') || uComb.includes('mawardi') || uComb.includes('rania') || uComb.includes('alfiana')) {
          role = 'PELAYANAN';
        } else if (uComb.includes('keamanan') || uComb.includes('satpam') || uComb.includes('security') || uComb.includes('eddy') || uComb.includes('reza') || uComb.includes('feri') || uComb.includes('eko') || uComb.includes('agus') || uComb.includes('rizki')) {
          role = 'SECURITY';
        } else {
          role = 'CS';
        }
      }

      // Supervisor & Admin murni dilewati dari daftar perbandingan pekerja lapangan
      if (role === 'SUPERVISOR' || role === 'ADMIN') continue;

      let totalTarget = 0;
      let totalSelesai = 0;
      let totalBelum = 0;
      let persen = 0;
      let roomsSummary = [];

      if (role === 'CS' || role === 'PELAYANAN') {
        const targetSheet = findEmployeeSheet(ss, nSheet, nNama, uName);
        if (targetSheet) {
          const parsed = readSheetMonitoring(targetSheet, selBulan, selTahun);
          let filteredItems = parsed.items || [];
          if (filterLantai && filterLantai !== 'SEMUA') {
            filteredItems = filteredItems.filter(it => getLantaiFromRuangan(it.ruangan) === filterLantai);
          }

          filteredItems.forEach(it => {
            totalTarget += it.totalHariAktif;
            totalSelesai += it.selesaiCount;
          });

          totalBelum = Math.max(0, totalTarget - totalSelesai);
          persen = totalTarget > 0 ? Math.round((totalSelesai / totalTarget) * 100) : 0;
          roomsSummary = (parsed.daftarRuangan || []).slice(0, 4);
        } else {
          // Fallback baseline jika sheet belum dibuat
          totalTarget = 0;
          totalSelesai = 0;
          totalBelum = 0;
          persen = 0;
        }
      } else if (role === 'SECURITY') {
        if (jadwalVals && jadwalGrid && !jadwalGrid.error && jadwalGrid.schedCols) {
          const secMetrics = calculateSecurityOfficerMetrics(ss, { username: uName, namaPegawai: nNama, namaSheet: nSheet, role: 'SECURITY' }, jadwalGrid.schedCols, jadwalVals, null, selBulan, selTahun);
          totalTarget = secMetrics.totalTarget;
          totalSelesai = secMetrics.totalSelesai;
          totalBelum = secMetrics.totalBelum;
          persen = secMetrics.persen;
          roomsSummary = secMetrics.roomsSummary;
        } else {
          totalTarget = 0;
          totalSelesai = 0;
          totalBelum = 0;
          persen = 0;
          roomsSummary = ['PAGI (06.00-07.30)', 'SELAMA JAM KERJA (07.30-16.00)', 'MALAM'];
        }
      }

      // Akumulasi Makro
      if (role === 'CS') {
        macroCsTarget += totalTarget;
        macroCsSelesai += totalSelesai;
      } else if (role === 'PELAYANAN') {
        macroPstTarget += totalTarget;
        macroPstSelesai += totalSelesai;
      } else if (role === 'SECURITY') {
        macroSecTarget += totalTarget;
        macroSecSelesai += totalSelesai;
      }

      // Evaluasi Badge Status Kinerja
      let statusLabel = 'Baik';
      let statusColor = 'blue';
      let statusBadge = 'bg-blue-100 text-blue-800 border-blue-200';

      if (persen >= 90) {
        statusLabel = 'Sangat Baik';
        statusColor = 'emerald';
        statusBadge = 'bg-emerald-100 text-emerald-800 border-emerald-200';
      } else if (persen >= 75) {
        statusLabel = 'Baik';
        statusColor = 'blue';
        statusBadge = 'bg-blue-100 text-blue-800 border-blue-200';
      } else if (persen >= 60) {
        statusLabel = 'Cukup';
        statusColor = 'amber';
        statusBadge = 'bg-amber-100 text-amber-800 border-amber-200';
      } else {
        statusLabel = 'Perlu Pembinaan';
        statusColor = 'rose';
        statusBadge = 'bg-rose-100 text-rose-800 border-rose-200';
      }

      const empObj = {
        username: uName,
        namaPegawai: nNama,
        role: role,
        roleLabel: role === 'CS' ? 'Kebersihan (CS)' : (role === 'PELAYANAN' ? 'Pelayanan (PST)' : 'Keamanan (Satpam)'),
        totalTarget: totalTarget,
        totalSelesai: totalSelesai,
        totalBelum: totalBelum,
        persen: persen,
        statusKinerja: {
          label: statusLabel,
          color: statusColor,
          badge: statusBadge
        },
        roomsSummary: roomsSummary
      };

      // Filter Unit jika dipilih
      if (!filterUnit || filterUnit === 'SEMUA' || filterUnit === role) {
        employees.push(empObj);
      }
    }

    // Hitung Persentase Makro
    const macroTotalTarget = macroCsTarget + macroPstTarget + macroSecTarget;
    const macroTotalSelesai = macroCsSelesai + macroPstSelesai + macroSecSelesai;
    const macroTotalPersen = macroTotalTarget > 0 ? Math.round((macroTotalSelesai / macroTotalTarget) * 100) : 0;
    const macroCsPersen = macroCsTarget > 0 ? Math.round((macroCsSelesai / macroCsTarget) * 100) : 0;
    const macroPstPersen = macroPstTarget > 0 ? Math.round((macroPstSelesai / macroPstTarget) * 100) : 0;
    const macroSecPersen = macroSecTarget > 0 ? Math.round((macroSecSelesai / macroSecTarget) * 100) : 0;

    // Pisahkan Daftar Pegawai Berdasarkan Unit Kerja
    const units = {
      CS: {
        key: 'CS',
        name: 'Unit Kebersihan',
        icon: 'fa-sparkles',
        color: 'orange',
        list: employees.filter(e => e.role === 'CS'),
        target: macroCsTarget,
        selesai: macroCsSelesai,
        persen: macroCsPersen
      },
      SECURITY: {
        key: 'SECURITY',
        name: 'Unit Keamanan (Satpam)',
        icon: 'fa-shield-halved',
        color: 'indigo',
        list: employees.filter(e => e.role === 'SECURITY'),
        target: macroSecTarget,
        selesai: macroSecSelesai,
        persen: macroSecPersen
      },
      PELAYANAN: {
        key: 'PELAYANAN',
        name: 'Unit Pelayanan (PST)',
        icon: 'fa-hand-holding-heart',
        color: 'blue',
        list: employees.filter(e => e.role === 'PELAYANAN'),
        target: macroPstTarget,
        selesai: macroPstSelesai,
        persen: macroPstPersen
      }
    };

    // Ambil Data Quality Audits & Approvals
    const qaResult = getQualityAudits(token, selBulan, selTahun);
    const qaData = (qaResult && qaResult.success) ? qaResult.data : { averageScore: 0, totalAudits: 0, recentAudits: [], aspectScores: {} };

    const appResult = getMonthlyApprovals(token, selBulan, selTahun);
    const appData = (appResult && appResult.success) ? appResult.data : {};

    return {
      success: true,
      data: {
        macro: {
          totalPegawai: employees.length,
          kepatuhanTotal: macroTotalPersen,
          kepatuhanCs: macroCsPersen,
          kepatuhanPst: macroPstPersen,
          kepatuhanSecurity: macroSecPersen,
          totalTarget: macroTotalTarget,
          totalSelesai: macroTotalSelesai,
          qaAverageScore: qaData.averageScore || 0,
          qaTotalAudits: qaData.monthTotalAudits || qaData.totalAudits || 0,
          qaAspectScores: qaData.aspectScores || {}
        },
        employees: employees,
        units: units,
        approvals: appData,
        qaSummary: qaData
      }
    };

  } catch (err) {
    return { success: false, message: "Terjadi kesalahan memuat dashboard supervisor: " + err.message };
  }
}

/**
 * Setup Sheet Quality_Audits (Mendukung 11 Kolom dengan KategoriMutu)
 */
function setupQualityAuditsSheet(ss) {
  if (!ss) return null;
  let sheet = ss.getSheetByName("Quality_Audits");
  if (!sheet) {
    sheet = ss.insertSheet("Quality_Audits");
    sheet.getRange(1, 1, 1, 11).setValues([[
      "AuditID", "Tanggal", "Auditor", "RoleAuditor", "KategoriMutu", "AreaRuangan", "Lantai", "SkorBintang", "CatatanEvaluasi", "FotoTemuanUrl", "Timestamp"
    ]]);
    sheet.getRange(1, 1, 1, 11)
      .setBackground("#047857")
      .setFontColor("#ffffff")
      .setFontWeight("bold");
    sheet.autoResizeColumns(1, 11);
  }
  return sheet;
}

/**
 * Setup Sheet Monthly_Approvals
 */
function setupMonthlyApprovalsSheet(ss) {
  if (!ss) return null;
  let sheet = ss.getSheetByName("Monthly_Approvals");
  if (!sheet) {
    sheet = ss.insertSheet("Monthly_Approvals");
    sheet.getRange(1, 1, 1, 9).setValues([[
      "ApprovalID", "Bulan", "Tahun", "UnitKerja", "Status", "Verifikator", "CatatanApproval", "TanggalApproval", "Timestamp"
    ]]);
    sheet.getRange(1, 1, 1, 9)
      .setBackground("#1e40af")
      .setFontColor("#ffffff")
      .setFontWeight("bold");
    sheet.autoResizeColumns(1, 9);
  }
  return sheet;
}

/**
 * Submit Penilaian Inspeksi Mutu Terpadu (Kebersihan, Keamanan, Pelayanan, Sarpras)
 */
function submitQualityAudit(token, auditData) {
  try {
    const session = getSessionUser(token);
    if (!session) {
      return { success: false, message: "Sesi telah berakhir. Silakan login kembali." };
    }
    if (session.role !== 'SUPERVISOR' && session.role !== 'ADMIN') {
      return { success: false, message: "Hanya Supervisor / Kasubbag Umum / PPK / Admin yang berwenang mengisi inspeksi mutu." };
    }

    const ss = getDb();
    if (!ss) return { success: false, message: "Koneksi database spreadsheet gagal." };

    let sheet = findSheet(ss, "Quality_Audits");
    if (!sheet) {
      sheet = setupQualityAuditsSheet(ss);
    }

    const now = new Date();
    const nowTimestamp = Utilities.formatDate(now, "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss");
    const dateStr = auditData.tanggal || Utilities.formatDate(now, "Asia/Jakarta", "yyyy-MM-dd");
    const auditId = "AUD-" + Utilities.formatDate(now, "Asia/Jakarta", "yyyyMMdd") + "-" + Math.floor(1000 + Math.random() * 9000);

    const rawKategori = cleanStr(auditData.kategoriMutu || auditData.aspekMutu || auditData.kategori || 'Kebersihan');
    let kategori = 'Kebersihan';
    const katUpper = rawKategori.toUpperCase();
    if (katUpper.includes('AMAN') || katUpper.includes('SECURITY') || katUpper.includes('SATPAM')) kategori = 'Keamanan';
    else if (katUpper.includes('LAYAN') || katUpper.includes('PST') || katUpper.includes('RESEP')) kategori = 'Pelayanan';
    else if (katUpper.includes('SARANA') || katUpper.includes('PRASARANA') || katUpper.includes('SARPRAS') || katUpper.includes('FASILITAS')) kategori = 'Sarana & Prasarana';
    else kategori = 'Kebersihan';

    const skor = Number(auditData.skorBintang) || 5;
    const auditor = auditData.auditor || session.namaPegawai;
    const roleAuditor = session.role || 'SUPERVISOR';
    const area = cleanStr(auditData.areaRuangan || auditData.ruangan || 'Area Publik');
    const lantai = cleanStr(auditData.lantai || getLantaiFromRuangan(area));
    const catatan = cleanStr(auditData.catatan || auditData.catatanEvaluasi || '-');
    const fotoUrl = cleanStr(auditData.fotoTemuanUrl || auditData.fotoUrl || '');

    // Cek jumlah kolom header apakah 10 atau 11 kolom
    const headers = sheet.getRange(1, 1, 1, Math.max(10, sheet.getLastColumn())).getValues()[0];
    let hasKategoriCol = false;
    headers.forEach(h => {
      const hStr = cleanStr(h).toLowerCase();
      if (hStr.includes('kategori') || hStr.includes('aspek') || hStr.includes('unit')) hasKategoriCol = true;
    });

    if (hasKategoriCol || headers.length >= 11) {
      sheet.appendRow([
        auditId,
        dateStr,
        auditor,
        roleAuditor,
        kategori,
        area,
        lantai,
        skor,
        catatan,
        fotoUrl,
        nowTimestamp
      ]);
    } else {
      // Fallback jika sheet lama masih 10 kolom
      sheet.appendRow([
        auditId,
        dateStr,
        auditor,
        roleAuditor,
        area,
        lantai,
        skor,
        catatan + ' [Kategori: ' + kategori + ']',
        fotoUrl,
        nowTimestamp
      ]);
    }

    SpreadsheetApp.flush();

    return {
      success: true,
      message: "Inspeksi mutu " + kategori + " pada " + area + " berhasil dicatat ke spreadsheet!",
      auditId: auditId
    };
  } catch (err) {
    return { success: false, message: "Gagal mencatat inspeksi mutu: " + err.message };
  }
}

/**
 * Mengambil Data Histori & Rata-rata Skor Quality Audits (Multi-Aspek)
 */
function getQualityAudits(token, bulan, tahun) {
  try {
    const session = getSessionUser(token);
    if (!session) {
      return { success: false, message: "Sesi tidak valid. Silakan login kembali." };
    }

    const ss = getDb();
    if (!ss) return { success: false, message: "Koneksi database spreadsheet gagal." };

    const sheet = findSheet(ss, "Quality_Audits");
    if (!sheet) {
      return {
        success: true,
        data: {
          audits: [],
          recentAudits: [],
          averageScore: 0,
          totalAudits: 0,
          monthTotalAudits: 0,
          aspectScores: {
            kebersihan: { avg: 0, count: 0 },
            keamanan: { avg: 0, count: 0 },
            pelayanan: { avg: 0, count: 0 },
            sarpras: { avg: 0, count: 0 }
          },
          areaScores: {}
        }
      };
    }

    const rawValues = sheet.getDataRange().getValues();
    if (rawValues.length < 2) {
      return {
        success: true,
        data: {
          audits: [],
          recentAudits: [],
          averageScore: 0,
          totalAudits: 0,
          monthTotalAudits: 0,
          aspectScores: {
            kebersihan: { avg: 0, count: 0 },
            keamanan: { avg: 0, count: 0 },
            pelayanan: { avg: 0, count: 0 },
            sarpras: { avg: 0, count: 0 }
          },
          areaScores: {}
        }
      };
    }

    const now = new Date();
    const selBulan = bulan ? Number(bulan) : (now.getMonth() + 1);
    const selTahun = tahun ? Number(tahun) : now.getFullYear();

    const audits = [];
    let totalScore = 0;
    let monthScore = 0;
    let monthCount = 0;
    const areaMap = {};
    const aspectMap = {
      kebersihan: { total: 0, count: 0 },
      keamanan: { total: 0, count: 0 },
      pelayanan: { total: 0, count: 0 },
      sarpras: { total: 0, count: 0 }
    };

    let colId = 0, colTgl = 1, colAuditor = 2, colRole = 3, colKategori = -1, colArea = 4, colLantai = 5, colSkor = 6, colCatatan = 7, colFoto = 8, colTime = 9;
    const headerRow = rawValues[0];
    for (let c = 0; c < headerRow.length; c++) {
      const h = cleanStr(headerRow[c]).toLowerCase();
      if (h.includes('id')) colId = c;
      else if (h.includes('tanggal') || h === 'tgl') colTgl = c;
      else if (h.includes('auditor') && !h.includes('role')) colAuditor = c;
      else if (h.includes('role')) colRole = c;
      else if (h.includes('kategori') || h.includes('aspek') || h.includes('unit')) colKategori = c;
      else if (h.includes('area') || h.includes('ruangan')) colArea = c;
      else if (h.includes('lantai')) colLantai = c;
      else if (h.includes('skor') || h.includes('bintang') || h.includes('rating')) colSkor = c;
      else if (h.includes('catatan') || h.includes('evaluasi')) colCatatan = c;
      else if (h.includes('foto')) colFoto = c;
      else if (h.includes('time') || h.includes('timestamp')) colTime = c;
    }

    for (let r = 1; r < rawValues.length; r++) {
      const row = rawValues[r];
      if (!row || !row[colId]) continue;

      const tglRaw = row[colTgl];
      let rowDate = null;
      if (tglRaw instanceof Date) {
        rowDate = tglRaw;
      } else if (typeof tglRaw === 'string' && tglRaw.trim()) {
        const parts = tglRaw.split(/[-/]/);
        if (parts.length === 3) {
          if (parts[0].length === 4) rowDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
          else rowDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        }
      }

      const rowMonth = rowDate ? (rowDate.getMonth() + 1) : selBulan;
      const rowYear = rowDate ? rowDate.getFullYear() : selTahun;

      const skorVal = Number(row[colSkor]) || 5;
      const areaVal = cleanStr(row[colArea]) || 'Area Publik';
      const formattedDate = rowDate ? Utilities.formatDate(rowDate, "Asia/Jakarta", "dd MMM yyyy") : String(tglRaw);

      let katVal = (colKategori !== -1 && row[colKategori]) ? cleanStr(row[colKategori]) : '';
      if (!katVal) {
        const catText = cleanStr(row[colCatatan]).toUpperCase();
        const areaUpper = areaVal.toUpperCase();
        if (catText.includes('KEAMANAN') || areaUpper.includes('SATPAM') || areaUpper.includes('PARKIR') || areaUpper.includes('GERBANG')) katVal = 'Keamanan';
        else if (catText.includes('PELAYANAN') || areaUpper.includes('PST') || areaUpper.includes('RESEPSIONIS')) katVal = 'Pelayanan';
        else if (catText.includes('SARPRAS') || areaUpper.includes('SERVER') || areaUpper.includes('GENSET')) katVal = 'Sarana & Prasarana';
        else katVal = 'Kebersihan';
      }

      const auditItem = {
        auditId: cleanStr(row[colId]),
        tanggal: formattedDate,
        rawDate: rowDate ? rowDate.toISOString() : '',
        auditor: cleanStr(row[colAuditor]),
        roleAuditor: cleanStr(row[colRole]),
        kategoriMutu: katVal,
        areaRuangan: areaVal,
        lantai: cleanStr(row[colLantai]) || getLantaiFromRuangan(areaVal),
        skorBintang: skorVal,
        catatanEvaluasi: cleanStr(row[colCatatan]),
        fotoTemuanUrl: cleanStr(row[colFoto]),
        timestamp: cleanStr(row[colTime])
      };

      audits.push(auditItem);
      totalScore += skorVal;

      if (rowMonth === selBulan && rowYear === selTahun) {
        monthScore += skorVal;
        monthCount++;

        // Akumulasi per area
        if (!areaMap[areaVal]) {
          areaMap[areaVal] = { total: 0, count: 0 };
        }
        areaMap[areaVal].total += skorVal;
        areaMap[areaVal].count += 1;

        // Akumulasi per aspek mutu
        const katNorm = katVal.toLowerCase();
        if (katNorm.includes('aman') || katNorm.includes('security')) {
          aspectMap.keamanan.total += skorVal;
          aspectMap.keamanan.count += 1;
        } else if (katNorm.includes('layan') || katNorm.includes('pst')) {
          aspectMap.pelayanan.total += skorVal;
          aspectMap.pelayanan.count += 1;
        } else if (katNorm.includes('sarana') || katNorm.includes('prasarana') || katNorm.includes('sarpras')) {
          aspectMap.sarpras.total += skorVal;
          aspectMap.sarpras.count += 1;
        } else {
          aspectMap.kebersihan.total += skorVal;
          aspectMap.kebersihan.count += 1;
        }
      }
    }

    audits.sort((a, b) => (b.auditId > a.auditId ? 1 : -1));

    const finalAvg = monthCount > 0 ? (monthScore / monthCount) : (audits.length > 0 ? (totalScore / audits.length) : 0);

    const areaScores = {};
    Object.keys(areaMap).forEach(areaKey => {
      areaScores[areaKey] = Math.round((areaMap[areaKey].total / areaMap[areaKey].count) * 10) / 10;
    });

    const aspectScores = {
      kebersihan: {
        avg: aspectMap.kebersihan.count > 0 ? Math.round((aspectMap.kebersihan.total / aspectMap.kebersihan.count) * 10) / 10 : 0,
        count: aspectMap.kebersihan.count
      },
      keamanan: {
        avg: aspectMap.keamanan.count > 0 ? Math.round((aspectMap.keamanan.total / aspectMap.keamanan.count) * 10) / 10 : 0,
        count: aspectMap.keamanan.count
      },
      pelayanan: {
        avg: aspectMap.pelayanan.count > 0 ? Math.round((aspectMap.pelayanan.total / aspectMap.pelayanan.count) * 10) / 10 : 0,
        count: aspectMap.pelayanan.count
      },
      sarpras: {
        avg: aspectMap.sarpras.count > 0 ? Math.round((aspectMap.sarpras.total / aspectMap.sarpras.count) * 10) / 10 : 0,
        count: aspectMap.sarpras.count
      }
    };

    return {
      success: true,
      data: {
        audits: audits,
        recentAudits: audits.slice(0, 15),
        averageScore: Math.round(finalAvg * 10) / 10,
        totalAudits: audits.length,
        monthTotalAudits: monthCount,
        aspectScores: aspectScores,
        areaScores: areaScores
      }
    };
  } catch (err) {
    return { success: false, message: "Gagal memuat audit mutu: " + err.message };
  }
}

/**
 * Mengambil Seluruh Matriks Jadwal Satpam (Untuk Supervisor & Admin)
 */
function getSecurityScheduleMatrix(token, bulan, tahun) {
  try {
    const session = getSessionUser(token);
    if (!session) {
      return { success: false, message: "Sesi telah berakhir. Silakan login kembali." };
    }
    if (session.role !== 'SUPERVISOR' && session.role !== 'ADMIN') {
      return { success: false, message: "Hanya Supervisor dan Admin yang memiliki izin mengelola jadwal satpam." };
    }

    const ss = getDb();
    if (!ss) return { success: false, message: "Koneksi spreadsheet gagal." };

    let jadwalSheet = findJadwalSheet(ss);
    if (!jadwalSheet) {
      return { success: false, message: "Sheet jadwal piket satpam (JadwalPiketSecurity) tidak ditemukan." };
    }

    const rawValues = jadwalSheet.getDataRange().getValues();
    const displayValues = jadwalSheet.getDataRange().getDisplayValues();
    const selectedMonth = bulan ? Number(bulan) : (new Date().getMonth() + 1);
    const selectedYear = tahun ? Number(tahun) : new Date().getFullYear();

    const gridResult = parseJadwalGrid(rawValues, selectedMonth);
    if (!gridResult || gridResult.error) {
      return { success: false, message: gridResult ? gridResult.error : "Format tabel jadwal tidak dapat dibaca." };
    }

    const schedCols = gridResult.schedCols || [];
    if (schedCols.length === 0) {
      return { success: false, message: "Data tanggal jadwal untuk bulan terpilih belum tersedia." };
    }

    // Ambil daftar seluruh personil security dari sheet Users
    const userSheet = findSheet(ss, "Users");
    const securityUsers = [];
    if (userSheet) {
      const uVals = userSheet.getDataRange().getValues();
      let colUser = 0, colNama = 1, colRole = 4;
      for (let r = 0; r < Math.min(5, uVals.length); r++) {
        for (let c = 0; c < uVals[r].length; c++) {
          const h = cleanStr(uVals[r][c]).toLowerCase();
          if (h.includes('user')) colUser = c;
          if (h.includes('nama')) colNama = c;
          if (h.includes('role')) colRole = c;
        }
      }
      for (let r = 1; r < uVals.length; r++) {
        const u = cleanStr(uVals[r][colUser]);
        const n = cleanStr(uVals[r][colNama]);
        const rol = (colRole !== -1 && uVals[r][colRole]) ? cleanStr(uVals[r][colRole]).toUpperCase() : '';
        if (rol === 'SECURITY' || (!rol && (u.includes('eddy') || u.includes('reza') || u.includes('feri') || u.includes('eko') || u.includes('agus') || u.includes('rizki')))) {
          securityUsers.push({ username: u, namaPegawai: n });
        }
      }
    }

    if (securityUsers.length === 0) {
      const secDefault = [
        { username: 'eddy', namaPegawai: 'Eddy Suryadi' },
        { username: 'reza', namaPegawai: 'Syarif Reza Nopriadrian Al Kadri' },
        { username: 'feri', namaPegawai: 'Feri Yustami' },
        { username: 'eko', namaPegawai: 'Eko Prasetyo' },
        { username: 'agus', namaPegawai: 'Agus Tetriansyah' },
        { username: 'rizki', namaPegawai: 'Rizki Fadil' }
      ];
      secDefault.forEach(s => securityUsers.push(s));
    }

    const officers = [];
    for (let u = 0; u < securityUsers.length; u++) {
      const secUser = securityUsers[u];
      let rowIdx = findEmployeeRowInJadwal(rawValues, secUser, 0);
      if (rowIdx === -1 && displayValues) {
        rowIdx = findEmployeeRowInJadwal(displayValues, secUser, 0);
      }

      const empRow = (rowIdx !== -1) ? rawValues[rowIdx] : [];
      const empDispRow = (rowIdx !== -1 && displayValues && displayValues[rowIdx]) ? displayValues[rowIdx] : empRow;

      const shifts = {};
      let pCount = 0, sCount = 0, mCount = 0, oCount = 0;

      schedCols.forEach(function(col) {
        let rawKode = String(empRow[col.colIdx] !== undefined && empRow[col.colIdx] !== null ? empRow[col.colIdx] : (empDispRow[col.colIdx] || '')).trim().toUpperCase();
        let kode = 'O';

        if (rawKode === 'P' || rawKode.indexOf('PAGI') >= 0 || rawKode === '1') {
          kode = 'P';
          pCount++;
        } else if (rawKode === 'S' || rawKode.indexOf('SORE') >= 0 || rawKode.indexOf('SIANG') >= 0 || rawKode === '2') {
          kode = 'S';
          sCount++;
        } else if (rawKode === 'M' || rawKode.indexOf('MALAM') >= 0 || rawKode === '3') {
          kode = 'M';
          mCount++;
        } else {
          kode = 'O';
          oCount++;
        }

        shifts[col.tanggal] = {
          kode: kode,
          colIdx: col.colIdx,
          hari: col.hari
        };
      });

      officers.push({
        username: secUser.username,
        namaPegawai: secUser.namaPegawai,
        rowIdx: rowIdx,
        shifts: shifts,
        summary: { P: pCount, S: sCount, M: mCount, O: oCount, totalKerja: pCount + sCount + mCount }
      });
    }

    const days = schedCols.map(c => ({ tanggal: c.tanggal, hari: c.hari, colIdx: c.colIdx }));

    return {
      success: true,
      data: {
        bulan: selectedMonth,
        tahun: selectedYear,
        sheetName: jadwalSheet.getName(),
        days: days,
        officers: officers
      }
    };
  } catch (err) {
    return { success: false, message: "Gagal memuat matriks jadwal security: " + err.message };
  }
}

/**
 * Update Shift Petugas Keamanan (Dengan Validasi Ketat P, S, M, O)
 */
function updateSecurityShift(token, targetUserOrName, tanggal, newShift, bulan, tahun) {
  try {
    const session = getSessionUser(token);
    if (!session) {
      return { success: false, message: "Sesi telah berakhir. Silakan login kembali." };
    }
    if (session.role !== 'SUPERVISOR' && session.role !== 'ADMIN') {
      return { success: false, message: "Hanya Supervisor dan Admin yang berwenang mengubah jadwal shift security." };
    }

    if (!targetUserOrName) {
      return { success: false, message: "Nama petugas satpam tidak boleh kosong." };
    }

    const dayNum = Number(tanggal);
    if (!dayNum || dayNum < 1 || dayNum > 31) {
      return { success: false, message: "Tanggal shift tidak valid (1 s/d 31)." };
    }

    // Validasi format shift ketat: P (Pagi), S (Siang), M (Malam), O (Off)
    const rawShift = String(newShift || '').trim().toUpperCase();
    let shiftCode = '';

    if (rawShift === 'P' || rawShift === 'PAGI' || rawShift === '1') shiftCode = 'P';
    else if (rawShift === 'S' || rawShift === 'SIANG' || rawShift === 'SORE' || rawShift === '2') shiftCode = 'S';
    else if (rawShift === 'M' || rawShift === 'MALAM' || rawShift === '3') shiftCode = 'M';
    else if (rawShift === 'O' || rawShift === 'OFF' || rawShift === 'LIBUR' || rawShift === '0' || rawShift === '-') shiftCode = 'O';

    if (!shiftCode) {
      return {
        success: false,
        message: "Format shift '" + rawShift + "' tidak valid! Kode shift yang diizinkan hanya P (Pagi), S (Siang), M (Malam), atau O (Off/Libur)."
      };
    }

    const ss = getDb();
    if (!ss) return { success: false, message: "Koneksi database spreadsheet gagal." };

    let jadwalSheet = findJadwalSheet(ss);
    if (!jadwalSheet) {
      return { success: false, message: "Sheet jadwal security (JadwalPiketSecurity) tidak ditemukan." };
    }

    const rawValues = jadwalSheet.getDataRange().getValues();
    const selBulan = bulan ? Number(bulan) : (new Date().getMonth() + 1);

    const gridResult = parseJadwalGrid(rawValues, selBulan);
    if (!gridResult || gridResult.error) {
      return { success: false, message: gridResult ? gridResult.error : "Format tabel jadwal tidak dapat dibaca." };
    }

    const schedCols = gridResult.schedCols || [];
    const targetColObj = schedCols.find(c => c.tanggal === dayNum);
    if (!targetColObj) {
      return { success: false, message: "Kolom tanggal " + dayNum + " pada bulan " + selBulan + " tidak ditemukan di sheet jadwal." };
    }

    let targetRowIdx = findEmployeeRowInJadwal(rawValues, { username: targetUserOrName, namaPegawai: targetUserOrName }, 0);
    if (targetRowIdx === -1) {
      const userSheet = findSheet(ss, "Users");
      if (userSheet) {
        const uVals = userSheet.getDataRange().getValues();
        for (let r = 1; r < uVals.length; r++) {
          const u = cleanStr(uVals[r][0]);
          const n = cleanStr(uVals[r][1]);
          if (u.toLowerCase() === targetUserOrName.toLowerCase() || n.toLowerCase() === targetUserOrName.toLowerCase()) {
            targetRowIdx = findEmployeeRowInJadwal(rawValues, { username: u, namaPegawai: n }, 0);
            if (targetRowIdx !== -1) break;
          }
        }
      }
    }

    if (targetRowIdx === -1) {
      return { success: false, message: "Baris petugas '" + targetUserOrName + "' tidak ditemukan pada sheet " + jadwalSheet.getName() + "." };
    }

    // Simpan perubahan ke cell spreadsheet
    const sheetCellRow = targetRowIdx + 1;
    const sheetCellCol = targetColObj.colIdx + 1;
    jadwalSheet.getRange(sheetCellRow, sheetCellCol).setValue(shiftCode);

    SpreadsheetApp.flush();

    // Hapus cache jadwal
    try {
      const cache = CacheService.getScriptCache();
      cache.remove("cache_jadwal_" + selBulan);
    } catch (ce) { /* ignore */ }

    const SHIFT_NAMES = { 'P': 'Pagi', 'S': 'Siang', 'M': 'Malam', 'O': 'Off (Libur)' };
    return {
      success: true,
      message: "Shift untuk " + targetUserOrName + " tanggal " + dayNum + " berhasil diubah menjadi: " + shiftCode + " (" + SHIFT_NAMES[shiftCode] + ")",
      data: {
        username: targetUserOrName,
        tanggal: dayNum,
        newShift: shiftCode,
        shiftName: SHIFT_NAMES[shiftCode]
      }
    };

  } catch (err) {
    return { success: false, message: "Gagal memperbarui shift: " + err.message };
  }
}

/**
 * Pertukaran Shift Antar-Petugas Keamanan (Atomic Shift Swap)
 */
function swapSecurityShift(token, user1, tanggal1, user2, tanggal2, bulan, tahun) {
  try {
    const session = getSessionUser(token);
    if (!session) {
      return { success: false, message: "Sesi telah berakhir. Silakan login kembali." };
    }
    if (session.role !== 'SUPERVISOR' && session.role !== 'ADMIN') {
      return { success: false, message: "Hanya Supervisor dan Admin yang berwenang melakukan pertukaran shift security." };
    }

    if (!user1 || !user2) {
      return { success: false, message: "Kedua petugas yang akan ditukar shiftnya wajib dipilih." };
    }

    const day1 = Number(tanggal1);
    const day2 = (tanggal2 !== undefined && tanggal2 !== null && String(tanggal2).trim() !== '') ? Number(tanggal2) : day1;

    if (!day1 || day1 < 1 || day1 > 31 || !day2 || day2 < 1 || day2 > 31) {
      return { success: false, message: "Tanggal shift tidak valid (1 s/d 31)." };
    }

    const ss = getDb();
    if (!ss) return { success: false, message: "Koneksi database spreadsheet gagal." };

    let jadwalSheet = findJadwalSheet(ss);
    if (!jadwalSheet) {
      return { success: false, message: "Sheet jadwal security (JadwalPiketSecurity) tidak ditemukan." };
    }

    const rawValues = jadwalSheet.getDataRange().getValues();
    const selBulan = bulan ? Number(bulan) : (new Date().getMonth() + 1);

    const gridResult = parseJadwalGrid(rawValues, selBulan);
    if (!gridResult || gridResult.error) {
      return { success: false, message: gridResult ? gridResult.error : "Format tabel jadwal tidak dapat dibaca." };
    }

    const schedCols = gridResult.schedCols || [];
    const col1Obj = schedCols.find(c => c.tanggal === day1);
    const col2Obj = schedCols.find(c => c.tanggal === day2);

    if (!col1Obj) {
      return { success: false, message: "Kolom tanggal " + day1 + " tidak ditemukan pada sheet jadwal." };
    }
    if (!col2Obj) {
      return { success: false, message: "Kolom tanggal " + day2 + " tidak ditemukan pada sheet jadwal." };
    }

    let row1Idx = findEmployeeRowInJadwal(rawValues, { username: user1, namaPegawai: user1 }, 0);
    let row2Idx = findEmployeeRowInJadwal(rawValues, { username: user2, namaPegawai: user2 }, 0);

    if (row1Idx === -1) {
      return { success: false, message: "Petugas 1 ('" + user1 + "') tidak ditemukan pada sheet jadwal." };
    }
    if (row2Idx === -1) {
      return { success: false, message: "Petugas 2 ('" + user2 + "') tidak ditemukan pada sheet jadwal." };
    }

    const cellRow1 = row1Idx + 1;
    const cellCol1 = col1Obj.colIdx + 1;
    const cellRow2 = row2Idx + 1;
    const cellCol2 = col2Obj.colIdx + 1;

    // Ambil shift saat ini
    const shift1Raw = String(rawValues[row1Idx][col1Obj.colIdx] || 'O').trim().toUpperCase();
    const shift2Raw = String(rawValues[row2Idx][col2Obj.colIdx] || 'O').trim().toUpperCase();

    const normShift = s => {
      if (s === 'P' || s === '1' || s.includes('PAGI')) return 'P';
      if (s === 'S' || s === '2' || s.includes('SIANG') || s.includes('SORE')) return 'S';
      if (s === 'M' || s === '3' || s.includes('MALAM')) return 'M';
      return 'O';
    };

    const s1 = normShift(shift1Raw);
    const s2 = normShift(shift2Raw);

    // Swap values di cell spreadsheet (Petugas 1 dapat shift 2, Petugas 2 dapat shift 1)
    jadwalSheet.getRange(cellRow1, cellCol1).setValue(s2);
    jadwalSheet.getRange(cellRow2, cellCol2).setValue(s1);

    SpreadsheetApp.flush();

    // Hapus cache jadwal
    try {
      const cache = CacheService.getScriptCache();
      cache.remove("cache_jadwal_" + selBulan);
    } catch (ce) { /* ignore */ }

    const SHIFT_NAMES = { 'P': 'Pagi', 'S': 'Siang', 'M': 'Malam', 'O': 'Off (Libur)' };

    return {
      success: true,
      message: "Pertukaran shift berhasil! " + user1 + " (Tgl " + day1 + ": " + s1 + " → " + s2 + ") bertukar dengan " + user2 + " (Tgl " + day2 + ": " + s2 + " → " + s1 + ").",
      data: {
        user1: { username: user1, tanggal: day1, oldShift: s1, newShift: s2, shiftName: SHIFT_NAMES[s2] },
        user2: { username: user2, tanggal: day2, oldShift: s2, newShift: s1, shiftName: SHIFT_NAMES[s1] }
      }
    };

  } catch (err) {
    return { success: false, message: "Gagal melakukan pertukaran shift: " + err.message };
  }
}

/**
 * Approval & Verifikasi Laporan Bulanan Oleh Kasubbag Umum / PPK
 */
function approveMonthlyReport(token, approvalData) {
  try {
    const session = getSessionUser(token);
    if (!session) {
      return { success: false, message: "Sesi telah berakhir. Silakan login kembali." };
    }
    if (session.role !== 'SUPERVISOR' && session.role !== 'ADMIN') {
      return { success: false, message: "Hanya Kasubbag Umum / PPK / Supervisor yang berwenang memberikan approval laporan bulanan." };
    }

    const ss = getDb();
    if (!ss) return { success: false, message: "Koneksi database spreadsheet gagal." };

    let sheet = findSheet(ss, "Monthly_Approvals");
    if (!sheet) {
      sheet = setupMonthlyApprovalsSheet(ss);
    }

    const now = new Date();
    const nowTimestamp = Utilities.formatDate(now, "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss");
    const dateStr = Utilities.formatDate(now, "Asia/Jakarta", "yyyy-MM-dd");

    const bulan = Number(approvalData.bulan) || (now.getMonth() + 1);
    const tahun = Number(approvalData.tahun) || now.getFullYear();
    const unitKerja = cleanStr(approvalData.unitKerja || 'ALL').toUpperCase();
    const status = cleanStr(approvalData.status || 'DISETUJUI').toUpperCase();
    const verifikator = cleanStr(approvalData.verifikator || session.namaPegawai);
    const catatan = cleanStr(approvalData.catatan || approvalData.catatanApproval || 'Laporan bulanan telah diverifikasi dan disetujui.');
    const approvalId = "APP-" + tahun + String(bulan).padStart(2, '0') + "-" + unitKerja;

    const rawValues = sheet.getDataRange().getValues();
    let existingRowIdx = -1;

    for (let r = 1; r < rawValues.length; r++) {
      const rowBulan = Number(rawValues[r][1]);
      const rowTahun = Number(rawValues[r][2]);
      const rowUnit = cleanStr(rawValues[r][3]).toUpperCase();

      if (rowBulan === bulan && rowTahun === tahun && (rowUnit === unitKerja || unitKerja === 'ALL')) {
        existingRowIdx = r + 1;
        break;
      }
    }

    if (existingRowIdx !== -1) {
      sheet.getRange(existingRowIdx, 1, 1, 9).setValues([[
        approvalId,
        bulan,
        tahun,
        unitKerja,
        status,
        verifikator,
        catatan,
        dateStr,
        nowTimestamp
      ]]);
    } else {
      sheet.appendRow([
        approvalId,
        bulan,
        tahun,
        unitKerja,
        status,
        verifikator,
        catatan,
        dateStr,
        nowTimestamp
      ]);
    }

    SpreadsheetApp.flush();

    return {
      success: true,
      message: "Laporan bulanan unit " + unitKerja + " berhasil diverifikasi & disetujui secara resmi oleh " + verifikator + "!",
      approvalId: approvalId
    };
  } catch (err) {
    return { success: false, message: "Gagal melakukan approval: " + err.message };
  }
}

/**
 * Mengambil Data Approval Bulanan untuk Unit Kerja
 */
function getMonthlyApprovals(token, bulan, tahun) {
  try {
    const session = getSessionUser(token);
    if (!session) {
      return { success: false, message: "Sesi tidak valid." };
    }

    const ss = getDb();
    if (!ss) return { success: false, message: "Koneksi database spreadsheet gagal." };

    const sheet = findSheet(ss, "Monthly_Approvals");
    if (!sheet) {
      return {
        success: true,
        data: {
          CS: { status: 'BELUM_DIVERIFIKASI', verifikator: '', tanggal: '', catatan: '', approvalId: '' },
          PELAYANAN: { status: 'BELUM_DIVERIFIKASI', verifikator: '', tanggal: '', catatan: '', approvalId: '' },
          SECURITY: { status: 'BELUM_DIVERIFIKASI', verifikator: '', tanggal: '', catatan: '', approvalId: '' },
          ALL: { status: 'BELUM_DIVERIFIKASI', verifikator: '', tanggal: '', catatan: '', approvalId: '' }
        }
      };
    }

    const rawValues = sheet.getDataRange().getValues();
    const selBulan = bulan ? Number(bulan) : (new Date().getMonth() + 1);
    const selTahun = tahun ? Number(tahun) : new Date().getFullYear();

    const approvals = {
      CS: { status: 'BELUM_DIVERIFIKASI', verifikator: '', tanggal: '', catatan: '', approvalId: '' },
      PELAYANAN: { status: 'BELUM_DIVERIFIKASI', verifikator: '', tanggal: '', catatan: '', approvalId: '' },
      SECURITY: { status: 'BELUM_DIVERIFIKASI', verifikator: '', tanggal: '', catatan: '', approvalId: '' },
      ALL: { status: 'BELUM_DIVERIFIKASI', verifikator: '', tanggal: '', catatan: '', approvalId: '' }
    };

    for (let r = 1; r < rawValues.length; r++) {
      const row = rawValues[r];
      if (!row || !row[0]) continue;

      const rowBulan = Number(row[1]);
      const rowTahun = Number(row[2]);
      const rowUnit = cleanStr(row[3]).toUpperCase();

      if (rowBulan === selBulan && rowTahun === selTahun) {
        const item = {
          approvalId: cleanStr(row[0]),
          status: cleanStr(row[4]) || 'DISETUJUI',
          verifikator: cleanStr(row[5]),
          catatan: cleanStr(row[6]),
          tanggal: cleanStr(row[7])
        };

        if (rowUnit === 'CS' || rowUnit === 'KEBERSIHAN') approvals.CS = item;
        else if (rowUnit === 'PELAYANAN' || rowUnit === 'PST' || rowUnit === 'RESEPSIONIS') approvals.PELAYANAN = item;
        else if (rowUnit === 'SECURITY' || rowUnit === 'KEAMANAN' || rowUnit === 'SATPAM') approvals.SECURITY = item;
        else approvals[rowUnit] = item;
      }
    }

    return {
      success: true,
      data: approvals
    };
  } catch (err) {
    return { success: false, message: "Gagal memuat status approval: " + err.message };
  }
}

/**
 * FUNGSI SETUP DATABASE USERS DENGAN SKEMA MULTI-ROLE & TABEL MUTU
 */
function setupAllUsers() {
  const ss = getDb();
  if (!ss) return "Koneksi database gagal.";

  let userSheet = ss.getSheetByName("Users");
  if (!userSheet) {
    userSheet = ss.insertSheet("Users");
  } else {
    userSheet.clear();
  }

  userSheet.getRange(1, 1, 1, 6).setValues([["Username", "Nama Pegawai", "Nama Sheet", "Password", "Role", "Terakhir Ganti Kredensial"]]);
  userSheet.getRange(1, 1, 1, 6)
    .setBackground("#1e40af")
    .setFontColor("#ffffff")
    .setFontWeight("bold");

  const allUsers = [
    ["supervisor",     "Kasubbag Umum / PPK",             "Supervisor",        "super123",  "SUPERVISOR", ""],
    ["admin",          "Admin TI",                        "Admin",             "admin123",  "ADMIN",      ""],
    ["dede",           "Nurramadhanial",                  "Nurramadhanial",    "dede123",   "CS",         ""],
    ["slamet",         "Slamet Riyadi",                   "SlametRiyadi",      "slamet123", "CS",         ""],
    ["syukri",         "Muhammad Syukri",                 "MSyukri",           "syukri123", "CS",         ""],
    ["ramadhan",       "Ramadhan",                        "Ramadhan",          "rama123",   "CS",         ""],
    ["mawardi",        "Mawardi",                         "Mawardi",           "mawardi123","PELAYANAN",  ""],
    ["yuni",           "Yuni Juniarti",                   "YuniJuniarti",      "yuni123",   "CS",         ""],
    ["rania",          "Rania Naila Husna",               "RaniaNailaHusna",   "rania123",  "PELAYANAN",  ""],
    ["alfiana",        "Alfiana Ayuni",                   "AlfianaAyuni",      "alfiana123","PELAYANAN",  ""],
    ["eddy",           "Eddy Suryadi",                    "EddySuryadi",       "eddy123",   "SECURITY",   ""],
    ["reza",           "Syarif Reza Nopriadrian Al Kadri","SyReza",            "reza123",   "SECURITY",   ""],
    ["feri",           "Feri Yustami",                    "FeriYustami",       "feri123",   "SECURITY",   ""],
    ["eko",            "Eko Prasetyo",                    "EkoPrasetyo",       "eko123",   "SECURITY",   ""],
    ["agus",           "Agus Tetriansyah",                "AgusTetriansyah",   "agus123",   "SECURITY",   ""],
    ["rizki",          "Rizki Fadil",                     "RizkiFadil",        "rizki123",  "SECURITY",   ""]
  ];

  userSheet.getRange(2, 1, allUsers.length, 6).setValues(allUsers);
  userSheet.autoResizeColumns(1, 6);

  setupQualityAuditsSheet(ss);
  setupMonthlyApprovalsSheet(ss);

  SpreadsheetApp.flush();

  return "Setup Database Tahap 3 Berhasil! " + allUsers.length + " pengguna, tabel Quality_Audits, dan Monthly_Approvals telah siap.";
}

function setupSampleDatabase() {
  return setupAllUsers();
}