'use strict';
// ================= NỀN XOÁY (WebGL shader) =================
const BG = {
  gl: null,
  cur: null,
  tgt: null,
  spin: 1,
  tspin: 1,
  t: 0,
  palettes: {
    menu: ['#fe5f55', '#0090e8', '#1b2a30'],
    game: ['#3f8f6f', '#24584a', '#162b26'],
  },
  hex(h) {
    const n = parseInt(h.replace('#', ''), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  },
  mix(a, k) { return a.map((v) => v * k); },
  setPalette(name) {
    const p = this.palettes[name];
    this.tgt = [this.hex(p[0]), this.hex(p[1]), this.hex(p[2])];
    this.tspin = name === 'menu' ? 1 : 0.6;
  },
  setHex(h, boss) {
    const c = this.hex(h);
    this.tgt = [c, this.mix(c, 0.55), this.mix(c, 0.22)];
    this.tspin = boss ? 1.6 : 0.8;
  },
  init() {
    const cv = $('#bg');
    this.cv = cv;
    this.setPalette('menu');
    this.cur = this.tgt.map((c) => c.slice());
    let gl = null;
    try { gl = cv.getContext('webgl', { antialias: false, preserveDrawingBuffer: false }); } catch (e) { gl = null; }
    if (!gl) { document.body.classList.add('nogl'); return; }
    this.gl = gl;
    const vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
    const fs = `precision mediump float;
uniform vec2 uRes;uniform float uT;uniform vec3 uC1;uniform vec3 uC2;uniform vec3 uC3;uniform float uSpin;
void main(){
  vec2 uv=(gl_FragCoord.xy-0.5*uRes)/length(uRes);
  float r=length(uv);
  float ang=atan(uv.y,uv.x);
  float sp=uT*0.05*uSpin;
  ang+=sp-(20.0*r-2.0)*0.25*uSpin*0.6;
  vec2 q=vec2(cos(ang),sin(ang))*r*30.0;
  float t=uT*0.45;
  vec2 u2=vec2(q.x+q.y);
  for(int i=0;i<5;i++){
    u2+=sin(max(q.x,q.y))+q;
    q+=0.5*vec2(cos(5.1123314+0.353*u2.y+t*0.131121),sin(u2.x-0.113*t));
    q-=1.0*cos(q.x+q.y)-1.0*sin(q.x*0.711-q.y);
  }
  float contrast=3.5;
  float paint=min(2.0,max(0.0,length(q)*0.035*contrast));
  float c1p=max(0.0,1.0-contrast*abs(1.0-paint));
  float c2p=max(0.0,1.0-contrast*abs(paint));
  float c3p=1.0-min(1.0,c1p+c2p);
  vec3 col=(0.3/contrast)*uC1+(1.0-0.3/contrast)*(uC1*c1p+uC2*c2p+uC3*c3p);
  col*=1.0-0.55*r*r;
  gl_FragColor=vec4(col,1.0);
}`;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s)); return s; };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(pr);
    gl.useProgram(pr);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.u = {};
    for (const n of ['uRes', 'uT', 'uC1', 'uC2', 'uC3', 'uSpin']) this.u[n] = gl.getUniformLocation(pr, n);
    this.resize();
    window.addEventListener('resize', () => this.resize());
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      this.frame(dt);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  },
  resize() {
    if (!this.cv) return;
    const k = 4;
    this.cv.width = Math.max(2, Math.floor(window.innerWidth / k));
    this.cv.height = Math.max(2, Math.floor(window.innerHeight / k));
    if (this.gl) this.gl.viewport(0, 0, this.cv.width, this.cv.height);
  },
  frame(dt) {
    const gl = this.gl;
    this.t += dt * (0.6 + this.spin * 0.5);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) this.cur[i][j] += (this.tgt[i][j] - this.cur[i][j]) * Math.min(1, dt * 2.5);
    this.spin += (this.tspin - this.spin) * Math.min(1, dt * 2);
    gl.uniform2f(this.u.uRes, this.cv.width, this.cv.height);
    gl.uniform1f(this.u.uT, this.t);
    gl.uniform3fv(this.u.uC1, this.cur[0]);
    gl.uniform3fv(this.u.uC2, this.cur[1]);
    gl.uniform3fv(this.u.uC3, this.cur[2]);
    gl.uniform1f(this.u.uSpin, this.spin);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  },
};
