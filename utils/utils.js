/**
 * ========================================================================
 * SIMPEL-KU - UTILITIES MODULE (FRONTEND)
 * ========================================================================
 */

function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function safePercent(done, total) {
  done = Number(done || 0);
  total = Number(total || 0);
  return (total > 0 && !isNaN(total)) ? Math.round((done / total) * 100) : 0;
}

function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

function formatDateIndo(day, month, year) {
  const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${day} ${months[month] || month} ${year}`;
}
