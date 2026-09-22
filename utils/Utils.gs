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
