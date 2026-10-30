<template>
	<v-card class="mb-3 budget">
		<v-card-text>
			<div class="budget-head">
				<v-icon size="small" color="primary" aria-hidden="true">mdi-target</v-icon>
				<span class="text-title-medium font-weight-medium">{{ $t('plugins.WorkshopPower.consumption.budget_title') }}</span>
				<v-chip v-if="state.level !== 'none'" size="small" variant="outlined" :color="chip.color">
					<v-icon size="x-small" start>{{ chip.icon }}</v-icon>{{ chip.text }}
				</v-chip>
				<v-spacer />
				<v-btn v-if="!editing && state.level === 'none'" size="small" color="primary" variant="outlined" @click="startEdit()">
					<v-icon size="small" start>mdi-flag-plus</v-icon>{{ $t('plugins.WorkshopPower.consumption.budget_set') }}
				</v-btn>
				<template v-else-if="!editing">
					<v-btn size="small" variant="text" @click="startEdit()">{{ $t('plugins.WorkshopPower.consumption.budget_change') }}</v-btn>
					<v-btn size="small" variant="text" @click="emit('update:limit', 0)">{{ $t('plugins.WorkshopPower.consumption.budget_clear') }}</v-btn>
				</template>
			</div>

			<div v-if="editing" class="budget-edit">
				<v-text-field
					v-model="draft" :label="$t('plugins.WorkshopPower.consumption.budget_label')" density="compact" variant="outlined" hide-details="auto"
					inputmode="decimal" :error-messages="invalid ? $t('plugins.WorkshopPower.consumption.budget_invalid') : ''" class="budget-field"
					@keyup.enter="commit()"
				/>
				<v-btn size="small" color="primary" @click="commit()">{{ $t('plugins.WorkshopPower.consumption.budget_save') }}</v-btn>
				<v-btn size="small" variant="text" @click="editing = false">{{ $t('plugins.WorkshopPower.consumption.budget_cancel') }}</v-btn>
			</div>
			<div v-if="!editing && state.level === 'none'" class="text-body-small text-medium-emphasis mt-1">{{ $t('plugins.WorkshopPower.consumption.budget_hint') }}</div>

			<template v-if="!editing && state.level !== 'none'">
				<div class="budget-numbers">
					<span class="budget-used">{{ $t('plugins.WorkshopPower.consumption.budget_spent', { used: fmtKwh(monthKwh), limit: fmtKwh(state.limit) }) }}</span>
					<span class="text-medium-emphasis">&middot; {{ Math.round(state.pct) }}%</span>
					<span v-if="state.level !== 'over'" class="text-medium-emphasis">&middot; {{ $t('plugins.WorkshopPower.consumption.budget_left', { kwh: fmtKwh(state.left) }) }}</span>
				</div>
				<div class="budget-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="Math.min(100, Math.round(state.pct))">
					<span class="budget-fill" :class="'budget-' + state.level" :style="{ width: Math.min(100, state.pct) + '%' }" />
					<span v-if="state.projPct != null && state.projPct < 100" class="budget-proj" :style="{ left: state.projPct + '%' }" />
				</div>
				<div v-if="projection" class="text-body-small text-medium-emphasis mt-1">
					{{ $t(state.projPct > 100 ? 'plugins.WorkshopPower.consumption.budget_projection_over' : 'plugins.WorkshopPower.consumption.budget_projection_ok', { kwh: fmtKwh(projection.kwh) }) }}
					<span v-if="costOf(projection.kwh)">({{ costOf(projection.kwh) }})</span>
				</div>
			</template>
		</v-card-text>
	</v-card>
</template>

<script setup>
import { computed, ref } from 'vue'
import { i18n } from './dwc-host.js'
import { fmtKwh, costText } from './money.js'
import { budgetState } from './job-insights.js'
import { parseLimit } from './budget-store.js'

const props = defineProps({
	limit: { type: Number, default: 0 },
	monthKwh: { type: Number, default: null },
	projection: { type: Object, default: null },
	tariff: { type: Object, default: () => ({ currency: '', value_kwh: 0 }) }
})
const emit = defineEmits(['update:limit'])

const editing = ref(false)
const draft = ref('')
const invalid = ref(false)

const state = computed(() => budgetState(props.limit, props.monthKwh, props.projection ? props.projection.kwh : null))
const chip = computed(() => {
	const k = 'plugins.WorkshopPower.consumption.'
	return {
		over: { color: 'error', icon: 'mdi-alert-circle-outline', text: i18n.t(k + 'budget_over') },
		near: { color: 'warning', icon: 'mdi-alert-outline', text: i18n.t(k + 'budget_near') },
		ok: { color: 'success', icon: 'mdi-check-circle-outline', text: i18n.t(k + 'budget_ok') }
	}[state.value.level] || { color: 'grey', icon: 'mdi-minus', text: '' }
})

function costOf(kwh) {
	return costText(kwh, props.tariff, i18n.locale)
}
function startEdit() {
	draft.value = props.limit > 0 ? String(props.limit) : ''
	invalid.value = false
	editing.value = true
}
function commit() {
	const v = parseLimit(draft.value)
	if (v == null) {
		invalid.value = true
		return
	}
	editing.value = false
	emit('update:limit', v)
}
</script>

<style scoped>
.budget-head {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 6px 8px;
}
.budget-edit {
	display: flex;
	align-items: flex-start;
	flex-wrap: wrap;
	gap: 8px;
	margin-top: 10px;
}
.budget-field {
	max-width: 220px;
	min-width: 160px;
}
.budget-numbers {
	margin-top: 10px;
	display: flex;
	flex-wrap: wrap;
	gap: 4px 8px;
	font-variant-numeric: tabular-nums;
}
.budget-used {
	font-weight: 500;
}
.budget-track {
	position: relative;
	height: 10px;
	margin-top: 6px;
	border-radius: 5px;
	background: rgba(128, 128, 128, 0.2);
}
.budget-fill {
	display: block;
	height: 100%;
	border-radius: 5px;
}
.budget-ok {
	background: rgb(var(--v-theme-success));
}
.budget-near {
	background: rgb(var(--v-theme-warning));
}
.budget-over {
	background: rgb(var(--v-theme-error));
}
.budget-proj {
	position: absolute;
	top: -3px;
	width: 2px;
	height: 16px;
	background: currentColor;
	opacity: 0.6;
}
</style>
