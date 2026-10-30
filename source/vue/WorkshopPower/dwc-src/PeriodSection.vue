<template>
	<!-- ===== Energy per period (bars) ===== -->
	<v-card ref="root" class="mb-3">
		<v-card-text>
			<div class="d-flex align-center justify-space-between flex-wrap" style="gap:8px">
				<div class="text-title-medium font-weight-medium">
					<v-icon size="small" class="mr-1" color="primary">mdi-chart-bar</v-icon>{{ $t('plugins.WorkshopPower.consumption.energy_per_period') }}
				</div>
				<div class="d-flex align-center flex-wrap" style="gap:8px">
					<v-btn-toggle v-model="periodTab" mandatory density="compact" color="primary">
						<v-btn size="small" value="day">{{ $t('plugins.WorkshopPower.consumption.day') }}</v-btn>
						<v-btn size="small" value="month">{{ $t('plugins.WorkshopPower.consumption.month') }}</v-btn>
						<v-btn size="small" value="year">{{ $t('plugins.WorkshopPower.consumption.year') }}</v-btn>
					</v-btn-toggle>
					<v-btn size="small" variant="outlined" :disabled="!periodData || !periodData.buckets" @click="exportCsv()">
						<v-icon size="small" start>mdi-download</v-icon>{{ $t('plugins.WorkshopPower.consumption.export_csv') }}
					</v-btn>
				</div>
			</div>

			<div class="d-flex align-center justify-center mt-2">
				<v-btn :aria-label="$t('plugins.WorkshopPower.shared.aria_previous')" icon size="small" @click="navigatePeriod(-1)"><v-icon>mdi-chevron-left</v-icon></v-btn>
				<span class="text-title-small mx-2 period-label">{{ periodData ? periodData.label : '--' }}</span>
				<v-btn :aria-label="$t('plugins.WorkshopPower.shared.aria_next')" icon size="small" :disabled="isPeriodCurrent" @click="navigatePeriod(1)"><v-icon>mdi-chevron-right</v-icon></v-btn>
				<v-btn v-if="!isPeriodCurrent" size="x-small" variant="text" color="primary" @click="goOnCurrent()">{{ textCurrent }}</v-btn>
			</div>

			<div class="period-summary">
				<div>
					<div class="period-total">
						{{ periodData && periodData.total_kwh != null ? fmtKwh(periodData.total_kwh) : '--' }}
						<span class="text-title-large text-medium-emphasis">kWh</span>
					</div>
					<div v-if="periodData" class="text-body-medium text-medium-emphasis">
						{{ costOf(periodData.total_kwh) }}
						<span v-if="comparison" :class="comparison.cssClass" class="ml-2">
							<v-icon size="small" :color="comparison.color">{{ comparison.icon }}</v-icon>
							{{ comparison.text }}
						</span>
					</div>
				</div>
				<div v-if="stats" class="period-stats">
					<div>
						<div class="tile-label">{{ $t('plugins.WorkshopPower.consumption.average_per_unit', { unit: unitBucket }) }}</div>
						<div class="text-body-large">{{ fmtKwh(stats.average) }} kWh</div>
					</div>
					<div>
						<div class="tile-label">{{ $t('plugins.WorkshopPower.consumption.highest_usage_unit', { unit: capital(unitBucket) }) }}</div>
						<div class="text-body-large">{{ stats.maxLabel }} &middot; {{ fmtKwh(stats.max) }} kWh</div>
					</div>
				</div>
			</div>

			<consumption-bars
				v-if="periodData && periodData.buckets"
				:buckets="periodData.buckets"
				:current-index="isPeriodCurrent ? periodData.current_index : null"
				:previous="periodPrevious ? periodPrevious.buckets : null"
				:price="tariff.value_kwh"
				:currency="tariff.currency"
				:average="stats ? stats.average : null"
				class="mt-2"
			/>
			<div v-else class="text-body-small text-medium-emphasis text-center py-8">
				{{ periodLoading ? $t('plugins.WorkshopPower.consumption.loading') : $t('plugins.WorkshopPower.consumption.no_data_for_this_period') }}
			</div>
			<div class="text-body-small text-medium-emphasis mt-1">
				{{ $t('plugins.WorkshopPower.consumption.tap_a_bar_hint', { prev: textPrevious }) }}
			</div>
		</v-card-text>
	</v-card>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { i18n } from './dwc-host.js'
import { api } from './workshop-api.js'
import ConsumptionBars from './ConsumptionBars.vue'
import { fmtKwh, costText } from './money.js'
import { asDateLocal } from './dates.js'
import { periodCsv } from './job-insights.js'
import { downloadText } from './download.js'

const props = defineProps({
	tariff: { type: Object, default: () => ({ currency: '', value_kwh: 0 }) },
	meter: { type: String, default: '' } // '' = the main meter, 'total' or the key of a meter
})

const root = ref(null)
const periodTab = ref('day')
const refDate = ref(new Date())
const periodData = ref(null)
const periodPrevious = ref(null)
const periodLoading = ref(false)
const now = ref(Date.now())
let timerTick = null
let timerRefresh = null

const t = k => i18n.t('plugins.WorkshopPower.consumption.' + k)
function costOf(kwh) {
	return costText(kwh, props.tariff, i18n.locale)
}
function capital(s) {
	return s.charAt(0).toUpperCase() + s.slice(1)
}
function sumKwh(buckets, until) {
	let s = 0
	let has = false
	buckets.forEach((b, i) => {
		if ((until == null || i <= until) && b.kwh != null) {
			s += b.kwh
			has = true
		}
	})
	return has ? s : null
}

const isPeriodCurrent = computed(() => {
	const today = new Date(now.value)
	if (periodTab.value === 'day') {
		return asDateLocal(refDate.value) === asDateLocal(today)
	}
	if (periodTab.value === 'month') {
		return refDate.value.getFullYear() === today.getFullYear() && refDate.value.getMonth() === today.getMonth()
	}
	return refDate.value.getFullYear() === today.getFullYear()
})
const textCurrent = computed(() => ({ day: t('today'), month: t('this_month'), year: t('this_year') }[periodTab.value]))
const textPrevious = computed(() => ({ day: t('previous_day'), month: t('previous_month'), year: t('previous_year') }[periodTab.value]))
const unitBucket = computed(() => ({ day: t('unit_hour'), month: t('unit_day'), year: t('unit_month') }[periodTab.value]))
// Average/maximum of the buckets with data; the bucket in progress does not enter the average (it is incomplete and would pull it down).
const stats = computed(() => {
	if (!periodData.value || !periodData.value.buckets) {
		return null
	}
	const cur = isPeriodCurrent.value ? periodData.value.current_index : null
	const vals = []
	let max = null
	periodData.value.buckets.forEach((b, i) => {
		if (b.kwh == null) {
			return
		}
		if (max == null || b.kwh > max.kwh) {
			max = b
		}
		if (i !== cur) {
			vals.push(b.kwh)
		}
	})
	if (!max) {
		return null
	}
	const average = vals.length ? vals.reduce((a, v) => a + v, 0) / vals.length : max.kwh
	return { average, max: max.kwh, maxLabel: max.tooltip || max.label }
})
// Against the previous period "at the same point": if today is at 14 h, it is compared with the first 14 h of yesterday, not with the whole day.
const comparison = computed(() => {
	if (!periodData.value || !periodPrevious.value || periodData.value.total_kwh == null) {
		return null
	}
	const cur = isPeriodCurrent.value ? periodData.value.current_index : null
	const prev = sumKwh(periodPrevious.value.buckets || [], cur)
	if (prev == null || prev < 0.005) {
		return null
	}
	const pct = Math.round((periodData.value.total_kwh - prev) / prev * 100)
	const ref = cur != null ? i18n.t('plugins.WorkshopPower.consumption.prev_at_this_time', { prev: textPrevious.value }) : textPrevious.value
	if (Math.abs(pct) < 3) {
		return { text: i18n.t('plugins.WorkshopPower.consumption.same_as_ref', { ref }), icon: 'mdi-equal', color: 'grey', cssClass: 'text-medium-emphasis' }
	}
	return pct > 0
		? { text: i18n.t('plugins.WorkshopPower.consumption.pct_more_than_ref', { pct, ref }), icon: 'mdi-arrow-up', color: 'warning', cssClass: 'text-warning' }
		: { text: i18n.t('plugins.WorkshopPower.consumption.pct_less_than_ref', { pct: -pct, ref }), icon: 'mdi-arrow-down', color: 'success', cssClass: 'text-success' }
})

watch(periodTab, () => {
	refDate.value = new Date()
	loadPeriod()
})
watch(() => props.meter, () => loadPeriod())

onMounted(() => {
	loadPeriod()
	timerTick = setInterval(() => { now.value = Date.now() }, 30000)
	// the bars of the period in progress refresh every minute, only with the page in view (DWC keeps it alive when going to another)
	timerRefresh = setInterval(() => {
		const el = root.value && root.value.$el
		if (document.hidden || !el || el.isConnected === false) return
		if (isPeriodCurrent.value) loadPeriod(true)
	}, 60000)
})
onBeforeUnmount(() => {
	clearInterval(timerTick)
	clearInterval(timerRefresh)
})

function periodParam(tab, date) {
	return { period: tab, date: asDateLocal(date), ...(props.meter ? { meter: props.meter } : {}) }
}
function datePreview(tab, date) {
	const d = new Date(date)
	if (tab === 'month') {
		d.setDate(1)
		d.setMonth(d.getMonth() - 1)
	} else if (tab === 'year') {
		d.setFullYear(d.getFullYear() - 1)
	} else {
		d.setDate(d.getDate() - 1)
	}
	return d
}
function navigatePeriod(delta) {
	const d = new Date(refDate.value)
	if (periodTab.value === 'month') {
		d.setDate(1)
		d.setMonth(d.getMonth() + delta)
	} else if (periodTab.value === 'year') {
		d.setFullYear(d.getFullYear() + delta)
	} else {
		d.setDate(d.getDate() + delta)
	}
	refDate.value = d
	loadPeriod()
}
function goOnCurrent() {
	refDate.value = new Date()
	loadPeriod()
}
async function loadPeriod(quiet) {
	const tab = periodTab.value
	const refD = new Date(refDate.value)
	if (!quiet) {
		periodLoading.value = true
	}
	try {
		const current = await api('energy.period', periodParam(tab, refD))
		let previous = null
		try {
			previous = await api('energy.period', periodParam(tab, datePreview(tab, refD)))
		} catch (e) {
			previous = null
		}
		// discard if the user changed period while it was loading
		if (tab === periodTab.value && asDateLocal(refD) === asDateLocal(refDate.value)) {
			periodData.value = current && !current.error ? current : null
			periodPrevious.value = previous && !previous.error ? previous : null
		}
	} catch (e) {
		if (!quiet) {
			periodData.value = null
			periodPrevious.value = null
		}
	} finally {
		periodLoading.value = false
	}
}
function exportCsv() {
	if (!periodData.value || !periodData.value.buckets) return
	downloadText('workshop-power-' + periodTab.value + '.csv', periodCsv(periodData.value.buckets, { period: t('csv_period'), kwh: t('csv_kwh'), cost: t('csv_cost') }, props.tariff.value_kwh))
}
</script>

<style scoped>
.tile-label {
	font-size: 12px;
	color: var(--tp-faint, #9e9e9e);
}
.period-label {
	min-width: 90px;
	text-align: center;
}
.period-summary {
	display: flex;
	justify-content: space-between;
	align-items: flex-end;
	flex-wrap: wrap;
	gap: 12px;
	margin-top: 4px;
}
.period-total {
	font-size: 36px;
	font-weight: 500;
	line-height: 1.15;
	font-variant-numeric: tabular-nums;
}
.period-stats {
	display: flex;
	gap: 20px;
	flex-wrap: wrap;
}
</style>
