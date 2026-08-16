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
	form: document.querySelector('#activityForm'),
	date: document.querySelector('#myDate'),
	activity: document.querySelector('#Activity'),
	person: document.querySelector('#Name'),
	submit: document.querySelector('#submitActivity'),
	formStatus: document.querySelector('#formStatus'),
	monthLabel: document.querySelector('.currentMonth'),
	previousMonth: document.querySelector('#prevMonth'),
	nextMonth: document.querySelector('#nextMonth'),
	activitiesList: document.querySelector('#activitiesList'),
	monthTotal: document.querySelector('#monthTotal'),
	paulinaTotal: document.querySelector('#paulinaMonthTotal'),
	matiTotal: document.querySelector('#matiMonthTotal'),
	personSummary: document.querySelector('#activitiesCount'),
	rewards: document.querySelector('#wspolneCount'),
	modal: document.querySelector('#purchaseModal'),
	modalForm: document.querySelector('#purchaseForm'),
	modalMonth: document.querySelector('#modalMonth'),
	modalStatus: document.querySelector('#modalStatus'),
	purchasePaulina: document.querySelector('#purchasePaulina'),
	purchaseMati: document.querySelector('#purchaseMati'),
	savePurchases: document.querySelector('#savePurchases'),
}

const today = new Date()
let selectedMonth = new Date(today.getFullYear(), today.getMonth(), 1)
let activities = []
let purchases = []
let currentPurchaseMonth = null
let supa = null

try {
	if (!window.supabase?.createClient) throw new Error('Biblioteka Supabase nie została załadowana.')
	supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
} catch (error) {
	console.error(error)
}

function pad(value) {
	return String(value).padStart(2, '0')
}

function toInputDate(date) {
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function toDatabaseDate(value) {
	const [year, month, day] = value.split('-')
	return `${day}-${month}-${year}`
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

function monthKeyFromDate(date) {
	return `${date.getFullYear()}-${date.getMonth()}`
}

function monthLabelFromKey(key) {
	const [year, monthIndex] = key.split('-').map(Number)
	return `${MONTHS_PL[monthIndex]} ${year}`
}

function formatDisplayDate(value) {
	const date = parseActivityDate(value)
	if (!date) return value || 'Brak daty'
	return new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

function setStatus(element, message, type = '') {
	if (!element) return
	element.textContent = message
	element.classList.toggle('is-error', type === 'error')
	element.classList.toggle('is-success', type === 'success')
}

function createState(message, compact = false) {
	const state = document.createElement('div')
	state.className = `state-card${compact ? ' state-card-compact' : ''}`
	state.textContent = message
	return state
}

function updateMonthLabel() {
	elements.monthLabel.textContent = `${MONTHS_PL[selectedMonth.getMonth()]} ${selectedMonth.getFullYear()}`
}

function getSelectedActivities() {
	return activities
		.map(activity => ({ ...activity, parsedDate: parseActivityDate(activity.date_of_activity) }))
		.filter(activity => activity.parsedDate
			&& activity.parsedDate.getMonth() === selectedMonth.getMonth()
			&& activity.parsedDate.getFullYear() === selectedMonth.getFullYear())
		.sort((a, b) => b.parsedDate - a.parsedDate)
}

function createActivityCard(activity) {
	const card = document.createElement('article')
	card.className = 'activity-card'
	if (activity.person === 'Paulina') card.classList.add('is-paulina')
	if (activity.person === 'Mati') card.classList.add('is-mati')

	const symbol = document.createElement('span')
	symbol.className = 'activity-symbol'
	symbol.setAttribute('aria-hidden', 'true')
	symbol.textContent = ACTIVITY_SYMBOLS[activity.activity] || '✨'

	const content = document.createElement('div')
	content.className = 'activity-content'

	const title = document.createElement('h3')
	title.textContent = activity.activity || 'Aktywność'

	const meta = document.createElement('div')
	meta.className = 'activity-meta'

	const date = document.createElement('span')
	date.textContent = formatDisplayDate(activity.date_of_activity)

	const person = document.createElement('span')
	person.textContent = activity.person || 'Bez osoby'

	meta.append(date, person)
	content.append(title, meta)
	card.append(symbol, content)
	return card
}

function renderSelectedMonth() {
	updateMonthLabel()
	const monthActivities = getSelectedActivities()
	const paulinaCount = monthActivities.filter(item => item.person === 'Paulina').length
	const matiCount = monthActivities.filter(item => item.person === 'Mati').length

	elements.monthTotal.textContent = monthActivities.length
	elements.paulinaTotal.textContent = paulinaCount
	elements.matiTotal.textContent = matiCount
	elements.activitiesList.replaceChildren()

	if (!monthActivities.length) {
		elements.activitiesList.append(createState('W tym miesiącu nie ma jeszcze żadnych wpisów. Dodajcie pierwszy powyżej!'))
		return
	}

	monthActivities.forEach(activity => elements.activitiesList.append(createActivityCard(activity)))
}

function buildMonthlyCounts() {
	const counts = { Paulina: new Map(), Mati: new Map() }

	activities.forEach(activity => {
		const date = parseActivityDate(activity.date_of_activity)
		if (!date || !counts[activity.person]) return

		const key = monthKeyFromDate(date)
		counts[activity.person].set(key, (counts[activity.person].get(key) || 0) + 1)
	})

	return counts
}

function sortedMonthKeys(counts) {
	return [...new Set([
		...counts.Paulina.keys(),
		...counts.Mati.keys(),
	])].sort((a, b) => {
		const [yearA, monthA] = a.split('-').map(Number)
		const [yearB, monthB] = b.split('-').map(Number)
		return new Date(yearB, monthB) - new Date(yearA, monthA)
	})
}

function createPersonColumn(person, counts, keys) {
	const column = document.createElement('section')
	column.className = `person-column is-${person.toLowerCase()}`

	const heading = document.createElement('h4')
	heading.textContent = person
	const rows = document.createElement('div')
	rows.className = 'person-months'

	keys.forEach(key => {
		const row = document.createElement('div')
		row.className = 'person-month-row'
		const label = document.createElement('span')
		label.textContent = monthLabelFromKey(key)
		const value = document.createElement('strong')
		value.textContent = counts[person].get(key) || 0
		row.append(label, value)
		rows.append(row)
	})

	column.append(heading, rows)
	return column
}

function findPurchase(person, key) {
	return purchases.find(item => item.person === person && item.month === key)?.item?.trim() || ''
}

function createRewardRow(key, counts) {
	const row = document.createElement('div')
	row.className = 'reward-row'

	const month = document.createElement('span')
	month.className = 'reward-month'
	month.textContent = monthLabelFromKey(key)

	const paulinaCount = counts.Paulina.get(key) || 0
	const matiCount = counts.Mati.get(key) || 0
	const budget = document.createElement('span')
	budget.className = 'reward-value'
	budget.textContent = `${Math.min(paulinaCount, matiCount) * 20} zł`

	const purchaseInfo = document.createElement('div')
	purchaseInfo.className = 'reward-purchases'

	const paulinaItem = document.createElement('span')
	const matiItem = document.createElement('span')
	paulinaItem.textContent = findPurchase('Paulina', key)
		? `Paulina: ${findPurchase('Paulina', key)}`
		: 'Paulina: brak zapisu'
	matiItem.textContent = findPurchase('Mati', key)
		? `Mati: ${findPurchase('Mati', key)}`
		: 'Mati: brak zapisu'
	purchaseInfo.append(paulinaItem, matiItem)

	const actions = document.createElement('div')
	actions.className = 'reward-actions'

	const statsLink = document.createElement('a')
	statsLink.className = 'icon-button'
	statsLink.href = `stats.html?month=${encodeURIComponent(key)}`
	statsLink.title = `Statystyki: ${monthLabelFromKey(key)}`
	statsLink.setAttribute('aria-label', statsLink.title)
	statsLink.textContent = '↗'

	const editButton = document.createElement('button')
	editButton.className = 'icon-button open-modal-btn'
	editButton.type = 'button'
	editButton.dataset.month = key
	editButton.title = `Zapisz zakupy: ${monthLabelFromKey(key)}`
	editButton.setAttribute('aria-label', editButton.title)
	editButton.textContent = '🛍'

	actions.append(statsLink, editButton)
	row.append(month, budget, purchaseInfo, actions)
	return row
}

function renderLongTermSummary() {
	const counts = buildMonthlyCounts()
	const keys = sortedMonthKeys(counts)
	elements.personSummary.replaceChildren()
	elements.rewards.replaceChildren()

	if (!keys.length) {
		elements.personSummary.append(createState('Podsumowanie pojawi się po dodaniu pierwszej aktywności.', true))
		elements.rewards.append(createState('Na razie nie ma miesięcy do podsumowania.', true))
		return
	}

	elements.personSummary.append(
		createPersonColumn('Paulina', counts, keys),
		createPersonColumn('Mati', counts, keys),
	)

	keys.forEach(key => elements.rewards.append(createRewardRow(key, counts)))
}

function renderAll() {
	renderSelectedMonth()
	renderLongTermSummary()
}

async function fetchActivities() {
	const { data, error } = await supa
		.from('activities')
		.select('activity, date_of_activity, person')

	if (error) throw error
	activities = Array.isArray(data) ? data : []
}

async function fetchPurchases() {
	const { data, error } = await supa
		.from('person')
		.select('person, item, month')

	if (error) throw error
	purchases = Array.isArray(data) ? data : []
}

async function loadPageData() {
	if (!supa) {
		elements.activitiesList.replaceChildren(createState('Nie udało się połączyć z bazą. Odśwież stronę i spróbuj ponownie.'))
		elements.personSummary.replaceChildren(createState('Brak połączenia z bazą.', true))
		elements.rewards.replaceChildren(createState('Brak połączenia z bazą.', true))
		return
	}

	try {
		const [activitiesResult, purchasesResult] = await Promise.allSettled([
			fetchActivities(),
			fetchPurchases(),
		])

		if (activitiesResult.status === 'rejected') throw activitiesResult.reason
		if (purchasesResult.status === 'rejected') {
			console.warn('Nie udało się pobrać zapisanych zakupów:', purchasesResult.reason)
			purchases = []
		}
		renderAll()
	} catch (error) {
		console.error('Nie udało się pobrać danych:', error)
		elements.activitiesList.replaceChildren(createState('Nie udało się pobrać aktywności. Spróbuj ponownie za chwilę.'))
		elements.personSummary.replaceChildren(createState('Nie udało się pobrać podsumowania.', true))
		elements.rewards.replaceChildren(createState('Nie udało się pobrać nagród.', true))
	}
}

function changeMonth(offset) {
	selectedMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + offset, 1)
	renderSelectedMonth()
}

function validateForm() {
	const fields = [elements.date, elements.activity, elements.person]
	const firstInvalid = fields.find(field => !field.value)

	fields.forEach(field => field.setAttribute('aria-invalid', field.value ? 'false' : 'true'))

	if (firstInvalid) {
		setStatus(elements.formStatus, 'Uzupełnij datę, aktywność i osobę.', 'error')
		firstInvalid.focus()
		return false
	}

	return true
}

async function addActivity(event) {
	event.preventDefault()
	if (!validateForm() || !supa) return

	const originalButtonText = elements.submit.innerHTML
	elements.submit.disabled = true
	elements.submit.textContent = 'Zapisuję…'
	setStatus(elements.formStatus, 'Zapisuję aktywność…')

	const baseRecord = {
		activity: elements.activity.value,
		date_of_activity: toDatabaseDate(elements.date.value),
	}

	const records = elements.person.value === 'Both'
		? [
			{ ...baseRecord, person: 'Mati' },
			{ ...baseRecord, person: 'Paulina' },
		]
		: [{ ...baseRecord, person: elements.person.value }]

	try {
		const { error } = await supa.from('activities').insert(records)
		if (error) throw error

		const addedDate = parseActivityDate(baseRecord.date_of_activity)
		selectedMonth = new Date(addedDate.getFullYear(), addedDate.getMonth(), 1)
		await fetchActivities()
		renderAll()

		elements.activity.value = ''
		elements.person.value = ''
		setStatus(elements.formStatus, 'Gotowe! Aktywność została dodana.', 'success')
	} catch (error) {
		console.error('Nie udało się dodać aktywności:', error)
		setStatus(elements.formStatus, 'Nie udało się zapisać aktywności. Spróbuj ponownie.', 'error')
	} finally {
		elements.submit.disabled = false
		elements.submit.innerHTML = originalButtonText
	}
}

function closePurchaseModal() {
	if (elements.modal.open) elements.modal.close()
	document.body.classList.remove('modal-open')
	setStatus(elements.modalStatus, '')
}

function openPurchaseModal(key) {
	currentPurchaseMonth = key
	elements.modalMonth.textContent = monthLabelFromKey(key)
	elements.purchasePaulina.value = findPurchase('Paulina', key)
	elements.purchaseMati.value = findPurchase('Mati', key)
	setStatus(elements.modalStatus, '')
	elements.modal.showModal()
	document.body.classList.add('modal-open')
	requestAnimationFrame(() => elements.purchasePaulina.focus())
}

async function savePurchaseData(event) {
	event.preventDefault()
	if (!currentPurchaseMonth || !supa) return

	const originalButtonText = elements.savePurchases.textContent
	elements.savePurchases.disabled = true
	elements.savePurchases.textContent = 'Zapisuję…'
	setStatus(elements.modalStatus, 'Zapisuję zakupy…')

	try {
		const { error } = await supa.from('person').upsert([
			{ person: 'Paulina', item: elements.purchasePaulina.value.trim(), month: currentPurchaseMonth },
			{ person: 'Mati', item: elements.purchaseMati.value.trim(), month: currentPurchaseMonth },
		], { onConflict: 'person,month' })

		if (error) throw error
		await fetchPurchases()
		renderLongTermSummary()
		closePurchaseModal()
	} catch (error) {
		console.error('Nie udało się zapisać zakupów:', error)
		setStatus(elements.modalStatus, 'Nie udało się zapisać zakupów. Spróbuj ponownie.', 'error')
	} finally {
		elements.savePurchases.disabled = false
		elements.savePurchases.textContent = originalButtonText
	}
}

elements.date.value = toInputDate(today)
document.querySelectorAll('[data-current-year]').forEach(element => {
	element.textContent = today.getFullYear()
})

elements.form.addEventListener('submit', addActivity)
elements.previousMonth.addEventListener('click', () => changeMonth(-1))
elements.nextMonth.addEventListener('click', () => changeMonth(1))
elements.modalForm.addEventListener('submit', savePurchaseData)

elements.form.addEventListener('change', event => {
	if (event.target.matches('input, select')) event.target.setAttribute('aria-invalid', 'false')
})

elements.rewards.addEventListener('click', event => {
	const button = event.target.closest('.open-modal-btn')
	if (button) openPurchaseModal(button.dataset.month)
})

document.querySelector('.modal-close').addEventListener('click', closePurchaseModal)
document.querySelector('.cancel-modal').addEventListener('click', closePurchaseModal)
elements.modal.addEventListener('cancel', () => document.body.classList.remove('modal-open'))
elements.modal.addEventListener('click', event => {
	if (event.target === elements.modal) closePurchaseModal()
})

updateMonthLabel()
loadPageData()
