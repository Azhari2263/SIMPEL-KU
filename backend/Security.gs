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
      { row: 108, ruangan: 'MALAM (23.00-07.30)', kegiatan: 'Patroli keamanan gedung secara berkala dan memeriksa area kantor melalui CCTV' },
      { row: 109, ruangan: 'MALAM (23.00-07.30)', kegiatan: 'Memastikan pintu, jendela, dan ruangan penting terkunci dengan baik' },
      { row: 110, ruangan: 'MALAM (23.00-07.30)', kegiatan: 'Mencegah potensi bahaya seperti kebakaran atau pencurian' }
    ];

    const colMapping = {};
    grid.schedCols.forEach(sc => { colMapping[sc.tanggal] = sc.colIdx + 1; });

    return {
      success: true,
      jadwal: jadwal,
      taskItems: defaultTasks,
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
    if (!role.includes('admin') && !role.includes('supervisor') && !role.includes('kabag') && !role.includes('korlap')) {
      return { success: false, message: "Akses ditolak. Anda tidak memiliki wewenang mengubah jadwal." };
    }

    const ss = getDb();
    if (!ss) return { success: false, message: "Koneksi spreadsheet gagal." };

    const jadwalSheet = findJadwalSheet(ss);
    if (!jadwalSheet) return { success: false, message: "Sheet JadwalPiketSecurity tidak ditemukan." };

    const rawValues = jadwalSheet.getDataRange().getValues();
    const selectedMonth = bulan ? Number(bulan) : (new Date().getMonth() + 1);
    const grid = parseJadwalGrid(rawValues, selectedMonth);

    if (!grid || !grid.schedCols) return { success: false, message: "Kolom jadwal tidak valid." };

    const targetCol = grid.schedCols.find(c => c.tanggal === Number(tanggal));
    if (!targetCol) return { success: false, message: "Kolom tanggal " + tanggal + " tidak ditemukan." };

    const fakeUser = { username: namaPegawai, namaPegawai: namaPegawai };
    const employeeRowIdx = findEmployeeRowInJadwal(rawValues, fakeUser, 0);

    if (employeeRowIdx === -1) {
      return { success: false, message: "Pegawai " + namaPegawai + " tidak ditemukan dalam sheet jadwal." };
    }

    const rowNum = employeeRowIdx + 1;
    const colNum = targetCol.colIdx + 1;

    jadwalSheet.getRange(rowNum, colNum).setValue(shiftBaru.toUpperCase());

    clearScriptCacheKeys([
      "cache_sec_matrix_" + selectedMonth + "_" + (tahun || new Date().getFullYear()),
      "cache_spv_dash_" + selectedMonth + "_" + (tahun || new Date().getFullYear()),
      "cache_rekap_terpadu_" + selectedMonth + "_" + (tahun || new Date().getFullYear())
    ]);
    resetMemoryCache();

    return {
      success: true,
      message: `Jadwal ${namaPegawai} tgl ${tanggal} berhasil diubah ke Shift ${shiftBaru}.`,
      updated: { namaPegawai, tanggal, shiftBaru }
    };
  } catch (err) {
    return { success: false, message: "Gagal memperbarui shift: " + err.message };
  }
}

function swapSecurityShift(token, pegawai1, pegawai2, tanggal, bulan, tahun) {
  try {
    const session = getSessionUser(token);
    if (!session) return { success: false, message: "Sesi telah berakhir." };

    const role = (session.role || '').toLowerCase();
    if (!role.includes('admin') && !role.includes('supervisor') && !role.includes('kabag') && !role.includes('korlap')) {
      return { success: false, message: "Akses ditolak." };
    }

    const ss = getDb();
    if (!ss) return { success: false, message: "Koneksi spreadsheet gagal." };

    const jadwalSheet = findJadwalSheet(ss);
    if (!jadwalSheet) return { success: false, message: "Sheet jadwal tidak ditemukan." };

    const rawValues = jadwalSheet.getDataRange().getValues();
    const selectedMonth = bulan ? Number(bulan) : (new Date().getMonth() + 1);
    const grid = parseJadwalGrid(rawValues, selectedMonth);

    const targetCol = grid.schedCols.find(c => c.tanggal === Number(tanggal));
    if (!targetCol) return { success: false, message: "Tanggal tidak ditemukan." };

    const rIdx1 = findEmployeeRowInJadwal(rawValues, { username: pegawai1, namaPegawai: pegawai1 }, 0);
    const rIdx2 = findEmployeeRowInJadwal(rawValues, { username: pegawai2, namaPegawai: pegawai2 }, 0);

    if (rIdx1 === -1 || rIdx2 === -1) {
      return { success: false, message: "Salah satu pegawai tidak ditemukan dalam jadwal." };
    }

    const val1 = rawValues[rIdx1][targetCol.colIdx] || 'O';
    const val2 = rawValues[rIdx2][targetCol.colIdx] || 'O';

    jadwalSheet.getRange(rIdx1 + 1, targetCol.colIdx + 1).setValue(val2);
    jadwalSheet.getRange(rIdx2 + 1, targetCol.colIdx + 1).setValue(val1);

    clearScriptCacheKeys([
      "cache_sec_matrix_" + selectedMonth + "_" + (tahun || new Date().getFullYear()),
      "cache_spv_dash_" + selectedMonth + "_" + (tahun || new Date().getFullYear()),
      "cache_rekap_terpadu_" + selectedMonth + "_" + (tahun || new Date().getFullYear())
    ]);
    resetMemoryCache();

    return {
      success: true,
      message: `Shift antara ${pegawai1} (${val1}) dan ${pegawai2} (${val2}) pada tgl ${tanggal} berhasil ditukar.`
    };
  } catch (err) {
    return { success: false, message: "Gagal menukar shift: " + err.message };
  }
}
