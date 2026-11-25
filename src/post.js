// Acabamento na placa de vídeo: brilho (bloom), correção de cor, vinheta e aberração leve nos golpes.
// Se o aparelho não tiver WebGL, o quadro é copiado direto.
const VS = 'attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;gl_Position=vec4(p,0.,1.);}';
const BRIGHT = 'precision mediump float;varying vec2 v;uniform sampler2D t;void main(){vec3 c=texture2D(t,v).rgb;float l=max(c.r,max(c.g,c.b));gl_FragColor=vec4(c*smoothstep(.62,1.,l),1.);}';
const BLUR = 'precision mediump float;varying vec2 v;uniform sampler2D t;uniform vec2 d;void main(){vec3 c=texture2D(t,v).rgb*.227;c+=(texture2D(t,v+d*1.38).rgb+texture2D(t,v-d*1.38).rgb)*.316;c+=(texture2D(t,v+d*3.23).rgb+texture2D(t,v-d*3.23).rgb)*.07;gl_FragColor=vec4(c,1.);}';
const FINAL = `precision highp float;varying vec2 v;uniform sampler2D t,b,b2;uniform float ab,hurt,low,time,bl;uniform vec2 res;uniform float esc;
// amplia com pixels nítidos em qualquer escala (só a emenda entre dois pixels é suavizada)
vec2 nit(vec2 u){vec2 p=u*res,s=floor(p+.5);return (s+clamp((p-s)*esc,-.5,.5))/res;}
void main(){vec2 q=v-.5;vec2 o=q*ab;
vec3 c=vec3(texture2D(t,nit(v+o)).r,texture2D(t,nit(v)).g,texture2D(t,nit(v-o)).b);
c+=(texture2D(b,v).rgb*.42+texture2D(b2,v).rgb*.42)*bl;
float l=dot(c,vec3(.299,.587,.114));
// sombras para o azul petróleo, luzes para o cobre
c=mix(c,c*vec3(.90,1.0,1.14),(1.-smoothstep(.0,.45,l))*.55);
c=mix(c,c*vec3(1.08,1.0,.90),smoothstep(.45,1.,l)*.6);
c=mix(vec3(l),c,1.14);c=(c-.5)*1.06+.5+.004;
float vg=smoothstep(.95,.32,length(q*vec2(1.05,1.18)));c*=mix(.52,1.,vg);
c=mix(c,vec3(.55,.03,.05),hurt*(1.-vg)*.9);c=mix(c,vec3(l)*vec3(.9,.82,.85),low*.55);
gl_FragColor=vec4(c,1.);}`;

export function makePost(view, src) {
  let gl = null;
  try { gl = view.getContext('webgl', { alpha: false, antialias: false, depth: false, powerPreference: 'high-performance' }); } catch (_) {}
  if (!gl) {
    const c = view.getContext('2d', { alpha: false });
    if (c) c.imageSmoothingEnabled = false;
    return { draw() { c && c.drawImage(src, 0, 0, view.width, view.height); }, ok: false };
  }
  const prog = (fs) => {
    const mk = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(o)); return o; };
    const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, VS)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); gl.bindAttribLocation(p, 0, 'p'); gl.linkProgram(p);
    const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(p, i); u[a.name] = gl.getUniformLocation(p, a.name); }
    return { p, u };
  };
  const bright = prog(BRIGHT), blur = prog(BLUR), fin = prog(FINAL);
  const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const tex = (w, h, f) => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); if (w) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t; };
  const target = (w, h) => { const t = tex(w, h, gl.LINEAR), f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); return { t, f, w, h }; };
  const scene = tex(0, 0, gl.LINEAR);
  const A1 = target(256, 144), A2 = target(256, 144), B1 = target(96, 54), B2 = target(96, 54);
  const bind = (u, t, i) => { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, t); gl.uniform1i(u, i); };
  const pass = (pr, dst, t, d) => { gl.bindFramebuffer(gl.FRAMEBUFFER, dst.f); gl.viewport(0, 0, dst.w, dst.h); gl.useProgram(pr.p); bind(pr.u.t, t, 0); if (d) gl.uniform2f(pr.u.d, d[0], d[1]); gl.drawArrays(gl.TRIANGLES, 0, 3); };
  let lost = false;
  view.addEventListener('webglcontextlost', (e) => { e.preventDefault(); lost = true; });
  return {
    ok: true,
    draw(o) {
      if (lost) return;
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, scene); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, src);
      const n = o.nivel === undefined ? 2 : o.nivel;
      if (n > 0) { pass(bright, A1, scene); pass(blur, A2, A1.t, [1 / 256, 0]); pass(blur, A1, A2.t, [0, 1 / 144]);       pass(blur, B1, A1.t, [1 / 96, 0]); pass(blur, B2, B1.t, [0, 1 / 54]); pass(blur, B1, B2.t, [2 / 96, 0]); pass(blur, B2, B1.t, [0, 2 / 54]); }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, view.width, view.height);
      gl.useProgram(fin.p); bind(fin.u.t, scene, 0); bind(fin.u.b, A1.t, 1); bind(fin.u.b2, B2.t, 2);
      gl.uniform1f(fin.u.ab, o.ab || 0); gl.uniform2f(fin.u.res, src.width, src.height); gl.uniform1f(fin.u.esc, Math.max(1, view.width / src.width)); gl.uniform1f(fin.u.bl, n > 0 ? 1 : 0); gl.uniform1f(fin.u.hurt, o.hurt || 0); gl.uniform1f(fin.u.low, o.low || 0); if (fin.u.time) gl.uniform1f(fin.u.time, o.time || 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
}
