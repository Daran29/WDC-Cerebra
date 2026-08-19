import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

type TumorClass = 'Glioma' | 'Meningioma' | 'NoTumor' | 'Pituitary'

const TUMOR_CONFIG: Record<
  TumorClass,
  {
    regionColor: number
    regionPos: [number, number, number]
    regionScale: [number, number, number]
    pulseColor: number
    label: string
    severity: string
    desc: string
    regionType: 'hemisphere' | 'shell' | 'none' | 'base'
  }
> = {
  Glioma: {
    regionColor: 0xff1744,
    pulseColor: 0xff5252,
    regionPos: [0.38, 0.25, 0.2],
    regionScale: [0.4, 0.38, 0.4],
    label: 'Frontoparietal Cortex',
    severity: 'HIGH CONCERN',
    desc: 'Malignant glial proliferation with infiltrative margins across white matter.',
    regionType: 'hemisphere',
  },
  Meningioma: {
    regionColor: 0xff9100,
    pulseColor: 0xffab40,
    regionPos: [0, 0, 0],
    regionScale: [1, 1, 1],
    label: 'Meningeal Layer (Dura)',
    severity: 'MODERATE',
    desc: 'Dural-based extra-axial lesion originating from arachnoid cap cells.',
    regionType: 'shell',
  },
  NoTumor: {
    regionColor: 0x22c55e,
    pulseColor: 0x4ade80,
    regionPos: [0, 0, 0],
    regionScale: [1, 1, 1],
    label: 'No Abnormality Detected',
    severity: 'NORMAL',
    desc: 'Physiological cortical symmetry with normal ventricular spaces.',
    regionType: 'none',
  },
  Pituitary: {
    regionColor: 0xff4081,
    pulseColor: 0xff80ab,
    regionPos: [0, -0.58, 0.22],
    regionScale: [0.18, 0.16, 0.18],
    label: 'Pituitary Sellar Region',
    severity: 'MODERATE',
    desc: 'Sellar / suprasellar mass compressing adjacent optic chiasm pathways.',
    regionType: 'base',
  },
}

function computeGyri(x: number, y: number, z: number): number {
  const f1 = Math.sin(x * 7.5 + Math.cos(z * 6.0)) * Math.cos(y * 8.0 + Math.sin(x * 5.0)) * 0.045
  const f2 = Math.sin(x * 15.0 + y * 13.0) * Math.cos(y * 14.0 + z * 16.0) * 0.025
  const f3 = Math.cos(x * 30.0 + z * 26.0) * Math.sin(y * 28.0) * 0.012
  return f1 + f2 + f3
}

function createRegionalHemisphere(isLeft: boolean): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(0.78, 96, 72)
  const pos = geo.attributes.position
  const colors: number[] = []

  const cFrontal = new THREE.Color(0x3ba5f5)
  const cParietal = new THREE.Color(0x22c55e)
  const cOccipital = new THREE.Color(0xe11d6d)
  const cLimbic = new THREE.Color(0xc054e8)

  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i)
    let y = pos.getY(i)
    let z = pos.getZ(i)

    x *= 0.86
    y *= 0.8
    z *= 1.08

    const isMedial = (isLeft && x > 0) || (!isLeft && x < 0)
    if (isMedial) {
      x *= 0.18
    }

    if (y < 0.05 && y > -0.35 && z > -0.2 && z < 0.45 && Math.abs(x) > 0.22) {
      const indent = Math.sin(((y + 0.35) / 0.4) * Math.PI) * 0.15
      x -= Math.sign(x) * indent
    }

    if (z < -0.25) {
      x *= 0.88
      y += (z + 0.25) * 0.2
    }

    const disp = computeGyri(x, y, z)
    x += x * disp
    y += y * disp
    z += z * disp
    pos.setXYZ(i, x, y, z)

    let vertexColor = new THREE.Color()
    const distToCenter = Math.sqrt(x * x + (y - 0.05) * (y - 0.05))
    if (Math.abs(x) < 0.32 && distToCenter < 0.48 && y > -0.2) {
      vertexColor.copy(cLimbic)
    } else if (z > 0.08) {
      vertexColor.copy(cFrontal)
    } else if (z <= 0.08 && (z > -0.38 || y > 0.15)) {
      vertexColor.copy(cParietal)
    } else {
      vertexColor.copy(cOccipital)
    }

    colors.push(vertexColor.r, vertexColor.g, vertexColor.b)
  }

  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geo.computeVertexNormals()
  return geo
}

function createCerebellumGeometry(isLeft: boolean): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(0.36, 48, 36)
  const pos = geo.attributes.position

  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i)
    let y = pos.getY(i)
    let z = pos.getZ(i)

    x *= 0.96
    y *= 0.7
    z *= 0.84

    if ((isLeft && x > 0) || (!isLeft && x < 0)) {
      x *= 0.42
    }

    const folia = Math.sin(y * 44.0) * 0.016
    x += folia
    z += folia

    pos.setXYZ(i, x, y, z)
  }

  geo.computeVertexNormals()
  return geo
}

function setupBrainScene(
  container: HTMLDivElement,
  tumorClass: TumorClass | null,
  isDark: boolean,
  cameraZ: number = 3.8
) {
  const W = container.clientWidth || 600
  const H = container.clientHeight || 420

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setSize(W, H)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = isDark ? 1.25 : 1.1
  container.innerHTML = ''
  container.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 100)
  camera.position.set(0, 0.35, cameraZ)
  camera.lookAt(0, -0.05, 0)

  // Lighting
  const ambient = new THREE.AmbientLight(0xffffff, isDark ? 0.95 : 1.35)
  scene.add(ambient)

  const keyLight = new THREE.DirectionalLight(0xffffff, isDark ? 1.6 : 1.3)
  keyLight.position.set(3.5, 4.5, 3.5)
  scene.add(keyLight)

  const fillLight = new THREE.DirectionalLight(isDark ? 0x60a5fa : 0x93c5fd, 0.7)
  fillLight.position.set(-3.5, -1.2, -1.0)
  scene.add(fillLight)

  const rimLight = new THREE.PointLight(0xffffff, isDark ? 1.8 : 1.2, 10)
  rimLight.position.set(0, 2.5, -2.8)
  scene.add(rimLight)

  const brain = new THREE.Group()
  scene.add(brain)

  const cortexMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.38,
    metalness: 0.08,
    transparent: true,
    opacity: 0.96,
  })

  const corpusCallosumMat = new THREE.MeshStandardMaterial({
    color: 0xebb46c,
    roughness: 0.45,
    metalness: 0.05,
  })

  const cerebellumMat = new THREE.MeshStandardMaterial({
    color: 0xb85c5c,
    roughness: 0.42,
    metalness: 0.05,
  })

  const brainstemMat = new THREE.MeshStandardMaterial({
    color: 0xdfaa68,
    roughness: 0.35,
    metalness: 0.08,
  })

  const pituitaryMat = new THREE.MeshStandardMaterial({
    color: 0xe88b8b,
    roughness: 0.3,
    metalness: 0.1,
  })

  // Cerebral Hemispheres
  const leftHemiGeo = createRegionalHemisphere(true)
  const leftHemiMesh = new THREE.Mesh(leftHemiGeo, cortexMat)
  leftHemiMesh.position.set(-0.25, 0.1, 0)
  brain.add(leftHemiMesh)

  const rightHemiGeo = createRegionalHemisphere(false)
  const rightHemiMesh = new THREE.Mesh(rightHemiGeo, cortexMat)
  rightHemiMesh.position.set(0.25, 0.1, 0)
  brain.add(rightHemiMesh)

  // Corpus Callosum & Thalamus
  const callosumCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.05, 0.35),
    new THREE.Vector3(0, 0.22, 0.2),
    new THREE.Vector3(0, 0.24, -0.15),
    new THREE.Vector3(0, 0.05, -0.32),
  ])
  const callosumGeo = new THREE.TubeGeometry(callosumCurve, 32, 0.06, 16, false)
  const callosumMesh = new THREE.Mesh(callosumGeo, corpusCallosumMat)
  brain.add(callosumMesh)

  const thalamusGeo = new THREE.SphereGeometry(0.14, 20, 16)
  const thalamusMesh = new THREE.Mesh(thalamusGeo, corpusCallosumMat)
  thalamusMesh.scale.set(1.1, 0.8, 1.3)
  thalamusMesh.position.set(0, 0.06, -0.02)
  brain.add(thalamusMesh)

  // Cerebellum
  const leftCerebGeo = createCerebellumGeometry(true)
  const leftCereb = new THREE.Mesh(leftCerebGeo, cerebellumMat)
  leftCereb.position.set(-0.22, -0.42, -0.36)
  brain.add(leftCereb)

  const rightCerebGeo = createCerebellumGeometry(false)
  const rightCereb = new THREE.Mesh(rightCerebGeo, cerebellumMat)
  rightCereb.position.set(0.22, -0.42, -0.36)
  brain.add(rightCereb)

  // Brainstem
  const ponsGeo = new THREE.SphereGeometry(0.16, 28, 20)
  const pons = new THREE.Mesh(ponsGeo, brainstemMat)
  pons.scale.set(1.15, 0.9, 1.0)
  pons.position.set(0, -0.5, 0.02)
  brain.add(pons)

  const medullaGeo = new THREE.CylinderGeometry(0.08, 0.11, 0.44, 24)
  const medulla = new THREE.Mesh(medullaGeo, brainstemMat)
  medulla.position.set(0, -0.76, -0.06)
  medulla.rotation.x = 0.15
  brain.add(medulla)

  // Pituitary Gland & Stalk
  const stalkGeo = new THREE.CylinderGeometry(0.022, 0.035, 0.18, 16)
  const stalk = new THREE.Mesh(stalkGeo, pituitaryMat)
  stalk.position.set(0, -0.46, 0.18)
  stalk.rotation.x = -0.3
  brain.add(stalk)

  const glandGeo = new THREE.SphereGeometry(0.07, 20, 16)
  const gland = new THREE.Mesh(glandGeo, pituitaryMat)
  gland.scale.set(1.2, 0.85, 1.0)
  gland.position.set(0, -0.56, 0.22)
  brain.add(gland)

  // Longitudinal Fissure Shadow
  const fissureGeo = new THREE.BoxGeometry(0.016, 0.75, 1.25)
  const fissureMat = new THREE.MeshBasicMaterial({
    color: isDark ? 0x050c18 : 0x4a5568,
    transparent: true,
    opacity: 0.65,
  })
  const fissure = new THREE.Mesh(fissureGeo, fissureMat)
  fissure.position.set(0, 0.12, 0)
  brain.add(fissure)

  // Highlights / Tumor markers
  let highlight: THREE.Mesh | null = null
  let halo: THREE.Mesh | null = null
  let shell: THREE.Mesh | null = null

  if (tumorClass && TUMOR_CONFIG[tumorClass].regionType !== 'none') {
    const cfg = TUMOR_CONFIG[tumorClass]

    if (cfg.regionType === 'shell') {
      const shellGeo = new THREE.SphereGeometry(1.05, 36, 28)
      const shellMat = new THREE.MeshStandardMaterial({
        color: cfg.regionColor,
        emissive: cfg.regionColor,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.18,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
      shell = new THREE.Mesh(shellGeo, shellMat)
      shell.scale.set(0.96, 0.88, 1.08)
      brain.add(shell)

      const wireGeo = new THREE.SphereGeometry(1.07, 22, 18)
      const wireMat = new THREE.MeshBasicMaterial({
        color: cfg.regionColor,
        wireframe: true,
        transparent: true,
        opacity: 0.25,
      })
      highlight = new THREE.Mesh(wireGeo, wireMat)
      highlight.scale.copy(shell.scale)
      brain.add(highlight)
    } else {
      const geo = new THREE.SphereGeometry(0.42, 32, 24)
      const hlMat = new THREE.MeshStandardMaterial({
        color: cfg.regionColor,
        emissive: cfg.regionColor,
        emissiveIntensity: 0.9,
        transparent: true,
        opacity: 0.72,
        roughness: 0.2,
        depthWrite: false,
      })
      highlight = new THREE.Mesh(geo, hlMat)
      highlight.position.set(...cfg.regionPos)
      highlight.scale.set(...cfg.regionScale)
      brain.add(highlight)

      const haloGeo = new THREE.SphereGeometry(0.46, 24, 20)
      const haloMat = new THREE.MeshBasicMaterial({
        color: cfg.pulseColor,
        transparent: true,
        opacity: 0.25,
        side: THREE.BackSide,
        depthWrite: false,
      })
      halo = new THREE.Mesh(haloGeo, haloMat)
      halo.position.set(...cfg.regionPos)
      halo.scale.set(
        cfg.regionScale[0] * 1.5,
        cfg.regionScale[1] * 1.5,
        cfg.regionScale[2] * 1.5
      )
      brain.add(halo)
    }
  }

  return {
    renderer,
    scene,
    camera,
    brain,
    leftHemiMesh,
    rightHemiMesh,
    cortexMat,
    highlight,
    halo,
    shell,
    clock: new THREE.Clock(),
  }
}

// ─── Modal Fullscreen 3D Brain Viewer ──────────────────────────────────────────
function BrainModalViewer({
  tumorClass,
  isDark,
  onClose,
}: {
  tumorClass: TumorClass | null
  isDark: boolean
  onClose: () => void
}) {
  const mountRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const prevMouse = useRef({ x: 0, y: 0 })
  const rotation = useRef({ x: 0, y: 0 })
  const zoomDist = useRef(3.2)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const [autoRotate, setAutoRotate] = useState(true)
  const [wireframe, setWireframe] = useState(false)
  const [sliceLevel, setSliceLevel] = useState(100)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  useEffect(() => {
    const el = mountRef.current
    if (!el) return

    const setup = setupBrainScene(el, tumorClass, isDark, 3.2)
    cameraRef.current = setup.camera

    let frameId = 0
    function animate() {
      frameId = requestAnimationFrame(animate)
      const t = setup.clock.getElapsedTime()

      if (autoRotate && !isDragging.current) {
        rotation.current.y += 0.005
      }

      setup.brain.rotation.y = rotation.current.y
      setup.brain.rotation.x = rotation.current.x

      setup.cortexMat.wireframe = wireframe
      setup.cortexMat.opacity = wireframe ? 0.35 : 0.96

      const clipOffset = ((sliceLevel - 100) / 100) * 0.4
      setup.leftHemiMesh.position.y = 0.1 + clipOffset
      setup.rightHemiMesh.position.y = 0.1 + clipOffset

      if (setup.highlight && tumorClass) {
        const cfg = TUMOR_CONFIG[tumorClass]
        const pulse = 1 + Math.sin(t * 3.0) * 0.08

        if (cfg.regionType === 'hemisphere' || cfg.regionType === 'base') {
          setup.highlight.scale.set(
            cfg.regionScale[0] * pulse,
            cfg.regionScale[1] * pulse,
            cfg.regionScale[2] * pulse
          )
          const mat = setup.highlight.material as THREE.MeshStandardMaterial
          mat.emissiveIntensity = 0.7 + Math.sin(t * 3.0) * 0.35

          if (setup.halo) {
            setup.halo.scale.set(
              cfg.regionScale[0] * 1.5 * pulse,
              cfg.regionScale[1] * 1.5 * pulse,
              cfg.regionScale[2] * 1.5 * pulse
            )
          }
        }
      }

      setup.renderer.render(setup.scene, setup.camera)
    }
    animate()

    const onPointerDown = (e: PointerEvent) => {
      isDragging.current = true
      prevMouse.current = { x: e.clientX, y: e.clientY }
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging.current) return
      const dx = e.clientX - prevMouse.current.x
      const dy = e.clientY - prevMouse.current.y
      rotation.current.y += dx * 0.008
      rotation.current.x += dy * 0.008
      prevMouse.current = { x: e.clientX, y: e.clientY }
    }

    const onPointerUp = () => {
      isDragging.current = false
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      zoomDist.current = Math.max(1.8, Math.min(6.5, zoomDist.current + (e.deltaY < 0 ? -0.25 : 0.25)))
      if (cameraRef.current) {
        cameraRef.current.position.z = zoomDist.current
      }
    }

    el.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    el.addEventListener('wheel', onWheel, { passive: false })

    const ro = new ResizeObserver(() => {
      if (!el) return
      const w = el.clientWidth
      const h = el.clientHeight
      setup.renderer.setSize(w, h)
      setup.camera.aspect = w / h
      setup.camera.updateProjectionMatrix()
    })
    ro.observe(el)

    return () => {
      ro.disconnect()
      cancelAnimationFrame(frameId)
      setup.renderer.dispose()
      el.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      el.removeEventListener('wheel', onWheel)
      if (el.contains(setup.renderer.domElement)) {
        el.removeChild(setup.renderer.domElement)
      }
    }
  }, [tumorClass, isDark, autoRotate, wireframe, sliceLevel])

  const cfg = tumorClass ? TUMOR_CONFIG[tumorClass] : null
  const hexColor = cfg ? `#${cfg.regionColor.toString(16).padStart(6, '0')}` : '#00d4ff'
  const bg = isDark ? 'rgba(5,8,16,0.97)' : 'rgba(10,15,30,0.97)'
  const panel = isDark ? '#0f1520' : '#ffffff'
  const border = isDark ? '#1e2a3a' : '#dbe4f0'
  const fg = isDark ? '#e2e8f4' : '#0d1420'
  const muted = isDark ? '#6b7fa3' : '#4a5a78'

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: bg,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {/* Top Toolbar */}
      <div
        style={{
          height: 54,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          borderBottom: `1px solid ${border}`,
          background: panel,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 6,
              background: 'rgba(0,212,255,0.12)',
              border: '1px solid rgba(0,212,255,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#00d4ff" strokeWidth="1.3">
              <path d="M8 1.5L14.5 5.2v5.6L8 14.5 1.5 10.8V5.2L8 1.5z" />
              <path d="M8 1.5v13M1.5 5.2l6.5 3.6 6.5-3.6" />
            </svg>
          </div>
          <div>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                fontWeight: 600,
                color: fg,
                letterSpacing: '0.06em',
              }}
            >
              3D ANATOMICAL BRAIN EXPLORER
            </span>
            {cfg && (
              <span
                style={{
                  marginLeft: 10,
                  fontSize: 10,
                  color: hexColor,
                  background: `${hexColor}15`,
                  border: `1px solid ${hexColor}33`,
                  padding: '1px 8px',
                  borderRadius: 10,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {cfg.label}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9,
              color: muted,
              letterSpacing: '0.07em',
              display: window.innerWidth < 700 ? 'none' : undefined,
            }}
          >
            DRAG TO ROTATE · SCROLL TO ZOOM · ESC CLOSE
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: `1px solid ${border}`,
              color: muted,
              width: 32,
              height: 32,
              borderRadius: 6,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#ff4d6d'
              e.currentTarget.style.color = '#ff4d6d'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = border
              e.currentTarget.style.color = muted
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <line x1="1" y1="1" x2="11" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="11" y1="1" x2="1" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* 3D Canvas Stage */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          background: '#070b12',
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        <div ref={mountRef} style={{ width: '100%', height: '100%', cursor: 'grab' }} />

        {/* ── LEFT FLOATING CONTROLS ── */}
        <div
          style={{
            position: 'absolute',
            top: 20,
            left: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            zIndex: 10,
            background: 'rgba(15, 21, 32, 0.88)',
            backdropFilter: 'blur(12px)',
            border: '1px solid #1e2a3a',
            borderRadius: 12,
            padding: '14px 16px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            width: 190,
          }}
        >
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              fontWeight: 800,
              color: '#00d4ff',
              letterSpacing: '0.1em',
            }}
          >
            MODAL CONTROLS
          </span>

          <button
            onClick={() => setAutoRotate((p) => !p)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '7px 10px',
              borderRadius: 6,
              border: '1px solid #26374d',
              background: autoRotate ? 'rgba(0, 212, 255, 0.15)' : 'transparent',
              color: '#f1f5f9',
              fontSize: 11,
              fontWeight: 600,
              fontFamily: "'JetBrains Mono', monospace",
              cursor: 'pointer',
            }}
          >
            <span>AUTO ROTATE</span>
            <span style={{ color: autoRotate ? '#10b981' : '#64748b' }}>{autoRotate ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={() => setWireframe((p) => !p)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '7px 10px',
              borderRadius: 6,
              border: '1px solid #26374d',
              background: wireframe ? 'rgba(0, 212, 255, 0.15)' : 'transparent',
              color: '#f1f5f9',
              fontSize: 11,
              fontWeight: 600,
              fontFamily: "'JetBrains Mono', monospace",
              cursor: 'pointer',
            }}
          >
            <span>WIREFRAME</span>
            <span style={{ color: wireframe ? '#10b981' : '#64748b' }}>{wireframe ? 'ON' : 'OFF'}</span>
          </button>

          <div style={{ marginTop: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: '#94a3b8', marginBottom: 4 }}>
              <span>AXIAL PLANE</span>
              <span>{sliceLevel}%</span>
            </div>
            <input
              type="range"
              min="20"
              max="100"
              value={sliceLevel}
              onChange={(e) => setSliceLevel(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: '#00d4ff', cursor: 'pointer' }}
            />
          </div>

          <button
            onClick={() => {
              rotation.current = { x: 0, y: 0 }
              zoomDist.current = 3.2
              if (cameraRef.current) cameraRef.current.position.z = 3.2
              setSliceLevel(100)
            }}
            style={{
              marginTop: 4,
              padding: '6px',
              background: 'transparent',
              border: '1px dashed #26374d',
              color: '#64748b',
              borderRadius: 6,
              fontSize: 10,
              fontFamily: "'JetBrains Mono', monospace",
              cursor: 'pointer',
            }}
          >
            RESET PERSPECTIVE
          </button>
        </div>

        {/* ── RIGHT FLOATING DOMINANT LEGEND ── */}
        <div
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            width: 280,
            zIndex: 10,
            background: 'rgba(15, 21, 32, 0.92)',
            backdropFilter: 'blur(14px)',
            border: `1.5px solid ${cfg && cfg.regionType !== 'none' ? hexColor : '#1e2a3a'}`,
            borderRadius: 14,
            padding: '18px',
            boxShadow: `0 12px 36px rgba(0,0,0,0.6)${cfg && cfg.regionType !== 'none' ? `, 0 0 20px ${hexColor}25` : ''}`,
          }}
        >
          {cfg && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, fontWeight: 800, color: '#94a3b8', letterSpacing: '0.12em' }}>
                  TARGET PATHOLOGY
                </span>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 8.5,
                    fontWeight: 800,
                    color: hexColor,
                    background: `${hexColor}18`,
                    border: `1px solid ${hexColor}44`,
                    padding: '2px 7px',
                    borderRadius: 4,
                  }}
                >
                  {cfg.severity}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: hexColor, boxShadow: `0 0 10px ${hexColor}` }} />
                <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#f1f5f9' }}>
                  {tumorClass}
                </h4>
              </div>
              <div style={{ marginTop: 6, fontSize: 11, fontWeight: 600, color: '#00d4ff', fontFamily: "'JetBrains Mono', monospace" }}>
                📍 {cfg.label}
              </div>
              <p style={{ margin: '8px 0 0', fontSize: 11.5, color: '#94a3b8', lineHeight: 1.5 }}>
                {cfg.desc}
              </p>
            </div>
          )}

          <div style={{ borderTop: '1px solid #1e2a3a', paddingTop: 12 }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, color: '#64748b', letterSpacing: '0.1em', display: 'block', marginBottom: 8 }}>
              CORTICAL SEGMENTATION
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: '#e2e8f4' }}>
              {[
                { label: 'FRONTAL', color: '#3ba5f5' },
                { label: 'PARIETAL', color: '#22c55e' },
                { label: 'OCCIPITAL', color: '#e11d6d' },
                { label: 'LIMBIC', color: '#c054e8' },
                { label: 'CEREBELLUM', color: '#b85c5c' },
                { label: 'BRAINSTEM', color: '#dfaa68' },
                { label: 'PITUITARY', color: '#e88b8b' },
              ].map((s) => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                  <span>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Inline 3D Brain Viewport Component ──────────────────────────────────
export default function Brain3D({ tumorClass, isDark }: { tumorClass: TumorClass | null; isDark: boolean }) {
  const mountRef = useRef<HTMLDivElement>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [autoRotate, setAutoRotate] = useState(true)
  const [wireframe, setWireframe] = useState(false)
  const [sliceLevel, setSliceLevel] = useState(100)

  const isDragging = useRef(false)
  const prevMouse = useRef({ x: 0, y: 0 })
  const rotation = useRef({ x: 0, y: 0 })

  const sceneRef = useRef<{
    renderer: THREE.WebGLRenderer
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    brain: THREE.Group
    leftHemiMesh: THREE.Mesh
    rightHemiMesh: THREE.Mesh
    cortexMat: THREE.MeshStandardMaterial
    highlight: THREE.Mesh | null
    halo: THREE.Mesh | null
    shell: THREE.Mesh | null
    frameId: number
    clock: THREE.Clock
  } | null>(null)

  useEffect(() => {
    const el = mountRef.current
    if (!el) return

    const setup = setupBrainScene(el, tumorClass, isDark, 3.8)

    sceneRef.current = {
      ...setup,
      frameId: 0,
    }

    function animate() {
      const s = sceneRef.current
      if (!s) return
      s.frameId = requestAnimationFrame(animate)
      const t = s.clock.getElapsedTime()

      if (autoRotate && !isDragging.current) {
        rotation.current.y += 0.005
      }

      s.brain.rotation.y = rotation.current.y
      s.brain.rotation.x = rotation.current.x

      s.cortexMat.wireframe = wireframe
      s.cortexMat.opacity = wireframe ? 0.35 : 0.96

      const clipOffset = ((sliceLevel - 100) / 100) * 0.4
      s.leftHemiMesh.position.y = 0.1 + clipOffset
      s.rightHemiMesh.position.y = 0.1 + clipOffset

      if (s.highlight && tumorClass) {
        const cfg = TUMOR_CONFIG[tumorClass]
        const pulse = 1 + Math.sin(t * 3.0) * 0.08

        if (cfg.regionType === 'hemisphere' || cfg.regionType === 'base') {
          s.highlight.scale.set(
            cfg.regionScale[0] * pulse,
            cfg.regionScale[1] * pulse,
            cfg.regionScale[2] * pulse
          )
          const mat = s.highlight.material as THREE.MeshStandardMaterial
          mat.emissiveIntensity = 0.7 + Math.sin(t * 3.0) * 0.35

          if (s.halo) {
            s.halo.scale.set(
              cfg.regionScale[0] * 1.5 * pulse,
              cfg.regionScale[1] * 1.5 * pulse,
              cfg.regionScale[2] * 1.5 * pulse
            )
          }
        } else if (cfg.regionType === 'shell') {
          const mat = s.highlight.material as THREE.MeshBasicMaterial
          mat.opacity = 0.15 + Math.sin(t * 2.5) * 0.08
        }
      }

      s.renderer.render(s.scene, s.camera)
    }
    animate()

    const onPointerDown = (e: PointerEvent) => {
      isDragging.current = true
      prevMouse.current = { x: e.clientX, y: e.clientY }
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging.current) return
      const dx = e.clientX - prevMouse.current.x
      const dy = e.clientY - prevMouse.current.y
      rotation.current.y += dx * 0.008
      rotation.current.x += dy * 0.008
      prevMouse.current = { x: e.clientX, y: e.clientY }
    }

    const onPointerUp = () => {
      isDragging.current = false
    }

    el.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)

    const ro = new ResizeObserver(() => {
      if (!el || !sceneRef.current) return
      const w = el.clientWidth
      const h = el.clientHeight
      sceneRef.current.renderer.setSize(w, h)
      sceneRef.current.camera.aspect = w / h
      sceneRef.current.camera.updateProjectionMatrix()
    })
    ro.observe(el)

    return () => {
      ro.disconnect()
      if (sceneRef.current) {
        cancelAnimationFrame(sceneRef.current.frameId)
        sceneRef.current.renderer.dispose()
      }
      el.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      if (el.contains(setup.renderer.domElement)) {
        el.removeChild(setup.renderer.domElement)
      }
    }
  }, [tumorClass, isDark, autoRotate, wireframe, sliceLevel])

  const cfg = tumorClass ? TUMOR_CONFIG[tumorClass] : null
  const hexColor = cfg ? `#${cfg.regionColor.toString(16).padStart(6, '0')}` : '#00d4ff'

  return (
    <>
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: 440,
          background: isDark
            ? 'radial-gradient(circle, #0e1726 0%, #050811 100%)'
            : 'radial-gradient(circle, #f8fafc 0%, #e2e8f0 100%)',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <div ref={mountRef} style={{ width: '100%', height: '100%', cursor: 'grab' }} />

        {/* ── LEFT-SIDE FLOATING VIEWER CONTROLS ── */}
        <div
          style={{
            position: 'absolute',
            top: 14,
            left: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            zIndex: 10,
            background: isDark ? 'rgba(13, 19, 31, 0.88)' : 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(10px)',
            border: `1.5px solid ${isDark ? '#26374d' : '#cbd5e1'}`,
            borderRadius: 10,
            padding: '12px 14px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            width: 175,
          }}
        >
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9.5,
              fontWeight: 800,
              color: isDark ? '#00d4ff' : '#0066cc',
              letterSpacing: '0.1em',
              marginBottom: 2,
            }}
          >
            VIEWER CONTROLS
          </span>

          <button
            onClick={() => setAutoRotate((prev) => !prev)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 10px',
              borderRadius: 6,
              border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`,
              background: autoRotate ? (isDark ? 'rgba(0, 212, 255, 0.15)' : 'rgba(0, 102, 204, 0.1)') : 'transparent',
              color: isDark ? '#f1f5f9' : '#0f172a',
              fontSize: 10.5,
              fontWeight: 600,
              fontFamily: "'JetBrains Mono', monospace",
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <span>AUTO ROTATE</span>
            <span style={{ color: autoRotate ? '#10b981' : '#64748b' }}>{autoRotate ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={() => setWireframe((prev) => !prev)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 10px',
              borderRadius: 6,
              border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`,
              background: wireframe ? (isDark ? 'rgba(0, 212, 255, 0.15)' : 'rgba(0, 102, 204, 0.1)') : 'transparent',
              color: isDark ? '#f1f5f9' : '#0f172a',
              fontSize: 10.5,
              fontWeight: 600,
              fontFamily: "'JetBrains Mono', monospace",
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <span>WIREFRAME</span>
            <span style={{ color: wireframe ? '#10b981' : '#64748b' }}>{wireframe ? 'ON' : 'OFF'}</span>
          </button>

         

          <button
            onClick={() => setModalOpen(true)}
            style={{
              marginTop: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '6px',
              borderRadius: 6,
              border: 'none',
              background: isDark ? '#00d4ff' : '#0066cc',
              color: '#ffffff',
              fontSize: 10,
              fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace",
              cursor: 'pointer',
              letterSpacing: '0.04em',
            }}
          >
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M8 1.5L14.5 5.2v5.6L8 14.5 1.5 10.8V5.2L8 1.5z" />
              <path d="M8 1.5v13M1.5 5.2l6.5 3.6 6.5-3.6" />
            </svg>
            FULLSCREEN 3D
          </button>
        </div>

        {/* ── RIGHT-SIDE DOMINANT FLOATING LEGEND ── */}
        <div
          style={{
            position: 'absolute',
            top: 210,
            right: 10,
            width: 250,
            zIndex: 10,
            background: isDark ? 'rgba(13, 19, 31, 0.92)' : 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(12px)',
            border: `1.5px solid ${cfg && cfg.regionType !== 'none' ? hexColor : isDark ? '#26374d' : '#cbd5e1'}`,
            borderRadius: 12,
            padding: '14px 16px',
            boxShadow: cfg && cfg.regionType !== 'none' ? `0 10px 30px ${hexColor}25` : '0 8px 24px rgba(0,0,0,0.12)',
          }}
        >
          {cfg && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 9,
                    fontWeight: 800,
                    color: isDark ? '#94a3b8' : '#475569',
                    letterSpacing: '0.12em',
                  }}
                >
                  TARGET PATHOLOGY
                </span>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 8.5,
                    fontWeight: 800,
                    color: hexColor,
                    background: `${hexColor}18`,
                    border: `1px solid ${hexColor}44`,
                    padding: '2px 6px',
                    borderRadius: 4,
                  }}
                >
                  {cfg.severity}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: hexColor, boxShadow: `0 0 8px ${hexColor}` }} />
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: isDark ? '#f1f5f9' : '#0f172a' }}>
                  {tumorClass}
                </h4>
              </div>

              <div style={{ marginTop: 4, fontSize: 10.5, fontWeight: 600, color: isDark ? '#00d4ff' : '#0066cc', fontFamily: "'JetBrains Mono', monospace" }}>
                📍 {cfg.label}
              </div>

             
            </div>
          )}

          <div style={{ borderTop: `1px solid ${isDark ? '#1e2a3a' : '#e2e8f0'}`, paddingTop: 10 }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8.5, fontWeight: 700, color: isDark ? '#64748b' : '#94a3b8', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
              ANATOMICAL COLOR CODE
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 8px', fontSize: 9.5, fontFamily: "'JetBrains Mono', monospace", color: isDark ? '#e2e8f4' : '#0f172a' }}>
              {[
                { label: 'FRONTAL', color: '#3ba5f5' },
                { label: 'PARIETAL', color: '#22c55e' },
                { label: 'OCCIPITAL', color: '#e11d6d' },
                { label: 'LIMBIC', color: '#c054e8' },
                { label: 'CEREBELLUM', color: '#b85c5c' },
                { label: 'BRAINSTEM', color: '#dfaa68' },
                { label: 'PITUITARY', color: '#e88b8b' },
              ].map((s) => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                  <span>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen 3D Modal */}
      {modalOpen && (
        <BrainModalViewer
          tumorClass={tumorClass}
          isDark={isDark}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  )
}