/* =========================================================
   router.js — minimal hash router
   ========================================================= */
(function(){
  const routes = [];

  function register(pattern, handler){
    const paramNames = [];
    const regexStr = pattern.replace(/:[^/]+/g, (m)=>{ paramNames.push(m.slice(1)); return '([^/]+)'; });
    routes.push({regex:new RegExp('^'+regexStr+'$'), paramNames, handler});
  }

  function parseHash(){
    let hash = location.hash.slice(1) || '/';
    const [path, query] = hash.split('?');
    const params = {};
    if(query){
      query.split('&').forEach(pair=>{
        const [k,v] = pair.split('=');
        if(k) params[decodeURIComponent(k)] = decodeURIComponent(v||'');
      });
    }
    return {path: path || '/', query: params};
  }

  function resolve(){
    const {path, query} = parseHash();
    for(const r of routes){
      const m = path.match(r.regex);
      if(m){
        const params = {};
        r.paramNames.forEach((name,i)=> params[name] = decodeURIComponent(m[i+1]));
        r.handler(params, query);
        return;
      }
    }
    // fallback
    const fallback = routes.find(r=>r._fallback);
    if(fallback) fallback.handler({}, query);
  }

  function go(path){
    if(location.hash.slice(1) === path){ resolve(); }
    else location.hash = path;
  }

  function notFound(handler){
    routes.push({regex:/.^/, paramNames:[], handler, _fallback:true});
  }

  window.addEventListener('hashchange', resolve);

  window.Router = { register, resolve, go, notFound };
})();
