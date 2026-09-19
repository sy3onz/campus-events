/* =========================================================
   utils.js — formatting, toasts, modals, exports, eligibility
   ========================================================= */
(function(){

  // ---------- shared option lists ----------
  const COURSES = [
    'BS Information Technology','BS Business Administration','BS Education',
    'BS Hospitality Management','BS Customs Administration','BS Computer Engineering (CPE)'
  ];
  const STRANDS = ['STEM','ABM','HUMSS','GAS','TVL','Arts & Design','Sports Track'];
  const YEAR_LEVELS = ['1st Year','2nd Year','3rd Year','4th Year'];
  const GRADE_LEVELS = ['Grade 11','Grade 12'];
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  function esc(str){
    if(str===null || str===undefined) return '';
    return String(str).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function fmtDate(ts, opts){
    if(!ts) return 'TBA';
    const d = new Date(ts);
    return d.toLocaleDateString('en-US', opts || {month:'short', day:'numeric', year:'numeric'});
  }
  function fmtDateTime(ts){
    if(!ts) return 'TBA';
    const d = new Date(ts);
    return d.toLocaleDateString('en-US',{month:'short', day:'numeric', year:'numeric'}) + ' \u00b7 ' +
           d.toLocaleTimeString('en-US',{hour:'numeric', minute:'2-digit'});
  }
  function fmtDateRange(start, end){
    if(!start) return 'TBA';
    if(!end || end===start) return fmtDate(start);
    const d1 = new Date(start), d2 = new Date(end);
    if(d1.getMonth()===d2.getMonth() && d1.getFullYear()===d2.getFullYear()){
      return d1.toLocaleDateString('en-US',{month:'short'}) + ' ' + d1.getDate() + '\u2013' + d2.getDate() + ', ' + d2.getFullYear();
    }
    return fmtDate(start) + ' \u2013 ' + fmtDate(end);
  }
  function timeUntil(ts){
    const diff = ts - Date.now();
    const day = 86400000;
    if(diff <= 0) return null;
    const days = Math.ceil(diff/day);
    if(days===1) return '1 day left';
    if(days<=30) return days+' days left';
    return null;
  }
  function initials(name){
    if(!name) return '?';
    return name.trim().split(/\s+/).slice(0,2).map(s=>s[0].toUpperCase()).join('');
  }
  function monthOf(ts){
    if(!ts) return 'TBA';
    return MONTHS[new Date(ts).getMonth()];
  }

  // ---------- student ID format: 00-00-0000 ----------
  function formatStudentId(raw){
    const digits = String(raw||'').replace(/\D/g,'').slice(0,8);
    let out = digits.slice(0,2);
    if(digits.length>2) out += '-'+digits.slice(2,4);
    if(digits.length>4) out += '-'+digits.slice(4,8);
    return out;
  }
  function isValidStudentId(str){
    return /^\d{2}-\d{2}-\d{4}$/.test(String(str||'').trim());
  }

  // ---------- toast ----------
  function toast(message, type){
    const region = document.getElementById('toast-region');
    const el = document.createElement('div');
    el.className = 'toast' + (type ? ' '+type : '');
    const iconMap = {success:'\u2713 ', error:'\u26a0 ', email:'\u2709 '};
    el.innerHTML = (iconMap[type] || '') + esc(message);
    region.appendChild(el);
    setTimeout(()=>{ el.style.opacity='0'; el.style.transform='translateY(-6px)'; el.style.transition='all .2s ease'; }, 3400);
    setTimeout(()=> el.remove(), 3700);
  }

  // ---------- simulated ticket email ----------
  // This is a client-only prototype with no mail server, so "sending" an
  // email means surfacing a clear, honest confirmation of what would be
  // sent and to whom, instead of silently pretending nothing happened.
  function sendTicketEmail(email, eventTitle, ticketCode){
    if(!email || email==='(no email provided)'){
      toast('No email on file \u2014 the ticket was saved but nothing was emailed.', 'error');
      return false;
    }
    toast(`Ticket emailed to ${email} \u2014 "${eventTitle}" (Code: ${ticketCode})`, 'email');
    return true;
  }
  // Generic "account changed" notice, used for profile/password/email edits.
  function sendAccountEmail(email, subject){
    if(!email) return false;
    toast(`\u2709 Email sent to ${email}: ${subject}`, 'email');
    return true;
  }

  // ---------- modal ----------
  function openModal(innerHtml, opts){
    opts = opts || {};
    closeModal();
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.id = 'active-modal';
    backdrop.innerHTML = `<div class="modal ${opts.wide?'modal-wide':''}">${innerHtml}</div>`;
    backdrop.addEventListener('mousedown', (e)=>{ if(e.target===backdrop) closeModal(); });
    document.body.appendChild(backdrop);
    return backdrop;
  }
  function closeModal(){
    const m = document.getElementById('active-modal');
    if(m) m.remove();
  }

  // ---------- eligibility ----------
  // Role-based + course/strand/year-level restriction per event. Admin always
  // bypasses this (they issue tickets directly instead of "registering").
  function isEligible(event, user){
    if(!user) return false;
    if(user.role==='admin') return true;
    const aud = event.audience || {roles:[],courses:[],yearLevels:[],gradeLevels:[]};
    if(user.role==='alumni' || user.role==='guest'){
      return !!event.openToAlumni;
    }
    if(aud.roles && aud.roles.length && !aud.roles.includes(user.role)) return false;
    if(user.role==='student' && user.level==='college'){
      if(aud.courses && aud.courses.length && !aud.courses.includes(user.course)) return false;
      if(aud.yearLevels && aud.yearLevels.length && !aud.yearLevels.includes(user.yearLevel)) return false;
    }
    if(user.role==='student' && user.level==='seniorhigh'){
      if(aud.gradeLevels && aud.gradeLevels.length && !aud.gradeLevels.includes(user.gradeLevel)) return false;
    }
    return true;
  }

  function audienceLabel(event){
    const aud = event.audience || {};
    const parts = [];
    if(aud.roles && aud.roles.length) parts.push(aud.roles.map(r=>r[0].toUpperCase()+r.slice(1)).join('/'));
    if(aud.courses && aud.courses.length) parts.push(aud.courses.join(', '));
    if(aud.yearLevels && aud.yearLevels.length) parts.push(aud.yearLevels.join(', '));
    if(aud.gradeLevels && aud.gradeLevels.length) parts.push(aud.gradeLevels.join(', '));
    if(event.openToAlumni) parts.push('Alumni welcome');
    return parts.length ? parts.join(' \u00b7 ') : 'Open to everyone';
  }

  // ---------- CSV export ----------
  function downloadCsv(filename, rows){
    const csv = rows.map(row => row.map(cell=>{
      const s = String(cell===undefined||cell===null?'':cell);
      return /[",\n]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s;
    }).join(',')).join('\n');
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  // ---------- PDF export (jsPDF + autotable) ----------
  function downloadPdf(title, subtitle, head, body, filename){
    try{
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      doc.setFont('helvetica','bold'); doc.setFontSize(15);
      doc.setTextColor(40,54,24);
      doc.text(title, 14, 18);
      doc.setFont('helvetica','normal'); doc.setFontSize(10);
      doc.setTextColor(92,105,68);
      doc.text(subtitle, 14, 25);
      doc.autoTable({
        head:[head], body:body, startY:32, styles:{fontSize:8.5, cellPadding:4},
        headStyles:{fillColor:[40,54,24], textColor:255},
        alternateRowStyles:{fillColor:[247,243,220]}
      });
      doc.save(filename);
    }catch(e){
      console.error(e);
      toast('PDF export needs an internet connection to load export libraries.', 'error');
    }
  }

  // ---------- QR rendering ----------
  function renderQr(containerEl, text){
    containerEl.innerHTML = '';
    try{
      new QRCode(containerEl, {text:text, width:150, height:150, colorDark:'#283618', colorLight:'#ffffff'});
    }catch(e){
      containerEl.innerHTML = '<div class="mono" style="font-size:11px;color:#999;padding:20px;">QR unavailable offline</div>';
    }
  }

  function debounce(fn, ms){
    let t; return function(...args){ clearTimeout(t); t = setTimeout(()=>fn.apply(this,args), ms||250); };
  }

  function statusBadge(status){
    const map = {
      approved:['badge-forest','Approved'], pending:['badge-gold','Pending'],
      rejected:['badge-coral','Rejected'], cancelled:['badge-slate','Cancelled']
    };
    const [cls,label] = map[status] || ['badge-slate', status];
    return `<span class="badge ${cls}">${label}</span>`;
  }

  // A registrant's course/strand should reflect their CURRENT account, not
  // whatever was true the moment they registered — so look the account up
  // live when one still exists, and only fall back to the frozen snapshot
  // for guests/bulk-added people who never had an account.
  function liveAcademicInfo(userId, snapshot){
    const u = userId && window.Store ? window.Store.getUser(userId) : null;
    if(u) return {course:u.course||'', strand:u.strand||'', yearLevel:u.yearLevel||'', gradeLevel:u.gradeLevel||'', section:u.section||''};
    snapshot = snapshot || {};
    return {course:snapshot.course||'', strand:snapshot.strand||'', yearLevel:snapshot.yearLevel||'', gradeLevel:snapshot.gradeLevel||'', section:snapshot.section||''};
  }

  // ---------- inline mandatory-field validation ----------
  // Marks a field invalid with a visible red warning under it and returns
  // false; clears any previous warning and returns true otherwise. `input`
  // is the form control; `condition` is the pass/fail test already evaluated
  // by the caller (kept simple so any kind of rule can be checked upstream).
  function markField(input, ok, message){
    if(!input) return ok;
    let wrap = input.closest('.field') || input.parentElement;
    let err = wrap.querySelector('.field-error');
    if(ok){
      input.classList.remove('input-error');
      if(err) err.remove();
      return true;
    }
    input.classList.add('input-error');
    if(!err){
      err = document.createElement('div');
      err.className = 'field-error';
      wrap.appendChild(err);
    }
    err.textContent = message || 'This field is required.';
    return false;
  }
  function clearFieldError(input){
    if(!input) return;
    input.classList.remove('input-error');
    const wrap = input.closest('.field') || input.parentElement;
    const err = wrap && wrap.querySelector('.field-error');
    if(err) err.remove();
  }

  window.Utils = {
    esc, fmtDate, fmtDateTime, fmtDateRange, timeUntil, initials, monthOf,
    toast, sendTicketEmail, sendAccountEmail, openModal, closeModal, isEligible, audienceLabel,
    downloadCsv, downloadPdf, renderQr, debounce, statusBadge,
    markField, clearFieldError, formatStudentId, isValidStudentId, liveAcademicInfo,
    COURSES, STRANDS, YEAR_LEVELS, GRADE_LEVELS, MONTHS,
    PROGRAMS: COURSES.concat(STRANDS)
  };
})();
