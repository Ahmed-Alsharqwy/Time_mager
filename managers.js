// LOG MANAGER
// ═══════════════════════════════════════════
const LM = {
  log(action, taskId, extra={}) {
    const logs = DB.getLogs();
    logs.push({id:uuid(), action, taskId, timestamp:Date.now(), ...extra});
    if(logs.length > 1500) logs.splice(0, logs.length-1500);
    DB.saveLogs(logs);
  },
  getFiltered(filter) {
    const logs = DB.getLogs().slice().reverse();
    if(filter==='today') return logs.filter(l=>isToday(l.timestamp));
    if(filter==='week')  return logs.filter(l=>isThisWeek(l.timestamp));
    return logs;
  },
};

// ═══════════════════════════════════════════
// STREAK MANAGER
// ═══════════════════════════════════════════
const SM = {
  update() {
    const s=DB.getStreak(), today=todayStr();
    if(s.lastDate===today) return s.count;
    const yest=daysAgoStr(1);
    s.count = (s.lastDate===yest) ? s.count+1 : 1;
    s.lastDate=today;
    DB.saveStreak(s);
    return s.count;
  },
  get(){ return DB.getStreak(); },
};

// ═══════════════════════════════════════════
// NOTIFICATION MANAGER
// ═══════════════════════════════════════════
const NM = {
  _interval: null,
  _shownToday: new Set(),

  async requestPermission() {
    if(!('Notification' in window)) { toast('⚠️ Notifications not supported in this browser','w'); return; }
    const perm = await Notification.requestPermission();
    this._updateBtn();
    if(perm==='granted') {
      toast('🔔 Notifications enabled! You\'ll get reminders 30 min before tasks','s');
      this._startLoop();
    } else if(perm==='denied') {
      toast('🔕 Notifications blocked. Enable in browser settings.','e');
    }
  },

  _updateBtn() {
    const btn = document.getElementById('notif-btn');
    if(!btn) return;
    if(!('Notification' in window)) { btn.title='Not supported'; return; }
    btn.classList.remove('granted','denied');
    if(Notification.permission==='granted') { btn.classList.add('granted'); btn.title='Notifications ON'; }
    else if(Notification.permission==='denied') { btn.classList.add('denied'); btn.title='Notifications BLOCKED'; }
    else btn.title='Click to enable notifications';
  },

  _notify(title, body, tag) {
    if(Notification.permission!=='granted') return;
    try {
      new Notification(title, { body, icon:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">⚡</text></svg>', tag });
    } catch(e) { console.warn('Notification failed',e); }
  },

  _startLoop() {
    if(this._interval) clearInterval(this._interval);
    this._check();
    this._interval = setInterval(()=>this._check(), 60000);
  },

  _check() {
    if(Notification.permission!=='granted') return;
    const tasks = DB.getTasks();
    const now = new Date();
    const today = todayStr();
    const nowMin = now.getHours()*60 + now.getMinutes();

    tasks.forEach(t => {
      if(t.status==='completed' || !t.dueDate || !t.dueTime) return;
      if(t.dueDate !== today) return;

      const [h,m] = t.dueTime.split(':').map(Number);
      const taskMin = h*60+m;
      const diff = taskMin - nowMin;

      // 30-min reminder
      if(diff >= 28 && diff <= 32) {
        const key = `rem-${t.id}-${today}`;
        if(!this._shownToday.has(key)) {
          this._shownToday.add(key);
          this._notify(`⏰ 30-min Reminder`, `"${t.title}" is due at ${t.dueTime}`, key);
          toast(`⏰ Reminder: "${t.title}" in 30 min`,'w', 5000);
        }
      }
    });
  },

  checkOverdueAtDayStart() {
    const tasks = DB.getTasks();
    const overdue = tasks.filter(t => isOverdue(t.dueDate) && t.status!=='completed');
    if(!overdue.length) return;
    const names = overdue.slice(0,3).map(t=>t.title).join(', ');
    const extra = overdue.length>3 ? ` +${overdue.length-3} more` : '';
    this._notify('🔴 Overdue Tasks', `${names}${extra}`, 'overdue-daily');
  },

  init() {
    this._updateBtn();
    if(Notification.permission==='granted') {
      this._startLoop();
      this.checkOverdueAtDayStart();
    }
  },
};

// ═══════════════════════════════════════════
// TASK MANAGER
// ═══════════════════════════════════════════
const TM = {
  create(data) {
    const t = {
      id: uuid(),
      title: (data.title||'').trim() || 'Untitled',
      description: data.description||'',
      level: data.level||'daily',
      parentId: data.parentId||null,
      priority: data.priority||'medium',
      status: 'pending',
      dueDate: data.dueDate||null,
      dueTime: data.dueTime||null,
      createdAt: Date.now(),
      estimatedTime: parseInt(data.estimatedTime)||0,
      lastCompletedDate: null,
      recurrence: data.recurrence||'none',
      delayCount: 0,
      goalId: data.goalId||null,
      order: Date.now(),
    };
    const tasks = DB.getTasks();
    tasks.push(t);
    DB.saveTasks(tasks);
    LM.log('created', t.id);
    return t;
  },

  update(id, data) {
    const tasks = DB.getTasks();
    const i = tasks.findIndex(t=>t.id===id);
    if(i===-1) return null;
    tasks[i] = {...tasks[i], ...data};
    DB.saveTasks(tasks);
    return tasks[i];
  },

  delete(id) {
    const all = DB.getTasks();
    const del = new Set();
    const mark = (tid) => { del.add(tid); all.filter(t=>t.parentId===tid).forEach(t=>mark(t.id)); };
    mark(id);
    DB.saveTasks(all.filter(t=>!del.has(t.id)));
  },

  toggle(id) {
    const t = DB.getTasks().find(t=>t.id===id);
    if(!t) return;
    const done = t.status !== 'completed';
    this.update(id, {
      status: done ? 'completed' : 'pending',
      lastCompletedDate: done ? todayStr() : null,
    });
    if(done) { LM.log('completed', id); SM.update(); toast('✓ Task completed!','s'); }
    else LM.log('uncompleted', id);
    // Refresh all views so task disappears/appears in Today's Focus and Planner
    if(typeof refreshAll === 'function') refreshAll();
  },

  start(id) { this.update(id, {status:'in-progress'}); LM.log('started', id); },

  skip(id) {
    const t = DB.getTasks().find(t=>t.id===id);
    if(!t) return;
    this.update(id, {delayCount:(t.delayCount||0)+1});
    LM.log('skipped', id);
    if((t.delayCount||0)+1 >= 3) toast('⚠️ Delayed 3+ times — consider breaking it down','w',4000);
    else toast('Task skipped','');
  },

  get(id) { return DB.getTasks().find(t=>t.id===id)||null; },

  roots(filter='', search='') {
    let tasks = DB.getTasks().filter(t=>!t.parentId);
    return tasks.sort((a,b)=>{
      const da = a.dueDate||'9999-99-99', db = b.dueDate||'9999-99-99';
      if(da!==db) return da<db?-1:1;
      const ta = a.dueTime||'99:99', tb = b.dueTime||'99:99';
      if(ta!==tb) return ta<tb?-1:1;
      return (a.order||0)-(b.order||0);
    });
  },

  children(pid) { return DB.getTasks().filter(t=>t.parentId===pid).sort((a,b)=>a.order-b.order); },

  progress(id) {
    const tasks = DB.getTasks();
    const calc = (tid) => {
      const ch = tasks.filter(t=>t.parentId===tid);
      if(!ch.length) {
        const t = tasks.find(t=>t.id===tid);
        return t?.status==='completed' ? 100 : 0;
      }
      return Math.round(ch.reduce((s,c)=>s+calc(c.id),0)/ch.length);
    };
    return calc(id);
  },

  MIT() {
    const tasks = DB.getTasks().filter(t=>t.status!=='completed');
    if(!tasks.length) return null;
    const sc = t => {
      let s = {high:3,medium:2,low:1}[t.priority]||1;
      if(isOverdue(t.dueDate)) s+=4;
      else if(t.dueDate===todayStr()) s+=2;
      if(t.status==='in-progress') s+=1;
      return s;
    };
    return tasks.sort((a,b)=>sc(b)-sc(a))[0];
  },

  stats() {
    const tasks = DB.getTasks();
    return {
      completedToday: tasks.filter(t=>t.lastCompletedDate===todayStr()).length,
      inProgress:     tasks.filter(t=>t.status==='in-progress').length,
      completed:      tasks.filter(t=>t.status==='completed').length,
      overdue:        tasks.filter(t=>isOverdue(t.dueDate)&&t.status!=='completed').length,
      total:          tasks.length,
    };
  },

  // ── RECURRING: Reset tasks that are due again + advance dueDate
  handleRecurring() {
    const tasks = DB.getTasks();
    const today = todayStr();
    let changed = false;

    tasks.forEach(t => {
      if(t.recurrence === 'none') return;
      // If task is completed AND it was completed before today → reset it
      if(t.status === 'completed' && t.lastCompletedDate && t.lastCompletedDate < today) {
        let shouldReset = false;
        if(t.recurrence === 'daily') {
          shouldReset = true; // always reset daily if completed before today
        } else if(t.recurrence === 'weekly') {
          const diff = (new Date(today) - new Date(t.lastCompletedDate)) / 864e5;
          if(diff >= 7) shouldReset = true;
        } else if(t.recurrence === 'biweekly') {
          const diff = (new Date(today) - new Date(t.lastCompletedDate)) / 864e5;
          if(diff >= 14) shouldReset = true;
        } else if(t.recurrence === 'monthly') {
          const l = new Date(t.lastCompletedDate), n = new Date(today);
          if(n.getMonth() !== l.getMonth() || n.getFullYear() !== l.getFullYear()) shouldReset = true;
        }
        if(shouldReset) {
          t.status = 'pending';
          t.lastCompletedDate = null;
          // Advance dueDate to today for recurring tasks that had a date
          if(t.dueDate && t.dueDate < today) t.dueDate = today;
          changed = true;
        }
      }
      // If task is pending/in-progress but its dueDate is in the past → advance to today
      // (handles case where app was closed overnight)
      if(t.status !== 'completed' && t.dueDate && t.dueDate < today && t.recurrence !== 'none') {
        t.dueDate = today;
        changed = true;
      }
    });
    if(changed) DB.saveTasks(tasks);
  },

  weeklyCompletions() {
    const logs = DB.getLogs();
    return Array.from({length:7},(_,i)=>{
      const day = daysAgoStr(6-i);
      const d = new Date(); d.setDate(d.getDate()-(6-i));
      return {
        label: d.toLocaleDateString([],{weekday:'short'}),
        val: logs.filter(l=>l.action==='completed'&&new Date(l.timestamp).toISOString().split('T')[0]===day).length,
      };
    });
  },

  weeklyFocus() {
    const sess = DB.getSessions();
    return Array.from({length:7},(_,i)=>{
      const day = daysAgoStr(6-i);
      const d = new Date(); d.setDate(d.getDate()-(6-i));
      const total = sess.filter(s=>new Date(s.startTime).toISOString().split('T')[0]===day).reduce((s,x)=>s+(x.duration||0),0);
      return { label: d.toLocaleDateString([],{weekday:'short'}), val: Math.round(total/60) };
    });
  },

  levelStats() {
    const tasks = DB.getTasks();
    return ['daily','weekly','biweekly','monthly'].map(lv=>{
      const lt = tasks.filter(t=>t.level===lv);
      const done = lt.filter(t=>t.status==='completed').length;
      return { level:lv, total:lt.length, done, pct: lt.length ? Math.round(done/lt.length*100) : 0 };
    });
  },
};

// ═══════════════════════════════════════════
