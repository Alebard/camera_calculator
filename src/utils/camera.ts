import type { Camera } from '../types/camera'

// Reference widths for common optical formats. They are estimates, not model specifications.
export const estimatedSensorWidths: Record<string, number> = {
  '1/4"': 3.2,
  '1/3.2"': 4.5,
  '1/3"': 4.8,
  '1/2.9"': 5.0,
  '1/2.8"': 5.6,
  '1/2.7"': 5.37,
  '1/2.5"': 5.76,
  '1/1.8"': 7.2,
}

export const sensorWidthFor = (camera: Camera) =>
  (camera.specs.sensor_width_mm as number | null) ??
  estimatedSensorWidths[String(camera.specs.sensor_format ?? '')]

export function inferFormFactor(camera: Camera): string | null {
  const name = `${camera.model} ${camera.specs.sensor_type ?? ''}`.toLowerCase()
  if (camera.specs.ptz === true || /поворотн|\bptz\b|speed dome/.test(name))
    return 'Поворотная (PTZ)'
  if (/турель|turret|\bipc-t\w*|dh-ipc-hdw|ds-2cd23\d/.test(name)) return 'Турельная'
  if (/куполь|куполообраз|\bdome\b|dh-ipc-hdbw|dh-ipc-hdpw|ds-2cd21\d|ds-2cd27\d/.test(name))
    return 'Купольная'
  if (/цилиндр|\bbullet\b|ds-2cd20\d|ds-2cd2t\d|dh-ipc-hfw/.test(name)) return 'Цилиндрическая'
  if (/корпусн|\bbox\b|ds-2cd2h/.test(name)) return 'Корпусная'
  if (/миниатюр|miniature|\bmini\b/.test(name)) return 'Миниатюрная'
  return null
}

export const formatNumber = (value: number, digits = 1) =>
  new Intl.NumberFormat('ru-RU', { maximumFractionDigits: digits }).format(value)

export const formatPrice = (value: number | null) =>
  value == null ? 'Цена не указана' : `${new Intl.NumberFormat('ru-RU').format(value)} ₽`

export function megapixelLabel(camera: Camera): string | null {
  const declaredMp = camera.specs.resolution_mp
  if (typeof declaredMp === 'number') return `${formatNumber(declaredMp, 0)} Мп`

  const width = camera.specs.resolution_width_px
  const height = camera.specs.resolution_height_px
  if (typeof width !== 'number' || typeof height !== 'number') return null
  return `≈ ${formatNumber(Math.round((width * height) / 1_000_000), 0)} Мп`
}
