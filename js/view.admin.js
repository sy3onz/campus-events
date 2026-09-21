/* =========================================================
   view.admin.js — admin dashboard, event & registration
   management, check-in console, announcement management
   ========================================================= */
(function(){
  window.Actions = window.Actions || {};
  window.Forms = window.Forms || {};

  function requireAdmin(user){
    if(user.role!=='admin'){ Router.go('/events'); return false; }
    return true;
  }
  function requireStaff(user){
    if(user.role!=='admin' && user.role!=='faculty'){ Router.go('/events'); return false; }
    return true;
  }

  // ================= DASHBOARD =================
  function renderDashboard(user){
    if(!requireAdmin(user)) return;
    const root = document.getElementById('app-root');
    const events = Store.listEvents();
    const regs = Store.listRegistrations();
    const activeRegs = regs.filter(r=>r.status!=='cancelled' && r.status!=='rejected');
    const checkedIn = regs.filter(r=>r.checkedIn);
    const upcoming = events.filter(e=>Comp.eventStatusOf(e)==='upcoming' || Comp.eventStatusOf(e)==='ongoing');

    const topEvents = events
      .map(e=>({e, count: activeRegs.filter(r=>r.eventId===e.id).length}))
      .sort((a,b)=>b.count-a.count).slice(0,5);

    const recentRegs = regs.slice().sort((a,b)=>b.registeredAt-a.registeredAt).slice(0,6);

    const body = `
      <div class="grid grid-4" style="margin-bottom:22px;">
        <div class="stat-card"><div class="stat-num">${events.length}</div><div class="stat-label">Total events</div></div>
        <div class="stat-card"><div class="stat-num">${activeRegs.length}</div><div class="stat-label">Active registrations</div></div>
        <div class="stat-card"><div class="stat-num">${checkedIn.length}</div><div class="stat-label">Checked in</div></div>
        <div class="stat-card"><div class="stat-num">${upcoming.length}</div><div class="stat-label">Upcoming / ongoing</div></div>
      </div>
      <div class="grid" style="grid-template-columns:1.3fr 1fr;align-items:start;">
        <div class="card card-pad">
          <div class="section-title"><h2>Headcount by event</h2><button class="btn btn-ghost btn-sm" data-nav="/admin/events">Manage all</button></div>
          ${topEvents.map(({e,count})=>{
            const cap = e.activities.reduce((a,x)=>a+(x.capacity||0),0);
            const pct = cap ? Math.min(100, Math.round(count/cap*100)) : (count?100:0);
            return `<div style="margin-bottom:14px;">
              <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px;">
                <span style="font-weight:600;cursor:pointer;" data-nav="/admin/events/${e.id}/registrations">${Utils.esc(e.title)}</span>
                <span class="muted">${count}${cap?'/'+cap:''}</span>
              </div>
              <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
            </div>`;
          }).join('') || '<p>No events yet.</p>'}
        </div>
        <div class="card card-pad">
          <div class="section-title"><h2>Recent registrations</h2></div>
          ${recentRegs.map(r=>{
            const ev = Store.getEvent(r.eventId);
            return `<div data-action="view-registration" data-reg-id="${r.id}" style="padding:9px 0;border-bottom:1px solid var(--line);font-size:12.5px;cursor:pointer;">
              <div style="font-weight:600;">${Utils.esc(r.userSnapshot.name)}</div>
              <div class="muted">${ev?Utils.esc(ev.title):'—'} \u00b7 ${Utils.fmtDateTime(r.registeredAt)} \u00b7 <span class="mono">${r.ticketCode}</span></div>
            </div>`;
          }).join('') || '<p>Nothing yet.</p>'}
        </div>
      </div>`;

    root.innerHTML = Comp.shell({activePath:'/admin', title:'Admin Dashboard', sub:'Every event, one control room', user, body});
  }

  // ================= MANAGE EVENTS =================
  function renderManageEvents(user){
    if(!requireAdmin(user)) return;
    const root = document.getElementById('app-root');
    const events = Store.listEvents();
    const rows = events.map(ev=>{
      const count = Store.activityCount ? ev.activities.reduce((a,x)=>a+Store.activityCount(ev.id,x.id),0) : 0;
      return `<tr>
        <td><strong>${Utils.esc(ev.title)}</strong><div class="muted" style="font-size:11.5px;">${Utils.esc(ev.category)}</div></td>
        <td>${Utils.fmtDateRange(ev.startDate, ev.endDate)}</td>
        <td>${ev.activities.length}</td>
        <td>${count}</td>
        <td>${Comp.eventStatusBadge(ev)} ${ev.status==='draft'?'<span class="badge badge-slate">Draft</span>':ev.status==='archived'?'<span class="badge badge-slate">Archived</span>':''}</td>
        <td>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button class="icon-btn" title="View registrations" data-nav="/admin/events/${ev.id}/registrations">${Comp.Icon.users}</button>
            <button class="icon-btn" title="Edit" data-action="open-event-form" data-event-id="${ev.id}">${Comp.Icon.edit}</button>
            ${ev.status==='draft'?`<button class="btn btn-sm btn-gold" data-action="publish-event" data-event-id="${ev.id}">Publish</button>`:''}
            ${ev.status==='published'?`<button class="btn btn-sm btn-outline" data-action="archive-event" data-event-id="${ev.id}">Archive</button>`:''}
            <button class="icon-btn" title="Delete" data-action="delete-event" data-event-id="${ev.id}">${Comp.Icon.trash}</button>
          </div>
        </td>
      </tr>`;
    }).join('');

    const body = `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Event</th><th>Dates</th><th>Activities</th><th>Registrants</th><th>Status</th><th></th></tr></thead>
          <tbody>${rows || `<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--slate-light);">No events yet. Create your first one.</td></tr>`}</tbody>
        </table>
      </div>`;

    root.innerHTML = Comp.shell({
      activePath:'/admin/events', title:'Manage Events', sub:'Create, edit, publish and archive any school event', user, body,
      actions:`<button class="btn btn-gold" data-action="open-event-form">${Comp.Icon.plus} New event</button>`
    });
  }

  Actions['publish-event'] = async (ds)=>{ await Store.updateEvent(ds.eventId, {status:'published'}); Utils.toast('Event published.', 'success'); window.App.rerender(); };
  Actions['archive-event'] = async (ds)=>{ await Store.updateEvent(ds.eventId, {status:'archived'}); Utils.toast('Event archived.', 'success'); window.App.rerender(); };
  Actions['delete-event'] = (ds)=>{
    Comp.confirmDialog('This permanently deletes the event and all its registrations.', async ()=>{
      await Store.deleteEvent(ds.eventId); Utils.toast('Event deleted.', 'success'); window.App.rerender();
    }, {title:'Delete event?', danger:true, confirmLabel:'Delete'});
  };

  const CATEGORIES = ['Anniversary','Intramurals','Job Fair','Recognition Day','Christmas Party','Orientation','Seminar','Other'];

  function activityRowHtml(act){
    act = act || {};
    return `<div class="bulk-row" data-activity-row data-activity-id="${act.id||''}" style="align-items:flex-start;">
      <div style="flex:1;display:grid;grid-template-columns:2fr 1fr 1fr;gap:8px;">
        <input type="text" name="a-name" placeholder="Activity name" value="${Utils.esc(act.name||'')}" required>
        <input type="number" name="a-cap" placeholder="Capacity" min="0" value="${act.capacity||''}">
        <input type="date" name="a-deadline" value="${act.deadline ? new Date(act.deadline).toISOString().slice(0,10) : ''}">
      </div>
      <button type="button" class="icon-btn" data-action="remove-activity-row" title="Remove">${Comp.Icon.trash}</button>
    </div>`;
  }

  Actions['open-event-form'] = (ds)=>{
    const ev = ds.eventId ? Store.getEvent(ds.eventId) : null;
    const aud = (ev && ev.audience) || {roles:[],courses:[],yearLevels:[],gradeLevels:[]};
    Utils.openModal(`
      <div class="modal-head"><h3>${ev?'Edit event':'New event'}</h3><button class="modal-close" data-action="close-modal">&times;</button></div>
      <div class="modal-body">
        <form data-form="event-form" data-event-id="${ev?ev.id:''}">
          <div class="row">
            <div class="field">
              <label>Event title</label>
              <input type="text" name="title" value="${ev?Utils.esc(ev.title):''}" required>
            </div>
            <div class="field">
              <label>Category</label>
              <select name="category">${CATEGORIES.map(c=>`<option ${ev&&ev.category===c?'selected':''}>${c}</option>`).join('')}</select>
            </div>
          </div>
          <div class="field">
            <label>Description</label>
            <textarea name="description" required>${ev?Utils.esc(ev.description):''}</textarea>
          </div>
          <div class="row">
            <div class="field">
              <label>Location</label>
              <input type="text" name="location" value="${ev?Utils.esc(ev.location):''}">
            </div>
          </div>
          <div class="row">
            <div class="field">
              <label>Start date</label>
              <input type="date" name="startDate" value="${ev?new Date(ev.startDate).toISOString().slice(0,10):''}" required>
            </div>
            <div class="field">
              <label>End date</label>
              <input type="date" name="endDate" value="${ev?new Date(ev.endDate).toISOString().slice(0,10):''}" required>
            </div>
          </div>
          <fieldset>
            <legend>Approval</legend>
            <div class="check-row"><input type="checkbox" name="requiresApproval" id="r-approval" ${ev&&ev.requiresApproval?'checked':''}><label for="r-approval" style="margin:0;">Registrations require organizer approval</label></div>
            <div class="hint">When checked, new self-registrations (and faculty bulk-registrations) for this event start as <strong>Pending</strong> instead of Approved, until an admin reviews them on the Registrations page. Tickets an admin issues directly are still approved immediately.</div>
          </fieldset>
          <fieldset>
            <legend>Who can register</legend>
            <div class="check-row"><input type="checkbox" name="role" value="student" id="r-student" ${!aud.roles.length||aud.roles.includes('student')?'checked':''}><label for="r-student" style="margin:0;">Students</label></div>
            <div class="check-row"><input type="checkbox" name="role" value="faculty" id="r-faculty" ${!aud.roles.length||aud.roles.includes('faculty')?'checked':''}><label for="r-faculty" style="margin:0;">Faculty & staff</label></div>
            <div class="hint" style="margin-bottom:8px;">Leave both checked to open the event to everyone internally.</div>
            <div class="check-row"><input type="checkbox" name="openToAlumni" id="r-alumni" ${ev&&ev.openToAlumni?'checked':''}><label for="r-alumni" style="margin:0;">Also open to alumni / guests</label></div>
            <div class="field" style="margin-top:10px;margin-bottom:0;">
              <label>Restrict to specific courses (college students, optional)</label>
              <div style="display:flex;gap:12px;flex-wrap:wrap;max-height:140px;overflow-y:auto;padding:2px;">
                ${Utils.COURSES.map((c,i)=>`
                  <label style="display:flex;align-items:center;gap:5px;font-size:12.5px;font-weight:400;">
                    <input type="checkbox" name="courses" value="${c}" ${aud.courses&&aud.courses.includes(c)?'checked':''}> ${c}
                  </label>`).join('')}
              </div>
              <div class="hint">Click to toggle a course on or off. Leave all unchecked for all courses.</div>
            </div>
            <div class="field" style="margin-top:10px;margin-bottom:0;">
              <label>Restrict to year levels (college students, optional)</label>
              <div style="display:flex;gap:12px;flex-wrap:wrap;">
                ${Utils.YEAR_LEVELS.map(y=>`
                  <label style="display:flex;align-items:center;gap:5px;font-size:12.5px;font-weight:400;">
                    <input type="checkbox" name="yearLevel" value="${y}" ${aud.yearLevels&&aud.yearLevels.includes(y)?'checked':''}> ${y}
                  </label>`).join('')}
              </div>
            </div>
            <div class="field" style="margin-top:10px;margin-bottom:0;">
              <label>Restrict to grade levels (senior high students, optional)</label>
              <div style="display:flex;gap:12px;flex-wrap:wrap;">
                ${Utils.GRADE_LEVELS.map(g=>`
                  <label style="display:flex;align-items:center;gap:5px;font-size:12.5px;font-weight:400;">
                    <input type="checkbox" name="gradeLevel" value="${g}" ${aud.gradeLevels&&aud.gradeLevels.includes(g)?'checked':''}> ${g}
                  </label>`).join('')}
              </div>
            </div>
          </fieldset>
          <fieldset>
            <legend>Activities / sessions</legend>
            <div id="activity-rows">${ev && ev.activities.length ? ev.activities.map(activityRowHtml).join('') : activityRowHtml()}</div>
            <button type="button" class="link-btn" id="add-activity-row">+ Add activity</button>
          </fieldset>
          <button class="btn btn-gold btn-block" type="submit">${ev?'Save changes':'Create event (as draft)'}</button>
        </form>
      </div>`, {wide:true});

    document.getElementById('add-activity-row').addEventListener('click', ()=>{
      document.getElementById('activity-rows').insertAdjacentHTML('beforeend', activityRowHtml());
    });
  };

  Actions['remove-activity-row'] = async (ds, e, el)=>{
    const row = el.closest('[data-activity-row]');
    const activityId = row.dataset.activityId;
    const form = row.closest('form');
    const eventId = form.dataset.eventId;
    if(activityId && eventId){
      const ok = window.confirm('Remove this activity? Existing registrations keep their record, but it will no longer accept new sign-ups.');
      if(!ok) return;
      try{
        await Store.deleteActivity(eventId, activityId);
        row.remove();
        Utils.toast('Activity removed.', 'success');
      }catch(err){
        Utils.toast('Could not remove the activity \u2014 please try again.', 'error');
      }
    } else {
      row.remove();
    }
  };

  Forms['event-form'] = async (form)=>{
    const fd = new FormData(form);
    const eventId = form.dataset.eventId;
    const roles = fd.getAll('role');
    const courses = fd.getAll('courses');
    const yearLevels = fd.getAll('yearLevel');
    const gradeLevels = fd.getAll('gradeLevel');
    const patch = {
      title: fd.get('title').trim(),
      category: fd.get('category'),
      description: fd.get('description').trim(),
      location: fd.get('location').trim(),
      startDate: new Date(fd.get('startDate')).getTime(),
      endDate: new Date(fd.get('endDate')).getTime(),
      openToAlumni: fd.get('openToAlumni')==='on',
      requiresApproval: fd.get('requiresApproval')==='on',
      audience: { roles: roles.length===2?[]:roles, courses, yearLevels, gradeLevels }
    };
    if(patch.endDate < patch.startDate){ Utils.toast('End date must be after the start date.', 'error'); return; }

    const submitBtn = form.querySelector('button[type=submit]');
    if(submitBtn) submitBtn.disabled = true;
    const rows = Array.from(form.querySelectorAll('[data-activity-row]'));
    let ev;
    try{
      if(eventId){
        ev = await Store.updateEvent(eventId, patch);
        for(const row of rows){
          const name = row.querySelector('[name=a-name]').value.trim();
          if(!name) continue;
          const cap = parseInt(row.querySelector('[name=a-cap]').value)||0;
          const dl = row.querySelector('[name=a-deadline]').value;
          const deadline = dl ? new Date(dl).getTime() : null;
          const existingId = row.dataset.activityId;
          if(existingId){ await Store.updateActivity(eventId, existingId, {name, capacity:cap, deadline}); }
          else { await Store.addActivity(eventId, {name, capacity:cap, deadline}); }
        }
        Utils.toast('Event updated.', 'success');
      } else {
        ev = await Store.createEvent(Object.assign({status:'draft', createdBy: window.App.currentUser().id}, patch));
        for(const row of rows){
          const name = row.querySelector('[name=a-name]').value.trim();
          if(!name) continue;
          const cap = parseInt(row.querySelector('[name=a-cap]').value)||0;
          const dl = row.querySelector('[name=a-deadline]').value;
          const deadline = dl ? new Date(dl).getTime() : null;
          await Store.addActivity(ev.id, {name, capacity:cap, deadline});
        }
        Utils.toast('Event created as a draft. Publish it when ready.', 'success');
      }
    }catch(err){
      Utils.toast('Could not save the event \u2014 please try again.', 'error');
      if(submitBtn) submitBtn.disabled = false;
      return;
    }
    Utils.closeModal();
    window.App.rerender();
  };

  // ================= EVENT REGISTRATIONS (admin) =================
  let regFilter = {q:'', activity:'all', status:'all'};

  function renderEventRegistrations(user, eventId, query){
    // Admins get full management here; faculty get read-access to see who
    // registered (e.g. via an activity link) but not the management tools.
    if(!requireStaff(user)) return;
    const canManage = user.role==='admin';
    const root = document.getElementById('app-root');
    const ev = Store.getEvent(eventId);
    if(!ev){ Router.go('/admin/events'); return; }
    if(query && query.activity){ regFilter.activity = query.activity; }
    let regs = Store.listRegistrationsForEvent(eventId);

    regs = regs.filter(r=>{
      if(regFilter.status!=='all' && r.status!==regFilter.status) return false;
      if(regFilter.activity!=='all' && !r.activityIds.includes(regFilter.activity)) return false;
      if(regFilter.q){
        const hay = (r.userSnapshot.name+' '+r.userSnapshot.email+' '+(r.userSnapshot.studentId||'')+' '+(r.userSnapshot.course||'')+' '+(r.userSnapshot.strand||'')+' '+(r.userSnapshot.section||'')).toLowerCase();
        if(!hay.includes(regFilter.q.toLowerCase())) return false;
      }
      return true;
    });
    regs.sort((a,b)=>b.registeredAt-a.registeredAt);

    const rows = regs.map(r=>{
      const acts = r.activityIds.map(id=>(ev.activities.find(a=>a.id===id)||{}).name).filter(Boolean).join(', ') || '\u2014';
      const live = Utils.liveAcademicInfo(r.userId, r.userSnapshot);
      const courseOrStrand = live.course || live.strand || '\u2014';
      const levelBit = live.yearLevel || live.gradeLevel || '';
      return `<tr data-action="view-registration" data-reg-id="${r.id}" style="cursor:pointer;">
        <td class="mono">${r.ticketCode}</td>
        <td><strong>${Utils.esc(r.userSnapshot.name)}</strong><div class="muted" style="font-size:11px;">${Utils.esc(r.userSnapshot.email)}</div></td>
        <td>${Utils.esc(courseOrStrand)}${levelBit?' \u00b7 '+Utils.esc(levelBit):''}</td>
        <td style="max-width:180px;">${Utils.esc(acts)}</td>
        <td>
          ${canManage ? `<select class="status-select" data-status="${r.status}" data-action="change-status" data-reg-id="${r.id}" style="font-size:12px;padding:5px 8px;">
            ${['approved','pending','rejected','cancelled'].map(s=>`<option value="${s}" ${r.status===s?'selected':''}>${s[0].toUpperCase()+s.slice(1)}</option>`).join('')}
          </select>` : Utils.statusBadge(r.status)}
        </td>
        <td>${r.checkedIn?'<span class="badge badge-forest">Yes</span>':'<span class="badge badge-slate">No</span>'}</td>
        <td>
          ${canManage && !r.checkedIn?`<button class="btn btn-sm btn-outline" data-action="checkin-reg" data-reg-id="${r.id}">Check in</button>`:''}
        </td>
      </tr>`;
    }).join('');

    const body = `
      <button class="btn btn-ghost btn-sm" data-nav="/admin/events" style="margin-bottom:12px;padding-left:0;">&larr; All events</button>
      <div class="grid grid-3" style="margin-bottom:18px;">
        <div class="stat-card"><div class="stat-num">${Store.listRegistrationsForEvent(eventId).filter(r=>r.status!=='cancelled'&&r.status!=='rejected').length}</div><div class="stat-label">Active registrants</div></div>
        <div class="stat-card"><div class="stat-num">${Store.listRegistrationsForEvent(eventId).filter(r=>r.checkedIn).length}</div><div class="stat-label">Checked in</div></div>
        <div class="stat-card"><div class="stat-num">${ev.activities.reduce((a,x)=>a+(x.capacity||0),0)||'\u221e'}</div><div class="stat-label">Total capacity</div></div>
      </div>
      <div class="toolbar">
        <div class="search-box">${Comp.Icon.search}<input type="text" id="reg-search" placeholder="Search name, email, ID, course, section…" value="${Utils.esc(regFilter.q)}"></div>
        <select id="reg-activity">
          <option value="all">All activities</option>
          ${ev.activities.map(a=>`<option value="${a.id}" ${regFilter.activity===a.id?'selected':''}>${Utils.esc(a.name)}</option>`).join('')}
        </select>
        <select id="reg-status">
          <option value="all">All statuses</option>
          ${['approved','pending','rejected','cancelled'].map(s=>`<option value="${s}" ${regFilter.status===s?'selected':''}>${s[0].toUpperCase()+s.slice(1)}</option>`).join('')}
        </select>
        <button class="btn btn-outline btn-sm" id="export-csv">${Comp.Icon.download} CSV</button>
        <button class="btn btn-outline btn-sm" id="export-pdf">${Comp.Icon.download} PDF</button>
        ${canManage?`<button class="btn btn-gold btn-sm" data-action="open-admin-register" data-event-id="${ev.id}">${Comp.Icon.plus} Add registrant</button>`:''}
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Ticket</th><th>Registrant</th><th>Course / Strand</th><th>Activities</th><th>Status</th><th>Checked in</th><th></th></tr></thead>
          <tbody>${rows || `<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--slate-light);">No registrations match your filters.</td></tr>`}</tbody>
        </table>
      </div>`;

    root.innerHTML = Comp.shell({activePath:'/admin/events', title:ev.title, sub:'Registrations & attendance', user, body});

    document.getElementById('reg-search').addEventListener('input', Utils.debounce(e=>{ regFilter.q=e.target.value; renderEventRegistrations(user,eventId); document.getElementById('reg-search').focus(); const v=document.getElementById('reg-search').value; document.getElementById('reg-search').setSelectionRange(v.length,v.length); },220));
    document.getElementById('reg-activity').addEventListener('change', e=>{ regFilter.activity=e.target.value; renderEventRegistrations(user,eventId); });
    document.getElementById('reg-status').addEventListener('change', e=>{ regFilter.status=e.target.value; renderEventRegistrations(user,eventId); });
    document.getElementById('export-csv').addEventListener('click', ()=>{
      const data = Store.listRegistrationsForEvent(eventId);
      const rowsCsv = [['Ticket','Name','Email','Role','ID Number','Course/Strand & Year','Section','Activities','Status','Checked In','Registered At']];
      data.forEach(r=>{
        const acts = r.activityIds.map(id=>(ev.activities.find(a=>a.id===id)||{}).name).filter(Boolean).join('; ');
        const courseYear = [r.userSnapshot.course||r.userSnapshot.strand, r.userSnapshot.yearLevel||r.userSnapshot.gradeLevel].filter(Boolean).join(' ');
        rowsCsv.push([r.ticketCode, r.userSnapshot.name, r.userSnapshot.email, r.userSnapshot.role, r.userSnapshot.studentId||'', courseYear, r.userSnapshot.section||'', acts, r.status, r.checkedIn?'Yes':'No', new Date(r.registeredAt).toLocaleString()]);
      });
      Utils.downloadCsv(ev.title.replace(/\s+/g,'_')+'_registrations.csv', rowsCsv);
      Utils.toast('CSV exported.', 'success');
    });
    document.getElementById('export-pdf').addEventListener('click', ()=>{
      const data = Store.listRegistrationsForEvent(eventId);
      const bodyRows = data.map(r=>[r.userSnapshot.name, r.userSnapshot.course||r.userSnapshot.strand||'—', r.activityIds.map(id=>(ev.activities.find(a=>a.id===id)||{}).name).filter(Boolean).join(', '), r.status, r.checkedIn?'Yes':'No']);
      Utils.downloadPdf(ev.title+' — Registration Report', `${data.length} registrants \u00b7 exported ${new Date().toLocaleDateString()}`, ['Name','Department','Activities','Status','Checked In'], bodyRows, ev.title.replace(/\s+/g,'_')+'_report.pdf');
      Utils.toast('PDF exported.', 'success');
    });
  }

  Actions['change-status'] = async (ds, e, el)=>{
    const prevValue = el.dataset.status;
    el.disabled = true;
    try{
      await Store.updateRegistration(ds.regId, {status: el.value});
      el.dataset.status = el.value;
      Utils.toast('Status updated.', 'success');
    }catch(err){
      el.value = prevValue; // roll back the dropdown if the save failed
      Utils.toast('Could not update status \u2014 please try again.', 'error');
    }finally{
      el.disabled = false;
    }
  };

  // ================= REGISTRATION DETAIL (dashboard + registrations table) =================
  Actions['view-registration'] = (ds)=>{
    const r = Store.getRegistration(ds.regId);
    if(!r){ Utils.toast('Registration not found.', 'error'); return; }
    const viewer = window.App.currentUser();
    const canEdit = viewer.role==='admin';
    const ev = Store.getEvent(r.eventId);
    const acts = r.activityIds.map(id=>(ev&&ev.activities.find(a=>a.id===id)||{}).name).filter(Boolean).join(', ') || '\u2014';
    const live = Utils.liveAcademicInfo(r.userId, r.userSnapshot);
    const section = (r.extraFields && r.extraFields.section) || live.section || '';
    Utils.openModal(`
      <div class="modal-head"><h3>Registration details</h3><button class="modal-close" data-action="close-modal">&times;</button></div>
      <div class="modal-body">
        <div style="text-align:center;margin-bottom:16px;">
          <div class="mono" style="font-size:20px;font-weight:600;letter-spacing:.05em;">${r.ticketCode}</div>
          <div style="margin-top:6px;">${Utils.statusBadge(r.status)} ${r.checkedIn?'<span class="badge badge-forest">Checked in</span>':''}</div>
        </div>
        <div style="font-size:13px;line-height:1.9;">
          <div><strong>Name:</strong> ${Utils.esc(r.userSnapshot.name)}</div>
          <div><strong>Email:</strong> ${Utils.esc(r.userSnapshot.email||'\u2014')}</div>
          <div><strong>Role:</strong> ${Utils.esc(r.userSnapshot.role||'\u2014')}</div>
          ${r.userSnapshot.studentId?`<div><strong>ID number:</strong> ${Utils.esc(r.userSnapshot.studentId)}</div>`:''}
          ${live.course?`<div><strong>Course:</strong> ${Utils.esc(live.course)}${live.yearLevel?' \u00b7 '+Utils.esc(live.yearLevel):''}</div>`:''}
          ${live.strand?`<div><strong>Strand:</strong> ${Utils.esc(live.strand)}${live.gradeLevel?' \u00b7 '+Utils.esc(live.gradeLevel):''}</div>`:''}
          ${section?`<div><strong>Class / Section:</strong> ${Utils.esc(section)}</div>`:''}
          <div><strong>Event:</strong> ${Utils.esc(ev?ev.title:'\u2014')}</div>
          <div><strong>Activities:</strong> ${Utils.esc(acts)}</div>
          <div><strong>Registered:</strong> ${Utils.fmtDateTime(r.registeredAt)}</div>
          ${r.extraFields&&r.extraFields.notes?`<div><strong>Notes:</strong> ${Utils.esc(r.extraFields.notes)}</div>`:''}
          ${r.extraFields&&r.extraFields.addedVia?`<div><strong>Added via:</strong> ${Utils.esc(r.extraFields.addedVia)}</div>`:''}
        </div>
        ${canEdit ? (Store.isEditableWindow(r) ? `
          <button class="btn btn-outline btn-block" style="margin-top:14px;" data-action="edit-registration" data-reg-id="${r.id}">Edit registration</button>
          <div class="hint" style="margin-top:6px;text-align:center;">Editable for 24 hours after registering.</div>
        ` : `<div class="hint" style="margin-top:14px;text-align:center;">The 24-hour edit window for this registration has passed.</div>`) : ''}
      </div>`, {});
  };

  Actions['edit-registration'] = (ds)=>{
    const r = Store.getRegistration(ds.regId);
    const ev = Store.getEvent(r.eventId);
    if(!r || !ev) return;
    Utils.openModal(`
      <div class="modal-head"><h3>Edit registration</h3><button class="modal-close" data-action="close-modal">&times;</button></div>
      <div class="modal-body">
        <div class="field">
          <label>Name</label>
          <input type="text" id="edit-reg-name" value="${Utils.esc(r.userSnapshot.name)}">
        </div>
        <div class="field">
          <label>Class / Section</label>
          <input type="text" id="edit-reg-section" value="${Utils.esc((r.extraFields&&r.extraFields.section)||r.userSnapshot.section||'')}">
        </div>
        ${ev.activities.length ? `
        <fieldset>
          <legend>Activities</legend>
          ${ev.activities.map(act=>`<div class="check-row">
            <input type="checkbox" name="edit-reg-activities" value="${act.id}" id="editchk-${act.id}" ${r.activityIds.includes(act.id)?'checked':''}>
            <label for="editchk-${act.id}" style="margin:0;font-weight:500;flex:1;">${Utils.esc(act.name)}</label>
          </div>`).join('')}
        </fieldset>` : ''}
        <button class="btn btn-gold btn-block" id="save-reg-edit" data-reg-id="${r.id}">Save changes</button>
      </div>`, {});
    document.getElementById('save-reg-edit').addEventListener('click', async (e)=>{
      const regId = e.target.dataset.regId;
      const name = document.getElementById('edit-reg-name').value.trim();
      const section = document.getElementById('edit-reg-section').value.trim();
      const activityIds = Array.from(document.querySelectorAll('[name=edit-reg-activities]:checked')).map(i=>i.value);
      if(!name){ Utils.toast('Name cannot be empty.', 'error'); return; }
      const reg = Store.getRegistration(regId);
      const userSnapshot = Object.assign({}, reg.userSnapshot, {name, section});
      const extraFields = Object.assign({}, reg.extraFields, {section});
      e.target.disabled = true;
      try{
        await Store.updateRegistration(regId, {userSnapshot, extraFields, activityIds});
        Utils.closeModal();
        Utils.toast('Registration updated.', 'success');
        window.App.rerender();
      }catch(err){
        Utils.toast('Could not save changes \u2014 please try again.', 'error');
        e.target.disabled = false;
      }
    });
  };

  // ================= MANAGE USERS (accounts directory) =================
  let userMgmtFilter = {q:'', role:'all'};

  function renderManageUsers(user){
    if(!requireAdmin(user)) return;
    const root = document.getElementById('app-root');
    let users = Store.listUsers().slice().sort((a,b)=>a.name.localeCompare(b.name));

    users = users.filter(u=>{
      if(userMgmtFilter.role!=='all' && u.role!==userMgmtFilter.role) return false;
      if(userMgmtFilter.q){
        const hay = (u.name+' '+u.email+' '+(u.studentId||'')+' '+(u.course||'')+' '+(u.strand||'')).toLowerCase();
        if(!hay.includes(userMgmtFilter.q.toLowerCase())) return false;
      }
      return true;
    });

    const rows = users.map(u=>{
      const courseOrStrand = u.course || u.strand || '\u2014';
      const level = u.yearLevel || u.gradeLevel || '';
      const deactivated = u.active===false;
      return `<tr class="${deactivated?'row-deactivated':''}">
        <td><strong>${Utils.esc(u.name)}</strong> ${deactivated?'<span class="badge badge-deactivated">Deactivated</span>':''}<div class="muted" style="font-size:11.5px;">${Utils.esc(u.email)}</div></td>
        <td class="mono">${Utils.esc(u.studentId||'\u2014')}</td>
        <td>${Utils.esc(courseOrStrand)}${level?' \u00b7 '+Utils.esc(level):''}</td>
        <td>
          <select data-action="change-user-role" data-user-id="${u.id}" style="font-size:12px;padding:5px 8px;" ${u.id===user.id?'disabled':''}>
            ${['student','faculty','alumni','admin'].map(r=>`<option value="${r}" ${u.role===r?'selected':''}>${r[0].toUpperCase()+r.slice(1)}</option>`).join('')}
          </select>
          ${u.id===user.id?'<div class="hint" style="margin:4px 0 0;">This is you</div>':''}
        </td>
        <td>
          ${u.id===user.id ? '' : deactivated
            ? `<button class="btn btn-sm btn-outline" data-action="reactivate-user" data-user-id="${u.id}">Reactivate</button>`
            : `<button class="btn btn-sm btn-outline" data-action="deactivate-user" data-user-id="${u.id}">Deactivate</button>`}
        </td>
      </tr>`;
    }).join('');

    const total = Store.listUsers().length;
    const body = `
      <div class="grid grid-4" style="margin-bottom:18px;">
        <div class="stat-card"><div class="stat-num">${total}</div><div class="stat-label">Total accounts</div></div>
        <div class="stat-card"><div class="stat-num">${Store.listUsers().filter(u=>u.role==='student').length}</div><div class="stat-label">Students</div></div>
        <div class="stat-card"><div class="stat-num">${Store.listUsers().filter(u=>u.role==='faculty').length}</div><div class="stat-label">Faculty</div></div>
        <div class="stat-card"><div class="stat-num">${Store.listUsers().filter(u=>u.role==='alumni').length}</div><div class="stat-label">Alumni</div></div>
      </div>
      <div class="toolbar">
        <div class="search-box">${Comp.Icon.search}<input type="text" id="user-search" placeholder="Search name, email, ID, course…" value="${Utils.esc(userMgmtFilter.q)}"></div>
      </div>
      <div class="pill-tabs" style="margin-bottom:16px;">
        ${['all','student','faculty','alumni','admin'].map(r=>`<div class="pill ${userMgmtFilter.role===r?'active':''}" data-set-role="${r}">${r==='all'?'All':r[0].toUpperCase()+r.slice(1)}</div>`).join('')}
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>User</th><th>ID Number</th><th>Course / Strand</th><th>Role</th><th>Account</th></tr></thead>
          <tbody>${rows || `<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--slate-light);">No accounts match your filters.</td></tr>`}</tbody>
        </table>
      </div>`;

    root.innerHTML = Comp.shell({
      activePath:'/admin/users', title:'Manage Users', sub:'Every account in the system, in one place', user, body
    });

    document.getElementById('user-search').addEventListener('input', Utils.debounce((e)=>{
      userMgmtFilter.q = e.target.value; renderManageUsers(user);
      document.getElementById('user-search').focus();
      const v = document.getElementById('user-search').value;
      document.getElementById('user-search').setSelectionRange(v.length, v.length);
    }, 220));
    root.querySelectorAll('[data-set-role]').forEach(el=> el.addEventListener('click', ()=>{ userMgmtFilter.role = el.dataset.setRole; renderManageUsers(user); }));
  }

  Actions['change-user-role'] = async (ds, e, el)=>{
    const current = window.App.currentUser();
    if(ds.userId === current.id){
      Utils.toast("You can't change your own role.", 'error');
      window.App.rerender();
      return;
    }
    try{
      await Store.updateUser(ds.userId, {role: el.value});
      Utils.toast('Role updated.', 'success');
    }catch(err){
      Utils.toast('Could not update role \u2014 please try again.', 'error');
    }
    window.App.rerender();
  };
  Actions['deactivate-user'] = (ds)=>{
    const u = Store.getUser(ds.userId);
    Comp.confirmDialog(`${Utils.esc(u.name)} will no longer be able to log in until reactivated.`, async ()=>{
      try{
        await Store.updateUser(ds.userId, {active:false});
        Utils.toast('Account deactivated.', 'success');
      }catch(err){
        Utils.toast('Could not deactivate \u2014 please try again.', 'error');
      }
      window.App.rerender();
    }, {title:'Deactivate this account?', danger:true, confirmLabel:'Deactivate'});
  };
  Actions['reactivate-user'] = async (ds)=>{
    try{
      await Store.updateUser(ds.userId, {active:true});
      Utils.toast('Account reactivated.', 'success');
    }catch(err){
      Utils.toast('Could not reactivate \u2014 please try again.', 'error');
    }
    window.App.rerender();
  };
  Actions['checkin-reg'] = async (ds)=>{
    const res = await Store.checkIn(ds.regId);
    if(res.ok){ Utils.toast(res.reg.userSnapshot.name+' checked in.', 'success'); window.App.rerender(); }
    else if(res.reason==='too_early'){ Utils.toast(`It's not time for this event yet \u2014 check-in opens once it starts.`, 'error'); }
    else if(res.reason==='already'){ Utils.toast('Already checked in.', 'error'); }
    else Utils.toast('Could not check in this registrant.', 'error');
  };

  // ================= CHECK-IN CONSOLE =================
  function renderCheckin(user){
    if(!requireAdmin(user)) return;
    const root = document.getElementById('app-root');
    const events = Store.listEvents().filter(e=>e.status==='published');
    const body = `
      <div class="grid" style="grid-template-columns:1fr 1.4fr;align-items:start;">
        <div class="card card-pad">
          <h3 style="font-size:15px;margin-bottom:12px;">Scan or enter ticket code</h3>
          <div class="field">
            <label>Ticket code</label>
            <input type="text" id="checkin-code" placeholder="CP-XXX-XXXX" class="mono" autocomplete="off">
          </div>
          <button class="btn btn-gold btn-block" id="checkin-submit">Check in</button>
          <div id="checkin-result" style="margin-top:16px;"></div>
          <div class="hint" style="margin-top:14px;">In a physical deployment this field is filled automatically by a QR scanner; for this preview, type or paste the ticket code shown on a registrant's digital ticket.</div>
        </div>
        <div class="card card-pad">
          <div class="section-title"><h2>Find registrant manually</h2></div>
          <div class="field">
            <label>Event</label>
            <select id="checkin-event">
              <option value="">Select an event…</option>
              ${events.map(e=>`<option value="${e.id}">${Utils.esc(e.title)}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label>Search by name</label>
            <input type="text" id="checkin-search" placeholder="Type a registrant's name" disabled>
          </div>
          <div class="pill-tabs" id="checkin-status-tabs" style="margin-bottom:12px;">
            <div class="pill active" data-checkin-status="active">Active</div>
            <div class="pill" data-checkin-status="checkedin">Checked-in</div>
            <div class="pill" data-checkin-status="cancelled">Cancelled / Rejected</div>
            <div class="pill" data-checkin-status="all">All</div>
          </div>
          <div id="checkin-list"></div>
        </div>
      </div>`;
    root.innerHTML = Comp.shell({activePath:'/admin/checkin', title:'Check-in Console', sub:'Track attendance in real time', user, body});

    function showResult(res){
      const box = document.getElementById('checkin-result');
      if(res.ok){
        const ev = Store.getEvent(res.reg.eventId);
        box.innerHTML = `<div class="card card-pad" style="background:var(--forest-bg);border-color:var(--forest);">
          <strong style="color:var(--forest);">\u2713 Checked in</strong>
          <p style="margin:6px 0 0;font-size:13px;color:var(--ink);">${Utils.esc(res.reg.userSnapshot.name)} \u2014 ${Utils.esc(ev.title)}</p>
        </div>`;
      } else {
        const msg = res.reason==='already' ? 'This ticket was already checked in.' : res.reason==='invalid_status' ? 'This registration is cancelled or rejected.' : res.reason==='too_early' ? `It's not time for this event yet \u2014 check-in opens once it starts (${Utils.fmtDateTime(res.event?res.event.startDate:null)}).` : 'No registration found for that code.';
        box.innerHTML = `<div class="card card-pad" style="background:var(--coral-bg);border-color:var(--coral);">
          <strong style="color:#6E3A12;">\u26a0 ${msg}</strong>
        </div>`;
      }
    }
    document.getElementById('checkin-submit').addEventListener('click', async ()=>{
      const code = document.getElementById('checkin-code').value.trim();
      if(!code){ Utils.toast('Enter a ticket code first.', 'error'); return; }
      showResult(await Store.checkIn(code));
      document.getElementById('checkin-code').value='';
      document.getElementById('checkin-code').focus();
      renderList();
    });
    document.getElementById('checkin-code').addEventListener('keydown', e=>{ if(e.key==='Enter') document.getElementById('checkin-submit').click(); });

    let checkinStatusFilter = 'active';
    const searchInput = document.getElementById('checkin-search');
    const listEl = document.getElementById('checkin-list');
    function renderList(){
      const evId = document.getElementById('checkin-event').value;
      if(!evId){ listEl.innerHTML=''; return; }
      const q = searchInput.value.toLowerCase();
      let regs = Store.listRegistrationsForEvent(evId);
      if(checkinStatusFilter==='active') regs = regs.filter(r=>r.status!=='cancelled' && r.status!=='rejected');
      else if(checkinStatusFilter==='checkedin') regs = regs.filter(r=>r.checkedIn);
      else if(checkinStatusFilter==='cancelled') regs = regs.filter(r=>r.status==='cancelled' || r.status==='rejected');
      regs = regs.filter(r=> !q || r.userSnapshot.name.toLowerCase().includes(q));
      listEl.innerHTML = regs.slice(0,10).map(r=>{
        const cancelledOrRejected = r.status==='cancelled' || r.status==='rejected';
        let rightSide;
        if(r.checkedIn) rightSide = '<span class="badge badge-forest">Checked in</span>';
        else if(cancelledOrRejected) rightSide = Utils.statusBadge(r.status);
        else rightSide = `<button class="btn btn-sm btn-outline" data-inline-checkin="${r.id}">Check in</button>`;
        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--line);font-size:13px;">
          <div><strong>${Utils.esc(r.userSnapshot.name)}</strong><div class="mono muted" style="font-size:11px;">${r.ticketCode}</div></div>
          ${rightSide}
        </div>`;
      }).join('') || `<p class="muted" style="font-size:12.5px;">${q?'No matches.':'No registrants in this category.'}</p>`;
    }
    listEl.addEventListener('click', async (e)=>{
      const btn = e.target.closest('[data-inline-checkin]');
      if(!btn) return;
      btn.disabled = true;
      const res = await Store.checkIn(btn.dataset.inlineCheckin);
      if(res.ok){ Utils.toast(res.reg.userSnapshot.name+' checked in.', 'success'); renderList(); }
      else if(res.reason==='too_early'){ Utils.toast(`It's not time for this event yet.`, 'error'); btn.disabled=false; }
      else { Utils.toast('Could not check in this registrant.', 'error'); btn.disabled=false; }
    });
    document.getElementById('checkin-event').addEventListener('change', ()=>{ searchInput.disabled = !document.getElementById('checkin-event').value; renderList(); });
    document.getElementById('checkin-status-tabs').addEventListener('click', (e)=>{
      const pill = e.target.closest('[data-checkin-status]');
      if(!pill) return;
      document.querySelectorAll('#checkin-status-tabs .pill').forEach(p=>p.classList.remove('active'));
      pill.classList.add('active');
      checkinStatusFilter = pill.dataset.checkinStatus;
      renderList();
    });
    searchInput.addEventListener('input', Utils.debounce(renderList, 200));
  }
  // ================= ANNOUNCEMENTS (admin + faculty) =================
  function renderAdminAnnouncements(user){
    if(!requireStaff(user)) return;
    const root = document.getElementById('app-root');
    const items = Store.listAnnouncements();
    const events = Store.listEvents();
    const now = Date.now();
    const body = `
      <div class="card card-pad" style="margin-bottom:20px;">
        <h3 style="font-size:15px;margin-bottom:12px;">Post an announcement</h3>
        <form data-form="new-announcement">
          <div class="row">
            <div class="field">
              <label>Title</label>
              <input type="text" name="title" placeholder="e.g. Venue moved to Gym 2" required>
            </div>
            <div class="field">
              <label>Related event (optional)</label>
              <select name="eventId">
                <option value="">General announcement</option>
                ${events.map(e=>`<option value="${e.id}">${Utils.esc(e.title)}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="field">
            <label>Message</label>
            <textarea name="body" required placeholder="Keep it short and specific."></textarea>
          </div>
          <div class="field">
            <label>Who should see this?</label>
            <select name="audienceType" id="an-audience-type">
              <option value="everyone">Everyone</option>
              <option value="staff">Staff / admins only</option>
              <option value="courses">Specific courses or strands</option>
            </select>
          </div>
          <div class="field" id="an-courses-field" style="display:none;">
            <label>Courses / strands</label>
            <div style="display:flex;gap:12px;flex-wrap:wrap;max-height:140px;overflow-y:auto;padding:2px;">
              ${Utils.PROGRAMS.map(c=>`
                <label style="display:flex;align-items:center;gap:5px;font-size:12.5px;font-weight:400;">
                  <input type="checkbox" name="courses" value="${c}"> ${c}
                </label>`).join('')}
            </div>
            <div class="hint">Click to toggle a course or strand on or off.</div>
          </div>
          <div class="field">
            <label>Keep visible until (optional)</label>
            <input type="datetime-local" name="expiresAt">
            <div class="hint">Leave blank to keep it up indefinitely.</div>
          </div>
          <button class="btn btn-gold" type="submit">Post announcement</button>
        </form>
      </div>
      <div id="announcement-list">
        ${items.map(a=>{
          const expired = a.expiresAt && a.expiresAt < now;
          const aud = a.audience || {type:'everyone', courses:[]};
          const audLabel = aud.type==='staff' ? 'Staff / admins only' : aud.type==='courses' ? (aud.courses||[]).join(', ') || 'Specific courses' : 'Everyone';
          const canDelete = user.role==='admin' || a.createdBy===user.id;
          return `
          <div class="card card-pad" style="margin-bottom:12px;display:flex;justify-content:space-between;gap:10px;align-items:flex-start;${expired?'opacity:.55;':''}">
            <div>
              <strong>${Utils.esc(a.title)}</strong> ${expired?'<span class="badge badge-slate">Expired</span>':''}
              <p style="font-size:12.5px;margin:4px 0 0;">${Utils.esc(a.body)}</p>
              <div class="muted" style="font-size:11px;margin-top:4px;">${Utils.fmtDateTime(a.createdAt)} \u00b7 ${Utils.esc(audLabel)}${a.expiresAt?' \u00b7 until '+Utils.fmtDateTime(a.expiresAt):''}</div>
            </div>
            ${canDelete?`<button class="icon-btn" data-action="delete-announcement" data-an-id="${a.id}">${Comp.Icon.trash}</button>`:''}
          </div>`;
        }).join('') || `<p class="muted">No announcements posted yet.</p>`}
      </div>`;
    root.innerHTML = Comp.shell({activePath:'/admin/announcements', title:'Announcements', sub:'Keep everyone in the loop', user, body});

    const audSel = document.getElementById('an-audience-type');
    const coursesField = document.getElementById('an-courses-field');
    audSel.addEventListener('change', ()=>{ coursesField.style.display = audSel.value==='courses' ? 'block':'none'; });
  }

  Forms['new-announcement'] = async (form)=>{
    const fd = new FormData(form);
    const user = window.App.currentUser();
    const audienceType = fd.get('audienceType');
    const courses = fd.getAll('courses');
    const expiresRaw = fd.get('expiresAt');
    const submitBtn = form.querySelector('button[type=submit]');
    if(submitBtn) submitBtn.disabled = true;
    try{
      await Store.createAnnouncement({
        title:fd.get('title').trim(), body:fd.get('body').trim(), eventId: fd.get('eventId')||null,
        createdBy: user.id, createdByRole: user.role,
        audience:{type: audienceType, courses: audienceType==='courses' ? courses : []},
        expiresAt: expiresRaw ? new Date(expiresRaw).getTime() : null
      });
      Utils.toast('Announcement posted.', 'success');
      window.App.rerender();
    }catch(err){
      Utils.toast('Could not post the announcement \u2014 please try again.', 'error');
      if(submitBtn) submitBtn.disabled = false;
    }
  };
  Actions['delete-announcement'] = (ds)=>{
    Comp.confirmDialog('This removes the announcement for everyone.', async ()=>{
      try{
        await Store.deleteAnnouncement(ds.anId);
        Utils.toast('Announcement deleted.', 'success');
        window.App.rerender();
      }catch(err){
        Utils.toast('Could not delete \u2014 please try again.', 'error');
      }
    }, {title:'Delete announcement?', danger:true, confirmLabel:'Delete'});
  };

  // ================= AUDIT LOG =================
  let auditSort = 'ts_desc';
  const AUDIT_SORTS = {
    ts_desc:   {label:'When (newest first)',  cmp:(a,b)=> b.ts - a.ts},
    ts_asc:    {label:'When (oldest first)',  cmp:(a,b)=> a.ts - b.ts},
    actor_asc: {label:'Who (A\u2013Z)',        cmp:(a,b)=> a.actorName.localeCompare(b.actorName) || b.ts-a.ts},
    action_asc:{label:'Action (A\u2013Z)',     cmp:(a,b)=> a.action.localeCompare(b.action) || b.ts-a.ts},
    target_asc:{label:'Target (A\u2013Z)',     cmp:(a,b)=> (a.targetLabel||'').localeCompare(b.targetLabel||'') || b.ts-a.ts},
  };
  function renderAuditLog(user){
    if(!requireAdmin(user)) return;
    const root = document.getElementById('app-root');
    const entries = Store.listAuditLog().slice().sort(AUDIT_SORTS[auditSort].cmp);
    const rows = entries.map(l=>`
      <tr>
        <td class="muted" style="font-size:11.5px;white-space:nowrap;">${Utils.fmtDateTime(l.ts)}</td>
        <td>${Utils.esc(l.actorName)}${l.actorRole!=='\u2014'?` <span class="muted" style="font-size:11px;">(${l.actorRole})</span>`:''}</td>
        <td><span class="badge badge-slate">${Utils.esc(l.action.replace(/_/g,' '))}</span></td>
        <td>${Utils.esc(l.targetLabel)}</td>
        <td class="muted" style="font-size:12px;">${Utils.esc(l.details)}</td>
      </tr>`).join('');
    const body = `
      <div class="toolbar">
        <div class="field" style="width:auto;margin-bottom:0;">
          <label style="margin-bottom:4px;">Sort by</label>
          <select id="audit-sort">
            ${Object.keys(AUDIT_SORTS).map(k=>`<option value="${k}" ${auditSort===k?'selected':''}>${AUDIT_SORTS[k].label}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th style="cursor:pointer;" data-audit-sort-col="ts_desc">When</th>
            <th style="cursor:pointer;" data-audit-sort-col="actor_asc">Who</th>
            <th style="cursor:pointer;" data-audit-sort-col="action_asc">Action</th>
            <th style="cursor:pointer;" data-audit-sort-col="target_asc">Target</th>
            <th>Details</th>
          </tr></thead>
          <tbody>${rows || `<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--slate-light);">No activity recorded yet.</td></tr>`}</tbody>
        </table>
      </div>
      <div class="hint" style="margin-top:12px;">Showing the most recent ${entries.length} events (older entries roll off automatically). Click a column heading, or use the sort dropdown, to reorder.</div>`;
    root.innerHTML = Comp.shell({activePath:'/admin/audit-log', title:'Audit Log', sub:'Every account and registration change, in order', user, body});

    document.getElementById('audit-sort').addEventListener('change', (e)=>{ auditSort = e.target.value; renderAuditLog(user); });
    root.querySelectorAll('[data-audit-sort-col]').forEach(th=>{
      th.addEventListener('click', ()=>{
        const key = th.dataset.auditSortCol;
        // Clicking the same "When" heading twice flips newest/oldest.
        if(key==='ts_desc' && auditSort==='ts_desc') auditSort = 'ts_asc';
        else if(key==='ts_desc' && auditSort==='ts_asc') auditSort = 'ts_desc';
        else auditSort = key;
        renderAuditLog(user);
      });
    });
  }

  window.Views = window.Views || {};
  window.Views.renderDashboard = renderDashboard;
  window.Views.renderManageEvents = renderManageEvents;
  window.Views.renderEventRegistrations = renderEventRegistrations;
  window.Views.renderCheckin = renderCheckin;
  window.Views.renderAdminAnnouncements = renderAdminAnnouncements;
  window.Views.renderManageUsers = renderManageUsers;
  window.Views.renderAuditLog = renderAuditLog;
})();
