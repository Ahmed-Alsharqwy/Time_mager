// GOAL MANAGER
// ═══════════════════════════════════════════
const GM = {
  create(data) {
    const g = {
      id:uuid(), title:data.title||'Goal', description:data.description||'',
      dueDate:data.dueDate||null, color:data.color||'amber', createdAt:Date.now(),
      specific:data.specific||'', metric:data.metric||'', target:Number(data.target)||0,
      unit:data.unit||'', current:Number(data.current)||0,
      achievable:data.achievable||'', relevant:data.relevant||'',
    };
    const goals = DB.getGoals(); goals.push(g); DB.saveGoals(goals); return g;
  },
  update(id,data) {
    const gs=DB.getGoals(), i=gs.findIndex(g=>g.id===id);
    if(i===-1) return; gs[i]={...gs[i],...data}; DB.saveGoals(gs);
  },
  delete(id) { DB.saveGoals(DB.getGoals().filter(g=>g.id!==id)); },
  smartScore(g) {
    return [
      !!g.title?.trim(),
      !!(g.metric?.trim() && g.target>0),
      !!g.achievable?.trim(),
      !!g.relevant?.trim(),
      !!g.dueDate,
    ].filter(Boolean).length;
  },
  progress(gid) {
    const tasks = DB.getTasks().filter(t=>t.goalId===gid);
    if(!tasks.length) return {total:0, completed:0, pct:0};
    const c = tasks.filter(t=>t.status==='completed').length;
    return {total:tasks.length, completed:c, pct:Math.round(c/tasks.length*100)};
  },
};

// ═══════════════════════════════════════════
// MODAL HELPERS
// ═══════════════════════════════════════════
function showModal(id) { document.getElementById(id).classList.add('on'); }
function closeModal(id) { document.getElementById(id).classList.remove('on'); }

function updateSmartScore() {
  const fields = {
    title: document.getElementById('f-gtitle')?.value?.trim(),
    metric: document.getElementById('f-gmetric')?.value?.trim(),
    target: Number(document.getElementById('f-gtarget')?.value)||0,
    achievable: document.getElementById('f-gachievable')?.value?.trim(),
    relevant: document.getElementById('f-grelevant')?.value?.trim(),
    dueDate: document.getElementById('f-gdue')?.value,
  };
  const score = [
    !!fields.title,
    !!(fields.metric && fields.target>0),
    !!fields.achievable,
    !!fields.relevant,
    !!fields.dueDate,
  ];
  const dots = document.querySelectorAll('#smart-dots .smart-dot');
  dots.forEach((d,i)=>{ d.classList.toggle('on', score[i]); });
  const n = score.filter(Boolean).length;
  const labels=['Not SMART','1/5','2/5 Needs Work','3/5 Partial','4/5 Almost','5/5 Perfect SMART! 🎯'];
  const el = document.getElementById('smart-label');
  if(el) el.textContent = `SMART Score: ${n}/5 — ${labels[n]}`;
}

function openTaskModal(parentId, editId=null, defaultLevel=null) {
  document.getElementById('f-tid').value = editId||'';
  document.getElementById('f-tpid').value = parentId||'';

  // Populate goals
  const gs = document.getElementById('f-tgoal');
  gs.innerHTML = '<option value="">No goal</option>';
  DB.getGoals().forEach(g=>{
    const o=document.createElement('option'); o.value=g.id; o.textContent=g.title; gs.appendChild(o);
  });

  if(editId) {
    const t = TM.get(editId);
    if(t) {
      document.getElementById('m-task-title').textContent = 'Edit Task';
      document.getElementById('f-ttitle').value = t.title;
      document.getElementById('f-tdesc').value = t.description||'';
      document.getElementById('f-tlevel').value = t.level;
      document.getElementById('f-tpri').value = t.priority;
      document.getElementById('f-tdue').value = t.dueDate||'';
      document.getElementById('f-ttime').value = t.dueTime||'';
      document.getElementById('f-test').value = t.estimatedTime||'';
      document.getElementById('f-trec').value = t.recurrence||'none';
      document.getElementById('f-tgoal').value = t.goalId||'';
      // Preserve the original parentId when editing
      document.getElementById('f-tpid').value = t.parentId||'';
    }
  } else {
    document.getElementById('m-task-title').textContent = parentId ? 'Add Subtask' : 'Add Task';
    ['f-ttitle','f-tdesc','f-tdue','f-ttime','f-test'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
    document.getElementById('f-tlevel').value = defaultLevel || 'daily';
    document.getElementById('f-tpri').value = 'medium';
    document.getElementById('f-trec').value = 'none';
    document.getElementById('f-tgoal').value = '';
  }
  document.getElementById('f-twarn').style.display='none';
  document.getElementById('f-est-suggest').style.display='none';
  showModal('m-task');
  setTimeout(()=>document.getElementById('f-ttitle').focus(), 120);
}

function onEstChange(val) {
  const v = parseInt(val)||0;
  const warn = document.getElementById('f-twarn');
  const sug = document.getElementById('f-est-suggest');
  if(v>60) {
    warn.style.display='block';
    warn.innerHTML = `<div class="fwarn">⚠️ Over 60 min — consider splitting into smaller subtasks for better focus.</div>`;
  } else warn.style.display='none';

  // Auto-suggest based on task name
  const name = (document.getElementById('f-ttitle')?.value||'').toLowerCase();
  let suggest = '';
  if(name.includes('read')||name.includes('study')) suggest='Reading/Study tasks usually take 30–60 min.';
  else if(name.includes('code')||name.includes('implement')) suggest='Coding tasks: 45–90 min recommended.';
  else if(name.includes('meeting')||name.includes('call')) suggest='Meetings: 30–60 min typical.';
  else if(name.includes('review')||name.includes('check')) suggest='Reviews: 15–30 min typical.';

  if(suggest && !v) {
    sug.style.display='block';
    sug.innerHTML=`<div class="fhint" style="margin-top:3px">💡 ${suggest}</div>`;
  } else sug.style.display='none';
}

function openGoalModal(editId=null) {
  document.getElementById('f-gid').value = editId||'';
  if(editId) {
    const g = DB.getGoals().find(g=>g.id===editId);
    if(g) {
      document.getElementById('m-goal-title').textContent='Edit SMART Goal';
      document.getElementById('f-gtitle').value=g.title;
      document.getElementById('f-gdesc').value=g.description||'';
      document.getElementById('f-gdue').value=g.dueDate||'';
      document.getElementById('f-gcolor').value=g.color||'amber';
      document.getElementById('f-gspecific').value=g.specific||'';
      document.getElementById('f-gmetric').value=g.metric||'';
      document.getElementById('f-gtarget').value=g.target||'';
      document.getElementById('f-gunit').value=g.unit||'';
      document.getElementById('f-gcurrent').value=g.current||'';
      document.getElementById('f-gachievable').value=g.achievable||'';
      document.getElementById('f-grelevant').value=g.relevant||'';
    }
  } else {
    document.getElementById('m-goal-title').textContent='Add SMART Goal';
    ['f-gtitle','f-gdesc','f-gdue','f-gspecific','f-gmetric','f-gtarget','f-gunit','f-gcurrent','f-gachievable','f-grelevant'].forEach(id=>{
      const el=document.getElementById(id); if(el) el.value='';
    });
    document.getElementById('f-gcolor').value='amber';
  }
  updateSmartScore();
  showModal('m-goal');
  setTimeout(()=>document.getElementById('f-gtitle').focus(),120);
}

function saveTask() {
  const title = document.getElementById('f-ttitle').value.trim();
  if(!title) { toast('Please enter a task title','e'); return; }
  const id = document.getElementById('f-tid').value;
  const data = {
    title,
    description: document.getElementById('f-tdesc').value.trim(),
    level:        document.getElementById('f-tlevel').value,
    priority:     document.getElementById('f-tpri').value,
    dueDate:      document.getElementById('f-tdue').value||null,
    dueTime:      document.getElementById('f-ttime').value||null,
    estimatedTime:document.getElementById('f-test').value||0,
    recurrence:   document.getElementById('f-trec').value,
    goalId:       document.getElementById('f-tgoal').value||null,
    parentId:     document.getElementById('f-tpid').value||null,
  };
  if(id) { TM.update(id, data); toast('Task updated','s'); }
  else   { TM.create(data); toast('Task created','s'); }
  closeModal('m-task');
  refreshAll();
}

function saveGoal() {
  const title = document.getElementById('f-gtitle').value.trim();
  if(!title) { toast('Goal title required','e'); return; }
  const id = document.getElementById('f-gid').value;
  const data = {
    title,
    description: document.getElementById('f-gdesc').value.trim(),
    dueDate:     document.getElementById('f-gdue').value||null,
    color:       document.getElementById('f-gcolor').value,
    specific:    document.getElementById('f-gspecific').value.trim(),
    metric:      document.getElementById('f-gmetric').value.trim(),
    target:      Number(document.getElementById('f-gtarget').value)||0,
    unit:        document.getElementById('f-gunit').value.trim(),
    current:     Number(document.getElementById('f-gcurrent').value)||0,
    achievable:  document.getElementById('f-gachievable').value.trim(),
    relevant:    document.getElementById('f-grelevant').value.trim(),
  };
  if(id) { GM.update(id,data); toast('Goal updated','s'); }
  else   { GM.create(data); toast('Goal created','s'); }
  closeModal('m-goal');
  renderGoals();
}

function quickAdd() {
  const title = document.getElementById('qa-input').value.trim();
  if(!title) return;
  const t = TM.create({
    title,
    priority: document.getElementById('qa-pri').value,
    level:    document.getElementById('qa-level').value,
    dueTime:  document.getElementById('qa-time').value||null,
    dueDate:  todayStr(),
  });
  document.getElementById('qa-input').value='';
  document.getElementById('qa-time').value='';
  toast('Task added','s');
  refreshAll();
}

// ═══════════════════════════════════════════
