// ================== SUPABASE ==================
const { createClient } = supabase;

const SUPABASE_URL = 'https://tbnomvxxwdzdtecdhitb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_DlbO2_NlF_ArEN-Q2yGgSA_BCcGCfPv';

const supa = createClient(SUPABASE_URL, SUPABASE_KEY);

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
    const styleId = 'flatpickr-placeholder-style';
    let styleTag = document.getElementById(styleId);

    if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = styleId;
        document.head.appendChild(styleTag);
    }

    const className = input.className.split(' ').join('.');
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
    `;
}

// Inicjalizacja Flatpickr
flatpickr('#myDate', {
    dateFormat: 'd-m-Y',
    locale: 'pl',
    allowInput: false,
    disableMobile: true,
    placeholder: 'Wybierz datę',
    onReady: function(selectedDates, dateStr, instance) {
        // kolor tekstu i placeholdera
        instance.input.style.color = '#007bff';
        setPlaceholderColor(instance.input, '#007bff');
    },
    onChange: function(selectedDates, dateStr, instance) {
        instance.input.style.color = '#007bff';
    }
});




// ================== ELEMENTY ==================
const btn = document.querySelector('.btn-accept');
const dateInput = document.querySelector('#myDate');
const activitySelect = document.querySelector('#Activity');
const personSelect = document.querySelector('#Name');

// ================== WYŚWIETL AKTYWNOŚCI ==================
async function displayActivities() {
	try {
		const { data, error } = await supa
			.from('activities')
			.select('*')
			.order('date_of_activity', { ascending: false });

		if (error) throw error;

		const activitiesList = document.getElementById('activitiesList');
		if (!activitiesList) {
			console.error('Element #activitiesList nie znaleziony w DOM');
			return;
		}

		activitiesList.innerHTML = '';

		if (data.length === 0) {
			activitiesList.innerHTML = '<p>Brak zapisanych aktywności</p>';
			return;
		}

		data.forEach(activity => {
			const card = document.createElement('div');
			card.className = 'card';
			card.innerHTML = `
                <h3>${activity.activity}</h3>
                <p><strong>Data:</strong> ${activity.date_of_activity}</p>
                <p><strong>Osoba:</strong> ${activity.person}</p>
            `;
			activitiesList.appendChild(card);
		});
	} catch (error) {
		console.error('Błąd przy ładowaniu aktywności:', error);
	}
}

// Załaduj aktywności po załadowaniu strony
window.addEventListener('load', displayActivities);

// ================== ZAPIS DO BAZY ==================
btn.addEventListener('click', async () => {
	const date = dateInput.value;
	const activity = activitySelect.value;
	const person = personSelect.value;

	if (!date || !activity || !person) {
		alert('Wybierz datę, aktywność oraz osobę!');
		return;
	}

	const { data, error } = await supa.from('activities').insert([
		{
			activity: activity,
			date_of_activity: date,
			person: person,
		},
	]);

	if (error) {
		console.error('Błąd Supabase:', error);
		alert('Nie udało się zapisać 😢');
		return;
	}

	alert('Zapisano 💪');

	// reset formularza
	dateInput.value = '';
	activitySelect.selectedIndex = 0;
	personSelect.selectedIndex = 0;

	// Przeładuj aktywności
	displayActivities();
});
