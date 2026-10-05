/* Presentation only: never calls wallet, crypto, API or storage services. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const uploadStages = ['SELECT','HASH','ENCRYPT','WRAP OWNER KEY','STORE CIPHERTEXT','REGISTER ASSET','VERIFY + SYNC'];
  const operationStages = [0,1,2,2,3,4,5,5,6];
  const messages = ['READING FILE LOCALLY','HASHING LOCALLY','GENERATING AES KEY LOCALLY','ENCRYPTING LOCALLY','WRAPPING OWNER KEY LOCALLY','UPLOADING CIPHERTEXT','WAITING FOR WALLET SIGNATURE','WAITING FOR SEPOLIA CONFIRMATION','VERIFYING RECEIPT AND EVENT'];
  let uploadIndex = -1;
  let uploadActive = false;
  let lastUploadStage = -1;
  let submittedHash = '';
  let storedAsset = false;
  let chainConfirmed = false;
  let receiptFailed = false;
  const checks = new Map(); // Public verification results only, scoped to this page session.
  const resources = new Map();
  const resourceTargets = {documents:['documentsList','recentDocs'], shared:['sharedList'], folders:['foldersGrid'], activity:['activityTimeline']};
  function renderResources() {
    resources.forEach((record,name)=>{
      if(record.status==='ready')return;
      for(const id of resourceTargets[name]||[]) {
        const target=$(id); if(!target)continue;
        target.replaceChildren();
        const note=document.createElement('p');note.className='inline-note';
        note.textContent=record.status==='loading'?`LOADING / ${name.toUpperCase()} FROM API`:record.message;
        target.append(note);
      }
    });
  }
  function resource(name,status,message) {resources.set(name,{status,message});renderResources();}
  function operation(message, error = false) {
    const el = $('operationSummary');
    el.textContent = message;
    el.classList.remove('hidden');
    el.classList.toggle('error', error);
    const panel=[...document.querySelectorAll('.modal.open .modal-card')].pop();
    if(panel) {
      let note=panel.querySelector('.operation-feedback');
      if(!note) {note=document.createElement('p');note.className='inline-note operation-feedback';panel.querySelector('.modal-head').after(note);}
      note.textContent=message;
      note.classList.toggle('error',error);
    }
  }
  function feedback(message) {
    const modal=[...document.querySelectorAll('.modal.open')].pop();
    const parent=modal?.querySelector('.modal-card') || document.querySelector('.main');
    let el=parent.querySelector(':scope > .persistent-feedback');
    if(!el) {el=document.createElement('div');el.className='inline-note persistent-feedback';el.id=modal?`${modal.id}-feedback`:'workspace-feedback';parent.append(el);}
    el.textContent=message;
    if(modal) modal.querySelectorAll('input,select,textarea').forEach(field=>{
      const previous=(field.getAttribute('aria-describedby')||'').split(' ').filter(Boolean);
      if(!previous.includes(el.id)) field.setAttribute('aria-describedby',[...previous,el.id].join(' '));
    });
  }
  function stopOperation() {operation(`OPERATION NEEDS ATTENTION / Last stage: ${$('operationSummary').textContent}. Review the error before repeating any transaction.`,true);}
  function beginUpload(file, detailed) {
    uploadActive=true;
    storedAsset=false; chainConfirmed=false; receiptFailed=false; submittedHash=''; uploadIndex=-1; lastUploadStage=-1;
    $('progressSteps').innerHTML=uploadStages.map((name,i)=>`<div class="progress-step" id="upload-stage-${i}"><span class="marker">0${i+1}</span><strong>${name}</strong><span class="step-state">UPCOMING</span></div>`).join('');
    $('progressSteps').classList.toggle('compact-details',!detailed);
    $('uploadFileSummary').textContent=`${file.name} / ${file.size.toLocaleString()} bytes`;
    $('uploadStageStatus').textContent='PREPARING LOCAL ENCRYPTION IDENTITY';
    operation('UPLOAD / Preparing local encryption identity. Keep this page open.');
    $('secureUploadBtn').disabled=true;
  }
  function uploadStep(index, done = false) {
    uploadIndex=index;
    const stage=operationStages[index];
    lastUploadStage=stage;
    const row=$(`upload-stage-${stage}`);
    if (!row) return;
    row.classList.toggle('active',!done || index===2 || index===6);
    const complete=done && index!==2 && index!==6;
    row.classList.toggle('done',complete);
    row.querySelector('.step-state').textContent=complete?'COMPLETE':'IN PROGRESS';
    if(!done) {
      $('uploadStageStatus').textContent=messages[index];
      operation(`UPLOAD / ${messages[index]}${submittedHash ? ` / TX ${submittedHash}`:''}. Closing this panel does not cancel the operation.`);
    }
    if(done && index===5) storedAsset=true;
    if(done && index===7) chainConfirmed=true;
  }
  function uploadTransaction(hash) { if(/^0x[0-9a-fA-F]{64}$/.test(hash)) submittedHash=hash; }
  function finishUpload() {
    uploadActive=false;
    $('secureUploadBtn').disabled=false;
    $('uploadStageStatus').textContent='ASSET ACTIVE';
    operation('UPLOAD / ASSET ACTIVE. Registration verified and synchronized; plaintext integrity is checked separately when opening.');
  }
  function failUpload() {
    uploadActive=false;
    $('secureUploadBtn').disabled=false;
    const row=$(`upload-stage-${lastUploadStage}`);
    if(row) {row.classList.remove('active');row.classList.add('failed');row.querySelector('.step-state').textContent='STOPPED';}
    let text='Local preparation stopped before upload. Review the error and selected file before retrying.';
    if(uploadIndex===5 && !storedAsset) text='UPLOAD OUTCOME UNKNOWN. A storage request was sent. Check the workspace before uploading again; automatic reconciliation is not implemented.';
    else if(storedAsset && !submittedHash) text='PENDING BLOCKCHAIN. Ciphertext was stored; registration did not complete. Check the workspace before repeating upload.';
    else if(submittedHash && !chainConfirmed) text='REGISTRATION OUTCOME UNCONFIRMED. Check the transaction before repeating registration.';
    else if(chainConfirmed) text='REGISTRATION CONFIRMED / SYNC INCOMPLETE. The transaction cannot be rolled back by closing this panel. Backend reconciliation is required.';
    if(receiptFailed) text='REGISTRATION FAILED / The returned receipt did not report success. Ciphertext is stored; inspect the transaction before repeating registration.';
    operation(`${text}${submittedHash?` Transaction: ${submittedHash}`:''}`,true);
  }
  function integrityResult(id, result) {
    checks.set(id, result);
    const target=$('doc-tab-integrity');
    if(target?.dataset.assetId===id) renderIntegrity(id,target.dataset.expected || '');
  }
  function renderIntegrity(id, expected) {
    const target=$('doc-tab-integrity');
    target.dataset.assetId=id; target.dataset.expected=expected;
    const result=checks.get(id);
    target.replaceChildren();
    const fields=[['Expected SHA-256',result?.expected || expected || 'Not available'],['Locally computed SHA-256',result?.computed || 'Not computed'],['Content comparison',result?.status || 'NOT CHECKED'],['Permission at check',result?.permission || 'NOT CHECKED'],['Current version at check',result?.version || 'NOT CHECKED'],['Checked at',result?.time || 'Not checked']];
    const grid=document.createElement('div'); grid.className='detail-grid';
    fields.forEach(([label,value])=>{const card=document.createElement('div');card.className='detail-card';const name=document.createElement('span');name.textContent=label;const content=document.createElement('code');content.textContent=String(value);card.append(name,content);grid.append(card);});
    const action=document.createElement('button');action.className='btn primary';action.textContent='Open and verify integrity';action.addEventListener('click',()=>window.verifyIntegrity(id));
    const note=document.createElement('p');note.className='muted';note.textContent='Registration verification, current access and a local plaintext hash match are separate checks. Results describe the check time only.';
    target.append(grid,note,action);
  }
  window.KryptoVaultPresentation={beginUpload,isUploadActive:()=>uploadActive,uploadStep,uploadTransaction,finishUpload,failUpload,uploadReceiptFailed:value=>{receiptFailed=value;},operation,stopOperation,feedback,integrityResult,renderIntegrity,resource,renderResources,clearChecks:()=>{checks.clear();resources.clear();$('operationSummary').classList.add('hidden');document.querySelectorAll('.persistent-feedback,.operation-feedback').forEach(el=>el.remove());}};
  document.addEventListener('DOMContentLoaded',()=>{
    const sidebar=document.querySelector('.sidebar');
    $('workspaceMenu').addEventListener('click',()=>{const open=sidebar.classList.toggle('menu-open');$('workspaceMenu').setAttribute('aria-expanded',String(open));});
    const bottom=document.createElement('nav');bottom.className='mobile-bottom-nav';bottom.setAttribute('aria-label','Primary workspace navigation');
    [['dashboard','Workspace'],['shared','Shared'],['activity','Activity'],['account','Profile']].forEach(([page,label])=>{const button=document.createElement('button');button.className=`nav-item ${page==='dashboard'?'active':''}`;button.dataset.page=page;button.textContent=label;button.addEventListener('click',()=>window.switchPage(page));bottom.append(button);});
    document.body.append(bottom);
    $('refreshWorkspaceBtn').addEventListener('click',()=>window.KryptoVaultState.loadBackendState());
    document.addEventListener('click',event=>{
      if(event.target.closest('[data-page]')) {sidebar.classList.remove('menu-open');$('workspaceMenu').setAttribute('aria-expanded','false');}
    });
    document.querySelectorAll('.modal').forEach(modal=>{
      const heading=modal.querySelector('h2');
      if(!heading.id) heading.id=`${modal.id}-heading`;
      modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby',heading.id);
      modal.querySelectorAll('.icon-btn[data-close]').forEach(button=>button.setAttribute('aria-label','Close dialog'));
    });
    const lastFocus=new Map();let openStack=[];
    function syncDialogs() {
      const next=[...document.querySelectorAll('.modal.open')];
      const added=next.filter(modal=>!openStack.includes(modal));
      const removed=openStack.filter(modal=>!next.includes(modal));
      const top=next[next.length-1];
      document.querySelector('.app-shell').inert=!!top;
      bottom.inert=!!top;
      document.querySelectorAll('.modal').forEach(modal=>{modal.inert=!!top && modal!==top;});
      added.forEach(modal=>{if(modal.id!=='uploadModal'||!uploadActive)modal.querySelectorAll('.operation-feedback,.persistent-feedback').forEach(el=>el.remove());lastFocus.set(modal,document.activeElement);const heading=modal.querySelector('h2');heading.tabIndex=-1;heading.focus();});
      removed.forEach(modal=>{const previous=lastFocus.get(modal);if(previous?.isConnected) previous.focus();lastFocus.delete(modal);});
      openStack=next;
      document.body.style.overflow=top?'hidden':'';
    }
    const modalObserver=new MutationObserver(syncDialogs);
    document.querySelectorAll('.modal').forEach(modal=>modalObserver.observe(modal,{attributes:true,attributeFilter:['class']}));
    document.addEventListener('keydown',event=>{
      const modal=openStack[openStack.length-1];
      if(!modal) {if(event.key==='Escape'){sidebar.classList.remove('menu-open');$('workspaceMenu').setAttribute('aria-expanded','false');}return;}
      if(event.key==='Escape') {event.preventDefault();window.closeModal(modal.id);return;}
      if(event.key!=='Tab') return;
      const focusable=[...modal.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')].filter(el=>el.getClientRects().length);
      const first=focusable[0],last=focusable[focusable.length-1];
      if(event.shiftKey&&(document.activeElement===first||!focusable.includes(document.activeElement))){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    });
    const tabs=[...document.querySelectorAll('[data-doc-tab]')];
    document.querySelector('.tabs').setAttribute('role','tablist');
    document.querySelector('.tabs').setAttribute('aria-label','Document details');
    tabs.forEach((tab,index)=>{
      tab.setAttribute('role','tab');tab.id=`tab-${tab.dataset.docTab}`;tab.setAttribute('aria-controls',`doc-tab-${tab.dataset.docTab}`);
      const panel=$(`doc-tab-${tab.dataset.docTab}`);panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',tab.id);
      tab.addEventListener('keydown',e=>{let next;if(e.key==='ArrowRight')next=(index+1)%tabs.length;if(e.key==='ArrowLeft')next=(index-1+tabs.length)%tabs.length;if(e.key==='Home')next=0;if(e.key==='End')next=tabs.length-1;if(next!==undefined){e.preventDefault();tabs[next].focus();tabs[next].click();}});
    });
    const syncTabs=()=>tabs.forEach(tab=>{const active=tab.classList.contains('active');tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;});
    const tabObserver=new MutationObserver(syncTabs);tabs.forEach(tab=>tabObserver.observe(tab,{attributes:true,attributeFilter:['class']}));syncTabs();
    // Label mobile table records from the real rendered headers, never from fake data.
    function labelTables() {
      document.querySelectorAll('table').forEach(table=>{
        const headers=[...table.querySelectorAll('thead th')].map(th=>th.textContent||'Actions');
        table.querySelectorAll('tbody tr').forEach(row=>[...row.children].forEach((cell,i)=>{cell.dataset.label=headers[i]||'Actions';}));
      });
      document.querySelectorAll('[data-page]').forEach(button=>button.classList.contains('active')?button.setAttribute('aria-current','page'):button.removeAttribute('aria-current'));
      const mode=window.KryptoVaultState?.isDemoModeEnabled()?'DEMO MODE / SIMULATED RECORDS':'REAL MODE';
      if($('workspaceMode').textContent!==mode) $('workspaceMode').textContent=mode;
    }
    const tableObserver=new MutationObserver(labelTables);tableObserver.observe(document.querySelector('.app-shell'),{childList:true,subtree:true});
    document.querySelectorAll('.doc-tab').forEach(tab=>tableObserver.observe(tab,{childList:true,subtree:true}));labelTables();
    function offlineNotice(){const notice=$('workspaceNotice');notice.classList.toggle('hidden',navigator.onLine);notice.textContent=navigator.onLine?'':'OFFLINE / Current permissions cannot be verified. Reconnect, then refresh the workspace.';}
    window.addEventListener('online',offlineNotice);window.addEventListener('offline',offlineNotice);offlineNotice();
    window.addEventListener('pagehide',()=>{modalObserver.disconnect();tabObserver.disconnect();tableObserver.disconnect();});
  });
})();
