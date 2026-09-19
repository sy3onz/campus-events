/* =========================================================
   app.js — bootstraps routes, global event delegation, session
   ========================================================= */
(function(){
  window.Actions = window.Actions || {};
  window.Forms = window.Forms || {};

  function currentUser(){ return Store.currentUser(); }

  function guard(renderFn){
    return function(params, query){
      const user = currentUser();
      if(!user){ Views.renderAuth('login'); return; }
      renderFn(user, params, query);
    };
  }

  function registerRoutes(){
    Router.register('/', guard((user)=> Router.go('/events')));
    Router.register('/events', guard((user)=> Views.renderEventsList(user)));
    Router.register('/events/:id', guard((user, p)=> Views.renderEventDetail(user, p.id)));
    Router.register('/my-registrations', guard((user)=> Views.renderMyRegistrations(user)));
    Router.register('/ticket/:id', guard((user, p)=> Views.renderTicket(user, p.id)));
    Router.register('/announcements', guard((user)=> Views.renderAnnouncements(user)));
    Router.register('/admin', guard((user)=> Views.renderDashboard(user)));
    Router.register('/admin/events', guard((user)=> Views.renderManageEvents(user)));
    Router.register('/admin/events/:id/registrations', guard((user, p, q)=> Views.renderEventRegistrations(user, p.id, q)));
    Router.register('/admin/checkin', guard((user)=> Views.renderCheckin(user)));
    Router.register('/admin/announcements', guard((user)=> Views.renderAdminAnnouncements(user)));
    Router.register('/admin/users', guard((user)=> Views.renderManageUsers(user)));
    Router.register('/admin/audit-log', guard((user)=> Views.renderAuditLog(user)));
    Router.register('/account', guard((user)=> Views.renderAccountSettings(user)));
    Router.notFound(guard((user)=> Views.renderEventsList(user)));
  }

  function rerender(){ Router.resolve(); }

  function boot(){
    const user = currentUser();
    if(!user){
      Views.renderAuth('login');
      return;
    }
    if(!location.hash || location.hash==='#/'){ location.hash = '/events'; }
    Router.resolve();
  }

  // ---------- global delegated interactions ----------
  document.addEventListener('click', function(e){
    const pwToggle = e.target.closest('[data-toggle-password]');
    if(pwToggle){
      const input = document.getElementById(pwToggle.dataset.togglePassword);
      if(input){
        const showing = input.type==='text';
        input.type = showing ? 'password' : 'text';
        pwToggle.innerHTML = showing ? Comp.Icon.eye : Comp.Icon.eyeOff;
      }
      return;
    }

    const modalClose = e.target.closest('[data-action="close-modal"]');
    if(modalClose){ Utils.closeModal(); return; }

    const toggleSidebar = e.target.closest('[data-action="toggle-sidebar"]');
    if(toggleSidebar){
      const sb = document.getElementById('sidebar');
      const scrim = document.getElementById('sidebar-scrim');
      sb.classList.toggle('open');
      scrim.classList.toggle('hidden');
      return;
    }
    if(e.target.id==='sidebar-scrim'){
      document.getElementById('sidebar').classList.remove('open');
      e.target.classList.add('hidden');
      return;
    }

    const notifBtn = e.target.closest('[data-action="open-notifs"]');
    if(notifBtn){ Comp.openNotifs(currentUser()); return; }

    const logoutBtn = e.target.closest('[data-action="logout"]');
    if(logoutBtn){
      Store.clearSession();
      Utils.toast('Logged out.', 'success');
      location.hash = '';
      Views.renderAuth('login');
      return;
    }

    const navEl = e.target.closest('[data-nav]');
    if(navEl){ Router.go(navEl.dataset.nav); return; }

    const openEventEl = e.target.closest('[data-open-event]');
    if(openEventEl){ Router.go('/events/'+openEventEl.dataset.openEvent); return; }

    const actionEl = e.target.closest('[data-action]');
    if(actionEl && Actions[actionEl.dataset.action]){
      // SELECT and INPUT elements are handled by the dedicated 'change'
      // listener below. Firing here too means a plain click to *open* a
      // dropdown (before any option is chosen) runs the action early with
      // the OLD value, and can even force a re-render mid-interaction —
      // which is what makes a role/status dropdown look like it "always
      // picks the first option." Skip them here so each action fires
      // exactly once, after the value actually changes.
      if(actionEl.tagName!=='SELECT' && actionEl.tagName!=='INPUT'){
        Actions[actionEl.dataset.action](actionEl.dataset, e, actionEl);
      }
    }
  });

  document.addEventListener('change', function(e){
    const actionEl = e.target.closest('[data-action]');
    if(actionEl && (actionEl.tagName==='SELECT' || actionEl.tagName==='INPUT') && Actions[actionEl.dataset.action]){
      Actions[actionEl.dataset.action](actionEl.dataset, e, actionEl);
    }
  });

  document.addEventListener('submit', function(e){
    const form = e.target.closest('[data-form]');
    if(!form) return;
    e.preventDefault();
    const name = form.dataset.form;
    if(Forms[name]) Forms[name](form, e);
  });

  document.addEventListener('keydown', function(e){
    if(e.key==='Escape') Utils.closeModal();
  });

  window.App = { boot, rerender, currentUser, registerRoutes };

  registerRoutes();
  boot();
})();
