// ===== 月切替 =====
function updateMonthTitle(){
  const label = currentMonth().label;
  document.getElementById('monthTitleText').textContent = label;
  document.getElementById('monthTitleText2').textContent = label;
  document.title = '首都圏支社イベント実績管理簿（'+label+'）';
}
function initWeekBranchFilters(){
  fWeek.innerHTML = '<option value="">全て</option>';
  fBranch.innerHTML = '<option value="">全て</option>';
  [...new Set(currentMonth().ledgerSeed().map(d=>d[0]))].sort().forEach(v=>fWeek.add(new Option(v,v)));
  [...new Set(currentMonth().ledgerSeed().map(d=>d[3]))].sort().forEach(v=>fBranch.add(new Option(v,v)));
}
function initMonthSelect(){
  const sel = document.getElementById('monthSelect');
  sel.innerHTML = '';
  MONTHS.forEach(m=>sel.add(new Option(m.label, m.key)));
  sel.value = currentMonthKey;
}
async function switchMonth(monthKey){
  if(monthKey===currentMonthKey || !MONTHS.some(m=>m.key===monthKey)) return;
  currentMonthKey = monthKey;
  try{ localStorage.setItem(CURRENT_MONTH_LS_KEY, monthKey); }catch(e){}
  document.getElementById('monthSelect').value = monthKey;
  updateMonthTitle();
  document.querySelector('#ledger tbody').innerHTML = '';
  document.querySelector('#claimsTable tbody').innerHTML = '';
  dailyData = {};
  evMinus.value = 0; evBilling.value = ''; evAladinCard.checked = false; evAladinHikari.checked = false;
  loadAll();
  initWeekBranchFilters();
  updateAll();
  await window.connectRoom(currentMonth().roomId);
  showToast(currentMonth().label+'に切替えました', 'ok');
}

initLockState();
loadAll();
applyLockState(editUnlocked);
initSortHeaders();
initSimpleView();
initTab();
initFontSize();
initFieldMode();
initMonthSelect();
updateMonthTitle();
initWeekBranchFilters();
updateAll();

if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{ navigator.serviceWorker.register('sw.js').catch(()=>{}); });
}
