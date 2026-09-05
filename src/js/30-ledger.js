const MOBILE_VIEW_KEY = 'event-ledger-mobile-view';
const DETAIL_COLS = [2,3,6,7,8,9,10,11,12,13,16,17,21,22,25,26,27,28,30,31,32];
const EDITOR_NAME_KEY = 'event-ledger-editor-name';
const ROW_FIELD_LABELS = ['実施週','項番','枠','支店','施設名','フロア(main)','スペース名(main)','フロア(sub)','スペース名(sub)','備考','実施規模','①サイズ','②サイズ','開始日','終了日','実施日数','コンテンツ','委託先','ディレクター','目標値','休日/日','平日/日','HS即日','HS予約','PI世帯数','dカード','光','home5G'];
function getEditorName(){
  let name = null;
  try{ name = localStorage.getItem(EDITOR_NAME_KEY); }catch(e){}
  return name || '不明';
}
function promptEditorName(){
  const cur = getEditorName();
  const name = prompt('お名前を入力してください（変更履歴に記録されます）', cur==='不明'?'':cur);
  if(name){ try{ localStorage.setItem(EDITOR_NAME_KEY, name); }catch(e){} }
  updateEditorNameLabel();
}
function updateEditorNameLabel(){
  const el = document.getElementById('editorNameLabel');
  if(!el) return;
  el.textContent = editUnlocked ? ('編集者: '+getEditorName()) : '';
}
function diffStates(oldSt, newSt){
  const changes = [];
  if(!oldSt) return changes;
  const oldRows = oldSt.rows||[], newRows = newSt.rows||[];
  const maxLen = Math.max(oldRows.length, newRows.length);
  for(let r=0;r<maxLen;r++){
    const a = oldRows[r], b = newRows[r];
    if(!a && b){ changes.push(`[行追加] ${b[4]||'(無題)'}`); continue; }
    if(a && !b){ changes.push(`[行削除] ${a[4]||'(無題)'}`); continue; }
    if(!a || !b) continue;
    const fieldChanges = [];
    for(let c=0;c<ROW_FIELD_LABELS.length;c++){
      const av = a[c]??'', bv = b[c]??'';
      if(av !== bv) fieldChanges.push(`${ROW_FIELD_LABELS[c]}:${av||'(空)'}→${bv||'(空)'}`);
    }
    if(fieldChanges.length) changes.push(`${b[4]||a[4]||'(無題)'} — ${fieldChanges.join(', ')}`);
  }
  if(JSON.stringify(oldSt.daily||{})!==JSON.stringify(newSt.daily||{})) changes.push('[日別実績を編集]');
  if(String(oldSt.minus)!==String(newSt.minus)) changes.push(`減点:${oldSt.minus}→${newSt.minus}`);
  if(!!oldSt.aladinC!==!!newSt.aladinC) changes.push(`ALADIN乖離(dカード):${!!oldSt.aladinC}→${!!newSt.aladinC}`);
  if(!!oldSt.aladinH!==!!newSt.aladinH) changes.push(`ALADIN乖離(光):${!!oldSt.aladinH}→${!!newSt.aladinH}`);
  if(String(oldSt.billing||'')!==String(newSt.billing||'')) changes.push(`請求額:${oldSt.billing}→${newSt.billing}`);
  const oldClaims = oldSt.claims||[], newClaims = newSt.claims||[];
  const maxClaims = Math.max(oldClaims.length, newClaims.length);
  for(let r=0;r<maxClaims;r++){
    const a = oldClaims[r], b = newClaims[r];
    if(!a && b){ changes.push(`[クレーム追加] ${b[1]||'(施設未記入)'}`); continue; }
    if(a && !b){ changes.push(`[クレーム削除] ${a[1]||'(施設未記入)'}`); continue; }
    if(!a || !b) continue;
    const fc = [];
    for(let c=0;c<CLAIM_FIELD_LABELS.length;c++){
      const av = a[c]??'', bv = b[c]??'';
      if(av !== bv) fc.push(`${CLAIM_FIELD_LABELS[c]}:${av||'(空)'}→${bv||'(空)'}`);
    }
    if(fc.length) changes.push(`クレーム(${b[1]||a[1]||'(無題)'}) — ${fc.join(', ')}`);
  }
  const oldContacts = oldSt.contacts||[], newContacts = newSt.contacts||[];
  const maxContacts = Math.max(oldContacts.length, newContacts.length);
  for(let r=0;r<maxContacts;r++){
    const a = oldContacts[r], b = newContacts[r];
    if(!a && b){ changes.push(`[連携情報追加] ${b[2]||'(施設未記入)'}`); continue; }
    if(a && !b){ changes.push(`[連携情報削除] ${a[2]||'(施設未記入)'}`); continue; }
    if(!a || !b) continue;
    const fc2 = [];
    for(let c=0;c<CONTACT_FIELD_LABELS.length;c++){
      const av = a[c]??'', bv = b[c]??'';
      if(av !== bv) fc2.push(`${CONTACT_FIELD_LABELS[c]}:${av||'(空)'}→${bv||'(空)'}`);
    }
    if(fc2.length) changes.push(`連携情報(${b[2]||a[2]||'(無題)'}) — ${fc2.join(', ')}`);
  }
  return changes;
}
const EDIT_UNLOCK_KEY = 'event-ledger-edit-unlocked';
const EDIT_PASSWORD_HASH = '0d0f9884f6d90bd95500d8d0f9703d92c20d8507dbb7c5ee9eb4db9bcaa3caaf';
let editUnlocked = false;
function isEditUnlocked(){ return editUnlocked; }
async function sha256Hex(text){
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
function applyLockState(unlocked){
  editUnlocked = unlocked;
  document.body.classList.toggle('view-only', !unlocked);
  document.querySelectorAll('.editable-cell').forEach(td=>{ td.contentEditable = unlocked; });
  document.querySelectorAll('.editable-input').forEach(inp=>{ inp.disabled = !unlocked; });
  // addClaimBtnは対象外: クレームは誰でも記録できる運用
  [evMinus, evBilling, evAladinCard, evAladinHikari, addRowBtn, resetBtn, addContactBtn, targetBulkBtn].forEach(el=>{ if(el) el.disabled = !unlocked; });
  document.querySelectorAll('.delrow-btn').forEach(b=>{ b.disabled = !unlocked; });
  lockBtn.textContent = unlocked ? '編集を終了（閲覧のみに戻す）' : '編集する';
  lockBtn.className = 'lockbtn ' + (unlocked ? 'unlocked' : 'locked');
  updateEditorNameLabel();
}
async function onLockBtn(){
  if(editUnlocked){ applyLockState(false); try{ localStorage.removeItem(EDIT_UNLOCK_KEY); }catch(e){} return; }
  const pw = prompt('編集用パスワードを入力してください（閲覧のみでよければキャンセル）');
  if(pw===null) return;
  const hash = await sha256Hex(pw);
  if(hash === EDIT_PASSWORD_HASH){
    applyLockState(true);
    try{ localStorage.setItem(EDIT_UNLOCK_KEY, '1'); }catch(e){}
    if(getEditorName()==='不明') promptEditorName();
  }else{
    alert('パスワードが違います');
  }
}
function initLockState(){
  let saved = null;
  try{ saved = localStorage.getItem(EDIT_UNLOCK_KEY); }catch(e){}
  editUnlocked = saved === '1';
}
const DAY_FIELDS = [
  {key:'p1', label:'HS(即日)', col:23},
  {key:'p2', label:'HS(予約)', col:24},
  {key:'ss', label:'PI世帯数', col:25},
  {key:'card', label:'dカード', col:26},
  {key:'hk', label:'光', col:27},
  {key:'h5', label:'home5G', col:28},
];
const convData = d => [...d.slice(0,18), '', ...d.slice(18)];
let dailyData = {};   // {rowIndex: {"2026-07-17": {p1:..,p2:..}}}

function parseJpDate(s){
  const m = s.match(/(\d{1,2})月(\d{1,2})日/);
  if(!m) return null;
  return new Date(YEAR, Number(m[1])-1, Number(m[2]));
}
function isoOf(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
// 国民の祝日を年ごとに自動計算（振替休日・国民の休日を含む）。2027年以降も更新不要。
function computeHolidays(year){
  const iso=(m,day)=>year+'-'+String(m).padStart(2,'0')+'-'+String(day).padStart(2,'0');
  const nthMon=(m,nth)=>{const d=new Date(year,m-1,1);const off=(1-d.getDay()+7)%7;return 1+off+(nth-1)*7;};
  const base=new Set([
    iso(1,1),                       // 元日
    iso(1,nthMon(1,2)),             // 成人の日（1月第2月曜）
    iso(2,11),                      // 建国記念の日
    iso(2,23),                      // 天皇誕生日
    iso(3,Math.floor(20.8431+0.242194*(year-1980)-Math.floor((year-1980)/4))), // 春分の日
    iso(4,29),                      // 昭和の日
    iso(5,3), iso(5,4), iso(5,5),   // 憲法記念日・みどりの日・こどもの日
    iso(7,nthMon(7,3)),             // 海の日（7月第3月曜）
    iso(8,11),                      // 山の日
    iso(9,nthMon(9,3)),             // 敬老の日（9月第3月曜）
    iso(9,Math.floor(23.2488+0.242194*(year-1980)-Math.floor((year-1980)/4))), // 秋分の日
    iso(10,nthMon(10,2)),           // スポーツの日（10月第2月曜）
    iso(11,3), iso(11,23),          // 文化の日・勤労感謝の日
  ]);
  const result=new Set(base);
  const parse=s=>{const p=s.split('-').map(Number);return new Date(p[0],p[1]-1,p[2]);};
  // 振替休日：日曜と重なった祝日→直後の平日（祝日でない日）を休日に
  [...base].forEach(s=>{const d=parse(s);if(d.getDay()===0){let nx=new Date(d);do{nx.setDate(nx.getDate()+1);}while(result.has(isoOf(nx)));result.add(isoOf(nx));}});
  // 国民の休日：前後を祝日に挟まれた平日（例 2026-09-22）を休日に
  [...base].forEach(s=>{const d=parse(s);const mid=new Date(d);mid.setDate(mid.getDate()+1);const nx=new Date(d);nx.setDate(nx.getDate()+2);if(base.has(isoOf(nx))&&mid.getDay()!==0&&!result.has(isoOf(mid)))result.add(isoOf(mid));});
  return result;
}
const _holCache={};
function holsFor(y){ return _holCache[y] || (_holCache[y]=computeHolidays(y)); }
function isHol(d){ const w=d.getDay(); return w===0||w===6||holsFor(d.getFullYear()).has(isoOf(d)); }

function cellText(td){
  const inp = td.querySelector('input');
  return inp ? inp.value : td.textContent;
}

function rowStatus(c){
  const s = parseJpDate(c[14].textContent), e = parseJpDate(c[15].textContent);
  if(!s || !e) return ['', ''];
  const today = new Date(); today.setHours(0,0,0,0);
  const end = new Date(e); end.setHours(23,59,59,999);
  if(today < s) return ['開催前','before'];
  if(today > end) return ['終了','done'];
  return ['実施中','ongoing'];
}

function addRow(data){
  const tbody = document.querySelector('#ledger tbody');
  const tr = document.createElement('tr');
  for(let i=0;i<TOTAL_COLS;i++){
    const td = document.createElement('td');
    if(i===STATUS_COL){
      td.className = 'st';
    }else if(CALC_COLS.includes(i)){
      td.className = 'calc';
    }else if(i===DAY_COL){
      const b = document.createElement('button');
      b.textContent = '日別';
      b.className = 'mini-btn';
      b.onclick = ()=>openDaily(tr.rowIndex-2);   // thead2行分
      td.appendChild(b);
      const del = document.createElement('button');
      del.textContent = '✕ 行削除';
      del.className = 'delrow-btn';
      del.disabled = !isEditUnlocked();
      del.onclick = ()=>deleteRowAt(tr);
      td.appendChild(document.createElement('br'));
      td.appendChild(del);
      td.style.textAlign = 'center';
    }else if(i===DIRECTOR_IDX){
      const inp = document.createElement('input');
      inp.className = 'dir editable-input';
      inp.setAttribute('list','dirList');
      inp.placeholder = '名前';
      inp.disabled = !isEditUnlocked();
      if(data && data[i-1] !== undefined) inp.value = data[i-1];
      inp.oninput = ()=>{updateAll();saveAll();};
      td.appendChild(inp);
    }else{
      td.contentEditable = isEditUnlocked();
      td.classList.add('editable-cell');
      if(NUM_PLAN.includes(i) || ACTUAL_COLS.includes(i)) td.className += ' num';
      td.oninput = ()=>{updateAll();saveAll();};
      if(data && data[i-1] !== undefined) td.textContent = data[i-1];
    }
    if(DETAIL_COLS.includes(i)) td.classList.add('detail-col');
    tr.appendChild(td);
  }
  if(data && data[2]==='ランクA') tr.classList.add('rankA');
  tbody.appendChild(tr);
  updateAll();
}

// 指定行を削除。dailyDataは行位置キーのため、削除位置より後ろのキーを1つずつ前へ詰める
function deleteRowAt(tr){
  if(!isEditUnlocked()){ alert('編集ロック中です。「編集する」で解除してください。'); return; }
  const tbody = document.querySelector('#ledger tbody');
  const pos = tr.rowIndex - 2;   // thead2行分。dailyDataのキーと一致
  const facility = tr.cells[5] ? cellText(tr.cells[5]).trim() : '';
  const label = facility || (tr.cells[2]?('項番'+cellText(tr.cells[2]).trim()):'この行');
  if(!confirm('「'+label+'」の行を削除します。\n実績・日別入力データも一緒に消えます。\n\n本当に削除しますか？（共有中は全員に反映されます）')) return;
  const total = tbody.rows.length;
  // dailyDataをpos基準で前詰め
  const nd = {};
  Object.keys(dailyData).forEach(k=>{
    const i = Number(k);
    if(Number.isNaN(i)) { nd[k] = dailyData[k]; return; }
    if(i < pos) nd[i] = dailyData[k];
    else if(i > pos) nd[i-1] = dailyData[k];
    // i===pos は破棄
  });
  dailyData = nd;
  tr.remove();
  updateAll(); saveAll();
  showToast('行を削除しました', 'ok');
}

// 旧: 最終行削除（後方互換・未使用）
function delRow(){
  const tbody = document.querySelector('#ledger tbody');
  if(tbody.rows.length>1){
    delete dailyData[String(tbody.rows.length-1)];
    tbody.deleteRow(-1);
  }
  updateAll(); saveAll();
}

function n(td){ return Number(td.textContent.replace(/[^0-9.-]/g,''))||0; }
function pct(a,b){ return b>0 ? a/b*100 : null; }
function fmt(r){ return r===null ? '' : r.toFixed(1)+'%'; }

function setRate(td, actual, target, colorize){
  const r = pct(actual,target);
  td.textContent = fmt(r);
  td.classList.remove('ok','ng');
  if(colorize){
    if(r===null){
      td.style.removeProperty('background');
    }else{
      td.classList.add(r>=100?'ok':'ng');
      // ヒートマップ: 100%からの乖離が大きいほど濃く（td.calcの!important背景に勝つためinline+important）
      const alpha = r>=100 ? Math.min(0.32, 0.10+(r-100)/300) : Math.min(0.32, 0.06+(100-r)/250);
      const color = r>=100 ? `rgba(43,138,74,${alpha.toFixed(3)})` : `rgba(192,57,43,${alpha.toFixed(3)})`;
      td.style.setProperty('background', color, 'important');
    }
  }
}

// ペース判定: 経過日の日次目標累計(土日=休日/日) vs HS即日
function setPace(c, td){
  td.classList.remove('ok','ng');
  const s = parseJpDate(c[14].textContent), e = parseJpDate(c[15].textContent);
  const today = new Date(); today.setHours(0,0,0,0);
  if(!s || !e || today < s || today > e){ td.textContent=''; return; }
  const holT = n(c[HOL_IDX]), wkT = n(c[WK_IDX]);
  let expected = 0;
  for(let d = new Date(s); d <= today; d.setDate(d.getDate()+1)){
    expected += isHol(d) ? holT : wkT;
  }
  if(expected<=0){ td.textContent=''; return; }
  const ratio = n(c[23])/expected*100;
  const label = ratio>=100 ? '順調' : ratio>=80 ? 'やや遅れ' : '遅れ';
  td.textContent = label+' '+ratio.toFixed(0)+'%';
  if(ratio>=100) td.classList.add('ok');
  else if(ratio<80) td.classList.add('ng');
}

function hsPt(r){ if(r===null)return 0; if(r>=120)return 12; if(r>=100)return 10; if(r>=80)return 8; return 0; }
const HS_TIERS = [{pct:80,pt:8},{pct:100,pt:10},{pct:120,pt:12}];
function cardPt(r,down){ if(r===null)return 0; let p = r>=15?4 : r>=10?2 : 0; if(down) p = p===4?2:0; return p; }
function hikariPt(r,down){ if(r===null)return 0; let p = r>=20?4 : r>=15?2 : 0; if(down) p = p===4?2:0; return p; }

function barHtml(rate){
  if(rate===null) return '';
  const w = Math.min(rate,100);
  const cls = rate>=100 ? '' : rate>=80 ? 'mid' : 'low';
  return `<div class="bar"><i class="${cls}" style="width:${w}%"></i><span>${rate.toFixed(1)}%</span></div>`;
}

function esc(v){ return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
