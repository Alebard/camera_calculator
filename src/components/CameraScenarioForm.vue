<script setup lang="ts">
  import type { ScenarioProfile } from '../types/camera'

  defineProps<{
    profiles: ScenarioProfile[]
    selectedProfile: ScenarioProfile
    targetPpm: number
    formOptions: string[]
  }>()
  const profile = defineModel<string>('profile', { required: true })
  const distance = defineModel<number>('distance', { required: true })
  const sceneWidth = defineModel<number>('sceneWidth', { required: true })
  const customPpm = defineModel<number>('customPpm', { required: true })
  const location = defineModel<string>('location', { required: true })
  const lighting = defineModel<string>('lighting', { required: true })
  const formFactor = defineModel<string>('formFactor', { required: true })
  const needWdr = defineModel<boolean>('needWdr', { required: true })
  const needPoe = defineModel<boolean>('needPoe', { required: true })

  const fmt = (value: number, digits = 1) =>
    new Intl.NumberFormat('ru-RU', { maximumFractionDigits: digits }).format(value)
</script>

<template>
  <section class="form-panel">
    <div class="section-heading">
      <div>
        <span class="step">01 / СЦЕНАРИЙ</span>
        <h2>Что нужно видеть?</h2>
      </div>
      <span class="small-muted">Цель задаёт рекомендуемый PPM</span>
    </div>
    <label class="scenario-select"
      ><span>Цель наблюдения</span
      ><select v-model="profile">
        <option v-for="item in profiles" :key="item.id" :value="item.id">
          {{ item.title }}{{ item.id === 'custom' ? '' : ` — ${fmt(item.ppm, 1)} PPM` }}
        </option></select
      ><small
        >{{ selectedProfile.detail
        }}<template v-if="profile !== 'custom'">
          · ориентир {{ fmt(targetPpm, 1) }} PPM</template
        ></small
      ></label
    >
    <div v-if="profile === 'custom'" class="custom-ppm">
      <label for="ppm">Требуемая плотность, PPM</label
      ><input id="ppm" v-model.number="customPpm" type="number" min="1" max="2000" step="1" />
    </div>

    <div class="section-heading geometry-heading">
      <div>
        <span class="step">02 / ГЕОМЕТРИЯ</span>
        <h2>Параметры сцены</h2>
      </div>
      <span class="small-muted">Расстояние до объекта и ширина кадра</span>
    </div>
    <div class="geometry-grid">
      <label class="field"
        ><span>Расстояние до объекта <b>ⓘ</b></span>
        <div class="input-wrap">
          <input v-model.number="distance" type="number" min="0.1" max="1000" step="0.5" /><span
            >м</span
          >
        </div></label
      ><label class="field"
        ><span>Минимальная ширина сцены <b>ⓘ</b></span>
        <div class="input-wrap">
          <input v-model.number="sceneWidth" type="number" min="0.1" max="1000" step="0.5" /><span
            >м</span
          >
        </div></label
      >
    </div>

    <div class="section-heading conditions-heading">
      <div>
        <span class="step">03 / УСЛОВИЯ</span>
        <h2>Где будет работать камера?</h2>
      </div>
    </div>
    <div class="condition-grid">
      <label class="field"
        ><span>Место установки</span
        ><select v-model="location">
          <option value="any">Без ограничений</option>
          <option value="indoor">Внутри помещения</option>
          <option value="outdoor">На улице (IP65+)</option></select
        ><small class="field-hint"
          >Для помещения фильтра нет. На улице камеры с известным IP ниже 65 исключаются;
          неизвестный IP помечается.</small
        ></label
      ><label class="field"
        ><span>Освещение</span
        ><select v-model="lighting">
          <option value="day">Дневной свет</option>
          <option value="dim">Слабое освещение</option>
          <option value="dark">Полная темнота</option></select
        ><small class="field-hint"
          >Световые условия добавляют предупреждения по люксам и дальности ИК, но сами по себе
          камеру не исключают.</small
        ></label
      ><label class="field"
        ><span>Исполнение камеры</span
        ><select v-model="formFactor">
          <option value="any">Любое</option>
          <option v-for="form in formOptions" :key="form" :value="form">{{ form }}</option>
          <option value="unknown">Не указано в каталоге</option></select
        ><small class="field-hint"
          >Тип определён по названию модели; сверяйте с карточкой производителя.</small
        ></label
      >
    </div>
    <div class="toggles">
      <label class="toggle"
        ><input v-model="needWdr" type="checkbox" /><span class="toggle-ui"></span
        ><span>Сильный перепад яркости <small>WDR</small></span></label
      ><label class="toggle"
        ><input v-model="needPoe" type="checkbox" /><span class="toggle-ui"></span
        ><span>Питание по Ethernet <small>PoE</small></span></label
      >
    </div>
  </section>
</template>
