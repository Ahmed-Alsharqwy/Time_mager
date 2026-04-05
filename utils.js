// UTILS
// ═══════════════════════════════════════════
const uuid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,9);
const todayStr = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const daysAgoStr = n => { const d=new Date(); d.setDate(d.getDate()-n); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const isToday = ts => { const d=new Date(ts); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` === todayStr(); };
const isThisWeek = ts => (Date.now()-ts) < 7*864e5;
const isOverdue = (due) => due && due < todayStr();
const fmtTime = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
const fmtDur = s => {
  if(!s||s<1) return '0s';
  if(s<60) return s+'s';
  const m=Math.floor(s/60);
  if(m<60) return m+'m';
  return Math.floor(m/60)+'h '+(m%60?m%60+'m':'');
};
const fmtStamp = ts => new Date(ts).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
const esc = t => { const d=document.createElement('div'); d.textContent=String(t||''); return d.innerHTML; };

function toast(msg, type='', dur=2800) {
  const el=document.createElement('div');
  el.className='toast '+(type||'');
  el.textContent=msg;
  document.getElementById('toasts').appendChild(el);
  setTimeout(()=>{ el.style.opacity='0'; el.style.transition='opacity .3s'; setTimeout(()=>el.remove(),310); }, dur);
}

// ═══════════════════════════════════════════
