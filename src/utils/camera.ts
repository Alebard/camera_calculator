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
  '1/2.4"': 6.0,
  '1/1.8"': 7.2,
  '1/1.2"': 10.67,
}

export const sensorFormatKey = (value: unknown) => {
  const match = String(value ?? '').match(
      /(\d+\s*\/\s*\d+(?:[.,]\d+)?)/
  );
  return match ? `${match[1].replace(/\s+/g, '').replace(',', '.')}"` : null
}

export const sensorWidthForFormat = (value: unknown) => {
  const format = sensorFormatKey(value)
  if (!format) return undefined
  const baseWidth = estimatedSensorWidths[format]
  if (!baseWidth) return undefined

  const sensorCount = String(value ?? '').match(/[×x]\s*(\d+)/i)?.[1]

  return baseWidth * (sensorCount ? Number(sensorCount) : 1)
}

export const sensorFormatLabel = (value: unknown) => {
  const raw = String(value ?? '').trim()
  if (!raw) return null
  return /[×x]\s*\d+/i.test(raw) ? raw : sensorFormatKey(raw)
}

export const sensorWidthFor = (camera: Camera) => sensorWidthForFormat(camera.specs.sensor_format)

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
