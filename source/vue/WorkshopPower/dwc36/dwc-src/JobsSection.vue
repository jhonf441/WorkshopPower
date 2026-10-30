<template>
	<div class="jobs-section">
		<running-job :job="running" :tariff="tariff" :meter="meter" :watts="watts" />

		<v-card class="mb-3">
			<v-card-text>
				<div class="jobs-head">
					<div class="jobs-title">
						<v-icon small class="mr-1" color="primary">mdi-briefcase-clock-outline</v-icon>
						<span class="text-subtitle-1 font-weight-medium">{{ $t('plugins.WorkshopPower.consumption.jobs_title') }}</span>
					</div>
					<v-btn small outlined :disabled="!filtered.length" @click="exportCsv()">
						<v-icon small left>mdi-download</v-icon>{{ $t('plugins.WorkshopPower.consumption.export_csv') }}
					</v-btn>
				</div>
				<div class="text-caption grey--text mb-2">{{ $t('plugins.WorkshopPower.consumption.jobs_subtitle') }}</div>

				<div class="jobs-filters">
					<v-btn-toggle v-model="days" mandatory dense color="primary">
						<v-btn small :value="7">{{ $t('plugins.WorkshopPower.consumption.7_days') }}</v-btn>
						<v-btn small :value="30">{{ $t('plugins.WorkshopPower.consumption.30_days') }}</v-btn>
					</v-btn-toggle>
					<v-btn-toggle v-if="modeButtons.length > 1" v-model="mode" mandatory dense color="primary" class="jobs-modes">
						<v-btn small value="all">{{ $t('plugins.WorkshopPower.consumption.filter_all') }}</v-btn>
						<v-btn v-for="m in modeButtons" :key="m" small :value="m">{{ m === NONE ? $t('plugins.WorkshopPower.consumption.filter_no_mode') : m }}</v-btn>
					</v-btn-toggle>
				</div>
				<div class="jobs-filters mt-2">
					<v-select
						v-model="sort" :items="sortItems" :label="$t('plugins.WorkshopPower.consumption.sort_label')"
						dense outlined hide-details class="jobs-sort"
					/>
					<v-checkbox v-model="hideCancelled" dense hide-details class="mt-0 pt-0" :label="$t('plugins.WorkshopPower.consumption.hide_cancelled')" />
				</div>

				<job-summary v-if="filtered.length" :totals="sums" :breakdown="breakdown" :tariff="tariff" class="mt-3" />
			</v-card-text>
		</v-card>

		<v-card class="mb-3">
			<v-card-text>
				<template v-if="filtered.length">
					<template v-for="g in groups">
						<!-- more than 8 jobs, newest first: one header per day with the totals of that day -->
						<div v-if="g.day" :key="'d' + g.day" class="job-day">
							<span class="font-weight-medium">{{ g.date }}</span>
							<span>{{ $t('plugins.WorkshopPower.consumption.n_jobs', { n: g.n }) }} &middot; {{ fmtKwh(g.kwh) }} kWh<span v-if="costOf(g.kwh)"> &middot; {{ costOf(g.kwh) }}</span></span>
						</div>
						<job-item
							v-for="t in g.items" :key="t.key" :job="t" :expanded="!!open[t.key]" :power="powers[t.key] || null"
							:compare="compareOf(t)" :tariff="tariff" :max-kwh="maxKwh" @toggle="toggleJob(t)"
						/>
					</template>
					<div class="text-caption grey--text mt-1">{{ $t('plugins.WorkshopPower.consumption.job_tap_hint') }} {{ $t('plugins.WorkshopPower.consumption.units_hint') }}</div>
					<v-btn v-if="sorted.length > LIMIT" small text color="primary" class="mt-1" @click="showAll = !showAll">
						{{ showAll ? $t('plugins.WorkshopPower.consumption.see_less') : $t('plugins.WorkshopPower.consumption.see_all_n', { n: sorted.length }) }}
					</v-btn>
				</template>
				<div v-else-if="jobs.length" class="jobs-empty">
					<v-icon large color="grey" aria-hidden="true">mdi-filter-off-outline</v-icon>
					<div class="text-body-2">{{ $t('plugins.WorkshopPower.consumption.no_jobs_in_filter') }}</div>
					<v-btn small outlined @click="clearFilters()">{{ $t('plugins.WorkshopPower.consumption.clear_filters') }}</v-btn>
				</div>
				<div v-else class="jobs-empty">
					<v-icon large color="grey" aria-hidden="true">mdi-briefcase-clock-outline</v-icon>
					<div class="text-body-2">
						{{ loading ? $t('plugins.WorkshopPower.consumption.loading') : $t(hasActivity ? 'plugins.WorkshopPower.consumption.no_jobs_logged_yet_live_jobs' : 'plugins.WorkshopPower.consumption.no_jobs_logged_yet_live_jobs_no_activity') }}
					</div>
				</div>
			</v-card-text>
		</v-card>
	</div>
</template>

<script>
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

export default {
	components: { RunningJob, JobSummary, JobItem },
	props: {
		tariff: { type: Object, default: () => ({ currency: '', value_kwh: 0 }) },
		meter: { type: String, default: '' }, // '' = the main meter, 'total' or the key of a meter
		hasActivity: { type: Boolean, default: false },
		running: { type: Object, default: null }, // runningJob() of job-insights.js
		watts: { type: Number, default: null }
	},
	data() {
		return {
			LIMIT,
			NONE,
			jobs: [],
			loading: false,
			days: 30,
			mode: 'all',
			hideCancelled: false,
			sort: 'recent',
			showAll: false,
			open: {}, // key of the job -> opened
			powers: {} // key of the job -> measured power of its period (energy.history, cached by job and meter)
		}
	},
	computed: {
		sortItems() {
			return ['recent', 'energy', 'duration', 'power'].map(k => ({ text: this.t('sort_' + k), value: k }))
		},
		modeButtons() {
			return ins.modesOf(this.jobs).map(m => m || NONE)
		},
		filtered() {
			return ins.filterJobs(this.jobs, { days: this.days, mode: this.mode === NONE ? ins.NO_MODE : this.mode, hideCancelled: this.hideCancelled })
		},
		sorted() {
			return ins.sortJobs(this.filtered, this.sort)
		},
		shown() {
			return this.showAll ? this.sorted : this.sorted.slice(0, LIMIT)
		},
		sums() {
			return ins.totals(this.filtered)
		},
		breakdown() {
			return ins.modeBreakdown(this.filtered)
		},
		maxKwh() {
			return this.sums.maxKwh || 0
		},
		// by day only while the list is newest first; any other order is one list
		groups() {
			return this.sort === 'recent' ? dayGroups(this.sorted, this.shown, LIMIT, this.t) : [{ day: null, items: this.shown }]
		}
	},
	watch: {
		// the mode chosen no longer exists (another meter, other days): back to all
		modeButtons(list) {
			if (this.mode !== 'all' && !list.includes(this.mode)) this.mode = 'all'
		},
		meter() {
			this.powers = {}
			this.jobs.filter(j => this.open[j.key]).forEach(j => this.loadPower(j))
		}
	},
	mounted() {
		this.load()
	},
	methods: {
		fmtKwh,
		t(k) {
			return this.$t('plugins.WorkshopPower.consumption.' + k)
		},
		costOf(kwh) {
			return costText(kwh, this.tariff, this.$i18n.locale)
		},
		compareOf(job) {
			return ins.compareJob(job, this.jobs)
		},
		clearFilters() {
			this.days = 30
			this.mode = 'all'
			this.hideCancelled = false
		},
		async load() {
			this.loading = true
			try {
				const today = new Date()
				const day = d => jobsLib.localDay(d.getTime())
				const data = await api('activity.list', { from: day(new Date(today.getTime() - 30 * 86400000)), to: day(today), type: 'job_end', limit: 100 })
				this.jobs = buildJobs(data.rows || [], this.t)
			} catch (e) {
				this.jobs = []
			} finally {
				this.loading = false
			}
		},
		toggleJob(job) {
			const opened = !this.open[job.key]
			this.$set(this.open, job.key, opened)
			if (opened) this.loadPower(job)
		},
		// Peak / average power of the period of the job, loaded once per job and meter.
		async loadPower(job) {
			const meter = this.meter || ''
			const cur = this.powers[job.key]
			if (cur && (cur.loading || cur.ok) && cur.meter === meter) return
			this.$set(this.powers, job.key, { loading: true, ok: false, meter })
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
			this.$set(this.powers, job.key, res)
		},
		exportCsv() {
			const labels = {}
			;['start', 'end', 'name', 'mode', 'zone', 'material', 'duration_s', 'kwh', 'avg_w', 'cost', 'origin', 'cancelled', 'file', 'yes', 'no'].forEach(k => { labels[k] = this.t('csv_' + k) })
			downloadText('workshop-power-jobs.csv', ins.jobsCsv(this.sorted, labels, this.tariff.value_kwh))
		}
	}
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
