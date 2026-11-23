<script setup lang="ts">
  import CameraRecommendation from './components/CameraRecommendation.vue'
  import CameraResults from './components/CameraResults.vue'
  import CameraScenarioForm from './components/CameraScenarioForm.vue'
  import { useCameraCalculator } from './composables/useCameraCalculator'

  const {
    catalogCount,
    commonFocalCeiling,
    distance,
    formFactor,
    formOptions,
    incompleteCount,
    lighting,
    location,
    missingDataCounts,
    matches,
    needPoe,
    needWdr,
    profile,
    recommendedFocalRange,
    recommendedResolution,
    requiredPixels,
    resolutionRaisedForFocal,
    scenarioProfiles,
    sceneWidth,
    selectedProfile,
    selectedSensorWidth,
    sensorFormat,
    sensorOptions,
    targetPpm,
    theoreticalMp,
    catalogMaxFocal,
    customPpm,
  } = useCameraCalculator()
</script>

<template>
  <main class="app-shell">
    <div class="workspace">
      <CameraScenarioForm
        v-model:profile="profile"
        v-model:distance="distance"
        v-model:scene-width="sceneWidth"
        v-model:custom-ppm="customPpm"
        v-model:location="location"
        v-model:lighting="lighting"
        v-model:form-factor="formFactor"
        v-model:need-wdr="needWdr"
        v-model:need-poe="needPoe"
        :profiles="scenarioProfiles"
        :selected-profile="selectedProfile"
        :target-ppm="targetPpm"
        :form-options="formOptions"
      />
    </div>

    <CameraRecommendation
      v-model:sensor-format="sensorFormat"
      :profile="profile"
      :required-pixels="requiredPixels"
      :recommended-resolution="recommendedResolution"
      :resolution-raised-for-focal="resolutionRaisedForFocal"
      :selected-sensor-width="selectedSensorWidth"
      :sensor-options="sensorOptions"
      :recommended-focal-range="recommendedFocalRange"
      :theoretical-mp="theoreticalMp"
      :catalog-max-focal="catalogMaxFocal"
      :common-focal-ceiling="commonFocalCeiling"
    />

    <section v-if="profile === 'plate'" class="notice plate-notice">
      <span>!</span>
      <div>
        <strong>Для чтения номеров нужен натурный тест</strong>
        <p>
          PPM — только предварительный фильтр. Учитывайте скорость авто, угол, выдержку, блики фар и
          ИК-подсветку. Рассмотрите специализированную ANPR/LPR-камеру.
        </p>
      </div>
    </section>
    <section v-if="profile === 'identify' || profile === 'recognize'" class="notice">
      <span>i</span>
      <div>
        <strong>Расчётная плотность не гарантирует идентификацию</strong>
        <p>
          На результат влияют угол поворота лица, высота установки, освещение и движение объекта.
        </p>
      </div>
    </section>

    <CameraResults
      :matches="matches"
      :catalog-count="catalogCount"
      :incomplete-count="incompleteCount"
      :missing-data-counts="missingDataCounts"
      :form-factor="formFactor"
    />
  </main>
</template>
