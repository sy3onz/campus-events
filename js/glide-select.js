/* =========================================================
   glide-select.js — vanilla-JS port of the React Bits
   "GlideSelect" component (variant: JS-CSS).

   Source ported from https://reactbits.dev/r/GlideSelect-JS-CSS.json
   This app has no React/JSX build step (see faulty-terminal.js for
   the same situation), so the original hooks-based component is
   reimplemented here as GlideSelect.create(container, options),
   which returns a controller {destroy, getValue, setValue}. The
   markup and CSS classes match the registry source's CSS 1:1 (see
   the ".glide-select*" rules in css/style.css) — only the trigger's
   default colors were pointed at this app's palette.
   ========================================================= */
(function(){
  const SIZES = { sm:{chip:28,row:26,font:12}, md:{chip:32,row:30,font:13}, lg:{chip:44,row:40,font:14} };
  const GAP = 1, MENU_GAP = 6;
  let uid = 0;

  function norm(o){ return (typeof o==='string') ? {value:o, label:o} : o; }
  function textOf(it){ return (typeof it.label==='string') ? it.label : it.value; }
  function typeaheadIndex(items, from, ch){
    const c = ch.toLowerCase(); const n = items.length;
    for(let k=1;k<=n;k++){ const i=(from+k)%n; if(textOf(items[i]).toLowerCase().indexOf(c)===0) return i; }
    return from;
  }
  const ICON_CHEVRON = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';
  const ICON_CHECK = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';

  function create(container, opts){
    opts = opts || {};
    const items = (opts.options || []).map(norm);
    let current = opts.value !== undefined ? opts.value : (opts.defaultValue !== undefined ? opts.defaultValue : '');
    const onChange = typeof opts.onChange==='function' ? opts.onChange : function(){};
    const placeholder = opts.placeholder || 'Select\u2026';
    const showTags = opts.showTags !== false;
    const size = SIZES[opts.size] ? opts.size : 'md';
    const S = SIZES[size];
    const step = S.row + GAP;
    const popDuration = opts.popDuration || 180;
    const popOut = Math.round(popDuration*2/3);
    const glideDuration = opts.glideDuration || 220;
    const rememberPosition = opts.rememberPosition !== false;
    const placement = opts.placement || 'bottom';
    const align = opts.align || 'left';
    const disabled = !!opts.disabled;
    const ariaLabel = opts.ariaLabel || 'Select';
    const id = 'gs-' + (++uid);

    let phase = 'closed'; // closed | open | closing
    let active = null;
    let side = placement;
    let closeTimer = null;
    let scrub = null;
    let menu = null, list = null, pill = null;

    const root = document.createElement('div');
    root.className = 'glide-select';
    root.dataset.size = size;
    if(disabled) root.dataset.disabled = '';
    const varMap = {
      '--gs-accent': opts.accentColor, '--gs-surface': opts.surfaceColor,
      '--gs-highlight': opts.highlightColor, '--gs-text': opts.textColor,
      '--gs-menu-w': opts.menuWidth!==undefined ? opts.menuWidth+'px' : undefined,
      '--gs-pop': popDuration+'ms', '--gs-pop-out': popOut+'ms', '--gs-glide': glideDuration+'ms',
      '--gs-chip': S.chip+'px', '--gs-row': S.row+'px', '--gs-font': S.font+'px'
    };
    if(opts.radius!==undefined){
      varMap['--gs-radius'] = opts.radius+'px';
      varMap['--gs-inner-radius'] = Math.max(3, opts.radius-4)+'px';
    }
    Object.keys(varMap).forEach(k=>{ if(varMap[k]!==undefined) root.style.setProperty(k, varMap[k]); });

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'glide-select__trigger';
    trigger.setAttribute('role','combobox');
    trigger.setAttribute('aria-haspopup','listbox');
    trigger.setAttribute('aria-expanded','false');
    trigger.setAttribute('aria-label', ariaLabel);
    if(disabled) trigger.disabled = true;

    const label = document.createElement('span');
    label.className = 'glide-select__label';
    const chevron = document.createElement('span');
    chevron.className = 'glide-select__chevron';
    chevron.setAttribute('aria-hidden','true');
    chevron.innerHTML = ICON_CHEVRON;
    trigger.appendChild(label);
    trigger.appendChild(chevron);
    root.appendChild(trigger);
    container.appendChild(root);

    function selectedIndex(){ return items.findIndex(it=> it.value===current); }

    function renderLabel(){
      const i = selectedIndex();
      label.textContent = i>=0 ? textOf(items[i]) : placeholder;
      if(i<0) label.setAttribute('data-empty',''); else label.removeAttribute('data-empty');
    }
    renderLabel();

    function step_(i){ return i*step; }

    function movePill(toIndex, instant){
      if(!pill) return;
      if(toIndex===null){ pill.style.opacity='0'; return; }
      if(instant) pill.style.transitionDuration = '0ms, 150ms';
      pill.style.transform = 'translateY('+step_(toIndex)+'px)';
      pill.style.opacity = '1';
      if(instant){ void pill.offsetHeight; pill.style.transitionDuration = ''; }
    }

    function rowAt(y){
      if(!scrub) return null;
      const i = Math.floor((y - scrub.top - 4) / step);
      return (i>=0 && i<items.length) ? i : null;
    }

    function onListOver(e){
      if(e.pointerType==='touch' || scrub) return;
      const row = e.target.closest('[data-index]');
      if(!row) return;
      const i = Number(row.dataset.index);
      if(i!==active){ active=i; movePill(active, false); }
    }
    function onListDown(e){
      if(scrub) return;
      try{ list.setPointerCapture(e.pointerId); }catch(err){}
      scrub = { id:e.pointerId, top:list.getBoundingClientRect().top };
      const i = rowAt(e.clientY);
      active = i; movePill(active, true);
    }
    function onListMove(e){
      if(!scrub || scrub.id!==e.pointerId) return;
      const i = rowAt(e.clientY);
      if(i!==active){ active=i; movePill(active, false); }
    }
    function onListUp(e){
      if(!scrub || scrub.id!==e.pointerId) return;
      const i = (e.type==='pointerup') ? rowAt(e.clientY) : null;
      scrub = null;
      if(i!==null) pick(i, false);
      else if(!rememberPosition){ active=null; movePill(null,false); }
    }

    function buildMenu(){
      menu = document.createElement('div');
      menu.className = 'glide-select__menu';
      menu.dataset.state = 'open';
      menu.dataset.side = side;
      menu.dataset.align = align;
      list = document.createElement('div');
      list.className = 'glide-select__list';
      list.id = id+'-list';
      list.setAttribute('role','listbox');
      list.setAttribute('aria-label', ariaLabel);
      if(active!==null) list.dataset.live = '';
      pill = document.createElement('span');
      pill.className = 'glide-select__pill';
      pill.setAttribute('aria-hidden','true');
      list.appendChild(pill);

      items.forEach((it,i)=>{
        const row = document.createElement('div');
        row.className = 'glide-select__option';
        row.id = id+'-'+i;
        row.setAttribute('role','option');
        row.dataset.index = i;
        row.setAttribute('aria-selected', i===selectedIndex() ? 'true' : 'false');
        const name = document.createElement('span');
        name.className = 'glide-select__name';
        name.textContent = textOf(it);
        row.appendChild(name);
        if(showTags && it.tag){
          const tag = document.createElement('span');
          tag.className = 'glide-select__tag';
          tag.textContent = it.tag;
          row.appendChild(tag);
        }
        const check = document.createElement('span');
        check.className = 'glide-select__check';
        check.setAttribute('aria-hidden','true');
        if(i===selectedIndex()) check.setAttribute('data-on','');
        check.innerHTML = ICON_CHECK;
        row.appendChild(check);
        row.addEventListener('click', ()=> pick(i, false));
        list.appendChild(row);
      });

      list.addEventListener('pointerover', onListOver);
      list.addEventListener('pointerleave', ()=>{ if(!scrub && !rememberPosition){ active=null; movePill(null,false); } });
      list.addEventListener('pointerdown', onListDown);
      list.addEventListener('pointermove', onListMove);
      list.addEventListener('pointerup', onListUp);
      list.addEventListener('pointercancel', onListUp);
      list.addEventListener('lostpointercapture', onListUp);

      menu.appendChild(list);
      root.appendChild(menu);
    }

    function positionSide(){
      const r = root.getBoundingClientRect();
      const needH = (menu ? menu.offsetHeight : (items.length*step + 8)) + MENU_GAP;
      if(placement==='bottom' && r.bottom+needH>window.innerHeight) side='top';
      else if(placement==='top' && r.top-needH<0) side='bottom';
      else side = placement;
      const originSide = side==='bottom' ? 'top' : 'bottom';
      root.style.setProperty('--gs-origin', originSide+' '+align);
      if(menu) menu.dataset.side = side;
    }

    function onDocDown(e){ if(!root.contains(e.target)) close(false); }

    function open(viaKey){
      if(disabled || phase==='open') return;
      clearTimeout(closeTimer);
      buildMenu();
      positionSide();
      const sel = selectedIndex();
      active = sel>=0 ? sel : (viaKey ? 0 : null);
      phase = 'open';
      trigger.setAttribute('aria-expanded','true');
      movePill(active, true);
      document.addEventListener('pointerdown', onDocDown, true);
    }
    function close(instant){
      trigger.setAttribute('aria-expanded','false');
      active = null;
      document.removeEventListener('pointerdown', onDocDown, true);
      clearTimeout(closeTimer);
      if(!menu){ phase='closed'; return; }
      if(instant){ menu.remove(); menu=null; list=null; pill=null; phase='closed'; return; }
      menu.dataset.state = 'closed';
      phase = 'closing';
      closeTimer = setTimeout(()=>{ if(menu){ menu.remove(); menu=null; list=null; pill=null; } phase='closed'; }, popOut+20);
    }
    function pick(i, viaKey){
      const it = items[i];
      if(!it){ close(true); return; }
      if(it.value !== current){
        current = it.value;
        renderLabel();
        root.dataset.swap = '';
        label.addEventListener('animationend', function h(){ delete root.dataset.swap; label.removeEventListener('animationend', h); });
        onChange(it.value, it);
      }
      close(true);
      if(!viaKey) trigger.focus({preventScroll:true});
    }

    trigger.addEventListener('pointerdown', (e)=>{
      if(e.button!==0 || disabled) return;
      trigger.focus({preventScroll:true});
      if(phase==='open') close(false); else open(false);
    });
    trigger.addEventListener('keydown', (e)=>{
      const k = e.key, n = items.length;
      const cur = active!==null ? active : Math.max(0, selectedIndex());
      if(phase!=='open'){
        if(k==='Enter' || k===' ' || k==='ArrowDown' || k==='ArrowUp'){ e.preventDefault(); open(true); }
        return;
      }
      function go(i){ e.preventDefault(); active = Math.min(n-1, Math.max(0,i)); movePill(active, true); }
      if(k==='ArrowDown' || k==='ArrowUp') go(cur + (k==='ArrowDown' ? 1 : -1));
      else if(k==='Home') go(0);
      else if(k==='End') go(n-1);
      else if(k==='Enter' || k===' '){ e.preventDefault(); pick(cur, true); }
      else if(k==='Escape' || k==='Tab'){ if(k==='Escape') e.preventDefault(); close(true); }
      else if(k.length===1 && !e.metaKey && !e.ctrlKey && !e.altKey) go(typeaheadIndex(items, cur, k));
    });

    return {
      el: root,
      getValue(){ return current; },
      setValue(v){ current = v; renderLabel(); },
      destroy(){
        close(true);
        document.removeEventListener('pointerdown', onDocDown, true);
        if(root.parentNode) root.parentNode.removeChild(root);
      }
    };
  }

  window.GlideSelect = { create };
})();
