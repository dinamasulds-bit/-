function updateAll(){
  const R = evalRules();
  renderEvalLabels();
  const rows = [...document.querySelectorAll('#ledger tbody tr')];
  const evPens = [];   // 開催毎HS新規未達ペナルティ（終了した催事のみ）
  let sumT=0, s1=0, s2=0, ss=0, sc=0, sh=0, s5=0;
  let a1=0, aT=0, aS=0, aC=0, aH=0, a5=0;
  let cntBefore=0, cntOngoing=0, cntDone=0, paceOk=0, paceWarn=0, paceNg=0;
  rows.forEach(r=>{
    const c = r.cells;
    const [label, cls] = rowStatus(c);
    c[STATUS_COL].innerHTML = label ? `<span class="st-chip ${cls}">${label}</span>` : '';
    c[STATUS_COL].className = 'st';
    if(cls==='before') cntBefore++; else if(cls==='ongoing') cntOngoing++; else if(cls==='done') cntDone++;
    // 未入力の警告: 必須項目（支店/施設名/開始日/終了日/ディレクター/目標値）が空ならセルを強調
    let rowMissing = false;
    REQUIRED_COLS.forEach(ci=>{
      const empty = cellText(c[ci]).trim()==='';
      c[ci].classList.toggle('missing', empty);
      if(empty) rowMissing = true;
    });
    r.classList.toggle('row-warn', rowMissing);
    setRate(c[29], n(c[23]), n(c[TARGET_IDX]), true);
    setRate(c[30], n(c[23])+n(c[24]), n(c[TARGET_IDX]), true);
    setRate(c[31], n(c[26]), n(c[23]), false);
    setRate(c[32], n(c[27])+n(c[28]), n(c[25]), false);
    setPace(c, c[PACE_COL]);
    if(cls==='ongoing'){
      const pt = c[PACE_COL].textContent;
      if(pt.startsWith('順調')) paceOk++; else if(pt.startsWith('やや遅れ')) paceWarn++; else if(pt.startsWith('遅れ')) paceNg++;
    }
    a1+=n(c[23]); aT+=n(c[TARGET_IDX]); aS+=n(c[25]); aC+=n(c[26]); aH+=n(c[27]); a5+=n(c[28]);
    if(R.eventPenalty && cls==='done' && n(c[TARGET_IDX])>0){
      const evRate = n(c[23])/n(c[TARGET_IDX])*100;
      const evPt = eventPenaltyPt(evRate);
      if(evPt>0) evPens.push({pt:evPt, rate:evRate, name:cellText(c[5]).trim()+'（'+cellText(c[14]).trim()+'〜'+cellText(c[15]).trim()+'）'});
    }
    if(r.style.display==='none') return;
    sumT += n(c[TARGET_IDX]);
    s1+=n(c[23]); s2+=n(c[24]); ss+=n(c[25]); sc+=n(c[26]); sh+=n(c[27]); s5+=n(c[28]);
  });
  ovCountBefore.textContent = cntBefore;
  ovCountOngoing.textContent = cntOngoing;
  ovCountDone.textContent = cntDone;
  ovHsCount2.textContent = a1.toLocaleString()+'件';
  ovPaceCount.textContent = cntOngoing ? cntOngoing+'件 実施中' : '実施中なし';
  ovPaceChips.innerHTML = cntOngoing===0 ? '<span class="sub" style="margin:0;">現在実施中のイベントはありません</span>' :
    [ paceOk?`<span class="pace-chip ok">順調 ${paceOk}</span>`:'',
      paceWarn?`<span class="pace-chip warn">やや遅れ ${paceWarn}</span>`:'',
      paceNg?`<span class="pace-chip ng">遅れ ${paceNg}</span>`:'' ].filter(Boolean).join('');
  updateWeekChart(rows);
  renderTodayCard();
  renderMissingBanner();
  sumTarget.textContent = sumT.toLocaleString();
  sumPi1.textContent = s1.toLocaleString();
  sumPi2.textContent = s2.toLocaleString();
  sumSetai.textContent = ss.toLocaleString();
  sumCard.textContent = sc.toLocaleString();
  sumHikari.textContent = sh.toLocaleString();
  sumH5g.textContent = s5.toLocaleString();
  setRate(totalRate1, s1, sumT, true);
  setRate(totalRate2, s1+s2, sumT, true);
  setRate(totalCardRate, sc, s1, false);
  setRate(totalFutai, sh+s5, ss, false);

  // 評価サマリ
  const hsR = pct(a1, aT), cR = pct(aC, a1), hR = pct(aH+a5, aS);
  const downC = R.aladin && evAladinCard.checked, downH = R.aladin && evAladinHikari.checked;
  const p1 = hsPt(hsR), p2 = cardPt(cR, downC), p3 = hikariPt(hR, downH);
  const minus = Number(evMinus.value)||0;
  const penTotal = evPens.reduce((sum,p)=>sum+p.pt, 0);
  const total = p1+p2+p3-minus-penTotal;

  evHsRate.textContent = fmt(hsR)||'-';
  evHsPt.textContent = p1+'pt';
  ovHsRate.textContent = fmt(hsR)||'-';
  ovHsBar.style.width = Math.min(hsR||0,100)+'%';
  ovHsBar.className = (hsR!==null && hsR>=100) ? '' : 'ng';
  if(aT<=0){
    ovHsRemain.textContent = '目標未入力'; ovHsRemain.className = 'kpi-sub';
    ovHsLadder.innerHTML = '';
  }else{
    if(a1>=aT){ ovHsRemain.textContent = '目標達成済み'; ovHsRemain.className = 'kpi-sub ok'; }
    else{ ovHsRemain.textContent = 'あと'+(aT-a1)+'台で目標達成'; ovHsRemain.className = 'kpi-sub ng'; }
    ovHsLadder.innerHTML = R.hsTiers.map(t=>{
      const need = Math.ceil(aT*t.pct/100);
      const rest = need-a1;
      const done = rest<=0;
      return `<div class="rung ${done?'done':''}"><span class="rung-pct">${t.pct}%</span><span class="rung-note">${t.pt}pt${done?' 達成':'　あと'+rest+'台'}</span></div>`;
    }).join('');
  }
  evCardRate.textContent = fmt(cR)||'-';
  evCardPt.textContent = p2+'pt'+(downC?'（乖離DOWN）':'');
  evHikariRate.textContent = fmt(hR)||'-';
  evHikariPt.textContent = p3+'pt'+(downH?'（乖離DOWN）':'');

  function tg(el, nowCount, rateTh, base){
    if(base<=0){ el.textContent='-'; el.className='v'; return; }
    const need = Math.ceil(base*rateTh/100);
    const rest = need-nowCount;
    el.textContent = need+'件'+(rest>0 ? '（あと'+rest+'件）' : '（達成済）');
    el.className = 'v '+(rest>0?'ng':'ok');
  }
  tgCardNow.textContent = aC.toLocaleString();
  tgHikariNow.textContent = (aH+a5).toLocaleString();
  tg(tgCard10, aC, R.cardTiers[0].pct, a1); tg(tgCard15, aC, R.cardTiers[1].pct, a1);
  tg(tgHikari15, aH+a5, R.hikariTiers[0].pct, aS); tg(tgHikari20, aH+a5, R.hikariTiers[1].pct, aS);

  // 開催毎HS新規未達ペナルティ（3Q〜）
  const penEl = document.getElementById('evEventPenalty'), penList = document.getElementById('evEventPenaltyList');
  if(R.eventPenalty){
    penEl.textContent = penTotal ? '▲'+penTotal+'pt' : '0pt';
    penEl.className = 'v pt'+(penTotal?' ng':'');
    penList.innerHTML = evPens.map(p=>esc(p.name)+'　達成率 '+p.rate.toFixed(0)+'% → ▲'+p.pt+'pt').join('<br>');
    penList.style.display = evPens.length ? '' : 'none';
  }

  evTotalPt.textContent = total+'pt';
  evTotalPt.className = 'v pt '+(total>=R.ptCutoff?'ok':'ng');
  evPtVerdict.textContent = total>=R.ptCutoff ? '足切り基準('+R.ptCutoff+'pt)クリア' : '足切り基準('+R.ptCutoff+'pt)未達 → 契約終了リスク';
  evPtVerdict.className = 'verdict '+(total>=R.ptCutoff?'ok':'ng');
  ovTotalPt.textContent = total+'pt';
  ovTotalPt.className = 'kpi-value '+(total>=R.ptCutoff?'ok':'ng');
  ovPtVerdict.textContent = total>=R.ptCutoff ? '足切り基準クリア' : '足切り未達';
  ovPtVerdict.className = 'kpi-sub '+(total>=R.ptCutoff?'ok':'ng');

  evHsCount.textContent = a1.toLocaleString()+'件';
  const billing = Number(evBilling.value)||0;
  if(billing>0 && a1>0){
    const cpa = billing/a1;
    evCpa.textContent = Math.round(cpa).toLocaleString()+'円/件';
    evCpa.className = 'v pt '+(cpa<=R.cpaCutoff?'ok':'ng');
    evCpaVerdict.textContent = cpa<=R.cpaTarget ? '目標('+(R.cpaTarget/10000)+'万円/件)クリア'
      : cpa<=R.cpaCutoff ? '足切りクリア（目標'+(R.cpaTarget/10000)+'万円は未達）'
      : '足切り基準('+(R.cpaCutoff/10000)+'万円/件)超過 → 契約終了リスク';
    evCpaVerdict.className = 'verdict '+(cpa<=R.cpaCutoff?'ok':'ng');
    ovCpa.textContent = Math.round(cpa).toLocaleString()+'円/件';
    ovCpa.className = 'kpi-value '+(cpa<=R.cpaCutoff?'ok':'ng');
    ovCpaVerdict.textContent = cpa<=R.cpaTarget ? '目標クリア' : cpa<=R.cpaCutoff ? '足切りクリア' : '足切り基準超過';
    ovCpaVerdict.className = 'kpi-sub '+(cpa<=R.cpaCutoff?'ok':'ng');
  }else{
    evCpa.textContent = '-'; evCpa.className='v pt';
    evCpaVerdict.textContent = '請求額を入力'; evCpaVerdict.className='verdict';
    ovCpa.textContent = '-'; ovCpa.className = 'kpi-value';
    ovCpaVerdict.textContent = '請求額未入力'; ovCpaVerdict.className = 'kpi-sub';
  }

  renderSummaries();
  refreshDirectorNames();
}

function refreshDirectorNames(){
  const names = [...new Set([...document.querySelectorAll('#ledger tbody tr')]
    .map(r=>cellText(r.cells[DIRECTOR_IDX]).trim()).filter(Boolean))].sort();
  // datalist
  const dl = document.getElementById('dirList');
  if([...dl.options].map(o=>o.value).join('|') !== names.join('|')){
    dl.innerHTML = '';
    names.forEach(v=>{ const o=document.createElement('option'); o.value=v; dl.appendChild(o); });
  }
  // フィルタ
  const cur = fDirector.value;
  const opts = [...fDirector.options].map(o=>o.value).slice(1);
  if(opts.join('|') !== names.join('|')){
    fDirector.innerHTML = '<option value="">全て</option>';
    names.forEach(v=>fDirector.add(new Option(v,v)));
    if(names.includes(cur)) fDirector.value = cur;
  }
}

function applyFilter(){
  const w = fWeek.value, b = fBranch.value, st = fStatus.value, dr = fDirector.value;
  document.querySelectorAll('#ledger tbody tr').forEach(r=>{
    const okW = !w || r.cells[1].textContent.trim()===w;
    const okB = !b || r.cells[4].textContent.trim()===b;
    const okS = !st || r.cells[STATUS_COL].textContent===st;
    const okD = !dr || cellText(r.cells[DIRECTOR_IDX]).trim()===dr;
    r.style.display = (okW && okB && okS && okD) ? '' : 'none';
  });
  updateAll();
}
