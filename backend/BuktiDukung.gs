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

    // Fallback key: tanggal_namaPegawaiAlpha_ruanganAlpha_tugasAlpha
    if (record.namaPegawai) {
      var fKey1 = [rDay, getAlphaOnly(record.namaPegawai), getAlphaOnly(record.ruangan), getAlphaOnly(record.namaTugas)].join('_');
      fallbackMap[fKey1] = record;
    }
    if (record.username) {
      var fKey2 = [rDay, getAlphaOnly(record.username), getAlphaOnly(record.ruangan), getAlphaOnly(record.namaTugas)].join('_');
      fallbackMap[fKey2] = record;
    }
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
    if (existingRowIdx === -1 && (empName || username) && namaTugas) {
      var targetUserAlpha = getAlphaOnly(username);
      var targetNamaAlpha = getAlphaOnly(empName);
      var targetTugasAlpha = getAlphaOnly(namaTugas);

      for (var r = 1; r < values.length; r++) {
        var row = values[r];
        var rYear = Number(row[2] || 0);
        var rMonth = Number(row[3] || 0);
        var rDay = Number(row[5] || 0);
        var rUserVal = String(row[9] || '').trim();
        var rNamaVal = String(row[8] || '').trim();
        var rUserAlpha = getAlphaOnly(rUserVal);
        var rNamaAlpha = getAlphaOnly(rNamaVal);
        var rTugas = getAlphaOnly(String(row[11] || ''));

        var isUserMatch = (
          (targetUserAlpha && (rUserAlpha === targetUserAlpha || rNamaAlpha === targetUserAlpha || isUserAliasMatch(rUserAlpha, targetUserAlpha))) ||
          (targetNamaAlpha && (rUserAlpha === targetNamaAlpha || rNamaAlpha === targetNamaAlpha || isUserAliasMatch(rNamaAlpha, targetNamaAlpha)))
        );

        if (rDay === targetTanggal && (!rMonth || rMonth === targetBulan) && (!rYear || rYear === targetTahun) && isUserMatch && rTugas === targetTugasAlpha) {
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

/**
 * ========================================================================
 * FITUR GENERATE REKAPITULASI LAPORAN PER KEGIATAN, GOOGLE DOCS & KIPAPP
 * ========================================================================
 */

/**
 * Mengubah kata kerja awalan menjadi kata benda untuk narasi Rincian Kegiatan
 */
function convertVerbsToNouns(text) {
  if (!text) return '';
  var s = String(text).trim();

  var replacements = [
    { from: /^mengatur dan mengarahkan/i, to: 'pengaturan dan pengarahan' },
    { from: /^menyapu dan mengepel/i, to: 'penyapuan dan pengepelan' },
    { from: /^mengecek dan memastikan/i, to: 'pengecekan dan pemastian' },
    { from: /^membuka dan menutup/i, to: 'pembukaan dan penutupan' },
    { from: /^membersihkan/i, to: 'pembersihan' },
    { from: /^mengatur/i, to: 'pengaturan' },
    { from: /^mengarahkan/i, to: 'pengarahan' },
    { from: /^menyapu/i, to: 'penyapuan' },
    { from: /^mengepel/i, to: 'pengepelan' },
    { from: /^melayani/i, to: 'pelayanan' },
    { from: /^mengecek/i, to: 'pengecekan' },
    { from: /^memeriksa/i, to: 'pemeriksaan' },
    { from: /^menjaga/i, to: 'penjagaan' },
    { from: /^mencatat/i, to: 'pencatatan' },
    { from: /^menyiram/i, to: 'penyiraman' },
    { from: /^merapikan/i, to: 'perapian' },
    { from: /^membuka/i, to: 'pembukaan' },
    { from: /^menutup/i, to: 'penutupan' },
    { from: /^mengawasi/i, to: 'pengawasan' },
    { from: /^memantau/i, to: 'pemantauan' },
    { from: /^mengontrol/i, to: 'pengontrolan' },
    { from: /^memastikan/i, to: 'pemastian' },
    { from: /^membuang/i, to: 'pembuangan' },
    { from: /^menguras/i, to: 'pengurasan' },
    { from: /^mengisi/i, to: 'pengisian' },
    { from: /^mengganti/i, to: 'penggantian' },
    { from: /^memperbaiki/i, to: 'perbaikan' },
    { from: /^menyiapkan/i, to: 'penyiapan' },
    { from: /^mengoperasikan/i, to: 'pengoperasian' },
    { from: /^mengunci/i, to: 'penguncian' },
    { from: /^mengamankan/i, to: 'pengamanan' },
    { from: /^menerima/i, to: 'penerimaan' },
    { from: /^mengantar/i, to: 'pengantaran' },
    { from: /^membantu/i, to: 'bantuan' },
    { from: /^mengikuti/i, to: 'keikutsertaan' }
  ];

  for (var i = 0; i < replacements.length; i++) {
    if (replacements[i].from.test(s)) {
      return s.replace(replacements[i].from, replacements[i].to);
    }
  }

  return s.charAt(0).toLowerCase() + s.slice(1);
}

/**
 * Format narasi rincian kegiatan sesuai spesifikasi:
 * Contoh: "Terlaksananya pengaturan dan pengarahan parkiran kendaraan roda-2 dan roda-4 sebanyak 25 kali selama periode 1–31 Oktober 2026."
 */
function formatRincianKegiatanNarrative(namaTugas, jumlah, periodeStr) {
  var cleanTugas = String(namaTugas || '').trim();
  var converted = convertVerbsToNouns(cleanTugas);
  var countStr = String(jumlah !== undefined && jumlah !== null ? jumlah : 0);
  return "Terlaksananya " + converted + " sebanyak " + countStr + " kali selama periode " + periodeStr + ".";
}

/**
 * Sanitasi nama berkas agar aman dari karakter terlarang Google Drive / OS
 */
function sanitizeFileName(str) {
  if (!str) return 'Dokumen';
  return String(str)
    .replace(/[\\\/\:\*\?\"\<\>\|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Mencocokkan foto bukti dukung dengan suatu kegiatan / tugas
 * Mendukung filter spesifik ruangan (jika tersedia) dan anti-duplikasi per tanggal pelaksanaan.
 */
function findPhotosForTask(allPhotos, taskKegiatan, ruangan) {
  if (!allPhotos || !Array.isArray(allPhotos) || allPhotos.length === 0) return [];
  var taskAlpha = getAlphaOnly(taskKegiatan || '');
  if (!taskAlpha) return [];

  // 1. Filter seluruh foto yang sesuai dengan uraian kegiatan / tugas
  var matched = allPhotos.filter(function(p) {
    if (!p || !p.fileId) return false;
    var pAlpha = getAlphaOnly(p.namaTugas || '');
    if (!pAlpha) return false;

    // a. Cocok persis alpha
    if (pAlpha === taskAlpha) return true;

    // b. Substring jika panjang karakter min 6 char
    if (taskAlpha.length >= 6 && pAlpha.length >= 6) {
      if (taskAlpha.indexOf(pAlpha) !== -1 || pAlpha.indexOf(taskAlpha) !== -1) return true;
    }

    // c. Kata kunci signifikan (> 4 char) cocok min 2 kata
    var taskWords = (taskKegiatan || '').toLowerCase().split(/[\s\-_,\.\/]+/).filter(function(w) { return w.length > 4; });
    var pWords = (p.namaTugas || '').toLowerCase().split(/[\s\-_,\.\/]+/).filter(function(w) { return w.length > 4; });
    var matches = 0;
    for (var i = 0; i < taskWords.length; i++) {
      var tw = taskWords[i];
      for (var j = 0; j < pWords.length; j++) {
        var pw = pWords[j];
        if (tw === pw || tw.indexOf(pw) !== -1 || pw.indexOf(tw) !== -1) {
          matches++;
          break;
        }
      }
    }
    return (matches >= 2);
  });

  if (matched.length === 0) return [];

  // 1.b Filter per ruangan jika spesifik ruangan diberikan
  var hasRuang = Boolean(ruangan && String(ruangan).trim() && String(ruangan).trim() !== '-' && String(ruangan).trim() !== 'Area Umum' && String(ruangan).trim() !== 'Umum');
  if (hasRuang) {
    var targetRuangAlpha = getAlphaOnly(ruangan);
    var roomMatched = matched.filter(function(p) {
      var pRuangAlpha = getAlphaOnly(p.ruangan || '');
      if (!pRuangAlpha) return false;
      if (pRuangAlpha === targetRuangAlpha) return true;
      if (targetRuangAlpha.length >= 4 && pRuangAlpha.length >= 4) {
        if (targetRuangAlpha.indexOf(pRuangAlpha) !== -1 || pRuangAlpha.indexOf(targetRuangAlpha) !== -1) return true;
      }
      return false;
    });
    // Jika ada foto yang cocok spesifik dengan ruangan ini, gunakan foto tersebut
    if (roomMatched.length > 0) {
      matched = roomMatched;
    }
    // Jika tidak ada foto spesifik ruangan (misal foto umum), tetap gunakan matched agar dokumentasi tidak hilang
  }

  // 2. Pemeriksaan Duplikasi: Pastikan setiap tanggal pelaksanaan hanya memiliki SATU foto dokumentasi
  var photosByDate = {};
  var seenFileIds = {};

  for (var i = 0; i < matched.length; i++) {
    var p = matched[i];
    if (seenFileIds[p.fileId]) continue; // Cegah duplikasi fileId yang sama persis
    seenFileIds[p.fileId] = true;

    var tglKey = Number(p.tanggal) || 0;
    var groupKey = (tglKey > 0) ? String(tglKey) : ('file_' + p.fileId);

    if (!photosByDate[groupKey]) {
      photosByDate[groupKey] = p;
    } else {
      // Jika terdapat beberapa foto pada tanggal yang sama, pilih satu foto yang sesuai sebagai dokumentasi utama:
      // Prioritas 1: Foto yang telah divalidasi pengawas (statusPengawas === true)
      // Prioritas 2: Foto unggahan terbaru (berdasarkan timestamp / waktu)
      var currentBest = photosByDate[groupKey];
      var isCurrentValidated = !!currentBest.statusPengawas;
      var isNewValidated = !!p.statusPengawas;

      if (!isCurrentValidated && isNewValidated) {
        photosByDate[groupKey] = p;
      } else if (isCurrentValidated === isNewValidated) {
        var curWaktu = String(currentBest.waktu || '');
        var newWaktu = String(p.waktu || '');
        if (newWaktu && newWaktu > curWaktu) {
          photosByDate[groupKey] = p;
        } else if (!curWaktu && newWaktu) {
          photosByDate[groupKey] = p;
        }
      }
    }
  }

  // 3. Konversi ke array dan urutkan secara kronologis berdasarkan tanggal pelaksanaan
  var result = [];
  for (var k in photosByDate) {
    result.push(photosByDate[k]);
  }

  result.sort(function(a, b) {
    var tA = Number(a.tanggal) || 0;
    var tB = Number(b.tanggal) || 0;
    if (tA !== tB) return tA - tB;
    return String(a.waktu || '').localeCompare(String(b.waktu || ''));
  });

  return result;
}

/**
 * Mengecek apakah suatu kegiatan adalah baris 'HITUNG SKOR' yang harus dikecualikan
 */
function isHitungSkorTask(taskName) {
  if (!taskName) return false;
  var s = String(taskName).trim().toUpperCase();
  var sAlpha = (typeof getAlphaOnly === 'function') ? getAlphaOnly(s) : s.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  return (
    s.indexOf('HITUNG SKOR') !== -1 ||
    s.indexOf('HITUNG_SKOR') !== -1 ||
    sAlpha.indexOf('hitungskor') !== -1 ||
    s.indexOf('TOTAL SKOR') !== -1
  );
}

/**
 * Memfilter daftar kegiatan agar hanya memproses kegiatan yang:
 * 1. Bukan kegiatan 'HITUNG SKOR'
 * 2. Memiliki dokumentasi / foto bukti dukung yang valid
 */
function filterEligibleBuktiDukungTasks(items, allPhotos) {
  if (!items || !Array.isArray(items)) return [];
  return items.filter(function(item) {
    var namaTugas = (item && item.kegiatan) ? String(item.kegiatan).trim() : '';
    if (!namaTugas) return false;

    // 1. Pengecualian Dokumen HITUNG SKOR
    if (isHitungSkorTask(namaTugas)) return false;

    // 2. Ketersediaan Dokumentasi / Foto Bukti Dukung
    var photos = findPhotosForTask(allPhotos, namaTugas, item.ruangan);
    if (!photos || !Array.isArray(photos) || photos.length === 0) {
      return false; // Lewati kegiatan yang belum memiliki dokumentasi foto
    }

    return true;
  });
}

/**
 * Format string tanggal pelaksanaan foto dokumentasi.
 * Menghasilkan format tunggal dan konsisten: "Hari, DD Bulan YYYY - HH:mm:ss WIB"
 * Mencegah pengulangan tanggal seperti "4 November 2026 (Rabu, 4 November 2026 - 07:44:59 WIB)".
 */
function formatPhotoDateStr(photo, periodeStr) {
  if (!photo) return '';
  var w = photo.waktu ? String(photo.waktu).trim() : '';

  // 1. Jika w sudah lengkap memuat nama hari dan tanggal (misal: "Rabu, 4 November 2026 - 07:44:59 WIB")
  if (w && /^(senin|selasa|rabu|kamis|jumat|sabtu|minggu)/i.test(w)) {
    return w.replace(/\s*WIB\s*WIB/gi, ' WIB');
  }

  // 2. Jika w sudah memuat tanggal lengkap "DD Bulan YYYY - HH:mm:ss WIB"
  if (w && /^\d{1,2}\s+[a-zA-Z]+\s+\d{4}/.test(w)) {
    var matchDate = w.match(/^(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})/);
    if (matchDate) {
      var dDay = parseInt(matchDate[1], 10);
      var dMonStr = matchDate[2].toLowerCase();
      var dYear = parseInt(matchDate[3], 10);
      var monthsID = ['januari', 'februari', 'maret', 'april', 'mei', 'juni', 'juli', 'agustus', 'september', 'oktober', 'november', 'desember'];
      var dMonIdx = monthsID.indexOf(dMonStr);
      if (dMonIdx !== -1) {
        var dObj = new Date(dYear, dMonIdx, dDay);
        var daysID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        var dayName = daysID[dObj.getDay()];
        return (dayName + ", " + w).replace(/\s*WIB\s*WIB/gi, ' WIB');
      }
    }
    return w.replace(/\s*WIB\s*WIB/gi, ' WIB');
  }

  // 3. Ekstraksi tanggal, bulan, tahun untuk menyusun format standar
  var tgl = photo.tanggal ? parseInt(photo.tanggal, 10) : null;
  var thn = photo.tahun ? parseInt(photo.tahun, 10) : null;
  var bln = photo.bulan ? parseInt(photo.bulan, 10) : null;
  var blnNama = photo.bulanNama ? String(photo.bulanNama).trim() : '';

  var monthsList = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  if (periodeStr && (!thn || !bln || !blnNama)) {
    for (var m = 0; m < monthsList.length; m++) {
      if (new RegExp(monthsList[m], 'i').test(periodeStr)) {
        if (!bln) bln = m + 1;
        if (!blnNama) blnNama = monthsList[m];
        break;
      }
    }
    var yrMatch = String(periodeStr).match(/\b(20\d{2})\b/);
    if (yrMatch && !thn) {
      thn = parseInt(yrMatch[1], 10);
    }
  }

  var hariStr = '';
  if (tgl && bln && thn) {
    try {
      var dateObj = new Date(thn, bln - 1, tgl);
      var daysArr = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      hariStr = daysArr[dateObj.getDay()];
    } catch (eDate) {}
  }

  var datePart = '';
  if (hariStr && tgl && blnNama && thn) {
    datePart = hariStr + ", " + tgl + " " + blnNama + " " + thn;
  } else if (tgl && blnNama && thn) {
    datePart = tgl + " " + blnNama + " " + thn;
  } else if (tgl) {
    var blnThn = '';
    if (periodeStr) {
      var parts = String(periodeStr).trim().split(/\s+/);
      blnThn = parts.length >= 3 ? parts.slice(1).join(' ') : periodeStr;
    }
    datePart = tgl + " " + blnThn;
  } else {
    datePart = periodeStr || '';
  }

  if (w) {
    var cleanTime = w.replace(/\s*WIB\s*WIB/gi, ' WIB');
    if (!/WIB$/i.test(cleanTime) && /^\d{1,2}:\d{2}/.test(cleanTime)) {
      cleanTime += " WIB";
    }
    return datePart ? (datePart + " - " + cleanTime).trim() : cleanTime.trim();
  }

  return datePart.trim();
}

/**
 * Membaca seluruh file Google Docs di folder Bukti Dukung sekaligus ke dalam memori
 * untuk mempercepat proses pencarian (mengeliminasi ratusan roundtrip Drive API).
 */
function getFolderDocCache(folder) {
  var cache = { byExactName: {}, list: [] };
  if (!folder) return cache;
  try {
    var files = folder.getFiles();
    var docMime = (typeof MimeType !== 'undefined' && MimeType.GOOGLE_DOCS) ? MimeType.GOOGLE_DOCS : 'application/vnd.google-apps.document';
    while (files.hasNext()) {
      var f = files.next();
      var mime = f.getMimeType();
      if (mime !== docMime && mime !== 'application/vnd.google-apps.document') continue;
      var fName = f.getName();
      cache.byExactName[fName] = f;
      cache.list.push({
        file: f,
        name: fName,
        nameAlpha: getAlphaOnly(fName)
      });
    }
  } catch (err) {
    Logger.log("getFolderDocCache error: " + err.message);
  }
  return cache;
}

/**
 * Membaca seluruh file PDF di folder Bukti Dukung PDF sekaligus ke dalam memori
 */
function getFolderPdfCache(pdfFolder) {
  var cache = { byName: {}, list: [] };
  if (!pdfFolder) return cache;
  try {
    var files = pdfFolder.getFiles();
    while (files.hasNext()) {
      var f = files.next();
      var fName = f.getName();
      cache.byName[fName] = f;
      cache.list.push(f);
    }
  } catch (err) {
    Logger.log("getFolderPdfCache error: " + err.message);
  }
  return cache;
}

/**
 * Mencari Google Docs yang sudah ada di folder Bukti Dukung (mencegah duplikasi file)
 * Mendukung pemisahan dokumen per ruangan dan pencarian instan via folderDocCache jika tersedia.
 */
function findExistingDocFile(folder, taskKegiatan, empName, bulanNama, tahun, folderCache, ruangan) {
  if (isHitungSkorTask(taskKegiatan)) return null;
  try {
    var hasRuang = Boolean(ruangan && String(ruangan).trim() && String(ruangan).trim() !== '-' && String(ruangan).trim() !== 'Area Umum' && String(ruangan).trim() !== 'Umum');
    var ruangClean = hasRuang ? String(ruangan).trim() : '';
    var docTitlePrefix = hasRuang ? (sanitizeFileName(ruangClean) + " - ") : "";
    var expectedDocName = "Bukti Dukung - " + docTitlePrefix + sanitizeFileName(taskKegiatan) + " - " + cleanStr(empName) + " - " + bulanNama + " " + tahun;

    if (folderCache) {
      if (folderCache.byExactName && folderCache.byExactName[expectedDocName]) {
        return folderCache.byExactName[expectedDocName];
      }
      var taskAlpha = getAlphaOnly(taskKegiatan || '');
      var empAlpha = getAlphaOnly(empName || '');
      var ruangAlpha = hasRuang ? getAlphaOnly(ruangClean) : '';
      var subAlpha = taskAlpha.substring(0, Math.min(20, taskAlpha.length));
      var empSub = empAlpha.substring(0, Math.min(8, empAlpha.length));
      var blnLower = String(bulanNama || '').toLowerCase();

      for (var k = 0; k < folderCache.list.length; k++) {
        var it = folderCache.list[k];
        if (subAlpha && it.nameAlpha.indexOf(subAlpha) !== -1) {
          if (hasRuang) {
            var ruangSub = ruangAlpha.substring(0, Math.min(10, ruangAlpha.length));
            if (ruangSub && it.nameAlpha.indexOf(ruangSub) === -1) {
              continue; // Ruangan berbeda, jangan anggap sebagai file yang sama!
            }
          }
          if (!empAlpha || it.nameAlpha.indexOf(empSub) !== -1 || it.name.toLowerCase().indexOf(blnLower) !== -1) {
            return it.file;
          }
        }
      }
      return null;
    }

    // Direct scan fallback jika folderCache tidak diberikan
    var files = folder.getFiles();
    var taskAlpha = getAlphaOnly(taskKegiatan || '');
    var empAlpha = getAlphaOnly(empName || '');
    var ruangAlpha = hasRuang ? getAlphaOnly(ruangClean) : '';
    var subAlpha = taskAlpha.substring(0, Math.min(20, taskAlpha.length));
    var docMime = (typeof MimeType !== 'undefined' && MimeType.GOOGLE_DOCS) ? MimeType.GOOGLE_DOCS : 'application/vnd.google-apps.document';

    while (files.hasNext()) {
      var f = files.next();
      var mime = f.getMimeType();
      if (mime !== docMime && mime !== 'application/vnd.google-apps.document') continue;

      var fName = f.getName();
      if (fName === expectedDocName) return f;

      var fAlpha = getAlphaOnly(fName);
      if (subAlpha && fAlpha.indexOf(subAlpha) !== -1) {
        if (hasRuang) {
          var ruangSub = ruangAlpha.substring(0, Math.min(10, ruangAlpha.length));
          if (ruangSub && fAlpha.indexOf(ruangSub) === -1) {
            continue;
          }
        }
        if (!empAlpha || fAlpha.indexOf(empAlpha.substring(0, Math.min(8, empAlpha.length))) !== -1 || fName.toLowerCase().indexOf(bulanNama.toLowerCase()) !== -1) {
          return f;
        }
      }
    }
  } catch (err) {
    Logger.log("Pencarian file doc gagal: " + err.message);
  }
  return null;
}

/**
 * Menyusun tata letak & isi Google Docs sesuai referensi gambar BUKTI DUKUNG DOKUMENTASI
 */
function buildGoogleDocContent(doc, task, empName, periodeStr, photos) {
  if (!photos || !Array.isArray(photos) || photos.length === 0) {
    throw new Error("Kegiatan '" + ((task && task.kegiatan) || '') + "' tidak memiliki dokumentasi atau bukti dukung foto.");
  }
  if (task && isHitungSkorTask(task.kegiatan)) {
    throw new Error("Kegiatan HITUNG SKOR dikecualikan dari pembuatan dokumen bukti dukung.");
  }

  var body = doc.getBody();
  body.clear();

  // Konfigurasi Margin Halaman A4
  body.setMarginTop(54);
  body.setMarginBottom(54);
  body.setMarginLeft(72);
  body.setMarginRight(72);

  // 1. JUDUL HALAMAN UTAMA: BUKTI DUKUNG DOKUMENTASI
  var titlePara = body.appendParagraph("BUKTI DUKUNG DOKUMENTASI");
  titlePara.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  titlePara.setFontFamily("Arial");
  titlePara.setFontSize(13);
  titlePara.setBold(true);
  titlePara.setSpacingBefore(10);
  titlePara.setSpacingAfter(26);

  // 2. IDENTITAS PEGAWAI (Tanpa NIP, Jabatan Staf Bagian Umum, Titik Dua Rapi)
  var idTable = body.appendTable([
    ["NAMA PEGAWAI", ": " + empName],
    ["JABATAN", ": Staf Bagian Umum"],
    ["TANGGAL PELAKSANAAN", ": " + periodeStr]
  ]);
  idTable.setBorderWidth(0);
  idTable.setColumnWidth(0, 160);
  idTable.setColumnWidth(1, 310);

  for (var r = 0; r < 3; r++) {
    var idRow = idTable.getRow(r);
    for (var c = 0; c < 2; c++) {
      var cell = idRow.getCell(c);
      cell.setFontFamily("Arial");
      cell.setFontSize(10.5);
      cell.setPaddingTop(3);
      cell.setPaddingBottom(3);
      cell.setPaddingLeft(0);
      cell.setPaddingRight(0);
      var pChild = cell.getChild(0);
      if (pChild && pChild.asParagraph) {
        pChild.asParagraph().setSpacingAfter(0);
        if (c === 0) pChild.asParagraph().setBold(true);
      }
    }
  }

  // Jeda ruang sebelum tabel penugasan
  var spacer1 = body.appendParagraph("");
  spacer1.setSpacingBefore(12);
  spacer1.setSpacingAfter(12);

  // 3. TABEL PENUGASAN (URAIAN KEGIATAN & RINCIAN KEGIATAN)
  var taskRuangan = (task && task.ruangan && task.ruangan !== '-' && task.ruangan !== 'Area Umum' && task.ruangan !== 'Umum') ? String(task.ruangan).trim() : '';
  var displayKegiatan = taskRuangan ? (taskRuangan + " - " + (task.kegiatan || '-')) : (task.kegiatan || '-');
  var narrativeText = taskRuangan
    ? ("Terlaksananya " + convertVerbsToNouns(task.kegiatan || '') + " pada " + taskRuangan + " sebanyak " + (task.selesai || 0) + " kali selama periode " + periodeStr + ".")
    : formatRincianKegiatanNarrative(task.kegiatan, task.selesai || 0, periodeStr);

  var taskTable = body.appendTable([
    ["URAIAN KEGIATAN", "RINCIAN KEGIATAN"],
    [displayKegiatan, narrativeText]
  ]);
  taskTable.setBorderWidth(1);
  taskTable.setBorderColor("#000000");
  taskTable.setColumnWidth(0, 205);
  taskTable.setColumnWidth(1, 265);

  // Baris Header Tabel
  var thRow = taskTable.getRow(0);
  for (var thC = 0; thC < 2; thC++) {
    var thCell = thRow.getCell(thC);
    thCell.setFontFamily("Arial");
    thCell.setFontSize(10.5);
    thCell.setPaddingTop(8);
    thCell.setPaddingBottom(8);
    thCell.setPaddingLeft(10);
    thCell.setPaddingRight(10);
    var thP = thCell.getChild(0);
    if (thP && thP.asParagraph) {
      thP.asParagraph().setAlignment(DocumentApp.HorizontalAlignment.CENTER);
      thP.asParagraph().setBold(true);
      thP.asParagraph().setSpacingAfter(0);
    }
  }

  // Baris Isi Data Tabel
  var tbRow = taskTable.getRow(1);
  for (var tbC = 0; tbC < 2; tbC++) {
    var tbCell = tbRow.getCell(tbC);
    tbCell.setFontFamily("Arial");
    tbCell.setFontSize(10);
    tbCell.setPaddingTop(8);
    tbCell.setPaddingBottom(8);
    tbCell.setPaddingLeft(10);
    tbCell.setPaddingRight(10);
    var tbP = tbCell.getChild(0);
    if (tbP && tbP.asParagraph) {
      tbP.asParagraph().setAlignment(DocumentApp.HorizontalAlignment.LEFT);
      tbP.asParagraph().setLineSpacing(1.15);
      tbP.asParagraph().setSpacingAfter(0);
    }
  }

  // 4. PEMISAH HALAMAN (Page Break) MENUJU LAMPIRAN DOKUMENTASI
  body.appendPageBreak();

  // 5. JUDUL LAMPIRAN DOKUMENTASI
  var lampiranTitle = body.appendParagraph("LAMPIRAN DOKUMENTASI");
  lampiranTitle.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  lampiranTitle.setFontFamily("Arial");
  lampiranTitle.setFontSize(13);
  lampiranTitle.setBold(true);
  lampiranTitle.setSpacingBefore(10);
  lampiranTitle.setSpacingAfter(24);

  // 6. PENYISIPAN FOTO BUKTI DUKUNG DENGAN CAPTION RAPI
  if (photos && photos.length > 0) {
    // Maksimal 10 foto yang disematkan langsung sebagai gambar ke dalam dokumen
    // Sisa foto dilampirkan secara rapi di bawahnya dalam bentuk tabel tautan berkas Google Drive beserta tanggal pelaksanaannya
    var maxPhotos = 10;
    var photosToInsert = photos.slice(0, maxPhotos);
    var remainingPhotos = (photos.length > maxPhotos) ? photos.slice(maxPhotos) : [];

    for (var i = 0; i < photosToInsert.length; i++) {
      var p = photosToInsert[i];
      try {
        var imgFile = DriveApp.getFileById(p.fileId);
        var imgBlob = imgFile.getBlob();

        var imgPara = body.appendParagraph("");
        imgPara.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
        imgPara.setSpacingBefore(6);
        imgPara.setSpacingAfter(6);

        var docImg = imgPara.appendInlineImage(imgBlob);

        var origW = docImg.getWidth();
        var origH = docImg.getHeight();
        var maxW = 460;
        var maxH = 340;
        var finalW = origW;
        var finalH = origH;

        if (finalW > maxW) {
          var ratio = maxW / finalW;
          finalW = maxW;
          finalH = Math.round(finalH * ratio);
        }
        if (finalH > maxH) {
          var ratioH = maxH / finalH;
          finalH = maxH;
          finalW = Math.round(finalW * ratioH);
        }
        docImg.setWidth(finalW);
        docImg.setHeight(finalH);

        var capPara = body.appendParagraph("Bukti Dokumentasi #" + (i + 1));
        capPara.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
        capPara.setFontFamily("Arial");
        capPara.setFontSize(10);
        capPara.setBold(true);
        capPara.setItalic(true);
        capPara.setSpacingBefore(4);
        capPara.setSpacingAfter(18);

        if (i < photosToInsert.length - 1) {
          var betweenSpacer = body.appendParagraph("");
          betweenSpacer.setSpacingBefore(0);
          betweenSpacer.setSpacingAfter(12);
        }
      } catch (eImg) {
        var errPara = body.appendParagraph("[Foto Bukti Dokumentasi #" + (i + 1) + " tidak dapat dimuat: " + eImg.message + "]");
        errPara.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
        errPara.setFontSize(9);
        errPara.setItalic(true);
        try { errPara.editAsText().setForegroundColor("#dc2626"); } catch (eColor) {}
        errPara.setSpacingAfter(12);
      }
    }

    // Jika ada sisa foto di atas 10, lampirkan di bawahnya dalam bentuk tabel tautan berkas foto secara rapi dengan tanggal pelaksanaan
    if (remainingPhotos.length > 0) {
      var notePara = body.appendParagraph("Daftar Tautan Bukti Foto Dokumentasi Tambahan:");
      notePara.setAlignment(DocumentApp.HorizontalAlignment.LEFT);
      notePara.setFontFamily("Arial");
      notePara.setFontSize(10.5);
      notePara.setBold(true);
      notePara.setSpacingBefore(20);
      notePara.setSpacingAfter(4);

      var subNote = body.appendParagraph("(Menampilkan 10 foto dokumentasi utama di atas. Foto ke-11 s.d. " + photos.length + " dapat diakses langsung melalui tautan berkas Google Drive berikut):");
      subNote.setAlignment(DocumentApp.HorizontalAlignment.LEFT);
      subNote.setFontFamily("Arial");
      subNote.setFontSize(9);
      subNote.setItalic(true);
      try { subNote.editAsText().setForegroundColor("#64748b"); } catch (eColor) {}
      subNote.setSpacingBefore(0);
      subNote.setSpacingAfter(8);

      var remTableData = [
        ["No", "Tanggal Pelaksanaan", "Tautan Berkas Foto (Google Drive)"]
      ];

      for (var r = 0; r < remainingPhotos.length; r++) {
        var remP = remainingPhotos[r];
        var remIdx = maxPhotos + r + 1;
        var remDateStr = formatPhotoDateStr(remP, periodeStr) || periodeStr;
        remTableData.push([String(remIdx), remDateStr, "Buka File Foto #" + remIdx]);
      }

      var remTable = body.appendTable(remTableData);
      remTable.setBorderWidth(1);
      remTable.setBorderColor("#cbd5e1");
      remTable.setColumnWidth(0, 35);
      remTable.setColumnWidth(1, 180);
      remTable.setColumnWidth(2, 255);

      // Format Header Tabel Tautan
      var rHeaderRow = remTable.getRow(0);
      for (var hc = 0; hc < 3; hc++) {
        var hCell = rHeaderRow.getCell(hc);
        hCell.setBackgroundColor("#f1f5f9");
        hCell.setPaddingTop(5);
        hCell.setPaddingBottom(5);
        hCell.setPaddingLeft(6);
        hCell.setPaddingRight(6);
        var hp = hCell.getChild(0);
        if (hp && hp.asParagraph) {
          hp.asParagraph().setFontFamily("Arial");
          hp.asParagraph().setFontSize(9.5);
          hp.asParagraph().setBold(true);
          hp.asParagraph().setAlignment(hc === 0 ? DocumentApp.HorizontalAlignment.CENTER : DocumentApp.HorizontalAlignment.LEFT);
        }
      }

      // Format Baris Data & Hyperlink Berkas Foto
      for (var r = 0; r < remainingPhotos.length; r++) {
        var remP = remainingPhotos[r];
        var remIdx = maxPhotos + r + 1;
        var remUrl = remP.fileUrl || (remP.fileId ? ("https://drive.google.com/file/d/" + remP.fileId + "/view") : '');
        var dataRow = remTable.getRow(r + 1);

        for (var c = 0; c < 3; c++) {
          var cell = dataRow.getCell(c);
          if (r % 2 === 1) cell.setBackgroundColor("#f8fafc");
          cell.setPaddingTop(4);
          cell.setPaddingBottom(4);
          cell.setPaddingLeft(6);
          cell.setPaddingRight(6);
          var cp = cell.getChild(0);
          if (cp && cp.asParagraph) {
            cp.asParagraph().setFontFamily("Arial");
            cp.asParagraph().setFontSize(9);
            if (c === 0) {
              cp.asParagraph().setAlignment(DocumentApp.HorizontalAlignment.CENTER);
              cp.asParagraph().setBold(true);
            } else if (c === 2 && remUrl) {
              cp.asParagraph().editAsText().setLinkUrl(remUrl);
              try { cp.asParagraph().editAsText().setForegroundColor("#2563eb"); } catch (eF) {}
              cp.asParagraph().editAsText().setUnderline(true);
            }
          }
        }
      }
    }
  } else {
    // Sesuai aturan: dokumen bukti dukung tidak dibuat jika tidak memiliki foto dokumentasi
    throw new Error("Kegiatan '" + ((task && task.kegiatan) || '') + "' tidak memiliki dokumentasi atau bukti dukung foto.");
  }
}

/**
 * ========================================================================
 * BACKEND ACTION: GENERATE REKAPITULASI DOKUMEN PER KEGIATAN (GOOGLE DOCS)
 * Mendukung batch chunking (startIndex & batchSize) untuk performa cepat dan bebas timeout
 * ========================================================================
 */
function generateDokumenPerKegiatan(token, targetUsername, bulan, tahun, startIndex, batchSize) {
  try {
    var session = getSessionUser(token);
    if (!session) {
      return { success: false, message: "Sesi telah berakhir atau tidak valid. Silakan login kembali." };
    }

    var ss = getDb();
    if (!ss) return { success: false, message: "Koneksi spreadsheet gagal." };

    var now = new Date();
    var selMonth = bulan ? Number(bulan) : (now.getMonth() + 1);
    var selYear = tahun ? Number(tahun) : now.getFullYear();

    var repData = getExportLaporanData(token, 'individu', selMonth, selYear, targetUsername);
    if (!repData || !repData.success || !repData.data) {
      return {
        success: false,
        message: (repData && repData.message) ? repData.message : "Gagal mengambil data checklist pegawai untuk periode yang dipilih."
      };
    }

    var report = repData.data;
    var empName = (report.pegawai && report.pegawai.namaPegawai) || session.namaPegawai || session.username;
    var unitKerja = (report.pegawai && report.pegawai.unit) || resolveUnitKerja(null, empName, targetUsername, session);
    var namaBulanStr = (report.periode && report.periode.namaBulan) || ('Bulan_' + selMonth);
    var daysInMonth = (report.periode && report.periode.daysInMonth) || new Date(selYear, selMonth, 0).getDate();
    var periodeStr = "1–" + daysInMonth + " " + namaBulanStr + " " + selYear;

    var rawItems = report.items || [];
    var allPhotos = report.buktiDukung || [];

    // Validasi & filter: lewati kegiatan HITUNG SKOR dan kegiatan yang tidak memiliki foto bukti dukung
    var items = filterEligibleBuktiDukungTasks(rawItems, allPhotos);
    if (items.length === 0) {
      return {
        success: false,
        message: "Tidak ditemukan kegiatan yang memiliki dokumentasi/bukti dukung foto untuk pegawai " + empName + " pada periode " + periodeStr + ". Dokumen bukti dukung hanya dibuat untuk kegiatan yang telah memiliki dokumentasi foto."
      };
    }

    // 1. Dapatkan Folder Induk Google Drive
    var rootInfo = resolveRootFolder(GOOGLE_DRIVE_ROOT_FOLDER_ID);
    var rootFolder = rootInfo.folder;

    // 2. Bangun Hierarki Folder: Induk -> [Tahun] -> [Unit] -> [Bulan] -> [Nama Pegawai]
    var yearFolder = getOrCreateChildFolder(rootFolder, String(selYear));
    var unitFolder = getOrCreateChildFolder(yearFolder, unitKerja);
    var monthFolder = getOrCreateChildFolder(unitFolder, namaBulanStr);
    var employeeFolder = getOrCreateChildFolder(monthFolder, empName);

    // 3. Buat / Dapatkan Folder 'Bukti Dukung' di Dalam Folder Pegawai
    var buktiDukungFolder = getOrCreateChildFolder(employeeFolder, "Bukti Dukung");
    try {
      buktiDukungFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (eShare) {}

    // Inisialisasi cache folder Google Docs sekali saja untuk efisiensi tinggi
    var folderDocCache = getFolderDocCache(buktiDukungFolder);

    // Bersihkan file sisa HITUNG SKOR jika ada di Google Drive dari proses sebelumnya
    if (folderDocCache && folderDocCache.list) {
      for (var f = 0; f < folderDocCache.list.length; f++) {
        var docItem = folderDocCache.list[f];
        if (docItem && docItem.name && isHitungSkorTask(docItem.name)) {
          try {
            docItem.file.setTrashed(true);
            delete folderDocCache.byExactName[docItem.name];
          } catch (eTr) {}
        }
      }
    }

    // 4. Pengelolaan Slice Batch untuk Mencegah Timeout (Chunking Support)
    var isBatchMode = (startIndex !== undefined && startIndex !== null);
    var sIdx = isBatchMode ? Math.max(0, Number(startIndex) || 0) : 0;
    var bSize = isBatchMode ? Math.max(1, Number(batchSize) || 4) : items.length;
    var eIdx = Math.min(items.length, sIdx + bSize);
    var itemsToProcess = isBatchMode ? items.slice(sIdx, eIdx) : items;

    var processedItems = [];
    var errors = [];

    for (var i = 0; i < itemsToProcess.length; i++) {
      var item = itemsToProcess[i];
      var globalIdx = sIdx + i;
      var namaTugas = item.kegiatan || 'Pelaksanaan Tugas';
      var itemRuangan = item.ruangan || '';

      // Pengecualian kegiatan HITUNG SKOR
      if (isHitungSkorTask(namaTugas)) continue;

      var matchingPhotos = findPhotosForTask(allPhotos, namaTugas, itemRuangan);
      // Validasi ketersediaan bukti dukung: lewati jika tidak ada dokumentasi foto
      if (!matchingPhotos || matchingPhotos.length === 0) continue;

      try {
        var existingDocFile = findExistingDocFile(buktiDukungFolder, namaTugas, empName, namaBulanStr, selYear, folderDocCache, itemRuangan);
        var docObj = null;
        var docFile = null;
        var actionStatus = 'updated';

        if (existingDocFile) {
          docObj = DocumentApp.openById(existingDocFile.getId());
          buildGoogleDocContent(docObj, item, empName, periodeStr, matchingPhotos);
          docObj.saveAndClose();
          docFile = existingDocFile;
          actionStatus = 'updated';
        } else {
          var hasRuang = Boolean(itemRuangan && String(itemRuangan).trim() && String(itemRuangan).trim() !== '-' && String(itemRuangan).trim() !== 'Area Umum' && String(itemRuangan).trim() !== 'Umum');
          var docTitlePrefix = hasRuang ? (sanitizeFileName(itemRuangan) + " - ") : "";
          var docName = "Bukti Dukung - " + docTitlePrefix + sanitizeFileName(namaTugas) + " - " + cleanStr(empName) + " - " + namaBulanStr + " " + selYear;
          docObj = DocumentApp.create(docName);
          buildGoogleDocContent(docObj, item, empName, periodeStr, matchingPhotos);
          docObj.saveAndClose();

          docFile = DriveApp.getFileById(docObj.getId());
          try {
            docFile.moveTo(buktiDukungFolder);
          } catch (eMove) {
            buktiDukungFolder.addFile(docFile);
            try { DriveApp.getRootFolder().removeFile(docFile); } catch (eRem) {}
          }
          try {
            docFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          } catch (eS) {}
          actionStatus = 'created';

          // Daftarkan ke folderDocCache
          folderDocCache.byExactName[docName] = docFile;
          folderDocCache.list.push({ file: docFile, name: docName, nameAlpha: getAlphaOnly(docName) });
        }

        var cleanDocUrl = String(docFile.getUrl() || '').replace(/\\/g, '').trim();
        processedItems.push({
          no: globalIdx + 1,
          ruangan: itemRuangan,
          kegiatan: namaTugas,
          kuantitas: item.selesai !== undefined ? item.selesai : (item.target || 0),
          target: item.target || 0,
          selesai: item.selesai || 0,
          docId: docFile.getId(),
          docUrl: cleanDocUrl,
          docName: docFile.getName(),
          action: actionStatus,
          totalFoto: matchingPhotos.length
        });

      } catch (eDoc) {
        errors.push("Gagal memproses kegiatan '" + namaTugas + "': " + eDoc.message);
      }
    }

    if (processedItems.length === 0 && itemsToProcess.length > 0) {
      return {
        success: false,
        message: "Gagal membuat dokumen kegiatan: " + (errors.join(' | ') || "Terjadi kesalahan internal.")
      };
    }

    var isComplete = (eIdx >= items.length);
    var cleanDocFolderUrl = String(buktiDukungFolder.getUrl() || '').replace(/\\/g, '').trim();
    var cleanEmpFolderUrl = String(employeeFolder.getUrl() || '').replace(/\\/g, '').trim();

    return {
      success: true,
      message: isBatchMode
        ? ("Berhasil memproses dokumen " + (sIdx + 1) + "–" + eIdx + " dari " + items.length + " kegiatan.")
        : ("Berhasil menghasilkan " + processedItems.length + " dokumen rekapitulasi Google Docs di folder Bukti Dukung!"),
      data: {
        namaPegawai: empName,
        username: (report.pegawai && report.pegawai.username) || targetUsername,
        unitKerja: unitKerja,
        periodeStr: periodeStr,
        bulan: selMonth,
        tahun: selYear,
        folderBuktiDukungId: buktiDukungFolder.getId(),
        folderBuktiDukungUrl: cleanDocFolderUrl,
        folderPegawaiUrl: cleanEmpFolderUrl,
        totalItems: items.length,
        startIndex: sIdx,
        processedCount: eIdx,
        isComplete: isComplete,
        nextIndex: isComplete ? null : eIdx,
        items: processedItems,
        errors: errors
      }
    };

  } catch (err) {
    return {
      success: false,
      message: "Terjadi kesalahan pada proses generate dokumen: " + err.message
    };
  }
}

/**
 * ========================================================================
 * BACKEND ACTION: BUAT KIPAPP (GOOGLE SHEETS) & EKSPOR PDF OTOMATIS
 * Mendukung batch chunking (startIndex & batchSize), smart PDF caching, dan bebas timeout
 * ========================================================================
 */
function generateKipappDanPdf(token, targetUsername, bulan, tahun, startIndex, batchSize) {
  try {
    var session = getSessionUser(token);
    if (!session) {
      return { success: false, message: "Sesi telah berakhir atau tidak valid. Silakan login kembali." };
    }

    var ss = getDb();
    if (!ss) return { success: false, message: "Koneksi spreadsheet gagal." };

    var now = new Date();
    var selMonth = bulan ? Number(bulan) : (now.getMonth() + 1);
    var selYear = tahun ? Number(tahun) : now.getFullYear();

    var repData = getExportLaporanData(token, 'individu', selMonth, selYear, targetUsername);
    if (!repData || !repData.success || !repData.data) {
      return {
        success: false,
        message: (repData && repData.message) ? repData.message : "Gagal mengambil data checklist pegawai untuk Kipapp."
      };
    }

    var report = repData.data;
    var empName = (report.pegawai && report.pegawai.namaPegawai) || session.namaPegawai || session.username;
    var unitKerja = (report.pegawai && report.pegawai.unit) || resolveUnitKerja(null, empName, targetUsername, session);
    var namaBulanStr = (report.periode && report.periode.namaBulan) || ('Bulan_' + selMonth);
    var daysInMonth = (report.periode && report.periode.daysInMonth) || new Date(selYear, selMonth, 0).getDate();
    var periodeStr = "1–" + daysInMonth + " " + namaBulanStr + " " + selYear;

    var rawItems = report.items || [];
    var allPhotos = report.buktiDukung || [];

    // Validasi & filter: lewati kegiatan HITUNG SKOR dan kegiatan yang tidak memiliki foto bukti dukung
    var items = filterEligibleBuktiDukungTasks(rawItems, allPhotos);
    if (items.length === 0) {
      return {
        success: false,
        message: "Tidak ditemukan kegiatan yang memiliki dokumentasi bukti dukung untuk pegawai " + empName + " pada periode " + periodeStr + "."
      };
    }

    // 1. Dapatkan Folder Induk Google Drive
    var rootInfo = resolveRootFolder(GOOGLE_DRIVE_ROOT_FOLDER_ID);
    var rootFolder = rootInfo.folder;

    // 2. Hierarki Folder Pegawai
    var yearFolder = getOrCreateChildFolder(rootFolder, String(selYear));
    var unitFolder = getOrCreateChildFolder(yearFolder, unitKerja);
    var monthFolder = getOrCreateChildFolder(unitFolder, namaBulanStr);
    var employeeFolder = getOrCreateChildFolder(monthFolder, empName);

    // 3. Folder 'Bukti Dukung' & 'Bukti Dukung PDF'
    var buktiDukungFolder = getOrCreateChildFolder(employeeFolder, "Bukti Dukung");
    var pdfFolder = getOrCreateChildFolder(buktiDukungFolder, "Bukti Dukung PDF");

    try {
      buktiDukungFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      pdfFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (eShare) {}

    // Inisialisasi cache folder Google Docs & PDF sekali saja untuk efisiensi tinggi
    var folderDocCache = getFolderDocCache(buktiDukungFolder);
    var pdfCache = getFolderPdfCache(pdfFolder);

    // Bersihkan file sisa HITUNG SKOR jika ada di Google Drive dari proses sebelumnya
    if (folderDocCache && folderDocCache.list) {
      for (var f = 0; f < folderDocCache.list.length; f++) {
        var docItem = folderDocCache.list[f];
        if (docItem && docItem.name && isHitungSkorTask(docItem.name)) {
          try {
            docItem.file.setTrashed(true);
            delete folderDocCache.byExactName[docItem.name];
          } catch (eTr) {}
        }
      }
    }
    if (pdfCache && pdfCache.list) {
      for (var p = 0; p < pdfCache.list.length; p++) {
        var pdfFile = pdfCache.list[p];
        if (pdfFile && pdfFile.getName && isHitungSkorTask(pdfFile.getName())) {
          try {
            pdfFile.setTrashed(true);
            delete pdfCache.byName[pdfFile.getName()];
          } catch (eTrPdf) {}
        }
      }
    }

    // 4. Pengelolaan Slice Batch
    var isBatchMode = (startIndex !== undefined && startIndex !== null);
    var sIdx = isBatchMode ? Math.max(0, Number(startIndex) || 0) : 0;
    var bSize = isBatchMode ? Math.max(1, Number(batchSize) || 4) : items.length;
    var eIdx = Math.min(items.length, sIdx + bSize);
    var itemsToProcess = isBatchMode ? items.slice(sIdx, eIdx) : items;
    var isLastBatch = (eIdx >= items.length);

    var processedResults = [];
    var pdfErrors = [];

    // Proses konversi PDF untuk batch saat ini
    for (var i = 0; i < itemsToProcess.length; i++) {
      var item = itemsToProcess[i];
      var globalIdx = sIdx + i;
      var namaTugas = item.kegiatan || 'Pelaksanaan Tugas';
      var itemRuangan = item.ruangan || '';

      // Pengecualian kegiatan HITUNG SKOR
      if (isHitungSkorTask(namaTugas)) continue;

      var matchingPhotos = findPhotosForTask(allPhotos, namaTugas, itemRuangan);
      // Validasi ketersediaan bukti dukung: lewati jika tidak ada dokumentasi foto
      if (!matchingPhotos || matchingPhotos.length === 0) continue;
      var kuantitas = item.selesai !== undefined ? item.selesai : (item.target || 0);
      var rincianNarasi = formatRincianKegiatanNarrative(namaTugas, kuantitas, periodeStr);

      var docFile = findExistingDocFile(buktiDukungFolder, namaTugas, empName, namaBulanStr, selYear, folderDocCache, itemRuangan);

      // Jika file Doc belum ada, buat langsung
      if (!docFile) {
        try {
          var hasRuang = Boolean(itemRuangan && String(itemRuangan).trim() && String(itemRuangan).trim() !== '-' && String(itemRuangan).trim() !== 'Area Umum' && String(itemRuangan).trim() !== 'Umum');
          var docTitlePrefix = hasRuang ? (sanitizeFileName(itemRuangan) + " - ") : "";
          var docName = "Bukti Dukung - " + docTitlePrefix + sanitizeFileName(namaTugas) + " - " + cleanStr(empName) + " - " + namaBulanStr + " " + selYear;
          var docObj = DocumentApp.create(docName);
          buildGoogleDocContent(docObj, item, empName, periodeStr, matchingPhotos);
          docObj.saveAndClose();

          docFile = DriveApp.getFileById(docObj.getId());
          try {
            docFile.moveTo(buktiDukungFolder);
          } catch (eMove) {
            buktiDukungFolder.addFile(docFile);
            try { DriveApp.getRootFolder().removeFile(docFile); } catch (eRem) {}
          }
          try {
            docFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          } catch (eS) {}

          folderDocCache.byExactName[docName] = docFile;
          folderDocCache.list.push({ file: docFile, name: docName, nameAlpha: getAlphaOnly(docName) });
        } catch (eCreateDoc) {
          pdfErrors.push("Gagal membuat Google Doc untuk " + namaTugas + ": " + eCreateDoc.message);
          continue;
        }
      }

      var docUrl = docFile.getUrl();
      var cleanDocUrl = String(docUrl || '').replace(/\\/g, '').trim();
      var pdfName = sanitizeFileName(docFile.getName()) + ".pdf";
      var pdfUrl = '';

      // Ekspor Google Docs ke PDF dengan Smart Caching (hanya ekspor jika belum ada atau doc lebih baru)
      var existingPdf = pdfCache.byName ? pdfCache.byName[pdfName] : null;
      var needsExport = true;

      if (existingPdf) {
        try {
          var pdfUpdated = existingPdf.getLastUpdated().getTime();
          var docUpdated = docFile.getLastUpdated().getTime();
          if (pdfUpdated >= docUpdated) {
            pdfUrl = existingPdf.getUrl();
            needsExport = false;
          } else {
            try { existingPdf.setTrashed(true); } catch (eTrash) {}
          }
        } catch (eCheck) {
          needsExport = true;
        }
      }

      if (needsExport) {
        try {
          var pdfBlob = docFile.getAs('application/pdf');
          pdfBlob.setName(pdfName);

          var pdfFile = pdfFolder.createFile(pdfBlob);
          try {
            pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          } catch (eS2) {}

          pdfUrl = pdfFile.getUrl();
          if (pdfCache.byName) {
            pdfCache.byName[pdfName] = pdfFile;
          }
        } catch (ePdf) {
          pdfErrors.push("Ekspor PDF untuk '" + namaTugas + "' gagal: " + ePdf.message);
          pdfUrl = docUrl; // Fallback ke Doc URL jika PDF gagal
        }
      }

      var cleanPdfUrl = String(pdfUrl || '').replace(/\\/g, '').trim();

      processedResults.push({
        no: globalIdx + 1,
        rincianKegiatan: rincianNarasi,
        uraianKegiatan: namaTugas,
        satuan: "Kegiatan",
        kuantitas: kuantitas,
        linkBuktiDukung: cleanDocUrl,
        linkPdf: cleanPdfUrl,
        tanggalPelaksanaan: periodeStr
      });
    }

    var kipappFileName = "Kipapp - " + sanitizeFileName(empName) + " - " + namaBulanStr + " " + selYear;
    var kipappSs = null;

    // 5. Buat / Perbarui Spreadsheet Kipapp (Hanya saat batch terakhir atau non-batch mode)
    if (isLastBatch) {
      // Re-scan pdfCache untuk memastikan seluruh PDF terdaftar
      var refreshedPdfCache = getFolderPdfCache(pdfFolder);
      var tableRows = [];
      var fullResults = [];

      for (var k = 0; k < items.length; k++) {
        var itm = items[k];
        var tTask = itm.kegiatan || 'Pelaksanaan Tugas';
        if (isHitungSkorTask(tTask)) continue;
        var itmRuang = (itm.ruangan && itm.ruangan !== '-' && itm.ruangan !== 'Area Umum' && itm.ruangan !== 'Umum') ? String(itm.ruangan).trim() : '';
        var tUraian = itmRuang ? (itmRuang + " - " + tTask) : tTask;
        var tKuantitas = itm.selesai !== undefined ? itm.selesai : (itm.target || 0);
        var tNarasi = itmRuang
          ? ("Terlaksananya " + convertVerbsToNouns(tTask) + " pada " + itmRuang + " sebanyak " + tKuantitas + " kali selama periode " + periodeStr + ".")
          : formatRincianKegiatanNarrative(tTask, tKuantitas, periodeStr);

        var dFile = findExistingDocFile(buktiDukungFolder, tTask, empName, namaBulanStr, selYear, folderDocCache, itm.ruangan);
        var dUrl = dFile ? String(dFile.getUrl() || '').replace(/\\/g, '').trim() : '';

        var pName = (dFile ? sanitizeFileName(dFile.getName()) : sanitizeFileName(tUraian)) + ".pdf";
        var pFile = refreshedPdfCache.byName ? refreshedPdfCache.byName[pName] : null;
        var pUrl = pFile ? String(pFile.getUrl() || '').replace(/\\/g, '').trim() : '';

        var formulaDoc = dUrl ? ('=HYPERLINK("' + dUrl + '"; "Buka Dokumen")') : '-';
        var formulaPdf = (pUrl && pUrl !== '-') ? ('=HYPERLINK("' + pUrl + '"; "Buka PDF")') : '-';

        fullResults.push({
          no: k + 1,
          rincianKegiatan: tNarasi,
          uraianKegiatan: tUraian,
          ruangan: itmRuang,
          satuan: "Kegiatan",
          kuantitas: tKuantitas,
          linkBuktiDukung: dUrl,
          linkPdf: pUrl,
          tanggalPelaksanaan: periodeStr
        });

        tableRows.push([
          k + 1,
          tNarasi,
          tUraian,
          "Kegiatan",
          tKuantitas,
          formulaDoc,
          formulaPdf,
          periodeStr
        ]);
      }

      processedResults = fullResults;

      var existingSheets = employeeFolder.getFilesByName(kipappFileName);
      if (existingSheets.hasNext()) {
        var ssFile = existingSheets.next();
        kipappSs = SpreadsheetApp.openById(ssFile.getId());
      } else {
        kipappSs = SpreadsheetApp.create(kipappFileName);
        var newSsFile = DriveApp.getFileById(kipappSs.getId());
        try {
          newSsFile.moveTo(employeeFolder);
        } catch (eMoveSs) {
          employeeFolder.addFile(newSsFile);
          try { DriveApp.getRootFolder().removeFile(newSsFile); } catch (eRemSs) {}
        }
        try {
          newSsFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        } catch (eSsShare) {}
      }

      try {
        kipappSs.setSpreadsheetLocale('id_ID');
      } catch (eLoc) {}

      var kipappSheet = kipappSs.getSheets()[0];
      kipappSheet.setName("Kipapp " + namaBulanStr + " " + selYear);
      kipappSheet.clear();

      // Judul & Metadata
      kipappSheet.getRange(1, 1).setValue("REKAPITULASI BUKTI DUKUNG DAN KIPAPP PEGAWAI").setFontSize(13).setFontWeight("bold");
      kipappSheet.getRange(2, 1).setValue("BADAN PUSAT STATISTIK PROVINSI KALIMANTAN BARAT").setFontSize(11).setFontWeight("bold").setFontColor("#1e40af");
      kipappSheet.getRange(3, 1).setValue("Nama Pegawai: " + empName + " | Unit Kerja: " + unitKerja + " | Periode: " + periodeStr).setFontSize(10).setFontStyle("italic").setFontColor("#475569");

      // Header Kolom (Baris 5)
      var headers = [
        "No",
        "Rincian Kegiatan",
        "Uraian Kegiatan",
        "Satuan",
        "Kuantitas",
        "Link Bukti Dukung (Google Docs)",
        "Link PDF",
        "Tanggal Pelaksanaan"
      ];

      kipappSheet.getRange(5, 1, 1, headers.length)
        .setValues([headers])
        .setBackground("#1e40af")
        .setFontColor("#ffffff")
        .setFontWeight("bold")
        .setHorizontalAlignment("center")
        .setVerticalAlignment("middle");

      kipappSheet.setRowHeight(5, 30);
      kipappSheet.setFrozenRows(5);

      // Isi Baris Data
      if (tableRows.length > 0) {
        var dataRange = kipappSheet.getRange(6, 1, tableRows.length, headers.length);
        dataRange.setValues(tableRows);
        dataRange.setVerticalAlignment("middle");
        dataRange.setFontSize(10);

        // Format Lebar Kolom
        kipappSheet.setColumnWidth(1, 45);   // No
        kipappSheet.setColumnWidth(2, 360);  // Rincian Kegiatan
        kipappSheet.setColumnWidth(3, 280);  // Uraian Kegiatan
        kipappSheet.setColumnWidth(4, 85);   // Satuan
        kipappSheet.setColumnWidth(5, 85);   // Kuantitas
        kipappSheet.setColumnWidth(6, 210);  // Link Bukti Dukung
        kipappSheet.setColumnWidth(7, 130);  // Link PDF
        kipappSheet.setColumnWidth(8, 160);  // Tanggal Pelaksanaan

        // Perataan Kolom
        kipappSheet.getRange(6, 1, tableRows.length, 1).setHorizontalAlignment("center");
        kipappSheet.getRange(6, 2, tableRows.length, 2).setWrap(true).setHorizontalAlignment("left");
        kipappSheet.getRange(6, 4, tableRows.length, 5).setHorizontalAlignment("center");

        // Border dan Baris Selang-Seling
        for (var r = 0; r < tableRows.length; r++) {
          kipappSheet.setRowHeight(6 + r, 26);
          if (r % 2 === 1) {
            kipappSheet.getRange(6 + r, 1, 1, headers.length).setBackground("#f8fafc");
          }
        }
        dataRange.setBorder(true, true, true, true, true, true, "#cbd5e1", SpreadsheetApp.BorderStyle.SOLID);
      }

      SpreadsheetApp.flush();
    }

    var cleanKipappUrl = kipappSs ? String(kipappSs.getUrl() || '').replace(/\\/g, '').trim() : '';
    var cleanPdfFolderUrl = String(pdfFolder.getUrl() || '').replace(/\\/g, '').trim();
    var cleanDocFolderUrl = String(buktiDukungFolder.getUrl() || '').replace(/\\/g, '').trim();
    var cleanEmpFolderUrl = String(employeeFolder.getUrl() || '').replace(/\\/g, '').trim();

    return {
      success: true,
      message: isBatchMode
        ? (isLastBatch ? "Seluruh berkas PDF dan Google Sheets Kipapp selesai dibuat!" : ("Berhasil mengekspor PDF " + (sIdx + 1) + "–" + eIdx + " dari " + items.length + " kegiatan."))
        : "Berkas Google Sheets Kipapp dan seluruh file PDF berhasil dibuat/diperbarui di Google Drive!",
      data: {
        namaPegawai: empName,
        periodeStr: periodeStr,
        kipappName: kipappFileName,
        kipappUrl: cleanKipappUrl,
        folderPdfUrl: cleanPdfFolderUrl,
        folderBuktiDukungUrl: cleanDocFolderUrl,
        folderPegawaiUrl: cleanEmpFolderUrl,
        totalItems: items.length,
        startIndex: sIdx,
        processedCount: eIdx,
        isComplete: isLastBatch,
        nextIndex: isLastBatch ? null : eIdx,
        totalKegiatan: processedResults.length,
        items: processedResults,
        errors: pdfErrors
      }
    };

  } catch (err) {
    return {
      success: false,
      message: "Gagal membuat Kipapp & PDF: " + err.message
    };
  }
}

