// MONTH PLANNER ENGINE
// ═══════════════════════════════════════════
const MP = {
  _offset: 0,
  _expandedWeeks: new Set([0,1,2,3,4,5]),
  _dragTaskId: null,
  _pickerDate: null,
  _pickerSearch: '',
  _pickerExpandedRoots: new Set(),

  /* ── helpers ── */
  _monthStart(offset=0) {
    const d = new Date(); d.setDate(1);
    d.setMonth(d.getMonth()+offset); d.setHours(0,0,0,0);
    return d;
  },
  _dateStr(d) {
    // Use local date to avoid UTC shift bug
    const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), day=String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  },
  _addDays(base, n) {
    const d = new Date(base); d.setDate(d.getDate()+n); return d;
  },

  /* Full month grid — covers every day of the month, padded to Mon-Sun rows */
  _buildGrid(offset=0) {
    const ms = this._monthStart(offset);
    const me = new Date(ms.getFullYear(), ms.getMonth()+1, 0); // last day of month
    const dow = ms.getDay(); // 0=Sun
    const mondayOff = dow===0 ? -6 : 1-dow;
    const gridStart = this._addDays(ms, mondayOff);
    const weeks = [];
    let cur = new Date(gridStart);
    // Keep adding weeks until we've covered the last day of the month
    while(cur <= me) {
      const days = [];
      for(let d=0;d<7;d++) { days.push(new Date(cur)); cur.setDate(cur.getDate()+1); }
      weeks.push(days);
    }
    return { weeks, monthStart: ms, monthEnd: me };
  },

  /* ── main render ── */
  render() {
    const el = document.getElementById('d-month-planner');
    if(!el) return;
    const { weeks, monthStart, monthEnd } = this._buildGrid(this._offset);
    const today = todayStr();
    const allTasks = DB.getTasks(); // include subtasks
    const rootTasks = allTasks.filter(t=>!t.parentId);
    const dayNames = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const monthName = monthStart.toLocaleDateString([],{month:'long',year:'numeric'});

    // Expand all weeks when month changes
    if(this._expandedWeeks.size === 0) {
      weeks.forEach((_,i)=>this._expandedWeeks.add(i));
    }

    const scheduledCount = allTasks.filter(t=>
      t.dueDate && weeks.flat().some(d=>this._dateStr(d)===t.dueDate)
    ).length;

    let html = `<div class="mp-wrap">
      <div class="mp-header">
        <div class="mp-nav">
          <button class="mp-nav-btn" onclick="MP.prevMonth()">‹</button>
          <div class="mp-month-lbl">${monthName}</div>
          <button class="mp-nav-btn" onclick="MP.nextMonth()">›</button>
        </div>
        <div style="font-size:10px;color:var(--tm)">${scheduledCount} task${scheduledCount!==1?'s':''} scheduled</div>
      </div>`;

    weeks.forEach((days, wi) => {
      const wStart = this._dateStr(days[0]);
      const wEnd   = this._dateStr(days[6]);
      // Count all tasks (incl subtasks) in this week
      const wTasks = allTasks.filter(t=>t.dueDate && t.dueDate>=wStart && t.dueDate<=wEnd && t.status!=='completed');
      const isOpen = this._expandedWeeks.has(wi);
      const hasToday = days.some(d=>this._dateStr(d)===today);
      const inMonth = days.some(d=>d.getMonth()===monthStart.getMonth());
      if(!inMonth) return; // skip weeks fully outside month (shouldn't happen with new logic)

      html += `<div class="mp-week" id="mp-week-${wi}">
        <div class="mp-week-hd" onclick="MP.toggleWeek(${wi})" style="${hasToday?'border-left:3px solid var(--accent);':''}">
          <div class="mp-week-lbl">
            Week ${wi+1}
            ${hasToday?'<span style="color:var(--accent);font-size:10px;font-weight:700">● This Week</span>':''}
            ${wTasks.length?`<span class="mp-week-badge">${wTasks.length}</span>`:''}
          </div>
          <span class="mp-week-arrow ${isOpen?'open':''}">▶</span>
        </div>`;

      if(isOpen) {
        html += `<div class="mp-days-scroll"><div class="mp-days">`;
        days.forEach((day, di) => {
          const ds = this._dateStr(day);
          const inCurMonth = day.getMonth()===monthStart.getMonth();
          const isToday = ds===today;
          const isPast  = ds<today;
          const dayTasks = allTasks.filter(t=>
            t.dueDate===ds ||
            // Show recurring daily tasks on today's cell even if no dueDate
            (isToday && !t.dueDate && !t.parentId && t.recurrence==='daily' && t.status!=='completed')
          );
          const shown = dayTasks.slice(0,3);
          const extra = dayTasks.length - shown.length;

          const chipsHTML = shown.map(t=>`
            <div class="mp-chip p${t.priority[0]} ${t.status==='completed'?'done':''}"
              data-draggable="true" data-tid="${t.id}"
              ondragstart="MP.onDragStart(event,'${t.id}')"
              ondragend="MP.onDragEnd(event)"
              title="${esc(t.title)}">
              <span class="mp-chip-txt">${t.parentId?'↳ ':''} ${esc(t.title)}</span>
              <span class="mp-chip-del" onclick="event.stopPropagation();MP.unassign('${t.id}')" title="Remove">×</span>
            </div>`).join('');

          html += `<div class="mp-day ${isToday?'today':''} ${isPast&&!isToday?'past':''} ${!inCurMonth?'out-month':''}"
            id="mp-day-${ds}"
            ondragover="MP.onDragOver(event,'${ds}')"
            ondragleave="MP.onDragLeave(event)"
            ondrop="MP.onDrop(event,'${ds}')">
            <div class="mp-day-hd">
              <div>
                <div class="mp-day-name">${dayNames[di]}${isToday?'<span class="mp-today-dot"></span>':''}</div>
                <div class="mp-day-num" style="${!inCurMonth?'opacity:.35':''}">${day.getDate()}</div>
              </div>
              <button class="mp-add-btn" onclick="MP.openPicker('${ds}')" title="Assign task">+</button>
            </div>
            ${chipsHTML}
            ${extra>0?`<div class="mp-more" onclick="MP.openPicker('${ds}')">+${extra}</div>`:''}
          </div>`;
        });
        html += `</div></div>`; // .mp-days + .mp-days-scroll
      }
      html += `</div>`; // .mp-week
    });

    html += `</div>`;
    el.innerHTML = html;
  },

  prevMonth() { this._offset--; this._expandedWeeks=new Set([0,1,2,3,4,5]); this.render(); },
  nextMonth() { this._offset++; this._expandedWeeks=new Set([0,1,2,3,4,5]); this.render(); },

  toggleWeek(wi) {
    if(this._expandedWeeks.has(wi)) this._expandedWeeks.delete(wi);
    else this._expandedWeeks.add(wi);
    this.render();
  },

  scrollToToday() {
    this._offset=0; this._expandedWeeks=new Set([0,1,2,3,4,5]); this.render();
    setTimeout(()=>{ const el=document.querySelector('.mp-day.today'); if(el) el.scrollIntoView({behavior:'smooth',block:'center'}); },100);
  },

  /* ── drag & drop ── */
  onDragStart(e,taskId) {
    this._dragTaskId=taskId;
    e.dataTransfer.effectAllowed='move';
    e.dataTransfer.setData('text/plain',taskId);
    setTimeout(()=>{ if(e.target) e.target.classList.add('dragging'); },0);
  },
  onDragEnd(e) {
    document.querySelectorAll('.mp-chip.dragging').forEach(el=>el.classList.remove('dragging'));
    document.querySelectorAll('.mp-day.drag-over').forEach(el=>el.classList.remove('drag-over'));
    this._dragTaskId=null;
  },
  onDragOver(e,dateStr) {
    e.preventDefault(); e.dataTransfer.dropEffect='move';
    const cell=document.getElementById('mp-day-'+dateStr);
    if(cell) cell.classList.add('drag-over');
  },
  onDragLeave(e) {
    const cell=e.currentTarget;
    if(cell&&!cell.contains(e.relatedTarget)) cell.classList.remove('drag-over');
  },
  onDrop(e,dateStr) {
    e.preventDefault();
    const tid=this._dragTaskId||e.dataTransfer.getData('text/plain');
    if(!tid) return;
    TM.update(tid,{dueDate:dateStr});
    toast(`📌 Scheduled for ${dateStr}`,'s',2000);
    this.render(); refreshAll();
  },
  unassign(taskId) {
    TM.update(taskId,{dueDate:null});
    this.render(); refreshAll();
    toast('Date removed','',1500);
  },

  /* ── Touch drag & drop ── */
  _touch: { taskId:null, ghost:null, lastTarget:null },

  initTouchDrag() {
    // Delegate touch events on the planner container
    const el = document.getElementById('d-month-planner');
    if(!el || el._touchInited) return;
    el._touchInited = true;

    el.addEventListener('touchstart', e => {
      const chip = e.target.closest('.mp-chip[data-tid]');
      if(!chip) return;
      const tid = chip.dataset.tid;
      this._touch.taskId = tid;

      // Create ghost element
      const ghost = chip.cloneNode(true);
      ghost.style.cssText = `position:fixed;z-index:9999;opacity:0.85;pointer-events:none;width:${chip.offsetWidth}px;font-size:11px;`;
      document.body.appendChild(ghost);
      this._touch.ghost = ghost;

      chip.classList.add('dragging');
      e.preventDefault();
    }, {passive:false});

    el.addEventListener('touchmove', e => {
      if(!this._touch.taskId) return;
      e.preventDefault();
      const t = e.touches[0];
      const g = this._touch.ghost;
      if(g) { g.style.left = (t.clientX - 40)+'px'; g.style.top = (t.clientY - 16)+'px'; }

      // Find which day cell we're over
      const target = document.elementFromPoint(t.clientX, t.clientY);
      const dayCell = target?.closest('.mp-day[id^="mp-day-"]');

      if(this._touch.lastTarget && this._touch.lastTarget !== dayCell) {
        this._touch.lastTarget.classList.remove('drag-over');
      }
      if(dayCell) {
        dayCell.classList.add('drag-over');
        this._touch.lastTarget = dayCell;
      }
    }, {passive:false});

    el.addEventListener('touchend', e => {
      if(!this._touch.taskId) return;

      // Clean up ghost
      if(this._touch.ghost) { this._touch.ghost.remove(); this._touch.ghost = null; }
      document.querySelectorAll('.mp-chip.dragging').forEach(c=>c.classList.remove('dragging'));
      document.querySelectorAll('.mp-day.drag-over').forEach(c=>c.classList.remove('drag-over'));

      const t = e.changedTouches[0];
      const target = document.elementFromPoint(t.clientX, t.clientY);
      const dayCell = target?.closest('.mp-day[id^="mp-day-"]');

      if(dayCell) {
        const dateStr = dayCell.id.replace('mp-day-','');
        TM.update(this._touch.taskId, {dueDate: dateStr});
        toast(`📌 Moved to ${dateStr}`,'s',2000);
        this.render(); refreshAll();
      }

      this._touch.taskId = null;
      this._touch.lastTarget = null;
    });
  },

  /* ── picker with subtask tree ── */
  openPicker(dateStr) {
    this._pickerDate=dateStr;
    this._pickerSearch='';
    this._pickerExpandedRoots=new Set();
    const d=new Date(dateStr+'T12:00:00');
    document.getElementById('mp-picker-date-lbl').textContent=d.toLocaleDateString([],{weekday:'long',month:'long',day:'numeric'});
    document.getElementById('mp-picker-search').value='';
    document.getElementById('mp-picker-bk').classList.add('on');
    this.filterPicker('');
    setTimeout(()=>document.getElementById('mp-picker-search').focus(),80);
  },
  closePicker() {
    document.getElementById('mp-picker-bk').classList.remove('on');
    this._pickerDate=null;
  },

  togglePickerRoot(rootId) {
    if(this._pickerExpandedRoots.has(rootId)) this._pickerExpandedRoots.delete(rootId);
    else this._pickerExpandedRoots.add(rootId);
    this.filterPicker(this._pickerSearch);
  },

  filterPicker(q) {
    this._pickerSearch=(q||'').toLowerCase();
    const el=document.getElementById('mp-picker-list');
    if(!el) return;
    const allTasks=DB.getTasks();
    const rootTasks=allTasks.filter(t=>!t.parentId && t.status!=='completed');
    const prioColor={high:'var(--red)',medium:'var(--accent)',low:'var(--tm)'};
    const sq=this._pickerSearch;

    // Filter: include roots whose title matches OR have matching subtasks
    const rootMatches=(t)=>{
      if(!sq) return true;
      if(t.title.toLowerCase().includes(sq)) return true;
      return allTasks.filter(s=>s.parentId===t.id).some(s=>s.title.toLowerCase().includes(sq));
    };

    const filtered=rootTasks.filter(rootMatches);
    if(!filtered.length){
      el.innerHTML=`<div style="padding:20px;text-align:center;color:var(--tm);font-size:13px">No tasks found</div>`;
      return;
    }

    let html='';
    filtered.forEach(t=>{
      const subs=allTasks.filter(s=>s.parentId===t.id && s.status!=='completed');
      const hasSubs=subs.length>0;
      const isExpanded=this._pickerExpandedRoots.has(t.id)||!!sq;
      const assigned=t.dueDate===this._pickerDate;
      const otherDate=t.dueDate&&t.dueDate!==this._pickerDate?t.dueDate:null;

      html+=`<div class="mp-picker-group">
        <div class="mp-picker-root ${assigned?'assigned':''}" onclick="MP.assignTask('${t.id}')">
          <div class="mp-picker-dot" style="background:${prioColor[t.priority]||'var(--tm)'}"></div>
          <div class="mp-picker-name">${esc(t.title)}</div>
          <div class="mp-picker-meta">${assigned?'✓':otherDate?'📅 '+otherDate:t.level}</div>
          ${hasSubs?`<button class="mp-picker-expand ${isExpanded?'open':''}" onclick="event.stopPropagation();MP.togglePickerRoot('${t.id}')">▶</button>`:''}
        </div>`;

      if(hasSubs && isExpanded){
        const shownSubs = sq ? subs.filter(s=>s.title.toLowerCase().includes(sq)) : subs;
        html+=`<div class="mp-picker-subs">`;
        shownSubs.forEach(s=>{
          const sa=s.dueDate===this._pickerDate;
          const sd=s.dueDate&&s.dueDate!==this._pickerDate?s.dueDate:null;
          html+=`<div class="mp-picker-sub ${sa?'assigned':''}" onclick="MP.assignTask('${s.id}')">
            <div class="mp-picker-dot" style="background:${prioColor[s.priority]||'var(--tm)'}"></div>
            <span style="color:var(--tm);font-size:10px">↳</span>
            <div class="mp-picker-name">${esc(s.title)}</div>
            <div class="mp-picker-meta">${sa?'✓':sd?'📅 '+sd:''}</div>
          </div>`;
        });
        html+=`</div>`;
      }
      html+=`</div>`;
    });
    el.innerHTML=html;
  },

  assignTask(taskId) {
    if(!this._pickerDate) return;
    TM.update(taskId,{dueDate:this._pickerDate});
    toast(`📌 Assigned to ${this._pickerDate}`,'s',2000);
    this.closePicker(); this.render(); refreshAll();
  },
};

// ═══════════════════════════════════════════

// ── Drag Protection: activate draggable only on double-click or long-press ──
// Called from app.js after first render
function initPlannerDragProtection() {
  const container = document.getElementById('d-month-planner');
  if(!container || container._dragProtected) return;
  container._dragProtected = true;

  let _longPressTimer = null;

  container.addEventListener('mousedown', e => {
    const chip = e.target.closest('[data-draggable]');
    if(!chip) return;
    _longPressTimer = setTimeout(() => {
      chip.setAttribute('draggable', 'true');
      chip.classList.add('drag-ready');
    }, 500); // 500ms long-press
  });

  container.addEventListener('mouseup', e => {
    clearTimeout(_longPressTimer);
    const chip = e.target.closest('[data-draggable]');
    if(chip && !chip.dataset.dragging) {
      // Short click — not dragging
      setTimeout(() => {
        chip.removeAttribute('draggable');
        chip.classList.remove('drag-ready');
      }, 100);
    }
  });

  container.addEventListener('dblclick', e => {
    const chip = e.target.closest('[data-draggable]');
    if(!chip) return;
    chip.setAttribute('draggable', 'true');
    chip.classList.add('drag-ready');
    // Auto-remove if drag doesn't start within 2s
    setTimeout(() => { chip.removeAttribute('draggable'); chip.classList.remove('drag-ready'); }, 2000);
  });

  container.addEventListener('dragstart', e => {
    const chip = e.target.closest('[data-draggable]');
    if(chip) chip.dataset.dragging = '1';
  });

  container.addEventListener('dragend', e => {
    const chip = e.target.closest('[data-draggable]');
    if(chip) {
      delete chip.dataset.dragging;
      chip.removeAttribute('draggable');
      chip.classList.remove('drag-ready');
    }
  });
}
