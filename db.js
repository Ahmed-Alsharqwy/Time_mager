// DATABASE / FIREBASE SYNC
// ═══════════════════════════════════════════



const DB = {
  _state: {
    nx2_tasks: [],
    nx2_goals: [],
    nx2_logs: [],
    nx2_sessions: [],
    nx2_streak: {count:0,lastDate:null},
    nx2_meta: {lastPlanning:null,notifSeen:[]},
    nx2_focus: null
  },
  _saveTimer: null,
  
  _load(k,d) { return this._state[k] != null ? this._state[k] : d; },
  _save(k,v) { 
    this._state[k] = v;
    if (currentUserId) {
      try{ localStorage.setItem(`${currentUserId}_${k}`,JSON.stringify(v)); }catch(e){}
    }
    
    if (!docRef) return;
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => {
      docRef.set(this._state).catch(e => console.error("Firebase sync error", e));
    }, 1500);
  },
  
  getTasks()     { return this._load('nx2_tasks',[]); },
  saveTasks(v)   { this._save('nx2_tasks',v); },
  getGoals()     { return this._load('nx2_goals',[]); },
  saveGoals(v)   { this._save('nx2_goals',v); },
  getLogs()      { return this._load('nx2_logs',[]); },
  saveLogs(v)    { this._save('nx2_logs',v); },
  getSessions()  { return this._load('nx2_sessions',[]); },
  saveSessions(v){ this._save('nx2_sessions',v); },
  getStreak()    { return this._load('nx2_streak',{count:0,lastDate:null}); },
  saveStreak(v)  { this._save('nx2_streak',v); },
  getMeta()      { return this._load('nx2_meta',{lastPlanning:null,notifSeen:[]}); },
  saveMeta(v)    { this._save('nx2_meta',v); },
  getFocusState(){ return this._load('nx2_focus',null); },
  saveFocusState(v){ this._save('nx2_focus',v); },
  
  initLocal() {
    if (!currentUserId) return;
    ['nx2_tasks','nx2_goals','nx2_logs','nx2_sessions','nx2_streak','nx2_meta','nx2_focus'].forEach(k => {
      try{ 
        const v = localStorage.getItem(`${currentUserId}_${k}`);
        let old_v = null;
        if (v == null) {
          old_v = localStorage.getItem(k);
          if (old_v != null) localStorage.removeItem(k);
        }
        const valToParse = v != null ? v : old_v;
        if (valToParse != null) this._state[k] = JSON.parse(valToParse);
      } catch(e){}
    });
  },

  clearState() {
     this._state = {
       nx2_tasks: [], nx2_goals: [], nx2_logs: [], nx2_sessions: [],
       nx2_streak: {count:0,lastDate:null}, nx2_meta: {lastPlanning:null,notifSeen:[]}, nx2_focus: null
     };
  }
};

