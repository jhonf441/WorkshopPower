// download.js -- hands a text to the browser as a file (CSV exports). Returns false when the browser does not allow it.
// A byte-order mark goes first so a spreadsheet opens the accents of the text correctly.
'use strict';

export function downloadText(filename, text, type) {
	try {
		const blob = new Blob(['﻿' + text], { type: (type || 'text/csv') + ';charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		a.style.display = 'none';
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		setTimeout(() => URL.revokeObjectURL(url), 2000);
		return true;
	} catch (e) {
		return false;
	}
}
