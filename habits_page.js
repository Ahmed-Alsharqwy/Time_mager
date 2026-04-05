// HABITS MANAGER
// ═══════════════════════════════════════════
const HM = {
  COLORS: {
    green:  { bg:'rgba(52,211,153,.12)',  fill:'var(--green)',   border:'rgba(52,211,153,.4)' },
    blue:   { bg:'rgba(96,165,250,.12)',  fill:'var(--blue)',    border:'rgba(96,165,250,.4)' },
    amber:  { bg:'rgba(245,158,11,.12)',  fill:'var(--accent)',  border:'rgba(245,158,11,.4)' },
    purple: { bg:'rgba(167,139,250,.12)', fill:'var(--purple)',  border:'rgba(167,139,250,.4)' },
    red:    { bg:'rgba(248,113,113,.12)', fill:'var(--red)',     border:'rgba(248,113,113,.4)' },
  },

  /* ── Storage ── */
  _getHabits() {
    const meta = DB.getMeta();
    if(!meta.habitList) { meta.habitList = []; DB.saveMeta(meta); }
    return meta.habitList;
  },
  _saveHabits(list) {
    const meta = DB.getMeta();
    meta.habitList = list;
    DB.saveMeta(meta);
  },
  _getLogs() {
    const meta = DB.getMeta();
    if(!meta.habitLogs) { meta.habitLogs = {}; DB.saveMeta(meta); }
    return meta.habitLogs;
  },
  _saveLogs(logs) {
    const meta = DB.getMeta();
    meta.habitLogs = logs;
    DB.saveMeta(meta);
  },

  /* ── Check / Uncheck ── */
  toggle(hid) {
    const today = todayStr();
    const logs = this._getLogs();
    if(!logs[hid]) logs[hid] = {};
    logs[hid][today] = !logs[hid][today];
    this._saveLogs(logs);
    renderHabitsView();
  },

  isCheckedToday(hid) {
    const logs = this._getLogs();
    return !!(logs[hid] && logs[hid][todayStr()]);
  },

  /* ── Streak calculation ── */
  getStreak(hid) {
    const logs = this._getLogs()[hid] || {};
    let streak = 0, d = new Date();
    // Don't penalize for not checking today yet
    if(!logs[todayStr()]) d.setDate(d.getDate()-1);
    while(true) {
      const s = d.toISOString().split('T')[0];
      if(!logs[s]) break;
      streak++;
      d.setDate(d.getDate()-1);
    }
    return streak;
  },

  /* ── Last 7 days ── */
  getLast7(hid) {
    const logs = this._getLogs()[hid] || {};
    return Array.from({length:7},(_,i)=>{
      const d = new Date(); d.setDate(d.getDate()-(6-i));
      const s = d.toISOString().split('T')[0];
      return { date:s, done: !!logs[s], isToday: s===todayStr(),
        label: d.toLocaleDateString([],{weekday:'short'}).slice(0,1) };
    });
  },

  /* ── Modal ── */
  openModal(hid) {
    const del = document.getElementById('f-hdelete');
    if(hid) {
      const h = this._getHabits().find(x=>x.id===hid);
      if(!h) return;
      document.getElementById('m-habit-title').textContent = 'Edit Habit';
      document.getElementById('f-hid').value = hid;
      document.getElementById('f-hname').value = h.name;
      document.getElementById('f-hdesc').value = h.desc||'';
      document.getElementById('f-htype').value = h.type;
      document.getElementById('f-hfreq').value = h.freq||'daily';
      document.getElementById('f-hicon').value = h.icon||'';
      document.getElementById('f-hcolor').value = h.color||'green';
      document.getElementById('f-htarget').value = h.target||21;
      if(del) del.style.display='inline-flex';
    } else {
      document.getElementById('m-habit-title').textContent = 'Add Habit';
      document.getElementById('f-hid').value = '';
      document.getElementById('f-hname').value = '';
      document.getElementById('f-hdesc').value = '';
      document.getElementById('f-htype').value = 'good';
      document.getElementById('f-hfreq').value = 'daily';
      document.getElementById('f-hicon').value = '';
      document.getElementById('f-hcolor').value = 'green';
      document.getElementById('f-htarget').value = 21;
      if(del) del.style.display='none';
    }
    showModal('m-habit');
    setTimeout(()=>document.getElementById('f-hname').focus(),120);
  },

  saveHabit() {
    const name = document.getElementById('f-hname').value.trim();
    if(!name) { toast('Please enter a habit name','e'); return; }
    const hid = document.getElementById('f-hid').value;
    const data = {
      name,
      desc:   document.getElementById('f-hdesc').value.trim(),
      type:   document.getElementById('f-htype').value,
      freq:   document.getElementById('f-hfreq').value,
      icon:   document.getElementById('f-hicon').value.trim() || (document.getElementById('f-htype').value==='bad'?'🚫':'✅'),
      color:  document.getElementById('f-hcolor').value,
      target: parseInt(document.getElementById('f-htarget').value)||21,
      createdAt: Date.now(),
    };
    const list = this._getHabits();
    if(hid) {
      const i = list.findIndex(h=>h.id===hid);
      if(i!==-1) list[i] = {...list[i], ...data};
    } else {
      list.push({id: uuid(), ...data});
    }
    this._saveHabits(list);
    closeModal('m-habit');
    toast(hid ? 'Habit updated ✓' : 'Habit added! 🎯', 's');
    renderHabitsView();
  },

  deleteHabit() {
    const hid = document.getElementById('f-hid').value;
    if(!hid || !confirm('Delete this habit and all its history?')) return;
    const list = this._getHabits().filter(h=>h.id!==hid);
    this._saveHabits(list);
    const logs = this._getLogs(); delete logs[hid]; this._saveLogs(logs);
    closeModal('m-habit');
    toast('Habit deleted','');
    renderHabitsView();
  },
};

/* ── Daily quotes ── */
const HB_QUOTES = [
  { text: "We are what we repeatedly do. Excellence, then, is not an act but a habit.", author: "Aristotle" },
  { text: "Motivation gets you started. Habit keeps you going.", author: "Jim Ryun" },
  { text: "Your net worth to the world is usually determined by what remains after your bad habits are subtracted from your good ones.", author: "Benjamin Franklin" },
  { text: "First forget inspiration. Habit is more dependable. Habit will sustain you whether you're inspired or not.", author: "Octavia Butler" },
  { text: "Small daily improvements are the key to staggering long-term results.", author: "Robin Sharma" },
  { text: "You do not rise to the level of your goals. You fall to the level of your systems.", author: "James Clear" },
  { text: "The secret of your future is hidden in your daily routine.", author: "Mike Murdock" },
  { text: "Chains of habit are too light to be felt until they are too heavy to be broken.", author: "Warren Buffett" },
  { text: "A habit cannot be tossed out the window; it must be coaxed down the stairs one step at a time.", author: "Mark Twain" },
  { text: "Watch your thoughts, they become your words; watch your words, they become your actions.", author: "Lao Tzu" },
  { text: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
  { text: "Discipline is choosing between what you want now and what you want most.", author: "Augusta F. Kantra" },
  { text: "The groundwork for all happiness is good health and self-discipline.", author: "Bertrand Russell" },
  { text: "An ounce of performance is worth pounds of promises.", author: "Mae West" },
  { text: "Consistency is the hallmark of the unimaginative.", author: "Oscar Wilde" },
  { text: "Nothing is stronger than habit.", author: "Ovid" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "It's not about perfect. It's about effort.", author: "Jillian Michaels" },
  { text: "Take care of your body. It's the only place you have to live.", author: "Jim Rohn" },
  { text: "The difference between who you are and who you want to be is what you do.", author: "Unknown" },
  { text: "Every action you take is a vote for the type of person you wish to become.", author: "James Clear" },
  { text: "Fall in love with the process and the results will come.", author: "Eric Thomas" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "A year from now you may wish you had started today.", author: "Karen Lamb" },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
  { text: "Progress, not perfection.", author: "Unknown" },
  { text: "Push yourself, because no one else is going to do it for you.", author: "Unknown" },
  { text: "Dream it. Believe it. Build it.", author: "Unknown" },
];

const HB_GOOD_TIPS = [
  { num:'01', text:'Start tiny — habits under 2 minutes are almost impossible to resist. Build the anchor first.' },
  { num:'02', text:'Stack habits: "After I [CURRENT HABIT], I will [NEW HABIT]." Attach new to existing routines.' },
  { num:'03', text:'Make it obvious — put visual cues where you\'ll see them. Out of sight = out of mind.' },
  { num:'04', text:'Track streaks. Missing once is an accident. Missing twice is the start of a new habit.' },
  { num:'05', text:'Reduce friction. Prepare the night before. The easier it is to start, the more likely you will.' },
  { num:'06', text:'Reward yourself immediately after. The brain needs a dopamine hit to encode the loop.' },
  { num:'07', text:'Never break the chain. A perfect record beats perfect performance every time.' },
  { num:'08', text:'Design your environment. Willpower is finite. Your environment will outlast your motivation.' },
];

const HB_BAD_TIPS = [
  { num:'01', text:'Make it invisible — remove the trigger. You can\'t crave what you can\'t see.' },
  { num:'02', text:'Add friction. Put 20 seconds of effort between you and the bad habit. That\'s enough.' },
  { num:'03', text:'Replace, don\'t just remove. Bad habits fill a need. Find a healthier way to meet it.' },
  { num:'04', text:'Identify the cue-routine-reward loop. Break the chain at the cue, not the action.' },
  { num:'05', text:'Reframe your identity: "I don\'t do X" is stronger than "I can\'t do X." Own it.' },
  { num:'06', text:'Use implementation intentions: "If I feel the urge for X, I will do Y instead."' },
  { num:'07', text:'Announce your commitment publicly. Social accountability triples success rates.' },
  { num:'08', text:'Forgive yourself for slips. Self-criticism kills recovery. Self-compassion enables it.' },
];

function renderHabitsView() {
  // Quote (changes by day-of-year)
  const doy = Math.floor((Date.now() - new Date(new Date().getFullYear(),0,0)) / 864e5);
  const q = HB_QUOTES[doy % HB_QUOTES.length];
  const qt = document.getElementById('hb-quote-text');
  const qa = document.getElementById('hb-quote-author');
  if(qt) qt.textContent = `"${q.text}"`;
  if(qa) qa.textContent = `— ${q.author}`;

  const habits = HM._getHabits();
  const today = todayStr();

  // Stats
  const totalHabits = habits.length;
  const doneToday = habits.filter(h=>HM.isCheckedToday(h.id)).length;
  const bestStreak = habits.reduce((max,h)=>Math.max(max,HM.getStreak(h.id)),0);
  const statsEl = document.getElementById('hb-stats-row');
  if(statsEl) statsEl.innerHTML = `
    <div class="hb-stat" style="border-color:rgba(52,211,153,.3)">
      <div class="hb-stat-icon">✅</div>
      <div><div class="hb-stat-val" style="color:var(--green)">${doneToday}/${totalHabits}</div><div class="hb-stat-lbl">Done Today</div></div>
    </div>
    <div class="hb-stat" style="border-color:rgba(245,158,11,.3)">
      <div class="hb-stat-icon">🔥</div>
      <div><div class="hb-stat-val" style="color:var(--accent)">${bestStreak}</div><div class="hb-stat-lbl">Best Streak</div></div>
    </div>
    <div class="hb-stat" style="border-color:rgba(96,165,250,.3)">
      <div class="hb-stat-icon">📊</div>
      <div><div class="hb-stat-val" style="color:var(--blue)">${totalHabits}</div><div class="hb-stat-lbl">Habits</div></div>
    </div>`;

  // Habit list
  const listEl = document.getElementById('hb-list');
  if(listEl) {
    if(!habits.length) {
      listEl.innerHTML = `<div class="card" style="text-align:center;padding:32px;border-style:dashed">
        <div style="font-size:32px;margin-bottom:8px">🔄</div>
        <div style="font-size:14px;font-weight:700;margin-bottom:6px">No habits yet</div>
        <div style="font-size:12px;color:var(--tm);margin-bottom:14px">Start building your daily rituals</div>
        <button class="btn btn-p" onclick="HM.openModal(null)">+ Add Your First Habit</button>
      </div>`;
    } else {
      const clrMap = HM.COLORS;
      listEl.innerHTML = habits.map(h => {
        const clr = clrMap[h.color] || clrMap.green;
        const streak = HM.getStreak(h.id);
        const done = HM.isCheckedToday(h.id);
        const target = h.target || 21;
        const pct = Math.min(100, Math.round((streak/target)*100));
        const last7 = HM.getLast7(h.id);
        const isBad = h.type === 'bad';

        const dotsHTML = last7.map(d=>`
          <div class="hb-dot ${d.done?'done':''}${d.done&&isBad?' bad':''} ${d.isToday?'today':''}" title="${d.date}">
            ${d.done ? (isBad?'✗':'✓') : d.label}
          </div>`).join('');

        return `<div class="hb-card ${h.type}">
          <div class="hb-card-hd">
            <div class="hb-icon" style="background:${clr.bg};border:1px solid ${clr.border}">${h.icon||'🔄'}</div>
            <div class="hb-card-info">
              <div class="hb-card-name">${esc(h.name)}</div>
              ${h.desc?`<div class="hb-card-desc">${esc(h.desc)}</div>`:''}
              <div class="hb-card-meta">
                <span class="hb-badge ${h.type}">${isBad?'🚫 Break':'✅ Build'}</span>
                <span class="hb-badge freq">${h.freq==='weekly'?'3x/week':'Daily'}</span>
                <span class="hb-streak">🔥 ${streak} day${streak!==1?'s':''}</span>
              </div>
            </div>
            <div class="hb-card-actions">
              <button class="btn btn-g btn-xs" onclick="HM.openModal('${h.id}')" title="Edit">✎</button>
              <button class="hb-check-btn ${done?(isBad?'bad-done':'done'):''}" onclick="HM.toggle('${h.id}')" title="${done?'Undo':'Mark done'}">
                ${done?(isBad?'✗':'✓'):'○'}
              </button>
            </div>
          </div>

          <div class="hb-dots">${dotsHTML}</div>

          <div class="hb-prog-row">
            <div class="hb-prog-bar">
              <div class="hb-prog-fill" style="width:${pct}%;background:${clr.fill}"></div>
            </div>
            <div class="hb-prog-pct">${pct}%</div>
          </div>
          <div class="hb-streak-target" style="font-size:10px;color:var(--tm);margin-top:4px">
            ${streak}/${target} days — ${target-streak>0?`${target-streak} more to reach goal`:'🏆 Goal reached!'}
          </div>
        </div>`;
      }).join('');
    }
  }


  // Prayer Statistics (last 7 days)
  const prayerLogs = DB.getMeta().habitLogs || {};
  function getPrayerStat(pid) {
    // Count days in last 7 where any prayer column was checked
    let done7=0, masjid7=0;
    for(let i=6;i>=0;i--){
      const d=new Date(); d.setDate(d.getDate()-i);
      const ds=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const dayMeta=DB.getMeta();
      // We track per-day in habitLogs differently for prayers — check history from meta
    }
    return {done7, masjid7};
  }
  // Prayer stats from HABITS logs (stored in meta.habitHistory)
  const meta2 = DB.getMeta();
  const prayerHistory = meta2.prayerHistory || {};
  const today2 = todayStr();
  // Count last 30 days of prayer data
  let totalPrayersPossible=0, totalPrayersDone=0, totalMasjid=0, totalJamaa=0;
  for(let i=29;i>=0;i--){
    const d=new Date(); d.setDate(d.getDate()-i);
    const ds=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const dayData=prayerHistory[ds];
    if(dayData){
      ['fajr','dhuhr','asr','maghrib','isha'].forEach(pid=>{
        totalPrayersPossible++;
        const pr=dayData[pid]||{};
        if(pr.waqt||pr.jamaa||pr.masjid||pr.qadaa) totalPrayersDone++;
        if(pr.masjid) totalMasjid++;
        if(pr.jamaa) totalJamaa++;
      });
    }
  }
  // Also include today's current state
  const todayPrayers = (DB.getMeta().habits||{}).prayers || {};
  let todayDone=0;
  ['fajr','dhuhr','asr','maghrib','isha'].forEach(pid=>{
    const pr=todayPrayers[pid]||{};
    if(pr.waqt||pr.jamaa||pr.masjid||pr.qadaa) todayDone++;
  });
  const overallRate = totalPrayersPossible>0 ? Math.round((totalPrayersDone/totalPrayersPossible)*100) : 0;

  const prayerStatsEl = document.getElementById('hb-prayer-stats');
  if(prayerStatsEl) prayerStatsEl.innerHTML = `
    <div class="sh" style="margin-top:4px"><div class="st">🕌 <em>Prayer</em> Statistics</div></div>
    <div class="prayer-stats-grid">
      <div class="hb-stat" style="border-color:rgba(52,211,153,.3)">
        <div class="hb-stat-icon">🕌</div>
        <div><div class="hb-stat-val" style="color:var(--green)">${todayDone}/5</div><div class="hb-stat-lbl">Today</div></div>
      </div>
      <div class="hb-stat" style="border-color:rgba(96,165,250,.3)">
        <div class="hb-stat-icon">🏛️</div>
        <div><div class="hb-stat-val" style="color:var(--blue)">${totalMasjid}</div><div class="hb-stat-lbl">Masjid (30d)</div></div>
      </div>
      <div class="hb-stat" style="border-color:rgba(167,139,250,.3)">
        <div class="hb-stat-icon">👥</div>
        <div><div class="hb-stat-val" style="color:var(--purple)">${totalJamaa}</div><div class="hb-stat-lbl">Jamaa (30d)</div></div>
      </div>
      <div class="hb-stat" style="border-color:rgba(245,158,11,.3)">
        <div class="hb-stat-icon">📊</div>
        <div><div class="hb-stat-val" style="color:var(--accent)">${overallRate}%</div><div class="hb-stat-lbl">Rate (30d)</div></div>
      </div>
    </div>`;

  // Tips
  const tipsEl = document.getElementById('hb-tips');
  if(tipsEl) {
    tipsEl.innerHTML = `
      <div class="sh" style="margin-top:8px"><div class="st">💡 <em>Habit</em> Tips</div></div>
      <div class="hb-tips-wrap">
        <div class="hb-tip-col good">
          <div class="hb-tip-title" style="color:var(--green)">✅ Building Good Habits</div>
          ${HB_GOOD_TIPS.map(t=>`<div class="hb-tip-item"><span class="hb-tip-num">${t.num}</span><span>${t.text}</span></div>`).join('')}
        </div>
        <div class="hb-tip-col bad">
          <div class="hb-tip-title" style="color:var(--red)">🚫 Breaking Bad Habits</div>
          ${HB_BAD_TIPS.map(t=>`<div class="hb-tip-item"><span class="hb-tip-num">${t.num}</span><span>${t.text}</span></div>`).join('')}
        </div>
      </div>`;
  }
}

// ═══════════════════════════════════════════
