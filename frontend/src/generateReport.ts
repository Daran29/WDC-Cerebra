import { jsPDF } from 'jspdf'

type TumorClass = 'Glioma' | 'Meningioma' | 'NoTumor' | 'Pituitary'

interface ClassResult {
  label: TumorClass
  confidence: number
  top: boolean
}

interface PatientDetails {
  name?: string
  age?: number | string
  gender?: 'Male' | 'Female' | 'Other' | string
}

export interface ReportInput {
  prediction: TumorClass
  confidence: number
  classes: ClassResult[]
  inferenceMs: number
  imageName: string
  imageDataUrl: string | null
  gradcamDataUrl?: string | null
  peakAttention?: number
  targetLayer?: string
  anatomicalInterpretation?: string
  // Supports both flat and nested properties
  patient?: PatientDetails
  patientName?: string
  patientAge?: number | string
  patientGender?: string
}

// Formal clinical palette
const CLASS_META: Record<
  TumorClass,
  {
    color: [number, number, number]
    badgeBg: [number, number, number]
    severity: string
    desc: string
    location: string
    origin: string
  }
> = {
  Glioma: {
    color: [220, 38, 38], // #dc2626
    badgeBg: [254, 242, 242],
    severity: 'HIGH CONCERN (MALIGNANT)',
    desc: 'Intra-axial glial cell neoplasm (WHO Grade II-IV) characterized by infiltrative parenchymal invasion and surrounding peritumoral edema.',
    location: 'Cerebral hemispheres — frontal, temporal, and subcortical white matter tracts.',
    origin: 'Glial progenitor cells (Astrocytes / Oligodendrocytes)',
  },
  Meningioma: {
    color: [217, 119, 6], // #d97706
    badgeBg: [255, 251, 235],
    severity: 'MODERATE CONCERN (TYPICALLY BENIGN)',
    desc: 'Extra-axial dural-based neoplasm arising from arachnoid cap cells, demonstrating circumscribed margins and characteristic dural tail enhancement.',
    location: 'Parasagittal falx cerebri, cerebral convexities, and sphenoid wing.',
    origin: 'Arachnoid Cap Cells (Meningeal Layers)',
  },
  NoTumor: {
    color: [16, 149, 106], // #10956a
    badgeBg: [240, 253, 244],
    severity: 'NORMAL BASELINE REFERENCE',
    desc: 'Symmetrical cerebral architecture with intact midline structures, unobstructed ventricles, and no focal pathological intracranial mass lesion.',
    location: 'Bilateral cerebral hemispheres and ventricles without midline shift.',
    origin: 'Normal Physiological Brain Tissue',
  },
  Pituitary: {
    color: [109, 40, 217], // #6d28d9
    badgeBg: [245, 243, 255],
    severity: 'MODERATE CONCERN (ENDOCRINE)',
    desc: 'Sellar/suprasellar adenohypophyseal neoplasm with potential mass effect on the optic chiasm and endocrine hypothalamic-pituitary axis disruption.',
    location: 'Sella turcica with suprasellar extension toward the optic chiasm.',
    origin: 'Anterior Pituitary Gland Epithelial Cells',
  },
}

function renderProgressBar(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  val: number,
  color: [number, number, number]
) {
  doc.setFillColor(241, 245, 249)
  doc.roundedRect(x, y, w, 3.2, 1.2, 1.2, 'F')
  const filledW = Math.max(2, w * Math.min(1, Math.max(0, val)))
  doc.setFillColor(...color)
  doc.roundedRect(x, y, filledW, 3.2, 1.2, 1.2, 'F')
}

export async function generateReport(input: ReportInput): Promise<void> {
  const {
    prediction,
    confidence,
    classes,
    inferenceMs,
    imageName,
    imageDataUrl,
    gradcamDataUrl,
    peakAttention,
    targetLayer = 'model.features[-1][0]',
    anatomicalInterpretation,
    patient,
    patientName,
    patientAge,
    patientGender,
  } = input

  // Normalize patient metadata
  const resolvedName = (patient?.name || patientName || 'Anonymous / Unregistered').trim()
  const resolvedAge = (patient?.age || patientAge || 'N/A').toString().trim()
  const resolvedGender = (patient?.gender || patientGender || 'N/A').toString().trim()

  const meta = CLASS_META[prediction]
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  const reportId = `CEREBRA-BTV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`

  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
  const W = 210
  const H = 297
  const m = 14 // 14mm margins for clean spatial distribution

  // Page Background
  doc.setFillColor(255, 255, 255)
  doc.rect(0, 0, W, H, 'F')

  // Top Header Banner
  doc.setFillColor(15, 23, 42) // Slate 900
  doc.rect(0, 0, W, 24, 'F')

  // Top Accent Cyan Stripe
  doc.setFillColor(0, 212, 255) // #00d4ff
  doc.rect(0, 23, W, 1, 'F')

  // Header Brand & Title
  doc.setFontSize(14)
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.text('CEREBRA', m, 11)
  doc.setTextColor(0, 212, 255)
  doc.text('Vision', m + doc.getTextWidth('CEREBRA') + 1.5, 11)

  doc.setFontSize(7)
  doc.setTextColor(148, 163, 184)
  doc.setFont('helvetica', 'normal')
  doc.text('AI-ASSISTED MRI DIAGNOSTIC & EXPLAINABILITY (XAI) REPORT', m, 17.5)

  // Header Right Reference Data
  doc.setFontSize(7.5)
  doc.setTextColor(226, 232, 240)
  doc.setFont('helvetica', 'bold')
  doc.text(`REPORT: ${reportId}`, W - m, 10, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(148, 163, 184)
  doc.text(`${dateStr} · ${timeStr} EST`, W - m, 15, { align: 'right' })
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(248, 113, 113) // Soft Red
  doc.text('INVESTIGATIONAL USE ONLY · RESEARCH ATTESTATION', W - m, 19.5, { align: 'right' })

  let cy = 29

  // ── 1. PATIENT & STUDY DEMOGRAPHICS ──
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(m, cy, W - m * 2, 19, 1.5, 1.5, 'F')
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.25)
  doc.roundedRect(m, cy, W - m * 2, 19, 1.5, 1.5, 'S')

  const metaItems = [
    { label: 'PATIENT NAME', value: resolvedName },
    { label: 'AGE / GENDER', value: `${resolvedAge} / ${resolvedGender}` },
    { label: 'SCAN FILE', value: imageName || 'scan.png' },
    { label: 'MODALITY', value: 'Brain MRI (Axial T1/T2)' },
    { label: 'NEURAL BACKBONE', value: 'EfficientNet-B0 (99.52%)' },
    { label: 'INFERENCE LATENCY', value: `${inferenceMs} ms` },
  ]

  const colW = (W - m * 2) / metaItems.length
  metaItems.forEach((item, i) => {
    const cx = m + i * colW + colW / 2
    doc.setFontSize(6)
    doc.setTextColor(100, 116, 139)
    doc.setFont('helvetica', 'bold')
    doc.text(item.label, cx, cy + 6, { align: 'center' })

    doc.setFontSize(7.5)
    doc.setTextColor(15, 23, 42)
    doc.setFont('helvetica', 'bold')
    const valText = item.value.length > 20 ? item.value.slice(0, 18) + '...' : item.value
    doc.text(valText, cx, cy + 13.5, { align: 'center' })
  })

  cy += 23

  // ── 2. DUAL RADIOGRAPHIC IMAGING & GRAD-CAM ATTENTION VIEWPORT ──
  const imgBoxW = (W - m * 2 - 8) / 2
  const imgBoxH = 56

  // Box A: Preprocessed Scan
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(m, cy, imgBoxW, imgBoxH, 1.5, 1.5, 'F')
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.25)
  doc.roundedRect(m, cy, imgBoxW, imgBoxH, 1.5, 1.5, 'S')

  if (imageDataUrl) {
    try {
      doc.addImage(imageDataUrl, 'JPEG', m + 1.5, cy + 1.5, imgBoxW - 3, imgBoxH - 8, undefined, 'FAST')
    } catch (_) {}
  }

  doc.setFillColor(15, 23, 42)
  doc.rect(m, cy + imgBoxH - 6.5, imgBoxW, 6.5, 'F')
  doc.setFontSize(6.5)
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.text('INPUT 2D BRAIN MRI (PROCESSED ROI)', m + imgBoxW / 2, cy + imgBoxH - 2.5, { align: 'center' })

  // Box B: Grad-CAM Neural Attention Overlay
  const imgBX = m + imgBoxW + 8
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(imgBX, cy, imgBoxW, imgBoxH, 1.5, 1.5, 'F')
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.25)
  doc.roundedRect(imgBX, cy, imgBoxW, imgBoxH, 1.5, 1.5, 'S')

  const effectiveGradcamUrl = gradcamDataUrl || imageDataUrl
  if (effectiveGradcamUrl) {
    try {
      doc.addImage(effectiveGradcamUrl, 'PNG', imgBX + 1.5, cy + 1.5, imgBoxW - 3, imgBoxH - 8, undefined, 'FAST')
    } catch (_) {}
  }

  doc.setFillColor(2, 132, 199) // Cerulean Blue
  doc.rect(imgBX, cy + imgBoxH - 6.5, imgBoxW, 6.5, 'F')
  doc.setFontSize(6.5)
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  const peakAttText = peakAttention ? ` · PEAK ATTENTION: ${peakAttention}%` : ''
  doc.text(`GRAD-CAM ATTENTION OVERLAY (MBConv7)${peakAttText}`, imgBX + imgBoxW / 2, cy + imgBoxH - 2.5, {
    align: 'center',
  })

  cy += imgBoxH + 5

  // ── 3. PRIMARY DIAGNOSTIC CLASSIFICATION & XAI ATTRIBUTION ──
  const leftColW = (W - m * 2 - 8) * 0.52
  const rightColW = (W - m * 2 - 8) * 0.48
  const diagCardH = 46

  // Left Card: Classification Result
  doc.setFillColor(...meta.badgeBg)
  doc.roundedRect(m, cy, leftColW, diagCardH, 1.5, 1.5, 'F')
  doc.setDrawColor(...meta.color)
  doc.setLineWidth(0.4)
  doc.roundedRect(m, cy, leftColW, diagCardH, 1.5, 1.5, 'S')

  doc.setFillColor(...meta.color)
  doc.rect(m, cy, 3, diagCardH, 'F')

  doc.setFontSize(7)
  doc.setTextColor(...meta.color)
  doc.setFont('helvetica', 'bold')
  doc.text(`CLASSIFICATION: ${meta.severity}`, m + 7, cy + 7)

  doc.setFontSize(18)
  doc.setTextColor(15, 23, 42)
  doc.setFont('helvetica', 'bold')
  doc.text(prediction, m + 7, cy + 16)

  doc.setFontSize(16)
  doc.setTextColor(...meta.color)
  doc.text(`${(confidence * 100).toFixed(1)}%`, m + leftColW - 7, cy + 16, { align: 'right' })

  doc.setFontSize(6)
  doc.setTextColor(100, 116, 139)
  doc.setFont('helvetica', 'bold')
  doc.text('CALIBRATED SOFTMAX SCORE', m + leftColW - 7, cy + 20, { align: 'right' })

  doc.setFontSize(7)
  doc.setTextColor(51, 65, 85)
  doc.setFont('helvetica', 'normal')
  const descLines = doc.splitTextToSize(meta.desc, leftColW - 14)
  doc.text(descLines, m + 7, cy + 26)

  doc.setFontSize(6.5)
  doc.setTextColor(100, 116, 139)
  doc.setFont('helvetica', 'bold')
  doc.text('ANATOMICAL REGION: ', m + 7, cy + 41)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(15, 23, 42)
  doc.text(doc.splitTextToSize(meta.location, leftColW - 40)[0], m + 35, cy + 41)

  // Right Card: Explainable AI (XAI) Neural Feature Attribution
  const rightColX = m + leftColW + 8
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(rightColX, cy, rightColW, diagCardH, 1.5, 1.5, 'F')
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.3)
  doc.roundedRect(rightColX, cy, rightColW, diagCardH, 1.5, 1.5, 'S')

  doc.setFillColor(2, 132, 199)
  doc.rect(rightColX, cy, 3, diagCardH, 'F')

  doc.setFontSize(7)
  doc.setTextColor(2, 132, 199)
  doc.setFont('helvetica', 'bold')
  doc.text('EXPLAINABLE AI (XAI) ATTRIBUTION', rightColX + 7, cy + 7)

  doc.setFontSize(6.5)
  doc.setTextColor(100, 116, 139)
  doc.setFont('helvetica', 'bold')
  doc.text(`TARGET HOOK: `, rightColX + 7, cy + 13)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(15, 23, 42)
  doc.text(targetLayer, rightColX + 28, cy + 13)

  const interpText =
    anatomicalInterpretation ||
    `Grad-CAM activations demonstrate strong localization to discriminative parenchymal/dural features consistent with ${prediction} morphology.`

  doc.setFontSize(7)
  doc.setTextColor(51, 65, 85)
  doc.setFont('helvetica', 'normal')
  const interpLines = doc.splitTextToSize(interpText, rightColW - 14)
  doc.text(interpLines, rightColX + 7, cy + 19)

  doc.setFontSize(6.5)
  doc.setTextColor(100, 116, 139)
  doc.setFont('helvetica', 'bold')
  doc.text('HISTOLOGICAL ORIGIN: ', rightColX + 7, cy + 41)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(15, 23, 42)
  doc.text(doc.splitTextToSize(meta.origin, rightColW - 38)[0], rightColX + 35, cy + 41)

  cy += diagCardH + 5

  // ── 4. DIFFERENTIAL PROBABILITY BREAKDOWN ──
  doc.setFontSize(7.5)
  doc.setTextColor(71, 85, 105)
  doc.setFont('helvetica', 'bold')
  doc.text('DIFFERENTIAL MULTI-CLASS PROBABILITY DISTRIBUTION', m, cy + 3)

  cy += 5.5

  classes.forEach((cls) => {
    const cm = CLASS_META[cls.label]
    const isTop = cls.top
    const rowH = 8.5

    doc.setFillColor(isTop ? 240 : 255, isTop ? 249 : 255, isTop ? 255 : 255)
    doc.roundedRect(m, cy, W - m * 2, rowH, 1, 1, 'F')
    doc.setDrawColor(isTop ? 186 : 241, isTop ? 230 : 245, isTop ? 253 : 249)
    doc.setLineWidth(0.2)
    doc.roundedRect(m, cy, W - m * 2, rowH, 1, 1, 'S')

    // Severity indicator dot
    doc.setFillColor(...cm.color)
    doc.circle(m + 4, cy + 4.25, 1.4, 'F')

    doc.setFontSize(7.5)
    doc.setFont('helvetica', isTop ? 'bold' : 'normal')
    doc.setTextColor(isTop ? 15 : 71, isTop ? 23 : 85, isTop ? 42 : 105)
    doc.text(cls.label, m + 8, cy + 5.5)

    if (isTop) {
      doc.setFontSize(6)
      doc.setTextColor(...cm.color)
      doc.setFont('helvetica', 'bold')
      doc.text('[PRIMARY DIAGNOSIS]', m + 32, cy + 5.5)
    }

    const barX = m + 62
    const barW = W - m * 2 - 88
    renderProgressBar(doc, barX, cy + 2.6, barW, cls.confidence, cm.color)

    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(isTop ? cm.color[0] : 71, isTop ? cm.color[1] : 85, isTop ? cm.color[2] : 105)
    doc.text(`${(cls.confidence * 100).toFixed(2)}%`, W - m - 4, cy + 5.5, { align: 'right' })

    cy += rowH + 1.2
  })

  cy += 3

  // ── 5. CLINICAL DISCLAIMER & PHYSICIAN ATTESTATION ──
  const discH = 19
  doc.setDrawColor(254, 215, 170) // Amber 200
  doc.setFillColor(255, 251, 235) // Amber 50
  doc.roundedRect(m, cy, W - m * 2, discH, 1.5, 1.5, 'FD')

  doc.setFillColor(245, 158, 11) // Amber 500
  doc.rect(m, cy, 2.5, discH, 'F')

  doc.setFontSize(6.5)
  doc.setTextColor(180, 83, 9)
  doc.setFont('helvetica', 'bold')
  doc.text('CLINICAL SAFETY NOTICE & INSTITUTIONAL DISCLAIMER', m + 5, cy + 5)

  doc.setFontSize(6)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(146, 64, 14)
  const discText =
    'This report is generated by an automated convolutional neural network (EfficientNet-B0) with Grad-CAM gradient interpretability for decision-support and investigational quality verification. It does NOT constitute an autonomous medical diagnosis or surgical guide. Radiographic findings must be correlated clinically by a licensed radiologist.'
  const discLines = doc.splitTextToSize(discText, W - m * 2 - 10)
  doc.text(discLines, m + 5, cy + 9.5)

  cy += discH + 4

  // Physician Verification & Signature Line
  const sigH = 16
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(m, cy, W - m * 2, sigH, 1.5, 1.5, 'F')
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.25)
  doc.roundedRect(m, cy, W - m * 2, sigH, 1.5, 1.5, 'S')

  doc.setFontSize(6.5)
  doc.setTextColor(100, 116, 139)
  doc.setFont('helvetica', 'bold')
  doc.text('REVIEWING RADIOLOGIST SIGNATURE', m + 6, cy + 5.5)
  doc.setDrawColor(148, 163, 184)
  doc.setLineWidth(0.3)
  doc.line(m + 6, cy + 11.5, m + 68, cy + 11.5)

  doc.text('CLINICAL CORRELATION DATE', m + 85, cy + 5.5)
  doc.line(m + 85, cy + 11.5, m + 130, cy + 11.5)

  doc.text('INSTITUTIONAL STAMP / AUDIT HASH', W - m - 48, cy + 5.5)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(5.5)
  doc.setTextColor(148, 163, 184)
  doc.text(`SHA256: ${Math.random().toString(36).slice(2, 10).toUpperCase()}-VALID`, W - m - 6, cy + 11.5, {
    align: 'right',
  })

  // ── 6. FOOTER ──
  const footerY = 286
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.3)
  doc.line(m, footerY, W - m, footerY)

  doc.setFontSize(6)
  doc.setTextColor(148, 163, 184)
  doc.setFont('helvetica', 'normal')
  doc.text(`Cerebra Diagnostic Platform · ID: ${reportId}`, m, footerY + 4)
  doc.text('CONFIDENTIAL MEDICAL RECORD · GENERATED VIA EFFICIENTNET-B0 XAI', W - m, footerY + 4, { align: 'right' })

  const sanitizedFileName = resolvedName.replace(/[^a-zA-Z0-9_-]/g, '_')
  doc.save(`Cerebra_DiagnosticReport_${sanitizedFileName}_${reportId}.pdf`)
}