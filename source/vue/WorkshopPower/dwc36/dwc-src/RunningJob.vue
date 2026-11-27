<template>
	<!-- a group of the card (summary and jobs): the job running now, its figures in the family's .wf-stat -->
	<div v-if="job" class="wf-group running">
		<div class="running-head">
			<span class="wf-dot ok running-dot" aria-hidden="true" />
			<h4 class="wf-group-title running-title">{{ $t('plugins.WorkshopPower.consumption.running_title') }}</h4>
			<span class="wf-chip">{{ $t(job.kind === 'live' ? 'plugins.WorkshopPower.consumption.running_live' : 'plugins.WorkshopPower.consumption.running_file') }}</span>
			<span v-if="job.name" class="running-name">{{ job.name }}</span>
		</div>
		<div class="wf-stats running-tiles">
			<div class="wf-stat">
				<div class="wf-stat-label">{{ $t('plugins.WorkshopPower.consumption.running_elapsed') }}</div>
				<div class="wf-stat-value">{{ fmtDur(elapsedS) }}</div>
			</div>
			<div class="wf-stat">
				<div class="wf-stat-label">{{ $t('plugins.WorkshopPower.consumption.running_energy') }}</div>
				<div class="wf-stat-value">{{ data ? fmtKwh(data.kwh) : '--' }} <span class="wp-unit">kWh</span></div>
				<div class="wp-sub">{{ data && data.peak != null ? $t('plugins.WorkshopPower.consumption.running_peak', { w: Math.round(data.peak) }) : NBSP }}</div>
			</div>
			<div class="wf-stat">
				<div class="wf-stat-label">{{ $t('plugins.WorkshopPower.consumption.running_cost') }}</div>
				<div class="wf-stat-value">{{ (data && costOf(data.kwh)) || '--' }}</div>
				<div class="wp-sub">{{ costOf(1) ? NBSP : $t('plugins.WorkshopPower.consumption.running_no_tariff') }}</div>
			</div>
			<div class="wf-stat">
				<div class="wf-stat-label">{{ $t('plugins.WorkshopPower.consumption.running_power') }}</div>
				<div class="wf-stat-value">{{ watts != null ? Math.round(watts) : '--' }} <span class="wp-unit">W</span></div>
				<div class="wp-sub">{{ pace || NBSP }}</div>
			</div>
		</div>
		<div v-if="loaded && !data" class="wp-note">{{ $t('plugins.WorkshopPower.consumption.running_no_readings') }}</div>
	</div>
</template>

<script>
import { api } from './workshop-api.js'
import { roleMixin } from './role-mixin.js' // vue/_shared36
import { fmtKwh, costText } from './money.js'
import { fmtDur, localIso } from './jobs.js'

export default {
	mixins: [roleMixin],
	sessionData: ['data', 'loaded'], // the energy of the job the previous person read stays in no field
	props: {
		job: { type: Object, default: null }, // runningJob() of job-insights.js, or null
		tariff: { type: Object, default: () => ({ currency: '', value_kwh: 0 }) },
		meter: { type: String, default: '' },
		watts: { type: Number, default: null } // power now (live reading)
	},
	data() {
		return { NBSP: ' ', data: null, loaded: false, now: Date.now(), timerTick: null, timerLoad: null }
	},
	computed: {
		elapsedS() {
			return this.job ? Math.max(0, Math.round((this.now - this.job.startMs) / 1000)) : 0
		},
		pace() {
			const c = this.watts != null ? this.costOf(this.watts / 1000) : null
			return c ? this.$t('plugins.WorkshopPower.consumption.running_pace', { cost: c }) : ''
		}
	},
	watch: {
		'job.startMs'() {
			this.data = null
			this.loaded = false
			this.load()
		},
		meter() {
			this.load()
		}
	},
	mounted() {
		this.load()
		this.timerTick = setInterval(() => { this.now = Date.now() }, 5000)
		this.timerLoad = setInterval(() => this.load(), 30000)
	},
	beforeDestroy() {
		clearInterval(this.timerTick)
		clearInterval(this.timerLoad)
	},
	methods: {
		fmtKwh,
		fmtDur,
		costOf(kwh) {
			return costText(kwh, this.tariff, this.$i18n.locale)
		},
		// energy of the job so far: the readings between its start and now (+10 min: the clock of the Pi runs a bit ahead)
		async load() {
			if (!this.job || document.hidden) return
			try {
				const args = { from: localIso(this.job.startMs), to: localIso(Date.now() + 10 * 60000), limit: 1 }
				if (this.meter) args.meter = this.meter
				const r = await api('energy.history', args)
				const s = r && r.summary
				this.data = s && s.samples ? { kwh: s.consumption_kwh, peak: s.peak_w, avg: s.average_w } : null
			} catch (e) {
				// stays with the last value
			} finally {
				this.loaded = true
			}
		}
	}
}
</script>

<style scoped>
.running-head {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 6px 8px;
	margin-bottom: 8px;
}
.running-title {
	margin: 0;
}
.running-name {
	font-size: 13px;
	opacity: 0.7;
	overflow-wrap: anywhere;
}
/* the dot of the family (.wf-dot.ok) breathes while the job runs */
.running-dot {
	animation: pw-pulse 2s infinite;
}
@keyframes pw-pulse {
	0% { box-shadow: 0 0 0 0 rgba(102, 187, 106, 0.6); }
	70% { box-shadow: 0 0 0 7px rgba(102, 187, 106, 0); }
	100% { box-shadow: 0 0 0 0 rgba(102, 187, 106, 0); }
}
@media (prefers-reduced-motion: reduce) {
	.running-dot {
		animation: none;
	}
}
</style>
