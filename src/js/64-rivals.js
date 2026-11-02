// ===== 他社実績タブ =====
// 元Excel（委託先展開用）の見出し結合・並びをそのまま再現する。データは 97-rivals-data.js の RIVALS（読み取り専用）。
let rivalsRendered = false;
function rivalsCell(tag, text, extra){
  const el = document.createElement(tag);
  el.textContent = text;
  if(extra){ if(extra.rs>1) el.rowSpan = extra.rs; if(extra.cs>1) el.colSpan = extra.cs; }
  return el;
}
function rivalsHead(thead, head){
  head.forEach(cells=>{
    const tr = document.createElement('tr');
    cells.forEach(c=>tr.appendChild(rivalsCell('th', c.t, c)));
    thead.appendChild(tr);
  });
}
function rivalsIsNum(s){ return /^-?[\d.]+(%|日間)?$/.test(s); }
function rivalsBody(tbody, rows, boldFirst){
  const frag = document.createDocumentFragment();
  rows.forEach(r=>{
    const tr = document.createElement('tr');
    if(boldFirst && boldFirst(r)) tr.style.fontWeight = '700';
    r.forEach(v=>{
      const td = rivalsCell('td', v);
      if(rivalsIsNum(v)) td.style.textAlign = 'right';
      tr.appendChild(td);
    });
    frag.appendChild(tr);
  });
  tbody.appendChild(frag);
}
function renderRivals(){
  if(rivalsRendered) return;
  rivalsRendered = true;
  const s = RIVALS.summary, d = RIVALS.detail;
  rivalsHead(document.querySelector('#rivalsSummary thead'), s.head);
  rivalsBody(document.querySelector('#rivalsSummary tbody'), s.rows, r=>r[0]==='マクロ');
  rivalsHead(document.querySelector('#rivalsDetail thead'), d.head);
  rivalsBody(document.querySelector('#rivalsDetail tbody'), d.rows);
  document.querySelectorAll('#rivalsDetail tbody tr').forEach((tr,i)=>{ tr.dataset.i = i; });
  const facilityTh = [...document.querySelectorAll('#rivalsDetail thead tr:first-child th')].find(th=>th.textContent==='施設名');
  if(facilityTh){
    facilityTh.classList.add('rv-sortable');
    facilityTh.dataset.label = '施設名';
    facilityTh.title = 'クリックで並べ替え（昇順→降順→元の順）';
    facilityTh.onclick = ()=>sortRivalsFacility(facilityTh);
  }
  const months = [...new Set(d.rows.map(r=>r[0]))];
  const agents = [...new Set(d.rows.map(r=>r[6]).filter(v=>v && v!=='-'))].sort();
  months.forEach(v=>rvMonth.add(new Option(v,v)));
  agents.forEach(v=>rvAgent.add(new Option(v,v)));
}
function applyRivalsFilter(){
  const m = rvMonth.value, a = rvAgent.value;
  document.querySelectorAll('#rivalsDetail tbody tr').forEach(tr=>{
    const c = tr.children;
    tr.style.display = ((!m || c[0].textContent===m) && (!a || c[6].textContent===a)) ? '' : 'none';
  });
}

// 会場（施設名）で並べ替え。昇順→降順→元の順。同じ施設内は元の順（開始日順）を保つ。
let rivalsSortDir = 0;
function sortRivalsFacility(th){
  rivalsSortDir = (rivalsSortDir + 1) % 3;
  const tbody = document.querySelector('#rivalsDetail tbody');
  const rows = [...tbody.children];
  const col = 7;
  rows.sort((a,b)=>{
    if(rivalsSortDir===0) return a.dataset.i - b.dataset.i;
    const c = a.children[col].textContent.localeCompare(b.children[col].textContent, 'ja');
    return c ? (rivalsSortDir===1 ? c : -c) : a.dataset.i - b.dataset.i;
  });
  const frag = document.createDocumentFragment();
  rows.forEach(r=>frag.appendChild(r));
  tbody.appendChild(frag);
  th.textContent = th.dataset.label + (rivalsSortDir===1 ? ' ▲' : rivalsSortDir===2 ? ' ▼' : '');
}
