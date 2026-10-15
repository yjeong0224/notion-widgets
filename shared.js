
const W = (() => {
  const pad = n => String(n).padStart(2,'0');
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const cloneDate = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());

  function mondayOf(d){
    d = cloneDate(d);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1-day;
    d.setDate(d.getDate()+diff);
    return d;
  }
  function addDays(d,n){ const x=cloneDate(d); x.setDate(x.getDate()+n); return x; }
  function addMonths(d,n){ const x=new Date(d.getFullYear(), d.getMonth()+n, 1); return x; }
  function addYears(d,n){ return new Date(d.getFullYear()+n, d.getMonth(), 1); }

  function fmtDate(d){ return `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일`; }
  function fmtMonth(d){ return `${d.getFullYear()}년 ${d.getMonth()+1}월`; }
  function fmtYear(d){ return `${d.getFullYear()}년`; }
  function fmtWeek(d){
    const s=mondayOf(d), e=addDays(s,6);
    if(s.getFullYear()===e.getFullYear() && s.getMonth()===e.getMonth())
      return `${s.getFullYear()}년 ${s.getMonth()+1}월 ${s.getDate()}일 – ${e.getDate()}일`;
    return `${s.getFullYear()}.${s.getMonth()+1}.${s.getDate()} – ${e.getFullYear()}.${e.getMonth()+1}.${e.getDate()}`;
  }
  function weekKey(d){ return ymd(mondayOf(d)); }

  function readJSON(k){
    try { const v=localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch(e){ return null; }
  }
  function writeJSON(k,v){ localStorage.setItem(k,JSON.stringify(v)); }

  function normalizeItems(v){
    if(!Array.isArray(v)) return [];
    return v.map((it,i)=>{
      if(typeof it==="string") return {id:Date.now()+i,text:it,done:false};
      if(!it || typeof it!=="object") return null;
      return {
        id: it.id ?? `${Date.now()}-${i}`,
        text: String(it.text ?? it.title ?? it.name ?? it.content ?? "").trim(),
        done: Boolean(it.done ?? it.completed ?? it.checked ?? false),
        inprogress: Boolean(it.inprogress ?? false)
      };
    }).filter(x=>x && x.text);
  }

  // Periods are isolated. Never infer a new period's items from another key.
  function initializePeriod(targetKey){
    if(localStorage.getItem(targetKey)===null) writeJSON(targetKey,[]);
  }

  function watchPeriod({getDate,setDate,getKind,onChange}){
    let previous=new Date();
    const token=(d,kind)=> kind==='today'?ymd(d):kind==='week'?weekKey(d):
      kind==='month'?`${d.getFullYear()}-${d.getMonth()}`:String(d.getFullYear());
    function check(){
      const now=new Date(), kind=getKind();
      if(token(previous,kind)!==token(now,kind)){
        if(token(getDate(),kind)===token(previous,kind)) setDate(now);
        onChange();
      }
      previous=now;
    }
    setInterval(check,1000);
    window.addEventListener('focus',check);
    window.addEventListener('pageshow',check);
    document.addEventListener('visibilitychange',check);
  }

  function listController({listEl,inputEl,addEl,keyFn,kindFn,onChange}){
    let currentKey = keyFn();
    function key(){ return keyFn(); }
    function load(){
      currentKey = key();
      initializePeriod(currentKey);
      return normalizeItems(readJSON(currentKey));
    }
    function save(items){ writeJSON(currentKey,items); if(onChange) onChange(items); }
    function render(){
      const items=load();
      listEl.innerHTML="";
      if(!items.length){
        const e=document.createElement("div"); e.className="empty"; e.textContent="아직 등록된 항목이 없어요.";
        listEl.appendChild(e);
      } else {
        items.forEach((it,idx)=>{
          const row=document.createElement("div"); row.className="item"+(it.done?" done":"");
          const threeState=kindFn()!=='today';
          const cb=document.createElement(threeState?'button':'input');
          if(threeState){
            cb.type='button';
            cb.className='state-box'+(it.done?' complete':it.inprogress?' active':'');
            cb.textContent=it.done?'✓':'';
            cb.setAttribute('role','checkbox');
            cb.setAttribute('aria-checked',it.done?'true':it.inprogress?'mixed':'false');
            const status=it.done?'완료':it.inprogress?'진행중':'미시작';
            cb.setAttribute('aria-label',`${it.text}: ${status}`);
            cb.title=status+' — 클릭하여 상태 변경';
            cb.onclick=()=>{
              if(it.done){it.done=false;it.inprogress=false;}
              else if(it.inprogress){it.done=true;it.inprogress=false;}
              else{it.inprogress=true;}
              save(items);render();
            };
          }else{
            cb.type='checkbox';cb.checked=it.done;
            cb.setAttribute('aria-label',it.text);
            cb.onchange=()=>{items[idx].done=cb.checked;items[idx].inprogress=false;save(items);render();};
          }
          const txt=document.createElement("div"); txt.className="txt"; txt.textContent=it.text;
          const del=document.createElement("button"); del.className="del"; del.textContent="×";
          del.title="삭제"; del.onclick=()=>{ items.splice(idx,1); save(items); render(); };
          row.append(cb,txt,del); listEl.appendChild(row);
        });
      }
      if(onChange) onChange(items);
    }
    function add(){
      const t=inputEl.value.trim(); if(!t) return;
      const items=load(); items.push({id:`${Date.now()}-${Math.random().toString(16).slice(2)}`,text:t,done:false});
      save(items); inputEl.value=""; render();
    }
    addEl.onclick=add;
    inputEl.addEventListener("keydown",e=>{ if(e.key==="Enter") add(); });
    return {render};
  }

  function showPicker(input, date){
    input.value=ymd(date);
    if(input.showPicker) input.showPicker(); else input.click();
  }

  return {ymd,mondayOf,addDays,addMonths,addYears,fmtDate,fmtMonth,fmtYear,fmtWeek,weekKey,
          listController,showPicker,watchPeriod};
})();


/* ===== v11 compatibility: progress + savings ===== */
const Keys = {
  savings: "nw:savings"
};

function save(key, value){
  localStorage.setItem(key, JSON.stringify(value));
  try{
    window.dispatchEvent(new StorageEvent("storage", {key, newValue: JSON.stringify(value)}));
  }catch(e){}
}

function fmtKRW(n){
  n = Number(n) || 0;
  return "₩" + Math.round(n).toLocaleString("ko-KR");
}

function ensureSavings(){
  let s = null;
  try{ s = JSON.parse(localStorage.getItem(Keys.savings) || "null"); }catch(e){}
  if(!s || typeof s !== "object"){
    s = {goal:1000000, current:0, history:[]};
    save(Keys.savings, s);
  }
  if(!Array.isArray(s.history)) s.history = [];
  if(!Number.isFinite(Number(s.goal)) || Number(s.goal) <= 0) s.goal = 1000000;
  if(!Number.isFinite(Number(s.current)) || Number(s.current) < 0) s.current = 0;
  s.goal = Number(s.goal);
  s.current = Number(s.current);
  return s;
}

function _readItems(key){
  try{
    const v = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(v) ? v : [];
  }catch(e){ return []; }
}

function _currentKeysFor(type){
  const now = new Date();
  const pad = n => String(n).padStart(2,"0");
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

  function mondayOf(d){
    d = new Date(d.getFullYear(),d.getMonth(),d.getDate());
    const day=d.getDay();
    d.setDate(d.getDate()+(day===0?-6:1-day));
    return d;
  }

  if(type==="today") return [`nw:v8:today:${ymd(now)}`];
  if(type==="week") return [`nw:v8:week:${ymd(mondayOf(now))}`];
  if(type==="month") return [`nw:v8:longterm:month:${now.getFullYear()}-${pad(now.getMonth()+1)}`];
  if(type==="year") return [`nw:v8:longterm:year:${now.getFullYear()}`];
  return [];
}

function completion(type){
  const keys = _currentKeysFor(type);
  let items = [];
  for(const k of keys){
    const got = _readItems(k);
    if(got.length){ items = got; break; }
  }
  const total = items.length;
  const done = items.filter(x => !!x.done).length;
  const inprogress = items.filter(x => !x.done && x.inprogress).length;
  const percent = total ? Math.round(done/total*100) : 0;
  return {total, done, inprogress, percent};
}

function onSharedChange(fn){
  window.addEventListener("storage", fn);
  window.addEventListener("nw-shared-change", fn);
}

function notifyResize(){
  try{
    const h = Math.ceil(document.documentElement.scrollHeight);
    if(window.parent && window.parent !== window){
      window.parent.postMessage({type:"resize", height:h}, "*");
    }
  }catch(e){}
}

window.addEventListener("load", notifyResize);
window.addEventListener("resize", notifyResize);
