// ===== 簡易表示（モバイル向け列間引き） =====
function applySimpleView(on){
  document.getElementById('ledger').classList.toggle('simple-view', on);
  document.getElementById('contactsTable').classList.toggle('simple-view', on);
  simpleBtn.textContent = on ? '全項目表示' : '簡易表示';
  simpleBtn.classList.toggle('sec', !on);
}
function toggleSimple(){
  const on = !document.getElementById('ledger').classList.contains('simple-view');
  applySimpleView(on);
  try{ localStorage.setItem(MOBILE_VIEW_KEY, on ? '1' : '0'); }catch(e){}
}
function initSimpleView(){
  let saved = null;
  try{ saved = localStorage.getItem(MOBILE_VIEW_KEY); }catch(e){}
  const on = saved !== null ? saved==='1' : window.innerWidth <= 640;
  applySimpleView(on);
}

// ===== 文字サイズ切替 =====
const FONT_SIZE_KEY = 'event-ledger-font-large';
function applyFontSize(large){
  document.body.classList.toggle('font-large', large);
  const b = document.getElementById('fontBtn');
  if(b) b.textContent = large ? '文字サイズ 標準' : '文字サイズ 大';
}
function toggleFontSize(){
  const on = !document.body.classList.contains('font-large');
  applyFontSize(on);
  try{ localStorage.setItem(FONT_SIZE_KEY, on?'1':'0'); }catch(e){}
}
function initFontSize(){
  let saved = null;
  try{ saved = localStorage.getItem(FONT_SIZE_KEY); }catch(e){}
  applyFontSize(saved==='1');
}

// ===== ロール（現場スタッフ / 管理者） =====
// 現場は「今日の実績を入れる」ことしかしないのに全タブが同じ重さで並んでいると迷う。
// 初回だけ立場を選んでもらい、以降は端末に記憶して画面構成を変える。
const ROLE_KEY = 'event-ledger-role';
const LEGACY_FIELD_MODE_KEY = 'event-ledger-field-mode';   // 旧「現場モード」からの引き継ぎ用
const ROLE_LABEL = {field:'🚗 現場スタッフ', admin:'🗂 管理者'};
let currentRole = 'admin';
function applyRole(role){
  currentRole = (role==='field') ? 'field' : 'admin';
  const isField = currentRole==='field';
  document.body.classList.toggle('field-mode', isField);
  const b = document.getElementById('roleBtn');
  if(b){ b.textContent = ROLE_LABEL[currentRole]; b.classList.toggle('on', isField); }
  if(isField){
    const activeBtn = document.querySelector('.tab-btn.active');
    if(activeBtn && activeBtn.dataset.fieldHide) switchTab('overview');
  }
}
function setRole(role){
  applyRole(role);
  try{ localStorage.setItem(ROLE_KEY, currentRole); }catch(e){}
}
function openRolePicker(){
  const m = document.getElementById('roleModal');
  if(m) m.style.display = 'flex';
}
function chooseRole(role){
  setRole(role);
  const m = document.getElementById('roleModal');
  if(m) m.style.display = 'none';
  // 現場は開いてすぐ入力できる状態にしたいので、ここで名前を1回だけ聞く
  if(role==='field') ensureEditorName();
}
function initRole(){
  let saved = null, legacy = null;
  try{ saved = localStorage.getItem(ROLE_KEY); legacy = localStorage.getItem(LEGACY_FIELD_MODE_KEY); }catch(e){}
  if(saved==='field' || saved==='admin'){ applyRole(saved); return; }
  if(legacy !== null){ setRole(legacy==='1' ? 'field' : 'admin'); return; }
  applyRole('admin');
  openRolePicker();   // 初回だけ聞く
}

// ===== タブ切替 =====
const ACTIVE_TAB_KEY = 'event-ledger-active-tab';
function switchTab(name){
  document.querySelectorAll('.tab-panel').forEach(p=>{ p.classList.toggle('tab-hidden', p.id!=='tab-'+name); });
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active', b.dataset.tab===name));
  try{ localStorage.setItem(ACTIVE_TAB_KEY, name); }catch(e){}
}
function initTab(){
  let saved = null;
  try{ saved = localStorage.getItem(ACTIVE_TAB_KEY); }catch(e){}
  switchTab(saved && document.getElementById('tab-'+saved) ? saved : 'overview');
}

// ===== トースト通知 =====
function showToast(msg, kind){
  const host = document.getElementById('toastHost');
  if(!host) return;
  const t = document.createElement('div');
  t.className = 'toast '+(kind||'info');
  t.textContent = msg;
  host.appendChild(t);
  void t.offsetHeight; // 強制reflowでトランジションを確実に発火（非表示タブでのrAF抑制対策）
  t.classList.add('show');
  setTimeout(()=>{ t.classList.remove('show'); setTimeout(()=>t.remove(), 300); }, 2600);
}
