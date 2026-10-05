(async()=>{
  if(!isDemoModeEnabled())throw new Error('This check requires explicitly configured DEMO_MODE');
  const results=[];
  function check(name,value){results.push({name,value});if(value===false)throw new Error(name);}
  await connectWallet();
  const transfer=new DataTransfer();transfer.items.add(new File(['synthetic identity fixture'],'demo-identity.txt',{type:'text/plain'}));
  document.getElementById('kycFile').files=transfer.files;await mockVerifyKyc();
  check('Mock KYC existing flow',isKycVerified());
  const doc=state.documents[0];
  openDocument(doc.id);
  document.querySelector('[data-doc-tab="integrity"]').click();
  await verifyIntegrity(doc.id);
  check('Integrity tab renders simulated result',document.getElementById('doc-tab-integrity').innerText.includes('DEMONSTRATION / MATCH'));
  openShare(doc.id);document.getElementById('shareName').value='Test recipient';document.getElementById('shareRecipient').value='0x2222222222222222222222222222222222222222';document.getElementById('shareRole').value='READ';
  await grantAccess();
  const grant=doc.permissions.at(-1);
  check('Existing grant flow',grant.active&&grant.role==='READ');
  openRevoke(doc.id,grant.id);await confirmRevoke();
  check('Existing revoke flow',!grant.active);
  document.getElementById('folderNameInput').value='Presentation test folder';await createFolder();
  const folder=state.folders.at(-1);
  moveDocument(doc.id);document.getElementById('moveFolderSelect').value=folder.id;await confirmMoveDocument();
  check('Folder organization retained',doc.folderId===folder.id);
  document.querySelectorAll('.modal.open').forEach(el=>closeModal(el.id));
  switchPage('documents');document.getElementById('docSearch').value='Employment';renderDocuments();
  check('Search retained',document.getElementById('documentsList').innerText.includes('Employment_Agreement'));
  document.getElementById('docSearch').value='';renderDocuments();
  return results;
})()
