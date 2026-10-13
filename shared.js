
const NS = "nw.v2";
const Keys = {today:`${NS}.today`,week:`${NS}.week`,month:`${NS}.month`,year:`${NS}.year`,savings:`${NS}.savings`};

function dateKey(d=new Date()){return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join("-")}
function dotDate(d=new Date()){return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`}
function monthKey(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`}
function yearKey(){return String(new Date().getFullYear())}
function mondayOfWeek(d=new Date()){const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());const day=x.getDay();const diff=day===0?-6:1-day;x.setDate(x.getDate()+diff);return x}
function sundayOfWeek(d=new Date()){const m=mondayOfWeek(d);const s=new Date(m);s.setDate(m.getDate()+6);return s}
function weekKey(){return dateKey(mondayOfWeek())}
function weekRangeText(){return `${dotDate(mondayOfWeek())}~${dotDate(sundayOfWeek())}`}
function uid(){return `${Date.now().toString(36)}${Math.random().toString(36).slice(2,8)}`}
function load(key,fallback){try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback}catch(e){return fallback}}
function save(key,value){localStorage.setItem(key,JSON.stringify(value))}
function ensurePeriod(key,period){let data=load(key,null);if(!data||data.period!==period||!Array.isArray(data.items)){data={period,items:[]};save(key,data)}return data}
function ensureSavings(){let data=load(Keys.savings,null);if(!data||typeof data.current!=="number"||typeof data.goal!=="number"){data={current:0,goal:10000000,history:[]};save(Keys.savings,data)}if(!Array.isArray(data.history))data.history=[];return data}
function getState(type){if(type==="today")return ensurePeriod(Keys.today,dateKey());if(type==="week")return ensurePeriod(Keys.week,weekKey());if(type==="month")return ensurePeriod(Keys.month,monthKey());if(type==="year")return ensurePeriod(Keys.year,yearKey())}
function setState(type,data){save(Keys[type],data)}
function normalizedStatus(item){if(item.done)return "done";return item.status==="inprogress"?"inprogress":"todo"}
function completion(type){
  const data=getState(type); const total=data.items.length;
  const done=data.items.filter(x=>normalizedStatus(x)==="done").length;
  const inprogress=data.items.filter(x=>normalizedStatus(x)==="inprogress").length;
  return {done,inprogress,total,percent:total?Math.round(done/total*100):0}
}
function sortedItems(items){const rank={todo:0,inprogress:1,done:2};return [...items].sort((a,b)=>{const ra=rank[normalizedStatus(a)],rb=rank[normalizedStatus(b)];if(ra!==rb)return ra-rb;return (a.createdAt||0)-(b.createdAt||0)})}
function fmtKRW(n){return new Intl.NumberFormat("ko-KR",{style:"currency",currency:"KRW",maximumFractionDigits:0}).format(Math.max(0,Math.round(n||0)))}
function notifyResize(){try{parent.postMessage({type:"notion-widget-resize",height:document.documentElement.scrollHeight},"*")}catch(e){}}
function onSharedChange(fn){window.addEventListener("storage",e=>{if(e.key&&e.key.startsWith(NS))fn(e)})}
