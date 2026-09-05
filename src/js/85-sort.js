// ===== 実績テーブル 並び替え =====
// dailyDataは行位置キーのため、並び替え時は各行のdailyDataも新位置へ移す
let sortState = {col:null, dir:1};
const SORT_TYPE = {1:'week',2:'num',4:'text',5:'text',14:'date',20:'num',23:'num',29:'pct'};
const SORT_HEADERS = [
  {col:1,match:'実施週'},{col:2,match:'項番'},{col:4,match:'支店'},{col:5,match:'施設名'},
  {col:14,match:'開始日'},{col:20,match:'目標値'},{col:23,match:'HS(即日)'},{col:29,match:'達成率'}
];
function sortVal(cell, type){
  const t = cellText(cell).trim();
  if(type==='num')  return Number(t.replace(/[^0-9.-]/g,''))||0;
  if(type==='pct')  return t===''? -1 : (Number(t.replace('%',''))||0);
  if(type==='week'){ const m=t.match(/\d+/); return m?Number(m[0]):999; }
  if(type==='date'){ const d=parseJpDate(t); return d?d.getTime():Infinity; }
  return t;
}
function sortLedger(col){
  if(!isEditUnlocked()){ alert('編集ロック中は並び替えできません。「編集する」で解除してください。'); return; }
  const type = SORT_TYPE[col];
  sortState = {col, dir:(sortState.col===col && sortState.dir===1) ? -1 : 1};
  const tbody = document.querySelector('#ledger tbody');
  const items = [...tbody.rows].map((tr,i)=>({tr, daily:dailyData[i], v:sortVal(tr.cells[col], type)}));
  items.sort((a,b)=>{
    const r = (typeof a.v==='string') ? a.v.localeCompare(b.v,'ja') : (a.v-b.v);
    return r*sortState.dir;
  });
  const nd = {};
  items.forEach((it,j)=>{ tbody.appendChild(it.tr); if(it.daily!==undefined) nd[j]=it.daily; });
  Object.keys(dailyData).forEach(k=>{ if(Number.isNaN(Number(k))) nd[k]=dailyData[k]; });
  dailyData = nd;
  updateSortIndicators();
  updateAll(); applyFilter(); saveAll();
  showToast('並び替えました', 'ok');
}
function updateSortIndicators(){
  document.querySelectorAll('#ledger th.sortable .sort-ind').forEach(s=>s.textContent='');
  if(sortState.col!=null){
    const th = document.querySelector('#ledger th.sortable[data-col="'+sortState.col+'"]');
    const s = th && th.querySelector('.sort-ind');
    if(s) s.textContent = sortState.dir===1 ? '▲' : '▼';
  }
}
function initSortHeaders(){
  const ths = [...document.querySelectorAll('#ledger thead th')];
  SORT_HEADERS.forEach(h=>{
    const key = h.match.replace(/\s/g,'');
    const th = ths.find(t=>{ const x=t.textContent.replace(/\s/g,''); return !t.dataset.sortWired && (x===key || x.startsWith(key)); });
    if(!th) return;
    th.classList.add('sortable');
    th.dataset.col = h.col;
    th.dataset.sortWired = '1';
    th.title = 'クリックで並び替え';
    const ind = document.createElement('span'); ind.className='sort-ind'; th.appendChild(ind);
    th.addEventListener('click', ()=>sortLedger(h.col));
  });
}
