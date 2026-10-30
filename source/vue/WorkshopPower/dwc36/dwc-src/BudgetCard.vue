<template>
	<v-card class="mb-3 budget">
		<v-card-text>
			<div class="budget-head">
				<v-icon small color="primary" aria-hidden="true">mdi-target</v-icon>
				<span class="text-subtitle-1 font-weight-medium">{{ $t('plugins.WorkshopPower.consumption.budget_title') }}</span>
				<v-chip v-if="state.level !== 'none'" small outlined :color="chip.color">
					<v-icon x-small left>{{ chip.icon }}</v-icon>{{ chip.text }}
				</v-chip>
				<v-spacer />
				<v-btn v-if="!editing && state.level === 'none'" small color="primary" outlined @click="startEdit()">
					<v-icon small left>mdi-flag-plus</v-icon>{{ $t('plugins.WorkshopPower.consumption.budget_set') }}
				</v-btn>
				<template v-else-if="!editing">
					<v-btn small text @click="startEdit()">{{ $t('plugins.WorkshopPower.consumption.budget_change') }}</v-btn>
					<v-btn small text @click="$emit('update:limit', 0)">{{ $t('plugins.WorkshopPower.consumption.budget_clear') }}</v-btn>
				</template>
			</div>

			<div v-if="editing" class="budget-edit">
				<v-text-field
					v-model="draft" :label="$t('plugins.WorkshopPower.consumption.budget_label')" dense outlined hide-details="auto"
					inputmode="decimal" :error-messages="invalid ? $t('plugins.WorkshopPower.consumption.budget_invalid') : ''" class="budget-field"
					@keyup.enter="commit()"
				/>
				<v-btn small color="primary" @click="commit()">{{ $t('plugins.WorkshopPower.consumption.budget_save') }}</v-btn>
				<v-btn small text @click="editing = false">{{ $t('plugins.WorkshopPower.consumption.budget_cancel') }}</v-btn>
			</div>
			<div v-if="!editing && state.level === 'none'" class="text-caption grey--text mt-1">{{ $t('plugins.WorkshopPower.consumption.budget_hint') }}</div>

			<template v-if="!editing && state.level !== 'none'">
				<div class="budget-numbers">
					<span class="budget-used">{{ $t('plugins.WorkshopPower.consumption.budget_spent', { used: fmtKwh(monthKwh), limit: fmtKwh(state.limit) }) }}</span>
					<span class="grey--text">&middot; {{ Math.round(state.pct) }}%</span>
					<span v-if="state.level !== 'over'" class="grey--text">&middot; {{ $t('plugins.WorkshopPower.consumption.budget_left', { kwh: fmtKwh(state.left) }) }}</span>
				</div>
				<div class="budget-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="Math.min(100, Math.round(state.pct))">
					<span class="budget-fill" :class="'budget-' + state.level" :style="{ width: Math.min(100, state.pct) + '%' }" />
					<span v-if="state.projPct != null && state.projPct < 100" class="budget-proj" :style="{ left: state.projPct + '%' }" />
				</div>
				<div v-if="projection" class="text-caption grey--text mt-1">
					{{ $t(state.projPct > 100 ? 'plugins.WorkshopPower.consumption.budget_projection_over' : 'plugins.WorkshopPower.consumption.budget_projection_ok', { kwh: fmtKwh(projection.kwh) }) }}
					<span v-if="costOf(projection.kwh)">({{ costOf(projection.kwh) }})</span>
				</div>
			</template>
		</v-card-text>
	</v-card>
</template>

<script>
import { fmtKwh, costText } from './money.js'
import { budgetState } from './job-insights.js'
import { parseLimit } from './budget-store.js'

export default {
	props: {
		limit: { type: Number, default: 0 },
		monthKwh: { type: Number, default: null },
		projection: { type: Object, default: null },
		tariff: { type: Object, default: () => ({ currency: '', value_kwh: 0 }) }
	},
	data() {
		return { editing: false, draft: '', invalid: false }
	},
	computed: {
		state() {
			return budgetState(this.limit, this.monthKwh, this.projection ? this.projection.kwh : null)
		},
		chip() {
			const k = 'plugins.WorkshopPower.consumption.'
			return {
				over: { color: 'error', icon: 'mdi-alert-circle-outline', text: this.$t(k + 'budget_over') },
				near: { color: 'warning', icon: 'mdi-alert-outline', text: this.$t(k + 'budget_near') },
				ok: { color: 'success', icon: 'mdi-check-circle-outline', text: this.$t(k + 'budget_ok') }
			}[this.state.level] || { color: 'grey', icon: 'mdi-minus', text: '' }
		}
	},
	methods: {
		fmtKwh,
		costOf(kwh) {
			return costText(kwh, this.tariff, this.$i18n.locale)
		},
		startEdit() {
			this.draft = this.limit > 0 ? String(this.limit) : ''
			this.invalid = false
			this.editing = true
		},
		commit() {
			const v = parseLimit(this.draft)
			if (v == null) {
				this.invalid = true
				return
			}
			this.editing = false
			this.$emit('update:limit', v)
		}
	}
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
	background: var(--v-success-base, #4caf50);
}
.budget-near {
	background: var(--v-warning-base, #fb8c00);
}
.budget-over {
	background: var(--v-error-base, #ff5252);
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
