'use client'
import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'motion/react'

const VERT = `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`

const FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;
uniform float u_time;
uniform vec2 u_resolution;

const vec3 brand = vec3(0.133, 0.773, 0.369);
const vec3 deep  = vec3(0.063, 0.420, 0.243);
const vec3 bg    = vec3(0.043, 0.043, 0.050);

float blob(vec2 uv, vec2 c, float r) {
  return smoothstep(r, 0.0, length(uv - c));
}

void main() {
  vec2 uv = v_uv;
  uv.x *= u_resolution.x / u_resolution.y;
  float t = u_time * 0.18;

  vec2 c1 = vec2(0.10 + 0.28 * sin(t * 0.6),         0.62 + 0.18 * cos(t * 0.8));
  vec2 c2 = vec2(1.55 + 0.32 * cos(t * 0.5 + 1.7),   0.42 + 0.22 * sin(t * 0.7 + 0.4));
  vec2 c3 = vec2(0.75 + 0.22 * sin(t * 0.8 + 2.3),   0.92 + 0.16 * cos(t * 0.4 + 1.1));

  float m1 = blob(uv, c1, 0.55);
  float m2 = blob(uv, c2, 0.52);
  float m3 = blob(uv, c3, 0.44);

  vec3 col = bg;
  col = mix(col, brand, m1 * 0.34);
  col = mix(col, deep,  m2 * 0.30);
  col = mix(col, brand, m3 * 0.20);

  // Subtle vignette so the gradient does not fight the hero copy on the left
  float vig = smoothstep(0.0, 1.1, length(uv - vec2(0.6, 0.5)));
  col *= 1.0 - vig * 0.18;

  outColor = vec4(col, 1.0);
}
`

export default function ShaderBackground() {
  const reduce = useReducedMotion()
  const canvasRef = useRef(null)

  useEffect(() => {
    if (reduce) return
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, premultipliedAlpha: false })
    if (!gl) return

    function compile(type, src) {
      const sh = gl.createShader(type)
      gl.shaderSource(sh, src)
      gl.compileShader(sh)
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error('shader compile', gl.getShaderInfoLog(sh))
        gl.deleteShader(sh)
        return null
      }
      return sh
    }

    const vs = compile(gl.VERTEX_SHADER, VERT)
    const fs = compile(gl.FRAGMENT_SHADER, FRAG)
    if (!vs || !fs) return

    const prog = gl.createProgram()
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    gl.useProgram(prog)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const posLoc = gl.getAttribLocation(prog, 'a_position')
    gl.enableVertexAttribArray(posLoc)
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

    const uTime = gl.getUniformLocation(prog, 'u_time')
    const uRes = gl.getUniformLocation(prog, 'u_resolution')

    let raf = 0
    let alive = true
    const start = performance.now()

    function tick(now) {
      if (!alive) return
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      const cw = Math.max(canvas.clientWidth, 1)
      const ch = Math.max(canvas.clientHeight, 1)
      const w = Math.floor(cw * dpr)
      const h = Math.floor(ch * dpr)
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
        gl.viewport(0, 0, w, h)
      }
      gl.uniform1f(uTime, (now - start) / 1000)
      gl.uniform2f(uRes, w, h)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)

    function onVisibility() {
      if (document.hidden) {
        if (raf) cancelAnimationFrame(raf)
      } else if (alive) {
        raf = requestAnimationFrame(tick)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      alive = false
      cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', onVisibility)
      gl.deleteProgram(prog)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      gl.deleteBuffer(buf)
    }
  }, [reduce])

  if (reduce) {
    return (
      <div aria-hidden style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        background: 'radial-gradient(ellipse 70% 80% at 30% 50%, rgba(34,197,94,0.18) 0%, transparent 70%), #0c0c0c',
      }} />
    )
  }

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
        opacity: 0.92,
      }}
    />
  )
}
