/**
 * ========================================================================
 * SIMPEL-KU - INSPEKSI MUTU / QUALITY INSPECTION MODULE
 * ========================================================================
 */

/**
 * ========================================================================
 * 7. AUDIT & INSPEKSI STANDAR MUTU LAYANAN
 * ========================================================================
 */
function setupInspeksiMutuSheet(ss) {
  if (!ss) ss = getDb();
  let sh = findSheet(ss, "InspeksiMutu");
  if (!sh) {
    sh = ss.insertSheet("InspeksiMutu");
    sh.appendRow([
      "Timestamp", "Tanggal Inspeksi", "Bulan", "Tahun", "Unit", "Pegawai / Area",
      "Kerapihan & Kebersihan (1-5)", "Ketepatan Waktu (1-5)", "Kepatuhan SOP (1-5)",
      "Kelengkapan Atribut/Alat (1-5)", "Skor Rata-Rata", "Catatan Temuan",
      "Status Rekomendasi", "Inspektor"
    ]);
    sh.getRange(1, 1, 1, 14).setBackground("#4f46e5").setFontColor("#ffffff").setFontWeight("bold");
    sh.setFrozenRows(1);
  }
  return sh;
}

function getInspeksiMutuData(token, bulan, tahun, unit) {
  try {
    const ss = getDb();
    if (!ss) return { success: false, message: "Spreadsheet tidak ditemukan." };

    const sh = findSheet(ss, "InspeksiMutu");
    if (!sh) return { success: true, data: [] };

    const values = sh.getDataRange().getValues();
    if (values.length < 2) return { success: true, data: [] };

    const list = [];
    const selectedMonth = bulan ? Number(bulan) : null;
    const selectedYear = tahun ? Number(tahun) : null;

    for (let r = 1; r < values.length; r++) {
      const row = values[r];
      const rowBulan = Number(row[2]);
      const rowTahun = Number(row[3]);
      const rowUnit = cleanStr(row[4]);

      if (selectedMonth && rowBulan && rowBulan !== selectedMonth) continue;
      if (selectedYear && rowTahun && rowTahun !== selectedYear) continue;
      if (unit && unit !== 'SEMUA' && rowUnit && rowUnit.toUpperCase() !== unit.toUpperCase()) continue;

      list.push({
        rowIndex: r + 1,
        timestamp: row[0] ? new Date(row[0]).toISOString() : '',
        tanggal: row[1],
        bulan: rowBulan,
        tahun: rowTahun,
        unit: rowUnit,
        pegawaiArea: row[5],
        skorKerapihan: Number(row[6] || 0),
        skorKetepatan: Number(row[7] || 0),
        skorKepatuhan: Number(row[8] || 0),
        skorKelengkapan: Number(row[9] || 0),
        skorRataRata: Number(row[10] || 0),
        catatan: row[11] || '',
        statusRekomendasi: row[12] || 'Sesuai Standar',
        inspektor: row[13] || 'Supervisor'
      });
    }

    list.reverse();
    return { success: true, data: list };
  } catch (err) {
    return { success: false, message: "Gagal memuat data inspeksi: " + err.message };
  }
}

function saveInspeksiMutu(token, payload) {
  try {
    const session = getSessionUser(token);
    if (!session) return { success: false, message: "Sesi telah berakhir." };

    const ss = getDb();
    if (!ss) return { success: false, message: "Spreadsheet tidak ditemukan." };

    const sh = setupInspeksiMutuSheet(ss);
    const data = (payload && payload.payload) ? payload.payload : (payload || {});

    const now = new Date();
    const bulan = data.bulan || (now.getMonth() + 1);
    const tahun = data.tahun || now.getFullYear();
    const tanggal = data.tanggal || `${now.getDate()}/${bulan}/${tahun}`;

    const skor1 = Number(data.skorKerapihan !== undefined ? data.skorKerapihan : (data.param1 !== undefined ? data.param1 : 5));
    const skor2 = Number(data.skorKetepatan !== undefined ? data.skorKetepatan : (data.param2 !== undefined ? data.param2 : 5));
    const skor3 = Number(data.skorKepatuhan !== undefined ? data.skorKepatuhan : (data.param3 !== undefined ? data.param3 : 5));
    const skor4 = Number(data.skorKelengkapan !== undefined ? data.skorKelengkapan : (data.param4 !== undefined ? data.param4 : 5));
    const avg = Number(((skor1 + skor2 + skor3 + skor4) / 4).toFixed(2));

    const unit = data.unit || 'Kebersihan';
    const pegawaiArea = data.pegawaiArea || data.ruangan || data.area || 'Semua Area';
    const catatan = data.catatan || '-';
    const statusRekomendasi = data.statusRekomendasi || data.tindakLanjut || (avg >= 4.0 ? 'Sesuai Standar' : (avg >= 3.0 ? 'Perlu Perbaikan Ringan' : 'Perlu Tindakan Korektif'));
    const inspektor = session.namaPegawai || session.username || 'Supervisor';

    sh.appendRow([
      now,
      tanggal,
      bulan,
      tahun,
      unit,
      pegawaiArea,
      skor1,
      skor2,
      skor3,
      skor4,
      avg,
      catatan,
      statusRekomendasi,
      inspektor
    ]);

    clearScriptCacheKeys([
      "cache_spv_dash_" + bulan + "_" + tahun,
      "cache_rekap_terpadu_" + bulan + "_" + tahun
    ]);
    resetMemoryCache();

    return { success: true, message: "Data inspeksi mutu berhasil disimpan!", skorRataRata: avg };
  } catch (err) {
    return { success: false, message: "Gagal menyimpan inspeksi: " + err.message };
  }
}
