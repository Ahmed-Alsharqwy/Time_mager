// ═══════════════════════════════════════════
// FOCUS MANAGER — Background-safe + Wake Lock
// ═══════════════════════════════════════════
const FM = {
  s: { taskId:null, elapsed:0, running:false, interval:null, estimated:0, _startTs:null },
  _wakeLock: null,

  load() {
    const saved = DB.getFocusState();
    if(!saved) return;
    this.s = {...saved, interval:null};
    if(saved.running && saved._savedAt)
      this.s.elapsed = saved.elapsed + Math.floor((Date.now()-saved._savedAt)/1000);
    if(saved.running && this.s.elapsed>0)
      this.s._startTs = Date.now() - this.s.elapsed*1000;
    this.updTopBar();
    if(this.s.taskId) this._startInterval();
  },

  _save() { DB.saveFocusState({...this.s, interval:null, _savedAt:Date.now()}); },

  startTask(taskId) {
    if(this.s.running && this.s.taskId!==taskId) this.finish(false);
    const t = TM.get(taskId);
    this.s = {taskId, elapsed:0, running:false, interval:null, estimated: t?(t.estimatedTime||0)*60:0, _startTs:null};
    TM.start(taskId);
    this.openOverlay();
  },

  openOverlay() {
    const t = TM.get(this.s.taskId);
    document.getElementById('fo').classList.add('on');
    document.getElementById('fo-task').textContent = t ? t.title : '—';
    this._updTimerDisplay(); this._updButtons();
  },

  closeOverlay() { document.getElementById('fo').classList.remove('on'); },

  startTimer() {
    if(!this.s.taskId) return;
    this.s.running = true;
    this.s._startTs = Date.now() - this.s.elapsed*1000;
    LM.log('focus_start', this.s.taskId);
    this._startInterval(); this._updButtons(); this.updTopBar(); this._save();
    this._acquireWakeLock();
  },

  _startInterval() {
    if(this.s.interval) clearInterval(this.s.interval);
    this.s.interval = setInterval(()=>{
      if(!this.s.running) return;
      this.s.elapsed = this.s._startTs ? Math.floor((Date.now()-this.s._startTs)/1000) : this.s.elapsed+1;
      this._updTimerDisplay(); this.updTopBar();
      if(this.s.elapsed%30===0) this._save();
    }, 1000);
  },

  togglePause() {
    this.s.running = !this.s.running;
    if(this.s.running) {
      this.s._startTs = Date.now() - this.s.elapsed*1000;
      this._startInterval(); toast('▶ Focus resumed',''); this._acquireWakeLock();
    } else {
      clearInterval(this.s.interval); this.s._startTs=null; toast('⏸ Paused',''); this._releaseWakeLock();
    }
    this._updButtons(); this._save();
  },

  finish(log=true) {
    clearInterval(this.s.interval); this._releaseWakeLock();
    if(log && this.s.taskId) {
      const sess={id:uuid(),taskId:this.s.taskId,startTime:Date.now()-this.s.elapsed*1000,endTime:Date.now(),duration:this.s.elapsed};
      const sessions=DB.getSessions(); sessions.push(sess); DB.saveSessions(sessions);
      LM.log('focus_end',this.s.taskId,{duration:this.s.elapsed});
      toast(`🎯 Focus done — ${fmtDur(this.s.elapsed)} logged`,'s');
    }
    this.s={taskId:null,elapsed:0,running:false,interval:null,estimated:0,_startTs:null};
    DB.saveFocusState(null); this.closeOverlay(); this.updTopBar(); renderView(_curView);
  },

  todayFocusTime() {
    return DB.getSessions().filter(s=>isToday(s.startTime)).reduce((s,x)=>s+(x.duration||0),0);
  },

  onVisibilityResume() {
    if(this.s.running && this.s._startTs) {
      this.s.elapsed=Math.floor((Date.now()-this.s._startTs)/1000);
      this._updTimerDisplay(); this.updTopBar();
    }
    this.reacquireWakeLock();
  },

  _updTimerDisplay() {
    const t=fmtTime(this.s.elapsed);
    const el=document.getElementById('fo-timer'); if(el) el.textContent=t;
    const tb=document.getElementById('tb-timer'); if(tb) tb.textContent=t;
    const pb=document.getElementById('fo-pb');
    if(pb&&this.s.estimated>0) pb.style.width=Math.min(100,Math.round(this.s.elapsed/this.s.estimated*100))+'%';
    if(this.s.running&&this.s.taskId){const tk=TM.get(this.s.taskId);document.title=`⏱ ${t} — ${tk?tk.title:'Focus'} | NEXUS`;}
    else document.title='NEXUS — Discipline OS';
  },

  updTopBar() {
    const fb=document.getElementById('tb-focus'),fe=document.getElementById('tb-empty');
    if(!fb||!fe) return;
    if(this.s.taskId){
      fb.style.display='flex'; fe.style.display='none';
      const t=TM.get(this.s.taskId);
      document.getElementById('tb-tname').textContent=t?t.title:'—';
      document.getElementById('tb-timer').textContent=fmtTime(this.s.elapsed);
    } else { fb.style.display='none'; fe.style.display='block'; }
  },

  _updButtons() {
    const st=document.getElementById('fo-start'),ps=document.getElementById('fo-pause');
    if(!st||!ps) return;
    if(this.s.running){st.style.display='none';ps.style.display='';ps.textContent='⏸ PAUSE';}
    else if(this.s.elapsed>0){st.style.display='none';ps.style.display='';ps.textContent='▶ RESUME';}
    else{st.style.display='';ps.style.display='none';}
  },

  async _acquireWakeLock() {
    if(!('wakeLock' in navigator)) return;
    try{this._wakeLock=await navigator.wakeLock.request('screen');this._wakeLock.addEventListener('release',()=>{this._wakeLock=null;});}
    catch(e){console.warn('WakeLock:',e.message);}
  },
  _releaseWakeLock(){if(this._wakeLock){this._wakeLock.release();this._wakeLock=null;}},
  reacquireWakeLock(){if(this.s.running&&!this._wakeLock)this._acquireWakeLock();},
};
