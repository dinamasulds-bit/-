// ===== 表示中の月 =====
const CURRENT_MONTH_LS_KEY = 'event-ledger-current-month';
function getStoredMonth(){
  try{ const m = localStorage.getItem(CURRENT_MONTH_LS_KEY); if(m && MONTHS.some(x=>x.key===m)) return m; }catch(e){}
  return MONTHS[0].key;
}
let currentMonthKey = getStoredMonth();
function currentMonth(){ return MONTHS.find(m=>m.key===currentMonthKey); }
function lsKeyFor(month){ return 'event-ledger-v3-'+month; }
