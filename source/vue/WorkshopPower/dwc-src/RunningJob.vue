<template>
	<v-card v-if="job" variant="outlined" class="running mb-3">
		<v-card-text>
			<div class="running-head">
				<span class="running-dot" aria-hidden="true" />
				<span class="running-title">{{ $t('plugins.WorkshopPower.consumption.running_title') }}</span>
				<v-chip size="x-small" variant="outlined" color="info">{{ $t(job.kind === 'live' ? 'plugins.WorkshopPower.consumption.running_live' : 'plugins.WorkshopPower.consumption.running_file') }}</v-chip>
				<span v-if="job.name" class="running-name">{{ job.name }}</span>
			</div>
			<div class="running-tiles">
				<div class="running-tile">
					<div class="running-label">{{ $t('plugins.WorkshopPower.consumption.running_elapsed') }}</div>
					<div class="running-value">{{ fmtDur(elapsedS) }}</div>
				</div>
				<div class="running-tile">
					<div class="running-label">{{ $t('plugins.WorkshopPower.consumption.running_energy') }}</div>
					<div class="running-value">{{ data ? fmtKwh(data.kwh) : '--' }}<small> kWh</small></div>
					<div class="running-sub">{{ data && data.peak != null ? $t('plugins.WorkshopPower.consumption.running_peak', { w: Math.round(data.peak) }) : NBSP }}</div>
				</div>
				<div class="running-tile">
					<div class="running-label">{{ $t('plugins.WorkshopPower.consumption.running_cost') }}</div>
					<div class="running-value running-cost">{{ (data && costOf(data.kwh)) || '--' }}</div>
					<div class="running-sub">{{ costOf(1) ? NBSP : $t('plugins.WorkshopPower.consumption.running_no_tariff') }}</div>
				</div>
				<div class="running-tile">
					<div class="running-label">{{ $t('plugins.WorkshopPower.consumption.running_power') }}</div>
					<div class="running-value">{{ watts != null ? Math.round(watts) : '--' }}<small> W</small></div>
					<div class="running-sub">{{ pace || NBSP }}</div>
				</div>
			</div>
			<div v-if="loaded && !data" class="running-note">{{ $t('plugins.WorkshopPower.consumption.running_no_readings') }}</div>
		</v-card-text>
	</v-card>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { i18n } from './dwc-host.js'
import { api } from './workshop-api.js'
import { fmtKwh, costText } from './money.js'
import { fmtDur, localIso } from './jobs.js'

const NBSP = ' '
const props = defineProps({
	job: { type: Object, default: null }, // runningJob() of job-insights.js, or null
	tariff: { type: Object, default: () => ({ currency: '', value_kwh: 0 }) },
	meter: { type: String, default: '' },
	watts: { type: Number, default: null } // power now (live reading)
})

const data = ref(null)
const loaded = ref(false)
const now = ref(Date.now())
let timerTick = null
let timerLoad = null

function costOf(kwh) {
	return costText(kwh, props.tariff, i18n.locale)
}
const elapsedS = computed(() => (props.job ? Math.max(0, Math.round((now.value - props.job.startMs) / 1000)) : 0))
const pace = computed(() => {
	const c = props.watts != null ? costOf(props.watts / 1000) : null
	return c ? i18n.t('plugins.WorkshopPower.consumption.running_pace', { cost: c }) : ''
})

// energy of the job so far: the readings between its start and now (+10 min: the clock of the Pi runs a bit ahead)
async function load() {
	if (!props.job || document.hidden) return
	try {
		const args = { from: localIso(props.job.startMs), to: localIso(Date.now() + 10 * 60000), limit: 1 }
		if (props.meter) args.meter = props.meter
		const r = await api('energy.history', args)
		const s = r && r.summary
		data.value = s && s.samples ? { kwh: s.consumption_kwh, peak: s.peak_w, avg: s.average_w } : null
	} catch (e) {
		// stays with the last value
	} finally {
		loaded.value = true
	}
}

watch(() => props.job && props.job.startMs, () => { data.value = null; loaded.value = false; load() })
watch(() => props.meter, () => load())
onMounted(() => {
	load()
	timerTick = setInterval(() => { now.value = Date.now() }, 5000)
	timerLoad = setInterval(load, 30000)
})
onBeforeUnmount(() => {
	clearInterval(timerTick)
	clearInterval(timerLoad)
})
</script>

<style scoped>
.running {
	border-left: 1px solid rgba(128, 128, 128, 0.3) !important;
}
.running-head {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 6px 8px;
	margin-bottom: 10px;
}
.running-title {
	font-weight: 500;
}
.running-name {
	font-size: 13px;
	color: var(--tp-faint, #9e9e9e);
	overflow-wrap: anywhere;
}
.running-dot {
	width: 9px;
	height: 9px;
	border-radius: 50%;
	background: #66BB6A;
	animation: pw-pulse 2s infinite;
}
@keyframes pw-pulse {
	0% { box-shadow: 0 0 0 0 rgba(102, 187, 106, 0.6); }
	70% { box-shadow: 0 0 0 7px rgba(102, 187, 106, 0); }
	100% { box-shadow: 0 0 0 0 rgba(102, 187, 106, 0); }
}
.running-tiles {
	display: grid;
	grid-template-columns: repeat(4, minmax(0, 1fr));
	gap: 10px;
}
.running-tile {
	background: rgba(128, 128, 128, 0.09);
	border-radius: 8px;
	padding: 8px 12px;
	min-width: 0;
}
.running-label {
	font-size: 12px;
	color: var(--tp-faint, #9e9e9e);
}
.running-value {
	font-size: 20px;
	font-weight: 500;
	font-variant-numeric: tabular-nums;
	white-space: nowrap;
}
.running-value small {
	font-size: 12px;
	font-weight: 400;
	color: var(--tp-faint, #9e9e9e);
}
.running-cost {
	color: var(--tp-amber, #ffb300);
}
.running-sub,
.running-note {
	font-size: 12px;
	color: var(--tp-faint, #9e9e9e);
}
.running-note {
	margin-top: 8px;
}
@media (max-width: 600px) {
	.running-tiles {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
}
@media (prefers-reduced-motion: reduce) {
	.running-dot {
		animation: none;
	}
}
</style>
