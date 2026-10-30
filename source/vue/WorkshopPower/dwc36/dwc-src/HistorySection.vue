<template>
	<!-- ===== Detailed history ===== -->
	<v-card class="mb-3">
		<v-card-text>
			<div class="d-flex align-center justify-space-between flex-wrap" style="gap:8px">
				<div class="text-subtitle-1 font-weight-medium">
					<v-icon small class="mr-1" color="primary">mdi-chart-line</v-icon>{{ $t('plugins.WorkshopPower.consumption.detailed_history') }}
				</div>
				<v-btn-toggle v-model="range" mandatory dense color="primary">
					<v-btn small value="24h">24 h</v-btn>
					<v-btn small value="7d">{{ $t('plugins.WorkshopPower.consumption.7_days') }}</v-btn>
					<v-btn small value="30d">{{ $t('plugins.WorkshopPower.consumption.30_days') }}</v-btn>
					<v-btn small value="custom" :aria-label="$t('plugins.WorkshopPower.consumption.from')" @click="toggleDates"><v-icon small>mdi-calendar-range</v-icon></v-btn>
				</v-btn-toggle>
			</div>

			<v-expand-transition>
				<v-row v-show="range === 'custom' && datesOpen" dense class="mt-2">
					<v-col cols="6" sm="4">
						<v-menu v-model="withSinceMenu" :close-on-content-click="false" offset-y min-width="auto">
							<template v-slot:activator="{ on, attrs }">
								<v-text-field v-model="withSince" :label="$t('plugins.WorkshopPower.consumption.from')" readonly dense hide-details outlined prepend-inner-icon="mdi-calendar" v-bind="attrs" v-on="on" />
							</template>
							<v-date-picker v-model="withSince" no-title color="primary" :max="withUntil" @input="withSinceMenu = false; search()" />
						</v-menu>
					</v-col>
					<v-col cols="6" sm="4">
						<v-menu v-model="withUntilMenu" :close-on-content-click="false" offset-y min-width="auto">
							<template v-slot:activator="{ on, attrs }">
								<v-text-field v-model="withUntil" :label="$t('plugins.WorkshopPower.consumption.to')" readonly dense hide-details outlined prepend-inner-icon="mdi-calendar" v-bind="attrs" v-on="on" />
							</template>
							<v-date-picker v-model="withUntil" no-title color="primary" :min="withSince" @input="withUntilMenu = false; search()" />
						</v-menu>
					</v-col>
				</v-row>
			</v-expand-transition>

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
			<div v-else class="text-caption grey--text text-center py-6">
				{{ loading ? $t('plugins.WorkshopPower.consumption.loading') : $t('plugins.WorkshopPower.consumption.no_readings_in_the_range') }}
			</div>
		</v-card-text>
	</v-card>
</template>

<script>
import { api } from './workshop-api.js'
import DetailChart from './DetailChart.vue'
import { fmtKwh, costText } from './money.js'
import { asDateLocal, asDateHourLocal } from './dates.js'
import { parseTs } from './jobs.js'
import { baseload } from './job-insights.js'

// Readings every 30 s: more than 3 min without a reading = gap (machine/meter off). A null point is inserted so that the
// chart cuts the line instead of joining the ends with a straight ramp that looks like real consumption.
const GAP_MS = 3 * 60 * 1000
const DAYS_SPAN = { '24h': 1, '7d': 7, '30d': 30 }

export default {
	components: { DetailChart },
	props: {
		tariff: { type: Object, default: () => ({ currency: '', value_kwh: 0 }) },
		meter: { type: String, default: '' }
	},
	data() {
		const today = new Date()
		return {
			NBSP: ' ',
			range: '24h',
			withSince: asDateLocal(new Date(today.getTime() - 7 * 86400000)),
			withUntil: asDateLocal(today),
			datesOpen: true, // the calendar button shows the date fields; tapping it again while selected hides them
			lastRange: '24h', // range before this tap: the mandatory group already switched to 'custom' when the click handler runs
			withSinceMenu: false,
			withUntilMenu: false,
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
		range(v) {
			this.lastRange = v
			if (v === 'custom') this.datesOpen = true
			else this.search()
		},
		meter() {
			this.search()
		}
	},
	mounted() {
		this.search()
	},
	methods: {
		toggleDates() {
			if (this.lastRange === 'custom') this.datesOpen = !this.datesOpen
		},
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
			let since
			let until
			if (this.range === 'custom') {
				since = this.withSince
				until = this.withUntil
			} else {
				const nowDate = new Date()
				since = asDateHourLocal(new Date(nowDate.getTime() - DAYS_SPAN[this.range] * 86400000))
				// +10 min of margin: the Pi clock runs a bit ahead
				until = asDateHourLocal(new Date(nowDate.getTime() + 10 * 60000))
			}
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
</style>
