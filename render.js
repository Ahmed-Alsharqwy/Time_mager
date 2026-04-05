// RENDER DASHBOARD
// ═══════════════════════════════════════════
function renderDashboard() {
  const stats = TM.stats();
  const streak = SM.get();
  const focus = FM.todayFocusTime();
  const logs = DB.getLogs();
  
  // Update Streak in sidebar
  document.getElementById('sb-streak').textContent = streak.count;

  // Mini stats strip
  const msDone = document.getElementById('d-ms-done');
  const msFocus = document.getElementById('d-ms-focus');
  const msStreak = document.getElementById('d-ms-streak');
  if(msDone) msDone.textContent = stats.completedToday;
  if(msFocus) msFocus.textContent = fmtDur(focus) || '0m';
  if(msStreak) msStreak.textContent = streak.count;

  // Render Today's Tasks — includes subtasks with dueDate=today
  const allTasks = DB.getTasks();
  const now = new Date();
  const nowMin = now.getHours()*60 + now.getMinutes();
  const td = todayStr();

  const todayTasks = allTasks.filter(t =>
    t.status !== 'completed' &&
    (
      isOverdue(t.dueDate) ||
      t.dueDate === td ||
      // Recurring daily tasks with no dueDate always appear
      (!t.parentId && t.recurrence === 'daily' && !t.dueDate) ||
      // level-based daily/biweekly/weekly with no specific date
      (!t.parentId && (t.level === 'daily' || t.level === 'biweekly' || t.level === 'weekly') && !t.dueDate)
    )
  );

  // Urgency score: 0=overdue, 1=time passed today, 2=due today future, 3=no-date tasks
  const urgency = t => {
    if(isOverdue(t.dueDate)) return 0;
    if(t.dueDate === td) {
      if(t.dueTime) {
        const [h,m] = t.dueTime.split(':').map(Number);
        return (h*60+m) < nowMin ? 1 : 2;
      }
      return 2;
    }
    return 3;
  };

  todayTasks.sort((a,b) => {
    const ua=urgency(a), ub=urgency(b);
    if(ua!==ub) return ua-ub;
    const ta=a.dueTime||'99:99', tb=b.dueTime||'99:99';
    if(ta!==tb) return ta<tb?-1:1;
    return (a.createdAt||0)-(b.createdAt||0);
  });

  const todayList = document.getElementById('d-today-list');
  const displayTasks = todayTasks.slice(0, 7);
  const remaining = todayTasks.length - displayTasks.length;

  if(displayTasks.length) {
    todayList.innerHTML = '';
    displayTasks.forEach(t => {
      // For subtasks — render as a compact flat row instead of nested mkTaskEl
      if(t.parentId) {
        const parent = allTasks.find(x=>x.id===t.parentId);
        const isOD = isOverdue(t.dueDate) && t.status!=='completed';
        const row = document.createElement('div');
        row.className = `ti p${t.priority[0]}`;
        row.innerHTML = `<div class="trow">
          <button class="tsb ${t.status==='completed'?'done':t.status==='in-progress'?'prog':''}"
            onclick="event.stopPropagation();TM.toggle('${t.id}');"
            title="Toggle complete">${t.status==='completed'?'✓':''}</button>
          <div style="font-size:10px;color:var(--tm);flex-shrink:0;padding-right:3px">↳</div>
          <div class="tname" style="font-size:13px">${esc(t.title)}${parent?`<span style="font-size:9px;color:var(--tm);margin-left:6px">${esc(parent.title)}</span>`:''}
          </div>
          ${isOD?'<span style="font-size:9px;color:var(--red);flex-shrink:0">OD</span>':''}
          ${t.dueTime?`<span style="font-size:10px;color:var(--tm);flex-shrink:0">⏰${t.dueTime}</span>`:''}
          <div class="tact">
            <button class="btn btn-s btn-xs" onclick="event.stopPropagation();FM.startTask('${t.id}')" title="Focus">▶</button>
          </div>
        </div>`;
        todayList.appendChild(row);
      } else {
        todayList.appendChild(mkTaskEl(t, 0, allTasks, null));
      }
    });
    if(remaining > 0) {
      const moreEl = document.createElement('div');
      moreEl.style.cssText = 'text-align:center;padding:8px;font-size:12px;color:var(--tm);cursor:pointer;border:1px dashed var(--b1);border-radius:var(--r);margin-top:4px';
      moreEl.innerHTML = `+${remaining} more — <span style="color:var(--accent)">View all →</span>`;
      moreEl.onclick = () => switchView('tasks');
      todayList.appendChild(moreEl);
    }
  } else {
    todayList.innerHTML = `<div class="card" style="display:flex;align-items:center;justify-content:center;min-height:80px;border-style:dashed;background:transparent">
      <div class="empty" style="padding:10px">
        <div class="empty-icon" style="font-size:20px">✨</div>
        <div class="empty-text">No pending tasks for today. Great job!</div>
      </div>
    </div>`;
  }

  // Habits widget
  renderHabits();

  const mit = TM.MIT();
  const ms = document.getElementById('d-mit');
  if(mit) {
    const pg = TM.progress(mit.id);
    ms.innerHTML = `<div class="mit">
      <div class="mit-lbl">🔥 Most Important Task</div>
      <div class="mit-title">${esc(mit.title)}</div>
      <div class="pb" style="margin-bottom:9px"><div class="pbf" style="width:${pg}%"></div></div>
      <div class="mit-meta">
        <span class="badge b${mit.priority[0]}">${mit.priority}</span>
        <span class="badge b${mit.level}">${mit.level}</span>
        ${mit.dueDate?`<span style="font-size:11px;color:${isOverdue(mit.dueDate)?'var(--red)':'var(--tm)'}">📅 ${mit.dueDate}</span>`:''}
        ${mit.dueTime?`<span style="font-size:11px;color:var(--td)">⏰ ${mit.dueTime}</span>`:''}
        ${isOverdue(mit.dueDate)?'<span class="badge bh">Overdue</span>':''}
        <button class="btn btn-p btn-sm" style="margin-left:auto" onclick="FM.startTask('${mit.id}')">▶ Focus</button>
      </div>
    </div>`;
  } else {
    ms.innerHTML=`<div class="card" style="display:flex;align-items:center;justify-content:center;min-height:100px"><div class="empty"><div class="empty-icon">🎯</div><div class="empty-text">No active tasks. Add one to get started!</div></div></div>`;
  }

  // Notification permission bar
  const nb = document.getElementById('d-notif-bar');
  if('Notification' in window && Notification.permission==='default') {
    nb.style.display='flex';
    nb.innerHTML=`<div class="notif-bar"><span class="notif-bar-text">🔔 Enable notifications for 30-min reminders & overdue alerts</span><button class="btn btn-p btn-sm" onclick="NM.requestPermission()">Enable</button></div>`;
  } else nb.style.display='none';

  // Overdue alert
  const overdue = DB.getTasks().filter(t=>isOverdue(t.dueDate)&&t.status!=='completed');
  const da = document.getElementById('d-overdue');
  if(overdue.length) {
    da.style.display='block';
    da.innerHTML=`<div class="overdue-alert">
      <h4>🔴 ${overdue.length} Overdue Task${overdue.length>1?'s':''}</h4>
      ${overdue.slice(0,5).map(t=>`<div class="overdue-item">• ${esc(t.title)} <span style="color:var(--red);font-size:10px">(${t.dueDate})</span></div>`).join('')}
      ${overdue.length>5?`<div style="font-size:11px;color:var(--tm);margin-top:4px">+${overdue.length-5} more...</div>`:''}
    </div>`;
  } else da.style.display='none';

  // Month Planner
  MP.render();
  MP.initTouchDrag();
}

// ═══════════════════════════════════════════
// RENDER PROFILE
// ═══════════════════════════════════════════
function renderProfile() {
  const user = auth.currentUser;
  if(!user) return;

  // Name: prefer locally saved custom name
  const meta = DB.getMeta();
  const displayName = meta.customName || user.displayName || user.email.split('@')[0];
  document.getElementById('p-name').textContent = displayName;
  document.getElementById('p-email').textContent = user.email;
  document.getElementById('p-name-input').value = displayName;

  // Avatar: prefer custom base64 → Firebase photoURL → emoji
  const av = document.getElementById('p-avatar');
  const customAvatar = meta.avatarBase64;
  if(customAvatar) {
    av.style.backgroundImage = `url(${customAvatar})`;
    av.style.backgroundSize = 'cover';
    av.textContent = '';
  } else if(user.photoURL) {
    av.style.backgroundImage = `url(${user.photoURL})`;
    av.style.backgroundSize = 'cover';
    av.textContent = '';
  } else {
    av.style.backgroundImage = '';
    av.textContent = '👤';
  }

  const tasks = DB.getTasks();
  const sessions = DB.getSessions();
  const goals = DB.getGoals();
  const streak = SM.get();
  const stats = TM.stats();

  // Calculations
  const totalFocus = sessions.reduce((s,x)=>s+(x.duration||0),0);
  const totalCompleted = tasks.filter(t=>t.status==='completed').length;
  const totalGoals = goals.length;
  const completedGoals = goals.filter(g=>GM.progress(g.id).pct === 100).length;
  const allTimeRate = tasks.length ? Math.round((totalCompleted / tasks.length) * 100) : 0;

  // XP & Level (1 task = 10 XP, 1 min focus = 1 XP)
  const totalXP = (totalCompleted * 10) + Math.floor(totalFocus / 60);
  const level = Math.floor(totalXP / 100) + 1;
  const nextXP = level * 100;
  const currentXP = totalXP % 100;
  const xpPct = Math.round((currentXP / 100) * 100);

  const levelTags = ['Novice', 'Apprentice', 'Practitioner', 'Ace', 'Master', 'Grandmaster', 'Legend'];
  document.getElementById('p-level-tag').textContent = `Level ${level} ${levelTags[Math.min(level-1, levelTags.length-1)]}`;
  document.getElementById('p-xp').textContent = `${currentXP} / 100 XP`;
  document.getElementById('p-level-bar').style.width = `${xpPct}%`;

  // Stats Grid
  document.getElementById('p-stats').innerHTML = `
    <div class="p-stat-card"><div class="p-stat-icon">⏱</div><div class="p-stat-val">${fmtDur(totalFocus)}</div><div class="p-stat-lbl">Total Focus</div></div>
    <div class="p-stat-card"><div class="p-stat-icon">✅</div><div class="p-stat-val">${totalCompleted}</div><div class="p-stat-lbl">Tasks Done</div></div>
    <div class="p-stat-card"><div class="p-stat-icon">🔥</div><div class="p-stat-val">${streak.count}</div><div class="p-stat-lbl">Best Streak</div></div>
    <div class="p-stat-card"><div class="p-stat-icon">🎯</div><div class="p-stat-val">${allTimeRate}%</div><div class="p-stat-lbl">Success Rate</div></div>
    <div class="p-stat-card"><div class="p-stat-icon">◎</div><div class="p-stat-val">${completedGoals}/${totalGoals}</div><div class="p-stat-lbl">Goals Hit</div></div>
  `;

  // Overview Grid (Moved from Dashboard)
  document.getElementById('p-ov').innerHTML = `
    <div class="ov-card cr"><div class="ov-n">${stats.overdue}</div><div class="ov-l">🔴 Overdue</div></div>
    <div class="ov-card ca"><div class="ov-n">${stats.inProgress}</div><div class="ov-l">🟡 In Progress</div></div>
    <div class="ov-card cg"><div class="ov-n">${stats.completedToday}</div><div class="ov-l">🟢 Done Today</div></div>
  `;

  // Milestones
  const msEl = document.getElementById('p-milestones');
  const milestones = [
    {id:'m1', icon:'🌟', title:'First Step', desc:'Complete 1 task', check:()=>totalCompleted>=1},
    {id:'m2', icon:'🔥', title:'Streak Starter', desc:'3-day streak', check:()=>streak.count>=3},
    {id:'m3', icon:'🧗', title:'Climber', desc:'Reach Level 5', check:()=>level>=5},
    {id:'m4', icon:'🧘', title:'Zen Master', desc:'10 hours focus', check:()=>totalFocus>=36000},
    {id:'m5', icon:'🏆', title:'Goal Getter', desc:'Complete 3 goals', check:()=>completedGoals>=3},
  ];
  
  msEl.innerHTML = milestones.map(m => {
    const met = m.check();
    return `<div class="card" style="opacity:${met?1:0.4}; border-color:${met?'var(--accent)':'var(--b1)'}">
      <div style="font-size:24px; margin-bottom:4px">${m.icon}</div>
      <div style="font-weight:700; font-size:13px">${m.title}</div>
      <div style="font-size:10px; color:var(--tm)">${m.desc}</div>
    </div>`;
  }).join('');
}

// ═══════════════════════════════════════════
// RENDER TASKS
// ═══════════════════════════════════════════
let expandedSet = new Set();
let _taskFilter = 'all';
let _searchQ = '';

function onSearch() {
  _searchQ = (document.getElementById('t-search')?.value||'').toLowerCase().trim();
  renderTasks();
}

function renderTasks() {
  const all = DB.getTasks();
  const tree = document.getElementById('t-tree');
  if(!all.length) {
    tree.innerHTML=`<div class="empty"><div class="empty-icon">✦</div><div class="empty-text">No tasks yet. Click "+ Task" to begin.</div></div>`;
    return;
  }

  const f = _taskFilter;
  const q = _searchQ;

  // Filter function for a single task
  const matches = (t) => {
    if(q && !t.title.toLowerCase().includes(q) && !(t.description||'').toLowerCase().includes(q)) return false;
    if(f==='all') return true;
    if(f==='daily')     return t.level==='daily';
    if(f==='weekly')    return t.level==='weekly';
    if(f==='biweekly')  return t.level==='biweekly';
    if(f==='monthly')   return t.level==='monthly';
    if(f==='high')      return t.priority==='high';
    if(f==='pending')   return t.status==='pending';
    if(f==='completed') return t.status==='completed';
    if(f==='overdue')   return isOverdue(t.dueDate)&&t.status!=='completed';
    if(f==='recurring') return t.recurrence!=='none';
    return true;
  };

  // Build a set of IDs that match (incl. ancestors)
  let matchSet = null;
  if(f!=='all' || q) {
    const direct = all.filter(t=>matches(t));
    matchSet = new Set(direct.map(t=>t.id));
    direct.forEach(t=>{
      let p = t.parentId;
      while(p) {
        matchSet.add(p);
        const par = all.find(x=>x.id===p);
        p = par ? par.parentId : null;
      }
    });
  }

  const hasDes = (id) => {
    if(!matchSet) return true;
    if(matchSet.has(id)) return true;
    return all.filter(t=>t.parentId===id).some(c=>hasDes(c.id));
  };

  tree.innerHTML='';
  all.filter(t=>!t.parentId).forEach(t=>{
    if(hasDes(t.id)) tree.appendChild(mkTaskEl(t, 0, all, matchSet));
  });

  if(!tree.children.length) {
    tree.innerHTML=`<div class="empty"><div class="empty-icon">🔍</div><div class="empty-text">No tasks match your filter.</div></div>`;
  }
}

function mkTaskEl(task, depth, all, matchSet) {
  const children = all.filter(t=>t.parentId===task.id);
  const hasCh = children.length > 0;
  const prog = TM.progress(task.id);
  const compCh = hasCh ? children.filter(c=>c.status==='completed').length : 0;
  const isExp = expandedSet.has(task.id);
  const isOD = isOverdue(task.dueDate) && task.status!=='completed';
  const isDelay = (task.delayCount||0) >= 3;
  const statusCls = 's'+task.status.replace('-','');

  const wrap = document.createElement('div');
  wrap.style.cssText='display:flex;flex-direction:column';
  const item = document.createElement('div');
  item.className=`ti p${task.priority[0]} ${statusCls}`;
  item.dataset.id=task.id;

  const recBadge = task.recurrence!=='none'
    ? `<span class="trec-badge" title="Recurring ${task.recurrence}">↻${task.recurrence[0].toUpperCase()}</span>`:'';
  const timeBadge = task.dueTime
    ? `<span class="ttime" style="color:${isOD?'var(--red)':'var(--tm)'}">⏰${task.dueTime}</span>`:'';
  const goalBadge = task.goalId
    ? (() => { const g=DB.getGoals().find(x=>x.id===task.goalId); return g?`<span class="badge" style="background:rgba(52,211,153,.1);color:var(--green);font-size:9px">◎</span>`:''; })() : '';

  item.innerHTML=`<div class="trow">
    <button class="tex ${hasCh?(isExp?'open':''):'leaf'}" onclick="event.stopPropagation();toggleEx('${task.id}')" title="Expand">▶</button>
    <button class="tsb ${task.status==='completed'?'done':task.status==='in-progress'?'prog':''}"
      onclick="event.stopPropagation();TM.toggle('${task.id}');refreshAll();"
      title="Toggle complete">${task.status==='completed'?'✓':''}</button>
    <div class="tname" title="${esc(task.title)}">${esc(task.title)}</div>
    ${recBadge}${timeBadge}${goalBadge}
    ${isDelay?'<span class="badge bwarn" title="Delayed 3+ times">⚠️</span>':''}
    ${isOD?`<span style="font-size:9px;color:var(--red);flex-shrink:0">OD</span>`:''}
    <div class="tbadges">
      <span class="badge b${task.priority[0]}">${task.priority}</span>
      <span class="badge b${task.level}">${task.level}</span>
    </div>
    ${hasCh?`<span class="tprog">${compCh}/${children.length}</span>`:''}
    <div class="tact">
      <button class="btn btn-s btn-xs" onclick="event.stopPropagation();FM.startTask('${task.id}')" title="Start Focus">▶</button>
      <button class="btn btn-g btn-xs" onclick="event.stopPropagation();openTaskModal('${task.id}')" title="Add subtask">+</button>
      <button class="btn btn-g btn-xs" onclick="event.stopPropagation();openTaskModal(null,'${task.id}')" title="Edit">✎</button>
      <button class="btn btn-g btn-xs" onclick="event.stopPropagation();TM.skip('${task.id}');renderTasks();" title="Skip">↷</button>
      <button class="btn btn-d btn-xs" onclick="event.stopPropagation();delTask('${task.id}')" title="Delete">✕</button>
    </div>
  </div>`;

  if(hasCh) {
    const pb = document.createElement('div'); pb.className='tpb';
    pb.innerHTML=`<div class="pb"><div class="pbf b" style="width:${prog}%"></div></div>`;
    item.appendChild(pb);
  }
  wrap.appendChild(item);

  if(hasCh) {
    const cc = document.createElement('div');
    cc.className='tchildren'+(isExp?'':' hidden');
    cc.id='tc-'+task.id;
    children.forEach(c=>{
      if(!matchSet || matchSet.has(c.id)) cc.appendChild(mkTaskEl(c, depth+1, all, matchSet));
    });
    wrap.appendChild(cc);
  }
  return wrap;
}

function toggleEx(id) {
  expandedSet.has(id) ? expandedSet.delete(id) : expandedSet.add(id);
  const cc = document.getElementById('tc-'+id);
  if(cc) cc.classList.toggle('hidden');
  const btn = document.querySelector(`[data-id="${id}"] .tex`);
  if(btn) btn.classList.toggle('open');
}

function delTask(id) {
  if(!confirm('Delete this task and all its subtasks?')) return;
  TM.delete(id); toast('Task deleted',''); refreshAll();
}

// ═══════════════════════════════════════════
// RENDER GOALS
// ═══════════════════════════════════════════
const COLORS = {amber:'var(--accent)',blue:'var(--blue)',green:'var(--green)',purple:'var(--purple)',red:'var(--red)'};

function renderGoals() {
  const goals = DB.getGoals();
  const el = document.getElementById('g-list');
  if(!goals.length) {
    el.innerHTML=`<div class="empty"><div class="empty-icon">◎</div><div class="empty-text">No SMART goals yet. Create your first goal!</div></div>`;
    return;
  }
  el.innerHTML = goals.map(g=>{
    const p=GM.progress(g.id), c=COLORS[g.color]||COLORS.amber, sc=GM.smartScore(g);
    const smartDots=Array.from({length:5},(_,i)=>`<div style="width:8px;height:8px;border-radius:50%;background:${i<sc?'var(--green)':'var(--b2)'}"></div>`).join('');
    const measPct = g.target>0 ? Math.min(100,Math.round((g.current/g.target)*100)) : null;

    return `<div class="gc" style="border-left:3px solid ${c}">
      <div class="gc-hd">
        <div style="min-width:0">
          <div class="gc-title">${esc(g.title)}</div>
          ${g.dueDate?`<div style="font-size:11px;color:${isOverdue(g.dueDate)?'var(--red)':'var(--tm)'};margin-top:2px">📅 ${g.dueDate}${isOverdue(g.dueDate)?' — Overdue':''}</div>`:''}
        </div>
        <div style="display:flex;gap:5px;flex-shrink:0">
          <button class="btn btn-g btn-sm" onclick="openGoalModal('${g.id}')">✎</button>
          <button class="btn btn-d btn-sm" onclick="delGoal('${g.id}')">✕</button>
        </div>
      </div>
      ${g.description?`<div class="gc-desc">${esc(g.description)}</div>`:''}

      ${g.specific||g.metric||g.achievable||g.relevant?`<div class="gc-smart">
        ${g.specific?`<div class="gc-smart-item"><strong>Specific</strong>${esc(g.specific)}</div>`:''}
        ${g.metric&&g.target?`<div class="gc-smart-item"><strong>Measurable</strong>${esc(g.metric)}: ${g.current||0} / ${g.target} ${esc(g.unit)}</div>`:''}
        ${g.achievable?`<div class="gc-smart-item"><strong>Achievable</strong>${esc(g.achievable).substring(0,80)}${g.achievable.length>80?'…':''}</div>`:''}
        ${g.relevant?`<div class="gc-smart-item"><strong>Relevant</strong>${esc(g.relevant).substring(0,80)}${g.relevant.length>80?'…':''}</div>`:''}
      </div>`:''}

      <div style="margin:9px 0">
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--tm);margin-bottom:4px">
          <span>Task Progress</span><span>${p.completed}/${p.total} tasks</span>
        </div>
        <div class="pb" style="height:6px"><div class="pbf" style="width:${p.pct}%;background:${c}"></div></div>
      </div>
      ${measPct!==null?`<div style="margin-bottom:9px">
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--tm);margin-bottom:4px">
          <span>Measurable Progress</span><span>${g.current||0}/${g.target} ${esc(g.unit)}</span>
        </div>
        <div class="pb" style="height:4px"><div class="pbf g" style="width:${measPct}%"></div></div>
      </div>`:''}

      <div class="gc-foot">
        <span class="gc-pct">${p.pct}%</span>
        <div class="gc-smart-score">
          <div style="display:flex;gap:3px">${smartDots}</div>
          <span style="font-size:10px;color:var(--tm)">SMART ${sc}/5</span>
        </div>
        <button class="btn btn-g btn-sm" onclick="switchView('tasks')" style="margin-left:auto">View Tasks →</button>
      </div>
    </div>`;
  }).join('');
}

function delGoal(id) {
  if(!confirm('Delete this goal?')) return;
  GM.delete(id); toast('Goal deleted',''); renderGoals();
}

// ═══════════════════════════════════════════
// RENDER ANALYTICS
// ═══════════════════════════════════════════
function renderAnalytics() {
  const sessions = DB.getSessions();
  const logs = DB.getLogs();
  const totFocus = sessions.reduce((s,x)=>s+(x.duration||0),0);
  const totComp = logs.filter(l=>l.action==='completed').length;
  const streak = SM.get();
  const last30 = logs.filter(l=>l.action==='completed'&&(Date.now()-l.timestamp)<30*864e5).length;
  const avg30 = (last30/30).toFixed(1);

  document.getElementById('a-stats').innerHTML=`
    <div class="sc cb"><div class="si">⏱</div><div class="sv">${fmtDur(totFocus)}</div><div class="sl">Total Focus</div></div>
    <div class="sc cg"><div class="si">✅</div><div class="sv">${totComp}</div><div class="sl">All-Time Done</div></div>
    <div class="sc ca"><div class="si">🔥</div><div class="sv">${streak.count}</div><div class="sl">Streak</div></div>
    <div class="sc cp"><div class="si">📅</div><div class="sv">${avg30}</div><div class="sl">Avg/Day (30d)</div></div>
  `;

  // Level stats
  const ls = TM.levelStats();
  const levelEl = document.getElementById('level-stats');
  const lc = {daily:'var(--green)',weekly:'var(--blue)',monthly:'var(--purple)'};
  levelEl.innerHTML = ls.map(l=>`
    <div>
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
        <span style="color:var(--td);text-transform:capitalize">${l.level} tasks</span>
        <span style="font-family:var(--mono);color:var(--td)">${l.done}/${l.total} — ${l.pct}%</span>
      </div>
      <div class="pb" style="height:8px"><div class="pbf" style="width:${l.pct}%;background:${lc[l.level]}"></div></div>
    </div>
  `).join('');

  setTimeout(()=>{
    drawBar('wk-chart', TM.weeklyCompletions(), '#F59E0B');
    drawBar('fc-chart', TM.weeklyFocus(), '#60A5FA');
  }, 60);
}

// ═══════════════════════════════════════════
// CHART ENGINE
// ═══════════════════════════════════════════
function drawBar(canvasId, dataArr, color) {
  const canvas = document.getElementById(canvasId);
  if(!canvas) return;
  const parentW = canvas.parentElement.clientWidth - 32;
  const W = Math.max(parentW, 180);
  const H = parseInt(canvas.getAttribute('height'))||170;
  const dpr = window.devicePixelRatio||1;
  canvas.width = W*dpr; canvas.height = H*dpr;
  canvas.style.width=W+'px'; canvas.style.height=H+'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const pad={t:22,r:10,b:34,l:36};
  const cW=W-pad.l-pad.r, cH=H-pad.t-pad.b;
  const vals=dataArr.map(d=>d.val), max=Math.max(...vals,1);
  const n=dataArr.length, gap=cW/n, bW=gap*0.5;

  ctx.clearRect(0,0,W,H);

  for(let i=0;i<=4;i++){
    const y=pad.t+cH-(i/4)*cH;
    ctx.strokeStyle='rgba(37,45,60,.9)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(pad.l,y); ctx.lineTo(pad.l+cW,y); ctx.stroke();
    ctx.fillStyle='rgba(71,85,105,.85)'; ctx.font=`10px monospace`; ctx.textAlign='right';
    ctx.fillText(Math.round(i/4*max), pad.l-5, y+3.5);
  }

  dataArr.forEach((d,i)=>{
    const bH=Math.max(d.val/max*cH, 0);
    const x=pad.l+i*gap+(gap-bW)/2;
    const y=pad.t+cH-bH;
    if(d.val>0){
      const gr=ctx.createLinearGradient(x,y,x,y+bH);
      gr.addColorStop(0,color+'CC'); gr.addColorStop(1,color+'1A');
      ctx.fillStyle=gr;
      ctx.beginPath(); _rRect(ctx,x,y,bW,bH,3); ctx.fill();
      ctx.fillStyle=color; ctx.font='bold 9px monospace'; ctx.textAlign='center';
      ctx.fillText(d.val, x+bW/2, y-4);
    } else {
      ctx.fillStyle='rgba(37,45,60,.7)';
      ctx.beginPath(); _rRect(ctx,x,pad.t+cH-2,bW,2,1); ctx.fill();
    }
    ctx.fillStyle='rgba(148,163,184,.8)'; ctx.font='10px sans-serif'; ctx.textAlign='center';
    ctx.fillText(dataArr[i].label, x+bW/2, H-6);
  });
}

function _rRect(ctx,x,y,w,h,r){
  if(w<2*r)r=w/2; if(h<2*r)r=h/2;
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
  ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
  ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
  ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r); ctx.closePath();
}

// ═══════════════════════════════════════════
// PROFILE EDIT — AVATAR & NAME
// ═══════════════════════════════════════════
function triggerAvatarUpload() {
  document.getElementById('p-avatar-file').click();
}

function handleAvatarChange(input) {
  const file = input.files[0];
  if(!file) return;
  if(file.size > 3 * 1024 * 1024) { toast('⚠️ Image too large — max 3 MB','e'); return; }

  const reader = new FileReader();
  reader.onload = (e) => {
    // Resize to 200×200 before storing
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const SIZE = 200;
      canvas.width = SIZE; canvas.height = SIZE;
      const ctx = canvas.getContext('2d');
      // Crop to square from center
      const minSide = Math.min(img.width, img.height);
      const sx = (img.width - minSide) / 2;
      const sy = (img.height - minSide) / 2;
      ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, SIZE, SIZE);
      const b64 = canvas.toDataURL('image/jpeg', 0.85);
      const meta = DB.getMeta();
      meta.avatarBase64 = b64;
      DB.saveMeta(meta);
      // Update avatar immediately
      const av = document.getElementById('p-avatar');
      av.style.backgroundImage = `url(${b64})`;
      av.style.backgroundSize = 'cover';
      av.textContent = '';
      // Update sidebar avatar too
      const sbAv = document.getElementById('sb-avatar-img');
      sbAv.style.backgroundImage = `url(${b64})`;
      sbAv.style.backgroundSize = 'cover';
      sbAv.textContent = '';
      toast('✅ Profile photo updated!','s');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
  input.value = ''; // reset so same file can be re-selected
}

function startEditName() {
  document.getElementById('p-name-display').style.display = 'none';
  document.getElementById('p-name-edit').style.display = 'flex';
  const input = document.getElementById('p-name-input');
  input.focus();
  input.select();
}

function cancelEditName() {
  document.getElementById('p-name-display').style.display = 'flex';
  document.getElementById('p-name-edit').style.display = 'none';
}

function saveProfileName() {
  const val = document.getElementById('p-name-input').value.trim();
  if(!val) { toast('Name cannot be empty','e'); return; }
  const meta = DB.getMeta();
  meta.customName = val;
  DB.saveMeta(meta);
  document.getElementById('p-name').textContent = val;
  document.getElementById('sb-username').textContent = val;
  cancelEditName();
  toast('✅ Name updated!','s');
}

// Allow Enter/Escape in name input
document.addEventListener('DOMContentLoaded', () => {
  const ni = document.getElementById('p-name-input');
  if(ni) {
    ni.addEventListener('keydown', e => {
      if(e.key === 'Enter') saveProfileName();
      if(e.key === 'Escape') cancelEditName();
    });
  }
});

// ═══════════════════════════════════════════
// LOG VIEW
// ═══════════════════════════════════════════
let _curLogFilter = 'all';

function renderLog(filter='all') {
  renderTimeline(LM.getFiltered(filter), 'log-tl');
}

function setLogFilter(btn, filter) {
  document.querySelectorAll('[data-lf]').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active'); _curLogFilter=filter; renderLog(filter);
}

// ═══════════════════════════════════════════
