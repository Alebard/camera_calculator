<script setup lang="ts">
  import { computed, ref } from 'vue'
  import type { CameraMatch, MissingDataCounts } from '../types/camera'
  import {
    formatNumber as fmt,
    formatPrice as rub,
    inferFormFactor,
    megapixelLabel,
  } from '../utils/camera'

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
      if (sortBy.value === 'resolution')
        return (
          (Number(a.camera.specs.resolution_width_px) -
            Number(b.camera.specs.resolution_width_px)) *
          order
        )
      return (
        (Number(a.conditional) - Number(b.conditional)) * order ||
        ((a.camera.price ?? Infinity) - (b.camera.price ?? Infinity)) * order
      )
    }),
  )
  const shownMatches = computed(() =>
    showAll.value ? sortedMatches.value : sortedMatches.value.slice(0, 6),
  )
</script>

<template>
  <section class="results-section">
    <div class="results-header">
      <div>
        <span class="step">04 / РЕЗУЛЬТАТ</span>
        <h2>
          Подходящие камеры <span class="result-count">{{ filteredMatches.length }}</span>
        </h2>
        <p>Модели, для которых каталог содержит данные для геометрического расчёта</p>
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
      <h3>Подходящих моделей в каталоге не найдено</h3>
      <p>
        Технические требования для вашей сцены приведены выше. Попробуйте изменить параметры или
        ослабить фильтры, чтобы увидеть больше моделей.
      </p>
    </div>
    <div v-else class="camera-grid">
      <article v-for="item in shownMatches" :key="item.camera.model" class="camera-card">
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
        <div class="camera-specs">
          <div>
            {{
              item.camera.specs.resolution_height_px
                ? `${item.camera.specs.resolution_width_px} × ${item.camera.specs.resolution_height_px} px`
                : `${item.camera.specs.resolution_width_px} px по горизонтали`
            }}
          </div>
          <div v-if="megapixelLabel(item.camera)">{{ megapixelLabel(item.camera) }}</div>
          <div>{{ fmt(item.focal, 1) }} мм</div>
          <div>
            Ширина сенсора: {{ fmt(item.sensorWidth, 2) }} мм{{
              item.estimatedSensor ? ' (оценка)' : ''
            }}
          </div>
          <div v-if="item.sensorFormat">Формат: {{ item.sensorFormat }}</div>
          <div v-if="item.estimatedSensor">Источник: формат сенсора; проверка ±10%</div>
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
        <p class="camera-explanation">
          При настройке на {{ fmt(item.focal, 1) }} мм ширина кадра {{ fmt(item.width, 1) }} м,
          плотность {{ fmt(item.ppm, 0) }} PPM.
        </p>
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
      {{ showAll ? 'Свернуть' : `Показать все ${filteredMatches.length} камер` }}
      <span>{{ showAll ? '↑' : '↓' }}</span>
    </button>
    <div class="catalog-note">
      <span>ⓘ</span>
      <p>
        В каталоге {{ catalogCount }} моделей. У {{ incompleteCount }} не хватает хотя бы одного
        параметра, необходимого для геометрического расчёта: горизонтального разрешения ({{
          missingDataCounts.horizontalResolution
        }}), определяемого размера сенсора ({{ missingDataCounts.usableSensorWidth }}) или диапазона
        фокусного расстояния ({{ missingDataCounts.focalRange }}). Числа пересекаются. Тип сенсора и
        его мегапиксели не блокируют подбор; при известном формате ширина сенсора оценивается и
        помечается в карточке.
      </p>
    </div>
  </section>
</template>
