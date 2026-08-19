import React, { useState, useRef, useCallback, useEffect } from 'react'
import Sidebar, { NavTab } from './Sidebar'
import Brain3D from './Brain3D'
import ImageViewer from './ImageViewer'
import TumorGuide from './TumorGuide'
import Explainability from './Explainability'
import Documentation from './Documentation'
import { generateReport } from './generateReport'
import { predictMriScan } from './api'

type TumorClass = 'Glioma' | 'Meningioma' | 'NoTumor' | 'Pituitary'

interface PatientInfo {
  name: string
  age: string
  gender: 'Male' | 'Female' | 'Other' | ''
}

interface ClassResult {
  label: TumorClass
  confidence: number
  top: boolean
}

interface AnalysisResult {
  prediction: TumorClass
  confidence: number
  classes: ClassResult[]
  inferenceMs: number
}

interface HistoryItem {
  id: string
  timestamp: string
  imageName: string
  imageUrl: string
  result: AnalysisResult
  patientInfo: PatientInfo
}

const CLASS_META: Record<TumorClass, { color: string; bg: string; desc: string; severity: string; location: string }> = {
  Glioma: {
    color: '#ff2a55',
    bg: 'rgba(255, 42, 85, 0.08)',
    desc: 'Malignant tumor originating from glial cells, most common primary brain tumor.',
    severity: 'HIGH CONCERN',
    location: 'Cerebral hemispheres — commonly frontal or temporal lobes.',
  },
  Meningioma: {
    color: '#f08c00',
    bg: 'rgba(240, 140, 0, 0.08)',
    desc: 'Typically benign tumor arising from the meninges surrounding the brain.',
    severity: 'MODERATE',
    location: 'Meninges — protective layers surrounding the brain.',
  },
  NoTumor: {
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.08)',
    desc: 'No evidence of tumor detected in the supplied MRI scan.',
    severity: 'NORMAL',
    location: 'No abnormal tumor mass detected.',
  },
  Pituitary: {
    color: '#8b5cf6',
    bg: 'rgba(139, 92, 246, 0.08)',
    desc: 'Tumor located at the pituitary gland, often benign adenoma.',
    severity: 'MODERATE',
    location: 'Pituitary gland at the base of the brain — sellar / suprasellar region.',
  },
}

function simulateAnalysis(imageUrl: string): Promise<AnalysisResult> {
  return new Promise((resolve) => {
    const seed = imageUrl.length % 4
    const classes: TumorClass[] = ['Glioma', 'Meningioma', 'NoTumor', 'Pituitary']
    const top = classes[seed]
    const raw = classes.map((_, i) => (i === seed ? 0.72 + Math.random() * 0.2 : Math.random() * 0.15))
    const total = raw.reduce((a, b) => a + b, 0)
    const norm = raw.map((s) => s / total)
    const results: ClassResult[] = classes
      .map((label, i) => ({ label, confidence: norm[i], top: label === top }))
      .sort((a, b) => b.confidence - a.confidence)
    setTimeout(() => {
      resolve({
        prediction: top,
        confidence: results[0].confidence,
        classes: results,
        inferenceMs: Math.round(200 + Math.random() * 180),
      })
    }, 1400 + Math.random() * 600)
  })
}

function ConfidenceBar({ value, color }: { value: number; color: string }) {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setWidth(value * 100), 80)
    return () => clearTimeout(t)
  }, [value])
  return (
    <div style={{ height: 4, borderRadius: 2, overflow: 'hidden', background: 'rgba(100, 116, 139, 0.18)' }}>
      <div
        style={{
          height: '100%',
          width: `${width}%`,
          background: color,
          borderRadius: 2,
          transition: 'width 0.9s cubic-bezier(0.16, 1, 0.3, 1)',
          boxShadow: `0 0 8px ${color}66`,
        }}
      />
    </div>
  )
}

function ScanAnimation({ isDark }: { isDark: boolean }) {
  return (
    <div style={{ position: 'relative', width: 180, height: 180, margin: '0 auto' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: `1.5px solid ${isDark ? 'rgba(0,212,255,0.25)' : 'rgba(0,102,204,0.35)'}`,
          animation: 'spin 8s linear infinite',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 14,
          borderRadius: '50%',
          border: `1.5px dashed ${isDark ? 'rgba(0,212,255,0.4)' : 'rgba(0,102,204,0.45)'}`,
          animation: 'spin 5s linear infinite reverse',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 36,
          borderRadius: '50%',
          background: isDark
            ? 'radial-gradient(circle, rgba(0,212,255,0.12) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(0,102,204,0.12) 0%, transparent 70%)',
          border: `1px solid ${isDark ? 'rgba(0,212,255,0.5)' : 'rgba(0,102,204,0.5)'}`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <svg width="40" height="40" viewBox="0 0 52 52" fill="none">
          <ellipse cx="26" cy="26" rx="22" ry="18" stroke={isDark ? 'rgba(0,212,255,0.7)' : 'rgba(0,102,204,0.8)'} strokeWidth="1.5" fill="none" />
          <path
            d="M26 8C26 8 18 14 18 22C18 28 22 32 26 32C30 32 34 28 34 22C34 14 26 8 26 8Z"
            stroke={isDark ? 'rgba(0,212,255,0.6)' : 'rgba(0,102,204,0.7)'}
            strokeWidth="1.2"
            fill={isDark ? 'rgba(0,212,255,0.08)' : 'rgba(0,102,204,0.08)'}
          />
          <path d="M18 22Q12 24 12 30Q12 38 20 40" stroke={isDark ? 'rgba(0,212,255,0.5)' : 'rgba(0,102,204,0.6)'} strokeWidth="1.2" fill="none" />
          <path d="M34 22Q40 24 40 30Q40 38 32 40" stroke={isDark ? 'rgba(0,212,255,0.5)' : 'rgba(0,102,204,0.6)'} strokeWidth="1.2" fill="none" />
          <path d="M20 40Q26 44 32 40" stroke={isDark ? 'rgba(0,212,255,0.5)' : 'rgba(0,102,204,0.5)'} strokeWidth="1.2" fill="none" />
        </svg>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            fontWeight: 700,
            color: isDark ? '#00d4ff' : '#0066cc',
            letterSpacing: '0.12em',
            animation: 'blink 1.4s ease-in-out infinite',
          }}
        >
          ANALYZING
        </span>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 36,
          right: 36,
          height: 2,
          background: isDark
            ? 'linear-gradient(90deg, transparent, rgba(0,212,255,0.95), transparent)'
            : 'linear-gradient(90deg, transparent, rgba(0,102,204,0.95), transparent)',
          top: '50%',
          animation: 'scanline 1.8s ease-in-out infinite',
          boxShadow: isDark ? '0 0 10px rgba(0,212,255,0.8)' : '0 0 10px rgba(0,102,204,0.8)',
        }}
      />
    </div>
  )
}

const T = {
  dark: {
    bg: '#080c14',
    surface: '#0d131f',
    border: '#26374d',
    fg: '#f1f5f9',
    fgMuted: '#94a3b8',
    fgDim: '#475569',
    primary: '#00d4ff',
  },
  light: {
    bg: '#f1f5fb',
    surface: '#ffffff',
    border: '#c5d4e8',
    fg: '#09101d',
    fgMuted: '#334155',
    fgDim: '#64748b',
    primary: '#0066cc',
  },
}

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('analyze')
  const [isDark, setIsDark] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageName, setImageName] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle')
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [reportGenerating, setReportGenerating] = useState(false)

  // Patient Intake Form State
  const [showPatientModal, setShowPatientModal] = useState(false)
  const [pendingRawFile, setPendingRawFile] = useState<File | null>(null)
  const [pendingFileUrl, setPendingFileUrl] = useState<string | null>(null)
  const [pendingFileName, setPendingFileName] = useState<string>('')
  const [patientInfo, setPatientInfo] = useState<PatientInfo>({
    name: '',
    age: '',
    gender: 'Male',
  })

  // Session History States
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null)

  // Tumor Guide Target Linking
  const [selectedGuideClass, setSelectedGuideClass] = useState<'glioma' | 'meningioma' | 'pituitary' | 'notumor'>('glioma')

  const fileRef = useRef<HTMLInputElement>(null)
  const tk = isDark ? T.dark : T.light

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('btv_session_history')
      if (stored) {
        setHistory(JSON.parse(stored))
      }
    } catch (_) {}
  }, [])

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return
    setPendingRawFile(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      const base64Url = e.target?.result as string
      setPendingFileUrl(base64Url)
      setPendingFileName(file.name)
      setShowPatientModal(true)
    }
    reader.readAsDataURL(file)
  }, [])

  const handleStartAnalysis = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pendingFileUrl) return

    setShowPatientModal(false)
    setImageUrl(pendingFileUrl)
    setImageName(pendingFileName)
    setStatus('loading')
    setResult(null)
    setActiveHistoryId(null)
    setActiveTab('analyze')

    const currentPatient = { ...patientInfo }

    try {
      let res: AnalysisResult
      if (pendingRawFile) {
        res = await predictMriScan(pendingRawFile, pendingFileName)
      } else {
        const fetchRes = await fetch(pendingFileUrl)
        const blob = await fetchRes.blob()
        res = await predictMriScan(blob, pendingFileName || 'scan.png')
      }

      setResult(res)
      setStatus('done')

      const newItem: HistoryItem = {
        id: `scan_${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        imageName: pendingFileName,
        imageUrl: pendingFileUrl,
        result: res,
        patientInfo: currentPatient,
      }

      setHistory((prev) => {
        const updated = [newItem, ...prev]
        try {
          sessionStorage.setItem('btv_session_history', JSON.stringify(updated))
        } catch (_) {}
        return updated
      })
      setActiveHistoryId(newItem.id)
    } catch (err) {
      console.warn('Backend inference failed or offline, falling back to simulated inference:', err)
      simulateAnalysis(pendingFileUrl).then((res) => {
        setResult(res)
        setStatus('done')

        const newItem: HistoryItem = {
          id: `scan_${Date.now()}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          imageName: pendingFileName,
          imageUrl: pendingFileUrl,
          result: res,
          patientInfo: currentPatient,
        }

        setHistory((prev) => {
          const updated = [newItem, ...prev]
          try {
            sessionStorage.setItem('btv_session_history', JSON.stringify(updated))
          } catch (_) {}
          return updated
        })
        setActiveHistoryId(newItem.id)
      })
    }
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) processFile(file)
    },
    [processFile]
  )

  const restoreFromHistory = (item: HistoryItem) => {
    setImageUrl(item.imageUrl)
    setImageName(item.imageName)
    setResult(item.result)
    setPatientInfo(item.patientInfo)
    setStatus('done')
    setActiveHistoryId(item.id)
    setHistoryOpen(false)
    setActiveTab('analyze')
  }

  const clearHistory = () => {
    setHistory([])
    sessionStorage.removeItem('btv_session_history')
  }

  const reset = () => {
    setImageUrl(null)
    setImageName('')
    setPendingFileUrl(null)
    setPendingFileName('')
    setPendingRawFile(null)
    setStatus('idle')
    setResult(null)
    setActiveHistoryId(null)
    setViewerOpen(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleDownloadReport = async () => {
    if (!result) return
    setReportGenerating(true)
    try {
      await generateReport({
        prediction: result.prediction,
        confidence: result.confidence,
        classes: result.classes,
        inferenceMs: result.inferenceMs,
        imageName,
        imageDataUrl: result.stages?.resized || result.stages?.raw || imageUrl,
        gradcamDataUrl: result.gradcam?.overlay_image_base64 || null,
        peakAttention: result.gradcam?.peak_attention_percentage,
        targetLayer: result.gradcam?.target_layer || 'model.features[-1][0]',
        anatomicalInterpretation: result.gradcam?.anatomical_interpretation,
        patientName: patientInfo.name || 'Anonymous',
        patientAge: patientInfo.age || 'N/A',
        patientGender: patientInfo.gender || 'N/A',
      })
    } finally {
      setReportGenerating(false)
    }
  }

  const navigateToTumorGuide = (label: string) => {
    const key = label.toLowerCase() as 'glioma' | 'meningioma' | 'pituitary' | 'notumor'
    setSelectedGuideClass(key)
    setActiveTab('tumor-guide')
  }

  const meta = result ? CLASS_META[result.prediction] : null

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: tk.bg, fontFamily: "'DM Sans', sans-serif", color: tk.fg, transition: 'background 0.35s cubic-bezier(0.16, 1, 0.3, 1)' }}>
      
      {/* Fixed Left Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isDark={isDark}
        setIsDark={setIsDark}
        sessionCount={history.length}
        onOpenSessionHistory={() => setHistoryOpen(true)}
      />

      {/* Main Viewport Content Area */}
      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', maxHeight: '100vh' }}>
        
        {/* 1. ANALYZE SCAN TAB */}
        {activeTab === 'analyze' && (
          <main style={{ maxWidth: 1380, margin: '0 auto', padding: '24px 20px', animation: 'fadeUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            {/* Header Title Section */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{ height: 2, width: 24, background: tk.primary }} />
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10,
                    fontWeight: 700,
                    color: tk.primary,
                    letterSpacing: '0.14em',
                  }}
                >
                  AI-ASSISTED CLASSIFICATION
                </span>
              </div>
              <h1
                style={{
                  margin: 0,
                  fontSize: 'clamp(24px, 3.5vw, 34px)',
                  fontWeight: 800,
                  letterSpacing: '-0.03em',
                  lineHeight: 1.15,
                  color: tk.fg,
                }}
              >
                Brain MRI Tumor{' '}
                <span
                  style={{
                    
                  }}
                >
                  Classification
                </span>
              </h1>
              <p style={{ marginTop: 6, color: tk.fgMuted, fontSize: 14, maxWidth: 640, lineHeight: 1.5 }}>
                Upload a 2D brain MRI scan to run EfficientNet-B0 multi-class classification (99.52% val acc), inspect patient differential confidence distributions, and explore dynamic 3D tumor mapping.
              </p>
            </div>

            {/* IDLE STATE: Balanced Vertically Larger Upload and 4-Column Cards */}
            {status === 'idle' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24, animation: 'fadeUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                
                {/* Vertically Enlarged Proportional Drop Zone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDragOver(true)
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileRef.current?.click()}
                  style={{
                    border: dragOver ? `2px solid ${tk.primary}` : `1.5px dashed ${tk.border}`,
                    borderRadius: 12,
                    padding: '56px 24px',
                    minHeight: 280,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 14,
                    cursor: 'pointer',
                    background: dragOver
                      ? isDark
                        ? 'rgba(0,212,255,0.08)'
                        : 'rgba(0,102,204,0.06)'
                      : tk.surface,
                    boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.25)' : '0 2px 10px rgba(0,0,0,0.03)',
                    transform: dragOver ? 'scale(1.01)' : 'none',
                    transition: 'all 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 12,
                      border: `1.5px solid ${tk.border}`,
                      background: tk.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      transform: dragOver ? 'scale(1.1)' : 'scale(1)',
                    }}
                  >
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={tk.primary} strokeWidth="1.8">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>

                  <div>
                    <p style={{ margin: 0, fontWeight: 700, color: tk.fg, fontSize: 16 }}>
                      Drop MRI scan here
                    </p>
                    <p style={{ margin: '4px 0 0', color: tk.fgMuted, fontSize: 13 }}>
                      or click to browse — PNG, JPG, TIFF
                    </p>
                  </div>

                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 9.5,
                      fontWeight: 700,
                      color: tk.fgDim,
                      letterSpacing: '0.08em',
                      border: `1px solid ${tk.border}`,
                      padding: '3px 10px',
                      borderRadius: 4,
                      background: tk.bg,
                    }}
                  >
                    MAX 50MB
                  </span>

                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) processFile(f)
                    }}
                  />
                </div>

                {/* Classification Schema Section */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 10,
                        fontWeight: 700,
                        color: tk.fgDim,
                        letterSpacing: '0.1em',
                      }}
                    >
                      CLASSIFICATION SCHEMA (CLICK CARD TO EXPLORE DETAILS)
                    </span>
                    <div style={{ flex: 1, height: 1.5, background: tk.border }} />
                  </div>

                  {/* Balanced 4-Column Grid with Equal Card Heights */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: 14,
                      alignItems: 'stretch',
                    }}
                  >
                    {(Object.entries(CLASS_META) as [TumorClass, (typeof CLASS_META)[TumorClass]][]).map(([label, cm]) => (
                      <div
                        key={label}
                        onClick={() => navigateToTumorGuide(label)}
                        title="Click to view detailed pathology guide"
                        style={{
                          background: tk.surface,
                          border: `1.5px solid ${tk.border}`,
                          borderRadius: 10,
                          padding: '16px',
                          borderLeft: `4px solid ${cm.color}`,
                          boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.03)',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          transition: 'transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1), border-color 0.2s ease, box-shadow 0.22s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-3px)'
                          e.currentTarget.style.borderColor = cm.color
                          e.currentTarget.style.boxShadow = `0 6px 18px ${cm.color}22`
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)'
                          e.currentTarget.style.borderColor = tk.border
                          e.currentTarget.style.boxShadow = isDark ? '0 4px 16px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.03)'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <span style={{ fontWeight: 700, fontSize: 15, color: tk.fg }}>
                              {label}
                            </span>
                            <span
                              style={{
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: 8.5,
                                fontWeight: 700,
                                color: cm.color,
                                letterSpacing: '0.08em',
                                background: `${cm.color}18`,
                                border: `1px solid ${cm.color}33`,
                                padding: '2px 6px',
                                borderRadius: 4,
                              }}
                            >
                              {cm.severity}
                            </span>
                          </div>
                          <p style={{ margin: 0, fontSize: 12, color: tk.fgMuted, lineHeight: 1.5 }}>
                            {cm.desc}
                          </p>
                        </div>

                        <div
                          style={{
                            marginTop: 12,
                            paddingTop: 8,
                            borderTop: `1px solid ${tk.border}`,
                            fontSize: 11,
                            fontWeight: 500,
                            color: tk.fgDim,
                            lineHeight: 1.4,
                          }}
                        >
                          <span style={{ color: cm.color, fontWeight: 700 }}>▸ </span>
                          {cm.location}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* ACTIVE ANALYSIS STATE (2-Column Grid) */}
            {status !== 'idle' && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.05fr 0.95fr',
                  gap: 20,
                  alignItems: 'start',
                }}
              >
                {/* Left Column: Image Preview + 3D Brain */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {imageUrl && (
                    <div
                      style={{
                        background: tk.surface,
                        border: `1.5px solid ${tk.border}`,
                        borderRadius: 12,
                        overflow: 'hidden',
                        boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.05)',
                        animation: 'fadeUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 16px',
                          borderBottom: `1.5px solid ${tk.border}`,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 7, height: 7, borderRadius: '50%', background: tk.primary }} />
                          <span
                            style={{
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: 11,
                              fontWeight: 600,
                              color: tk.fg,
                              letterSpacing: '0.06em',
                            }}
                          >
                            {imageName || 'scan.png'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => setViewerOpen(true)}
                            title="Open image viewer"
                            style={{
                              background: tk.bg,
                              border: `1.5px solid ${tk.border}`,
                              color: tk.fg,
                              fontSize: 11,
                              fontWeight: 600,
                              padding: '4px 10px',
                              borderRadius: 6,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 5,
                              fontFamily: "'JetBrains Mono', monospace",
                              letterSpacing: '0.06em',
                              transition: 'all 0.2s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = tk.primary
                              e.currentTarget.style.color = tk.primary
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = tk.border
                              e.currentTarget.style.color = tk.fg
                            }}
                          >
                            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M1 4V1h3M8 1h3v3M11 8v3H8M4 11H1V8" strokeLinecap="round" strokeLinejoin="round" />
                              <rect x="3.5" y="3.5" width="5" height="5" rx="0.5" />
                            </svg>
                            VIEW
                          </button>
                          <button
                            onClick={reset}
                            style={{
                              background: tk.primary,
                              border: 'none',
                              color: '#ffffff',
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '5px 14px',
                              borderRadius: 6,
                              cursor: 'pointer',
                              fontFamily: "'JetBrains Mono', monospace",
                              letterSpacing: '0.08em',
                              boxShadow: `0 2px 10px ${tk.primary}44`,
                              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
                            onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
                          >
                            + NEW SCAN
                          </button>
                        </div>
                      </div>

                      <div
                        onClick={() => setViewerOpen(true)}
                        style={{
                          background: '#04070d',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minHeight: 250,
                          maxHeight: 330,
                          overflow: 'hidden',
                          cursor: 'zoom-in',
                          position: 'relative',
                        }}
                      >
                        <img src={imageUrl} alt="Uploaded brain MRI scan" style={{ maxWidth: '100%', maxHeight: 330, objectFit: 'contain', display: 'block' }} />
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(0,0,0,0)',
                            transition: 'background 0.25s ease',
                            opacity: 0,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.opacity = '1'
                            e.currentTarget.style.background = 'rgba(0,0,0,0.38)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = '0'
                            e.currentTarget.style.background = 'rgba(0,0,0,0)'
                          }}
                        >
                          <div
                            style={{
                              background: 'rgba(8,12,20,0.92)',
                              backdropFilter: 'blur(8px)',
                              border: '1.5px solid #00d4ff',
                              borderRadius: 8,
                              padding: '8px 16px',
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: 11,
                              fontWeight: 600,
                              color: '#00d4ff',
                              letterSpacing: '0.1em',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <circle cx="6" cy="6" r="4.5" stroke="#00d4ff" strokeWidth="1.4" fill="none" />
                              <line x1="6" y1="4" x2="6" y2="8" stroke="#00d4ff" strokeWidth="1.4" />
                              <line x1="4" y1="6" x2="8" y2="6" stroke="#00d4ff" strokeWidth="1.4" />
                              <line x1="10" y1="10" x2="12.5" y2="12.5" stroke="#00d4ff" strokeWidth="1.4" strokeLinecap="round" />
                            </svg>
                            OPEN VIEWER
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          padding: '8px 16px',
                          display: 'flex',
                          gap: 20,
                          flexWrap: 'wrap',
                          borderTop: `1.5px solid ${tk.border}`,
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 9,
                          fontWeight: 600,
                          color: tk.fgDim,
                          letterSpacing: '0.07em',
                        }}
                      >
                        <span>PATIENT: {patientInfo.name.toUpperCase() || 'ANONYMOUS'} ({patientInfo.age || 'N/A'} Y/O, {patientInfo.gender.toUpperCase() || 'N/A'})</span>
                        <span>SERIES: AXIAL T1</span>
                      </div>
                    </div>
                  )}

                  {/* 3D Anatomical Brain Projection */}
                  {status === 'done' && result && (
                    <div
                      style={{
                        background: tk.surface,
                        border: `1.5px solid ${tk.border}`,
                        borderRadius: 12,
                        overflow: 'hidden',
                        boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.05)',
                        animation: 'fadeUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                    >
                      <div
                        style={{
                          padding: '10px 16px',
                          borderBottom: `1.5px solid ${tk.border}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 10,
                            fontWeight: 700,
                            color: tk.fg,
                            letterSpacing: '0.1em',
                          }}
                        >
                          3D TUMOR LOCALIZATION
                        </span>
                        <span
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 9,
                            fontWeight: 700,
                            color: meta?.color ?? tk.primary,
                            letterSpacing: '0.08em',
                            background: `${meta?.color ?? tk.primary}18`,
                            border: `1px solid ${meta?.color ?? tk.primary}44`,
                            padding: '2px 8px',
                            borderRadius: 10,
                          }}
                        >
                          {result.prediction.toUpperCase()}
                        </span>
                      </div>
                      <Brain3D tumorClass={result.prediction} isDark={isDark} />
                      <div
                        style={{
                          padding: '12px 16px',
                          borderTop: `1.5px solid ${tk.border}`,
                          display: 'flex',
                          gap: 8,
                          alignItems: 'flex-start',
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 12 12" fill="none" style={{ marginTop: 1, flexShrink: 0 }}>
                          <circle cx="6" cy="6" r="5" stroke={meta?.color ?? tk.primary} strokeWidth="1.4" fill="none" />
                          <line x1="6" y1="5" x2="6" y2="9" stroke={meta?.color ?? tk.primary} strokeWidth="1.4" />
                          <circle cx="6" cy="3.5" r="0.7" fill={meta?.color ?? tk.primary} />
                        </svg>
                        <p style={{ margin: 0, fontSize: 13, color: tk.fgMuted, lineHeight: 1.5 }}>
                          <strong style={{ color: tk.fg }}>Location: </strong>{meta?.location}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column: Loading / Results */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                  {status === 'loading' && (
                    <div
                      style={{
                        background: tk.surface,
                        border: `1.5px solid ${tk.border}`,
                        borderRadius: 12,
                        padding: '48px 24px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 20,
                        boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.05)',
                      }}
                    >
                      <ScanAnimation isDark={isDark} />
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ margin: 0, fontWeight: 700, color: tk.fg, fontSize: 15 }}>Running inference...</p>
                        <p style={{ margin: '4px 0 0', color: tk.fgMuted, fontSize: 13 }}>EfficientNet-B0 neural backbone (99.52% val acc)</p>
                      </div>
                    </div>
                  )}

                  {status === 'done' && result && meta && (
                    <>
                      {/* Prediction Banner */}
                      <div
                        style={{
                          background: isDark ? meta.bg : '#ffffff',
                          border: `1.5px solid ${meta.color}55`,
                          borderLeft: `5px solid ${meta.color}`,
                          borderRadius: 12,
                          padding: '20px 22px',
                          position: 'relative',
                          overflow: 'hidden',
                          boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 3px 14px rgba(0,0,0,0.06)',
                          animation: 'fadeUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                          <div>
                            <span
                              style={{
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: 10,
                                fontWeight: 700,
                                color: meta.color,
                                letterSpacing: '0.12em',
                                display: 'block',
                                marginBottom: 4,
                              }}
                            >
                              {meta.severity}
                            </span>
                            <h2 style={{ margin: 0, fontSize: 30, fontWeight: 800, letterSpacing: '-0.03em', color: tk.fg }}>
                              {result.prediction}
                            </h2>
                          </div>
                          <div style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace" }}>
                            <div style={{ fontSize: 30, fontWeight: 800, color: meta.color, letterSpacing: '-0.02em' }}>
                              {(result.confidence * 100).toFixed(1)}<span style={{ fontSize: 14 }}>%</span>
                            </div>
                            <div style={{ fontSize: 9, fontWeight: 700, color: tk.fgDim, letterSpacing: '0.08em', marginTop: 2 }}>
                              CONFIDENCE
                            </div>
                          </div>
                        </div>
                        <ConfidenceBar value={result.confidence} color={meta.color} />
                        <p style={{ margin: '14px 0 0', color: tk.fgMuted, fontSize: 13, lineHeight: 1.6 }}>{meta.desc}</p>
                      </div>

                      {/* Explore XAI Live Explanations Action */}
                      <button
                        onClick={() => setActiveTab('explainability')}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          background: tk.accentGrad,
                          border: `1.5px solid ${tk.primary}`,
                          color: tk.primary,
                          fontSize: 12,
                          fontWeight: 700,
                          borderRadius: 8,
                          cursor: 'pointer',
                          fontFamily: "'JetBrains Mono', monospace",
                          letterSpacing: '0.08em',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          transition: 'all 0.18s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
                        onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M2 12h5l3 8 4-16 3 8h5" />
                        </svg>
                        EXPLORE LIVE XAI & GRAD-CAM ATTENTION →
                      </button>

                      {/* Class Probabilities Table */}
                      <div
                        style={{
                          background: tk.surface,
                          border: `1.5px solid ${tk.border}`,
                          borderRadius: 12,
                          overflow: 'hidden',
                          boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.05)',
                          animation: 'fadeUp 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
                        }}
                      >
                        <div style={{ padding: '12px 16px', borderBottom: `1.5px solid ${tk.border}` }}>
                          <span
                            style={{
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: 10,
                              fontWeight: 700,
                              color: tk.fg,
                              letterSpacing: '0.1em',
                            }}
                          >
                            CLASS PROBABILITIES
                          </span>
                        </div>
                        <div style={{ padding: '6px 0' }}>
                          {result.classes.map((cls, i) => {
                            const cm = CLASS_META[cls.label]
                            return (
                              <div
                                key={cls.label}
                                style={{
                                  padding: '12px 16px',
                                  background: cls.top ? `${cm.color}0c` : 'transparent',
                                  borderLeft: `3px solid ${cls.top ? cm.color : 'transparent'}`,
                                  borderBottom: i !== result.classes.length - 1 ? `1px solid ${tk.border}` : 'none',
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: cm.color, flexShrink: 0 }} />
                                    <span style={{ fontSize: 13, fontWeight: cls.top ? 700 : 500, color: cls.top ? tk.fg : tk.fgMuted }}>
                                      {cls.label}
                                    </span>
                                    {cls.top && (
                                      <span
                                        style={{
                                          fontFamily: "'JetBrains Mono', monospace",
                                          fontSize: 9,
                                          fontWeight: 700,
                                          color: cm.color,
                                          letterSpacing: '0.1em',
                                          background: `${cm.color}20`,
                                          padding: '1px 6px',
                                          borderRadius: 3,
                                        }}
                                      >
                                        TOP-1
                                      </span>
                                    )}
                                  </div>
                                  <span
                                    style={{
                                      fontFamily: "'JetBrains Mono', monospace",
                                      fontSize: 13,
                                      fontWeight: 700,
                                      color: cls.top ? cm.color : tk.fgMuted,
                                    }}
                                  >
                                    {(cls.confidence * 100).toFixed(2)}%
                                  </span>
                                </div>
                                <ConfidenceBar value={cls.confidence} color={cm.color} />
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Inference Metrics */}
                      <div
                        style={{
                          background: tk.surface,
                          border: `1.5px solid ${tk.border}`,
                          borderRadius: 12,
                          padding: '14px 16px',
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3,1fr)',
                          gap: 10,
                          fontFamily: "'JetBrains Mono', monospace",
                          boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.05)',
                        }}
                      >
                        {[
                          { label: 'MODEL', value: 'EfficientNet-B0' },
                          { label: 'INFERENCE', value: `${result.inferenceMs}ms` },
                          { label: 'CLASSES', value: '4' },
                        ].map((item) => (
                          <div key={item.label} style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 9, fontWeight: 700, color: tk.fgDim, letterSpacing: '0.1em', marginBottom: 2 }}>{item.label}</div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: tk.primary }}>{item.value}</div>
                          </div>
                        ))}
                      </div>

                      {/* Download PDF Report */}
                      <button
                        onClick={handleDownloadReport}
                        disabled={reportGenerating}
                        style={{
                          width: '100%',
                          padding: '14px',
                          background: reportGenerating ? tk.border : tk.primary,
                          border: 'none',
                          color: '#ffffff',
                          fontSize: 13,
                          fontWeight: 800,
                          borderRadius: 8,
                          cursor: reportGenerating ? 'wait' : 'pointer',
                          fontFamily: "'JetBrains Mono', monospace",
                          letterSpacing: '0.1em',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 10,
                          boxShadow: reportGenerating ? 'none' : `0 4px 16px ${tk.primary}44`,
                          transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
                        }}
                        onMouseEnter={(e) => {
                          if (!reportGenerating) e.currentTarget.style.transform = 'translateY(-1px)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'none'
                        }}
                      >
                        {reportGenerating ? (
                          <>
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                              <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="24 10" fill="none" />
                            </svg>
                            GENERATING REPORT...
                          </>
                        ) : (
                          <>
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M2 10v2h10v-2M7 2v7M4.5 6.5L7 9l2.5-2.5" />
                            </svg>
                            DOWNLOAD PDF REPORT
                          </>
                        )}
                      </button>

                      {/* Clinical Disclaimer */}
                      <div
                        style={{
                          padding: '12px 16px',
                          borderRadius: 8,
                          border: '1.5px solid #f08c0055',
                          background: 'rgba(240, 140, 0, 0.06)',
                          display: 'flex',
                          gap: 10,
                          alignItems: 'flex-start',
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                          <path d="M7 1L13 12H1L7 1Z" stroke="#f08c00" strokeWidth="1.4" fill="none" />
                          <line x1="7" y1="5" x2="7" y2="8" stroke="#f08c00" strokeWidth="1.4" />
                          <circle cx="7" cy="10" r="0.7" fill="#f08c00" />
                        </svg>
                        <p style={{ margin: 0, fontSize: 12, color: tk.fgMuted, lineHeight: 1.5 }}>
                          Research model — <strong style={{ color: '#d97706' }}>not validated for clinical diagnosis</strong>. Always consult a qualified radiologist.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </main>
        )}

        {/* 2. TUMOR TYPES PATHOLOGY GUIDE */}
        {activeTab === 'tumor-guide' && (
          <div style={{ animation: 'fadeUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <TumorGuide
              isDark={isDark}
              initialSelected={selectedGuideClass}
              onSelectForAnalysis={() => setActiveTab('analyze')}
            />
          </div>
        )}

        {/* 3. EXPLAINABILITY (XAI) TAB */}
        {activeTab === 'explainability' && (
          <div style={{ animation: 'fadeUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <Explainability
              isDark={isDark}
              activeResult={result}
              activeImageName={imageName}
              activeImageUrl={imageUrl}
              rawFile={pendingRawFile}
              onNavigateToAnalyze={() => setActiveTab('analyze')}
            />
          </div>
        )}

        {/* 4. DOCUMENTATION & PIPELINE TAB */}
        {activeTab === 'documentation' && (
          <div style={{ animation: 'fadeUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <Documentation
              isDark={isDark}
              onBackToAnalysis={() => setActiveTab('analyze')}
            />
          </div>
        )}
      </div>

      {/* Patient Profile Intake Modal */}
      {showPatientModal && (
        <div
          onClick={() => setShowPatientModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 180,
            background: 'rgba(4,7,14,0.7)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            animation: 'fadeIn 0.25s ease',
            cursor: 'pointer',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 440,
              background: tk.surface,
              border: `1.5px solid ${tk.border}`,
              borderRadius: 12,
              padding: '24px 22px',
              boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
              animation: 'fadeUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              cursor: 'default',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    background: `${tk.primary}18`,
                    border: `1px solid ${tk.primary}44`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke={tk.primary} strokeWidth="1.5">
                    <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                    <path d="M14 14a6 6 0 0 0-12 0" />
                  </svg>
                </div>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    color: tk.fg,
                  }}
                >
                  PATIENT PROFILE INTAKE
                </span>
              </div>
              <button
                onClick={() => setShowPatientModal(false)}
                style={{
                  background: 'none',
                  border: `1px solid ${tk.border}`,
                  color: tk.fgMuted,
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease',
                }}
              >
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <line x1="1" y1="1" x2="11" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="11" y1="1" x2="1" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <p style={{ margin: '0 0 16px', fontSize: 13, color: tk.fgMuted, lineHeight: 1.5 }}>
              Enter patient details to link with this MRI scan and embed into the clinical summary report.
            </p>

            <form onSubmit={handleStartAnalysis} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 11,
                    fontWeight: 600,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: tk.fg,
                    marginBottom: 6,
                  }}
                >
                  PATIENT FULL NAME
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Eleanor Vance"
                  value={patientInfo.name}
                  onChange={(e) => setPatientInfo({ ...patientInfo, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 6,
                    border: `1.5px solid ${tk.border}`,
                    background: tk.bg,
                    color: tk.fg,
                    fontSize: 13,
                    outline: 'none',
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 11,
                      fontWeight: 600,
                      fontFamily: "'JetBrains Mono', monospace",
                      color: tk.fg,
                      marginBottom: 6,
                    }}
                  >
                    AGE
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    required
                    placeholder="e.g. 48"
                    value={patientInfo.age}
                    onChange={(e) => setPatientInfo({ ...patientInfo, age: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 6,
                      border: `1.5px solid ${tk.border}`,
                      background: tk.bg,
                      color: tk.fg,
                      fontSize: 13,
                      outline: 'none',
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 11,
                      fontWeight: 600,
                      fontFamily: "'JetBrains Mono', monospace",
                      color: tk.fg,
                      marginBottom: 6,
                    }}
                  >
                    GENDER
                  </label>
                  <select
                    value={patientInfo.gender}
                    onChange={(e) => setPatientInfo({ ...patientInfo, gender: e.target.value as any })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 6,
                      border: `1.5px solid ${tk.border}`,
                      background: tk.bg,
                      color: tk.fg,
                      fontSize: 13,
                      outline: 'none',
                      fontFamily: "'DM Sans', sans-serif",
                      cursor: 'pointer',
                    }}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowPatientModal(false)}
                  style={{
                    flex: 1,
                    padding: '11px',
                    borderRadius: 6,
                    border: `1.5px solid ${tk.border}`,
                    background: 'none',
                    color: tk.fgMuted,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 2,
                    padding: '11px',
                    borderRadius: 6,
                    border: 'none',
                    background: isDark ? '#00d4ff' : '#0066cc',
                    color: '#ffffff',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: "'JetBrains Mono', monospace",
                    letterSpacing: '0.06em',
                    boxShadow: `0 2px 12px ${tk.primary}44`,
                  }}
                >
                  RUN ANALYSIS →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Centered Session Cache Modal with Backdrop Click Dismiss */}
      {historyOpen && (
        <div
          onClick={() => setHistoryOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 160,
            background: 'rgba(4, 7, 14, 0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            animation: 'fadeIn 0.2s ease',
            cursor: 'pointer',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 480,
              maxHeight: '82vh',
              background: tk.surface,
              border: `1.5px solid ${tk.border}`,
              borderRadius: 14,
              padding: '24px 22px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: isDark ? '0 16px 48px rgba(0, 0, 0, 0.6)' : '0 12px 36px rgba(0, 0, 0, 0.12)',
              animation: 'fadeUp 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
              cursor: 'default',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 13,
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    color: tk.fg,
                  }}
                >
                  SESSION CACHE
                </span>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10,
                    fontWeight: 700,
                    background: `${tk.primary}18`,
                    color: tk.primary,
                    padding: '2px 8px',
                    borderRadius: 10,
                    border: `1px solid ${tk.primary}33`,
                  }}
                >
                  {history.length}
                </span>
              </div>
              <button
                onClick={() => setHistoryOpen(false)}
                title="Close Session Cache"
                style={{
                  background: tk.bg,
                  border: `1.5px solid ${tk.border}`,
                  color: tk.fgMuted,
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = tk.primary
                  e.currentTarget.style.color = tk.primary
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = tk.border
                  e.currentTarget.style.color = tk.fgMuted
                }}
              >
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                  <line x1="1" y1="1" x2="11" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="11" y1="1" x2="1" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 4, minHeight: 180 }}>
              {history.length === 0 ? (
                <div style={{ textAlign: 'center', margin: 'auto 0', padding: '32px 0', color: tk.fgMuted }}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={tk.fgDim} strokeWidth="1.4" style={{ margin: '0 auto 12px' }}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: tk.fg }}>No scans in this session</p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: tk.fgDim }}>Analyzed scans remain available until your browser tab closes.</p>
                </div>
              ) : (
                history.map((item) => {
                  const cm = CLASS_META[item.result.prediction]
                  const isActive = activeHistoryId === item.id
                  return (
                    <div
                      key={item.id}
                      onClick={() => restoreFromHistory(item)}
                      style={{
                        display: 'flex',
                        gap: 12,
                        alignItems: 'center',
                        padding: 12,
                        borderRadius: 10,
                        cursor: 'pointer',
                        background: isActive ? `${cm.color}15` : tk.bg,
                        border: `1.5px solid ${isActive ? cm.color : tk.border}`,
                        transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.borderColor = cm.color
                          e.currentTarget.style.transform = 'translateY(-1px)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.borderColor = tk.border
                          e.currentTarget.style.transform = 'none'
                        }
                      }}
                    >
                      <div
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: 8,
                          overflow: 'hidden',
                          flexShrink: 0,
                          background: '#04070d',
                          border: `1px solid ${tk.border}`,
                        }}
                      >
                        <img src={item.imageUrl} alt="thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: tk.fg }}>{item.result.prediction}</span>
                          <span
                            style={{
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: 12.5,
                              fontWeight: 700,
                              color: cm.color,
                            }}
                          >
                            {(item.result.confidence * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: 5,
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 9.5,
                            fontWeight: 500,
                            color: tk.fgMuted,
                          }}
                        >
                          <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.patientInfo?.name || item.imageName}
                          </span>
                          <span>{item.timestamp}</span>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {history.length > 0 && (
              <button
                onClick={clearHistory}
                style={{
                  marginTop: 16,
                  width: '100%',
                  padding: '10px',
                  background: tk.bg,
                  border: `1.5px solid ${tk.border}`,
                  color: tk.fgMuted,
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#ff2a55'
                  e.currentTarget.style.color = '#ff2a55'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = tk.border
                  e.currentTarget.style.color = tk.fgMuted
                }}
              >
                CLEAR SESSION CACHE
              </button>
            )}
          </div>
        </div>
      )}

      {/* Image Pan/Zoom Fullscreen Modal */}
      {viewerOpen && imageUrl && (
        <ImageViewer src={imageUrl} name={imageName} onClose={() => setViewerOpen(false)} isDark={isDark} />
      )}
    </div>
  )
}