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
						<v-btn v-for="m in modeButtons" :key="m" small :value="m">{{ groupName(m) }}</v-btn>
					</v-btn-toggle>
				</div>
				<div class="jobs-filters mt-2">
					<v-select
						v-model="sort" :items="sortItems" :label="$t('plugins.WorkshopPower.consumption.sort_label')"
						dense outlined hide-details class="jobs-sort"
					/>
					<v-btn-toggle v-model="grouping" mandatory dense color="primary" class="jobs-grouping" :aria-label="t('group_label')">
						<v-btn small value="none">{{ t('group_none') }}</v-btn>
						<v-btn small value="mode">{{ t('group_mode') }}</v-btn>
					</v-btn-toggle>
					<v-checkbox v-model="hideCancelled" dense hide-details class="mt-0 pt-0" :label="$t('plugins.WorkshopPower.consumption.hide_cancelled')" />
				</div>

				<div class="mt-2">
					<v-btn small text class="px-1" :aria-expanded="helpOpen ? 'true' : 'false'" @click="helpOpen = !helpOpen">
						<v-icon small left aria-hidden="true">mdi-help-circle-outline</v-icon>{{ t('group_help_btn') }}
					</v-btn>
					<ul v-if="helpOpen" class="jobs-help text-body-2">
						<li v-for="k in ['what', 'for', 'missing', 'how']" :key="k">{{ t('group_help_' + k) }}</li>
					</ul>
				</div>

				<job-summary v-if="filtered.length" :totals="sums" :breakdown="breakdown" :tariff="tariff" class="mt-3" />
			</v-card-text>
		</v-card>

		<v-card class="mb-3">
			<v-card-text>
				<template v-if="filtered.length && grouping === 'mode'">
					<section v-for="g in modeGroups" :key="g.id" class="mode-group" :data-group="g.id">
						<div
							class="mode-head" role="button" tabindex="0" :aria-expanded="isCollapsed(g.id) ? 'false' : 'true'"
							:aria-label="$t('plugins.WorkshopPower.consumption.group_toggle', { name: groupName(g.id) })"
							@click="toggleGroup(g.id)" @keydown.enter.prevent="toggleGroup(g.id)" @keydown.space.prevent="toggleGroup(g.id)"
						>
							<v-icon small aria-hidden="true">{{ isCollapsed(g.id) ? 'mdi-chevron-right' : 'mdi-chevron-down' }}</v-icon>
							<span class="mode-dot" :style="{ background: dotOf(g.id) }" aria-hidden="true" />
							<span class="mode-name">{{ groupName(g.id) }}</span>
							<span class="mode-figures">
								{{ $t('plugins.WorkshopPower.consumption.n_jobs', { n: g.n }) }} &middot; {{ fmtKwh(g.kwh) }} kWh<span v-if="costOf(g.kwh)"> &middot; {{ costOf(g.kwh) }}</span>
							</span>
							<span class="mode-avg">{{ $t('plugins.WorkshopPower.consumption.group_avg', { kwh: fmtKwh(g.avgKwh) }) }}<span v-if="costOf(g.avgKwh)"> &middot; {{ costOf(g.avgKwh) }}</span></span>
						</div>
						<div v-if="!isCollapsed(g.id)" class="mode-body">
							<job-item
								v-for="t in g.items" :key="t.key" :job="t" :expanded="!!open[t.key]" :power="powers[t.key] || null"
								:compare="compareOf(t)" :tariff="tariff" :max-kwh="maxKwh" @toggle="toggleJob(t)"
							/>
						</div>
					</section>
					<div class="mode-head mode-total">
						<span class="mode-name">{{ t('group_total') }}</span>
						<span class="mode-figures">
							{{ $t('plugins.WorkshopPower.consumption.n_jobs', { n: grand.n }) }} &middot; {{ fmtKwh(grand.kwh) }} kWh<span v-if="costOf(grand.kwh)"> &middot; {{ costOf(grand.kwh) }}</span>
						</span>
						<span class="mode-avg">{{ $t('plugins.WorkshopPower.consumption.group_avg', { kwh: fmtKwh(grand.avgKwh) }) }}<span v-if="costOf(grand.avgKwh)"> &middot; {{ costOf(grand.avgKwh) }}</span></span>
					</div>
					<div class="text-caption grey--text mt-1">{{ t('job_tap_hint') }} {{ t('units_hint') }}</div>
				</template>
				<template v-else-if="filtered.length">
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
						{{ loading ? $t('plugins.WorkshopPower.consumption.loading') : refusal || $t(hasActivity ? 'plugins.WorkshopPower.consumption.no_jobs_logged_yet_live_jobs' : 'plugins.WorkshopPower.consumption.no_jobs_logged_yet_live_jobs_no_activity') }}
					</div>
				</div>
			</v-card-text>
		</v-card>
	</div>
</template>

<script>
import { api } from './workshop-api.js'
import { roleMixin } from './role-mixin.js' // what the role may do (vue/_shared)
import { isRefusal } from './session-note.js'
import { refusalNow } from './session-now.js' // a refusal told by its cause
import RunningJob from './RunningJob.vue'
import JobSummary from './JobSummary.vue'
import JobItem from './JobItem.vue'
import { fmtKwh, costText } from './money.js'
import * as jobsLib from './jobs.js'
import * as ins from './job-insights.js'
import { buildJobs, dayGroups } from './job-list.js'
import { groupJobs, grandTotal, filterByGroup } from './job-groups.js'
import { loadGrouping, saveGrouping, loadCollapsed, saveCollapsed } from './job-groups-store.js'
import { colorMode } from './colors.js'
import { MODE_NAMES } from './machine-modes.js'
import { exchangeExportCsv } from './data-exchange-ui.js'

const LIMIT = 8 // jobs shown before "see all"

export default {
	mixins: [roleMixin],
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
			jobs: [],
			refused: null, // the last refusal (403 / 401) of the list: told by its cause instead of "no jobs logged"
			loading: false,
			days: 30,
			mode: 'all', // 'all' or a group id of job-groups.js (cnc, laser, fff, unknown)
			grouping: loadGrouping(), // 'none' | 'mode', remembered in this browser
			collapsed: loadCollapsed(), // ids of the folded groups, remembered in this browser
			helpOpen: false,
			hideCancelled: false,
			sort: 'recent',
			showAll: false,
			open: {}, // key of the job -> opened
			powers: {} // key of the job -> measured power of its period (energy.history, cached by job and meter)
		}
	},
	computed: {
		refusal() {
			void this.identityTick
			return refusalNow(this.refused, 'viewer')
		},
		sortItems() {
			return ['recent', 'energy', 'duration', 'power'].map(k => ({ text: this.t('sort_' + k), value: k }))
		},
		modeButtons() {
			return groupJobs(this.jobs).map(g => g.id)
		},
		filtered() {
			return filterByGroup(ins.filterJobs(this.jobs, { days: this.days, hideCancelled: this.hideCancelled }), this.mode)
		},
		modeGroups() {
			return groupJobs(this.sorted)
		},
		grand() {
			return grandTotal(this.filtered)
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
		grouping(v) {
			saveGrouping(v)
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
		// the person signed in / out or the role changed: the list is read again
		onSessionChange() {
			this.load()
		},
		t(k) {
			return this.$t('plugins.WorkshopPower.consumption.' + k)
		},
		groupName(id) {
			return this.t('group_' + id)
		},
		// the dot of a group: the color the mode has in Lights (colorMode); unknown has none
		dotOf(id) {
			return MODE_NAMES[id] ? colorMode(this.$store, MODE_NAMES[id]) : 'var(--tp-faint, #9e9e9e)'
		},
		isCollapsed(id) {
			return this.collapsed.includes(id)
		},
		toggleGroup(id) {
			this.collapsed = this.isCollapsed(id) ? this.collapsed.filter(x => x !== id) : this.collapsed.concat(id)
			saveCollapsed(this.collapsed)
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
			this.refused = null
			try {
				const today = new Date()
				const day = d => jobsLib.localDay(d.getTime())
				const data = await api('activity.list', { from: day(new Date(today.getTime() - 30 * 86400000)), to: day(today), type: 'job_end', limit: 100 })
				this.jobs = buildJobs(data.rows || [], this.t)
			} catch (e) {
				this.refused = isRefusal(e) ? e : null
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
			const table = ins.jobsTable(this.sorted, this.tariff.value_kwh)
			exchangeExportCsv('workshop-power-jobs', table.columns, table.rows)
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
.jobs-grouping {
	flex-wrap: wrap;
	height: auto;
}
.jobs-help {
	margin: 4px 0 0;
	padding-left: 20px;
	color: var(--tp-faint, #9e9e9e);
}
.mode-group {
	margin-bottom: 8px;
}
.mode-head {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 4px 10px;
	min-height: 44px;
	padding: 6px 4px;
	border-bottom: 1px solid rgba(128, 128, 128, 0.25);
	cursor: pointer;
}
.mode-total {
	cursor: default;
	font-weight: 600;
	border-bottom: 0;
	border-top: 2px solid rgba(128, 128, 128, 0.35);
}
.mode-dot {
	width: 10px;
	height: 10px;
	border-radius: 50%;
	flex: none;
}
.mode-name {
	font-weight: 600;
}
.mode-figures {
	font-variant-numeric: tabular-nums;
	margin-left: auto;
}
.mode-avg {
	flex-basis: 100%;
	font-size: 12px;
	font-weight: 400;
	color: var(--tp-faint, #9e9e9e);
	padding-left: 24px;
}
.mode-total .mode-avg {
	padding-left: 0;
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
