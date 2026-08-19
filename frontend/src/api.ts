export type TumorClass = 'Glioma' | 'Meningioma' | 'NoTumor' | 'Pituitary'

export interface ClassResult {
  label: TumorClass
  confidence: number
  top: boolean
}

export interface GradCAMData {
  overlay_image_base64: string
  heatmap_image_base64?: string
  hotspot_image_base64?: string
  target_layer: string
  peak_attention_percentage: number
  method_description?: string
  anatomical_interpretation?: string
}

export interface PreprocessStages {
  raw: string
  cropped: string
  enhanced: string
  resized: string
}

export interface LimeData {
  marked_image_base64: string
  num_samples: number
  num_features: number
  method_description?: string
}

export interface ShapData {
  attribution_image_base64: string
  method_description?: string
}

export interface AnalysisResult {
  prediction: TumorClass
  confidence: number
  classes: ClassResult[]
  inferenceMs: number
  gradcam?: GradCAMData
  stages?: PreprocessStages
}

export interface HealthStatus {
  status: string
  model_name?: string
  model_loaded?: boolean
  device?: string
  version?: string
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')

export function normalizeTumorClass(className: string): TumorClass {
  const clean = className.toLowerCase().replace(/[\s_-]+/g, '')
  if (clean.includes('glioma')) return 'Glioma'
  if (clean.includes('meningioma')) return 'Meningioma'
  if (clean.includes('pituitary')) return 'Pituitary'
  return 'NoTumor'
}

export async function checkHealth(): Promise<HealthStatus | null> {
  try {
    const res = await fetch(`${API_BASE}/health`)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function predictMriScan(fileOrBlob: File | Blob, fileName = 'scan.png'): Promise<AnalysisResult> {
  const formData = new FormData()
  if (fileOrBlob instanceof File) {
    formData.append('file', fileOrBlob, fileOrBlob.name)
  } else {
    formData.append('file', fileOrBlob, fileName)
  }

  const res = await fetch(`${API_BASE}/predict`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    let errorMsg = `Server returned status ${res.status}`
    try {
      const errJson = await res.json()
      if (errJson.detail) {
        errorMsg = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail)
      }
    } catch {}
    throw new Error(errorMsg)
  }

  const data = await res.json()

  const prediction = normalizeTumorClass(data.predicted_class)
  const confidence = typeof data.confidence === 'number' ? data.confidence : 0

  let rawClasses: { class_name: string; probability: number }[] = []
  if (Array.isArray(data.class_breakdown)) {
    rawClasses = data.class_breakdown.map((item: { class_name: string; probability: number }) => ({
      class_name: item.class_name,
      probability: item.probability,
    }))
  } else if (data.class_probabilities && typeof data.class_probabilities === 'object') {
    rawClasses = Object.entries(data.class_probabilities).map(([name, prob]) => ({
      class_name: name,
      probability: Number(prob),
    }))
  }

  const standardLabels: TumorClass[] = ['Glioma', 'Meningioma', 'NoTumor', 'Pituitary']
  const classMap = new Map<TumorClass, number>()
  rawClasses.forEach((item) => {
    const norm = normalizeTumorClass(item.class_name)
    classMap.set(norm, item.probability)
  })

  const classes: ClassResult[] = standardLabels
    .map((label) => {
      const prob = classMap.get(label) ?? 0
      return {
        label,
        confidence: prob,
        top: label === prediction,
      }
    })
    .sort((a, b) => b.confidence - a.confidence)

  const inferenceMs = data.metadata?.inference_latency_ms
    ? Math.round(data.metadata.inference_latency_ms)
    : 120

  const gradcam: GradCAMData | undefined = data.gradcam
    ? {
        overlay_image_base64: data.gradcam.overlay_image_base64,
        heatmap_image_base64: data.gradcam.heatmap_image_base64,
        hotspot_image_base64: data.gradcam.hotspot_image_base64,
        target_layer: data.gradcam.target_layer || 'model.features[-1][0]',
        peak_attention_percentage: data.gradcam.peak_attention_percentage ?? 95,
        method_description: data.gradcam.method_description,
        anatomical_interpretation: data.gradcam.anatomical_interpretation,
      }
    : undefined

  const stages: PreprocessStages | undefined = data.stages
    ? {
        raw: data.stages.raw || '',
        cropped: data.stages.cropped || '',
        enhanced: data.stages.enhanced || '',
        resized: data.stages.resized || '',
      }
    : undefined

  return {
    prediction,
    confidence,
    classes,
    inferenceMs,
    gradcam,
    stages,
  }
}

export async function fetchGradCAM(fileOrBlob: File | Blob, fileName = 'scan.png'): Promise<GradCAMData> {
  const formData = new FormData()
  if (fileOrBlob instanceof File) {
    formData.append('file', fileOrBlob, fileOrBlob.name)
  } else {
    formData.append('file', fileOrBlob, fileName)
  }

  const res = await fetch(`${API_BASE}/explain/gradcam`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    throw new Error(`Grad-CAM request failed (${res.status})`)
  }

  const data = await res.json()
  return {
    overlay_image_base64: data.gradcam.overlay_image_base64,
    heatmap_image_base64: data.gradcam.heatmap_image_base64,
    hotspot_image_base64: data.gradcam.hotspot_image_base64,
    target_layer: data.gradcam.target_layer,
    peak_attention_percentage: data.gradcam.peak_attention_percentage,
    method_description: data.gradcam.method_description,
    anatomical_interpretation: data.gradcam.anatomical_interpretation,
  }
}

export async function fetchLime(fileOrBlob: File | Blob, numSamples = 100, fileName = 'scan.png'): Promise<LimeData> {
  const formData = new FormData()
  if (fileOrBlob instanceof File) {
    formData.append('file', fileOrBlob, fileOrBlob.name)
  } else {
    formData.append('file', fileOrBlob, fileName)
  }
  formData.append('num_samples', String(numSamples))

  const res = await fetch(`${API_BASE}/explain/lime`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    throw new Error(`LIME request failed (${res.status})`)
  }

  const data = await res.json()
  return {
    marked_image_base64: data.lime.marked_image_base64,
    num_samples: data.lime.num_samples,
    num_features: data.lime.num_features,
    method_description: data.lime.method_description,
  }
}

export async function fetchShap(fileOrBlob: File | Blob, fileName = 'scan.png'): Promise<ShapData> {
  const formData = new FormData()
  if (fileOrBlob instanceof File) {
    formData.append('file', fileOrBlob, fileOrBlob.name)
  } else {
    formData.append('file', fileOrBlob, fileName)
  }

  const res = await fetch(`${API_BASE}/explain/shap`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    throw new Error(`SHAP request failed (${res.status})`)
  }

  const data = await res.json()
  return {
    attribution_image_base64: data.shap.attribution_image_base64,
    method_description: data.shap.method_description,
  }
}

export async function fetchPreprocessPreview(fileOrBlob: File | Blob, fileName = 'scan.png'): Promise<PreprocessStages> {
  const formData = new FormData()
  if (fileOrBlob instanceof File) {
    formData.append('file', fileOrBlob, fileOrBlob.name)
  } else {
    formData.append('file', fileOrBlob, fileName)
  }

  const res = await fetch(`${API_BASE}/preprocess-preview`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    throw new Error(`Preprocessing preview failed (${res.status})`)
  }

  const data = await res.json()
  return {
    raw: data.raw_image_base64,
    cropped: data.roi_cropped_base64,
    enhanced: data.clahe_enhanced_base64,
    resized: data.final_input_base64,
  }
}
