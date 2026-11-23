<script setup lang="ts">
  import type { FocalRange, ResolutionChoice } from '../types/camera'

  defineProps<{
    profile: string
    requiredPixels: number
    recommendedResolution: ResolutionChoice | null
    resolutionRaisedForFocal: boolean
    selectedSensorWidth: number
    sensorOptions: [string, number][]
    recommendedFocalRange: FocalRange | null
    theoreticalMp: number
    catalogMaxFocal: number
    commonFocalCeiling: number
    isPlateTask: boolean
  }>()
  const sensorFormat = defineModel<string>('sensorFormat', { required: true })
  const fmt = (value: number, digits = 1) =>
    new Intl.NumberFormat('ru-RU', { maximumFractionDigits: digits }).format(value)
</script>

<template>
  <section class="recommendation-panel">
    <div class="recommendation-heading">
      <div>
        <span class="step">ВАШИ ТЕХНИЧЕСКИЕ ТРЕБОВАНИЯ</span>
        <h2>Камера, которую нужно искать</h2>
        <p>Расчёт характеристик по заданной сцене — даже если точной модели нет в каталоге.</p>
      </div>
      <span class="recommendation-mark">↗</span>
    </div>
    <div class="recommendation-grid">
      <div class="recommendation-item">
        <span>Разрешение по горизонтали</span
        ><strong v-if="recommendedResolution"
          >не менее {{ recommendedResolution.width.toLocaleString('ru-RU') }}
          <small>px</small></strong
        ><strong v-else>от {{ requiredPixels.toLocaleString('ru-RU') }} <small>px</small></strong
        ><small v-if="recommendedResolution && resolutionRaisedForFocal"
          >Повышено до {{ recommendedResolution.mp }} Мп, чтобы использовать объектив до
          {{ commonFocalCeiling }} мм</small
        ><small v-else-if="recommendedResolution"
          >{{ recommendedResolution.width }} × {{ recommendedResolution.height }} px — ближайший
          подходящий вариант</small
        ><small v-else>В каталоге нет модели с достаточным разрешением</small>
      </div>
      <div class="recommendation-item">
        <span>Разрешение в мегапикселях</span
        ><strong v-if="recommendedResolution"
          >≈ {{ fmt(recommendedResolution.mp, 0) }} <small>Мп</small></strong
        ><strong v-else>от {{ fmt(theoreticalMp, 0) }} <small>Мп</small></strong
        ><small>{{
          resolutionRaisedForFocal
            ? 'Повышено, чтобы обойтись более коротким объективом'
            : 'Ближайший распространённый класс разрешения'
        }}</small>
      </div>
      <div class="recommendation-item sensor-recommendation">
        <label for="sensorFormat">Размер матрицы</label
        ><select id="sensorFormat" v-model="sensorFormat">
          <option v-for="[format] in sensorOptions" :key="format" :value="format">
            {{ format }}
          </option></select
        ><small
          >Ориентировочная ширина {{ fmt(selectedSensorWidth, 2) }} мм. Сверьте размер по паспорту
          камеры.</small
        >
      </div>
      <div class="recommendation-item">
        <span>Фокусное расстояние</span
        ><strong
          v-if="recommendedFocalRange && recommendedFocalRange.min <= recommendedFocalRange.max"
          >{{ fmt(recommendedFocalRange.min, 1) }}–{{ fmt(recommendedFocalRange.max, 1) }}
          <small>мм</small></strong
        ><strong v-else>Нет допустимого диапазона</strong
        ><small
          v-if="recommendedFocalRange && recommendedFocalRange.min <= recommendedFocalRange.max"
          >Объектив должен покрывать этот диапазон; вариофокальный удобнее для настройки.</small
        ><small v-else>Увеличьте разрешение, измените ширину сцены или снизьте PPM.</small
        ><small
          v-if="recommendedFocalRange && recommendedFocalRange.min > commonFocalCeiling"
          class="focal-warning"
          >Даже при выбранном разрешении {{ recommendedResolution?.mp }} Мп нужен объектив от
          {{ fmt(recommendedFocalRange.min, 1) }} мм. Для объектива до {{ commonFocalCeiling }} мм
          потребуется разрешение выше доступного в каталоге. В каталоге есть редкие варианты до
          {{ catalogMaxFocal }} мм.</small
        >
      </div>
    </div>
    <div class="recommendation-summary">
      <span>ИТОГО</span>
      <p>
        Ищите
        {{
          recommendedResolution
            ? `камеру от ${fmt(recommendedResolution.mp, 1)} Мп`
            : `камеру с разрешением от ${requiredPixels.toLocaleString('ru-RU')} px по горизонтали`
        }}, с матрицей {{ sensorFormat }} (оценка) и объективом
        {{
          recommendedFocalRange && recommendedFocalRange.min <= recommendedFocalRange.max
            ? `${fmt(recommendedFocalRange.min, 1)}–${fmt(recommendedFocalRange.max, 1)} мм`
            : 'в диапазоне, соответствующем сцене'
        }}. Требуемое разрешение зависит от ширины сцены и PPM; увеличение дистанции увеличивает
        фокусное расстояние, но при неизменных ширине сцены и PPM не меняет Мп.
        {{
          isPlateTask
            ? 'Для чтения номера дополнительно нужна специализированная ANPR/LPR-модель и проверка на объекте.'
            : ''
        }}
      </p>
    </div>
  </section>
</template>
