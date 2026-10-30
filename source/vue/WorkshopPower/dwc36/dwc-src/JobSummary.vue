<template>
	<div class="jsum">
		<div class="jsum-tiles">
			<div class="jsum-tile">
				<div class="jsum-label">{{ $t('plugins.WorkshopPower.consumption.sum_jobs') }}</div>
				<div class="jsum-value">{{ totals.n }}</div>
				<div class="jsum-sub">{{ $t('plugins.WorkshopPower.consumption.sum_time_sub', { dur: fmtDur(totals.durationS) }) }}</div>
			</div>
			<div class="jsum-tile">
				<div class="jsum-label">{{ $t('plugins.WorkshopPower.consumption.sum_energy') }}</div>
				<div class="jsum-value">{{ fmtKwh(totals.kwh) }}<small> kWh</small></div>
				<div class="jsum-sub">{{ $t('plugins.WorkshopPower.consumption.sum_max_sub', { kwh: fmtKwh(totals.maxKwh) }) }}</div>
			</div>
			<div class="jsum-tile">
				<div class="jsum-label">{{ $t('plugins.WorkshopPower.consumption.sum_cost') }}</div>
				<div class="jsum-value jsum-cost">{{ costOf(totals.kwh) || '--' }}</div>
				<div class="jsum-sub">{{ costOf(totals.kwh) ? perKwh : $t('plugins.WorkshopPower.consumption.sum_no_tariff') }}</div>
			</div>
			<div class="jsum-tile">
				<div class="jsum-label">{{ $t('plugins.WorkshopPower.consumption.sum_average') }}</div>
				<div class="jsum-value">{{ fmtKwh(totals.avgKwh) }}<small> kWh</small></div>
				<div class="jsum-sub">{{ costOf(totals.avgKwh) || NBSP }}</div>
			</div>
		</div>

		<div v-if="breakdown.length" class="jproc">
			<div class="jproc-title">{{ $t('plugins.WorkshopPower.consumption.by_process') }}</div>
			<div v-for="g in breakdown" :key="g.mode || 'none'" class="jproc-row">
				<div class="jproc-name">{{ g.mode || $t('plugins.WorkshopPower.consumption.process_no_mode') }}</div>
				<div class="jproc-track" role="img" :aria-label="Math.round(g.share * 100) + '%'"><span :style="{ width: Math.max(2, Math.round(g.share * 100)) + '%' }" /></div>
				<div class="jproc-num">{{ fmtKwh(g.kwh) }} kWh<span v-if="costOf(g.kwh)"> &middot; {{ costOf(g.kwh) }}</span></div>
				<div class="jproc-sub">{{ $t('plugins.WorkshopPower.consumption.process_row', { n: g.n, dur: fmtDur(g.durationS) }) }}</div>
			</div>
		</div>
	</div>
</template>

<script>
import { fmtKwh, costText } from './money.js'
import { fmtDur } from './jobs.js'

export default {
	props: {
		totals: { type: Object, required: true }, // totals() of job-insights.js
		breakdown: { type: Array, default: () => [] }, // modeBreakdown() of job-insights.js
		tariff: { type: Object, default: () => ({ currency: '', value_kwh: 0 }) }
	},
	data() {
		return { NBSP: ' ' }
	},
	computed: {
		perKwh() {
			return `${this.tariff.currency} ${this.tariff.value_kwh} / kWh`
		}
	},
	methods: {
		fmtKwh,
		fmtDur,
		costOf(kwh) {
			return costText(kwh, this.tariff, this.$i18n.locale)
		}
	}
}
</script>

<style scoped>
.jsum-tiles {
	display: grid;
	grid-template-columns: repeat(4, minmax(0, 1fr));
	gap: 10px;
}
.jsum-tile {
	background: rgba(128, 128, 128, 0.09);
	border-radius: 8px;
	padding: 10px 12px;
	min-width: 0;
}
.jsum-label {
	font-size: 12px;
	color: var(--tp-faint, #9e9e9e);
}
.jsum-value {
	font-size: 22px;
	font-weight: 500;
	line-height: 1.25;
	font-variant-numeric: tabular-nums;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
.jsum-value small {
	font-size: 13px;
	font-weight: 400;
	color: var(--tp-faint, #9e9e9e);
}
.jsum-cost {
	color: var(--tp-amber, #ffb300);
}
.jsum-sub {
	font-size: 12px;
	color: var(--tp-faint2, #bdbdbd);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
.jproc {
	margin-top: 14px;
}
.jproc-title {
	font-size: 12px;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.04em;
	color: var(--tp-faint, #9e9e9e);
	margin-bottom: 6px;
}
.jproc-row {
	display: grid;
	grid-template-columns: minmax(64px, 110px) minmax(0, 1fr) auto;
	grid-template-areas: 'name track num' '. sub sub';
	gap: 0 10px;
	align-items: center;
	padding: 4px 0;
}
.jproc-name {
	grid-area: name;
	font-weight: 500;
	overflow-wrap: anywhere;
}
.jproc-track {
	grid-area: track;
	height: 8px;
	border-radius: 4px;
	background: rgba(128, 128, 128, 0.18);
}
.jproc-track span {
	display: block;
	height: 100%;
	border-radius: 4px;
	background: var(--v-primary-base, #1976d2);
}
.jproc-num {
	grid-area: num;
	font-size: 13px;
	text-align: right;
	font-variant-numeric: tabular-nums;
	white-space: nowrap;
}
.jproc-sub {
	grid-area: sub;
	font-size: 12px;
	color: var(--tp-faint, #9e9e9e);
}
@media (max-width: 600px) {
	.jsum-tiles {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
	.jproc-row {
		grid-template-columns: minmax(0, 1fr) auto;
		grid-template-areas: 'name num' 'track track' 'sub sub';
		gap: 2px 10px;
	}
}
</style>
