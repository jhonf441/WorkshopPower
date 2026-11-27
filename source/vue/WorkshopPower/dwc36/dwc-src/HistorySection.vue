<template>
	<!-- ===== Detailed history: the card of the section (.st-body), its head with the range, the figures (.wf-stat) and the charts ===== -->
	<div class="history">
		<card-head icon="mdi-chart-line" :title="$t('plugins.WorkshopPower.consumption.detailed_history')">
			<range-picker v-model="rangeVal" />
		</card-head>

		<div v-if="summary" class="wf-stats span-tiles">
			<div class="wf-stat">
				<div class="wf-stat-label">{{ $t('plugins.WorkshopPower.consumption.consumed') }}</div>
				<div class="wf-stat-value">{{ fmtKwh(summary.consumption_kwh) }} <span class="wp-unit">kWh</span></div>
				<div class="wp-sub">{{ costOf(summary.consumption_kwh) || NBSP }}</div>
			</div>
			<div class="wf-stat">
				<div class="wf-stat-label">{{ $t('plugins.WorkshopPower.consumption.average') }}</div>
				<div class="wf-stat-value">{{ summary.average_w != null ? summary.average_w.toFixed(0) : '--' }} <span class="wp-unit">W</span></div>
				<div class="wp-sub">{{ NBSP }}</div>
			</div>
			<div class="wf-stat">
				<div class="wf-stat-label">{{ $t('plugins.WorkshopPower.consumption.peak') }}</div>
				<div class="wf-stat-value">{{ summary.peak_w != null ? summary.peak_w.toFixed(0) : '--' }} <span class="wp-unit">W</span></div>
				<div class="wp-sub">{{ NBSP }}</div>
			</div>
			<div class="wf-stat">
				<div class="wf-stat-label">{{ $t('plugins.WorkshopPower.consumption.idle_label') }}</div>
				<div class="wf-stat-value">{{ idle ? idle.w.toFixed(0) : '--' }} <span class="wp-unit">W</span></div>
				<div class="wp-sub">{{ idle ? (costOf(idle.kwhDay) ? $t('plugins.WorkshopPower.consumption.idle_cost', { cost: costOf(idle.kwhDay) }) : $t('plugins.WorkshopPower.consumption.idle_sub', { kwh: fmtKwh(idle.kwhDay) })) : NBSP }}</div>
			</div>
			<div class="wf-stat">
				<div class="wf-stat-label">{{ $t('plugins.WorkshopPower.consumption.readings') }}</div>
				<div class="wf-stat-value">{{ summary.samples }}</div>
				<div class="wp-sub">{{ $t('plugins.WorkshopPower.consumption.one_every_30_s') }}</div>
			</div>
		</div>

		<template v-if="serial.length > 1">
			<div class="text-caption grey--text mt-3 mb-1 d-flex align-center" style="gap:4px">
				{{ $t('plugins.WorkshopPower.consumption.power_w') }}
			</div>
			<help-line class="mb-1">{{ $t('plugins.WorkshopPower.consumption.gaps_in_the_line_are_periods') }} <span v-if="serialStepS">{{ $t('plugins.WorkshopPower.consumption.long_range_averaged_every', { minutes: serialStepMin }) }}</span> {{ $t('plugins.WorkshopPower.consumption.wheel_or_pinch_to_zoom') }}</help-line>
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
		</template>
		<div v-else class="history-empty">
			<v-icon large color="grey" aria-hidden="true">mdi-chart-timeline-variant</v-icon>
			<lock-reason v-if="!loading && refusalKind" :kind="refusalKind" :text="refusalKind === 'role' ? refusal : ''" :subject="$t('plugins.WorkshopPower.subjects.history')" />
			<div v-else class="text-body-2">{{ loading ? $t('plugins.WorkshopPower.consumption.loading') : $t('plugins.WorkshopPower.consumption.no_readings_in_the_range') }}</div>
		</div>
		<help-fold class="mt-3" :title="t('history_help_title')" :what="t('history_help_what')" :why="t('history_help_for')" :if-missing="t('history_help_missing')" :how="t('history_help_how')" />
	</div>
</template>

<script>
import { api } from './workshop-api.js'
import { roleMixin } from './role-mixin.js' // what the role may do (vue/_shared)
import { isRefusal, refusalNow, refusalCauseNow } from './session-refusal.js' // a refusal told by its cause: isRefusal, refusalNow, refusalCauseNow
import DetailChart from './DetailChart.vue'
import RangePicker from './RangePicker.vue' // vue/_shared36
import CardHead from './CardHead.vue' // the head of a card (vue/_shared36)
import HelpLine from './HelpLine.vue' // vue/_shared36
import HelpFold from './HelpFold.vue' // vue/_shared36
import { relative, resolve, asTexts } from './range-picker.js' // vue/_shared36
import { fmtKwh, costText } from './money.js'
import { asDateHourLocal } from './dates.js'
import { parseTs } from './jobs.js'
import { baseload } from './job-insights.js'
import LockReason from './LockReason.vue' // vue/_shared36

// Readings every 30 s: more than 3 min without a reading = gap (machine/meter off). A null point is inserted so that the
// chart cuts the line instead of joining the ends with a straight ramp that looks like real consumption.
const GAP_MS = 3 * 60 * 1000

export default {
	mixins: [roleMixin],
	// what the previous person read stays in no data of the section (ESTANDAR 3.1); onSessionChange reads it again
	sessionData: ['summary', 'serial', 'serialStepS', 'refused'],
	sessionErrors: ['refused'], // what a refusal or a failure said: cleared when the person signs in, out or changes role (role-mixin.js)
	components: { HelpLine, LockReason, DetailChart, RangePicker, CardHead, HelpFold },
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
			loading: false,
			refused: null // the last refusal (403 / 401) of the readings: told by its cause instead of "no readings"
		}
	},
	computed: {
		// the cause of that refusal (no session / role too low), to draw it as the calm note of its cause
		refusalKind() {
			void this.identityTick
			return refusalCauseNow(this.refused)
		},
		refusal() {
			void this.identityTick
			return refusalNow(this.refused, 'viewer')
		},
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
		t(k) {
			return this.$t('plugins.WorkshopPower.consumption.' + k)
		},
		// the person signed in / out or the role changed: the readings are read again
		onSessionChange() {
			this.search()
		},
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
				this.refused = isRefusal(e) ? e : null
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
