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
 * Mendapatkan atau membuat folder anak di Google Drive (Mencegah duplikasi folder)
 */
function getOrCreateChildFolder(parentFolder, folderName) {
  var nameClean = String(folderName || '').trim();
  if (!nameClean) nameClean = 'Lainnya';

  var folders = parentFolder.getFoldersByName(nameClean);
  if (folders.hasNext()) {
    return folders.next();
  }
  return parentFolder.createFolder(nameClean);
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
    var unitKerja = cleanStr(payload.unit || session.unit || 'Kebersihan');
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

    // 2. Akses Folder Induk Google Drive
    var rootFolderId = (typeof GOOGLE_DRIVE_ROOT_FOLDER_ID !== 'undefined' && GOOGLE_DRIVE_ROOT_FOLDER_ID)
      ? GOOGLE_DRIVE_ROOT_FOLDER_ID
      : "1WvFEHzdredv8wQEBRivNY9iDk5C6iktR";

    var rootFolder;
    try {
      rootFolder = DriveApp.getFolderById(rootFolderId);
    } catch (eDrive) {
      return {
        success: false,
        message: "Gagal mengakses Folder Induk Google Drive (ID: " + rootFolderId + "). Pastikan izin akses Drive diberikan."
      };
    }

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

    return {
      success: true,
      message: "Bukti dukung foto berhasil diunggah ke Google Drive!",
      data: {
        taskKey: taskKey,
        fileId: fileId,
        fileUrl: fileUrl,
        fileName: fileName,
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
    var unitKerja = cleanStr(payload.unit || payload.unitKerja || 'Kebersihan');

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
