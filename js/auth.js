/**
 * ========================================================================
 * SIMPEL-KU - AUTHENTICATION & PROFILE CONTROLLER
 * ========================================================================
 */

function showLoginPage() {
      document.getElementById('loginPage').classList.remove('hidden');
      document.getElementById('mainApp').classList.add('hidden');

      sessionStorage.clear();
      sessionToken = null;
      currentUser = null;
    }

function initAuthenticatedApp() {
      document.getElementById('loginPage').classList.add('hidden');
      document.getElementById('mainApp').classList.remove('hidden');

      const initial = currentUser.namaPegawai ? currentUser.namaPegawai.charAt(0).toUpperCase() : 'U';
      document.getElementById('sidebarAvatar').innerText = initial;
      document.getElementById('sidebarUserName').innerText = currentUser.namaPegawai;
      document.getElementById('profilBigAvatar').innerText = initial;
      document.getElementById('profilNamaPegawai').innerText = currentUser.namaPegawai;
      document.getElementById('profilUsername').innerText = '@' + currentUser.username;
      document.getElementById('infoNamaLengkap').innerText = currentUser.namaPegawai;
      document.getElementById('infoUsername').innerText = currentUser.username;
      
      const supWelcome = document.getElementById('supWelcomeName');
      if (supWelcome) supWelcome.innerText = 'Halo, ' + currentUser.namaPegawai + '!';
      
      const dashWelcome = document.getElementById('dashWelcomeName');
      if (dashWelcome) dashWelcome.innerText = 'Halo, ' + currentUser.namaPegawai + '!';

      employeeJenis = currentUser.jenis || 'PIKET KEBERSIHAN KANTOR';
      renderDynamicMenu(employeeJenis);
      renderQuickActions();

      if (isManagerRole(currentUser)) {
        activeView = 'dashboard-supervisor';
      } else if (employeeJenis === 'KEAMANAN KANTOR') {
        activeView = 'keamanan';
      } else {
        activeView = 'dashboard';
      }

      navigateTo(activeView);
    }

async function handleLogin(event) {
      event.preventDefault();
      const username = document.getElementById('loginUsername').value.trim();
      const password = document.getElementById('loginPassword').value.trim();
      const errBox = document.getElementById('loginErrorMessage');
      const errText = document.getElementById('loginErrorText');
      const btnSubmit = document.getElementById('btnLoginSubmit');

      errBox.classList.add('hidden');
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i><span>Memverifikasi...</span>';

      try {
        const res = await callBackend('login', { username, password });
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '<span>Masuk ke Dashboard</span><i class="fa-solid fa-arrow-right text-xs"></i>';
        if (res && res.success) {
          sessionToken  = res.token;
          currentUser   = res.user;
          sessionStorage.setItem('simpelkeb_token', res.token);
          sessionStorage.setItem('simpelkeb_user', JSON.stringify(res.user));
          showToast('Login berhasil! Selamat datang, ' + res.user.namaPegawai, 'success');
          initAuthenticatedApp();
        } else {
          errText.innerText = (res && res.message) ? res.message : 'Kredensial tidak valid.';
          errBox.classList.remove('hidden');
        }
      } catch (err) {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '<span>Masuk ke Dashboard</span><i class="fa-solid fa-arrow-right text-xs"></i>';
        errText.innerText = 'Koneksi gagal: ' + err.message;
        errBox.classList.remove('hidden');
      }
    }

async function handleLogout() {
      showLoader(true);
      try {
        if (sessionToken) {
          await callBackend('logout', { token: sessionToken });
        }
      } catch (e) {
        console.warn('Logout error:', e);
      } finally {
        showLoader(false);
        showToast("Anda telah keluar dari aplikasi.", "info");
        showLoginPage();
      }
    }

/**
     * =========================================================================
     * PENGATURAN PROFIL & GANTI KREDENSIAL
     * =========================================================================
     */
    function initProfilView() {
      if (currentUser) {
        const initial = currentUser.namaPegawai ? currentUser.namaPegawai.charAt(0).toUpperCase() : 'U';
        document.getElementById('profilBigAvatar').innerText = initial;
        document.getElementById('profilNamaPegawai').innerText = currentUser.namaPegawai;
        document.getElementById('profilUsername').innerText = '@' + currentUser.username;
        document.getElementById('infoNamaLengkap').innerText = currentUser.namaPegawai;
        document.getElementById('infoUsername').innerText = currentUser.username;

        const editUserInput = document.getElementById('editNewUsername');
        const form = document.getElementById('formChangeCred');
        if (form) form.reset();
        if (editUserInput) editUserInput.value = currentUser.username;

        const msgBox = document.getElementById('changeCredMsg');
        if (msgBox) msgBox.classList.add('hidden');
      }
    }

async function handleChangeCredentials(event) {
      event.preventDefault();
      const oldPassword = document.getElementById('editOldPassword').value.trim();
      const newUsername = document.getElementById('editNewUsername').value.trim();
      const newPassword = document.getElementById('editNewPassword').value.trim();
      const confirmPassword = document.getElementById('editConfirmPassword').value.trim();
      const btnSubmit = document.getElementById('btnSubmitCred');

      if (!oldPassword) {
        showCredMessage('Password saat ini wajib diisi untuk verifikasi keamanan.', 'error');
        return;
      }

      if (newUsername.length < 3) {
        showCredMessage('Username baru minimal harus terdiri dari 3 karakter.', 'error');
        return;
      }

      if (newPassword) {
        if (newPassword.length < 4) {
          showCredMessage('Password baru minimal harus terdiri dari 4 karakter.', 'error');
          return;
        }
        if (newPassword !== confirmPassword) {
          showCredMessage('Konfirmasi password baru tidak cocok dengan password baru.', 'error');
          return;
        }
      }

      if (newUsername === currentUser.username && !newPassword) {
        showCredMessage('Tidak ada perubahan pada username maupun password.', 'error');
        return;
      }

      btnSubmit.disabled = true;
      btnSubmit.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i><span>Menyimpan Perubahan...</span>';

      try {
        const res = await callBackend('changeCredentials', {
          token: sessionToken,
          oldPassword: oldPassword,
          newUsername: newUsername,
          newPassword: newPassword
        });

        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '<i class="fa-solid fa-floppy-disk text-xs"></i><span>Simpan Perubahan Kredensial</span>';

        if (res && res.success) {
          if (res.user) {
            currentUser.username = res.user.username;
            sessionStorage.setItem('simpelkeb_user', JSON.stringify(currentUser));
            document.getElementById('profilUsername').innerText = '@' + res.user.username;
            document.getElementById('infoUsername').innerText = res.user.username;
          }
          showToast('Kredensial berhasil diperbarui!', 'success');
          document.getElementById('formChangeCred').reset();
          document.getElementById('editNewUsername').value = currentUser.username;
          showCredMessage(res.message || 'Username dan/atau password berhasil diperbarui.', 'success');
        } else {
          showCredMessage(res && res.message ? res.message : 'Gagal mengubah kredensial.', 'error');
        }
      } catch (err) {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '<i class="fa-solid fa-floppy-disk text-xs"></i><span>Simpan Perubahan Kredensial</span>';
        showCredMessage('Kesalahan server: ' + err.message, 'error');
      }
    }

function showCredMessage(msg, type) {
      const msgBox = document.getElementById('changeCredMsg');
      if (!msgBox) return;

      if (type === 'success') {
        msgBox.className = 'text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl flex items-start space-x-2.5';
        msgBox.innerHTML = '<i class="fa-solid fa-circle-check text-emerald-600 mt-0.5 flex-shrink-0"></i><span>' + escapeHtml(msg) + '</span>';
      } else {
        msgBox.className = 'text-xs text-rose-700 bg-rose-50 border border-rose-200 p-3.5 rounded-xl flex items-start space-x-2.5';
        msgBox.innerHTML = '<i class="fa-solid fa-triangle-exclamation text-rose-600 mt-0.5 flex-shrink-0"></i><span>' + escapeHtml(msg) + '</span>';
      }
      msgBox.classList.remove('hidden');
    }

function toggleCredPassword(inputId, iconId) {
      const input = document.getElementById(inputId);
      const icon = document.getElementById(iconId);
      if (!input || !icon) return;
      if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fa-solid fa-eye-slash text-xs';
      } else {
        input.type = 'password';
        icon.className = 'fa-solid fa-eye text-xs';
      }
    }

function togglePasswordVisibility() {
      const input = document.getElementById('loginPassword');
      const icon = document.getElementById('eyeIcon');
      if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
      } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
      }
    }
