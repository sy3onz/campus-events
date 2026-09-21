/* =========================================================
   card-swap.js — vanilla-JS port of the React Bits "CardSwap"
   component (variant: JS-CSS, animated with GSAP).

   Source ported from https://reactbits.dev/r/CardSwap-JS-CSS.json
   The original is a React component built on refs/useEffect; the
   card-stacking math and GSAP timeline are unchanged here, just
   driven against plain DOM nodes instead of React refs. GSAP is
   loaded globally via a CDN <script> tag in index.html (same
   pattern this project already uses for the QR/PDF libraries). If
   GSAP failed to load (offline), mount() falls back to a static
   stack — never throws, never leaves a blank section, matching
   faulty-terminal.js's "always resolve" contract.

   CardSwap.mount(container, cards, opts) -> controller {destroy()}
     cards: array of { html, onClick } — html is the card's inner
       markup (string); onClick(index) fires on click/keyboard-enter.
   ========================================================= */
(function(){
  function makeSlot(i, distX, distY, total){
    return { x: i*distX, y: -i*distY, z: -i*distX*1.5, zIndex: total-i };
  }
  function placeNow(gsap, el, slot, skew){
    gsap.set(el, {
      x:slot.x, y:slot.y, z:slot.z,
      xPercent:-50, yPercent:-50, skewY:skew,
      transformOrigin:'center center', zIndex:slot.zIndex, force3D:true
    });
  }
  function placeStatic(el, slot, skew){
    el.style.zIndex = slot.zIndex;
    el.style.transform = 'translate(-50%,-50%) translate3d('+slot.x+'px,'+slot.y+'px,'+slot.z+'px) skewY('+skew+'deg)';
  }

  function mount(container, cards, opts){
    opts = opts || {};
    container.innerHTML = '';
    const width = opts.width || 340;
    const height = opts.height || 220;
    const cardDistance = opts.cardDistance!==undefined ? opts.cardDistance : 60;
    const verticalDistance = opts.verticalDistance!==undefined ? opts.verticalDistance : 70;
    const delay = opts.delay || 5000;
    const pauseOnHover = !!opts.pauseOnHover;
    const skewAmount = opts.skewAmount!==undefined ? opts.skewAmount : 6;
    const easing = opts.easing || 'elastic';
    const onCardClick = typeof opts.onCardClick==='function' ? opts.onCardClick : function(){};

    const wrap = document.createElement('div');
    wrap.className = 'card-swap-container';
    wrap.style.width = width+'px';
    wrap.style.height = height+'px';
    container.appendChild(wrap);

    const els = cards.map((card, i)=>{
      const el = document.createElement('div');
      el.className = 'card-swap-card';
      el.style.width = width+'px';
      el.style.height = height+'px';
      el.innerHTML = card.html || '';
      el.setAttribute('tabindex','0');
      el.setAttribute('role','button');
      el.addEventListener('click', ()=> onCardClick(i));
      el.addEventListener('keydown', (e)=>{ if(e.key==='Enter' || e.key===' '){ e.preventDefault(); onCardClick(i); } });
      wrap.appendChild(el);
      return el;
    });

    const total = els.length;
    let order = els.map((_,i)=>i);
    let intervalId = null;
    let destroyed = false;

    const gsap = window.gsap;
    if(!gsap || total===0){
      // No GSAP (offline) or nothing to show: lay the cards out statically,
      // most-recent on top, no animation — the page still reads fine.
      els.forEach((el,i)=> placeStatic(el, makeSlot(i, cardDistance, verticalDistance, total), skewAmount));
      return { destroy(){ if(wrap.parentNode) wrap.parentNode.removeChild(wrap); } };
    }

    const config = (easing==='elastic')
      ? { ease:'elastic.out(0.6,0.9)', durDrop:2, durMove:2, durReturn:2, promoteOverlap:0.9, returnDelay:0.05 }
      : { ease:'power1.inOut', durDrop:0.8, durMove:0.8, durReturn:0.8, promoteOverlap:0.45, returnDelay:0.2 };

    els.forEach((el,i)=> placeNow(gsap, el, makeSlot(i, cardDistance, verticalDistance, total), skewAmount));

    function swap(){
      if(order.length<2) return;
      const front = order[0];
      const rest = order.slice(1);
      const elFront = els[front];
      const tl = gsap.timeline();

      tl.to(elFront, { y:'+=500', duration:config.durDrop, ease:config.ease });
      tl.addLabel('promote', '-='+(config.durDrop*config.promoteOverlap));
      rest.forEach((idx,i)=>{
        const el = els[idx];
        const slot = makeSlot(i, cardDistance, verticalDistance, total);
        tl.set(el, {zIndex:slot.zIndex}, 'promote');
        tl.to(el, {x:slot.x, y:slot.y, z:slot.z, duration:config.durMove, ease:config.ease}, 'promote+='+(i*0.15));
      });
      const backSlot = makeSlot(total-1, cardDistance, verticalDistance, total);
      tl.addLabel('return', 'promote+='+(config.durMove*config.returnDelay));
      tl.call(()=>{ gsap.set(elFront, {zIndex:backSlot.zIndex}); }, null, 'return');
      tl.to(elFront, {x:backSlot.x, y:backSlot.y, z:backSlot.z, duration:config.durReturn, ease:config.ease}, 'return');
      tl.call(()=>{ order = rest.concat([front]); });
    }

    function startInterval(){ intervalId = window.setInterval(swap, delay); }

    swap();
    startInterval();

    let onEnter, onLeave;
    if(pauseOnHover){
      onEnter = ()=>{ gsap.globalTimeline.pause(); clearInterval(intervalId); };
      onLeave = ()=>{ gsap.globalTimeline.play(); startInterval(); };
      wrap.addEventListener('mouseenter', onEnter);
      wrap.addEventListener('mouseleave', onLeave);
    }

    return {
      destroy(){
        if(destroyed) return;
        destroyed = true;
        clearInterval(intervalId);
        if(pauseOnHover){
          wrap.removeEventListener('mouseenter', onEnter);
          wrap.removeEventListener('mouseleave', onLeave);
        }
        gsap.killTweensOf(els);
        if(wrap.parentNode) wrap.parentNode.removeChild(wrap);
      }
    };
  }

  window.CardSwap = { mount };
})();
