// ===== 委託先評価ルール（月ごとに切替） =====
// 2Q（〜2026-09）… 従来基準。7〜9月の評価は過去の基準のまま残す。
// 3Q（2026-10〜）… NTTドコモ「課題①-2.評価指標の見直し」の新基準。
//   ・加点バランス調整：HS新規 90%以上=8pt / 120%以上=13pt、付帯率の最高ランクは 3pt
//   ・減点の追加：「代理店認識実績との乖離」▲1pt（ALADIN乖離の1ランクダウンは廃止）
//   ・【開催毎】HS新規未達ペナルティ：終了した催事ごとに 目標達成率50%未満=▲1pt / 30%未満=▲2pt
//   ・CPA 足切り 45,000円/件（目標 40,000円/件）、評価対象は10-11月合計
//   ・委託期間 10月〜翌3月（半年）。足切りを割った場合は3ヶ月で契約終了
// 評価基準が変わったら、この表だけ直せば台帳タブの説明・評価サマリ・概観KPIが全部追随する。
const EVAL_RULES_2Q = {
  id: '2Q',
  hsTiers:     [{pct:80,pt:8},{pct:100,pt:10},{pct:120,pt:12}],
  cardTiers:   [{pct:10,pt:2},{pct:15,pt:4}],
  hikariTiers: [{pct:15,pt:2},{pct:20,pt:4}],
  aladin: true,            // 申告とALADIN実績に乖離 → 付帯率を1ランクダウン
  eventPenalty: null,
  ptCutoff: 24, cpaTarget: 40000, cpaCutoff: 50000,
  cpaPeriod: '7-8月合計が評価対象',
  incidentText: '法令違反等=次月以降契約なし / 催事回数制限・出禁=-4pt / 書面提出・返金事案=-3pt / 口頭注意・報告物遅延=-1pt / その他 都度判断',
  periodNote: ''
};
const EVAL_RULES_3Q = {
  id: '3Q',
  hsTiers:     [{pct:90,pt:8},{pct:100,pt:10},{pct:120,pt:13}],
  cardTiers:   [{pct:10,pt:2},{pct:15,pt:3}],
  hikariTiers: [{pct:15,pt:2},{pct:20,pt:3}],
  aladin: false,
  eventPenalty: [{below:30,pt:2},{below:50,pt:1}],   // 小さい方から判定（30%未満=▲2pt、50%未満=▲1pt）
  ptCutoff: 24, cpaTarget: 40000, cpaCutoff: 45000,
  cpaPeriod: '10-11月合計が評価対象',
  incidentText: '法令違反・ドコモ催事実施不可=次月以降契約なし / 催事回数制限・出禁=▲4pt / 端末書等書面提出事案・ヘルパー責による料金返還事案=▲3pt / 口頭注意事案・報告物（報告書・ロケハンシート）の提出遅延・代理店認識実績との乖離=▲1pt / その他 都度判断',
  periodNote: '3Q委託先評価：10-11月 単月ごとの実績ポイント累計が評価対象。委託期間は10月〜翌3月（半年）。足切り基準を割った場合は3ヶ月で契約終了。'
};
const EVAL_3Q_FROM = '2026-10';
function evalRules(){ return currentMonthKey >= EVAL_3Q_FROM ? EVAL_RULES_3Q : EVAL_RULES_2Q; }

// tiers は pct の小さい順。down=true なら1ランク下のポイント（最下位ランクは0）
function tierPt(r, tiers, down){
  if(r===null) return 0;
  let idx = -1;
  tiers.forEach((t,i)=>{ if(r>=t.pct) idx = i; });
  if(down) idx -= 1;
  return idx>=0 ? tiers[idx].pt : 0;
}
// 開催毎ペナルティ（rate=その催事のHS即日÷目標の%）。該当なしは0
function eventPenaltyPt(rate){
  const list = evalRules().eventPenalty;
  if(!list) return 0;
  for(const p of list){ if(rate < p.below) return p.pt; }
  return 0;
}

function tierArrow(tiers){ return tiers.slice().reverse().map(t=>t.pct+'%↑'+t.pt+'pt').join(' / '); }
function tierRule(tiers){ return tiers.slice().reverse().map(t=>t.pct+'%以上='+t.pt+'pt').join(' / '); }

// 台帳タブの説明ボックス
function evalRulesBoxHtml(R){
  const L = [];
  L.push('<b>●HS新規</b>：PI、純粋新規　※ドコモのMVNOはカウント対象外　※<b>委託先評価は当日成約（PI即日）のみ対象</b>。同点の場合は後日含み実績を参考');
  L.push('<b>●ドコモ光PI同日付帯率</b>：ドコモ光+home5G獲得数 ／ PI獲得世帯数（委託先申告）'
    + (R.aladin ? '　※<span class="warn">申告数とALADIN実績に乖離がある場合、加点ポイント1ランクダウン</span>' : ''));
  L.push('<b>●加点</b>：HS新規達成率 '+tierRule(R.hsTiers)+'　｜　dカード付帯率 '+tierRule(R.cardTiers)+'　｜　光付帯率 '+tierRule(R.hikariTiers));
  L.push('<b>●減点</b>：'+R.incidentText);
  if(R.eventPenalty){
    L.push('<b>●【開催毎】HS新規未達ペナルティ</b>：終了した催事ごとに、目標達成率 50%未満=▲1pt / 30%未満=▲2pt（評価サマリで自動計算）');
  }
  L.push('<b>●継続判定</b>：委託先評価 足切り'+R.ptCutoff+'pt ／ CPA 足切り'+R.cpaCutoff.toLocaleString()+'円/件（目標'+(R.cpaTarget/10000)+'万円/件）。'
    + '<span class="warn">どちらか片方でも足切り未達=契約終了'+(R.eventPenalty?'（3ヶ月で終了）':'')+'</span>'
    + (R.eventPenalty ? '　※委託期間は10月〜翌3月（半年）。両方とも平均以上=原則継続 / 片方が平均未満=ライン数を調整 / 両方平均未満=原則終了（上位の稼働可能人数によっては継続）' : ''));
  return L.join('<br>\n  ');
}

// 評価基準が切り替わったときだけラベル類を書き換える（updateAll から毎回呼ぶ）
let _evalLabelsFor = null;
function renderEvalLabels(){
  const R = evalRules();
  if(_evalLabelsFor === R.id) return;
  _evalLabelsFor = R.id;
  const el = id=>document.getElementById(id);
  const text = (id, s)=>{ const e=el(id); if(e) e.textContent = s; };
  const show = (id, on)=>{ const e=el(id); if(e) e.style.display = on ? '' : 'none'; };
  const box = el('rulesBox'); if(box) box.innerHTML = '\n  '+evalRulesBoxHtml(R)+'\n';
  text('evHsPtLabel', '→ ポイント（'+tierArrow(R.hsTiers)+'）');
  text('evCardPtLabel', '→ ポイント（'+tierArrow(R.cardTiers)+'）');
  text('evHikariPtLabel', '→ ポイント（'+tierArrow(R.hikariTiers)+'）');
  const [c0,c1] = R.cardTiers, [h0,h1] = R.hikariTiers;
  text('tgCard10Label', '　'+c0.pt+'pt（'+c0.pct+'%）に必要');
  text('tgCard15Label', '　'+c1.pt+'pt（'+c1.pct+'%）に必要');
  text('tgHikari15Label', '　'+h0.pt+'pt（'+h0.pct+'%）に必要');
  text('tgHikari20Label', '　'+h1.pt+'pt（'+h1.pct+'%）に必要');
  text('evMinusLabel', R.eventPenalty ? '減点（インシデント・手入力）' : '減点（インシデント）');
  text('evIncidentHint', R.eventPenalty ? ('目安：'+R.incidentText) : '');
  show('evIncidentHint', !!R.eventPenalty);
  show('evAladinRow', R.aladin);
  show('evEventPenaltyRow', !!R.eventPenalty);
  show('evEventPenaltyList', false);
  text('evCpaTitle', 'CPA（'+R.cpaPeriod+'）');
  text('evCpaRule', '目標: '+R.cpaTarget.toLocaleString()+'円/件　足切り: '+R.cpaCutoff.toLocaleString()+'円/件');
  text('evPeriodNote', R.periodNote);
  show('evPeriodNote', !!R.periodNote);
}
