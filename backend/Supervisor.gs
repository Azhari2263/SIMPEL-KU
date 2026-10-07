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

      if (empUnit === 'Keamanan') {
        const resK = getJadwalKeamananInternal(ss, emp, selectedMonth, selectedYear);
        let tasksToUse = (resK && resK.taskItems && resK.taskItems.length > 0) ? resK.taskItems : [];
        const empSheet = findEmployeeSheet(ss, emp.namaSheet, emp.namaPegawai, emp.username);
        if (empSheet) {
          const parsedSecSheet = readSheetMonitoring(empSheet, selectedMonth, selectedYear);
          if (parsedSecSheet && parsedSecSheet.items && parsedSecSheet.items.length > 0) {
            tasksToUse = parsedSecSheet.items;
          }
        }

        if (resK && resK.jadwal && resK.jadwal.length > 0) {
          resK.jadwal.forEach(j => {
            const d = j.tanggal;
            const shiftKode = j.kodeShift || 'O';
            const namaShift = j.namaShift || (shiftKode === 'P' ? 'Pagi' : shiftKode === 'S' ? 'Sore' : shiftKode === 'M' ? 'Malam' : 'Libur');

            shiftSecuritySummary[shiftKode] = (shiftSecuritySummary[shiftKode] || 0) + 1;
            if (d === todayDateNum) {
              if (shiftKode === 'P') shiftSecuritySummary.todayP++;
              else if (shiftKode === 'S') shiftSecuritySummary.todayS++;
              else if (shiftKode === 'M') shiftSecuritySummary.todayM++;
              else if (shiftKode === 'O') shiftSecuritySummary.todayO++;

              shiftSecuritySummary.petugasAktifHariIni[shiftKode].push(emp.namaPegawai);
              if (shiftKode !== 'O') {
                shiftSecuritySummary.satpamTodayList.push({
                  nama: emp.namaPegawai,
                  username: emp.username,
                  shift: shiftKode,
                  posisi: shiftKode === 'P' ? 'Piket Pagi (06.00 - 16.00)' : (shiftKode === 'S' ? 'Piket Sore (15.30 - 23.30)' : 'Piket Malam (23.00 - 07.30)')
                });
              }
            }

            if (shiftKode === 'O') return;
            shiftSecuritySummary.totalHariKerja++;

            const shiftTasks = tasksToUse.filter(t => isKeamananTaskForShift(t, shiftKode));
            shiftTasks.forEach(t => {
              empTotal++;
              let isDone = false;
              if (t.dailyStatus && (t.dailyStatus[d] !== undefined && t.dailyStatus[d] !== null)) {
                const st = t.dailyStatus[d];
                isDone = (st === '1' || st === 1 || st === true);
              } else {
                const isPastOrToday = (selectedYear < now.getFullYear()) ||
                  (selectedYear === now.getFullYear() && selectedMonth < (now.getMonth() + 1)) ||
                  (selectedYear === now.getFullYear() && selectedMonth === (now.getMonth() + 1) && d <= now.getDate());
                isDone = isPastOrToday;
              }

              if (isDone) {
                empSelesai++;
              } else {
                empBelum++;
                if (d === todayDateNum && dataTindakLanjut.length < 15) {
                  dataTindakLanjut.push({
                    unit: 'Keamanan',
                    namaPegawai: emp.namaPegawai,
                    ruangan: t.ruangan || ('Shift ' + namaShift),
                    kegiatan: t.kegiatan,
                    status: 'Belum Selesai',
                    tanggal: `${todayDateNum}/${selectedMonth}/${selectedYear}`
                  });
                }
              }
            });
          });
        }
      } else {
        // Kebersihan & Pelayanan
        const empSheet = findEmployeeSheet(ss, emp.namaSheet, emp.namaPegawai, emp.username);
        let parsedSheet = null;
        if (empSheet) {
          parsedSheet = readSheetMonitoring(empSheet, selectedMonth, selectedYear);
        }

        if (parsedSheet && parsedSheet.items && parsedSheet.items.length > 0) {
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
      tindakLanjut: dataTindakLanjut
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

      if (empUnit === 'Keamanan') {
        const resK = getJadwalKeamananInternal(ss, emp, selectedMonth, selectedYear);
        if (resK && resK.jadwal && resK.jadwal.length > 0) {
          // Kumpulkan task items: gunakan sheet pegawai jika tersedia, atau standar defaultTasks
          let tasksToUse = (resK.taskItems && resK.taskItems.length > 0) ? resK.taskItems : [];
          const empSheet = findEmployeeSheet(ss, emp.namaSheet, emp.namaPegawai, emp.username);
          if (empSheet) {
            const parsedSecSheet = readSheetMonitoring(empSheet, selectedMonth, selectedYear);
            if (parsedSecSheet && parsedSecSheet.items && parsedSecSheet.items.length > 0) {
              tasksToUse = parsedSecSheet.items;
            }
          }

          resK.jadwal.forEach(j => {
            const d = j.tanggal;
            activeDaysSet.add(d);

            const shiftKode = j.kodeShift || 'O';
            const namaShift = j.namaShift || (shiftKode === 'P' ? 'Pagi' : shiftKode === 'S' ? 'Sore' : shiftKode === 'M' ? 'Malam' : 'Libur');

            // 1. Jika shift Off / Libur ('O'): pegawai bebas tugas, tidak ada checklist tugas yang muncul pada tanggal ini
            if (shiftKode === 'O') {
              return;
            }

            // 2. Filter checklist terpadu per tanggal HANYA memunculkan tugas yang harus dilakukan pada shift pegawai tersebut
            const shiftTasks = tasksToUse.filter(t => isKeamananTaskForShift(t, shiftKode));

            shiftTasks.forEach(t => {
              const rName = t.ruangan || ('Shift ' + namaShift);
              allRuanganSet.add(rName);

              let isDone = false;
              if (t.dailyStatus && (t.dailyStatus[d] !== undefined && t.dailyStatus[d] !== null)) {
                const st = t.dailyStatus[d];
                isDone = (st === '1' || st === 1 || st === true);
              } else {
                // Jika jadwal terisi dan tanggal sudah berjalan/hari ini, tandai telah terlaksana sesuai shift
                const isPastOrToday = (selectedYear < now.getFullYear()) ||
                  (selectedYear === now.getFullYear() && selectedMonth < (now.getMonth() + 1)) ||
                  (selectedYear === now.getFullYear() && selectedMonth === (now.getMonth() + 1) && d <= now.getDate());
                isDone = isPastOrToday;
              }

              aggregatedItems.push({
                unit: 'Keamanan',
                pegawai: emp.namaPegawai,
                namaPegawai: emp.namaPegawai,
                username: emp.username,
                ruangan: rName,
                item: t.kegiatan,
                dayNum: d,
                weekNum: Math.min(5, Math.ceil(d / 7)),
                shift: shiftKode,
                namaShift: namaShift,
                isDone: isDone,
                updatedAt: isDone
                  ? `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d).padStart(2, '0')} (Shift ${shiftKode})`
                  : `Shift ${shiftKode} (Belum)`
              });
            });
          });
        }
      } else {
        // Unit Kerja lain (Kebersihan, Pelayanan, dll.)
        const empSheet = findEmployeeSheet(ss, emp.namaSheet, emp.namaPegawai, emp.username);
        let parsed = null;
        if (empSheet) {
          parsed = readSheetMonitoring(empSheet, selectedMonth, selectedYear);
        }

        if (parsed && parsed.items && parsed.items.length > 0) {
          parsed.activeDays.forEach(d => activeDaysSet.add(d));

          parsed.items.forEach(it => {
            parsed.activeDays.forEach(d => {
              const st = it.dailyStatus ? it.dailyStatus[d] : null;

              // Cek apakah hari tersebut adalah akhir pekan (Sabtu / Minggu)
              const dateObj = new Date(selectedYear, selectedMonth - 1, d);
              const dow = dateObj.getDay(); // 0 = Minggu, 6 = Sabtu
              const isWeekend = (dow === 0 || dow === 6);

              // Aturan kemunculan tugas yang harus dikerjakan pada hari tersebut:
              // - Jika status '-' / null / kosong: tugas tidak dijadwalkan pada hari tersebut, jangan munculkan
              // - Jika akhir pekan (Sabtu/Minggu) dan tidak ditandai selesai (st !== '1'): hari libur operasional, jangan munculkan
              const isDone = (st === '1' || st === 1 || st === true);
              const isScheduled = (st === '1' || st === 1 || st === true || st === '0' || st === 0 || st === false);

              if (!isScheduled || st === '-') {
                return; // Tidak ada kewajiban tugas pada hari dan tanggal ini
              }

              if (isWeekend && !isDone) {
                return; // Libur akhir pekan operasional kantor
              }

              allRuanganSet.add(it.ruangan);

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
                updatedAt: isDone
                  ? `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d).padStart(2, '0')} 16:00`
                  : '-'
              });
            });
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

      if (empUnit === 'Keamanan') {
        const resK = getJadwalKeamananInternal(ss, emp, selectedMonth, selectedYear);
        if (resK && resK.jadwal && resK.jadwal.length > 0) {
          let tasksToUse = (resK.taskItems && resK.taskItems.length > 0) ? resK.taskItems : [];
          const empSheet = findEmployeeSheet(ss, emp.namaSheet, emp.namaPegawai, emp.username);
          if (empSheet) {
            const parsedSecSheet = readSheetMonitoring(empSheet, selectedMonth, selectedYear);
            if (parsedSecSheet && parsedSecSheet.items && parsedSecSheet.items.length > 0) {
              tasksToUse = parsedSecSheet.items;
            }
          }

          resK.jadwal.forEach(j => {
            const d = j.tanggal;
            const shiftKode = j.kodeShift || 'O';
            const namaShift = j.namaShift || (shiftKode === 'P' ? 'Pagi' : shiftKode === 'S' ? 'Sore' : shiftKode === 'M' ? 'Malam' : 'Libur');

            if (shiftKode === 'O') return;

            const shiftTasks = tasksToUse.filter(t => isKeamananTaskForShift(t, shiftKode));
            shiftTasks.forEach(t => {
              const rName = t.ruangan || ('Shift ' + namaShift);
              if (!rekapRuanganMap[rName]) {
                rekapRuanganMap[rName] = { ruangan: rName, unit: 'Keamanan', total: 0, selesai: 0, done: 0, belum: 0, persen: 0, itemCount: 0 };
              }
              rekapRuanganMap[rName].itemCount++;

              let isDone = false;
              if (t.dailyStatus && (t.dailyStatus[d] !== undefined && t.dailyStatus[d] !== null)) {
                const st = t.dailyStatus[d];
                isDone = (st === '1' || st === 1 || st === true);
              } else {
                const isPastOrToday = (selectedYear < now.getFullYear()) ||
                  (selectedYear === now.getFullYear() && selectedMonth < (now.getMonth() + 1)) ||
                  (selectedYear === now.getFullYear() && selectedMonth === (now.getMonth() + 1) && d <= now.getDate());
                isDone = isPastOrToday;
              }

              rekapRuanganMap[rName].total++;
              globalTotal++;
              if (unitSummary['Keamanan']) unitSummary['Keamanan'].total++;
              if (d >= 1 && d <= daysInMonth) {
                rekapHarian[d - 1].total++;
              }

              if (isDone) {
                rekapRuanganMap[rName].selesai++;
                globalSelesai++;
                if (unitSummary['Keamanan']) unitSummary['Keamanan'].selesai++;
                if (d >= 1 && d <= daysInMonth) {
                  rekapHarian[d - 1].selesai++;
                  rekapHarian[d - 1].done++;
                }
              }
            });
          });
        }
      } else {
        // Kebersihan & Pelayanan
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
                const st = it.dailyStatus ? it.dailyStatus[d] : null;

                const dateObj = new Date(selectedYear, selectedMonth - 1, d);
                const dow = dateObj.getDay(); // 0 = Minggu, 6 = Sabtu
                const isWeekend = (dow === 0 || dow === 6);
                const isDone = (st === '1' || st === 1 || st === true);
                const isScheduled = (st === '1' || st === 1 || st === true || st === '0' || st === 0 || st === false);

                if (!isScheduled || st === '-') return;
                if (isWeekend && !isDone) return; // Libur akhir pekan operasional

                rekapRuanganMap[rName].total++;
                globalTotal++;
                if (unitSummary[empUnit]) unitSummary[empUnit].total++;
                if (d >= 1 && d <= daysInMonth) {
                  rekapHarian[d - 1].total++;
                }

                if (isDone) {
                  rekapRuanganMap[rName].selesai++;
                  globalSelesai++;
                  if (unitSummary[empUnit]) unitSummary[empUnit].selesai++;
                  if (d >= 1 && d <= daysInMonth) {
                    rekapHarian[d - 1].selesai++;
                    rekapHarian[d - 1].done++;
                  }
                }
              });
            }
          });
        }
      }
    });

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
      h.hari = h.tanggal;
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

/**
 * ========================================================================
 * 6. FITUR EXPORT LAPORAN (SEMUA PEGAWAI / INDIVIDU SETIAP BULAN)
 * ========================================================================
 */
function getExportLaporanData(token, tipe, bulan, tahun, targetUsername) {
  try {
    const session = getSessionUser(token);
    if (!session) {
      return { success: false, message: "Sesi telah berakhir atau tidak valid. Silakan login kembali." };
    }

    const ss = getDb();
    if (!ss) return { success: false, message: "Koneksi spreadsheet gagal." };

    const now = new Date();
    const selectedMonth = bulan ? Number(bulan) : (now.getMonth() + 1);
    const selectedYear = tahun ? Number(tahun) : now.getFullYear();
    const NAMA_BULAN = [
      "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    const namaBulanStr = NAMA_BULAN[selectedMonth] || ("Bulan " + selectedMonth);
    const userRoleLower = (session.role || '').toLowerCase();
    const isManager = userRoleLower.includes('admin') || userRoleLower.includes('supervisor') || userRoleLower.includes('kabag') || userRoleLower.includes('humas') || userRoleLower.includes('koordinator') || userRoleLower.includes('korlap');

    // JIKA TIPE 'semua' (Hanya untuk Admin / Supervisor)
    if (tipe === 'semua' && isManager) {
      const allUsers = getAllUsersList(ss);
      const nonManagementStaff = allUsers.filter(u => {
        const r = (u.role || '').toLowerCase();
        return !r.includes('admin') && !r.includes('supervisor') && !r.includes('kabag');
      });

      const rekapPegawai = [];
      let totalSemua = 0;
      let selesaiSemua = 0;

      nonManagementStaff.forEach(emp => {
        const empUnit = emp.unit || 'Kebersihan';
        let empTotal = 0;
        let empSelesai = 0;

        if (empUnit === 'Keamanan') {
          const resK = getJadwalKeamananInternal(ss, emp, selectedMonth, selectedYear);
          let tasksToUse = (resK && resK.taskItems && resK.taskItems.length > 0) ? resK.taskItems : [];
          const empSheet = findEmployeeSheet(ss, emp.namaSheet, emp.namaPegawai, emp.username);
          if (empSheet) {
            const parsedSecSheet = readSheetMonitoring(empSheet, selectedMonth, selectedYear);
            if (parsedSecSheet && parsedSecSheet.items && parsedSecSheet.items.length > 0) {
              tasksToUse = parsedSecSheet.items;
            }
          }

          if (resK && resK.jadwal) {
            resK.jadwal.forEach(j => {
              if (j.kodeShift === 'O') return;
              const shiftTasks = tasksToUse.filter(t => isKeamananTaskForShift(t, j.kodeShift));
              shiftTasks.forEach(t => {
                empTotal++;
                let isDone = false;
                if (t.dailyStatus && (t.dailyStatus[j.tanggal] !== undefined && t.dailyStatus[j.tanggal] !== null)) {
                  const st = t.dailyStatus[j.tanggal];
                  isDone = (st === '1' || st === 1 || st === true);
                } else {
                  const isPastOrToday = (selectedYear < now.getFullYear()) ||
                    (selectedYear === now.getFullYear() && selectedMonth < (now.getMonth() + 1)) ||
                    (selectedYear === now.getFullYear() && selectedMonth === (now.getMonth() + 1) && j.tanggal <= now.getDate());
                  isDone = isPastOrToday;
                }
                if (isDone) empSelesai++;
              });
            });
          }
        } else {
          const empSheet = findEmployeeSheet(ss, emp.namaSheet, emp.namaPegawai, emp.username);
          if (empSheet) {
            const parsed = readSheetMonitoring(empSheet, selectedMonth, selectedYear);
            if (parsed && parsed.items) {
              parsed.items.forEach(it => {
                empTotal += (it.totalHariAktif || 0);
                empSelesai += (it.selesaiCount || 0);
              });
            }
          }
        }

        const belum = Math.max(0, empTotal - empSelesai);
        const persen = (empTotal > 0 && !isNaN(empTotal)) ? Math.round((empSelesai / empTotal) * 100) : 0;
        totalSemua += empTotal;
        selesaiSemua += empSelesai;

        rekapPegawai.push({
          namaPegawai: emp.namaPegawai,
          username: emp.username,
          unit: empUnit,
          role: emp.role || empUnit,
          totalTarget: empTotal,
          selesai: empSelesai,
          belum: belum,
          persen: persen,
          status: persen >= 90 ? 'Optimal' : (persen >= 70 ? 'Cukup' : 'Perlu Perhatian')
        });
      });

      const persenSemua = (totalSemua > 0 && !isNaN(totalSemua)) ? Math.round((selesaiSemua / totalSemua) * 100) : 0;

      return {
        success: true,
        data: {
          tipe: 'semua',
          periode: {
            bulan: selectedMonth,
            tahun: selectedYear,
            namaBulan: namaBulanStr,
            labelPeriode: namaBulanStr + " " + selectedYear
          },
          summary: {
            totalPegawai: rekapPegawai.length,
            totalTarget: totalSemua,
            totalSelesai: selesaiSemua,
            totalBelum: Math.max(0, totalSemua - selesaiSemua),
            persen: persenSemua
          },
          rekapPegawai: rekapPegawai
        }
      };
    } else {
      // EXPORT PER PEGAWAI (INDIVIDU)
      let targetUser = null;
      const allUsers = getAllUsersList(ss);
      const queryUsername = (isManager && targetUsername) ? targetUsername : session.username;
      const queryAlpha = getAlphaOnly(queryUsername);

      targetUser = allUsers.find(u =>
        u.username === queryUsername ||
        u.namaPegawai === queryUsername ||
        (queryAlpha && getAlphaOnly(u.username) === queryAlpha) ||
        (queryAlpha && getAlphaOnly(u.namaPegawai) === queryAlpha)
      );
      if (!targetUser) {
        targetUser = session;
      }

      const empUnit = targetUser.unit || 'Kebersihan';
      const itemsList = [];
      let jadwalSatpam = [];
      let totalTarget = 0;
      let totalSelesai = 0;
      const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();

      if (empUnit === 'Keamanan') {
        const resK = getJadwalKeamananInternal(ss, targetUser, selectedMonth, selectedYear);
        let tasksToUse = (resK && resK.taskItems && resK.taskItems.length > 0) ? resK.taskItems : [];
        const empSheet = findEmployeeSheet(ss, targetUser.namaSheet, targetUser.namaPegawai, targetUser.username);
        if (empSheet) {
          const parsedSecSheet = readSheetMonitoring(empSheet, selectedMonth, selectedYear);
          if (parsedSecSheet && parsedSecSheet.items && parsedSecSheet.items.length > 0) {
            tasksToUse = parsedSecSheet.items;
          }
        }

        if (resK && resK.jadwal) {
          jadwalSatpam = resK.jadwal;
          tasksToUse.forEach((t, idx) => {
            let taskTarget = 0;
            let taskSelesai = 0;
            const dailyMap = {};

            resK.jadwal.forEach(j => {
              const d = j.tanggal;
              if (j.kodeShift === 'O') {
                dailyMap[d] = '-';
                return;
              }
              const applies = isKeamananTaskForShift(t, j.kodeShift);
              if (applies) {
                taskTarget++;
                let isDone = false;
                if (t.dailyStatus && (t.dailyStatus[d] !== undefined && t.dailyStatus[d] !== null)) {
                  isDone = (t.dailyStatus[d] === '1' || t.dailyStatus[d] === 1 || t.dailyStatus[d] === true);
                } else {
                  const isPastOrToday = (selectedYear < now.getFullYear()) ||
                    (selectedYear === now.getFullYear() && selectedMonth < (now.getMonth() + 1)) ||
                    (selectedYear === now.getFullYear() && selectedMonth === (now.getMonth() + 1) && d <= now.getDate());
                  isDone = isPastOrToday;
                }
                dailyMap[d] = isDone ? '1' : '0';
                if (isDone) taskSelesai++;
              } else {
                dailyMap[d] = '-';
              }
            });

            totalTarget += taskTarget;
            totalSelesai += taskSelesai;

            itemsList.push({
              no: idx + 1,
              ruangan: t.ruangan || 'Area Satpam',
              kegiatan: t.kegiatan,
              target: taskTarget,
              selesai: taskSelesai,
              belum: Math.max(0, taskTarget - taskSelesai),
              persen: taskTarget > 0 ? Math.round((taskSelesai / taskTarget) * 100) : 0,
              dailyStatus: dailyMap
            });
          });
        }
      } else {
        // Kebersihan & Pelayanan
        const empSheet = findEmployeeSheet(ss, targetUser.namaSheet, targetUser.namaPegawai, targetUser.username);
        if (empSheet) {
          const parsed = readSheetMonitoring(empSheet, selectedMonth, selectedYear);
          if (parsed && parsed.items) {
            parsed.items.forEach((it, idx) => {
              totalTarget += (it.totalHariAktif || 0);
              totalSelesai += (it.selesaiCount || 0);
              itemsList.push({
                no: idx + 1,
                ruangan: it.ruangan,
                kegiatan: it.kegiatan,
                target: it.totalHariAktif || 0,
                selesai: it.selesaiCount || 0,
                belum: Math.max(0, (it.totalHariAktif || 0) - (it.selesaiCount || 0)),
                persen: (it.totalHariAktif > 0) ? Math.round(((it.selesaiCount || 0) / it.totalHariAktif) * 100) : 0,
                dailyStatus: it.dailyStatus || {}
              });
            });
          }
        }
      }

      const totalBelum = Math.max(0, totalTarget - totalSelesai);
      const persen = (totalTarget > 0 && !isNaN(totalTarget)) ? Math.round((totalSelesai / totalTarget) * 100) : 0;

      return {
        success: true,
        data: {
          tipe: 'individu',
          pegawai: {
            namaPegawai: targetUser.namaPegawai,
            username: targetUser.username,
            unit: empUnit,
            role: targetUser.role || ('Petugas ' + empUnit)
          },
          periode: {
            bulan: selectedMonth,
            tahun: selectedYear,
            namaBulan: namaBulanStr,
            labelPeriode: namaBulanStr + " " + selectedYear,
            daysInMonth: daysInMonth
          },
          summary: {
            totalTarget: totalTarget,
            totalSelesai: totalSelesai,
            totalBelum: totalBelum,
            persen: persen,
            status: persen >= 90 ? 'Optimal' : (persen >= 70 ? 'Cukup' : 'Perlu Perhatian')
          },
          jadwalShift: jadwalSatpam,
          items: itemsList
        }
      };
    }
  } catch (err) {
    return { success: false, message: "Gagal menyiapkan data export: " + err.message };
  }
}
