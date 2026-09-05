// ===== 目標・実績の棒グラフ（日別入力なしでも出せる。台帳の合計値だけで描く）=====
const BAR_COLORS = {target:'#94a3b8', expect:'#e0a458', actual:'#2b6cb0'};
function renderGroupBarChart(data){
  const host = document.getElementById('groupBarChart');
  if(!host) return;
  const mode = (document.getElementById('barMode')||{}).value || 'week';
  const g = aggBy(data, mode);
  const keys = Object.keys(g).sort(mode==='week' ? weekSort : (a,b)=>a.localeCompare(b,'ja'));
  if(!keys.length){ host.innerHTML = '<span class="sub" style="margin:0;">データなし</span>'; return; }

  const items = keys.map(k=>{
    const v = g[k], exp = aggExp(v);
    return {k, t:v.t, e:exp===null?0:Math.round(exp), a:v.p1, r:pct(v.p1, v.t), hasExp:exp!==null};
  });
  const yMax = Math.max(1, ...items.map(x=>Math.max(x.t, x.e, x.a)));

  const W=900, H=300, L=48, R=14, T=22, B=46;
  const band = (W-L-R)/items.length;
  const barW = Math.max(6, Math.min(30, band/4.2));
  const gap = Math.max(2, barW*0.14);
  const py = v => H-B - (v/yMax)*(H-B-T);

  let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="目標と実績の棒グラフ">`;
  for(let i=0;i<=4;i++){
    const v = yMax*i/4, y = py(v);
    svg += `<line class="trend-grid" x1="${L}" y1="${y.toFixed(1)}" x2="${W-R}" y2="${y.toFixed(1)}"/>`;
    svg += `<text class="trend-axis" x="${L-6}" y="${(y+3).toFixed(1)}" text-anchor="end">${Math.round(v)}</text>`;
  }
  const bar = (x, v, color)=>{
    const y = py(v), h = Math.max(0, H-B-y);
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" fill="${color}" rx="2"/>`;
  };
  items.forEach((it,i)=>{
    const cx = L + band*(i+0.5);
    const xT = cx - barW*1.5 - gap, xE = cx - barW/2, xA = cx + barW/2 + gap;
    svg += bar(xT, it.t, BAR_COLORS.target);
    if(it.hasExp) svg += bar(xE, it.e, BAR_COLORS.expect);
    svg += bar(xA, it.a, BAR_COLORS.actual);
    svg += `<text class="bar-val" x="${(xT+barW/2).toFixed(1)}" y="${(py(it.t)-4).toFixed(1)}" text-anchor="middle">${it.t.toLocaleString()}</text>`;
    svg += `<text class="bar-val" x="${(xA+barW/2).toFixed(1)}" y="${(py(it.a)-4).toFixed(1)}" text-anchor="middle">${it.a.toLocaleString()}</text>`;
    const label = it.k.length>8 ? it.k.slice(0,8)+'…' : it.k;
    svg += `<text class="bar-cat" x="${cx.toFixed(1)}" y="${H-B+16}" text-anchor="middle">${esc(label)}</text>`;
    if(it.r!==null){
      svg += `<text class="bar-val" x="${cx.toFixed(1)}" y="${H-B+30}" text-anchor="middle" fill="${it.r>=100?'#2b8a4a':'#c0392b'}">${it.r.toFixed(0)}%</text>`;
    }
  });
  svg += '</svg>';

  const all = aggAll(data), allExp = aggExp(all);
  host.innerHTML = svg + '<div class="trend-legend">'+
    `<span><i style="background:${BAR_COLORS.target}"></i>目標 ${all.t.toLocaleString()}</span>`+
    `<span><i style="background:${BAR_COLORS.expect}"></i>本日想定 ${allExp===null?'-':Math.round(allExp).toLocaleString()}</span>`+
    `<span><i style="background:${BAR_COLORS.actual}"></i>HS即日 ${all.p1.toLocaleString()}</span>`+
    '</div>';
}
