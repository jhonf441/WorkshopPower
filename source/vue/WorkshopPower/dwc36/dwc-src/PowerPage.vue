<template>
	<div>
		<!-- no meter: the same page as with one (the family bar, one card with its head), only the card says how to enable it -->
		<v-container v-if="view === 'none'" :style="{ '--wf-sec': secColor }" fluid class="pa-0 consumption-page workshop-theme wp-page">
			<service-notice />
			<page-header :lead="$t('plugins.WorkshopPower.common.lead')" icon="mdi-gauge" :title="$t('plugins.WorkshopPower.common.power_usage')" />
			<v-card class="mb-3">
				<v-card-text>
					<card-head icon="mdi-meter-electric-outline" :title="$t('plugins.WorkshopPower.noMeter.title')" />
					<p class="wp-line">{{ $t('plugins.WorkshopPower.noMeter.text') }}</p>
					<div class="wp-actions">
						<v-btn color="primary" :disabled="!canEnable" :loading="busy" @click="enable()">{{ $t('plugins.WorkshopPower.noMeter.enable') }}</v-btn>
						<lock-reason :ops="profileOps" min="admin" :subject="$t('plugins.WorkshopPower.subjects.profile')" />
					</div>
					<error-notice :error="error" class="mt-2" />
				</v-card-text>
			</v-card>
		</v-container>
		<consumption v-else />
	</div>
</template>

<script>
import ServiceNotice from './ServiceNotice.vue'
import PageHeader from './PageHeader.vue' // header of every page (vue/_shared36)
import CardHead from './CardHead.vue' // the head of a card (vue/_shared36)
import Consumption from './Consumption.vue'
import ErrorNotice from './ErrorNotice.vue' // vue/_shared
import LockReason from './LockReason.vue' // vue/_shared36
import { accessCanMixin } from './reason-mixin.js' // the answers of the service, by operation (vue/_shared36)
import { PROFILE_OPS, SCREEN_OPS } from './access-groups.js'
import { api } from './workshop-api.js'
import { workshopProfile } from './machine-profile.js'
import { powerView, enableMeterChange } from './meter-gate.js'
import { sectionColor } from './section-colors.js' // the color of each section (--wf-sec)

// Root of the Power page: when the machine profile says there is no meter, the consumption sections are not shown (they would
// only wait for readings that never come) and a clear message takes their place; otherwise the full page.
export default {
	mixins: [accessCanMixin],
	components: { ServiceNotice, PageHeader, CardHead, Consumption, ErrorNotice, LockReason },
	data() {
		return { available: null, busy: false, error: null, profileOps: PROFILE_OPS }
	},
	computed: {
		view() { return powerView(this.available) },
		// the answer of the service for the operation (the table of the role until it answers)
		canEnable() { return PROFILE_OPS.every(op => this.canDo(op)) },
		// the card speaks of the meter: the color of the meter section
		secColor() { return sectionColor('meter') }
	},
	async created() {
		// ONE call to auth.can for every group of the page (the sections below ask the same cache)
		this.wantCan(SCREEN_OPS)
		await workshopProfile.get()
		this.available = workshopProfile.meterAvailable()
	},
	methods: {
		async enable() {
			this.busy = true
			this.error = null
			try {
				await api('profile.set', { changes: enableMeterChange() })
				await workshopProfile.get(true)
				this.available = workshopProfile.meterAvailable()
			} catch (e) {
				this.error = e
			} finally {
				this.busy = false
			}
		}
	}
}
</script>

<style>
/* The Power page (family redesign of 2026-11-23). The look is the family's (design/family*.css: the scale of buttons and fields, CardHead,
   .wf-group, .wf-stats, .wf-notice); this block only lays out what Power arranges itself. Not scoped: the sections are child components;
   every rule starts at .wp-page (the root of both views), so nothing leaks out of the page. */
/* a narrow card: the actions of a head go under its title instead of squeezing it */
.wp-page .wf-card-head { flex-wrap: wrap; }
/* the one secondary line under a head */
.wp-page .wp-line { margin: 0 0 12px; font-size: 13px; line-height: 1.45; opacity: 0.8; max-width: 72ch; }
/* a row of controls (the main button and its reason, the segments and the navigation of a section) */
.wp-page .wp-actions, .wp-page .wp-toolbar { display: flex; align-items: center; flex-wrap: wrap; gap: var(--wf-gap-hit, 8px); }
.wp-page .wp-toolbar { margin-bottom: 12px; }
/* inside a figure: the unit after the value and the line under it; a note under a group */
.wp-page .wp-unit { font-size: 13px; font-weight: 400; opacity: 0.7; }
.wp-page .wp-sub { font-size: 12px; opacity: 0.7; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wp-page .wp-note { margin-top: 8px; font-size: 12px; line-height: 1.45; opacity: 0.7; }
</style>
