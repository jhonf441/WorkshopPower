<template>
	<!-- ===== Energy per period (bars) ===== -->
	<v-card class="mb-3">
		<v-card-text>
			<div class="d-flex align-center justify-space-between flex-wrap" style="gap:8px">
				<div class="text-subtitle-1 font-weight-medium">
					<v-icon small class="mr-1" color="primary">mdi-chart-bar</v-icon>{{ $t('plugins.WorkshopPower.consumption.energy_per_period') }}
				</div>
				<div class="d-flex align-center flex-wrap" style="gap:8px">
					<v-btn-toggle v-model="periodTab" mandatory dense color="primary">
						<v-btn small value="day">{{ $t('plugins.WorkshopPower.consumption.day') }}</v-btn>
						<v-btn small value="month">{{ $t('plugins.WorkshopPower.consumption.month') }}</v-btn>
						<v-btn small value="year">{{ $t('plugins.WorkshopPower.consumption.year') }}</v-btn>
					</v-btn-toggle>
					<v-btn small outlined :disabled="!periodData || !periodData.buckets" @click="exportCsv()">
						<v-icon small left>mdi-download</v-icon>{{ $t('plugins.WorkshopPower.consumption.export_csv') }}
					</v-btn>
				</div>
			</div>

			<div class="d-flex align-center justify-center mt-2">
				<v-btn icon small :aria-label="$t('plugins.WorkshopPower.shared.aria_previous')" @click="navigatePeriod(-1)"><v-icon>mdi-chevron-left</v-icon></v-btn>
				<span class="text-subtitle-2 mx-2 period-label">{{ periodData ? periodData.label : '--' }}</span>
				<v-btn icon small :aria-label="$t('plugins.WorkshopPower.shared.aria_next')" :disabled="isPeriodCurrent" @click="navigatePeriod(1)"><v-icon>mdi-chevron-right</v-icon></v-btn>
				<v-btn v-if="!isPeriodCurrent" x-small text color="primary" @click="goOnCurrent()">{{ textCurrent }}</v-btn>
			</div>

			<div class="period-summary">
				<div>
					<div class="period-total">
						{{ periodData && periodData.total_kwh != null ? fmtKwh(periodData.total_kwh) : '--' }}
						<span class="text-h6 grey--text">kWh</span>
					</div>
					<div v-if="periodData" class="text-body-2 grey--text">
						{{ costOf(periodData.total_kwh) }}
						<span v-if="comparison" :class="comparison.cssClass" class="ml-2">
							<v-icon small :color="comparison.color">{{ comparison.icon }}</v-icon>
							{{ comparison.text }}
						</span>
					</div>
				</div>
				<div v-if="stats" class="period-stats">
					<div>
						<div class="tile-label">{{ $t('plugins.WorkshopPower.consumption.average_per_unit', { unit: unitBucket }) }}</div>
						<div class="text-body-1">{{ fmtKwh(stats.average) }} kWh</div>
					</div>
					<div>
						<div class="tile-label">{{ $t('plugins.WorkshopPower.consumption.highest_usage_unit', { unit: capital(unitBucket) }) }}</div>
						<div class="text-body-1">{{ stats.maxLabel }} &middot; {{ fmtKwh(stats.max) }} kWh</div>
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
			<div v-else class="text-caption grey--text text-center py-8">
				{{ periodLoading ? $t('plugins.WorkshopPower.consumption.loading') : $t('plugins.WorkshopPower.consumption.no_data_for_this_period') }}
			</div>
			<div class="text-caption grey--text mt-1">
				{{ $t('plugins.WorkshopPower.consumption.tap_a_bar_hint', { prev: textPrevious }) }}
			</div>
		</v-card-text>
	</v-card>
</template>

<script>
import { api } from './workshop-api.js'
import ConsumptionBars from './ConsumptionBars.vue'
import { fmtKwh, costText } from './money.js'
import { asDateLocal } from './dates.js'
import { periodCsv } from './job-insights.js'
import { downloadText } from './download.js'

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

export default {
	components: { ConsumptionBars },
	props: {
		tariff: { type: Object, default: () => ({ currency: '', value_kwh: 0 }) },
		meter: { type: String, default: '' } // '' = the main meter, 'total' or the key of a meter
	},
	data() {
		return { periodTab: 'day', refDate: new Date(), periodData: null, periodPrevious: null, periodLoading: false, now: Date.now(), timerTick: null, timerRefresh: null }
	},
	computed: {
		isPeriodCurrent() {
			const today = new Date(this.now)
			if (this.periodTab === 'day') {
				return asDateLocal(this.refDate) === asDateLocal(today)
			}
			if (this.periodTab === 'month') {
				return this.refDate.getFullYear() === today.getFullYear() && this.refDate.getMonth() === today.getMonth()
			}
			return this.refDate.getFullYear() === today.getFullYear()
		},
		textCurrent() {
			return { day: this.t('today'), month: this.t('this_month'), year: this.t('this_year') }[this.periodTab]
		},
		textPrevious() {
			return { day: this.t('previous_day'), month: this.t('previous_month'), year: this.t('previous_year') }[this.periodTab]
		},
		unitBucket() {
			return { day: this.t('unit_hour'), month: this.t('unit_day'), year: this.t('unit_month') }[this.periodTab]
		},
		// Average/maximum of the buckets with data; the bucket in progress does not enter the average (it is incomplete and would pull it down).
		stats() {
			if (!this.periodData || !this.periodData.buckets) {
				return null
			}
			const cur = this.isPeriodCurrent ? this.periodData.current_index : null
			const vals = []
			let max = null
			this.periodData.buckets.forEach((b, i) => {
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
		},
		// Against the previous period "at the same point": if today is at 14 h, it is compared with the first 14 h of yesterday, not with the whole day.
		comparison() {
			if (!this.periodData || !this.periodPrevious || this.periodData.total_kwh == null) {
				return null
			}
			const cur = this.isPeriodCurrent ? this.periodData.current_index : null
			const prev = sumKwh(this.periodPrevious.buckets || [], cur)
			if (prev == null || prev < 0.005) {
				return null
			}
			const pct = Math.round((this.periodData.total_kwh - prev) / prev * 100)
			const ref = cur != null ? this.t('prev_at_this_time', { prev: this.textPrevious }) : this.textPrevious
			if (Math.abs(pct) < 3) {
				return { text: this.t('same_as_ref', { ref }), icon: 'mdi-equal', color: 'grey', cssClass: 'grey--text' }
			}
			return pct > 0
				? { text: this.t('pct_more_than_ref', { pct, ref }), icon: 'mdi-arrow-up', color: 'warning', cssClass: 'warning--text' }
				: { text: this.t('pct_less_than_ref', { pct: -pct, ref }), icon: 'mdi-arrow-down', color: 'success', cssClass: 'success--text' }
		}
	},
	watch: {
		periodTab() {
			this.refDate = new Date()
			this.loadPeriod()
		},
		meter() {
			this.loadPeriod()
		}
	},
	mounted() {
		this.loadPeriod()
		this.timerTick = setInterval(() => { this.now = Date.now() }, 30000)
		// the bars of the period in progress refresh every minute, only with the page in view (DWC keeps it alive when going to another)
		this.timerRefresh = setInterval(() => {
			if (document.hidden || !this.$el || this.$el.isConnected === false) return
			if (this.isPeriodCurrent) this.loadPeriod(true)
		}, 60000)
	},
	beforeDestroy() {
		clearInterval(this.timerTick)
		clearInterval(this.timerRefresh)
	},
	methods: {
		fmtKwh,
		t(k, params) {
			return this.$t('plugins.WorkshopPower.consumption.' + k, params)
		},
		costOf(kwh) {
			return costText(kwh, this.tariff, this.$i18n.locale)
		},
		capital(s) {
			return s.charAt(0).toUpperCase() + s.slice(1)
		},
		periodParam(tab, date) {
			return Object.assign({ period: tab, date: asDateLocal(date) }, this.meter ? { meter: this.meter } : {})
		},
		datePreview(tab, date) {
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
		},
		navigatePeriod(delta) {
			const d = new Date(this.refDate)
			if (this.periodTab === 'month') {
				d.setDate(1)
				d.setMonth(d.getMonth() + delta)
			} else if (this.periodTab === 'year') {
				d.setFullYear(d.getFullYear() + delta)
			} else {
				d.setDate(d.getDate() + delta)
			}
			this.refDate = d
			this.loadPeriod()
		},
		goOnCurrent() {
			this.refDate = new Date()
			this.loadPeriod()
		},
		async loadPeriod(quiet) {
			const tab = this.periodTab
			const refD = new Date(this.refDate)
			if (!quiet) {
				this.periodLoading = true
			}
			try {
				const current = await api('energy.period', this.periodParam(tab, refD))
				let previous = null
				try {
					previous = await api('energy.period', this.periodParam(tab, this.datePreview(tab, refD)))
				} catch (e) {
					previous = null
				}
				// discard if the user changed period while it was loading
				if (tab === this.periodTab && asDateLocal(refD) === asDateLocal(this.refDate)) {
					this.periodData = current && !current.error ? current : null
					this.periodPrevious = previous && !previous.error ? previous : null
				}
			} catch (e) {
				if (!quiet) {
					this.periodData = null
					this.periodPrevious = null
				}
			} finally {
				this.periodLoading = false
			}
		},
		exportCsv() {
			if (!this.periodData || !this.periodData.buckets) return
			downloadText('workshop-power-' + this.periodTab + '.csv', periodCsv(this.periodData.buckets, { period: this.t('csv_period'), kwh: this.t('csv_kwh'), cost: this.t('csv_cost') }, this.tariff.value_kwh))
		}
	}
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
