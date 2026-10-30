<template>
	<div
		class="mcard" :class="['mcard-' + status, { 'mcard-sel': selected }]" :data-meter="meter.key"
		role="group" :aria-label="meter.name"
	>
		<div class="mcard-head">
			<span class="mcard-dot" aria-hidden="true" />
			<b class="mcard-name">{{ meter.name }}</b>
			<v-chip size="x-small" :variant="selected ? 'flat' : 'outlined'" :color="selected ? 'primary' : ''" class="mcard-badge" v-if="selected">{{ $t('plugins.WorkshopPower.meterConfig.editing_badge') }}</v-chip>
			<v-spacer />
			<span class="mcard-status">
				<span class="mcard-w">{{ reading.text }}</span>
				<span class="mcard-state">{{ $t(status === 'ok' ? 'plugins.WorkshopPower.meterConfig.card_reading_ok' : 'plugins.WorkshopPower.meterConfig.card_reading_none') }}</span>
			</span>
			<v-btn size="small" variant="outlined" :aria-label="$t('plugins.WorkshopPower.meterConfig.card_edit_aria', { name: meter.name })" @click="emit('edit')">
				<v-icon size="small" start>mdi-pencil</v-icon>{{ $t('plugins.WorkshopPower.meterConfig.card_edit') }}
			</v-btn>
		</div>
		<div class="mcard-chips">
			<v-chip size="x-small" variant="outlined" :color="meter.feeds_pi ? 'primary' : ''">{{ meter.feeds_pi ? $t('plugins.WorkshopPower.meterConfig.powers_the_system') : meter.inside_of ? $t('plugins.WorkshopPower.meterConfig.inside_of', { name: insideName }) : $t('plugins.WorkshopPower.meterConfig.own_line') }}</v-chip>
			<v-chip v-if="meter.short" size="x-small" variant="outlined" :color="meter.feeds_pi ? 'warning' : ''">{{ meter.feeds_pi ? $t('plugins.WorkshopPower.meterConfig.cut_last') : $t('plugins.WorkshopPower.meterConfig.cut_on_shutdown') }}</v-chip>
			<v-chip v-if="meter.watches" size="x-small" variant="outlined" color="error">{{ $t('plugins.WorkshopPower.meterConfig.watches_heater', { heater: meter.watches.heater }) }}</v-chip>
			<v-chip v-if="!meter.configured" size="x-small" variant="flat" color="warning" class="text-white">{{ $t('plugins.WorkshopPower.meterConfig.no_device_data') }}</v-chip>
		</div>
		<dl class="mcard-fields">
			<div><dt>{{ $t('plugins.WorkshopPower.meterConfig.card_id') }}</dt><dd>{{ meter.id || '--' }}</dd></div>
			<div><dt>{{ $t('plugins.WorkshopPower.meterConfig.card_ip') }}</dt><dd>{{ meter.ip || '--' }}</dd></div>
			<div><dt>{{ $t('plugins.WorkshopPower.meterConfig.card_version') }}</dt><dd>{{ meter.version || '--' }}</dd></div>
			<div><dt>{{ $t('plugins.WorkshopPower.meterConfig.key_word') }}</dt><dd>{{ meter.key_mask || '--' }}</dd></div>
		</dl>
	</div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
	meter: { type: Object, required: true }, // one item of meter.get: { key, name, id, ip, version, key_mask, configured, feeds_pi, short, inside_of, watches }
	reading: { type: Object, default: () => ({ state: 'none', text: '' }) }, // { state: 'ok' | 'bad' | 'none', text }
	selected: { type: Boolean, default: false },
	insideName: { type: String, default: '' }
})
const emit = defineEmits(['edit'])

const status = computed(() => props.reading.state)
</script>

<style scoped>
.mcard {
	border: 1px solid rgba(128, 128, 128, 0.35);
	border-radius: 10px;
	padding: 12px 14px;
	background: transparent;
}
.mcard-sel {
	border-color: var(--wf-sec, #7E57C2);
}
.mcard-head {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 6px 10px;
}
.mcard-dot {
	width: 10px;
	height: 10px;
	border-radius: 50%;
	background: #757575;
	flex: 0 0 auto;
}
.mcard-ok .mcard-dot {
	background: #66BB6A;
}
.mcard-bad .mcard-dot {
	background: #EF5350;
}
.mcard-name {
	font-size: 16px;
	overflow-wrap: anywhere;
}
.mcard-status {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	line-height: 1.2;
}
.mcard-w {
	font-size: 16px;
	font-weight: 500;
	font-variant-numeric: tabular-nums;
}
.mcard-state {
	font-size: 11px;
	color: var(--tp-faint, #9e9e9e);
}
.mcard-chips {
	display: flex;
	flex-wrap: wrap;
	gap: 4px 6px;
	margin-top: 8px;
}
.mcard-fields {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
	gap: 6px 14px;
	margin: 10px 0 0;
	padding-top: 8px;
	border-top: 1px solid rgba(128, 128, 128, 0.2);
}
.mcard-fields dt {
	font-size: 11px;
	text-transform: uppercase;
	letter-spacing: 0.04em;
	color: var(--tp-faint, #9e9e9e);
}
.mcard-fields dd {
	margin: 0;
	font-size: 13px;
	font-variant-numeric: tabular-nums;
	overflow-wrap: anywhere;
}
@media (max-width: 480px) {
	.mcard-fields {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
}
</style>
