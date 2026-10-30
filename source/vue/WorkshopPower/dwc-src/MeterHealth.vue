<template>
	<!-- Meter health ("consumption" process of the service, see Pi service) -->
	<div v-if="health" class="health">
		<div class="d-flex align-center flex-wrap" style="gap:8px">
			<v-icon size="small" :color="healthState.color" aria-hidden="true">{{ healthState.icon }}</v-icon>
			<span class="text-body-medium font-weight-medium">{{ $t('plugins.WorkshopPower.meterConfig.meter_health', { state: healthState.text }) }}</span>
			<span class="text-body-small text-medium-emphasis">{{ healthState.detail }}</span>
		</div>
		<div class="health-tiles mt-2">
			<div class="health-tile">
				<div class="health-l">{{ $t('plugins.WorkshopPower.meterConfig.last_reading') }}</div>
				<div class="health-v">{{ health.age_ok_s != null ? age(health.age_ok_s) : '--' }}</div>
				<div class="health-s">{{ $t('plugins.WorkshopPower.meterConfig.read_every_s', { s: health.expected_s }) }}</div>
			</div>
			<div class="health-tile">
				<div class="health-l">{{ $t('plugins.WorkshopPower.meterConfig.good_readings') }}</div>
				<div class="health-v">{{ health.cycles || 0 }}</div>
				<div class="health-s">{{ $t('plugins.WorkshopPower.meterConfig.since_the_service_started') }}</div>
			</div>
			<div class="health-tile" :class="health.errors_total ? 'health-notice' : ''">
				<div class="health-l">{{ $t('plugins.WorkshopPower.meterConfig.failures') }}</div>
				<div class="health-v">{{ health.errors_total || 0 }}</div>
				<div class="health-s">{{ rateSuccess != null ? $t('plugins.WorkshopPower.meterConfig.pct_success', { pct: rateSuccess }) : '' }}</div>
			</div>
			<div class="health-tile">
				<div class="health-l">{{ $t('plugins.WorkshopPower.meterConfig.time_between_readings') }}</div>
				<div class="health-v">{{ health.interval_avg != null ? Math.round(health.interval_avg) + $t('plugins.WorkshopPower.meterConfig.s') : '--' }}</div>
				<div class="health-s">{{ health.interval_max != null ? $t('plugins.WorkshopPower.meterConfig.max') + Math.round(health.interval_max) + ' s (5 min)' : '' }}</div>
			</div>
		</div>
		<div v-if="health.detail" class="text-body-small mt-2 health-detail"><v-icon size="x-small" class="mr-1" aria-hidden="true">mdi-information-outline</v-icon>{{ health.detail }}</div>
		<div v-if="health.error && health.age_error_s != null && health.age_error_s < 3600" class="text-body-small mt-1 text-warning">
			<v-icon size="x-small" color="warning" aria-hidden="true">mdi-alert</v-icon> {{ $t('plugins.WorkshopPower.meterConfig.last_failure_at', { time: health.error_hour, error: health.error }) }}
		</div>
		<details class="wf-more">
			<summary>{{ $t('plugins.WorkshopPower.common.how_it_works') }}</summary>
			<p>{{ $t('plugins.WorkshopPower.meterConfig.the_meter_answers_over_wifi_and') }}</p>
		</details>
	</div>
</template>

<script setup>
import { computed } from 'vue'
import { i18n, modelPlugins } from './dwc-host.js'
import { pluginOf, dataOf } from './workshop-ids.js'
import { serviceTexts } from './service-text.js'

const health = computed(() => {
	const pl = pluginOf(modelPlugins(), 'service')
	const si = pl && dataOf(pl, 'servicesInternal')
	// detail / error of the process come as {key, params}: shown in the language of this DWC
	return serviceTexts((si && si.processes && si.processes.consumption) || null)
})
const rateSuccess = computed(() => {
	const s = health.value
	if (!s) {
		return null
	}
	const total = (s.cycles || 0) + (s.errors_total || 0)
	return total ? Math.round((s.cycles || 0) / total * 1000) / 10 : null
})
function age(sec) {
	sec = Math.round(sec)
	if (sec < 60) {
		return i18n.t('plugins.WorkshopPower.meterConfig.ago_s', { n: sec })
	}
	if (sec < 3600) {
		return i18n.t('plugins.WorkshopPower.meterConfig.ago_min', { n: Math.round(sec / 60) })
	}
	return i18n.t('plugins.WorkshopPower.meterConfig.ago_h', { n: Math.floor(sec / 3600) })
}
const healthState = computed(() => {
	const s = health.value
	if (!s || !s.live) {
		return { text: i18n.t('plugins.WorkshopPower.meterConfig.process_stopped'), color: 'error', icon: 'mdi-close-circle', detail: i18n.t('plugins.WorkshopPower.meterConfig.the_service_restarts_it_by_itself') }
	}
	if (s.age_ok_s == null || s.age_ok_s > (s.expected_s || 30) * 3) {
		return { text: i18n.t('plugins.WorkshopPower.meterConfig.not_responding'), color: 'error', icon: 'mdi-alert-circle', detail: s.age_ok_s != null ? i18n.t('plugins.WorkshopPower.meterConfig.no_readings_for') + age(s.age_ok_s) : i18n.t('plugins.WorkshopPower.meterConfig.no_readings_yet') }
	}
	if (s.error && s.age_error_s != null && s.age_error_s < 300) {
		return { text: i18n.t('plugins.WorkshopPower.meterConfig.with_recent_failures'), color: 'warning', icon: 'mdi-alert', detail: i18n.t('plugins.WorkshopPower.meterConfig.last_failure') + s.error_hour }
	}
	return { text: i18n.t('plugins.WorkshopPower.meterConfig.ok'), color: 'success', icon: 'mdi-check-circle', detail: '' }
})
</script>

<style scoped>
.health {
	margin-top: 16px;
	padding: 10px 12px;
	border-radius: 8px;
	background: rgba(128, 128, 128, 0.06);
}
.health-tiles {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
	gap: 8px;
}
.health-tile {
	background: rgba(128, 128, 128, 0.08);
	border-radius: 8px;
	padding: 6px 10px;
	border-left: 3px solid transparent;
}
.health-notice {
	border-left-color: #ffa726;
}
.health-l {
	font-size: 12px;
	color: var(--tp-faint, #9e9e9e);
}
.health-v {
	font-size: 18px;
	font-weight: 500;
	font-variant-numeric: tabular-nums;
}
.health-s {
	font-size: 11px;
	color: var(--tp-faint, #9e9e9e);
}
.health-detail {
	color: var(--tp-gray-blue, #b0bec5);
}
</style>
