<template>
	<!-- ===== Detailed history ===== -->
	<v-card class="mb-3">
		<v-card-text>
			<div class="d-flex align-center justify-space-between flex-wrap" style="gap:8px">
				<div class="text-title-medium font-weight-medium">
					<v-icon size="small" class="mr-1" color="primary">mdi-chart-line</v-icon>{{ $t('plugins.WorkshopPower.consumption.detailed_history') }}
				</div>
				<v-btn-toggle v-model="range" mandatory density="compact" color="primary">
					<v-btn size="small" value="24h">24 h</v-btn>
					<v-btn size="small" value="7d">{{ $t('plugins.WorkshopPower.consumption.7_days') }}</v-btn>
					<v-btn size="small" value="30d">{{ $t('plugins.WorkshopPower.consumption.30_days') }}</v-btn>
					<v-btn size="small" value="custom" :aria-label="$t('plugins.WorkshopPower.consumption.from')" @click="toggleDates"><v-icon size="small">mdi-calendar-range</v-icon></v-btn>
				</v-btn-toggle>
			</div>

			<ExpandTransition>
				<v-row v-show="range === 'custom' && datesOpen" density="compact" class="mt-2">
					<v-col cols="6" sm="4">
						<v-menu v-model="withSinceMenu" :close-on-content-click="false" min-width="auto">
							<template #activator="{ props: activator }">
								<v-text-field v-model="withSince" :label="$t('plugins.WorkshopPower.consumption.from')" readonly density="compact" hide-details variant="outlined" prepend-inner-icon="mdi-calendar" v-bind="activator" />
							</template>
							<v-date-picker :model-value="pickerDate(withSince)" hide-header color="primary" :max="pickerDate(withUntil)" @update:model-value="pickSince" />
						</v-menu>
					</v-col>
					<v-col cols="6" sm="4">
						<v-menu v-model="withUntilMenu" :close-on-content-click="false" min-width="auto">
							<template #activator="{ props: activator }">
								<v-text-field v-model="withUntil" :label="$t('plugins.WorkshopPower.consumption.to')" readonly density="compact" hide-details variant="outlined" prepend-inner-icon="mdi-calendar" v-bind="activator" />
							</template>
							<v-date-picker :model-value="pickerDate(withUntil)" hide-header color="primary" :min="pickerDate(withSince)" @update:model-value="pickUntil" />
						</v-menu>
					</v-col>
				</v-row>
			</ExpandTransition>

			<div v-if="summary" class="span-tiles mt-3">
				<div class="tile">
					<div class="tile-label">{{ $t('plugins.WorkshopPower.consumption.consumed') }}</div>
					<div class="tile-value">{{ fmtKwh(summary.consumption_kwh) }} <small>kWh</small></div>
					<div class="tile-sub">{{ costOf(summary.consumption_kwh) || NBSP }}</div>
				</div>
				<div class="tile">
					<div class="tile-label">{{ $t('plugins.WorkshopPower.consumption.average') }}</div>
					<div class="tile-value">{{ summary.average_w != null ? summary.average_w.toFixed(0) : '--' }} <small>W</small></div>
					<div class="tile-sub">{{ NBSP }}</div>
				</div>
				<div class="tile">
					<div class="tile-label">{{ $t('plugins.WorkshopPower.consumption.peak') }}</div>
					<div class="tile-value">{{ summary.peak_w != null ? summary.peak_w.toFixed(0) : '--' }} <small>W</small></div>
					<div class="tile-sub">{{ NBSP }}</div>
				</div>
				<div class="tile">
					<div class="tile-label">{{ $t('plugins.WorkshopPower.consumption.idle_label') }}</div>
					<div class="tile-value">{{ idle ? idle.w.toFixed(0) : '--' }} <small>W</small></div>
					<div class="tile-sub">{{ idle ? (costOf(idle.kwhDay) ? $t('plugins.WorkshopPower.consumption.idle_cost', { cost: costOf(idle.kwhDay) }) : $t('plugins.WorkshopPower.consumption.idle_sub', { kwh: fmtKwh(idle.kwhDay) })) : NBSP }}</div>
				</div>
				<div class="tile">
					<div class="tile-label">{{ $t('plugins.WorkshopPower.consumption.readings') }}</div>
					<div class="tile-value">{{ summary.samples }}</div>
					<div class="tile-sub">{{ $t('plugins.WorkshopPower.consumption.one_every_30_s') }}</div>
				</div>
			</div>

			<template v-if="serial.length > 1">
				<div class="text-body-small text-medium-emphasis mt-3 mb-1">{{ $t('plugins.WorkshopPower.consumption.power_w') }}</div>
				<detail-chart
					:history="serialPower"
					color="#FFB300" unit="W" :label="$t('plugins.WorkshopPower.consumption.power')"
					:limit="summary ? summary.peak_w : null" :limit-label="$t('plugins.WorkshopPower.consumption.peak_lower')"
					:height="220"
				/>
				<v-row density="compact" class="mt-2">
					<v-col cols="12" sm="6">
						<div class="text-body-small text-medium-emphasis mb-1">{{ $t('plugins.WorkshopPower.consumption.voltage_v') }}</div>
						<detail-chart :history="serialVoltage" color="#29B6F6" unit="V" :label="$t('plugins.WorkshopPower.consumption.voltage')" :height="160" />
					</v-col>
					<v-col cols="12" sm="6">
						<div class="text-body-small text-medium-emphasis mb-1">{{ $t('plugins.WorkshopPower.consumption.current_a') }}</div>
						<detail-chart :history="serialCurrent" color="#66BB6A" unit="A" :label="$t('plugins.WorkshopPower.consumption.current')" :height="160" />
					</v-col>
				</v-row>
				<details class="wf-more">
					<summary>{{ $t('plugins.WorkshopPower.common.how_it_works') }}</summary>
					<p>
						{{ $t('plugins.WorkshopPower.consumption.gaps_in_the_line_are_periods') }}
						<span v-if="serialStepS">{{ $t('plugins.WorkshopPower.consumption.long_range_averaged_every', { minutes: serialStepMin }) }}</span>
						{{ $t('plugins.WorkshopPower.consumption.wheel_or_pinch_to_zoom') }}
					</p>
				</details>
				<div v-if="idle" class="text-body-small text-medium-emphasis mt-1">{{ $t('plugins.WorkshopPower.consumption.idle_hint') }}</div>
			</template>
			<div v-else class="text-body-small text-medium-emphasis text-center py-6">
				{{ loading ? $t('plugins.WorkshopPower.consumption.loading') : $t('plugins.WorkshopPower.consumption.no_readings_in_the_range') }}
			</div>
		</v-card-text>
	</v-card>
</template>

<script setup>
import { ExpandTransition } from './expand-transition.js'

import { computed, onMounted, ref, watch } from 'vue'
import { i18n } from './dwc-host.js'
import { api } from './workshop-api.js'
import DetailChart from './DetailChart.vue'
import { fmtKwh, costText } from './money.js'
import { asDateLocal, asDateHourLocal } from './dates.js'
import { parseTs } from './jobs.js'
import { baseload } from './job-insights.js'

// Readings every 30 s: more than 3 min without a reading = gap (machine/meter off). A null point is inserted so that the
// chart cuts the line instead of joining the ends with a straight ramp that looks like real consumption.
const GAP_MS = 3 * 60 * 1000
const DAYS_SPAN = { '24h': 1, '7d': 7, '30d': 30 }
const NBSP = ' '

const props = defineProps({
	tariff: { type: Object, default: () => ({ currency: '', value_kwh: 0 }) },
	meter: { type: String, default: '' }
})

const today0 = new Date()
const range = ref('24h')
// the calendar button shows the date fields; tapping it again while it is selected hides them (the group is mandatory, it cannot unselect)
const datesOpen = ref(true)
let lastRange = '24h' // range before this tap: the group already switched to 'custom' when the click handler runs
function toggleDates() {
	if (lastRange === 'custom') datesOpen.value = !datesOpen.value
}
const withSince = ref(asDateLocal(new Date(today0.getTime() - 7 * 86400000)))
const withUntil = ref(asDateLocal(today0))
const withSinceMenu = ref(false)
const withUntilMenu = ref(false)
const summary = ref(null)
const serial = ref([])
const serialStepS = ref(0) // width of a point in seconds when the service averaged a long range; 0 = raw readings
const loading = ref(false)

function costOf(kwh) {
	return costText(kwh, props.tariff, i18n.locale)
}
// "2026-10-19" (local) -> Date at local midnight, for v-date-picker (Vuetify 4 takes and gives Date objects)
function pickerDate(text) {
	const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(text || ''))
	return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : undefined
}
function serialTimed(field) {
	const out = []
	let prevT = null
	// a hole is a stretch with no readings: with averaged points neighbours are one step apart, not 30 s
	const gapMs = Math.max(GAP_MS, 1.5 * serialStepS.value * 1000)
	for (const p of serial.value) {
		const ms = parseTs(p.ts)
		if (prevT != null && ms - prevT > gapMs) {
			out.push({ t: prevT + 1000, y: null })
		}
		out.push({ t: ms, y: p[field] })
		prevT = ms
	}
	return out
}
const serialStepMin = computed(() => Math.max(1, Math.round(serialStepS.value / 60)))
const serialPower = computed(() => serialTimed('power_w'))
const serialVoltage = computed(() => serialTimed('voltage_v'))
const serialCurrent = computed(() => serialTimed('current_a'))
const idle = computed(() => baseload(serial.value))

watch(range, v => {
	lastRange = v
	if (v === 'custom') datesOpen.value = true
	else search()
})
watch(() => props.meter, () => search())
onMounted(() => search())

async function search() {
	let since
	let until
	if (range.value === 'custom') {
		since = withSince.value
		until = withUntil.value
	} else {
		const nowDate = new Date()
		since = asDateHourLocal(new Date(nowDate.getTime() - DAYS_SPAN[range.value] * 86400000))
		// +10 min of margin: the Pi clock runs a bit ahead
		until = asDateHourLocal(new Date(nowDate.getTime() + 10 * 60000))
	}
	loading.value = true
	try {
		const data = await api('energy.history', Object.assign({ from: since, to: until, limit: 1 }, props.meter ? { meter: props.meter } : {}))
		summary.value = data.summary || null
		serial.value = data.serial || []
		serialStepS.value = Number(data.serial_step_s) || 0
	} catch (e) {
		summary.value = null
		serial.value = []
		serialStepS.value = 0
	} finally {
		loading.value = false
	}
}
// a day chosen in a date picker (a Date) -> the text the service takes; the menu closes and the query runs
function pickSince(d) {
	if (d) withSince.value = asDateLocal(new Date(d))
	withSinceMenu.value = false
	search()
}
function pickUntil(d) {
	if (d) withUntil.value = asDateLocal(new Date(d))
	withUntilMenu.value = false
	search()
}
</script>

<style scoped>
.span-tiles {
	display: grid;
	grid-template-columns: repeat(5, minmax(0, 1fr));
	gap: 10px;
}
@media (max-width: 900px) {
	.span-tiles {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}
}
@media (max-width: 600px) {
	.span-tiles {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
}
.tile {
	background: rgba(128, 128, 128, 0.09);
	border-radius: 8px;
	padding: 10px 12px;
	display: flex;
	flex-direction: column;
	justify-content: center;
	min-width: 0;
}
.tile-label {
	font-size: 12px;
	color: var(--tp-faint, #9e9e9e);
}
.tile-value {
	font-size: 22px;
	font-weight: 500;
	line-height: 1.25;
	font-variant-numeric: tabular-nums;
	white-space: nowrap;
}
.tile-value small {
	font-size: 13px;
	color: var(--tp-faint, #9e9e9e);
	font-weight: 400;
}
.tile-sub {
	font-size: 12px;
	color: var(--tp-faint2, #bdbdbd);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
</style>
