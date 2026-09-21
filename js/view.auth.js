/* =========================================================
   view.auth.js — login & account registration
   ========================================================= */
(function(){
  let terminalController = null;
  function destroyTerminal(){
    if(terminalController){ terminalController.destroy(); terminalController = null; }
  }

  function renderAuth(mode){
    destroyTerminal();
    mode = mode || 'login';
    const root = document.getElementById('app-root');
    root.innerHTML = `
    <div class="auth-shell">
      <div class="auth-bg">
        <div class="auth-bg-aurora"></div>
        <div class="auth-bg-tint"></div>
        <div class="auth-bg-terminal" id="auth-terminal"></div>
      </div>
      <div class="auth-card ${mode==='signup'?'wide':''}">
        <div class="auth-brand">
          <div class="brand-mark">CP</div>
          <div>
            <div style="font-family:var(--font-display);font-size:19px;font-weight:600;">Campus Pass</div>
            <div style="font-size:11.5px;color:var(--slate-light);">One system for every school event</div>
          </div>
        </div>
        <div class="auth-tabs">
          <div class="auth-tab ${mode==='login'?'active':''}" data-set-mode="login">Log in</div>
          <div class="auth-tab ${mode==='signup'?'active':''}" data-set-mode="signup">Create account</div>
        </div>
        <div id="auth-form-area"></div>
      </div>
    </div>`;
    renderForm(mode);
    root.querySelectorAll('[data-set-mode]').forEach(el=>{
      el.addEventListener('click', ()=> renderAuth(el.dataset.setMode));
    });

    if(window.FaultyTerminal){
      const terminalEl = document.getElementById('auth-terminal');
      window.FaultyTerminal.mount(terminalEl, {
        scale:1.3, gridMul:[2,1], digitSize:1.6, timeScale:0.3,
        scanlineIntensity:0.22, glitchAmount:0.7, flickerAmount:0.6,
        noiseAmp:1, chromaticAberration:0, dither:0.4, curvature:0.14,
        tint:'#A9B97C', mouseReact:true, mouseStrength:0.35,
        pageLoadAnimation:true, brightness:0.85, lightMode:false
      }).then(ctrl=>{
        // If the user already navigated away (fast login) while the CDN
        // module was loading, don't leave an orphaned effect running.
        if(document.getElementById('auth-terminal')===terminalEl && terminalEl.isConnected){
          terminalController = ctrl;
        } else {
          ctrl.destroy();
        }
      });
    }
  }

  function renderForm(mode){
    const area = document.getElementById('auth-form-area');
    area.addEventListener('input', (e)=>{
      if(e.target.matches('input,select,textarea')) Utils.clearFieldError(e.target);
    });
    if(mode==='login'){
      area.innerHTML = `
        <form id="login-form">
          <div class="field">
            <label>Email or Student ID <span class="req">*</span></label>
            <input type="text" name="email" placeholder="maria.santos@school.edu" required>
          </div>
          <div class="field">
            <label>Password <span class="req">*</span></label>
            <div class="password-wrap">
              <input type="password" name="password" id="login-password" placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" autocomplete="off" required>
              <button type="button" class="password-toggle" data-toggle-password="login-password">${Comp.Icon.eye}</button>
            </div>
          </div>
          <button class="btn btn-gold btn-block" type="submit">Log in</button>
        </form>`;
      document.getElementById('login-form').addEventListener('submit', (e)=>{
        e.preventDefault();
        const form = e.target;
        const emailInput = form.querySelector('[name=email]');
        const passInput = form.querySelector('[name=password]');
        const emailOk = Utils.markField(emailInput, !!emailInput.value.trim(), 'Enter your email or student ID.');
        const passOk = Utils.markField(passInput, !!passInput.value, 'Enter your password.');
        if(!emailOk || !passOk) return;
        const fd = new FormData(form);
        const email = fd.get('email').trim();
        const password = fd.get('password');
        const user = Store.findUserByEmail(email);
        if(!user || user.password !== password){
          Utils.toast('Incorrect email or password.', 'error');
          Utils.markField(emailInput, false, 'Check your email/ID and password.');
          Utils.markField(passInput, false, ' ');
          return;
        }
        if(user.active===false){
          Utils.toast('This account has been deactivated. Contact an administrator.', 'error');
          return;
        }
        Store.setSession(user.id);
        Utils.toast('Welcome back, '+user.name.split(' ')[0]+'!', 'success');
        destroyTerminal();
        window.App.boot();
      });
    } else {
      area.innerHTML = `
        <form id="signup-form">
          <div class="row">
            <div class="field">
              <label>First name <span class="req">*</span></label>
              <input type="text" name="firstName" placeholder="Juan" required>
            </div>
            <div class="field">
              <label>Middle name</label>
              <input type="text" name="middleName" id="signup-middleName" placeholder="Santos">
            </div>
          </div>
          <div class="check-row" style="margin-top:-8px;">
            <input type="checkbox" id="signup-noMiddle">
            <label for="signup-noMiddle" style="margin:0;font-weight:400;">I have no middle name</label>
          </div>
          <div class="field">
            <label>Last name <span class="req">*</span></label>
            <input type="text" name="lastName" placeholder="Dela Cruz" required>
          </div>
          <div class="field">
            <label>Email <span class="req">*</span></label>
            <input type="email" name="email" placeholder="you@school.edu" required>
          </div>
          <div class="field">
            <label>Password <span class="req">*</span></label>
            <div class="password-wrap">
              <input type="password" name="password" id="signup-password" placeholder="At least 6 characters" autocomplete="new-password" minlength="6" required>
              <button type="button" class="password-toggle" data-toggle-password="signup-password">${Comp.Icon.eye}</button>
            </div>
            <div class="hint">At least 6 characters.</div>
          </div>
          <div class="field">
            <label>I am a <span class="req">*</span></label>
            <select name="role" id="signup-role" required>
              <option value="student">Student</option>
              <option value="faculty">Faculty / Staff</option>
              <option value="alumni">Alumni / Guest</option>
            </select>
          </div>
          <div class="field">
            <label id="signup-id-label">Student ID Number <span class="req" id="signup-id-req">*</span></label>
            <input type="text" name="studentId" id="signup-studentId" placeholder="00-00-0000" inputmode="numeric" maxlength="10">
            <div class="hint">Format: 00-00-0000. Used to prevent duplicate accounts \u2014 each ID number can only be registered once.</div>
          </div>
          <div id="signup-student-fields">
            <div class="field">
              <label>Level <span class="req">*</span></label>
              <select name="level" id="signup-level" required>
                <option value="college">College</option>
                <option value="seniorhigh">Senior High School</option>
              </select>
            </div>
            <div id="signup-college-fields">
              <div class="row">
                <div class="field">
                  <label>Course <span class="req">*</span></label>
                  <select name="course" id="signup-course">
                    <option value="">Select course</option>
                    ${Utils.COURSES.map(c=>`<option value="${c}">${c}</option>`).join('')}
                  </select>
                </div>
                <div class="field">
                  <label>Year level <span class="req">*</span></label>
                  <select name="yearLevel" id="signup-yearLevel">
                    <option value="">Select year level</option>
                    ${Utils.YEAR_LEVELS.map(y=>`<option>${y}</option>`).join('')}
                  </select>
                </div>
              </div>
            </div>
            <div id="signup-shs-fields" style="display:none;">
              <div class="row">
                <div class="field">
                  <label>Strand <span class="req">*</span></label>
                  <select name="strand" id="signup-strand">
                    <option value="">Select strand</option>
                    ${Utils.STRANDS.map(s=>`<option>${s}</option>`).join('')}
                  </select>
                </div>
                <div class="field">
                  <label>Grade level <span class="req">*</span></label>
                  <select name="gradeLevel" id="signup-gradeLevel">
                    <option value="">Select grade level</option>
                    ${Utils.GRADE_LEVELS.map(g=>`<option>${g}</option>`).join('')}
                  </select>
                </div>
              </div>
            </div>
            <div class="field">
              <label>Section (optional)</label>
              <input type="text" name="section" placeholder="e.g. BSIT 3-A or Grade 11 - STEM A">
            </div>
          </div>
          <button class="btn btn-gold btn-block" type="submit">Create account</button>
        </form>`;
      const roleSel = document.getElementById('signup-role');
      const levelSel = document.getElementById('signup-level');
      const studentFields = document.getElementById('signup-student-fields');
      const collegeFields = document.getElementById('signup-college-fields');
      const shsFields = document.getElementById('signup-shs-fields');
      const idLabel = document.getElementById('signup-id-label');
      const idReq = document.getElementById('signup-id-req');
      const idInput = document.getElementById('signup-studentId');
      const courseSel = document.getElementById('signup-course');
      const yearLevelSel = document.getElementById('signup-yearLevel');
      const strandSel = document.getElementById('signup-strand');
      const gradeLevelSel = document.getElementById('signup-gradeLevel');
      const middleInput = document.getElementById('signup-middleName');
      const noMiddleChk = document.getElementById('signup-noMiddle');

      // Auto-format the ID as 00-00-0000 while typing.
      idInput.addEventListener('input', ()=>{
        const pos = idInput.selectionStart;
        const before = idInput.value.length;
        idInput.value = Utils.formatStudentId(idInput.value);
        const after = idInput.value.length;
        idInput.setSelectionRange(pos + (after-before), pos + (after-before));
      });

      noMiddleChk.addEventListener('change', ()=>{
        middleInput.disabled = noMiddleChk.checked;
        if(noMiddleChk.checked) middleInput.value = '';
        Utils.clearFieldError(middleInput);
      });

      // Only fields that are actually visible should be `required` — otherwise
      // the browser can silently block submission on a hidden field.
      function updateVisibility(){
        const role = roleSel.value;
        studentFields.style.display = role==='student' ? 'block':'none';
        idLabel.firstChild.textContent = (role==='student' ? 'Student ID Number' : role==='faculty' ? 'Employee ID' : 'Alumni ID') + ' ';
        idReq.style.display = role==='student' ? 'inline' : 'none';
        idInput.required = role==='student';

        const isStudent = role==='student';
        const lvl = levelSel.value;
        const isCollege = isStudent && lvl!=='seniorhigh';
        const isShs = isStudent && lvl==='seniorhigh';

        collegeFields.style.display = isCollege ? 'block':'none';
        shsFields.style.display = isShs ? 'block':'none';

        courseSel.required = isCollege;
        yearLevelSel.required = isCollege;
        strandSel.required = isShs;
        gradeLevelSel.required = isShs;
      }
      roleSel.addEventListener('change', updateVisibility);
      levelSel.addEventListener('change', updateVisibility);
      updateVisibility();

      document.getElementById('signup-form').addEventListener('submit', (e)=>{
        e.preventDefault();
        const form = e.target;
        const fd = new FormData(form);
        const firstNameInput = form.querySelector('[name=firstName]');
        const lastNameInput = form.querySelector('[name=lastName]');
        const emailInput = form.querySelector('[name=email]');
        const passInput = form.querySelector('[name=password]');
        const firstName = fd.get('firstName').trim();
        const lastName = fd.get('lastName').trim();
        const middleName = noMiddleChk.checked ? '' : fd.get('middleName').trim();
        const email = fd.get('email').trim();
        const password = fd.get('password');
        const role = fd.get('role');
        const studentId = (fd.get('studentId')||'').trim();

        let ok = true;
        ok = Utils.markField(firstNameInput, !!firstName, 'First name is required.') && ok;
        ok = Utils.markField(lastNameInput, !!lastName, 'Last name is required.') && ok;
        if(!noMiddleChk.checked){
          ok = Utils.markField(middleInput, !!middleName, 'Enter a middle name, or check "no middle name".') && ok;
        } else {
          Utils.clearFieldError(middleInput);
        }
        ok = Utils.markField(emailInput, !!email, 'Email is required.') && ok;
        ok = Utils.markField(passInput, password.length>=6, 'Password must be at least 6 characters.') && ok;

        const level = fd.get('level')||'';
        const course = fd.get('course')||'';
        const yearLevel = fd.get('yearLevel')||'';
        const strand = fd.get('strand')||'';
        const gradeLevel = fd.get('gradeLevel')||'';

        if(role==='student'){
          ok = Utils.markField(idInput, !!studentId, 'Student ID Number is required.') && ok;
          if(studentId && !Utils.isValidStudentId(studentId)){
            ok = Utils.markField(idInput, false, 'Use the format 00-00-0000.') && ok;
          }
          if(level==='seniorhigh'){
            ok = Utils.markField(strandSel, !!strand, 'Select a strand.') && ok;
            ok = Utils.markField(gradeLevelSel, !!gradeLevel, 'Select a grade level.') && ok;
          } else {
            ok = Utils.markField(courseSel, !!course, 'Select a course.') && ok;
            ok = Utils.markField(yearLevelSel, !!yearLevel, 'Select a year level.') && ok;
          }
        } else {
          Utils.clearFieldError(idInput);
        }

        if(!ok){
          Utils.toast('Please fill in all required fields before continuing.', 'error');
          return;
        }

        if(Store.findUserByEmail(email)){
          Utils.markField(emailInput, false, 'An account with that email already exists.');
          Utils.toast('An account with that email already exists.', 'error');
          return;
        }
        if(studentId && Store.findUserByStudentId(studentId)){
          Utils.markField(idInput, false, 'An account with that ID number already exists.');
          Utils.toast('An account with that ID number already exists.', 'error');
          return;
        }

        const user = Store.createUser({
          firstName, middleName, lastName, noMiddleName: noMiddleChk.checked,
          email, password,
          role, studentId,
          level: role==='student' ? level : '',
          course: role==='student' && level==='college' ? course : '',
          strand: role==='student' && level==='seniorhigh' ? strand : '',
          yearLevel: role==='student' && level==='college' ? yearLevel : '',
          gradeLevel: role==='student' && level==='seniorhigh' ? gradeLevel : '',
          section: role==='student' ? (fd.get('section')||'') : ''
        });
        Store.setSession(user.id);
        Utils.toast('Account created. Welcome to Campus Pass!', 'success');
        destroyTerminal();
        window.App.boot();
      });
    }
  }

  window.Views = window.Views || {};
  window.Views.renderAuth = renderAuth;
})();
