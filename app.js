// NAVIGATION
// ═══════════════════════════════════════════
let _curView = 'dashboard';

function switchView(name) {
  _curView = name;
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  const vEl = document.getElementById('view-'+name);
  if(vEl) vEl.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('active', n.dataset.view===name));
  renderView(name);
  // Close sidebar on mobile
  if(window.innerWidth<=768) closeSidebar();
}

function renderView(name) {
  if(name==='dashboard')  renderDashboard();
  else if(name==='profile')   renderProfile();
  else if(name==='tasks')     renderTasks();
  else if(name==='habits')    renderHabitsView();
  else if(name==='goals')     renderGoals();
  else if(name==='analytics') renderAnalytics();
}

function refreshAll() {
  renderView(_curView);
  // Always keep stats fresh in topbar
  FM.updTopBar();
  const streak = SM.get();
  document.getElementById('sb-streak').textContent = streak.count;

  // Update Sidebar Profile Header
  const user = auth.currentUser;
  if(user) {
    const meta = DB.getMeta();
    const displayName = meta.customName || user.displayName || user.email.split('@')[0];
    document.getElementById('sb-username').textContent = displayName;
    const totalCompleted = DB.getTasks().filter(t=>t.status==='completed').length;
    const totalFocus = DB.getSessions().reduce((s,x)=>s+(x.duration||0),0);
    const totalXP = (totalCompleted * 10) + Math.floor(totalFocus / 60);
    const level = Math.floor(totalXP / 100) + 1;
    const levelTags = ['Novice', 'Apprentice', 'Practitioner', 'Ace', 'Master', 'Grandmaster', 'Legend'];
    document.getElementById('sb-userlevel').textContent = levelTags[Math.min(level-1, levelTags.length-1)];
    
    const sbAv = document.getElementById('sb-avatar-img');
    if(meta.avatarBase64) {
      sbAv.style.backgroundImage = `url(${meta.avatarBase64})`;
      sbAv.style.backgroundSize = 'cover';
      sbAv.textContent = '';
    } else if(user.photoURL) {
      sbAv.style.backgroundImage = `url(${user.photoURL})`;
      sbAv.style.backgroundSize = 'cover';
      sbAv.textContent = '';
    }
  }
}

// ═══════════════════════════════════════════
// SIDEBAR MOBILE
// ═══════════════════════════════════════════
function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sb-overlay').classList.add('on');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sb-overlay').classList.remove('on');
}

// ═══════════════════════════════════════════
// SHORTCUTS PANEL
// ═══════════════════════════════════════════
function toggleShortcuts() {
  document.getElementById('shortcut-panel').classList.toggle('on');
}

// ═══════════════════════════════════════════
// PLANNING PROMPT
// ═══════════════════════════════════════════
function checkPlanning() {
  const meta = DB.getMeta(), today = todayStr();
  if(meta.lastPlanning !== today) {
    setTimeout(()=>showModal('m-plan'), 2000);
    meta.lastPlanning=today; DB.saveMeta(meta);
  }
}
function goPlan() { closeModal('m-plan'); switchView('tasks'); setTimeout(()=>openTaskModal(null),300); }

// ═══════════════════════════════════════════
// KEYBOARD SHORTCUTS
// ═══════════════════════════════════════════
function initKeyboard() {
  document.addEventListener('keydown', e => {
    const tag = document.activeElement?.tagName;
    const inInput = tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT';

    if(e.key==='Escape') {
      document.querySelectorAll('.mbk.on').forEach(m=>m.classList.remove('on'));
      if(document.getElementById('fo').classList.contains('on')) FM.closeOverlay();
      document.getElementById('shortcut-panel').classList.remove('on');
      closeSidebar();
      MP.closePicker();
      return;
    }
    if(inInput) return;

    if(e.ctrlKey||e.metaKey) {
      if(e.key==='p') { e.preventDefault(); switchView('profile'); }
      else if(e.key==='n') { e.preventDefault(); openTaskModal(null); }
      else if(e.key==='f') { e.preventDefault(); if(FM.s.taskId) FM.openOverlay(); }
      else if(e.key==='g') { e.preventDefault(); openGoalModal(null); }
      else if(e.key==='h') { e.preventDefault(); switchView('habits'); }
      else if(e.key==='/') { e.preventDefault(); toggleShortcuts(); }
      else if(e.key==='1') { e.preventDefault(); switchView('dashboard'); }
      else if(e.key==='2') { e.preventDefault(); switchView('tasks'); }
      else if(e.key==='3') { e.preventDefault(); switchView('habits'); }
      else if(e.key==='4') { e.preventDefault(); switchView('goals'); }
      else if(e.key==='5') { e.preventDefault(); switchView('analytics'); }
      else if(e.key==='6') { e.preventDefault(); switchView('profile'); }
    }
  });
}

// ═══════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  // Sidebar nav
  document.querySelectorAll('.nav-item').forEach(it=>{
    it.addEventListener('click', ()=>switchView(it.dataset.view));
  });

  // Task filters
  document.getElementById('t-filters').addEventListener('click', e=>{
    const b=e.target.closest('.fbtn'); if(!b) return;
    document.querySelectorAll('#t-filters .fbtn').forEach(x=>x.classList.remove('active'));
    b.classList.add('active'); _taskFilter=b.dataset.f; renderTasks();
  });

  // Modal backdrop close
  document.querySelectorAll('.mbk').forEach(bk=>{
    bk.addEventListener('click', e=>{ if(e.target===bk) bk.classList.remove('on'); });
  });

  // Sidebar date
  document.getElementById('sb-date').textContent = new Date().toLocaleDateString([],{weekday:'short',month:'short',day:'numeric'});

  // Keyboard
  initKeyboard();

  // Boot
  TM.handleRecurring();
  FM.load();
  NM.init();
  renderDashboard();
  setTimeout(()=>initPlannerDragProtection(), 500); // init after render
  checkPlanning();

  // ── Midnight tick: fires exactly at 00:00 each night ──
  function scheduleMidnightTick() {
    const now = new Date();
    const msUntilMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()+1, 0, 0, 2).getTime() - now.getTime();
    setTimeout(() => {
      // New day — reset recurring tasks and refresh
      document.getElementById('sb-date').textContent = new Date().toLocaleDateString([],{weekday:'short',month:'short',day:'numeric'});
      TM.handleRecurring();
      NM.checkOverdueAtDayStart();
      refreshAll();
      toast('🌅 New day — recurring tasks reset!','s', 4000);
      scheduleMidnightTick(); // schedule next midnight
    }, msUntilMidnight);
  }
  scheduleMidnightTick();

  // ── Visibility change: when user returns to tab after midnight ──
  let _lastDate = todayStr();
  document.addEventListener('visibilitychange', () => {
    if(document.hidden) return;
    FM.onVisibilityResume(); // recalculate timer elapsed + re-acquire wake lock
    const currentDate = todayStr();
    if(currentDate !== _lastDate) {
      _lastDate = currentDate;
      document.getElementById('sb-date').textContent = new Date().toLocaleDateString([],{weekday:'short',month:'short',day:'numeric'});
      TM.handleRecurring();
      NM.checkOverdueAtDayStart();
      refreshAll();
      toast('🌅 New day — recurring tasks reset!','s', 4000);
    }
  });

  // Resize — redraw charts if analytics visible
  window.addEventListener('resize', ()=>{
    if(_curView==='analytics') setTimeout(()=>renderAnalytics(),100);
  });
});
