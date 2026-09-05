// ===== クレーム蓄積シート =====
// 列: 0発生日,1施設名,2支店,3委託先,4クレーム内容,5対応状況,6対応内容,7担当者
const CLAIM_COLS = 8;
const CLAIM_FIELD_LABELS = ['発生日','施設名','支店','委託先','クレーム内容','対応状況','対応内容','担当者'];
const CLAIM_STATUS_OPTS = ['未対応','対応中','対応済'];
const CLAIM_STATUS_CLASS = {'未対応':'st-pending','対応中':'st-inprogress','対応済':'st-done'};
const CLAIM_CALC_COL = 1; // 経過日数（計算専用、DOM上のみ・データ配列には含まない）
const CLAIM_DOM_FOR_DATA = [0,2,3,4,5,6,7,8]; // データ配列index → DOM cellIndex
function addClaimRow(data){
  const tbody = document.querySelector('#claimsTable tbody');
  const tr = document.createElement('tr');
  let dataIdx = 0;
  for(let domIdx=0; domIdx<CLAIM_COLS+1; domIdx++){
    const td = document.createElement('td');
    if(domIdx===CLAIM_CALC_COL){
      td.className = 'calc';
    }else{
      const i = dataIdx++;
      // クレームは現場の誰でも記録できるよう、編集ロックの対象外（常に入力可）
      if(i===5){
        const sel = document.createElement('select');
        sel.className = 'claim-status';
        CLAIM_STATUS_OPTS.forEach(o=>sel.add(new Option(o,o)));
        sel.value = (data && data[5]) || '未対応';
        sel.classList.add(CLAIM_STATUS_CLASS[sel.value]||'st-pending');
        sel.onchange = ()=>{
          Object.values(CLAIM_STATUS_CLASS).forEach(c=>sel.classList.remove(c));
          sel.classList.add(CLAIM_STATUS_CLASS[sel.value]||'st-pending');
          updateClaimsSummary(); saveAll();
        };
        td.appendChild(sel);
      }else{
        td.contentEditable = true;
        td.oninput = ()=>{ updateClaimsSummary(); saveAll(); };
        if(data && data[i] !== undefined) td.textContent = data[i];
      }
    }
    tr.appendChild(td);
  }
  tbody.appendChild(tr);
  updateClaimsSummary();
}
function collectClaimsState(){
  return [...document.querySelectorAll('#claimsTable tbody tr')].map(r=>
    CLAIM_DOM_FOR_DATA.map(domIdx=>{
      const cell = r.cells[domIdx];
      const sel = cell.querySelector('select');
      return sel ? sel.value : cell.textContent;
    })
  );
}
function applyClaims(list){
  document.querySelector('#claimsTable tbody').innerHTML = '';
  (list||[]).forEach(d=>addClaimRow(d));
  updateClaimsSummary();
}
// 発生日からの経過日数（未対応/対応中のみ表示、対応済は空欄）
function daysSince(dateStr){
  const m = String(dateStr||'').match(/(\d{4})-(\d{1,2})-(\d{1,2})/) || String(dateStr||'').match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if(!m) return null;
  const d = new Date(Number(m[1]), Number(m[2])-1, Number(m[3]));
  if(isNaN(d)) return null;
  const today = new Date(); today.setHours(0,0,0,0); d.setHours(0,0,0,0);
  return Math.round((today-d)/86400000);
}
function updateClaimsSummary(){
  const rows = [...document.querySelectorAll('#claimsTable tbody tr')];
  const counts = {'未対応':0,'対応中':0,'対応済':0};
  rows.forEach(r=>{
    const sel = r.cells[CLAIM_DOM_FOR_DATA[5]].querySelector('select');
    const v = sel ? sel.value : '未対応';
    if(counts[v]!==undefined) counts[v]++;
    r.classList.toggle('claim-pending', v==='未対応');
    const calcTd = r.cells[CLAIM_CALC_COL];
    const days = daysSince(r.cells[CLAIM_DOM_FOR_DATA[0]].textContent);
    if(v==='対応済' || days===null){ calcTd.textContent=''; calcTd.classList.remove('ng'); }
    else{
      calcTd.textContent = days+'日';
      calcTd.classList.toggle('ng', days>=3);
    }
  });
  const el = document.getElementById('claimsSummary');
  if(el) el.textContent = `合計 ${rows.length}件　未対応 ${counts['未対応']}件 / 対応中 ${counts['対応中']}件 / 対応済 ${counts['対応済']}件`;
  const ov = document.getElementById('ovClaimsPending');
  if(ov){
    ov.textContent = counts['未対応']+'件';
    ov.className = 'kpi-value '+(counts['未対応']>0?'ng':'ok');
  }
  applyClaimFilter();
}
function applyClaimFilter(){
  const sEl = document.getElementById('clStatusFilter'), qEl = document.getElementById('clFacilitySearch');
  const st = sEl ? sEl.value : '';
  const q = qEl ? qEl.value.trim() : '';
  document.querySelectorAll('#claimsTable tbody tr').forEach(r=>{
    const sel = r.cells[CLAIM_DOM_FOR_DATA[5]].querySelector('select');
    const v = sel ? sel.value : '未対応';
    const okSt = !st || v===st;
    const okQ = !q || r.cells[CLAIM_DOM_FOR_DATA[1]].textContent.includes(q);
    r.style.display = (okSt && okQ) ? '' : 'none';
  });
}
