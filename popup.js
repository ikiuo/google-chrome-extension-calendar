"use strict";

/*
 * 休日データ
 */

class JHoliday {
	static #startDate = (new Date(1970, 1-1, 1)).getTime() * 10;
	static #offsetVE = JHoliday.#startDate +  68619916800;
	static #offsetAE = JHoliday.#startDate + 229674407040;
	static #yEquinox = 315569255616;

	static #monthTable = [...Array(12)].map(() => ({}));
	static #createParameter(name, month, day, start, end) {
		const S = JHoliday;

		month -= 1;
		const holidy = {
			name: name,
			month: month,
			day: day,
			start: Math.max(1948, (start ?? 0)),
			end: end ?? 10000,
		}
		const table = S.#monthTable;
		const mtab = table[month];
		if (!mtab[day])
			mtab[day] = [];
		mtab[day].push(holidy);
		return holidy;
	}

	static #mainTable = [
		['元日', 1, 1],
		['成人の日', 1, 15, 0, 1999],
		['成人の日', 1, 'M2', 2000],

		['建国記念の日', 2, 11],

		['春分の日', 3, 'VE'],

		['憲法記念日', 5, 3],
		['みどりの日', 5, 4, 2007],
		['こどもの日', 5, 5],

		['海の日', 7, 20, 1996, 2002],
		['海の日', 7, 'M3', 2003],

		['山の日', 8, 11, 2016],

		['敬老の日', 9, 15, 1966, 2002],
		['敬老の日', 9, 'M3', 2003],
		['秋分の日', 9, 'AE'],

		['体育の日', 10, 10, 0, 1999],
		['体育の日', 10, 'M2', 2000, 2019],
		['スポーツの日', 10, 'M2', 2020],

		['文化の日', 11, 3],
		['勤労感謝の日', 11, 23],

		/* 昭和 */
		['天皇誕生日', 4, 29, 0, 1988],
		['みどりの日', 4, 29, 1989, 2006],
		['昭和の日', 4, 29, 2007],

		/* 平成 */
		['天皇誕生日', 12, 23, 1989, 2018],

		/* 令和 */
		['天皇の即位の日', 5, 1, 2019, 2019],
		['即位礼正殿の儀が行われる日', 10, 22, 2019, 2019],
		['天皇誕生日', 2, 23, 2020],

	].map((v) => JHoliday.#createParameter(...v));

	static #altname = '休日';

	static #getBasic(date) {
		const S = JHoliday;

		const year = date.getFullYear();
		const month = date.getMonth();
		const mday = date.getDate();
		const wday = date.getDay();

		const mtab = S.#monthTable[month]
		const dtab = mtab[mday];
		if (dtab) {
			const t = dtab.filter((h) =>
				(h.start <= year && year <= h.end));
			if (t.length)
				return t[0].name;
		}
		if (wday == 1) {
			const mweek = Math.trunc((mday - 1) / 7);
			const monday = mtab[`M${mweek+1}`];
			if (monday) {
				const t = monday.filter((h) =>
					(h.start <= year && year <= h.end));
				if (t.length)
					return t[0].name;
			}
		}

		const ve = mtab['VE'];
		if (ve) {
			const equniox = S.getVernalEquinox(year);
			if (mday == equniox.getDate())
				return ve[0].name;
		}

		const ae = mtab['AE'];
		if (ae) {
			const equniox = S.getAutumnEquinox(year);
			if (mday == equniox.getDate())
				return ae[0].name;
		}

		return undefined;
	}

	static #weekCache = {}
	static #getWeek(date) {
		const S = JHoliday;

		const year = date.getFullYear();
		const month = date.getMonth();
		const mday = date.getDate();
		const wday = date.getDay();
		const wtop = new Date(year, month, 1).getDay();
		const mweek = Math.trunc((wtop + mday - 1) / 7);
		const index = (year * 12 + month) * 6 + mweek;

		const cache = S.#weekCache[index];
		if (cache)
			return cache;

		const line = [...Array(8)].map((_, i) =>
			S.#getBasic(new Date(year, month, mday - wday + i)));
		if (year >= 1973 && line[0]) {
			for (let i = 1; i < 7; i++) {
				if (!line[i]) {
					line[i] = S.#altname;
					break;
				}
			}
		}
		if (year >= 1986)
			for (let i = 1; i < 7; i++)
				if (!line[i] && line[i - 1] && line[i + 1])
					line[i] = S.#altname;

		S.#weekCache[index] = line;
		return line;
	}

	// 年から春分の日(Date型)を取得.
	static getVernalEquinox(year) {
		const S = JHoliday;
		return new Date(((year - 1970) * S.#yEquinox + S.#offsetVE) / 10);
	}

	// 年から秋分の日(Date型)を取得.
	static getAutumnEquinox(year) {
		const S = JHoliday;
		return new Date(((year - 1970) * S.#yEquinox + S.#offsetAE) / 10);
	}

	// Date 型から休日を取得.
	static getHoliday(date) {
		const S = JHoliday;
		return S.#getWeek(date)[date.getDay()];
	}
}

/*
 * 休日ありの Date 派生クラス
 */

class JHDate extends Date {
	#holiday;

	constructor() {
		super(...arguments);
		this.#holiday = JHoliday.getHoliday(this);
	}

	// 休日を取得.
	getHoliday() {
		return this.#holiday;
	}
}

/*
 * 週/月
 */

// リストを週単位の行列に変換.
function toWeekly(l) {
	return [...Array(Math.trunc(l.length / 7))]
		.map((_, w) => l.slice(w * 7, w * 7 + 7));
}

// 月間 JHDate のスリとを取得.
function getMonthlyJHDates(date) {
	const year = date.getFullYear();
	const month = date.getMonth();
	return [...Array(new Date(year, month + 1, 0).getDate())]
		.map((_, i) => new JHDate(year, month, i + 1));
}

// 週の前方を補間するためのリストを取得.
function getWeeklyPrefix(date) {
	const y = date.getFullYear();
	const m = date.getMonth();
	const ns = date.getDay();
	return [...Array(ns)]
		.map((_, i) => new JHDate(y, m, 1 + i - ns));
}

// 週の後方を補間するためのリストを取得.
function getWeeklySuffix(date) {
	const y = date.getFullYear();
	const m = date.getMonth();
	return [...Array(6 - date.getDay())]
		.map((_, i) => new JHDate(y, m + 1, 1 + i));
}

// 月間カレンダー用 JHDate 行列の取得.
function getMonthlyMatrix(date) {
	const mlist = getMonthlyJHDates(date);
	const s = mlist[0];
	const e = mlist[mlist.length - 1];
	const pfx = getWeeklyPrefix(s);
	const sfx = getWeeklySuffix(e);
	return toWeekly(pfx.concat(mlist, sfx));
}

/*
 * DOM 操作
 */

const createTag = {};
[
	'div', 'p', 'span',
	'table', 'td', 'tr',
].forEach((name) =>
	createTag[name] = (() => document.createElement(name))
);

// 月間カレンダー
class JHMonthlyCalendar {
	constructor(date, option) {
		this.today = new Date();
		this.date = date ?? this.today;
		this.option = option ?? {};
		this.getHeader = (this.option.month_header ??
						  ((y, m) => `${y}年${m}月`));
		const cpfx = this.option.prefix ?? '';

		this.className = {
			month: {
				table: `${cpfx}month`,
			},
			arrow: {
				td: `${cpfx}marrow`,
			},
			header: {
				td: `${cpfx}mheader`,
			},
			weekofday: {
				td: `${cpfx}wodbox`,
				div: `${cpfx}weekofday`,
			},
			wodheader: [
				{ div: `${cpfx}wsunday` },
				{ div: `${cpfx}wmonday` },
				{ div: `${cpfx}wtuesday` },
				{ div: `${cpfx}wwednesday` },
				{ div: `${cpfx}wthursday` },
				{ div: `${cpfx}wfriday` },
				{ div: `${cpfx}wsaturday` },
			],

			day: {
				td: `${cpfx}daybox`,
				div: `${cpfx}day`,
			},
			today: {
				div: `${cpfx}today`,
			},
			holiday: {
				div: `${cpfx}holiday`,
			},
			popup: {
				div: `${cpfx}info`,
			},
			other: {
				div: `${cpfx}other`,
			},
			week: [
				{ div: `${cpfx}sunday` },
				{ div: `${cpfx}monday` },
				{ div: `${cpfx}tuesday` },
				{ div: `${cpfx}wednesday` },
				{ div: `${cpfx}thursday` },
				{ div: `${cpfx}friday` },
				{ div: `${cpfx}saturday` },
			],
		}

		this.tagTable = createTag.table();
		this.tagTable.className = this.className.month.table;

		this.setCalendar();
	}

	clearTable() {
		while (this.tagTable.firstChild)
			this.tagTable.removeChild(this.tagTable.firstChild);
	}

	setCalendar() {
		if (!this.option.local)
			setSettingDate(this.date, 'monthly');

		this.year = this.date.getFullYear();
		this.month = this.date.getMonth();
		this.weekly = getMonthlyMatrix(this.date);
		this.tagHeader = null;
		this.header = null;

		this.setHeader();
		this.setWeek();
		this.setMatrix();
	}

	updateCalendar() {
		this.clearTable()
		this.setCalendar()
	}

	setHeader() {
		const header = this.getHeader(this.year, this.month + 1);
		if (!header || !header.length)
			return;
		this.header = header;

		const fixed = this.option.fixed;
		const tr = createTag.tr();
		if (!fixed) {
			const td = createTag.td();
			td.className = this.className.arrow.td;
			td.innerText = '←';
			td.onclick = (() => this.prevMonth());
			tr.appendChild(td);
		}
		{
			const td = createTag.td();
			this.tagHeader = td;

			td.className = this.className.header.td;
			td.setAttribute('colspan', fixed ? 7 : 5);
			td.innerText = header;
			if (!fixed)
				td.onclick = (() => this.moveToday());
			tr.appendChild(td);
		}
		if (!fixed) {
			const td = createTag.td();
			td.className = this.className.arrow.td;
			td.innerText = '→';
			td.onclick = (() => this.nextMonth());
			tr.appendChild(td);
		}
		this.tagTable.appendChild(tr);
	}

	setWeek() {
		if (!this.option.weekofday)
			return;

		const tr = createTag.tr();
		[...'日月火水木金土'].forEach((c, i) => {
			const td = createTag.td();
			td.className = this.className.weekofday.td;

			const cn_weekofday = this.className.weekofday.div;
			const cn_wodheader = this.className.wodheader[i].div;
			const div = createTag.div();
			div.className = `${cn_weekofday} ${cn_wodheader}`.trim();
			div.innerText = c;

			td.appendChild(div);
			tr.appendChild(td);
		});

		this.tagTable.appendChild(tr);
	}

	setMatrix() {
		const today = this.today;
		const chktoday = ((today.getFullYear() == this.year &&
						   today.getMonth() == this.month)
						  ? today.getDate() : null);
		const tagHeader = this.tagHeader;
		const c_day_td = this.className.day.td;
		const c_day_div = this.className.day.div;
		const c_today_div = this.className.today.div;
		const c_holiday_div = this.className.holiday.div;
		const c_week = this.className.week;
		const c_other_div = this.className.other.div;

		this.weekly.forEach((week, y) => {
			const tr = createTag.tr();
			week.forEach((day, x) => {
				const holiday = day.getHoliday();
				const td = createTag.td();
				td.className = c_day_td;
				{
					const div = createTag.div();
					const cn_other = ((day.getMonth() != this.month) ? c_other_div : null);
					const cn_holiday = (holiday ? c_holiday_div : null);
					const cn_week = c_week[day.getDay()].div;
					const cn_day = cn_other ?? cn_holiday ?? cn_week;
					const cn_today = ((day.getDate() == chktoday) ? c_today_div : '');
					div.className = `${c_day_div} ${cn_day} ${cn_today}`.trim();
					div.innerText = day.getDate();
					td.appendChild(div);
				}
				if (holiday && tagHeader) {
					td.onmouseenter = (() => this.tagHeader.innerText = holiday);
					td.onmouseleave = (() => this.tagHeader.innerText = this.header);
				}
				tr.appendChild(td);
				return td;
			});
			this.tagTable.appendChild(tr);
			return tr;
		});
	}

	// Event

	prevMonth() {
		this.moveMonth(new Date(this.year, this.month - 1, 1));
	}
	nextMonth() {
		this.moveMonth(new Date(this.year, this.month + 1, 1));
	}
	moveMonth(date) {
		this.today = new Date();
		this.date = date;
		this.updateCalendar();
	}
	moveToday() {
		this.today = new Date();
		this.date = this.today;
		this.updateCalendar();
	}
}

// 年間カレンダー
class JHYearlyCalendar {
	constructor(date, option) {
		this.today = new Date();
		this.date = date ?? this.today;
		this.option = option ?? {};
		const cpfx = this.option.prefix ?? '';

		this.className = {
			year: {
				table: `${cpfx}year`,
			},
			arrow: {
				span: `${cpfx}yallow`,
			},
			header: {
				td: `${cpfx}yhbox`,
				span: `${cpfx}yheader`,
			},
			month: {
				td: `${cpfx}ymonth`,
			},
		}

		this.tagTable = createTag.table();
		this.tagTable.className = this.className.year.table;

		this.setCalendar();
	}

	clearTable() {
		while (this.tagTable.firstChild)
			this.tagTable.removeChild(this.tagTable.firstChild);
	}

	setCalendar() {
		setSettingDate(this.date, 'yearly');

		this.year = this.date.getFullYear();

		const prefix = this.option.prefix ?? '';
		const year = this.date.getFullYear();

		this.yearly = [...Array(12)].map((_, m) =>
			new JHMonthlyCalendar(new Date(this.year, m), {
				prefix: prefix,
				month_header: (y, m) => `${m}月`,
				local: true,
				fixed: true,
			}).tagTable);

		this.tagHeader = null;
		this.header = null;

		this.setHeader();
		this.setMatrix();
	}

	updateCalendar() {
		this.clearTable()
		this.setCalendar()
	}

	setHeader() {
		const space = '&nbsp;'.repeat(4);
		const tr = createTag.tr();
		const td = createTag.td();
		td.className = this.className.header.td;
		td.setAttribute('colspan', '3');
		{
			const span = createTag.span();
			span.className = this.className.arrow.span;
			span.innerText = '←';
			span.onclick = (() => this.prevYear());
			td.appendChild(span);
		}
		td.insertAdjacentHTML('beforeend', `<span>${space}</span>`)
		{
			const span = createTag.span();
			span.className = this.className.header.span;
			span.innerText = `${this.year}年`;
			span.onclick = (() => this.moveToday());
			td.appendChild(span);
		}
		td.insertAdjacentHTML('beforeend', `<span>${space}</span>`)
		{
			const span = createTag.span();
			span.className = this.className.arrow.span;
			span.onclick = (() => this.nextYear());
			span.innerText = '→';
			td.appendChild(span);
		}
		tr.appendChild(td);

		this.tagTable.appendChild(tr);
	}

	setMatrix() {
		for (let y = 0; y < 4; y++) {
			const tr = createTag.tr();
			this.yearly.slice(y * 3, y * 3 + 3).forEach((m) => {
				const td = createTag.td();
				td.className = this.className.month.td;
				td.style.setProperty('vertical-align', 'top');
				td.appendChild(m);
				tr.appendChild(td);
			});
			this.tagTable.appendChild(tr);
		}
	}

	// Event

	prevYear() {
		this.moveYear(new Date(this.year - 1, 0, 1));
	}
	nextYear() {
		this.moveYear(new Date(this.year + 1, 0, 1));
	}
	moveYear(date) {
		this.today = new Date();
		this.date = date;
		this.updateCalendar();
	}
	moveToday() {
		this.today = new Date();
		this.date = this.today;
		this.updateCalendar();
	}
}

// 15週カレンダー
class JHWeek15Calendar {
	constructor(date, option) {
		this.today = new Date();
		this.date = date ?? this.today;
		this.option = option ?? {};
		this.getHeader = (this.option.weeks_header ??
						  ((d) => `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`));
		const cpfx = this.option.prefix ?? '';

		this.className = {
			weeks: {
				table: `${cpfx}month`,
			},
			arrow: {
				td: `${cpfx}marrow`,
			},
			header: {
				td: `${cpfx}whbox`,
				span: `${cpfx}hinfo`,
			},

			weekofday: {
				td: `${cpfx}wodbox`,
				div: `${cpfx}weekofday`,
			},
			wodheader: [
				{ div: `${cpfx}wsunday` },
				{ div: `${cpfx}wmonday` },
				{ div: `${cpfx}wtuesday` },
				{ div: `${cpfx}wwednesday` },
				{ div: `${cpfx}wthursday` },
				{ div: `${cpfx}wfriday` },
				{ div: `${cpfx}wsaturday` },
			],

			month: [
				{ div: `${cpfx}modd` },
				{ div: `${cpfx}meven` },
			],
			day: {
				td: `${cpfx}daybox`,
				div: `${cpfx}day`,
			},
			today: {
				div: `${cpfx}today`,
			},
			holiday: {
				div: `${cpfx}holiday`,
			},
			popup: {
				div: `${cpfx}info`,
			},
			other: {
				div: `${cpfx}other`,
			},
			week: [
				{ div: `${cpfx}sunday` },
				{ div: `${cpfx}monday` },
				{ div: `${cpfx}tuesday` },
				{ div: `${cpfx}wednesday` },
				{ div: `${cpfx}thursday` },
				{ div: `${cpfx}friday` },
				{ div: `${cpfx}saturday` },
			],
		}

		this.pastWeeks = this.option.past ?? 7;
		this.nextWeeks = this.option.next ?? 7;
		this.totalWeeks = this.pastWeeks + 1 + this.nextWeeks;

		this.tagTable = createTag.table();
		this.tagTable.className = this.className.weeks.table;

		this.setCalendar();
	}

	clearTable() {
		while (this.tagTable.firstChild)
			this.tagTable.removeChild(this.tagTable.firstChild);
	}

	setCalendar() {
		setSettingDate(this.date, 'weekly');

		this.year = this.date.getFullYear();
		this.month = this.date.getMonth();
		const mday = this.date.getDate();
		const wday = this.date.getDay();

		const cday = mday - wday;
		const sday = cday - this.pastWeeks * 7;
		this.weekly = [...Array(this.totalWeeks)].map(
			(_, y) => [...Array(7)].map((_, x) =>
				new JHDate(this.year, this.month, sday + y * 7 + x)));

		this.tagHeader = null;
		this.header = null;

		this.setHeader();
		this.setWeek();
		this.setMatrix();
	}

	setHeader() {
		const header = this.getHeader(this.today);
		if (!header || !header.length)
			return;
		this.header = header + '(本日)';

		const fixed = true;
		const tr = createTag.tr();
		const td = createTag.td();
		this.tagHeader = td;

		td.className = this.className.header.td;
		td.setAttribute('colspan', 7);
		td.innerText = this.header;
		td.onclick = (() => this.moveToday());

		tr.appendChild(td);
		this.tagTable.appendChild(tr);
	}

	setWeek() {
		if (!this.option.weekofday)
			return;

		const tr = createTag.tr();
		[...'日月火水木金土'].forEach((c, i) => {
			const td = createTag.td();
			td.className = this.className.weekofday.td;

			const cn_weekofday = this.className.weekofday.div;
			const cn_wodheader = this.className.wodheader[i].div;
			const div = createTag.div();
			div.className = `${cn_weekofday} ${cn_wodheader}`.trim();
			div.innerText = c;

			td.appendChild(div);
			tr.appendChild(td);
		});

		this.tagTable.appendChild(tr);
	}

	setMatrix() {
		const today = this.today;
		const tagHeader = this.tagHeader;
		const c_day_td = this.className.day.td;
		const c_day_div = this.className.day.div;
		const c_month = this.className.month;
		const c_today_div = this.className.today.div;
		const c_holiday_div = this.className.holiday.div;
		const c_week = this.className.week;

		this.weekly.forEach((w, y) => {
			const tr = createTag.tr();
			w.forEach((day, x) => {
				const holiday = day.getHoliday();
				const td = createTag.td();
				td.className = this.className.day.td;
				{
					const div = createTag.div();
					const cn_holiday = (holiday ? c_holiday_div : null);
					const cn_week = c_week[day.getDay()].div;
					const cn_day = cn_holiday ?? cn_week;
					const cn_month = c_month[day.getMonth() & 1].div;
					const cn_today = ((today.getFullYear() == day.getFullYear() &&
									   today.getMonth() == day.getMonth() &&
									   today.getDate() == day.getDate())
									  ? c_today_div : '');
					div.className = `${c_day_div} ${cn_day} ${cn_month} ${cn_today}`.trim();
					div.innerText = day.getDate();
					if (this.header) {
						div.onmouseenter = (() => this.tagHeader.innerText = holiday ?? this.getHeader(day));
						div.onmouseleave = (() => this.tagHeader.innerText = this.header);
					}
					div.onclick = (() => this.moveDay(day));
					td.appendChild(div);
				}
				/**/
				tr.appendChild(td);
			});
			this.tagTable.appendChild(tr);
		});
	}

	updateCalendar() {
		this.clearTable()
		this.setCalendar()
	}

	moveDay(date) {
		this.today = new Date();
		this.date = date;
		this.updateCalendar();
	}
	moveToday() {
		this.today = new Date();
		this.date = this.today;
		this.updateCalendar();
	}
}

/*
 *
 */

const extSettings = {
	calendar: 2,
	date: {
		weekly: [1970, 0, 1],
		monthly: [1970, 0, 1],
		yearly: [1970, 0, 1],
	},
};
(() => {
	const now = new Date();
	const save = [
		now.getFullYear(),
		now.getMonth(),
		now.getDate(),
	];
	extSettings.date.weekly = save;
	extSettings.date.monthly = save;
	extSettings.date.yearly = save;
})();

function loadSettingDate(name) {
	return new Date(...extSettings.date[name]);
}

function setSettingDate(date, name) {
	extSettings.date[name] = [
		date.getFullYear(),
		date.getMonth(),
		date.getDate(),
	];
	saveSettings();
}

function loadSettings() {
	return Promise.all([
		chrome.storage.sync.get('calendar'),
		chrome.storage.sync.get('date'),
	]).then((values) => {
		extSettings.calendar = values[0].calendar ?? 1;
		if (values[1].date) extSettings.date = values[1].date;

		console.log('loadSettings', extSettings);
	});
}

function saveSettings() {
	chrome.storage.sync.set(extSettings);

	console.log('saveSettings', extSettings);
}

/*
 *
 */

function onSelect(n) {
	[tagMonthlyButton, tagWeeklyButton, tagYearlyButton].forEach((tag, i) => {
		tag.style.setProperty('color', (i == n) ? 'darkred' : 'black');
	});
	[tagMonthly, tagWeekly, tagYearly]
		.forEach((tag, i) => tag.hidden = (i != n));

	extSettings.calendar = n;
	saveSettings();
}

function onLoad() {
	const option = {
		prefix: 'jhcal', // クラス名の前置文字.
		// header_format: (y, m) => `${m}月`, // 年月部の文字列.
		// fixed: true, // 月移動しない.
		weekofday: true, // 曜日を表示.
	}

	tagMonthlyButton.onclick = (() => onSelect(0));
	tagWeeklyButton.onclick = (() => onSelect(1));
	tagYearlyButton.onclick = (() => onSelect(2));

	tagMonthly.appendChild(new JHMonthlyCalendar(loadSettingDate('monthly'), option).tagTable);
	tagWeekly.appendChild(new JHWeek15Calendar(loadSettingDate('weekly'), option).tagTable);
	tagYearly.appendChild(new JHYearlyCalendar(loadSettingDate('yearly'), option).tagTable);

	onSelect(extSettings.calendar);
}

window.onload = function() {
	loadSettings().then(onLoad, onLoad);
};
