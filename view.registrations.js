/* =========================================================
   view.registrations.js — "My Registrations" + digital ticket
   ========================================================= */
(function(){
  window.Actions = window.Actions || {};

  function renderMyRegistrations(user){
    const root = document.getElementById('app-root');
    const regs = Store.listRegistrationsForUser(user.id)
      .filter(r=>!r.extraFields || r.extraFields.addedVia!=='bulk-faculty')
      .sort((a,b)=>b.registeredAt-a.registeredAt);

    const rows = regs.map(r=>{
      const ev = Store.getEvent(r.eventId);
      if(!ev) return '';
      const acts = r.activityIds.map(id=> (ev.activities.find(a=>a.id===id)||{}).name).filter(Boolean).join(', ') || '\u2014';
      return `
      <div class="ticket" style="margin-bottom:14px;">
        <div class="ticket-body">
          <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;">
            <div>
              <div class="ticket-cat"><span class="dot"></span>${Utils.esc(ev.category)}</div>
              <h3 class="ticket-title">${Utils.esc(ev.title)}</h3>
            </div>
            ${Utils.statusBadge(r.status)}
          </div>
          <div class="ticket-meta">
            <span>${Comp.Icon.clock}&nbsp;${Utils.fmtDateRange(ev.startDate, ev.endDate)}</span>
            <span>${Comp.Icon.pin}&nbsp;${Utils.esc(ev.location||'TBA')}</span>
          </div>
          <p style="font-size:12.5px;color:var(--slate);margin-bottom:10px;"><strong style="color:var(--ink);">Activities:</strong> ${Utils.esc(acts)}</p>
          <div class="ticket-foot">
            <span class="mono" style="font-size:12px;color:var(--slate);">${r.ticketCode}</span>
            <div style="display:flex;gap:8px;">
              ${r.checkedIn?'<span class="badge badge-forest">Checked in</span>':''}
              <button class="btn btn-outline btn-sm" data-nav="/ticket/${r.id}">View ticket</button>
              ${r.status!=='cancelled' && Comp.eventStatusOf(ev)!=='past' ? `<button class="btn btn-danger btn-sm" data-action="cancel-registration" data-reg-id="${r.id}">Cancel</button>` : ''}
            </div>
          </div>
        </div>
        <div class="ticket-perf"></div>
        <div class="ticket-stub">
          <div class="ticket-eyebrow">Ticket</div>
          <div class="ticket-code">${r.ticketCode}</div>
        </div>
      </div>`;
    }).join('');

    const body = regs.length ? rows : `
      <div class="empty-state">
        ${Comp.Icon.empty}
        <h3>No registrations yet</h3>
        <p>Browse upcoming events and register in a few clicks \u2014 your tickets will show up here.</p>
        <button class="btn btn-gold" data-nav="/events">Browse events</button>
      </div>`;

    root.innerHTML = Comp.shell({
      activePath:'/my-registrations', title:'My Registrations', sub:'Every event you\u2019ve signed up for, across the whole school year', user, body
    });
  }

  function renderTicket(user, regId){
    const root = document.getElementById('app-root');
    const reg = Store.getRegistration(regId);
    if(!reg || (reg.userId!==user.id && user.role!=='admin')){ Router.go('/my-registrations'); return; }
    const ev = Store.getEvent(reg.eventId);
    const acts = reg.activityIds.map(id=> (ev.activities.find(a=>a.id===id)||{}).name).filter(Boolean);

    const body = `
      <button class="btn btn-ghost btn-sm" data-nav="/my-registrations" style="margin-bottom:16px;padding-left:0;">&larr; Back to my registrations</button>
      <div class="qr-pass">
        <div class="qr-pass-card">
          <div style="position:relative;">
            <div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--gold-bright);margin-bottom:6px;">Digital Ticket</div>
            <h2 style="color:#fff;font-size:20px;">${Utils.esc(ev.title)}</h2>
            <div style="font-size:12.5px;color:rgba(255,255,255,.7);margin-top:6px;">${Utils.fmtDateRange(ev.startDate, ev.endDate)}</div>
            <div class="qr-box" id="qr-box"></div>
            <div class="qr-pass-code">${reg.ticketCode}</div>
            <div style="margin-top:14px;">${Utils.statusBadge(reg.status)} ${reg.checkedIn?'<span class="badge badge-forest">Checked in</span>':''}</div>
          </div>
        </div>
        <div class="card card-pad" style="text-align:left;margin-top:16px;">
          <div style="font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--slate-light);margin-bottom:8px;">Ticket details</div>
          <div style="font-size:13px;line-height:1.9;">
            <div><strong>Name:</strong> ${Utils.esc(reg.userSnapshot.name)}</div>
            <div><strong>Activities:</strong> ${acts.length?Utils.esc(acts.join(', ')):'General admission'}</div>
            <div><strong>Location:</strong> ${Utils.esc(ev.location||'TBA')}</div>
            <div><strong>Registered:</strong> ${Utils.fmtDateTime(reg.registeredAt)}</div>
          </div>
          <div class="divider"></div>
          <p style="font-size:12px;">Present this QR code at the event entrance for check-in. You can also show the ticket code above if scanning isn't available.</p>
          <button class="btn btn-outline btn-block" id="download-ticket-pdf">${Comp.Icon.download} Download as PDF</button>
        </div>
      </div>`;

    root.innerHTML = Comp.shell({activePath:'/my-registrations', title:'Digital Ticket', sub:reg.ticketCode, user, body});
    Utils.renderQr(document.getElementById('qr-box'), reg.ticketCode);

    document.getElementById('download-ticket-pdf').addEventListener('click', ()=>{
      try{
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.setFillColor(40,54,24); doc.rect(0,0,210,50,'F');
        doc.setTextColor(255,255,255); doc.setFontSize(11); doc.text('CAMPUS PASS \u2014 DIGITAL TICKET', 14, 16);
        doc.setFontSize(18); doc.text(ev.title, 14, 30);
        doc.setFontSize(10); doc.text(Utils.fmtDateRange(ev.startDate, ev.endDate) + '  \u00b7  ' + (ev.location||'TBA'), 14, 40);
        doc.setTextColor(40,54,24); doc.setFontSize(11);
        doc.text('Ticket Code: ' + reg.ticketCode, 14, 65);
        doc.text('Name: ' + reg.userSnapshot.name, 14, 74);
        doc.text('Activities: ' + (acts.length?acts.join(', '):'General admission'), 14, 83);
        doc.text('Status: ' + reg.status, 14, 92);
        doc.setFontSize(9); doc.setTextColor(120,120,120);
        doc.text('Present this ticket (with QR code shown on screen) at the event entrance.', 14, 106);
        doc.save('ticket-'+reg.ticketCode+'.pdf');
      }catch(err){
        Utils.toast('PDF export needs the export library to load (internet connection).', 'error');
      }
    });
  }

  window.Views = window.Views || {};
  window.Views.renderMyRegistrations = renderMyRegistrations;
  window.Views.renderTicket = renderTicket;
})();
