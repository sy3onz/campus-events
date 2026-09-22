/* =========================================================
   view.account.js — account settings: update profile (incl.
   academic info & photo), change password, and past-events history
   ========================================================= */
(function(){
  window.Forms = window.Forms || {};

  const MAX_AVATAR_BYTES = 10 * 1024 * 1024; // 10MB

  // Tracks a pending, not-yet-saved avatar change between the file-input/
  // remove-button handlers and the form submit handler below. Reset at the
  // top of every render so a fresh screen always starts from "unchanged."
  let avatarState = { changed:false, value:null };

  function academicFieldsHtml(user){
    if(user.role!=='student') return '';
    const isShs = user.level==='seniorhigh';
    return `
      <div class="divider"></div>
      <h3 style="font-size:13px;margin-bottom:12px;color:var(--slate);text-transform:uppercase;letter-spacing:.04em;">Academic info</h3>
      ${isShs ? `
      <div class="row">
        <div class="field">
          <label>Strand <span class="req">*</span></label>
          <select name="strand" required>
            ${Utils.STRANDS.map(s=>`<option ${user.strand===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>Grade level <span class="req">*</span></label>
          <select name="gradeLevel" required>
            ${Utils.GRADE_LEVELS.map(g=>`<option ${user.gradeLevel===g?'selected':''}>${g}</option>`).join('')}
          </select>
        </div>
      </div>` : `
      <div class="row">
        <div class="field">
          <label>Course <span class="req">*</span></label>
          <select name="course" required>
            ${Utils.COURSES.map(c=>`<option ${user.course===c?'selected':''}>${c}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>Year level <span class="req">*</span></label>
          <select name="yearLevel" required>
            ${Utils.YEAR_LEVELS.map(y=>`<option ${user.yearLevel===y?'selected':''}>${y}</option>`).join('')}
          </select>
        </div>
      </div>`}
      <div class="field">
        <label>Section</label>
        <input type="text" name="section" value="${Utils.esc(user.section||'')}" placeholder="e.g. BSIT 3-A or Grade 11 - STEM A">
      </div>`;
  }

  function pastEventsHtml(user){
    const items = Store.listRegistrationsForUser(user.id)
      .filter(r=>r.status!=='cancelled')
      .map(r=>({reg:r, ev:Store.getEvent(r.eventId)}))
      .filter(x=>x.ev && Comp.eventStatusOf(x.ev)==='past')
      .sort((a,b)=>b.ev.startDate - a.ev.startDate);

    if(!items.length){
      return `<p style="font-size:13px;">No past events yet \u2014 events you've attended will be listed here once they've taken place.</p>`;
    }
    return `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Event</th><th>Date</th><th>Ticket</th><th>Status</th><th></th></tr></thead>
          <tbody>
            ${items.map(({reg,ev})=>`
              <tr>
                <td>${Utils.esc(ev.title)}</td>
                <td>${Utils.fmtDateRange(ev.startDate, ev.endDate)}</td>
                <td class="mono">${reg.ticketCode}</td>
                <td>${Utils.statusBadge(reg.status)}${reg.checkedIn?' <span class="badge badge-forest">Checked in</span>':''}</td>
                <td><button class="btn btn-ghost btn-sm" data-nav="/ticket/${reg.id}">View</button></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }

  function renderAccountSettings(user){
    const root = document.getElementById('app-root');
    avatarState = { changed:false, value:user.avatarUrl||null };

    const body = `
      <div class="grid grid-2" style="align-items:start;">
        <div class="card card-pad">
          <h3 style="font-size:15px;margin-bottom:12px;">Profile details</h3>
          <form data-form="update-profile">
            <div class="field">
              <label>Profile photo</label>
              <div style="display:flex;align-items:center;gap:14px;">
                <div id="acct-avatar-preview">${Comp.avatarHtml(user, 64)}</div>
                <div>
                  <div style="display:flex;gap:8px;">
                    <button type="button" class="btn btn-outline btn-sm" id="acct-avatar-pick">Choose photo</button>
                    ${user.avatarUrl?`<button type="button" class="btn btn-ghost btn-sm" id="acct-avatar-remove">Remove</button>`:''}
                  </div>
                  <div class="hint">JPG, PNG or WEBP, up to 10MB.</div>
                </div>
                <input type="file" id="acct-avatar-input" accept="image/*" style="display:none;">
              </div>
            </div>
            <div class="row">
              <div class="field">
                <label>First name <span class="req">*</span></label>
                <input type="text" name="firstName" value="${Utils.esc(user.firstName||'')}" required>
              </div>
              <div class="field">
                <label>Middle name</label>
                <input type="text" name="middleName" id="acct-middleName" value="${Utils.esc(user.middleName||'')}" ${user.noMiddleName?'disabled':''}>
              </div>
            </div>
            <div class="check-row" style="margin-top:-8px;">
              <input type="checkbox" id="acct-noMiddle" ${user.noMiddleName?'checked':''}>
              <label for="acct-noMiddle" style="margin:0;font-weight:400;">I have no middle name</label>
            </div>
            <div class="field">
              <label>Last name <span class="req">*</span></label>
              <input type="text" name="lastName" value="${Utils.esc(user.lastName||'')}" required>
            </div>
            <div class="field">
              <label>Email address <span class="req">*</span></label>
              <input type="email" name="email" value="${Utils.esc(user.email)}" required>
              <div class="hint">Update this if your school email is no longer active. We'll email a confirmation to the new address.</div>
            </div>
            ${academicFieldsHtml(user)}
            <button class="btn btn-gold" type="submit" style="margin-top:4px;">Save changes</button>
          </form>
        </div>
        <div class="card card-pad">
          <h3 style="font-size:15px;margin-bottom:12px;">Change password</h3>
          <form data-form="change-password">
            <div class="field">
              <label>Current password <span class="req">*</span></label>
              <div class="password-wrap">
                <input type="password" name="current" id="acct-current-password" autocomplete="off" required>
                <button type="button" class="password-toggle" data-toggle-password="acct-current-password">${Comp.Icon.eye}</button>
              </div>
            </div>
            <div class="field">
              <label>New password <span class="req">*</span></label>
              <div class="password-wrap">
                <input type="password" name="next" id="acct-new-password" autocomplete="new-password" minlength="6" required>
                <button type="button" class="password-toggle" data-toggle-password="acct-new-password">${Comp.Icon.eye}</button>
              </div>
              <div class="hint">At least 6 characters.</div>
            </div>
            <div class="field">
              <label>Confirm new password <span class="req">*</span></label>
              <div class="password-wrap">
                <input type="password" name="confirm" id="acct-confirm-password" autocomplete="new-password" minlength="6" required>
                <button type="button" class="password-toggle" data-toggle-password="acct-confirm-password">${Comp.Icon.eye}</button>
              </div>
            </div>
            <button class="btn btn-outline" type="submit">Update password</button>
          </form>
        </div>
      </div>
      <div class="card card-pad" style="margin-top:16px;">
        <h3 style="font-size:15px;margin-bottom:12px;">Past events you've joined</h3>
        ${pastEventsHtml(user)}
      </div>`;

    root.innerHTML = Comp.shell({
      activePath:'/account', title:'Account Settings', sub:'Manage your profile and login details', user, body
    });

    const noMiddleChk = document.getElementById('acct-noMiddle');
    const middleInput = document.getElementById('acct-middleName');
    noMiddleChk.addEventListener('change', ()=>{
      middleInput.disabled = noMiddleChk.checked;
      if(noMiddleChk.checked) middleInput.value = '';
    });

    // ---------- avatar upload ----------
    const avatarInput = document.getElementById('acct-avatar-input');
    const avatarPreview = document.getElementById('acct-avatar-preview');
    document.getElementById('acct-avatar-pick').addEventListener('click', ()=> avatarInput.click());
    avatarInput.addEventListener('change', ()=>{
      const file = avatarInput.files[0];
      avatarInput.value = ''; // allow re-picking the same file later
      if(!file) return;
      if(!file.type.startsWith('image/')){
        Utils.toast('Please choose an image file.', 'error');
        return;
      }
      if(file.size > MAX_AVATAR_BYTES){
        Utils.toast('That photo is too large \u2014 please choose one under 10MB.', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = ()=>{
        avatarState = { changed:true, value: reader.result };
        avatarPreview.innerHTML = Comp.avatarHtml(Object.assign({}, user, {avatarUrl: reader.result}), 64);
      };
      reader.onerror = ()=> Utils.toast('Could not read that image \u2014 please try again.', 'error');
      reader.readAsDataURL(file);
    });
    const removeBtn = document.getElementById('acct-avatar-remove');
    if(removeBtn){
      removeBtn.addEventListener('click', ()=>{
        avatarState = { changed:true, value:null };
        avatarPreview.innerHTML = Comp.avatarHtml(Object.assign({}, user, {avatarUrl:''}), 64);
        removeBtn.remove();
      });
    }
  }

  Forms['update-profile'] = async function(form){
    const user = window.App.currentUser();
    const fd = new FormData(form);
    const noMiddle = document.getElementById('acct-noMiddle').checked;
    const firstName = fd.get('firstName').trim();
    const lastName = fd.get('lastName').trim();
    const middleName = noMiddle ? '' : fd.get('middleName').trim();
    const email = fd.get('email').trim();

    if(!firstName || !lastName){
      Utils.toast('First and last name are required.', 'error');
      return;
    }
    if(!noMiddle && !middleName){
      Utils.toast('Enter a middle name, or check "no middle name".', 'error');
      return;
    }
    const existing = Store.findUserByEmail(email);
    if(existing && existing.id !== user.id){
      Utils.toast('That email is already used by another account.', 'error');
      return;
    }

    const patch = {firstName, middleName, lastName, noMiddleName:noMiddle, email};

    if(user.role==='student'){
      const section = (fd.get('section')||'').trim();
      if(user.level==='seniorhigh'){
        const strand = fd.get('strand')||'';
        const gradeLevel = fd.get('gradeLevel')||'';
        if(!strand || !gradeLevel){
          Utils.toast('Select your strand and grade level.', 'error');
          return;
        }
        patch.strand = strand; patch.gradeLevel = gradeLevel;
      } else {
        const course = fd.get('course')||'';
        const yearLevel = fd.get('yearLevel')||'';
        if(!course || !yearLevel){
          Utils.toast('Select your course and year level.', 'error');
          return;
        }
        patch.course = course; patch.yearLevel = yearLevel;
      }
      patch.section = section;
    }

    if(avatarState.changed) patch.avatarUrl = avatarState.value;

    const emailChanged = email !== user.email;
    const submitBtn = form.querySelector('button[type=submit]');
    submitBtn.disabled = true;
    try{
      await Store.updateUser(user.id, patch);
      await Store.notify(user.id, `Your profile was updated${emailChanged ? ' \u2014 email changed to '+email : ''}.`);
      Utils.sendAccountEmail(email, 'Your Campus Pass account details were updated.');
      Utils.toast('Profile updated.', 'success');
      window.App.rerender();
    }catch(err){
      Utils.toast('Could not save your profile \u2014 please try again.', 'error');
    }finally{
      submitBtn.disabled = false;
    }
  };

  Forms['change-password'] = async function(form){
    const user = window.App.currentUser();
    const fd = new FormData(form);
    const current = fd.get('current');
    const next = fd.get('next');
    const confirm = fd.get('confirm');
    if(next !== confirm){
      Utils.toast('New passwords do not match.', 'error');
      return;
    }
    const submitBtn = form.querySelector('button[type=submit]');
    submitBtn.disabled = true;
    const result = await Store.changePassword(user.email, current, next);
    submitBtn.disabled = false;
    if(!result.ok){
      Utils.toast(result.error || 'Current password is incorrect.', 'error');
      return;
    }
    await Store.notify(user.id, 'Your password was changed.');
    Utils.sendAccountEmail(user.email, 'Your Campus Pass password was changed.');
    Utils.toast('Password updated.', 'success');
    form.reset();
  };

  window.Views = window.Views || {};
  window.Views.renderAccountSettings = renderAccountSettings;
})();