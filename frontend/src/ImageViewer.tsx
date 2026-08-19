import { useEffect, useRef, useState, useCallback } from 'react'

interface Props {
  src: string
  name: string
  onClose: () => void
  isDark: boolean
}

export default function ImageViewer({ src, name, onClose, isDark }: Props) {
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  const clampOffset = useCallback((ox: number, oy: number, s: number) => {
    const el = containerRef.current
    if (!el) return { x: ox, y: oy }
    const maxX = Math.max(0, (el.clientWidth * (s - 1)) / 2)
    const maxY = Math.max(0, (el.clientHeight * (s - 1)) / 2)
    return { x: Math.max(-maxX, Math.min(maxX, ox)), y: Math.max(-maxY, Math.min(maxY, oy)) }
  }, [])

  const zoom = useCallback((delta: number, cx?: number, cy?: number) => {
    setScale(prev => {
      const next = Math.max(1, Math.min(8, prev + delta))
      if (next === prev) return prev
      setOffset(o => clampOffset(o.x * (next / prev), o.y * (next / prev), next))
      return next
    })
  }, [clampOffset])

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    zoom(e.deltaY < 0 ? 0.25 : -0.25)
  }, [zoom])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === '+' || e.key === '=') zoom(0.5)
      if (e.key === '-') zoom(-0.5)
      if (e.key === '0') { setScale(1); setOffset({ x: 0, y: 0 }) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, zoom])

  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(true)
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    setOffset(clampOffset(dragStart.current.ox + dx, dragStart.current.oy + dy, scale))
  }
  const onPointerUp = () => setDragging(false)

  const resetView = () => { setScale(1); setOffset({ x: 0, y: 0 }) }
  const fitWidth = () => { setScale(1.5); setOffset({ x: 0, y: 0 }) }

  const bg = isDark ? 'rgba(5,8,16,0.97)' : 'rgba(10,15,30,0.97)'
  const panel = isDark ? '#0f1520' : '#ffffff'
  const border = isDark ? '#1e2a3a' : '#dbe4f0'
  const fg = isDark ? '#e2e8f4' : '#0d1420'
  const muted = isDark ? '#6b7fa3' : '#4a5a78'
  const dim = isDark ? '#334060' : '#8898bb'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: bg,
      display: 'flex', flexDirection: 'column',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {/* Toolbar */}
      <div style={{
        height: 52, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px',
        borderBottom: `1px solid ${border}`,
        background: panel,
      }}>
        {/* Left: file info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.5 }}>
            <rect x="2" y="2" width="12" height="12" rx="2" stroke={fg} strokeWidth="1.2" fill="none" />
            <circle cx="5.5" cy="5.5" r="1.2" fill={fg} />
            <path d="M2 10.5L5.5 7 8.5 10 11 8 14 11" stroke={fg} strokeWidth="1.2" fill="none" strokeLinejoin="round" />
          </svg>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11, color: muted, letterSpacing: '0.06em',
            maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{name}</span>
        </div>

        {/* Center: zoom controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <ToolBtn onClick={() => zoom(-0.5)} title="Zoom out (−)" isDark={isDark}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3" fill="none"/>
              <line x1="3.5" y1="6" x2="8.5" y2="6" stroke="currentColor" strokeWidth="1.3"/>
              <line x1="10" y1="10" x2="12.5" y2="12.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          </ToolBtn>

          <div style={{
            minWidth: 62, height: 30,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12, fontWeight: 600, color: fg,
            background: isDark ? '#1a2540' : '#f0f4fc',
            border: `1px solid ${border}`,
            borderRadius: 6, cursor: 'default', userSelect: 'none',
          }}>
            {Math.round(scale * 100)}%
          </div>

          <ToolBtn onClick={() => zoom(0.5)} title="Zoom in (+)" isDark={isDark}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3" fill="none"/>
              <line x1="6" y1="3.5" x2="6" y2="8.5" stroke="currentColor" strokeWidth="1.3"/>
              <line x1="3.5" y1="6" x2="8.5" y2="6" stroke="currentColor" strokeWidth="1.3"/>
              <line x1="10" y1="10" x2="12.5" y2="12.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          </ToolBtn>

          <div style={{ width: 1, height: 20, background: border, margin: '0 4px' }} />

          <ToolBtn onClick={resetView} title="Reset (0)" isDark={isDark}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7C2 4.24 4.24 2 7 2C9.76 2 12 4.24 12 7C12 9.76 9.76 12 7 12" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round"/>
              <polyline points="2,4.5 2,7 4.5,7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </ToolBtn>

          <ToolBtn onClick={fitWidth} title="Fit width" isDark={isDark}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1.5" y="3.5" width="11" height="7" rx="1" stroke="currentColor" strokeWidth="1.2" fill="none"/>
              <line x1="4.5" y1="7" x2="9.5" y2="7" stroke="currentColor" strokeWidth="1.2"/>
              <polyline points="7,4.5 9.5,7 7,9.5" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round"/>
            </svg>
          </ToolBtn>

          <div style={{ width: 1, height: 20, background: border, margin: '0 4px' }} />

          {/* Zoom slider */}
          <input
            type="range" min={100} max={800} step={25}
            value={Math.round(scale * 100)}
            onChange={e => {
              const s = Number(e.target.value) / 100
              setScale(s)
              setOffset(o => clampOffset(o.x, o.y, s))
            }}
            style={{ width: 80, accentColor: '#00d4ff', cursor: 'pointer' }}
          />
        </div>

        {/* Right: keyboard hints + close */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9, color: dim, letterSpacing: '0.07em',
            display: window.innerWidth < 700 ? 'none' : undefined,
          }}>SCROLL TO ZOOM · DRAG TO PAN · ESC CLOSE</span>
          <button onClick={onClose} style={{
            background: 'none', border: `1px solid ${border}`,
            color: muted, width: 30, height: 30, borderRadius: 6,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'border-color 0.15s, color 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#ff4d6d'; e.currentTarget.style.color = '#ff4d6d' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = border; e.currentTarget.style.color = muted }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <line x1="1" y1="1" x2="11" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="11" y1="1" x2="1" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Viewport */}
      <div
        ref={containerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{
          flex: 1, overflow: 'hidden', position: 'relative',
          cursor: dragging ? 'grabbing' : (scale > 1 ? 'grab' : 'default'),
          background: '#0a0a12',
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      >
        <img
          src={src}
          alt="Brain MRI scan"
          draggable={false}
          style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${scale})`,
            transformOrigin: 'center center',
            maxWidth: '90%', maxHeight: '90%',
            objectFit: 'contain',
            transition: dragging ? 'none' : 'transform 0.12s ease',
            userSelect: 'none', pointerEvents: 'none',
          }}
        />

        {/* Zoom indicator badge */}
        {scale > 1 && (
          <div style={{
            position: 'absolute', bottom: 16, right: 16,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11, color: '#00d4ff',
            background: 'rgba(8,12,20,0.85)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(0,212,255,0.25)',
            padding: '4px 10px', borderRadius: 20,
            letterSpacing: '0.08em', pointerEvents: 'none',
          }}>{Math.round(scale * 100)}%</div>
        )}

        {/* Crosshair overlay at 1:1 */}
        {scale === 1 && (
          <div style={{
            position: 'absolute', bottom: 16, right: 16,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9, color: dim,
            letterSpacing: '0.08em', pointerEvents: 'none',
          }}>SCROLL OR PINCH TO ZOOM</div>
        )}
      </div>

      {/* Bottom minimap / info bar */}
      <div style={{
        height: 36, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px',
        borderTop: `1px solid ${border}`,
        background: panel,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9, color: dim, letterSpacing: '0.08em',
      }}>
        <span>MODALITY: MRI · SERIES: AXIAL T1</span>
        <span>ZOOM {Math.round(scale * 100)}% · PAN {offset.x >= 0 ? '+' : ''}{Math.round(offset.x)},{offset.y >= 0 ? '+' : ''}{Math.round(offset.y)}</span>
      </div>
    </div>
  )
}

function ToolBtn({ children, onClick, title, isDark }: { children: React.ReactNode; onClick: () => void; title: string; isDark: boolean }) {
  const border = isDark ? '#1e2a3a' : '#dbe4f0'
  const fg = isDark ? '#6b7fa3' : '#4a5a78'
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 30, height: 30, borderRadius: 6,
        border: `1px solid ${border}`,
        background: 'none', color: fg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', transition: 'border-color 0.15s, color 0.15s',
        flexShrink: 0,
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = '#00d4ff'; e.currentTarget.style.color = '#00d4ff' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = border; e.currentTarget.style.color = fg }}
    >
      {children}
    </button>
  )
}
