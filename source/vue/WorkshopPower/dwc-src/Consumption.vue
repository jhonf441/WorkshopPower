<template>
	<v-container :style="{ '--wf-sec': sectionColor(section) }" ref="root" fluid class="pa-0 consumption-page workshop-theme">
		<service-notice />
		<page-header :lead="$t('plugins.WorkshopPower.common.lead')" icon="mdi-gauge" :title="$t('plugins.WorkshopPower.common.power_usage')" :reasons="headerReasons">
			<template #startup><startup-panel plugin="WorkshopPower" :defs="rowsStartup" /></template>
		</page-header>
		<div class="st-layout">
			<side-tabs v-model="section" :items="sections" />
			<div class="st-body">
				<div v-if="section === 'summary'">
					<!-- ===== Live reading + quick summary ===== -->
					<live-summary
						v-model="meterView" :state="liveState" :text="liveText" :has-data="!!consumptionCurrent" :view="view" :meters="listMeters"
						:cost-hour="costHour" :today-kwh="todayKwh" :month-kwh="monthKwh" :projection="projection" :tariff="tariff"
						:can-configure="atLeast('technician')" @configure="goAMeter()"
					/>
					<running-job :job="running" :tariff="tariff" :meter="meterView" :watts="view.w" />
					<budget-card :limit="budgetLimit" :month-kwh="monthKwh" :projection="projection" :tariff="tariff" @update:limit="setBudget" />
					<v-card class="mb-3">
						<v-card-text class="pt-0">
							<tariff-row :tariff="tariff" @saved="tariff = $event" />
						</v-card-text>
					</v-card>
				</div>
				<period-section v-if="section === 'period'" :tariff="tariff" :meter="meterView" />
				<jobs-section
					v-if="section === 'jobs'" :tariff="tariff" :meter="meterView" :has-activity="hasActivity" :running="running" :watts="view.w"
				/>
				<history-section v-if="section === 'history'" :tariff="tariff" :meter="meterView" />
				<div v-if="section === 'meter'">
					<!-- ===== Meter settings ===== -->
					<v-card ref="meterCard" class="mb-3">
						<v-card-text>
							<div class="text-title-medium font-weight-medium mb-2">
								<v-icon size="small" class="mr-1" color="primary">mdi-cog</v-icon>{{ $t('plugins.WorkshopPower.consumption.meter_settings') }}
							</div>
							<meter-config :live="liveState === 'dot-ok'" :open-editor="meterOpen || !consumptionCurrent" @changed="onChangeMeter()" @closed="meterOpen = false" />
						</v-card-text>
					</v-card>
				</div>
			</div>
		</div>
	</v-container>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { i18n, machineModel, modelPlugins } from './dwc-host.js'
import ServiceNotice from './ServiceNotice.vue'
import StartupPanel from './StartupPanel.vue' // start-up card (vue/_shared)
import PageHeader from './PageHeader.vue' // header of every page (vue/_shared)
import { rowsConsumption } from './startup-rows.js'
import { api } from './workshop-api.js'
import LiveSummary from './LiveSummary.vue'
import RunningJob from './RunningJob.vue'
import BudgetCard from './BudgetCard.vue'
import PeriodSection from './PeriodSection.vue'
import JobsSection from './JobsSection.vue'
import HistorySection from './HistorySection.vue'
import MeterConfig from './MeterConfig.vue'
import TariffRow from './TariffRow.vue'
import { useRole } from './use-role.js' // what the role sees (vue/_shared)
import { visibleItems } from './role-view.js'
import SideTabs from './SideTabs.vue'
import { pluginOf, dataOf, pathExists } from './workshop-ids.js'
import { costText, fmtKwh } from './money.js' // amount in the language of DWC (test/money.test.js)
import { asDateLocal } from './dates.js'
import { runningJob, budgetState } from './job-insights.js' // tested in test/job-insights.test.js
import { loadLimit, saveLimit } from './budget-store.js'
import { sectionColor } from './section-colors.js' // the color of each section (--wf-sec)

const router = useRouter()
const { canDo, atLeast } = useRole()
const root = ref(null)
const meterCard = ref(null)

let storedMeter = ''
try {
	storedMeter = localStorage.getItem('workshopConsumptionMeter') || ''
} catch (e) {
	storedMeter = ''
}
const meterView = ref(storedMeter) // '' = the main one, 'total' or the key of a meter
// tiles on top
const todayData = ref(null)
const monthData = ref(null)
// rate (API energy.rate_get / energy.rate_set, saved in the service's config)
const tariff = ref({ currency: '', value_kwh: 0 }) // empty until the service answers (profile currency or none; no fixed currency)
const meterOpen = ref(false)
const section = ref('summary') // the section chosen in the side bar (Summary = the live reading)
const budgetLimit = ref(loadLimit()) // monthly limit in kWh of this browser (0 = none)
// "updated X ago": measured with the clock of the browser since the last snapshot arrived (the Pi clock runs ~5 min
// shifted, comparing against its ts would give false values)
const lastTs = ref(null)
const lastReceived = ref(null)
const now = ref(Date.now())
let timerTick = null
let timerRefresh = null
let timerHeartbeat = null

// the Activity page is another plugin: the hint names it only when it is there
const hasActivity = computed(() => pathExists(router, '/Plugins/Activity'))
const sections = computed(() => {
	const t = k => i18n.t('plugins.WorkshopPower.consumption.' + k)
	// F3-V (2026-10-21): everybody reads the consumption; the meter settings are a technician's
	return visibleItems([
		{ id: 'summary', icon: 'mdi-gauge', label: t('nav_summary') },
		{ id: 'period', icon: 'mdi-chart-bar', label: t('nav_period') },
		{ id: 'jobs', icon: 'mdi-briefcase-clock-outline', label: t('nav_jobs') },
		{ id: 'history', icon: 'mdi-history', label: t('nav_history') },
		{ id: 'meter', icon: 'mdi-meter-electric-outline', label: t('nav_meter'), min: 'technician' }
	], op => canDo(op))
})
const pluginModel = computed(() => pluginOf(modelPlugins(), 'service'))
const consumptionCurrent = computed(() => {
	if (!pluginModel.value || !pluginModel.value.data) {
		return null
	}
	return dataOf(pluginModel.value, 'consumptionCurrent') || null
})
// live meters (consumptionCurrent.meters of the poller)
const listMeters = computed(() => (consumptionCurrent.value && consumptionCurrent.value.meters) || [])
const view = computed(() => {
	const ca = consumptionCurrent.value
	if (!ca) return { w: null, v: null, a: null }
	const ms = listMeters.value
	if (meterView.value === 'total' && ms.length > 1) {
		const own = ms.filter(m => m.ok && !m.inside_of)
		return {
			w: ca.total_w != null ? ca.total_w : null,
			v: ca.voltage_v,
			a: own.length ? own.reduce((t, m) => t + (m.current_a || 0), 0) : null
		}
	}
	const m = ms.find(x => x.key === meterView.value)
	if (m) return { w: m.ok ? m.power_w : null, v: m.ok ? m.voltage_v : null, a: m.ok ? m.current_a : null }
	return { w: ca.power_w, v: ca.voltage_v, a: ca.current_a }
})
const consumptionTs = computed(() => (consumptionCurrent.value ? consumptionCurrent.value.ts : null))
const liveAgeS = computed(() => (lastReceived.value ? Math.max(0, Math.round((now.value - lastReceived.value) / 1000)) : null))
const liveState = computed(() => {
	if (!consumptionCurrent.value) {
		return 'dot-off'
	}
	return liveAgeS.value != null && liveAgeS.value > 90 ? 'dot-stale' : 'dot-ok'
})
const liveText = computed(() => {
	if (!consumptionCurrent.value) {
		return i18n.t('plugins.WorkshopPower.consumption.no_meter_data_configure_it_below')
	}
	const s = liveAgeS.value
	if (s == null || s < 5) {
		return i18n.t('plugins.WorkshopPower.consumption.live')
	}
	if (s > 90) {
		return i18n.t('plugins.WorkshopPower.consumption.no_new_readings_for_min', { n: Math.round(s / 60) })
	}
	return i18n.t('plugins.WorkshopPower.consumption.live_s_ago', { s })
})
// start-up card: is there a meter answering, and a recent reading
const rowsStartup = computed(() => rowsConsumption({ hasData: !!consumptionCurrent.value, meters: listMeters.value, ageS: liveAgeS.value }))
const todayKwh = computed(() => (todayData.value ? todayData.value.total_kwh : null))
const monthKwh = computed(() => (monthData.value ? monthData.value.total_kwh : null))
// Daily average of the days WITH data (the meter started saving in the middle of the month, and there are days with the
// machine disconnected), counting today by the elapsed fraction, by the days of the month.
const projection = computed(() => {
	if (!monthData.value || !monthData.value.buckets) {
		return null
	}
	const b = monthData.value.buckets
	const cur = monthData.value.current_index
	const nowDate = new Date(now.value)
	let kwh = 0
	let days = 0
	b.forEach((x, i) => {
		if (x.kwh == null || (cur != null && i > cur)) {
			return
		}
		kwh += x.kwh
		days += (i === cur) ? (nowDate.getHours() * 60 + nowDate.getMinutes()) / 1440 : 1
	})
	if (days < 1) {
		return null
	}
	const daily = kwh / days
	return { daily, kwh: daily * b.length }
})
const costHour = computed(() => {
	if (!consumptionCurrent.value || view.value.w == null || !tariff.value.value_kwh) {
		return null
	}
	return costText(view.value.w / 1000, tariff.value, i18n.locale)
})
// the job that is running now (live job of the service, or a file the machine is running)
const running = computed(() => runningJob(pluginModel.value ? dataOf(pluginModel.value, 'liveJob') : null, machineModel(), now.value))
const budget = computed(() => budgetState(budgetLimit.value, monthKwh.value, projection.value ? projection.value.kwh : null))
const headerReasons = computed(() => {
	const out = liveState.value === 'dot-ok' ? [] : [{ level: 'warn', text: liveText.value }] // no meter data or stale readings
	const b = budget.value
	if (b.level === 'over' || b.level === 'near') {
		out.push({ level: 'warn', text: i18n.t('plugins.WorkshopPower.consumption.' + (b.level === 'over' ? 'budget_header_over' : 'budget_header_near'), { used: fmtKwh(monthKwh.value), limit: fmtKwh(b.limit) }) })
	}
	return out
})

// the role changed and the open section is no longer for it (meter settings): back to the summary
watch(sections, list => {
	if (!list.some(x => x.id === section.value)) {
		section.value = 'summary'
	}
})
// when the chosen meter changes: reload today / month; the sections reload by themselves
watch(meterView, v => {
	try {
		localStorage.setItem('workshopConsumptionMeter', v || '')
	} catch (e) {
		/* not critical */
	}
	loadSummaries()
})
watch(consumptionTs, ts => {
	if (ts && ts !== lastTs.value) {
		lastTs.value = ts
		lastReceived.value = Date.now()
	}
})

// the page is in view (DWC keeps it alive with keep-alive when going to another)
function pageVisible() {
	const el = root.value && root.value.$el
	return !(document.hidden || !el || el.isConnected === false)
}

onMounted(() => {
	if (consumptionCurrent.value) {
		lastTs.value = consumptionCurrent.value.ts
		lastReceived.value = Date.now()
	}
	loadTariff()
	loadSummaries()
	timerTick = setInterval(() => { now.value = Date.now() }, 5000)
	// Today/month refresh every minute
	timerRefresh = setInterval(() => {
		if (pageVisible()) loadSummaries()
	}, 60000)
	// Heartbeat (DCS load, 2026-10-12): WorkshopService reads the meter at full speed only while this page is visible;
	// without a heartbeat for 30 s it slows down (dsf/viewers.py). Same pattern as the trace view (src/_zones/47-job.js):
	// every 10 s, only if the tab and the page are visible.
	timerHeartbeat = setInterval(() => heartbeat(), 10000)
	heartbeat()
})
onBeforeUnmount(() => {
	clearInterval(timerTick)
	clearInterval(timerRefresh)
	clearInterval(timerHeartbeat)
})

function heartbeat() {
	if (!pageVisible()) return
	api('view.heartbeat', { topic: 'power' }).catch(() => {})
}
function setBudget(kwh) {
	budgetLimit.value = kwh > 0 ? kwh : 0
	saveLimit(budgetLimit.value)
}
function goAMeter() {
	meterOpen.value = true
	section.value = 'meter'
	nextTick(() => {
		const el = meterCard.value && meterCard.value.$el
		if (el) {
			el.scrollIntoView({ behavior: 'smooth', block: 'start' })
		}
	})
}
function onChangeMeter() {
	setTimeout(() => loadSummaries(), 35000)
}
function periodArgs(date, period) {
	return Object.assign({ period, date: asDateLocal(date) }, meterView.value ? { meter: meterView.value } : {})
}
async function loadSummaries() {
	const today = new Date()
	try {
		todayData.value = await api('energy.period', periodArgs(today, 'day'))
	} catch (e) {
		// the last value stays
	}
	try {
		monthData.value = await api('energy.period', periodArgs(today, 'month'))
	} catch (e) {
		// idem
	}
}
async function loadTariff() {
	try {
		tariff.value = await api('energy.rate_get', {})
	} catch (e) {
		// no rate yet: the defaults remain (no currency, 0)
	}
}
</script>
