// ===== 集計タブ =====
// 本日時点で積み上がっているべき日次目標の累計。
// 未開始=0、実施中=開始日〜本日、終了=期間満了ぶん。
// 休日/日・平日/日が未入力の行は、目標値を経過日数で按分してフォールバックする。
function expectedToDate(startText, endText, hol, wd, total){
  const s = parseJpDate(startText), e = parseJpDate(endText);
  if(!s || !e || s > e) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  if(today < s) return 0;
  const last = today > e ? e : today;
  let exp = 0, elapsed = 0, all = 0;
  for(let d = new Date(s); d <= e; d.setDate(d.getDate()+1)){
    all++;
    const v = isHol(d) ? hol : wd;
    if(d <= last){ exp += v; elapsed++; }
  }
  if(hol <= 0 && wd <= 0) return total > 0 && all > 0 ? total*elapsed/all : null;
  return exp;
}
function paceInfo(p1, exp){
  if(exp === null || exp <= 0) return {r:null, text:'-', cls:''};
  const r = p1/exp*100;
  return {r, text:(r>=100?'順調':r>=80?'やや遅れ':'遅れ')+' '+r.toFixed(0)+'%', cls:(r>=100?'ok':r<80?'ng':'')};
}

// 台帳の1行を集計しやすい素データに変換する
function summaryRows(){
  return [...document.querySelectorAll('#ledger tbody tr')].map((r,idx)=>{
    const c = r.cells;
    const d = {
      idx,
      week: cellText(c[1]).trim() || '(未設定)',
      branch: cellText(c[4]).trim() || '(未設定)',
      facility: cellText(c[5]).trim(),
      start: cellText(c[14]).trim(),
      end: cellText(c[15]).trim(),
      director: cellText(c[DIRECTOR_IDX]).trim() || '(未設定)',
      t: n(c[TARGET_IDX]), hol: n(c[HOL_IDX]), wd: n(c[WK_IDX]),
      p1: n(c[23]), p2: n(c[24]), card: n(c[26]), hk: n(c[27])+n(c[28]),
      pace: (c[PACE_COL].textContent||'').trim(),
      status: rowStatus(c)[0],
      daily: dailyData[String(idx)] || {}
    };
    d.exp = expectedToDate(d.start, d.end, d.hol, d.wd, d.t);
    return d;
  });
}
const newAgg = ()=>({cnt:0,t:0,hol:0,wd:0,p1:0,p2:0,card:0,hk:0,exp:0,expOk:false,rows:[]});
function addAgg(a,d){
  a.cnt++; a.t+=d.t; a.hol+=d.hol; a.wd+=d.wd; a.p1+=d.p1; a.p2+=d.p2; a.card+=d.card; a.hk+=d.hk;
  if(d.exp!==null && d.exp!==undefined){ a.exp+=d.exp; a.expOk = true; }
  a.rows.push(d);
}
function aggExp(a){ return a.expOk ? a.exp : null; }
function aggBy(data, key){
  const g = {};
  data.forEach(d=>{ const k=d[key]; (g[k] = g[k] || newAgg()); addAgg(g[k], d); });
  return g;
}
function aggAll(data){ const a = newAgg(); data.forEach(d=>addAgg(a,d)); return a; }
// 「1W」「2W」…を数値順に。文字列ソートだと10W以降が2Wより前に来るため
function weekSort(a,b){
  const x=parseInt(a,10), y=parseInt(b,10);
  return (isNaN(x)?999:x)-(isNaN(y)?999:y) || a.localeCompare(b,'ja');
}
function restText(v){ const rest=v.t-v.p1; return v.t<=0 ? '-' : rest<=0 ? '達成' : rest.toLocaleString(); }
function restCls(v){ return v.t<=0 ? '' : (v.t-v.p1)<=0 ? 'ok' : 'ng'; }
function rateCls(r){ return r===null ? '' : r>=100 ? 'ok' : 'ng'; }
// 「本日想定」「ペース」の2セル（週別・ディレクター別・支店別で共通）
function paceCells(v){
  const exp = aggExp(v), p = paceInfo(v.p1, exp);
  return `<td class="num">${exp===null?'-':Math.round(exp).toLocaleString()}</td>`+
    `<td class="num ${p.cls}"><b>${p.text}</b></td>`;
}
// グループ内の最早開始日〜最遅終了日
function periodText(v){
  const ds = v.rows.map(d=>({s:parseJpDate(d.start), e:parseJpDate(d.end), d})).filter(x=>x.s&&x.e);
  if(!ds.length) return '';
  const a = ds.reduce((x,y)=>x.s<=y.s?x:y), b = ds.reduce((x,y)=>x.e>=y.e?x:y);
  return a.d.start+'〜'+b.d.end;
}

// 週別カード（週ごとの目標がひと目で分かるように大きく表示）
function renderWeekCards(data){
  const el = document.getElementById('weekCards');
  if(!el) return;
  const g = aggBy(data,'week');
  const weeks = Object.keys(g).sort(weekSort);
  if(!weeks.length){ el.innerHTML = '<span class="sub" style="margin:0;">データなし</span>'; return; }
  const card = (name, v, cls)=>{
    const r = pct(v.p1, v.t), rest = v.t - v.p1;
    const exp = aggExp(v), p = paceInfo(v.p1, exp);
    return `<div class="wk-card ${cls||''}">`+
      `<div class="wk-head"><span class="wk-name">${esc(name)}</span><span class="wk-range">${esc(periodText(v))}</span></div>`+
      `<div class="wk-main ${rateCls(r)}">${v.p1.toLocaleString()} <small>/ 目標 ${v.t.toLocaleString()}</small></div>`+
      barHtml(r)+
      `<div class="wk-meta"><span>${v.cnt}件</span>`+
      `<span class="${v.t<=0?'':rest>0?'ng':'ok'}">${v.t<=0?'目標未入力':rest>0?'あと'+rest.toLocaleString()+'台':'目標達成'}</span></div>`+
      `<div class="wk-meta"><span>本日想定 ${exp===null?'-':Math.round(exp).toLocaleString()}</span>`+
      `<span class="pace-tag ${p.cls}">${p.text}</span></div>`+
      `<div class="wk-meta"><span>休日/日計 ${v.hol.toLocaleString()}</span><span>平日/日計 ${v.wd.toLocaleString()}</span></div>`+
    `</div>`;
  };
  el.innerHTML = weeks.map(w=>card(w, g[w])).join('') + card('月計', aggAll(data), 'total');
}

// 週別サマリ表
function renderWeekSummary(data){
  const tb = document.querySelector('#weekSummary tbody');
  if(!tb) return;
  const g = aggBy(data,'week');
  const keys = Object.keys(g).sort(weekSort);
  const cells = (label, v)=>{
    const r = pct(v.p1, v.t);
    return `<td>${esc(label)}</td><td>${esc(periodText(v))}</td><td class="num">${v.cnt}</td>`+
      `<td class="num">${v.t.toLocaleString()}</td><td class="num">${v.hol.toLocaleString()}</td><td class="num">${v.wd.toLocaleString()}</td>`+
      `<td class="num">${v.p1.toLocaleString()}</td><td class="num">${v.p2.toLocaleString()}</td>`+
      `<td class="num ${restCls(v)}">${restText(v)}</td>`+ paceCells(v)+
      `<td class="num ${rateCls(r)}"><b>${fmt(r)}</b></td><td>${barHtml(r)}</td>`;
  };
  tb.innerHTML = keys.map(k=>`<tr>${cells(k, g[k])}</tr>`).join('');
  document.querySelector('#weekSummary tfoot').innerHTML =
    keys.length ? `<tr>${cells('月計', aggAll(data))}</tr>` : '';
}

// 支店別サマリ表
function renderBranchSummary(data){
  const tb = document.querySelector('#branchSummary tbody');
  if(!tb) return;
  const g = aggBy(data,'branch');
  const keys = Object.keys(g).sort((a,b)=>a.localeCompare(b,'ja'));
  const cells = (label, v)=>{
    const r = pct(v.p1, v.t);
    return `<td>${esc(label)}</td><td class="num">${v.cnt}</td><td class="num">${v.t.toLocaleString()}</td>`+
      `<td class="num">${v.p1.toLocaleString()}</td><td class="num">${v.p2.toLocaleString()}</td>`+
      `<td class="num ${restCls(v)}">${restText(v)}</td>`+ paceCells(v)+
      `<td class="num ${rateCls(r)}"><b>${fmt(r)}</b></td><td>${barHtml(r)}</td>`;
  };
  tb.innerHTML = keys.map(k=>`<tr>${cells(k, g[k])}</tr>`).join('');
  document.querySelector('#branchSummary tfoot').innerHTML =
    keys.length ? `<tr>${cells('合計', aggAll(data))}</tr>` : '';
}

// ディレクター別サマリ（行クリックで担当イベント明細を開閉）
const openDirectors = new Set();
function toggleDirector(name){
  if(openDirectors.has(name)) openDirectors.delete(name); else openDirectors.add(name);
  renderDirectorSummary(summaryRows());
}
function directorDetailHtml(v){
  const rows = v.rows.slice().sort((a,b)=>{
    const x=parseJpDate(a.start), y=parseJpDate(b.start);
    return (x?x.getTime():0)-(y?y.getTime():0);
  });
  return '<table><thead><tr><th>週</th><th>施設名</th><th>期間</th><th>状態</th>'+
    '<th>目標</th><th>HS即日</th><th>HS予約</th><th>dカード</th><th>光+5G</th><th>達成率</th><th>残り</th><th>本日想定</th><th>ペース</th></tr></thead><tbody>'+
    rows.map(d=>{
      const r = pct(d.p1, d.t), rest = d.t - d.p1, p = paceInfo(d.p1, d.exp);
      return `<tr><td>${esc(d.week)}</td><td>${esc(d.facility)}</td><td>${esc(d.start)}〜${esc(d.end)}</td><td>${esc(d.status)}</td>`+
        `<td class="num">${d.t.toLocaleString()}</td><td class="num">${d.p1.toLocaleString()}</td><td class="num">${d.p2.toLocaleString()}</td>`+
        `<td class="num">${d.card.toLocaleString()}</td><td class="num">${d.hk.toLocaleString()}</td>`+
        `<td class="num ${rateCls(r)}"><b>${fmt(r)}</b></td>`+
        `<td class="num ${d.t<=0?'':rest>0?'ng':'ok'}">${d.t<=0?'-':rest>0?rest.toLocaleString():'達成'}</td>`+
        `<td class="num">${d.exp===null?'-':Math.round(d.exp).toLocaleString()}</td>`+
        `<td class="num ${p.cls}">${p.text}</td></tr>`;
    }).join('')+'</tbody></table>';
}
function renderDirectorSummary(data){
  const tb = document.querySelector('#directorSummary tbody');
  if(!tb) return;
  const g = aggBy(data,'director');
  const keys = Object.keys(g).sort((a,b)=>a.localeCompare(b,'ja'));
  const cells = (label, v)=>{
    const r = pct(v.p1, v.t);
    return `<td>${label}</td><td class="num">${v.cnt}</td><td class="num">${v.t.toLocaleString()}</td>`+
      `<td class="num">${v.p1.toLocaleString()}</td><td class="num">${v.p2.toLocaleString()}</td>`+
      `<td class="num">${v.card.toLocaleString()}</td><td class="num">${v.hk.toLocaleString()}</td>`+
      `<td class="num ${restCls(v)}">${restText(v)}</td>`+ paceCells(v)+
      `<td class="num ${rateCls(r)}"><b>${fmt(r)}</b></td><td>${barHtml(r)}</td>`;
  };
  tb.innerHTML = keys.map(k=>{
    const v = g[k], open = openDirectors.has(k);
    const head = `<span class="dir-toggle">${open?'▼':'▶'}</span>${esc(k)}`;
    let html = `<tr class="dir-row" data-dir="${esc(k)}">${cells(head, v)}</tr>`;
    if(open) html += `<tr class="dir-detail"><td colspan="12">${directorDetailHtml(v)}</td></tr>`;
    return html;
  }).join('');
  tb.querySelectorAll('tr.dir-row').forEach(tr=>{ tr.onclick = ()=>toggleDirector(tr.dataset.dir); });
  document.querySelector('#directorSummary tfoot').innerHTML =
    keys.length ? `<tr>${cells('合計', aggAll(data))}</tr>` : '';
}

// ディレクター×週のクロス集計
function renderDirWeekMatrix(data){
  const table = document.getElementById('dirWeekMatrix');
  if(!table) return;
  const weeks = [...new Set(data.map(d=>d.week))].sort(weekSort);
  const dirs  = [...new Set(data.map(d=>d.director))].sort((a,b)=>a.localeCompare(b,'ja'));
  const m = {};
  data.forEach(d=>{ const k = d.director+' '+d.week; (m[k] = m[k] || newAgg()); addAgg(m[k], d); });
  const cell = v=>{
    if(!v) return '<td class="mx zero">-</td>';
    const r = pct(v.p1, v.t);
    return `<td class="mx"><span class="mx-rate ${rateCls(r)}">${fmt(r)||'-'}</span><br>`+
      `<span class="mx-num">${v.p1.toLocaleString()} / ${v.t.toLocaleString()}</span></td>`;
  };
  table.querySelector('thead').innerHTML = dirs.length
    ? '<tr><th>ディレクター</th>'+weeks.map(w=>`<th>${esc(w)}</th>`).join('')+'<th>計</th></tr>' : '';
  table.querySelector('tbody').innerHTML = dirs.map(dir=>{
    const tot = newAgg();
    data.filter(d=>d.director===dir).forEach(d=>addAgg(tot,d));
    return `<tr><td>${esc(dir)}</td>`+
      weeks.map(w=>cell(m[dir+' '+w])).join('')+cell(tot)+'</tr>';
  }).join('');
}
