<template>
	<!-- ===== Detailed history ===== -->
	<v-card class="mb-3">
		<v-card-text>
			<div class="d-flex align-center justify-space-between flex-wrap" style="gap:8px">
				<div class="text-subtitle-1 font-weight-medium">
					<v-icon small class="mr-1" color="primary">mdi-chart-line</v-icon>{{ $t('plugins.WorkshopPower.consumption.detailed_history') }}
				</div>
				<range-picker v-model="rangeVal" />
			</div>

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
				<div class="text-caption grey--text mt-3 mb-1">{{ $t('plugins.WorkshopPower.consumption.power_w') }}</div>
				<detail-chart
					:history="serialPower"
					color="#FFB300" unit="W" :label="$t('plugins.WorkshopPower.consumption.power')"
					:limit="summary ? summary.peak_w : null" :limit-label="$t('plugins.WorkshopPower.consumption.peak_lower')"
					:height="220"
				/>
				<v-row dense class="mt-2">
					<v-col cols="12" sm="6">
						<div class="text-caption grey--text mb-1">{{ $t('plugins.WorkshopPower.consumption.voltage_v') }}</div>
						<detail-chart :history="serialVoltage" color="#29B6F6" unit="V" :label="$t('plugins.WorkshopPower.consumption.voltage')" :height="160" />
					</v-col>
					<v-col cols="12" sm="6">
						<div class="text-caption grey--text mb-1">{{ $t('plugins.WorkshopPower.consumption.current_a') }}</div>
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
				<div v-if="idle" class="text-caption grey--text mt-1">{{ $t('plugins.WorkshopPower.consumption.idle_hint') }}</div>
			</template>
			<div v-else class="history-empty">
				<v-icon large color="grey" aria-hidden="true">mdi-chart-timeline-variant</v-icon>
				<div class="text-body-2">{{ loading ? $t('plugins.WorkshopPower.consumption.loading') : $t('plugins.WorkshopPower.consumption.no_readings_in_the_range') }}</div>
			</div>
		</v-card-text>
	</v-card>
</template>

<script>
import { api } from './workshop-api.js'
import DetailChart from './DetailChart.vue'
import RangePicker from './RangePicker.vue' // vue/_shared36
import { relative, resolve, asTexts } from './range-picker.js' // vue/_shared36
import { fmtKwh, costText } from './money.js'
import { asDateHourLocal } from './dates.js'
import { parseTs } from './jobs.js'
import { baseload } from './job-insights.js'

// Readings every 30 s: more than 3 min without a reading = gap (machine/meter off). A null point is inserted so that the
// chart cuts the line instead of joining the ends with a straight ramp that looks like real consumption.
const GAP_MS = 3 * 60 * 1000

export default {
	components: { DetailChart, RangePicker },
	props: {
		tariff: { type: Object, default: () => ({ currency: '', value_kwh: 0 }) },
		meter: { type: String, default: '' }
	},
	data() {
		return {
			NBSP: ' ',
			rangeVal: relative(24, 'hours'), // the time range of the history: the last 24 hours until it is changed (range-picker.js)
			summary: null,
			serial: [],
			serialStepS: 0, // width of a point in seconds when the service averaged a long range; 0 = raw readings
			loading: false
		}
	},
	computed: {
		serialStepMin() {
			return Math.max(1, Math.round(this.serialStepS / 60))
		},
		serialPower() {
			return this.serialTimed('power_w')
		},
		serialVoltage() {
			return this.serialTimed('voltage_v')
		},
		serialCurrent() {
			return this.serialTimed('current_a')
		},
		idle() {
			return baseload(this.serial)
		}
	},
	watch: {
		rangeVal() {
			this.search()
		},
		meter() {
			this.search()
		}
	},
	mounted() {
		this.search()
	},
	methods: {
		fmtKwh,
		costOf(kwh) {
			return costText(kwh, this.tariff, this.$i18n.locale)
		},
		serialTimed(field) {
			const out = []
			let prevT = null
			// a hole is a stretch with no readings: with averaged points neighbours are one step apart, not 30 s
			const gapMs = Math.max(GAP_MS, 1.5 * this.serialStepS * 1000)
			for (const p of this.serial) {
				const ms = parseTs(p.ts)
				if (prevT != null && ms - prevT > gapMs) {
					out.push({ t: prevT + 1000, y: null })
				}
				out.push({ t: ms, y: p[field] })
				prevT = ms
			}
			return out
		},
		async search() {
			const r = resolve(this.rangeVal, new Date())
			const since = asTexts(r).from
			// a range that ends now gets +10 min of margin: the Pi clock runs a bit ahead
			const until = this.rangeVal.type === 'relative' ? asDateHourLocal(new Date(r.to.getTime() + 10 * 60000)) : asTexts(r).to
			this.loading = true
			try {
				const data = await api('energy.history', Object.assign({ from: since, to: until, limit: 1 }, this.meter ? { meter: this.meter } : {}))
				this.summary = data.summary || null
				this.serial = data.serial || []
				this.serialStepS = Number(data.serial_step_s) || 0
			} catch (e) {
				this.summary = null
				this.serial = []
				this.serialStepS = 0
			} finally {
				this.loading = false
			}
		}
	}
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
.history-empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8px;
	text-align: center;
	padding: 24px 8px;
	color: var(--tp-faint, #9e9e9e);
}
</style>
