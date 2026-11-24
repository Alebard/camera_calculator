<script setup lang="ts">
  import { computed, ref } from 'vue'
  import type { CameraMatch, MissingDataCounts } from '../types/camera'
  import { formatNumber as fmt, formatPrice as rub, inferFormFactor } from '../utils/camera'

  const props = defineProps<{
    matches: CameraMatch[]
    catalogCount: number
    incompleteCount: number
    missingDataCounts: MissingDataCounts
    formFactor: string
  }>()
  const sortBy = ref('price')
  const sortDirection = ref<'asc' | 'desc'>('asc')
  const showAll = ref(false)
  const selectedBrands = ref<string[]>([])
  const brandOptions = computed(() =>
    [...new Set(props.matches.map((match) => match.camera.brand))].sort(),
  )
  const filteredMatches = computed(() =>
    props.matches.filter((match) => {
      const brandMatch =
        !selectedBrands.value.length || selectedBrands.value.includes(match.camera.brand)
      const form = inferFormFactor(match.camera)
      const formMatch =
        props.formFactor === 'any' ||
        (props.formFactor === 'unknown' ? form === null : form === props.formFactor)
      return brandMatch && formMatch
    }),
  )
  const sortedMatches = computed(() =>
    [...filteredMatches.value].sort((a, b) => {
      const order = sortDirection.value === 'asc' ? 1 : -1
      if (sortBy.value === 'price')
        return ((a.camera.price ?? Infinity) - (b.camera.price ?? Infinity)) * order
      if (sortBy.value === 'ppm') return (a.ppm - b.ppm) * order
      if (sortBy.value === 'resolution') return (a.resolutionWidthPx - b.resolutionWidthPx) * order
      return (
        (Number(a.conditional) - Number(b.conditional)) * order ||
        ((a.camera.price ?? Infinity) - (b.camera.price ?? Infinity)) * order
      )
    }),
  )
  const shownMatches = computed(() =>
    showAll.value ? sortedMatches.value : sortedMatches.value.slice(0, 6),
  )
  const featureStatus = (value: unknown) =>
    value === true ? 'Есть' : value === false ? 'Нет' : 'Нет данных'
  const matchedMegapixelLabel = (item: CameraMatch) =>
    item.resolutionMp === null ? null : `${fmt(item.resolutionMp, 0)} Мп`
  const illuminationLabel = (value: unknown) =>
    typeof value === 'number' ? `${fmt(value, 4)} лк` : '— лк'
  const whiteLightStatus = (specs: Record<string, unknown>) =>
    specs.white_led === true || typeof specs.white_led_range_m === 'number' ? true : specs.white_led
  const whiteLightLabel = (specs: Record<string, unknown>) => {
    const status = whiteLightStatus(specs)
    if (status !== true) return `Белая подсветка ${featureStatus(status).toLowerCase()}`
    return typeof specs.white_led_range_m === 'number'
      ? `Белый свет ${fmt(specs.white_led_range_m, 0)} м`
      : 'Белый свет есть'
  }
</script>

<template>
  <section class="results-section">
    <div class="results-header">
      <div>
        <span class="step">04 / РЕЗУЛЬТАТ</span>
        <h2>
          Подходящие камеры и каналы
          <span class="result-count">{{ filteredMatches.length }}</span>
        </h2>
        <p>Камеры и каналы с данными для геометрического расчёта</p>
      </div>
      <div class="result-controls">
        <details class="brand-filter">
          <summary>
            <span>Бренд</span
            ><b>{{ selectedBrands.length ? `Выбрано: ${selectedBrands.length}` : 'Все бренды' }}</b>
          </summary>
          <div class="brand-options">
            <label v-for="brand in brandOptions" :key="brand"
              ><input v-model="selectedBrands" type="checkbox" :value="brand" /><span>{{
                brand
              }}</span></label
            ><button v-if="selectedBrands.length" type="button" @click="selectedBrands = []">
              Сбросить
            </button>
          </div>
        </details>
        <label class="sort-control"
          ><select v-model="sortBy">
            <option value="price">По цене</option>
            <option value="ppm">По PPM</option>
            <option value="resolution">По разрешению</option>
            <option value="relevance">По оптимальности</option>
          </select></label
        ><button
          class="direction-toggle"
          type="button"
          :aria-label="
            sortDirection === 'asc'
              ? 'По возрастанию; переключить направление'
              : 'По убыванию; переключить направление'
          "
          :title="sortDirection === 'asc' ? 'По возрастанию' : 'По убыванию'"
          @click="sortDirection = sortDirection === 'asc' ? 'desc' : 'asc'"
        >
          {{ sortDirection === 'asc' ? '↑' : '↓' }}
        </button>
      </div>
    </div>
    <div v-if="!filteredMatches.length" class="empty-state">
      <span class="empty-icon">⌕</span>
      <h3>Подходящих камер и каналов в каталоге не найдено</h3>
      <p>
        Технические требования для вашей сцены приведены выше. Попробуйте изменить параметры или
        ослабить фильтры, чтобы увидеть больше моделей.
      </p>
    </div>
    <div v-else class="camera-grid">
      <article
        v-for="item in shownMatches"
        :key="`${item.camera.supplier_code ?? item.camera.model}-${item.channel ?? 'camera'}`"
        class="camera-card"
      >
        <div class="camera-card-top">
          <div class="camera-avatar">
            <svg viewBox="0 0 64 48" fill="none">
              <path d="M8 15.5h28.5l7-6h9l5 6.5v21H8z" stroke="currentColor" stroke-width="2" />
              <circle cx="38" cy="26" r="8" stroke="currentColor" stroke-width="2" />
              <circle cx="38" cy="26" r="3" fill="currentColor" />
              <path d="M8 21H3v10h5" stroke="currentColor" stroke-width="2" />
            </svg>
          </div>
          <span class="fit-badge" :class="item.conditional ? 'conditional' : ''">{{
            item.conditional ? 'Условно подходит' : 'Подходит'
          }}</span>
        </div>
        <div class="camera-brand">{{ item.camera.brand }}</div>
        <h3>{{ item.camera.model }}</h3>
        <div v-if="item.channel" class="camera-channel">Канал: {{ item.channel }}</div>
        <div class="camera-specs">
          <div>
            {{
              item.resolutionHeightPx
                ? `${item.resolutionWidthPx} × ${item.resolutionHeightPx} px`
                : `${item.resolutionWidthPx} px по горизонтали`
            }}
          </div>
          <div v-if="matchedMegapixelLabel(item)">{{ matchedMegapixelLabel(item) }}</div>
          <div>{{ fmt(item.focal, 1) }} мм</div>
          <div v-if="item.sensorFormat">Оптический формат: {{ item.sensorFormat }}</div>
          <div v-if="item.camera.specs.aperture_f">
            Светосила: {{ item.camera.specs.aperture_f }}
          </div>
        </div>
        <div class="camera-indicators" aria-label="Микрофон и характеристики освещения">
          <span
            class="camera-indicator"
            :class="`camera-indicator--${item.camera.specs.microphone === true ? 'yes' : item.camera.specs.microphone === false ? 'no' : 'unknown'}`"
            :title="`Встроенный микрофон: ${featureStatus(item.camera.specs.microphone).toLowerCase()}`"
          >
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <rect x="6" y="2" width="4" height="8" rx="2" />
              <path d="M4 7.5a4 4 0 0 0 8 0M8 12v2m-3 0h6" />
            </svg>
            Микрофон {{ featureStatus(item.camera.specs.microphone).toLowerCase() }}
          </span>
          <span
            class="camera-indicator"
            :class="`camera-indicator--${whiteLightStatus(item.camera.specs) === true ? 'yes' : whiteLightStatus(item.camera.specs) === false ? 'no' : 'unknown'}`"
            :title="`Белая LED-подсветка: ${featureStatus(whiteLightStatus(item.camera.specs)).toLowerCase()}`"
          >
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 2a4 4 0 0 0-2.5 7.1c.5.4.8.9.9 1.4h3.2c.1-.5.4-1 .9-1.4A4 4 0 0 0 8 2Z" />
              <path d="M6.5 12h3m-2.5 2h2M8 0v1M1.9 2.1l.8.8m10.6-.8-.8.8M0 7h1m14 0h1" />
            </svg>
            {{ whiteLightLabel(item.camera.specs) }}
          </span>
          <span
            class="camera-indicator camera-indicator--info"
            :title="`Минимальная освещённость: ${illuminationLabel(item.camera.specs.minimum_illumination_lux)}`"
          >
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="3" />
              <path
                d="M8 1v2m0 10v2M1 8h2m10 0h2M3 3l1.4 1.4m7.2 7.2L13 13m0-10-1.4 1.4m-7.2 7.2L3 13"
              />
            </svg>
            {{ illuminationLabel(item.camera.specs.minimum_illumination_lux) }}
          </span>
        </div>
        <div class="camera-metrics">
          <div>
            <span>Плотность</span><strong>{{ fmt(item.ppm, 0) }} <small>PPM</small></strong>
          </div>
          <div>
            <span>Ширина сцены</span><strong>{{ fmt(item.width, 1) }} <small>м</small></strong>
          </div>
          <div>
            <span>Угол обзора</span><strong>{{ fmt(item.hAngle, 0) }}°</strong>
          </div>
        </div>
        <p v-if="item.notes.length" class="camera-note">{{ item.notes.join(' · ') }}</p>
        <div class="camera-card-bottom">
          <strong>{{ rub(item.camera.price) }}</strong><a
            v-if="item.camera.supplier_url"
            :href="item.camera.supplier_url"
            target="_blank"
            rel="noreferrer"
            >К модели <span>↗</span></a
          >
        </div>
      </article>
    </div>
    <button v-if="filteredMatches.length > 6" class="show-more" @click="showAll = !showAll">
      {{ showAll ? 'Свернуть' : `Показать все ${filteredMatches.length} вариантов` }}
      <span>{{ showAll ? '↑' : '↓' }}</span>
    </button>
    <div class="catalog-note">
      <span>ⓘ</span>
      <p>
        В каталоге {{ catalogCount }} моделей. {{ incompleteCount }} не участвуют в рекомендациях:
        для геометрического расчёта не хватает хотя бы одного параметра — горизонтального разрешения
        ({{ missingDataCounts.horizontalResolution }}), распознаваемого оптического формата матрицы
        ({{ missingDataCounts.supportedSensorFormat }}) или диапазона фокусного расстояния ({{
          missingDataCounts.focalRange
        }}).
      </p>
    </div>
  </section>
</template>
