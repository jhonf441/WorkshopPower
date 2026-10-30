<template>
	<v-card class="mb-3">
		<v-card-text class="pb-2">
			<!-- no meter data / stale readings: say what to do, do not just show dashes -->
			<div v-if="!hasData" class="live-notice" role="status">
				<v-icon size="large" color="warning" aria-hidden="true">mdi-meter-electric-outline</v-icon>
				<div class="live-notice-body">
					<div class="font-weight-medium">{{ $t('plugins.WorkshopPower.consumption.empty_title') }}</div>
					<div class="text-body-small text-medium-emphasis">{{ $t(canConfigure ? 'plugins.WorkshopPower.consumption.empty_text_tech' : 'plugins.WorkshopPower.consumption.empty_text_other') }}</div>
				</div>
				<v-btn v-if="canConfigure" size="small" color="primary" @click="emit('configure')">
					<v-icon size="small" start>mdi-cog</v-icon>{{ $t('plugins.WorkshopPower.consumption.meter') }}
				</v-btn>
			</div>
			<div v-else-if="state === 'dot-stale'" class="live-notice live-notice-stale" role="status">
				<v-icon size="large" color="warning" aria-hidden="true">mdi-wifi-alert</v-icon>
				<div class="live-notice-body">
					<div class="font-weight-medium">{{ $t('plugins.WorkshopPower.consumption.stale_title') }}</div>
					<div class="text-body-small text-medium-emphasis">{{ $t('plugins.WorkshopPower.consumption.stale_text') }}</div>
				</div>
				<v-btn v-if="canConfigure" size="small" variant="outlined" @click="emit('configure')">
					<v-icon size="small" start>mdi-cog</v-icon>{{ $t('plugins.WorkshopPower.consumption.meter') }}
				</v-btn>
			</div>

			<div class="live-grid">
				<div class="live-main">
					<div class="d-flex align-center">
						<span class="live-dot" :class="state" aria-hidden="true" />
						<span class="text-body-small text-medium-emphasis ml-2">{{ text }}</span>
						<v-spacer />
						<v-btn v-if="canConfigure && hasData" size="small" variant="text" class="text-medium-emphasis" @click="emit('configure')">
							<v-icon size="x-small" start>mdi-cog</v-icon>{{ $t('plugins.WorkshopPower.consumption.meter') }}
						</v-btn>
					</div>
					<!-- several meters: choose which to see; Total = those with their own line -->
					<v-btn-toggle v-if="meters.length > 1" v-model="chosen" mandatory density="compact" color="primary" class="mt-1 med-toggle">
						<v-btn size="x-small" value="total">{{ $t('plugins.WorkshopPower.consumption.total') }}</v-btn>
						<v-btn v-for="m in meters" :key="m.key" size="x-small" :value="m.key">{{ m.name }}</v-btn>
					</v-btn-toggle>
					<div class="live-watts" :class="{ 'live-watts-off': state !== 'dot-ok' }">
						{{ view.w != null ? view.w.toFixed(0) : '--' }}<span class="live-unit">W</span>
					</div>
					<div class="text-body-medium text-medium-emphasis">
						<span class="mr-3"><v-icon size="small" color="info" aria-hidden="true">mdi-sine-wave</v-icon> {{ view.v != null ? view.v.toFixed(1) : '--' }} V</span>
						<span><v-icon size="small" color="success" aria-hidden="true">mdi-current-ac</v-icon> {{ view.a != null ? view.a.toFixed(2) : '--' }} A</span>
					</div>
					<div v-if="meters.length > 1" class="live-meters">
						<span v-for="m in meters" :key="'v' + m.key" class="live-meter-chip">
							{{ m.name }}: <b>{{ m.ok ? Math.round(m.power_w) + ' W' : $t('plugins.WorkshopPower.common.no_reading') }}</b><span v-if="m.inside_of" class="text-medium-emphasis"> {{ $t('plugins.WorkshopPower.consumption.part_of', { name: nameOf(m.inside_of) }) }}</span>
						</span>
					</div>
					<div v-if="costHour !== null" class="text-body-small text-medium-emphasis mt-1">
						{{ $t('plugins.WorkshopPower.consumption.cost_per_hour_now', { cost: costHour }) }}
					</div>
				</div>

				<div class="tile">
					<div class="tile-label">{{ $t('plugins.WorkshopPower.consumption.today') }}</div>
					<div class="tile-value">{{ fmtKwh(todayKwh) }} <small>kWh</small></div>
					<div class="tile-sub">{{ costOf(todayKwh) || NBSP }}</div>
				</div>
				<div class="tile">
					<div class="tile-label">{{ $t('plugins.WorkshopPower.consumption.this_month') }}</div>
					<div class="tile-value">{{ fmtKwh(monthKwh) }} <small>kWh</small></div>
					<div class="tile-sub">{{ costOf(monthKwh) || NBSP }}</div>
				</div>
				<div class="tile">
					<div class="tile-label">{{ $t('plugins.WorkshopPower.consumption.month_projection') }}</div>
					<div class="tile-value">{{ projection ? fmtKwh(projection.kwh) : '--' }} <small>kWh</small></div>
					<div class="tile-sub">{{ projection ? (costOf(projection.kwh) || ('~' + projection.daily.toFixed(2) + $t('plugins.WorkshopPower.consumption.kwh_day'))) : $t('plugins.WorkshopPower.consumption.data_missing') }}</div>
				</div>
			</div>
			<div class="text-body-small text-medium-emphasis mt-2">{{ $t('plugins.WorkshopPower.consumption.units_hint') }}</div>
		</v-card-text>
	</v-card>
</template>

<script setup>
import { computed } from 'vue'
import { i18n } from './dwc-host.js'
import { fmtKwh, costText } from './money.js'

const NBSP = ' '
const props = defineProps({
	modelValue: { type: String, default: '' }, // meter chosen: '' = the main one, 'total' or a key
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
	canConfigure: { type: Boolean, default: false }
})
const emit = defineEmits(['update:modelValue', 'configure'])

const chosen = computed({
	get: () => props.modelValue,
	set: v => emit('update:modelValue', v)
})
function costOf(kwh) {
	return costText(kwh, props.tariff, i18n.locale)
}
function nameOf(key) {
	const m = props.meters.find(x => x.key === key)
	return m ? m.name : key
}
</script>

<style scoped>
.med-toggle {
	flex-wrap: wrap;
	height: auto;
}
.live-notice {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 12px;
	padding: 12px;
	margin-bottom: 12px;
	border-radius: 8px;
	border: 1px dashed rgba(128, 128, 128, 0.5);
	background: rgba(128, 128, 128, 0.06);
}
.live-notice-stale {
	border-style: solid;
	border-color: rgb(var(--v-theme-warning));
}
.live-notice-body {
	flex: 1 1 220px;
	min-width: 0;
}
.live-grid {
	display: grid;
	grid-template-columns: minmax(200px, 1.4fr) repeat(3, minmax(110px, 1fr));
	gap: 12px;
	align-items: stretch;
}
@media (max-width: 760px) {
	.live-grid {
		grid-template-columns: repeat(3, 1fr);
	}
	.live-main {
		grid-column: 1 / -1;
	}
}
@media (max-width: 480px) {
	.live-grid {
		grid-template-columns: repeat(2, 1fr);
	}
}
.live-watts {
	font-size: 52px;
	font-weight: 500;
	line-height: 1.1;
	color: var(--tp-amber, #ffb300);
	font-variant-numeric: tabular-nums;
}
.live-watts-off {
	opacity: 0.55;
}
.live-unit {
	font-size: 22px;
	margin-left: 4px;
	color: var(--tp-faint, #9e9e9e);
}
.live-meters {
	display: flex;
	flex-wrap: wrap;
	gap: 4px 12px;
	font-size: 12px;
	margin-top: 4px;
}
.live-dot {
	width: 9px;
	height: 9px;
	border-radius: 50%;
	display: inline-block;
}
.dot-ok {
	background: #66BB6A;
	animation: pulso 2s infinite;
}
.dot-stale {
	background: #FFA726;
}
.dot-off {
	background: #757575;
}
@keyframes pulso {
	0% { box-shadow: 0 0 0 0 rgba(102, 187, 106, 0.6); }
	70% { box-shadow: 0 0 0 7px rgba(102, 187, 106, 0); }
	100% { box-shadow: 0 0 0 0 rgba(102, 187, 106, 0); }
}
@media (prefers-reduced-motion: reduce) {
	.dot-ok {
		animation: none;
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
