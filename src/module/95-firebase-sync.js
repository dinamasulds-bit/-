// 手順:
// 1. https://console.firebase.google.com → プロジェクト作成
// 2. 構築 > Realtime Database → データベース作成（ロックモードでOK、後述ルールに変更）
// 3. プロジェクト設定 > マイアプリ > Webアプリ追加 → firebaseConfig をコピーし下に貼る
// 4. ROOM_ID を推測不能な長いランダム文字列に変更（これがアクセスキー代わり）
// 5. Realtime Database ルールを以下に:
//    { "rules": { "rooms": { "$room": { ".read": true, ".write": true } } } }
//    ※URLとROOM_IDを知る人は誰でも読み書き可。社外秘運用なら Firebase Auth 導入を推奨
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAcmt7Yir4cZdjTcQ2mcf80xJUm8mxXy-E",
  authDomain: "event-ledger-shutoken.firebaseapp.com",
  databaseURL: "https://event-ledger-shutoken-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "event-ledger-shutoken",
  storageBucket: "event-ledger-shutoken.firebasestorage.app",
  messagingSenderId: "11921448608",
  appId: "1:11921448608:web:bc18cff826b568a15b33c5"
};
// ROOM_IDは月ごとに異なる（MONTHS参照）。7月は既存ROOM_IDをそのまま使い過去データと互換。

window.__fb = {enabled:false};
let __fbApp = null, __fbDb = null, __fbSdk = null, __fbUnsub = null;
// 月切替のたびに呼ばれる。Firebase Appの初期化は初回のみ、roomの接続（listen先）は毎回張り直す
window.connectRoom = async function(roomId){
  if(__fbUnsub){ __fbUnsub(); __fbUnsub = null; }
  window.__fb = {enabled:false};
  if(!(FIREBASE_CONFIG && roomId && !roomId.startsWith('CHANGE-ME'))){
    window.dispatchEvent(new Event('fb-ready'));
    return;
  }
  try{
    if(!__fbSdk){
      const {initializeApp} = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
      const dbMod = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js');
      __fbApp = initializeApp(FIREBASE_CONFIG);
      __fbDb = dbMod.getDatabase(__fbApp);
      __fbSdk = dbMod;
    }
    const {ref, onValue, update, push} = __fbSdk;
    const roomRef = ref(__fbDb, 'rooms/'+roomId);
    // historyはrooms配下ではなく独立パスに置く。
    // rooms/$room に完全listen(onValue)があると、子パスへのクエリがそのlistenの
    // ローカルキャッシュから古いデータを返すことがあるため（overlapping listener問題）
    const historyRef = ref(__fbDb, 'history/'+roomId);
    // JS SDKのonValue/get()は、rooms/$room上の常時listenと絡んでローカルキャッシュが
    // 古いまま返ることがあるため（overlapping listener問題）、historyの読み書きは
    // SDKのクエリ機構を通さずREST APIを直接叩いて確実にサーバーの最新値を取る
    const HISTORY_REST_BASE = FIREBASE_CONFIG.databaseURL + '/history/' + roomId;
    window.__fb = {
      enabled: true,
      // update()は指定キーのみ上書き。history等の兄弟ノードを消さない
      // JSON往復でundefinedを除去（Firebaseはundefinedを含むオブジェクトのpush/updateを例外で拒否するため）
      push(state){ update(roomRef, JSON.parse(JSON.stringify(state))).catch(e=>console.error('sync push failed', e)); },
      // claims/contactsは空配列だとFirebase上でキーごと消える（=undefinedで返る）ため、
      // ||[]で必ず配列に正規化する。ここを怠るとundefinedがhistory等に混入しpush()が例外で失敗する
      subscribe(cb){ __fbUnsub = onValue(roomRef, snap=>{ const v = snap.val(); cb(v ? {rows:v.rows, daily:v.daily, minus:v.minus, aladinC:v.aladinC, aladinH:v.aladinH, billing:v.billing, claims:v.claims||[], contacts:v.contacts||[], _meta:v._meta} : null); }, e=>console.error('sync read failed', e)); },
      pushHistory(entry){
        push(historyRef, JSON.parse(JSON.stringify(entry))).catch(e=>console.error('history push failed', e));
        // 40件超えたら古い分を削除（容量抑制、REST経由）
        fetch(HISTORY_REST_BASE+'.json?shallow=true').then(r=>r.json()).then(obj=>{
          const keys = obj ? Object.keys(obj) : [];
          const excess = keys.length - 40;
          if(excess > 0) keys.sort().slice(0, excess).forEach(k=>{
            fetch(HISTORY_REST_BASE+'/'+k+'.json', {method:'DELETE'}).catch(()=>{});
          });
        }).catch(()=>{});
      },
      async fetchHistory(){
        const res = await fetch(HISTORY_REST_BASE+'.json?orderBy="$key"&limitToLast=30');
        const obj = await res.json();
        if(!obj) return [];
        return Object.keys(obj).sort().reverse().map(k=>({key:k, ...obj[k]}));
      },
    };
  }catch(e){ console.error('Firebase初期化失敗', e); }
  window.dispatchEvent(new Event('fb-ready'));
};
window.connectRoom(window.currentMonth().roomId);
