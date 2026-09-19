/* =========================================================
   components.js — app shell, nav, icons, reusable card markup
   ========================================================= */
(function(){

  const Icon = {
    events:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>',
    ticket:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8z"/><path d="M13 6v12" stroke-dasharray="2 3"/></svg>',
    megaphone:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11v2a2 2 0 0 0 2 2h1l3 5V4l-3 5H5a2 2 0 0 0-2 2z"/><path d="M14 8a4 4 0 0 1 0 8M18 5a8 8 0 0 1 0 14"/></svg>',
    gauge:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 13l4-4M8 21h8"/></svg>',
    users:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17.5" cy="8.5" r="2.6"/><path d="M15.5 12.2A5.7 5.7 0 0 1 21.2 18"/></svg>',
    checkin:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM19 14h2M14 19h2M19 18v3"/></svg>',
    logout:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>',
    search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
    bell:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>',
    plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    download:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16"/></svg>',
    menu:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>',
    clock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
    pin:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.5 7-11.5A7 7 0 0 0 5 9.5C5 14.5 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.3"/></svg>',
    edit:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
    trash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V6z"/></svg>',
    empty:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18"/></svg>',
    settings:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V21a2 2 0 0 1-4 0v-.09A1.7 1.7 0 0 0 9 19.35a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.65 15a1.7 1.7 0 0 0-1.56-1.04H3a2 2 0 0 1 0-4h.09A1.7 1.7 0 0 0 4.65 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.65a1.7 1.7 0 0 0 1.04-1.56V3a2 2 0 0 1 4 0v.09A1.7 1.7 0 0 0 15 4.65a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.35 9a1.7 1.7 0 0 0 1.56 1.04H21a2 2 0 0 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15z"/></svg>',
    eye:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>',
    eyeOff:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a21.6 21.6 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 5c7 0 11 7 11 7a21.6 21.6 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24"/><path d="M1 1l22 22"/></svg>',
  };

  function navConfig(role){
    const base = [
      {group:'Events', items:[
        {path:'/events', label:'Browse Events', icon:'events'},
        {path:'/my-registrations', label:'My Registrations', icon:'ticket'},
        {path:'/announcements', label:'Announcements', icon:'megaphone'},
      ]}
    ];
    if(role==='faculty'){
      base.push({group:'Faculty', items:[
        {path:'/admin/announcements', label:'Manage Announcements', icon:'edit'},
      ]});
    }
    if(role==='admin'){
      base.push({group:'Admin', items:[
        {path:'/admin', label:'Dashboard', icon:'gauge'},
        {path:'/admin/events', label:'Manage Events', icon:'events'},
        {path:'/admin/checkin', label:'Check-in', icon:'checkin'},
        {path:'/admin/announcements', label:'Manage Announcements', icon:'edit'},
        {path:'/admin/users', label:'Manage Users', icon:'users'},
        {path:'/admin/audit-log', label:'Audit Log', icon:'clock'},
      ]});
    }
    base.push({group:'Account', items:[
      {path:'/account', label:'Account Settings', icon:'settings'},
    ]});
    return base;
  }

  function shell({activePath, title, sub, actions, body, user}){
    const groups = navConfig(user.role);
    const navHtml = groups.map(g=>`
      <div class="nav-group">
        <div class="nav-label">${g.group}</div>
        ${g.items.map(it=>`
          <a class="nav-link ${activePath===it.path?'active':''}" data-nav="${it.path}">
            <span class="nav-icon">${Icon[it.icon]}</span>${it.label}
          </a>`).join('')}
      </div>`).join('');

    return `
    <div class="shell">
      <div class="sidebar-scrim hidden" id="sidebar-scrim"></div>
      <aside class="sidebar" id="sidebar">
        <div class="brand">
          <div class="brand-mark">CP</div>
          <div>
            <div class="brand-name">Campus Pass</div>
            <div class="brand-sub">Event System</div>
          </div>
        </div>
        <nav style="flex:1; overflow-y:auto;">${navHtml}</nav>
        <div class="sidebar-foot">
          <div class="user-chip">
            <div class="user-avatar">${Utils.initials(user.name)}</div>
            <div>
              <div class="user-meta-name">${Utils.esc(user.name)}</div>
              <div class="user-meta-role">${user.role}</div>
            </div>
          </div>
          <span class="logout-link" data-action="logout">Log out</span>
        </div>
      </aside>
      <div class="main">
        <div class="mobile-topbar">
          <div style="display:flex;align-items:center;gap:10px;">
            <button class="icon-btn" style="border-color:rgba(255,255,255,.25);color:#fff;" data-action="toggle-sidebar">${Icon.menu}</button>
            <strong style="font-family:var(--font-display);">Campus Pass</strong>
          </div>
          ${notifBell(user)}
        </div>
        <div class="topbar">
          <div>
            <div class="topbar-title">${title}</div>
            ${sub?`<div class="topbar-sub">${sub}</div>`:''}
          </div>
          <div class="topbar-actions">
            ${notifBellDesktop(user)}
            ${actions||''}
          </div>
        </div>
        <div class="content">${body}</div>
      </div>
    </div>`;
  }

  function notifBellDesktop(user){
    const notifs = Store.listNotifications(user.id);
    const unread = notifs.filter(n=>!n.read).length;
    return `<button class="icon-btn" style="position:relative;" data-action="open-notifs">${Icon.bell}${unread?'<span class="notif-dot"></span>':''}</button>`;
  }
  function notifBell(user){
    const notifs = Store.listNotifications(user.id);
    const unread = notifs.filter(n=>!n.read).length;
    return `<button class="icon-btn" style="position:relative;border-color:rgba(255,255,255,.25);color:#fff;" data-action="open-notifs">${Icon.bell}${unread?'<span class="notif-dot"></span>':''}</button>`;
  }

  function openNotifs(user){
    const notifs = Store.listNotifications(user.id);
    Utils.openModal(`
      <div class="modal-head"><h3>Notifications</h3><button class="modal-close" data-action="close-modal">&times;</button></div>
      <div class="modal-body">
        ${notifs.length ? notifs.map(n=>`
          <div style="padding:10px 0;border-bottom:1px solid var(--line);">
            <div style="font-size:13px;color:${n.read?'var(--slate)':'var(--ink)'};font-weight:${n.read?'400':'600'};">${Utils.esc(n.message)}</div>
            <div style="font-size:11px;color:var(--slate-light);margin-top:3px;">${Utils.fmtDateTime(n.createdAt)}</div>
          </div>`).join('') : `<p style="text-align:center;padding:20px 0;">No notifications yet.</p>`}
      </div>`);
    Store.markAllRead(user.id);
  }

  function eventStatusOf(event){
    const now = Date.now();
    if(event.status==='draft') return 'draft';
    if(event.status==='archived') return 'archived';
    if(now > event.endDate) return 'past';
    if(now >= event.startDate) return 'ongoing';
    return 'upcoming';
  }
  function eventStatusBadge(event){
    const s = eventStatusOf(event);
    const map = {
      upcoming:['badge-gold','Upcoming'], ongoing:['badge-forest','Happening Now'],
      past:['badge-slate','Past'], draft:['badge-slate','Draft'], archived:['badge-slate','Archived']
    };
    const [cls,label] = map[s];
    return `<span class="badge ${cls}">${label}</span>`;
  }

  function eventTicketCard(event, opts){
    opts = opts || {};
    const totalCap = event.activities.reduce((a,x)=>a+(x.capacity||0),0);
    const totalReg = event.activities.reduce((a,x)=>a+Store.activityCount(event.id,x.id),0);
    const pct = totalCap ? Math.min(100, Math.round(totalReg/totalCap*100)) : 0;
    const left = Utils.timeUntil(event.startDate);
    return `
    <div class="ticket" data-open-event="${event.id}" style="cursor:pointer;">
      <div class="ticket-body">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
          <div>
            <div class="ticket-cat"><span class="dot"></span>${Utils.esc(event.category)}</div>
            <h3 class="ticket-title">${Utils.esc(event.title)}</h3>
          </div>
          ${eventStatusBadge(event)}
        </div>
        <div class="ticket-meta">
          <span>${Icon.clock}&nbsp;${Utils.fmtDateRange(event.startDate,event.endDate)}</span>
          <span>${Icon.pin}&nbsp;${Utils.esc(event.location||'TBA')}</span>
        </div>
        <p class="ticket-desc">${Utils.esc(event.description.slice(0,140))}${event.description.length>140?'…':''}</p>
        <div class="ticket-foot">
          <div style="flex:1;">
            <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
            <div style="font-size:11px;color:var(--slate-light);margin-top:4px;">${totalReg} registered${totalCap?' of '+totalCap+' slots':''}</div>
          </div>
          ${left?`<span class="badge badge-coral">${left}</span>`:''}
        </div>
      </div>
      <div class="ticket-perf"></div>
      <div class="ticket-stub">
        <div class="ticket-eyebrow">Activities</div>
        <div style="font-family:var(--font-display);font-size:26px;font-weight:600;">${event.activities.length}</div>
        <div class="ticket-code">${Utils.audienceLabel(event).split(' ')[0]}</div>
      </div>
    </div>`;
  }

  function confirmDialog(message, onConfirm, opts){
    opts = opts || {};
    const backdrop = Utils.openModal(`
      <div class="modal-body" style="text-align:center;padding-top:28px;">
        <h3 style="margin-bottom:10px;">${opts.title||'Are you sure?'}</h3>
        <p style="margin-bottom:22px;">${message}</p>
        <div style="display:flex;gap:10px;justify-content:center;">
          <button class="btn btn-outline" data-action="close-modal">Cancel</button>
          <button class="btn ${opts.danger?'btn-danger':'btn-primary'}" id="confirm-yes">${opts.confirmLabel||'Confirm'}</button>
        </div>
      </div>`);
    backdrop.querySelector('#confirm-yes').addEventListener('click', ()=>{ Utils.closeModal(); onConfirm(); });
  }

  window.Comp = { Icon, shell, eventTicketCard, eventStatusOf, eventStatusBadge, openNotifs, confirmDialog };
})();
