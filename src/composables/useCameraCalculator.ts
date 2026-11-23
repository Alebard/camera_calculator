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
import { estimatedSensorWidths, inferFormFactor, sensorWidthFor } from '../utils/camera'

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
  const needWhiteLed = ref(false)
  const needMicrophone = ref(false)

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

    const getGeometry = (width: number) => {
      const requiredMin = (distance.value * width * targetPpm.value) / widthPx
      const allowedMax = (distance.value * width) / sceneWidth.value
      const low = Math.max(focalMin, requiredMin)
      const high = Math.min(focalMax, allowedMax)
      return low <= high ? { requiredMin, allowedMax, focal: high } : null
    }
    const geometry = getGeometry(sensorWidth)
    if (!geometry) return null
    const { requiredMin: requiredFocalMin, allowedMax: allowedFocalMax, focal } = geometry

    const frameWidth = (distance.value * sensorWidth) / focal
    const ppm = widthPx / frameWidth
    const ipRating = specs.ip_rating as number | null
    const lux = specs.minimum_illumination_lux as number | null
    const notes: string[] = []
    const whiteLedRange = specs.white_led_range_m
    const whiteLedCanCover =
      needWhiteLed.value &&
      specs.white_led === true &&
      (typeof whiteLedRange !== 'number' || whiteLedRange >= distance.value)
    if (!heightPx && !sensorHeight)
      notes.push('вертикальное разрешение не указано; вертикальный угол не рассчитан')
    let conditional = false

    if (location.value === 'outdoor' && ipRating !== null && ipRating < 65) return null
    if (location.value === 'outdoor' && ipRating === null) {
      notes.push('класс IP не указан')
      conditional = true
    }
    if (lighting.value === 'dim' && typeof lux === 'number' && lux > 0.01 && !whiteLedCanCover)
      return null
    if (lighting.value === 'dim' && typeof lux !== 'number' && !whiteLedCanCover) {
      notes.push('минимальная освещённость не указана')
      conditional = true
    }

    const irRange = specs.ir_range_m
    if (
      lighting.value === 'dark' &&
      !whiteLedCanCover &&
      typeof irRange === 'number' &&
      irRange < distance.value
    )
      return null
    if (lighting.value === 'dark' && !whiteLedCanCover && typeof irRange !== 'number') {
      notes.push('дальность ИК-подсветки не указана')
      conditional = true
    }
    if (whiteLedCanCover && typeof whiteLedRange !== 'number') {
      notes.push('белая LED-подсветка подтверждена, но её дальность не указана')
      conditional = true
    }
    if (needWdr.value && specs.wdr !== true) return null
    if (needPoe.value && specs.poe !== true) return null
    if (needMicrophone.value && specs.microphone !== true) return null

    const estimatedSensor = typeof exactSensorWidth !== 'number'
    const estimateRange = estimatedSensor ? [sensorWidth * 0.9, sensorWidth * 1.1] : null
    const sensorEstimateStable = estimateRange
      ? estimateRange.every((width) => getGeometry(width) !== null)
      : true
    if (estimatedSensor && !sensorEstimateStable) {
      notes.push(
        'подбор зависит от оценочного размера сенсора; нужна проверка точной ширины матрицы',
      )
      conditional = true
    }
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
      sensorFormat: typeof specs.sensor_format === 'string' ? specs.sensor_format : null,
      estimatedSensor,
      hAngle: (2 * Math.atan(sensorWidth / (2 * focal)) * 180) / Math.PI,
      vAngle: calculatedSensorHeight
        ? (2 * Math.atan(calculatedSensorHeight / (2 * focal)) * 180) / Math.PI
        : null,
      conditional,
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
    needWhiteLed,
    needMicrophone,
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
