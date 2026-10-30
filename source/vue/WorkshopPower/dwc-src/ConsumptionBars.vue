<template>
	<div class="consumption-bars">
		<div class="bars-area" @click.self="selected = null">
			<div class="axis-max text-body-small">{{ maxVal > 0 ? fmt(maxVal) + ' kWh' : '' }}</div>
			<div class="line-max" />
			<div v-if="average && maxVal > 0" class="line-avg" :style="{ bottom: pct(average) + '%' }">
				<span class="text-body-small">{{ $t('plugins.WorkshopPower.consumptionBars.avg') }}</span>
			</div>
			<div
				v-for="(b, i) in buckets"
				:key="i"
				class="bar-col"
				@click="toggle(i)"
			>
				<div
					v-if="previousKwh(i) > 0"
					class="mark-preview"
					:style="{ bottom: pct(previousKwh(i)) + '%' }"
				/>
				<div
					class="bar"
					:class="{ 'bar-current': i === currentIndex, 'bar-sel': i === selected }"
					:style="{ height: barHeightPct(b) + '%' }"
				/>
			</div>
		</div>

		<div class="labels-row">
			<div v-for="(b, i) in buckets" :key="i" class="label-col text-body-small text-medium-emphasis">
				{{ showLabel(i) ? b.label : '' }}
			</div>
		</div>

		<div
			v-if="selected !== null && buckets[selected]"
			class="tooltip-burbuja"
			:style="tooltipStyle(selected)"
		>
			<div class="tooltip-span">{{ buckets[selected].tooltip }}</div>
			<div class="tooltip-value">
				{{ fmt(buckets[selected].kwh) }} kWh<span v-if="cost(buckets[selected].kwh)"> &middot; {{ cost(buckets[selected].kwh) }}</span>
			</div>
			<div v-if="previousKwh(selected) != null" class="tooltip-previous">{{ $t('plugins.WorkshopPower.consumptionBars.previous_kwh', { kwh: fmt(previousKwh(selected)) }) }}</div>
		</div>
		<div v-if="selected !== null" class="guide-vertical" :style="colStyle(selected)" />
	</div>
</template>

<script setup>

import { computed, ref, watch } from 'vue'
import { i18n } from './dwc-host.js'
import { formatMoney } from './money.js'

const props = defineProps({
	buckets: { type: Array, default: () => [] },
	currentIndex: { type: Number, default: null },
	// buckets of the previous period (same length or almost: months of 28-31 days)
	previous: { type: Array, default: null },
	price: { type: Number, default: 0 },
	currency: { type: String, default: '' },
	average: { type: Number, default: null }
})

const selected = ref(null)

const maxVal = computed(() => {
	let m = 0
	const view = arr => (arr || []).forEach(b => {
		if (b && b.kwh != null && b.kwh > m) {
			m = b.kwh
		}
	})
	view(props.buckets)
	view(props.previous)
	return m
})

watch(() => props.buckets, (fresh, old) => {
	// the refresh every minute brings the same buckets: do not close the tooltip
	if (!old || fresh.length !== old.length || (fresh[0] && old[0] && fresh[0].tooltip !== old[0].tooltip)) {
		selected.value = null
	}
})

function pct(v) {
	return maxVal.value > 0 ? Math.min(100, (v / maxVal.value) * 100) : 0
}
function barHeightPct(b) {
	if (b.kwh == null || b.kwh <= 0) {
		return 0
	}
	return Math.max(2, pct(b.kwh))
}
function previousKwh(i) {
	const p = props.previous && props.previous[i]
	return p && p.kwh != null ? p.kwh : null
}
// 5 labels spread over the axis (formerly only 3: start, middle and end)
function showLabel(i) {
	const n = props.buckets.length
	if (n <= 13) {
		return true
	}
	const step = (n - 1) / 4
	for (let k = 0; k <= 4; k++) {
		if (i === Math.round(k * step)) {
			return true
		}
	}
	return false
}
function toggle(i) {
	selected.value = selected.value === i ? null : i
}
function fmt(v) {
	if (v == null) {
		return '--'
	}
	return v > 0 && v < 0.1 ? v.toFixed(3) : v.toFixed(2)
}
function cost(kwh) {
	if (kwh == null || !props.price) {
		return null
	}
	return '$ ' + formatMoney(kwh * props.price, props.currency, i18n.locale)
}
function colStyle(i) {
	const n = props.buckets.length || 1
	return { left: ((i + 0.5) / n) * 100 + '%' }
}
// the balloon does not go off the edges on the first/last bars
function tooltipStyle(i) {
	const n = props.buckets.length || 1
	const x = (i + 0.5) / n
	const tx = x < 0.15 ? '-10%' : x > 0.85 ? '-90%' : '-50%'
	return { left: x * 100 + '%', transform: `translateX(${tx})` }
}
</script>

<style scoped>
.consumption-bars {
	position: relative;
	padding-top: 58px;
}
.bars-area {
	position: relative;
	height: 150px;
	display: flex;
	align-items: flex-end;
}
.axis-max {
	position: absolute;
	top: -18px;
	left: 0;
	color: var(--tp-faint, #9e9e9e);
	font-size: 11px !important;
}
.line-max {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	border-top: 1px dashed rgba(128, 128, 128, 0.25);
	pointer-events: none;
}
.line-avg {
	position: absolute;
	left: 0;
	right: 0;
	border-top: 1px dashed rgba(255, 179, 0, 0.55);
	pointer-events: none;
	z-index: 1;
}
.line-avg span {
	position: absolute;
	right: 0;
	top: -16px;
	color: var(--tp-amber, #ffb300);
	font-size: 10px !important;
}
.bar-col {
	position: relative;
	flex: 1 1 0;
	height: 100%;
	display: flex;
	align-items: flex-end;
	justify-content: center;
	cursor: pointer;
	min-width: 0;
}
.bar {
	width: 60%;
	max-width: 22px;
	min-height: 0;
	background: #5b7a99;
	border-radius: 3px 3px 0 0;
	transition: height 0.25s ease;
}
.bar-col:hover .bar {
	background: #6f90b3;
}
.bar-current {
	background: #1976d2;
	background-image: repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.12) 0 4px, transparent 4px 8px);
}
.bar-sel,
.bar-col:hover .bar-sel {
	background: #42a5f5;
}
.mark-preview {
	position: absolute;
	left: 50%;
	transform: translateX(-50%);
	width: 75%;
	max-width: 28px;
	height: 2px;
	background: rgba(200, 200, 200, 0.55);
	pointer-events: none;
	z-index: 1;
}
.labels-row {
	height: 18px;
	display: flex;
	margin-top: 4px;
}
.label-col {
	flex: 1 1 0;
	min-width: 0;
	text-align: center;
	white-space: nowrap;
	overflow: visible;
}
.tooltip-burbuja {
	position: absolute;
	top: 0;
	background: #1976d2;
	color: #fff;
	border-radius: 6px;
	padding: 4px 10px;
	font-size: 12px;
	line-height: 1.3;
	white-space: nowrap;
	text-align: center;
	pointer-events: none;
	z-index: 3;
}
.tooltip-span,
.tooltip-previous {
	opacity: 0.85;
}
.tooltip-value {
	font-weight: 600;
}
.guide-vertical {
	position: absolute;
	top: 58px;
	height: 150px;
	width: 1px;
	background: rgba(255, 255, 255, 0.3);
	pointer-events: none;
}
</style>
