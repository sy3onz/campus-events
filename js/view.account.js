/* =========================================================
   view.account.js — account settings: update profile & password
   ========================================================= */
(function(){
  window.Forms = window.Forms || {};

  function renderAccountSettings(user){
    const root = document.getElementById('app-root');
    const body = `
      <div class="grid grid-2" style="align-items:start;">
        <div class="card card-pad">
          <h3 style="font-size:15px;margin-bottom:12px;">Profile details</h3>
          <form data-form="update-profile">
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
            <button class="btn btn-gold" type="submit">Save changes</button>
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
    const emailChanged = email !== user.email;
    const submitBtn = form.querySelector('button[type=submit]');
    submitBtn.disabled = true;
    try{
      await Store.updateUser(user.id, {firstName, middleName, lastName, noMiddleName:noMiddle, email});
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
