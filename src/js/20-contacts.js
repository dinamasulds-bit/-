// ===== 連携情報（連絡先）2026年7月 =====
const CONTACT_COLS = 17;
const CONTACT_FIELD_LABELS = ['実施週','項番','施設名','開始日','終了日','代表(連携店舗)','連携②','連携③','支店担当者名','支店部署名','支店連絡先','支店メール','代理店担当者名','代理店部署名','代理店連絡先','代理店メール','備考'];
const CONTACT_LINK_COLS = [10,11,14,15]; // 支店連絡先,支店メール,代理店連絡先,代理店メール
function linkifyCell(td){
  const text = td.textContent;
  let html = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  html = html.replace(/(0\d{1,4}-\d{1,4}-\d{3,4})/g, '<a href="tel:$1" class="contact-link">$1</a>');
  html = html.replace(/([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g, '<a href="mailto:$1" class="contact-link">$1</a>');
  td.innerHTML = html;
}
const CONTACT_DETAIL_COLS = [1,3,4,5,6,7,9,11,13,15,16];
function addContactRow(data){
  const tbody = document.querySelector('#contactsTable tbody');
  const tr = document.createElement('tr');
  for(let i=0;i<CONTACT_COLS;i++){
    const td = document.createElement('td');
    td.contentEditable = isEditUnlocked();
    td.classList.add('editable-cell');
    if(CONTACT_DETAIL_COLS.includes(i)) td.classList.add('detail-col');
    td.oninput = ()=>{ saveAll(); };
    if(data && data[i] !== undefined) td.textContent = data[i];
    if(CONTACT_LINK_COLS.includes(i)){
      // 編集開始時はプレーンテキストに戻し、編集終了時にtel:/mailto:リンク化
      td.addEventListener('focus', ()=>{ td.textContent = td.textContent; });
      td.addEventListener('blur', ()=>linkifyCell(td));
      linkifyCell(td);
    }
    tr.appendChild(td);
  }
  tbody.appendChild(tr);
  refreshContactWeekFilter();
}
function collectContactsState(){
  return [...document.querySelectorAll('#contactsTable tbody tr')].map(r=>{
    const a = [];
    for(let i=0;i<CONTACT_COLS;i++) a.push(r.cells[i].textContent);
    return a;
  });
}
function applyContacts(list){
  document.querySelector('#contactsTable tbody').innerHTML = '';
  (list||[]).forEach(d=>addContactRow(d));
  applyContactFilter();
}

// ===== vCard出力 =====
function extractPhones(text){ return [...new Set((String(text||'').match(/0\d{1,4}-\d{1,4}-\d{3,4}/g)||[]))]; }
function extractEmails(text){ return [...new Set((String(text||'').match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g)||[]))]; }
function vcardEscape(s){ return String(s||'').replace(/\\/g,'\\\\').replace(/,/g,'\\,').replace(/;/g,'\\;').replace(/\n/g,'\\n'); }
function buildVCard(fn, org, note, tels, emails){
  let v = 'BEGIN:VCARD\r\nVERSION:3.0\r\n';
  v += `FN:${vcardEscape(fn)}\r\n`;
  v += `N:${vcardEscape(fn)};;;;\r\n`;
  if(org) v += `ORG:${vcardEscape(org)}\r\n`;
  if(note) v += `NOTE:${vcardEscape(note)}\r\n`;
  tels.forEach(t=>v+=`TEL;TYPE=CELL,VOICE:${t}\r\n`);
  emails.forEach(e=>v+=`EMAIL:${e}\r\n`);
  v += 'END:VCARD\r\n';
  return v;
}
function exportContactsVcf(){
  const rows = collectContactsState();
  let out = '', count = 0;
  rows.forEach(r=>{
    const [week, itemNo, facility, start, end, rep, link2, link3, bName, bDept, bTel, bMail, aName, aDept, aTel, aMail, note] = r;
    if(!facility) return;
    const bTels = extractPhones(bTel), bEmails = extractEmails(bMail);
    if(bName || bTels.length || bEmails.length){
      out += buildVCard(`${facility}（支店・項番${itemNo}）`, bDept, bName, bTels, bEmails);
      count++;
    }
    const aTels = extractPhones(aTel), aEmails = extractEmails(aMail);
    if(aName || aTels.length || aEmails.length){
      out += buildVCard(`${facility}（代理店・項番${itemNo}）`, aDept, aName, aTels, aEmails);
      count++;
    }
  });
  if(!count){ alert('出力できる連絡先がありません'); return; }
  const blob = new Blob(['﻿'+out], {type:'text/vcard;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = '連携情報_連絡先.vcf';
  a.click();
  URL.revokeObjectURL(a.href);
  showToast(count+'件の連絡先を書き出しました', 'ok');
}
function refreshContactWeekFilter(){
  const sel = document.getElementById('cWeekFilter');
  if(!sel) return;
  const cur = sel.value;
  const weeks = [...new Set([...document.querySelectorAll('#contactsTable tbody tr')].map(r=>r.cells[0].textContent.trim()).filter(Boolean))].sort();
  const opts = ['', ...weeks];
  if(opts.join('|') === [...sel.options].map(o=>o.value).join('|')) return;
  sel.innerHTML = '<option value="">全て</option>';
  weeks.forEach(w=>sel.add(new Option(w,w)));
  if(weeks.includes(cur)) sel.value = cur;
}
function applyContactFilter(){
  const qEl = document.getElementById('cFacilitySearch'), wEl = document.getElementById('cWeekFilter');
  const q = qEl ? qEl.value.trim() : '';
  const w = wEl ? wEl.value : '';
  document.querySelectorAll('#contactsTable tbody tr').forEach(r=>{
    const okQ = !q || r.cells[2].textContent.includes(q);
    const okW = !w || r.cells[0].textContent.trim()===w;
    r.style.display = (okQ && okW) ? '' : 'none';
  });
}
