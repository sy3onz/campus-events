/* =========================================================
   faulty-terminal.js — vanilla-JS port of the React Bits
   "FaultyTerminal" WebGL background effect.

   This app has no React/JSX build step, so the original React
   component is reimplemented here as a plain mount(container, opts)
   call using the tiny 'ogl' WebGL helper library. 'ogl' is loaded
   from a CDN the first time it's actually needed (only the login/
   signup screen uses this), so the rest of the app works fully
   offline as before; if the CDN can't be reached, mount() quietly
   resolves to a no-op controller and the page falls back to the
   plain aurora background image + gradient underneath it.
   ========================================================= */
(function(){
  let oglModulePromise = null;
  function loadOgl(){
    if(!oglModulePromise){
      oglModulePromise = import('https://cdn.jsdelivr.net/npm/ogl/+esm');
    }
    return oglModulePromise;
  }

  const vertexShader = `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

  const fragmentShader = `
precision mediump float;

varying vec2 vUv;

uniform float iTime;
uniform vec3  iResolution;
uniform float uScale;

uniform vec2  uGridMul;
uniform float uDigitSize;
uniform float uScanlineIntensity;
uniform float uGlitchAmount;
uniform float uFlickerAmount;
uniform float uNoiseAmp;
uniform float uChromaticAberration;
uniform float uDither;
uniform float uCurvature;
uniform vec3  uTint;
uniform vec2  uMouse;
uniform float uMouseStrength;
uniform float uUseMouse;
uniform float uPageLoadProgress;
uniform float uUsePageLoadAnimation;
uniform float uBrightness;
uniform float uLightMode;

float time;

float hash21(vec2 p){
  p = fract(p * 234.56);
  p += dot(p, p + 34.56);
  return fract(p.x * p.y);
}

float noise(vec2 p)
{
  return sin(p.x * 10.0) * sin(p.y * (3.0 + sin(time * 0.090909))) + 0.2;
}

mat2 rotate(float angle)
{
  float c = cos(angle);
  float s = sin(angle);
  return mat2(c, -s, s, c);
}

float fbm(vec2 p)
{
  p *= 1.1;
  float f = 0.0;
  float amp = 0.5 * uNoiseAmp;

  mat2 modify0 = rotate(time * 0.02);
  f += amp * noise(p);
  p = modify0 * p * 2.0;
  amp *= 0.454545;

  mat2 modify1 = rotate(time * 0.02);
  f += amp * noise(p);
  p = modify1 * p * 2.0;
  amp *= 0.454545;

  mat2 modify2 = rotate(time * 0.08);
  f += amp * noise(p);

  return f;
}

float pattern(vec2 p, out vec2 q, out vec2 r) {
  vec2 offset1 = vec2(1.0);
  vec2 offset0 = vec2(0.0);
  mat2 rot01 = rotate(0.1 * time);
  mat2 rot1 = rotate(0.1);

  q = vec2(fbm(p + offset1), fbm(rot01 * p + offset1));
  r = vec2(fbm(rot1 * q + offset0), fbm(q + offset0));
  return fbm(p + r);
}

float digit(vec2 p){
    vec2 grid = uGridMul * 15.0;
    vec2 s = floor(p * grid) / grid;
    p = p * grid;
    vec2 q, r;
    float intensity = pattern(s * 0.1, q, r) * 1.3 - 0.03;

    if(uUseMouse > 0.5){
        vec2 mouseWorld = uMouse * uScale;
        float distToMouse = distance(s, mouseWorld);
        float mouseInfluence = exp(-distToMouse * 8.0) * uMouseStrength * 10.0;
        intensity += mouseInfluence;

        float ripple = sin(distToMouse * 20.0 - iTime * 5.0) * 0.1 * mouseInfluence;
        intensity += ripple;
    }

    if(uUsePageLoadAnimation > 0.5){
        float cellRandom = fract(sin(dot(s, vec2(12.9898, 78.233))) * 43758.5453);
        float cellDelay = cellRandom * 0.8;
        float cellProgress = clamp((uPageLoadProgress - cellDelay) / 0.2, 0.0, 1.0);

        float fadeAlpha = smoothstep(0.0, 1.0, cellProgress);
        intensity *= fadeAlpha;
    }

    p = fract(p);
    p *= uDigitSize;

    float px5 = p.x * 5.0;
    float py5 = (1.0 - p.y) * 5.0;
    float x = fract(px5);
    float y = fract(py5);

    float i = floor(py5) - 2.0;
    float j = floor(px5) - 2.0;
    float n = i * i + j * j;
    float f = n * 0.0625;

    float isOn = step(0.1, intensity - f);
    float brightness = isOn * (0.2 + y * 0.8) * (0.75 + x * 0.25);

    return step(0.0, p.x) * step(p.x, 1.0) * step(0.0, p.y) * step(p.y, 1.0) * brightness;
}

float onOff(float a, float b, float c)
{
  return step(c, sin(iTime + a * cos(iTime * b))) * uFlickerAmount;
}

float displace(vec2 look)
{
    float y = look.y - mod(iTime * 0.25, 1.0);
    float window = 1.0 / (1.0 + 50.0 * y * y);
    return sin(look.y * 20.0 + iTime) * 0.0125 * onOff(4.0, 2.0, 0.8) * (1.0 + cos(iTime * 60.0)) * window;
}

vec3 getColor(vec2 p){

    float bar = step(mod(p.y + time * 20.0, 1.0), 0.2) * 0.4 + 1.0;
    bar *= uScanlineIntensity;

    float displacement = displace(p);
    p.x += displacement;

    if (uGlitchAmount != 1.0) {
      float extra = displacement * (uGlitchAmount - 1.0);
      p.x += extra;
    }

    float middle = digit(p);

    const float off = 0.002;
    float sum = digit(p + vec2(-off, -off)) + digit(p + vec2(0.0, -off)) + digit(p + vec2(off, -off)) +
                digit(p + vec2(-off, 0.0)) + digit(p + vec2(0.0, 0.0)) + digit(p + vec2(off, 0.0)) +
                digit(p + vec2(-off, off)) + digit(p + vec2(0.0, off)) + digit(p + vec2(off, off));

    vec3 baseColor = vec3(0.9) * middle + sum * 0.1 * vec3(1.0) * bar;
    return baseColor;
}

vec2 barrel(vec2 uv){
  vec2 c = uv * 2.0 - 1.0;
  float r2 = dot(c, c);
  c *= 1.0 + uCurvature * r2;
  return c * 0.5 + 0.5;
}

void main() {
    time = iTime * 0.333333;
    vec2 uv = vUv;

    if(uCurvature != 0.0){
      uv = barrel(uv);
    }

    vec2 p = uv * uScale;
    vec3 col = getColor(p);

    if(uChromaticAberration != 0.0){
      vec2 ca = vec2(uChromaticAberration) / iResolution.xy;
      col.r = getColor(p + ca).r;
      col.b = getColor(p - ca).b;
    }

    col *= uTint;
    col *= uBrightness;

    if(uDither > 0.0){
      float rnd = hash21(gl_FragCoord.xy);
      col += (rnd - 0.5) * (uDither * 0.003922);
    }

    if (uLightMode > 0.5) {
      float energy = max(max(col.r, col.g), col.b);
      float coverage = clamp(smoothstep(0.0, 0.72, energy) * 0.9, 0.0, 0.9);
      vec3 ink = clamp(col * 0.42, 0.0, 0.76);
      col = mix(vec3(1.0), ink, coverage);
    }

    gl_FragColor = vec4(col, max(max(col.r, col.g), col.b));
}
`;

  function hexToRgb(hex){
    let h = String(hex||'#ffffff').replace('#','').trim();
    if(h.length===3) h = h.split('').map(c=>c+c).join('');
    const num = parseInt(h.slice(0,6),16) || 0xffffff;
    return [((num>>16)&255)/255, ((num>>8)&255)/255, (num&255)/255];
  }

  // mount() returns a Promise<{destroy(): void}>. Always resolves (never
  // rejects) so a slow/blocked CDN can never break the page that calls it.
  async function mount(container, opts){
    opts = opts || {};
    const noop = { destroy(){} };
    if(!container) return noop;

    const {
      scale=1, gridMul=[2,1], digitSize=1.5, timeScale=0.3, pause=false,
      scanlineIntensity=0.3, glitchAmount=1, flickerAmount=1, noiseAmp=1,
      chromaticAberration=0, dither=0, curvature=0.2, tint='#ffffff',
      mouseReact=true, mouseStrength=0.2, dpr=Math.min(window.devicePixelRatio||1,2),
      pageLoadAnimation=true, brightness=1, lightMode=false
    } = opts;

    let mod;
    try{ mod = await loadOgl(); }
    catch(e){ console.warn('FaultyTerminal: ogl failed to load (offline?) — skipping the effect.', e); return noop; }

    // The page may have navigated away while the CDN import was in flight.
    if(!container.isConnected) return noop;

    const { Renderer, Program, Mesh, Color, Triangle } = mod;
    const tintVec = hexToRgb(tint);
    const ditherValue = typeof dither==='boolean' ? (dither?1:0) : dither;

    let renderer, gl;
    try{
      renderer = new Renderer({ dpr, alpha:true });
      gl = renderer.gl;
    }catch(e){
      console.warn('FaultyTerminal: WebGL unavailable — skipping the effect.', e);
      return noop;
    }
    gl.clearColor(0,0,0,0);

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      transparent: true,
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new Color(gl.canvas.width, gl.canvas.height, gl.canvas.width/gl.canvas.height) },
        uScale: { value: scale },
        uGridMul: { value: new Float32Array(gridMul) },
        uDigitSize: { value: digitSize },
        uScanlineIntensity: { value: scanlineIntensity },
        uGlitchAmount: { value: glitchAmount },
        uFlickerAmount: { value: flickerAmount },
        uNoiseAmp: { value: noiseAmp },
        uChromaticAberration: { value: chromaticAberration },
        uDither: { value: ditherValue },
        uCurvature: { value: curvature },
        uTint: { value: new Color(tintVec[0], tintVec[1], tintVec[2]) },
        uMouse: { value: new Float32Array([0.5, 0.5]) },
        uMouseStrength: { value: mouseStrength },
        uUseMouse: { value: mouseReact ? 1 : 0 },
        uPageLoadProgress: { value: pageLoadAnimation ? 0 : 1 },
        uUsePageLoadAnimation: { value: pageLoadAnimation ? 1 : 0 },
        uBrightness: { value: brightness },
        uLightMode: { value: lightMode ? 1 : 0 }
      }
    });
    const mesh = new Mesh(gl, { geometry, program });

    function resize(){
      if(!container.isConnected) return;
      renderer.setSize(container.clientWidth || 1, container.clientHeight || 1);
      program.uniforms.iResolution.value = new Color(gl.canvas.width, gl.canvas.height, gl.canvas.width/gl.canvas.height);
    }
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    gl.canvas.style.width = '100%';
    gl.canvas.style.height = '100%';
    gl.canvas.style.display = 'block';
    container.appendChild(gl.canvas);

    let destroyed = false;
    let rafId = 0;
    let loadStart = 0;
    const timeOffset = Math.random()*100;
    const mouseState = { x:0.5, y:0.5 };
    const smoothMouse = { x:0.5, y:0.5 };

    function onMouseMove(e){
      const rect = container.getBoundingClientRect();
      mouseState.x = (e.clientX - rect.left) / rect.width;
      mouseState.y = 1 - (e.clientY - rect.top) / rect.height;
    }
    if(mouseReact) container.addEventListener('mousemove', onMouseMove);

    function frame(t){
      if(destroyed) return;
      rafId = requestAnimationFrame(frame);

      if(pageLoadAnimation && loadStart===0) loadStart = t;
      if(!pause){
        program.uniforms.iTime.value = (t*0.001 + timeOffset) * timeScale;
      }
      if(pageLoadAnimation && loadStart>0){
        program.uniforms.uPageLoadProgress.value = Math.min((t-loadStart)/2000, 1);
      }
      if(mouseReact){
        smoothMouse.x += (mouseState.x - smoothMouse.x) * 0.08;
        smoothMouse.y += (mouseState.y - smoothMouse.y) * 0.08;
        const mu = program.uniforms.uMouse.value;
        mu[0] = smoothMouse.x; mu[1] = smoothMouse.y;
      }
      renderer.render({ scene: mesh });
    }
    rafId = requestAnimationFrame(frame);

    return {
      destroy(){
        if(destroyed) return;
        destroyed = true;
        cancelAnimationFrame(rafId);
        resizeObserver.disconnect();
        if(mouseReact) container.removeEventListener('mousemove', onMouseMove);
        if(gl.canvas.parentElement===container) container.removeChild(gl.canvas);
        const ext = gl.getExtension('WEBGL_lose_context');
        if(ext) ext.loseContext();
      }
    };
  }

  window.FaultyTerminal = { mount };
})();
