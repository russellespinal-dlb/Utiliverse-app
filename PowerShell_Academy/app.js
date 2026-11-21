/* Utiliverse PowerShell Academy. Browser-only: no eval, shell, tenant calls or script uploads. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const escapeHtml = (v) => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const storage = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k,v) { try { localStorage.setItem(k,v); } catch {} },
    remove(k) { try { localStorage.removeItem(k); } catch {} }
  };
  let completed = new Set();
  try { const saved = JSON.parse(storage.get('utiliverse_ps_lessons_v1') || '[]'); if (Array.isArray(saved)) completed = new Set(saved.filter(x => PS_LESSONS.some(l => l.id === x))); } catch {}
  let selectedLesson = null;
  let activeTab = 'learn';

  function themeSet(dark) {
    document.body.classList.toggle('dark', dark);
    $('themeToggle').textContent = dark ? '☀' : '☾';
    $('themeToggle').setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
    storage.set('utiliverse_theme', dark ? 'dark' : 'light');
  }
  const previousTheme = storage.get('utiliverse_theme') || storage.get('theme');
  themeSet(previousTheme ? previousTheme === 'dark' : window.matchMedia && window.matchMedia('(prefers-color-scheme:dark)').matches);
  $('themeToggle').addEventListener('click', () => themeSet(!document.body.classList.contains('dark')));

  function switchTab(name, focus = true) {
    if (!['learn','reference','lab','builder','clinic'].includes(name)) return;
    activeTab = name;
    document.querySelectorAll('[data-tab]').forEach(btn => {
      const selected = btn.dataset.tab === name;
      btn.classList.toggle('active', selected);
      btn.setAttribute('aria-selected', String(selected));
      btn.tabIndex = selected ? 0 : -1;
    });
    ['learn','reference','lab','builder','clinic'].forEach(v => { $('panel-' + v).hidden = v !== name; });
    if (focus) { $('tab-' + name).focus({preventScroll:true}); $('panel-' + name).scrollIntoView({block:'start',behavior:'instant'}); }
  }
  document.querySelectorAll('[data-tab]').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
  document.querySelectorAll('[data-switch]').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.switch)));
  const tabs = [...document.querySelectorAll('[data-tab]')];
  tabs.forEach((btn,index) => btn.addEventListener('keydown', event => {
    if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length-1 : (index + (event.key === 'ArrowRight'?1:-1) + tabs.length) % tabs.length;
    switchTab(tabs[next].dataset.tab);
  }));

  function progress() {
    $('progressValue').textContent = `${completed.size} / ${PS_LESSONS.length}`;
    $('progressFill').style.width = `${100*completed.size/PS_LESSONS.length}%`;
  }
  function renderLessons() {
    const level = $('levelFilter').value, q = $('lessonSearch').value.trim().toLowerCase();
    const found = PS_LESSONS.filter(l => (level === 'all' || l.level === level) && [l.title,l.level,l.summary,l.concept].join(' ').toLowerCase().includes(q));
    $('lessonList').innerHTML = found.length ? found.map(l => `<article class="lesson-card">
      <span class="lesson-meta">${escapeHtml(l.level)} · ${l.minutes} min</span><h3>${escapeHtml(l.title)}</h3>
      <p>${escapeHtml(l.summary)}</p><span class="${completed.has(l.id)?'done-pill':'muted'}">${completed.has(l.id)?'✓ Completed':'Ready to explore'}</span>
      <button class="outline" type="button" data-open-lesson="${escapeHtml(l.id)}">${completed.has(l.id)?'Review lesson':'Open lesson'}</button></article>`).join('') : '<p class="muted">No lessons match this search. Try another term or level.</p>';
    progress();
  }
  function openLesson(id) {
    const l = PS_LESSONS.find(item => item.id === id); if (!l) return;
    selectedLesson = id;
    $('lessonDetail').hidden = false;
    $('lessonDetail').innerHTML = `<div class="eyebrow">${escapeHtml(l.level)} · ${l.minutes} MIN READ</div><h3>${escapeHtml(l.title)}</h3>
      <p>${escapeHtml(l.concept)}</p><strong>Example to examine</strong><pre class="code-block"><code>${escapeHtml(l.code)}</code></pre>
      <p><strong>Try this:</strong> ${escapeHtml(l.challenge)}</p><div class="button-row">
      <button class="primary" type="button" id="markLesson">${completed.has(id)?'Mark incomplete':'Mark lesson complete'}</button>
      <button class="outline" type="button" id="practiceLesson">Open related practice</button><button class="outline" type="button" id="copyLesson">Copy example</button></div>`;
    $('markLesson').addEventListener('click',()=>{
      if(completed.has(id)) completed.delete(id); else completed.add(id);
      storage.set('utiliverse_ps_lessons_v1',JSON.stringify([...completed]));renderLessons();openLesson(id);
    });
    $('practiceLesson').addEventListener('click',()=>{
      $('exerciseSelect').value = l.exercise; selectExercise();switchTab('lab');
    });
    $('copyLesson').addEventListener('click',()=>copyText(l.code,$('copyLesson')));
    $('lessonDetail').focus({preventScroll:true});$('lessonDetail').scrollIntoView({block:'nearest'});
  }
  $('levelFilter').addEventListener('change',renderLessons);
  $('lessonSearch').addEventListener('input',renderLessons);
  $('lessonList').addEventListener('click',e=>{const button = e.target.closest('[data-open-lesson]');if(button)openLesson(button.dataset.openLesson);});
  $('resetProgress').addEventListener('click',()=>{if(!completed.size)return;if(window.confirm('Clear lesson progress stored in this browser?')){completed.clear();storage.remove('utiliverse_ps_lessons_v1');renderLessons();if(selectedLesson)openLesson(selectedLesson);}});
  renderLessons();

  async function copyText(value,control){
    try { if(!navigator.clipboard?.writeText) throw Error('Clipboard not available'); await navigator.clipboard.writeText(value); const old=control.textContent;control.textContent='Copied ✓';setTimeout(()=>control.textContent=old,1700); }
    catch { const old=control.textContent;control.textContent='Select text to copy';setTimeout(()=>control.textContent=old,2200); }
  }

  function renderCommands() {
    const q=$('commandSearch').value.trim().toLowerCase(), group=$('commandGroup').value;
    const matches=PS_COMMANDS.filter(c=>(group==='all'||c.group===group) && [c.name,c.group,c.about,c.example].join(' ').toLowerCase().includes(q));
    $('commandCount').textContent=`${matches.length} of ${PS_COMMANDS.length} commands`;
    $('commandList').innerHTML=matches.length?matches.map(c=>`<article class="command-card"><div class="command-top"><h3>${escapeHtml(c.name)}</h3><span class="command-group">${escapeHtml(c.group)}</span></div>
      <p>${escapeHtml(c.about)} <small>· ${escapeHtml(c.level)}</small></p><pre class="code-block"><code>${escapeHtml(c.example)}</code></pre><div class="command-actions">
      <a href="${escapeHtml(c.url)}" target="_blank" rel="noopener noreferrer" aria-label="Microsoft documentation for ${escapeHtml(c.name)}">Official Microsoft docs ↗</a>
      <button class="text-button" type="button" data-copy-command="${escapeHtml(c.name)}">Copy example</button>
      <button class="text-button" type="button" data-review-command="${escapeHtml(c.name)}">Review example</button></div></article>`).join(''):'<p class="muted">No commands match your search.</p>';
  }
  $('commandSearch').addEventListener('input',renderCommands);$('commandGroup').addEventListener('change',renderCommands);
  $('commandList').addEventListener('click',e=>{
    const copy=e.target.closest('[data-copy-command]'),review=e.target.closest('[data-review-command]');
    if(!copy&&!review)return;
    const name=(copy||review).dataset.copyCommand||(copy||review).dataset.reviewCommand,c=PS_COMMANDS.find(x=>x.name===name);if(!c)return;
    if(copy)copyText(c.example,copy);else{$('clinicEditor').value=c.example;switchTab('clinic');$('clinicStatus').textContent='Example loaded locally. Select Review script for educational findings.';}
  });renderCommands();

  // Quick Start links open the matching command in the existing reference panel.
  // No code is executed; the curated reference is filtered locally.
  document.querySelectorAll('[data-quick-command]').forEach(button => {
    button.addEventListener('click', () => {
      const command = button.dataset.quickCommand;
      if (!PS_COMMANDS.some(item => item.name === command)) return;
      $('commandGroup').value = 'all';
      $('commandSearch').value = command;
      renderCommands();
      switchTab('reference');
      $('commandSearch').focus({preventScroll:true});
    });
  });

  $('exerciseSelect').innerHTML=PS_EXERCISES.map(e=>`<option value="${escapeHtml(e.id)}">${escapeHtml(e.title)} · ${escapeHtml(e.difficulty)}</option>`).join('');
  function selectExercise(){
    const x=PS_EXERCISES.find(e=>e.id===$('exerciseSelect').value); if(!x)return;
    $('exerciseTitle').textContent=x.title;$('exerciseGoal').textContent=x.goal;$('exerciseHint').textContent=x.hint;
    $('labEditor').value=x.starter;
    $('labStatus').className='status';$('labStatus').textContent='Edit the example, then check it against the supported practice pattern.';
    $('labOutput').replaceChildren(document.createElement('p'));$('labOutput').firstChild.textContent='No simulation run for this scenario yet.';
  }
  $('exerciseSelect').addEventListener('change',selectExercise);$('loadStarter').addEventListener('click',selectExercise);selectExercise();
  const samples={
    commands:[{Name:'Get-Service',CommandType:'Cmdlet',Source:'Microsoft.PowerShell.Management'}],
    services:[{Name:'Schedule',Status:'Running'},{Name:'EventLog',Status:'Running'},{Name:'Spooler',Status:'Stopped'},{Name:'W32Time',Status:'Running'},{Name:'BITS',Status:'Stopped'}],
    process:[{Name:'Editor',CPU:'84.2'},{Name:'Browser',CPU:'51.7'},{Name:'Terminal',CPU:'14.5'},{Name:'Updater',CPU:'7.0'}],
    files:[{Name:'archive.zip',Length:10485760},{Name:'video.mp4',Length:7340032},{Name:'notes.txt',Length:2048},{Name:'readme.md',Length:128}],
    graph:[{DisplayName:'Alex Morgan',UserPrincipalName:'alex@contoso.example'},{DisplayName:'Taylor Lee',UserPrincipalName:'taylor@contoso.example'},{DisplayName:'Jordan Ellis',UserPrincipalName:'jordan@contoso.example'}],
    exchange:[{DisplayName:'Alex Morgan',PrimarySmtpAddress:'alex@contoso.example'},{DisplayName:'Taylor Lee',PrimarySmtpAddress:'taylor@contoso.example'},{DisplayName:'Shared Support',PrimarySmtpAddress:'support@contoso.example'}],
    teams:[{DisplayName:'IT Operations',GroupId:'11111111-1111-4111-8111-111111111111'},{DisplayName:'Project Alpha',GroupId:'22222222-2222-4222-8222-222222222222'},{DisplayName:'Helpdesk',GroupId:'33333333-3333-4333-8333-333333333333'}]
  };
  // Each pattern is anchored to the *whole* submitted command. Arbitrary PowerShell is never interpreted.
  function recognize(id,raw){
    if(raw.length>3000||/[;`]|\$\(|&&|\|\||\r|\n/.test(raw))return null;
    const script=raw.trim().replace(/\s+/g,' ');
    let m;
    switch(id){
      case 'commands':
        return /^Get-Command\s+-Name\s+Get-Service$/i.test(script)?{headers:['Name','CommandType','Source'],rows:samples.commands}:null;
      case 'services':
        m=script.match(/^Get-Service\s*\|\s*Where-Object\s*\{\s*\$_\.Status\s+-eq\s+(['"])Running\1\s*\}\s*\|\s*Select-Object\s+-First\s+([1-9]|10)\s+Name\s*,\s*Status$/i);
        return m?{headers:['Name','Status'],rows:samples.services.filter(x=>x.Status==='Running').slice(0,Number(m[2]))}:null;
      case 'process':
        m=script.match(/^Get-Process\s*\|\s*Sort-Object\s+CPU\s+-Descending\s*\|\s*Select-Object\s+-First\s+([1-9]|10)\s+Name\s*,\s*CPU$/i);
        return m?{headers:['Name','CPU'],rows:samples.process.slice(0,Number(m[1]))}:null;
      case 'files':
        m=script.match(/^Get-ChildItem\s+-File\s*\|\s*Sort-Object\s+Length\s+-Descending\s*\|\s*Select-Object\s+-First\s+([1-9]|10)\s+Name\s*,\s*Length$/i);
        return m?{headers:['Name','Length'],rows:samples.files.slice(0,Number(m[1]))}:null;
      case 'graph':
        m=script.match(/^Get-MgUser\s+-Top\s+([1-9]|10)\s*\|\s*Select-Object\s+DisplayName\s*,\s*UserPrincipalName$/i);
        return m?{headers:['DisplayName','UserPrincipalName'],rows:samples.graph.slice(0,Number(m[1]))}:null;
      case 'exchange':
        m=script.match(/^Get-EXOMailbox\s+-ResultSize\s+([1-9]|10)\s*\|\s*Select-Object\s+DisplayName\s*,\s*PrimarySmtpAddress$/i);
        return m?{headers:['DisplayName','PrimarySmtpAddress'],rows:samples.exchange.slice(0,Number(m[1]))}:null;
      case 'teams':
        m=script.match(/^Get-Team\s*\|\s*Select-Object\s+-First\s+([1-9]|10)\s+DisplayName\s*,\s*GroupId$/i);
        return m?{headers:['DisplayName','GroupId'],rows:samples.teams.slice(0,Number(m[1]))}:null;
      default:return null;
    }
  }
  function renderRows(result){
    const parent=$('labOutput');parent.replaceChildren();
    const label=document.createElement('p');label.className='fake-label';label.textContent='SIMULATED OUTPUT — synthetic data';parent.append(label);
    if(!result.rows.length){const p=document.createElement('p');p.textContent='No sample records matched.';parent.append(p);return;}
    const table=document.createElement('table');const thead=document.createElement('thead'),tr=document.createElement('tr');
    result.headers.forEach(key=>{const th=document.createElement('th');th.scope='col';th.textContent=key;tr.append(th);});thead.append(tr);table.append(thead);
    const tbody=document.createElement('tbody');result.rows.forEach(row=>{const tr=document.createElement('tr');result.headers.forEach(h=>{const td=document.createElement('td');td.textContent=String(row[h]??'');tr.append(td);});tbody.append(tr);});table.append(tbody);parent.append(table);
  }
  function setStatus(id,message,kind){const element=$(id);element.textContent=message;element.className='status'+(kind?' '+kind:'');}
  $('runSimulation').addEventListener('click',()=>{
    const id=$('exerciseSelect').value;
    const result=recognize(id,$('labEditor').value);
    if(!result){setStatus('labStatus','Not a supported pattern for this exercise. No code ran. Try Restore exercise example, or use Script Clinic for general educational checks.','error');$('labOutput').textContent='No output: this code was not simulated or executed.';return;}
    renderRows(result);setStatus('labStatus',`Recognized this exercise pattern. Showing ${result.rows.length} synthetic row(s). Nothing was executed or connected.`, 'success');
  });
  $('labToClinic').addEventListener('click',()=>{$('clinicEditor').value=$('labEditor').value;switchTab('clinic');setStatus('clinicStatus','Exercise code copied into Script Clinic locally. Select Review script.');});
  $('copyLab').addEventListener('click',()=>copyText($('labEditor').value,$('copyLab')));

  $('builderSelect').innerHTML=PS_BUILDERS.map(b=>`<option value="${escapeHtml(b.id)}">${escapeHtml(b.group)} · ${escapeHtml(b.title)}</option>`).join('');
  function builderChanged(){const b=PS_BUILDERS.find(b=>b.id===$('builderSelect').value);if(!b)return;
    $('builderLabel').textContent=b.label;$('builderInput').placeholder=b.placeholder;$('builderInput').value=b.default;$('builderHelp').textContent=b.description;$('builderOutput').value='';setStatus('builderMessage','Values remain in this browser. Generate a command to preview it.');
  }
  $('builderSelect').addEventListener('change',builderChanged);builderChanged();
  function quotePowerShell(s){return `'${s.replace(/'/g,"''")}'`;}
  $('generateCommand').addEventListener('click',()=>{
    const b=PS_BUILDERS.find(b=>b.id===$('builderSelect').value);if(!b)return;
    const input=$('builderInput').value.trim();if(!input){setStatus('builderMessage','Enter a parameter value first.','error');$('builderOutput').value='';return;}
    let val;if(b.number){const n=Number(input);if(!Number.isInteger(n)||n<1||n>100){setStatus('builderMessage','Choose a whole number from 1 to 100.','error');$('builderOutput').value='';return;}val=String(n);}else{if(/[\r\n\x00-\x1f]/.test(input)){setStatus('builderMessage','Remove line breaks and control characters from the value.','error');$('builderOutput').value='';return;}val=quotePowerShell(input);}
    $('builderOutput').value=`${b.command} ${b.param} ${val}${b.suffix}`;
    setStatus('builderMessage',`${b.group} example generated. Read the prerequisites and verify official syntax before using it.`, 'success');
  });
  $('copyBuilder').addEventListener('click',()=>{if($('builderOutput').value)copyText($('builderOutput').value,$('copyBuilder'));else setStatus('builderMessage','Generate a command before copying.','error');});
  $('builderToClinic').addEventListener('click',()=>{if(!$('builderOutput').value){setStatus('builderMessage','Generate a command first.','error');return;}$('clinicEditor').value=$('builderOutput').value;switchTab('clinic');});

  const checks=[
    {id:'destructive',type:'risk',title:'Potential destructive operation',pattern:/\b(?:Remove-Item|Remove-MgUser|Remove-AzResource|Remove-Team|Clear-Content|Format-Volume|Stop-Computer)\b/i,advice:'A command may delete, overwrite, or disrupt resources. Verify the target, permissions, and backups; check supported -WhatIf/-Confirm behavior on the exact cmdlet.'},
    {id:'dynamic',type:'risk',title:'Dynamic command execution',pattern:/\b(?:Invoke-Expression|iex)\b|\[scriptblock\]::Create\s*\(/i,advice:'Dynamic evaluation can execute input as code. Avoid evaluating untrusted strings; use explicit cmdlets and validated parameters.'},
    {id:'encoded',type:'risk',title:'Encoded command or execution-policy bypass',pattern:/-(?:EncodedCommand|enc)\b|-(?:ExecutionPolicy)\s+(?:Bypass|Unrestricted)\b/i,advice:'Review why obfuscation or policy changes are requested. These patterns can obscure real behavior.'},
    {id:'secret',type:'risk',title:'Possible hard-coded credential or token',pattern:/\$[\w]*(?:password|secret|token|apikey|clientsecret)[\w]*\s*=\s*['"][^'"\r\n]{3,}['"]/i,advice:'Never embed production credentials in scripts or paste them into web tools. Use supported local secret stores or managed identities where appropriate.'},
    {id:'web',type:'warn',title:'External network request',pattern:/\b(?:Invoke-WebRequest|Invoke-RestMethod|Start-BitsTransfer)\b/i,advice:'Check the destination, authorization, rate limits, TLS, and any data sent externally. This website does not contact that endpoint.'},
    {id:'tenant',type:'warn',title:'Microsoft cloud sign-in or tenant cmdlet',pattern:/\b(?:Connect-MgGraph|Connect-ExchangeOnline|Connect-MicrosoftTeams|Connect-AzAccount|Get-MgUser|Get-EXOMailbox|Get-Team|Get-AzResource)\b/i,advice:'Real use needs the correct module, account/session, permissions, and tenant context. The browser lab cannot verify tenant behavior.'},
    {id:'changes',type:'warn',title:'Command may change resources',pattern:/\b(?:Set-|New-|Add-|Grant-|Disable-|Enable-|Start-|Restart-)(?:[A-Za-z][A-Za-z0-9-]*)\b/i,advice:'Review the cmdlet and target before applying changes; prefer a test environment and least privilege.'},
    {id:'wildcard',type:'warn',title:'Recursive or forced operation',pattern:/\b-(?:Recurse|Force)\b/i,advice:'Check the exact scope. These switches can expand impact, especially with deletion or modification commands.'}
  ];
  function inspectScript(script){
    const lines=script.split(/\r?\n/),hits=[];
    for(let idx=0;idx<lines.length;idx++){
      const line=lines[idx]; if(/^\s*#/.test(line))continue;
      for(const rule of checks){if(rule.pattern.test(line))hits.push({line:idx+1,type:rule.type,title:rule.title,advice:rule.advice});}
    }
    return hits;
  }
  $('analyzeScript').addEventListener('click',()=>{
    const script=$('clinicEditor').value;
    if(!script.trim()){setStatus('clinicStatus','Paste or load a script to review.','error');$('clinicResults').replaceChildren();return;}
    const hits=inspectScript(script);const output=$('clinicResults');output.replaceChildren();
    if(!hits.length){setStatus('clinicStatus','No selected warning patterns detected. This does not mean the script is valid, harmless, or safe to run.','success');
      const el=document.createElement('div');el.className='finding';el.innerHTML='<strong>Limited review completed</strong><p>No known patterns were flagged. Full syntax, behavior, dependencies, and authorization were not checked.</p>';output.append(el);return;}
    const severe=hits.filter(h=>h.type==='risk').length;
    setStatus('clinicStatus',`${hits.length} educational finding(s), including ${severe} high-attention flag(s). No code was run.`,severe?'error':'');
    hits.slice(0,45).forEach(h=>{const el=document.createElement('div');el.className='finding '+h.type;
      const title=document.createElement('strong');title.textContent=`Line ${h.line}: ${h.title}`;const para=document.createElement('p');para.textContent=h.advice;el.append(title,para);output.append(el);});
    if(hits.length>45){const p=document.createElement('p');p.className='muted';p.textContent=`Only the first 45 of ${hits.length} findings are displayed.`;output.append(p);}
  });
  $('loadClinicSample').addEventListener('click',()=>{
    $('clinicEditor').value=`# Educational sample: review risks before running anything\n$ApiToken = 'EXAMPLE_NOT_A_REAL_SECRET'\nGet-MgUser -Top 3\nRemove-Item -Path './old-files' -Recurse -Force`;
    $('clinicResults').replaceChildren();setStatus('clinicStatus','A demonstration sample has been loaded locally. Select Review script.');
  });
  $('clearClinic').addEventListener('click',()=>{$('clinicEditor').value='';$('clinicResults').replaceChildren();setStatus('clinicStatus','Script editor cleared. No scripts are saved automatically.');});
  $('downloadScript').addEventListener('click',()=>{
    const value=$('clinicEditor').value;
    if(!value.trim()){setStatus('clinicStatus','Add a script before downloading.','error');return;}
    const blob=new Blob([value],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='utiliverse-powershell-example.ps1';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
    setStatus('clinicStatus','A .ps1 file was prepared in your browser. Review before using it on a real machine.');
  });

  // Optional deep link to a section; no user code or secrets are placed in URL state.
  const hash=location.hash.replace('#','');if(['learn','reference','lab','builder','clinic'].includes(hash))switchTab(hash,false);
})();
