// ===== 日別入力 =====
let currentDayRow = null;

function openDaily(rowIdx){
  const rows = document.querySelectorAll('#ledger tbody tr');
  const r = rows[rowIdx];
  if(!r) return;
  const c = r.cells;
  const s = parseJpDate(c[14].textContent), e = parseJpDate(c[15].textContent);
  if(!s || !e || s > e){ alert('開始日・終了日を「7月17日」形式で入力してから開いてください'); return; }
  currentDayRow = rowIdx;
  const key = String(rowIdx);
  dailyData[key] = dailyData[key] || {};
  const holT = n(c[HOL_IDX]), wkT = n(c[WK_IDX]);

  dmTitle.textContent = c[5].textContent+'（'+c[14].textContent+'〜'+c[15].textContent+'）日別実績';
  let html = '<table><thead><tr><th>日付</th><th>曜日</th><th>日次目標</th>';
  DAY_FIELDS.forEach(f=>html+='<th>'+f.label+'</th>');
  html += '<th>日次達成(即日)</th></tr></thead><tbody>';
  const wdays = ['日','月','火','水','木','金','土'];
  for(let d = new Date(s); d <= e; d.setDate(d.getDate()+1)){
    const iso = isoOf(d), hol = isHol(d);
    const tgt = hol ? holT : wkT;
    const vals = dailyData[key][iso] || {};
    html += `<tr${hol?' class="hol"':''}><td${hol?' class="hol"':''}>${d.getMonth()+1}/${d.getDate()}</td><td${hol?' class="hol"':''}>${wdays[d.getDay()]}</td><td class="num${hol?' hol':''}">${tgt}</td>`;
    DAY_FIELDS.forEach(f=>{
      html += `<td${hol?' class="hol"':''}><input type="number" min="0" value="${vals[f.key]??''}" oninput="dayInput('${iso}','${f.key}',this.value)"${isEditUnlocked()?'':' disabled'}></td>`;
    });
    html += `<td class="num${hol?' hol':''}" id="dayAch-${iso}"></td></tr>`;
  }
  html += '</tbody><tfoot><tr><td colspan="3">合計</td>';
  DAY_FIELDS.forEach(f=>html+=`<td class="sum" id="daySum-${f.key}"></td>`);
  html += '<td></td></tr></tfoot></table>';
  dmBody.innerHTML = html;
  refreshDayView();
  dayModal.style.display = 'flex';
}

function dayInput(iso, field, value){
  const key = String(currentDayRow);
  dailyData[key][iso] = dailyData[key][iso] || {};
  dailyData[key][iso][field] = value===''? undefined : Number(value);
  applyDailyToRow(currentDayRow);
  refreshDayView();
  updateAll(); saveAll();
}

function applyDailyToRow(rowIdx){
  const r = document.querySelectorAll('#ledger tbody tr')[rowIdx];
  if(!r) return;
  const key = String(rowIdx);
  const days = dailyData[key] || {};
  DAY_FIELDS.forEach(f=>{
    let sum = 0, any = false;
    Object.values(days).forEach(v=>{ if(v[f.key]!==undefined && v[f.key]!==null && v[f.key]!==''){ sum+=Number(v[f.key])||0; any=true; } });
    if(any) r.cells[f.col].textContent = String(sum);
  });
}

function refreshDayView(){
  const rows = document.querySelectorAll('#ledger tbody tr');
  const r = rows[currentDayRow]; if(!r) return;
  const c = r.cells;
  const key = String(currentDayRow);
  const days = dailyData[key] || {};
  const holT = n(c[HOL_IDX]), wkT = n(c[WK_IDX]);
  // 日次達成
  const s = parseJpDate(c[14].textContent), e = parseJpDate(c[15].textContent);
  for(let d = new Date(s); d <= e; d.setDate(d.getDate()+1)){
    const iso = isoOf(d);
    const el = document.getElementById('dayAch-'+iso);
    if(!el) continue;
    const tgt = isHol(d) ? holT : wkT;
    const got = Number((days[iso]||{}).p1)||0;
    if(tgt>0 && (days[iso]||{}).p1!==undefined){
      const rr = got/tgt*100;
      el.innerHTML = `<span class="${rr>=100?'day-ok':'day-ng'}">${rr.toFixed(0)}%</span>`;
    }else el.textContent = '';
  }
  // 合計
  DAY_FIELDS.forEach(f=>{
    let sum = 0;
    Object.values(days).forEach(v=>{ sum += Number(v[f.key])||0; });
    const el = document.getElementById('daySum-'+f.key);
    if(el) el.textContent = sum.toLocaleString();
  });
}

function closeDaily(){
  dayModal.style.display = 'none';
  currentDayRow = null;
}

// ===== 目標値まとめ入力 =====
function openTargetBulk(){
  document.getElementById('targetModal').style.display = 'flex';
  renderTargetBulk();
}
function closeTargetBulk(){
  document.getElementById('targetModal').style.display = 'none';
}
function renderTargetBulk(){
  const missingOnly = document.getElementById('tbMissingOnly').checked;
  const tbody = document.querySelector('#targetBulkTable tbody');
  tbody.innerHTML = '';
  const rows = [...document.querySelectorAll('#ledger tbody tr')];
  rows.forEach((r, idx)=>{
    const facility = cellText(r.cells[5]).trim();
    const start = cellText(r.cells[14]).trim();
    const end = cellText(r.cells[15]).trim();
    const target = cellText(r.cells[TARGET_IDX]).trim();
    const hol = cellText(r.cells[HOL_IDX]).trim();
    const wk = cellText(r.cells[WK_IDX]).trim();
    if(missingOnly && target!=='' ) return;
    const tr = document.createElement('tr');
    tr.dataset.rowIdx = idx;
    tr.innerHTML = `<td>${facility||'(未入力)'}</td><td>${start}〜${end}</td>
      <td><input type="number" class="tb-target" value="${target}" style="width:80px;"></td>
      <td><input type="number" class="tb-hol" value="${hol}" style="width:80px;"></td>
      <td><input type="number" class="tb-wk" value="${wk}" style="width:80px;"></td>`;
    tbody.appendChild(tr);
  });
  if(!tbody.children.length){
    tbody.innerHTML = '<tr><td colspan="5" class="sub" style="text-align:center;padding:20px;">対象の行はありません（未入力の行だけ表示中）</td></tr>';
  }
}
function saveTargetBulk(){
  if(!isEditUnlocked()){ alert('編集ロック中です。「編集する」で解除してください。'); return; }
  const rows = [...document.querySelectorAll('#ledger tbody tr')];
  document.querySelectorAll('#targetBulkTable tbody tr[data-row-idx]').forEach(tr=>{
    const r = rows[Number(tr.dataset.rowIdx)];
    if(!r) return;
    const target = tr.querySelector('.tb-target').value.trim();
    const hol = tr.querySelector('.tb-hol').value.trim();
    const wk = tr.querySelector('.tb-wk').value.trim();
    r.cells[TARGET_IDX].textContent = target;
    r.cells[HOL_IDX].textContent = hol;
    r.cells[WK_IDX].textContent = wk;
  });
  updateAll(); saveAll();
  closeTargetBulk();
  showToast('目標値を保存しました', 'ok');
}
