const fs=require('node:fs');
async function main(){
  const targets=await (await fetch('http://localhost:9222/json/list')).json();
  const target=targets.find(t=>t.type==='page'&&(t.url==='about:blank'||/^http:\/\/localhost:800[01]\//.test(t.url)));
  if(!target)throw new Error('No task browser tab');
  const socket=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
  let id=0;const pending=new Map(),errors=[];
  socket.onmessage=event=>{const message=JSON.parse(event.data);if(message.id){const handler=pending.get(message.id);if(handler){pending.delete(message.id);message.error?handler.reject(message.error):handler.resolve(message.result);}}else if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.text+': '+(message.params.exceptionDetails.exception?.description||''));};
  const call=(method,params={})=>new Promise((resolve,reject)=>{pending.set(++id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const result=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||'Browser evaluation failed');return result.result.value;};
  await call('Page.enable');await call('Runtime.enable');
  const mode=process.argv[2]||'overview';
  if(mode==='close') {await call('Browser.close');socket.close();return;}
  if(mode==='eval') {console.log(JSON.stringify(await evaluate(fs.readFileSync(process.argv[3],'utf8'))));socket.close();return;}
  if(mode==='screenshot'){
    if(process.argv[3])await call('Emulation.setDeviceMetricsOverride',{width:Number(process.argv[3]),height:Number(process.argv[4]||900),deviceScaleFactor:1,mobile:false});
    if(process.argv[5])await evaluate(`document.querySelector(${JSON.stringify(process.argv[5])}).scrollIntoView({behavior:'instant'})`);
    await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    const result=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});process.stdout.write(result.data);socket.close();return;
  }
  if(mode==='interactions') {
    const results=[];
    async function check(name,expression){const value=await evaluate(expression);results.push({name,value});if(value===false)throw new Error(`Failed: ${name}`);}
    async function navigate(path){await call('Page.navigate',{url:`http://localhost:8000${path}`});await new Promise(resolve=>setTimeout(resolve,500));}
    await navigate('/landing_page/index.html');
    await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
    await check('Mobile drawer opens',`(document.getElementById('sections-toggle').click(),document.getElementById('sections-toggle').getAttribute('aria-expanded')==='true')`);
    await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
    await check('Escape closes drawer',`document.getElementById('sections-toggle').getAttribute('aria-expanded')==='false'`);
    await check('All seven manual pipeline stages',`(()=>{for(let i=0;i<7;i++)document.querySelector('[data-stage="'+i+'"]').click();return document.getElementById('pipeline-status').textContent.includes('DEMO COMPLETE')})()`);
    await check('Integrity mismatch',`(document.getElementById('integrity-mismatch').click(),document.getElementById('integrity-result').textContent.includes('INTEGRITY NOT ESTABLISHED'))`);
    await check('Integrity match',`(document.getElementById('integrity-match').click(),document.getElementById('integrity-result').textContent.includes('HASH / MATCH'))`);
    await check('Strong revoke stages',`(()=>{for(let i=0;i<6;i++)document.getElementById('rotation-next').click();return document.getElementById('rotation-version').textContent==='VERSION / 04'&&document.getElementById('rotation-user-c').textContent.includes('NO CURRENT ACCESS')})()`);
    await check('Permission validity error',`(()=>{document.getElementById('demo-until').value='2026-09-19T10:00';document.getElementById('access-form').dispatchEvent(new Event('submit',{cancelable:true}));return document.getElementById('demo-until').getAttribute('aria-invalid')==='true'})()`);
    await check('Future permission distinct',`(()=>{document.getElementById('demo-from').value='2026-09-22T10:00';document.getElementById('demo-until').value='2026-09-27T10:00';document.getElementById('access-form').dispatchEvent(new Event('submit',{cancelable:true}));return document.getElementById('access-result').textContent.includes('SCHEDULED')})()`);
    await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    await check('Reduced motion disables continuous animation',`getComputedStyle(document.querySelector('.document-track')).animationName==='none'&&document.querySelector('.motion-toggle').disabled`);
    await call('Emulation.setEmulatedMedia',{features:[]});
    await navigate('/index.html');
    await check('Missing wallet handled',`(document.getElementById('walletBtn').click(),document.getElementById('toast').textContent.includes('MetaMask is required'))`);
    await evaluate(`document.getElementById('openUploadBtn').focus();document.getElementById('openUploadBtn').click();new Promise(resolve=>requestAnimationFrame(resolve))`);
    await check('Upload dialog labelled and focuses heading',`document.getElementById('uploadModal').getAttribute('role')==='dialog'&&document.activeElement.id==='uploadModal-heading'`);
    await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,modifiers:8});
    await check('Dialog backward focus trap',`document.getElementById('uploadModal').contains(document.activeElement)`);
    await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
    await evaluate('new Promise(resolve=>requestAnimationFrame(resolve))');
    await check('Dialog closes and restores focus',`!document.getElementById('uploadModal').classList.contains('open')&&document.activeElement.id==='openUploadBtn'`);
    await check('Every workspace view retains content at 390px',`(()=>{const out=[];for(const page of ['dashboard','documents','shared','folders','activity','blockchain','account','security','settings']){switchPage(page);out.push({page,content:document.getElementById('page-'+page).innerText.length});}return out})()`);
    await call('Emulation.setDeviceMetricsOverride',{width:320,height:700,deviceScaleFactor:1,mobile:false});
    await check('Workspace has no page overflow at 320px',`document.documentElement.scrollWidth<=innerWidth`);
    await check('Policy controls remain locked',`document.getElementById('requireWallet').disabled&&document.getElementById('requireKyc').disabled`);
    await check('Theme toggle',`(()=>{document.getElementById('themeToggle').checked=false;document.getElementById('themeToggle').dispatchEvent(new Event('change'));return document.documentElement.dataset.theme==='dark'})()`);
    await check('Profile visible from mobile nav',`!!document.querySelector('.mobile-bottom-nav [data-page="account"]')`);
    console.log(JSON.stringify({results,errors}));socket.close();return;
  }
  if(mode==='fallbacks') {
    const results=[];
    async function navigate(path) {
      await call('Page.navigate',{url:`http://localhost:8000${path}`});
      await new Promise(resolve=>setTimeout(resolve,500));
    }
    await call('Emulation.setScriptExecutionDisabled',{value:true});
    await call('Emulation.setDeviceMetricsOverride',{width:320,height:700,deviceScaleFactor:1,mobile:false});
    for(const path of ['/landing_page/index.html','/landing_page/login.html','/index.html','/']) {
      await navigate(path);
      results.push(await evaluate(`({scenario:'no JavaScript',path:location.pathname,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,text:document.body.innerText.length,notice:document.querySelector('noscript')?.innerText||'',preloaderHidden:!document.getElementById('preloader')||getComputedStyle(document.getElementById('preloader')).display==='none'})`));
    }
    await call('Emulation.setScriptExecutionDisabled',{value:false});
    await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    await call('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
    await navigate('/landing_page/index.html');
    results.push(await evaluate(`({scenario:'reduced motion desktop',pipelinePosition:getComputedStyle(document.querySelector('.pipeline-story')).position,animation:getComputedStyle(document.querySelector('.document-track')).animationName,poster:document.querySelector('.sphere-poster').complete})`));
    await call('Emulation.setEmulatedMedia',{features:[]});
    for(const [width,height,label] of [[1366,480,'short height'],[720,450,'200% zoom equivalent layout viewport']]) {
      await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
      for(const path of ['/landing_page/index.html','/landing_page/login.html','/index.html']) {
        await navigate(path);
        results.push(await evaluate(`({scenario:${JSON.stringify(label)},path:location.pathname,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,height:innerHeight})`));
      }
    }
    await navigate('/landing_page/index.html');
    results.push(await evaluate(`(async()=>{const links=[...new Set([...document.querySelectorAll('a[href]')].map(a=>a.href))];const out=[];for(const href of links){const url=new URL(href);if(url.origin!==location.origin)continue;if(url.pathname===location.pathname&&url.hash){out.push({href:url.hash,ok:!!document.getElementById(decodeURIComponent(url.hash.slice(1)))});}else {const response=await fetch(url);out.push({href:url.pathname,ok:response.ok});}}return {scenario:'public links',links:out}})()`));
    console.log(JSON.stringify({results,errors}));socket.close();return;
  }
  const path=process.argv[3]||'/landing_page/index.html';
  await call('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await call('Page.navigate',{url:path.startsWith('http://localhost:8001/')?path:`http://localhost:8000${path}`});
  await new Promise(resolve=>setTimeout(resolve,500));
  await evaluate('document.fonts.ready');
  const reports=[];
  for(const width of [320,390,768,1024,1366,1440,1920]){
    await call('Emulation.setDeviceMetricsOverride',{width,height:width===1366?768:900,deviceScaleFactor:1,mobile:false});
    await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    reports.push(await evaluate(`({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll('body *')].filter(el=>{const r=el.getBoundingClientRect();return r.width&&r.right>innerWidth+1&&getComputedStyle(el).position!=='absolute'&&!el.closest('.document-world,.hero-scene,.problem-track,.pipeline-rail,thead')}).slice(0,8).map(el=>el.tagName+'.'+el.className),h1:document.querySelectorAll('h1').length,content:document.body.innerText.length})`));
  }
  await call('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  console.log(JSON.stringify({path,reports,errors,resources:await evaluate(`performance.getEntriesByType('resource').filter(r=>r.responseStatus>=400).map(r=>({url:r.name,status:r.responseStatus}))`)}));
  socket.close();
}
main().catch(error=>{console.error(error);process.exit(1);});
