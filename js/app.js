/**
 * ========================================================================
 * SIMPEL-KU - APPLICATION CORE & GLOBAL CONTROLLER
 * ========================================================================
 */

/**
     * STATE MANAGER CLIENT-SIDE
     */
    let currentUser              = null;
    let sessionToken             = null;
    let activeView               = 'dashboard';
    let employeeJenis            = 'PIKET KEBERSIHAN KANTOR'; // jenis tugas pegawai
    let currentMonitoringJenis   = 'Kebersihan';              // 'Kebersihan' | 'Pelayanan'
    let monitoringPeriod         = 'harian';                  // 'harian' (default) | 'mingguan' | 'bulanan'
    let selectedMonitoringDay    = 1;                         // Hari aktif terpilih (1-31)
    let selectedMonitoringWeek   = 1;                         // Minggu terpilih (1-5)
    let harianWeekGroupIndex     = 0;                         // Indeks Partisi Kalender Harian (0..4)
    let displayFormatHarian      = 'cards';                   // 'cards' | 'table'
    let tableCurrentPage         = 1;                         // Pagination Halaman Tabel
    let isSidebarCollapsed       = false;                     // Collapse desktop sidebar
    let cachedMonitoringData     = null;
    let cachedKeamananData       = null;
    let selectedKeamananDay      = 1;
    let chartTrenInstance        = null;
    let chartRuanganInstance     = null;

    const HARI_SHORT = ['Mi', 'Sen', 'Sel', 'Ra', 'Ka', 'Ju', 'Sa'];

    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxloHJeE5Qlr7EcStr0qRGVnLvQh07Tw-iVY7km6fNtjXKNVS_tA5pp3-Uu3kMC2_9-/exec';

    const isGasEnvironment = typeof google !== 'undefined' && google.script && google.script.run;

/**
     * UNIFIED BACKEND API CALLER
     * Mendukung:
     * 1. google.script.run (jika berjalan di Web App Google Apps Script)
     * 2. fetch() ke SCRIPT_URL (jika dideploy mandiri di GitHub Pages, Vercel, Netlify, dll.)
     */
    async function callBackend(action, params = {}) {
      if (isGasEnvironment) {
        return new Promise((resolve, reject) => {
          const runner = google.script.run
            .withSuccessHandler((res) => resolve(res))
            .withFailureHandler((err) => reject(err));

          if (action === 'login') {
            runner.login(params.username, params.password);
          } else if (action === 'logout') {
            runner.logout(params.token);
          } else if (action === 'getDashboardData') {
            runner.getDashboardData(params.token, params.bulan, params.tahun);
          } else if (action === 'getMonitoringData') {
            runner.getMonitoringData(params.token, params.jenis, params.bulan, params.tahun, params.filterRuangan || 'SEMUA', params.filterStatus || 'SEMUA');
          } else if (action === 'updateMonitoringStatus') {
            runner.updateMonitoringStatus(params.token, params.sheetRowIndex, params.colIndex, params.newStatus, params.dayNum, params.bulan, params.tahun);
          } else if (action === 'getRekapMonitoring') {
            runner.getRekapMonitoring(params.token, params.bulan, params.tahun);
          } else if (action === 'getJadwalKeamanan') {
            runner.getJadwalKeamanan(params.token, params.bulan, params.tahun);
          } else if (action === 'changeCredentials') {
            runner.changeCredentials(params.token, params.oldPassword, params.newUsername, params.newPassword);
          } else if (action === 'getSupervisorDashboardData') {
            runner.getSupervisorDashboardData(params.token, params.bulan, params.tahun);
          } else if (action === 'getIntegratedMonitoringData') {
            runner.getIntegratedMonitoringData(params.token, params.bulan, params.tahun, params.filterUnit || params.unit || 'SEMUA', params.filterPegawai || params.pegawai || 'SEMUA', params.filterRuangan || 'SEMUA', params.filterStatus || 'SEMUA');
          } else if (action === 'getIntegratedRekapMonitoring') {
            runner.getIntegratedRekapMonitoring(params.token, params.bulan, params.tahun);
          } else if (action === 'getEmployeeDetailProgress') {
            runner.getEmployeeDetailProgress(params.token, params.namaPegawai, params.bulan, params.tahun);
          } else if (action === 'getJadwalPiketSecurityMatrix') {
            runner.getJadwalPiketSecurityMatrix(params.token, params.bulan, params.tahun);
          } else if (action === 'updateSecurityShift') {
            const nama = params.namaPegawai || params.nama;
            const tgl = params.tanggal || params.dayNum;
            const shift = params.shiftBaru || params.newShift;
            runner.updateSecurityShift(params.token, nama, tgl, shift, params.bulan, params.tahun);
          } else if (action === 'swapSecurityShift') {
            const p1 = params.petugas1 ? (params.petugas1.namaPegawai || params.petugas1.nama) : (params.pegawai1 || params.nama1);
            const t1 = params.petugas1 ? params.petugas1.tanggal : (params.tanggal1 || params.tanggal || params.dayNum);
            const p2 = params.petugas2 ? (params.petugas2.namaPegawai || params.petugas2.nama) : (params.pegawai2 || params.nama2);
            const t2 = params.petugas2 ? params.petugas2.tanggal : (params.tanggal2 || params.tanggal || params.dayNum);
            runner.swapSecurityShift(params.token, p1, p2, t1, t2, params.bulan, params.tahun);
          } else if (action === 'getExportLaporanData') {
            runner.getExportLaporanData(params.token, params.tipe, params.bulan, params.tahun, params.username || params.targetUsername);
          } else if (action === 'uploadBuktiDukung') {
            runner.uploadBuktiDukungFoto(params.token, params);
          } else if (action === 'updateSupervisorChecklist') {
            runner.updateSupervisorChecklist(params.token, params);
          } else if (action === 'supervisorToggleStaffTaskCheck') {
            runner.supervisorToggleStaffTaskCheck(params.token, params);
          } else if (action === 'getBuktiDukungData') {
            runner.getBuktiDukungData(params.token, params.bulan, params.tahun, params.unit, params.namaPegawai);
          } else if (action === 'getInspeksiMutuData') {
            runner.getInspeksiMutuData(params.token, params.bulan, params.tahun, params.unit);
          } else if (action === 'saveInspeksiMutu') {
            runner.saveInspeksiMutu(params.token, params);
          } else if (action === 'testGoogleDriveAccess') {
            runner.testGoogleDriveAccess();
          } else if (typeof runner[action] === 'function') {
            runner[action](params);
          } else if (typeof runner.handleApiRequest === 'function') {
            runner.handleApiRequest(action, params);
          } else {
            reject(new Error('Aksi tidak dikenali: ' + action));
          }
        });
      }

      if (SCRIPT_URL && SCRIPT_URL.startsWith('https://script.google.com/')) {
        const payload = Object.assign({ action: action }, params);
        const response = await fetch(SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload),
          redirect: 'follow'
        });

        if (!response.ok) {
          throw new Error('Gagal menghubungi server (HTTP ' + response.status + ')');
        }

        const data = await response.json();
        return data;
      }

      throw new Error('URL App Script belum dikonfigurasi.');
    }

    document.addEventListener('DOMContentLoaded', () => {
      const today = new Date();
      document.getElementById('globalMonthSelect').value = String(today.getMonth() + 1);
      document.getElementById('globalYearSelect').value = String(today.getFullYear());

      const savedCollapse = localStorage.getItem('simpelkeb_sidebar_collapsed');
      if (savedCollapse === 'true') {
        isSidebarCollapsed = true;
        applySidebarCollapseState();
      }

      const savedToken = sessionStorage.getItem('simpelkeb_token');
      const savedUser = sessionStorage.getItem('simpelkeb_user');

      if (savedToken && savedUser) {
        try {
          sessionToken = savedToken;
          currentUser = JSON.parse(savedUser);
          initAuthenticatedApp();
        } catch (e) {
          showLoginPage();
        }
      } else {
        showLoginPage();
      }
    });

/**
     * TOGGLE NAVIGASI MOBILE DRAWER
     */
    function toggleMobileSidebar() {
      const sidebar  = document.getElementById('appSidebar');
      const backdrop = document.getElementById('sidebarBackdrop');
      if (sidebar && backdrop) {
        sidebar.classList.toggle('-translate-x-full');
        backdrop.classList.toggle('hidden');
      }
    }

/**
     * TOGGLE COLLAPSE SIDEBAR DESKTOP (PRESI RAPI TANPA BORDER MELUAP)
     */
    function toggleSidebarCollapse() {
      isSidebarCollapsed = !isSidebarCollapsed;
      localStorage.setItem('simpelkeb_sidebar_collapsed', String(isSidebarCollapsed));
      applySidebarCollapseState();
    }

function applySidebarCollapseState() {
      const sidebar     = document.getElementById('appSidebar');
      const content     = document.getElementById('contentWrapper');
      const profileBox  = document.getElementById('sidebarProfileBox');
      const avatar      = document.getElementById('sidebarAvatar');
      const labels      = document.querySelectorAll('.sidebar-label');
      const iconInner   = document.getElementById('sidebarInnerToggleIcon');
      const logoIcon    = document.getElementById('sidebarHeaderLogoIcon');
      const collapseBtn = document.getElementById('sidebarCollapseBtn');
      const navItems    = document.querySelectorAll('#sidebarNav .nav-item');
      const logoutBtn   = document.getElementById('sidebarLogoutBtn');

      if (isSidebarCollapsed) {
        sidebar.classList.remove('w-64');
        sidebar.classList.add('w-16');

        content.classList.remove('md:ml-64');
        content.classList.add('md:ml-16');

        labels.forEach(el => el.classList.add('hidden', 'md:hidden'));

        if (collapseBtn) collapseBtn.classList.add('hidden', 'md:hidden');
        if (logoIcon) logoIcon.className = 'fa-solid fa-angles-right text-xs';

        if (profileBox) {
          profileBox.className = 'py-3 px-0 mx-auto my-2 flex justify-center items-center bg-transparent border-0 rounded-none w-full';
        }
        if (avatar) {
          avatar.className = 'w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs shadow-xs mx-auto';
        }

        navItems.forEach(item => {
          item.classList.remove('px-3', 'space-x-3');
          item.classList.add('px-0', 'justify-center', 'w-10', 'h-10', 'mx-auto');
        });

        if (logoutBtn) {
          logoutBtn.classList.remove('px-3', 'space-x-3');
          logoutBtn.classList.add('px-0', 'justify-center', 'w-10', 'h-10', 'mx-auto');
        }
      } else {
        sidebar.classList.remove('w-16');
        sidebar.classList.add('w-64');

        content.classList.remove('md:ml-16');
        content.classList.add('md:ml-64');

        labels.forEach(el => el.classList.remove('hidden', 'md:hidden'));

        if (collapseBtn) collapseBtn.classList.remove('hidden', 'md:hidden');
        if (logoIcon) logoIcon.className = 'fa-solid fa-clipboard-check text-sm';
        if (iconInner) iconInner.className = 'fa-solid fa-chevron-left text-xs';

        if (profileBox) {
          profileBox.className = 'p-3 mx-2 my-3 bg-slate-50 rounded-xl border border-slate-200/70 flex items-center space-x-3 overflow-hidden';
        }
        if (avatar) {
          avatar.className = 'w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs flex-shrink-0 mx-auto';
        }

        navItems.forEach(item => {
          item.classList.remove('px-0', 'justify-center', 'w-10', 'h-10', 'mx-auto');
          item.classList.add('px-3', 'space-x-3');
        });

        if (logoutBtn) {
          logoutBtn.classList.remove('px-0', 'justify-center', 'w-10', 'h-10', 'mx-auto');
          logoutBtn.classList.add('px-3', 'space-x-3');
        }
      }
    }

/**
     * RENDER AKSI CEPAT DASHBOARD (SELEKTIF SESUAI PERAN PEGAWAI)
     */
    function renderQuickActions() {
      const container = document.getElementById('dashQuickActionsContainer');
      if (!container) return;

      const j = (employeeJenis || '').toUpperCase();
      let html = '';

      if (j.includes('KEBERSIHAN')) {
        html += `
          <button onclick="navigateTo('kebersihan')" class="w-full p-3.5 rounded-xl border border-slate-200 hover:border-accent-500/50 hover:bg-accent-50/30 transition-all flex items-center justify-between text-left group">
            <div class="flex items-center space-x-3">
              <div class="w-9 h-9 rounded-xl bg-orange-100 text-accent-600 flex items-center justify-center text-sm group-hover:scale-105 transition-transform">
                <i class="fa-solid fa-sparkles"></i>
              </div>
              <div>
                <p class="text-xs font-bold text-slate-800">Checklist Kebersihan</p>
                <p class="text-[10px] text-slate-400">Ruang kerja, toilet, lobby</p>
              </div>
            </div>
            <i class="fa-solid fa-chevron-right text-xs text-slate-400 group-hover:text-accent-600"></i>
          </button>
        `;
      } else if (j.includes('RESEPSIONIS') || j.includes('PELAYANAN')) {
        html += `
          <button onclick="navigateTo('pelayanan')" class="w-full p-3.5 rounded-xl border border-slate-200 hover:border-brand-500/50 hover:bg-brand-50/30 transition-all flex items-center justify-between text-left group">
            <div class="flex items-center space-x-3">
              <div class="w-9 h-9 rounded-xl bg-blue-100 text-brand-600 flex items-center justify-center text-sm group-hover:scale-105 transition-transform">
                <i class="fa-solid fa-hand-holding-heart"></i>
              </div>
              <div>
                <p class="text-xs font-bold text-slate-800">Checklist Pelayanan</p>
                <p class="text-[10px] text-slate-400">Standar PST, tamu, ATK</p>
              </div>
            </div>
            <i class="fa-solid fa-chevron-right text-xs text-slate-400 group-hover:text-brand-600"></i>
          </button>
        `;
      } else if (j.includes('KEAMANAN')) {
        html += `
          <button onclick="navigateTo('keamanan')" class="w-full p-3.5 rounded-xl border border-slate-200 hover:border-indigo-500/50 hover:bg-indigo-50/30 transition-all flex items-center justify-between text-left group">
            <div class="flex items-center space-x-3">
              <div class="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm group-hover:scale-105 transition-transform">
                <i class="fa-solid fa-shield-halved"></i>
              </div>
              <div>
                <p class="text-xs font-bold text-slate-800">Monitoring Keamanan</p>
                <p class="text-[10px] text-slate-400">Jadwal shift & checklist piket</p>
              </div>
            </div>
            <i class="fa-solid fa-chevron-right text-xs text-slate-400 group-hover:text-indigo-600"></i>
          </button>
        `;
      } else {
        html += `
          <button onclick="navigateTo('kebersihan')" class="w-full p-3.5 rounded-xl border border-slate-200 hover:border-accent-500/50 hover:bg-accent-50/30 transition-all flex items-center justify-between text-left group">
            <div class="flex items-center space-x-3">
              <div class="w-9 h-9 rounded-xl bg-orange-100 text-accent-600 flex items-center justify-center text-sm group-hover:scale-105 transition-transform">
                <i class="fa-solid fa-sparkles"></i>
              </div>
              <div>
                <p class="text-xs font-bold text-slate-800">Checklist Kebersihan</p>
                <p class="text-[10px] text-slate-400">Ruang kerja, toilet, lobby</p>
              </div>
            </div>
            <i class="fa-solid fa-chevron-right text-xs text-slate-400 group-hover:text-accent-600"></i>
          </button>
        `;
      }

      html += `
        <button onclick="navigateTo('rekap')" class="w-full p-3.5 rounded-xl border border-slate-200 hover:border-emerald-500/50 hover:bg-emerald-50/30 transition-all flex items-center justify-between text-left group">
          <div class="flex items-center space-x-3">
            <div class="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm group-hover:scale-105 transition-transform">
              <i class="fa-solid fa-chart-pie"></i>
            </div>
            <div>
              <p class="text-xs font-bold text-slate-800">Grafik & Rekapitulasi</p>
              <p class="text-[10px] text-slate-400">Laporan visual bulanan</p>
            </div>
          </div>
          <i class="fa-solid fa-chevron-right text-xs text-slate-400 group-hover:text-emerald-600"></i>
        </button>
        <button onclick="openExportModal()" class="w-full p-3.5 rounded-xl border border-slate-200 hover:border-teal-500/50 hover:bg-teal-50/30 transition-all flex items-center justify-between text-left group">
          <div class="flex items-center space-x-3">
            <div class="w-9 h-9 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center text-sm group-hover:scale-105 transition-transform">
              <i class="fa-solid fa-file-export"></i>
            </div>
            <div>
              <p class="text-xs font-bold text-slate-800">Export Laporan</p>
              <p class="text-[10px] text-slate-400">Unduh Excel & Cetak PDF</p>
            </div>
          </div>
          <i class="fa-solid fa-chevron-right text-xs text-slate-400 group-hover:text-teal-600"></i>
        </button>
      `;

      container.innerHTML = html;
    }

function renderDynamicMenu(jenis) {
      // Sembunyikan semua menu dinamis terlebih dahulu
      ['nav-dashboard', 'nav-kebersihan', 'nav-pelayanan', 'nav-keamanan', 'nav-dashboard-supervisor', 'nav-monitoring-admin', 'nav-shift-security'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
      });

      if (isManagerRole(currentUser)) {
        // Tampilkan Menu Khusus Admin & Supervisor
        ['nav-dashboard-supervisor', 'nav-rekap', 'nav-monitoring-admin', 'nav-shift-security', 'nav-profil'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.classList.remove('hidden');
        });
      } else {
        // Menu Staf Teknis (Kebersihan, Pelayanan, Keamanan) - 100% Persis Asli
        const j = (jenis || '').toUpperCase();
        if (j.includes('KEBERSIHAN')) {
          const elK = document.getElementById('nav-kebersihan');
          if (elK) elK.classList.remove('hidden');
          const elD = document.getElementById('nav-dashboard');
          if (elD) elD.classList.remove('hidden');
        } else if (j.includes('RESEPSIONIS') || j.includes('PELAYANAN')) {
          const elP = document.getElementById('nav-pelayanan');
          if (elP) elP.classList.remove('hidden');
          const elD = document.getElementById('nav-dashboard');
          if (elD) elD.classList.remove('hidden');
        } else if (j.includes('KEAMANAN')) {
          const elKea = document.getElementById('nav-keamanan');
          if (elKea) elKea.classList.remove('hidden');
        } else {
          const elK = document.getElementById('nav-kebersihan');
          if (elK) elK.classList.remove('hidden');
          const elD = document.getElementById('nav-dashboard');
          if (elD) elD.classList.remove('hidden');
        }
      }
    }

function navigateTo(viewName) {
      activeView = viewName;

      document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
      const navBtn = document.getElementById('nav-' + viewName);
      if (navBtn) navBtn.classList.add('active');

      ['view-dashboard-supervisor','view-dashboard','view-monitoring-admin','view-monitoring','view-rekap','view-shift-security','view-profil','view-keamanan'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
      });

      // Tutup drawer sidebar pada mobile setelah memilih menu
      const sidebar  = document.getElementById('appSidebar');
      const backdrop = document.getElementById('sidebarBackdrop');
      if (sidebar) sidebar.classList.add('-translate-x-full');
      if (backdrop) backdrop.classList.add('hidden');

      if (viewName === 'dashboard-supervisor') {
        document.getElementById('topbarTitle').innerText   = 'Dashboard Supervisor';
        document.getElementById('topbarSubtitle').innerText = 'Pengawasan manajerial operasional dan checklist';
        document.getElementById('view-dashboard-supervisor')?.classList.remove('hidden');
        loadSupervisorDashboardData();
      } else if (viewName === 'monitoring-admin') {
        document.getElementById('topbarTitle').innerText   = 'Monitoring Terpadu';
        document.getElementById('topbarSubtitle').innerText = 'Pengawasan checklist operasional lintas unit kerja';
        document.getElementById('view-monitoring-admin')?.classList.remove('hidden');
        loadIntegratedMonitoringData();
      } else if (viewName === 'shift-security') {
        document.getElementById('topbarTitle').innerText   = 'Pengaturan Shift Security';
        document.getElementById('topbarSubtitle').innerText = 'Matriks jadwal piket dan pertukaran shift satpam';
        document.getElementById('view-shift-security')?.classList.remove('hidden');
        loadJadwalPiketSecurityMatrix();
      } else if (viewName === 'dashboard') {
        document.getElementById('topbarTitle').innerText   = 'Dashboard Ringkasan';
        document.getElementById('topbarSubtitle').innerText = 'Ringkasan data checklist aktif';
        document.getElementById('view-dashboard')?.classList.remove('hidden');
        loadDashboardData();
      } else if (viewName === 'kebersihan') {
        currentMonitoringJenis = 'Kebersihan';
        monitoringPeriod = 'harian';
        tableCurrentPage = 1;
        document.getElementById('topbarTitle').innerText   = 'Monitoring Kebersihan';
        document.getElementById('topbarSubtitle').innerText = 'Checklist kebersihan harian, mingguan, & bulanan';
        const sTitle = document.getElementById('monitoringSectionTitle');
        if (sTitle) sTitle.innerHTML = '<i class="fa-solid fa-sparkles text-accent-500"></i><span>Monitoring Kebersihan Umum</span>';
        document.getElementById('view-monitoring')?.classList.remove('hidden');
        loadMonitoringData('Kebersihan');
      } else if (viewName === 'pelayanan') {
        currentMonitoringJenis = 'Pelayanan';
        monitoringPeriod = 'harian';
        tableCurrentPage = 1;
        document.getElementById('topbarTitle').innerText   = 'Monitoring Pelayanan';
        document.getElementById('topbarSubtitle').innerText = 'Checklist standar pelayanan kantor';
        const sTitle = document.getElementById('monitoringSectionTitle');
        if (sTitle) sTitle.innerHTML = '<i class="fa-solid fa-hand-holding-heart text-brand-500"></i><span>Monitoring Standar Pelayanan</span>';
        document.getElementById('view-monitoring')?.classList.remove('hidden');
        loadMonitoringData('Pelayanan');
      } else if (viewName === 'keamanan') {
        document.getElementById('topbarTitle').innerText   = 'Monitoring Keamanan';
        document.getElementById('topbarSubtitle').innerText = 'Jadwal piket shift dari Jadwal Piket Security';
        document.getElementById('view-keamanan')?.classList.remove('hidden');
        loadJadwalKeamanan();
      } else if (viewName === 'rekap') {
        document.getElementById('topbarTitle').innerText   = 'Rekap Monitoring';
        document.getElementById('topbarSubtitle').innerText = 'Visualisasi statistik dan rekapitulasi';
        document.getElementById('view-rekap')?.classList.remove('hidden');
        if (isManagerRole(currentUser)) {
          loadIntegratedRekapData();
        } else {
          loadRekapData();
        }
      } else if (viewName === 'profil') {
        document.getElementById('topbarTitle').innerText   = 'Profil Akun';
        document.getElementById('topbarSubtitle').innerText = 'Informasi akun dan pengaturan kredensial';
        document.getElementById('view-profil')?.classList.remove('hidden');
        initProfilView();
      }
    }

function onGlobalDateChange() {
      if (activeView === 'dashboard-supervisor') {
        loadSupervisorDashboardData();
      } else if (activeView === 'monitoring-admin') {
        loadIntegratedMonitoringData();
      } else if (activeView === 'shift-security') {
        loadJadwalPiketSecurityMatrix();
      } else if (activeView === 'dashboard') {
        loadDashboardData();
      } else if (activeView === 'kebersihan' || activeView === 'pelayanan') {
        loadMonitoringData(currentMonitoringJenis);
      } else if (activeView === 'keamanan') {
        loadJadwalKeamanan();
      } else if (activeView === 'rekap') {
        if (isManagerRole(currentUser)) {
          loadIntegratedRekapData();
        } else {
          loadRekapData();
        }
      }
    }

function refreshCurrentPage() {
      if (activeView === 'dashboard-supervisor') {
        loadSupervisorDashboardData();
      } else if (activeView === 'monitoring-admin') {
        loadIntegratedMonitoringData();
      } else if (activeView === 'shift-security') {
        loadJadwalPiketSecurityMatrix();
      } else if (activeView === 'dashboard') {
        loadDashboardData();
      } else if (activeView === 'kebersihan' || activeView === 'pelayanan') {
        loadMonitoringData(currentMonitoringJenis);
      } else if (activeView === 'keamanan') {
        loadJadwalKeamanan();
      } else if (activeView === 'rekap') {
        if (isManagerRole(currentUser)) {
          loadIntegratedRekapData();
        } else {
          loadRekapData();
        }
      } else if (activeView === 'profil') {
        initProfilView();
      }
    }

function showToast(message, type = 'info') {
      const toast = document.getElementById('toastNotification');
      const toastMsg = document.getElementById('toastMessage');
      const toastIcon = document.getElementById('toastIcon');

      toastMsg.innerText = message;

      if (type === 'success') {
        toastIcon.className = "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white bg-emerald-600";
        toastIcon.innerHTML = '<i class="fa-solid fa-check"></i>';
      } else if (type === 'error') {
        toastIcon.className = "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white bg-rose-600";
        toastIcon.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
      } else {
        toastIcon.className = "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white bg-blue-600";
        toastIcon.innerHTML = '<i class="fa-solid fa-info"></i>';
      }

      toast.classList.remove('translate-x-full');
      setTimeout(() => {
        closeToast();
      }, 3500);
    }

function closeToast() {
      document.getElementById('toastNotification').classList.add('translate-x-full');
    }

function showLoader(show) {
      const loader = document.getElementById('globalLoader');
      if (show) loader.classList.remove('hidden');
      else loader.classList.add('hidden');
    }

function handleApiError(res) {
      if (res && res.message && res.message.includes("Sesi")) {
        showToast(res.message, "error");
        showLoginPage();
      } else {
        showToast((res && res.message) ? res.message : "Terjadi kesalahan.", "error");
      }
    }

function escapeHtml(text) {
      if (!text) return "";
      return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }
  

    /**
     * STATE MANAGER TAMBAHAN (ADMIN & SUPERVISOR)
     */
    let cachedSupervisorData            = null;
    let cachedSupervisorPegawai         = [];
    let cachedIntegratedMonitoringData  = null;
    let cachedSecurityMatrix            = null;
    let adminMonitoringPeriod           = 'harian';
    let adminSelectedDayNum             = new Date().getDate();
    let adminSelectedWeekNum            = 1;

function isManagerRole(user) {
      if (!user) return false;
      const r = (user.role || '').toLowerCase();
      const u = (user.username || '').toLowerCase();
      const j = (user.jenis || '').toLowerCase();
      return (
        r.includes('admin') ||
        r.includes('supervisor') ||
        r.includes('kabag') ||
        r.includes('humas') ||
        r.includes('korlap') ||
        r.includes('koordinator') ||
        j.includes('manajemen') ||
        u === 'admin' ||
        u === 'supervisor'
      );
    }

function openModal(modalId) {
      const m = document.getElementById(modalId);
      if (m) m.classList.remove('hidden');
    }

function closeModal(modalId) {
      const m = document.getElementById(modalId);
      if (m) m.classList.add('hidden');
    }

/**
 * ========================================================================
 * BUKTI DUKUNG CONTROLLER: KAMERA, WATERMARK, KOMPRESI & GOOGLE DRIVE
 * ========================================================================
 */
let currentUploadTaskPayload = null;
let liveMediaStream          = null;
let currentFacingMode        = 'environment';
let currentCapturedBase64    = null;
let currentPhotoMetadata     = null;

function openUploadBuktiModal(taskInfo) {
  currentUploadTaskPayload = taskInfo;
  currentCapturedBase64 = null;
  currentPhotoMetadata = null;

  const unitBadge = document.getElementById('uploadBuktiUnitBadge');
  const tglText = document.getElementById('uploadBuktiTanggalText');
  const tugasText = document.getElementById('uploadBuktiNamaTugas');
  const ruangText = document.getElementById('uploadBuktiRuangan');
  const pegText = document.getElementById('uploadBuktiPegawai');

  if (unitBadge) unitBadge.innerText = taskInfo.unit || 'Umum';
  if (tglText) tglText.innerText = formatDateIndo(taskInfo.dayNum, taskInfo.bulan, taskInfo.tahun);
  if (tugasText) tugasText.innerText = taskInfo.namaTugas || '-';
  if (ruangText) ruangText.innerText = taskInfo.ruangan || 'Area Umum';
  if (pegText) pegText.innerText = taskInfo.namaPegawai || '-';

  resetBuktiCapture();
  openModal('modalUploadBukti');
}

function closeModalUploadBukti() {
  stopLiveCamera();
  closeModal('modalUploadBukti');
}

async function toggleLiveCamera() {
  if (liveMediaStream) {
    stopLiveCamera();
  } else {
    await startLiveCamera();
  }
}

async function startLiveCamera() {
  const video = document.getElementById('buktiCameraVideo');
  const placeholder = document.getElementById('buktiCameraPlaceholder');
  const loader = document.getElementById('buktiCameraLoading');
  const btnToggle = document.getElementById('btnToggleCameraText');
  const btnSnap = document.getElementById('btnSnapPhoto');
  const btnSwitch = document.getElementById('btnSwitchCamera');

  if (loader) {
    loader.classList.remove('hidden');
    const loadingText = document.getElementById('buktiCameraLoadingText');
    if (loadingText) loadingText.innerText = 'Menghubungkan kamera & GPS...';
  }

  try {
    const constraints = {
      video: {
        facingMode: currentFacingMode,
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    };

    liveMediaStream = await navigator.mediaDevices.getUserMedia(constraints);
    if (video) {
      video.srcObject = liveMediaStream;
      video.classList.remove('hidden');
    }
    if (placeholder) placeholder.classList.add('hidden');
    if (btnToggle) btnToggle.innerText = 'Tutup Kamera';
    if (btnSnap) btnSnap.classList.remove('hidden');
    if (btnSwitch) btnSwitch.classList.remove('hidden');
  } catch (err) {
    showToast('Kamera tidak dapat dibuka: ' + err.message + '. Anda dapat memilih foto dari galeri.', 'warning');
  } finally {
    if (loader) loader.classList.add('hidden');
  }
}

function stopLiveCamera() {
  if (liveMediaStream) {
    liveMediaStream.getTracks().forEach(t => t.stop());
    liveMediaStream = null;
  }
  const video = document.getElementById('buktiCameraVideo');
  const placeholder = document.getElementById('buktiCameraPlaceholder');
  const btnToggle = document.getElementById('btnToggleCameraText');
  const btnSnap = document.getElementById('btnSnapPhoto');
  const btnSwitch = document.getElementById('btnSwitchCamera');

  if (video) {
    video.srcObject = null;
    video.classList.add('hidden');
  }
  if (placeholder) placeholder.classList.remove('hidden');
  if (btnToggle) btnToggle.innerText = 'Buka Kamera';
  if (btnSnap) btnSnap.classList.add('hidden');
  if (btnSwitch) btnSwitch.classList.add('hidden');
}

async function switchCameraFacing() {
  currentFacingMode = (currentFacingMode === 'environment') ? 'user' : 'environment';
  if (liveMediaStream) {
    stopLiveCamera();
    await startLiveCamera();
  }
}

function getDeviceGeolocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({
        coords: '-0.026330, 109.342512',
        lokasi: 'BPS Provinsi Kalimantan Barat, Jl. Sutan Syahrir No. 24, Pontianak'
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        const coordStr = `${lat}, ${lng}`;
        let locationName = 'Area Kantor BPS Provinsi Kalimantan Barat';

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2000);
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
            signal: controller.signal,
            headers: { 'Accept': 'application/json' }
          });
          clearTimeout(timeoutId);
          if (res.ok) {
            const data = await res.json();
            if (data && data.display_name) {
              const road = data.address?.road || data.address?.suburb || data.address?.city || '';
              locationName = road ? `${road}, Pontianak` : data.display_name.split(',').slice(0, 3).join(',');
            }
          }
        } catch (e) {
          locationName = 'Jl. Sutan Syahrir No. 24, Pontianak, Kalbar';
        }

        resolve({ coords: coordStr, lokasi: locationName });
      },
      () => {
        resolve({
          coords: '-0.026330, 109.342512',
          lokasi: 'BPS Provinsi Kalimantan Barat, Jl. Sutan Syahrir No. 24, Pontianak'
        });
      },
      { enableHighAccuracy: true, timeout: 4000, maximumAge: 60000 }
    );
  });
}

async function captureSnapshotFromCamera() {
  const video = document.getElementById('buktiCameraVideo');
  if (!video || !liveMediaStream) {
    showToast('Kamera tidak aktif.', 'warning');
    return;
  }

  const loader = document.getElementById('buktiCameraLoading');
  if (loader) {
    loader.classList.remove('hidden');
    const loadingText = document.getElementById('buktiCameraLoadingText');
    if (loadingText) loadingText.innerText = 'Mengambil foto & GPS metadata...';
  }

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = video.videoWidth || 1280;
  tempCanvas.height = video.videoHeight || 720;
  const ctx = tempCanvas.getContext('2d');
  ctx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);

  stopLiveCamera();

  const img = new Image();
  img.onload = async () => {
    await processImageForBukti(img);
    if (loader) loader.classList.add('hidden');
  };
  img.src = tempCanvas.toDataURL('image/jpeg', 0.9);
}

function handleBuktiFileSelected(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = async () => {
      await processImageForBukti(img);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}

async function processImageForBukti(imgElement) {
  const geoData = await getDeviceGeolocation();
  const result = applyWatermarkAndCompress(imgElement, geoData);

  currentCapturedBase64 = result.base64;
  currentPhotoMetadata = {
    coords: geoData.coords,
    lokasi: geoData.lokasi,
    waktuWib: result.waktuWib,
    fileSizeKB: result.sizeKB
  };

  const previewImg = document.getElementById('buktiPreviewImg');
  const sizeBadge = document.getElementById('buktiSizeBadge');
  const waktuText = document.getElementById('buktiWaktuText');
  const coordText = document.getElementById('buktiKoordinatText');
  const lokasiText = document.getElementById('buktiLokasiText');
  const btnSubmit = document.getElementById('btnSubmitUploadBukti');
  const previewSection = document.getElementById('buktiPreviewSection');
  const camContainer = document.getElementById('buktiCameraContainer');
  const captureBtns = document.getElementById('buktiCaptureButtons');

  if (previewImg) previewImg.src = result.dataUrl;
  if (sizeBadge) {
    sizeBadge.innerText = `${result.sizeKB} KB (Maks 1 MB - Memenuhi Syarat)`;
    sizeBadge.className = 'px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-mono font-bold';
  }
  if (waktuText) waktuText.innerText = result.waktuWib;
  if (coordText) coordText.innerText = geoData.coords;
  if (lokasiText) lokasiText.innerText = geoData.lokasi;

  if (camContainer) camContainer.classList.add('hidden');
  if (captureBtns) captureBtns.classList.add('hidden');
  if (previewSection) previewSection.classList.remove('hidden');
  if (btnSubmit) btnSubmit.disabled = false;
}

function applyWatermarkAndCompress(img, geoData) {
  const canvas = document.getElementById('buktiWatermarkCanvas') || document.createElement('canvas');
  
  // Skala proporsional maksimal 1280px lebar
  const maxDimension = 1280;
  let targetWidth = img.naturalWidth || img.width || 1280;
  let targetHeight = img.naturalHeight || img.height || 720;

  if (targetWidth > maxDimension || targetHeight > maxDimension) {
    if (targetWidth > targetHeight) {
      targetHeight = Math.round((targetHeight * maxDimension) / targetWidth);
      targetWidth = maxDimension;
    } else {
      targetWidth = Math.round((targetWidth * maxDimension) / targetHeight);
      targetHeight = maxDimension;
    }
  }

  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');

  // Gambar foto dasar
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  // Waktu WIB Sekarang
  const now = new Date();
  const daysID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const monthsID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const hariStr = daysID[now.getDay()];
  const tglStr = `${now.getDate()} ${monthsID[now.getMonth()]} ${now.getFullYear()}`;
  const jamStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/\./g, ':');
  const waktuLengkapWib = `${hariStr}, ${tglStr} - ${jamStr} WIB`;

  // 1. Gambar Watermark Banner di bagian bawah
  const bannerHeight = Math.max(90, Math.round(targetHeight * 0.16));
  const bannerY = targetHeight - bannerHeight;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.fillRect(0, bannerY, targetWidth, bannerHeight);

  // Garis aksen atas banner
  ctx.fillStyle = '#2563eb';
  ctx.fillRect(0, bannerY, targetWidth, Math.max(3, Math.round(targetHeight * 0.005)));

  // 2. Tulis Text Metadata di dalam banner
  const fontSize = Math.max(12, Math.round(targetHeight * 0.024));
  ctx.font = `bold ${fontSize}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;

  const padX = Math.round(targetWidth * 0.03);
  let lineY = bannerY + Math.round(fontSize * 1.5);
  const lineSpacing = Math.round(fontSize * 1.35);

  const taskName = currentUploadTaskPayload?.namaTugas || 'Pelaksanaan Tugas';
  const ruangan = currentUploadTaskPayload?.ruangan || 'Area Umum';
  const pegawai = currentUploadTaskPayload?.namaPegawai || currentUser?.namaPegawai || '-';
  const unit = currentUploadTaskPayload?.unit || 'Umum';

  ctx.fillText(`📋 TUGAS: ${taskName.toUpperCase()} | RUANG: ${ruangan.toUpperCase()}`, padX, lineY);
  lineY += lineSpacing;

  ctx.font = `600 ${Math.round(fontSize * 0.9)}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = '#f8fafc';
  ctx.fillText(`📅 WAKTU: ${waktuLengkapWib}`, padX, lineY);
  lineY += lineSpacing;

  ctx.fillText(`📍 LOKASI: ${geoData.lokasi} (${geoData.coords})`, padX, lineY);
  lineY += lineSpacing;

  ctx.fillStyle = '#93c5fd';
  ctx.fillText(`👤 PETUGAS: ${pegawai} (${unit}) | BPS PROVINSI KALIMANTAN BARAT`, padX, lineY);

  // 3. Watermark Badge di sudut kanan atas
  const badgeFont = Math.max(10, Math.round(targetHeight * 0.02));
  ctx.font = `bold ${badgeFont}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  const badgeText = 'SIMPEL-KU • BPS KALBAR';
  const badgeMetrics = ctx.measureText(badgeText);
  const badgePadX = 12;
  const badgePadY = 6;
  const badgeW = badgeMetrics.width + (badgePadX * 2);
  const badgeH = badgeFont + (badgePadY * 2);
  const badgeX = targetWidth - badgeW - 16;
  const badgeY = 16;

  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 8);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.fillText(badgeText, badgeX + badgePadX, badgeY + badgeH - badgePadY - 2);

  // 4. Kompresi Foto (Maksimal 1 MB)
  let quality = 0.82;
  let dataUrl = canvas.toDataURL('image/jpeg', quality);
  let sizeBytes = Math.round((dataUrl.length * 3) / 4);

  let iterations = 0;
  while (sizeBytes > 1024 * 1024 && quality > 0.3 && iterations < 6) {
    quality -= 0.12;
    dataUrl = canvas.toDataURL('image/jpeg', quality);
    sizeBytes = Math.round((dataUrl.length * 3) / 4);
    iterations++;
  }

  const sizeKB = Math.round(sizeBytes / 1024);
  const base64Pure = dataUrl.split('base64,')[1];

  return {
    dataUrl: dataUrl,
    base64: base64Pure,
    sizeKB: sizeKB,
    waktuWib: waktuLengkapWib
  };
}

function resetBuktiCapture() {
  currentCapturedBase64 = null;
  currentPhotoMetadata = null;

  const previewSection = document.getElementById('buktiPreviewSection');
  const camContainer = document.getElementById('buktiCameraContainer');
  const captureBtns = document.getElementById('buktiCaptureButtons');
  const previewImg = document.getElementById('buktiPreviewImg');
  const btnSubmit = document.getElementById('btnSubmitUploadBukti');

  if (previewSection) previewSection.classList.add('hidden');
  if (camContainer) camContainer.classList.remove('hidden');
  if (captureBtns) captureBtns.classList.remove('hidden');
  if (previewImg) previewImg.src = '';
  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<i class="fa-solid fa-cloud-arrow-up text-xs"></i><span>Simpan ke Google Drive</span>';
  }
}

async function submitUploadBuktiFoto() {
  if (!currentCapturedBase64 || !currentUploadTaskPayload) {
    showToast('Silakan ambil foto bukti terlebih dahulu.', 'warning');
    return;
  }

  const btn = document.getElementById('btnSubmitUploadBukti');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<div class="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-1.5"></div><span>Mengunggah ke Drive...</span>';
  }

  showToast('Mengunggah bukti foto ke Google Drive...', 'info');

  try {
    const res = await callBackend('uploadBuktiDukung', {
      token: sessionToken,
      imageBase64: currentCapturedBase64,
      namaTugas: currentUploadTaskPayload.namaTugas,
      ruangan: currentUploadTaskPayload.ruangan,
      unit: currentUploadTaskPayload.unit,
      tanggal: currentUploadTaskPayload.dayNum,
      bulan: currentUploadTaskPayload.bulan,
      tahun: currentUploadTaskPayload.tahun,
      targetNamaPegawai: currentUploadTaskPayload.namaPegawai,
      targetUsername: currentUploadTaskPayload.username,
      koordinat: currentPhotoMetadata?.coords || '',
      lokasi: currentPhotoMetadata?.lokasi || '',
      waktuWib: currentPhotoMetadata?.waktuWib || '',
      catatan: ''
    });

    if (res && res.success) {
      const isFallback = res.isFallbackFolder || (res.data && res.data.isFallbackFolder);
      showToast(res.message || 'Bukti foto berhasil disimpan ke Google Drive!', isFallback ? 'info' : 'success');
      closeModalUploadBukti();

      if (typeof currentUploadTaskPayload.onSuccess === 'function') {
        currentUploadTaskPayload.onSuccess(res.data);
      } else {
        refreshCurrentPage();
      }
    } else {
      showToast((res && res.message) ? res.message : 'Gagal mengunggah foto ke Google Drive.', 'error');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up text-xs"></i><span>Coba Unggah Lagi</span>';
      }
    }
  } catch (err) {
    showToast('Kesalahan pengunggahan: ' + err.message, 'error');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up text-xs"></i><span>Coba Unggah Lagi</span>';
    }
  }
}

function openViewBuktiModal(data) {
  if (!data) return;

  const imgEl = document.getElementById('viewBuktiImg');
  const namaTugasEl = document.getElementById('viewBuktiNamaTugas');
  const ruanganEl = document.getElementById('viewBuktiRuangan');
  const pegawaiEl = document.getElementById('viewBuktiPegawai');
  const waktuEl = document.getElementById('viewBuktiWaktu');
  const koordinatEl = document.getElementById('viewBuktiKoordinat');
  const lokasiEl = document.getElementById('viewBuktiLokasi');
  const driveLinkEl = document.getElementById('viewBuktiDriveLink');
  const spvBox = document.getElementById('viewBuktiStatusPengawasBox');
  const spvText = document.getElementById('viewBuktiStatusPengawasText');
  const spvDetail = document.getElementById('viewBuktiPengawasDetail');
  const spvBadge = document.getElementById('viewBuktiStatusPengawasBadge');

  if (namaTugasEl) namaTugasEl.innerText = data.namaTugas || '-';
  if (ruanganEl) ruanganEl.innerText = data.ruangan || '-';
  if (pegawaiEl) pegawaiEl.innerText = `${data.namaPegawai || '-'} (${data.unit || 'Umum'})`;
  if (waktuEl) waktuEl.innerHTML = `<i class="fa-solid fa-clock text-blue-500 mr-1.5"></i><span>${escapeHtml(data.waktu || '-')}</span>`;
  if (koordinatEl) koordinatEl.innerHTML = `<i class="fa-solid fa-location-crosshairs text-emerald-500 mr-1.5"></i><span>${escapeHtml(data.koordinat || 'Tidak tercatat')}</span>`;
  if (lokasiEl) lokasiEl.innerText = data.lokasi || 'Kantor BPS Provinsi Kalimantan Barat';

  const fileUrl = data.fileUrl || (data.fileId ? `https://drive.google.com/file/d/${data.fileId}/view` : '#');
  if (driveLinkEl) driveLinkEl.href = fileUrl;

  if (imgEl) {
    imgEl.src = '';
    if (data.fileId) {
      imgEl.src = `https://drive.google.com/thumbnail?id=${data.fileId}&sz=w1000`;
    } else if (data.fileUrl) {
      imgEl.src = data.fileUrl;
    } else {
      imgEl.src = 'img/logo_BPS.png';
    }
  }

  if (spvBox && spvText && spvDetail && spvBadge) {
    if (data.statusPengawas) {
      spvBox.className = 'p-3.5 rounded-2xl border flex items-center justify-between bg-emerald-50/80 border-emerald-200 text-emerald-950';
      spvText.innerText = '✓ Telah Divalidasi oleh Pengawas';
      spvText.className = 'text-xs font-bold text-emerald-800 mt-0.5';
      spvDetail.innerText = data.namaPengawas ? `Divalidasi oleh ${data.namaPengawas} pada ${data.waktuValidasi || '-'}` : 'Pemeriksaan pengawas selesai';
      spvBadge.className = 'w-9 h-9 rounded-xl flex items-center justify-center text-sm shadow-xs bg-emerald-500 text-white';
      spvBadge.innerHTML = '<i class="fa-solid fa-check"></i>';
    } else {
      spvBox.className = 'p-3.5 rounded-2xl border flex items-center justify-between bg-slate-50 border-slate-200/80 text-slate-800';
      spvText.innerText = 'Belum Divalidasi oleh Pengawas';
      spvText.className = 'text-xs font-bold text-slate-700 mt-0.5';
      spvDetail.innerText = 'Tugas ini menunggu checklist verifikasi dari Supervisor / Pengawas';
      spvBadge.className = 'w-9 h-9 rounded-xl flex items-center justify-center text-sm shadow-xs bg-slate-200 text-slate-500';
      spvBadge.innerHTML = '<i class="fa-solid fa-clock-rotate-left"></i>';
    }
  }

  openModal('modalViewBukti');
}

    /**
     * ========================================================================
     * CLIENT-SIDE MANAGER DATA CACHE & TAB ACCELERATOR
     * ========================================================================
     */
    window._managerDataCache = {
      dashboard: {},
      monitoring: {},
      rekap: {},
      security: {}
    };
