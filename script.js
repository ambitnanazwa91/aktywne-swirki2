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

//Miesiąc?
window.month = 3
window.year = 2026

// check obecny miesiąc
function updateCurrentMonth() {
	window.month = new Date().getMonth() + 1
	// styczeń = 1, luty = 2, ...
	updateMonthLabel()
}

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
	defaultDate: 'today',
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

		// filtrujemy po miesiącu i roku
		const filteredData = data.filter(activity => {
			const [day, month, year] = activity.date_of_activity.split('-').map(Number)
			return month === window.month && year === window.year
		})

		if (filteredData.length === 0) {
			activitiesList.innerHTML = '<p>Brak zapisanych aktywności w tym miesiącu</p>'
			return
		}

		filteredData.forEach(activity => {
			const card = document.createElement('div')
			card.className = 'card'
			if (activity.person === 'Mati') card.classList.add('mati')
			else if (activity.person === 'Paulina') card.classList.add('paulina')

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
        <span class="value">${wspolne * 20}</span>
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

// Zmiana miesięcy

const nextMonthBtn = document.querySelector('.iconright')
const currentMonthBtn = document.querySelector('.currentMonth')
const prevMonthBtn = document.querySelector('.icoleft')

const monthsPL = [
	'0',
	'Styczeń',
	'Luty',
	'Marzec',
	'Kwiecień',
	'Maj',
	'Czerwiec',
	'Lipiec',
	'Sierpień',
	'Wrzesień',
	'Październik',
	'Listopad',
	'Grudzień',
]

console.log(nextMonthBtn, currentMonthBtn)

// po kliku dodaje miesiąc
const showNextMonth = () => {
	window.month++
	updateMonthLabel()
	clearAct()
	disabledBtn()

	async function displayActivities() {
		try {
			const { data, error } = await supa.from('activities').select('*').order('date_of_activity', { ascending: true }) // sortowanie po właściwej kolumnie

			if (error) throw error

			const activitiesList = document.getElementById('activitiesList')
			if (!activitiesList) {
				console.error('Element #activitiesList nie znaleziony w DOM')
				return
			}

			activitiesList.innerHTML = ''

			if (!data || data.length === 0) {
				activitiesList.innerHTML = '<p>Brak zapisanych aktywności</p>'
				return
			}

			// filtrujemy dane po miesiącu i roku z globalnych zmiennych
			const filtered = data.filter(activity => {
				const [day, mon, yr] = activity.date_of_activity.split('-').map(Number)
				return mon === month && yr === year
			})

			if (filtered.length === 0) {
				activitiesList.innerHTML = '<p>Brak aktywności w tym miesiącu</p>'
				return
			}

			filtered.forEach(activity => {
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

	displayActivities()
	console.log(window.month)
}

//czyszczenie zawartości activites
const clearAct = () => {
	const activitiesList = document.querySelector('#activitiesList')
	console.log(activitiesList)

	activitiesList.innerHTML = ''
}

const showPrevMonth = () => {
	window.month--
	updateMonthLabel()
	clearAct()
	disabledBtn()

	async function displayActivities() {
		try {
			const { data, error } = await supa.from('activities').select('*').order('date_of_activity', { ascending: true }) // sortowanie po właściwej kolumnie

			if (error) throw error

			const activitiesList = document.getElementById('activitiesList')
			if (!activitiesList) {
				console.error('Element #activitiesList nie znaleziony w DOM')
				return
			}

			activitiesList.innerHTML = ''

			if (!data || data.length === 0) {
				activitiesList.innerHTML = '<p>Brak zapisanych aktywności</p>'
				return
			}

			// filtrujemy dane po miesiącu i roku z globalnych zmiennych
			const filtered = data.filter(activity => {
				const [day, mon, yr] = activity.date_of_activity.split('-').map(Number)
				return mon === month && yr === year
			})

			if (filtered.length === 0) {
				activitiesList.innerHTML = '<p>Brak aktywności w tym miesiącu</p>'
				return
			}

			filtered.forEach(activity => {
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

	displayActivities()
	console.log(window.month)
}

// check czy disabled button

const disabledBtn = () => {
  if (window.month === 1) {
    const buttonBG = document.querySelector('.iconleft');
    buttonBG.classList.add('buttonDsl');
    buttonBG.parentElement.disabled = true;
  } else if (window.month === 12) {
    const buttonBG = document.querySelector('.iconright');
    buttonBG.classList.add('buttonDsl');
    buttonBG.parentElement.disabled = true;
  } else {
    const buttons = document.querySelectorAll('.iconleft, .iconright');
    buttons.forEach(icon => {
      icon.classList.remove('buttonDsl');
      icon.parentElement.disabled = false;
    });
  }
}


/// updejt paragrafu
const updateMonthLabel = () => {
	const currentMonthBtn = document.querySelector('.currentMonth')
	currentMonthBtn.textContent = `${monthsPL[window.month]}`
}

//Podpięcie pod buttony
document.querySelector('.iconright').parentElement.addEventListener('click', showNextMonth)

document.querySelector('.iconleft').parentElement.addEventListener('click', showPrevMonth)

// Wywołanie po załadowaniu strony
window.addEventListener('load', () => {
	displayActivities()
	loadActivityCounts()
	updateCurrentMonth() ///wyłącz jak chcesz sprawdzić jak działają miesiące po przeładowaniu (czy łapie akutalny)
	disabledBtn()

	console.log(window.month)
})

// ================== ZAPIS DO BAZY ==================
btn.addEventListener('click', async () => {
  const date = dateInput.value
  const activity = activitySelect.value
  const person = personSelect.value
  console.log(person);

  if (!date || !activity || !person) {
    alert('Wybierz datę, aktywność oraz osobę!')
    return
  }

  let records = []

  if (person === 'Both') {
    records = [
      {
        activity: activity,
        date_of_activity: date,
        person: 'Mati',
      },
      {
        activity: activity,
        date_of_activity: date,
        person: 'Paulina',
      }
    ]
  } else {
    records = [
      {
        activity: activity,
        date_of_activity: date,
        person: person,
      }
    ]
  }

  const { error } = await supa
    .from('activities')
    .insert(records)

  if (error) {
    console.error('Błąd Supabase:', error)
    alert('Nie udało się zapisać 😢')
    return
  }

  alert('Zapisano 💪')

	// reset formularza
const today = new Date();
dateInput.value =
  `${String(today.getDate()).padStart(2, '0')}-` +
  `${String(today.getMonth() + 1).padStart(2, '0')}-` +
  today.getFullYear();

activitySelect.selectedIndex = 0;
personSelect.selectedIndex = 0;

	// Przeładuj aktywności
	displayActivities()
	loadActivityCounts()
})
