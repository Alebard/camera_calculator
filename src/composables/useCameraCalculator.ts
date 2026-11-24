import { computed, ref, watch } from 'vue'
import catalogData from '../../static/catalog.json'
import type {
  Camera,
  CameraChannel,
  CameraMatch,
  FocalRange,
  MissingDataCounts,
  ResolutionChoice,
  ScenarioProfile,
} from '../types/camera'
import {
  estimatedSensorWidths,
  inferFormFactor,
  sensorFormatLabel,
  sensorWidthForFormat,
} from '../utils/camera'

const catalog = catalogData as Camera[]

const doriProfiles: ScenarioProfile[] = [
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

const iec2025Profiles: ScenarioProfile[] = [
  {
    id: 'overview',
    title: 'Обзор (Overview)',
    ppm: 20,
    icon: '◉',
    detail: 'Определить, движется ли объект',
  },
  {
    id: 'outline',
    title: 'Контур и направление (Outline)',
    ppm: 40,
    icon: '◎',
    detail: 'Оценить контур объекта и направление движения',
  },
  {
    id: 'discern',
    title: 'Различение (Discern)',
    ppm: 80,
    icon: '⌕',
    detail: 'Различать объекты и их движение',
  },
  {
    id: 'perceive',
    title: 'Восприятие (Perceive)',
    ppm: 125,
    icon: '◌',
    detail: 'Воспринимать объект без различения его признаков',
  },
  {
    id: 'characterize',
    title: 'Характеризация (Characterize)',
    ppm: 250,
    icon: '▱',
    detail: 'Оценивать тип человека, походку, поведение или категорию автомобиля',
  },
  {
    id: 'validate',
    title: 'Проверка (Validate)',
    ppm: 500,
    icon: '▤',
    detail: 'Проверять известного человека, действия и регистрационный номер',
  },
  {
    id: 'scrutinize',
    title: 'Детальное изучение (Scrutinize)',
    ppm: 1500,
    icon: '⌖',
    detail: 'Детально устанавливать личность и читать регистрационный номер',
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
  const densityStandard = ref('dori')
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

  const scenarioProfiles = computed(() =>
    densityStandard.value === 'iec2025' ? iec2025Profiles : doriProfiles,
  )
  const selectedProfile = computed(() =>
    scenarioProfiles.value.find((item) => item.id === profile.value)!,
  )
  watch(densityStandard, (standard) => {
    const doriToIec: Record<string, string> = {
      presence: 'overview',
      observe: 'discern',
      recognize: 'perceive',
      identify: 'characterize',
      vehicle: 'overview',
      plate: 'scrutinize',
      custom: 'custom',
    }
    const iecToDori: Record<string, string> = {
      overview: 'presence',
      outline: 'observe',
      discern: 'observe',
      perceive: 'recognize',
      characterize: 'identify',
      validate: 'identify',
      scrutinize: 'identify',
      custom: 'custom',
    }
    profile.value = (standard === 'iec2025' ? doriToIec : iecToDori)[profile.value] ?? 'custom'
  })
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

  const geometrySpecsFor = (camera: Camera) =>
    camera.channels?.length ? camera.channels : [camera.specs]

  function getMatch(camera: Camera, channel?: CameraChannel): CameraMatch | null {
    const specs = camera.specs
    const geometrySpecs = channel ?? specs
    const widthPx = geometrySpecs.resolution_width_px as number | null
    const heightPx = geometrySpecs.resolution_height_px as number | null
    const sensorWidth = sensorWidthForFormat(geometrySpecs.sensor_format) ?? null
    const focalMin = geometrySpecs.focal_length_min_mm as number | null
    const focalMax = geometrySpecs.focal_length_max_mm as number | null

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
    const sourceSensorFormats = String(geometrySpecs.sensor_format ?? '').match(
      /\d+\s*\/\s*\d+(?:[.,]\d+)?/g,
    )
    const distinctSensorFormats = new Set(
      sourceSensorFormats?.map((format) => sensorFormatLabel(format)),
    )
    if (distinctSensorFormats.size > 1) {
      notes.push('у камеры указано несколько оптических форматов; в расчёте использован первый')
    }
    const whiteLedRange = specs.white_led_range_m
    const hasWhiteLed = specs.white_led === true || typeof whiteLedRange === 'number'
    if (needWhiteLed.value && !hasWhiteLed) return null
    const whiteLedCanCover =
      needWhiteLed.value &&
      hasWhiteLed &&
      (typeof whiteLedRange !== 'number' || whiteLedRange >= distance.value)
    if (!heightPx) notes.push('вертикальное разрешение не указано; вертикальный угол не рассчитан')
    if (channel?.note) notes.push(channel.note)
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

    const estimateRange = [sensorWidth * 0.9, sensorWidth * 1.1]
    const sensorEstimateStable = estimateRange.every((width) => getGeometry(width) !== null)
    if (!sensorEstimateStable) {
      notes.push(
        'расчёт зависит от типового соответствия оптического формата; проверьте объектив по документации модели',
      )
      conditional = true
    }
    const calculatedSensorHeight = heightPx ? (sensorWidth * heightPx) / widthPx : null
    return {
      camera,
      focal,
      width: frameWidth,
      ppm,
      minFocal: requiredFocalMin,
      maxFocal: allowedFocalMax,
      sensorWidth,
      channel: channel?.channel ?? null,
      resolutionWidthPx: widthPx,
      resolutionHeightPx: heightPx,
      resolutionMp:
        typeof specs.resolution_mp === 'number' && !channel
          ? specs.resolution_mp
          : heightPx
            ? (widthPx * heightPx) / 1_000_000
            : null,
      sensorFormat: sensorFormatLabel(geometrySpecs.sensor_format),
      hAngle: (2 * Math.atan(sensorWidth / (2 * focal)) * 180) / Math.PI,
      vAngle: calculatedSensorHeight
        ? (2 * Math.atan(calculatedSensorHeight / (2 * focal)) * 180) / Math.PI
        : null,
      conditional,
      notes,
    }
  }

  const matches = computed(() =>
    catalog.flatMap((camera) => {
      const channels = camera.channels?.length ? camera.channels : [undefined]
      return channels
        .map((channel) => getMatch(camera, channel))
        .filter((match): match is CameraMatch => match !== null)
    }),
  )
  const missingDataCounts = computed<MissingDataCounts>(() => ({
    horizontalResolution: catalog.filter(
      (camera) => !geometrySpecsFor(camera).some((geometry) => geometry.resolution_width_px),
    ).length,
    supportedSensorFormat: catalog.filter(
      (camera) =>
        !geometrySpecsFor(camera).some((geometry) => sensorWidthForFormat(geometry.sensor_format)),
    ).length,
    focalRange: catalog.filter(
      (camera) =>
        !geometrySpecsFor(camera).some(
          (geometry) => geometry.focal_length_min_mm && geometry.focal_length_max_mm,
        ),
    ).length,
  }))
  const incompleteCount = computed(
    () =>
      catalog.filter((camera) => {
        return !geometrySpecsFor(camera).some(
          (geometry) =>
            geometry.resolution_width_px &&
            sensorWidthForFormat(geometry.sensor_format) &&
            geometry.focal_length_min_mm &&
            geometry.focal_length_max_mm,
        )
      }).length,
  )

  return {
    catalogCount: catalog.length,
    scenarioProfiles,
    profile,
    densityStandard,
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
