/* =========================================================
   store.js — localStorage-backed "backend" for Campus Pass.
   Provides seed data + CRUD helpers for users, events,
   activities, registrations, announcements, notifications,
   bulk-register templates, and an audit log.
   ========================================================= */
(function(){
  // Each record type is persisted under its own localStorage key instead of
  // one shared blob. This means, e.g., editing/resetting event data can
  // never accidentally wipe accounts (or vice-versa) — every collection
  // lives in its own separately-addressable "table" and is read/written
  // independently, so it survives regardless of changes made elsewhere in
  // the app.
  const LEGACY_KEY = 'campuspass_db_v2'; // pre-split single-blob storage
  const TABLE_KEYS = {
    users: 'campuspass_db_users_v1',
    events: 'campuspass_db_events_v1',
    registrations: 'campuspass_db_registrations_v1',
    announcements: 'campuspass_db_announcements_v1',
    notifications: 'campuspass_db_notifications_v1',
    bulkTemplates: 'campuspass_db_bulkTemplates_v1',
    auditLog: 'campuspass_db_auditLog_v1',
    session: 'campuspass_db_session_v1'
  };
  const AUDIT_CAP = 500; // keep the log from growing localStorage without bound

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

  function seed(){
    const now = Date.now();
    const day = 86400000;
    const users = [
      {id:'u_admin', firstName:'Angela', middleName:'', lastName:'Reyes', noMiddleName:true, name:'Angela Reyes', email:'admin@school.edu', password:'admin123', role:'admin', active:true, studentId:'', level:'', course:'', strand:'', yearLevel:'', gradeLevel:'', section:''},
      {id:'u_faculty', firstName:'Ramon', middleName:'', lastName:'Cruz', noMiddleName:true, name:'Ramon Cruz', email:'rcruz@school.edu', password:'faculty123', role:'faculty', active:true, studentId:'19-00-0456', level:'', course:'', strand:'', yearLevel:'', gradeLevel:'', section:''},
      {id:'u_student', firstName:'Maria', middleName:'Lopez', lastName:'Santos', noMiddleName:false, name:'Maria Lopez Santos', email:'maria.santos@school.edu', password:'student123', role:'student', active:true, studentId:'23-00-0456', level:'college', course:'BS Information Technology', strand:'', yearLevel:'3rd Year', gradeLevel:'', section:'BSIT 3-A'},
      {id:'u_alumni', firstName:'John', middleName:'', lastName:'Dela Cruz', noMiddleName:true, name:'John Dela Cruz', email:'john.delacruz@alumni.school.edu', password:'alumni123', role:'alumni', active:true, studentId:'18-00-0789', level:'', course:'BS Accountancy (Batch 2022)', strand:'', yearLevel:'', gradeLevel:'', section:''},
    ];

    const events = [
      {
        id:'ev_anniv', title:'Founding Anniversary Week', category:'Anniversary',
        description:'A week-long celebration of the school\u2019s founding, featuring a sports fest, cultural program and food fair open to the whole community.',
        location:'Main Campus Grounds',
        startDate: now + 5*day, endDate: now + 9*day,
        status:'published', openToAlumni:true,
        audience:{roles:[], courses:[], yearLevels:[], gradeLevels:[]},
        coverTag:'ANNIV',
        createdBy:'u_admin',
        activities:[
          {id:'act_sports', name:'Sports Fest', description:'Inter-department sports competitions.', capacity:300, deadline: now + 4*day},
          {id:'act_program', name:'Cultural Program', description:'Evening program with performances and awarding.', capacity:600, deadline: now + 6*day},
          {id:'act_food', name:'Food Fair', description:'Booths from student orgs and local vendors.', capacity:400, deadline: now + 6*day},
        ]
      },
      {
        id:'ev_intrams', title:'Intramurals 2026', category:'Intramurals',
        description:'Annual sports tournament between departments. Registration is per sport; students may join more than one.',
        location:'School Gymnasium & Fields',
        startDate: now + 14*day, endDate: now + 18*day,
        status:'published', openToAlumni:false,
        audience:{roles:['student','faculty'], courses:[], yearLevels:[], gradeLevels:[]},
        coverTag:'SPORT',
        createdBy:'u_admin',
        activities:[
          {id:'act_bball', name:'Basketball', description:'5-on-5, single elimination.', capacity:120, deadline: now + 10*day},
          {id:'act_volley', name:'Volleyball', description:'Mixed doubles bracket.', capacity:100, deadline: now + 10*day},
          {id:'act_chess', name:'Chess', description:'Swiss system, 5 rounds.', capacity:40, deadline: now + 10*day},
        ]
      },
      {
        id:'ev_jobfair', title:'Job Fair 2026', category:'Job Fair',
        description:'Meet partner companies hiring for internships and entry-level roles. Open to graduating students and alumni.',
        location:'Student Center, Hall B',
        startDate: now + 21*day, endDate: now + 21*day,
        status:'published', openToAlumni:true,
        audience:{roles:[], courses:[], yearLevels:[], gradeLevels:[]},
        coverTag:'CAREER',
        createdBy:'u_admin',
        activities:[
          {id:'act_walkin', name:'Walk-in Interviews', description:'Bring 3 copies of your resume.', capacity:250, deadline: now + 19*day},
          {id:'act_seminar', name:'Career Readiness Seminar', description:'Resume & interview tips, 9:00 AM.', capacity:150, deadline: now + 19*day},
        ]
      },
      {
        id:'ev_recog', title:'Recognition Day', category:'Recognition Day',
        description:'Honoring students with academic and leadership distinctions this term.',
        location:'School Auditorium',
        startDate: now + 30*day, endDate: now + 30*day,
        status:'published', openToAlumni:false,
        audience:{roles:['student','faculty'], courses:[], yearLevels:[], gradeLevels:[]},
        coverTag:'HONORS',
        createdBy:'u_admin',
        activities:[
          {id:'act_ceremony', name:'Awarding Ceremony', description:'Formal attire required.', capacity:500, deadline: now + 27*day},
        ]
      },
      {
        id:'ev_xmas', title:'Christmas Party', category:'Christmas Party',
        description:'Department-wide Christmas celebration with games, gift exchange and dinner.',
        location:'Covered Court',
        startDate: now + 45*day, endDate: now + 45*day,
        status:'published', openToAlumni:false,
        audience:{roles:[], courses:[], yearLevels:[], gradeLevels:[]},
        coverTag:'PARTY',
        createdBy:'u_admin',
        activities:[
          {id:'act_dinner', name:'Dinner & Games', description:'Bring one wrapped gift (\u20b1150 budget).', capacity:350, deadline: now + 40*day},
        ]
      },
      {
        id:'ev_orient', title:'Freshmen Orientation (Draft)', category:'Orientation',
        description:'Orientation for incoming first-year students. Still being finalized.',
        location:'TBA',
        startDate: now + 60*day, endDate: now + 60*day,
        status:'draft', openToAlumni:false,
        audience:{roles:['student'], courses:[], yearLevels:['1st Year'], gradeLevels:[]},
        coverTag:'DRAFT',
        createdBy:'u_admin',
        activities:[
          {id:'act_orient1', name:'General Assembly', description:'', capacity:400, deadline: now + 58*day},
        ]
      },
    ];

    const registrations = [
      {
        id:'r_seed1', ticketCode: ticketCode(), eventId:'ev_anniv', activityIds:['act_sports','act_food'],
        userId:'u_student', userSnapshot:{name:'Maria Lopez Santos', email:'maria.santos@school.edu', role:'student', studentId:'23-00-0456', course:'BS Information Technology', yearLevel:'3rd Year', section:'BSIT 3-A'},
        extraFields:{}, status:'approved', checkedIn:false, checkedInAt:null,
        registeredAt: now - 2*day, addedBy:'u_student', bulkGroupId:null
      }
    ];

    const announcements = [
      {id:'an_seed1', title:'Anniversary Week schedule released', body:'Full schedule for Sports Fest, Cultural Program and Food Fair is now posted on the event page. Please check activity deadlines before registering.', eventId:'ev_anniv', createdAt: now - day, createdBy:'u_admin', createdByRole:'admin', audience:{type:'everyone', courses:[]}, expiresAt:null},
    ];

    const notifications = [];
    const bulkTemplates = [];
    const auditLog = [];

    return {users, events, registrations, announcements, notifications, bulkTemplates, auditLog, session:null};
  }

  function readTable(name){
    const raw = localStorage.getItem(TABLE_KEYS[name]);
    if(raw===null || raw===undefined) return undefined;
    try{ return JSON.parse(raw); }catch(e){ return undefined; }
  }

  function hasAnyTables(){
    return Object.keys(TABLE_KEYS).some(k=> localStorage.getItem(TABLE_KEYS[k])!==null);
  }

  function load(){
    try{
      if(!hasAnyTables()){
        // First run on this browser under the split-storage scheme. If an
        // older single-blob save exists, migrate its collections into their
        // own tables (and remove the legacy blob) so nobody loses data when
        // upgrading; otherwise seed a fresh demo dataset.
        const legacyRaw = localStorage.getItem(LEGACY_KEY);
        let db;
        if(legacyRaw){
          try{ db = Object.assign(seed(), JSON.parse(legacyRaw)); }
          catch(e){ db = seed(); }
        } else {
          db = seed();
        }
        save(db);
        localStorage.removeItem(LEGACY_KEY);
        return db;
      }
      const db = {};
      Object.keys(TABLE_KEYS).forEach(name=>{
        const val = readTable(name);
        db[name] = val===undefined ? (name==='session' ? null : []) : val;
      });
      // Defensive defaults for anything added after a given save was made.
      db.bulkTemplates = db.bulkTemplates || [];
      db.auditLog = db.auditLog || [];
      return db;
    }catch(e){
      const s = seed(); save(s); return s;
    }
  }

  function save(db){
    Object.keys(TABLE_KEYS).forEach(name=>{
      try{ localStorage.setItem(TABLE_KEYS[name], JSON.stringify(db[name])); }
      catch(e){ /* storage full/unavailable — ignore for this table */ }
    });
  }

  let db = load();

  function addAuditLog(action, targetType, targetId, targetLabel, details){
    const actor = db.session ? db.users.find(u=>u.id===db.session) : null;
    db.auditLog.unshift({
      id: uid('log'), ts: Date.now(),
      actorId: actor ? actor.id : null,
      actorName: actor ? actor.name : 'Self-registration',
      actorRole: actor ? actor.role : '\u2014',
      action, targetType, targetId, targetLabel: targetLabel||'', details: details||''
    });
    if(db.auditLog.length > AUDIT_CAP) db.auditLog.length = AUDIT_CAP;
  }

  const Store = {
    uid, ticketCode, fullName,
    reset(){ db = seed(); save(db); },
    all(){ return db; },

    // ---------- session ----------
    getSession(){ return db.session; },
    setSession(userId){ db.session = userId; save(db); },
    clearSession(){ db.session = null; save(db); },
    currentUser(){ return db.session ? db.users.find(u=>u.id===db.session) : null; },

    // ---------- users ----------
    findUserByEmail(email){ return db.users.find(u=>u.email.toLowerCase()===String(email).toLowerCase()); },
    findUserByStudentId(studentId){
      if(!studentId) return null;
      return db.users.find(u=>u.studentId && u.studentId.toLowerCase()===String(studentId).toLowerCase());
    },
    createUser(u){
      const user = Object.assign({id:uid('u'), active:true, studentId:'', level:'', course:'', strand:'', yearLevel:'', gradeLevel:'', section:'', middleName:'', noMiddleName:false}, u);
      user.name = fullName(user);
      db.users.push(user); save(db);
      addAuditLog('account_created', 'user', user.id, user.name, `Role: ${user.role}`);
      save(db);
      return user;
    },
    getUser(id){ return db.users.find(u=>u.id===id); },
    listUsers(){ return db.users.slice(); },
    updateUser(id, patch){
      const u = db.users.find(u=>u.id===id);
      if(!u) return null;
      const changedKeys = Object.keys(patch).filter(k=>JSON.stringify(patch[k])!==JSON.stringify(u[k]));
      Object.assign(u, patch);
      if('firstName' in patch || 'middleName' in patch || 'lastName' in patch || 'noMiddleName' in patch){
        u.name = fullName(u);
      }
      save(db);
      if(changedKeys.length){
        let action = 'account_updated';
        if(changedKeys.includes('active')) action = patch.active ? 'account_reactivated' : 'account_deactivated';
        else if(changedKeys.includes('role')) action = 'role_changed';
        else if(changedKeys.includes('password')) action = 'password_changed';
        addAuditLog(action, 'user', u.id, u.name, changedKeys.filter(k=>k!=='password').join(', ') || 'password');
        save(db);
      }
      return u;
    },

    // ---------- events ----------
    listEvents(){ return db.events.slice().sort((a,b)=>a.startDate-b.startDate); },
    getEvent(id){ return db.events.find(e=>e.id===id); },
    createEvent(ev){
      const event = Object.assign({
        id:uid('ev'), status:'draft', activities:[], openToAlumni:false,
        requiresApproval:false,
        audience:{roles:[],courses:[],yearLevels:[],gradeLevels:[]}
      }, ev);
      db.events.push(event); save(db); return event;
    },
    updateEvent(id, patch){
      const ev = db.events.find(e=>e.id===id);
      if(!ev) return null;
      Object.assign(ev, patch); save(db); return ev;
    },
    deleteEvent(id){
      db.events = db.events.filter(e=>e.id!==id);
      db.registrations = db.registrations.filter(r=>r.eventId!==id);
      save(db);
    },
    addActivity(eventId, activity){
      const ev = db.events.find(e=>e.id===eventId);
      if(!ev) return null;
      const act = Object.assign({id:uid('act'), capacity:0, deadline:null, description:''}, activity);
      ev.activities.push(act); save(db); return act;
    },
    updateActivity(eventId, activityId, patch){
      const ev = db.events.find(e=>e.id===eventId);
      if(!ev) return null;
      const act = ev.activities.find(a=>a.id===activityId);
      if(!act) return null;
      Object.assign(act, patch); save(db); return act;
    },
    deleteActivity(eventId, activityId){
      const ev = db.events.find(e=>e.id===eventId);
      if(!ev) return;
      ev.activities = ev.activities.filter(a=>a.id!==activityId);
      db.registrations.forEach(r=>{ r.activityIds = r.activityIds.filter(id=>id!==activityId); });
      save(db);
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

    // Registrations may be edited by whoever added them within 24h of creation.
    isEditableWindow(reg){
      return (Date.now() - reg.registeredAt) < (24*60*60*1000);
    },

    createRegistration(reg){
      const r = Object.assign({
        id:uid('r'), ticketCode:ticketCode(), status:'approved', checkedIn:false,
        checkedInAt:null, registeredAt:Date.now(), extraFields:{}, bulkGroupId:null
      }, reg);
      db.registrations.push(r); save(db);
      const ev = db.events.find(e=>e.id===r.eventId);
      addAuditLog('registration_created', 'registration', r.id, `${r.userSnapshot.name} \u2192 ${ev?ev.title:r.eventId}`, `Ticket ${r.ticketCode}`);
      save(db);
      return r;
    },
    updateRegistration(id, patch){
      const r = db.registrations.find(r=>r.id===id);
      if(!r) return null;
      Object.assign(r, patch); save(db);
      if('status' in patch){
        addAuditLog('registration_status_changed', 'registration', r.id, r.userSnapshot.name, `Status \u2192 ${patch.status}`);
        save(db);
      }
      return r;
    },
    deleteRegistration(id){
      db.registrations = db.registrations.filter(r=>r.id!==id); save(db);
    },
    checkIn(codeOrId){
      let r = db.registrations.find(r=>r.id===codeOrId) || db.registrations.find(r=>r.ticketCode.toLowerCase()===String(codeOrId).toLowerCase().trim());
      if(!r) return {ok:false, reason:'not_found'};
      if(r.status==='cancelled' || r.status==='rejected') return {ok:false, reason:'invalid_status', reg:r};
      if(r.checkedIn) return {ok:false, reason:'already', reg:r};
      const ev = db.events.find(e=>e.id===r.eventId);
      if(ev && Date.now() < ev.startDate) return {ok:false, reason:'too_early', reg:r, event:ev};
      r.checkedIn = true; r.checkedInAt = Date.now(); save(db);
      addAuditLog('checked_in', 'registration', r.id, r.userSnapshot.name, ev?ev.title:'');
      save(db);
      return {ok:true, reg:r};
    },

    // ---------- announcements ----------
    listAnnouncements(){ return db.announcements.slice().sort((a,b)=>b.createdAt-a.createdAt); },
    createAnnouncement(a){
      const item = Object.assign({id:uid('an'), createdAt:Date.now(), audience:{type:'everyone', courses:[]}, expiresAt:null}, a);
      db.announcements.unshift(item); save(db); return item;
    },
    deleteAnnouncement(id){ db.announcements = db.announcements.filter(a=>a.id!==id); save(db); },

    // ---------- notifications ----------
    listNotifications(userId){ return db.notifications.filter(n=>n.userId===userId).sort((a,b)=>b.createdAt-a.createdAt); },
    notify(userId, message){
      db.notifications.push({id:uid('n'), userId, message, read:false, createdAt:Date.now()});
      save(db);
    },
    markNotifRead(id){
      const n = db.notifications.find(n=>n.id===id);
      if(n){ n.read = true; save(db); }
    },
    markAllRead(userId){
      db.notifications.filter(n=>n.userId===userId).forEach(n=>n.read=true); save(db);
    },

    // ---------- bulk-register templates ----------
    listBulkTemplates(createdBy){ return db.bulkTemplates.filter(t=> !createdBy || t.createdBy===createdBy).sort((a,b)=>b.createdAt-a.createdAt); },
    saveBulkTemplate(tpl){
      const item = Object.assign({id:uid('tpl'), createdAt:Date.now()}, tpl);
      db.bulkTemplates.unshift(item); save(db); return item;
    },
    getBulkTemplate(id){ return db.bulkTemplates.find(t=>t.id===id); },
    deleteBulkTemplate(id){ db.bulkTemplates = db.bulkTemplates.filter(t=>t.id!==id); save(db); },

    // ---------- audit log ----------
    listAuditLog(){ return db.auditLog.slice(); },
    logEvent(action, targetType, targetId, targetLabel, details){ addAuditLog(action, targetType, targetId, targetLabel, details); save(db); }
  };

  window.Store = Store;
})();
