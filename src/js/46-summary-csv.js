// ===== 集計CSV出力 =====
function exportSummaryCsv(){
  const data = summaryRows();
  const q = v => '"'+String(v==null?'':v).replace(/"/g,'""')+'"';
  const lines = [];
  const paceCols = v=>{ const e=aggExp(v), p=paceInfo(v.p1,e); return [e===null?'':Math.round(e), p.r===null?'':p.r.toFixed(1)+'%']; };

  lines.push(q('週別サマリ'));
  lines.push(['週','期間','件数','目標計','休日/日計','平日/日計','HS即日','HS予約','残り','本日想定','ペース','達成率(即日)'].map(q).join(','));
  const gw = aggBy(data,'week');
  const wrow = (label,v)=>{ const r=pct(v.p1,v.t);
    lines.push([label,periodText(v),v.cnt,v.t,v.hol,v.wd,v.p1,v.p2,v.t-v.p1,...paceCols(v),r===null?'':r.toFixed(1)+'%'].map(q).join(',')); };
  Object.keys(gw).sort(weekSort).forEach(k=>wrow(k,gw[k]));
  wrow('月計', aggAll(data));

  lines.push('');
  lines.push(q('ディレクター別サマリ'));
  lines.push(['ディレクター','件数','目標計','HS即日','HS予約','dカード','光+5G','残り','本日想定','ペース','達成率(即日)'].map(q).join(','));
  const gd = aggBy(data,'director');
  const drow = (label,v)=>{ const r=pct(v.p1,v.t);
    lines.push([label,v.cnt,v.t,v.p1,v.p2,v.card,v.hk,v.t-v.p1,...paceCols(v),r===null?'':r.toFixed(1)+'%'].map(q).join(',')); };
  Object.keys(gd).sort((a,b)=>a.localeCompare(b,'ja')).forEach(k=>drow(k,gd[k]));
  drow('合計', aggAll(data));

  lines.push('');
  lines.push(q('ディレクター別 担当イベント明細'));
  lines.push(['ディレクター','週','支店','施設名','開始日','終了日','状態','目標','HS即日','HS予約','dカード','光+5G','達成率','残り','本日想定','ペース'].map(q).join(','));
  Object.keys(gd).sort((a,b)=>a.localeCompare(b,'ja')).forEach(k=>{
    gd[k].rows.slice().sort((a,b)=>{
      const x=parseJpDate(a.start), y=parseJpDate(b.start);
      return (x?x.getTime():0)-(y?y.getTime():0);
    }).forEach(d=>{
      const r = pct(d.p1,d.t), p = paceInfo(d.p1,d.exp);
      lines.push([k,d.week,d.branch,d.facility,d.start,d.end,d.status,d.t,d.p1,d.p2,d.card,d.hk,
        r===null?'':r.toFixed(1)+'%', d.t-d.p1, d.exp===null?'':Math.round(d.exp),
        p.r===null?'':p.r.toFixed(1)+'%'].map(q).join(','));
    });
  });

  lines.push('');
  lines.push(q('支店別サマリ'));
  lines.push(['支店','件数','目標計','HS即日','HS予約','残り','本日想定','ペース','達成率(即日)'].map(q).join(','));
  const gb = aggBy(data,'branch');
  const brow = (label,v)=>{ const r=pct(v.p1,v.t);
    lines.push([label,v.cnt,v.t,v.p1,v.p2,v.t-v.p1,...paceCols(v),r===null?'':r.toFixed(1)+'%'].map(q).join(',')); };
  Object.keys(gb).sort((a,b)=>a.localeCompare(b,'ja')).forEach(k=>brow(k,gb[k]));
  brow('合計', aggAll(data));

  const blob = new Blob(['﻿'+lines.join('\r\n')], {type:'text/csv'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = '首都圏支社イベント集計_'+currentMonthKey+'.csv';
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('集計CSVを出力しました', 'ok');
}
