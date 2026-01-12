// ================== SUPABASE ==================
const { createClient } = supabase

const SUPABASE_URL = 'https://tbnomvxxwdzdtecdhitb.supabase.co'
const SUPABASE_KEY = 'sb_publishable_DlbO2_NlF_ArEN-Q2yGgSA_BCcGCfPv'

const supa = createClient(SUPABASE_URL, SUPABASE_KEY)

// ================== FLATPICKR ==================
// flatpickr('#myDate', {
// 	dateFormat: 'd-m-Y',
// 	locale: 'pl',
// 	allowInput: false,
// 	disableMobile: true,
// 	placeholder: 'Wybierz datę',
// 	onChange: function(selectedDates, dateStr, instance) {
// 		// fix dla iOS: zawsze niebieski tekst
// 		instance.input.style.color = '#007bff';
// 	}
// });

// Funkcja dodająca styl dla placeholdera dynamicznie
function setPlaceholderColor(input, color) {
	const styleId = 'flatpickr-placeholder-style'
	let styleTag = document.getElementById(styleId)

	if (!styleTag) {
		styleTag = document.createElement('style')
		styleTag.id = styleId
		document.head.appendChild(styleTag)
	}

	const className = input.className.split(' ').join('.')
	styleTag.innerHTML += `
        input.${className}::placeholder {
            color: ${color} !important;
            opacity: 1 !important;
        }
        input.${className}::-webkit-input-placeholder {
            color: ${color} !important;
            opacity: 1 !important;
        }
        input.${className}::-moz-placeholder {
            color: ${color} !important;
            opacity: 1 !important;
        }
        input.${className}:-ms-input-placeholder {
            color: ${color} !important;
            opacity: 1 !important;
        }
    `
}

// Inicjalizacja Flatpickr
flatpickr('#myDate', {
	dateFormat: 'd-m-Y',
	locale: 'pl',
	allowInput: false,
	disableMobile: true,
	placeholder: 'Wybierz datę',
	onReady: function (selectedDates, dateStr, instance) {
		// kolor tekstu i placeholdera
		instance.input.style.color = '#007bff'
		setPlaceholderColor(instance.input, '#007bff')
	},
	onChange: function (selectedDates, dateStr, instance) {
		instance.input.style.color = '#007bff'
	},
})

// ================== ELEMENTY ==================
const btn = document.querySelector('.btn-accept')
const dateInput = document.querySelector('#myDate')
const activitySelect = document.querySelector('#Activity')
const personSelect = document.querySelector('#Name')

// ================== WYŚWIETL AKTYWNOŚCI ==================
async function displayActivities() {
	try {
		const { data, error } = await supa.from('activities').select('*').order('date_of_activity', { ascending: true })

		if (error) throw error

		const activitiesList = document.getElementById('activitiesList')
		if (!activitiesList) {
			console.error('Element #activitiesList nie znaleziony w DOM')
			return
		}

		activitiesList.innerHTML = ''

		if (data.length === 0) {
			activitiesList.innerHTML = '<p>Brak zapisanych aktywności</p>'
			return
		}

		data.forEach(activity => {
			const card = document.createElement('div')
			card.className = 'card'
			if (activity.person === 'Mati') {
				card.classList.add('mati')
			} else if (activity.person === 'Paulina') {
				card.classList.add('paulina')
			}

			card.innerHTML = `
                <h3>${activity.activity}</h3>
                <p><strong>Data:</strong> ${activity.date_of_activity}</p>
                <p><strong>Osoba:</strong> ${activity.person}</p>
            `
			activitiesList.appendChild(card)
		})
	} catch (error) {
		console.error('Błąd przy ładowaniu aktywności:', error)
	}
}

async function loadActivityCounts() {
	try {
		const { data, error } = await supa.from('activities').select('person, date_of_activity')

		if (error) throw error

		const counts = {
			Paulina: {},
			Mati: {},
		}

		const monthsPL = [
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

		// Liczenie aktywności per osoba i miesiąc
		data.forEach(item => {
			const [day, month, year] = item.date_of_activity.split('-').map(Number)
			const date = new Date(year, month - 1, day)
			const monthKey = `${year}-${date.getMonth()}` // klucz do sortowania
			const displayMonth = `${monthsPL[date.getMonth()]} ${year}`

			if (!counts[item.person]) counts[item.person] = {}
			if (!counts[item.person][monthKey]) counts[item.person][monthKey] = { display: displayMonth, count: 0 }
			counts[item.person][monthKey].count++
		})

		// Tworzenie kolumn do HTML
		const createColumns = person => {
			const sorted = Object.entries(counts[person])
				.sort((a, b) => b[0].localeCompare(a[0]))
				.map(([_, val]) => `<p>${val.display}: ${val.count}</p>`)
				.join('')
			return `<div class="main-activities-right_column"><p>${person}</p>${sorted}</div>`
		}

		const countDiv = document.getElementById('activitiesCount')
		countDiv.innerHTML = createColumns('Paulina') + createColumns('Mati')

		// ================== WYLICZANIE WSPÓLNYCH AKTYWNOŚCI PER MIESIĄC ==================
		const wspolneDiv = document.getElementById('wspolneCount')
		if (!wspolneDiv) return

		// zbieramy wszystkie miesiące
		const allMonths = new Set([...Object.keys(counts['Paulina']), ...Object.keys(counts['Mati'])])

		// tworzymy HTML z wynikami per miesiąc
	let wspolneHTML = ''

Array.from(allMonths)
  .sort((a, b) => a.localeCompare(b)) // STYCZEŃ → LUTY → MARZEC
  .forEach(monthKey => {
    const paulinaCount = counts['Paulina'][monthKey]?.count || 0
    const matiCount = counts['Mati'][monthKey]?.count || 0
    const wspolne = Math.min(paulinaCount, matiCount)

    wspolneHTML += `
      <p class="month-row">
        ${counts['Paulina'][monthKey]?.display || counts['Mati'][monthKey]?.display}:
        <span class="value">${wspolne * 10}</span>
        <span class="currency">zł</span>
      </p>
    `
  })

wspolneDiv.innerHTML = `
  <div class="main-activities-right_column">
    <p class="title">Nagrody za:</p>
    ${wspolneHTML}
  </div>
`
	} catch (err) {
		console.error('Błąd przy ładowaniu liczby aktywności:', err)
	}
}

// Wywołanie po załadowaniu strony
window.addEventListener('load', () => {
	displayActivities()
	loadActivityCounts()
})

// ================== ZAPIS DO BAZY ==================
btn.addEventListener('click', async () => {
	const date = dateInput.value
	const activity = activitySelect.value
	const person = personSelect.value

	if (!date || !activity || !person) {
		alert('Wybierz datę, aktywność oraz osobę!')
		return
	}

	const { data, error } = await supa.from('activities').insert([
		{
			activity: activity,
			date_of_activity: date,
			person: person,
		},
	])

	if (error) {
		console.error('Błąd Supabase:', error)
		alert('Nie udało się zapisać 😢')
		return
	}

	alert('Zapisano 💪')

	// reset formularza
	dateInput.value = ''
	activitySelect.selectedIndex = 0
	personSelect.selectedIndex = 0

	// Przeładuj aktywności
	displayActivities()
	loadActivityCounts()
})
