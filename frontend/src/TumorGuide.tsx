import { useState } from 'react'

type TumorKey = 'glioma' | 'meningioma' | 'pituitary' | 'notumor'

interface TumorGuideProps {
  isDark: boolean
  onSelectForAnalysis?: () => void
  initialSelected?: TumorKey
}

interface TumorDetail {
  id: TumorKey
  title: string
  subtitle: string
  color: string
  tag: string
  severity: string
  origin: string
  typicalLocations: string[]
  mriCharacteristics: {
    t1: string
    t2flair: string
    contrast: string
  }
  clinicalPresentation: string[]
  incidence: string
  keyDifferentiators: string
}

const TUMOR_DATA: Record<TumorKey, TumorDetail> = {
  glioma: {
    id: 'glioma',
    title: 'Glioma',
    subtitle: 'Intra-Axial Glial Cell Neoplasm',
    color: '#ff2a55',
    tag: 'MALIGNANT / HIGH CONCERN',
    severity: 'High Clinical Concern (WHO Grade II–IV)',
    origin: 'Originates from glial progenitor cells (astrocytes, oligodendrocytes, ependymal cells).',
    typicalLocations: [
      'Frontal Lobe (Cerebral Cortex)',
      'Temporal Lobe',
      'Parieto-occipital White Matter Tracts',
      'Subcortical Hemispheric Tissue',
    ],
    mriCharacteristics: {
      t1: 'Iso- to hypointense heterogeneous infiltrative mass.',
      t2flair: 'Marked hyperintensity with extensive surrounding vasogenic peritumoral edema.',
      contrast: 'Heterogeneous, peripheral ring-like enhancement with central necrosis (Glioblastoma / High-Grade).',
    },
    clinicalPresentation: [
      'Progressive tension headaches (worse in mornings)',
      'Focal neurological deficits and hemiparesis',
      'New-onset adult seizures',
      'Cognitive and behavioral changes',
    ],
    incidence: '~30% of all primary brain tumors; ~80% of all malignant brain tumors.',
    keyDifferentiators: 'Distinguished by its infiltrative margin crossing white matter tracts without respecting anatomical pial boundaries.',
  },
  meningioma: {
    id: 'meningioma',
    title: 'Meningioma',
    subtitle: 'Extra-Axial Dural-Based Neoplasm',
    color: '#f08c00',
    tag: 'TYPICALLY BENIGN / MODERATE',
    severity: 'Moderate Concern (WHO Grade I ~90%, Grade II/III Rare)',
    origin: 'Arises from the arachnoid cap cells of the meninges surrounding the central nervous system.',
    typicalLocations: [
      'Parasagittal / Falx Cerebri',
      'Cerebral Convexities (Dural Border)',
      'Sphenoid Wing',
      'Olfactory Groove & Posterior Fossa',
    ],
    mriCharacteristics: {
      t1: 'Iso- to mildly hypointense relative to gray matter.',
      t2flair: 'Iso- to hyperintense with variable peritumoral edema depending on cortical compression.',
      contrast: 'Intense, homogeneous, vivid enhancement with the classic diagnostic "Dural Tail Sign".',
    },
    clinicalPresentation: [
      'Gradual focal symptoms secondary to mass effect and cortical compression',
      'Persistent localized headaches',
      'Visual disturbances (when near sphenoid wing or optic chiasm)',
      'Anosmia (olfactory groove locations)',
    ],
    incidence: '~37% of all primary central nervous system tumors (most common benign primary brain tumor).',
    keyDifferentiators: 'Extra-axial location with sharply defined borders, CSF cleft sign, and prominent dural tail enhancement.',
  },
  pituitary: {
    id: 'pituitary',
    title: 'Pituitary Adenoma',
    subtitle: 'Sellar / Suprasellar Glandular Tumor',
    color: '#8b5cf6',
    tag: 'BENIGN / ENDOCRINE / MODERATE',
    severity: 'Moderate Concern (Slow Growing, High Endocrine Impact)',
    origin: 'Arises from epithelial cells in the anterior pituitary lobe (adenohypophysis) within the sella turcica.',
    typicalLocations: [
      'Sella Turcica (Intrasellar)',
      'Suprasellar Cistern (Optic Chiasm compression)',
      'Sphenoid Sinus (inferior invasion)',
      'Cavernous Sinus (lateral expansion)',
    ],
    mriCharacteristics: {
      t1: 'Isointense to hypointense relative to normal pituitary gland.',
      t2flair: 'Heterogeneous hyperintensity (often variable with cystic or hemorrhagic degeneration).',
      contrast: 'Delayed, moderate enhancement; macroadenomas (>10mm) show classic "figure-eight" / snowman contour.',
    },
    clinicalPresentation: [
      'Bitemporal hemianopsia (optic chiasm compression from suprasellar extension)',
      'Hyperprolactinemia (galactorrhea, amenorrhea)',
      'Cushing disease (ACTH hypersecretion) or Acromegaly (GH excess)',
      'Hypopituitarism and hormonal exhaustion',
    ],
    incidence: '~15% of all intracranial neoplasms.',
    keyDifferentiators: 'Confined to or centered on the sella turcica with expansion toward the optic chiasm and infundibular stalk.',
  },
  notumor: {
    id: 'notumor',
    title: 'No Abnormality Detected',
    subtitle: 'Healthy Baseline Brain Anatomy',
    color: '#10b981',
    tag: 'NORMAL / CLEAR',
    severity: 'Normal Baseline Reference',
    origin: 'Physiological brain tissue architecture showing normal gray-white matter differentiation.',
    typicalLocations: [
      'Symmetric Cerebral Hemispheres',
      'Unobstructed Lateral, Third, and Fourth Ventricles',
      'Normal Cerebellar Folia and Brainstem Morphology',
      'Intact Midline Interhemispheric Fissure',
    ],
    mriCharacteristics: {
      t1: 'Clear gray/white matter contrast with dark cerebrospinal fluid (CSF).',
      t2flair: 'Suppressed CSF signal on FLAIR with no focal hyperintensities or mass effect.',
      contrast: 'Symmetric mucosal/vascular enhancement without focal parenchymal blush.',
    },
    clinicalPresentation: [
      'No structural intracranial mass lesion identified',
      'Normal ventricular volume for age',
      'No midline shift or parenchymal displacement',
    ],
    incidence: 'N/A — Reference non-pathological class in dataset benchmark.',
    keyDifferentiators: 'Bilateral symmetry, sharp sulcal definitions, and absence of mass effect, midline shift, or abnormal dural enhancement.',
  },
}

export default function TumorGuide({ isDark, onSelectForAnalysis, initialSelected = 'glioma' }: TumorGuideProps) {
  const [expandedCard, setExpandedCard] = useState<TumorKey | null>(initialSelected)
  const [searchFilter, setSearchFilter] = useState('')

  const tk = {
    bg: isDark ? '#080c14' : '#f1f5fb',
    surface: isDark ? '#0d131f' : '#ffffff',
    border: isDark ? '#26374d' : '#c5d4e8',
    fg: isDark ? '#f1f5f9' : '#09101d',
    fgMuted: isDark ? '#94a3b8' : '#334155',
    fgDim: isDark ? '#475569' : '#64748b',
    primary: isDark ? '#00d4ff' : '#0066cc',
  }

  const filteredTumors = (Object.keys(TUMOR_DATA) as TumorKey[]).filter((key) => {
    const item = TUMOR_DATA[key]
    const query = searchFilter.toLowerCase()
    return (
      item.title.toLowerCase().includes(query) ||
      item.subtitle.toLowerCase().includes(query) ||
      item.origin.toLowerCase().includes(query)
    )
  })

  return (
    <div style={{ padding: '24px 20px', maxWidth: 1200, margin: '0 auto', fontFamily: "'DM Sans', sans-serif", color: tk.fg }}>
      
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{ height: 2, width: 24, background: tk.primary }} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, color: tk.primary, letterSpacing: '0.14em' }}>
              PATHOLOGY KNOWLEDGE BASE
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: 'clamp(24px, 3.5vw, 32px)', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Tumor Classification Guide
          </h1>
          <p style={{ marginTop: 6, color: tk.fgMuted, fontSize: 14, maxWidth: 640, lineHeight: 1.5 }}>
            Comprehensive anatomical, histological, and MRI radiographic characteristics for all four diagnostic classes recognized by the EfficientNet-B0 neural classifier.
          </p>
        </div>

        {/* Quick Action: Back to Scan Workspace */}
        {onSelectForAnalysis && (
          <button
            onClick={onSelectForAnalysis}
            style={{
              padding: '9px 16px',
              borderRadius: 8,
              border: `1.5px solid ${tk.primary}`,
              background: isDark ? 'rgba(0, 212, 255, 0.1)' : 'rgba(0, 102, 204, 0.08)',
              color: tk.primary,
              fontSize: 12,
              fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace",
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.15s',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            ANALYZE NEW SCAN →
          </button>
        )}
      </div>

      {/* ── Search & Filter Bar ── */}
      <div style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Filter by tumor class, histology, or anatomical region..."
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          style={{
            width: '100%',
            padding: '11px 16px',
            borderRadius: 8,
            border: `1.5px solid ${tk.border}`,
            background: tk.surface,
            color: tk.fg,
            fontSize: 13,
            outline: 'none',
            fontFamily: "'DM Sans', sans-serif",
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          }}
        />
      </div>

      {/* ── Expandable Accordion List ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {filteredTumors.map((key) => {
          const item = TUMOR_DATA[key]
          const isExpanded = expandedCard === key

          return (
            <div
              key={item.id}
              style={{
                background: tk.surface,
                border: `1.5px solid ${isExpanded ? item.color : tk.border}`,
                borderLeft: `5px solid ${item.color}`,
                borderRadius: 10,
                overflow: 'hidden',
                transition: 'all 0.2s ease',
                boxShadow: isExpanded
                  ? `0 4px 20px ${item.color}22`
                  : isDark
                  ? '0 2px 10px rgba(0,0,0,0.2)'
                  : '0 2px 8px rgba(0,0,0,0.03)',
              }}
            >
              {/* Card Header Trigger */}
              <div
                onClick={() => setExpandedCard(isExpanded ? null : key)}
                style={{
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  userSelect: 'none',
                  background: isExpanded ? `${item.color}08` : 'transparent',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      background: item.color,
                      boxShadow: `0 0 8px ${item.color}`,
                      flexShrink: 0,
                    }}
                  />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: tk.fg }}>
                        {item.title}
                      </h2>
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 9,
                          fontWeight: 700,
                          color: item.color,
                          background: `${item.color}15`,
                          border: `1px solid ${item.color}44`,
                          padding: '2px 8px',
                          borderRadius: 4,
                          letterSpacing: '0.06em',
                        }}
                      >
                        {item.tag}
                      </span>
                    </div>
                    <p style={{ margin: '2px 0 0', fontSize: 13, color: tk.fgMuted }}>
                      {item.subtitle}
                    </p>
                  </div>
                </div>

                {/* Arrow Icon */}
                <div
                  style={{
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                    color: tk.fgDim,
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>

              {/* Expandable Detail Body */}
              {isExpanded && (
                <div
                  style={{
                    padding: '20px',
                    borderTop: `1px solid ${tk.border}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                  }}
                >
                  {/* Row 1: Origin & Locations */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
                    <div style={{ background: tk.bg, padding: 14, borderRadius: 8, border: `1px solid ${tk.border}` }}>
                      <h3 style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, color: item.color, fontFamily: "'JetBrains Mono', monospace" }}>
                        CELLULAR ORIGIN & PATHOLOGY
                      </h3>
                      <p style={{ margin: 0, fontSize: 13, color: tk.fg, lineHeight: 1.5 }}>
                        {item.origin}
                      </p>
                      <div style={{ marginTop: 8, fontSize: 11, color: tk.fgDim }}>
                        <strong>Incidence: </strong>{item.incidence}
                      </div>
                    </div>

                    <div style={{ background: tk.bg, padding: 14, borderRadius: 8, border: `1px solid ${tk.border}` }}>
                      <h3 style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, color: item.color, fontFamily: "'JetBrains Mono', monospace" }}>
                        TYPICAL ANATOMICAL LOCATIONS
                      </h3>
                      <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: tk.fg, lineHeight: 1.6 }}>
                        {item.typicalLocations.map((loc) => (
                          <li key={loc}>{loc}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Row 2: MRI Signal Profile */}
                  <div style={{ background: tk.bg, padding: 14, borderRadius: 8, border: `1px solid ${tk.border}` }}>
                    <h3 style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: tk.primary, fontFamily: "'JetBrains Mono', monospace" }}>
                      MRI SIGNAL CHARACTERISTICS (AXIAL T1 / T2 / FLAIR)
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                      <div style={{ padding: '8px 10px', background: tk.surface, borderRadius: 6, border: `1px solid ${tk.border}` }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: tk.fgDim, fontFamily: "'JetBrains Mono', monospace" }}>T1-WEIGHTED</div>
                        <div style={{ fontSize: 12, color: tk.fg, marginTop: 3 }}>{item.mriCharacteristics.t1}</div>
                      </div>
                      <div style={{ padding: '8px 10px', background: tk.surface, borderRadius: 6, border: `1px solid ${tk.border}` }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: tk.fgDim, fontFamily: "'JetBrains Mono', monospace" }}>T2 / FLAIR</div>
                        <div style={{ fontSize: 12, color: tk.fg, marginTop: 3 }}>{item.mriCharacteristics.t2flair}</div>
                      </div>
                      <div style={{ padding: '8px 10px', background: tk.surface, borderRadius: 6, border: `1px solid ${tk.border}` }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: tk.fgDim, fontFamily: "'JetBrains Mono', monospace" }}>CONTRAST (GADOLINIUM)</div>
                        <div style={{ fontSize: 12, color: tk.fg, marginTop: 3 }}>{item.mriCharacteristics.contrast}</div>
                      </div>
                    </div>
                  </div>

                  {/* Row 3: Diagnostic Clues & Symptoms */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
                    <div style={{ background: tk.bg, padding: 14, borderRadius: 8, border: `1px solid ${tk.border}` }}>
                      <h3 style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, color: tk.fg, fontFamily: "'JetBrains Mono', monospace" }}>
                        COMMON CLINICAL SYMPTOMS
                      </h3>
                      <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: tk.fgMuted, lineHeight: 1.6 }}>
                        {item.clinicalPresentation.map((sym) => (
                          <li key={sym}>{sym}</li>
                        ))}
                      </ul>
                    </div>

                    <div style={{ background: tk.bg, padding: 14, borderRadius: 8, border: `1px solid ${tk.border}` }}>
                      <h3 style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, color: tk.fg, fontFamily: "'JetBrains Mono', monospace" }}>
                        KEY RADIOGRAPHIC DIFFERENTIATOR
                      </h3>
                      <p style={{ margin: 0, fontSize: 12, color: tk.fgMuted, lineHeight: 1.5 }}>
                        {item.keyDifferentiators}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}