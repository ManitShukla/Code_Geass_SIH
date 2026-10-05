const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {webcrypto} = require('node:crypto');

// Exercise the actual upload controller with deferred service promises.
// Test doubles exist only here; production services are never replaced.
function harness(failAt) {
  const events=[], requests=[], elements=new Map();
  const element=id=>{
    if(!elements.has(id))elements.set(id,{value:'',textContent:'',innerHTML:'',disabled:false,classList:{add(){},remove(){},toggle(){}},querySelector(){return {textContent:''};}});
    return elements.get(id);
  };
  let resolveHash;
  const hashGate=new Promise(resolve=>{resolveHash=resolve;});
  function step(name,value) {events.push(name);if(failAt===name)throw new Error(`Test failure: ${name}`);return value;}
  const tx={hash:`0x${'a'.repeat(64)}`,wait:async n=>{assert.equal(n,1);return step('confirm',{status:failAt==='reverted'?0:1});}};
  const context={window:{KRYPTO_APP_MODE:'REAL_MODE',KRYPTO_ALLOW_DEMO_MODE:false},document:{getElementById:element,querySelectorAll:()=>[],addEventListener(){}},localStorage:{getItem:()=>null,setItem(){},removeItem(){}},crypto:webcrypto,console:{debug(){},info(){}},setTimeout,clearTimeout,TextEncoder,FormData,Blob,Uint8Array,Date,TypeError};
  context.window.KryptoVaultCrypto={
    getDocumentEncryptionIdentity:async()=>step('identity',{publicEncryptionKey:'public-only',keyId:'id'}),
    sha256Hex:async()=>{events.push('hash-start');await hashGate;return step('hash','b'.repeat(64));},
    generateDocumentAesKey:async()=>step('aes-key',{}),
    encryptBytesWithAesGcm:async()=>step('encrypt',{encryptedBytes:new Uint8Array([8,9,10]),encryptionMetadata:{algorithm:'AES-256-GCM',iv:'example'}}),
    wrapDocumentAesKey:async()=>step('wrap','wrapped-test-value')
  };
  context.window.KryptoVaultApi={post:async(path,body)=>{
    requests.push({path,body});
    if(path==='/api/assets')return step('store',{asset:{id:'asset-1'}});
    return step('sync',{asset:{status:'ACTIVE'}});
  }};
  context.window.KryptoVaultBlockchain={registerAsset:async(id,hash)=>{assert.equal(id,'asset-1');assert.equal(hash,'b'.repeat(64));return step('register',tx);}};
  context.window.KryptoVaultPresentation={beginUpload:()=>events.push('begin'),uploadStep:(i,done)=>events.push(`${i}:${done?'done':'active'}`),uploadTransaction:hash=>events.push(`tx:${hash}`),finishUpload:()=>events.push('success'),failUpload:()=>events.push('failure'),uploadReceiptFailed:()=>events.push('receipt-failed'),feedback(){},clearChecks(){}};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(`${__dirname}/app.js`,'utf8'),context);
  context.testFile={name:'fixture.txt',size:3,type:'text/plain',arrayBuffer:async()=>step('read',new Uint8Array([1,2,3]).buffer)};
  vm.runInContext(`selectedUploadFile=testFile; state.user.walletAddress='0x1111111111111111111111111111111111111111'; refreshWorkspaceState=async function(){}; toast=function(){}; toastError=function(){};`,context);
  return {context,events,requests,resolveHash};
}
async function run() {
  const h=harness();
  const promise=vm.runInContext('startEncryptedUpload()',h.context);
  await new Promise(resolve=>setImmediate(resolve));
  assert(h.events.includes('1:active'));
  assert(!h.events.includes('1:done'),'Hash cannot finish while its operation is pending');
  assert(!h.events.includes('encrypt'),'Encryption cannot precede hashing');
  assert.equal(h.requests.length,0,'No upload while local preparation is pending');
  h.resolveHash(); await promise;
  assert(h.events.includes('success'));
  assert.deepEqual(h.events.filter(e=>/^(read|hash|aes-key|encrypt|wrap|store|register|confirm|sync)$/.test(e)),['read','hash','aes-key','encrypt','wrap','store','register','confirm','sync']);
  assert.deepEqual(h.requests.map(r=>r.path),['/api/assets','/api/assets/asset-1/blockchain-sync']);
  const form=h.requests[0].body;
  assert.deepEqual([...form.keys()],['filename','mimeType','originalSize','sha256','wrappedAESKey','encryptionMetadata','wrappingMetadata','passwordProtectionEnabled','encryptedFile']);
  assert.equal(form.get('encryptedFile').type,'application/octet-stream');
  assert.deepEqual([...new Uint8Array(await form.get('encryptedFile').arrayBuffer())],[8,9,10]);
  assert.equal(h.requests[1].body.transactionHash,`0x${'a'.repeat(64)}`);
  for(const boundary of ['hash','encrypt','wrap','store','register','confirm','sync','reverted']) {
    const failed=harness(boundary); failed.resolveHash();
    await vm.runInContext('startEncryptedUpload()',failed.context);
    assert(failed.events.includes('failure'),`${boundary} error must reach failure display`);
    assert(!failed.events.includes('success'),`${boundary} error must never display success`);
    if(boundary==='reverted')assert(!failed.events.includes('7:done'),'Reverted receipt must not complete registration');
  }
  console.log('frontend presentation tests passed: deferred upload state, exact payload boundary, eight failure paths');
}
run().catch(error=>{console.error(error);process.exitCode=1;});
