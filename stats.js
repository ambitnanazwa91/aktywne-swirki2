const SUPABASE_URL = 'https://tbnomvxxwdzdtecdhitb.supabase.co'
const SUPABASE_KEY = 'sb_publishable_DlbO2_NlF_ArEN-Q2yGgSA_BCcGCfPv'

const MONTHS_PL = [
	'styczeń',
	'luty',
	'marzec',
	'kwiecień',
	'maj',
	'czerwiec',
	'lipiec',
	'sierpień',
	'wrzesień',
	'październik',
	'listopad',
	'grudzień',
]

const ACTIVITY_SYMBOLS = {
	Spacer: '🐾',
	Joga: '🧘',
	Rower: '🚲',
	Basen: '🏊',
	Nauka: '📚',
}

const elements = {
	month: document.querySelector('#statsMonth'),
	previousMonth: document.querySelector('#statsPrevMonth'),
	nextMonth: document.querySelector('#statsNextMonth'),
	status: document.querySelector('#statsStatus'),
	total: document.querySelector('#totalActivities'),
	activeDays: document.querySelector('#activeDays'),
	topActivity: document.querySelector('#topActivity'),
	sharedBudget: document.querySelector('#sharedBudget'),
	breakdown: document.querySelector('#activityBreakdown'),
	people: document.querySelector('#peopleComparison'),
	recent: document.querySelector('#recentActivities'),
}

const today = new Date()
let selectedMonth = getInitialMonth()
let activities = []
let supa = null

try {
	if (!window.supabase?.createClient) throw new Error('Biblioteka Supabase nie została załadowana.')
	supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
} catch (error) {
	console.error(error)
}

function getInitialMonth() {
	const value = new URLSearchParams(window.location.search).get('month')
	const match = value?.match(/^(\d{4})-(\d{1,2})$/)

	if (match) {
		const year = Number(match[1])
		const monthIndex = Number(match[2])
		if (monthIndex >= 0 && monthIndex <= 11) return new Date(year, monthIndex, 1)
	}

	return new Date(today.getFullYear(), today.getMonth(), 1)
}

function parseActivityDate(value) {
	if (typeof value !== 'string') return null

	let day
	let month
	let year

	if (/^\d{2}-\d{2}-\d{4}$/.test(value)) {
		;[day, month, year] = value.split('-').map(Number)
	} else if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
		;[year, month, day] = value.slice(0, 10).split('-').map(Number)
	} else {
		return null
	}

	const parsed = new Date(year, month - 1, day)
	if (Number.isNaN(parsed.getTime())
		|| parsed.getFullYear() !== year
		|| parsed.getMonth() !== month - 1
		|| parsed.getDate() !== day) return null
	return parsed
}

function setStatus(message, type = '') {
	elements.status.textContent = message
	elements.status.classList.toggle('is-error', type === 'error')
}

function createState(message) {
	const state = document.createElement('div')
	state.className = 'state-card state-card-compact'
	state.textContent = message
	return state
}

function updateMonthInUrl() {
	const url = new URL(window.location.href)
	url.searchParams.set('month', `${selectedMonth.getFullYear()}-${selectedMonth.getMonth()}`)
	window.history.replaceState({}, '', url)
}

function getMonthActivities() {
	return activities
		.map(activity => ({ ...activity, parsedDate: parseActivityDate(activity.date_of_activity) }))
		.filter(activity => activity.parsedDate
			&& activity.parsedDate.getFullYear() === selectedMonth.getFullYear()
			&& activity.parsedDate.getMonth() === selectedMonth.getMonth())
		.sort((a, b) => b.parsedDate - a.parsedDate)
}

function getActivityCounts(monthActivities) {
	return monthActivities.reduce((counts, activity) => {
		const name = activity.activity || 'Inna'
		counts.set(name, (counts.get(name) || 0) + 1)
		return counts
	}, new Map())
}

function renderMetrics(monthActivities, activityCounts) {
	const uniqueDays = new Set(monthActivities
		.filter(item => item.parsedDate)
		.map(item => `${item.parsedDate.getFullYear()}-${item.parsedDate.getMonth()}-${item.parsedDate.getDate()}`))

	const sortedActivities = [...activityCounts.entries()].sort((a, b) => b[1] - a[1])
	const paulinaCount = monthActivities.filter(item => item.person === 'Paulina').length
	const matiCount = monthActivities.filter(item => item.person === 'Mati').length

	elements.total.textContent = monthActivities.length
	elements.activeDays.textContent = uniqueDays.size
	elements.topActivity.textContent = sortedActivities[0]?.[0] || '—'
	elements.sharedBudget.textContent = Math.min(paulinaCount, matiCount) * 20
}

function renderBreakdown(activityCounts, total) {
	elements.breakdown.replaceChildren()
	const sorted = [...activityCounts.entries()].sort((a, b) => b[1] - a[1])

	if (!sorted.length) {
		elements.breakdown.append(createState('Brak aktywności do porównania w tym miesiącu.'))
		return
	}

	sorted.forEach(([name, count]) => {
		const row = document.createElement('div')
		row.className = 'breakdown-row'

		const label = document.createElement('span')
		label.textContent = name

		const track = document.createElement('div')
		track.className = 'progress-track'
		track.setAttribute('aria-label', `${name}: ${count} z ${total}`)

		const bar = document.createElement('div')
		bar.className = 'progress-bar'
		bar.style.width = `${Math.round((count / total) * 100)}%`
		track.append(bar)

		const value = document.createElement('strong')
		value.textContent = count
		row.append(label, track, value)
		elements.breakdown.append(row)
	})
}

function createPersonBar(person, count, max) {
	const row = document.createElement('div')
	row.className = `person-bar-row is-${person.toLowerCase()}`

	const label = document.createElement('span')
	label.textContent = person

	const track = document.createElement('div')
	track.className = 'person-progress'
	track.setAttribute('aria-label', `${person}: ${count} wpisów`)

	const bar = document.createElement('span')
	bar.style.width = max ? `${Math.round((count / max) * 100)}%` : '0'
	if (!count) bar.style.display = 'none'
	track.append(bar)

	const value = document.createElement('strong')
	value.textContent = count
	row.append(label, track, value)
	return row
}

function renderPeople(monthActivities) {
	const paulinaCount = monthActivities.filter(item => item.person === 'Paulina').length
	const matiCount = monthActivities.filter(item => item.person === 'Mati').length
	const max = Math.max(paulinaCount, matiCount)

	elements.people.replaceChildren(
		createPersonBar('Paulina', paulinaCount, max),
		createPersonBar('Mati', matiCount, max),
	)

	const note = document.createElement('p')
	note.className = 'comparison-note'

	if (!max) {
		note.textContent = 'Dodajcie pierwszy wpis, a porównanie pojawi się tutaj.'
	} else if (paulinaCount === matiCount) {
		note.textContent = 'Idealny remis — w tym miesiącu macie tyle samo wpisów.'
	} else {
		const leader = paulinaCount > matiCount ? 'Paulina' : 'Mati'
		const difference = Math.abs(paulinaCount - matiCount)
		note.textContent = `${leader} prowadzi różnicą ${difference} ${difference === 1 ? 'wpisu' : 'wpisów'}.`
	}

	elements.people.append(note)
}

function formatDate(date) {
	return new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'short' }).format(date)
}

function renderRecent(monthActivities) {
	elements.recent.replaceChildren()

	if (!monthActivities.length) {
		elements.recent.append(createState('W tym miesiącu nie ma jeszcze ostatnich wpisów.'))
		return
	}

	monthActivities.slice(0, 8).forEach(activity => {
		const row = document.createElement('div')
		row.className = 'recent-row'

		const symbol = document.createElement('span')
		symbol.className = 'recent-symbol'
		symbol.setAttribute('aria-hidden', 'true')
		symbol.textContent = ACTIVITY_SYMBOLS[activity.activity] || '✨'

		const title = document.createElement('strong')
		title.textContent = activity.activity || 'Aktywność'

		const date = document.createElement('time')
		date.dateTime = activity.parsedDate.toISOString().slice(0, 10)
		date.textContent = formatDate(activity.parsedDate)

		const person = document.createElement('span')
		person.className = `recent-person is-${String(activity.person).toLowerCase()}`
		person.textContent = activity.person || '—'

		row.append(symbol, title, date, person)
		elements.recent.append(row)
	})
}

function renderStats() {
	elements.month.textContent = `${MONTHS_PL[selectedMonth.getMonth()]} ${selectedMonth.getFullYear()}`
	const monthActivities = getMonthActivities()
	const activityCounts = getActivityCounts(monthActivities)

	renderMetrics(monthActivities, activityCounts)
	renderBreakdown(activityCounts, monthActivities.length)
	renderPeople(monthActivities)
	renderRecent(monthActivities)
	setStatus('')
}

async function loadActivities() {
	if (!supa) {
		setStatus('Nie udało się połączyć z bazą. Odśwież stronę i spróbuj ponownie.', 'error')
		elements.breakdown.replaceChildren(createState('Brak połączenia z bazą.'))
		elements.people.replaceChildren(createState('Brak połączenia z bazą.'))
		elements.recent.replaceChildren(createState('Brak połączenia z bazą.'))
		return
	}

	setStatus('Ładuję statystyki…')

	try {
		const { data, error } = await supa
			.from('activities')
			.select('activity, date_of_activity, person')

		if (error) throw error
		activities = Array.isArray(data) ? data : []
		renderStats()
	} catch (error) {
		console.error('Nie udało się pobrać statystyk:', error)
		setStatus('Nie udało się pobrać statystyk. Spróbuj ponownie za chwilę.', 'error')
		elements.breakdown.replaceChildren(createState('Nie udało się pobrać danych.'))
		elements.people.replaceChildren(createState('Nie udało się pobrać danych.'))
		elements.recent.replaceChildren(createState('Nie udało się pobrać danych.'))
	}
}

function changeMonth(offset) {
	selectedMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + offset, 1)
	updateMonthInUrl()
	renderStats()
}

elements.previousMonth.addEventListener('click', () => changeMonth(-1))
elements.nextMonth.addEventListener('click', () => changeMonth(1))

document.querySelectorAll('[data-current-year]').forEach(element => {
	element.textContent = today.getFullYear()
})

updateMonthInUrl()
elements.month.textContent = `${MONTHS_PL[selectedMonth.getMonth()]} ${selectedMonth.getFullYear()}`
loadActivities()
