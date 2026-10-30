<template>
	<div class="job" :class="{ open: expanded, 'job-cancelled': job.cancelled }">
		<div
			class="job-head" role="button" tabindex="0" :aria-expanded="expanded ? 'true' : 'false'"
			:aria-label="$t(expanded ? 'plugins.WorkshopPower.consumption.job_close' : 'plugins.WorkshopPower.consumption.job_open', { name: job.name })"
			@click="$emit('toggle')" @keydown.enter.prevent="$emit('toggle')" @keydown.space.prevent="$emit('toggle')"
		>
			<div class="job-main">
				<div class="job-title">
					<span class="job-name">{{ job.name }}</span>
					<v-chip v-if="job.origin === 'both'" x-small outlined color="info">{{ $t('plugins.WorkshopPower.consumption.origin_both') }}</v-chip>
					<v-chip v-if="job.cancelled" x-small outlined color="warning">{{ $t('plugins.WorkshopPower.consumption.cancelled') }}</v-chip>
				</div>
				<div class="job-meta">
					{{ job.date }}<template v-if="job.mode"> &middot; {{ job.mode }}</template><template v-if="job.material"> &middot; {{ job.material }}</template> &middot; {{ job.duration }}
				</div>
			</div>
			<div class="job-figures">
				<div class="job-kwh">{{ job.kwh != null ? fmtKwh(job.kwh) : '--' }}<small> kWh</small></div>
				<div class="job-cost">{{ costOf(job.kwh) || NBSP }}</div>
			</div>
			<v-icon small class="job-arrow" aria-hidden="true">{{ expanded ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
			<div v-if="job.kwh != null" class="job-bar" role="img" :aria-label="$t('plugins.WorkshopPower.consumption.job_energy_bar')"><span :style="{ width: barPct + '%' }" /></div>
		</div>
		<v-expand-transition>
			<div v-if="expanded" class="job-detail">
				<div class="det-grid">
					<div v-for="d in details" :key="d.k" class="det-item" :class="{ wide: d.width }">
						<div class="det-label">{{ d.label }}</div>
						<div class="det-value">{{ d.value }}</div>
					</div>
				</div>
				<div v-if="job.origin === 'both'" class="det-note">{{ $t('plugins.WorkshopPower.consumption.merged_hint') }}</div>

				<div class="det-block">
					<div class="det-label">{{ $t('plugins.WorkshopPower.consumption.job_measured') }}</div>
					<div v-if="!power || power.loading" class="det-note">{{ $t('plugins.WorkshopPower.consumption.loading') }}</div>
					<div v-else-if="!power.ok" class="det-note">{{ $t('plugins.WorkshopPower.consumption.job_no_readings') }}</div>
					<div v-else class="det-power">
						<span>{{ $t('plugins.WorkshopPower.consumption.peak') }}: <b>{{ Math.round(power.peak) }} W</b></span>
						<span>{{ $t('plugins.WorkshopPower.consumption.average') }}: <b>{{ Math.round(power.avg) }} W</b></span>
						<svg v-if="power.points" class="det-spark" viewBox="0 0 160 28" preserveAspectRatio="none" aria-hidden="true">
							<polyline :points="power.points" fill="none" stroke="var(--tp-amber, #ffb300)" stroke-width="1.5" vector-effect="non-scaling-stroke" />
						</svg>
					</div>
				</div>

				<div v-if="job.kwh != null && !job.cancelled" class="det-block">
					<div class="det-label">{{ $t('plugins.WorkshopPower.consumption.compare_title') }}</div>
					<div v-if="!compare" class="det-note">{{ $t('plugins.WorkshopPower.consumption.compare_none') }}</div>
					<template v-else>
						<v-chip small outlined :color="compareColor" class="mb-1">
							<v-icon x-small left>{{ compareIcon }}</v-icon>{{ compareText }}
						</v-chip>
						<div class="det-note">{{ $t('plugins.WorkshopPower.consumption.compare_basis', { n: compare.n, avg: fmtKwh(compare.avgKwh), min: fmtKwh(compare.minKwh), max: fmtKwh(compare.maxKwh) }) }}</div>
					</template>
				</div>
			</div>
		</v-expand-transition>
	</div>
</template>

<script>
import { fmtKwh, costText } from './money.js'
import { jobDetails } from './job-list.js'

export default {
	props: {
		job: { type: Object, required: true },
		expanded: { type: Boolean, default: false },
		power: { type: Object, default: null }, // peak / average / sparkline measured in the period of the job
		compare: { type: Object, default: null }, // compareJob() result
		tariff: { type: Object, default: () => ({ currency: '', value_kwh: 0 }) },
		maxKwh: { type: Number, default: 0 } // the largest energy of the list: the bar of this job is its share
	},
	data() {
		return { NBSP: ' ' }
	},
	computed: {
		barPct() {
			return this.maxKwh > 0 && this.job.kwh != null ? Math.max(2, Math.round(this.job.kwh / this.maxKwh * 100)) : 0
		},
		details() {
			return jobDetails(this.job, k => this.$t('plugins.WorkshopPower.consumption.' + k), this.tariff, this.$i18n.locale)
		},
		flat() {
			return !this.compare || this.compare.pct == null || Math.abs(this.compare.pct) < 5
		},
		compareColor() {
			return this.flat ? 'grey' : this.compare.pct > 0 ? 'warning' : 'success'
		},
		compareIcon() {
			return this.flat ? 'mdi-equal' : this.compare.pct > 0 ? 'mdi-arrow-up' : 'mdi-arrow-down'
		},
		compareText() {
			if (this.flat) return this.$t('plugins.WorkshopPower.consumption.compare_same')
			return this.compare.pct > 0 ? this.$t('plugins.WorkshopPower.consumption.compare_more', { pct: this.compare.pct }) : this.$t('plugins.WorkshopPower.consumption.compare_less', { pct: -this.compare.pct })
		}
	},
	methods: {
		fmtKwh,
		costOf(kwh) {
			return costText(kwh, this.tariff, this.$i18n.locale)
		}
	}
}
</script>

<style scoped>
.job {
	border: 1px solid rgba(128, 128, 128, 0.28);
	border-radius: 8px;
	margin-bottom: 8px;
	background: transparent;
	overflow: hidden;
}
.job.open {
	background: rgba(128, 128, 128, 0.09);
}
.job-cancelled {
	opacity: 0.8;
}
.job-head {
	position: relative;
	display: grid;
	grid-template-columns: minmax(0, 1fr) auto 20px;
	gap: 4px 12px;
	align-items: center;
	padding: 10px 12px 14px;
	cursor: pointer;
	min-height: 48px;
}
.job-head:focus-visible {
	outline: 2px solid var(--v-primary-base, #1976d2);
	outline-offset: -2px;
}
.job-title {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 4px 6px;
}
.job-name {
	font-weight: 500;
	overflow-wrap: anywhere;
}
.job-meta {
	font-size: 12px;
	color: var(--tp-faint, #9e9e9e);
	margin-top: 2px;
}
.job-figures {
	text-align: right;
	font-variant-numeric: tabular-nums;
}
.job-kwh {
	font-size: 18px;
	font-weight: 500;
	line-height: 1.2;
	white-space: nowrap;
}
.job-kwh small {
	font-size: 12px;
	font-weight: 400;
	color: var(--tp-faint, #9e9e9e);
}
.job-cost {
	font-size: 12px;
	color: var(--tp-amber, #ffb300);
	white-space: nowrap;
}
.job-arrow {
	color: var(--tp-faint, #9e9e9e);
}
.job-bar {
	position: absolute;
	left: 12px;
	right: 12px;
	bottom: 6px;
	height: 3px;
	border-radius: 2px;
	background: rgba(128, 128, 128, 0.18);
}
.job-bar span {
	display: block;
	height: 100%;
	border-radius: 2px;
	background: var(--tp-amber, #ffb300);
}
.job-detail {
	padding: 4px 12px 12px;
	border-top: 1px solid rgba(128, 128, 128, 0.2);
}
.det-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
	gap: 8px 12px;
	margin-top: 8px;
}
.det-item.wide {
	grid-column: 1 / -1;
}
.det-label {
	font-size: 12px;
	color: var(--tp-faint, #9e9e9e);
}
.det-value {
	font-size: 14px;
	font-variant-numeric: tabular-nums;
	overflow-wrap: anywhere;
}
.det-note {
	font-size: 12px;
	color: var(--tp-faint, #9e9e9e);
	margin-top: 2px;
}
.det-block {
	margin-top: 12px;
	padding-top: 8px;
	border-top: 1px dashed rgba(128, 128, 128, 0.25);
}
.det-power {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 8px 16px;
	font-size: 14px;
}
.det-spark {
	width: 160px;
	height: 28px;
}
@media (max-width: 480px) {
	.job-head {
		grid-template-columns: minmax(0, 1fr) auto;
	}
	.job-arrow {
		display: none;
	}
}
</style>
