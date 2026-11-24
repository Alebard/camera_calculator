export type Camera = {
  brand: string
  model: string
  price: number | null
  currency: string
  supplier_code?: string
  supplier_url?: string | null
  specs: Record<string, number | boolean | string | null>
  channels?: CameraChannel[]
  data_status?: string
}

export type CameraChannel = {
  channel: string
  resolution_width_px: number | null
  resolution_height_px: number | null
  sensor_format: string | null
  focal_length_min_mm: number | null
  focal_length_max_mm: number | null
  source?: string | null
  note?: string | null
}

export type CameraMatch = {
  camera: Camera
  channel: string | null
  resolutionWidthPx: number
  resolutionHeightPx: number | null
  resolutionMp: number | null
  focal: number
  width: number
  ppm: number
  hAngle: number
  vAngle: number | null
  minFocal: number
  maxFocal: number
  sensorWidth: number
  sensorFormat: string | null
  conditional: boolean
  notes: string[]
}

export type ScenarioProfile = {
  id: string
  title: string
  ppm: number
  icon: string
  detail: string
}

export type ResolutionChoice = { width: number; height: number; mp: number }
export type FocalRange = { min: number; max: number }
export type MissingDataCounts = {
  horizontalResolution: number
  supportedSensorFormat: number
  focalRange: number
}
