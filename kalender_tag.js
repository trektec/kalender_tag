// Konfiguration - Passe diese Werte an, um den Kalender anzupassen
const START_HOUR = 6;
const END_HOUR = 18;

// Benutzerkonfiguration - setze CURRENT_USER_ID auf die ID des angemeldeten Benutzers (null = nicht angemeldet)
// Setze IS_SUPERUSER auf true, um das Bearbeiten aller Termine unabhängig vom Besitzer zu erlauben
const CURRENT_USER_ID = null;
const IS_SUPERUSER = false;
const HOUR_HEIGHT = 60; // Höhe jedes Stundenfelds in Pixeln
const ALL_DAY_HEIGHT = 60; // Mindesthöhe des Ganztagstermin-Bereichs in Pixeln
const ALL_DAY_EVENT_HEIGHT = 30; // Höhe jedes einzelnen Ganztagstermins in Pixeln
const ALL_DAY_BOTTOM_SPACING = 10; // Anpassbarer Abstand nach dem letzten Ganztagseintrag in Pixeln
const COLUMN_GAP = 0; // Abstand zwischen den Spalten in Pixeln
const EMPLOYER_HEADER_HEIGHT = 40; // Höhe der Mitarbeiterkopfzeile in Pixeln
const SESSION_PADDING = 5; // Innen-/Außenabstand von den Spaltenrändern für Sitzungsblöcke in Pixeln
const EVENT_PADDING = 2; // Innen-/Außenabstand von den Spaltenrändern für Terminblöcke in Pixeln

// Status
let employers = [];
let categories = [];
let sessions = [];
let events = [];
let currentAllDayHeights = null; // Cache für Ganztagshöhen
let currentDate = new Date(); // Aktuell ausgewähltes Datum

// Hilfsfunktion zum Validieren des Hex-Farbformats
function isValidHexColor(color) {
    return /^#[0-9A-Fa-f]{6}$/.test(color);
}

// Hilfsfunktion zum Berechnen der Luminanz einer Farbe
function getLuminance(hexColor) {
    // Hex in RGB umwandeln
    const r = parseInt(hexColor.substring(1, 3), 16) / 255;
    const g = parseInt(hexColor.substring(3, 5), 16) / 255;
    const b = parseInt(hexColor.substring(5, 7), 16) / 255;
    
    // Gammakorrektur anwenden
    const rsRGB = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
    const gsRGB = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
    const bsRGB = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
    
    // Luminanz berechnen
    return 0.2126 * rsRGB + 0.7152 * gsRGB + 0.0722 * bsRGB;
}

// Hilfsfunktion zum Ermitteln einer kontrastierenden Textfarbe (weiß oder schwarz)
function getContrastingTextColor(hexColor) {
    const luminance = getLuminance(hexColor);
    // Verwende weißen Text für dunkle Hintergründe und schwarzen Text für helle Hintergründe
    return luminance > 0.5 ? '#000000' : '#ffffff';
}

// Kalender beim Laden der Seite initialisieren
document.addEventListener('DOMContentLoaded', async () => {
    setupNavigationHandlers();
    updateDateDisplay();
    await loadEmployers();
    await loadCategories();
    await loadSessions();
    await loadEvents();
    renderCalendar();
    renderSessions();
    renderEvents();
    initializeTimeline();
});

// Ereignishandler für Navigationsschaltflächen einrichten
function setupNavigationHandlers() {
    document.getElementById('prevDayBtn').addEventListener('click', () => {
        changeDay(-1);
    });
    
    document.getElementById('todayBtn').addEventListener('click', () => {
        setToday();
    });
    
    document.getElementById('nextDayBtn').addEventListener('click', () => {
        changeDay(1);
    });
}

// Aktuelles Datum um einen Tagesoffset ändern
async function changeDay(daysOffset) {
    currentDate = new Date(currentDate.getTime());
    currentDate.setDate(currentDate.getDate() + daysOffset);
    updateDateDisplay();
    await reloadCalendar();
}

// Aktuelles Datum auf heute setzen
async function setToday() {
    currentDate = new Date();
    updateDateDisplay();
    await reloadCalendar();
}

// Datumsanzeige aktualisieren
function updateDateDisplay() {
    const dateDisplay = document.getElementById('currentDateDisplay');
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateString = currentDate.toLocaleDateString('de-DE', options);
    dateDisplay.textContent = dateString;
}

// Kalender mit aktuellem Datum neu laden
async function reloadCalendar() {
    await loadEmployers();
    await loadCategories();
    await loadSessions();
    await loadEvents();
    renderCalendar();
    renderSessions();
    renderEvents();
    createTimelineElement(); // Zeitleisten-Element neu erstellen, nachdem der Kalender neu gerendert wurde
    updateTimeline();
}

// Datum für API-Aufrufe formatieren (YYYY-MM-DD)
function formatDateForAPI(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Mitarbeiter vom Server laden
async function loadEmployers() {
    const calendarDiv = document.getElementById('calendar');
    
    try {
        calendarDiv.innerHTML = '<div class="loading">Lade Mitarbeiter...</div>';
        
        const response = await fetch('employers_ajax.php');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        employers = data;
        
        if (!employers || employers.length === 0) {
            throw new Error('Keine Mitarbeiter gefunden');
        }
        
    } catch (error) {
        console.error('Fehler beim Laden der Mitarbeiter:', error);
        calendarDiv.innerHTML = `<div class="error">Fehler beim Laden der Mitarbeiter: ${error.message}</div>`;
        // Beispieldaten zur Demonstration verwenden
        employers = [
            { id: 1, name: 'Max Mustermann', department: 'Vertrieb', color: '#4a90e2' },
            { id: 2, name: 'Anna Schmidt', department: 'Marketing', color: '#e74c3c' },
            { id: 3, name: 'Peter Weber', department: 'IT', color: '#2ecc71' }
        ];
    }
}

// Kategorien vom Server laden
async function loadCategories() {
    try {
        const response = await fetch('category_ajax.php');

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        categories = Array.isArray(data) ? data : [];

    } catch (error) {
        console.error('Fehler beim Laden der Kategorien:', error);
        categories = [];
    }
}

// Ein Kategorieobjekt anhand seiner ID abrufen (gibt einen Standardwert zurück, wenn keines gefunden wird)
function getCategoryById(id) {
    const cat = categories.find(c => c.id === id);
    return cat || { id: 0, name: '', color: '#4a90e2' };
}

// Sitzungen vom Server laden
async function loadSessions() {
    try {
        const dateParam = formatDateForAPI(currentDate);
        const response = await fetch(`session_ajax.php?date=${dateParam}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        sessions = Array.isArray(data) ? data : [];
        
    } catch (error) {
        console.error('Fehler beim Laden der Sessions:', error);
        sessions = [];
    }
}

// Termine vom Server laden
async function loadEvents() {
    try {
        const dateParam = formatDateForAPI(currentDate);
        const response = await fetch(`event_iec_ajax2.php?date=${dateParam}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        events = Array.isArray(data) ? data : [];
        
    } catch (error) {
        console.error('Fehler beim Laden der Events:', error);
        events = [];
    }
}

// Den vollständigen Kalender rendern
function renderCalendar() {
    const calendarDiv = document.getElementById('calendar');
    calendarDiv.innerHTML = '';
    
    // Die Höhe des Ganztagsbereichs für jeden Mitarbeiter berechnen
    const allDayHeights = calculateAllDayHeights();
    currentAllDayHeights = allDayHeights; // Für die spätere Verwendung zwischenspeichern
    
    // Linke Zeitspalte erstellen
    const timeColumnLeft = createTimeColumn(allDayHeights);
    calendarDiv.appendChild(timeColumnLeft);
    
    // Mitarbeiterspalten erstellen
    employers.forEach((employer, index) => {
        const isLastEmployer = index === employers.length - 1;
        const employerColumn = createEmployerColumn(employer, isLastEmployer, allDayHeights);
        calendarDiv.appendChild(employerColumn);
    });
    
    // Rechte Zeitspalte erstellen
    const timeColumnRight = createTimeColumn(allDayHeights);
    calendarDiv.appendChild(timeColumnRight);
}

// Hilfsfunktion zum Ermitteln der aktuellen Kopfzeilenhöhe (Mitarbeiterkopfzeile + Ganztagsbereich)
function getHeaderHeight() {
    if (currentAllDayHeights) {
        return EMPLOYER_HEADER_HEIGHT + currentAllDayHeights.maxHeight;
    }
    return EMPLOYER_HEADER_HEIGHT + ALL_DAY_HEIGHT;
}

// Hilfsfunktion: Gibt ein Array von Mitarbeiter-ID-Strings für einen Termin zurück,
// die sowohl Mehrfachzuweisungen (employer_ids-Array) als auch das alte einzelne employer_id unterstützt.
function getEmployerIds(event) {
    return Array.isArray(event.employer_ids)
        ? event.employer_ids.map(String)
        : [String(event.employer_id)];
}

// Die für den Ganztagsbereich jedes Mitarbeiters benötigte Höhe berechnen
function calculateAllDayHeights() {
    const allDayHeights = {};
    let maxAllDayEvents = 0; // Mit 0 beginnen

    // Termine nach Mitarbeiter gruppieren
    employers.forEach(employer => {
        const employerAllDayEvents = events.filter(e =>
            getEmployerIds(e).includes(String(employer.id)) && e.is_all_day
        );
        const count = employerAllDayEvents.length;
        allDayHeights[employer.id] = count;
        maxAllDayEvents = Math.max(maxAllDayEvents, count);
    });
    
    // Die benötigte Gesamthöhe berechnen: jede Terminhöhe plus Abstand unten,
    // mit einem Minimum von ALL_DAY_HEIGHT, damit der Bereich nie zu klein ist
    const calculatedHeight = (maxAllDayEvents * ALL_DAY_EVENT_HEIGHT) + ALL_DAY_BOTTOM_SPACING;
    const maxHeight = Math.max(ALL_DAY_HEIGHT, calculatedHeight);
    
    return { perEmployer: allDayHeights, maxHeight: maxHeight };
}

// Zeitspalte mit Stunden erstellen
function createTimeColumn(allDayHeights) {
    const column = document.createElement('div');
    column.className = 'time-column';
    
    // Kopfzeile (muss zur Mitarbeiterkopfzeile + Höhe des Ganztagsbereichs passen)
    const header = document.createElement('div');
    header.className = 'time-header';
    header.style.height = `${EMPLOYER_HEADER_HEIGHT + allDayHeights.maxHeight}px`;
    header.textContent = 'Zeit';
    column.appendChild(header);
    
    // Stunden
    for (let hour = START_HOUR; hour <= END_HOUR; hour++) {
        const timeSlot = document.createElement('div');
        timeSlot.className = 'time-slot';
        timeSlot.style.height = `${HOUR_HEIGHT}px`;
        timeSlot.textContent = `${hour}:00`;
        column.appendChild(timeSlot);
    }
    
    return column;
}

// Mitarbeiterspalte mit Ganztagsbereich und Stunden erstellen
function createEmployerColumn(employer, isLastEmployer = false, allDayHeights) {
    const column = document.createElement('div');
    column.className = 'employer-column';
    column.dataset.employerId = employer.id;
    
    // Spaltenabstand per Margin anwenden, aber nicht für den letzten Mitarbeiter
    if (COLUMN_GAP > 0 && !isLastEmployer) {
        column.style.marginRight = `${COLUMN_GAP}px`;
    }
    
    // Kopfzeile mit Mitarbeiternamen
    const header = document.createElement('div');
    header.className = 'employer-header';
    header.style.height = `${EMPLOYER_HEADER_HEIGHT}px`;
    header.textContent = employer.name;
    // Mitarbeiterfarbe anwenden, wenn vorhanden und gültig
    if (employer.color && isValidHexColor(employer.color)) {
        header.style.backgroundColor = employer.color;
        // Kontrastierende Textfarbe für bessere Zugänglichkeit setzen
        header.style.color = getContrastingTextColor(employer.color);
    }
    column.appendChild(header);
    
    // Ganztagsbereich (maximale Höhe über alle Mitarbeiter verwenden)
    const allDaySection = document.createElement('div');
    allDaySection.className = 'all-day-section';
    allDaySection.style.height = `${allDayHeights.maxHeight}px`;
    // Keinen Standardtext setzen - leer lassen, wenn keine Ganztagstermine vorhanden sind
    column.appendChild(allDaySection);
    
    // Stundenfelder
    for (let hour = START_HOUR; hour <= END_HOUR; hour++) {
        const hourSlot = document.createElement('div');
        hourSlot.className = 'hour-slot';
        hourSlot.style.height = `${HOUR_HEIGHT}px`;
        hourSlot.dataset.hour = hour;
        column.appendChild(hourSlot);
    }
    
    return column;
}

// Zeitleistenfunktionalität
function initializeTimeline() {
    createTimelineElement();
    updateTimeline();
    // Zeitleiste und aktive Sitzungen alle 30 Sekunden aktualisieren
    setInterval(() => {
        updateTimeline();
        updateActiveSessions();
    }, 30000);
}

function createTimelineElement() {
    const calendarGrid = document.getElementById('calendar');
    
    // Zeitleisten-Container erstellen
    const timelineContainer = document.createElement('div');
    timelineContainer.className = 'timeline-container';
    timelineContainer.id = 'timeline';
    
    // Zeitindikator erstellen (linke Seite mit weißem Text)
    const timeIndicator = document.createElement('div');
    timeIndicator.className = 'timeline-indicator';
    timeIndicator.id = 'timeline-indicator';
    
    // Rote Linie erstellen (verläuft über die Spalten)
    const timelineLine = document.createElement('div');
    timelineLine.className = 'timeline-line';
    
    timelineContainer.appendChild(timeIndicator);
    timelineContainer.appendChild(timelineLine);
    calendarGrid.appendChild(timelineContainer);
}

function updateTimeline() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Prüfen, ob die aktuelle Uhrzeit innerhalb der Kalenderstunden liegt
    if (currentHour < START_HOUR || currentHour > END_HOUR) {
        // Zeitleiste ausblenden, wenn außerhalb der Kalenderstunden
        const timeline = document.getElementById('timeline');
        if (timeline) {
            timeline.style.display = 'none';
        }
        return;
    }
    
    // Position berechnen
    const hoursSinceStart = currentHour - START_HOUR;
    const minutesFraction = currentMinute / 60;
    const totalStundenFraction = hoursSinceStart + minutesFraction;
    
    // Obere Position berechnen (Kopfzeilenhöhe + Ganztagshöhe + Stundenposition)
    const headerHeight = getHeaderHeight();
    const topPosition = headerHeight + (totalStundenFraction * HOUR_HEIGHT);
    
    // Position der Zeitleiste aktualisieren
    const timeline = document.getElementById('timeline');
    const timeIndicator = document.getElementById('timeline-indicator');
    
    if (timeline && timeIndicator) {
        timeline.style.display = 'block';
        timeline.style.top = `${topPosition}px`;
        
        // Zeit als HH:MM formatieren
        timeIndicator.textContent = formatTime(currentHour, currentMinute);
    }
}

// Hilfsfunktion zum Formatieren der Zeit als HH:MM
function formatTime(hour, minute) {
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

// Sitzungsblöcke für alle Mitarbeiter rendern
function renderSessions() {
    sessions.forEach(session => {
        renderSessionBlock(session);
    });
}

// Einen einzelnen Sitzungsblock rendern
function renderSessionBlock(session) {
    const employerColumn = document.querySelector(`.employer-column[data-employer-id="${session.employer_id}"]`);
    
    if (!employerColumn) {
        console.warn(`Employer column not found for employer_id: ${session.employer_id}`);
        return;
    }
    
    // Login-Zeit parsen
    const [loginHour, loginMinute] = session.login_time.split(':').map(Number);
    
    // Berechnen, ob die Sitzung derzeit aktiv ist (keine Logout-Zeit)
    const isActive = !session.logout_time || session.logout_time === '';
    
    // Logout-Zeit parsen oder für aktive Sitzungen die aktuelle Uhrzeit verwenden
    let logoutHour, logoutMinute;
    if (isActive) {
        const now = new Date();
        logoutHour = now.getHours();
        logoutMinute = now.getMinutes();
    } else {
        [logoutHour, logoutMinute] = session.logout_time.split(':').map(Number);
    }
    
    // Prüfen, ob die Sitzung innerhalb der sichtbaren Kalenderstunden liegt (beliebige Überlappung)
    // Eine Sitzung ist sichtbar, wenn sie nach START_HOUR endet und vor END_HOUR beginnt
    if (logoutHour < START_HOUR || loginHour >= END_HOUR) {
        return; // Sitzung außerhalb der sichtbaren Stunden
    }
    
    // Zeiten auf den sichtbaren Bereich begrenzen
    const clampedLoginHour = Math.max(loginHour, START_HOUR);
    const clampedLoginMinute = loginHour < START_HOUR ? 0 : loginMinute;
    const clampedLogoutHour = Math.min(logoutHour, END_HOUR);
    const clampedLogoutMinute = logoutHour >= END_HOUR ? 0 : logoutMinute;
    
    // Position und Höhe berechnen
    const loginFraction = (clampedLoginHour - START_HOUR) + (clampedLoginMinute / 60);
    const logoutFraction = (clampedLogoutHour - START_HOUR) + (clampedLogoutMinute / 60);
    
    const headerHeight = getHeaderHeight();
    const topPosition = headerHeight + (loginFraction * HOUR_HEIGHT);
    const sessionHeight = (logoutFraction - loginFraction) * HOUR_HEIGHT;
    
    // Sitzungsblock-Element erstellen
    const sessionBlock = document.createElement('div');
    sessionBlock.className = isActive ? 'session-block active-session' : 'session-block';
    sessionBlock.style.top = `${topPosition}px`;
    sessionBlock.style.height = `${sessionHeight}px`;
    sessionBlock.style.left = `${SESSION_PADDING}px`;
    sessionBlock.style.right = `${SESSION_PADDING}px`;
    
    // Zeitanzeige formatieren
    const loginTimeStr = formatTime(loginHour, loginMinute);
    const logoutTimeStr = isActive ? 'jetzt' : formatTime(logoutHour, logoutMinute);
    
    sessionBlock.innerHTML = `
        <div class="session-time">${loginTimeStr}</div>
        <div class="session-time">${logoutTimeStr}</div>
    `;
    
    // Sitzungsdaten für Aktualisierungen am Element speichern
    sessionBlock.dataset.loginTime = loginTimeStr;
    sessionBlock.dataset.logoutTime = logoutTimeStr;
    sessionBlock.dataset.isActive = isActive;
    // Die Sitzungs-ID wird nur für aktive Sitzungen gespeichert, um spätere Aktualisierungen zu unterstützen
    if (isActive) {
        sessionBlock.dataset.sessionId = session.id;
    }
    
    // Tooltip-Funktionalität hinzufügen
    addTooltipToSession(sessionBlock, loginTimeStr, logoutTimeStr);
    
    employerColumn.appendChild(sessionBlock);
}

// Aktive Sitzungen aktualisieren, um die aktuelle Uhrzeit widerzuspiegeln
function updateActiveSessions() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Alle aktiven Sitzungsblöcke finden
    const activeSessions = document.querySelectorAll('.session-block.active-session');
    
    activeSessions.forEach(sessionBlock => {
        const loginTime = sessionBlock.dataset.loginTime;
        if (!loginTime) return;
        
        const [loginHour, loginMinute] = loginTime.split(':').map(Number);
        
        // Prüfen, ob die aktuelle Uhrzeit innerhalb der sichtbaren Kalenderstunden liegt
        if (currentHour < START_HOUR || currentHour >= END_HOUR) {
            return; // Nicht aktualisieren, wenn außerhalb der Kalenderstunden
        }
        
        // Position und Höhe mit der aktuellen Uhrzeit neu berechnen
        const clampedLoginHour = Math.max(loginHour, START_HOUR);
        const clampedLoginMinute = loginHour < START_HOUR ? 0 : loginMinute;
        const clampedLogoutHour = Math.min(currentHour, END_HOUR);
        const clampedLogoutMinute = currentHour >= END_HOUR ? 0 : currentMinute;
        
        const loginFraction = (clampedLoginHour - START_HOUR) + (clampedLoginMinute / 60);
        const logoutFraction = (clampedLogoutHour - START_HOUR) + (clampedLogoutMinute / 60);
        
        const headerHeight = getHeaderHeight();
        const topPosition = headerHeight + (loginFraction * HOUR_HEIGHT);
        const sessionHeight = (logoutFraction - loginFraction) * HOUR_HEIGHT;
        
        // Position und Höhe des Blocks aktualisieren
        sessionBlock.style.top = `${topPosition}px`;
        sessionBlock.style.height = `${sessionHeight}px`;
        
        // Logout-Zeitanzeige aktualisieren
        const timeElements = sessionBlock.querySelectorAll('.session-time');
        if (timeElements.length === 2) {
            timeElements[1].textContent = 'jetzt';
        }
        
        // Tooltip-Daten aktualisieren
        sessionBlock.dataset.logoutTime = 'jetzt';
    });
}

// Tooltip zum Sitzungsblock hinzufügen
function addTooltipToSession(sessionBlock, loginTimeStr, logoutTimeStr) {
    let tooltip = null;
    
    sessionBlock.addEventListener('mouseenter', () => {
        // Aktuellen Tooltip-Text aus dem dataset holen
        const loginTime = sessionBlock.dataset.loginTime;
        const logoutTime = sessionBlock.dataset.logoutTime;
        const tooltipText = `${loginTime} bis ${logoutTime}`;
        
        // Tooltip erstellen
        tooltip = document.createElement('div');
        tooltip.className = 'session-tooltip';
        tooltip.textContent = tooltipText;
        document.body.appendChild(tooltip);
        
        // Tooltip in der Nähe des Mauszeigers positionieren
        const rect = sessionBlock.getBoundingClientRect();
        tooltip.style.left = `${rect.left + rect.width / 2}px`;
        tooltip.style.top = `${rect.top - 30}px`;
        tooltip.style.transform = 'translateX(-50%)';
        
        // Tooltip nach einer kurzen Verzögerung anzeigen
        setTimeout(() => {
            if (tooltip) {
                tooltip.classList.add('show');
            }
        }, 100);
    });
    
    sessionBlock.addEventListener('mouseleave', () => {
        if (tooltip) {
            tooltip.remove();
            tooltip = null;
        }
    });
}

// Terminblöcke für alle Mitarbeiter rendern
function renderEvents() {
    // Termine nach Mitarbeiter und Typ gruppieren (ganztägig vs. zeitgebunden)
    const eventsByEmployer = {};
    
    events.forEach(event => {
        // Das employer_ids-Array unterstützen (mehrere Mitarbeiter) oder auf eine einzelne employer_id zurückfallen
        const ids = getEmployerIds(event);

        ids.forEach(empId => {
            if (!eventsByEmployer[empId]) {
                eventsByEmployer[empId] = {
                    allDay: [],
                    timed: []
                };
            }

            if (event.is_all_day) {
                eventsByEmployer[empId].allDay.push(event);
            } else {
                eventsByEmployer[empId].timed.push(event);
            }
        });
    });
    
    // Termine für jeden Mitarbeiter rendern
    Object.keys(eventsByEmployer).forEach(employerId => {
        renderAllDayEvents(employerId, eventsByEmployer[employerId].allDay);
        renderTimedEvents(employerId, eventsByEmployer[employerId].timed);
    });
}

// Ganztagstermine im Ganztagsbereich rendern
function renderAllDayEvents(employerId, allDayEvents) {
    const employerColumn = document.querySelector(`.employer-column[data-employer-id="${employerId}"]`);
    
    if (!employerColumn || allDayEvents.length === 0) {
        return;
    }
    
    const allDaySection = employerColumn.querySelector('.all-day-section');
    
    if (!allDaySection) {
        return;
    }
    
    // Termine vertikal stapeln - jeder Termin nimmt die volle Breite mit passenden Abständen ein
    allDayEvents.forEach((event, index) => {
        const cat = getCategoryById(event.category_id);
        const eventBlock = document.createElement('div');
        eventBlock.className = 'event-block all-day-event';
        eventBlock.style.backgroundColor = cat.color;
        eventBlock.style.height = `${ALL_DAY_EVENT_HEIGHT}px`;
        eventBlock.style.top = `${index * ALL_DAY_EVENT_HEIGHT}px`;
        // Inline-Styles für Breite und linke Position entfernen, damit CSS die Abstände korrekt steuert
        const carIcon = event.has_car ? ' 🚗' : '';
        eventBlock.textContent = (event.title || cat.name) + carIcon;
        
        // Tooltip hinzufügen
        addTooltipToEvent(eventBlock, event);
        
        // Klick-Handler zum Bearbeiten hinzufügen, wenn der Benutzer diesen Termin bearbeiten darf
        if (canEditEvent(event)) {
            eventBlock.classList.add('editable-event');
            eventBlock.addEventListener('click', (e) => {
                e.stopPropagation();
                openEditModal(event);
            });
        }
        
        allDaySection.appendChild(eventBlock);
    });
}

// Zeitgebundene Termine in den Stundenfeldern rendern
function renderTimedEvents(employerId, timedEvents) {
    const employerColumn = document.querySelector(`.employer-column[data-employer-id="${employerId}"]`);
    
    if (!employerColumn || timedEvents.length === 0) {
        return;
    }
    
    // Überlappende Termine erkennen und gruppieren
    const eventGroups = detectOverlappingEvents(timedEvents);
    
    // Jede Gruppe rendern
    eventGroups.forEach(group => {
        renderEventGroup(employerColumn, group);
    });
}

// Überlappende Termine erkennen und Gruppen zurückgeben
function detectOverlappingEvents(events) {
    // Termine nach Startzeit sortieren
    const sortedEvents = [...events].sort((a, b) => {
        return timeToMinutes(a.start_time) - timeToMinutes(b.start_time);
    });
    
    const groups = [];
    
    sortedEvents.forEach(event => {
        // Eine Gruppe finden, in der sich dieser Termin überlappt
        let addedToGroup = false;
        
        for (let group of groups) {
            // Prüfen, ob sich der Termin mit irgendeinem Termin in der Gruppe überlappt
            const overlaps = group.some(groupEvent => {
                return eventsOverlap(event, groupEvent);
            });
            
            if (overlaps) {
                group.push(event);
                addedToGroup = true;
                break;
            }
        }
        
        // Wenn keine Überlappung gefunden wurde, eine neue Gruppe erstellen
        if (!addedToGroup) {
            groups.push([event]);
        }
    });
    
    return groups;
}

// Prüfen, ob sich zwei Termine überlappen
function eventsOverlap(event1, event2) {
    const start1 = timeToMinutes(event1.start_time);
    const end1 = timeToMinutes(event1.end_time);
    const start2 = timeToMinutes(event2.start_time);
    const end2 = timeToMinutes(event2.end_time);
    
    return start1 < end2 && start2 < end1;
}

// Zeitstring (HH:MM) in Minuten seit Mitternacht umwandeln
function timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

// Eine Gruppe überlappender Termine nebeneinander rendern
function renderEventGroup(employerColumn, eventGroup) {
    const groupSize = eventGroup.length;
    const eventWidth = (100 - (EVENT_PADDING * 2)) / groupSize;
    
    eventGroup.forEach((event, index) => {
        renderTimedEvent(employerColumn, event, index, groupSize, eventWidth);
    });
}

// Einen einzelnen zeitgebundenen Termin rendern
function renderTimedEvent(employerColumn, event, positionIndex, totalInGroup, eventWidth) {
    // Start- und Endzeiten parsen
    const [startHour, startMinute] = event.start_time.split(':').map(Number);
    const [endHour, endMinute] = event.end_time.split(':').map(Number);
    
    // Prüfen, ob der Termin innerhalb der sichtbaren Kalenderstunden liegt
    if (endHour < START_HOUR || startHour >= END_HOUR) {
        return; // Termin außerhalb der sichtbaren Stunden
    }
    
    // Zeiten auf den sichtbaren Bereich begrenzen
    const clampedStartHour = Math.max(startHour, START_HOUR);
    const clampedStartMinute = startHour < START_HOUR ? 0 : startMinute;
    const clampedEndHour = Math.min(endHour, END_HOUR);
    const clampedEndMinute = endHour >= END_HOUR ? 0 : endMinute;
    
    // Position und Höhe berechnen
    const startFraction = (clampedStartHour - START_HOUR) + (clampedStartMinute / 60);
    const endFraction = (clampedEndHour - START_HOUR) + (clampedEndMinute / 60);
    
    const headerHeight = getHeaderHeight();
    const topPosition = headerHeight + (startFraction * HOUR_HEIGHT);
    const eventHeight = (endFraction - startFraction) * HOUR_HEIGHT;
    
    // Linke Position basierend auf der Position in der Gruppe berechnen
    const leftPosition = EVENT_PADDING + (eventWidth * positionIndex);
    
    // Terminblock-Element erstellen
    const cat = getCategoryById(event.category_id);
    const eventBlock = document.createElement('div');
    eventBlock.className = 'event-block timed-event';
    eventBlock.style.backgroundColor = cat.color;
    eventBlock.style.top = `${topPosition}px`;
    eventBlock.style.height = `${eventHeight}px`;
    eventBlock.style.left = `${leftPosition}%`;
    eventBlock.style.width = `${eventWidth}%`;
    
    // Termininhalt hinzufügen
    const timeStr = `${event.start_time}-${event.end_time}`;
    const carIcon = event.has_car ? ' 🚗' : '';
    eventBlock.innerHTML = `
        <div class="event-title">${event.title || cat.name}${carIcon}</div>
        <div class="event-time">${timeStr}</div>
    `;
    
    // Tooltip hinzufügen
    addTooltipToEvent(eventBlock, event);
    
    // Klick-Handler zum Bearbeiten hinzufügen, wenn der Benutzer diesen Termin bearbeiten darf
    if (canEditEvent(event)) {
        eventBlock.classList.add('editable-event');
        eventBlock.addEventListener('click', (e) => {
            e.stopPropagation();
            openEditModal(event);
        });
    }
    
    employerColumn.appendChild(eventBlock);
}

// Tooltip hinzufügen to event block
function addTooltipToEvent(eventBlock, event) {
    let tooltip = null;
    
    eventBlock.addEventListener('mouseenter', () => {
        let timeInfo;
        if (event.is_all_day) {
            const dateTo = event.date_to || event.date;
            timeInfo = dateTo !== event.date
                ? `Ganztägig (${event.date} – ${dateTo})`
                : 'Ganztägig';
        } else {
            timeInfo = `${event.start_time} - ${event.end_time}`;
        }
        
        const cat = getCategoryById(event.category_id);
        const tooltipText = `${event.title || cat.name}\n${timeInfo}\nKategorie: ${cat.name}`;
        
        // Tooltip erstellen
        tooltip = document.createElement('div');
        tooltip.className = 'event-tooltip';
        tooltip.style.whiteSpace = 'pre-line';
        tooltip.textContent = tooltipText;
        document.body.appendChild(tooltip);
        
        // Tooltip in der Nähe des Mauszeigers positionieren
        const rect = eventBlock.getBoundingClientRect();
        tooltip.style.left = `${rect.left + rect.width / 2}px`;
        tooltip.style.top = `${rect.top - 10}px`;
        tooltip.style.transform = 'translate(-50%, -100%)';
        
        // Tooltip nach einer kurzen Verzögerung anzeigen
        setTimeout(() => {
            if (tooltip) {
                tooltip.classList.add('show');
            }
        }, 100);
    });
    
    eventBlock.addEventListener('mouseleave', () => {
        if (tooltip) {
            tooltip.remove();
            tooltip = null;
        }
    });
}

// Prüfen, ob der aktuelle Benutzer einen bestimmten Termin bearbeiten darf
function canEditEvent(event) {
    if (IS_SUPERUSER) return true;
    if (CURRENT_USER_ID === null || CURRENT_USER_ID === undefined) return false;
    return String(event.user_id) === String(CURRENT_USER_ID);
}

// Das Termin-Bearbeitungsmodal für einen bestimmten Termin öffnen
function openEditModal(event) {
    const modal = document.getElementById('eventEditModal');
    if (!modal) return;

    // Kategorie-Dropdown füllen
    const categorySelect = document.getElementById('editEventCategory');
    categorySelect.innerHTML = '';
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = cat.name;
        categorySelect.appendChild(option);
    });
    categorySelect.value = event.category_id || 0;

    // Felder füllen
    document.getElementById('editEventId').value = event.id;
    document.getElementById('editEventDate').value = event.date || formatDateForAPI(currentDate);
    document.getElementById('editEventDateTo').value = event.date_to || event.date || formatDateForAPI(currentDate);
    document.getElementById('editEventTitle').value = event.title || '';
    document.getElementById('editEventIsAllDay').checked = !!event.is_all_day;
    document.getElementById('editEventHasCar').checked = !!event.has_car;
    document.getElementById('editEventStartTime').value = event.start_time || '';
    document.getElementById('editEventEndTime').value = event.end_time || '';
    toggleTimeFields(!event.is_all_day);

    modal.style.display = 'flex';
}

// Termin-Bearbeitungsmodal schließen
function closeEditModal() {
    const modal = document.getElementById('eventEditModal');
    if (modal) modal.style.display = 'none';
}

// Zeiteingabefelder basierend auf der Ganztags-Checkbox ein-/ausblenden
function toggleTimeFields(show) {
    const timeFields = document.getElementById('editEventTimeFields');
    if (timeFields) timeFields.style.display = show ? 'grid' : 'none';
    const dateToField = document.getElementById('editEventDateToField');
    if (dateToField) dateToField.style.display = show ? 'none' : 'block';
}

// Den aktuell im Modal angezeigten Termin löschen
async function deleteEventFromModal() {
    const id = document.getElementById('editEventId').value;

    if (!confirm('Termin wirklich löschen?')) {
        return;
    }

    try {
        const formData = new FormData();
        formData.append('action', 'delete');
        formData.append('event_id', id);

        const response = await fetch('event_iec_ajax2.php', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
            alert(result.message || 'Fehler beim Löschen des Termins.');
            return;
        }
    } catch (error) {
        console.error('Fehler beim Löschen des Termins:', error);
        alert('Fehler beim Löschen des Termins.');
        return;
    }

    // Den Termin aus dem lokalen events-Array entfernen
    const eventIndex = events.findIndex(e => String(e.id) === String(id));
    if (eventIndex !== -1) {
        events.splice(eventIndex, 1);
    }

    closeEditModal();

    // Kalender und Termine neu rendern (berechnet die Höhen des Ganztagsbereichs neu)
    renderCalendar();
    renderSessions();
    renderEvents();
}

// Änderungen aus dem Bearbeitungsmodal zurück in das events-Array speichern und neu rendern
async function saveEventFromModal() {
    const id = document.getElementById('editEventId').value;
    const date = document.getElementById('editEventDate').value;
    const title = document.getElementById('editEventTitle').value.trim();
    const categoryId = parseInt(document.getElementById('editEventCategory').value, 10) || 0;
    const isAllDay = document.getElementById('editEventIsAllDay').checked;
    const hasCar = document.getElementById('editEventHasCar').checked;
    const dateTo = isAllDay ? (document.getElementById('editEventDateTo').value || date) : date;
    const startTime = document.getElementById('editEventStartTime').value;
    const endTime = document.getElementById('editEventEndTime').value;

    if (!date) {
        alert('Bitte ein Datum angeben.');
        return;
    }

    if (!title) {
        alert('Bitte einen Titel eingeben.');
        return;
    }

    // Sicherstellen, dass zeitgebundene Termine sowohl Start- als auch Endzeiten haben
    if (!isAllDay && (!startTime || !endTime)) {
        alert('Bitte Start- und Endzeit angeben.');
        return;
    }

    try {
        const formData = new FormData();
        formData.append('action', 'edit');
        formData.append('event_id', id);
        formData.append('date', date);
        formData.append('date_to', dateTo);
        formData.append('title', title);
        formData.append('category_id', categoryId);
        formData.append('is_all_day', isAllDay ? '1' : '0');
        formData.append('has_car', hasCar ? '1' : '0');
        formData.append('start_time', isAllDay ? '' : startTime);
        formData.append('end_time', isAllDay ? '' : endTime);

        const response = await fetch('event_iec_ajax2.php', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
            alert(result.message || 'Fehler beim Speichern des Termins.');
            return;
        }
    } catch (error) {
        console.error('Fehler beim Speichern des Termins:', error);
        alert('Fehler beim Speichern des Termins.');
        return;
    }

    const currentDateStr = formatDateForAPI(currentDate);

    // Den Termin im lokalen events-Array finden und aktualisieren
    const eventIndex = events.findIndex(e => String(e.id) === String(id));
    if (eventIndex !== -1) {
        const effectiveDateTo = dateTo || date;
        const stillVisible = date <= currentDateStr && effectiveDateTo >= currentDateStr;
        if (!stillVisible) {
            // Der Termin deckt das aktuelle Datum nicht mehr ab – aus der Ansicht entfernen
            events.splice(eventIndex, 1);
        } else {
            events[eventIndex] = {
                ...events[eventIndex],
                date,
                date_to: dateTo,
                title,
                category_id: categoryId,
                is_all_day: isAllDay,
                has_car: hasCar,
                start_time: isAllDay ? '' : startTime,
                end_time: isAllDay ? '' : endTime
            };
        }
    }

    closeEditModal();

    // Kalender und Termine neu rendern (berechnet die Höhen des Ganztagsbereichs neu)
    renderCalendar();
    renderSessions();
    renderEvents();
}

// Das neue Termin-Modal öffnen und das Datum mit dem aktuellen Kalendertag vorausfüllen
function openNewEventModal() {
    const modal = document.getElementById('newEventModal');
    if (!modal) return;

    // Mitarbeiter-Dropdown aus dem geladenen employers-Array füllen
    const employerSelect = document.getElementById('newEventEmployer');
    employerSelect.innerHTML = '';
    employers.forEach(emp => {
        const option = document.createElement('option');
        option.value = emp.id;
        option.textContent = emp.name;
        employerSelect.appendChild(option);
    });

    // Kategorie-Dropdown füllen
    const categorySelect = document.getElementById('newEventCategory');
    categorySelect.innerHTML = '';
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = cat.name;
        categorySelect.appendChild(option);
    });

    // Felder zurücksetzen
    document.getElementById('newEventDate').value = formatDateForAPI(currentDate);
    document.getElementById('newEventDateTo').value = formatDateForAPI(currentDate);
    document.getElementById('newEventTitle').value = '';
    document.getElementById('newEventIsAllDay').checked = false;
    document.getElementById('newEventHasCar').checked = false;
    document.getElementById('newEventStartTime').value = '';
    document.getElementById('newEventEndTime').value = '';
    toggleNewEventTimeFields(true);

    modal.style.display = 'flex';
}

// Das neue Termin-Modal schließen
function closeNewEventModal() {
    const modal = document.getElementById('newEventModal');
    if (modal) modal.style.display = 'none';
}

// Zeiteingabefelder im neuen Termin-Modal ein-/ausblenden
function toggleNewEventTimeFields(show) {
    const timeFields = document.getElementById('newEventTimeFields');
    if (timeFields) timeFields.style.display = show ? 'grid' : 'none';
    const dateToField = document.getElementById('newEventDateToField');
    if (dateToField) dateToField.style.display = show ? 'none' : 'block';
}

// Einen neuen Termin über event_iec_ajax2.php erstellen
async function createEventFromModal() {
    const employerSelect = document.getElementById('newEventEmployer');
    const employerIds = Array.from(employerSelect.selectedOptions).map(o => o.value);
    const date = document.getElementById('newEventDate').value;
    const title = document.getElementById('newEventTitle').value.trim();
    const categoryId = parseInt(document.getElementById('newEventCategory').value, 10) || 0;
    const isAllDay = document.getElementById('newEventIsAllDay').checked;
    const hasCar = document.getElementById('newEventHasCar').checked;
    const dateTo = isAllDay ? (document.getElementById('newEventDateTo').value || date) : date;
    const startTime = document.getElementById('newEventStartTime').value;
    const endTime = document.getElementById('newEventEndTime').value;

    if (employerIds.length === 0) {
        alert('Bitte mindestens einen Mitarbeiter auswählen.');
        return;
    }

    if (!date) {
        alert('Bitte ein Datum angeben.');
        return;
    }

    if (!title) {
        alert('Bitte einen Titel eingeben.');
        return;
    }

    if (!isAllDay && (!startTime || !endTime)) {
        alert('Bitte Start- und Endzeit angeben.');
        return;
    }

    const userId = CURRENT_USER_ID !== null && CURRENT_USER_ID !== undefined
        ? CURRENT_USER_ID : 1;

    try {
        const formData = new FormData();
        formData.append('action', 'create');
        employerIds.forEach(id => formData.append('employer_ids[]', id));
        formData.append('user_id', String(userId));
        formData.append('date', date);
        formData.append('date_to', dateTo);
        formData.append('title', title);
        formData.append('category_id', categoryId);
        formData.append('is_all_day', isAllDay ? '1' : '0');
        formData.append('has_car', hasCar ? '1' : '0');
        formData.append('start_time', isAllDay ? '' : startTime);
        formData.append('end_time', isAllDay ? '' : endTime);

        const response = await fetch('event_iec_ajax2.php', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
            alert(result.message || 'Fehler beim Erstellen des Termins.');
            return;
        }

        // Den neuen Termin nur dann zum lokalen Array hinzufügen, wenn er das aktuelle Datum abdeckt
        const currentDateStr = formatDateForAPI(currentDate);
        if (result.event) {
            const effectiveDateTo = result.event.date_to || result.event.date;
            if (result.event.date <= currentDateStr && effectiveDateTo >= currentDateStr) {
                events.push(result.event);
                // Kalender und Termine neu rendern (berechnet die Höhen des Ganztagsbereichs neu)
                renderCalendar();
                renderSessions();
                renderEvents();
            }
        }

    } catch (error) {
        console.error('Fehler beim Erstellen des Termins:', error);
        alert('Fehler beim Erstellen des Termins.');
        return;
    }

    closeNewEventModal();
}

// Modal-Ereignisse verbinden, nachdem das DOM bereit ist
document.addEventListener('DOMContentLoaded', () => {
    const allDayCheckbox = document.getElementById('editEventIsAllDay');
    if (allDayCheckbox) {
        allDayCheckbox.addEventListener('change', () => {
            toggleTimeFields(!allDayCheckbox.checked);
        });
    }

    const deleteBtn = document.getElementById('editModalDelete');
    if (deleteBtn) deleteBtn.addEventListener('click', deleteEventFromModal);

    const closeBtn = document.getElementById('editModalClose');
    if (closeBtn) closeBtn.addEventListener('click', closeEditModal);

    const cancelBtn = document.getElementById('editModalCancel');
    if (cancelBtn) cancelBtn.addEventListener('click', closeEditModal);

    const saveBtn = document.getElementById('editModalSave');
    if (saveBtn) saveBtn.addEventListener('click', saveEventFromModal);

    // Modal schließen, wenn auf den Hintergrund geklickt wird
    const modal = document.getElementById('eventEditModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeEditModal();
        });
    }

    // Schaltfläche „Neuer Termin“
    const newEventBtn = document.getElementById('newEventBtn');
    if (newEventBtn) newEventBtn.addEventListener('click', openNewEventModal);

    // Steuerelemente für das neue Termin-Modal
    const newEventAllDay = document.getElementById('newEventIsAllDay');
    if (newEventAllDay) {
        newEventAllDay.addEventListener('change', () => {
            toggleNewEventTimeFields(!newEventAllDay.checked);
        });
    }

    const newEventClose = document.getElementById('newEventModalClose');
    if (newEventClose) newEventClose.addEventListener('click', closeNewEventModal);

    const newEventCancel = document.getElementById('newEventModalCancel');
    if (newEventCancel) newEventCancel.addEventListener('click', closeNewEventModal);

    const newEventSave = document.getElementById('newEventModalSave');
    if (newEventSave) newEventSave.addEventListener('click', createEventFromModal);

    const newEventModal = document.getElementById('newEventModal');
    if (newEventModal) {
        newEventModal.addEventListener('click', (e) => {
            if (e.target === newEventModal) closeNewEventModal();
        });
    }
});
