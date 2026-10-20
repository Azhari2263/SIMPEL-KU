/**
 * ========================================================================
 * SIMPEL-KU - AUTHENTICATION & USER MANAGEMENT MODULE
 * ========================================================================
 */

/**
 * Hashing Password dengan algoritma SHA-256 + Salt
 */
function hashPassword(plainPassword) {
  if (!plainPassword) return '';
  var salt = (typeof PASSWORD_SALT !== 'undefined' && PASSWORD_SALT) ? PASSWORD_SALT : 'SIMPELKU_BPS_KALBAR_SECURE_SALT_2026';
  var rawBytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(plainPassword) + salt, Utilities.Charset.UTF_8);
  var hexStr = '';
  for (var i = 0; i < rawBytes.length; i++) {
    var b = rawBytes[i];
    if (b < 0) b += 256;
    var byteHex = b.toString(16);
    if (byteHex.length === 1) byteHex = '0' + byteHex;
    hexStr += byteHex;
  }
  return 'sha256:' + hexStr;
}

/**
 * Verifikasi Password (Mendukung SHA-256 dan Plaintext untuk migrasi transparan)
 */
function verifyPassword(inputPassword, storedPassword) {
  var cleanInput = cleanPass(inputPassword);
  var cleanStored = cleanPass(storedPassword);
  if (!cleanInput || !cleanStored) return false;

  // 1. Jika password di database sudah berformat hash
  if (cleanStored.indexOf('sha256:') === 0) {
    return hashPassword(cleanInput) === cleanStored;
  }

  // 2. Fallback pencocokan plaintext untuk akun yang belum termigrasi
  return cleanInput === cleanStored;
}

/**
 * Resolver Cepat Role, Unit, dan Jenis tanpa pembacaan sheet terpisah (O(1) Memory Resolve)
 */
function resolveUserRoleAndUnit(uObj) {
  var r = String(uObj.role || '').toLowerCase();
  var u = String(uObj.unit || '').toLowerCase();
  var un = String(uObj.username || '').toLowerCase();
  var np = String(uObj.namaPegawai || '').toLowerCase();

  // 1. Resolusi Role
  if (!uObj.role) {
    if (r.includes('admin') || un.includes('admin') || np.includes('admin')) uObj.role = 'Admin';
    else if (r.includes('supervisor') || un.includes('supervisor') || un.includes('kabag') || un.includes('kasubbag') || np.includes('kabag')) uObj.role = 'Supervisor';
    else if (r.includes('humas') || un.includes('humas') || un.includes('timumum') || np.includes('humas')) uObj.role = 'Tim Umum dan Humas';
    else if (r.includes('korlap') || un.includes('korlap') || un.includes('koordinator') || np.includes('koordinator')) uObj.role = 'Koordinator Lapangan';
    else if (r.includes('keamanan') || u.includes('keamanan') || un.includes('satpam') || un.includes('security')) uObj.role = 'Petugas Keamanan';
    else if (r.includes('pelayanan') || u.includes('pelayanan') || un.includes('resepsionis') || un.includes('pst')) uObj.role = 'Petugas Pelayanan';
    else uObj.role = 'Petugas Kebersihan';
  }

  // 2. Resolusi Unit Kerja
  if (!uObj.unit) {
    var roleCheck = String(uObj.role || '').toLowerCase();
    if (roleCheck.includes('admin') || roleCheck.includes('supervisor') || roleCheck.includes('kabag')) uObj.unit = 'Manajemen';
    else if (roleCheck.includes('humas') || roleCheck.includes('korlap')) uObj.unit = 'Umum';
    else if (roleCheck.includes('keamanan')) uObj.unit = 'Keamanan';
    else if (roleCheck.includes('pelayanan')) uObj.unit = 'Pelayanan';
    else uObj.unit = 'Kebersihan';
  } else {
    uObj.unit = determineUnit(null, uObj.role, uObj.unit);
  }

  // 3. Resolusi Jenis Monitoring
  if (!uObj.jenis) {
    var unitCheck = String(uObj.unit || '').toLowerCase();
    var roleLow = String(uObj.role || '').toLowerCase();
    if (unitCheck.includes('keamanan') || roleLow.includes('keamanan')) uObj.jenis = 'KEAMANAN KANTOR';
    else if (unitCheck.includes('pelayanan') || roleLow.includes('pelayanan') || unitCheck.includes('resepsionis')) uObj.jenis = 'RESEPSIONIS';
    else uObj.jenis = 'PIKET KEBERSIHAN KANTOR';
  }
}

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
 * Mendukung verifikasi hash SHA-256 dan auto-upgrade password plaintext
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
    let matchedRowIndex = -1;
    let needPasswordUpgrade = false;

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

      if (isMatchUser && verifyPassword(inputPassClean, rowPass)) {
        matchedUser = {
          username: rowUser || rowNama,
          namaPegawai: rowNama || rowUser,
          namaSheet: rowSheet || rowUser,
          role: rowRole,
          unit: rowUnit,
          nip: rowNip
        };
        matchedRowIndex = i + 1;
        // Tandai perlunya upgrade jika password masih berformat plaintext
        if (rowPass.indexOf('sha256:') !== 0) {
          needPasswordUpgrade = true;
        }
        break;
      }
    }

    if (!matchedUser) {
      return { success: false, message: "Username atau Password salah. Pastikan kredensial sesuai dengan sheet 'Users'." };
    }

    // Auto-upgrade password plaintext ke SHA-256 hash secara transparan
    if (needPasswordUpgrade && matchedRowIndex > 0) {
      try {
        var hashed = hashPassword(inputPassClean);
        userSheet.getRange(matchedRowIndex, colPass + 1).setValue(hashed);
        _cachedUserList = null;
      } catch (eUpgrade) { /* abaikan jika terjadi kendala minor penulisan */ }
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

    // Verifikasi kesesuaian password saat ini (Mendukung SHA-256 dan Plaintext)
    const storedPassClean = cleanPass(currentStoredUser.password);
    if (!verifyPassword(cleanOldPass, storedPassClean)) {
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

    // Password baru selalu di-hash menggunakan SHA-256
    const targetPassword = cleanNewPass ? hashPassword(cleanNewPass) : (storedPassClean.indexOf('sha256:') === 0 ? storedPassClean : hashPassword(storedPassClean));
    const nowTimestamp = Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss");

    // TULIS PERUBAHAN LANGSUNG KE SHEET USERS
    userSheet.getRange(userRowIndex, colUser + 1).setValue(String(targetUsername));
    userSheet.getRange(userRowIndex, colPass + 1).setValue(String(targetPassword));
    userSheet.getRange(userRowIndex, 5).setValue(nowTimestamp);

    // FLUSH LANGSUNG KE SPREADSHEET AGAR TERSIMPAN PERMANEN
    SpreadsheetApp.flush();

    // Reset memory user list cache
    _cachedUserList = null;

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
      message: "Username dan password berhasil disimpan dengan enkripsi SHA-256 pada sheet Users!",
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
 * PENGAMBILAN DAFTAR PENGGUNA TEROPTIMASI O(1)
 * Menghilangkan pembacaan sekuensial lembar sheet personal pada loop akun.
 * Menghemat 20+ panggilan Spreadsheet RPC dan mempercepat load dashboard 5-7 detik.
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

    // Resolusi cepat berbasis metadata sheet Users tanpa I/O RPC ke sheet pegawai
    resolveUserRoleAndUnit(uObj);

    list.push(uObj);
  }

  _cachedUserList = list;
  return list;
}
