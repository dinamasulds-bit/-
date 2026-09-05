// ===== かんたん入力（施設を選んで今日の数字を1画面で） =====
function todayIso(){
  const d = new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function openEasy(presetIdx){
  const rows = [...document.querySelectorAll('#ledger tbody tr')];
  if(!rows.length) return;
  // 初回だけ名前を聞く。2回目以降は端末に記憶されているので何も聞かない
  ensureEditorName();
  // 施設を指定されなかったときは、本日実施中のイベントを自動で選ぶ（選択の手間をなくす）
  if(presetIdx==null){
    const ongoing = rows.findIndex(r=>rowStatus(r.cells)[1]==='ongoing');
    if(ongoing >= 0) presetIdx = ongoing;
  }
  const order = {'実施中':0,'開催前':1,'終了':2,'':3};
  const opts = rows.map((r,i)=>({i, label:`${r.cells[STATUS_COL].textContent||''} ${r.cells[5].textContent}（${r.cells[1].textContent} 項番${r.cells[2].textContent}）`, st:r.cells[STATUS_COL].textContent}))
    .sort((a,b)=>(order[a.st]??9)-(order[b.st]??9));
  ezFacility.innerHTML = opts.map(o=>`<option value="${o.i}">${o.label}</option>`).join('');
  if(presetIdx!=null && rows[presetIdx]) ezFacility.value = String(presetIdx);
  ezDate.value = todayIso();
  onEzFacilityChange();
  ezLockMsg.style.display = isEntryUnlocked() ? 'none' : 'block';
  ezSaveBtn.disabled = !isEntryUnlocked();
  easyModal.style.display = 'flex';
}
function closeEasy(){ easyModal.style.display = 'none'; }
function ezRow(){
  const idx = Number(ezFacility.value);
  return document.querySelectorAll('#ledger tbody tr')[idx];
}
function renderEzFields(){
  const r = ezRow(); if(!r) return;
  const c = r.cells;
  const rowIdx = Number(ezFacility.value);
  const key = String(rowIdx);
  const iso = ezDate.value;
  const vals = (dailyData[key] && dailyData[key][iso]) || {};
  const target = n(c[TARGET_IDX]);
  ezFields.innerHTML = DAY_FIELDS.map(f=>{
    const current = n(c[f.col]);
    let progress;
    if(f.key==='p1' && target>0){
      const rest = target-current;
      progress = `現在 ${current} / 目標 ${target}　${rest>0?'（あと'+rest+'）':'（達成済）'}`;
    }else{
      progress = `現在の累計 ${current}`;
    }
    return `
    <div class="ez-stepper">
      <div>
        <div class="ez-stepper-label">${f.label}</div>
        <div class="sub" style="margin:0;">${progress}</div>
      </div>
      <div class="ez-stepper-controls">
        <button class="sec ez-step-btn" type="button" onclick="ezStep('${f.key}',-1)" ${isEntryUnlocked()?'':'disabled'}>−</button>
        <input type="number" inputmode="numeric" pattern="[0-9]*" min="0" class="ez-input" id="ez-${f.key}" value="${vals[f.key]??''}" ${isEntryUnlocked()?'':'disabled'}>
        <button class="ez-step-btn" type="button" onclick="ezStep('${f.key}',1)" ${isEntryUnlocked()?'':'disabled'}>＋</button>
      </div>
    </div>`;
  }).join('');
  const s = parseJpDate(c[14].textContent);
  const holT = n(c[HOL_IDX]), wkT = n(c[WK_IDX]);
  const d = new Date(iso+'T00:00:00');
  const tgt = isHol(d) ? holT : wkT;
  ezTargetHint.textContent = s ? `この日の目標: ${tgt}件（${isHol(d)?'休日':'平日'}）` : '';
}
function onEzFacilityChange(){ renderEzFields(); }
function onEzDateChange(){ renderEzFields(); }
function ezStep(key, delta){
  const el = document.getElementById('ez-'+key);
  if(!el) return;
  el.value = Math.max(0, (Number(el.value)||0) + delta);
}
function saveEasyInput(){
  if(!isEntryUnlocked() && !ensureEditorName()){ alert('お名前を登録すると保存できます'); return; }
  const rowIdx = Number(ezFacility.value);
  const iso = ezDate.value;
  if(!iso){ alert('日付を選んでください'); return; }
  const key = String(rowIdx);
  dailyData[key] = dailyData[key] || {};
  dailyData[key][iso] = dailyData[key][iso] || {};
  DAY_FIELDS.forEach(f=>{
    const el = document.getElementById('ez-'+f.key);
    const v = el ? el.value : '';
    dailyData[key][iso][f.key] = v===''? undefined : Number(v);
  });
  applyDailyToRow(rowIdx);
  updateAll();
  saveAll();
  const facilityName = ezRow().cells[5].textContent;
  showToast(facilityName+'（'+iso+'）を保存しました', 'ok');
}
