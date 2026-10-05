(() => {
  const p=window.KryptoVaultPresentation;
  const results=[];
  function check(name,value){results.push({name,value});if(!value)throw new Error(name);}
  document.getElementById('openUploadBtn').click();
  p.beginUpload({name:'presentation-fixture.txt',size:3},true);
  p.uploadStep(0);p.uploadStep(0,true);p.uploadStep(1);
  check('Seven visible presentation stages',document.querySelectorAll('#progressSteps .progress-step').length===7);
  check('Pending hash not marked complete',document.querySelector('#upload-stage-1 .step-state').textContent==='IN PROGRESS');
  closeModal('uploadModal');document.getElementById('openUploadBtn').click();
  check('Reopening retains active upload',p.isUploadActive()&&document.querySelector('#upload-stage-1 .step-state').textContent==='IN PROGRESS');
  p.uploadStep(5);p.uploadStep(5,true);p.uploadStep(6);p.failUpload();
  check('Stored but unregistered is distinct',document.getElementById('operationSummary').textContent.includes('PENDING BLOCKCHAIN'));
  check('Failure visible inside upload dialog',document.querySelector('#uploadModal .operation-feedback').textContent.includes('PENDING BLOCKCHAIN'));
  p.beginUpload({name:'presentation-fixture.txt',size:3},true);
  p.uploadStep(5,true);p.uploadTransaction('0x'+'a'.repeat(64));p.uploadStep(7,true);p.uploadStep(8);p.failUpload();
  check('Confirmed but unsynced is distinct',document.getElementById('operationSummary').textContent.includes('SYNC INCOMPLETE'));
  check('Failure releases upload control',!document.getElementById('secureUploadBtn').disabled&&!p.isUploadActive());
  closeModal('uploadModal');
  return results;
})()
