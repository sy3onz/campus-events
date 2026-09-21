/* =========================================================
   view.announcements.js — announcement feed for all users
   ========================================================= */
(function(){
  function renderAnnouncements(user){
    const root = document.getElementById('app-root');
    const now = Date.now();
    const items = Store.listAnnouncements().filter(a=>{
      if(a.expiresAt && a.expiresAt < now) return false;
      if(user.role==='admin') return true;
      const aud = a.audience || {type:'everyone', courses:[]};
      if(aud.type==='everyone') return true;
      if(aud.type==='staff') return user.role==='faculty';
      if(aud.type==='courses'){
        const mine = user.course || user.strand || '';
        return aud.courses && aud.courses.includes(mine);
      }
      return true;
    });
    const body = items.length ? items.map(a=>{
      const ev = a.eventId ? Store.getEvent(a.eventId) : null;
      return `
      <div class="card card-pad" style="margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;">
          <h3 style="font-size:16px;">${Utils.esc(a.title)}</h3>
          <span style="font-size:11.5px;color:var(--slate-light);white-space:nowrap;">${Utils.fmtDateTime(a.createdAt)}</span>
        </div>
        ${ev?`<span class="badge badge-gold" style="margin-bottom:8px;display:inline-flex;">${Utils.esc(ev.title)}</span>`:''}
        <p style="font-size:13.5px;color:var(--ink);margin-top:8px;">${Utils.esc(a.body)}</p>
      </div>`;
    }).join('') : `
      <div class="empty-state">
        ${Comp.Icon.empty}
        <h3>No announcements yet</h3>
        <p>Schedule changes and reminders from event organizers will appear here.</p>
      </div>`;

    root.innerHTML = Comp.shell({
      activePath:'/announcements', title:'Announcements', sub:'Schedule changes and reminders from organizers', user, body
    });
  }
  window.Views = window.Views || {};
  window.Views.renderAnnouncements = renderAnnouncements;
})();
