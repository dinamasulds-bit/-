// ===== 月の登録 =====
// 月ごとに台帳・連携情報・クレーム・履歴を完全分離（Firebaseのroomごと分離）。
// 7月は既存のROOM_IDをそのまま使う（過去データ互換のため変更しない）。
// 実際の月データは src/data/*.js が registerMonth() を呼んで登録する。
const ROOM_ID_BASE = 'shutoken-2026-6ddee46ab67eefec76082fff';
const MONTHS = [];
function registerMonth(m){
  MONTHS.push({
    key: m.key,
    label: m.label,
    roomId: ROOM_ID_BASE + (m.roomSuffix || ''),
    ledgerSeed: ()=>m.ledger,
    contactSeed: ()=>m.contacts
  });
  MONTHS.sort((a,b)=>a.key.localeCompare(b.key));
}
