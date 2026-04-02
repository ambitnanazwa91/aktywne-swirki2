// stats.js

// ================== SUPABASE ==================
const { createClient } = supabase

const SUPABASE_URL = 'https://tbnomvxxwdzdtecdhitb.supabase.co'
const SUPABASE_KEY = 'sb_publishable_DlbO2_NlF_ArEN-Q2yGgSA_BCcGCfPv'

const supa = createClient(SUPABASE_URL, SUPABASE_KEY)

// ================== MIESIĄCE ==================
const months = [
	'styczen',
	'luty',
	'marzec',
	'kwiecien',
	'maj',
	'czerwiec',
	'lipiec',
	'sierpien',
	'wrzesien',
	'pazdziernik',
	'listopad',
	'grudzien',
]

// ================== PARAMETRY URL ==================
const params = new URLSearchParams(window.location.search)
const monthParam = params.get('month') // np. "2026-0"

if (!monthParam) {
	console.error('Nie podano parametru month w URL!')
}

const [year, monthIndexStr] = monthParam.split('-') // ["2026", "0"]
const monthIndex = parseInt(monthIndexStr, 10) // 0 = styczen
const monthName = months[monthIndex]

// ================== FUNKCJA POBIERANIA DANYCH ==================
async function fetchStatsByMonth(year, monthIndex) {
	const monthStr = String(monthIndex + 1).padStart(2, '0') // "01" dla stycznia

	const { data, error } = await supa
		.from('activities') // twoja tabela w Supabase
		.select('*')

	if (error) {
		console.error('Błąd Supabase:', error)
		return []
	}

	console.log('Surowe dane z Supabase:', data)

	// Filtrujemy po miesiącu i roku (format DD-MM-YYYY)
	const filteredData = data.filter(item => {
		const [day, month, itemYear] = item.date_of_activity.split('-')
		return month === monthStr && itemYear === year
	})

	console.log(`Przefiltrowane dane dla ${monthName} ${year}:`, filteredData)

	return filteredData
}

// Tworzymy zmienną globalną
let stats = []

// Pobieramy dane asynchronicznie
;(async () => {
	stats = await fetchStatsByMonth(year, monthIndex)
	console.log('Globalne stats:', stats) // pobranie całych danychg


    // unikalne aktywności
	const uniqueActivities = [...new Set(stats.map(item => item.activity))] 
	console.log(uniqueActivities)


    // ile aktywności
	const activityCount = {}

	stats.forEach(item => {
		if (!activityCount[item.activity]) activityCount[item.activity] = 0
		activityCount[item.activity]++
	})

	console.log(activityCount)



    const mostPopular = Object.entries(activityCount).reduce((a, b) => b[1] > a[1] ? b : a)

    console.log('Most popular:' , mostPopular[0], mostPopular[1]);


    

	const activityPerPerson = stats => {
		let paulina = 0 // inicjalizacja
		let mati = 0 // inicjalizacja

		stats.forEach(element => {
			if (element.person == 'Paulina') {
				paulina++
			} else if (element.person == 'Mati') {
				mati++
			}
		})

		console.log('Aktywności Pauliny:', paulina)
		console.log('Aktywności Mati:', mati)
	}

	activityPerPerson(stats) // wywołanie funkcji
})()

/// liczenie kto ile
