(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const compact = matchMedia('(max-width: 900px)');
  let userPaused = false;
  try { userPaused = sessionStorage.getItem('kv-static-motion') === 'true'; } catch (_) {}
  const cleanup = [];
  const nav = document.querySelector('.section-nav');
  nav.classList.add('enhanced');
  document.querySelectorAll('.js-control').forEach(el => { el.hidden = false; });
  $('sections-toggle').hidden = false;
  function closeDrawer(restore = false) {
    nav.classList.remove('drawer-open');
    $('sections-toggle').setAttribute('aria-expanded', 'false');
    if (restore) $('sections-toggle').focus();
  }
  $('sections-toggle').addEventListener('click', () => {
    const open = nav.classList.toggle('drawer-open');
    $('sections-toggle').setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('keydown', e => { if(e.key === 'Escape' && nav.classList.contains('drawer-open')) closeDrawer(true); });
  const navLinks = [...$('section-links').querySelectorAll('a')];
  navLinks.forEach(link => link.addEventListener('click', () => {
    closeDrawer();
    const target = document.querySelector(link.hash);
    target.setAttribute('tabindex', '-1');
    target.focus({preventScroll:true});
  }));
  const checkpoints = [...document.querySelectorAll('[data-checkpoint]')];
  const visibleSections = new Set();
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => e.isIntersecting ? visibleSections.add(e.target) : visibleSections.delete(e.target));
      const active = checkpoints.find(section => visibleSections.has(section));
      if (!active) return;
      const id = active.dataset.checkpoint;
      navLinks.forEach(a => a.hash === `#${id}` ? a.setAttribute('aria-current','location') : a.removeAttribute('aria-current'));
      $('current-section').textContent = id.replaceAll('-', ' ').toUpperCase();
    }, {rootMargin:'-64px 0px -60% 0px',threshold:0});
    checkpoints.forEach(el => observer.observe(el));
    cleanup.push(() => observer.disconnect());
  }
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(() => {
      // Drawer expansion must not increase anchor offset after it has closed.
      const height = compact.matches ? 64 : nav.getBoundingClientRect().height;
      document.documentElement.style.setProperty('--section-nav-height', `${height}px`);
    });
    observer.observe(nav); cleanup.push(() => observer.disconnect());
  }
  compact.addEventListener('change', () => closeDrawer());

  // The loader describes only this already-readable interface and loaded poster.
  const poster = document.querySelector('.sphere-poster');
  function showReady() {
    try {
      if (!reduced.matches && !sessionStorage.getItem('kv-visual-ready') && poster.naturalWidth) {
        $('preloader').hidden = false;
        $('preloader').addEventListener('animationend', () => { $('preloader').hidden = true; }, {once:true});
      }
      sessionStorage.setItem('kv-visual-ready','true');
    } catch (_) {}
  }
  if (poster.complete) showReady(); else poster.addEventListener('load', showReady, {once:true});

  const plane = document.querySelector('.document-plane');
  const firstStrip = plane.firstElementChild;
  // Stagger the same illustrative categories across three independent strips.
  for (let row=1;row<3;row++) {
    const strip=firstStrip.cloneNode(true);
    const set=strip.querySelector('.document-set');
    for(let offset=0;offset<row*2;offset++) set.append(set.firstElementChild);
    plane.append(strip);
  }
  const hoverPointer=matchMedia('(hover: hover) and (pointer: fine)');
  plane.querySelectorAll('.document-strip').forEach(strip=>{
    const track=strip.querySelector('.document-track');
    const set=track.firstElementChild;
    // A long complete cycle covers wide screens before its seamless duplicate.
    [...set.children].forEach(card=>{const repeat=card.cloneNode(true);repeat.classList.add('document-repeat');set.append(repeat);});
    const clone=set.cloneNode(true);
    clone.classList.add('clone');clone.setAttribute('aria-hidden','true');track.append(clone);
    function setSpeed(slow) {
      // Changing playback rate preserves the current position, unlike duration.
      track.getAnimations().forEach(animation=>animation.updatePlaybackRate(slow ? 0.22 : 1));
    }
    strip.addEventListener('pointerenter',()=>setSpeed(hoverPointer.matches));
    strip.addEventListener('pointerleave',()=>setSpeed(false));
    strip.addEventListener('pointercancel',()=>setSpeed(false));
  });
  document.body.classList.add('motion-ready');
  let sphereVisible = false, frameId = 0, lastTime = 0, angle = 0;
  const canvas = $('sphere');
  const ctx = canvas.getContext('2d');
  function motionAllowed() { return !userPaused && !reduced.matches && !document.hidden; }
  function drawSphere(now) {
    frameId = 0;
    if (!ctx || !window.VaultSphereGeometry) return;
    if (now - lastTime >= 45) {
      angle += Math.min(now - lastTime, 60) / 22000;
      lastTime = now;
      const {lines,points} = window.VaultSphereGeometry.frame(angle);
      ctx.clearRect(0,0,1000,1000);
      lines.forEach(line => {
        ctx.strokeStyle = line.ring ? `rgba(167,196,243,${line.alpha})` : `rgba(77,133,215,${line.alpha})`;
        ctx.lineWidth = line.ring ? 1.2 : .8;
        ctx.beginPath(); ctx.moveTo(line.a.x,line.a.y); ctx.lineTo(line.b.x,line.b.y); ctx.stroke();
      });
      points.forEach((point,index) => {
        if (index % 29 || point.z < 0) return;
        ctx.fillStyle = '#a7c9ff'; ctx.fillRect(point.x-1.3,point.y-1.3,2.6,2.6);
      });
      // Sparse packets follow real mesh edges; no random particle field.
      for (let n=0;n<5;n++) {
        const path = lines[(140+n*213) % lines.length];
        const t = (angle * 3 + n * .2) % 1;
        ctx.fillStyle = n === 0 ? '#d82c2c' : '#d8e5ff';
        ctx.fillRect(path.a.x+(path.b.x-path.a.x)*t-2,path.a.y+(path.b.y-path.a.y)*t-3,4,6);
      }
      canvas.parentElement.classList.add('ready');
    }
    if (sphereVisible && motionAllowed() && !compact.matches) frameId=requestAnimationFrame(drawSphere);
  }
  function updateMotion() {
    document.body.classList.toggle('motion-paused', !motionAllowed());
    document.querySelectorAll('.motion-toggle').forEach(button => {
      button.textContent = reduced.matches ? 'REDUCED MOTION / STATIC' : userPaused ? 'RESUME MOTION' : 'PAUSE MOTION';
      button.disabled = reduced.matches;
      button.setAttribute('aria-pressed', String(userPaused || reduced.matches));
    });
    if (frameId) cancelAnimationFrame(frameId);
    frameId=0;
    if (sphereVisible && motionAllowed() && !compact.matches) frameId=requestAnimationFrame(drawSphere);
  }
  document.querySelectorAll('.motion-toggle').forEach(button => button.addEventListener('click', () => {
    userPaused = !userPaused;
    try { sessionStorage.setItem('kv-static-motion', String(userPaused)); } catch (_) {}
    updateMotion();
  }));
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        entry.target.classList.toggle('in-view', entry.isIntersecting);
        if (entry.target.id === 'top') sphereVisible=entry.isIntersecting;
      }); updateMotion();
    });
    document.querySelectorAll('[data-motion-scene]').forEach(el=>observer.observe(el));
    cleanup.push(()=>observer.disconnect());
  }
  reduced.addEventListener('change',updateMotion);
  compact.addEventListener('change',updateMotion);
  document.addEventListener('visibilitychange',updateMotion);
  updateMotion();

  const problem = $('problem-track');
  let problemIndex=0;
  function selectProblem(index) {
    problemIndex=Math.max(0,Math.min(1,index));
    problem.scrollTo({left:problem.clientWidth*problemIndex,behavior:reduced.matches?'instant':'smooth'});
    $('problem-count').textContent=`0${problemIndex+1} / 02`;
    $('problem-prev').disabled=problemIndex===0;
    $('problem-next').disabled=problemIndex===1;
  }
  $('problem-prev').addEventListener('click',()=>selectProblem(problemIndex-1));
  $('problem-next').addEventListener('click',()=>selectProblem(problemIndex+1));
  problem.addEventListener('keydown',e=>{
    if(e.key==='ArrowRight'||e.key==='ArrowLeft') {e.preventDefault();selectProblem(problemIndex+(e.key==='ArrowRight'?1:-1));}
  });
  problem.addEventListener('scrollend',()=>{
    problemIndex=Math.round(problem.scrollLeft/problem.clientWidth);
    $('problem-count').textContent=`0${problemIndex+1} / 02`;
    $('problem-prev').disabled=problemIndex===0; $('problem-next').disabled=problemIndex===1;
  });
  $('problem-prev').disabled=true;
  let stage=0, manualStage=false;
  const pinned=matchMedia('(min-width: 1201px) and (min-height: 800px) and (prefers-reduced-motion: no-preference)');
  const stageButtons=[...document.querySelectorAll('[data-stage]')];
  function selectStage(index) {
    stage=Math.max(0,Math.min(6,index));
    stageButtons.forEach((button,i)=>{button.setAttribute('aria-pressed',String(i===stage));button.parentElement.classList.toggle('is-active',i===stage);});
    const button=stageButtons[stage];
    $('pipeline-status').textContent=`${button.querySelector('span').textContent} / ${button.nextElementSibling.textContent}${stage===6?' DEMO COMPLETE. No asset was registered.':''}`;
    $('pipeline-count').textContent=`0${stage+1} / 07`;
    $('pipeline-prev').disabled=stage===0; $('pipeline-next').disabled=stage===6;
    if(pinned.matches) {
      const rail=$('pipeline-rail');
      rail.scrollTo({left:button.parentElement.offsetLeft-rail.offsetLeft,behavior:motionAllowed()?'smooth':'instant'});
    }
  }
  function manualSelect(index){manualStage=true;$('pipeline-follow').hidden=!pinned.matches;selectStage(index);}
  stageButtons.forEach((button,i)=>button.addEventListener('click',()=>manualSelect(i)));
  $('pipeline-prev').addEventListener('click',()=>manualSelect(stage-1));
  $('pipeline-next').addEventListener('click',()=>manualSelect(stage+1));
  $('pipeline-reset').addEventListener('click',()=>manualSelect(0));
  let scrollFrame=0,technologyVisible=false;
  function followScroll(){
    scrollFrame=0;
    if(!pinned.matches||manualStage||!technologyVisible||!motionAllowed())return;
    const section=$('technology');
    const fraction=Math.max(0,Math.min(1,-section.getBoundingClientRect().top/(section.offsetHeight-innerHeight)));
    const next=Math.min(6,Math.floor(fraction*7));
    if(next!==stage)selectStage(next);
  }
  const onScroll=()=>{if(technologyVisible&&!scrollFrame)scrollFrame=requestAnimationFrame(followScroll);};
  window.addEventListener('scroll',onScroll,{passive:true});
  cleanup.push(()=>{window.removeEventListener('scroll',onScroll);cancelAnimationFrame(scrollFrame);});
  if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{technologyVisible=entries[0].isIntersecting;});observer.observe($('technology'));cleanup.push(()=>observer.disconnect());}
  $('pipeline-follow').addEventListener('click',()=>{manualStage=false;$('pipeline-follow').hidden=true;followScroll();});
  pinned.addEventListener('change',()=>{$('pipeline-follow').hidden=!pinned.matches||!manualStage;});
  selectStage(0);

  let recipient='B';
  let recipients={B:'READ',C:'NONE'};
  const recipientButtons=[...document.querySelectorAll('[data-recipient]')];
  function selectRecipient(value) {
    recipient=value; $('recipient-title').textContent=`USER ${value}`;
    $('demo-permission').value=recipients[value];
    recipientButtons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.recipient===value)));
    $('access-result').textContent=`EXAMPLE / USER ${value} · ${recipients[value]} · ${recipients[value]==='NONE'?'NO CURRENT ACCESS':'KEY WRAPPED'}`;
  }
  recipientButtons.forEach(button=>button.addEventListener('click',()=>selectRecipient(button.dataset.recipient)));
  $('demo-no-expiry').addEventListener('change',()=>{$('demo-until').disabled=$('demo-no-expiry').checked;});
  $('access-form').addEventListener('submit',e=>{
    e.preventDefault();
    const start=Date.parse(`${$('demo-from').value}Z`), end=$('demo-no-expiry').checked?Infinity:Date.parse(`${$('demo-until').value}Z`);
    const invalid=!Number.isFinite(start)||Number.isNaN(end)||end<=start;
    $('demo-until').setAttribute('aria-invalid',String(invalid));
    $('demo-until').setAttribute('aria-describedby','access-error');
    $('access-error').textContent=invalid?'Valid until must be later than valid from.':'';
    if(invalid){$('demo-until').focus();return;}
    const permission=$('demo-permission').value;
    recipients[recipient]=permission;
    const clock=Date.parse('2026-09-21T10:00:00Z');
    const status=permission==='NONE'?'NO CURRENT ACCESS':start>clock?'SCHEDULED':end<=clock?'EXPIRED':'ACTIVE';
    $('access-result').textContent=`SIMULATED ${permission==='NONE'?'REMOVAL':'GRANT'} COMPLETE / USER ${recipient} · ${permission} · ${status} · ${permission==='NONE'?'KEY INACTIVE':'KEY WRAPPED'}`;
    recipientButtons.find(b=>b.dataset.recipient===recipient).querySelector('span').textContent=permission;
  });
  $('access-form').addEventListener('reset',()=>{
    recipients={B:'READ',C:'NONE'};
    requestAnimationFrame(()=>{selectRecipient('B');$('demo-until').disabled=false;$('demo-until').removeAttribute('aria-invalid');$('access-error').textContent='';recipientButtons.forEach(b=>b.querySelector('span').textContent=recipients[b.dataset.recipient]);});
  });
  function compare(match) {
    const expected=$('expected-hash').textContent;
    $('computed-hash').textContent=match?expected:`${expected.slice(0,-1)}1`;
    $('integrity-result').innerHTML=`<span>ACCESS / EXAMPLE VALID</span><span>VERSION / 04</span><span>HASH / ${match?'MATCH':'MISMATCH'}</span><span>DEMONSTRATION / ${match?'COMPARISON COMPLETE':'INTEGRITY NOT ESTABLISHED'}</span>`;
    document.querySelector('.hash-comparison').style.borderTopColor=match?'var(--kv-blue)':'var(--kv-red)';
  }
  $('integrity-match').addEventListener('click',()=>compare(true));
  $('integrity-mismatch').addEventListener('click',()=>compare(false));
  let rotation=0;
  const rotationLabels=['Initial state: A, B and C have current access.','Permission removed for C. Current key has not rotated.','Remaining recipients re-evaluated: owner A and user B.','Current version decrypted in the owner browser.','K2 generated; new ciphertext prepared locally.','K2 wrapped for A and B only. Version commit still pending.','Version 04 committed and synchronized. A and B receive current keys. C has no current access.'];
  function renderRotation() {
    $('rotation-status').textContent=`${rotation?'SIMULATED / ':''}${rotationLabels[rotation]}`;
    $('rotation-version').textContent=`VERSION / ${rotation===6?'04':'03'}`;
    $('rotation-key').textContent=rotation>=4?'K2':'K1';
    $('rotation-user-c').textContent=rotation?'USER C / NO CURRENT ACCESS':'USER C / READ';
    $('rotation-user-c').classList.toggle('revoked',rotation>0);
    [...$('rotation-stages').children].forEach((li,i)=>li.classList.toggle('done',i<rotation));
    $('rotation-next').disabled=rotation===6;
  }
  $('rotation-next').addEventListener('click',()=>{rotation=Math.min(6,rotation+1);renderRotation();});
  $('rotation-reset').addEventListener('click',()=>{rotation=0;renderRotation();});
  document.querySelectorAll('.data-matrix tbody tr').forEach(row=>[...row.querySelectorAll('td')].forEach((cell,i)=>cell.dataset.label=['Browser','MongoDB','GridFS','Sepolia'][i]));
  window.addEventListener('pagehide',()=>{cancelAnimationFrame(frameId);cleanup.forEach(fn=>fn());});
})();
