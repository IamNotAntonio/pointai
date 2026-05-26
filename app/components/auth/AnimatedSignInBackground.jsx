'use client'
import { useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

/*
 * Animated dot-matrix background extracted from
 *   https://21st.dev/r/aghasisahakyan1/sign-in-flow-1
 * Converted from TSX -> JSX, only the BG (no form/UI).
 * Tuned with Point's brand green palette.
 */

function ShaderMaterial({ source, uniforms, maxFps = 60 }) {
  const { size } = useThree()
  const ref = useRef(null)
  const lastFrameTime = useRef(0)

  useFrame(({ clock }) => {
    if (!ref.current) return
    const now = clock.getElapsedTime()
    if (now - lastFrameTime.current < 1 / maxFps) return
    lastFrameTime.current = now
    const mat = ref.current.material
    if (mat?.uniforms?.u_time) mat.uniforms.u_time.value = now
  })

  const material = useMemo(() => {
    function prepareUniforms() {
      const out = {}
      for (const name in uniforms) {
        const u = uniforms[name]
        switch (u.type) {
          case 'uniform1f':
            out[name] = { value: u.value, type: '1f' }
            break
          case 'uniform1i':
            out[name] = { value: u.value, type: '1i' }
            break
          case 'uniform3f':
            out[name] = { value: new THREE.Vector3().fromArray(u.value), type: '3f' }
            break
          case 'uniform1fv':
            out[name] = { value: u.value, type: '1fv' }
            break
          case 'uniform3fv':
            out[name] = { value: u.value.map(v => new THREE.Vector3().fromArray(v)), type: '3fv' }
            break
          case 'uniform2f':
            out[name] = { value: new THREE.Vector2().fromArray(u.value), type: '2f' }
            break
          default:
            break
        }
      }
      out.u_time = { value: 0, type: '1f' }
      out.u_resolution = { value: new THREE.Vector2(size.width * 2, size.height * 2) }
      return out
    }

    return new THREE.ShaderMaterial({
      vertexShader: `
        precision mediump float;
        in vec2 coordinates;
        uniform vec2 u_resolution;
        out vec2 fragCoord;
        void main(){
          float x = position.x;
          float y = position.y;
          gl_Position = vec4(x, y, 0.0, 1.0);
          fragCoord = (position.xy + vec2(1.0)) * 0.5 * u_resolution;
          fragCoord.y = u_resolution.y - fragCoord.y;
        }
      `,
      fragmentShader: source,
      uniforms: prepareUniforms(),
      glslVersion: THREE.GLSL3,
      blending: THREE.CustomBlending,
      blendSrc: THREE.SrcAlphaFactor,
      blendDst: THREE.OneFactor,
    })
  }, [size.width, size.height, source])

  return (
    <mesh ref={ref}>
      <planeGeometry args={[2, 2]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}

function Shader({ source, uniforms, maxFps = 60 }) {
  return (
    <Canvas style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      <ShaderMaterial source={source} uniforms={uniforms} maxFps={maxFps} />
    </Canvas>
  )
}

function DotMatrix({
  colors = [[0, 0, 0]],
  opacities = [0.04, 0.04, 0.04, 0.04, 0.04, 0.08, 0.08, 0.08, 0.08, 0.14],
  totalSize = 20,
  dotSize = 2,
  shader = '',
  center = ['x', 'y'],
}) {
  const uniforms = useMemo(() => {
    let palette = [colors[0], colors[0], colors[0], colors[0], colors[0], colors[0]]
    if (colors.length === 2) {
      palette = [colors[0], colors[0], colors[0], colors[1], colors[1], colors[1]]
    } else if (colors.length === 3) {
      palette = [colors[0], colors[0], colors[1], colors[1], colors[2], colors[2]]
    }
    return {
      u_colors: {
        value: palette.map(c => [c[0] / 255, c[1] / 255, c[2] / 255]),
        type: 'uniform3fv',
      },
      u_opacities: { value: opacities, type: 'uniform1fv' },
      u_total_size: { value: totalSize, type: 'uniform1f' },
      u_dot_size: { value: dotSize, type: 'uniform1f' },
      u_reverse: { value: shader.includes('u_reverse_active') ? 1 : 0, type: 'uniform1i' },
    }
  }, [colors, opacities, totalSize, dotSize, shader])

  const src = `
    precision mediump float;
    in vec2 fragCoord;

    uniform float u_time;
    uniform float u_opacities[10];
    uniform vec3 u_colors[6];
    uniform float u_total_size;
    uniform float u_dot_size;
    uniform vec2 u_resolution;
    uniform int u_reverse;

    out vec4 fragColor;

    float PHI = 1.61803398874989484820459;
    float random(vec2 xy) {
      return fract(tan(distance(xy * PHI, xy) * 0.5) * xy.x);
    }

    void main() {
      vec2 st = fragCoord.xy;
      ${center.includes('x') ? 'st.x -= abs(floor((mod(u_resolution.x, u_total_size) - u_dot_size) * 0.5));' : ''}
      ${center.includes('y') ? 'st.y -= abs(floor((mod(u_resolution.y, u_total_size) - u_dot_size) * 0.5));' : ''}

      float opacity = step(0.0, st.x);
      opacity *= step(0.0, st.y);

      vec2 st2 = vec2(int(st.x / u_total_size), int(st.y / u_total_size));

      float frequency = 5.0;
      float show_offset = random(st2);
      float rand = random(st2 * floor((u_time / frequency) + show_offset + frequency));
      opacity *= u_opacities[int(rand * 10.0)];
      opacity *= 1.0 - step(u_dot_size / u_total_size, fract(st.x / u_total_size));
      opacity *= 1.0 - step(u_dot_size / u_total_size, fract(st.y / u_total_size));

      vec3 color = u_colors[int(show_offset * 6.0)];

      float animation_speed_factor = 0.5;
      vec2 center_grid = u_resolution / 2.0 / u_total_size;
      float dist_from_center = distance(center_grid, st2);

      float timing_offset_intro = dist_from_center * 0.01 + (random(st2) * 0.15);
      float max_grid_dist = distance(center_grid, vec2(0.0, 0.0));
      float timing_offset_outro = (max_grid_dist - dist_from_center) * 0.02 + (random(st2 + 42.0) * 0.2);

      float current_timing_offset;
      if (u_reverse == 1) {
        current_timing_offset = timing_offset_outro;
        opacity *= 1.0 - step(current_timing_offset, u_time * animation_speed_factor);
        opacity *= clamp((step(current_timing_offset + 0.1, u_time * animation_speed_factor)) * 1.25, 1.0, 1.25);
      } else {
        current_timing_offset = timing_offset_intro;
        opacity *= step(current_timing_offset, u_time * animation_speed_factor);
        opacity *= clamp((1.0 - step(current_timing_offset + 0.1, u_time * animation_speed_factor)) * 1.25, 1.0, 1.25);
      }

      fragColor = vec4(color, opacity);
      fragColor.rgb *= fragColor.a;
    }
  `

  return <Shader source={src} uniforms={uniforms} maxFps={60} />
}

export default function AnimatedSignInBackground({
  // Brand green tones for Point
  colors = [
    [34, 197, 94],    // #22c55e — green-500
    [26, 122, 74],    // #1a7a4a — Point primary
    [134, 239, 172],  // #86efac — green-300 light highlight
  ],
  opacities = [0.18, 0.22, 0.28, 0.34, 0.42, 0.5, 0.6, 0.7, 0.85, 1.0],
  dotSize = 3,
  animationSpeed = 10,
  reduceMotion = false,
}) {
  // Reduced motion: skip the WebGL canvas, return a static gradient
  if (reduceMotion) {
    return (
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 60% 70% at 50% 40%, rgba(34,197,94,0.18) 0%, transparent 65%), #0a0a0a',
          pointerEvents: 'none',
        }}
      />
    )
  }

  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', inset: 0 }}>
        <DotMatrix
          colors={colors}
          dotSize={dotSize}
          opacities={opacities}
          shader={`animation_speed_factor_${animationSpeed.toFixed(1)}_;`}
          center={['x', 'y']}
        />
      </div>
      {/* Fade gradient overlay for legibility */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(10,10,10,0.55) 0%, rgba(10,10,10,0.85) 80%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}
