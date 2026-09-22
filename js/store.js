/* =========================================================
   store.js — Supabase-backed data layer for Campus Pass.

   Design note for anyone reading this later: the rest of the app
   (every view.*.js file) was written against a synchronous,
   in-memory Store — it calls things like Store.listEvents() and
   expects an array back immediately, not a Promise. A real database
   can't be synchronous (every call is a network round-trip), so
   this file keeps that same easy-to-use shape by maintaining an
   in-memory cache (`db`) that mirrors Supabase:

     - list*() / get*() / activityCount() / isEditableWindow() stay
       perfectly synchronous — they just read the cache.
     - create*() / update*() / delete*() / login / signup / etc. are
       now async (they return a Promise) — they write to Supabase
       AND update the cache with the real result, so callers that
       `await` them get back exactly the object they used to get
       back instantly.

   That means every place in the app that calls a write function
   needs an `await` in front of it now (and its enclosing function
   needs to be `async`) — those call sites were updated alongside
   this file. Reads did not need to change at all.
   ========================================================= */
(function(){
  if(!window.supabase){
    document.getElementById('app-root').innerHTML =
      '<div style="padding:40px;font-family:sans-serif;">Could not load the Supabase library. Check your internet connection and that the CDN &lt;script&gt; tag in index.html loads before store.js.</div>';
    throw new Error('supabase-js not loaded');
  }
  const sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  const AUDIT_CAP = 500;

  function uid(prefix){
    return (prefix?prefix+'_':'') + Math.random().toString(36).slice(2,9) + Date.now().toString(36).slice(-4);
  }
  function ticketCode(){
    const s = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = 'CP-';
    for(let i=0;i<3;i++) out += s[Math.floor(Math.random()*s.length)];
    out += '-';
    for(let i=0;i<4;i++) out += s[Math.floor(Math.random()*s.length)];
    return out;
  }
  function fullName(u){
    return [u.firstName, u.noMiddleName ? '' : (u.middleName||''), u.lastName].filter(Boolean).join(' ').replace(/\s+/g,' ').trim();
  }
  // timestamptz columns come back as ISO strings; the app does math
  // on plain epoch-ms numbers everywhere, so every read/write through
  // this file converts at the boundary.
  function toMs(iso){ return iso ? new Date(iso).getTime() : null; }
  function toIso(ms){ return (ms===undefined || ms===null || ms==='') ? null : new Date(ms).toISOString(); }

  // ---------- row <-> app-object mapping (snake_case DB, camelCase app) ----------
  function userFromRow(r){
    return {
      id:r.id, firstName:r.first_name, middleName:r.middle_name, lastName:r.last_name,
      noMiddleName:r.no_middle_name, name:r.name, email:r.email, role:r.role, active:r.active,
      studentId:r.student_id, level:r.level, course:r.course, strand:r.strand,
      yearLevel:r.year_level, gradeLevel:r.grade_level, section:r.section, avatarUrl:r.avatar_url||'',
      createdAt:toMs(r.created_at)
    };
  }
  function userToRow(u){
    const row = {};
    if('firstName' in u) row.first_name = u.firstName;
    if('middleName' in u) row.middle_name = u.middleName;
    if('lastName' in u) row.last_name = u.lastName;
    if('noMiddleName' in u) row.no_middle_name = u.noMiddleName;
    if('firstName' in u || 'middleName' in u || 'lastName' in u || 'noMiddleName' in u) row.name = fullName(Object.assign({}, u));
    if('email' in u) row.email = u.email;
    if('role' in u) row.role = u.role;
    if('active' in u) row.active = u.active;
    if('studentId' in u) row.student_id = u.studentId;
    if('level' in u) row.level = u.level;
    if('course' in u) row.course = u.course;
    if('strand' in u) row.strand = u.strand;
    if('yearLevel' in u) row.year_level = u.yearLevel;
    if('gradeLevel' in u) row.grade_level = u.gradeLevel;
    if('section' in u) row.section = u.section;
    if('avatarUrl' in u) row.avatar_url = u.avatarUrl || null;
    return row;
  }
  function eventFromRow(r){
    return {
      id:r.id, title:r.title, category:r.category, description:r.description, location:r.location,
      startDate:toMs(r.start_date), endDate:toMs(r.end_date), status:r.status,
      openToAlumni:r.open_to_alumni, requiresApproval:r.requires_approval,
      audience: r.audience || {roles:[],courses:[],yearLevels:[],gradeLevels:[]},
      coverTag:r.cover_tag, createdBy:r.created_by, createdAt:toMs(r.created_at), activities:[]
    };
  }
  function eventToRow(ev){
    const row = {};
    if('title' in ev) row.title = ev.title;
    if('category' in ev) row.category = ev.category;
    if('description' in ev) row.description = ev.description;
    if('location' in ev) row.location = ev.location;
    if('startDate' in ev) row.start_date = toIso(ev.startDate);
    if('endDate' in ev) row.end_date = toIso(ev.endDate);
    if('status' in ev) row.status = ev.status;
    if('openToAlumni' in ev) row.open_to_alumni = ev.openToAlumni;
    if('requiresApproval' in ev) row.requires_approval = ev.requiresApproval;
    if('audience' in ev) row.audience = ev.audience;
    if('coverTag' in ev) row.cover_tag = ev.coverTag;
    if('createdBy' in ev) row.created_by = ev.createdBy;
    return row;
  }
  function activityFromRow(r){
    return {id:r.id, name:r.name, description:r.description, capacity:r.capacity, deadline:toMs(r.deadline)};
  }
  function activityToRow(a, eventId){
    const row = {};
    if(eventId) row.event_id = eventId;
    if('name' in a) row.name = a.name;
    if('description' in a) row.description = a.description;
    if('capacity' in a) row.capacity = a.capacity;
    if('deadline' in a) row.deadline = toIso(a.deadline);
    return row;
  }
  function regFromRow(r){
    return {
      id:r.id, ticketCode:r.ticket_code, eventId:r.event_id, activityIds:r.activity_ids||[],
      userId:r.user_id, userSnapshot:r.user_snapshot||{}, extraFields:r.extra_fields||{},
      status:r.status, checkedIn:r.checked_in, checkedInAt:toMs(r.checked_in_at),
      registeredAt:toMs(r.registered_at), addedBy:r.added_by, bulkGroupId:r.bulk_group_id
    };
  }
  function regToRow(r){
    const row = {};
    if('ticketCode' in r) row.ticket_code = r.ticketCode;
    if('eventId' in r) row.event_id = r.eventId;
    if('activityIds' in r) row.activity_ids = r.activityIds;
    if('userId' in r) row.user_id = r.userId;
    if('userSnapshot' in r) row.user_snapshot = r.userSnapshot;
    if('extraFields' in r) row.extra_fields = r.extraFields;
    if('status' in r) row.status = r.status;
    if('checkedIn' in r) row.checked_in = r.checkedIn;
    if('checkedInAt' in r) row.checked_in_at = toIso(r.checkedInAt);
    if('addedBy' in r) row.added_by = r.addedBy;
    if('bulkGroupId' in r) row.bulk_group_id = r.bulkGroupId;
    return row;
  }
  function annFromRow(r){
    return {
      id:r.id, title:r.title, body:r.body, eventId:r.event_id, createdBy:r.created_by,
      createdByRole:r.created_by_role, audience:r.audience||{type:'everyone',courses:[]},
      expiresAt:toMs(r.expires_at), createdAt:toMs(r.created_at)
    };
  }
  function annToRow(a){
    const row = {};
    if('title' in a) row.title = a.title;
    if('body' in a) row.body = a.body;
    if('eventId' in a) row.event_id = a.eventId || null;
    if('createdBy' in a) row.created_by = a.createdBy;
    if('createdByRole' in a) row.created_by_role = a.createdByRole;
    if('audience' in a) row.audience = a.audience;
    if('expiresAt' in a) row.expires_at = toIso(a.expiresAt);
    return row;
  }
  function notifFromRow(r){ return {id:r.id, userId:r.user_id, message:r.message, read:r.read, createdAt:toMs(r.created_at)}; }
  function tplFromRow(r){ return {id:r.id, name:r.name, section:r.section, students:r.students||[], createdBy:r.created_by, createdAt:toMs(r.created_at)}; }
  function logFromRow(r){
    return {
      id:r.id, actorId:r.actor_id, actorName:r.actor_name, actorRole:r.actor_role, action:r.action,
      targetType:r.target_type, targetId:r.target_id, targetLabel:r.target_label, details:r.details, ts:toMs(r.ts)
    };
  }

  // ---------- in-memory cache mirroring the tables ----------
  let db = {users:[], events:[], registrations:[], announcements:[], notifications:[], bulkTemplates:[], auditLog:[]};
  let currentAuthUser = null; // the logged-in user's app-shaped profile object, or null

  function attachActivities(events, activityRows){
    const byEvent = {};
    activityRows.forEach(r=>{ (byEvent[r.event_id] = byEvent[r.event_id]||[]).push(activityFromRow(r)); });
    events.forEach(ev=>{ ev.activities = byEvent[ev.id] || []; });
    return events;
  }

  async function fetchAll(){
    const [usersRes, eventsRes, actsRes, regsRes, annRes, notifRes, tplRes, logRes] = await Promise.all([
      sb.from('profiles').select('*'),
      sb.from('events').select('*'),
      sb.from('activities').select('*'),
      sb.from('registrations').select('*'),
      sb.from('announcements').select('*'),
      currentAuthUser ? sb.from('notifications').select('*').eq('user_id', currentAuthUser.id) : Promise.resolve({data:[]}),
      sb.from('bulk_templates').select('*'),
      // Only admins are allowed to read this table (RLS) — a non-admin
      // request simply comes back empty rather than erroring.
      sb.from('audit_log').select('*').order('ts', {ascending:false}).limit(AUDIT_CAP),
    ]);
    const firstError = [usersRes,eventsRes,actsRes,regsRes,annRes,notifRes,tplRes,logRes].find(r=>r.error);
    if(firstError && firstError.error) console.error('Supabase fetch error:', firstError.error);

    db.users = (usersRes.data||[]).map(userFromRow);
    db.events = attachActivities((eventsRes.data||[]).map(eventFromRow), actsRes.data||[]).sort((a,b)=>(a.startDate||0)-(b.startDate||0));
    db.registrations = (regsRes.data||[]).map(regFromRow);
    db.announcements = (annRes.data||[]).map(annFromRow).sort((a,b)=>b.createdAt-a.createdAt);
    db.notifications = (notifRes.data||[]).map(notifFromRow);
    db.bulkTemplates = (tplRes.data||[]).map(tplFromRow).sort((a,b)=>b.createdAt-a.createdAt);
    db.auditLog = (logRes.data||[]).map(logFromRow);
  }

  // ---------- boot sequence ----------
  let readyResolve;
  const readyPromise = new Promise(res=>{ readyResolve = res; });

  async function refreshCurrentAuthUser(){
    const { data:{ session } } = await sb.auth.getSession();
    if(!session){ currentAuthUser = null; return null; }
    const { data, error } = await sb.from('profiles').select('*').eq('id', session.user.id).single();
    if(error || !data){ currentAuthUser = null; return null; }
    currentAuthUser = userFromRow(data);
    return currentAuthUser;
  }

  (async function init(){
    await refreshCurrentAuthUser();
    if(currentAuthUser) await fetchAll();
    readyResolve();
  })();

  // ---------- audit log ----------
  async function addAuditLog(action, targetType, targetId, targetLabel, details){
    const row = {
      actor_id: currentAuthUser ? currentAuthUser.id : null,
      actor_name: currentAuthUser ? currentAuthUser.name : 'Self-registration',
      actor_role: currentAuthUser ? currentAuthUser.role : '\u2014',
      action, target_type:targetType, target_id:String(targetId), target_label:targetLabel||'', details:details||''
    };
    const { data, error } = await sb.from('audit_log').insert(row).select().single();
    if(error){ console.error('audit log insert failed:', error); return; }
    db.auditLog.unshift(logFromRow(data));
    if(db.auditLog.length > AUDIT_CAP) db.auditLog.length = AUDIT_CAP;
  }

  const Store = {
    uid, ticketCode, fullName,
    ready: readyPromise,

    // Re-fetches every table from Supabase and rebuilds the cache — use
    // this to pull in changes other people made (new registrations,
    // accounts, events) since this browser last loaded the data.
    async refresh(){ await fetchAll(); },

    all(){ return db; },
    reset(){ throw new Error('Store.reset() is not available with a shared database — use the Supabase dashboard if you need to clear data.'); },

    // ---------- session / auth ----------
    currentUser(){ return currentAuthUser; },
    async login(email, password){
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if(error) return {ok:false, error: error.message};
      await refreshCurrentAuthUser();
      if(!currentAuthUser) return {ok:false, error:'Could not load your profile.'};
      if(currentAuthUser.active===false){
        await sb.auth.signOut();
        currentAuthUser = null;
        return {ok:false, error:'deactivated'};
      }
      await fetchAll();
      return {ok:true, user:currentAuthUser};
    },
    async logout(){
      await sb.auth.signOut();
      currentAuthUser = null;
      db = {users:[], events:[], registrations:[], announcements:[], notifications:[], bulkTemplates:[], auditLog:[]};
    },
    // Creates the Supabase Auth account; our DB trigger auto-creates the
    // matching profiles row from the metadata passed in `u`.
    async signUp(u){
      const { data, error } = await sb.auth.signUp({
        email: u.email, password: u.password,
        options: { data: {
          firstName:u.firstName, middleName:u.middleName||'', lastName:u.lastName, noMiddleName:!!u.noMiddleName,
          name: fullName(u), role:u.role, studentId:u.studentId||'', level:u.level||'', course:u.course||'',
          strand:u.strand||'', yearLevel:u.yearLevel||'', gradeLevel:u.gradeLevel||'', section:u.section||''
        }}
      });
      if(error) return {ok:false, error:error.message};
      if(!data.session){
        // Email confirmation is turned on for this Supabase project, so
        // there's no session yet. See the project's Auth settings if you
        // want signup to log people in immediately instead.
        return {ok:false, error:'confirm_email'};
      }
      await refreshCurrentAuthUser();
      await fetchAll();
      await addAuditLog('account_created', 'user', currentAuthUser.id, currentAuthUser.name, `Role: ${currentAuthUser.role}`);
      return {ok:true, user:currentAuthUser};
    },
    async changePassword(email, currentPassword, nextPassword){
      const reauth = await sb.auth.signInWithPassword({ email, password: currentPassword });
      if(reauth.error) return {ok:false, error:'Current password is incorrect.'};
      const { error } = await sb.auth.updateUser({ password: nextPassword });
      if(error) return {ok:false, error:error.message};
      await addAuditLog('password_changed', 'user', currentAuthUser.id, currentAuthUser.name, 'password');
      return {ok:true};
    },

    // Pre-login availability checks (used by the signup form, before we
    // have a session and therefore before `db.users` is populated). These
    // call narrow RPC functions rather than reading the profiles table.
    async isEmailTaken(email){
      const { data, error } = await sb.rpc('email_taken', { p_email: email });
      if(error){ console.error(error); return false; }
      return !!data;
    },
    async isStudentIdTaken(studentId){
      if(!studentId) return false;
      const { data, error } = await sb.rpc('student_id_taken', { p_student_id: studentId });
      if(error){ console.error(error); return false; }
      return !!data;
    },

    // ---------- users ----------
    findUserByEmail(email){ return db.users.find(u=>u.email.toLowerCase()===String(email).toLowerCase()); },
    findUserByStudentId(studentId){
      if(!studentId) return null;
      return db.users.find(u=>u.studentId && u.studentId.toLowerCase()===String(studentId).toLowerCase());
    },
    getUser(id){ return db.users.find(u=>u.id===id); },
    listUsers(){ return db.users.slice(); },
    async updateUser(id, patch){
      const before = db.users.find(u=>u.id===id);
      if(!before) return null;
      const changedKeys = Object.keys(patch).filter(k=>JSON.stringify(patch[k])!==JSON.stringify(before[k]));
      const row = userToRow(patch);
      const { data, error } = await sb.from('profiles').update(row).eq('id', id).select().single();
      if(error){ console.error(error); throw error; }
      // If this account's email changed, keep Supabase Auth's own email in
      // sync too (only possible for the currently signed-in user).
      if('email' in patch && currentAuthUser && currentAuthUser.id===id && patch.email!==before.email){
        await sb.auth.updateUser({ email: patch.email });
      }
      const updated = userFromRow(data);
      const idx = db.users.findIndex(u=>u.id===id);
      if(idx>-1) db.users[idx] = updated;
      if(currentAuthUser && currentAuthUser.id===id) currentAuthUser = updated;
      if(changedKeys.length){
        let action = 'account_updated';
        if(changedKeys.includes('active')) action = patch.active ? 'account_reactivated' : 'account_deactivated';
        else if(changedKeys.includes('role')) action = 'role_changed';
        await addAuditLog(action, 'user', updated.id, updated.name, changedKeys.join(', '));
      }
      return updated;
    },

    // ---------- events ----------
    listEvents(){ return db.events.slice().sort((a,b)=>a.startDate-b.startDate); },
    getEvent(id){ return db.events.find(e=>e.id===id); },
    async createEvent(ev){
      const row = Object.assign({status:'draft', open_to_alumni:false, requires_approval:false, audience:{roles:[],courses:[],yearLevels:[],gradeLevels:[]}}, eventToRow(ev));
      const { data, error } = await sb.from('events').insert(row).select().single();
      if(error){ console.error(error); throw error; }
      const event = eventFromRow(data);
      db.events.push(event);
      await addAuditLog('event_created', 'event', event.id, event.title, `Status: ${event.status}`);
      return event;
    },
    async updateEvent(id, patch){
      const { data, error } = await sb.from('events').update(eventToRow(patch)).eq('id', id).select().single();
      if(error){ console.error(error); throw error; }
      const updated = eventFromRow(data);
      const idx = db.events.findIndex(e=>e.id===id);
      const oldActivities = idx>-1 ? db.events[idx].activities : [];
      updated.activities = oldActivities;
      if(idx>-1) db.events[idx] = updated;
      await addAuditLog('event_updated', 'event', updated.id, updated.title, Object.keys(patch).join(', '));
      return updated;
    },
    async deleteEvent(id){
      const ev = db.events.find(e=>e.id===id);
      const { error } = await sb.from('events').delete().eq('id', id);
      if(error){ console.error(error); throw error; }
      db.events = db.events.filter(e=>e.id!==id);
      db.registrations = db.registrations.filter(r=>r.eventId!==id);
      if(ev) await addAuditLog('event_deleted', 'event', id, ev.title, '');
    },
    async addActivity(eventId, activity){
      const row = Object.assign({capacity:0, deadline:null, description:''}, activityToRow(activity, eventId));
      const { data, error } = await sb.from('activities').insert(row).select().single();
      if(error){ console.error(error); throw error; }
      const act = activityFromRow(data);
      const ev = db.events.find(e=>e.id===eventId);
      if(ev) ev.activities.push(act);
      return act;
    },
    async updateActivity(eventId, activityId, patch){
      const { data, error } = await sb.from('activities').update(activityToRow(patch)).eq('id', activityId).select().single();
      if(error){ console.error(error); throw error; }
      const act = activityFromRow(data);
      const ev = db.events.find(e=>e.id===eventId);
      if(ev){ const idx = ev.activities.findIndex(a=>a.id===activityId); if(idx>-1) ev.activities[idx] = act; }
      return act;
    },
    async deleteActivity(eventId, activityId){
      const { error } = await sb.from('activities').delete().eq('id', activityId);
      if(error){ console.error(error); throw error; }
      const ev = db.events.find(e=>e.id===eventId);
      if(ev) ev.activities = ev.activities.filter(a=>a.id!==activityId);
      db.registrations.forEach(r=>{ r.activityIds = r.activityIds.filter(id=>id!==activityId); });
    },

    // ---------- registrations ----------
    listRegistrations(){ return db.registrations.slice(); },
    listRegistrationsForEvent(eventId){ return db.registrations.filter(r=>r.eventId===eventId); },
    listRegistrationsForUser(userId){ return db.registrations.filter(r=>r.userId===userId); },
    getRegistration(id){ return db.registrations.find(r=>r.id===id); },
    getRegistrationByCode(code){ return db.registrations.find(r=>r.ticketCode.toLowerCase()===String(code).toLowerCase().trim()); },
    activityCount(eventId, activityId){
      return db.registrations.filter(r=> r.eventId===eventId && r.activityIds.includes(activityId) && r.status!=='cancelled' && r.status!=='rejected').length;
    },
    isEditableWindow(reg){ return (Date.now() - reg.registeredAt) < (24*60*60*1000); },

    async createRegistration(reg){
      const row = Object.assign({ticket_code:ticketCode(), status:'approved', checked_in:false, extra_fields:{}, bulk_group_id:null}, regToRow(reg));
      const { data, error } = await sb.from('registrations').insert(row).select().single();
      if(error){ console.error(error); throw error; }
      const r = regFromRow(data);
      db.registrations.push(r);
      const ev = db.events.find(e=>e.id===r.eventId);
      await addAuditLog('registration_created', 'registration', r.id, `${r.userSnapshot.name} \u2192 ${ev?ev.title:r.eventId}`, `Ticket ${r.ticketCode}`);
      return r;
    },
    async updateRegistration(id, patch){
      const { data, error } = await sb.from('registrations').update(regToRow(patch)).eq('id', id).select().single();
      if(error){ console.error(error); throw error; }
      const r = regFromRow(data);
      const idx = db.registrations.findIndex(x=>x.id===id);
      if(idx>-1) db.registrations[idx] = r;
      if('status' in patch) await addAuditLog('registration_status_changed', 'registration', r.id, r.userSnapshot.name, `Status \u2192 ${patch.status}`);
      return r;
    },
    async deleteRegistration(id){
      const { error } = await sb.from('registrations').delete().eq('id', id);
      if(error){ console.error(error); throw error; }
      db.registrations = db.registrations.filter(r=>r.id!==id);
    },
    async checkIn(codeOrId){
      let r = db.registrations.find(r=>r.id===codeOrId) || db.registrations.find(r=>r.ticketCode.toLowerCase()===String(codeOrId).toLowerCase().trim());
      if(!r) return {ok:false, reason:'not_found'};
      if(r.status==='cancelled' || r.status==='rejected') return {ok:false, reason:'invalid_status', reg:r};
      if(r.checkedIn) return {ok:false, reason:'already', reg:r};
      const ev = db.events.find(e=>e.id===r.eventId);
      if(ev && Date.now() < ev.startDate) return {ok:false, reason:'too_early', reg:r, event:ev};
      const updated = await Store.updateRegistration(r.id, {checkedIn:true, checkedInAt:Date.now()});
      await addAuditLog('checked_in', 'registration', updated.id, updated.userSnapshot.name, ev?ev.title:'');
      return {ok:true, reg:updated};
    },

    // ---------- announcements ----------
    listAnnouncements(){ return db.announcements.slice().sort((a,b)=>b.createdAt-a.createdAt); },
    async createAnnouncement(a){
      const row = Object.assign({audience:{type:'everyone', courses:[]}, expires_at:null}, annToRow(a));
      const { data, error } = await sb.from('announcements').insert(row).select().single();
      if(error){ console.error(error); throw error; }
      const item = annFromRow(data);
      db.announcements.unshift(item);
      return item;
    },
    async deleteAnnouncement(id){
      const { error } = await sb.from('announcements').delete().eq('id', id);
      if(error){ console.error(error); throw error; }
      db.announcements = db.announcements.filter(a=>a.id!==id);
    },

    // ---------- notifications ----------
    listNotifications(userId){ return db.notifications.filter(n=>n.userId===userId).sort((a,b)=>b.createdAt-a.createdAt); },
    async notify(userId, message){
      const { data, error } = await sb.from('notifications').insert({user_id:userId, message}).select().single();
      if(error){ console.error(error); return; }
      if(currentAuthUser && userId===currentAuthUser.id) db.notifications.push(notifFromRow(data));
    },
    async markNotifRead(id){
      const { error } = await sb.from('notifications').update({read:true}).eq('id', id);
      if(error){ console.error(error); return; }
      const n = db.notifications.find(n=>n.id===id);
      if(n) n.read = true;
    },
    async markAllRead(userId){
      const { error } = await sb.from('notifications').update({read:true}).eq('user_id', userId).eq('read', false);
      if(error){ console.error(error); return; }
      db.notifications.filter(n=>n.userId===userId).forEach(n=>n.read=true);
    },

    // ---------- bulk-register templates ----------
    listBulkTemplates(createdBy){ return db.bulkTemplates.filter(t=> !createdBy || t.createdBy===createdBy).sort((a,b)=>b.createdAt-a.createdAt); },
    async saveBulkTemplate(tpl){
      const { data, error } = await sb.from('bulk_templates').insert({name:tpl.name, section:tpl.section, students:tpl.students, created_by:tpl.createdBy}).select().single();
      if(error){ console.error(error); throw error; }
      const item = tplFromRow(data);
      db.bulkTemplates.unshift(item);
      return item;
    },
    getBulkTemplate(id){ return db.bulkTemplates.find(t=>t.id===id); },
    async deleteBulkTemplate(id){
      const { error } = await sb.from('bulk_templates').delete().eq('id', id);
      if(error){ console.error(error); throw error; }
      db.bulkTemplates = db.bulkTemplates.filter(t=>t.id!==id);
    },

    // ---------- audit log ----------
    listAuditLog(){ return db.auditLog.slice(); },
    async logEvent(action, targetType, targetId, targetLabel, details){ await addAuditLog(action, targetType, targetId, targetLabel, details); }
  };

  window.Store = Store;
})();