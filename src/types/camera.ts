export type Camera = {
  brand: string
  model: string
  price: number | null
  currency: string
  supplier_url?: string
  specs: Record<string, number | boolean | string | null>
  data_status?: string
}

export type CameraMatch = {
  camera: Camera
  focal: number
  width: number
  ppm: number
  hAngle: number
  vAngle: number | null
  minFocal: number
  maxFocal: number
  sensorWidth: number
  sensorFormat: string | null
  estimatedSensor: boolean
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
  usableSensorWidth: number
  focalRange: number
}
