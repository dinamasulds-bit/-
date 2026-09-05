// ===== 保存/復元 =====
const CLIENT_ID = Math.random().toString(36).slice(2)+Date.now().toString(36);
let applyingRemote = false;
let saveTimer;
let lastKnownState = null;

function collectState(){
  const rows = [...document.querySelectorAll('#ledger tbody tr')].map(r=>{
    const a = [];
    for(let i=1;i<=28;i++) a.push(cellText(r.cells[i]));
    return a;
  });
  return {rows, daily:dailyData, minus:evMinus.value, aladinC:evAladinCard.checked, aladinH:evAladinHikari.checked, billing:evBilling.value, claims:collectClaimsState(), contacts:collectContactsState()};
}

function saveAll(){
  if(applyingRemote) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(()=>{
    const state = collectState();
    try{ localStorage.setItem(lsKeyFor(currentMonthKey), JSON.stringify(state));
      const t = new Date().toLocaleTimeString();
      showToast('自動保存済 '+t, 'ok');
      const ls = document.getElementById('lastSavedMsg');
      if(ls) ls.textContent = '最終保存 '+t;
    }catch(e){
      const ls = document.getElementById('lastSavedMsg');
      if(ls){ ls.textContent = '⚠ 保存失敗（容量超過の可能性）'; ls.style.color = '#c0392b'; }
    }
    if(window.__fb && window.__fb.enabled){
      const changes = diffStates(lastKnownState, state);
      if(changes.length){
        window.__fb.pushHistory({ts:Date.now(), by:getEditorName(), summary:changes.join(' / '), state:lastKnownState});
      }
      window.__fb.push({...state, _meta:{ts:Date.now(), by:CLIENT_ID}});
      lastKnownState = state;
    }
  }, 400);
}

// リモート状態をUIへ反映（全行再構築）
function applyState(state){
  if(!state || !state.rows) return;
  applyingRemote = true;
  document.querySelector('#ledger tbody').innerHTML = '';
  dailyData = state.daily || {};
  state.rows.forEach(d=>addRow(d));
  evMinus.value = state.minus||0;
  evAladinCard.checked = !!state.aladinC;
  evAladinHikari.checked = !!state.aladinH;
  evBilling.value = state.billing||'';
  applyClaims(state.claims||[]);
  applyContacts(state.contacts||[]);
  try{ localStorage.setItem(lsKeyFor(currentMonthKey), JSON.stringify(state)); }catch(e){}
  applyingRemote = false;
  applyFilter();
}

// Firebase接続完了イベント
window.addEventListener('fb-ready', ()=>{
  if(!(window.__fb && window.__fb.enabled)){
    syncMsg.textContent = '共有: 未接続（ローカルのみ）';
    syncMsg.style.color = '#c0392b';
    return;
  }
  syncMsg.textContent = '共有: 接続中...';
  syncMsg.style.color = '#8a6d00';
  let first = true;
  window.__fb.subscribe(remote=>{
    syncMsg.textContent = '共有: 同期中';
    syncMsg.style.color = '#1a7a3a';
    if(remote && remote._meta && remote._meta.by===CLIENT_ID){ lastKnownState = remote; return; }  // 自分の書込みは無視
    if(remote && remote.rows){
      // contactsフィールドがまだ存在しない古いデータ→初期データを一度だけ補完してpush
      const seedContacts = currentMonth().contactSeed();
      if(remote.contacts === undefined && seedContacts.length){
        remote = {...remote, contacts: seedContacts};
        window.__fb.push({contacts: seedContacts});
      }
      applyState(remote);
      lastKnownState = remote;
      if(!first) showToast('他の端末の変更を受信しました', 'info');
    }else if(first){
      // サーバ側が空 → 手元のデータを初期投入
      const initState = collectState();
      window.__fb.push({...initState, _meta:{ts:Date.now(), by:CLIENT_ID}});
      lastKnownState = initState;
    }
    first = false;
  });
});

// ===== オンライン/オフライン検知 =====
function updateNetStatus(){
  const off = !navigator.onLine;
  const nm = document.getElementById('netMsg');
  if(nm) nm.textContent = off ? '⚠ オフライン（編集はこの端末に保存・オンライン復帰で自動同期）' : '';
  document.body.classList.toggle('offline', off);
}
window.addEventListener('online', ()=>{ updateNetStatus(); showToast('オンラインに復帰しました。共有を再開します', 'ok'); });
window.addEventListener('offline', ()=>{ updateNetStatus(); showToast('オフラインです。編集はこの端末に保存されます', 'info'); });
updateNetStatus();

// ===== 変更履歴 / Undo =====
let historyList = [];
async function openHistory(){
  const body = document.getElementById('historyBody');
  body.innerHTML = '<p class="sub">読込中...</p>';
  document.getElementById('historyModal').style.display = 'flex';
  if(!(window.__fb && window.__fb.enabled)){ body.innerHTML = '<p class="sub">共有未接続のため履歴はありません。</p>'; return; }
  try{
    historyList = await window.__fb.fetchHistory();
  }catch(e){ body.innerHTML = '<p class="sub">履歴の取得に失敗しました。</p>'; return; }
  renderHistory();
}
function closeHistory(){ document.getElementById('historyModal').style.display = 'none'; }
function fmtTs(ts){ return ts ? new Date(ts).toLocaleString('ja-JP') : ''; }
function renderHistory(){
  const body = document.getElementById('historyBody');
  if(!historyList.length){ body.innerHTML = '<p class="sub">履歴はまだありません。</p>'; return; }
  body.innerHTML = historyList.map(h=>`
    <div style="border-bottom:1px solid #eee;padding:8px 0;">
      <div style="font-size:12px;color:#666;">${fmtTs(h.ts)}　編集者: ${h.by||'不明'}</div>
      <div style="font-size:13px;margin:4px 0;">${(h.summary||'').replace(/</g,'&lt;')}</div>
      <button class="sec mini-btn" ${isEditUnlocked()?'':'disabled'} onclick="restoreHistory('${h.key}')">この内容に戻す</button>
    </div>`).join('');
}
async function restoreHistory(key){
  if(!isEditUnlocked()){ alert('復元は編集ロック解除中のみ可能です'); return; }
  const entry = historyList.find(h=>h.key===key);
  if(!entry || !entry.state){ alert('この履歴には復元可能なデータがありません'); return; }
  if(!confirm(fmtTs(entry.ts)+'（'+(entry.by||'不明')+'）の状態に戻します。よろしいですか？')) return;
  const before = collectState();
  window.__fb.pushHistory({ts:Date.now(), by:getEditorName(), summary:`復元: ${fmtTs(entry.ts)}(${entry.by||'不明'})時点に戻した`, state:before});
  window.__fb.push({...entry.state, _meta:{ts:Date.now(), by:CLIENT_ID}});
  applyState(entry.state);
  lastKnownState = entry.state;
  closeHistory();
}

function loadAll(){
  let state = null;
  try{ state = JSON.parse(localStorage.getItem(lsKeyFor(currentMonthKey))); }catch(e){}
  if(state && state.rows && state.rows.length){
    dailyData = state.daily || {};
    state.rows.forEach(d=>addRow(d));
    evMinus.value = state.minus||0;
    evAladinCard.checked = !!state.aladinC;
    evAladinHikari.checked = !!state.aladinH;
    evBilling.value = state.billing||'';
    applyClaims(state.claims||[]);
    applyContacts(state.contacts||[]);
  }else{
    currentMonth().ledgerSeed().forEach(d=>addRow(convData(d)));
    updateClaimsSummary();
    applyContacts(currentMonth().contactSeed());
  }
}

function resetAll(){
  const shared = window.__fb && window.__fb.enabled;
  if(!confirm('入力した実績・日別データを破棄して初期データに戻します。'+(shared?'【共有中: 全員のデータがリセットされます】':'')+'よろしいですか？')) return;
  localStorage.removeItem(lsKeyFor(currentMonthKey));
  if(shared){
    const rows = currentMonth().ledgerSeed().map(d=>{ const v = convData(d); while(v.length<28) v.push(''); return v; });
    window.__fb.push({rows, daily:{}, minus:0, aladinC:false, aladinH:false, billing:'', _meta:{ts:Date.now(), by:'reset'}});
  }
  location.reload();
}

// ===== CSV出力 =====
function exportCsv(){
  const heads = ['状態','実施週','項番','枠','支店','施設名','①フロア','①スペース名','②フロア','②スペース名','備考','実施規模','①サイズ','②サイズ','開始日','終了日','実施日数','コンテンツ','委託先','ディレクター','目標値','休日/日','平日/日','HS即日','HS予約','PI世帯数(申告)','dカード','光','home5G','達成率(即日)','達成率(即日+予約)','dカード付帯率','光付帯率','ペース'];
  const lines = [heads.join(',')];
  document.querySelectorAll('#ledger tbody tr').forEach(r=>{
    const vals = [...r.cells].filter((_,i)=>i!==DAY_COL).map(td=>'"'+cellText(td).replace(/"/g,'""')+'"');
    lines.push(vals.join(','));
  });
  const blob = new Blob(['﻿'+lines.join('\r\n')], {type:'text/csv'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = '首都圏支社イベント実績管理簿.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}
