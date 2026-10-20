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

/**
 * Mengambil data dari CacheService (Mendukung data besar >95KB dengan auto-reassembly chunk)
 */
function getScriptCacheData(key) {
  if (!key) return null;
  try {
    var c = CacheService.getScriptCache();
    // 1. Periksa apakah data disimpan dalam format berpartisi (chunking)
    var metaVal = c.get(key + '_meta');
    if (metaVal) {
      var meta = JSON.parse(metaVal);
      if (meta && meta.chunks && meta.chunks > 0) {
        var chunkKeys = [];
        for (var i = 0; i < meta.chunks; i++) {
          chunkKeys.push(key + '_chunk_' + i);
        }
        var chunksMap = c.getAll(chunkKeys);
        var fullStr = '';
        var allPresent = true;
        for (var j = 0; j < meta.chunks; j++) {
          var part = chunksMap[key + '_chunk_' + j];
          if (typeof part !== 'string') {
            allPresent = false;
            break;
          }
          fullStr += part;
        }
        if (allPresent && fullStr) {
          return JSON.parse(fullStr);
        }
      }
    }

    // 2. Fallback pembacaan langsung
    var val = c.get(key);
    if (val) return JSON.parse(val);
  } catch (e) { /* ignore */ }
  return null;
}

/**
 * Menyimpan data ke CacheService (Mendukung data besar >95KB dengan auto-chunking tanpa silent failure)
 */
function putScriptCacheData(key, data, ttlSeconds) {
  if (!key || data === undefined || data === null) return;
  try {
    var c = CacheService.getScriptCache();
    var str = JSON.stringify(data);
    var ttl = ttlSeconds || 120;
    var CHUNK_SIZE = 85000; // Batas aman di bawah limit 100KB per nilai cache Google

    if (str.length < CHUNK_SIZE) {
      c.put(key, str, ttl);
      // Bersihkan meta chunk terdahulu jika sebelumnya pernah berpartisi
      try { c.remove(key + '_meta'); } catch (eRem) { /* ignore */ }
      return;
    }

    // Jika ukuran data melampaui limit Google Apps Script, partisi menjadi beberapa chunk
    var totalChunks = Math.ceil(str.length / CHUNK_SIZE);
    if (totalChunks > 10) return; // Batasi maksimal ~850KB untuk mencegah ekses memori cache

    var chunkObj = {};
    for (var i = 0; i < totalChunks; i++) {
      var chunkStr = str.substring(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      chunkObj[key + '_chunk_' + i] = chunkStr;
    }
    chunkObj[key + '_meta'] = JSON.stringify({ chunks: totalChunks, len: str.length });

    // Tulis seluruh chunk sekaligus secara atomik menggunakan putAll
    c.putAll(chunkObj, ttl);
  } catch (e) { /* ignore */ }
}

/**
 * Menghapus cache spesifik beserta seluruh partisi chunk-nya
 */
function clearScriptCacheKeys(keys) {
  if (!keys || !keys.length) return;
  try {
    var c = CacheService.getScriptCache();
    var allKeysToRemove = [];
    for (var k = 0; k < keys.length; k++) {
      var key = keys[k];
      if (!key) continue;
      allKeysToRemove.push(key);
      allKeysToRemove.push(key + '_meta');
      for (var i = 0; i < 10; i++) {
        allKeysToRemove.push(key + '_chunk_' + i);
      }
    }
    c.removeAll(allKeysToRemove);
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
