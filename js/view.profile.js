/* =========================================================
   view.profile.js — "My ID": a Campus Pass ID-card view of the
   signed-in user's own account details.
   ========================================================= */
(function(){

  // Every role uses the same `studentId` column under the hood (see
  // view.auth.js, which relabels the same signup field per role), so we
  // just relabel it here too instead of treating it as student-only.
  const ID_LABELS = {
    student:'Student ID', faculty:'Employee ID', admin:'Staff ID',
    alumni:'Alumni ID', guest:'Guest ID'
  };
  const PASS_LABELS = {
    student:'Student Pass', faculty:'Faculty Pass', admin:'Staff Pass',
    alumni:'Alumni Pass', guest:'Guest Pass'
  };

  // The short "role · program" line shown under the name on the card face.
  function subtitleLine(user){
    if(user.role==='student'){
      if(user.level==='seniorhigh') return [user.gradeLevel, user.strand].filter(Boolean).join(' \u00b7 ');
      return [user.yearLevel, user.course].filter(Boolean).join(' \u00b7 ');
    }
    return user.role[0].toUpperCase()+user.role.slice(1);
  }

  function detailRows(user){
    const rows = [];
    if(user.role==='student'){
      if(user.level==='seniorhigh'){
        rows.push(['Strand', user.strand||'\u2014']);
        rows.push(['Grade level', user.gradeLevel||'\u2014']);
      } else {
        rows.push(['Course', user.course||'\u2014']);
        rows.push(['Year level', user.yearLevel||'\u2014']);
      }
      rows.push(['Section', user.section||'\u2014']);
    }
    return rows;
  }

  function renderProfile(user){
    const root = document.getElementById('app-root');
    const idLabel = ID_LABELS[user.role] || 'ID Number';
    const passLabel = PASS_LABELS[user.role] || 'Campus Pass';
    const isActive = user.active!==false;
    const rows = detailRows(user);

    const body = `
      <div class="qr-pass">
        <div class="qr-pass-card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;position:relative;">
            <div style="display:flex;align-items:center;gap:9px;">
              <div class="brand-mark" style="width:28px;height:28px;font-size:12.5px;">CP</div>
              <div style="text-align:left;">
                <div style="font-family:var(--font-display);font-size:13px;font-weight:600;color:#fff;line-height:1.15;">Campus Pass</div>
                <div style="font-size:9.5px;color:rgba(255,255,255,.55);letter-spacing:.07em;text-transform:uppercase;">${passLabel}</div>
              </div>
            </div>
            <span class="badge" style="position:relative;background:${isActive?'rgba(232,163,61,.18)':'rgba(188,108,37,.28)'};color:${isActive?'var(--gold)':'#F0C89B'};">${isActive?'Active':'Inactive'}</span>
          </div>
          <div style="display:flex;align-items:center;gap:14px;margin-top:20px;position:relative;text-align:left;">
            <div style="width:56px;height:56px;border-radius:50%;background:rgba(255,255,255,.12);color:var(--gold);display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-size:19px;font-weight:600;flex:none;">${Utils.initials(user.name)}</div>
            <div style="min-width:0;">
              <div style="font-family:var(--font-display);font-size:19px;color:#fff;line-height:1.2;">${Utils.esc(user.name)}</div>
              <div style="font-size:11.5px;color:rgba(255,255,255,.65);margin-top:2px;">${Utils.esc(subtitleLine(user))}</div>
            </div>
          </div>
          <div class="qr-box" id="profile-qr-box"></div>
          <div style="position:relative;">
            <div style="font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.5);">${idLabel}</div>
            <div class="qr-pass-code" style="margin-top:2px;">${user.studentId ? Utils.esc(user.studentId) : 'Not on file'}</div>
          </div>
        </div>

        <div class="card card-pad" style="text-align:left;margin-top:16px;">
          <div style="font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--slate-light);margin-bottom:8px;">Profile details</div>
          <div style="font-size:13px;line-height:1.9;">
            <div><strong>Full name:</strong> ${Utils.esc(user.name)}</div>
            <div><strong>${idLabel}:</strong> ${user.studentId ? Utils.esc(user.studentId) : 'Not on file'}</div>
            ${rows.map(([label,val])=>`<div><strong>${label}:</strong> ${Utils.esc(val)}</div>`).join('')}
            <div><strong>Role:</strong> <span style="text-transform:capitalize;">${Utils.esc(user.role)}</span></div>
            <div><strong>Email:</strong> ${Utils.esc(user.email)}</div>
            <div><strong>Member since:</strong> ${Utils.fmtDate(user.createdAt)}</div>
            <div><strong>Status:</strong> ${isActive?'Active':'Deactivated'}</div>
          </div>
          <div class="divider"></div>
          <p style="font-size:12px;">This QR code identifies your Campus Pass account \u2014 present it alongside your event tickets if an organizer needs to verify who you are.</p>
          <button class="btn btn-outline btn-block" id="download-id-pdf">${Comp.Icon.download} Download ID as PDF</button>
          <button class="btn btn-ghost btn-block" style="margin-top:8px;" data-nav="/account">${Comp.Icon.settings} Edit profile in Account Settings</button>
        </div>
      </div>`;

    root.innerHTML = Comp.shell({
      activePath:'/profile', title:'My ID', sub:'Your Campus Pass identification', user, body
    });

    Utils.renderQr(document.getElementById('profile-qr-box'), user.studentId || user.id);

    document.getElementById('download-id-pdf').addEventListener('click', ()=>{
      try{
        const { jsPDF } = window.jspdf;
        // Wallet-card proportions (roughly CR80, scaled up for readability).
        const doc = new jsPDF({unit:'mm', format:[90, 130]});
        doc.setFillColor(40,54,24); doc.rect(0,0,90,42,'F');
        doc.setTextColor(255,255,255); doc.setFontSize(9);
        doc.text('CAMPUS PASS \u2014 '+passLabel.toUpperCase(), 8, 12);
        doc.setFontSize(14);
        doc.text(user.name, 8, 24, {maxWidth:74});
        doc.setFontSize(9); doc.setTextColor(232,163,61);
        doc.text(subtitleLine(user) || ' ', 8, 32, {maxWidth:74});

        doc.setTextColor(40,54,24); doc.setFontSize(10);
        let y = 52;
        const line = (label, value)=>{ doc.setFont('helvetica','bold'); doc.text(label+':', 8, y); doc.setFont('helvetica','normal'); doc.text(String(value||'\u2014'), 34, y, {maxWidth:48}); y += 8; };
        line(idLabel, user.studentId);
        rows.forEach(([label,val])=> line(label, val));
        line('Role', user.role[0].toUpperCase()+user.role.slice(1));
        line('Status', isActive?'Active':'Deactivated');
        line('Member since', Utils.fmtDate(user.createdAt));

        doc.setDrawColor(230,224,190); doc.line(8, y, 82, y); y += 7;
        doc.setFontSize(8); doc.setTextColor(120,120,120);
        doc.text('Email: '+user.email, 8, y, {maxWidth:74});

        doc.save('campus-pass-id-'+(user.studentId||user.id)+'.pdf');
      }catch(err){
        Utils.toast('PDF export needs the export library to load (internet connection).', 'error');
      }
    });
  }

  window.Views = window.Views || {};
  window.Views.renderProfile = renderProfile;
})();
