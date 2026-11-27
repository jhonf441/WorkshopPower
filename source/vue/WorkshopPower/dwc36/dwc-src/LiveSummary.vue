<template>
	<!-- the first group of the summary card: its head (the state of the readings, the meter settings), the live reading and the figures -->
	<div class="wf-group live">
		<card-head icon="mdi-gauge" :title="$t('plugins.WorkshopPower.consumption.live_title')" :state="text" :state-kind="stateKind">
			<v-btn v-if="canConfigure && hasData" small text @click="$emit('configure')">
				<v-icon small left>mdi-cog</v-icon>{{ $t('plugins.WorkshopPower.consumption.meter') }}
			</v-btn>
		</card-head>

		<!-- ONE notice under the head, the highest cause: the service is missing or stopped (without it there are no readings to wait for), else the
		     read error. A Duet without a Raspberry is the band of the page, under its bar, never inside the card -->
		<service-notice v-if="cardServiceNotice" />
		<error-notice v-else-if="error" :error="error" retry @retry="$emit('retry')" />

		<!-- no meter data / stale readings: a note of the family inside the card that says what to do, not just dashes -->
		<div v-if="!serviceDown && !hasData" class="wf-notice wf-notice--down live-notice" role="status">
			<v-icon class="wf-notice-icon" :size="16" aria-hidden="true">mdi-meter-electric-outline</v-icon>
			<div class="wf-notice-body">
				<div class="wf-notice-text"><b>{{ $t('plugins.WorkshopPower.consumption.empty_title') }}</b> {{ $t(canConfigure ? 'plugins.WorkshopPower.consumption.empty_text_tech' : 'plugins.WorkshopPower.consumption.empty_text_other') }}</div>
			</div>
			<div class="wf-notice-action live-notice-actions">
				<v-btn depressed color="primary" :disabled="!canConfigure" @click="$emit('configure')">
					<v-icon small left>mdi-cog</v-icon>{{ $t('plugins.WorkshopPower.consumption.meter') }}
				</v-btn>
				<lock-reason :ops="meterOps" min="technician" :subject="$t('plugins.WorkshopPower.subjects.meter')" />
			</div>
		</div>
		<div v-else-if="!serviceDown && state === 'dot-stale'" class="wf-notice wf-notice--down live-notice live-notice-stale" role="status">
			<v-icon class="wf-notice-icon" :size="16" aria-hidden="true">mdi-wifi-alert</v-icon>
			<div class="wf-notice-body">
				<div class="wf-notice-text"><b>{{ $t('plugins.WorkshopPower.consumption.stale_title') }}</b> {{ $t('plugins.WorkshopPower.consumption.stale_text') }}</div>
			</div>
			<div class="wf-notice-action live-notice-actions">
				<v-btn small outlined :disabled="!canConfigure" @click="$emit('configure')">
					<v-icon small left>mdi-cog</v-icon>{{ $t('plugins.WorkshopPower.consumption.meter') }}
				</v-btn>
				<lock-reason :ops="meterOps" min="technician" :subject="$t('plugins.WorkshopPower.subjects.meter')" />
			</div>
		</div>

		<!-- several meters: choose which to see; Total = those with their own line -->
		<v-btn-toggle v-if="meters.length > 1" v-model="chosen" mandatory dense color="primary" class="med-toggle">
			<v-btn small value="total">{{ $t('plugins.WorkshopPower.consumption.total') }}</v-btn>
			<v-btn v-for="m in meters" :key="m.key" small :value="m.key">{{ m.name }}</v-btn>
		</v-btn-toggle>

		<!-- the figures of the family (.wf-stat): the power now (with the voltage and the current), today, this month and the projection -->
		<div class="wf-stats live-grid">
			<div class="wf-stat live-main">
				<div class="wf-stat-label">{{ $t('plugins.WorkshopPower.consumption.power') }}</div>
				<div class="wf-stat-value" :class="{ 'live-off': state !== 'dot-ok' }">{{ view.w != null ? view.w.toFixed(0) : '--' }} <span class="wp-unit">W</span></div>
				<div class="wp-sub">{{ view.v != null ? view.v.toFixed(1) : '--' }} V &middot; {{ view.a != null ? view.a.toFixed(2) : '--' }} A</div>
			</div>
			<div class="wf-stat">
				<div class="wf-stat-label">{{ $t('plugins.WorkshopPower.consumption.today') }}</div>
				<div class="wf-stat-value">{{ fmtKwh(todayKwh) }} <span class="wp-unit">kWh</span></div>
				<div class="wp-sub">{{ costOf(todayKwh) || NBSP }}</div>
			</div>
			<div class="wf-stat">
				<div class="wf-stat-label">{{ $t('plugins.WorkshopPower.consumption.this_month') }}</div>
				<div class="wf-stat-value">{{ fmtKwh(monthKwh) }} <span class="wp-unit">kWh</span></div>
				<div class="wp-sub">{{ costOf(monthKwh) || NBSP }}</div>
			</div>
			<div class="wf-stat">
				<div class="wf-stat-label">{{ $t('plugins.WorkshopPower.consumption.month_projection') }}</div>
				<div class="wf-stat-value">{{ projection ? fmtKwh(projection.kwh) : '--' }} <span class="wp-unit">kWh</span></div>
				<div class="wp-sub">{{ projection ? (costOf(projection.kwh) || ('~' + projection.daily.toFixed(2) + $t('plugins.WorkshopPower.consumption.kwh_day'))) : $t('plugins.WorkshopPower.consumption.data_missing') }}</div>
			</div>
		</div>
		<div v-if="meters.length > 1" class="live-meters">
			<span v-for="m in meters" :key="'v' + m.key">
				{{ m.name }}: <b>{{ m.ok ? Math.round(m.power_w) + ' W' : $t('plugins.WorkshopPower.common.no_reading') }}</b><span v-if="m.inside_of" class="live-part"> {{ $t('plugins.WorkshopPower.consumption.part_of', { name: nameOf(m.inside_of) }) }}</span>
			</span>
		</div>
		<div v-if="costHour !== null" class="wp-note">{{ $t('plugins.WorkshopPower.consumption.cost_per_hour_now', { cost: costHour }) }}</div>
		<div class="wp-note">{{ $t('plugins.WorkshopPower.consumption.units_hint') }}</div>
	</div>
</template>

<script>
import { fmtKwh, costText } from './money.js'
import CardHead from './CardHead.vue' // the head of a card (vue/_shared36)
import ServiceNotice from './ServiceNotice.vue' // vue/_shared36
import ErrorNotice from './ErrorNotice.vue' // vue/_shared36
import { serviceProblemKind } from './service-problem.js' // vue/_shared36
import LockReason from './LockReason.vue' // vue/_shared36
import { METER_OPS } from './access-groups.js'

// the dot of the head by the state of the readings (CardHead stateKind)
const STATE_KIND = { 'dot-ok': 'ok', 'dot-stale': 'warn' }

export default {
	components: { CardHead, LockReason, ServiceNotice, ErrorNotice },
	props: {
		value: { type: String, default: '' }, // meter chosen: '' = the main one, 'total' or a key
		state: { type: String, default: 'dot-off' }, // dot-ok | dot-stale | dot-off
		text: { type: String, default: '' },
		hasData: { type: Boolean, default: false },
		view: { type: Object, default: () => ({ w: null, v: null, a: null }) },
		meters: { type: Array, default: () => [] },
		costHour: { type: String, default: null },
		todayKwh: { type: Number, default: null },
		monthKwh: { type: Number, default: null },
		projection: { type: Object, default: null },
		tariff: { type: Object, default: () => ({ currency: '', value_kwh: 0 }) },
		canConfigure: { type: Boolean, default: false },
		error: { type: [Object, String, Error], default: null } // the tiles or the rate could not be read
	},
	data() {
		return { NBSP: ' ', meterOps: METER_OPS }
	},
	computed: {
		// the service of the workshop is not there: its notice covers the one of "no readings yet"
		serviceDown() {
			return !!serviceProblemKind(this.$store)
		},
		// the notice of the card: only the service missing or stopped (no_sbc is the band of the page)
		cardServiceNotice() {
			const kind = serviceProblemKind(this.$store)
			return kind === 'missing' || kind === 'stopped'
		},
		chosen: {
			get() {
				return this.value
			},
			set(v) {
				this.$emit('input', v)
			}
		},
		stateKind() {
			return STATE_KIND[this.state] || ''
		}
	},
	methods: {
		fmtKwh,
		costOf(kwh) {
			return costText(kwh, this.tariff, this.$i18n.locale)
		},
		nameOf(key) {
			const m = this.meters.find(x => x.key === key)
			return m ? m.name : key
		}
	}
}
</script>

<style scoped>
.med-toggle {
	flex-wrap: wrap;
	height: auto;
	margin-bottom: 12px;
}
.live-notice-actions {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 4px;
}
/* no fresh reading: the last value stays, dimmed */
.live-off {
	opacity: 0.55;
}
.live-meters {
	display: flex;
	flex-wrap: wrap;
	gap: 4px 12px;
	font-size: 12px;
	margin-top: 8px;
}
.live-part {
	opacity: 0.7;
}
</style>
