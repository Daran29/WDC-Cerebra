import { useState } from 'react'

interface DocumentationProps {
  isDark: boolean
  onBackToAnalysis?: () => void
}

type SectionKey = 'pipeline' | 'dataset' | 'safety' | 'architecture'

export default function Documentation({ isDark, onBackToAnalysis }: DocumentationProps) {
  const [activeSection, setActiveSection] = useState<SectionKey>('pipeline')

  const tk = {
    bg: isDark ? '#080c14' : '#f1f5fb',
    surface: isDark ? '#0d131f' : '#ffffff',
    border: isDark ? '#26374d' : '#c5d4e8',
    fg: isDark ? '#f1f5f9' : '#09101d',
    fgMuted: isDark ? '#94a3b8' : '#334155',
    fgDim: isDark ? '#475569' : '#64748b',
    primary: isDark ? '#00d4ff' : '#0066cc',
    accent: isDark ? 'rgba(0, 212, 255, 0.1)' : 'rgba(0, 102, 204, 0.08)',
  }

  const sections: { id: SectionKey; label: string; icon: string }[] = [
    { id: 'pipeline', label: '1. Preprocessing Pipeline', icon: '⚙️' },
    { id: 'dataset', label: '2. Dataset & Integrity Audit', icon: '📊' },
    { id: 'safety', label: '3. Clinical Safety & Legal Disclaimers', icon: '🛡️' },
    { id: 'architecture', label: '4. System & Model Specifications', icon: '🧠' },
  ]

  return (
    <div style={{ padding: '24px 20px', maxWidth: 1200, margin: '0 auto', fontFamily: "'DM Sans', sans-serif", color: tk.fg }}>
      
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{ height: 2, width: 24, background: tk.primary }} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, color: tk.primary, letterSpacing: '0.14em' }}>
              TECHNICAL DOCUMENTATION & METHODOLOGY
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: 'clamp(24px, 3.5vw, 32px)', fontWeight: 800, letterSpacing: '-0.02em' }}>
            System Architecture & Pipeline Reference
          </h1>
          <p style={{ marginTop: 6, color: tk.fgMuted, fontSize: 14, maxWidth: 680, lineHeight: 1.5 }}>
            Detailed overview of deterministic image preprocessing, convolutional model parameters, dataset distribution, and investigational regulatory constraints.
          </p>
        </div>

        {onBackToAnalysis && (
          <button
            onClick={onBackToAnalysis}
            style={{
              padding: '9px 16px',
              borderRadius: 8,
              border: `1.5px solid ${tk.primary}`,
              background: tk.accent,
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
            ← BACK TO SCAN ANALYZER
          </button>
        )}
      </div>

      {/* ── Section Switcher Tabs ── */}
      <div style={{ display: 'flex', gap: 8, borderBottom: `1.5px solid ${tk.border}`, paddingBottom: 12, marginBottom: 24, overflowX: 'auto' }}>
        {sections.map((sec) => {
          const isActive = activeSection === sec.id
          return (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id)}
              style={{
                background: isActive ? tk.accent : 'transparent',
                border: `1.5px solid ${isActive ? tk.primary : 'transparent'}`,
                color: isActive ? tk.primary : tk.fgMuted,
                padding: '8px 16px',
                borderRadius: 6,
                fontWeight: isActive ? 700 : 500,
                fontSize: 12,
                fontFamily: "'JetBrains Mono', monospace",
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s',
              }}
            >
              {sec.label}
            </button>
          )
        })}
      </div>

      {/* ── SECTION 1: Preprocessing Pipeline ── */}
      {activeSection === 'pipeline' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ background: tk.surface, border: `1.5px solid ${tk.border}`, borderRadius: 12, padding: 22 }}>
            <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800, color: tk.primary }}>
              Deterministic Image Preprocessing Contract
            </h2>
            <p style={{ margin: 0, fontSize: 13, color: tk.fgMuted, lineHeight: 1.6 }}>
              Every input scan passes through an immutable 6-stage mathematical and computer vision transformation sequence before model tensor ingestion. This standardizes variance across scanners, acquisition protocols, and dimensions.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginTop: 18 }}>
              {[
                {
                  step: '01',
                  title: 'Integrity & Matrix Validation',
                  fn: 'validate_image()',
                  desc: 'Ensures file integrity, non-zero byte size, valid raster headers (PNG, JPG, TIFF), minimum 64×64 pixel resolution, and aspect ratio ≤ 3.0.',
                },
                {
                  step: '02',
                  title: 'Contour-Based Brain ROI Crop',
                  fn: 'crop_brain_roi()',
                  desc: 'Applies Otsu thresholding and morphological closing to locate extreme cranial contours, removing background black pixels with a 1.05× safety margin.',
                },
                {
                  step: '03',
                  title: 'Median Non-Linear Denoising',
                  fn: 'denoise_image()',
                  desc: 'Utilizes a 3×3 median filter kernel to suppress salt-and-pepper RF thermal noise while strictly preserving biological tissue boundaries and edges.',
                },
                {
                  step: '04',
                  title: 'Luminance-Channel CLAHE',
                  fn: 'apply_clahe()',
                  desc: 'Converts RGB to LAB color space and executes Contrast Limited Adaptive Histogram Equalization (clip limit: 2.0, grid: 8×8) solely on the L-channel.',
                },
                {
                  step: '05',
                  title: 'Bicubic Dimension Resampling',
                  fn: 'resize_image()',
                  desc: 'Resamples the cropped and contrast-enhanced region to a standard 224 × 224 pixel input tensor using high-fidelity bicubic interpolation.',
                },
                {
                  step: '06',
                  title: 'ImageNet Tensor Normalization',
                  fn: 'prepare_model_input()',
                  desc: 'Converts pixel values to float tensors in [0, 1] and normalizes per channel: Mean [0.485, 0.456, 0.406] and Std [0.229, 0.224, 0.225].',
                },
              ].map((s) => (
                <div key={s.step} style={{ background: tk.bg, border: `1.5px solid ${tk.border}`, borderRadius: 8, padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 800, color: tk.primary }}>
                      STEP {s.step}
                    </span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: tk.fgDim, background: tk.surface, padding: '2px 6px', borderRadius: 4, border: `1px solid ${tk.border}` }}>
                      {s.fn}
                    </span>
                  </div>
                  <h3 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: tk.fg }}>
                    {s.title}
                  </h3>
                  <p style={{ margin: 0, fontSize: 12, color: tk.fgMuted, lineHeight: 1.5 }}>
                    {s.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── SECTION 2: Dataset & Leakage Audit ── */}
      {activeSection === 'dataset' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ background: tk.surface, border: `1.5px solid ${tk.border}`, borderRadius: 12, padding: 22 }}>
            <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800, color: tk.primary }}>
              Dataset Distribution & Integrity Notes
            </h2>
            <p style={{ margin: 0, fontSize: 13, color: tk.fgMuted, lineHeight: 1.6 }}>
              Trained on the KaggleHub Brain Tumor MRI benchmark dataset (`masoudnickparvar/brain-tumor-mri-dataset`) containing 7,200 curated 2D axial MRI scans.
            </p>

            {/* Distribution Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 18 }}>
              {[
                { label: 'Glioma', train: '1,400 images', test: '400 images', total: '1,800 images', color: '#ff2a55' },
                { label: 'Meningioma', train: '1,400 images', test: '400 images', total: '1,800 images', color: '#f08c00' },
                { label: 'Pituitary', train: '1,400 images', test: '400 images', total: '1,800 images', color: '#8b5cf6' },
                { label: 'No Tumor', train: '1,400 images', test: '400 images', total: '1,800 images', color: '#10b981' },
              ].map((d) => (
                <div key={d.label} style={{ background: tk.bg, border: `1.5px solid ${tk.border}`, borderLeft: `4px solid ${d.color}`, borderRadius: 8, padding: 14 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: tk.fg, marginBottom: 6 }}>{d.label}</div>
                  <div style={{ fontSize: 11, color: tk.fgMuted, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Training Set:</span>
                    <strong style={{ color: tk.fg }}>{d.train}</strong>
                  </div>
                  <div style={{ fontSize: 11, color: tk.fgMuted, display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                    <span>Testing Set:</span>
                    <strong style={{ color: tk.fg }}>{d.test}</strong>
                  </div>
                  <div style={{ fontSize: 11, color: tk.primary, display: 'flex', justifyContent: 'space-between', marginTop: 6, borderTop: `1px solid ${tk.border}`, paddingTop: 6 }}>
                    <span>Total Class Volume:</span>
                    <strong>{d.total}</strong>
                  </div>
                </div>
              ))}
            </div>

            {/* Leakage Audit Disclosure */}
            <div style={{ marginTop: 20, padding: 16, background: isDark ? 'rgba(240, 140, 0, 0.08)' : '#fffbeb', border: '1.5px solid #f08c0055', borderRadius: 8 }}>
              <h3 style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: '#d97706', display: 'flex', alignItems: 'center', gap: 6 }}>
                ⚠ Dataset Integrity & Data Leakage Disclosure
              </h3>
              <p style={{ margin: 0, fontSize: 12, color: tk.fgMuted, lineHeight: 1.6 }}>
                A SHA-256 cryptographic image audit (`data_leakage_audit.json`) detected four duplicate/near-identical cross-split pairs between the public training and testing partitions for Meningioma. Consequently, evaluation benchmarks should be viewed as provisional decision-support indicators rather than absolute clinical measures.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── SECTION 3: Clinical Safety Disclaimers ── */}
      {activeSection === 'safety' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ background: tk.surface, border: `1.5px solid ${tk.border}`, borderRadius: 12, padding: 22 }}>
            <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800, color: '#dc2626' }}>
              Clinical Safety, Intended Use & Regulatory Boundaries
            </h2>
            <p style={{ margin: 0, fontSize: 13, color: tk.fgMuted, lineHeight: 1.6 }}>
              This platform is an investigational decision-support research prototype. It does NOT possess FDA 510(k), CE mark, or regulatory clearance as a medical device for autonomous diagnosis.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginTop: 18 }}>
              {[
                {
                  title: 'No Autonomous Diagnostic Authority',
                  text: 'Classification outputs, confidence metrics, and 3D tumor mapping must never replace the independent evaluation of a licensed radiologist or neuro-oncologist.',
                },
                {
                  title: 'Single 2D Slice Limitation',
                  text: 'The model analyzes isolated 2D exported raster images without whole-head volumetric context, coronal/sagittal cross-registration, or multi-sequence FLAIR/T2 correlation.',
                },
                {
                  title: 'Four-Class Closed Boundary',
                  text: 'Labels are strictly bounded to Glioma, Meningioma, Pituitary, and Normal. The model cannot identify metastases, abscesses, vascular malformations, or rare pathologies.',
                },
                {
                  title: 'Softmax Confidence Caveat',
                  text: 'Probability scores represent relative mathematical distribution across the four trained categories and do not equate to a biological probability of disease.',
                },
              ].map((card) => (
                <div key={card.title} style={{ padding: 14, background: tk.bg, border: `1.5px solid ${tk.border}`, borderRadius: 8 }}>
                  <h3 style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: tk.fg }}>
                    {card.title}
                  </h3>
                  <p style={{ margin: 0, fontSize: 12, color: tk.fgMuted, lineHeight: 1.5 }}>
                    {card.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── SECTION 4: Architecture & Specs ── */}
      {activeSection === 'architecture' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ background: tk.surface, border: `1.5px solid ${tk.border}`, borderRadius: 12, padding: 22 }}>
            <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800, color: tk.primary }}>
              System & Model Specifications
            </h2>
            <p style={{ margin: 0, fontSize: 13, color: tk.fgMuted, lineHeight: 1.6 }}>
              Technical architecture summary for the current client, serving layer, and computer vision neural backbone.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginTop: 18 }}>
              {[
                { label: 'ACTIVE BACKBONE', val: 'EfficientNet-B0 (99.52% Val Acc)' },
                { label: 'INPUT TENSOR SHAPE', val: '[1, 3, 224, 224] (RGB)' },
                { label: 'INFERENCE LATENCY', val: '~15 – 45 ms (Optimized)' },
                { label: 'BACKEND RUNTIME', val: 'FastAPI + PyTorch TorchScript' },
                { label: 'FRONTEND STACK', val: 'React 19, Three.js 0.185, Vite' },
                { label: 'XAI TRIPLE SUITE', val: 'Grad-CAM, LIME, SHAP' },
              ].map((spec) => (
                <div key={spec.label} style={{ background: tk.bg, padding: 14, borderRadius: 8, border: `1px solid ${tk.border}` }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: tk.fgDim, fontFamily: "'JetBrains Mono', monospace" }}>
                    {spec.label}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: tk.primary, marginTop: 4 }}>
                    {spec.val}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}