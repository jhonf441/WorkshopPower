<template>
	<div class="jobs-section">
		<running-job :job="running" :tariff="tariff" :meter="meter" :watts="watts" />

		<v-card class="mb-3">
			<v-card-text>
				<div class="jobs-head">
					<div class="jobs-title">
						<v-icon size="small" class="mr-1" color="primary">mdi-briefcase-clock-outline</v-icon>
						<span class="text-title-medium font-weight-medium">{{ $t('plugins.WorkshopPower.consumption.jobs_title') }}</span>
					</div>
					<v-btn size="small" variant="outlined" :disabled="!filtered.length" @click="exportCsv()">
						<v-icon size="small" start>mdi-download</v-icon>{{ $t('plugins.WorkshopPower.consumption.export_csv') }}
					</v-btn>
				</div>
				<div class="text-body-small text-medium-emphasis mb-2">{{ $t('plugins.WorkshopPower.consumption.jobs_subtitle') }}</div>

				<div class="jobs-filters">
					<v-btn-toggle v-model="days" mandatory density="compact" color="primary">
						<v-btn size="small" :value="7">{{ $t('plugins.WorkshopPower.consumption.7_days') }}</v-btn>
						<v-btn size="small" :value="30">{{ $t('plugins.WorkshopPower.consumption.30_days') }}</v-btn>
					</v-btn-toggle>
					<v-btn-toggle v-if="modeButtons.length > 1" v-model="mode" mandatory density="compact" color="primary" class="jobs-modes">
						<v-btn size="small" value="all">{{ $t('plugins.WorkshopPower.consumption.filter_all') }}</v-btn>
						<v-btn v-for="m in modeButtons" :key="m" size="small" :value="m">{{ m === NONE ? $t('plugins.WorkshopPower.consumption.filter_no_mode') : m }}</v-btn>
					</v-btn-toggle>
				</div>
				<div class="jobs-filters mt-2">
					<v-select
						v-model="sort" :items="sortItems" :label="$t('plugins.WorkshopPower.consumption.sort_label')"
						density="compact" variant="outlined" hide-details class="jobs-sort"
					/>
					<v-checkbox v-model="hideCancelled" density="compact" hide-details :label="$t('plugins.WorkshopPower.consumption.hide_cancelled')" />
				</div>

				<job-summary v-if="filtered.length" :totals="sums" :breakdown="breakdown" :tariff="tariff" class="mt-3" />
			</v-card-text>
		</v-card>

		<v-card class="mb-3">
			<v-card-text>
				<template v-if="filtered.length">
					<template v-for="g in groups" :key="g.day || 'all'">
						<!-- more than 8 jobs, newest first: one header per day with the totals of that day -->
						<div v-if="g.day" class="job-day">
							<span class="font-weight-medium">{{ g.date }}</span>
							<span>{{ $t('plugins.WorkshopPower.consumption.n_jobs', { n: g.n }) }} &middot; {{ fmtKwh(g.kwh) }} kWh<span v-if="costOf(g.kwh)"> &middot; {{ costOf(g.kwh) }}</span></span>
						</div>
						<job-item
							v-for="t in g.items" :key="t.key" :job="t" :expanded="!!open[t.key]" :power="powers[t.key] || null"
							:compare="compareOf(t)" :tariff="tariff" :max-kwh="maxKwh" @toggle="toggleJob(t)"
						/>
					</template>
					<div class="text-body-small text-medium-emphasis mt-1">{{ $t('plugins.WorkshopPower.consumption.job_tap_hint') }} {{ $t('plugins.WorkshopPower.consumption.units_hint') }}</div>
					<v-btn v-if="sorted.length > LIMIT" size="small" variant="text" color="primary" class="mt-1" @click="showAll = !showAll">
						{{ showAll ? $t('plugins.WorkshopPower.consumption.see_less') : $t('plugins.WorkshopPower.consumption.see_all_n', { n: sorted.length }) }}
					</v-btn>
				</template>
				<div v-else-if="jobs.length" class="jobs-empty">
					<v-icon size="large" color="grey" aria-hidden="true">mdi-filter-off-outline</v-icon>
					<div class="text-body-medium">{{ $t('plugins.WorkshopPower.consumption.no_jobs_in_filter') }}</div>
					<v-btn size="small" variant="outlined" @click="clearFilters()">{{ $t('plugins.WorkshopPower.consumption.clear_filters') }}</v-btn>
				</div>
				<div v-else class="jobs-empty">
					<v-icon size="large" color="grey" aria-hidden="true">mdi-briefcase-clock-outline</v-icon>
					<div class="text-body-medium">
						{{ loading ? $t('plugins.WorkshopPower.consumption.loading') : $t(hasActivity ? 'plugins.WorkshopPower.consumption.no_jobs_logged_yet_live_jobs' : 'plugins.WorkshopPower.consumption.no_jobs_logged_yet_live_jobs_no_activity') }}
					</div>
				</div>
			</v-card-text>
		</v-card>
	</div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { i18n } from './dwc-host.js'
import { api } from './workshop-api.js'
import RunningJob from './RunningJob.vue'
import JobSummary from './JobSummary.vue'
import JobItem from './JobItem.vue'
import { fmtKwh, costText } from './money.js'
import * as jobsLib from './jobs.js'
import * as ins from './job-insights.js'
import { buildJobs, dayGroups } from './job-list.js'
import { downloadText } from './download.js'

const LIMIT = 8 // jobs shown before "see all"
const NONE = '__none' // the buttons of a group cannot carry an empty value: the jobs without a mode use this one
const props = defineProps({
	tariff: { type: Object, default: () => ({ currency: '', value_kwh: 0 }) },
	meter: { type: String, default: '' }, // '' = the main meter, 'total' or the key of a meter
	hasActivity: { type: Boolean, default: false },
	running: { type: Object, default: null }, // runningJob() of job-insights.js
	watts: { type: Number, default: null }
})

const jobs = ref([])
const loading = ref(false)
const days = ref(30)
const mode = ref('all')
const hideCancelled = ref(false)
const sort = ref('recent')
const showAll = ref(false)
const open = ref({}) // key of the job -> opened
const powers = ref({}) // key of the job -> measured power of its period (energy.history, cached by job and meter)

const t = k => i18n.t('plugins.WorkshopPower.consumption.' + k)
function costOf(kwh) {
	return costText(kwh, props.tariff, i18n.locale)
}

const sortItems = computed(() => ['recent', 'energy', 'duration', 'power'].map(k => ({ title: t('sort_' + k), value: k })))
const modes = computed(() => ins.modesOf(jobs.value))
const modeButtons = computed(() => modes.value.map(m => m || NONE))
const filtered = computed(() => ins.filterJobs(jobs.value, { days: days.value, mode: mode.value === NONE ? ins.NO_MODE : mode.value, hideCancelled: hideCancelled.value }))
const sorted = computed(() => ins.sortJobs(filtered.value, sort.value))
const shown = computed(() => (showAll.value ? sorted.value : sorted.value.slice(0, LIMIT)))
const sums = computed(() => ins.totals(filtered.value))
const breakdown = computed(() => ins.modeBreakdown(filtered.value))
const maxKwh = computed(() => sums.value.maxKwh || 0)
// by day only while the list is newest first; any other order is one list
const groups = computed(() => (sort.value === 'recent' ? dayGroups(sorted.value, shown.value, LIMIT, t) : [{ day: null, items: shown.value }]))

// the mode chosen no longer exists (another meter, other days): back to all
watch(modeButtons, list => {
	if (mode.value !== 'all' && !list.includes(mode.value)) mode.value = 'all'
})
watch(() => props.meter, () => {
	powers.value = {}
	jobs.value.filter(j => open.value[j.key]).forEach(j => loadPower(j))
})

onMounted(() => load())

function compareOf(job) {
	return ins.compareJob(job, jobs.value)
}
function clearFilters() {
	days.value = 30
	mode.value = 'all'
	hideCancelled.value = false
}
function ymd(d) {
	return jobsLib.localDay(d.getTime())
}
async function load() {
	loading.value = true
	try {
		const today = new Date()
		const data = await api('activity.list', { from: ymd(new Date(today.getTime() - 30 * 86400000)), to: ymd(today), type: 'job_end', limit: 100 })
		jobs.value = buildJobs(data.rows || [], t)
	} catch (e) {
		jobs.value = []
	} finally {
		loading.value = false
	}
}
function toggleJob(job) {
	const opened = !open.value[job.key]
	open.value[job.key] = opened
	if (opened) loadPower(job)
}
// Peak / average power of the period of the job, loaded once per job and meter.
async function loadPower(job) {
	const meter = props.meter || ''
	const cur = powers.value[job.key]
	if (cur && (cur.loading || cur.ok) && cur.meter === meter) return
	powers.value[job.key] = { loading: true, ok: false, meter }
	// a job without duration: the last minute before its end
	const from = job.end - Math.max(job.durationS, 60) * 1000
	let res = { loading: false, ok: false, meter }
	try {
		const data = await api('energy.history', Object.assign({ from: jobsLib.localIso(from), to: jobsLib.localIso(job.end), limit: 1 }, meter ? { meter } : {}))
		const r = data && data.summary
		if (r && r.samples) {
			res = { loading: false, ok: true, meter, peak: r.peak_w || 0, avg: r.average_w || 0, kwh: r.consumption_kwh, points: jobsLib.sparkPoints(data.serial, 160, 28, 80) }
		}
	} catch (e) {
		// stays "no readings"; opening the row again retries
	}
	powers.value[job.key] = res
}
function exportCsv() {
	const labels = {}
	;['start', 'end', 'name', 'mode', 'zone', 'material', 'duration_s', 'kwh', 'avg_w', 'cost', 'origin', 'cancelled', 'file', 'yes', 'no'].forEach(k => { labels[k] = t('csv_' + k) })
	downloadText('workshop-power-jobs.csv', ins.jobsCsv(sorted.value, labels, props.tariff.value_kwh))
}
</script>

<style scoped>
.jobs-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	flex-wrap: wrap;
	gap: 8px;
}
.jobs-title {
	display: flex;
	align-items: center;
}
.jobs-filters {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 8px 16px;
}
.jobs-modes {
	flex-wrap: wrap;
	height: auto;
}
.jobs-sort {
	max-width: 220px;
	min-width: 160px;
}
.job-day {
	display: flex;
	justify-content: space-between;
	flex-wrap: wrap;
	gap: 4px 8px;
	font-size: 12px;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.04em;
	color: var(--tp-faint, #9e9e9e);
	padding: 12px 0 6px;
}
.job-day:first-child {
	padding-top: 0;
}
.jobs-empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8px;
	text-align: center;
	padding: 24px 8px;
	color: var(--tp-faint, #9e9e9e);
}
</style>
