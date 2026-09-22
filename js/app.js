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
            runner.getIntegratedMonitoringData(params.token, params.unit || 'SEMUA', params.bulan, params.tahun, params.filterRuangan || 'SEMUA', params.filterStatus || 'SEMUA', params.pegawai || 'SEMUA');
          } else if (action === 'getIntegratedRekapMonitoring') {
            runner.getIntegratedRekapMonitoring(params.token, params.bulan, params.tahun);
          } else if (action === 'getEmployeeDetailProgress') {
            runner.getEmployeeDetailProgress(params.token, params.namaPegawai, params.bulan, params.tahun);
          } else if (action === 'getJadwalPiketSecurityMatrix') {
            runner.getJadwalPiketSecurityMatrix(params.token, params.bulan, params.tahun);
          } else if (action === 'updateSecurityShift') {
            runner.updateSecurityShift(params.token, params.nama, params.tanggal, params.shiftBaru, params.alasan, params.bulan, params.tahun);
          } else if (action === 'swapSecurityShift') {
            runner.swapSecurityShift(params.token, params.nama1, params.tanggal1, params.nama2, params.tanggal2, params.alasan, params.bulan, params.tahun);
          } else if (action === 'getInspeksiMutuData') {
            runner.getInspeksiMutuData(params.token, params.unit || 'SEMUA', params.bulan, params.tahun);
          } else if (action === 'saveInspeksiMutu') {
            runner.saveInspeksiMutu(params.token, params.data);
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
      `;

      container.innerHTML = html;
    }

function renderDynamicMenu(jenis) {
      // Sembunyikan semua menu dinamis terlebih dahulu
      ['nav-dashboard', 'nav-kebersihan', 'nav-pelayanan', 'nav-keamanan', 'nav-dashboard-supervisor', 'nav-monitoring-admin', 'nav-shift-security', 'nav-inspeksi-mutu'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
      });

      if (isManagerRole(currentUser)) {
        // Tampilkan Menu Khusus Admin & Supervisor
        ['nav-dashboard-supervisor', 'nav-rekap', 'nav-monitoring-admin', 'nav-shift-security', 'nav-inspeksi-mutu', 'nav-profil'].forEach(id => {
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

      ['view-dashboard-supervisor','view-dashboard','view-monitoring-admin','view-monitoring','view-rekap','view-shift-security','view-inspeksi-mutu','view-profil','view-keamanan'].forEach(id => {
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
        document.getElementById('topbarSubtitle').innerText = 'Pengawasan manajerial operasional & mutu layanan';
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
      } else if (viewName === 'inspeksi-mutu') {
        document.getElementById('topbarTitle').innerText   = 'Inspeksi Mutu Layanan';
        document.getElementById('topbarSubtitle').innerText = 'Audit berkala kepatuhan standar operasional';
        document.getElementById('view-inspeksi-mutu')?.classList.remove('hidden');
        loadInspeksiMutuData();
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
      } else if (activeView === 'inspeksi-mutu') {
        loadInspeksiMutuData();
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
      } else if (activeView === 'inspeksi-mutu') {
        loadInspeksiMutuData();
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
    let cachedInspeksiData              = [];
    let adminMonitoringPeriod           = 'harian';
    let adminSelectedDayNum             = new Date().getDate();
    let adminSelectedWeekNum            = 1;
    let inspRatings                     = { 1: 5, 2: 5, 3: 5, 4: 5, 5: 5 };

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
     * CLIENT-SIDE MANAGER DATA CACHE & TAB ACCELERATOR
     * ========================================================================
     */
    window._managerDataCache = {
      dashboard: {},
      monitoring: {},
      rekap: {},
      security: {},
      inspeksi: {}
    };
