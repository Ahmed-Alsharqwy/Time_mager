'use strict';

// ═══════════════════════════════════════════
// THEME MANAGER
// ═══════════════════════════════════════════
function toggleTheme() {
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  document.documentElement.setAttribute('data-theme', isLight ? 'dark' : 'light');
  localStorage.setItem('nexus_theme', isLight ? 'dark' : 'light');
  const btn = document.getElementById('theme-btn');
  if(btn) btn.textContent = isLight ? '🌔' : '🌞';
}
(function(){
  const t = localStorage.getItem('nexus_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', t);
  window.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('theme-btn');
    if(btn) btn.textContent = t === 'light' ? '🌞' : '🌔';
  });
})();

// ═══════════════════════════════════════════
