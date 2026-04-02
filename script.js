console.log('JS ZAŁADOWANY')

// ================== SUPABASE ==================
const { createClient } = supabase

const SUPABASE_URL = 'https://tbnomvxxwdzdtecdhitb.supabase.co'
const SUPABASE_KEY = 'sb_publishable_DlbO2_NlF_ArEN-Q2yGgSA_BCcGCfPv'

const supa = createClient(SUPABASE_URL, SUPABASE_KEY)

// ================== FLATPICKR ==================
flatpickr('#myDate', {
	dateFormat: 'd-m-Y',
	defaultDate: 'today',
	locale: 'pl',
	allowInput: false,
	disableMobile: true,
	placeholder: 'Wybierz datę',
	onReady: (sel, str, inst) => inst.input.style.color = '#007bff',
	onChange: (sel, str, inst) => inst.input.style.color = '#007bff',
})

// ================== GLOBAL ==================
window.month = 3
window.year = 2026

function updateCurrentMonth() {
	window.month = new Date().getMonth() + 1
	updateMonthLabel()
}

// ================== ELEMENTY ==================
const btn = document.querySelector('.btn-accept')
const dateInput = document.querySelector('#myDate')
const activitySelect = document.querySelector('#Activity')
const personSelect = document.querySelector('#Name')

// ================== WYŚWIETL AKTYWNOŚCI ==================
async function displayActivities() {
	try {
		const { data } = await supa.from('activities').select('*')

		const list = document.getElementById('activitiesList')
		if (!list) return

		list.innerHTML = ''

		const filtered = data.filter(a => {
			const [d, m, y] = a.date_of_activity.split('-').map(Number)
			return m === window.month && y === window.year
		})

		if (!filtered.length) {
			list.innerHTML = '<p>Brak zapisanych aktywności</p>'
			return
		}

		filtered.forEach(a => {
			const div = document.createElement('div')
			div.className = 'card'
			if (a.person === 'Mati') div.classList.add('mati')
			if (a.person === 'Paulina') div.classList.add('paulina')

			div.innerHTML = `
				<h3>${a.activity}</h3>
				<p>${a.date_of_activity}</p>
				<p>${a.person}</p>
			`
			list.appendChild(div)
		})
	} catch (e) {
		console.error(e)
	}
}

// ================== COUNT + WSPÓLNE ==================
async function loadActivityCounts() {
	try {
		const { data } = await supa.from('activities').select('person, date_of_activity')

		const counts = { Paulina: {}, Mati: {} }

		const monthsPL = ['styczeń','luty','marzec','kwiecień','maj','czerwiec','lipiec','sierpień','wrzesień','październik','listopad','grudzień']

		data.forEach(i => {
			const [d, m, y] = i.date_of_activity.split('-').map(Number)
			const key = `${y}-${m-1}`
			const label = `${monthsPL[m-1]} ${y}`

			if (!counts[i.person][key]) counts[i.person][key] = { display: label, count: 0 }
			counts[i.person][key].count++
		})

		// ===== kolumny =====
		const createCol = p => {
			return `<div class="main-activities-right_column">
				<p>${p}</p>
				${Object.values(counts[p]).map(v=>`<p>${v.display}: ${v.count}</p>`).join('')}
			</div>`
		}

		document.getElementById('activitiesCount').innerHTML =
			createCol('Paulina') + createCol('Mati')

		// ===== wspólne =====
		const wspolneDiv = document.getElementById('wspolneCount')

		const allMonths = new Set([
			...Object.keys(counts.Paulina),
			...Object.keys(counts.Mati)
		])

		let html = ''

		Array.from(allMonths).sort().forEach(key => {
			const p = counts.Paulina[key]?.count || 0
			const m = counts.Mati[key]?.count || 0
			const wsp = Math.min(p, m)

			html += `
<p class="month-row" data-month="${key}">
  <span class="month-name">${counts.Paulina[key]?.display || counts.Mati[key]?.display}</span>
  
  <span class="value">${wsp * 20}</span>
  <span class="currency">zł</span>
  
  <button class="open-modal-btn buy-btn" type="button">
    <i class="fa-solid fa-bag-shopping"></i>
  </button>
  
  <span class="modal-values">&nbsp;</span>
</p>`
		})

		wspolneDiv.innerHTML = html

async function loadPersonValues() {
	const { data } = await supa.from('person').select('*')

	document.querySelectorAll('.month-row').forEach(row => {
		const el = row.querySelector('.modal-values')
		if (!el) return

		const paulina = data.find(d => d.person === 'Paulina' && d.month === row.dataset.month)
		const mati = data.find(d => d.person === 'Mati' && d.month === row.dataset.month)

		el.innerHTML = ''

		// Paulina
		if (paulina?.item) {
			el.innerHTML += `<span class="modal-value">Paulina kupiła: ${paulina.item}</span>`
		} else {
			el.innerHTML += `<span class="modal-value" style="color:#e74c3c;font-weight:bold">Paulina: wpisz zakupy!</span>`
		}

		// Mati
		if (mati?.item) {
			el.innerHTML += `<span class="modal-value"> | Mati kupił: ${mati.item}</span>`
		} else {
			el.innerHTML += `<span class="modal-value" style="color:#e74c3c;font-weight:bold"> | Mati: wpisz zakupy!</span>`
		}
	})
}

		// ======= TU DODANE: ZAŁADUJ WARTOŚCI Z PERSON =======
		await loadPersonValues()

	} catch (e) {
		console.error(e)
	}
}

// ================== LOAD PERSON DO SPAN ==================
async function loadPersonValues() {
	const { data } = await supa.from('person').select('*')

	data.forEach(row => {
		const el = document.querySelector(`.month-row[data-month="${row.month}"] .modal-values`)
		if (!el) return

		if (row.person === 'Paulina') {
			el.innerHTML += `<span class="modal-value">Paulina: ${row.item}</span>`
		}
		if (row.person === 'Mati') {
			el.innerHTML += `<span class="modal-value"> | Mati ${row.item}</span>`
		}
	})
}

// ================== MODAL ==================
const modal = document.createElement('div')
modal.style.cssText = `
position:fixed;top:0;left:0;width:100%;height:100%;
background:rgba(0,0,0,.5);display:none;
align-items:center;justify-content:center;
`
modal.innerHTML = `
<div style="background:white;padding:20px;border-radius:20px;">
<p style="text-align: center;">Co kupiliście?</p>
<input id="i1" placeholder="Co kupiła Paulina?" style="text-align: center;" ><br>
<input id="i2" placeholder="Co kupił Mati?" style="text-align: center;"><br>
<button id="save" style="padding:5px;margin-top:5px;">Zapisz</button>
<button id="close" style="padding:5px;margin-top:5px;">Anuluj</button>
</div>`
document.body.appendChild(modal)

let currentMonthKey = null

document.addEventListener('click', async e => {
	const btn = e.target.closest('.open-modal-btn')
	if (!btn) return

	const row = btn.closest('.month-row')
	currentMonthKey = row.dataset.month

	const { data } = await supa
		.from('person')
		.select('*')
		.eq('month', currentMonthKey)

	document.getElementById('i1').value =
		data.find(d=>d.person==='Paulina')?.item || ''

	document.getElementById('i2').value =
		data.find(d=>d.person==='Mati')?.item || ''

	modal.style.display = 'flex'
})

document.getElementById('save').onclick = async () => {
	const v1 = document.getElementById('i1').value
	const v2 = document.getElementById('i2').value

	await supa.from('person').upsert([
		{ person:'Paulina', item:v1, month:currentMonthKey },
		{ person:'Mati', item:v2, month:currentMonthKey }
	], { onConflict:['person','month'] })

	modal.style.display = 'none'
	loadActivityCounts() // odśwież
}

document.getElementById('close').onclick = () => modal.style.display = 'none'

// ================== MIESIĄCE ==================
const monthsPL = ['0','Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień']

function updateMonthLabel() {
	document.querySelector('.currentMonth').textContent = monthsPL[window.month]
}

const showNextMonth = () => {
	window.month++
	updateMonthLabel()
	displayActivities()
}

const showPrevMonth = () => {
	window.month--
	updateMonthLabel()
	displayActivities()
}

document.querySelector('.iconright').parentElement.onclick = showNextMonth
document.querySelector('.iconleft').parentElement.onclick = showPrevMonth

// ================== START ==================
window.addEventListener('load', () => {
	displayActivities()
	loadActivityCounts()
	updateCurrentMonth()
})

// ================== DODAWANIE ==================
btn.addEventListener('click', async () => {
	const date = dateInput.value
	const activity = activitySelect.value
	const person = personSelect.value

	if (!date || !activity || !person) return alert('uzupełnij')

	let records = []

	if (person === 'Both') {
		records = [
			{ activity, date_of_activity: date, person: 'Mati' },
			{ activity, date_of_activity: date, person: 'Paulina' }
		]
	} else {
		records = [{ activity, date_of_activity: date, person }]
	}

	await supa.from('activities').insert(records)

	displayActivities()
	loadActivityCounts()
})