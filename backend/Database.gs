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

function resetMemoryCache() {
  _cachedSheetsList = null;
  _cachedSheetsMap = null;
  _cachedUserList = null;
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
