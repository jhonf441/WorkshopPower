<template>
	<!-- wp-page: the layout rules of the page (the one style block of the plugin, in PowerPage.vue). The side panel's body (.st-body) is THE card
	     of the open section: its head is a CardHead and what used to be cards inside it are .wf-group (a divider, no gray sub-card) -->
	<v-container :style="{ '--wf-sec': secColor }" fluid class="pa-0 consumption-page workshop-theme wp-page">
		<!-- the compact bar of the family: the lead is kept for screen readers and not drawn -->
		<page-header :lead="$t('plugins.WorkshopPower.common.lead')" icon="mdi-gauge" :title="$t('plugins.WorkshopPower.common.power_usage')" :reasons="headerReasons">
			<template v-slot:startup><startup-panel plugin="WorkshopPower" :defs="rowsStartup" /></template>
		</page-header>
		<!-- the band of the page, under the bar: a Duet without a Raspberry (any section) or the service down in the sections without that card note;
		     in Now the service missing / stopped goes under the head of its card (LiveSummary), alone -->
		<service-notice v-if="bandNotice" />
		<div class="st-layout">
			<side-tabs v-model="section" :items="sections" />
			<div class="st-body">
				<locked-cover v-if="lockedSection" :needed="lockedSection" :items="sections" :value="section" />
				<div v-if="!lockedSection && section === 'summary'">
					<!-- ===== Live reading + quick summary ===== -->
					<live-summary
						v-model="meterView" :state="liveState" :text="liveText" :has-data="!!consumptionCurrent" :view="view" :meters="listMeters"
						:cost-hour="costHour" :today-kwh="todayKwh" :month-kwh="monthKwh" :projection="projection" :tariff="tariff"
						:can-configure="canMeter" :error="readError" @configure="goAMeter()" @retry="loadSummaries(); loadTariff()"
					/>
					<running-job :job="running" :tariff="tariff" :meter="meterView" :watts="view.w" />
					<budget-card :limit="budgetLimit" :month-kwh="monthKwh" :projection="projection" :tariff="tariff" @update:limit="setBudget" />
					<div class="wf-group">
						<tariff-row :tariff="tariff" :read-failed="!!tariffError" @saved="tariff = $event; tariffError = null" />
					</div>
					<help-fold class="mt-3" :title="$t('plugins.WorkshopPower.consumption.summary_help_title')" :what="$t('plugins.WorkshopPower.consumption.summary_help_what')" :why="$t('plugins.WorkshopPower.consumption.summary_help_for')" :if-missing="$t('plugins.WorkshopPower.consumption.summary_help_missing')" :how="$t('plugins.WorkshopPower.consumption.summary_help_how')" />
				</div>
				<period-section v-if="!lockedSection && section === 'period'" :tariff="tariff" :meter="meterView" />
				<jobs-section
					v-if="!lockedSection && section === 'jobs'" :tariff="tariff" :meter="meterView" :has-activity="hasActivity" :running="running" :watts="view.w"
				/>
				<history-section v-if="!lockedSection && section === 'history'" :tariff="tariff" :meter="meterView" />
				<div v-if="!lockedSection && section === 'meter'" ref="meterCard">
					<!-- ===== Meter settings ===== -->
					<card-head icon="mdi-cog" :title="$t('plugins.WorkshopPower.consumption.meter_settings')" />
					<meter-config :live="liveState === 'dot-ok'" :open-editor="meterOpen || !consumptionCurrent" @changed="onChangeMeter()" @closed="meterOpen = false" />
				</div>
			</div>
		</div>
	</v-container>
</template>

<script>
import i18n from '../../i18n'

'use strict'

import ServiceNotice from './ServiceNotice.vue'
import { serviceProblemKind } from './service-problem.js' // vue/_shared36
import StartupPanel from './StartupPanel.vue' // start-up card (vue/_shared)
import PageHeader from './PageHeader.vue' // header of every page (vue/_shared)
import CardHead from './CardHead.vue' // the head of a card (vue/_shared36)
import HelpFold from './HelpFold.vue' // vue/_shared36
import { rowsConsumption } from './startup-rows.js'
import { api } from './workshop-api.js'
import LiveSummary from './LiveSummary.vue'
import RunningJob from './RunningJob.vue'
import BudgetCard from './BudgetCard.vue'
import PeriodSection from './PeriodSection.vue'
import JobsSection from './JobsSection.vue'
import HistorySection from './HistorySection.vue'
import MeterConfig from './MeterConfig.vue'
import TariffRow from './TariffRow.vue'
import { accessCanMixin } from './reason-mixin.js' // what the role and the service say (vue/_shared36)
import { workshopCan } from './workshop-auth.js'
import { METER_OPS, SCREEN_OPS } from './access-groups.js'
import { lockedItems, lockedNeed } from './role-view.js'
import SideTabs from './SideTabs.vue'
import LockedCover from './LockedCover.vue' // the cover of a section the role cannot open (vue/_shared36)
import { pluginOf, pathExists } from './workshop-ids.js' // Id nuevo o viejo del plugin
import { dataOf } from './plugin-data.js'
import { costText, fmtKwh } from './money.js' // amount in the language of DWC (test/money.test.js)
import { asDateLocal } from './dates.js'
import { runningJob, budgetState } from './job-insights.js' // tested in test/job-insights.test.js
import { loadLimit, saveLimit } from './budget-store.js'
import { sectionColor } from './section-colors.js' // the color of each section (--wf-sec)
import ErrorNotice from './ErrorNotice.vue' // vue/_shared36

export default {
	mixins: [accessCanMixin],
	// what the previous person read (the tiles, the rate) stays in no data of the page (ESTANDAR 3.1); onSessionChange reads it again
	sessionData: ['todayData', 'monthData', 'tariff', 'tilesError', 'tariffError'],
	sessionErrors: ['tilesError', 'tariffError'], // what a refusal or a failure said: cleared when the person signs in, out or changes role (role-mixin.js)
	components: { ErrorNotice, PageHeader, CardHead, HelpFold, SideTabs, LockedCover, ServiceNotice, StartupPanel, LiveSummary, RunningJob, BudgetCard, PeriodSection, JobsSection, HistorySection, MeterConfig, TariffRow },
	data() {
		let medView = '';
		try {
			medView = localStorage.getItem('workshopConsumptionMeter') || '';
		} catch (e) {
			medView = '';
		}
		return {
			meterView: medView, // '' = the main one, 'total' or the key of a meter
			// tiles on top
			todayData: null,
			monthData: null,
			tilesError: null, // the error of the last read of the tiles (today / month): said in a sentence, not swallowed
			tariffError: null, // the same for the rate
			// rate (API energy.rate_get / energy.rate_set, saved in the service's config)
			tariff: { currency: '', value_kwh: 0 }, // empty until the service answers (profile currency or none; no fixed currency)
			meterOpen: false,
			section: 'summary', // the section chosen in the side bar (Summary = the live reading)
			budgetLimit: loadLimit(), // monthly limit in kWh of this browser (0 = none)
			// "updated X ago": measured with the BROWSER's clock since the last snapshot arrived (the Pi's clock runs ~5 min
			// shifted, comparing against its ts would give false values)
			lastTs: null,
			lastReceived: null,
			now: Date.now(),
			timerTick: null,
			timerRefresh: null,
			timerHeartbeat: null
		};
	},
	computed: {
		// the meter group: the answer of the service for every operation of the group (the table of the role until it answers)
		canMeter() {
			return METER_OPS.every(op => this.canDo(op))
		},
		secColor() {
			return sectionColor(this.section)
		},
		// the Activity page is another plugin: the hint names it only when it is there
		hasActivity() {
			return pathExists(this.$router, '/Plugins/Activity');
		},
		// every section with its role (the note about the hidden ones needs them all)
		allSections() {
			const t = k => i18n.t('plugins.WorkshopPower.consumption.' + k);
			// F3-V (2026-10-21): everybody reads the consumption; the meter settings are a technician's
			return [
				{ id: 'summary', icon: 'mdi-gauge', label: t('nav_summary') },
				{ id: 'period', icon: 'mdi-chart-bar', label: t('nav_period') },
				{ id: 'jobs', icon: 'mdi-briefcase-clock-outline', label: t('nav_jobs') },
				{ id: 'history', icon: 'mdi-history', label: t('nav_history') },
				{ id: 'meter', icon: 'mdi-meter-electric-outline', label: t('nav_meter'), min: 'technician' }
			];
		},
		sections() {
			// the sections above the role stay in the list, locked (they open a cover that says why)
			return lockedItems(this.allSections, op => this.roleCan(op));
		},
		// the role that opens the open section, or '' when this role may
		lockedSection() {
			return lockedNeed(this.allSections, this.section, op => this.roleCan(op));
		},
		// the one error the summary tells (the tiles first): both reads usually fail for the same cause
		readError() {
			return this.tilesError || this.tariffError;
		},
		pluginModel() {
			const plugins = this.$store.state.machine.model.plugins;
			return pluginOf(plugins, 'service');
		},
		consumptionCurrent() {
			return dataOf(this.pluginModel, 'consumptionCurrent') || null;
		},
		// live meters (consumptionCurrent.meters of the poller)
		listMeters() {
			return (this.consumptionCurrent && this.consumptionCurrent.meters) || [];
		},
		view() {
			const ca = this.consumptionCurrent;
			if (!ca) return { w: null, v: null, a: null };
			const ms = this.listMeters;
			if (this.meterView === 'total' && ms.length > 1) {
				const own = ms.filter(m => m.ok && !m.inside_of);
				return {
					w: ca.total_w != null ? ca.total_w : null,
					v: ca.voltage_v,
					a: own.length ? own.reduce((t, m) => t + (m.current_a || 0), 0) : null
				};
			}
			const m = ms.find(x => x.key === this.meterView);
			if (m) return { w: m.ok ? m.power_w : null, v: m.ok ? m.voltage_v : null, a: m.ok ? m.current_a : null };
			return { w: ca.power_w, v: ca.voltage_v, a: ca.current_a };
		},
		consumptionTs() {
			return this.consumptionCurrent ? this.consumptionCurrent.ts : null;
		},
		// start-up card: is there a meter answering, and a recent reading
		rowsStartup() {
			return rowsConsumption({ hasData: !!this.consumptionCurrent, meters: this.listMeters, ageS: this.liveAgeS });
		},
		liveAgeS() {
			return this.lastReceived ? Math.max(0, Math.round((this.now - this.lastReceived) / 1000)) : null;
		},
		liveState() {
			if (!this.consumptionCurrent) {
				return 'dot-off';
			}
			return this.liveAgeS != null && this.liveAgeS > 90 ? 'dot-stale' : 'dot-ok';
		},
		liveText() {
			if (!this.consumptionCurrent) {
				return i18n.t('plugins.WorkshopPower.consumption.no_meter_data_configure_it_below');
			}
			const s = this.liveAgeS;
			if (s == null || s < 5) {
				return i18n.t('plugins.WorkshopPower.consumption.live');
			}
			if (s > 90) {
				return i18n.t('plugins.WorkshopPower.consumption.no_new_readings_for_min', { n: Math.round(s / 60) });
			}
			return i18n.t('plugins.WorkshopPower.consumption.live_s_ago', { s });
		},
		todayKwh() {
			return this.todayData ? this.todayData.total_kwh : null;
		},
		monthKwh() {
			return this.monthData ? this.monthData.total_kwh : null;
		},
		// Daily average of the days WITH data (the meter started saving in the middle of the month, and there are days with the
		// machine disconnected), counting today by the elapsed fraction, by the days of the month.
		projection() {
			if (!this.monthData || !this.monthData.buckets) {
				return null;
			}
			const b = this.monthData.buckets;
			const cur = this.monthData.current_index;
			const now = new Date(this.now);
			let kwh = 0;
			let days = 0;
			b.forEach((x, i) => {
				if (x.kwh == null || (cur != null && i > cur)) {
					return;
				}
				kwh += x.kwh;
				days += (i === cur) ? (now.getHours() * 60 + now.getMinutes()) / 1440 : 1;
			});
			if (days < 1) {
				return null;
			}
			const daily = kwh / days;
			return { daily, kwh: daily * b.length };
		},
		costHour() {
			if (!this.consumptionCurrent || this.view.w == null || !this.tariff.value_kwh) {
				return null;
			}
			return costText(this.view.w / 1000, this.tariff, this.$i18n.locale);
		},
		// the job that is running now (live job of the service, or a file the machine is running)
		running() {
			return runningJob(dataOf(this.pluginModel, 'liveJob') || null, this.$store.state.machine.model, this.now);
		},
		budget() {
			return budgetState(this.budgetLimit, this.monthKwh, this.projection ? this.projection.kwh : null);
		},
		bandNotice() {
			const kind = serviceProblemKind(this.$store)
			return !!kind && (this.section !== 'summary' || kind === 'no_sbc')
		},
		headerReasons() {
			const out = this.liveState === 'dot-ok' ? [] : [{ level: 'warn', text: this.liveText }]; // no meter data or stale readings
			const b = this.budget;
			if (b.level === 'over' || b.level === 'near') {
				out.push({ level: 'warn', text: i18n.t('plugins.WorkshopPower.consumption.' + (b.level === 'over' ? 'budget_header_over' : 'budget_header_near'), { used: fmtKwh(this.monthKwh), limit: fmtKwh(b.limit) }) });
			}
			return out;
		}
	},
	watch: {
		// the role changed and the open section is no longer for it (meter settings): back to the summary
		sections(list) {
			if (!list.some(x => x.id === this.section)) {
				this.section = 'summary';
			}
		},
		// when the chosen meter changes: reload today / month; the sections reload by themselves
		meterView(v) {
			try {
				localStorage.setItem('workshopConsumptionMeter', v || '');
			} catch (e) {
				/* not critical */
			}
			this.loadSummaries();
		},
		consumptionTs(ts) {
			if (ts && ts !== this.lastTs) {
				this.lastTs = ts;
				this.lastReceived = Date.now();
			}
		}
	},
	created() {
		// the same call the root of the page makes (one batch, one cache)
		this.wantCan(SCREEN_OPS)
	},
	mounted() {
		if (this.consumptionCurrent) {
			this.lastTs = this.consumptionCurrent.ts;
			this.lastReceived = Date.now();
		}
		this.loadTariff();
		this.loadSummaries();
		this.timerTick = setInterval(() => { this.now = Date.now(); }, 5000);
		// Today/month refresh every minute
		this.timerRefresh = setInterval(() => {
			if (this.pageVisible()) this.loadSummaries();
		}, 60000);
		// Heartbeat (DCS load, 2026-10-12): WorkshopService reads the meter at full speed only while this page is
		// visible; without a heartbeat for 30 s it slows down (dsf/viewers.py). Same pattern as the
		// trace view (src/_zones/47-job.js): every 10 s, only if the tab and the page are visible.
		this.timerHeartbeat = setInterval(() => this.heartbeat(), 10000);
		this.heartbeat();
	},
	beforeDestroy() {
		clearInterval(this.timerTick);
		clearInterval(this.timerRefresh);
		clearInterval(this.timerHeartbeat);
	},
	methods: {
		// what the TABLE of the role says (the side bar locks a section by role; the groups of buttons follow the service)
		roleCan(op) {
			void this.identityTick
			return workshopCan(op)
		},
		// the person signed in / out or the role changed: the rate and the tiles are read again (the sections read their own data)
		onSessionChange() {
			this.loadTariff();
			this.loadSummaries();
		},
		// the page is in view (DWC keeps it alive with keep-alive when going to another)
		pageVisible() {
			return !(document.hidden || !this.$el || this.$el.isConnected === false);
		},
		heartbeat() {
			if (!this.pageVisible()) return;
			api('view.heartbeat', { topic: 'power' }).catch(() => {});
		},
		setBudget(kwh) {
			this.budgetLimit = kwh > 0 ? kwh : 0;
			saveLimit(this.budgetLimit);
		},
		goAMeter() {
			this.meterOpen = true;
			this.section = 'meter';
			this.$nextTick(() => {
				const ref = this.$refs.meterCard;
				const el = ref && (ref.$el || ref); // the section is a plain element now (it was a v-card)
				if (el) {
					el.scrollIntoView({ behavior: 'smooth', block: 'start' });
				}
			});
		},
		onChangeMeter() {
			setTimeout(() => this.loadSummaries(), 35000);
		},
		periodArgs(date, period) {
			return Object.assign({ period, date: asDateLocal(date) }, this.meterView ? { meter: this.meterView } : {});
		},
		async loadSummaries() {
			const today = new Date();
			let failed = null;
			try {
				this.todayData = await api('energy.period', this.periodArgs(today, 'day'));
			} catch (e) {
				failed = e; // the last value stays, and the page says why it is not new
			}
			try {
				this.monthData = await api('energy.period', this.periodArgs(today, 'month'));
			} catch (e) {
				failed = failed || e;
			}
			this.tilesError = failed;
		},
		async loadTariff() {
			try {
				this.tariff = await api('energy.rate_get', {});
				this.tariffError = null;
			} catch (e) {
				this.tariffError = e; // the defaults remain (no currency, 0) and the page says why
			}
		}
	}
};
</script>
