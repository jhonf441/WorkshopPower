'use strict'

// The color of each section of the Power page, one place (the family reads it as --wf-sec on the page root: the 2 px line on
// top of the cards and the line of the open side item). The badge color of the page bar is in vue/_shared/plugin-colors.js.

export const SECTION_COLORS = {
	summary: '#FB8C00',
	period: '#1E88E5',
	jobs: '#AB47BC',
	history: '#26A69A',
	meter: '#7E57C2'
}

export function sectionColor(id) {
	return SECTION_COLORS[id] || '#FB8C00'
}
