/* =========================================================
   view.events.js — browse events, event detail, registration
   ========================================================= */
(function(){
  window.Actions = window.Actions || {};
  window.Forms = window.Forms || {};

  let filterState = {q:'', status:'all', month:'all'};

  function monthKeyOf(ts){ const d = new Date(ts); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); }
  function monthLabelOf(ts){ return new Date(ts).toLocaleDateString('en-US',{month:'long', year:'numeric'}); }

  function renderEventsList(user){
    const root = document.getElementById('app-root');
    const events = Store.listEvents().filter(ev=>{
      if(user.role!=='admin' && ev.status!=='published') return false;
      return true;
    });
    const monthsSeen = [];
    events.forEach(ev=>{
      const key = monthKeyOf(ev.startDate);
      if(!monthsSeen.find(m=>m.key===key)) monthsSeen.push({key, label: monthLabelOf(ev.startDate)});
    });
    monthsSeen.sort((a,b)=> a.key.localeCompare(b.key));

    const filtered = events.filter(ev=>{
      if(filterState.status!=='all' && Comp.eventStatusOf(ev)!==filterState.status) return false;
      if(filterState.month!=='all' && monthKeyOf(ev.startDate)!==filterState.month) return false;
      if(filterState.q && !ev.title.toLowerCase().includes(filterState.q.toLowerCase()) && !ev.category.toLowerCase().includes(filterState.q.toLowerCase())) return false;
      return true;
    });

    // Group chronologically (events are already sorted by start date) into
    // month sections so the list reads like a school calendar.
    const groups = [];
    filtered.forEach(ev=>{
      const key = monthKeyOf(ev.startDate);
      let g = groups[groups.length-1];
      if(!g || g.key!==key){ g = {key, label: monthLabelOf(ev.startDate), items:[]}; groups.push(g); }
      g.items.push(ev);
    });
    const gridHtml = groups.map(g=>`
      <h3 class="month-heading">${g.label}</h3>
      <div class="grid grid-2" style="margin-bottom:8px;">${g.items.map(ev=>Comp.eventTicketCard(ev)).join('')}</div>
    `).join('');

    const body = `
      <div class="toolbar">
        <div class="search-box">${Comp.Icon.search}<input type="text" id="ev-search" placeholder="Search events…" value="${Utils.esc(filterState.q)}"></div>
        <select id="ev-month" class="field" style="width:auto;">
          <option value="all" ${filterState.month==='all'?'selected':''}>All months</option>
          ${monthsSeen.map(m=>`<option value="${m.key}" ${filterState.month===m.key?'selected':''}>${m.label}</option>`).join('')}
        </select>
      </div>
      <div class="pill-tabs" style="margin-bottom:20px;">
        ${['all','upcoming','ongoing','past'].map(s=>`<div class="pill ${filterState.status===s?'active':''}" data-set-status="${s}">${s==='all'?'All':s[0].toUpperCase()+s.slice(1)}</div>`).join('')}
      </div>
      ${filtered.length ? gridHtml : `
        <div class="empty-state">
          ${Comp.Icon.empty}
          <h3>No events match your filters</h3>
          <p>Try a different search term or clear the filters to see everything on the calendar.</p>
        </div>`}
    `;

    root.innerHTML = Comp.shell({
      activePath:'/events', title:'Browse Events', sub:'Every school event, in one place', user, body
    });

    document.getElementById('ev-search').addEventListener('input', Utils.debounce((e)=>{
      filterState.q = e.target.value; renderEventsList(user);
      document.getElementById('ev-search').focus();
      const val = document.getElementById('ev-search').value;
      document.getElementById('ev-search').setSelectionRange(val.length,val.length);
    }, 220));
    document.getElementById('ev-month').addEventListener('change', (e)=>{ filterState.month = e.target.value; renderEventsList(user); });
    root.querySelectorAll('[data-set-status]').forEach(el=> el.addEventListener('click', ()=>{ filterState.status = el.dataset.setStatus; renderEventsList(user); }));
  }

  function userRegForEvent(user, eventId){
    return Store.listRegistrationsForUser(user.id).find(r=>r.eventId===eventId && r.status!=='cancelled');
  }

  function renderEventDetail(user, eventId){
    const root = document.getElementById('app-root');
    const ev = Store.getEvent(eventId);
    if(!ev){ Router.go('/events'); return; }
    const eligible = Utils.isEligible(ev, user);
    const myReg = userRegForEvent(user, eventId);
    const status = Comp.eventStatusOf(ev);
    const canRegister = eligible && ev.status==='published' && status!=='past' && !myReg;

    // Teachers and admins can click an activity to jump straight to who's
    // registered for it; students never see who else has registered.
    const canViewRegistrants = user.role==='admin' || user.role==='faculty';

    const activitiesHtml = ev.activities.map(act=>{
      const count = Store.activityCount(ev.id, act.id);
      const full = act.capacity && count>=act.capacity;
      const closed = act.deadline && Date.now() > act.deadline;
      const pct = act.capacity ? Math.min(100, Math.round(count/act.capacity*100)) : 0;
      return `
      <div class="card card-pad" style="margin-bottom:10px;${canViewRegistrants?'cursor:pointer;':''}" ${canViewRegistrants?`data-nav="/admin/events/${ev.id}/registrations?activity=${act.id}" title="View who's registered for this activity"`:''}>
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;">
          <div>
            <h4 style="font-size:15px;margin-bottom:3px;">${Utils.esc(act.name)}</h4>
            ${act.description?`<p style="font-size:12.5px;margin-bottom:6px;">${Utils.esc(act.description)}</p>`:''}
            <div style="font-size:11.5px;color:var(--slate-light);">
              ${act.deadline?`Register by ${Utils.fmtDateTime(act.deadline)}`:'No registration deadline'}
              ${canViewRegistrants?' \u00b7 <span style="color:var(--gold-deep);font-weight:600;">View registrants \u2192</span>':''}
            </div>
          </div>
          <div style="text-align:right;flex:none;">
            ${full?'<span class="badge badge-coral">Full</span>':closed?'<span class="badge badge-slate">Closed</span>':'<span class="badge badge-forest">Open</span>'}
            <div style="font-size:11px;color:var(--slate-light);margin-top:5px;">${count}${act.capacity?'/'+act.capacity:''} joined</div>
          </div>
        </div>
        ${act.capacity?`<div class="progress-track" style="margin-top:8px;"><div class="progress-fill" style="width:${pct}%"></div></div>`:''}
      </div>`;
    }).join('') || `<p>No activities have been added to this event yet.</p>`;

    let actionArea = '';
    if(!eligible){
      actionArea = `<div class="empty-state"><h3>Not open to your account type</h3><p>${Utils.esc(Utils.audienceLabel(ev))}. If you think this is a mistake, contact the event organizer.</p></div>`;
    } else if(myReg){
      actionArea = `
        <div class="card card-pad" style="background:var(--forest-bg);border-color:var(--forest);">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
            <div>
              <strong style="color:var(--forest);">You're registered</strong>
              <p style="margin:4px 0 0;font-size:12.5px;">Ticket ${myReg.ticketCode} \u00b7 ${Utils.statusBadge(myReg.status)}</p>
            </div>
            <div style="display:flex;gap:8px;">
              <button class="btn btn-outline btn-sm" data-nav="/ticket/${myReg.id}">View ticket</button>
              <button class="btn btn-danger btn-sm" data-action="cancel-registration" data-reg-id="${myReg.id}">Cancel</button>
            </div>
          </div>
        </div>`;
    } else if(status==='past'){
      actionArea = `<div class="empty-state"><h3>Registration closed</h3><p>This event has already taken place.</p></div>`;
    } else if(ev.status!=='published'){
      actionArea = `<div class="empty-state"><h3>Not yet open</h3><p>This event is still being finalized by the organizer.</p></div>`;
    } else {
      actionArea = `<button class="btn btn-gold btn-block" data-action="open-register" data-event-id="${ev.id}">Register for this event</button>`;
    }
    // Faculty can always bulk-register their class (including individual
    // no-account students) regardless of whether they personally are
    // already registered, ineligible, or the event's status/timing would
    // otherwise block their own "Register for this event" button above —
    // bulk-registering a class is a distinct action from a teacher's own
    // registration and shouldn't be gated by it.
    if(user.role==='faculty'){
      actionArea += `<button class="btn btn-outline btn-block" style="margin-top:10px;" data-action="open-bulk-register" data-event-id="${ev.id}">Bulk register my class</button>`;
    }
    if(user.role==='admin'){
      actionArea += `<button class="btn btn-outline btn-block" style="margin-top:10px;" data-action="open-bulk-register" data-event-id="${ev.id}">${Comp.Icon.users} Bulk register a class</button>`;
    }
    if(user.role==='admin'){
      actionArea += `<button class="btn btn-outline btn-block" style="margin-top:10px;" data-action="open-admin-register" data-event-id="${ev.id}">${Comp.Icon.plus} Issue ticket / register someone</button>`;
    }

    const body = `
      <button class="btn btn-ghost btn-sm" data-nav="/events" style="margin-bottom:16px;padding-left:0;">&larr; Back to events</button>
      <div class="grid" style="grid-template-columns:2fr 1fr; align-items:start;">
        <div>
          <div class="ticket-cat"><span class="dot"></span>${Utils.esc(ev.category)}</div>
          <h1 style="font-size:28px;margin-bottom:10px;">${Utils.esc(ev.title)}</h1>
          <div class="ticket-meta" style="margin-bottom:14px;">
            <span>${Comp.Icon.clock}&nbsp;${Utils.fmtDateRange(ev.startDate, ev.endDate)}</span>
            <span>${Comp.Icon.pin}&nbsp;${Utils.esc(ev.location||'TBA')}</span>
            ${Comp.eventStatusBadge(ev)}
          </div>
          <p style="font-size:14px;color:var(--ink);margin-bottom:20px;">${Utils.esc(ev.description)}</p>
          <div class="badge badge-slate" style="margin-bottom:8px;">${Utils.esc(Utils.audienceLabel(ev))}</div>
          ${ev.requiresApproval?`<div class="badge badge-gold" style="margin-bottom:12px;">Registrations require approval</div>`:''}
          <h3 style="font-size:15px;margin:22px 0 12px;">Activities & sessions${canViewRegistrants?' <span class="muted" style="font-size:11.5px;font-weight:400;">(tap an activity to see who\u2019s registered)</span>':''}</h3>
          ${activitiesHtml}
        </div>
        <div>${actionArea}</div>
      </div>
    `;

    root.innerHTML = Comp.shell({activePath:'/events', title:'Event Details', sub:ev.title, user, body});
  }

  // ---------- registration modal ----------
  Actions['open-register'] = function(ds, e, user){
    const ev = Store.getEvent(ds.eventId);
    const currentUser = window.App.currentUser();
    Utils.openModal(`
      <div class="modal-head"><h3>Register \u2014 ${Utils.esc(ev.title)}</h3><button class="modal-close" data-action="close-modal">&times;</button></div>
      <div class="modal-body">
        <form data-form="register-event" data-event-id="${ev.id}">
          <div class="field">
            <label>Registering as</label>
            <input type="text" value="${Utils.esc(currentUser.name)} \u00b7 ${Utils.esc(currentUser.email)}" disabled style="background:var(--paper-dim);color:var(--slate);">
          </div>
          ${ev.activities.length ? `
          <fieldset>
            <legend>Select activities</legend>
            ${ev.activities.map(act=>{
              const full = act.capacity && Store.activityCount(ev.id, act.id) >= act.capacity;
              const closed = act.deadline && Date.now() > act.deadline;
              const disabled = full || closed;
              return `<div class="check-row">
                <input type="checkbox" name="activities" value="${act.id}" id="chk-${act.id}" ${disabled?'disabled':''}>
                <label for="chk-${act.id}" style="margin:0;font-weight:500;flex:1;${disabled?'color:var(--slate-light);':''}">
                  ${Utils.esc(act.name)} ${full?'<span class="badge badge-coral">Full</span>':closed?'<span class="badge badge-slate">Closed</span>':''}
                </label>
              </div>`;
            }).join('')}
          </fieldset>` : ''}
          <div class="field">
            <label>Notes for organizers (optional)</label>
            <textarea name="notes" placeholder="Dietary restriction, accessibility need, etc."></textarea>
          </div>
          <button class="btn btn-gold btn-block" type="submit">Confirm registration</button>
        </form>
      </div>`, {});
  };

  Forms['register-event'] = async function(form){
    const eventId = form.dataset.eventId;
    const ev = Store.getEvent(eventId);
    const user = window.App.currentUser();
    const fd = new FormData(form);
    const activityIds = fd.getAll('activities');
    if(ev.activities.length && activityIds.length===0){
      Utils.toast('Select at least one activity to join.', 'error'); return;
    }
    const status = ev.requiresApproval ? 'pending' : 'approved';
    const submitBtn = form.querySelector('button[type=submit]');
    submitBtn.disabled = true;
    let reg;
    try{
      reg = await Store.createRegistration({
        eventId, activityIds, userId:user.id, status,
        userSnapshot:{name:user.name, email:user.email, role:user.role, studentId:user.studentId, course:user.course, strand:user.strand, yearLevel:user.yearLevel, gradeLevel:user.gradeLevel, section:user.section},
        extraFields:{notes: fd.get('notes')||''},
        addedBy:user.id
      });
    }catch(err){
      Utils.toast('Could not complete your registration \u2014 please try again.', 'error');
      submitBtn.disabled = false;
      return;
    }
    await Store.notify(user.id, status==='pending'
      ? `Your registration for ${ev.title} is pending organizer approval. Ticket ${reg.ticketCode}.`
      : `You're registered for ${ev.title}. Ticket ${reg.ticketCode}.`);
    Utils.closeModal();
    Utils.sendTicketEmail(user.email, ev.title, reg.ticketCode);
    Utils.toast(status==='pending' ? 'Registered \u2014 pending organizer approval.' : 'Registration confirmed!', 'success');
    Router.go('/ticket/'+reg.id);
  };

  Actions['cancel-registration'] = function(ds){
    Comp.confirmDialog('This will cancel your registration and free up your slot.', async ()=>{
      try{
        await Store.updateRegistration(ds.regId, {status:'cancelled'});
        Utils.toast('Registration cancelled.', 'success');
        window.App.rerender();
      }catch(err){
        Utils.toast('Could not cancel \u2014 please try again.', 'error');
      }
    }, {title:'Cancel registration?', confirmLabel:'Yes, cancel', danger:true});
  };

  // ---------- bulk registration (faculty, or admin on a teacher's behalf) ----------
  Actions['open-bulk-register'] = function(ds){
    const ev = Store.getEvent(ds.eventId);
    const actingUser = window.App.currentUser();
    const isAdmin = actingUser.role==='admin';
    const teachers = isAdmin ? Store.listUsers().filter(u=>u.role==='faculty') : [];
    const existingUsers = Store.listUsers().filter(u=>u.role!=='admin');
    const templates = Store.listBulkTemplates(actingUser.id);
    // Other published, non-past events this same class roster can also be
    // registered into in the same pass (so a class isn't limited to a
    // single event, or a single activity, per bulk-register run).
    const otherEvents = Store.listEvents().filter(e=> e.id!==ev.id && e.status==='published' && Comp.eventStatusOf(e)!=='past');

    function datalistHtml(usedNames){
      return existingUsers
        .filter(u=>!usedNames.includes(u.name.toLowerCase()))
        .map(u=>`<option value="${Utils.esc(u.name)}">${Utils.esc(u.studentId||u.email)}</option>`).join('');
    }

    function activitiesFieldHtml(event, idPrefix){
      if(!event.activities.length) return '';
      return `
        <fieldset style="margin-top:10px;">
          <legend>${Utils.esc(event.title)} \u2014 activities</legend>
          ${event.activities.map(a=>`<div class="check-row">
            <input type="checkbox" name="${idPrefix}-activities" value="${a.id}" id="${idPrefix}chk-${a.id}">
            <label for="${idPrefix}chk-${a.id}" style="margin:0;font-weight:500;flex:1;">${Utils.esc(a.name)}</label>
          </div>`).join('')}
          <div class="hint">Leave all unchecked to register the class for general admission to this event only.</div>
        </fieldset>`;
    }

    Utils.openModal(`
      <div class="modal-head"><h3>Bulk register \u2014 ${Utils.esc(ev.title)}</h3><button class="modal-close" data-action="close-modal">&times;</button></div>
      <div class="modal-body">
        <p style="font-size:12.5px;">Add each student once. Start typing a name to see matching accounts already in the system. A row that doesn't match an existing account will be clearly flagged and registered manually, as a no-account entry \u2014 it won't be silently linked to someone else's account.</p>
        ${isAdmin ? `
        <div class="field">
          <label>Register on behalf of</label>
          <select id="bulk-teacher">
            <option value="">Select a teacher\u2026</option>
            ${teachers.map(t=>`<option value="${t.id}">${Utils.esc(t.name)}</option>`).join('')}
          </select>
          <div class="hint">The class will be recorded as added by this teacher; you'll still be logged as the one who did it.</div>
        </div>` : ''}
        ${templates.length ? `
        <div class="field">
          <label>Load a saved class (optional)</label>
          <select id="bulk-template">
            <option value="">Start from scratch</option>
            ${templates.map(t=>`<option value="${t.id}">${Utils.esc(t.name)} (${t.students.length} students)</option>`).join('')}
          </select>
        </div>` : ''}
        <div class="field">
          <label>Class / Section / Year level</label>
          <input type="text" id="bulk-section" placeholder="e.g. BSIT 2-A or Grade 7 - Rizal">
        </div>
        ${activitiesFieldHtml(ev, 'main')}
        ${otherEvents.length ? `
        <fieldset>
          <legend>Also register this class for other events (optional)</legend>
          <div style="display:flex;flex-direction:column;gap:6px;max-height:140px;overflow-y:auto;">
            ${otherEvents.map(oe=>`<label style="display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:400;">
              <input type="checkbox" name="bulk-extra-event" value="${oe.id}" data-extra-event-chk> ${Utils.esc(oe.title)}
            </label>`).join('')}
          </div>
          <div class="hint">Each checked event registers this same roster as general admission (no specific activity) for that event too, in the same pass.</div>
        </fieldset>` : ''}
        <div id="bulk-rows">
          ${[0,1,2].map(()=>bulkRow()).join('')}
        </div>
        <datalist id="existing-students-list">${datalistHtml([])}</datalist>
        <button type="button" class="link-btn" id="add-bulk-row" style="margin-bottom:16px;">+ Add another row</button>
        <div class="check-row">
          <input type="checkbox" id="bulk-save-template">
          <label for="bulk-save-template" style="margin:0;font-weight:400;">Save this class so I can reuse it for another event</label>
        </div>
        <div class="field" id="bulk-template-name-field" style="display:none;">
          <label>Class name</label>
          <input type="text" id="bulk-template-name" placeholder="e.g. BSIT 2-A, SY 2026-2027">
        </div>
        <button class="btn btn-gold btn-block" id="submit-bulk" data-event-id="${ev.id}">Register class</button>
        <div class="hint" style="margin-top:10px;">A student matched to an existing account gets a normal registration entry here \u2014 this doesn't create or change their account. An unmatched name is registered manually as a no-account entry, the same way a front-desk / guest ticket works.</div>
      </div>`, {wide:true});

    const rowsBox = document.getElementById('bulk-rows');
    function usedNames(){
      return Array.from(rowsBox.querySelectorAll('[name=b-name]')).map(i=>i.value.trim().toLowerCase()).filter(Boolean);
    }
    function refreshDatalist(){
      document.getElementById('existing-students-list').innerHTML = datalistHtml(usedNames());
    }
    function matchFor(name){
      const clean = name.trim().toLowerCase();
      if(!clean) return null;
      return existingUsers.find(u=>u.name.toLowerCase()===clean) || null;
    }
    // Show, per row, whether the typed name matches an existing account or
    // will be registered manually as a no-account entry.
    function updateRowStatus(row){
      const name = row.querySelector('[name=b-name]').value.trim();
      let tag = row.querySelector('.bulk-row-status');
      if(!tag){ tag = document.createElement('div'); tag.className='bulk-row-status'; tag.style.cssText='font-size:11px;flex-basis:100%;margin-top:-4px;'; row.appendChild(tag); }
      if(!name){ tag.innerHTML=''; return; }
      const match = matchFor(name);
      if(match){
        tag.innerHTML = `<span class="badge badge-forest">Matched: existing ${Utils.esc(match.role)} account</span>`;
      } else {
        tag.innerHTML = `<span class="badge badge-gold">No account found \u2014 will be registered manually (no-account entry)</span>`;
      }
    }

    document.getElementById('add-bulk-row').addEventListener('click', ()=>{
      rowsBox.insertAdjacentHTML('beforeend', bulkRow());
    });
    // Autofill the ID/email field when a typed name matches an existing account,
    // keep already-used names out of everyone else's suggestion list, and
    // flag whether each row currently matches a real account.
    rowsBox.addEventListener('input', (e)=>{
      if(e.target.name!=='b-name') return;
      const row = e.target.closest('.bulk-row');
      const idField = row.querySelector('[name=b-id]');
      const match = matchFor(e.target.value);
      if(match && !idField.value){ idField.value = match.studentId || match.email || ''; }
      updateRowStatus(row);
      refreshDatalist();
    });

    const templateSel = document.getElementById('bulk-template');
    if(templateSel){
      templateSel.addEventListener('change', ()=>{
        const tpl = Store.getBulkTemplate(templateSel.value);
        if(!tpl) return;
        document.getElementById('bulk-section').value = tpl.section || '';
        rowsBox.innerHTML = tpl.students.map(s=>bulkRow(s.name, s.idNum)).join('') || bulkRow();
        rowsBox.querySelectorAll('.bulk-row').forEach(updateRowStatus);
        refreshDatalist();
      });
    }
    const saveTplChk = document.getElementById('bulk-save-template');
    saveTplChk.addEventListener('change', ()=>{
      document.getElementById('bulk-template-name-field').style.display = saveTplChk.checked ? 'block':'none';
    });

    async function doSubmit(){
      const eventId = ev.id;
      const evObj = Store.getEvent(eventId);
      const mainActivityIds = Array.from(document.querySelectorAll('[name=main-activities]:checked')).map(i=>i.value);
      const extraEventIds = Array.from(document.querySelectorAll('[data-extra-event-chk]:checked')).map(i=>i.value);
      const rows = Array.from(document.querySelectorAll('#bulk-rows .bulk-row'));
      let attributedTo = actingUser;
      if(isAdmin){
        const teacherId = document.getElementById('bulk-teacher').value;
        if(!teacherId){ Utils.toast('Select which teacher this class belongs to.', 'error'); return; }
        attributedTo = Store.getUser(teacherId);
      }
      const section = document.getElementById('bulk-section').value.trim();
      const targetEvents = [{id:eventId, title:evObj.title, activityIds:mainActivityIds}]
        .concat(extraEventIds.map(id=>({id, title:Store.getEvent(id).title, activityIds:[]})));

      const submitBtn = document.getElementById('submit-bulk');
      submitBtn.disabled = true; submitBtn.textContent = 'Registering\u2026';

      let count = 0, emailed = 0, noAccountCount = 0, failed = 0;
      const bulkGroupId = Store.uid('bulk');
      const studentsForTemplate = [];
      for(const row of rows){
        const name = row.querySelector('[name=b-name]').value.trim();
        const idNum = row.querySelector('[name=b-id]').value.trim();
        if(!name) continue;
        studentsForTemplate.push({name, idNum});
        const looksLikeEmail = idNum.includes('@');
        const match = matchFor(name);
        if(!match) noAccountCount++;

        for(const target of targetEvents){
          try{
            await Store.createRegistration({
              eventId: target.id, activityIds: target.activityIds,
              // A matched account is registered under its real user id; an
              // unmatched name is never attributed to the teacher's account —
              // it's registered exactly like a manual/no-account guest entry.
              userId: match ? match.id : null,
              userSnapshot: match
                ? {name:match.name, email:match.email, role:match.role, studentId:match.studentId, course:match.course, strand:match.strand, yearLevel:match.yearLevel, gradeLevel:match.gradeLevel, section: section||match.section}
                : {name, email:idNum||'(no email provided)', role:'student', studentId:'', course:'', strand:'', yearLevel:'', gradeLevel:'', section},
              extraFields:{addedVia: match ? 'bulk-faculty' : 'bulk-faculty-noaccount', facultyName:attributedTo.name, section, deliveryEmail: looksLikeEmail?idNum:''},
              addedBy: attributedTo.id, bulkGroupId,
              status: evObj.requiresApproval ? 'pending' : 'approved'
            });
            if(looksLikeEmail) emailed++;
          }catch(err){ failed++; }
        }
        count++;
      }
      if(count===0){ Utils.toast('Add at least one student name.', 'error'); submitBtn.disabled=false; submitBtn.textContent='Register class'; return; }

      if(saveTplChk.checked){
        const tplName = document.getElementById('bulk-template-name').value.trim() || section || ('Class '+new Date().toLocaleDateString());
        try{ await Store.saveBulkTemplate({name: tplName, section, students: studentsForTemplate, createdBy: actingUser.id}); }
        catch(err){ /* template save failing shouldn't block the registrations that already succeeded */ }
      }

      Utils.closeModal();
      const eventWord = targetEvents.length>1 ? `${targetEvents.length} events` : evObj.title;
      Utils.toast(`${count} student${count>1?'s':''} registered for ${eventWord}.`, 'success');
      if(failed>0){
        Utils.toast(`${failed} registration${failed>1?'s':''} failed to save \u2014 check your connection and try those rows again.`, 'error');
      }
      if(noAccountCount>0){
        Utils.toast(`${noAccountCount} of ${count} had no matching account and ${noAccountCount>1?'were':'was'} registered manually as no-account entries.`, 'error');
      }
      if(emailed>0){
        Utils.toast(`\u2709 Confirmation emails sent where an email/ID was on file.`, 'email');
      } else {
        Utils.toast('No emails on file \u2014 add one per row (ID/email field) to send confirmations.', 'error');
      }
      window.App.rerender();
    }

    document.getElementById('submit-bulk').addEventListener('click', ()=>{
      const rows = document.querySelectorAll('#bulk-rows .bulk-row');
      let unmatched = 0, total = 0;
      rows.forEach(row=>{
        const name = row.querySelector('[name=b-name]').value.trim();
        if(!name) return;
        total++;
        if(!matchFor(name)) unmatched++;
      });
      if(total===0){ Utils.toast('Add at least one student name.', 'error'); return; }
      if(unmatched>0){
        Comp.confirmDialog(
          `${unmatched} of ${total} student${total>1?'s':''} don\u2019t match an existing account. They\u2019ll be registered manually as no-account entries, the same way a guest ticket is issued. Continue?`,
          doSubmit,
          {title:'Some students have no account', confirmLabel:'Register anyway'}
        );
      } else {
        doSubmit();
      }
    });
  };
  function bulkRow(name, idNum){
    return `<div class="bulk-row" style="flex-wrap:wrap;">
      <input type="text" name="b-name" placeholder="Student full name" value="${Utils.esc(name||'')}" list="existing-students-list">
      <input type="text" name="b-id" placeholder="Student ID / email" value="${Utils.esc(idNum||'')}">
    </div>`;
  }

  // ---------- admin bypass: issue ticket / register anyone ----------
  Actions['open-admin-register'] = function(ds){
    const ev = Store.getEvent(ds.eventId);
    const allUsers = Store.listUsers().filter(u=>u.role!=='admin');
    const alreadyRegIds = new Set(Store.listRegistrationsForEvent(ev.id).filter(r=>r.status!=='cancelled').map(r=>r.userId).filter(Boolean));
    const availableUsers = allUsers.filter(u=>!alreadyRegIds.has(u.id));

    Utils.openModal(`
      <div class="modal-head"><h3>Issue ticket \u2014 ${Utils.esc(ev.title)}</h3><button class="modal-close" data-action="close-modal">&times;</button></div>
      <div class="modal-body">
        <p class="hint" style="margin-bottom:14px;">Register an existing account directly \u2014 bypassing eligibility rules and deadlines \u2014 or add someone with no account at all: a guest, outside participant, or a student who can't self-register yet (e.g. lower grade levels without internet access).</p>
        <div class="pill-tabs" style="margin-bottom:14px;">
          <div class="pill active" data-admin-reg-tab="existing">Existing account</div>
          <div class="pill" data-admin-reg-tab="guest">No account / guest</div>
        </div>
        <div id="admin-reg-existing">
          <div class="field">
            <label>Select person</label>
            <select id="admin-reg-user">
              <option value="">Select an account\u2026</option>
              ${availableUsers.map(u=>`<option value="${u.id}">${Utils.esc(u.name)} \u00b7 ${Utils.esc(u.email)} (${u.role})</option>`).join('')}
            </select>
          </div>
        </div>
        <div id="admin-reg-guest" style="display:none;">
          <div class="row">
            <div class="field"><label>Full name</label><input type="text" id="admin-reg-name" placeholder="Full name"></div>
            <div class="field"><label>Email (ticket will be sent here)</label><input type="email" id="admin-reg-email" placeholder="name@example.com"></div>
          </div>
          <div class="row">
            <div class="field">
              <label>Role / type</label>
              <select id="admin-reg-role">
                <option value="student">Student (no account yet)</option>
                <option value="guest">Guest / outsider</option>
                <option value="faculty">Faculty / staff</option>
                <option value="alumni">Alumni</option>
              </select>
            </div>
            <div class="field"><label>Class / Section / Grade level (optional)</label><input type="text" id="admin-reg-section" placeholder="e.g. Grade 3 - Mabini"></div>
          </div>
        </div>
        ${ev.activities.length ? `
        <fieldset>
          <legend>Select activities</legend>
          ${ev.activities.map(act=>`<div class="check-row">
            <input type="checkbox" name="admin-reg-activities" value="${act.id}" id="admchk-${act.id}">
            <label for="admchk-${act.id}" style="margin:0;font-weight:500;flex:1;">${Utils.esc(act.name)}</label>
          </div>`).join('')}
        </fieldset>` : ''}
        <button class="btn btn-gold btn-block" id="admin-reg-submit" data-event-id="${ev.id}">Issue ticket</button>
        <div class="hint" style="margin-top:10px;">This prototype doesn't send real emails \u2014 the ticket is created and can be looked up under this event's Registrations page.</div>
      </div>`, {wide:true});

    const existingBox = document.getElementById('admin-reg-existing');
    const guestBox = document.getElementById('admin-reg-guest');
    document.querySelectorAll('[data-admin-reg-tab]').forEach(el=>{
      el.addEventListener('click', ()=>{
        document.querySelectorAll('[data-admin-reg-tab]').forEach(p=>p.classList.remove('active'));
        el.classList.add('active');
        const tab = el.dataset.adminRegTab;
        existingBox.style.display = tab==='existing' ? 'block':'none';
        guestBox.style.display = tab==='guest' ? 'block':'none';
      });
    });

    document.getElementById('admin-reg-submit').addEventListener('click', async (e)=>{
      const eventId = e.target.dataset.eventId;
      const evObj = Store.getEvent(eventId);
      const activityIds = Array.from(document.querySelectorAll('[name=admin-reg-activities]:checked')).map(i=>i.value);
      const adminUser = window.App.currentUser();
      const activeTab = document.querySelector('[data-admin-reg-tab].active').dataset.adminRegTab;
      let reg;
      const submitBtn = e.target;
      submitBtn.disabled = true;

      try{
        if(activeTab==='existing'){
          const userId = document.getElementById('admin-reg-user').value;
          if(!userId){ Utils.toast('Select an account to register.', 'error'); submitBtn.disabled=false; return; }
          const u = Store.getUser(userId);
          reg = await Store.createRegistration({
            eventId, activityIds, userId: u.id,
            userSnapshot:{name:u.name, email:u.email, role:u.role, studentId:u.studentId, course:u.course, strand:u.strand, yearLevel:u.yearLevel, gradeLevel:u.gradeLevel, section:u.section},
            extraFields:{addedVia:'admin-bypass'}, addedBy: adminUser.id
          });
          await Store.notify(u.id, `You've been registered for ${evObj.title} by an administrator. Ticket ${reg.ticketCode}.`);
        } else {
          const name = document.getElementById('admin-reg-name').value.trim();
          const email = document.getElementById('admin-reg-email').value.trim();
          const role = document.getElementById('admin-reg-role').value;
          const section = document.getElementById('admin-reg-section').value.trim();
          if(!name){ Utils.toast('Enter a name.', 'error'); submitBtn.disabled=false; return; }
          reg = await Store.createRegistration({
            eventId, activityIds, userId: null,
            userSnapshot:{name, email: email||'(no email provided)', role, studentId:'', course:'', strand:'', yearLevel:'', gradeLevel:'', section},
            extraFields:{addedVia:'admin-guest', deliveryEmail: email||''}, addedBy: adminUser.id
          });
        }
      }catch(err){
        Utils.toast('Could not issue the ticket \u2014 please try again.', 'error');
        submitBtn.disabled = false;
        return;
      }

      Utils.closeModal();
      Utils.toast(`Ticket ${reg.ticketCode} issued.`, 'success');
      Utils.sendTicketEmail(reg.userSnapshot.email, evObj.title, reg.ticketCode);
      window.App.rerender();
    });
  };

  window.Views = window.Views || {};
  window.Views.renderEventsList = renderEventsList;
  window.Views.renderEventDetail = renderEventDetail;
})();