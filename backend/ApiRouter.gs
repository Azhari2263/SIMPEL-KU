/**
 * ========================================================================
 * SIMPEL-KU - API ROUTER & DISPATCHER MODULE
*/

function doGet(e) {
  if (e && e.parameter && e.parameter.action) {
    return handleApiRequest(e.parameter);
  }
  const template = HtmlService.createTemplateFromFile('Index');
  return template.evaluate()
    .setTitle('Sistem Monitoring Pelayanan, Keamanan & Kebersihan (SIMPEL-KU)')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Entry point untuk request POST API dari deployment eksternal
 */
function doPost(e) {
  var params = {};
  try {
    if (e && e.postData && e.postData.contents) {
      params = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      params = e.parameter;
    }
  } catch (err) {
    params = (e && e.parameter) || {};
  }
  return handleApiRequest(params);
}

/**
 * Handler pemrosesan API untuk integrasi deployment standalone / eksternal
 */
function handleApiRequest(params) {
  var result = { success: false, message: 'Invalid action' };
  var action = params.action;
  try {
    if (action === 'login') {
      result = login(params.username, params.password);
    } else if (action === 'logout') {
      result = logout(params.token);
    } else if (action === 'getDashboardData') {
      result = getDashboardData(params.token, params.bulan, params.tahun);
    } else if (action === 'getSupervisorDashboardData') {
      result = getSupervisorDashboardData(params.token, params.bulan, params.tahun);
    } else if (action === 'getMonitoringData') {
      result = getMonitoringData(
        params.token,
        params.jenis,
        params.bulan,
        params.tahun,
        params.filterRuangan || 'SEMUA',
        params.filterStatus || 'SEMUA'
      );
    } else if (action === 'getIntegratedMonitoringData') {
      result = getIntegratedMonitoringData(
        params.token,
        params.bulan,
        params.tahun,
        params.filterUnit || 'SEMUA',
        params.filterPegawai || 'SEMUA',
        params.filterRuangan || 'SEMUA',
        params.filterStatus || 'SEMUA'
      );
    } else if (action === 'updateMonitoringStatus') {
      result = updateMonitoringStatus(
        params.token,
        params.rowIndex || params.sheetRowIndex,
        params.colIndex,
        params.newStatus,
        params.dayNum,
        params.monthNum || params.bulan,
        params.yearNum || params.tahun,
        params.targetSheetName
      );
    } else if (action === 'getRekapMonitoring') {
      result = getRekapMonitoring(params.token, params.bulan, params.tahun);
    } else if (action === 'getIntegratedRekapMonitoring') {
      result = getIntegratedRekapMonitoring(params.token, params.bulan, params.tahun);
    } else if (action === 'getEmployeeDetailProgress') {
      result = getEmployeeDetailProgress(
        params.token,
        params.employeeIdentifier || params.namaPegawai || params.username || params.employeeName,
        params.bulan,
        params.tahun
      );
    } else if (action === 'getJadwalKeamanan') {
      result = getJadwalKeamanan(params.token, params.bulan, params.tahun);
    } else if (action === 'getJadwalPiketSecurityMatrix') {
      result = getJadwalPiketSecurityMatrix(params.token, params.bulan, params.tahun);
    } else if (action === 'updateSecurityShift') {
      result = updateSecurityShift(
        params.token,
        params.namaPegawai || params.nama || params.employeeNameOrId || params.employeeIdentifier,
        params.tanggal || params.dayNum,
        params.shiftBaru || params.newShift,
        params.bulan,
        params.tahun
      );
    } else if (action === 'swapSecurityShift') {
      const p1 = params.petugas1 ? (params.petugas1.namaPegawai || params.petugas1.nama) : (params.pegawai1 || params.nama1 || params.emp1Name);
      const t1 = params.petugas1 ? params.petugas1.tanggal : (params.tanggal1 || params.tanggal || params.dayNum);
      const p2 = params.petugas2 ? (params.petugas2.namaPegawai || params.petugas2.nama) : (params.pegawai2 || params.nama2 || params.emp2Name);
      const t2 = params.petugas2 ? params.petugas2.tanggal : (params.tanggal2 || params.tanggal || params.dayNum);
      result = swapSecurityShift(
        params.token,
        p1,
        p2,
        t1,
        t2,
        params.bulan,
        params.tahun
      );
    } else if (action === 'getExportLaporanData') {
      result = getExportLaporanData(params.token, params.tipe, params.bulan, params.tahun, params.username || params.targetUsername);
    } else if (action === 'uploadBuktiDukung') {
      result = uploadBuktiDukungFoto(params.token, params);
    } else if (action === 'updateSupervisorChecklist') {
      result = updateSupervisorChecklist(params.token, params);
    } else if (action === 'supervisorToggleStaffTaskCheck') {
      result = supervisorToggleStaffTaskCheck(params.token, params);
    } else if (action === 'getBuktiDukungData') {
      result = getBuktiDukungData(params.token, params.bulan, params.tahun, params.unit, params.namaPegawai);
    } else if (action === 'getInspeksiMutuData') {
      result = getInspeksiMutuData(params.token, params.bulan, params.tahun, params.unit);
    } else if (action === 'saveInspeksiMutu') {
      result = saveInspeksiMutu(params.token, params);
    } else if (action === 'changeCredentials') {
      result = changeCredentials(params.token, params.oldPassword, params.newUsername, params.newPassword);
    } else if (action === 'setupAllUsers') {
      result = { success: true, message: setupAllUsers() };
    } else if (action === 'testGoogleDriveAccess') {
      result = { success: true, data: testGoogleDriveAccess() };
    } else {
      result = { success: false, message: 'Aksi "' + action + '" tidak dikenali.' };
    }
  } catch (e) {
    result = { success: false, message: 'Server error: ' + e.message };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}