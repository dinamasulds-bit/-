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
  [...new Set(d.rows.map(r=>r[7]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ja')).forEach(v=>rvFacility.add(new Option(v,v)));
}
function applyRivalsFilter(){
  const m = rvMonth.value, a = rvAgent.value, f = rvFacility.value;
  document.querySelectorAll('#rivalsDetail tbody tr').forEach(tr=>{
    const c = tr.children;
    tr.style.display = ((!m || c[0].textContent===m) && (!a || c[6].textContent===a) && (!f || c[7].textContent===f)) ? '' : 'none';
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
// ===== 他社 月別平均（ルーデンス比較）=====
// RIVALS.detail の行から集計（列: 0=実施月 6=委託先 10=HS新規実績 19=イエナカ率 21=目標 24=dカード率）。
function rivalsNum(s){ const v = parseFloat(String(s).replace('%','')); return isNaN(v) ? null : v; }
function rivalsGroup(name){
  if(!name || name==='-') return null;
  return name.startsWith('ルーデンス') ? 'ours' : 'other';
}
function rivalsMonthStats(rows, month, g){
  const rs = rows.filter(r => r[0]===month && rivalsGroup(r[6])===g);
  const tg = rs.filter(r => (rivalsNum(r[21])||0) > 0);
  const T = tg.reduce((a,r)=>a+rivalsNum(r[21]), 0);
  const A = tg.reduce((a,r)=>a+(rivalsNum(r[10])||0), 0);
  const avg = k => { const v = rs.map(r=>rivalsNum(r[k])).filter(x=>x!==null && x>0); return v.length ? v.reduce((a,b)=>a+b,0)/v.length : null; };
  return { events: rs.length, withTarget: tg.length, T, A,
           rate: T ? A/T*100 : null, ienaka: avg(19), dcard: avg(24) };
}
function fmtPct(v){ return v===null ? '-' : v.toFixed(1)+'%'; }
function fmtDiff(a,b){ return (a===null||b===null) ? '-' : ((a-b)>=0?'+':'') + (a-b).toFixed(1) + 'pt'; }
function renderRivalsMonthly(){
  const rows = RIVALS.detail.rows;
  const months = [...new Set(rows.map(r=>r[0]))];
  const thead = document.querySelector('#rivalsMonthlyTable thead');
  const tbody = document.querySelector('#rivalsMonthlyTable tbody');
  thead.innerHTML = ''; tbody.innerHTML = '';
  const heads = ['実施月','他社 件数','他社 目標入力','他社 実績','他社 達成率','他社 イエナカ','他社 dカード','ルーデンス 達成率','ルーデンス イエナカ','差 達成率','差 イエナカ'];
  const tr = document.createElement('tr');
  heads.forEach(h=>{ const th = document.createElement('th'); th.textContent = h; tr.appendChild(th); });
  thead.appendChild(tr);
  const notes = [];
  months.forEach(m=>{
    const o = rivalsMonthStats(rows, m, 'other');
    const u = rivalsMonthStats(rows, m, 'ours');
    const cells = [m, o.events, o.withTarget+'/'+o.events, o.A, fmtPct(o.rate), fmtPct(o.ienaka), fmtPct(o.dcard),
                   fmtPct(u.rate), fmtPct(u.ienaka), fmtDiff(u.rate, o.rate), fmtDiff(u.ienaka, o.ienaka)];
    const tr = document.createElement('tr');
    cells.forEach((v,i)=>{
      const td = document.createElement('td');
      td.textContent = v;
      if(i>0) td.style.textAlign = 'right';
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
    if(o.withTarget < o.events || u.withTarget < u.events){
      notes.push(m+': 目標未入力 他社'+(o.events-o.withTarget)+'件 / ルーデンス'+(u.events-u.withTarget)+'件');
    }
  });
  document.getElementById('rivalsMonthlyNote').textContent =
    (notes.length ? '※ '+notes.join(' ／ ')+'（達成率は目標入力分のみ）' : '') ;
}
