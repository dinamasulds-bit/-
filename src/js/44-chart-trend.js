// ===== 日次推移グラフ（HS即日の累計）=====
const TREND_COLORS = ['#2b6cb0','#c0392b','#2b8a4a','#b7791f','#6b46c1','#0f766e','#be185d','#475569'];
function renderTrendChart(data){
  const host = document.getElementById('trendChart');
  if(!host) return;
  const mode = (document.getElementById('trendMode')||{}).value || 'all';
  let minD = null, maxD = null;
  data.forEach(d=>{
    const s = parseJpDate(d.start), e = parseJpDate(d.end);
    if(!s || !e) return;
    if(!minD || s < minD) minD = s;
    if(!maxD || e > maxD) maxD = e;
  });
  if(!minD){ host.innerHTML = '<span class="sub" style="margin:0;">対象イベントがありません。</span>'; return; }
  const dates = [];
  for(let d = new Date(minD); d <= maxD; d.setDate(d.getDate()+1)) dates.push(isoOf(new Date(d)));
  const pos = {}; dates.forEach((iso,k)=>pos[iso]=k);

  // 系列ごとの日次実績
  const keyOf = mode==='week' ? (d=>d.week) : mode==='director' ? (d=>d.director) : (()=>'全体');
  const series = {};
  let hasDaily = false;
  data.forEach(d=>{
    const k = keyOf(d);
    series[k] = series[k] || new Array(dates.length).fill(0);
    Object.keys(d.daily||{}).forEach(iso=>{
      const v = Number((d.daily[iso]||{}).p1) || 0;
      if(v && pos[iso]!==undefined){ series[k][pos[iso]] += v; hasDaily = true; }
    });
  });
  if(!hasDaily){
    host.innerHTML = '<span class="sub" style="margin:0;">日別入力の実績がまだありません。台帳タブの「日別」ボタンから入力すると、ここに推移が出ます。</span>';
    return;
  }
  // 日次目標の累計（あるべきペース）
  const plan = new Array(dates.length).fill(0);
  data.forEach(d=>{
    const s = parseJpDate(d.start), e = parseJpDate(d.end);
    if(!s || !e) return;
    for(let x = new Date(s); x <= e; x.setDate(x.getDate()+1)){
      const k = pos[isoOf(x)];
      if(k!==undefined) plan[k] += isHol(x) ? d.hol : d.wd;
    }
  });
  const cum = arr=>{ let t=0; return arr.map(v=>t+=v); };
  const names = Object.keys(series).sort(mode==='week' ? weekSort : (a,b)=>a.localeCompare(b,'ja'));
  const lines = names.map(k=>cum(series[k]));
  const planCum = cum(plan);
  const yMax = Math.max(1, ...lines.map(a=>a[a.length-1]||0), mode==='all' ? (planCum[planCum.length-1]||0) : 0);

  const W=900, H=280, L=48, R=14, T=14, B=34;
  const px = k => L + (dates.length<=1 ? 0 : k*(W-L-R)/(dates.length-1));
  const py = v => H-B - (v/yMax)*(H-B-T);
  const path = arr => arr.map((v,k)=>(k?'L':'M')+px(k).toFixed(1)+' '+py(v).toFixed(1)).join(' ');

  let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="日次推移">`;
  for(let i=0;i<=4;i++){
    const v = yMax*i/4, y = py(v);
    svg += `<line class="trend-grid" x1="${L}" y1="${y.toFixed(1)}" x2="${W-R}" y2="${y.toFixed(1)}"/>`;
    svg += `<text class="trend-axis" x="${L-6}" y="${(y+3).toFixed(1)}" text-anchor="end">${Math.round(v)}</text>`;
  }
  const step = Math.max(1, Math.ceil(dates.length/9));
  dates.forEach((iso,k)=>{
    if(k % step && k !== dates.length-1) return;
    const d = new Date(iso+'T00:00:00');
    svg += `<text class="trend-axis" x="${px(k).toFixed(1)}" y="${H-B+15}" text-anchor="middle">${d.getMonth()+1}/${d.getDate()}</text>`;
  });
  const todayIso = isoOf(new Date());
  if(pos[todayIso]!==undefined){
    const x = px(pos[todayIso]).toFixed(1);
    svg += `<line class="trend-today" x1="${x}" y1="${T}" x2="${x}" y2="${H-B}"/>`;
    svg += `<text class="trend-axis" x="${x}" y="${T+9}" text-anchor="middle" fill="#d9584a">本日</text>`;
  }
  // 日次目標の累計は全体モードのみ。週別/ディレクター別に重ねると全体の目標線と読み違えるため
  if(mode==='all') svg += `<path d="${path(planCum)}" fill="none" stroke="#94a3b8" stroke-width="2" stroke-dasharray="6 4"/>`;
  lines.forEach((arr,k)=>{
    svg += `<path d="${path(arr)}" fill="none" stroke="${TREND_COLORS[k%TREND_COLORS.length]}" stroke-width="2.5" stroke-linejoin="round"/>`;
  });
  svg += '</svg>';

  const legend = '<div class="trend-legend">'+
    names.map((k,idx)=>`<span><i style="background:${TREND_COLORS[idx%TREND_COLORS.length]}"></i>${esc(k)} ${(lines[idx][lines[idx].length-1]||0).toLocaleString()}</span>`).join('')+
    (mode==='all' ? `<span><i style="background:#94a3b8"></i>日次目標の累計 ${Math.round(planCum[planCum.length-1]||0).toLocaleString()}</span>` : '')+'</div>';
  host.innerHTML = svg + legend;
}
