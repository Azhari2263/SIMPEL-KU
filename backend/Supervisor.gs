/**
 * ========================================================================
 * SIMPEL-KU - SUPERVISOR & ADMIN DASHBOARD / REKAPITULASI MODULE
 * ========================================================================
 */

/**
 * ========================================================================
 * 2. DASHBOARD SUPERVISOR / KASUBBAG UMUM DATA AGGREGATOR (OPTIMIZED & ROBUST)
 * ========================================================================
 */
function getSupervisorDashboardData(token, bulan, tahun) {
  try {
    const session = getSessionUser(token);
    if (!session) {
      return { success: false, message: "Sesi telah berakhir. Silakan login kembali." };
    }

    const now = new Date();
    const selectedMonth = bulan ? Number(bulan) : (now.getMonth() + 1);
    const selectedYear = tahun ? Number(tahun) : now.getFullYear();

    const cacheKey = "cache_spv_dash_" + selectedMonth + "_" + selectedYear;
    const cachedData = getScriptCacheData(cacheKey);
    if (cachedData) {
      return { success: true, data: cachedData };
    }

    const ss = getDb();
    if (!ss) return { success: false, message: "Koneksi spreadsheet gagal." };

    const allUsers = getAllUsersList(ss);
    const nonManagementStaff = allUsers.filter(u => {
      const r = (u.role || '').toLowerCase();
      return !r.includes('admin') && !r.includes('supervisor') && !r.includes('kabag');
    });

    let totalGlobalTarget = 0;
    let totalGlobalSelesai = 0;
    let totalGlobalBelum = 0;

    const unitSummary = {
      'Kebersihan': { unit: 'Kebersihan', total: 0, selesai: 0, done: 0, belum: 0, persen: 0, totalPegawai: 0 },
      'Pelayanan':  { unit: 'Pelayanan',  total: 0, selesai: 0, done: 0, belum: 0, persen: 0, totalPegawai: 0 },
      'Keamanan':   { unit: 'Keamanan',   total: 0, selesai: 0, done: 0, belum: 0, persen: 0, totalPegawai: 0 }
    };

    const rekapPegawaiList = [];
    const dataTindakLanjut = [];

    const jadwalSheet = findJadwalSheet(ss);
    let securityGrid = null;
    let secRawValues = [];
    let secDispValues = [];
    if (jadwalSheet) {
      secRawValues = jadwalSheet.getDataRange().getValues();
      secDispValues = jadwalSheet.getDataRange().getDisplayValues();
      securityGrid = parseJadwalGrid(secRawValues, selectedMonth);
    }

    const shiftSecuritySummary = {
      P: 0, S: 0, M: 0, O: 0,
      todayP: 0, todayS: 0, todayM: 0, todayO: 0,
      totalHariKerja: 0,
      petugasAktifHariIni: { P: [], S: [], M: [], O: [] },
      satpamTodayList: []
    };

    const todayDateNum = (now.getMonth() + 1 === selectedMonth && now.getFullYear() === selectedYear) ? now.getDate() : 31;

    // Process all staff
    nonManagementStaff.forEach(emp => {
      const empUnit = emp.unit || 'Kebersihan';
      if (unitSummary[empUnit]) unitSummary[empUnit].totalPegawai++;

      let empTotal = 0;
      let empSelesai = 0;
      let empBelum = 0;

      // 1. Check if employee has their own checklist sheet
      const empSheet = findEmployeeSheet(ss, emp.namaSheet, emp.namaPegawai, emp.username);
      let parsedSheet = null;
      if (empSheet) {
        parsedSheet = readSheetMonitoring(empSheet, selectedMonth, selectedYear);
      }

      if (parsedSheet && parsedSheet.items && parsedSheet.items.length > 0) {
        // Evaluate from actual checklist sheet
        parsedSheet.items.forEach(it => {
          empTotal += (it.totalHariAktif || 0);
          empSelesai += (it.selesaiCount || 0);
          empBelum += Math.max(0, (it.totalHariAktif || 0) - (it.selesaiCount || 0));

          const stToday = it.dailyStatus ? it.dailyStatus[todayDateNum] : '-';
          if ((stToday === '0' || stToday === 0) && dataTindakLanjut.length < 15) {
            dataTindakLanjut.push({
              unit: empUnit,
              namaPegawai: emp.namaPegawai,
              ruangan: it.ruangan,
              kegiatan: it.kegiatan,
              status: 'Belum Selesai',
              tanggal: `${todayDateNum}/${selectedMonth}/${selectedYear}`
            });
          }
        });

        // Also track security shifts if security unit
        if (empUnit === 'Keamanan' && secRawValues.length > 0 && securityGrid && securityGrid.schedCols) {
          const empRowIdx = findEmployeeRowInJadwal(secRawValues, emp, 0);
          if (empRowIdx !== -1) {
            const rowData = secRawValues[empRowIdx];
            const rowDisp = secDispValues[empRowIdx] || rowData;
            securityGrid.schedCols.forEach(sc => {
              const rawKode = String(rowData[sc.colIdx] !== undefined && rowData[sc.colIdx] !== null ? rowData[sc.colIdx] : (rowDisp[sc.colIdx] || '')).trim().toUpperCase();
              let kode = 'O';
              if (rawKode === 'P' || rawKode.includes('PAGI') || rawKode === '1') kode = 'P';
              else if (rawKode === 'S' || rawKode.includes('SORE') || rawKode.includes('SIANG') || rawKode === '2') kode = 'S';
              else if (rawKode === 'M' || rawKode.includes('MALAM') || rawKode === '3') kode = 'M';

              shiftSecuritySummary[kode] = (shiftSecuritySummary[kode] || 0) + 1;
              if (sc.tanggal === todayDateNum) {
                if (kode === 'P') shiftSecuritySummary.todayP++;
                else if (kode === 'S') shiftSecuritySummary.todayS++;
                else if (kode === 'M') shiftSecuritySummary.todayM++;
                else if (kode === 'O') shiftSecuritySummary.todayO++;

                shiftSecuritySummary.petugasAktifHariIni[kode].push(emp.namaPegawai);
                if (kode !== 'O') {
                  shiftSecuritySummary.satpamTodayList.push({
                    nama: emp.namaPegawai,
                    username: emp.username,
                    shift: kode,
                    posisi: kode === 'P' ? 'Piket Pagi (06.00 - 16.00)' : (kode === 'S' ? 'Piket Sore (15.30 - 23.30)' : 'Piket Malam (23.00 - 07.30)')
                  });
                }
              }
              if (kode !== 'O') shiftSecuritySummary.totalHariKerja++;
            });
          }
        }

      } else if (empUnit === 'Keamanan' && secRawValues.length > 0 && securityGrid && securityGrid.schedCols) {
        // Fallback for security officer evaluated from JadwalPiketSecurity
        const empRowIdx = findEmployeeRowInJadwal(secRawValues, emp, 0);
        if (empRowIdx !== -1) {
          const rowData = secRawValues[empRowIdx];
          const rowDisp = secDispValues[empRowIdx] || rowData;

          securityGrid.schedCols.forEach(sc => {
            const rawKode = String(rowData[sc.colIdx] !== undefined && rowData[sc.colIdx] !== null ? rowData[sc.colIdx] : (rowDisp[sc.colIdx] || '')).trim().toUpperCase();
            let kode = 'O';
            if (rawKode === 'P' || rawKode.includes('PAGI') || rawKode === '1') kode = 'P';
            else if (rawKode === 'S' || rawKode.includes('SORE') || rawKode.includes('SIANG') || rawKode === '2') kode = 'S';
            else if (rawKode === 'M' || rawKode.includes('MALAM') || rawKode === '3') kode = 'M';

            shiftSecuritySummary[kode] = (shiftSecuritySummary[kode] || 0) + 1;

            if (sc.tanggal === todayDateNum) {
              if (kode === 'P') shiftSecuritySummary.todayP++;
              else if (kode === 'S') shiftSecuritySummary.todayS++;
              else if (kode === 'M') shiftSecuritySummary.todayM++;
              else if (kode === 'O') shiftSecuritySummary.todayO++;

              shiftSecuritySummary.petugasAktifHariIni[kode].push(emp.namaPegawai);
              if (kode !== 'O') {
                shiftSecuritySummary.satpamTodayList.push({
                  nama: emp.namaPegawai,
                  username: emp.username,
                  shift: kode,
                  posisi: kode === 'P' ? 'Piket Pagi (06.00 - 16.00)' : (kode === 'S' ? 'Piket Sore (15.30 - 23.30)' : 'Piket Malam (23.00 - 07.30)')
                });
              }
            }

            if (kode !== 'O') {
              shiftSecuritySummary.totalHariKerja++;
              let taskCount = (kode === 'P') ? 7 : (kode === 'S' ? 6 : 3);
              empTotal += taskCount;
              if (sc.tanggal <= todayDateNum) {
                empSelesai += taskCount;
              } else {
                empBelum += taskCount;
              }
            }
          });
        }
      }

      empBelum = Math.max(0, empTotal - empSelesai);
      const empPersen = (empTotal > 0 && !isNaN(empTotal)) ? Math.round((empSelesai / empTotal) * 100) : 0;

      totalGlobalTarget += empTotal;
      totalGlobalSelesai += empSelesai;
      totalGlobalBelum += empBelum;

      if (unitSummary[empUnit]) {
        unitSummary[empUnit].total += empTotal;
        unitSummary[empUnit].selesai += empSelesai;
        unitSummary[empUnit].done = unitSummary[empUnit].selesai;
        unitSummary[empUnit].belum += empBelum;
      }

      rekapPegawaiList.push({
        username: emp.username,
        namaPegawai: emp.namaPegawai,
        unit: empUnit,
        role: emp.role,
        total: empTotal,
        selesai: empSelesai,
        done: empSelesai,
        belum: empBelum,
        persen: empPersen,
        statusBadge: empPersen >= 90 ? 'Optimal' : (empPersen >= 70 ? 'Cukup' : 'Perlu Perhatian')
      });
    });

    Object.keys(unitSummary).forEach(k => {
      const u = unitSummary[k];
      u.done = u.selesai;
      u.belum = Math.max(0, u.total - u.selesai);
      u.persen = (u.total > 0 && !isNaN(u.total)) ? Math.round((u.selesai / u.total) * 100) : 0;
    });

    const persenGlobal = (totalGlobalTarget > 0 && !isNaN(totalGlobalTarget)) ? Math.round((totalGlobalSelesai / totalGlobalTarget) * 100) : 0;
    const inspeksiData = getInspeksiMutuData(token, selectedMonth, selectedYear);

    let avgSkor = 5.0;
    let totInsp = 0;
    if (inspeksiData && inspeksiData.success && inspeksiData.data && inspeksiData.data.length > 0) {
      totInsp = inspeksiData.data.length;
      const sum = inspeksiData.data.reduce((acc, curr) => acc + Number(curr.skorRataRata || 0), 0);
      avgSkor = Number((sum / totInsp).toFixed(1));
    }

    const resultPayload = {
      bulan: selectedMonth,
      tahun: selectedYear,
      totalTarget: totalGlobalTarget,
      totalSelesai: totalGlobalSelesai,
      totalDone: totalGlobalSelesai,
      totalBelum: totalGlobalBelum,
      persenSelesai: persenGlobal,
      persen: persenGlobal,
      unitSummary: unitSummary,
      shiftSecurity: shiftSecuritySummary,
      rekapPegawai: rekapPegawaiList,
      tindakLanjut: dataTindakLanjut,
      inspeksiMutuSummary: {
        totalInspeksi: totInsp,
        skorRataRata: avgSkor,
        kategori: avgSkor >= 4.5 ? 'Sangat Baik' : (avgSkor >= 3.5 ? 'Baik' : 'Perlu Perbaikan')
      }
    };

    putScriptCacheData(cacheKey, resultPayload, 60);

    return {
      success: true,
      data: resultPayload
    };

  } catch (err) {
    return { success: false, message: "Gagal memuat dashboard supervisor: " + err.message };
  }
}

/**
 * ========================================================================
 * 3. MONITORING TERPADU ADMIN & SUPERVISOR (FILTER MULTI-KRITERIA)
 * ========================================================================
 */
function getIntegratedMonitoringData(token, bulan, tahun, filterUnit, filterPegawai, filterRuangan, filterStatus) {
  try {
    const session = getSessionUser(token);
    if (!session) {
      return { success: false, message: "Sesi telah berakhir. Silakan login kembali." };
    }

    const ss = getDb();
    if (!ss) return { success: false, message: "Koneksi spreadsheet gagal." };

    const now = new Date();
    const selectedMonth = bulan ? Number(bulan) : (now.getMonth() + 1);
    const selectedYear = tahun ? Number(tahun) : now.getFullYear();

    const allUsers = getAllUsersList(ss);
    let targetUsers = allUsers.filter(u => {
      const r = (u.role || '').toLowerCase();
      return !r.includes('admin') && !r.includes('supervisor') && !r.includes('kabag');
    });

    if (filterUnit && filterUnit !== 'SEMUA') {
      targetUsers = targetUsers.filter(u => u.unit === filterUnit);
    }

    if (filterPegawai && filterPegawai !== 'SEMUA') {
      targetUsers = targetUsers.filter(u => u.username === filterPegawai || u.namaPegawai === filterPegawai);
    }

    let aggregatedItems = [];
    const activeDaysSet = new Set();
    const allRuanganSet = new Set();
    const daftarPegawaiFilter = [];

    allUsers.forEach(u => {
      const r = (u.role || '').toLowerCase();
      if (!r.includes('admin') && !r.includes('supervisor') && !r.includes('kabag')) {
        daftarPegawaiFilter.push({ username: u.username, namaPegawai: u.namaPegawai, unit: u.unit });
      }
    });

    targetUsers.forEach(emp => {
      const empUnit = emp.unit || 'Kebersihan';

      const empSheet = findEmployeeSheet(ss, emp.namaSheet, emp.namaPegawai, emp.username);
      let parsed = null;
      if (empSheet) {
        parsed = readSheetMonitoring(empSheet, selectedMonth, selectedYear);
      }

      if (parsed && parsed.items && parsed.items.length > 0) {
        parsed.activeDays.forEach(d => activeDaysSet.add(d));
        parsed.daftarRuangan.forEach(r => allRuanganSet.add(r));

        parsed.items.forEach(it => {
          parsed.activeDays.forEach(d => {
            const st = it.dailyStatus ? it.dailyStatus[d] : null;
            const isDone = (st === '1' || st === 1 || st === true);
            aggregatedItems.push({
              unit: empUnit,
              pegawai: emp.namaPegawai,
              namaPegawai: emp.namaPegawai,
              username: emp.username,
              ruangan: it.ruangan,
              item: it.kegiatan,
              dayNum: d,
              weekNum: Math.min(5, Math.ceil(d / 7)),
              isDone: isDone,
              updatedAt: isDone ? `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d).padStart(2, '0')} 16:00` : '-'
            });
          });
        });
      } else if (empUnit === 'Keamanan') {
        const resK = getJadwalKeamananInternal(ss, emp, selectedMonth, selectedYear);
        if (resK && resK.taskItems) {
          resK.taskItems.forEach(t => {
            allRuanganSet.add(t.ruangan);
            if (resK.jadwal) {
              resK.jadwal.forEach(j => {
                activeDaysSet.add(j.tanggal);
                if (j.kodeShift !== 'O') {
                  const rUpper = String(t.ruangan || '').toUpperCase();
                  let appliesToShift = false;
                  if (j.kodeShift === 'P' && (rUpper.includes('PAGI') || rUpper.includes('JAM KERJA'))) appliesToShift = true;
                  else if ((j.kodeShift === 'S' || j.kodeShift === 'M') && rUpper.includes('MALAM')) appliesToShift = true;
                  else if (j.kodeShift === 'S' && rUpper.includes('JAM KERJA')) appliesToShift = true;

                  if (appliesToShift) {
                    aggregatedItems.push({
                      unit: 'Keamanan',
                      pegawai: emp.namaPegawai,
                      namaPegawai: emp.namaPegawai,
                      username: emp.username,
                      ruangan: t.ruangan,
                      item: t.kegiatan,
                      dayNum: j.tanggal,
                      weekNum: Math.min(5, Math.ceil(j.tanggal / 7)),
                      isDone: true,
                      updatedAt: `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(j.tanggal).padStart(2, '0')} (Shift ${j.kodeShift})`
                    });
                  }
                }
              });
            }
          });
        }
      }
    });

    if (filterRuangan && filterRuangan !== 'SEMUA') {
      aggregatedItems = aggregatedItems.filter(it => it.ruangan === filterRuangan);
    }

    if (filterStatus && filterStatus !== 'SEMUA') {
      aggregatedItems = aggregatedItems.filter(it => {
        if (filterStatus === 'SELESAI') return it.isDone;
        if (filterStatus === 'BELUM') return !it.isDone;
        return true;
      });
    }

    const sortedActiveDays = Array.from(activeDaysSet).sort((a, b) => a - b);
    const distinctPegawai = Array.from(new Set(daftarPegawaiFilter.map(p => p.namaPegawai)));
    const distinctRuangan = Array.from(allRuanganSet);

    return {
      success: true,
      data: {
        bulan: selectedMonth,
        tahun: selectedYear,
        activeDays: sortedActiveDays.length > 0 ? sortedActiveDays : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        daysInMonth: sortedActiveDays.length > 0 ? Math.max.apply(null, sortedActiveDays) : 30,
        items: aggregatedItems,
        pegawaiList: distinctPegawai,
        ruanganList: distinctRuangan,
        daftarPegawai: daftarPegawaiFilter,
        daftarRuangan: distinctRuangan,
        totalItems: aggregatedItems.length
      }
    };

  } catch (err) {
    return { success: false, message: "Gagal memuat monitoring terpadu: " + err.message };
  }
}

/**
 * ========================================================================
 * 4. REKAPITULASI MONITORING TERPADU (KEBERSIHAN, PELAYANAN, KEAMANAN)
 * ========================================================================
 */
function getIntegratedRekapMonitoring(token, bulan, tahun) {
  try {
    const session = getSessionUser(token);
    if (!session) {
      return { success: false, message: "Sesi telah berakhir. Silakan login kembali." };
    }

    const now = new Date();
    const selectedMonth = bulan ? Number(bulan) : (now.getMonth() + 1);
    const selectedYear = tahun ? Number(tahun) : now.getFullYear();

    const cacheKey = "cache_rekap_terpadu_" + selectedMonth + "_" + selectedYear;
    const cachedData = getScriptCacheData(cacheKey);
    if (cachedData) {
      return { success: true, data: cachedData };
    }

    const ss = getDb();
    if (!ss) return { success: false, message: "Koneksi spreadsheet gagal." };

    const allUsers = getAllUsersList(ss);
    const nonManagementStaff = allUsers.filter(u => {
      const r = (u.role || '').toLowerCase();
      return !r.includes('admin') && !r.includes('supervisor') && !r.includes('kabag');
    });

    let globalTotal = 0;
    let globalSelesai = 0;

    const unitSummary = {
      'Kebersihan': { unit: 'Kebersihan', total: 0, selesai: 0, done: 0, belum: 0, persen: 0 },
      'Pelayanan':  { unit: 'Pelayanan',  total: 0, selesai: 0, done: 0, belum: 0, persen: 0 },
      'Keamanan':   { unit: 'Keamanan',   total: 0, selesai: 0, done: 0, belum: 0, persen: 0 }
    };

    const rekapRuanganMap = {};
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const rekapHarian = [];
    for (let d = 1; d <= daysInMonth; d++) {
      rekapHarian.push({ tanggal: d, total: 0, selesai: 0, done: 0 });
    }

    const todayDateNum = (now.getMonth() + 1 === selectedMonth && now.getFullYear() === selectedYear) ? now.getDate() : 31;

    // Process all staff
    nonManagementStaff.forEach(emp => {
      const empUnit = emp.unit || 'Kebersihan';
      const empSheet = findEmployeeSheet(ss, emp.namaSheet, emp.namaPegawai, emp.username);
      let parsed = null;
      if (empSheet) {
        parsed = readSheetMonitoring(empSheet, selectedMonth, selectedYear);
      }

      if (parsed && parsed.items && parsed.items.length > 0) {
        parsed.items.forEach(it => {
          const rName = it.ruangan || 'Umum';
          if (!rekapRuanganMap[rName]) {
            rekapRuanganMap[rName] = { ruangan: rName, unit: empUnit, total: 0, selesai: 0, done: 0, belum: 0, persen: 0, itemCount: 0 };
          }
          rekapRuanganMap[rName].itemCount++;

          if (parsed.activeDays) {
            parsed.activeDays.forEach(d => {
              rekapRuanganMap[rName].total++;
              globalTotal++;
              if (unitSummary[empUnit]) unitSummary[empUnit].total++;
              if (d >= 1 && d <= daysInMonth) {
                rekapHarian[d - 1].total++;
              }

              const st = it.dailyStatus ? it.dailyStatus[d] : null;
              if (st === '1' || st === 1 || st === true) {
                rekapRuanganMap[rName].selesai++;
                globalSelesai++;
                if (unitSummary[empUnit]) unitSummary[empUnit].selesai++;
                if (d >= 1 && d <= daysInMonth) {
                  rekapHarian[d - 1].selesai++;
                }
              }
            });
          }
        });
      }
    });

    // 2. Process Keamanan officers without sheet from JadwalPiketSecurity
    const secOfficers = nonManagementStaff.filter(u => u.unit === 'Keamanan');
    const secOfficersWithoutSheet = secOfficers.filter(u => {
      const sh = findEmployeeSheet(ss, u.namaSheet, u.namaPegawai, u.username);
      return !sh;
    });

    if (secOfficersWithoutSheet.length > 0) {
      const jadwalSheet = findJadwalSheet(ss);
      let secRawValues = [];
      let secDispValues = [];
      let securityGrid = null;
      if (jadwalSheet) {
        secRawValues = jadwalSheet.getDataRange().getValues();
        secDispValues = jadwalSheet.getDataRange().getDisplayValues();
        securityGrid = parseJadwalGrid(secRawValues, selectedMonth);
      }

      const secCategories = [
        { name: 'PAGI (06.00-07.30)', taskCount: 4, applicableShifts: ['P'] },
        { name: 'SELAMA JAM KERJA (07.30-16.00)', taskCount: 3, applicableShifts: ['P', 'S'] },
        { name: 'MALAM (23.00-07.30)', taskCount: 3, applicableShifts: ['M', 'S'] }
      ];

      secCategories.forEach(cat => {
        if (!rekapRuanganMap[cat.name]) {
          rekapRuanganMap[cat.name] = { ruangan: cat.name, unit: 'Keamanan', total: 0, selesai: 0, done: 0, belum: 0, persen: 0, itemCount: cat.taskCount };
        }
      });

      if (securityGrid && securityGrid.schedCols && secRawValues.length > 0) {
        secOfficersWithoutSheet.forEach(sec => {
          const empRowIdx = findEmployeeRowInJadwal(secRawValues, sec, 0);
          if (empRowIdx !== -1) {
            const rowData = secRawValues[empRowIdx];
            const rowDisp = secDispValues[empRowIdx] || rowData;

            securityGrid.schedCols.forEach(sc => {
              const rawKode = String(rowData[sc.colIdx] !== undefined && rowData[sc.colIdx] !== null ? rowData[sc.colIdx] : (rowDisp[sc.colIdx] || '')).trim().toUpperCase();
              let kode = 'O';
              if (rawKode === 'P' || rawKode.includes('PAGI') || rawKode === '1') kode = 'P';
              else if (rawKode === 'S' || rawKode.includes('SORE') || rawKode.includes('SIANG') || rawKode === '2') kode = 'S';
              else if (rawKode === 'M' || rawKode.includes('MALAM') || rawKode === '3') kode = 'M';

              if (kode !== 'O') {
                secCategories.forEach(cat => {
                  if (cat.applicableShifts.includes(kode)) {
                    rekapRuanganMap[cat.name].total += cat.taskCount;
                    globalTotal += cat.taskCount;
                    if (unitSummary['Keamanan']) unitSummary['Keamanan'].total += cat.taskCount;
                    if (sc.tanggal >= 1 && sc.tanggal <= daysInMonth) {
                      rekapHarian[sc.tanggal - 1].total += cat.taskCount;
                    }

                    if (sc.tanggal <= todayDateNum) {
                      rekapRuanganMap[cat.name].selesai += cat.taskCount;
                      globalSelesai += cat.taskCount;
                      if (unitSummary['Keamanan']) unitSummary['Keamanan'].selesai += cat.taskCount;
                      if (sc.tanggal >= 1 && sc.tanggal <= daysInMonth) {
                        rekapHarian[sc.tanggal - 1].selesai += cat.taskCount;
                      }
                    }
                  }
                });
              }
            });
          }
        });
      }
    }

    Object.keys(unitSummary).forEach(k => {
      const u = unitSummary[k];
      u.done = u.selesai;
      u.belum = Math.max(0, u.total - u.selesai);
      u.persen = (u.total > 0 && !isNaN(u.total)) ? Math.round((u.selesai / u.total) * 100) : 0;
    });

    const rekapRuanganList = Object.values(rekapRuanganMap).map(r => {
      r.done = r.selesai;
      r.belum = Math.max(0, r.total - r.selesai);
      r.persen = (r.total > 0 && !isNaN(r.total)) ? Math.round((r.selesai / r.total) * 100) : 0;
      return r;
    });

    rekapHarian.forEach(h => {
      h.done = h.selesai;
    });

    const resultPayload = {
      bulan: selectedMonth,
      tahun: selectedYear,
      totalMonitoring: globalTotal,
      totalDone: globalSelesai,
      monitoringSelesai: globalSelesai,
      monitoringBelum: Math.max(0, globalTotal - globalSelesai),
      progresPersen: (globalTotal > 0 && !isNaN(globalTotal)) ? Math.round((globalSelesai / globalTotal) * 100) : 0,
      rekapUnit: Object.values(unitSummary),
      rekapRuangan: rekapRuanganList,
      rekapHarian: rekapHarian
    };

    putScriptCacheData(cacheKey, resultPayload, 60);

    return {
      success: true,
      data: resultPayload
    };
  } catch (err) {
    return { success: false, message: "Gagal memuat rekap terpadu: " + err.message };
  }
}

function getEmployeeDetailProgress(token, employeeIdentifier, bulan, tahun) {
  try {
    const session = getSessionUser(token);
    if (!session) return { success: false, message: "Sesi tidak valid." };

    const ss = getDb();
    if (!ss) return { success: false, message: "Koneksi spreadsheet gagal." };

    if (!employeeIdentifier) {
      return { success: false, message: "Nama pegawai tidak boleh kosong." };
    }

    const allUsers = getAllUsersList(ss);
    const empAlpha = getAlphaOnly(employeeIdentifier);

    let targetUser = allUsers.find(u =>
      u.username === employeeIdentifier ||
      u.namaPegawai === employeeIdentifier ||
      getAlphaOnly(u.username) === empAlpha ||
      getAlphaOnly(u.namaPegawai) === empAlpha
    );

    if (!targetUser) {
      targetUser = allUsers.find(u => {
        const uAlpha = getAlphaOnly(u.namaPegawai || u.username);
        return uAlpha && empAlpha && (uAlpha.includes(empAlpha) || empAlpha.includes(uAlpha));
      });
    }

    if (!targetUser) {
      // Fallback: create temporary user target
      targetUser = {
        username: employeeIdentifier,
        namaPegawai: employeeIdentifier,
        namaSheet: employeeIdentifier,
        unit: 'Kebersihan',
        role: 'Petugas Kebersihan'
      };
      const testSh = findEmployeeSheet(ss, employeeIdentifier, employeeIdentifier, employeeIdentifier);
      if (testSh) {
        targetUser.jenis = getSheetJenis(testSh, targetUser, ss);
        targetUser.unit = determineUnit(targetUser.jenis, targetUser.role, targetUser.unit);
      }
    }

    const selectedMonth = bulan ? Number(bulan) : (new Date().getMonth() + 1);
    const selectedYear = tahun ? Number(tahun) : new Date().getFullYear();
    const todayDate = (new Date().getMonth() + 1 === selectedMonth) ? new Date().getDate() : 1;

    if (targetUser.unit === 'Keamanan') {
      const resK = getJadwalKeamananInternal(ss, targetUser, selectedMonth, selectedYear);
      const allSecTasks = (resK && resK.taskItems) ? resK.taskItems : [];

      let todayShift = 'O';
      if (resK && resK.jadwal) {
        const jToday = resK.jadwal.find(j => j.tanggal === todayDate);
        if (jToday) todayShift = jToday.kodeShift;
      }

      const formattedTasks = allSecTasks.map(t => {
        const rUpper = String(t.ruangan || '').toUpperCase();
        let appliesToShift = false;
        if (todayShift === 'P' && (rUpper.includes('PAGI') || rUpper.includes('JAM KERJA'))) appliesToShift = true;
        else if ((todayShift === 'S' || todayShift === 'M') && rUpper.includes('MALAM')) appliesToShift = true;
        else if (todayShift === 'S' && rUpper.includes('JAM KERJA')) appliesToShift = true;

        return {
          item: t.kegiatan,
          ruangan: t.ruangan,
          periode: 'Shift ' + todayShift,
          isDone: appliesToShift
        };
      });

      const totalTasks = formattedTasks.length;
      const doneTasks = formattedTasks.filter(t => t.isDone).length;
      const pct = (totalTasks > 0 && !isNaN(totalTasks)) ? Math.round((doneTasks / totalTasks) * 100) : 0;

      return {
        success: true,
        data: {
          namaPegawai: targetUser.namaPegawai,
          username: targetUser.username,
          unit: targetUser.unit,
          role: targetUser.role || 'Petugas Keamanan',
          totalTasks: totalTasks,
          doneTasks: doneTasks,
          persen: pct,
          isKeamanan: true,
          todayShift: todayShift,
          jadwalShift: resK ? resK.jadwal : [],
          tasks: formattedTasks
        }
      };
    } else {
      const empSheet = findEmployeeSheet(ss, targetUser.namaSheet, targetUser.namaPegawai, targetUser.username);
      if (!empSheet) {
        return {
          success: true,
          data: {
            namaPegawai: targetUser.namaPegawai,
            username: targetUser.username,
            unit: targetUser.unit,
            role: targetUser.role || 'Petugas Teknis',
            totalTasks: 0,
            doneTasks: 0,
            persen: 0,
            isKeamanan: false,
            tasks: []
          }
        };
      }
      const parsed = readSheetMonitoring(empSheet, selectedMonth, selectedYear);

      const formattedTasks = (parsed.items || []).map(it => {
        const isDoneToday = it.dailyStatus && (it.dailyStatus[todayDate] === '1' || it.dailyStatus[todayDate] === 1);
        return {
          item: it.kegiatan,
          ruangan: it.ruangan,
          periode: it.periode || 'Harian',
          isDone: isDoneToday
        };
      });

      const totalTasks = formattedTasks.length;
      const doneTasks = formattedTasks.filter(t => t.isDone).length;
      const pct = (totalTasks > 0 && !isNaN(totalTasks)) ? Math.round((doneTasks / totalTasks) * 100) : 0;

      return {
        success: true,
        data: {
          namaPegawai: targetUser.namaPegawai,
          username: targetUser.username,
          unit: targetUser.unit,
          role: targetUser.role || 'Petugas Kebersihan',
          totalTasks: totalTasks,
          doneTasks: doneTasks,
          persen: pct,
          isKeamanan: false,
          tasks: formattedTasks
        }
      };
    }

  } catch (err) {
    return { success: false, message: "Gagal memuat detail pegawai: " + err.message };
  }
}
