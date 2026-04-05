// DAILY HABITS ENGINE
// ═══════════════════════════════════════════
const HABITS = {
  PRAYERS: [
    {id:'fajr',   name:'الفجر',   icon:'🌙'},
    {id:'dhuhr',  name:'الظهر',   icon:'☀️'},
    {id:'asr',    name:'العصر',   icon:'🌤'},
    {id:'maghrib',name:'المغرب',  icon:'🌅'},
    {id:'isha',   name:'العشاء',  icon:'🌙'},
  ],
  PRAYER_COLS: [
    {id:'masjid', label:'في المسجد', color:'var(--green)'},
    {id:'jamaa',  label:'جماعة',     color:'var(--blue)'},
    {id:'waqt',   label:'على وقتها', color:'var(--accent)'},
    {id:'qadaa',  label:'قضاء',      color:'var(--red)'},
  ],
  DHIKR: [
    {id:'sub',  text:'سبحان الله',    target:33},
    {id:'hamd', text:'الحمد لله',     target:33},
    {id:'akbar',text:'الله أكبر',     target:33},
  ],
  WATER_TARGET: 8,

  _defaultPrayers() {
    const p = {};
    this.PRAYERS.forEach(pr => {
      p[pr.id] = {masjid:false, jamaa:false, waqt:false, qadaa:false};
    });
    return p;
  },

  _getState() {
    const meta = DB.getMeta();
    const today = todayStr();
    if(!meta.habits || meta.habits.date !== today) {
      meta.habits = {
        date: today,
        prayers: this._defaultPrayers(),
        water: 0,
        dhikr: {sub:0, hamd:0, akbar:0},
      };
      DB.saveMeta(meta);
    }
    // Migrate old boolean format → new object format
    const prayers = meta.habits.prayers;
    this.PRAYERS.forEach(pr => {
      if(typeof prayers[pr.id] === 'boolean') {
        prayers[pr.id] = {masjid:false, jamaa:false, waqt:prayers[pr.id], qadaa:false};
      }
    });
    return meta.habits;
  },

  _save(state) {
    const meta = DB.getMeta();
    meta.habits = state;
    // Save prayer state to history for statistics
    if(!meta.prayerHistory) meta.prayerHistory = {};
    meta.prayerHistory[state.date] = state.prayers;
    // Keep only last 90 days
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate()-90);
    const cutStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth()+1).padStart(2,'0')}-${String(cutoff.getDate()).padStart(2,'0')}`;
    Object.keys(meta.prayerHistory).forEach(d=>{ if(d<cutStr) delete meta.prayerHistory[d]; });
    DB.saveMeta(meta);
  },

  togglePrayerCol(prayerId, colId) {
    const s = this._getState();
    const pr = s.prayers[prayerId];
    // Qadaa is mutually exclusive with the other 3; others can stack
    if(colId === 'qadaa') {
      pr.qadaa = !pr.qadaa;
      if(pr.qadaa) { pr.masjid=false; pr.jamaa=false; pr.waqt=false; }
    } else {
      pr[colId] = !pr[colId];
      if(pr[colId]) pr.qadaa = false;
    }
    this._save(s);
    renderHabits();
    // Check all prayed
    const allDone = this.PRAYERS.every(p=>{
      const x = s.prayers[p.id];
      return x.waqt||x.jamaa||x.masjid||x.qadaa;
    });
    if(allDone) toast('🤲 ما شاء الله! أتممت الصلوات الخمس 🌙','s',4000);
  },

  tapDhikr(id) {
    const s = this._getState();
    const t = this.DHIKR.find(d=>d.id===id);
    if(!t) return;
    if(s.dhikr[id] >= t.target) { s.dhikr[id]=0; }
    else { s.dhikr[id]++; }
    this._save(s);
    renderHabits();
    const allDone = this.DHIKR.every(d=>s.dhikr[d.id]>=d.target);
    if(allDone) toast('📿 ما شاء الله! أتممت الأذكار ✨','s',4000);
  },

  setWater(n) {
    const s = this._getState();
    s.water = Math.max(0, Math.min(this.WATER_TARGET, n));
    this._save(s);
    renderHabits();
    if(s.water===this.WATER_TARGET) toast('💧 ما شاء الله! شربت كمية الماء اليومية 🎉','s',4000);
  },
};

function renderHabits() {
  const el = document.getElementById('d-habits');
  if(!el) return;
  const s = HABITS._getState();

  // Count prayed (any column checked = prayed)
  const prayersDone = HABITS.PRAYERS.filter(p=>{
    const x = s.prayers[p.id]||{};
    return x.waqt||x.jamaa||x.masjid||x.qadaa;
  }).length;
  const prayerPct = Math.round((prayersDone/5)*100);

  // Prayer table rows
  const rowsHTML = HABITS.PRAYERS.map(p=>{
    const pr = s.prayers[p.id]||{};
    const anyDone = pr.waqt||pr.jamaa||pr.masjid||pr.qadaa;
    return `<tr class="prayer-tr ${anyDone?'pr-done':''}">
      <td class="pr-name-cell">
        <span class="pr-icon">${p.icon}</span>
        <span class="pr-name-txt">${p.name}</span>
      </td>
      ${HABITS.PRAYER_COLS.map(col=>`
        <td class="pr-col-cell">
          <button class="pr-cb ${pr[col.id]?'checked':''} pr-${col.id}"
            onclick="HABITS.togglePrayerCol('${p.id}','${col.id}')"
            title="${col.label}">
            ${pr[col.id]?'✓':''}
          </button>
        </td>`).join('')}
    </tr>`;
  }).join('');

  // Water
  const waterHTML = Array.from({length:HABITS.WATER_TARGET},(_,i)=>`
    <div class="water-glass ${i<s.water?'filled':''}"
      onclick="HABITS.setWater(${i<s.water?i:i+1})" title="${i+1} glasses">💧</div>`).join('');

  // Dhikr
  const dhikrHTML = HABITS.DHIKR.map(d=>{
    const count = s.dhikr[d.id]||0;
    const done = count>=d.target;
    return `<div class="dhikr-row">
      <div class="dhikr-tap ${done?'done':''}" onclick="HABITS.tapDhikr('${d.id}')">
        <span class="dhikr-text">${d.text}</span>
        <span class="dhikr-num">${count}<span style="font-size:9px;color:var(--tm);font-weight:400">/${d.target}</span></span>
      </div>
    </div>`;
  }).join('');

  el.innerHTML = `<div class="habits-card">

    <!-- PRAYER TABLE -->
    <div>
      <div class="hab-section-lbl" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span>🕌 الصلوات</span>
        <span style="font-size:11px;font-family:var(--mono);font-weight:700;color:${prayersDone===5?'var(--green)':'var(--accent)'};">${prayersDone}/5 ✓</span>
      </div>
      <div class="prayer-table-wrap">
        <table class="prayer-table">
          <thead>
            <tr>
              <th class="pr-th-name">الصلاة</th>
              ${HABITS.PRAYER_COLS.map(c=>`<th class="pr-th-col pr-th-${c.id}">${c.label}</th>`).join('')}
            </tr>
          </thead>
          <tbody>${rowsHTML}</tbody>
        </table>
      </div>
      <div class="pb" style="margin-top:8px;height:4px"><div class="pbf g" style="width:${prayerPct}%"></div></div>
    </div>

    <!-- WATER -->
    <div>
      <div class="hab-section-lbl" style="display:flex;justify-content:space-between;align-items:center">
        <span>💧 الماء</span>
        <span style="font-size:10px;font-family:var(--mono);color:var(--blue);">${s.water}/${HABITS.WATER_TARGET} أكواب</span>
      </div>
      <div class="water-glasses">${waterHTML}</div>
    </div>

    <!-- DHIKR -->
    <div>
      <div class="hab-section-lbl" style="display:flex;justify-content:space-between;align-items:center">
        <span>📿 الأذكار</span>
        <button class="dhikr-reset-all" onclick="event.stopPropagation();const s=HABITS._getState();s.dhikr={sub:0,hamd:0,akbar:0};HABITS._save(s);renderHabits();">إعادة</button>
      </div>
      ${dhikrHTML}
    </div>
  </div>`;
}

// ═══════════════════════════════════════════
