import { computed, ref } from 'vue'
import catalogData from '../../static/catalog.json'
import type {
  Camera,
  CameraMatch,
  FocalRange,
  MissingDataCounts,
  ResolutionChoice,
  ScenarioProfile,
} from '../types/camera'
import {
  estimatedSensorWidths,
  formatNumber,
  inferFormFactor,
  sensorWidthFor,
} from '../utils/camera'

const catalog = catalogData as Camera[]

export const scenarioProfiles: ScenarioProfile[] = [
  {
    id: 'presence',
    title: 'Обнаружение присутствия',
    ppm: 25,
    icon: '◉',
    detail: 'Человек или движение в кадре',
  },
  {
    id: 'observe',
    title: 'Наблюдение',
    ppm: 62.5,
    icon: '◎',
    detail: 'Понимать действия и обстановку',
  },
  {
    id: 'recognize',
    title: 'Распознавание',
    ppm: 125,
    icon: '⌕',
    detail: 'Различить знакомого человека',
  },
  {
    id: 'identify',
    title: 'Идентификация лица',
    ppm: 250,
    icon: '◌',
    detail: 'Детально рассмотреть лицо',
  },
  {
    id: 'vehicle',
    title: 'Обнаружение автомобиля',
    ppm: 25,
    icon: '▱',
    detail: 'Обнаружить автомобиль в сцене',
  },
  {
    id: 'plate',
    title: 'Чтение номера',
    ppm: 250,
    icon: '▤',
    detail: 'Предварительный расчёт для ANPR/LPR',
  },
  {
    id: 'custom',
    title: 'Своя задача',
    ppm: 125,
    icon: '＋',
    detail: 'Задать требуемую плотность вручную',
  },
]

export function useCameraCalculator() {
  const profile = ref('identify')
  const distance = ref(10)
  const sceneWidth = ref(5)
  const customPpm = ref(250)
  const location = ref('any')
  const lighting = ref('day')
  const sensorFormat = ref('1/2.8"')
  const formFactor = ref('any')
  const needWdr = ref(false)
  const needPoe = ref(true)

  const selectedProfile = computed(() =>
    scenarioProfiles.find((item) => item.id === profile.value)!,
  )
  const targetPpm = computed(() =>
    profile.value === 'custom' ? customPpm.value : selectedProfile.value.ppm,
  )
  const requiredPixels = computed(() => Math.ceil(sceneWidth.value * targetPpm.value))
  const selectedSensorWidth = computed(() => estimatedSensorWidths[sensorFormat.value])
  const sensorOptions = Object.entries(estimatedSensorWidths).filter(([format]) =>
    catalog.some((camera) => camera.specs.sensor_format === format),
  )
  const formOptions = computed(() =>
    [
      ...new Set(catalog.map(inferFormFactor).filter((value): value is string => value !== null)),
    ].sort(),
  )
  const catalogMaxFocal = Math.max(
    ...catalog.map((camera) => Number(camera.specs.focal_length_max_mm) || 0),
  )
  const commonFocalCeiling = 12

  const resolutionChoices = computed(() =>
    [
      ...new Map(
        catalog
          .filter((camera) => camera.specs.resolution_width_px && camera.specs.resolution_height_px)
          .map((camera) => {
            const width = camera.specs.resolution_width_px as number
            const height = camera.specs.resolution_height_px as number
            return [
              `${width}x${height}`,
              { width, height, mp: Math.round((width * height) / 1_000_000) },
            ]
          }),
      ).values(),
    ].sort((a, b) => a.width - b.width),
  )
  const baseResolution = computed(
    () => resolutionChoices.value.find((choice) => choice.width >= requiredPixels.value) ?? null,
  )
  const recommendedResolution = computed<ResolutionChoice | null>(() => {
    const sensorWidth = selectedSensorWidth.value
    const maxForScene = (distance.value * sensorWidth) / sceneWidth.value
    return (
      resolutionChoices.value.find(
        (choice) =>
          choice.width >= requiredPixels.value &&
          (distance.value * sensorWidth * targetPpm.value) / choice.width <=
            Math.min(maxForScene, commonFocalCeiling),
      ) ?? baseResolution.value
    )
  })
  const resolutionRaisedForFocal = computed(() =>
    Boolean(
      recommendedResolution.value &&
      baseResolution.value &&
      recommendedResolution.value.width > baseResolution.value.width,
    ),
  )
  const recommendedFocalRange = computed<FocalRange | null>(() => {
    const sensorWidth = selectedSensorWidth.value
    if (
      !sensorWidth ||
      distance.value <= 0 ||
      sceneWidth.value <= 0 ||
      !recommendedResolution.value
    )
      return null
    return {
      min: (distance.value * sensorWidth * targetPpm.value) / recommendedResolution.value.width,
      max: (distance.value * sensorWidth) / sceneWidth.value,
    }
  })
  const theoreticalMp = computed(
    () => (requiredPixels.value * Math.ceil((requiredPixels.value * 9) / 16)) / 1_000_000,
  )

  function getMatch(camera: Camera): CameraMatch | null {
    const specs = camera.specs
    const widthPx = specs.resolution_width_px as number | null
    const heightPx = specs.resolution_height_px as number | null
    const exactSensorWidth = specs.sensor_width_mm as number | null
    const sensorWidth = sensorWidthFor(camera) ?? null
    const sensorHeight = specs.sensor_height_mm as number | null
    const focalMin = specs.focal_length_min_mm as number | null
    const focalMax = specs.focal_length_max_mm as number | null

    if (!widthPx || !sensorWidth || !focalMin || !focalMax) return null
    if (focalMin > focalMax || distance.value <= 0 || sceneWidth.value <= 0 || targetPpm.value <= 0)
      return null

    const requiredFocalMin = (distance.value * sensorWidth * targetPpm.value) / widthPx
    const allowedFocalMax = (distance.value * sensorWidth) / sceneWidth.value
    const low = Math.max(focalMin, requiredFocalMin)
    const high = Math.min(focalMax, allowedFocalMax)
    if (low > high) return null

    const focal = high
    const frameWidth = (distance.value * sensorWidth) / focal
    const ppm = widthPx / frameWidth
    const ipRating = specs.ip_rating as number | null
    const lux = specs.minimum_illumination_lux as number | null
    const notes: string[] = []
    if (!heightPx && !sensorHeight)
      notes.push('вертикальное разрешение не указано; вертикальный угол не рассчитан')

    if (location.value === 'outdoor' && ipRating !== null && ipRating < 65) return null
    if (location.value === 'outdoor' && ipRating === null) notes.push('класс IP не указан')
    if (lighting.value === 'dim' && typeof lux === 'number' && lux > 0.01) return null
    if (lighting.value === 'dim' && typeof lux !== 'number')
      notes.push('минимальная освещённость не указана')

    const irRange = specs.ir_range_m
    if (lighting.value === 'dark' && typeof irRange === 'number' && irRange < distance.value)
      return null
    if (lighting.value === 'dark' && typeof irRange !== 'number')
      notes.push('дальность ИК-подсветки не указана')
    if (needWdr.value && specs.wdr !== true) return null
    if (needPoe.value && specs.poe !== true) return null

    const estimatedSensor = typeof exactSensorWidth !== 'number'
    if (estimatedSensor)
      notes.unshift(
        `сенсор ${specs.sensor_format}: ширина матрицы принята ≈${formatNumber(sensorWidth, 2)} мм`,
      )
    const calculatedSensorHeight =
      sensorHeight ?? (heightPx ? (sensorWidth * heightPx) / widthPx : null)
    return {
      camera,
      focal,
      width: frameWidth,
      ppm,
      minFocal: requiredFocalMin,
      maxFocal: allowedFocalMax,
      sensorWidth,
      hAngle: (2 * Math.atan(sensorWidth / (2 * focal)) * 180) / Math.PI,
      vAngle: calculatedSensorHeight
        ? (2 * Math.atan(calculatedSensorHeight / (2 * focal)) * 180) / Math.PI
        : null,
      conditional: notes.length > 0 || estimatedSensor,
      notes,
    }
  }

  const matches = computed(() =>
    catalog.map(getMatch).filter((match): match is CameraMatch => match !== null),
  )
  const missingDataCounts = computed<MissingDataCounts>(() => ({
    horizontalResolution: catalog.filter((camera) => !camera.specs.resolution_width_px).length,
    usableSensorWidth: catalog.filter((camera) => !sensorWidthFor(camera)).length,
    focalRange: catalog.filter(
      (camera) => !camera.specs.focal_length_min_mm || !camera.specs.focal_length_max_mm,
    ).length,
  }))
  const incompleteCount = computed(
    () =>
      catalog.filter((camera) => {
        const specs = camera.specs
        return (
          !specs.resolution_width_px ||
          !sensorWidthFor(camera) ||
          !specs.focal_length_min_mm ||
          !specs.focal_length_max_mm
        )
      }).length,
  )

  return {
    catalogCount: catalog.length,
    scenarioProfiles,
    profile,
    distance,
    sceneWidth,
    customPpm,
    location,
    lighting,
    sensorFormat,
    formFactor,
    formOptions,
    needWdr,
    needPoe,
    selectedProfile,
    targetPpm,
    requiredPixels,
    selectedSensorWidth,
    sensorOptions,
    recommendedResolution,
    resolutionRaisedForFocal,
    recommendedFocalRange,
    theoreticalMp,
    catalogMaxFocal,
    commonFocalCeiling,
    matches,
    incompleteCount,
    missingDataCounts,
  }
}
