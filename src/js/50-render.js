function renderSummaries(){
  const data = summaryRows();
  renderWeekCards(data);
  renderWeekSummary(data);
  renderGroupBarChart(data);
  renderTrendChart(data);
  renderDirectorSummary(data);
  renderDirWeekMatrix(data);
  renderBranchSummary(data);
}


// 概観: 本日実施中のイベントを大きく表示（現場スタッフが開いてすぐ状況が分かるように）
function renderTodayCard(){
  const host = document.getElementById('todayCardHost');
  if(!host) return;
  const rows = [...document.querySelectorAll('#ledger tbody tr')];
  const todays = [];
  rows.forEach((r,i)=>{
    const [,cls] = rowStatus(r.cells);
    if(cls==='ongoing') todays.push({r,i});
  });
  if(!todays.length){
    host.innerHTML = `<div class="today-card"><div class="today-label">📍 本日の担当イベント</div><div class="today-empty">本日実施中のイベントはありません。</div></div>`;
    return;
  }
  const contactRows = [...document.querySelectorAll('#contactsTable tbody tr')];
  const eventsHtml = todays.map(({r,i})=>{
    const c = r.cells;
    const facility = cellText(c[5]).trim();
    const branch = cellText(c[4]).trim();
    const week = cellText(c[1]).trim();
    const target = n(c[TARGET_IDX]);
    const actual = n(c[23]);
    const p = target>0 ? Math.round(actual/target*100) : null;
    const paceText = (c[PACE_COL].textContent||'').trim();
    const contact = contactRows.find(cr=>cellText(cr.cells[2]).trim()===facility && cellText(cr.cells[0]).trim()===week)
      || contactRows.find(cr=>cellText(cr.cells[2]).trim()===facility);
    const branchTel = contact ? contact.cells[10].innerHTML.trim() : '';
    const agentTel = contact ? contact.cells[14].innerHTML.trim() : '';
    return `<div class="today-event">
      <div class="te-head"><span class="te-facility">${facility||'(施設名未入力)'}</span><span class="te-branch">${branch}</span></div>
      <div class="te-bar"><i style="width:${Math.min(p??0,100)}%"></i></div>
      <div class="te-nums"><span>HS即日 ${actual} / 目標 ${target||'未設定'}</span><span>${p!==null?p+'%　':''}${paceText}</span></div>
      <div class="te-actions">
        <button onclick="openEasy(${i})">📝 かんたん入力</button>
        ${branchTel?`<span style="font-size:12px;">支店 ${branchTel}</span>`:''}
        ${agentTel?`<span style="font-size:12px;">代理店 ${agentTel}</span>`:''}
      </div>
    </div>`;
  }).join('');
  host.innerHTML = `<div class="today-card"><div class="today-label">📍 本日の担当イベント（${todays.length}件）</div>${eventsHtml}</div>`;
}

// 概観: 本日実施中で「本日ぶんの実績」が未入力のイベント一覧
function missingTodayRows(){
  const iso = isoOf(new Date());
  const out = [];
  [...document.querySelectorAll('#ledger tbody tr')].forEach((r,i)=>{
    if(rowStatus(r.cells)[1] !== 'ongoing') return;
    const dd = dailyData[String(i)];
    const v = dd && dd[iso] ? dd[iso].p1 : undefined;
    const entered = v!==undefined && v!==null && v!=='';
    if(!entered) out.push({r,i});
  });
  return out;
}
function renderMissingBanner(){
  const host = document.getElementById('missingBanner');
  if(!host) return;
  const ongoing = [...document.querySelectorAll('#ledger tbody tr')].filter(r=>rowStatus(r.cells)[1]==='ongoing').length;
  if(ongoing===0){ host.innerHTML=''; return; }
  const miss = missingTodayRows();
  if(!miss.length){
    host.innerHTML = `<div class="miss-banner ok"><span class="mb-text">✅ 本日実施中 ${ongoing}件 — 実績はすべて入力済みです</span></div>`;
    return;
  }
  host.innerHTML = `<div class="miss-banner"><span class="mb-text">📝 本日ぶん未入力 ${miss.length}件（実施中 ${ongoing}件中）</span><button onclick="jumpToMissing()">未入力の行へ ▶</button></div>`;
}
function jumpToMissing(){
  const miss = missingTodayRows();
  if(!miss.length){ showToast('本日ぶんは全て入力済みです','ok'); return; }
  switchTab('ledger');
  // フィルタを解除して対象行を確実に表示
  fWeek.value=''; fBranch.value=''; fStatus.value=''; fDirector.value='';
  applyFilter();
  const target = miss[0].r;
  setTimeout(()=>{
    target.scrollIntoView({behavior:'smooth', block:'center'});
    document.querySelectorAll('#ledger tr.flash-row').forEach(r=>r.classList.remove('flash-row'));
    miss.forEach(m=>{ void m.r.offsetHeight; m.r.classList.add('flash-row'); });
    setTimeout(()=>miss.forEach(m=>m.r.classList.remove('flash-row')), 1800);
  }, 60);
}

// 概観: 週別 目標vs実績のミニ棒グラフ
function updateWeekChart(rows){
  const el = document.getElementById('ovWeekChart');
  if(!el) return;
  const g = {};
  rows.forEach(r=>{
    const c = r.cells;
    const w = c[1].textContent.trim();
    if(!w) return;
    g[w] = g[w] || {t:0, a:0};
    g[w].t += n(c[TARGET_IDX]);
    g[w].a += n(c[23]);
  });
  const weeks = Object.keys(g).sort();
  if(!weeks.length){ el.innerHTML = '<span class="sub" style="margin:0;">データなし</span>'; return; }
  el.innerHTML = weeks.map(w=>{
    const {t, a} = g[w];
    const r = t>0 ? a/t*100 : null;
    const width = r===null ? 0 : Math.min(r,100);
    const cls = r===null ? 'low' : r>=100 ? '' : r>=80 ? 'mid' : 'low';
    return `<div class="week-chart-row"><span class="wlabel">${w}</span>`+
      `<div class="bar"><i class="${cls}" style="width:${width}%"></i><span>${r===null?'-':r.toFixed(0)+'%'}</span></div>`+
      `<span class="wnum">${a.toLocaleString()} / 目標${t.toLocaleString()}</span></div>`;
  }).join('');
}
