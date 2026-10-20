// ============================================================
// SIDAK6100 BPS Kalbar - Code.gs
// Dimodifikasi untuk integrasi penuh dengan index.html
// ============================================================

// ======================= KONSTANTA =======================
const SHEET_NAMES = {
  PEGAWAI: 'Pegawai',
  USERS: 'Users',
  RIWAYAT: 'Riwayat_AK',
  KINERJA: 'Kategori_Kinerja',
  INPUT_KINERJA: 'Input_Kinerja',
  KENAIKAN: 'Kenaikan_Pangkat',
  SATKER: 'Satker',
  RIWAYAT_PAK_TERBIT: 'Riwayat_PAK_Terbit',
  ARSIP_DOKUMEN: 'Arsip_Dokumen',
  JADWAL: 'Jadwal',
  HISTORY_PAK: 'Dokumen_Terbit',
  DOKUMEN_TERBIT: 'Dokumen_Terbit'
};

const REGULASI = {
  // ===================== JABATAN KEAHLIAN =====================
  'Ahli Pertama III/a': { akPang: 50, nextPang: 'Ahli Pertama III/b', akJab: 100, nextJab: 'Ahli Muda III/c', next: 'Ahli Pertama III/b' },
  'Ahli Pertama III/b': { akPang: null, nextPang: null, akJab: 100, nextJab: 'Ahli Muda III/c', next: 'Ahli Muda III/c' },
  'Ahli Muda III/c': { akPang: 100, nextPang: 'Ahli Muda III/d', akJab: 200, nextJab: 'Ahli Madya IV/a', next: 'Ahli Muda III/d' },
  'Ahli Muda III/d': { akPang: 200, nextPang: 'Ahli Muda IV/a', akJab: 200, nextJab: 'Ahli Madya IV/a', next: 'Ahli Madya IV/a' },
  'Ahli Muda IV/a': { akPang: null, nextPang: null, akJab: 200, nextJab: 'Ahli Madya', next: 'Ahli Madya' },
  'Ahli Muda IV/b': { akPang: null, nextPang: null, akJab: 200, nextJab: 'Ahli Madya', next: 'Ahli Madya' },
  'Ahli Madya IV/a': { akPang: 150, nextPang: 'Ahli Madya IV/b', akJab: 450, nextJab: 'Ahli Utama IV/d', next: 'Ahli Madya IV/b' },
  'Ahli Madya IV/b': { akPang: 300, nextPang: 'Ahli Madya IV/c', akJab: 450, nextJab: 'Ahli Utama IV/d', next: 'Ahli Madya IV/c' },
  'Ahli Madya IV/c': { akPang: 450, nextPang: 'Ahli Madya IV/d', akJab: 450, nextJab: 'Ahli Utama IV/d', next: 'Ahli Madya IV/d' },
  'Ahli Utama IV/d': { akPang: 200, nextPang: 'Ahli Utama IV/e', akJab: null, nextJab: null, next: 'Ahli Utama IV/e' },

  // ===================== JABATAN KETERAMPILAN =====================
  'Terampil II/c': { akPang: 20, nextPang: 'Terampil II/d', akJab: 40, nextJab: 'Mahir III/a', next: 'Terampil II/d' },
  'Terampil II/d': { akPang: 40, nextPang: 'Mahir III/a', akJab: 40, nextJab: 'Mahir III/a', next: 'Mahir III/a' },
  'Mahir III/a': { akPang: 50, nextPang: 'Mahir III/b', akJab: 100, nextJab: 'Penyelia III/c', next: 'Mahir III/b' },
  'Mahir III/b': { akPang: 100, nextPang: 'Mahir III/c', akJab: 100, nextJab: 'Penyelia III/c', next: 'Penyelia III/c' },
  'Penyelia III/c': { akPang: 100, nextPang: 'Penyelia III/d', akJab: 200, nextJab: null, next: 'Penyelia III/d' },
  'Penyelia III/d': { akPang: 200, nextPang: 'Penyelia IV/a', akJab: null, nextJab: null, next: 'Penyelia IV/a' }
};

const KOEFISIEN = {
  'Pemula': 3.75, 'Terampil': 5, 'Mahir': 12.5, 'Penyelia': 25,
  'Ahli Pertama': 12.5, 'Ahli Muda': 25, 'Ahli Madya': 37.5, 'Ahli Utama': 50
};

// ======================= SHA-256 FUNCTION =======================
function sha256Hex(text) {
  try {
    const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8);
    return digest.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
  } catch(e) {
    console.error('Error sha256Hex: ' + e.message);
    return '';
  }
}

// ======================= RESPONSE HELPER =======================
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function errorResponse(message, code) {
  return jsonResponse({ success: false, error: true, message: message, code: code || 400 });
}

// ======================= doGet ROUTER =======================
function doGet(e) {
  if (!e || !e.parameter || !e.parameter.action) {
    return HtmlService.createHtmlOutputFromFile('index')
      .setTitle('SIDAK6100 BPS Kalbar - Smart Credit Point System')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  try {
    const action  = e.parameter.action  || '';
    const nipUser = e.parameter.nipUser || '';
    const payload = e.parameter.payload ? JSON.parse(e.parameter.payload) : {};

    return routeAction(action, nipUser, payload, e.parameter);
  } catch (err) {
    return errorResponse('Server error: ' + err.message, 500);
  }
}

function doPost(e) {
  try {
    let body = {};
    if (e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }
    const action  = body.action  || (e.parameter && e.parameter.action)  || '';
    const nipUser = body.nipUser || (e.parameter && e.parameter.nipUser) || '';
    return routeAction(action, nipUser, body, e.parameter || {});
  } catch (err) {
    return errorResponse('Server error: ' + err.message, 500);
  }
}

// ======================= ROUTER =======================
function routeAction(action, nipUser, payload, params) {
  if (action === 'authenticate') return handleAuthenticate(payload);
  if (action === 'ping')         return jsonResponse({ success: true, message: 'pong' });

  const session = validateSession(nipUser);
  if (!session) return errorResponse('Sesi tidak valid atau tidak memiliki akses.', 401);

  // Inisialisasi sheet pendukung jika belum ada
  checkAndInitSheets();

  const targetNipParam = params.targetNip || payload.targetNip || payload.nip || params.nip || '';

  switch (action) {
    case 'getAllPegawai':          return handleGetAllPegawai(session);
    case 'generateOfficialDocument': return handleGenerateOfficialDocument(payload, session);
    case 'recordDocIssuance':      return handleRecordDocIssuance(payload, session);
    case 'getPegawai':             return handleGetPegawai(targetNipParam, session);
    case 'getProyeksiFromSheet':   return handleGetProyeksiFromSheet(targetNipParam, session);
    case 'getAllRiwayatAK':        return handleGetAllRiwayatAK(session);
    case 'getSatker':              return handleGetSatker();
    case 'getKategoriKinerja':     return handleGetKategoriKinerja();
    case 'getAmbangPangkat':       return handleGetAmbangPangkat();
    case 'getRiwayatAK':           return handleGetRiwayatAK(targetNipParam, session);
    case 'getProyeksi':            return handleGetProyeksi(targetNipParam, payload.scenario || params.scenario, session);
    case 'getRekomendasi':         return handleGetRekomendasi(session);
    case 'getRiwayatAKTimeline':   return handleGetRiwayatAKTimeline(targetNipParam, session);
    case 'createPegawai':          return handleCreatePegawai(payload, session);
    case 'updatePegawai':          return handleUpdatePegawai(payload, session);
    case 'updateAKBulanan':        return handleUpdateAKBulanan(payload, session);
    case 'deletePegawai':          return handleDeletePegawai(payload.nip || payload.NIP || targetNipParam, session);
    case 'hitungProyeksi':         return handleHitungProyeksi(session);
    case 'getHistoryPAKData':      return handleGetHistoryPAKData(session);
    case 'simpanDokumenPAK':       return handleSimpanDokumenPAK(payload, session);
    case 'importPegawai':          return handleImportPegawai(payload, session);
    case 'importKinerja':          return handleImportKinerja(payload, session);
// FITUR HISTORY & ARSIP PAK
    case 'getRiwayatPAKTerbit':    return handleGetRiwayatPAKTerbit(session);
    case 'simpanRiwayatPAKTerbit': return handleSimpanRiwayatPAKTerbit(payload, session);
    case 'hapusRiwayatPAKTerbit':  return handleHapusRiwayatPAKTerbit(payload, session);
    case 'getArsipDokumen':        return handleGetArsipDokumen(session);
    case 'uploadArsipDokumen':     return handleUploadArsipDokumen(payload, session);
    case 'hapusArsipDokumen':      return handleHapusArsipDokumen(payload, session);
// FITUR JADWAL (ASSESSMENT & UKOM)
    case 'getJadwal':              return handleGetJadwal(session);
    case 'simpanJadwal':           return handleSimpanJadwal(payload, session);
    case 'hapusJadwal':            return handleHapusJadwal(payload, session);
    default:
      return errorResponse('Action tidak dikenal: ' + action, 404);
  }
}

// ======================= HELPER: USER SYNC =======================
function syncUserToSheet(nip, nama, role, password, kodeSatker) {
  if (!role || role.toString().trim() === '') return;
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAMES.USERS) || ss.getSheetByName('Users');
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAMES.USERS || 'Users');
      sheet.getRange(1, 1, 1, 5).setValues([['NIP', 'Nama', 'Kode_Satker', 'Role', 'Password']]).setFontWeight('bold').setBackground('#f1f5f9');
      sheet.setFrozenRows(1);
    }
    
    const data = sheet.getDataRange().getValues();
    const header = data.length > 0 ? data[0].map(h => h ? h.toString().trim().toUpperCase() : '') : [];
    
    let colNIP = header.indexOf('NIP');
    let colNama = header.indexOf('NAMA');
    let colKode = header.findIndex(h => h === 'KODE_SATKER' || h === 'KODESATKER' || h === 'SATKER' || h === 'UNITKERJA');
    let colRole = header.indexOf('ROLE');
    let colPw = header.indexOf('PASSWORD');
    if (colPw === -1) colPw = header.indexOf('PASSWORDHASH');
    
    if (colNIP === -1) {
      sheet.getRange(1, 1, 1, 5).setValues([['NIP', 'Nama', 'Kode_Satker', 'Role', 'Password']]);
      colNIP = 0; colNama = 1; colKode = 2; colRole = 3; colPw = 4;
    }
    
    const nipStr = (nip || '').toString().trim();
    if (!nipStr) return;
    
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      const rowNIP = data[i][colNIP] ? data[i][colNIP].toString().trim() : '';
      if (rowNIP === nipStr) {
        rowIndex = i + 1;
        break;
      }
    }
    
    const hashedPw = password ? (password.length === 64 && /^[a-f0-9]+$/i.test(password) ? password : sha256Hex(password)) : '';
    
    if (rowIndex > 0) {
      if (nama && colNama !== -1) sheet.getRange(rowIndex, colNama + 1).setValue(nama);
      if (kodeSatker !== undefined && kodeSatker !== null && colKode !== -1) sheet.getRange(rowIndex, colKode + 1).setValue(kodeSatker);
      if (role && colRole !== -1) sheet.getRange(rowIndex, colRole + 1).setValue(role);
      if (hashedPw && colPw !== -1) sheet.getRange(rowIndex, colPw + 1).setValue(hashedPw);
    } else {
      const newRow = [];
      newRow[colNIP] = nipStr;
      if (colNama !== -1) newRow[colNama] = nama || '';
      if (colKode !== -1) newRow[colKode] = kodeSatker || '';
      if (colRole !== -1) newRow[colRole] = role || 'Viewer';
      if (colPw !== -1) newRow[colPw] = hashedPw || sha256Hex(nipStr);
      sheet.appendRow(newRow);
    }
  } catch(e) {
    console.error('Error syncUserToSheet: ' + e.message);
  }
}

// ======================= AUTHENTICATION =======================
function handleAuthenticate(payload) {
  const { nip, password } = payload;
  
  if (!nip || !password) {
    return jsonResponse({ success: false, message: 'NIP dan password wajib diisi.' });
  }

  // Pastikan sheet Users sudah terinisialisasi
  checkAndInitSheets();

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.USERS) || ss.getSheetByName('Users');
  if (!sheet) {
    return jsonResponse({ success: false, message: 'Sheet Users tidak ditemukan.' });
  }

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    return jsonResponse({ success: false, message: 'Data pengguna pada sheet Users kosong.' });
  }
  
  const header = data[0].map(h => h ? h.toString().trim() : '');
  
  const colNIP = header.findIndex(h => h && h.toUpperCase() === 'NIP');
  const colNama = header.findIndex(h => h && h.toUpperCase() === 'NAMA');
  const colKode = header.findIndex(h => h && (h.toUpperCase() === 'KODE_SATKER' || h.toUpperCase() === 'KODESATKER' || h.toUpperCase() === 'SATKER' || h.toUpperCase() === 'UNITKERJA'));
  const colRole = header.findIndex(h => h && h.toUpperCase() === 'ROLE');
  
  let colPassword = header.findIndex(h => h && h.toUpperCase() === 'PASSWORD');
  if (colPassword === -1) {
    colPassword = header.findIndex(h => h && h.toUpperCase() === 'PASSWORDHASH');
  }
  
  if (colNIP === -1) {
    return jsonResponse({ success: false, message: 'Kolom NIP tidak ditemukan di sheet Users.' });
  }
  
  if (colPassword === -1) {
    return jsonResponse({ success: false, message: 'Kolom Password tidak ditemukan di sheet Users.' });
  }

  const inputHash = sha256Hex(password);
  const nipTarget = nip.toString().trim();
  const nipTargetClean = nipTarget.replace(/[^\d]/g, '');
  const nipTargetPrefix = nipTargetClean.substring(0, 12);

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowNIP = row[colNIP] ? row[colNIP].toString().trim() : '';
    const rowNIPClean = rowNIP.replace(/[^\d]/g, '');
    
    const isNipMatch = (rowNIP === nipTarget) ||
      (nipTargetClean !== '' && rowNIPClean === nipTargetClean) ||
      (nipTargetPrefix.length >= 12 && rowNIPClean.length >= 12 && rowNIPClean.substring(0, 12) === nipTargetPrefix);

    if (isNipMatch) {
      let rowPassword = '';
      if (row[colPassword] !== undefined && row[colPassword] !== null) {
        rowPassword = row[colPassword].toString().trim();
      }
      
      let isMatch = false;
      
      if (rowPassword.length === 64 && /^[a-f0-9]+$/i.test(rowPassword)) {
        isMatch = (rowPassword === inputHash);
      } 
      else if (rowPassword !== '') {
        isMatch = (rowPassword === password);
        if (isMatch && rowPassword !== inputHash) {
          try {
            sheet.getRange(i + 1, colPassword + 1).setValue(inputHash);
          } catch(e) {
            console.log('Gagal update hash password pada sheet Users: ' + e.message);
          }
        }
      }
      
      if (isMatch) {
        const nama = (colNama !== -1 && row[colNama]) ? row[colNama].toString() : 'User';
        const role = (colRole !== -1 && row[colRole]) ? row[colRole].toString().trim() : 'Viewer';
        
        let unitKerja = (colKode !== -1 && row[colKode]) ? row[colKode].toString().trim() : '';
        let jabatan = '';

        if (!unitKerja) {
          const pegSheet = ss.getSheetByName(SHEET_NAMES.PEGAWAI);
          if (pegSheet) {
            const pegData = pegSheet.getDataRange().getValues();
            if (pegData.length >= 2) {
              const pegHeader = pegData[0].map(h => h ? h.toString().trim().toUpperCase() : '');
              const pNipIdx = pegHeader.indexOf('NIP');
              const pKodeIdx = pegHeader.findIndex(h => h === 'KODE_SATKER' || h === 'KODESATKER' || h === 'SATKER' || h === 'UNITKERJA');
              const pJabIdx = pegHeader.indexOf('JABATAN');
              if (pNipIdx !== -1) {
                for (let j = 1; j < pegData.length; j++) {
                  const pRow = pegData[j];
                  const pNip = pRow[pNipIdx] ? pRow[pNipIdx].toString().trim() : '';
                  const pNipClean = pNip.replace(/[^\d]/g, '');
                  if (pNip === rowNIP || (nipTargetClean !== '' && pNipClean === nipTargetClean)) {
                    if (!unitKerja && pKodeIdx !== -1 && pRow[pKodeIdx]) unitKerja = pRow[pKodeIdx].toString().trim();
                    if (pJabIdx !== -1 && pRow[pJabIdx]) jabatan = pRow[pJabIdx].toString();
                    break;
                  }
                }
              }
            }
          }
        }

        return jsonResponse({
          success: true,
          nip: rowNIP,
          nama: nama,
          role: role,
          unitKerja: unitKerja,
          kodeSatker: unitKerja,
          jabatan: jabatan
        });
      } else {
        return jsonResponse({ success: false, message: 'Password salah.' });
      }
    }
  }
  
  return jsonResponse({ success: false, message: 'NIP tidak ditemukan pada sheet Users.' });
}

// ======================= VALIDATE SESSION =======================
function validateSession(nipUser) {
  if (!nipUser) return null;
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Cek di sheet Users terlebih dahulu
  let usersSheet = ss.getSheetByName(SHEET_NAMES.USERS) || ss.getSheetByName('Users');
  let userRecord = null;
  
  const targetNipStr = nipUser.toString().trim();
  const targetNipClean = targetNipStr.replace(/[^\d]/g, '');
  const targetNipPrefix = targetNipClean.substring(0, 12);
  
  if (usersSheet) {
    const data = usersSheet.getDataRange().getValues();
    if (data.length >= 2) {
      const header = data[0].map(h => h ? h.toString().trim().toUpperCase() : '');
      const colNIP = header.indexOf('NIP');
      const colNama = header.indexOf('NAMA');
      const colRole = header.indexOf('ROLE');
      const colGol = header.indexOf('GOLONGAN');
      const colJab = header.indexOf('JABATAN');
      const colKode = header.findIndex(h => h === 'KODE_SATKER' || h === 'KODESATKER' || h === 'SATKER' || h === 'UNITKERJA');
      
      if (colNIP !== -1) {
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          const rowNIPStr = row[colNIP] ? row[colNIP].toString().trim() : '';
          const rowNIPClean = rowNIPStr.replace(/[^\d]/g, '');
          
          const isMatch = (rowNIPStr === targetNipStr) ||
            (targetNipClean !== '' && rowNIPClean === targetNipClean) ||
            (targetNipPrefix.length >= 12 && rowNIPClean.length >= 12 && rowNIPClean.substring(0, 12) === targetNipPrefix);

          if (isMatch) {
            userRecord = {
              nip: rowNIPStr,
              nama: (colNama !== -1 && row[colNama]) ? row[colNama].toString() : '',
              role: (colRole !== -1 && row[colRole]) ? row[colRole].toString().trim() : 'Viewer',
              golongan: (colGol !== -1 && row[colGol]) ? row[colGol].toString() : '',
              jabatan: (colJab !== -1 && row[colJab]) ? row[colJab].toString() : '',
              satker: (colKode !== -1 && row[colKode]) ? row[colKode].toString().trim() : ''
            };
            break;
          }
        }
      }
    }
  }

  // 2. Jika ada di Pegawai, lengkapi atribut tambahan (golongan, jabatan, satker) atau fallback
  const pegSheet = ss.getSheetByName(SHEET_NAMES.PEGAWAI);
  if (pegSheet) {
    const pegData = pegSheet.getDataRange().getValues();
    if (pegData.length >= 2) {
      const pegHeader = pegData[0].map(h => h ? h.toString().trim().toUpperCase() : '');
      const pNipIdx = pegHeader.indexOf('NIP');
      const pNamaIdx = pegHeader.indexOf('NAMA');
      const pRoleIdx = pegHeader.indexOf('ROLE');
      const pGolIdx = pegHeader.indexOf('GOLONGAN');
      const pJabIdx = pegHeader.indexOf('JABATAN');
      const pKodeIdx = pegHeader.findIndex(h => h === 'KODE_SATKER' || h === 'KODESATKER' || h === 'SATKER' || h === 'UNITKERJA');
      
      if (pNipIdx !== -1) {
        for (let i = 1; i < pegData.length; i++) {
          const pRow = pegData[i];
          const pNipStr = pRow[pNipIdx] ? pRow[pNipIdx].toString().trim() : '';
          const pNipClean = pNipStr.replace(/[^\d]/g, '');
          
          const isMatch = (pNipStr === targetNipStr) ||
            (targetNipClean !== '' && pNipClean === targetNipClean) ||
            (targetNipPrefix.length >= 12 && pNipClean.length >= 12 && pNipClean.substring(0, 12) === targetNipPrefix);

          if (isMatch) {
            if (!userRecord) {
              userRecord = {
                nip: pNipStr,
                nama: (pNamaIdx !== -1 && pRow[pNamaIdx]) ? pRow[pNamaIdx].toString() : '',
                role: (pRoleIdx !== -1 && pRow[pRoleIdx]) ? pRow[pRoleIdx].toString().trim() : 'Viewer',
                golongan: (pGolIdx !== -1 && pRow[pGolIdx]) ? pRow[pGolIdx].toString() : '',
                jabatan: (pJabIdx !== -1 && pRow[pJabIdx]) ? pRow[pJabIdx].toString() : '',
                satker: (pKodeIdx !== -1 && pRow[pKodeIdx]) ? pRow[pKodeIdx].toString().trim() : ''
              };
            } else {
              if (!userRecord.golongan && pGolIdx !== -1 && pRow[pGolIdx]) userRecord.golongan = pRow[pGolIdx].toString();
              if (!userRecord.jabatan && pJabIdx !== -1 && pRow[pJabIdx]) userRecord.jabatan = pRow[pJabIdx].toString();
              if (!userRecord.satker && pKodeIdx !== -1 && pRow[pKodeIdx]) userRecord.satker = pRow[pKodeIdx].toString().trim();
            }
            break;
          }
        }
      }
    }
  }

  return userRecord;
}

// ======================= HELPER: SHEET DATA =======================
function getSheetData(sheetName) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return { sheet: null, data: [], header: [] };
    
    const rawData = sheet.getDataRange().getValues();
    if (!rawData || rawData.length === 0) return { sheet, data: [], header: [] };

    const header = rawData[0].map(h => h && h.toString ? h.toString().trim() : '');
    
    // Filter hanya baris yang memiliki setidaknya 1 sel bernilai (mengabaikan baris kosong total/whitespace)
    const data = rawData.filter((row, idx) => {
      if (idx === 0) return true; // Keep header row
      return row.some(cell => cell !== null && cell !== undefined && cell.toString().trim() !== '');
    });
      
    return { sheet, data, header };
  } catch(e) {
    console.error('Error getSheetData: ' + e.message);
    return { sheet: null, data: [], header: [] };
  }
}

function rowToObject(header, row) {
  const obj = {};
  header.forEach((h, i) => { 
    if (h) obj[h] = row[i] !== undefined ? row[i] : '';
  });
  return obj;
}

// ======================= HELPER: SYARAT AK =======================
function getSyaratAKFromReg(jabatan, golongan) {
  const match = (golongan || '').toString().trim().match(/[IVX]+\/[a-e]/i);
  const golClean = match ? match[0] : (golongan || '').toString().trim();
  for (const key in REGULASI) {
    const parts = key.split(' ');
    const gol = parts[parts.length - 1];
    const jenjang = parts.slice(0, parts.length - 1).join(' ');
    if (jabatan.includes(jenjang) && golClean === gol.trim()) {
      return REGULASI[key].akJab;
    }
  }
  return null;
}

function getMinSyaratAK(jabatan, golongan) {
  const match = (golongan || '').toString().trim().match(/[IVX]+\/[a-e]/i);
  const golClean = match ? match[0] : (golongan || '').toString().trim();
  for (const key in REGULASI) {
    const parts = key.split(' ');
    const gol = parts[parts.length - 1];
    const jenjang = parts.slice(0, parts.length - 1).join(' ');
    if (jabatan.includes(jenjang) && golClean === gol.trim()) {
      const info = REGULASI[key];
      const p = (info.akPang !== null && info.akPang !== undefined) ? info.akPang : 9999;
      const j = (info.akJab !== null && info.akJab !== undefined) ? info.akJab : 9999;
      const min = Math.min(p, j);
      return min === 9999 ? null : min;
    }
  }
  return null;
}

// ======================= FILTER BERDASARKAN ROLE & KODE SATKER =======================
function filterPegawaiByRole(allRows, session) {
  if (!allRows || !Array.isArray(allRows)) return [];
  if (!session) return allRows;

  if (session.role === 'Admin BPS Provinsi' || session.role === 'Superadmin') return allRows;

  if (session.satker && session.satker.toString().trim() !== '') {
    const targetSatker = session.satker.toString().trim();
    return allRows.filter(p => {
      const pSatker = (p.KodeSatker || p.Kode_Satker || p.satker || p.unitKerja || '').toString().trim();
      const pNip = (p.NIP || p.nip || '').toString().trim();
      if (session.role === 'Admin KabKot') {
        return pSatker === targetSatker;
      }
      if (session.role === 'Pegawai' || session.role === 'Viewer') {
        return pNip === session.nip || pSatker === targetSatker;
      }
      return pSatker === targetSatker;
    });
  }

  if (session.role === 'Admin KabKot') {
    return allRows.filter(p => {
      const pSatker = (p.KodeSatker || p.Kode_Satker || p.satker || p.unitKerja || '').toString().trim();
      return pSatker === session.satker;
    });
  }

  return allRows.filter(p => (p.NIP || p.nip || '').toString().trim() === session.nip);
}

// ======================= READ =======================
function handleGetAllPegawai(session) {
  const { data, header } = getSheetData(SHEET_NAMES.PEGAWAI);
  if (!data.length) return jsonResponse([]);

  const excludeColumns = ['PASSWORD', 'PASSWORDHASH', 'Password', 'password'];
  const safeHeader = header.filter(h => {
    if (!h) return false;
    return !excludeColumns.some(ex => ex.toUpperCase() === h.toUpperCase());
  });
  
  const colNIP = header.findIndex(h => h && h.toUpperCase() === 'NIP');
  if (colNIP === -1) return jsonResponse([]);
  
  const rows = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[colNIP]) continue;
    
    const obj = {};
    for (const h of safeHeader) {
      const idx = header.findIndex(headerH => headerH && headerH.toUpperCase() === h.toUpperCase());
      if (idx !== -1 && row[idx] !== undefined && row[idx] !== null) {
        obj[h] = row[idx];
      } else {
        obj[h] = '';
      }
    }
    if (obj['TMT Jabatan'] !== undefined && obj.TMTJabatan === undefined) obj.TMTJabatan = obj['TMT Jabatan'];
    if (obj['TMT Golongan'] !== undefined && obj.TMTGolongan === undefined) obj.TMTGolongan = obj['TMT Golongan'];
    if (obj.TMTJabatan && obj['TMT Jabatan'] === undefined) obj['TMT Jabatan'] = obj.TMTJabatan;
    if (obj.TMTGolongan && obj['TMT Golongan'] === undefined) obj['TMT Golongan'] = obj.TMTGolongan;
    if (obj.TMT === undefined || obj.TMT === '') obj.TMT = obj.TMTGolongan || obj.TMTJabatan || '';
    rows.push(obj);
  }

  return jsonResponse(filterPegawaiByRole(rows, session));
}

function handleGetPegawai(targetNip, session) {
  if (!targetNip) return errorResponse('NIP target wajib diisi.');
  if (session.role === 'Viewer' && session.nip !== targetNip) {
    return errorResponse('Tidak memiliki akses ke data pegawai lain.', 403);
  }

  const { data, header } = getSheetData(SHEET_NAMES.PEGAWAI);
  if (!data.length) return errorResponse('Data pegawai tidak ditemukan.', 404);
  
  const colNIP = header.findIndex(h => h && h.toUpperCase() === 'NIP');
  const colKode = header.findIndex(h => h && h.toUpperCase() === 'KODESATKER');
  
  if (colNIP === -1) return errorResponse('Kolom NIP tidak ditemukan.', 404);
  
  const excludeColumns = ['PASSWORD', 'PASSWORDHASH', 'Password', 'password'];
  const safeHeader = header.filter(h => {
    if (!h) return false;
    return !excludeColumns.some(ex => ex.toUpperCase() === h.toUpperCase());
  });

  const targetNipStr = targetNip.toString().trim();
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowNIP = row[colNIP] ? row[colNIP].toString().trim() : '';
    
    if (rowNIP === targetNipStr) {
      if (session.role === 'Admin KabKot' && colKode !== -1) {
        const rowSatker = row[colKode] ? row[colKode].toString().trim() : '';
        if (rowSatker !== session.satker) {
          return errorResponse('Tidak memiliki akses ke pegawai satker lain.', 403);
        }
      }
      
      const obj = {};
      for (const h of safeHeader) {
        const idx = header.findIndex(headerH => headerH && headerH.toUpperCase() === h.toUpperCase());
        if (idx !== -1 && row[idx] !== undefined && row[idx] !== null) {
          obj[h] = row[idx];
        } else {
          obj[h] = '';
        }
      }
      if (obj['TMT Jabatan'] !== undefined && obj.TMTJabatan === undefined) obj.TMTJabatan = obj['TMT Jabatan'];
      if (obj['TMT Golongan'] !== undefined && obj.TMTGolongan === undefined) obj.TMTGolongan = obj['TMT Golongan'];
      if (obj.TMTJabatan && obj['TMT Jabatan'] === undefined) obj['TMT Jabatan'] = obj.TMTJabatan;
      if (obj.TMTGolongan && obj['TMT Golongan'] === undefined) obj['TMT Golongan'] = obj.TMTGolongan;
      if (obj.TMT === undefined || obj.TMT === '') obj.TMT = obj.TMTGolongan || obj.TMTJabatan || '';
      return jsonResponse(obj);
    }
  }
  return errorResponse('Pegawai tidak ditemukan.', 404);
}

// ======================= GET RIWAYAT AK TIMELINE (BARU) =======================
// Mengambil data AK per bulan dari sheet Riwayat_AK (kolom H = Jan 2026 s/d BO = Des 2030)
// untuk ditampilkan langsung di halaman Detail Pegawai sebagai data historis aktual
function handleGetRiwayatAKTimeline(targetNip, session) {
  if (!targetNip) return errorResponse('NIP target wajib diisi.');
  if (session.role === 'Viewer' && session.nip !== targetNip) {
    return errorResponse('Akses ditolak.', 403);
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetRiw = ss.getSheetByName(SHEET_NAMES.RIWAYAT);
  if (!sheetRiw) return errorResponse('Sheet Riwayat_AK tidak ditemukan.', 404);

  const lastRow = sheetRiw.getLastRow();
  const lastCol = sheetRiw.getLastColumn();
  if (lastRow < 2) return errorResponse('Data riwayat kosong.', 404);

  const allData = sheetRiw.getRange(1, 1, lastRow, Math.max(lastCol, 67)).getValues();
  const rawHeader = allData[0];

  // Kolom 1-7 = NIP, Nama, ..., AK 2025
  // Kolom 8 (index 7) = Jan 2026 ... Kolom 67 (index 66) = Des 2030
  const PROJ_START_IDX = 7;
  const PROJ_COUNT = 60;

  const colNIP = rawHeader.findIndex(h => h && h.toString().trim().toUpperCase() === 'NIP');
  if (colNIP === -1) return errorResponse('Kolom NIP tidak ditemukan.', 404);

  const targetStr = targetNip ? targetNip.toString().trim() : '';
  const targetClean = targetStr.replace(/[^\d]/g, '');

  if (session && session.role === 'Viewer') {
    const sessionNipClean = (session.nip || '').toString().trim().replace(/[^\d]/g, '');
    if (sessionNipClean !== targetClean && session.nip !== targetStr) {
      return errorResponse('Akses ditolak.', 403);
    }
  }

  let rowFound = null;
  for (let i = 1; i < allData.length; i++) {
    const cellVal = allData[i][colNIP] ? allData[i][colNIP].toString().trim() : '';
    const cellClean = cellVal.replace(/[^\d]/g, '');
    if ((targetClean !== '' && cellClean === targetClean) || cellVal === targetStr) {
      rowFound = allData[i];
      break;
    }
  }
  if (!rowFound) return errorResponse('Data riwayat tidak ditemukan untuk NIP tersebut.', 404);

  // Baca data pegawai untuk info jabatan & golongan
  const { data: dataPeg, header: headerPeg } = getSheetData(SHEET_NAMES.PEGAWAI);
  const colNIPPeg = headerPeg.findIndex(h => h && h.toUpperCase() === 'NIP');
  const colGolPeg = headerPeg.findIndex(h => h && h.toUpperCase() === 'GOLONGAN');
  const colJabPeg = headerPeg.findIndex(h => h && h.toUpperCase() === 'JABATAN');
  let jabatan = '', golongan = '';
  if (dataPeg && dataPeg.length > 1) {
    for (let i = 1; i < dataPeg.length; i++) {
      const cellVal = dataPeg[i][colNIPPeg] ? dataPeg[i][colNIPPeg].toString().trim() : '';
      const cellClean = cellVal.replace(/[^\d]/g, '');
      if ((targetClean !== '' && cellClean === targetClean) || cellVal === targetStr) {
        jabatan  = colJabPeg !== -1 ? dataPeg[i][colJabPeg].toString() : '';
        golongan = colGolPeg !== -1 ? dataPeg[i][colGolPeg].toString() : '';
        break;
      }
    }
  }

  const golMatch = (golongan || '').toString().trim().match(/[IVX]+\/[a-e]/i);
  const golClean = golMatch ? golMatch[0] : (golongan || '').toString().trim();

  // Bangun array proyeksi dari data aktual sheet
  const syaratJab = getSyaratAKFromReg(jabatan, golClean);

  // Tentukan syarat kenaikan pangkat dari REGULASI
  let syaratPang = null;
  const keyReg = Object.keys(REGULASI).find(k => {
    const parts = k.split(' ');
    const gol = parts[parts.length - 1];
    const jenj = parts.slice(0, parts.length - 1).join(' ');
    return jabatan.includes(jenj) && golClean === gol.trim();
  });
  if (keyReg) syaratPang = REGULASI[keyReg].akPang;

  const { data: dataInput, header: headerInput } = getSheetData(SHEET_NAMES.INPUT_KINERJA);
  const colNIPInput = headerInput ? headerInput.indexOf('NIP') : -1;
  let predikatList = [];
  if (dataInput && colNIPInput !== -1) {
    for (let i = 1; i < dataInput.length; i++) {
      const cellVal = dataInput[i][colNIPInput] ? dataInput[i][colNIPInput].toString().trim() : '';
      const cellClean = cellVal.replace(/[^\d]/g, '');
      if ((targetClean !== '' && cellClean === targetClean) || cellVal === targetStr) {
        predikatList = dataInput[i].slice(2);
        break;
      }
    }
  }

  const projections = [];
  for (let m = 0; m < PROJ_COUNT; m++) {
    const colIdx = PROJ_START_IDX + m;
    const akVal = parseFloat(rowFound[colIdx]) || 0;
    const year  = 2026 + Math.floor(m / 12);
    const month = (m % 12) + 1;

    let status = 'Normal';
    if (syaratJab !== null && akVal >= syaratJab) status = 'Layak Naik Jabatan';
    else if (syaratPang !== null && akVal >= syaratPang) status = 'Layak Naik Pangkat';

    const rawPred = (predikatList[m] !== undefined && predikatList[m] !== null) ? predikatList[m].toString().trim() : '';
    const hasInput = rawPred !== '' && rawPred !== '-' && rawPred !== '—';
    const predikat = hasInput ? rawPred : 'Baik';
    const isDefault = !hasInput;

    projections.push({ month, year, akKumulatif: akVal, status, predikat, rawPredikat: rawPred, isDefault });
  }

  // Dasar AK (kolom ke-7, index 6 = AK 2025)
  const ak2025 = parseFloat(rowFound[6]) || 0;

  // Cari perkiraan bulan layak dari data aktual
  let bulanLayak = '> Des 2030';
  let matchedTargetAK = syaratJab;
  let targetLabel = '-';

  for (const p of projections) {
    if (p.status !== 'Normal') {
      bulanLayak = `${p.month}/${p.year}`;
      if (p.status === 'Layak Naik Pangkat') {
        matchedTargetAK = syaratPang;
        targetLabel = keyReg ? (REGULASI[keyReg].nextPang || REGULASI[keyReg].next || '-') : '-';
      } else {
        matchedTargetAK = syaratJab;
        targetLabel = keyReg ? (REGULASI[keyReg].nextJab || REGULASI[keyReg].next || '-') : '-';
      }
      break;
    }
  }

  if (bulanLayak === '> Des 2030') {
    const p = syaratPang !== null ? syaratPang : 9999;
    const j = syaratJab !== null ? syaratJab : 9999;
    const min = Math.min(p, j);
    matchedTargetAK = min === 9999 ? '-' : min;
    if (keyReg) {
      targetLabel = min === syaratPang ? (REGULASI[keyReg].nextPang || '-') : (REGULASI[keyReg].nextJab || '-');
    }
  }

  return jsonResponse({
    success: true,
    nip: targetStr,
    jabatan,
    golongan,
    ak2025,
    targetAK: matchedTargetAK || '-',
    targetAKPang: syaratPang || '-',
    targetJabatan: targetLabel,
    bulanLayak,
    totalAKAkhir: projections[59]?.akKumulatif || ak2025,
    projections
  });
}

// ======================= GET ALL RIWAYAT AK =======================
function handleGetAllRiwayatAK(session) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetRiw = ss.getSheetByName(SHEET_NAMES.RIWAYAT);
  if (!sheetRiw) return jsonResponse([]);

  const lastRow = sheetRiw.getLastRow();
  const lastCol = sheetRiw.getLastColumn();
  if (lastRow < 2) return jsonResponse([]);

  const allData   = sheetRiw.getRange(1, 1, lastRow, lastCol).getValues();
  const rawHeader = allData[0];

  const PROJ_START_IDX = 7;
  const PROJ_COUNT     = 60;

  const BULAN_LABEL = [];
  for (let m = 0; m < PROJ_COUNT; m++) {
    BULAN_LABEL.push({
      bulan: (m % 12) + 1,
      tahun: 2026 + Math.floor(m / 12)
    });
  }

  const { data: dataPeg, header: headerPeg } = getSheetData(SHEET_NAMES.PEGAWAI);
  const colNIPPeg  = headerPeg.findIndex(h => h && h.toUpperCase() === 'NIP');
  const colGolPeg  = headerPeg.findIndex(h => h && h.toUpperCase() === 'GOLONGAN');
  const colJabPeg  = headerPeg.findIndex(h => h && h.toUpperCase() === 'JABATAN');
  const colKodePeg = headerPeg.findIndex(h => h && h.toUpperCase() === 'KODESATKER');
  const colStatusPeg = headerPeg.findIndex(h => h && h.toUpperCase() === 'STATUS');

  const { data: dataInput, header: headerInput } = getSheetData(SHEET_NAMES.INPUT_KINERJA);
  const colNIPInput = headerInput.indexOf('NIP');
  const mapInputKinerja = {};
  for (let j = 1; j < dataInput.length; j++) {
    const nipStr = dataInput[j][colNIPInput] ? dataInput[j][colNIPInput].toString().trim() : '';
    if (nipStr) {
      mapInputKinerja[nipStr] = dataInput[j];
    }
  }

  const mapPegawai = {};
  for (let i = 1; i < dataPeg.length; i++) {
    const nipStr = dataPeg[i][colNIPPeg] ? dataPeg[i][colNIPPeg].toString().trim() : '';
    if (nipStr) {
      mapPegawai[nipStr] = {
        jabatan:    colJabPeg    !== -1 ? dataPeg[i][colJabPeg].toString()    : '',
        golongan:   colGolPeg    !== -1 ? dataPeg[i][colGolPeg].toString()    : '',
        KodeSatker: colKodePeg   !== -1 ? dataPeg[i][colKodePeg].toString().trim() : '',
        status:     colStatusPeg !== -1 ? dataPeg[i][colStatusPeg].toString() : ''
      };
    }
  }

  const baseHeader = rawHeader.slice(0, PROJ_START_IDX).map(h => h ? h.toString().trim() : '');

  const result = [];
  for (let i = 1; i < allData.length; i++) {
    const row = allData[i];
    if (!row[0]) continue;

    const obj = {};
    baseHeader.forEach((h, idx) => {
      if (h) obj[h] = row[idx] !== undefined ? row[idx] : '';
    });

    const nip = (row[0] || '').toString().trim();
    const pegData = mapPegawai[nip] || {};
    const jabatan  = pegData.jabatan  || '';
    const golongan = pegData.golongan || '';

    // Skip PPPK
    if (String(pegData.status || '').toUpperCase() === 'PPPK') continue;

    obj.KodeSatker = pegData.KodeSatker || '';

    const syarat = getMinSyaratAK(jabatan, golongan);
    const ak2025 = parseFloat(row[6]) || 0;

    let bulanRekom = null;
    let tahunRekom = null;
    let sudahLayak = false;

    if (syarat !== null) {
      if (ak2025 >= syarat) {
        sudahLayak = true;
      } else {
        for (let m = 0; m < PROJ_COUNT; m++) {
          const colIdx = PROJ_START_IDX + m;
          if (colIdx >= row.length) break;
          const akProj = parseFloat(row[colIdx]) || 0;
          if (akProj >= syarat) {
            bulanRekom = BULAN_LABEL[m].bulan;
            tahunRekom = BULAN_LABEL[m].tahun;
            break;
          }
        }
      }
    }

    obj['AK 2025']  = ak2025;
    obj['AK 2026']  = row.length > 18 ? parseFloat(row[18]) || 0 : 0;
    obj['AK 2027']  = row.length > 30 ? parseFloat(row[30]) || 0 : 0;
    obj['AK 2028']  = row.length > 42 ? parseFloat(row[42]) || 0 : 0;
    obj['AK 2029']  = row.length > 54 ? parseFloat(row[54]) || 0 : 0;
    obj['AK 2030']  = row.length > 66 ? parseFloat(row[66]) || 0 : 0;

    const rowInput = mapInputKinerja[nip];
    for (let y = 2026; y <= 2030; y++) {
      const yData = getYearlyKinerjaData(rowInput, y);
      obj[y + '_BULAN'] = yData.bulan;
      obj[y + '_PREDIKAT'] = yData.predikat;
      obj[y + '_PERSENTASE'] = yData.persentase;
    }
    obj.bulanRekom  = bulanRekom;
    obj.tahunRekom  = tahunRekom;
    obj.sudahLayak  = sudahLayak;
    obj.jabatan     = jabatan;
    obj.golongan    = golongan;
    obj.status      = (row.length >= 69 && row[68] !== undefined) ? row[68].toString().trim() : '';

    result.push(obj);
  }

  const filtered = filterPegawaiByRole(result, session);
  return jsonResponse(filtered);
}

function handleGetSatker() {
  const { data, header } = getSheetData(SHEET_NAMES.SATKER);
  if (!data.length) return jsonResponse([]);
  const rows = data.slice(1)
    .filter(row => row[0])
    .map(row => rowToObject(header, row));
  return jsonResponse(rows);
}

function handleGetKategoriKinerja() {
  const { data, header } = getSheetData(SHEET_NAMES.KINERJA);
  if (!data.length) return jsonResponse([]);
  const rows = data.slice(1)
    .filter(row => row[0])
    .map(row => rowToObject(header, row));
  return jsonResponse(rows);
}

function handleGetAmbangPangkat() {
  const { data, header } = getSheetData(SHEET_NAMES.KENAIKAN);
  if (!data.length) return jsonResponse([]);
  const rows = data.slice(1)
    .filter(row => row[0])
    .map(row => rowToObject(header, row));
  return jsonResponse(rows);
}

function getYearlyKinerjaData(rowInput, Y) {
  if (!rowInput || rowInput.length < 62) {
    return { bulan: 0, predikat: '', persentase: '' };
  }
  const startIdx = 2 + (Y - 2026) * 12;
  let counts = {};
  let validMonths = 0;
  for (let m = 0; m < 12; m++) {
    if (startIdx + m >= rowInput.length) break;
    const val = rowInput[startIdx + m];
    const valStr = val !== undefined && val !== null ? val.toString().trim() : '';
    if (valStr !== '' && valStr !== '0' && valStr !== '-') {
      validMonths++;
      counts[valStr] = (counts[valStr] || 0) + 1;
    }
  }

  let dominantRating = '';
  let maxCount = 0;
  for (const key in counts) {
    if (counts[key] > maxCount) {
      maxCount = counts[key];
      dominantRating = key;
    }
  }

  const PREDIKAT_PERCENT_MAP = {
    'Sangat Baik': '150%',
    'Baik': '100%',
    'Cukup': '75%',
    'Cukup/Butuh Perbaikan': '75%',
    'Kurang': '50%',
    'Sangat Kurang': '25%'
  };
  const percentage = PREDIKAT_PERCENT_MAP[dominantRating] || '';

  return {
    bulan: validMonths,
    predikat: dominantRating,
    persentase: percentage
  };
}

function handleGetRiwayatAK(targetNip, session) {
  if (!targetNip) return errorResponse('NIP target wajib diisi.');
  if (session.role === 'Viewer' && session.nip !== targetNip) {
    return errorResponse('Akses ditolak.', 403);
  }

  const { data, header } = getSheetData(SHEET_NAMES.RIWAYAT);
  const colNIP = header.indexOf('NIP');

  for (let i = 1; i < data.length; i++) {
    if (data[i][colNIP].toString().trim() === targetNip.toString().trim()) {
      const row = data[i];
      const obj = rowToObject(header, row);
      
      const { data: dataInput, header: headerInput } = getSheetData(SHEET_NAMES.INPUT_KINERJA);
      const colNIPInput = headerInput.indexOf('NIP');
      let rowInput = null;
      for (let j = 1; j < dataInput.length; j++) {
        if (dataInput[j][colNIPInput] && dataInput[j][colNIPInput].toString().trim() === targetNip.toString().trim()) {
          rowInput = dataInput[j];
          break;
        }
      }

      obj['AK 2025'] = row.length > 6 ? parseFloat(row[6]) || 0 : 0;
      obj['AK 2026'] = row.length > 18 ? parseFloat(row[18]) || 0 : 0;
      obj['AK 2027'] = row.length > 30 ? parseFloat(row[30]) || 0 : 0;
      obj['AK 2028'] = row.length > 42 ? parseFloat(row[42]) || 0 : 0;
      obj['AK 2029'] = row.length > 54 ? parseFloat(row[54]) || 0 : 0;
      obj['AK 2030'] = row.length > 66 ? parseFloat(row[66]) || 0 : 0;

      for (let y = 2026; y <= 2030; y++) {
        const yData = getYearlyKinerjaData(rowInput, y);
        obj[y + '_BULAN'] = yData.bulan;
        obj[y + '_PREDIKAT'] = yData.predikat;
        obj[y + '_PERSENTASE'] = yData.persentase;
      }

      return jsonResponse(obj);
    }
  }
  return errorResponse('Data riwayat AK tidak ditemukan.', 404);
}

// ======================= PROYEKSI PER PEGAWAI =======================
function handleGetProyeksiFromSheet(targetNip, session) {
  if (!targetNip) return errorResponse('NIP target wajib diisi.');
  if (session.role === 'Viewer' && session.nip !== targetNip) {
    return errorResponse('Akses ditolak.', 403);
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetRiw = ss.getSheetByName(SHEET_NAMES.RIWAYAT);
  if (!sheetRiw) return errorResponse('Sheet Riwayat_AK tidak ditemukan.', 404);

  const lastRow = sheetRiw.getLastRow();
  const lastCol = sheetRiw.getLastColumn();
  if (lastRow < 2) return errorResponse('Data riwayat kosong.', 404);

  const allData   = sheetRiw.getRange(1, 1, lastRow, lastCol).getValues();
  const rawHeader = allData[0];

  const PROJ_START_IDX = 7;
  const PROJ_COUNT     = 60;

  const colNIP = rawHeader.findIndex(h => h && h.toString().trim().toUpperCase() === 'NIP');
  if (colNIP === -1) return errorResponse('Kolom NIP tidak ditemukan.', 404);

  const targetStr = targetNip.toString().trim();
  let rowFound = null;
  for (let i = 1; i < allData.length; i++) {
    if (allData[i][colNIP] && allData[i][colNIP].toString().trim() === targetStr) {
      rowFound = allData[i];
      break;
    }
  }
  if (!rowFound) return errorResponse('Data riwayat untuk NIP tersebut tidak ditemukan.', 404);

  const { data: dataPeg, header: headerPeg } = getSheetData(SHEET_NAMES.PEGAWAI);
  const colNIPPeg = headerPeg.findIndex(h => h && h.toUpperCase() === 'NIP');
  const colGolPeg = headerPeg.findIndex(h => h && h.toUpperCase() === 'GOLONGAN');
  const colJabPeg = headerPeg.findIndex(h => h && h.toUpperCase() === 'JABATAN');
  let jabatan = '', golongan = '';
  for (let i = 1; i < dataPeg.length; i++) {
    if (dataPeg[i][colNIPPeg] && dataPeg[i][colNIPPeg].toString().trim() === targetStr) {
      jabatan  = colJabPeg !== -1 ? dataPeg[i][colJabPeg].toString() : '';
      golongan = colGolPeg !== -1 ? dataPeg[i][colGolPeg].toString() : '';
      break;
    }
  }

  const golMatch = (golongan || '').toString().trim().match(/[IVX]+\/[a-e]/i);
  const golClean = golMatch ? golMatch[0] : (golongan || '').toString().trim();

  const syarat = getSyaratAKFromReg(jabatan, golClean);
  const projections = [];
  for (let m = 0; m < PROJ_COUNT; m++) {
    const colIdx = PROJ_START_IDX + m;
    const akKumulatif = parseFloat(rowFound[colIdx]) || 0;
    const year  = 2026 + Math.floor(m / 12);
    const month = (m % 12) + 1;
    const isLayak = syarat !== null && akKumulatif >= syarat;
    projections.push({ month, year, akKumulatif, status: isLayak ? '\xe2\xad\x90 Layak Naik Pangkat' : 'Normal' });
  }

  let bulanLayak = '> Des 2030';
  for (const p of projections) {
    if (p.status.includes('Layak')) { bulanLayak = `${p.month}/${p.year}`; break; }
  }

  const keyReg = Object.keys(REGULASI).find(k => {
    const parts = k.split(' ');
    const gol = parts[parts.length - 1];
    const jenj = parts.slice(0, parts.length - 1).join(' ');
    return jabatan.includes(jenj) && golClean === gol.trim();
  });
  const targetJabatan = keyReg ? REGULASI[keyReg].next : '-';

  return jsonResponse({
    success: true,
    nip: targetStr,
    jabatan,
    golongan,
    targetAK: syarat || '-',
    targetJabatan,
    bulanLayak,
    totalAKAkhir: projections[59]?.akKumulatif || 0,
    projections
  });
}

function handleGetProyeksi(targetNip, scenario, session) {
  if (!targetNip) return errorResponse('NIP target wajib diisi.');
  if (session.role === 'Viewer' && session.nip !== targetNip) {
    return errorResponse('Akses ditolak.', 403);
  }

  const scenarioFactor = scenario === 'Optimis' ? 1.5 : scenario === 'Pesimis' ? 0.75 : 1.0;

  const { data: dataPeg, header: headerPeg } = getSheetData(SHEET_NAMES.PEGAWAI);
  const colNIPPeg = headerPeg.indexOf('NIP');
  const colGol    = headerPeg.indexOf('Golongan');
  const colJab    = headerPeg.indexOf('Jabatan');

  const targetNipStr = targetNip.toString().trim();
  const targetNipClean = targetNipStr.replace(/[^\d]/g, '');

  let golongan = '', jabatan = '';
  for (let i = 1; i < dataPeg.length; i++) {
    const rowNIPStr = dataPeg[i][colNIPPeg] ? dataPeg[i][colNIPPeg].toString().trim() : '';
    const rowNIPClean = rowNIPStr.replace(/[^\d]/g, '');
    if ((targetNipClean !== '' && rowNIPClean === targetNipClean) || rowNIPStr === targetNipStr) {
      golongan = dataPeg[i][colGol] ? dataPeg[i][colGol].toString() : '';
      jabatan  = dataPeg[i][colJab] ? dataPeg[i][colJab].toString() : '';
      break;
    }
  }
  if (!jabatan) return errorResponse('Data pegawai tidak ditemukan.', 404);

  const { data: dataRiw, header: headerRiw } = getSheetData(SHEET_NAMES.RIWAYAT);
  const colNIPRiw = headerRiw.indexOf('NIP');
  const colAK2025 = headerRiw.indexOf('AK 2025');

  let akDasar = 0;
  for (let i = 1; i < dataRiw.length; i++) {
    const rowRiwNIPStr = dataRiw[i][colNIPRiw] ? dataRiw[i][colNIPRiw].toString().trim() : '';
    const rowRiwNIPClean = rowRiwNIPStr.replace(/[^\d]/g, '');
    if ((targetNipClean !== '' && rowRiwNIPClean === targetNipClean) || rowRiwNIPStr === targetNipStr) {
      akDasar = parseFloat(dataRiw[i][colAK2025]) || 0;
      break;
    }
  }

  const { data: dataKat, header: headerKat } = getSheetData(SHEET_NAMES.KINERJA);
  const mapFaktor = {};
  dataKat.slice(1).forEach(row => {
    if (row[0]) mapFaktor[row[0].toString().trim()] = parseFloat(row[1]) || 1.0;
  });

  const { data: dataInput, header: headerInput } = getSheetData(SHEET_NAMES.INPUT_KINERJA);
  const colNIPInput = headerInput.indexOf('NIP');
  let predikatList = [];
  for (let i = 1; i < dataInput.length; i++) {
    if (dataInput[i][colNIPInput].toString().trim() === targetNip.toString().trim()) {
      predikatList = dataInput[i].slice(2);
      break;
    }
  }

  let jenjang = '';
  for (let key in KOEFISIEN) {
    if (jabatan.includes(key)) { jenjang = key; break; }
  }
  const koefDasar = KOEFISIEN[jenjang] || 0;

  const keyReg = `${jenjang} ${golongan}`.trim();
  const info   = REGULASI[keyReg];

  const syaratJab  = (info && info.akJab !== null && info.akJab !== undefined) ? info.akJab : null;
  const syaratPang = (info && info.akPang !== null && info.akPang !== undefined) ? info.akPang : null;

  const startYear  = 2026;
  const projections = [];
  let totalAK = akDasar;
  let bulanLulus = null;

  for (let m = 0; m < 60; m++) {
    const year  = startYear + Math.floor(m / 12);
    const month = (m % 12) + 1;
    const predikat  = (predikatList[m] || 'Baik').toString().trim();
    const faktor    = (mapFaktor[predikat] || 1.0) * scenarioFactor;
    const akBulanan = (koefDasar * faktor) / 12;
    totalAK += akBulanan;
    const akFix = Math.round(totalAK * 1000) / 1000;

    let status = 'Normal';
    if (bulanLulus) {
      status = 'Sudah Layak';
    } else if (syaratJab !== null && akFix >= syaratJab) {
      status = '⭐ Layak Naik Jabatan';
      bulanLulus = { year, month, type: 'Jabatan' };
    } else if (syaratPang !== null && akFix >= syaratPang) {
      status = '⭐ Layak Naik Pangkat';
      bulanLulus = { year, month, type: 'Pangkat' };
    }

    projections.push({
      month,
      year,
      akBulanan: Math.round(akBulanan * 1000) / 1000,
      akKumulatif: akFix,
      predikat,
      status
    });
  }

  let matchedTargetAK = syaratJab || '-';
  let targetLabel = '-';
  if (bulanLulus) {
    if (bulanLulus.type === 'Pangkat') {
      matchedTargetAK = syaratPang;
      targetLabel = info ? (info.nextPang || info.next || '-') : '-';
    } else {
      matchedTargetAK = syaratJab;
      targetLabel = info ? (info.nextJab || info.next || '-') : '-';
    }
  } else {
    const p = syaratPang !== null ? syaratPang : 9999;
    const j = syaratJab !== null ? syaratJab : 9999;
    const min = Math.min(p, j);
    matchedTargetAK = min === 9999 ? '-' : min;
    if (info) {
      targetLabel = min === syaratPang ? (info.nextPang || '-') : (info.nextJab || '-');
    }
  }

  return jsonResponse({
    success:       true,
    nip:           targetNip,
    jabatan,
    golongan,
    scenario,
    targetAK:      matchedTargetAK,
    targetJabatan: targetLabel,
    bulanLayak:    bulanLulus ? `${bulanLulus.month}/${bulanLulus.year}` : '> 60 bulan',
    totalAKAkhir:  projections[59]?.akKumulatif || akDasar,
    projections
  });
}

// ======================= REKOMENDASI (batch) =======================
function handleGetRekomendasi(session) {
  try { hitungProyeksiAK(); } catch(e) { }

  const { data, header } = getSheetData(SHEET_NAMES.RIWAYAT);
  if (!data.length) return jsonResponse([]);

  const { data: dataPeg, header: headerPeg } = getSheetData(SHEET_NAMES.PEGAWAI);
  const colNIPPeg  = headerPeg.indexOf('NIP');
  const colKodePeg = headerPeg.indexOf('KodeSatker');
  const mapSatker  = {};
  dataPeg.slice(1).forEach(row => {
    if (row[colNIPPeg]) mapSatker[row[colNIPPeg].toString().trim()] = row[colKodePeg].toString().trim();
  });

  const colNIP   = header.indexOf('NIP');
  const colNama  = header.indexOf('Nama');
  const colRekom = header.length - 1;

  const hasil = data.slice(1)
    .filter(row => row[colNIP])
    .map(row => ({
      nip:         row[colNIP].toString().trim(),
      nama:        row[colNama].toString(),
      rekomendasi: row[colRekom].toString(),
      satker:      mapSatker[row[colNIP].toString().trim()] || ''
    }));

  const filtered = filterPegawaiByRole(
    hasil.map(h => ({ ...h, KodeSatker: h.satker, NIP: h.nip })),
    session
  ).map(h => ({ nip: h.nip, nama: h.nama, rekomendasi: h.rekomendasi }));

  return jsonResponse(filtered);
}

// ======================= CREATE =======================
function handleCreatePegawai(payload, session) {
  if (session.role === 'Viewer') return errorResponse('Viewer tidak dapat menambah data.', 403);
  
  if (session.role === 'Admin KabKot' && payload.KodeSatker !== session.satker) {
    return errorResponse('Hanya dapat menambah pegawai di satker sendiri.', 403);
  }

  if (!payload.KodeSatker) {
    return errorResponse('Kode Satker wajib diisi.');
  }

  const satkerSheetInfo = getSheetData(SHEET_NAMES.SATKER || 'Satker');
  if (!satkerSheetInfo || !satkerSheetInfo.sheet) {
    return errorResponse('Sheet referensi Satker tidak ditemukan.');
  }

  const headerSatker = satkerSheetInfo.header;
  const dataSatker = satkerSheetInfo.data;
  
  const colKodeRef = headerSatker.findIndex(h => h.toLowerCase().includes('kode'));
  const colNamaRef = headerSatker.findIndex(h => h.toLowerCase().includes('satker') && !h.toLowerCase().includes('kode'));

  if (colKodeRef === -1 || colNamaRef === -1) {
    return errorResponse('Struktur kolom pada Sheet Satker tidak sesuai.');
  }

  let namaSatkerDitemukan = '';
  for (let j = 1; j < dataSatker.length; j++) {
    if (dataSatker[j][colKodeRef] && dataSatker[j][colKodeRef].toString().trim() === payload.KodeSatker.toString().trim()) {
      namaSatkerDitemukan = dataSatker[j][colNamaRef];
      break;
    }
  }

  if (!namaSatkerDitemukan) {
    return errorResponse(`Kode Satker [${payload.KodeSatker}] tidak terdaftar di master data Satker.`, 404);
  }

  payload.Satker = namaSatkerDitemukan;

  const { sheet, data, header } = getSheetData(SHEET_NAMES.PEGAWAI);
  if (!sheet) return errorResponse('Sheet Pegawai tidak ditemukan.');

  const colNIP = header.indexOf('NIP');
  for (let i = 1; i < data.length; i++) {
    if (data[i][colNIP] && data[i][colNIP].toString().trim() === payload.NIP.toString().trim()) {
      return errorResponse('NIP sudah terdaftar. NIP harus unik.', 409);
    }
  }

  // Validasi field wajib (Semua field wajib diisi kecuali: TMT Jabatan, TMT Golongan, Role, Password, Data Riwayat AK Historis)
  const wajib = ['NIP', 'Nama', 'Pangkat', 'Golongan', 'Jabatan', 'KodeSatker', 'Status', 'JenisKelamin', 'NoSeriKARPEG'];
  for (const f of wajib) {
    if (!payload[f] || payload[f].toString().trim() === '') {
      return errorResponse(`Field ${f} wajib diisi.`);
    }
  }
  const ttlVal = payload.TempatTanggalLahir || (payload.TempatLahir && payload.TanggalLahir ? `${payload.TempatLahir}, ${payload.TanggalLahir}` : '');
  if (!ttlVal || ttlVal.toString().trim() === '') {
    return errorResponse('Tempat dan Tanggal Lahir wajib diisi.');
  }
  payload.TempatTanggalLahir = ttlVal;

  // Hak Akses: Field Role dan Password hanya dapat dikelola oleh Admin BPS Provinsi
  const isAdminProv = (session.role === 'Admin BPS Provinsi');
  if (!isAdminProv) {
    payload.Role = '';
    payload.Password = '';
    payload.PasswordHash = '';
  }

  // Jika role adalah 'Viewer' atau 'Tanpa Akun', ubah menjadi '' (Tanpa Akun)
  if (payload.Role === 'Viewer' || payload.Role === 'Tanpa Akun') payload.Role = '';

  let colPassword = header.indexOf('Password');
  if (colPassword === -1) colPassword = header.indexOf('PASSWORD');
  if (colPassword === -1) colPassword = header.indexOf('password');
  
  const hasRole = isAdminProv && payload.Role && payload.Role.toString().trim() !== '';
  const plainPw = hasRole ? (payload.Password || payload.NIP.toString()) : '';
  const hashedPw = plainPw ? sha256Hex(plainPw) : '';
  
  if (colPassword !== -1) {
    payload.Password = hashedPw;
  } else {
    payload.PasswordHash = hashedPw;
  }
  
  delete payload.PasswordConfirm;

  const newRow = header.map(h => {
    if (payload[h] !== undefined) return payload[h];
    const hClean = h.toString().trim().replace(/[\s_]+/g, '').toUpperCase();
    if (hClean === 'TMTJABATAN') return payload.TMTJabatan !== undefined ? payload.TMTJabatan : (payload['TMT Jabatan'] !== undefined ? payload['TMT Jabatan'] : (payload.TMT || ''));
    if (hClean === 'TMTGOLONGAN') return payload.TMTGolongan !== undefined ? payload.TMTGolongan : (payload['TMT Golongan'] !== undefined ? payload['TMT Golongan'] : (payload.TMT || ''));
    for (const key of Object.keys(payload)) {
      if (key.replace(/[\s_]+/g, '').toUpperCase() === hClean) return payload[key];
    }
    return '';
  });
  sheet.appendRow(newRow);

  if (hasRole) {
    try {
      syncUserToSheet(payload.NIP, payload.Nama, payload.Role, plainPw, payload.KodeSatker);
    } catch(e) {
      console.warn('[syncUserToSheet] Gagal: ' + e.message);
    }
  }

  // =====================================================================
  // AUTO-CREATE ROW DI RIWAYAT_AK & INPUT_KINERJA UNTUK PEGAWAI BARU
  // =====================================================================
  try {
    autoCreateRiwayatAKRow(payload.NIP, payload.Nama, payload);
  } catch(e) {
    console.warn('[autoCreateRiwayatAK] Gagal: ' + e.message);
  }

  try {
    autoCreateInputKinerjaRow(payload.NIP, payload.Nama);
  } catch(e) {
    console.warn('[autoCreateInputKinerja] Gagal: ' + e.message);
  }
  // =====================================================================

  return jsonResponse({ success: true, message: 'Pegawai berhasil ditambahkan.', nip: payload.NIP });
}

// =====================================================================
// FUNGSI HELPER: AUTO-CREATE ROW DI RIWAYAT_AK
// Membuat baris baru untuk pegawai baru di sheet Riwayat_AK dengan
// nilai awal AK (AK 2022-2025 default "-") dan dukungan Input AK Terakhir
// =====================================================================
function autoCreateRiwayatAKRow(nip, nama, extraPayload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.RIWAYAT);
  if (!sheet) throw new Error('Sheet Riwayat_AK tidak ditemukan');

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 1) throw new Error('Sheet Riwayat_AK kosong, tidak ada header');

  // Cek apakah NIP sudah ada di sheet
  if (lastRow >= 2) {
    const nipCol = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < nipCol.length; i++) {
      if (nipCol[i][0] && nipCol[i][0].toString().trim() === nip.toString().trim()) {
        return;
      }
    }
  }

  const header = sheet.getRange(1, 1, 1, Math.max(lastCol, 67)).getValues()[0];
  const totalCols = Math.max(lastCol, 67);

  const payload = extraPayload || {};
  const ak2022Val = (payload.ak2022 !== undefined && payload.ak2022 !== null && payload.ak2022.toString().trim() !== '') ? payload.ak2022.toString().trim() : '-';
  const pakIntegrasi2022Val = (payload.pakIntegrasi2022 !== undefined && payload.pakIntegrasi2022 !== null && payload.pakIntegrasi2022.toString().trim() !== '') ? payload.pakIntegrasi2022.toString().trim() : '-';
  const pakKonversi2023Val = (payload.pakKonversi2023 !== undefined && payload.pakKonversi2023 !== null && payload.pakKonversi2023.toString().trim() !== '') ? payload.pakKonversi2023.toString().trim() : '-';
  const ak2024Val = (payload.ak2024 !== undefined && payload.ak2024 !== null && payload.ak2024.toString().trim() !== '') ? payload.ak2024.toString().trim() : '-';
  const ak2025Val = (payload.ak2025 !== undefined && payload.ak2025 !== null && payload.ak2025.toString().trim() !== '') ? payload.ak2025.toString().trim() : '-';

  const newRow = [];
  for (let c = 0; c < totalCols; c++) {
    const h = header[c] ? header[c].toString().trim() : '';
    const hUpper = h.toUpperCase();

    if (c === 0 || hUpper === 'NIP') {
      newRow.push(nip);
    } else if (c === 1 || hUpper === 'NAMA') {
      newRow.push(nama);
    } else if (c === 2 || hUpper === 'AK 2022') {
      newRow.push(ak2022Val);
    } else if (c === 3 || hUpper.includes('INTEGRASI')) {
      newRow.push(pakIntegrasi2022Val);
    } else if (c === 4 || hUpper.includes('KONVERSI')) {
      newRow.push(pakKonversi2023Val);
    } else if (c === 5 || hUpper === 'AK 2024') {
      newRow.push(ak2024Val);
    } else if (c === 6 || hUpper === 'AK 2025') {
      newRow.push(ak2025Val);
    } else if (c >= 7 && c < 67) {
      newRow.push(0);
    } else {
      newRow.push('');
    }
  }

  // Jika "Input AK Terakhir" diaktifkan dan ada pilihan bulan-tahun & nilai AK Terakhir
  if (payload.enableAKTerakhir && payload.bulanTahunAKTerakhir && payload.nilaiAKTerakhir !== undefined && payload.nilaiAKTerakhir !== '') {
    const targetBulanTahun = payload.bulanTahunAKTerakhir.toString().trim();
    const nilaiAK = parseFloat(payload.nilaiAKTerakhir) || 0;

    const tz = ss.getSpreadsheetTimeZone();
    for (let c = 7; c < totalCols; c++) {
      const h = header[c];
      const hStr = h instanceof Date
        ? Utilities.formatDate(h, tz, 'MMMM yyyy')
        : (h ? h.toString().trim() : '');
      if (hStr.toLowerCase() === targetBulanTahun.toLowerCase()) {
        newRow[c] = nilaiAK;
        break;
      }
    }
  }

  sheet.appendRow(newRow);

  try { hitungProyeksiAK(); } catch(e) { console.warn('[autoCreateRiwayatAK] hitungProyeksiAK warn: ' + e.message); }
}

// =====================================================================
// FUNGSI HELPER: AUTO-CREATE ROW DI INPUT_KINERJA
// Membuat baris baru untuk pegawai baru di sheet Input_Kinerja dengan
// nilai awal 'Baik' di semua kolom bulan (Jan 2026\xe2\x80\x93Des 2030)
// =====================================================================
function autoCreateInputKinerjaRow(nip, nama) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.INPUT_KINERJA);
  if (!sheet) throw new Error('Sheet Input_Kinerja tidak ditemukan');

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 1) throw new Error('Sheet Input_Kinerja kosong, tidak ada header');

  // Cek apakah NIP sudah ada di sheet
  if (lastRow >= 2) {
    const nipCol = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < nipCol.length; i++) {
      if (nipCol[i][0] && nipCol[i][0].toString().trim() === nip.toString().trim()) {
        return; // Sudah ada, skip
      }
    }
  }

  // Baca total kolom dari header
  const totalCols = Math.max(lastCol, 62); // minimal: NIP, Nama, + 60 bulan
  const newRow = [];
  for (let c = 0; c < totalCols; c++) {
    if (c === 0) {
      newRow.push(nip);
    } else if (c === 1) {
      newRow.push(nama);
    } else if (c >= 2 && c <= 8) {
      newRow.push('Baik'); // Jan 2026 – Jul 2026 diisi 'Baik'
    } else if (c >= 9 && c < 62) {
      newRow.push('-'); // Agu 2026 – Des 2030 distrip '-' dulu
    } else {
      newRow.push('');
    }
  }

  sheet.appendRow(newRow);
}

// ======================= UPDATE =======================
function handleUpdatePegawai(payload, session) {
  if (session.role === 'Viewer') return errorResponse('Viewer tidak dapat mengubah data.', 403);

  const { sheet, data, header } = getSheetData(SHEET_NAMES.PEGAWAI);
  if (!sheet) return errorResponse('Sheet Pegawai tidak ditemukan.');

  const colNIP  = header.indexOf('NIP');
  const colKode = header.indexOf('KodeSatker');

  for (let i = 1; i < data.length; i++) {
    if (data[i][colNIP].toString().trim() === payload.NIP.toString().trim()) {
      if (session.role === 'Admin KabKot' && data[i][colKode].toString().trim() !== session.satker) {
        return errorResponse('Tidak memiliki akses ke pegawai satker lain.', 403);
      }

      // Validasi field wajib jika field disertakan dalam payload
      const wajib = ['Nama', 'Pangkat', 'Golongan', 'Jabatan', 'KodeSatker', 'Status', 'JenisKelamin', 'NoSeriKARPEG'];
      for (const f of wajib) {
        if (payload[f] !== undefined && payload[f].toString().trim() === '') {
          return errorResponse(`Field ${f} wajib diisi.`);
        }
      }
      if (payload.TempatTanggalLahir !== undefined || (payload.TempatLahir !== undefined && payload.TanggalLahir !== undefined)) {
        const ttlVal = payload.TempatTanggalLahir || (payload.TempatLahir && payload.TanggalLahir ? `${payload.TempatLahir}, ${payload.TanggalLahir}` : '');
        if (!ttlVal || ttlVal.toString().trim() === '') {
          return errorResponse('Tempat dan Tanggal Lahir wajib diisi.');
        }
        payload.TempatTanggalLahir = ttlVal;
      }

      const rowNum = i + 1;

      // Hak Akses: Role dan Password hanya dapat dikelola oleh Admin BPS Provinsi
      const isAdminProv = (session.role === 'Admin BPS Provinsi');
      if (!isAdminProv) {
        delete payload.Role;
        delete payload.Password;
        delete payload.PasswordHash;
        delete payload.PASSWORD;
        delete payload.password;
      }

      // Jika role adalah 'Viewer' atau 'Tanpa Akun', ubah menjadi '' (Tanpa Akun)
      if (payload.Role === 'Viewer' || payload.Role === 'Tanpa Akun') payload.Role = '';

      header.forEach((h, colIdx) => {
        if (h === 'NIP') return;
        if (h === 'Password' || h === 'PASSWORD' || h === 'password') return;
        let valToSet = undefined;
        if (payload[h] !== undefined) {
          valToSet = payload[h];
        } else {
          const hClean = h.toString().trim().replace(/[\s_]+/g, '').toUpperCase();
          if (hClean === 'TMTJABATAN') valToSet = payload.TMTJabatan !== undefined ? payload.TMTJabatan : (payload['TMT Jabatan'] !== undefined ? payload['TMT Jabatan'] : payload.TMT);
          else if (hClean === 'TMTGOLONGAN') valToSet = payload.TMTGolongan !== undefined ? payload.TMTGolongan : (payload['TMT Golongan'] !== undefined ? payload['TMT Golongan'] : payload.TMT);
          else {
            for (const key of Object.keys(payload)) {
              if (key.replace(/[\s_]+/g, '').toUpperCase() === hClean) {
                valToSet = payload[key];
                break;
              }
            }
          }
        }
        if (valToSet !== undefined) {
          sheet.getRange(rowNum, colIdx + 1).setValue(valToSet);
        }
      });

      if (isAdminProv && payload.Password) {
        const newHash = sha256Hex(payload.Password);
        let colPassword = header.indexOf('Password');
        if (colPassword === -1) colPassword = header.indexOf('PASSWORD');
        if (colPassword === -1) colPassword = header.indexOf('password');
        if (colPassword !== -1) {
          sheet.getRange(rowNum, colPassword + 1).setValue(newHash);
        } else {
          const colHash = header.indexOf('PasswordHash');
          if (colHash !== -1) {
            sheet.getRange(rowNum, colHash + 1).setValue(newHash);
          }
        }
      }

      if (isAdminProv) {
        try {
          syncUserToSheet(payload.NIP, payload.Nama, payload.Role, payload.Password, payload.KodeSatker);
        } catch(e) {
          console.warn('[syncUserToSheet] Gagal: ' + e.message);
        }
      }

      // Update data di sheet Riwayat_AK (AK 2022-2025 dan Input AK Terakhir)
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheetRiw = ss.getSheetByName(SHEET_NAMES.RIWAYAT);
      if (sheetRiw) {
        const lastRowRiw = sheetRiw.getLastRow();
        const totalColRiw = Math.max(sheetRiw.getLastColumn(), 67);
        const riwData = sheetRiw.getRange(1, 1, lastRowRiw, totalColRiw).getValues();
        const riwHeader = riwData[0];
        const targetNipStr = payload.NIP.toString().trim();

        for (let r = 1; r < riwData.length; r++) {
          if (riwData[r][0] && riwData[r][0].toString().trim() === targetNipStr) {
            const rowRiwNum = r + 1;

            const setRiwValByHeader = (searchHeader, val) => {
              if (val === undefined || val === null) return;
              const cIdx = riwHeader.findIndex(h => h && h.toString().trim().toUpperCase().includes(searchHeader.toUpperCase()));
              if (cIdx !== -1) {
                sheetRiw.getRange(rowRiwNum, cIdx + 1).setValue(val.toString().trim() !== '' ? val : '-');
              }
            };

            if (payload.ak2022 !== undefined) setRiwValByHeader('AK 2022', payload.ak2022);
            if (payload.pakIntegrasi2022 !== undefined) setRiwValByHeader('INTEGRASI', payload.pakIntegrasi2022);
            if (payload.pakKonversi2023 !== undefined) setRiwValByHeader('KONVERSI', payload.pakKonversi2023);
            if (payload.ak2024 !== undefined) setRiwValByHeader('AK 2024', payload.ak2024);
            if (payload.ak2025 !== undefined) setRiwValByHeader('AK 2025', payload.ak2025);

            // Update AK Terakhir jika diaktifkan
            if (payload.enableAKTerakhir && payload.bulanTahunAKTerakhir && payload.nilaiAKTerakhir !== undefined && payload.nilaiAKTerakhir !== '') {
              const targetBulanTahun = payload.bulanTahunAKTerakhir.toString().trim();
              const nilaiAK = parseFloat(payload.nilaiAKTerakhir) || 0;
              const tz = ss.getSpreadsheetTimeZone();

              for (let c = 7; c < totalColRiw; c++) {
                const h = riwHeader[c];
                const hStr = h instanceof Date
                  ? Utilities.formatDate(h, tz, 'MMMM yyyy')
                  : (h ? h.toString().trim() : '');
                if (hStr.toLowerCase() === targetBulanTahun.toLowerCase()) {
                  sheetRiw.getRange(rowRiwNum, c + 1).setValue(nilaiAK);
                  break;
                }
              }
            }

            // Update Status Aksi (Kolom 69 / BQ)
            if (payload.statusAksi !== undefined) {
              if (sheetRiw.getLastColumn() < 69) {
                sheetRiw.getRange(1, 69).setValue('Status');
              } else {
                const currentHeader69 = sheetRiw.getRange(1, 69).getValue();
                if (!currentHeader69 || currentHeader69.toString().trim() === '') {
                  sheetRiw.getRange(1, 69).setValue('Status');
                }
              }
              sheetRiw.getRange(rowRiwNum, 69).setValue(payload.statusAksi);
            }
            break;
          }
        }
      }

      try { hitungProyeksiAK(); } catch(e) { }

      let updatedPegawai = null;
      let updatedRiwayat = null;

      try {
        const { data: latestPegData, header: latestPegHeader } = getSheetData(SHEET_NAMES.PEGAWAI);
        const colNipIdx = latestPegHeader.findIndex(h => h && h.toUpperCase() === 'NIP');
        if (colNipIdx !== -1) {
          for (let pIdx = 1; pIdx < latestPegData.length; pIdx++) {
            if (latestPegData[pIdx][colNipIdx] && latestPegData[pIdx][colNipIdx].toString().trim() === payload.NIP.toString().trim()) {
              const obj = {};
              latestPegHeader.forEach((h, idx) => {
                if (h && !['PASSWORD', 'PASSWORDHASH', 'Password', 'password'].includes(h)) {
                  obj[h] = latestPegData[pIdx][idx] !== undefined ? latestPegData[pIdx][idx] : '';
                }
              });
              updatedPegawai = obj;
              break;
            }
          }
        }
      } catch(e) {}

      try {
        const riwRes = handleGetAllRiwayatAK(session);
        if (riwRes && riwRes.getContent()) {
          const allRiw = JSON.parse(riwRes.getContent());
          if (Array.isArray(allRiw)) {
            updatedRiwayat = allRiw.find(r => String(r.NIP || r.nip || '').trim() === payload.NIP.toString().trim()) || null;
          }
        }
      } catch(e) {}

      return jsonResponse({
        success: true,
        message: 'Data pegawai berhasil diperbarui.',
        updatedPegawai,
        updatedRiwayat
      });
    }
  }
  return errorResponse('Pegawai tidak ditemukan.', 404);
}

// ======================= UPDATE AK BULANAN =======================
function handleUpdateAKBulanan(payload, session) {
  if (session.role === 'Viewer')
    return errorResponse('Viewer tidak dapat mengubah data.', 403);

  const { nip, year, month, triwulan, kategoriKinerja } = payload;
  if (!nip || !year || (!month && !triwulan))
    return errorResponse('Parameter kurang lengkap (nip, year, dan month/triwulan wajib diisi).');

  if (session.role === 'Admin KabKot') {
    const peg = validateSession(nip);
    if (peg && peg.satker !== session.satker)
      return errorResponse('Akses ditolak.', 403);
  }

  if (kategoriKinerja) {
    const ss         = SpreadsheetApp.getActiveSpreadsheet();
    const sheetInput = ss.getSheetByName(SHEET_NAMES.INPUT_KINERJA);
    const tz         = ss.getSpreadsheetTimeZone();

    if (!sheetInput) return errorResponse('Sheet Input_Kinerja tidak ditemukan.', 404);

    const lastRowInput = sheetInput.getLastRow();
    if (lastRowInput < 2)
      return errorResponse('Data Input_Kinerja kosong.', 404);

    const nipsData = sheetInput.getRange(2, 1, lastRowInput - 1, 1).getValues();
    let barisNip   = -1;
    const nipStr   = nip.toString().trim();
    const nipClean = nipStr.replace(/[^\d]/g, '');

    for (let i = 0; i < nipsData.length; i++) {
      const cellVal = nipsData[i][0] ? nipsData[i][0].toString().trim() : '';
      const cellClean = cellVal.replace(/[^\d]/g, '');
      if ((nipClean !== '' && cellClean === nipClean) || cellVal === nipStr) {
        barisNip = i + 2;
        break;
      }
    }

    if (barisNip === -1)
      return errorResponse(`NIP ${nip} tidak ditemukan di Input_Kinerja.`, 404);

    // Tentukan daftar bulan yang akan diisi:
    // TW I   : Januari – Maret (Bulan 1-3)
    // TW II  : Januari – Juni (Bulan 1-6)
    // TW III : Januari – September (Bulan 1-9)
    // TW IV  : Januari – Desember (Bulan 1-12)
    let monthsToUpdate = [];
    if (triwulan) {
      const twInt = parseInt(triwulan, 10);
      if (twInt === 1) monthsToUpdate = [1, 2, 3];
      else if (twInt === 2) monthsToUpdate = [1, 2, 3, 4, 5, 6];
      else if (twInt === 3) monthsToUpdate = [1, 2, 3, 4, 5, 6, 7, 8, 9];
      else if (twInt === 4) monthsToUpdate = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    }
    if (monthsToUpdate.length === 0 && month) {
      monthsToUpdate = [parseInt(month, 10)];
    }

    const headerRaw = sheetInput.getRange(1, 3, 1, 60).getValues()[0];

    monthsToUpdate.forEach(mInt => {
      const targetTeks = `${getNamaBulan(mInt)} ${year}`;
      let colBulanOffset = -1;
      for (let idx = 0; idx < headerRaw.length; idx++) {
        const h = headerRaw[idx];
        const teksBulan = h instanceof Date
          ? Utilities.formatDate(h, tz, 'MMMM yyyy')
          : h.toString().trim();
        if (teksBulan === targetTeks) {
          colBulanOffset = idx;
          break;
        }
      }

      if (colBulanOffset !== -1) {
        const kolomTarget = 3 + colBulanOffset;
        sheetInput.getRange(barisNip, kolomTarget).setValue(kategoriKinerja);
      }
    });
  }

  return jsonResponse({
    success: true,
    message: 'Kategori kinerja berhasil disimpan.'
  });
}

function getNamaBulan(bulanInt) {
  const bulan = ['Januari','Februari','Maret','April','Mei','Juni',
                 'Juli','Agustus','September','Oktober','November','Desember'];
  return bulan[bulanInt - 1] || '';
}

// ======================= DELETE =======================
function handleDeletePegawai(targetNip, session) {
  if (!session || session.role !== 'Admin BPS Provinsi') {
    return errorResponse('Hanya Admin BPS Provinsi yang dapat menghapus data.', 403);
  }
  if (!targetNip) return errorResponse('NIP wajib diisi.');

  const targetNipStr = targetNip.toString().trim();
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(15000);

    // 1. Menghapus dari Sheet Pegawai
    const { sheet: sheetPeg, data: dataPeg, header: headerPeg } = getSheetData(SHEET_NAMES.PEGAWAI);
    if (!sheetPeg || dataPeg.length <= 1) {
      return errorResponse('Sheet Pegawai kosong atau tidak ditemukan.', 404);
    }

    const colNIPPeg = headerPeg.findIndex(h => h && h.toString().trim().toUpperCase() === 'NIP');
    if (colNIPPeg === -1) {
      return errorResponse('Kolom NIP di sheet Pegawai tidak ditemukan.', 500);
    }

    let pegawaiFound = false;
    // Loop dari bawah ke atas (backwards) agar indeks baris tidak terganggu saat deleteRow
    for (let i = dataPeg.length - 1; i >= 1; i--) {
      const cellVal = dataPeg[i][colNIPPeg] ? dataPeg[i][colNIPPeg].toString().trim() : '';
      if (cellVal === targetNipStr) {
        sheetPeg.deleteRow(i + 1);
        pegawaiFound = true;
      }
    }

    if (!pegawaiFound) {
      return errorResponse('Pegawai dengan NIP tersebut tidak ditemukan.', 404);
    }

    // Helper internal untuk menghapus seluruh baris (beserta barisnya) berdasarkan NIP
    const deleteRowsByNIP = (sheetName) => {
      const { sheet, data, header } = getSheetData(sheetName);
      if (!sheet || data.length <= 1) return 0;

      const colNIP = header.findIndex(h => h && h.toString().trim().toUpperCase() === 'NIP');
      if (colNIP === -1) return 0;

      let deletedCount = 0;
      // Loop dari bawah ke atas agar baris langsung terhapus tanpa meninggalkan baris kosong
      for (let i = data.length - 1; i >= 1; i--) {
        const cellVal = data[i][colNIP] ? data[i][colNIP].toString().trim() : '';
        if (cellVal === targetNipStr) {
          sheet.deleteRow(i + 1);
          deletedCount++;
        }
      }
      return deletedCount;
    };

    // 2. Menghapus data terkait di sheet Riwayat_AK
    deleteRowsByNIP(SHEET_NAMES.RIWAYAT);

    // 3. Menghapus data terkait di sheet Input_Kinerja
    deleteRowsByNIP(SHEET_NAMES.INPUT_KINERJA);

    // 4. Menghapus user terkait di sheet Users (jika ada)
    deleteRowsByNIP(SHEET_NAMES.USERS || 'Users');

    return jsonResponse({
      success: true,
      message: `Pegawai dengan NIP ${targetNipStr} beserta seluruh data terkait di Riwayat_AK dan Input_Kinerja berhasil dihapus.`
    });

  } catch (e) {
    return errorResponse('Gagal menghapus data pegawai: ' + e.message, 500);
  } finally {
    try { lock.releaseLock(); } catch(err) {}
  }
}

// ======================= HITUNG PROYEKSI BATCH =======================
function handleHitungProyeksi(session) {
  if (session.role === 'Viewer') 
    return errorResponse('Viewer tidak dapat menjalankan perhitungan.', 403);
  try {
    hitungProyeksiAK();
    return jsonResponse({ success: true, message: 'Proyeksi berhasil dihitung.' });
  } catch (e) {
    return errorResponse('Gagal menghitung proyeksi: ' + e.message, 500);
  }
}

function hitungProyeksiAK() {
  const ss               = SpreadsheetApp.getActiveSpreadsheet();
  const sheetRiwayat     = ss.getSheetByName(SHEET_NAMES.RIWAYAT);
  const sheetKinerja     = ss.getSheetByName(SHEET_NAMES.KINERJA);
  const sheetPegawai     = ss.getSheetByName(SHEET_NAMES.PEGAWAI);
  const sheetInputKinerja= ss.getSheetByName(SHEET_NAMES.INPUT_KINERJA);

  if (!sheetRiwayat || !sheetKinerja || !sheetPegawai || !sheetInputKinerja) {
    throw new Error('Salah satu sheet tidak ditemukan!');
  }

  const lastRowRiwayat = sheetRiwayat.getLastRow();
  if (lastRowRiwayat < 2) return;

  const tz    = ss.getSpreadsheetTimeZone();
  const hariIni = new Date();

  const NAMA_BULAN_ID = [
    'Januari','Februari','Maret','April','Mei','Juni',
    'Juli','Agustus','September','Oktober','November','Desember'
  ];
  const BULAN_MAP_ID = {};
  NAMA_BULAN_ID.forEach((b, i) => { BULAN_MAP_ID[b] = i + 1; });

  const bulanSekarangTeks =
    `${NAMA_BULAN_ID[hariIni.getMonth()]} ${hariIni.getFullYear()}`;

  const PROJ_COL_START = 8;
  const PROJ_COUNT     = 60;
  const REKOM_COL      = 68;

  const totalColBaca = Math.max(sheetRiwayat.getLastColumn(), REKOM_COL);
  const semuaDataRiwayat = sheetRiwayat
    .getRange(1, 1, lastRowRiwayat, totalColBaca)
    .getValues();

  const COL_GOL     = 6;
  const COL_STATUS  = 7;
  const COL_JAB     = 8;
  const COL_TMT_JAB = 11; // Kolom L (index 11)
  const COL_TMT_GOL = 12; // Kolom M (index 12)

  const headerPeg = sheetPegawai.getRange(1, 1, 1, sheetPegawai.getLastColumn()).getValues()[0].map(h => h ? h.toString().trim() : '');
  const colLulusUkom = headerPeg.findIndex(h => h.toUpperCase() === 'LULUS_UKOM' || h.toUpperCase() === 'LULUS UKOM');
  const colLulusAssess = headerPeg.findIndex(h => h.toUpperCase() === 'LULUS_ASSESSMENT' || h.toUpperCase() === 'LULUS ASSESSMENT');
  let colTmtJab = headerPeg.findIndex(h => h.toUpperCase() === 'TMT JABATAN' || h.toUpperCase() === 'TMT_JABATAN' || h.toUpperCase() === 'TMTJABATAN');
  if (colTmtJab === -1) colTmtJab = COL_TMT_JAB;
  let colTmtGol = headerPeg.findIndex(h => h.toUpperCase() === 'TMT GOLONGAN' || h.toUpperCase() === 'TMT_GOLONGAN' || h.toUpperCase() === 'TMTGOLONGAN');
  if (colTmtGol === -1 && headerPeg.length > 12) colTmtGol = COL_TMT_GOL;

  const dataPegawaiRaw = sheetPegawai
    .getRange(2, 1, Math.max(sheetPegawai.getLastRow() - 1, 1), Math.max(sheetPegawai.getLastColumn(), 14))
    .getValues();

  const mapPegawai = {};
  dataPegawaiRaw.forEach(row => {
    if (!row[0]) return;
    const nip      = row[0].toString().trim();
    const golongan = row[COL_GOL]    ? row[COL_GOL].toString().trim()    : '-';
    const status   = row[COL_STATUS] ? row[COL_STATUS].toString().trim() : '';
    const jabatan  = row[COL_JAB]    ? row[COL_JAB].toString().trim()    : '-';
    const tmtJabRaw = (colTmtJab !== -1 && row[colTmtJab] !== undefined) ? row[colTmtJab] : (row[COL_TMT_JAB] || '');
    const tmtGolRaw = (colTmtGol !== -1 && row[colTmtGol] !== undefined) ? row[colTmtGol] : (row[COL_TMT_GOL] || '');

    const parseDateParts = (rawVal) => {
      let y = null, m = null;
      if (rawVal) {
        const d = rawVal instanceof Date ? rawVal : new Date(rawVal);
        if (!isNaN(d.getTime())) {
          y = d.getFullYear();
          m = d.getMonth() + 1;
        }
      }
      return { y, m };
    };

    const tmtJabParts = parseDateParts(tmtJabRaw);
    const tmtGolParts = parseDateParts(tmtGolRaw);
    const tmtTahun = tmtJabParts.y || tmtGolParts.y;
    const tmtBulan = tmtJabParts.m || tmtGolParts.m;

    const isCPNS = status.toUpperCase().includes('CPNS');
    const lulusUkom = colLulusUkom !== -1 ? row[colLulusUkom] : '';
    const lulusAssess = colLulusAssess !== -1 ? row[colLulusAssess] : '';
    mapPegawai[nip] = { golongan, jabatan, isCPNS, tmtTahun, tmtBulan, lulusUkom, lulusAssess };
  });

  const dataKinerjaFactor = sheetKinerja.getRange('A2:B6').getValues();
  const mapFaktor = {};
  dataKinerjaFactor.forEach(row => {
    if (row[0]) mapFaktor[row[0].toString().trim()] = parseFloat(row[1]);
  });

  const lastRowInput   = sheetInputKinerja.getLastRow();
  const headerInputRaw = sheetInputKinerja.getRange(1, 3, 1, 60).getValues()[0];

  let indeksBulanSekarang = -1;

  const headerBulan = headerInputRaw.map((h, idx) => {
    let teksBulan, tahun, bulan;

    if (h instanceof Date) {
      tahun     = h.getFullYear();
      bulan     = h.getMonth() + 1;
      teksBulan = `${NAMA_BULAN_ID[h.getMonth()]} ${tahun}`;
    } else {
      teksBulan = h.toString().trim();
      const parts = teksBulan.split(' ');
      bulan  = BULAN_MAP_ID[parts[0]] || 0;
      tahun  = parts.length > 1 ? parseInt(parts[1]) : 0;
    }

    if (teksBulan === bulanSekarangTeks) indeksBulanSekarang = idx;
    return { teks: teksBulan, tahun, bulan };
  });

  const dataInputFull = lastRowInput >= 2
    ? sheetInputKinerja.getRange(2, 3, lastRowInput - 1, 60).getValues()
    : [];
  const nipsInput = lastRowInput >= 2
    ? sheetInputKinerja.getRange(2, 1, lastRowInput - 1, 1).getValues()
    : [];

  const mapInputKinerja = {};
  nipsInput.forEach((row, idx) => {
    if (row[0]) mapInputKinerja[row[0].toString().trim()] = dataInputFull[idx] || [];
  });

  const arrayHasilProyeksi    = [];
  const arrayHasilRekomendasi = [];
  const dataRiwayatRows       = semuaDataRiwayat.slice(1);

  for (let i = 0; i < dataRiwayatRows.length; i++) {
    const row = dataRiwayatRows[i];
    const nip = row[0] ? row[0].toString().trim() : '';

    const nilaiG  = row[6];
    const parsedG = parseFloat(nilaiG);

    const dataDiri  = mapPegawai[nip] || { golongan: '-', jabatan: '-', isCPNS: false, tmtTahun: null, tmtBulan: null };
    const isCPNS    = dataDiri.isCPNS;

    let akDasar;
    const gValid = !isNaN(parsedG) && nilaiG !== '' && nilaiG !== '-' && nilaiG !== null;

    if (gValid) {
      akDasar = parsedG;
    } else if (isCPNS) {
      akDasar = 0;
    } else {
      const proyeksiLama = [];
      for (let m = 0; m < PROJ_COUNT; m++) {
        const colIdx = (PROJ_COL_START - 1) + m;
        const val    = row[colIdx];
        proyeksiLama.push(
          (val !== '' && val !== null && val !== undefined) ? val : 0
        );
      }
      arrayHasilProyeksi.push(proyeksiLama);
      arrayHasilRekomendasi.push([
        'Data AK 2025 (kolom G) belum diisi. Isi kolom G terlebih dahulu agar proyeksi dihitung.'
      ]);
      continue;
    }

    const jabatanAktif  = dataDiri.jabatan;
    const golonganAktif = dataDiri.golongan;
    const tmtTahun      = dataDiri.tmtTahun;
    const tmtBulan      = dataDiri.tmtBulan;
    const predikatRaw   = mapInputKinerja[nip] || [];

    const predikatEfektif = [];
    for (let m = 0; m < 60; m++) {
      const pVal = predikatRaw[m];
      const pStr = (pVal !== undefined && pVal !== null) ? pVal.toString().trim() : '';
      predikatEfektif[m] = (pStr !== '' && pStr !== '-' && pStr !== '—') ? pStr : 'Baik';
    }

    let jenjang = '';
    for (const key in KOEFISIEN) {
      if (jabatanAktif.includes(key)) { jenjang = key; break; }
    }

    const koefBaru = KOEFISIEN[jenjang] || 0;

    let jenjangLama = '';
    if (jenjang === 'Ahli Muda') jenjangLama = 'Ahli Pertama';
    else if (jenjang === 'Ahli Madya') jenjangLama = 'Ahli Muda';
    else if (jenjang === 'Penyelia') jenjangLama = 'Mahir';
    else if (jenjang === 'Ahli Utama') jenjangLama = 'Ahli Madya';

    const koefLama = jenjangLama ? (KOEFISIEN[jenjangLama] || 0) : koefBaru;
    const isPromotedInProjection = jenjangLama && tmtTahun !== null && tmtTahun >= 2026;

    let totalAK_Old = akDasar;
    let totalAK_New = 0;
    let totalAK     = akDasar;
    const proyeksiBaris = [];
    let akBulanSekarang = 0;
    let bulanLulus      = '';
    let sudahLulus      = false;

    const keyRegulasi = `${jenjang} ${golonganAktif}`.trim();
    const info        = REGULASI[keyRegulasi];
    const syarat      = (info && info.akJab !== null && info.akJab !== undefined) ? info.akJab : 9999;

    for (let m = 0; m < 60; m++) {
      const hdr = headerBulan[m];
      const faktor = mapFaktor[predikatEfektif[m]] !== undefined ? mapFaktor[predikatEfektif[m]] : 1.0;
      let akFix = 0;

      if (isCPNS && tmtTahun !== null && tmtBulan !== null) {
        const sudahTMT = hdr.tahun > tmtTahun || (hdr.tahun === tmtTahun && hdr.bulan >= tmtBulan);
        if (sudahTMT) {
          totalAK_Old += (koefBaru * faktor) / 12;
        }
        akFix = Math.ceil(totalAK_Old * 1000) / 1000;
        totalAK = akFix;
      } else if (isPromotedInProjection) {
        const isBeforeTMT = hdr.tahun < tmtTahun || (hdr.tahun === tmtTahun && hdr.bulan < tmtBulan);
        const isTMTMonth  = hdr.tahun === tmtTahun && hdr.bulan === tmtBulan;

        if (isBeforeTMT) {
          totalAK_Old += (koefLama * faktor) / 12;
          akFix = Math.ceil(totalAK_Old * 1000) / 1000;
          totalAK = akFix;
        } else if (isTMTMonth) {
          totalAK_New = 0;
          akFix = 0;
          totalAK = 0;
        } else {
          totalAK_New += (koefBaru * faktor) / 12;
          akFix = Math.ceil(totalAK_New * 1000) / 1000;
          totalAK = akFix;
        }
      } else {
        totalAK_Old += (koefBaru * faktor) / 12;
        akFix = Math.ceil(totalAK_Old * 1000) / 1000;
        totalAK = akFix;
      }

      proyeksiBaris.push(akFix);

      if (m === indeksBulanSekarang) akBulanSekarang = akFix;
      if (akFix >= syarat && !sudahLulus) {
        bulanLulus = hdr.teks;
        sudahLulus = true;
      }
    }
    arrayHasilProyeksi.push(proyeksiBaris);

    if (info) {
      const targetInfo = info.next;
      const statusAksi = (row.length >= 69 && row[68] !== undefined) ? row[68].toString().trim() : '';
      const isAhliMadya = jabatanAktif.includes('Ahli Madya');

      const lulusUkomVal = dataDiri.lulusUkom || '';
      const isLulusUkom = lulusUkomVal.toLowerCase() === 'sudah' || lulusUkomVal.toLowerCase() === 'ya' || lulusUkomVal === 'true';

      const lulusAssessVal = dataDiri.lulusAssess || '';
      const isLulusAssess = lulusAssessVal.toLowerCase() === 'sudah' || lulusAssessVal.toLowerCase() === 'ya' || lulusAssessVal === 'true';

      const isNaikJabatanTarget = info.nextJab && !jabatanAktif.includes(info.nextJab.split(' ')[0]);
      const targetJenjangTeks = info.nextJab ? info.nextJab.split(' ').slice(0, -1).join(' ') : '';
      const isEligibleForJab = info.akJab !== null && info.akJab !== undefined && totalAK >= info.akJab;

      if (statusAksi === 'Sudah Naik Jabatan' || statusAksi === 'Completed' || statusAksi === 'Selesai') {
        arrayHasilRekomendasi.push(['Selesai']);
        continue;
      }

      if (isNaikJabatanTarget && (isEligibleForJab || (statusAksi && statusAksi !== 'Sudah Naik Jabatan' && statusAksi !== 'Selesai' && statusAksi !== 'Completed'))) {
        const isRencanaAksiSelesai = statusAksi === 'Selesai Rencana Aksi' || statusAksi === 'Belum Naik Jabatan';
        const isLulusUkomDone = isLulusUkom || statusAksi === 'Lulus Ukom' || statusAksi === 'Lulus Uji Kompetensi' || statusAksi === 'Belum Selesai Rencana Aksi' || isRencanaAksiSelesai;
        const isLulusAssessDone = isLulusAssess || statusAksi === 'Lulus Assessment' || isLulusUkomDone;

        if (targetJenjangTeks === 'Ahli Madya') {
          // Ahli Muda -> Ahli Madya: Assessment -> UKOM -> Rencana Aksi -> Rekomendasi Kenaikan Jabatan
          if (!isLulusAssessDone) {
            arrayHasilRekomendasi.push(['Rekomendasi Assessment']);
          } else if (!isLulusUkomDone) {
            arrayHasilRekomendasi.push(['Rekomendasi Uji Kompetensi (Ukom)']);
          } else if (!isRencanaAksiSelesai) {
            arrayHasilRekomendasi.push(['Rencana Aksi Kenaikan Jabatan ke Ahli Madya']);
          } else {
            arrayHasilRekomendasi.push(['Rekomendasi Kenaikan Jabatan Menjadi Ahli Madya']);
          }
        } else {
          // Ahli Pertama -> Ahli Muda, Mahir -> Penyelia, dsb: UKOM -> Rencana Aksi -> Rekomendasi Kenaikan Jabatan
          if (!isLulusUkomDone) {
            arrayHasilRekomendasi.push(['Rekomendasi Uji Kompetensi (Ukom)']);
          } else if (!isRencanaAksiSelesai) {
            arrayHasilRekomendasi.push([`Rencana Aksi Kenaikan Jabatan ke ${targetJenjangTeks}`]);
          } else {
            arrayHasilRekomendasi.push([`Rekomendasi Kenaikan Jabatan Menjadi ${targetJenjangTeks}`]);
          }
        }
        continue;
      }

      if (isCPNS) {
        const tmtTeks = (tmtTahun && tmtBulan)
          ? `${NAMA_BULAN_ID[tmtBulan - 1]} ${tmtTahun}`
          : 'belum diketahui';
        if (!sudahLulus) {
          const akDipakai = indeksBulanSekarang !== -1 ? akBulanSekarang : totalAK;
          const selisih   = (syarat - akDipakai).toFixed(3);
          arrayHasilRekomendasi.push([
            `[CPNS - TMT: ${tmtTeks}] Tahap 1: Belum Memenuhi Syarat AK. Kurang ${selisih} poin untuk rekomendasi UKOM (${targetInfo}).`
          ]);
        } else {
          arrayHasilRekomendasi.push([
            `[CPNS - TMT: ${tmtTeks}] Tahap 1: Lulus Syarat AK. Berstatus [Direkomendasikan UKOM] menuju jenjang ${targetInfo}.`
          ]);
        }
      } else {
        if (!sudahLulus) {
          const akDipakai = indeksBulanSekarang !== -1 ? akBulanSekarang : totalAK;
          const selisih   = (syarat - akDipakai).toFixed(3);
          arrayHasilRekomendasi.push([
            `Tahap 1: Belum Memenuhi Syarat AK. Kurang ${selisih} poin untuk rekomendasi UKOM (${targetInfo}).`
          ]);
        } else if (totalAK >= syarat && totalAK < (syarat + 25)) {
          arrayHasilRekomendasi.push([
            `Tahap 1: Lulus Syarat AK. Berstatus [Direkomendasikan UKOM] menuju jenjang ${targetInfo}.`
          ]);
        } else if (totalAK >= (syarat + 25) && totalAK < (syarat + 50)) {
          arrayHasilRekomendasi.push([
            `Tahap 2 & 3: [Naik Jabatan Disetujui]. Direkomendasikan Naik Pangkat.`
          ]);
        } else {
          arrayHasilRekomendasi.push([
            `Tahap 4: [Naik Pangkat Disetujui]. Masuk kriteria Direkomendasikan Assessment.`
          ]);
        }
      }
    } else {
      arrayHasilRekomendasi.push(['Regulasi jenjang jabatan tidak ditemukan']);
    }
  }

  if (arrayHasilProyeksi.length > 0) {
    sheetRiwayat
      .getRange(2, PROJ_COL_START, arrayHasilProyeksi.length, PROJ_COUNT)
      .setValues(arrayHasilProyeksi);
    sheetRiwayat
      .getRange(2, REKOM_COL, arrayHasilRekomendasi.length, 1)
      .setValues(arrayHasilRekomendasi);
  }
}

// ======================= DEBUG FUNCTIONS =======================
function checkSheetStructure() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.PEGAWAI);
  if (!sheet) { console.log('Sheet Pegawai tidak ditemukan!'); return; }
  const header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  console.log('Kolom yang ada di sheet Pegawai:');
  header.forEach((col, idx) => { console.log(`  Kolom ${idx + 1}: ${col}`); });
}

function checkUserData(nip) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.USERS) || ss.getSheetByName(SHEET_NAMES.PEGAWAI);
  if (!sheet) { console.log('Sheet Pegawai tidak ditemukan!'); return; }
  const data = sheet.getDataRange().getValues();
  const header = data[0].map(h => h ? h.toString().trim() : '');
  const colNIP = header.findIndex(h => h && h.toUpperCase() === 'NIP');
  const colPassword = header.findIndex(h => h && (h.toUpperCase() === 'PASSWORD' || h.toUpperCase() === 'PASSWORDHASH'));
  if (colNIP === -1) { console.log('Kolom NIP tidak ditemukan!'); return; }
  const targetNip = nip.toString().trim();
  for (let i = 1; i < data.length; i++) {
    const rowNIP = data[i][colNIP] ? data[i][colNIP].toString().trim() : '';
    if (rowNIP === targetNip) {
      console.log('User ditemukan!');
      console.log('  NIP:', rowNIP);
      if (colPassword !== -1) {
        const pwd = data[i][colPassword];
        console.log('  Password:', pwd);
        console.log('  Password length:', pwd ? pwd.toString().length : 0);
      }
      return;
    }
  }
  console.log('User dengan NIP', targetNip, 'tidak ditemukan');
}

// ============================================================================
// EXTENSION FITUR: INTEGRASI GOOGLE DRIVE HISTORY & ARSIP PAK
// ============================================================================

SHEET_NAMES.HISTORY_PAK = 'Dokumen_Terbit';

function handleGetHistoryPAKData(session) {
  const { data, header } = getSheetData(SHEET_NAMES.HISTORY_PAK);
  if (!data.length || data.length < 2) return jsonResponse([]);

  const rows = data.slice(1).map(row => rowToObject(header, row));
  
  const filteredData = filterPegawaiByRole(
    rows.map(r => ({ ...r, KodeSatker: r.Kode_Satker || r.KodeSatker, NIP: r.NIP })), 
    session
  ).map(r => ({
    id: r.ID_Dokumen || r.id,
    nip: r.NIP,
    namaPegawai: r.Nama_Pegawai || r.NamaPegawai || r.nama,
    kodeSatker: r.Kode_Satker || r.KodeSatker,
    tahun: parseInt(r.Tahun || r.tahun),
    jenis: r.Jenis_Dokumen || r.JenisDokumen || r.jenis,
    namaFile: r.Nama_File || r.NamaFile,
    fileId: r.Drive_File_ID || r.fileId,
    tglDibuat: r.Tanggal_Dibuat || r.tglDibuat,
    nomorSurat: r.Nomor_Surat || r.NomorSurat || r.nomorSurat || '',
    bulanAwal: r.Bulan_Awal || r.BulanAwal || r['Bulan Awal Tahun'] || '',
    bulanAkhir: r.Bulan_Akhir || r.BulanAkhir || r['Bulan Akhir Tahun'] || '',
    googleDocUrl: r.Google_Doc_URL || r.googleDocUrl || ''
  }));

  return jsonResponse(filteredData);
}

function handleSimpanDokumenPAK(payload, session) {
  if (session.role === 'Viewer') return errorResponse('Viewer tidak memiliki hak akses penyimpanan.', 403);
  
  const { nip, tahun, jenis, namaFile, base64Content } = payload;
  if (!nip || !tahun || !jenis || !namaFile || !base64Content) {
    return errorResponse('Parameter payload dokumen kurang lengkap.');
  }

  try {
    const lock = LockService.getScriptLock();
    lock.waitLock(15000);

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetHist = ss.getSheetByName(SHEET_NAMES.HISTORY_PAK) || createHistorySheetStructure(ss);
    const dbHist = sheetHist.getDataRange().getValues();
    const headerHist = dbHist[0];

    const colNIP = headerHist.indexOf('NIP');
    const colTahun = headerHist.indexOf('Tahun');
    const colJenis = headerHist.indexOf('Jenis_Dokumen');
    const colFileId = headerHist.indexOf('Drive_File_ID');

    for (let i = 1; i < dbHist.length; i++) {
      if (dbHist[i][colNIP].toString().trim() === nip.toString().trim() &&
          dbHist[i][colTahun].toString() === tahun.toString() &&
          dbHist[i][colJenis].toString().trim() === jenis.toString().trim()) {
        
        const oldFileId = dbHist[i][colFileId];
        if (oldFileId) {
          try { DriveApp.getFileById(oldFileId).setTrashed(true); } catch(err) { console.warn('File lama tidak ditemukan di Drive.'); }
        }
        sheetHist.deleteRow(i + 1);
        break;
      }
    }

    const pegSession = validateSession(nip);
    if (!pegSession) return errorResponse('Data identitas pegawai tidak terdaftar di sistem.', 404);
    const namaPegawai = pegSession.nama;
    const kodeSatker = pegSession.satker;

    const rootFolder = getOrCreateDriveFolder('SIDAK6100 SDM');
    const historyPAKFolder = getOrCreateDriveSubFolder(rootFolder, 'History PAK');
    const satkerFolder = getOrCreateDriveSubFolder(historyPAKFolder, `Satker_${kodeSatker}`);
    const pegawaiFolder = getOrCreateDriveSubFolder(satkerFolder, `${namaPegawai}_${nip}`);

    const blobData = Utilities.newBlob(Utilities.base64Decode(base64Content), 'application/pdf', namaFile);
    const driveFile = pegawaiFolder.createFile(blobData);
    const driveFileId = driveFile.getId();

    const uuid = 'DOC-' + Utilities.getUuid().substring(0, 8).toUpperCase();
    const tglSekarang = Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), 'dd MMMM yyyy HH:mm');
    
    const loggedRow = headerHist.map(h => {
      if (h === 'ID_Dokumen') return uuid;
      if (h === 'NIP') return nip;
      if (h === 'Nama_Pegawai') return namaPegawai;
      if (h === 'Kode_Satker') return kodeSatker;
      if (h === 'Tahun') return tahun;
      if (h === 'Jenis_Dokumen') return jenis;
      if (h === 'Nama_File') return namaFile;
      if (h === 'Drive_File_ID') return driveFileId;
      if (h === 'Tanggal_Dibuat') return tglSekarang;
      if (h === 'Google_Doc_URL') return payload.docUrl || '';
      return '';
    });
    
    sheetHist.appendRow(loggedRow);
    lock.releaseLock();

    return jsonResponse({ success: true, message: 'Dokumen PAK berhasil disimpan ke Google Drive.', fileId: driveFileId });
  } catch(e) {
    return errorResponse('Gagal melakukan interaksi engine Drive: ' + e.message, 500);
  }
}

function getOrCreateDriveFolder(folderName) {
  const folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(folderName);
}

function getOrCreateDriveSubFolder(parentFolder, subFolderName) {
  const subFolders = parentFolder.getFoldersByName(subFolderName);
  if (subFolders.hasNext()) return subFolders.next();
  return parentFolder.createFolder(subFolderName);
}

function createHistorySheetStructure(ss) {
  const sheet = ss.insertSheet(SHEET_NAMES.HISTORY_PAK);
  const headers = ['ID_Dokumen', 'NIP', 'Nama_Pegawai', 'Kode_Satker', 'Tahun', 'Jenis_Dokumen', 'Nama_File', 'Drive_File_ID', 'Tanggal_Dibuat', 'Google_Doc_URL', 'Nomor_Surat', 'Bulan_Awal', 'Bulan_Akhir'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#f1f5f9');
  sheet.setFrozenRows(1);
  return sheet;
}

// ============================================================================
// PIPELINE GENERATE DOKUMEN VIA GOOGLE DOCS & PDF CONVERSION
// ============================================================================

function handleGenerateOfficialDocument(payload, session) {
  const { nip, jenis, bulanAwal, bulanAkhir, tanggalPenetapan, nomorSurat } = payload;
  if (!nip || !jenis || !bulanAwal || !bulanAkhir) {
    return errorResponse('Parameter kurang lengkap (nip, jenis, bulanAwal, bulanAkhir wajib diisi).');
  }

  if (session.role === 'Viewer' && session.nip !== nip) {
    return errorResponse('Tidak memiliki akses ke pegawai lain.', 403);
  }

  try {
    // 1. Ambil data Pegawai
    const { data: dataPeg, header: headerPeg } = getSheetData(SHEET_NAMES.PEGAWAI);
    const colNIP = headerPeg.findIndex(h => h && h.toUpperCase() === 'NIP');
    const colKode = headerPeg.findIndex(h => h && h.toUpperCase() === 'KODESATKER');
    const colNama = headerPeg.findIndex(h => h && h.toUpperCase() === 'NAMA');
    const colPangkat = headerPeg.findIndex(h => h && h.toUpperCase() === 'PANGKAT');
    const colGol = headerPeg.findIndex(h => h && h.toUpperCase() === 'GOLONGAN');
    const colJab = headerPeg.findIndex(h => h && h.toUpperCase() === 'JABATAN');
    let colTMTJab = headerPeg.findIndex(h => h && (h.toUpperCase() === 'TMT JABATAN' || h.toUpperCase() === 'TMT_JABATAN' || h.toUpperCase() === 'TMTJABATAN'));
    if (colTMTJab === -1 && headerPeg.length > 11) colTMTJab = 11; // Kolom L
    if (colTMTJab === -1) colTMTJab = headerPeg.findIndex(h => h && h.toUpperCase() === 'TMT');

    let colTMTGol = headerPeg.findIndex(h => h && (h.toUpperCase() === 'TMT GOLONGAN' || h.toUpperCase() === 'TMT_GOLONGAN' || h.toUpperCase() === 'TMTGOLONGAN'));
    if (colTMTGol === -1 && headerPeg.length > 12) colTMTGol = 12; // Kolom M
    if (colTMTGol === -1) colTMTGol = colTMTJab;

    const colKarpeg = headerPeg.findIndex(h => h && h.toUpperCase() === 'NOSERIKARPEG');
    const colTTL = headerPeg.findIndex(h => h && h.toUpperCase() === 'TEMPATTANGGALLAHIR');
    const colJK = headerPeg.findIndex(h => h && h.toUpperCase() === 'JENISKELAMIN');
    const colPendidikan = headerPeg.findIndex(h => h && h.toUpperCase() === 'PENDIDIKAN');
    const colMasaKerjaLama = headerPeg.findIndex(h => h && h.toUpperCase() === 'MASAKERJALAMA');
    const colMasaKerjaBaru = headerPeg.findIndex(h => h && h.toUpperCase() === 'MASAKERJABARU');
    const colStatus = headerPeg.findIndex(h => h && h.toUpperCase() === 'STATUS');

    let rowPeg = null;
    for (let i = 1; i < dataPeg.length; i++) {
      if (dataPeg[i][colNIP] && dataPeg[i][colNIP].toString().trim() === nip.toString().trim()) {
        rowPeg = dataPeg[i];
        break;
      }
    }
    if (!rowPeg) return errorResponse('Pegawai tidak ditemukan.', 404);

    const formatDateHelper = (val) => {
      if (!val) return '';
      try {
        return Utilities.formatDate(new Date(val), SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone(), 'dd-MM-yyyy');
      } catch(e) {
        return String(val);
      }
    };

    const valTmtJab = colTMTJab !== -1 && rowPeg[colTMTJab] ? formatDateHelper(rowPeg[colTMTJab]) : '';
    const valTmtGol = colTMTGol !== -1 && rowPeg[colTMTGol] ? formatDateHelper(rowPeg[colTMTGol]) : '';

    const pegObj = {
      nip: rowPeg[colNIP],
      nama: rowPeg[colNama],
      kodeSatker: rowPeg[colKode] ? rowPeg[colKode].toString().trim() : '',
      golongan: colGol !== -1 ? rowPeg[colGol] : '',
      jabatan: colJab !== -1 ? rowPeg[colJab] : '',
      pangkat: colPangkat !== -1 ? rowPeg[colPangkat] : '',
      tmtJabatan: valTmtJab,
      tmtGolongan: valTmtGol,
      tmt: valTmtGol || valTmtJab || '',
      pangkatGolTMT: `${(colPangkat !== -1 ? rowPeg[colPangkat] : '') || '-'} / (${(colGol !== -1 ? rowPeg[colGol] : '') || '-'}) / ${valTmtGol || valTmtJab || '-'}`,
      jabatanTMT: valTmtJab ? `${(colJab !== -1 ? rowPeg[colJab] : '') || '-'} / ${valTmtJab}` : ((colJab !== -1 ? rowPeg[colJab] : '') || '-'),
      karpeg: (colKarpeg !== -1 ? rowPeg[colKarpeg] : '') || '-',
      ttl: (colTTL !== -1 ? rowPeg[colTTL] : '') || '-',
      jenisKelamin: (colJK !== -1 ? rowPeg[colJK] : '') || '-',
      pendidikan: (colPendidikan !== -1 ? rowPeg[colPendidikan] : '') || '-',
      masaKerjaLama: (colMasaKerjaLama !== -1 ? rowPeg[colMasaKerjaLama] : '') || '-',
      masaKerjaBaru: (colMasaKerjaBaru !== -1 ? rowPeg[colMasaKerjaBaru] : '') || '-',
      status: (colStatus !== -1 ? rowPeg[colStatus] : '') || ''
    };

    // 2. Ambil detail Satker
    const { data: dataSatker, header: headerSatker } = getSheetData(SHEET_NAMES.SATKER);
    const colKodeSat = headerSatker.findIndex(h => h.toLowerCase().includes('kode'));
    const colNamaSat = headerSatker.findIndex(h => h.toLowerCase().includes('satker') && !h.toLowerCase().includes('kode'));
    const colAlamat = headerSatker.findIndex(h => h.toLowerCase().includes('alamat'));
    const colLaman = headerSatker.findIndex(h => h.toLowerCase().includes('laman'));
    const colPosEl = headerSatker.findIndex(h => h.toLowerCase().includes('pos-el') || h.toLowerCase().includes('posel') || h.toLowerCase().includes('email'));
    const colKepala = headerSatker.findIndex(h => h.toLowerCase().includes('kepala') && !h.toLowerCase().includes('nip'));
    const colNipKepala = headerSatker.findIndex(h => h.toLowerCase().includes('nipkepala') || h.toLowerCase().includes('nip_kepala'));
    const colKota = headerSatker.findIndex(h => h.toLowerCase().includes('kota'));

    let satkerObj = {
      namaSatker: 'BPS Provinsi Kalimantan Barat',
      alamat: 'Jl. Jend. Sutoyo No. 1, Pontianak',
      laman: 'kalbar.bps.go.id',
      posEl: 'bps6100@bps.go.id',
      namaKepala: 'Data belum tersedia',
      nipKepala: 'Data belum tersedia',
      kotaPenetapan: 'Pontianak'
    };

    for (let j = 1; j < dataSatker.length; j++) {
      if (dataSatker[j][colKodeSat] && dataSatker[j][colKodeSat].toString().trim() === pegObj.kodeSatker) {
        satkerObj = {
          namaSatker: dataSatker[j][colNamaSat] || satkerObj.namaSatker,
          alamat: colAlamat !== -1 ? dataSatker[j][colAlamat] : satkerObj.alamat,
          laman: colLaman !== -1 ? dataSatker[j][colLaman] : satkerObj.laman,
          posEl: colPosEl !== -1 ? dataSatker[j][colPosEl] : satkerObj.posEl,
          namaKepala: colKepala !== -1 ? dataSatker[j][colKepala] : satkerObj.namaKepala,
          nipKepala: colNipKepala !== -1 ? dataSatker[j][colNipKepala] : satkerObj.nipKepala,
          kotaPenetapan: colKota !== -1 ? dataSatker[j][colKota] : satkerObj.kotaPenetapan
        };
        break;
      }
    }

    // 3. Parse periode yang dipilih
    const [startYear, startMonth] = bulanAwal.split('-').map(Number);
    const [endYear, endMonth] = bulanAkhir.split('-').map(Number);

    if (startYear > endYear || (startYear === endYear && startMonth > endMonth)) {
      return errorResponse('Periode Bulan Awal tidak boleh melebihi Periode Bulan Akhir.');
    }

    // 4. Hitung AK & Kinerja yang difilter
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetInputKinerja = ss.getSheetByName(SHEET_NAMES.INPUT_KINERJA);
    if (!sheetInputKinerja) return errorResponse('Sheet Input_Kinerja tidak ditemukan.', 404);

    const { data: dataInput, header: headerInput } = getSheetData(SHEET_NAMES.INPUT_KINERJA);
    const colNIPInput = headerInput.indexOf('NIP');
    let rowInput = null;
    for (let i = 1; i < dataInput.length; i++) {
      if (dataInput[i][colNIPInput] && dataInput[i][colNIPInput].toString().trim() === nip.toString().trim()) {
        rowInput = dataInput[i];
        break;
      }
    }

    const { data: dataRiw, header: headerRiw } = getSheetData(SHEET_NAMES.RIWAYAT);
    const colNIPRiw = headerRiw.indexOf('NIP');
    let rowRiw = null;
    for (let i = 1; i < dataRiw.length; i++) {
      if (dataRiw[i][colNIPRiw] && dataRiw[i][colNIPRiw].toString().trim() === nip.toString().trim()) {
        rowRiw = dataRiw[i];
        break;
      }
    }
    let ak2025 = rowRiw ? (parseFloat(rowRiw[6]) || 0) : 0;

    const { data: dataKat } = getSheetData(SHEET_NAMES.KINERJA);
    const mapFaktor = {};
    dataKat.slice(1).forEach(r => {
      if (r[0]) mapFaktor[r[0].toString().trim()] = parseFloat(r[1]) || 1.0;
    });

    let jenjang = '';
    for (const key in KOEFISIEN) {
      if (pegObj.jabatan.includes(key)) { jenjang = key; break; }
    }
    const koefDasar = KOEFISIEN[jenjang] || 0;

    // Helper parsing nilai angka kredit & penanganan unrecorded gaps (misal data terakhir Des 2022)
    const parseValBackend = (v) => {
      if (v === undefined || v === null) return 0;
      const s = String(v).trim();
      if (s === '' || s === '-' || s === '(-)' || s === '—' || s === 'null' || s === 'undefined') return 0;
      const num = parseFloat(s.replace(/\s+/g, '').replace(',', '.'));
      return isNaN(num) ? 0 : num;
    };
    const hasValidValBackend = (v) => {
      if (v === undefined || v === null) return false;
      const s = String(v).trim();
      if (s === '' || s === '-' || s === '(-)' || s === '—' || s === 'null' || s === 'undefined') return false;
      const num = parseFloat(s.replace(/\s+/g, '').replace(',', '.'));
      return !isNaN(num) && num > 0;
    };

    const relevantTMTInfo = getRelevantTMTGS(pegObj);
    let tmtYear = relevantTMTInfo.year;
    let tmtMonth = relevantTMTInfo.month;

    const rawPakInt2022Backend = rowRiw ? rowRiw[2] : null;
    const rawAk2022Backend = rowRiw ? rowRiw[3] : null;
    let baseline2022 = 0;
    if (hasValidValBackend(rawPakInt2022Backend)) {
      baseline2022 = parseValBackend(rawPakInt2022Backend);
    } else if (hasValidValBackend(rawAk2022Backend)) {
      baseline2022 = parseValBackend(rawAk2022Backend);
    }

    if (baseline2022 > 0 && tmtYear > 2022) {
      tmtYear = 2022;
      tmtMonth = 1;
    }

    const calcYearlyAKBackend = (year) => {
      let ak = koefDasar;
      if (tmtYear && tmtMonth) {
        if (tmtYear === year) {
          ak = (Math.max(0, 12 - tmtMonth + 1) / 12) * koefDasar;
        } else if (tmtYear > year) {
          ak = 0;
        }
      }
      return Math.round(ak * 1000) / 1000;
    };

    const cumMap = { 2022: baseline2022 };
    let runCum = baseline2022;

    // 2023
    const rawPakKonv2023Backend = rowRiw ? rowRiw[4] : null;
    if (hasValidValBackend(rawPakKonv2023Backend)) {
      runCum = parseValBackend(rawPakKonv2023Backend);
    } else if (baseline2022 > 0 || tmtYear <= 2023) {
      runCum = Math.round((runCum + calcYearlyAKBackend(2023)) * 1000) / 1000;
    } else {
      runCum = 0;
    }
    cumMap[2023] = runCum;

    // 2024
    const rawAk2024Backend = rowRiw ? rowRiw[5] : null;
    if (hasValidValBackend(rawAk2024Backend)) {
      runCum = parseValBackend(rawAk2024Backend);
    } else if (cumMap[2023] > 0 || tmtYear <= 2024) {
      runCum = Math.round((runCum + calcYearlyAKBackend(2024)) * 1000) / 1000;
    } else {
      runCum = 0;
    }
    cumMap[2024] = runCum;

    // 2025
    const rawAk2025Backend = rowRiw ? rowRiw[6] : null;
    if (hasValidValBackend(rawAk2025Backend)) {
      runCum = parseValBackend(rawAk2025Backend);
    } else if (cumMap[2024] > 0 || tmtYear <= 2025) {
      runCum = Math.round((runCum + calcYearlyAKBackend(2025)) * 1000) / 1000;
    } else {
      runCum = 0;
    }
    cumMap[2025] = runCum;

    if (hasValidValBackend(rawAk2025Backend)) {
      ak2025 = parseValBackend(rawAk2025Backend);
    } else if (ak2025 <= 0) {
      ak2025 = cumMap[2025];
    }

    // Menggunakan getDisplayValues() agar selalu mendapatkan teks seperti "Januari 2026"
    const headerInputRaw = sheetInputKinerja.getRange(1, 3, 1, 60).getDisplayValues()[0];
    const NAMA_BULAN_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    
    // Peta nama bulan yang super robust (Mendukung Indonesia/Inggris, Singkat/Lengkap, Case-insensitive)
    const BULAN_MAP_ID = {};
    const indFull = ['januari','februari','maret','april','mei','juni','juli','agustus','september','oktober','november','desember'];
    const indShort = ['jan','feb','mar','apr','mei','jun','jul','agu','sep','okt','nov','des'];
    const engFull = ['january','february','march','april','may','june','july','august','september','october','november','december'];
    const engShort = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    
    indFull.forEach((b, i) => { BULAN_MAP_ID[b] = i + 1; });
    indShort.forEach((b, i) => { BULAN_MAP_ID[b] = i + 1; });
    engFull.forEach((b, i) => { BULAN_MAP_ID[b] = i + 1; });
    engShort.forEach((b, i) => { BULAN_MAP_ID[b] = i + 1; });

    const monthCols = headerInputRaw.map((h, idx) => {
      let yr = 0, mn = 0;
      if (h) {
        const text = h.toString().trim().toLowerCase();
        const parts = text.split(/\s+/);
        mn = BULAN_MAP_ID[parts[0]] || 0;
        yr = parts.length > 1 ? parseInt(parts[1]) : 0;
      }
      return { year: yr, month: mn, colIndex: idx + 2 };
    });

    // Hitung periode 1 bulan sebelum startMonth/startYear untuk pencocokan PAK lama
    let prevMonth = startMonth === 1 ? 12 : startMonth - 1;
    let prevYear = startMonth === 1 ? startYear - 1 : startYear;

    // 1. Cari data di Riwayat_PAK_Terbit berdasarkan NIP dan Bulan Akhir Tahun sebelumnya
    let akLama = null;
    const sheetPAKTerbit = ss.getSheetByName(SHEET_NAMES.RIWAYAT_PAK_TERBIT);
    if (sheetPAKTerbit) {
      const { data: dataPAKTerbit, header: headerPAKTerbit } = getSheetData(SHEET_NAMES.RIWAYAT_PAK_TERBIT);
      if (dataPAKTerbit && dataPAKTerbit.length > 1) {
        const colNIPPAK = headerPAKTerbit.indexOf('NIP');
        const colBulanAkhirPAK = headerPAKTerbit.indexOf('Bulan Akhir Tahun');
        const colNilaiPAK = headerPAKTerbit.indexOf('Nilai PAK');

        for (let i = 1; i < dataPAKTerbit.length; i++) {
          const r = dataPAKTerbit[i];
          if (r[colNIPPAK] && r[colNIPPAK].toString().trim() === nip.toString().trim()) {
            const rawEnd = r[colBulanAkhirPAK];
            const parsed = parseMonthYearHelper(rawEnd);
            if (parsed && parsed.month === prevMonth && parsed.year === prevYear) {
              akLama = parseFloat(r[colNilaiPAK]) || 0;
              break;
            }
          }
        }
      }
    }

    // 2. Jika tidak ditemukan di Riwayat_PAK_Terbit, fallback ke AK tahun terakhir pada Riwayat AK (atau cumMap)
    if (akLama === null || isNaN(akLama)) {
      if (baseline2022 <= 0 && cumMap[2025] <= 0 && (startYear < tmtYear || (startYear === tmtYear && startMonth <= tmtMonth))) {
        akLama = 0;
      } else {
        const targetPrevYear = startYear - 1;
        if (cumMap[targetPrevYear] !== undefined) {
          akLama = cumMap[targetPrevYear];
        } else if (rowRiw) {
          const targetPrevYearCol = 'AK ' + targetPrevYear;
          const colIdxPrevYear = headerRiw.indexOf(targetPrevYearCol);
          if (colIdxPrevYear !== -1 && rowRiw[colIdxPrevYear] !== undefined && rowRiw[colIdxPrevYear] !== '' && !isNaN(parseFloat(rowRiw[colIdxPrevYear]))) {
            akLama = parseFloat(rowRiw[colIdxPrevYear]);
          } else {
            akLama = ak2025;
          }
        } else {
          akLama = ak2025;
        }
      }
    }

    let akSebelum = akLama;
    let akPeriode = 0;
    const selectedMonthsData = [];

    const isCPNS = pegObj.status && pegObj.status.toString().toUpperCase().includes('CPNS');
    monthCols.forEach(m => {
      const rating = rowInput ? (rowInput[m.colIndex] || 'Baik').toString().trim() : 'Baik';
      const mult = mapFaktor[rating] !== undefined ? mapFaktor[rating] : 1.0;
      let monthlyAK = (koefDasar * mult) / 12;

      const isNewAppointmentInYear = baseline2022 <= 0 && cumMap[2025] <= 0 && tmtYear === m.year;
      if ((isCPNS || isNewAppointmentInYear) && (m.year === tmtYear && m.month < tmtMonth)) {
        monthlyAK = 0;
      }

      if ((m.year > startYear || (m.year === startYear && m.month >= startMonth)) &&
          (m.year < endYear || (m.year === endYear && m.month <= endMonth))) {
        akPeriode += monthlyAK;
        selectedMonthsData.push({
          tahun: m.year,
          bulan: m.month,
          namaBulan: NAMA_BULAN_ID[m.month - 1],
          predikat: rating,
          persentase: (mult * 100) + '%',
          ak: monthlyAK
        });
      }
    });

    // Hitung Nilai AK pada bulan akhir periode (akAkhirPeriode)
    let akAkhirPeriode = ak2025;
    if (endYear >= 2026) {
      let sumToMonth = 0;
      monthCols.forEach(m => {
        if (m.year < endYear || (m.year === endYear && m.month <= endMonth)) {
          const rating = rowInput ? (rowInput[m.colIndex] || 'Baik').toString().trim() : 'Baik';
          const mult = mapFaktor[rating] !== undefined ? mapFaktor[rating] : 1.0;
          let monthlyAK = (koefDasar * mult) / 12;
          const isNewAppointmentInYear = baseline2022 <= 0 && cumMap[2025] <= 0 && tmtYear === m.year;
          if ((isCPNS || isNewAppointmentInYear) && (m.year === tmtYear && m.month < tmtMonth)) {
            monthlyAK = 0;
          }
          sumToMonth += monthlyAK;
        }
      });
      akAkhirPeriode = ak2025 + sumToMonth;
    } else if (endYear === 2025) {
      akAkhirPeriode = (tmtYear > 2025) ? 0 : ak2025;
    } else if (endYear < 2025) {
      if (tmtYear > endYear) {
        akAkhirPeriode = 0;
      } else if (cumMap[endYear] !== undefined) {
        akAkhirPeriode = cumMap[endYear];
      } else if (rowRiw) {
        const colIdxEndYear = headerRiw.indexOf('AK ' + endYear);
        if (colIdxEndYear !== -1 && rowRiw[colIdxEndYear] !== undefined && !isNaN(parseFloat(rowRiw[colIdxEndYear]))) {
          akAkhirPeriode = parseFloat(rowRiw[colIdxEndYear]);
        } else {
          akAkhirPeriode = ak2025;
        }
      } else {
        akAkhirPeriode = (tmtYear > endYear) ? 0 : ak2025;
      }
    }

    // {{AK_BARU}} = Nilai AK pada akhir periode - Nilai PAK (akLama)
    let akBaru = Math.max(0, akAkhirPeriode - akLama);
    // {{AK_JUMLAH}} = AK Lama + AK Baru
    let akJumlah = akLama + akBaru;
    const akSesudah = akJumlah;

    const groupedKonversi = {};
    selectedMonthsData.forEach(m => {
      const key = m.predikat;
      if (!groupedKonversi[key]) {
        groupedKonversi[key] = {
          predikat: m.predikat,
          persentase: m.persentase,
          koef: koefDasar,
          ak: 0,
          bulanCount: 0
        };
      }
      groupedKonversi[key].ak += m.ak;
      groupedKonversi[key].bulanCount++;
    });
    const listKonversi = Object.values(groupedKonversi);
    if (listKonversi.length === 0) {
      const jumlahBulanPeriode = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
      const akKonv = (jumlahBulanPeriode / 12) * koefDasar;
      listKonversi.push({
        predikat: 'Baik',
        persentase: '100%',
        koef: koefDasar,
        ak: akBaru > 0 ? akBaru : akKonv,
        bulanCount: jumlahBulanPeriode
      });
    }

    // 5. Get/Create Google Doc Template ID
    const templateId = getTemplateIdFromSheet(jenis);

    // 6. Make a copy of the template doc
    const rootFolder = getOrCreateDriveFolder('SIDAK6100 SDM');
    const draftsFolder = getOrCreateDriveSubFolder(rootFolder, '[3] Drafts');
    const satkerDraftFolder = getOrCreateDriveSubFolder(draftsFolder, `Satker_${pegObj.kodeSatker}`);
    const destinationFolder = getOrCreateDriveSubFolder(satkerDraftFolder, `${pegObj.nama}_${nip}`);

    const startPeriodFormatted = `${startYear}${String(startMonth).padStart(2, '0')}`;
    const endPeriodFormatted = `${endYear}${String(endMonth).padStart(2, '0')}`;
    const jenisLabelMap = {
      integrasi: 'AKUMULASI',
      akumulasi: 'AKUMULASI',
      pak: 'PAK',
      konversi: 'KONVERSI'
    };
    const jenisLabel = jenisLabelMap[(jenis || '').toLowerCase()] || (jenis || '').toUpperCase();
    const namaPegawai = pegObj.nama || 'Pegawai';

    const templateFile = DriveApp.getFileById(templateId);
    const docName = `Draft_${jenisLabel}_${namaPegawai}_${startPeriodFormatted}_s.d_${endPeriodFormatted}`;

    // Hapus file draft lama jika ada dengan nama yang sama untuk menghindari duplikasi
    const existingDrafts = destinationFolder.getFilesByName(docName);
    while (existingDrafts.hasNext()) {
      try {
        existingDrafts.next().setTrashed(true);
      } catch (e) {
        console.warn('Gagal menghapus file draft lama: ' + e.message);
      }
    }

    const copyFile = templateFile.makeCopy(docName, destinationFolder);
    const copyId = copyFile.getId();

    // 7. Open copy and modify placeholders
    const doc = DocumentApp.openById(copyId);
    const body = doc.getBody();

    const rangeText = `${NAMA_BULAN_ID[startMonth - 1]} ${startYear} s.d. ${NAMA_BULAN_ID[endMonth - 1]} ${endYear}`;
    const now = new Date();
    const tglPenetapanDate = tanggalPenetapan ? new Date(tanggalPenetapan) : now;
    const tglCetak = formatTanggalID(isNaN(tglPenetapanDate) ? now : tglPenetapanDate);

    const jumlahBulan = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
    const koefLabel = (jumlahBulan === 12) ? "KOEFISIEN PER 1 TAHUN" : `KOEFISIEN PER ${jumlahBulan} BULAN`;

    let totalAK = akSesudah;
    let integrasiRows = [];
    if (jenis === 'integrasi') {
      integrasiRows = buildIntegrasiRows(rowRiw, headerRiw, rowInput, startYear, startMonth, endYear, endMonth, koefDasar, monthCols, mapFaktor, pegObj);
      totalAK = integrasiRows.reduce((sum, r) => sum + (typeof r.akDapat === 'number' ? r.akDapat : (parseFloat(r.akDapat) || 0)), 0);
    }

    const replacements = {
      '{{NAMA}}': pegObj.nama,
      '{{NIP}}': pegObj.nip,
      '{{NOMOR_SURAT}}': nomorSurat || '',
      '{{KARPEG}}': pegObj.karpeg,
      '{{TTL}}': pegObj.ttl,
      '{{JENIS_KELAMIN}}': pegObj.jenisKelamin,
      '{{PANGKAT_GOL_TMT}}': pegObj.pangkatGolTMT,
      '{{JABATAN}}': pegObj.jabatan,
      '{{JABATAN_TMT}}': pegObj.jabatanTMT,
      '{{TMT_JABATAN}}': pegObj.tmtJabatan || '-',
      '{{TMT_GOLONGAN}}': pegObj.tmtGolongan || '-',
      '{{TMT}}': pegObj.tmtGolongan || pegObj.tmtJabatan || '-',
      '{{UNIT_KERJA}}': satkerObj.namaSatker.replace(/^BPS\s+/i, ''),
      '{{UNIT_KERJA_KOP}}': satkerObj.namaSatker
      .replace(/^BPS\s+/i, '')
      .toUpperCase(),
      '{{MASA_KERJA_LAMA}}': pegObj.masaKerjaLama,
      '{{MASA_KERJA_BARU}}': pegObj.masaKerjaBaru,
      '{{PENDIDIKAN}}': pegObj.pendidikan,
      '{{ALAMAT}}': satkerObj.alamat,
      '{{LAMAN}}': satkerObj.laman,
      '{{EMAIL}}': satkerObj.posEl,
      '{{POSEL}}': satkerObj.posEl,
      '{{KOTA_PENETAPAN}}': satkerObj.kotaPenetapan,
      '{{TANGGAL_PENETAPAN}}': tglCetak,
      '{{NAMA_KEPALA}}': satkerObj.namaKepala,
      '{{NIP_KEPALA}}': satkerObj.nipKepala,
      '{{PERIODE}}': rangeText,
      '{{MASA_PENILAIAN}}': rangeText,
      '{{JUDUL_KEPALA}}': `Kepala ${satkerObj.namaSatker}`,
      '{{AK_LAMA}}': formatAngkaID(akLama),
      '{{AK_BARU}}': formatAngkaID(akBaru),
      '{{AK_JUMLAH}}': formatAngkaID(akJumlah),
      '{{AK_SEBELUM}}': formatAngkaID(akLama),
      '{{AK_PERIODE}}': formatAngkaID(akBaru),
      '{{AK_SESUDAH}}': formatAngkaID(akJumlah),
      '{{AK_TOTAL}}': formatAngkaID(totalAK),
      '{{NILAI_DASAR}}': formatAngkaID(akLama),
      '{{AK_INTEGRASI}}': formatAngkaID(akBaru)
    };

    for (const [key, val] of Object.entries(replacements)) {
      body.replaceText(key, String(val));
    }

    const docHeaders = doc.getHeader() ? [doc.getHeader()] : [];
    const docFooters = doc.getFooter() ? [doc.getFooter()] : [];

    [...docHeaders, ...docFooters].forEach(sect => {
      for (const [key, val] of Object.entries(replacements)) {
        sect.replaceText(key, String(val));
      }
    });

    if (jenis === 'konversi') {
      body.replaceText("KOEFISIEN TARGET / TAHUN", koefLabel);
      body.replaceText("KOEFISIEN TARGET/TAHUN", koefLabel);
      body.replaceText("KOEFISIEN PER TAHUN", koefLabel);
      body.replaceText("KOEFISIEN AK/TAHUN", koefLabel);
      body.replaceText("Koefisien Target / Tahun", koefLabel);
      body.replaceText("Koefisien Target/Tahun", koefLabel);
      body.replaceText("Koefisien Per Tahun", koefLabel);
      body.replaceText("Koefisien AK/Tahun", koefLabel);
      
      [...docHeaders, ...docFooters].forEach(sect => {
        sect.replaceText("KOEFISIEN TARGET / TAHUN", koefLabel);
        sect.replaceText("KOEFISIEN TARGET/TAHUN", koefLabel);
        sect.replaceText("KOEFISIEN PER TAHUN", koefLabel);
        sect.replaceText("KOEFISIEN AK/TAHUN", koefLabel);
        sect.replaceText("Koefisien Target / Tahun", koefLabel);
        sect.replaceText("Koefisien Target/Tahun", koefLabel);
        sect.replaceText("Koefisien Per Tahun", koefLabel);
        sect.replaceText("Koefisien AK/Tahun", koefLabel);
      });
    }

    // 8. Populate tables dynamically
    if (jenis === 'konversi') {
      populateTableKonversi(body, listKonversi);
    } 
    else if (jenis === 'integrasi') {
      populateTableIntegrasi(body, integrasiRows);
    } 
    else if (jenis === 'pak') {
      populateTablePAK(body, akSebelum, akPeriode, akSesudah, pegObj, jenjang);
    }

    doc.saveAndClose();

    // 9. Convert Google Doc to PDF
    const pdfBlob = copyFile.getAs('application/pdf');
    const pdfName = `SIDAK6100_${jenisLabel}_${namaPegawai}_${startPeriodFormatted}_s.d_${endPeriodFormatted}.pdf`;

    const archivesFolder = getOrCreateDriveSubFolder(rootFolder, '[4] Archives');
    const satkerArchiveFolder = getOrCreateDriveSubFolder(archivesFolder, `Satker_${pegObj.kodeSatker}`);
    const pegawaiArchiveFolder = getOrCreateDriveSubFolder(satkerArchiveFolder, `${pegObj.nama}_${nip}`);

    // Hapus file arsip lama jika ada dengan nama yang sama untuk menghindari duplikasi
    const existingArchives = pegawaiArchiveFolder.getFilesByName(pdfName);
    while (existingArchives.hasNext()) {
      try {
        existingArchives.next().setTrashed(true);
      } catch (e) {
        console.warn('Gagal menghapus file arsip lama: ' + e.message);
      }
    }

    const pdfFile = pegawaiArchiveFolder.createFile(pdfBlob);
    pdfFile.setName(pdfName);

    // 10. Save to History_PAK sheet (hanya jika recordToSheet !== false dan previewOnly !== true)
    if (payload.recordToSheet !== false && payload.previewOnly !== true) {
      const ssDb = SpreadsheetApp.getActiveSpreadsheet();
      const sheetHist = ssDb.getSheetByName(SHEET_NAMES.HISTORY_PAK) || createHistorySheetStructure(ssDb);
      const dbHist = sheetHist.getDataRange().getValues();
      const headerHist = dbHist[0];

      const uuid = 'DOC-' + Utilities.getUuid().substring(0, 8).toUpperCase();
      const tglDibuat = Utilities.formatDate(new Date(), ssDb.getSpreadsheetTimeZone(), 'dd MMMM yyyy HH:mm');

      const newHistRow = headerHist.map(h => {
        if (h === 'ID_Dokumen') return uuid;
        if (h === 'NIP') return nip;
        if (h === 'Nama_Pegawai') return pegObj.nama;
        if (h === 'Kode_Satker') return pegObj.kodeSatker;
        if (h === 'Tahun') return endYear;
        if (h === 'Jenis_Dokumen') return jenis.toUpperCase();
        if (h === 'Nama_File') return pdfName;
        if (h === 'Drive_File_ID') return pdfFile.getId();
        if (h === 'Tanggal_Dibuat') return tglDibuat;
        if (h === 'Google_Doc_URL') return copyFile.getUrl();
        if (h === 'Nomor_Surat' || h === 'NomorSurat') return nomorSurat || '';
        if (h === 'Bulan_Awal' || h === 'BulanAwal') return bulanAwal || '';
        if (h === 'Bulan_Akhir' || h === 'BulanAkhir') return bulanAkhir || '';
        return '';
      });

      sheetHist.appendRow(newHistRow);
    }

    return jsonResponse({
      success: true,
      pdfUrl: pdfFile.getUrl(),
      pdfId: pdfFile.getId(),
      docUrl: copyFile.getUrl(),
      docId: copyId,
      fileName: pdfName
    });

  } catch (err) {
    console.error('Error generating document: ' + err.message);
    return errorResponse('Gagal membuat dokumen: ' + err.message, 500);
  }
}

function formatPeriodString(val) {
  if (val === null || val === undefined) return '';
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }
  const str = val.toString().trim();
  const match = str.match(/(\d{4})[-/](\d{1,2})/);
  if (match) {
    return `${match[1]}-${String(match[2]).padStart(2, '0')}`;
  }
  return str;
}

function cleanNIPVal(val) {
  return val ? val.toString().replace(/[^\d]/g, '').trim() : '';
}

function cleanJenisVal(val) {
  if (!val) return '';
  const str = val.toString().toLowerCase();
  if (str.includes('konv')) return 'konversi';
  if (str.includes('integ') || str.includes('akm')) return 'integrasi';
  if (str.includes('pak')) return 'pak';
  return str.replace(/[^a-z0-9]/g, '');
}

function handleRecordDocIssuance(payload, session) {
  const { nip, jenis, bulanAwal, bulanAkhir, tanggalPenetapan, nomorSurat, pdfUrl, pdfId, docUrl, docId, fileName } = payload;
  if (!nip || !jenis || !bulanAwal || !bulanAkhir || !nomorSurat) {
    return errorResponse('Parameter recording dokumen kurang lengkap (nip, jenis, bulanAwal, bulanAkhir, nomorSurat).');
  }

  if (session.role === 'Viewer' && session.nip !== nip) {
    return errorResponse('Tidak memiliki akses ke pegawai lain.', 403);
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetHist = ss.getSheetByName(SHEET_NAMES.HISTORY_PAK) || createHistorySheetStructure(ss);
    const dbHist = sheetHist.getDataRange().getValues();
    const headerHist = dbHist[0];

    const findCol = (namePatterns) => {
      return headerHist.findIndex(h => {
        if (!h) return false;
        const cleanH = h.toString().toLowerCase().replace(/[^a-z0-9]/g, '');
        return namePatterns.some(p => cleanH === p.toLowerCase().replace(/[^a-z0-9]/g, ''));
      });
    };

    const colNIP = findCol(['NIP', 'nip']);
    const colJenis = findCol(['Jenis_Dokumen', 'JenisDokumen', 'Jenis']);
    const colAwal = findCol(['Bulan_Awal', 'BulanAwal', 'BulanAwalTahun', 'Bulan Awal Tahun']);
    const colAkhir = findCol(['Bulan_Akhir', 'BulanAkhir', 'BulanAkhirTahun', 'Bulan Akhir Tahun']);
    const colNomor = findCol(['Nomor_Surat', 'NomorSurat', 'Nomor']);

    // Cari pegawai name & satker
    const { data: dataPeg, header: headerPeg } = getSheetData(SHEET_NAMES.PEGAWAI);
    const pegColNIP = headerPeg.findIndex(h => h && h.toUpperCase() === 'NIP');
    const pegColNama = headerPeg.findIndex(h => h && h.toUpperCase() === 'NAMA');
    const pegColKode = headerPeg.findIndex(h => h && h.toUpperCase() === 'KODESATKER');
    
    let namaPeg = '';
    let kodeSatker = '';
    for (let i = 1; i < dataPeg.length; i++) {
      if (dataPeg[i][pegColNIP] && dataPeg[i][pegColNIP].toString().trim() === nip.toString().trim()) {
        namaPeg = dataPeg[i][pegColNama] || '';
        kodeSatker = dataPeg[i][pegColKode] ? dataPeg[i][pegColKode].toString().trim() : '';
        break;
      }
    }

    const tglDibuat = Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), 'dd MMMM yyyy HH:mm');
    const endYear = bulanAkhir ? parseInt(bulanAkhir.split('-')[0], 10) : new Date().getFullYear();

    // Check if row already exists in History_PAK & deduplicate any extra rows
    let existingRowIdx = -1;
    const duplicateRows = [];

    if (colNIP !== -1 && colJenis !== -1) {
      for (let i = 1; i < dbHist.length; i++) {
        const row = dbHist[i];
        const rNip = cleanNIPVal(row[colNIP]);
        const rJenis = cleanJenisVal(row[colJenis]);
        const rAwal = colAwal !== -1 ? formatPeriodString(row[colAwal]) : '';
        const rAkhir = colAkhir !== -1 ? formatPeriodString(row[colAkhir]) : '';

        if (rNip === cleanNIPVal(nip) &&
            rJenis === cleanJenisVal(jenis) &&
            (colAwal === -1 || !rAwal || rAwal === formatPeriodString(bulanAwal)) &&
            (colAkhir === -1 || !rAkhir || rAkhir === formatPeriodString(bulanAkhir))) {
          
          if (existingRowIdx === -1) {
            existingRowIdx = i + 1;
          } else {
            duplicateRows.push(i + 1);
          }
        }
      }
    }

    // Hapus baris duplikat (jika sebelumnya ada duplikasi akibat perpindahan device/browser)
    if (duplicateRows.length > 0) {
      for (let d = duplicateRows.length - 1; d >= 0; d--) {
        try { sheetHist.deleteRow(duplicateRows[d]); } catch (e) {}
      }
    }

    if (existingRowIdx !== -1) {
      if (colNomor !== -1) sheetHist.getRange(existingRowIdx, colNomor + 1).setValue(nomorSurat);
      const colFileID = headerHist.indexOf('Drive_File_ID');
      if (colFileID !== -1 && pdfId) sheetHist.getRange(existingRowIdx, colFileID + 1).setValue(pdfId);
      const colDocURL = headerHist.indexOf('Google_Doc_URL');
      if (colDocURL !== -1 && docUrl) sheetHist.getRange(existingRowIdx, colDocURL + 1).setValue(docUrl);
      const colTgl = headerHist.indexOf('Tanggal_Dibuat');
      if (colTgl !== -1) sheetHist.getRange(existingRowIdx, colTgl + 1).setValue(tglDibuat);
    } else {
      const uuid = 'DOC-' + Utilities.getUuid().substring(0, 8).toUpperCase();
      const newHistRow = headerHist.map(h => {
        if (h === 'ID_Dokumen') return uuid;
        if (h === 'NIP') return nip;
        if (h === 'Nama_Pegawai') return namaPeg;
        if (h === 'Kode_Satker') return kodeSatker;
        if (h === 'Tahun') return endYear;
        if (h === 'Jenis_Dokumen') return jenis.toUpperCase();
        if (h === 'Nama_File') return fileName || '';
        if (h === 'Drive_File_ID') return pdfId || '';
        if (h === 'Tanggal_Dibuat') return tglDibuat;
        if (h === 'Google_Doc_URL') return docUrl || '';
        if (h === 'Nomor_Surat' || h === 'NomorSurat') return nomorSurat || '';
        if (h === 'Bulan_Awal' || h === 'BulanAwal') return bulanAwal || '';
        if (h === 'Bulan_Akhir' || h === 'BulanAkhir') return bulanAkhir || '';
        return '';
      });
      sheetHist.appendRow(newHistRow);
    }

    return jsonResponse({
      success: true,
      message: 'Nomor surat dan dokumen berhasil dicatat.'
    });

  } catch (e) {
    console.error('Error handleRecordDocIssuance: ' + e.message);
    return errorResponse('Gagal mencatat dokumen: ' + e.message, 500);
  }
}

function getTemplateIdFromSheet(jenis) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Templates');
  if (!sheet) {
    sheet = ss.insertSheet('Templates');
    sheet.getRange(1, 1, 1, 3).setValues([['Nama_Template', 'Google_Doc_ID', 'Deskripsi']]).setFontWeight('bold').setBackground('#e2e8f0');
    sheet.setFrozenRows(1);
    
    const rows = [
      ['konversi', '', 'Template Konversi Predikat Kinerja ke Angka Kredit'],
      ['integrasi', '', 'Template Akumulasi Angka Kredit Integrasi'],
      ['pak', '', 'Template Penetapan Angka Kredit (PAK)']
    ];
    sheet.getRange(2, 1, rows.length, 3).setValues(rows);
    SpreadsheetApp.flush();
  }

  const data = sheet.getDataRange().getValues();
  let templateId = '';
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] && data[i][0].toString().toLowerCase().trim() === jenis.toLowerCase().trim()) {
      templateId = data[i][1];
      rowIndex = i + 1;
      break;
    }
  }

  if (templateId) {
    try {
      DriveApp.getFileById(templateId);
      return templateId;
    } catch (e) {
      console.warn(`Template ID "${templateId}" untuk "${jenis}" tidak valid. Membuat template baru...`);
    }
  }

  const newTemplateId = createDefaultTemplateDoc(jenis);
  if (rowIndex !== -1) {
    sheet.getRange(rowIndex, 2).setValue(newTemplateId);
  } else {
    sheet.appendRow([jenis, newTemplateId, `Template ${jenis.toUpperCase()} otomatis`]);
  }
  SpreadsheetApp.flush();
  return newTemplateId;
}

function createDefaultTemplateDoc(jenis) {
  const docName = `Template_${jenis.toUpperCase()}_Official`;
  const rootFolder = getOrCreateDriveFolder('SIDAK6100 SDM');
  const templateFolder = getOrCreateDriveSubFolder(rootFolder, 'Templates');
  
  const doc = DocumentApp.create(docName);
  const file = DriveApp.getFileById(doc.getId());
  
  templateFolder.addFile(file);
  DriveApp.getRootFolder().removeFile(file);
  
  const body = doc.getBody();
  body.setMarginTop(36);
  body.setMarginBottom(36);
  body.setMarginLeft(48);
  body.setMarginRight(48);
  
  const style = {};
  style[DocumentApp.Attribute.FONT_FAMILY] = 'Arial';
  style[DocumentApp.Attribute.FONT_SIZE] = 10;
  body.setAttributes(style);

  const header = doc.addHeader() || doc.getHeader();
  const headerPara = header.appendParagraph("BADAN PUSAT STATISTIK\n{{UNIT_KERJA_KOP}}\n{{ALAMAT}}\nLaman: {{LAMAN}} Pos-el: {{EMAIL}}");
  headerPara.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  headerPara.setFontFamily('Arial');
  headerPara.setFontSize(8.5);
  headerPara.setItalic(true);
  
  if (jenis === 'konversi') {
    buildDefaultKonversiStructure(body);
  } else if (jenis === 'integrasi') {
    buildDefaultIntegrasiStructure(body);
  } else if (jenis === 'pak') {
    buildDefaultPAKStructure(body);
  }
  
  doc.saveAndClose();
  return doc.getId();
}

function buildDefaultKonversiStructure(body) {
  const title = body.appendParagraph("KONVERSI PREDIKAT KINERJA KE ANGKA KREDIT");
  title.setFontSize(12).setBold(true).setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  
  const subtitle = body.appendParagraph("NOMOR : B-102/6172/KP.600/2026");
  subtitle.setFontSize(10).setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  
  body.appendParagraph("\nInstansi : Badan Pusat Statistik\nMasa Penilaian : {{MASA_PENILAIAN}}\n");
  
  body.appendParagraph("PEJABAT FUNGSIONAL YANG DINILAI").setBold(true);
  const table1 = body.appendTable([
    ["1", "Nama", ": {{NAMA}}"],
    ["2", "NIP", ": {{NIP}}"],
    ["3", "Nomor Seri KARPEG", ": {{KARPEG}}"],
    ["4", "Tempat dan Tanggal Lahir", ": {{TTL}}"],
    ["5", "Jenis Kelamin", ": {{JENIS_KELAMIN}}"],
    ["6", "Pangkat/Golongan Ruang/TMT", ": {{PANGKAT_GOL_TMT}}"],
    ["7", "Jabatan / TMT", ": {{JABATAN_TMT}}"],
    ["8", "Unit Kerja", ": {{UNIT_KERJA}}, {{UNIT_KERJA_KOP}}"]
  ]);
  styleTable(table1);

  body.appendParagraph("\nKONVERSI PREDIKAT KINERJA KE ANGKA KREDIT").setBold(true);
  const table2 = body.appendTable([
    ["PREDIKAT KINERJA", "PERSENTASE", "KOEFISIEN TARGET / TAHUN", "ANGKA KREDIT PEROLEHAN"],
    ["{{PREDIKAT}}", "{{PERSENTASE}}", "{{KOEF_TARGET}}", "{{AK_DAPAT}}"]
  ]);
  styleTable(table2);
  
  appendSignatureBlock(body);
}

function buildDefaultIntegrasiStructure(body) {
  const title = body.appendParagraph("AKUMULASI PENILAIAN ANGKA KREDIT INTEGRASI");
  title.setFontSize(12).setBold(true).setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  
  body.appendParagraph("\nPEJABAT FUNGSIONAL YANG DINILAI").setBold(true);
  const table1 = body.appendTable([
    ["Nama Pegawai", "{{NAMA}}"],
    ["NIP", "{{NIP}}"],
    ["Pangkat / Golongan ruang / TMT", "{{PANGKAT_GOL_TMT}}"],
    ["Jabatan / TMT", "{{JABATAN_TMT}}"],
    ["Unit Kerja", "{{UNIT_KERJA}}, {{UNIT_KERJA_KOP}}"]
  ]);
  styleTable(table1);
  
  body.appendParagraph("\nHASIL PENILAIAN ANGKA KREDIT").setBold(true);
  const table2 = body.appendTable([
    ["TAHUN / PERIODE", "BULAN", "PREDIKAT", "PERSENTASE", "KOEFISIEN", "ANGKA KREDIT YANG DIDAPAT"],
    ["{{TAHUN}}", "{{BULAN}}", "{{PREDIKAT}}", "{{PERSENTASE}}", "{{KOEF}}", "{{AK_DAPAT}}"]
  ]);
  styleTable(table2);
  
  const totalPara = body.appendParagraph("\nTOTAL AKUMULASI INTEGRASI: {{AK_TOTAL}}");
  totalPara.setBold(true).setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  
  appendSignatureBlock(body);
}

function buildDefaultPAKStructure(body) {
  const title = body.appendParagraph("PENETAPAN ANGKA KREDIT (PAK)");
  title.setFontSize(12).setBold(true).setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  
  const subtitle = body.appendParagraph("Nomor: 00.1709/PAK/ST/2026");
  subtitle.setFontSize(10).setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  
  body.appendParagraph("\nKETERANGAN PERORANGAN").setBold(true);
  const table1 = body.appendTable([
    ["1", "Nama Lengkap", "{{NAMA}}"],
    ["2", "NIP", "{{NIP}}"],
    ["3", "Nomor Seri KARPEG", "{{KARPEG}}"],
    ["4", "Tempat dan Tanggal Lahir", "{{TTL}}"],
    ["5", "Jenis Kelamin", "{{JENIS_KELAMIN}}"],
    ["6", "Pangkat / Golongan / TMT", "{{PANGKAT_GOL_TMT}}"],
    ["7", "Jabatan Fungsional / TMT", "{{JABATAN_TMT}}"],
    ["8", "Unit Kerja", "{{UNIT_KERJA}}, {{UNIT_KERJA_KOP}}"]
  ]);
  styleTable(table1);
  
  body.appendParagraph("\nPENETAPAN ANGKA KREDIT").setBold(true);
  const table2 = body.appendTable([
    ["NO", "KOMPONEN PENETAPAN ANGKA KREDIT", "LAMA", "BARU", "JUMLAH"],
    ["1", "Angka Kredit Dasar Konversi", "-", "-", "-"],
    ["2", "Angka Kredit JF Lama", "{{AK_LAMA}}", "-", "{{AK_LAMA}}"],
    ["3", "Angka Kredit Penyesuaian", "-", "-", "-"],
    ["4", "Angka Kredit Konversi Periode Berjalan", "-", "{{AK_BARU}}", "{{AK_BARU}}"],
    ["JUMLAH", "TOTAL ANGKA KREDIT KUMULATIF", "{{AK_LAMA}}", "{{AK_BARU}}", "{{AK_JUMLAH}}"]
  ]);
  styleTable(table2);
  
  body.appendParagraph("\nKeterangan Kenaikan Pangkat/Jabatan:").setBold(true);
  const table3 = body.appendTable([
    ["Syarat AK minimal Kenaikan Pangkat", "{{AK_SYARAT_PANGKAT}}"],
    ["Syarat AK minimal Kenaikan Jabatan", "{{AK_SYARAT_JABATAN}}"],
    ["Kekurangan AK untuk Kenaikan Pangkat", "{{AK_KURANG_PANGKAT}}"],
    ["Kekurangan AK untuk Kenaikan Jabatan", "{{AK_KURANG_JABATAN}}"]
  ]);
  styleTable(table3);
  
  body.appendParagraph("\nStatus Kenaikan Pangkat: {{STATUS_KETERANGAN}}").setItalic(true);
  
  appendSignatureBlock(body);
}

function styleTable(table) {
  table.setBorderColor('#000000');
  table.setBorderWidth(1);
}

function appendSignatureBlock(body) {
  const sig = body.appendParagraph("\nDitetapkan di : {{KOTA_PENETAPAN}}\nPada tanggal : {{TANGGAL_PENETAPAN}}\n\n{{JUDUL_KEPALA}},\n\n\n{{NAMA_KEPALA}}\nNIP. {{NIP_KEPALA}}");
  sig.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
}

function populateTableKonversi(body, listKonversi) {
  const placeholder = '{{PREDIKAT}}';
  const element = body.findText(placeholder);
  if (!element) return;
  
  // Mencari TableRow secara dinamis dengan mendaki hirarki dokumen
  let rowParent = element.getElement().getParent();
  while (rowParent && rowParent.getType() !== DocumentApp.ElementType.TABLE_ROW) {
    rowParent = rowParent.getParent();
  }
  const row = rowParent;
  if (!row) return;
  
  // Mencari Table secara dinamis dengan mendaki hirarki dokumen
  let tableParent = row.getParent();
  while (tableParent && tableParent.getType() !== DocumentApp.ElementType.TABLE) {
    tableParent = tableParent.getParent();
  }
  const table = tableParent;
  if (!table) return;
  const rowIndex = table.getChildIndex(row);
  listKonversi.forEach((item, index) => {
    const newRow = row.copy();
    newRow.replaceText('{{PREDIKAT}}', item.predikat.toUpperCase());
    newRow.replaceText('{{PERSENTASE}}', item.persentase);
    const koefPeriode = (item.koef * item.bulanCount) / 12;
    newRow.replaceText('{{KOEF_TARGET}}', formatAngkaID(koefPeriode));
    let akDapatVal = item.ak;
    const pctNum = parseFloat(String(item.persentase).replace('%', '')) || 0;
    if (akDapatVal <= 0 && pctNum > 0 && item.bulanCount > 0) {
      akDapatVal = Math.round(((koefPeriode * pctNum) / 100) * 1000) / 1000;
    }
    newRow.replaceText('{{AK_DAPAT}}', formatAngkaID(akDapatVal));
    table.insertTableRow(rowIndex + 1 + index, newRow);
  });
  table.removeChild(row);
}

function parseDateToPartsGS(val) {
  if (!val) return null;
  if (val instanceof Date && !isNaN(val.getTime())) {
    return { year: val.getFullYear(), month: val.getMonth() + 1, day: val.getDate(), time: val.getTime() };
  }
  const str = String(val).trim();
  if (!str || str === '-' || str === '—' || str.toLowerCase() === 'null') return null;
  const mISO = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (mISO) {
    const y = parseInt(mISO[1], 10), m = parseInt(mISO[2], 10), d = parseInt(mISO[3], 10);
    return { year: y, month: m, day: d, time: new Date(y, m - 1, d).getTime() };
  }
  const mDMY = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (mDMY) {
    const d = parseInt(mDMY[1], 10), m = parseInt(mDMY[2], 10), y = parseInt(mDMY[3], 10);
    return { year: y, month: m, day: d, time: new Date(y, m - 1, d).getTime() };
  }
  const dt = new Date(str);
  if (!isNaN(dt.getTime())) {
    return { year: dt.getFullYear(), month: dt.getMonth() + 1, day: dt.getDate(), time: dt.getTime() };
  }
  return null;
}

function getRelevantTMTGS(pegObj) {
  if (!pegObj) return { year: 2022, month: 1, type: 'TMT' };
  const rawJab = pegObj.tmtJabatan || pegObj['TMT Jabatan'] || '';
  const rawGol = pegObj.tmtGolongan || pegObj['TMT Golongan'] || pegObj.tmt || '';
  const pJab = parseDateToPartsGS(rawJab);
  const pGol = parseDateToPartsGS(rawGol);
  let relevant = null;
  let type = 'TMT';
  if (pJab) {
    relevant = pJab;
    type = 'TMT Jabatan';
  } else if (pGol) {
    relevant = pGol;
    type = 'TMT Golongan';
  }
  return {
    year: relevant ? relevant.year : 2022,
    month: relevant ? relevant.month : 1,
    type: type,
    parts: relevant
  };
}

function buildIntegrasiRows(rowRiw, headerRiw, rowInput, startYear, startMonth, endYear, endMonth, koefDasar, monthCols, mapFaktor, pegObj) {
  const parseVal = (val) => {
    if (val === undefined || val === null) return 0;
    const s = String(val).trim();
    if (s === '' || s === '-' || s === '(-)' || s === '—' || s === 'null' || s === 'undefined') return 0;
    const num = parseFloat(s.replace(/\s+/g, '').replace(',', '.'));
    return isNaN(num) ? 0 : num;
  };

  const hasValidValue = (val) => {
    if (val === undefined || val === null) return false;
    const s = String(val).trim();
    if (s === '' || s === '-' || s === '(-)' || s === '—' || s === 'null' || s === 'undefined') return false;
    const num = parseFloat(s.replace(/\s+/g, '').replace(',', '.'));
    return !isNaN(num) && num > 0;
  };

  const rows = [];

  // Helper mencari nilai di rowRiw berdasarkan regex header
  const getRiwValByHeader = (pattern, defaultIdx) => {
    if (!rowRiw) return null;
    if (headerRiw && headerRiw.length > 0) {
      for (let i = 0; i < headerRiw.length; i++) {
        const h = String(headerRiw[i] || '').trim();
        if (pattern.test(h)) {
          return rowRiw[i];
        }
      }
    }
    if (defaultIdx !== undefined && defaultIdx < rowRiw.length) {
      return rowRiw[defaultIdx];
    }
    return null;
  };

  const getPredikatDanPersentase = (akDapat, koef, bulanCount) => {
    if (akDapat === undefined || akDapat === null || isNaN(akDapat) || akDapat <= 0 || !koef || koef <= 0) {
      if (akDapat === 0) {
        return { predikat: '-', persentase: '-' };
      }
      return { predikat: 'Baik', persentase: '100%' };
    }

    const mCount = (typeof bulanCount === 'number' && bulanCount > 0) ? bulanCount : (parseInt(bulanCount) || 12);
    const effectiveKoef = (koef * mCount) / 12;
    const ratio = akDapat / effectiveKoef;
    const r = Math.round(ratio * 1000) / 1000;

    if (Math.abs(r - 1.5) < 0.05 || r >= 1.35) {
      return { predikat: 'Sangat Baik', persentase: '150%' };
    } else if (Math.abs(r - 1.0) < 0.05 || (r >= 0.88 && r < 1.35)) {
      return { predikat: 'Baik', persentase: '100%' };
    } else if (Math.abs(r - 0.75) < 0.05 || (r >= 0.63 && r < 0.88)) {
      return { predikat: 'Cukup', persentase: '75%' };
    } else if (Math.abs(r - 0.5) < 0.05 || (r >= 0.38 && r < 0.63)) {
      return { predikat: 'Kurang', persentase: '50%' };
    } else if (Math.abs(r - 0.25) < 0.05 || (r > 0.05 && r < 0.38)) {
      return { predikat: 'Sangat Kurang', persentase: '25%' };
    } else if (r <= 0.05) {
      return { predikat: '-', persentase: '-' };
    }

    const pct = Math.round(r * 100);
    let pred = 'Baik';
    if (pct >= 135) pred = 'Sangat Baik';
    else if (pct >= 88) pred = 'Baik';
    else if (pct >= 63) pred = 'Cukup';
    else if (pct >= 38) pred = 'Kurang';
    else if (pct > 0) pred = 'Sangat Kurang';
    else pred = '-';

    return { predikat: pred, persentase: pct + '%' };
  };

  const relevantTMTInfo = getRelevantTMTGS(pegObj);
  let tmtYear = relevantTMTInfo.year;
  let tmtMonth = relevantTMTInfo.month;

  const rawPakInt2022 = getRiwValByHeader(/pak.*integrasi.*2022/i, 2);
  const rawAk2022 = getRiwValByHeader(/ak.*2022/i, 3);
  let ak2022 = 0;
  if (hasValidValue(rawPakInt2022)) {
    ak2022 = parseVal(rawPakInt2022);
  } else if (hasValidValue(rawAk2022)) {
    ak2022 = parseVal(rawAk2022);
  }

  if (ak2022 > 0 && tmtYear > 2022) {
    tmtYear = 2022;
    tmtMonth = 1;
  }

  // Helper estimasi perolehan AK tahunan sesuai TMT
  const calcYearlyAKRow = (year) => {
    let ak = koefDasar;
    if (tmtYear && tmtMonth) {
      if (tmtYear === year) {
        ak = (Math.max(0, 12 - tmtMonth + 1) / 12) * koefDasar;
      } else if (tmtYear > year) {
        ak = 0;
      }
    }
    return Math.round(ak * 1000) / 1000;
  };

  // 1. Tahun 2022 (Cut-off Integrasi) - jika endYear >= 2022 dan (ak2022 > 0 || tmtYear <= 2022)
  if (endYear >= 2022 && (ak2022 > 0 || tmtYear <= 2022)) {
    if (ak2022 > 0) {
      rows.push({
        tahun: '2022',
        bulan: '-',
        predikat: '-',
        persentase: '-',
        koef: '-',
        akDapat: ak2022
      });
    }
  }

  // 2. Tahun 2023 - jika endYear >= 2023 dan (ak2022 > 0 || tmtYear <= 2023 || hasValidValue(rawPakKonv2023))
  let cum2023 = ak2022;
  const rawPakKonv2023 = getRiwValByHeader(/pak.*konversi.*2023/i, 4);
  const pakKonv2023 = parseVal(rawPakKonv2023);
  const ak2023 = pakKonv2023 - ak2022;
  if (endYear >= 2023 && (ak2022 > 0 || tmtYear <= 2023 || hasValidValue(rawPakKonv2023))) {
    if (hasValidValue(rawPakKonv2023) && ak2023 > 0) {
      cum2023 = pakKonv2023;
      const info2023 = getPredikatDanPersentase(ak2023, koefDasar, 12);
      rows.push({
        tahun: '2023',
        bulan: '12',
        predikat: info2023.predikat,
        persentase: info2023.persentase,
        koef: koefDasar,
        akDapat: ak2023
      });
    } else {
      const ak2023Est = calcYearlyAKRow(2023);
      cum2023 = Math.round((ak2022 + ak2023Est) * 1000) / 1000;
      if (ak2023Est > 0) {
        rows.push({
          tahun: '2023',
          bulan: String(tmtYear === 2023 ? (12 - tmtMonth + 1) : 12),
          predikat: 'Baik',
          persentase: '100%',
          koef: koefDasar,
          akDapat: ak2023Est
        });
      }
    }
  }

  // 3. Tahun 2024 - jika endYear >= 2024 dan (cum2023 > 0 || tmtYear <= 2024 || hasValidValue(rawAk2024))
  let cum2024 = cum2023;
  const rawAk2024 = getRiwValByHeader(/ak.*2024/i, 5);
  const akKumulatif2024 = parseVal(rawAk2024);
  const prevCum2024 = cum2023;
  const ak2024 = akKumulatif2024 - prevCum2024;
  if (endYear >= 2024 && (cum2023 > 0 || tmtYear <= 2024 || hasValidValue(rawAk2024))) {
    if (hasValidValue(rawAk2024) && ak2024 > 0) {
      cum2024 = akKumulatif2024;
      const info2024 = getPredikatDanPersentase(ak2024, koefDasar, 12);
      rows.push({
        tahun: '2024',
        bulan: '12',
        predikat: info2024.predikat,
        persentase: info2024.persentase,
        koef: koefDasar,
        akDapat: ak2024
      });
    } else {
      const ak2024Est = calcYearlyAKRow(2024);
      cum2024 = Math.round((cum2023 + ak2024Est) * 1000) / 1000;
      if (ak2024Est > 0) {
        rows.push({
          tahun: '2024',
          bulan: String(tmtYear === 2024 ? (12 - tmtMonth + 1) : 12),
          predikat: 'Baik',
          persentase: '100%',
          koef: koefDasar,
          akDapat: ak2024Est
        });
      }
    }
  }

  // 4. Tahun 2025 - jika endYear >= 2025 dan (cum2024 > 0 || tmtYear <= 2025 || hasValidValue(rawAk2025))
  let cum2025 = cum2024;
  const rawAk2025 = getRiwValByHeader(/ak.*2025/i, 6);
  const akKumulatif2025 = parseVal(rawAk2025);
  const prevCum2025 = cum2024;
  const ak2025 = akKumulatif2025 - prevCum2025;
  if (endYear >= 2025 && (cum2024 > 0 || tmtYear <= 2025 || hasValidValue(rawAk2025))) {
    if (hasValidValue(rawAk2025) && ak2025 > 0) {
      cum2025 = akKumulatif2025;
      const info2025 = getPredikatDanPersentase(ak2025, koefDasar, 12);
      rows.push({
        tahun: '2025',
        bulan: '12',
        predikat: info2025.predikat,
        persentase: info2025.persentase,
        koef: koefDasar,
        akDapat: ak2025
      });
    } else {
      const ak2025Est = calcYearlyAKRow(2025);
      cum2025 = Math.round((cum2024 + ak2025Est) * 1000) / 1000;
      if (ak2025Est > 0) {
        rows.push({
          tahun: '2025',
          bulan: String(tmtYear === 2025 ? (12 - tmtMonth + 1) : 12),
          predikat: 'Baik',
          persentase: '100%',
          koef: koefDasar,
          akDapat: ak2025Est
        });
      }
    }
  }

  // 5. Tahun 2026 dan seterusnya (sebelum startYear)
  if (startYear > 2026) {
    const effStart = Math.max(2026, tmtYear);
    const indexMap = { 2026: 18, 2027: 30, 2028: 42, 2029: 54, 2030: 66 };
    for (let y = effStart; y < startYear; y++) {
      const prevIdx = (y - 1 === 2025) ? 6 : indexMap[y - 1];
      const currIdx = indexMap[y];
      let prevCum = 0;
      let currCum = 0;
      if (rowRiw && prevIdx !== undefined && currIdx !== undefined) {
        prevCum = parseVal(rowRiw[prevIdx]);
        currCum = parseVal(rowRiw[currIdx]);
      }
      const diff = Math.max(0, currCum - prevCum);
      if (diff > 0) {
        const yData = getYearlyKinerjaData(rowInput, y);
        const mCountY = yData.bulan || 12;
        const infoY = getPredikatDanPersentase(diff, koefDasar, mCountY);
        rows.push({
          tahun: String(y),
          bulan: String(mCountY),
          predikat: infoY.predikat,
          persentase: infoY.persentase,
          koef: koefDasar,
          akDapat: Math.round(diff * 1000000) / 1000000
        });
      }
    }
  }

  // 6. Periode Berjalan (dari startYear s/d endYear, jika endYear >= 2026)
  if (endYear >= 2026) {
    const effectiveStartYear = Math.max(2026, startYear);
    for (let y = effectiveStartYear; y <= endYear; y++) {
      const mStart = (y === startYear) ? startMonth : 1;
      const mEnd = (y === endYear) ? endMonth : 12;
      const mCount = Math.max(1, mEnd - mStart + 1);

      // Hitung AK untuk tahun y pada periode ini
      let akPeriodeY = 0;
      let lastMult = 1.0;
      if (monthCols && monthCols.length > 0) {
        monthCols.forEach(m => {
          if (m.year === y && m.month >= mStart && m.month <= mEnd) {
            const rating = rowInput ? (rowInput[m.colIndex] || 'Baik').toString().trim() : 'Baik';
            const mult = (mapFaktor && mapFaktor[rating] !== undefined) ? mapFaktor[rating] : 1.0;
            lastMult = mult;
            let monthlyAK = (koefDasar * mult) / 12;

            const isCPNS = pegObj && pegObj.status && pegObj.status.toString().toUpperCase().includes('CPNS');
            const isNewAppointmentInYear = ak2022 <= 0 && cum2025 <= 0 && tmtYear === y;
            if ((isCPNS || isNewAppointmentInYear) && (y === tmtYear && m.month < tmtMonth)) {
              monthlyAK = 0;
            }

            akPeriodeY += monthlyAK;
          }
        });
      }

      if (akPeriodeY <= 0 && mCount > 0) {
        akPeriodeY = Math.round((((mCount / 12) * koefDasar) * lastMult) * 1000) / 1000;
      }

      const infoPeriodY = getPredikatDanPersentase(akPeriodeY, koefDasar, mCount);

      rows.push({
        tahun: String(y),
        bulan: String(mCount),
        predikat: infoPeriodY.predikat,
        persentase: infoPeriodY.persentase,
        koef: koefDasar,
        akDapat: Math.round(akPeriodeY * 1000000) / 1000000
      });
    }
  }

  return rows;
}

function populateTableIntegrasi(body, integrasiRows) {
  const placeholder = '{{TAHUN}}';
  const element = body.findText(placeholder);
  if (!element) return;
  
  // Mencari TableRow secara dinamis dengan mendaki hirarki dokumen
  let rowParent = element.getElement().getParent();
  while (rowParent && rowParent.getType() !== DocumentApp.ElementType.TABLE_ROW) {
    rowParent = rowParent.getParent();
  }
  const row = rowParent;
  if (!row) return;
  
  // Mencari Table secara dinamis dengan mendaki hirarki dokumen
  let tableParent = row.getParent();
  while (tableParent && tableParent.getType() !== DocumentApp.ElementType.TABLE) {
    tableParent = tableParent.getParent();
  }
  const table = tableParent;
  if (!table) return;
  const rowIndex = table.getChildIndex(row);

  if (Array.isArray(integrasiRows) && integrasiRows.length > 0) {
    integrasiRows.forEach((item, index) => {
      const newRow = row.copy();
      newRow.replaceText('{{TAHUN}}', String(item.tahun || ''));
      newRow.replaceText('{{BULAN}}', String(item.bulan || ''));
      newRow.replaceText('{{PREDIKAT}}', String(item.predikat || ''));
      newRow.replaceText('{{PERSENTASE}}', String(item.persentase || ''));
      newRow.replaceText('{{KOEF}}', typeof item.koef === 'number' ? formatAngkaID(item.koef) : String(item.koef || '-'));
      newRow.replaceText('{{AK_DAPAT}}', typeof item.akDapat === 'number' ? formatAngkaID(item.akDapat) : String(item.akDapat || '0'));
      table.insertTableRow(rowIndex + 1 + index, newRow);
    });
  }

  // Hapus baris template
  table.removeChild(row);
}

function populateTablePAK(body, akSebelum, akPeriode, akSesudah, pegObj, jenjang) {
  const cleanGolMatch = (pegObj.golongan || '').toString().trim().match(/[IVX]+\/[a-e]/i);
  const golClean = cleanGolMatch ? cleanGolMatch[0] : (pegObj.golongan || '').toString().trim();
  const keyReg = `${jenjang} ${golClean}`.trim();
  const info = REGULASI[keyReg];
  const syaratPang = (info && info.akPang !== null && info.akPang !== undefined) ? info.akPang : null;
  const syaratJab = (info && info.akJab !== null && info.akJab !== undefined) ? info.akJab : null;
  
  // Perhitungan Kekurangan/Kelebihan AK secara absolut (Math.abs):
  const kurangPang = (syaratPang !== null && syaratPang > 0) ? Math.abs(akSesudah - syaratPang) : null;
  const kurangJab = (syaratJab !== null && syaratJab > 0) ? Math.abs(akSesudah - syaratJab) : null;
  
  const isJenjang = syaratPang === null || syaratPang === 0;
  
  let nextJabatan = '-';
  if (info) {
    if (isJenjang) {
      const rawTarget = info.nextJab || info.next || '-';
      const cleanTarget = rawTarget.replace(/\s+[IVX]+\/[a-e]/i, '').trim();
      if (pegObj.jabatan && jenjang && pegObj.jabatan.includes(jenjang)) {
        nextJabatan = pegObj.jabatan.replace(jenjang, cleanTarget);
      } else {
        nextJabatan = cleanTarget;
      }
    } else {
      nextJabatan = info.next || info.nextPang || info.nextJab || '-';
    }
  }
  
  body.replaceText('{{AK_LAMA}}', formatAngkaID(akSebelum));
  body.replaceText('{{AK_BARU}}', formatAngkaID(akPeriode));
  body.replaceText('{{AK_JUMLAH}}', formatAngkaID(akSesudah));
  body.replaceText('{{AK_SYARAT_PANGKAT}}', (syaratPang !== null && syaratPang > 0) ? formatAngkaID(syaratPang) : '-');
  body.replaceText('{{AK_SYARAT_JABATAN}}', (syaratJab !== null && syaratJab > 0) ? formatAngkaID(syaratJab) : '-');
  body.replaceText('{{AK_KURANG_PANGKAT}}', kurangPang !== null ? formatAngkaID(kurangPang) : '-');
  body.replaceText('{{AK_KURANG_JABATAN}}', kurangJab !== null ? formatAngkaID(kurangJab) : '-');
  body.replaceText('{{NEXT_JABATAN}}', nextJabatan);
  
  const targetSyarat = isJenjang ? (syaratJab || 0) : (syaratPang || 0);
  const isEligible = targetSyarat > 0 && akSesudah >= targetSyarat;
  const statusKeterangan = isEligible 
    ? (isJenjang 
        ? `Dapat dipertimbangkan untuk Kenaikan Jenjang Jabatan Setingkat Lebih Tinggi menjadi ${nextJabatan}.`
        : `Dapat dipertimbangkan untuk Kenaikan Pangkat Setingkat Lebih Tinggi menjadi Pangkat/Golongan Ruang ${nextJabatan}.`)
    : (isJenjang
        ? `Belum dapat dipertimbangkan untuk Kenaikan Jenjang Jabatan Setingkat Lebih Tinggi menjadi ${nextJabatan}.`
        : `Belum dapat dipertimbangkan untuk Kenaikan Pangkat Setingkat Lebih Tinggi menjadi Pangkat/Golongan Ruang ${nextJabatan}.`);
  body.replaceText('{{STATUS_KETERANGAN}}', statusKeterangan);
}

function parseMonthYearHelper(str) {
  if (!str) return null;
  if (typeof str === 'object' && str instanceof Date) {
    if (isNaN(str.getTime())) return null;
    return { month: str.getMonth() + 1, year: str.getFullYear() };
  }
  const s = String(str).trim().toLowerCase();
  if (!s) return null;

  if (/^\d{4}-\d{1,2}$/.test(s)) {
    const [y, m] = s.split('-');
    return { month: parseInt(m, 10), year: parseInt(y, 10) };
  }
  if (/^\d{1,2}[-\/]\d{4}$/.test(s)) {
    const [m, y] = s.split(/[-\/]/);
    return { month: parseInt(m, 10), year: parseInt(y, 10) };
  }

  const indFull = ['januari','februari','maret','april','mei','juni','juli','agustus','september','oktober','november','desember'];
  const indShort = ['jan','feb','mar','apr','mei','jun','jul','agu','sep','okt','nov','des'];
  const engFull = ['january','february','march','april','may','june','july','august','september','october','november','december'];
  const engShort = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];

  const parts = s.split(/[\s,_\-]+/).filter(Boolean);
  if (parts.length >= 2) {
    let m = 0;
    let y = 0;

    const yearIdx = parts.findIndex(p => /^\d{4}$/.test(p));
    if (yearIdx !== -1) {
      y = parseInt(parts[yearIdx], 10);
      const monthPart = parts.find((p, idx) => idx !== yearIdx && isNaN(Number(p))) || parts.find((p, idx) => idx !== yearIdx);
      if (monthPart) {
        if (!isNaN(Number(monthPart))) {
          m = parseInt(monthPart, 10);
        } else {
          const mStr = monthPart.toLowerCase();
          m = indFull.indexOf(mStr) + 1 || indShort.indexOf(mStr) + 1 || engFull.indexOf(mStr) + 1 || engShort.indexOf(mStr) + 1;
        }
      }
    } else if (/^\d{1,2}$/.test(parts[0]) && /^\d{4}$/.test(parts[1])) {
      m = parseInt(parts[0], 10);
      y = parseInt(parts[1], 10);
    }

    if (m >= 1 && m <= 12 && y > 1900 && y < 2100) {
      return { month: m, year: y };
    }
  }
  return null;
}

function formatAngkaID(value) {
  if (value === undefined || value === null || value === '' || isNaN(value)) return '0,000';
  return Number(value).toFixed(3).replace('.', ',');
}

function formatTanggalID(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}


// =====================================================================
// FITUR HISTORY DOKUMEN & ARSIP PAK PEGAWAI (MODUL BARU)
// =====================================================================

function checkAndInitSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // check Users sheet
  let sheetUsers = ss.getSheetByName(SHEET_NAMES.USERS || 'Users');
  if (!sheetUsers) {
    sheetUsers = ss.insertSheet(SHEET_NAMES.USERS || 'Users');
    const headers = ['NIP', 'Nama', 'Kode_Satker', 'Role', 'Password'];
    sheetUsers.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#f1f5f9');
    sheetUsers.setFrozenRows(1);

    // Migrasi otomatis data akun awal dari sheet Pegawai jika ada
    try {
      const pegSheet = ss.getSheetByName(SHEET_NAMES.PEGAWAI || 'Pegawai');
      if (pegSheet) {
        const pegData = pegSheet.getDataRange().getValues();
        if (pegData.length >= 2) {
          const pHeader = pegData[0].map(h => h ? h.toString().trim().toUpperCase() : '');
          const pNip = pHeader.indexOf('NIP');
          const pNama = pHeader.indexOf('NAMA');
          const pKode = pHeader.findIndex(h => h === 'KODE_SATKER' || h === 'KODESATKER' || h === 'SATKER' || h === 'UNITKERJA');
          const pRole = pHeader.indexOf('ROLE');
          let pPw = pHeader.indexOf('PASSWORD');
          if (pPw === -1) pPw = pHeader.indexOf('PASSWORDHASH');
          
          if (pNip !== -1) {
            const rowsToInsert = [];
            for (let i = 1; i < pegData.length; i++) {
              const r = pegData[i];
              const nipVal = r[pNip] ? r[pNip].toString().trim() : '';
              if (!nipVal) continue;
              const namaVal = (pNama !== -1 && r[pNama]) ? r[pNama].toString() : '';
              const kodeVal = (pKode !== -1 && r[pKode]) ? r[pKode].toString().trim() : '';
              const roleVal = (pRole !== -1 && r[pRole]) ? r[pRole].toString().trim() : 'Viewer';
              const pwVal = (pPw !== -1 && r[pPw]) ? r[pPw].toString().trim() : '';
              rowsToInsert.push([nipVal, namaVal, kodeVal, roleVal, pwVal]);
            }
            if (rowsToInsert.length > 0) {
              sheetUsers.getRange(2, 1, rowsToInsert.length, 5).setValues(rowsToInsert);
            }
          }
        }
      }
    } catch(err) {
      console.log('Error auto-migrating users: ' + err.message);
    }
  }
  
  // check Riwayat_PAK_Terbit
  let sheetRiwayatTerbit = ss.getSheetByName(SHEET_NAMES.RIWAYAT_PAK_TERBIT);
  if (!sheetRiwayatTerbit) {
    sheetRiwayatTerbit = ss.insertSheet(SHEET_NAMES.RIWAYAT_PAK_TERBIT);
    const headers = ['NIP', 'Nama Pegawai', 'Bulan Awal Tahun', 'Bulan Akhir Tahun', 'Nilai PAK'];
    sheetRiwayatTerbit.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#f1f5f9');
    sheetRiwayatTerbit.setFrozenRows(1);
  }

  // check Arsip_Dokumen
  let sheetArsip = ss.getSheetByName(SHEET_NAMES.ARSIP_DOKUMEN);
  if (!sheetArsip) {
    sheetArsip = ss.insertSheet(SHEET_NAMES.ARSIP_DOKUMEN);
    const headers = ['NIP', 'Nama Pegawai', 'Bulan Awal Tahun', 'Bulan Akhir Tahun', 'Satuan Kerja', 'Link Google Drive'];
    sheetArsip.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#f1f5f9');
    sheetArsip.setFrozenRows(1);
  }

  // check Jadwal
  let sheetJadwal = ss.getSheetByName(SHEET_NAMES.JADWAL);
  if (!sheetJadwal) {
    sheetJadwal = ss.insertSheet(SHEET_NAMES.JADWAL);
    const headers = ['ID', 'Jenis', 'Tanggal', 'Waktu', 'Lokasi', 'Keterangan', 'Status', 'NIP_Pegawai'];
    sheetJadwal.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#f1f5f9');
    sheetJadwal.setFrozenRows(1);
  }

  // check & align headers Sheet Pegawai: Kolom L (TMT Jabatan) dan Kolom M (TMT Golongan)
  try {
    const sheetPeg = ss.getSheetByName(SHEET_NAMES.PEGAWAI || 'Pegawai');
    if (sheetPeg && sheetPeg.getLastColumn() >= 12) {
      const pHeaders = sheetPeg.getRange(1, 1, 1, Math.max(sheetPeg.getLastColumn(), 13)).getValues()[0];
      const hL = pHeaders[11] ? pHeaders[11].toString().trim() : '';
      const hM = pHeaders[12] ? pHeaders[12].toString().trim() : '';
      if (hL.toUpperCase() === 'TMT' || hL === '') {
        sheetPeg.getRange(1, 12).setValue('TMT Jabatan');
      }
      if (hM === '' || hM.toUpperCase() === 'TMT') {
        sheetPeg.getRange(1, 13).setValue('TMT Golongan');
      }
    }
  } catch (err) {
    console.log('Error verifying Pegawai TMT headers: ' + err.message);
  }
}

// Riwayat PAK CRUD
function handleGetRiwayatPAKTerbit(session) {
  const { data, header } = getSheetData(SHEET_NAMES.RIWAYAT_PAK_TERBIT);
  if (!data.length || data.length < 2) return jsonResponse([]);

  const rows = data.slice(1).map(row => rowToObject(header, row));
  
  // Look up KodeSatker for each NIP from Pegawai sheet for filtering
  const { data: dataPeg, header: headerPeg } = getSheetData(SHEET_NAMES.PEGAWAI);
  const colNIPPeg  = headerPeg.indexOf('NIP');
  const colKodePeg = headerPeg.indexOf('KodeSatker');
  const mapSatker  = {};
  dataPeg.slice(1).forEach(row => {
    if (row[colNIPPeg]) mapSatker[row[colNIPPeg].toString().trim()] = row[colKodePeg] ? row[colKodePeg].toString().trim() : '';
  });

  const filteredData = filterPegawaiByRole(
    rows.map(r => ({ ...r, KodeSatker: mapSatker[r.NIP.toString().trim()] || '', NIP: r.NIP })), 
    session
  ).map(r => ({
    nip: r.NIP,
    namaPegawai: r['Nama Pegawai'] || r.NamaPegawai || '',
    bulanAwalTahun: r['Bulan Awal Tahun'] || r.BulanAwalTahun || '',
    bulanAkhirTahun: r['Bulan Akhir Tahun'] || r.BulanAkhirTahun || '',
    nilaiPAK: parseFloat(r['Nilai PAK'] || r.NilaiPAK || 0)
  }));

  return jsonResponse(filteredData);
}

function handleSimpanRiwayatPAKTerbit(payload, session) {
  if (session.role === 'Viewer') return errorResponse('Viewer tidak memiliki hak akses menyimpan riwayat.', 403);

  const { nip, namaPegawai, bulanAwalTahun, bulanAkhirTahun, nilaiPAK } = payload;
  if (!nip || !namaPegawai || !bulanAwalTahun || !bulanAkhirTahun || nilaiPAK === undefined) {
    return errorResponse('Parameter riwayat PAK kurang lengkap.');
  }

  if (session.role === 'Admin KabKot') {
    const peg = validateSession(nip);
    if (peg && peg.satker !== session.satker) {
      return errorResponse('Tidak memiliki akses untuk pegawai satker lain.', 403);
    }
  }

  try {
    const lock = LockService.getScriptLock();
    lock.waitLock(15000);

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAMES.RIWAYAT_PAK_TERBIT);
    const data = sheet.getDataRange().getValues();
    const header = data[0];

    const colNIP = header.indexOf('NIP');
    const colBulanAwal = header.indexOf('Bulan Awal Tahun');
    const colBulanAkhir = header.indexOf('Bulan Akhir Tahun');
    const colNilai = header.indexOf('Nilai PAK');

    let rowIndex = -1;
    const nipStr = nip.toString().trim();
    const bAwalStr = bulanAwalTahun.toString().trim();
    const bAkhirStr = bulanAkhirTahun.toString().trim();

    for (let i = 1; i < data.length; i++) {
      if (data[i][colNIP].toString().trim() === nipStr &&
          data[i][colBulanAwal].toString().trim() === bAwalStr &&
          data[i][colBulanAkhir].toString().trim() === bAkhirStr) {
        rowIndex = i + 1; // 1-based index
        break;
      }
    }

    if (rowIndex !== -1) {
      // Update existing record
      sheet.getRange(rowIndex, colNilai + 1).setValue(parseFloat(nilaiPAK));
      lock.releaseLock();
      return jsonResponse({ success: true, message: 'Riwayat PAK berhasil diperbarui.' });
    } else {
      // Add new record
      const newRow = header.map(h => {
        if (h === 'NIP') return nip;
        if (h === 'Nama Pegawai') return namaPegawai;
        if (h === 'Bulan Awal Tahun') return bulanAwalTahun;
        if (h === 'Bulan Akhir Tahun') return bulanAkhirTahun;
        if (h === 'Nilai PAK') return parseFloat(nilaiPAK);
        return '';
      });
      sheet.appendRow(newRow);
      lock.releaseLock();
      return jsonResponse({ success: true, message: 'Riwayat PAK baru berhasil disimpan.' });
    }
  } catch(e) {
    return errorResponse('Gagal menyimpan riwayat PAK: ' + e.message, 500);
  }
}

function handleHapusRiwayatPAKTerbit(payload, session) {
  if (session.role === 'Viewer') return errorResponse('Viewer tidak memiliki hak akses menghapus riwayat.', 403);

  const { nip, bulanAwalTahun, bulanAkhirTahun } = payload;
  if (!nip || !bulanAwalTahun || !bulanAkhirTahun) {
    return errorResponse('Parameter penghapusan kurang lengkap.');
  }

  if (session.role === 'Admin KabKot') {
    const peg = validateSession(nip);
    if (peg && peg.satker !== session.satker) {
      return errorResponse('Tidak memiliki akses untuk pegawai satker lain.', 403);
    }
  }

  try {
    const lock = LockService.getScriptLock();
    lock.waitLock(15000);

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAMES.RIWAYAT_PAK_TERBIT);
    const data = sheet.getDataRange().getValues();
    const header = data[0];

    const colNIP = header.indexOf('NIP');
    const colBulanAwal = header.indexOf('Bulan Awal Tahun');
    const colBulanAkhir = header.indexOf('Bulan Akhir Tahun');

    let rowIndex = -1;
    const nipStr = nip.toString().trim();
    const bAwalStr = bulanAwalTahun.toString().trim();
    const bAkhirStr = bulanAkhirTahun.toString().trim();

    for (let i = 1; i < data.length; i++) {
      if (data[i][colNIP].toString().trim() === nipStr &&
          data[i][colBulanAwal].toString().trim() === bAwalStr &&
          data[i][colBulanAkhir].toString().trim() === bAkhirStr) {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex !== -1) {
      sheet.deleteRow(rowIndex);
      lock.releaseLock();
      return jsonResponse({ success: true, message: 'Riwayat PAK berhasil dihapus.' });
    }

    lock.releaseLock();
    return errorResponse('Data tidak ditemukan.', 404);
  } catch(e) {
    return errorResponse('Gagal menghapus riwayat PAK: ' + e.message, 500);
  }
}

// Arsip PAK CRUD
function handleGetArsipDokumen(session) {
  const { data, header } = getSheetData(SHEET_NAMES.ARSIP_DOKUMEN);
  if (!data.length || data.length < 2) return jsonResponse([]);

  const rows = data.slice(1).map(row => rowToObject(header, row));

  // Look up KodeSatker for each NIP from Pegawai sheet for filtering
  const { data: dataPeg, header: headerPeg } = getSheetData(SHEET_NAMES.PEGAWAI);
  const colNIPPeg  = headerPeg.indexOf('NIP');
  const colKodePeg = headerPeg.indexOf('KodeSatker');
  const mapSatker  = {};
  dataPeg.slice(1).forEach(row => {
    if (row[colNIPPeg]) mapSatker[row[colNIPPeg].toString().trim()] = row[colKodePeg] ? row[colKodePeg].toString().trim() : '';
  });

  const filteredData = filterPegawaiByRole(
    rows.map(r => ({ ...r, KodeSatker: mapSatker[r.NIP ? r.NIP.toString().trim() : ''] || '', NIP: r.NIP })), 
    session
  ).map(r => {
    const rawLink = r['Link Google Drive'] || r.LinkGoogleDrive || r['Link Drive'] || r.LinkDrive || '';
    let cleanLink = rawLink ? rawLink.toString().trim() : '';
    
    if (cleanLink) {
      try {
        const fId = getFileIdFromUrl(cleanLink);
        if (fId) {
          // Buka akses public link view di Google Drive secara otomatis
          const file = DriveApp.getFileById(fId);
          if (file) {
            try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch(err) { }
            cleanLink = `https://drive.google.com/file/d/${fId}/view?usp=sharing`;
          }
        }
      } catch(e) {
        console.warn('[handleGetArsipDokumen] Gagal set sharing permission: ' + e.message);
      }
    }

    return {
      nip: r.NIP,
      namaPegawai: r['Nama Pegawai'] || r.NamaPegawai || '',
      bulanAwalTahun: r['Bulan Awal Tahun'] || r.BulanAwalTahun || '',
      bulanAkhirTahun: r['Bulan Akhir Tahun'] || r.BulanAkhirTahun || '',
      satuanKerja: r['Satuan Kerja'] || r.SatuanKerja || '',
      linkDrive: cleanLink
    };
  });

  return jsonResponse(filteredData);
}

function handleUploadArsipDokumen(payload, session) {
  if (session.role === 'Viewer') return errorResponse('Viewer tidak memiliki hak akses unggah.', 403);
  
  const { nip, bulanAwalTahun, bulanAkhirTahun, base64Content } = payload;
  if (!nip || !bulanAwalTahun || !bulanAkhirTahun || !base64Content) {
    return errorResponse('Parameter payload unggah arsip kurang lengkap.');
  }

  if (session.role === 'Admin KabKot') {
    const pegSession = validateSession(nip);
    if (pegSession && pegSession.satker !== session.satker) {
      return errorResponse('Tidak memiliki akses untuk pegawai satker lain.', 403);
    }
  }

  try {
    const lock = LockService.getScriptLock();
    lock.waitLock(15000);

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Look up employee details in Pegawai sheet to get Name and Satker
    const { data: dataPeg, header: headerPeg } = getSheetData(SHEET_NAMES.PEGAWAI);
    const colNIPPeg = headerPeg.indexOf('NIP');
    const colNamaPeg = headerPeg.indexOf('Nama');
    const colKodeSatker = headerPeg.indexOf('KodeSatker');
    
    const nipStr = nip.toString().trim();
    let namaPegawai = '';
    let kodeSatker = '';
    
    for (let i = 1; i < dataPeg.length; i++) {
      if (dataPeg[i][colNIPPeg] && dataPeg[i][colNIPPeg].toString().trim() === nipStr) {
        namaPegawai = dataPeg[i][colNamaPeg].toString();
        kodeSatker = dataPeg[i][colKodeSatker] ? dataPeg[i][colKodeSatker].toString().trim() : '';
        break;
      }
    }

    if (!namaPegawai) {
      lock.releaseLock();
      return errorResponse('Data pegawai tidak ditemukan.');
    }

    // Look up Satker Name from Satker sheet
    const satkerSheetInfo = getSheetData(SHEET_NAMES.SATKER);
    const headerSatker = satkerSheetInfo.header;
    const dataSatker = satkerSheetInfo.data;
    
    const colKodeRef = headerSatker.findIndex(h => h.toLowerCase().includes('kode'));
    const colNamaRef = headerSatker.findIndex(h => h.toLowerCase().includes('satker') && !h.toLowerCase().includes('kode'));

    let namaSatker = 'Lainnya';
    if (colKodeRef !== -1 && colNamaRef !== -1) {
      for (let j = 1; j < dataSatker.length; j++) {
        if (dataSatker[j][colKodeRef] && dataSatker[j][colKodeRef].toString().trim() === kodeSatker) {
          namaSatker = dataSatker[j][colNamaRef].toString().trim();
          break;
        }
      }
    }

    // Google Drive Folder Hierarchy check and creation
    // SIDAK6100 SDM -> ARSIP DOKUMEN PAK -> [Satuan Kerja] -> [Nama Pegawai]
    const rootFolder = getOrCreateDriveFolder('SIDAK6100 SDM');
    const l2Folder = getOrCreateDriveSubFolder(rootFolder, 'ARSIP DOKUMEN PAK');
    const l3Folder = getOrCreateDriveSubFolder(l2Folder, namaSatker);
    const targetFolder = getOrCreateDriveSubFolder(l3Folder, namaPegawai);

    // Document Name Format: NIP_NamaPegawai_PeriodeAwalBulanTahun-PeriodeAkhirBulanTahun.pdf
    const cleanPeriodAwal = bulanAwalTahun.replace(/\s+/g, '');
    const cleanPeriodAkhir = bulanAkhirTahun.replace(/\s+/g, '');
    const fileName = `${nipStr}_${namaPegawai}_${cleanPeriodAwal}-${cleanPeriodAkhir}.pdf`;

    // Check sheet for existing records with matching NIP & Period
    const sheet = ss.getSheetByName(SHEET_NAMES.ARSIP_DOKUMEN);
    const data = sheet.getDataRange().getValues();
    const header = data[0];

    const colNIP = header.indexOf('NIP');
    const colBulanAwal = header.indexOf('Bulan Awal Tahun');
    const colBulanAkhir = header.indexOf('Bulan Akhir Tahun');
    const colLink = header.indexOf('Link Google Drive');

    let rowIndex = -1;
    let oldFileUrl = '';
    const bAwalStr = bulanAwalTahun.toString().trim();
    const bAkhirStr = bulanAkhirTahun.toString().trim();

    for (let i = 1; i < data.length; i++) {
      if (data[i][colNIP].toString().trim() === nipStr &&
          data[i][colBulanAwal].toString().trim() === bAwalStr &&
          data[i][colBulanAkhir].toString().trim() === bAkhirStr) {
        rowIndex = i + 1;
        oldFileUrl = data[i][colLink];
        break;
      }
    }

    // Trash old file in Drive if exists
    if (oldFileUrl) {
      const oldFileId = getFileIdFromUrl(oldFileUrl);
      if (oldFileId) {
        try { DriveApp.getFileById(oldFileId).setTrashed(true); } catch(e) { console.warn('Old file not found in drive: ' + oldFileId); }
      }
    }

    // Save PDF file to Google Drive and set sharing to public view with link
    const decodedBlob = Utilities.newBlob(Utilities.base64Decode(base64Content), 'application/pdf', fileName);
    const newFile = targetFolder.createFile(decodedBlob);
    try {
      newFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch(err) {
      console.warn('[handleUploadArsipDokumen] Gagal set sharing permission: ' + err.message);
    }
    const newFileId = newFile.getId();
    const newFileUrl = `https://drive.google.com/file/d/${newFileId}/view?usp=sharing`;

    if (rowIndex !== -1) {
      // Update link in existing record
      sheet.getRange(rowIndex, colLink + 1).setValue(newFileUrl);
      lock.releaseLock();
      return jsonResponse({ success: true, message: 'Arsip dokumen PAK berhasil diperbarui.', fileUrl: newFileUrl });
    } else {
      // Add new record to sheet
      const newRow = header.map(h => {
        if (h === 'NIP') return nipStr;
        if (h === 'Nama Pegawai') return namaPegawai;
        if (h === 'Bulan Awal Tahun') return bulanAwalTahun;
        if (h === 'Bulan Akhir Tahun') return bulanAkhirTahun;
        if (h === 'Satuan Kerja') return namaSatker;
        if (h === 'Link Google Drive') return newFileUrl;
        return '';
      });
      sheet.appendRow(newRow);
      lock.releaseLock();
      return jsonResponse({ success: true, message: 'Arsip dokumen PAK baru berhasil disimpan.', fileUrl: newFileUrl });
    }
  } catch(e) {
    return errorResponse('Gagal mengunggah arsip dokumen: ' + e.message, 500);
  }
}

function handleHapusArsipDokumen(payload, session) {
  if (session.role === 'Viewer') return errorResponse('Viewer tidak memiliki hak akses menghapus arsip.', 403);

  const { nip, bulanAwalTahun, bulanAkhirTahun } = payload;
  if (!nip || !bulanAwalTahun || !bulanAkhirTahun) {
    return errorResponse('Parameter penghapusan kurang lengkap.');
  }

  if (session.role === 'Admin KabKot') {
    const peg = validateSession(nip);
    if (peg && peg.satker !== session.satker) {
      return errorResponse('Tidak memiliki akses untuk pegawai satker lain.', 403);
    }
  }

  try {
    const lock = LockService.getScriptLock();
    lock.waitLock(15000);

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAMES.ARSIP_DOKUMEN);
    const data = sheet.getDataRange().getValues();
    const header = data[0];

    const colNIP = header.indexOf('NIP');
    const colBulanAwal = header.indexOf('Bulan Awal Tahun');
    const colBulanAkhir = header.indexOf('Bulan Akhir Tahun');
    const colLink = header.indexOf('Link Google Drive');

    let rowIndex = -1;
    let fileUrl = '';
    const nipStr = nip.toString().trim();
    const bAwalStr = bulanAwalTahun.toString().trim();
    const bAkhirStr = bulanAkhirTahun.toString().trim();

    for (let i = 1; i < data.length; i++) {
      if (data[i][colNIP].toString().trim() === nipStr &&
          data[i][colBulanAwal].toString().trim() === bAwalStr &&
          data[i][colBulanAkhir].toString().trim() === bAkhirStr) {
        rowIndex = i + 1;
        fileUrl = data[i][colLink];
        break;
      }
    }

    if (rowIndex !== -1) {
      // Trash file
      if (fileUrl) {
        const fileId = getFileIdFromUrl(fileUrl);
        if (fileId) {
          try { DriveApp.getFileById(fileId).setTrashed(true); } catch(err) { console.warn('Drive file not found: ' + fileId); }
        }
      }

      sheet.deleteRow(rowIndex);
      lock.releaseLock();
      return jsonResponse({ success: true, message: 'Arsip dokumen berhasil dihapus.' });
    }

    lock.releaseLock();
    return errorResponse('Data tidak ditemukan.', 404);
  } catch(e) {
    return errorResponse('Gagal menghapus arsip: ' + e.message, 500);
  }
}

function getFileIdFromUrl(url) {
  if (!url) return '';
  const match = url.match(/[-\w]{25,}(?!.*[-\w]{25,})/);
  return match ? match[0] : '';
}

// =====================================================================
// FITUR JADWAL (ASSESSMENT & UKOM) - CRUD HANDLERS
// =====================================================================

function handleGetJadwal(session) {
  const { data, header } = getSheetData(SHEET_NAMES.JADWAL);
  if (!data.length || data.length < 2) return jsonResponse([]);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tz = ss.getSpreadsheetTimeZone();

  const rows = data.slice(1).map(row => rowToObject(header, row));
  const formatted = rows.map(r => {
    let tgl = '';
    if (r.Tanggal) {
      if (r.Tanggal instanceof Date) {
        tgl = Utilities.formatDate(r.Tanggal, tz, 'yyyy-MM-dd');
      } else {
        tgl = r.Tanggal.toString().trim();
      }
    }
    return {
      id: r.ID ? r.ID.toString().trim() : '',
      jenis: r.Jenis ? r.Jenis.toString().trim() : '',
      tanggal: tgl,
      waktu: r.Waktu ? r.Waktu.toString().trim() : '',
      lokasi: r.Lokasi ? r.Lokasi.toString().trim() : '',
      keterangan: r.Keterangan ? r.Keterangan.toString().trim() : '',
      status: r.Status ? r.Status.toString().trim() : 'Belum Dilaksanakan',
      nipPegawai: r.NIP_Pegawai ? r.NIP_Pegawai.toString().replace(/'/g, '').trim() : ''
    };
  });

  return jsonResponse(formatted);
}

function handleSimpanJadwal(payload, session) {
  if (session.role !== 'Admin BPS Provinsi') {
    return errorResponse('Hanya Admin Provinsi yang memiliki hak akses mengelola jadwal.', 403);
  }

  const { id, jenis, tanggal, waktu, lokasi, keterangan, status, nipPegawai } = payload;
  if (!jenis || !tanggal || !status) {
    return errorResponse('Parameter jadwal tidak lengkap.');
  }

  try {
    const lock = LockService.getScriptLock();
    lock.waitLock(15000);

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAMES.JADWAL);
    const data = sheet.getDataRange().getValues();
    const header = data[0];

    const colID = header.indexOf('ID');
    const colJenis = header.indexOf('Jenis');
    const colTanggal = header.indexOf('Tanggal');
    const colWaktu = header.indexOf('Waktu');
    const colLokasi = header.indexOf('Lokasi');
    const colKeterangan = header.indexOf('Keterangan');
    const colStatus = header.indexOf('Status');
    const colNIP = header.indexOf('NIP_Pegawai');

    let rowIndex = -1;
    const searchId = id ? id.toString().trim() : '';

    if (searchId) {
      for (let i = 1; i < data.length; i++) {
        if (data[i][colID].toString().trim() === searchId) {
          rowIndex = i + 1;
          break;
        }
      }
    }

    const nipString = Array.isArray(nipPegawai) ? nipPegawai.join(',') : (nipPegawai || '').toString().trim();

    if (rowIndex !== -1) {
      // Update existing record
      sheet.getRange(rowIndex, colJenis + 1).setValue(jenis);
      sheet.getRange(rowIndex, colTanggal + 1).setValue(tanggal);
      sheet.getRange(rowIndex, colWaktu + 1).setValue(waktu || '');
      sheet.getRange(rowIndex, colLokasi + 1).setValue(lokasi || '');
      sheet.getRange(rowIndex, colKeterangan + 1).setValue(keterangan || '');
      sheet.getRange(rowIndex, colStatus + 1).setValue(status);
      sheet.getRange(rowIndex, colNIP + 1).setValue("'" + nipString);
      lock.releaseLock();
      return jsonResponse({ success: true, message: 'Jadwal berhasil diperbarui.' });
    } else {
      // Create new record
      const newId = 'JDW_' + new Date().getTime();
      const newRow = header.map(h => {
        if (h === 'ID') return newId;
        if (h === 'Jenis') return jenis;
        if (h === 'Tanggal') return tanggal;
        if (h === 'Waktu') return waktu || '';
        if (h === 'Lokasi') return lokasi || '';
        if (h === 'Keterangan') return keterangan || '';
        if (h === 'Status') return status;
        if (h === 'NIP_Pegawai') return "'" + nipString;
        return '';
      });
      sheet.appendRow(newRow);
      lock.releaseLock();
      return jsonResponse({ success: true, message: 'Jadwal baru berhasil disimpan.', id: newId });
    }
  } catch (e) {
    return errorResponse('Gagal menyimpan jadwal: ' + e.message, 500);
  }
}

function handleHapusJadwal(payload, session) {
  if (session.role !== 'Admin BPS Provinsi') {
    return errorResponse('Hanya Admin Provinsi yang memiliki hak akses menghapus jadwal.', 403);
  }

  const { id } = payload;
  if (!id) {
    return errorResponse('ID jadwal wajib dikirim.');
  }

  try {
    const lock = LockService.getScriptLock();
    lock.waitLock(15000);

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAMES.JADWAL);
    const data = sheet.getDataRange().getValues();
    const colID = data[0].indexOf('ID');

    let rowIndex = -1;
    const searchId = id.toString().trim();

    for (let i = 1; i < data.length; i++) {
      if (data[i][colID].toString().trim() === searchId) {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex !== -1) {
      sheet.deleteRow(rowIndex);
      lock.releaseLock();
      return jsonResponse({ success: true, message: 'Jadwal berhasil dihapus.' });
    } else {
      lock.releaseLock();
      return errorResponse('Jadwal tidak ditemukan.', 404);
    }
  } catch (e) {
    return errorResponse('Gagal menghapus jadwal: ' + e.message, 500);
  }
}