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
const MIN_EVENTS_FOR_DYNAMIC_HEIGHT = 3; // Mindestanzahl an Ganztagsterminen, um die dynamische Höhe ohne Mindestbeschränkung zu verwenden
const COLUMN_GAP = 0; // Abstand zwischen den Spalten in Pixeln
const DAY_HEADER_HEIGHT = 40; // Höhe der Tageskopfzeile in Pixeln
const EVENT_PADDING = 2; // Innen-/Außenabstand von den Spaltenrändern für Terminblöcke in Pixeln

// Farben der Tageskopfzeilen – ein Eintrag pro Wochentag (Index 0 = Montag … 6 = Sonntag)
const DAY_COLORS = [
    '#4a90e2', // Montag
    '#4a90e2', // Dienstag
    '#4a90e2', // Mittwoch
    '#4a90e2', // Donnerstag
    '#4a90e2', // Freitag
    '#4a90e2', // Samstag
    '#4a90e2', // Sonntag
];
// Farbe für die Kopfzeile der heutigen Spalte
const TODAY_COLOR = '#2ecc71';

// Status
let employers = [];
let categories = [];
let events = [];
let currentAllDayHeights = null; // Cache für Ganztagshöhen
let currentDate = new Date(); // Aktuell ausgewähltes Datum (wir berechnen den Montag dieser Woche)

// Wochentage auf Deutsch
const DAYS_OF_WEEK = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
const DAYS_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

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

// Den Montag der Woche für ein gegebenes Datum ermitteln
function getMondayOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Anpassen, wenn der Tag Sonntag ist
    return new Date(d.setDate(diff));
}

// Array der Daten für die Woche abrufen (Montag bis Sonntag)
function getWeekDates(mondayDate) {
    const dates = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(mondayDate);
        date.setDate(mondayDate.getDate() + i);
        dates.push(date);
    }
    return dates;
}

// Kalender beim Laden der Seite initialisieren
document.addEventListener('DOMContentLoaded', async () => {
    setupNavigationHandlers();
    updateWeekDisplay();
    await loadEmployers();
    await loadCategories();
    await loadEvents();
    renderCalendar();
    renderEvents();
    initializeTimeline();
});

// Ereignishandler für Navigationsschaltflächen einrichten
function setupNavigationHandlers() {
    document.getElementById('prevWeekBtn').addEventListener('click', () => {
        changeWeek(-7);
    });
    
    document.getElementById('todayBtn').addEventListener('click', () => {
        setThisWeek();
    });
    
    document.getElementById('nextWeekBtn').addEventListener('click', () => {
        changeWeek(7);
    });

    const newEventBtn = document.getElementById('newEventBtn');
    if (newEventBtn) newEventBtn.addEventListener('click', openNewEventModal);
}

// Aktuelles Datum um einen Tagesoffset ändern
async function changeWeek(daysOffset) {
    currentDate = new Date(currentDate.getTime());
    currentDate.setDate(currentDate.getDate() + daysOffset);
    updateWeekDisplay();
    await reloadCalendar();
}

// Aktuelles Datum auf diese Woche setzen
async function setThisWeek() {
    currentDate = new Date();
    updateWeekDisplay();
    await reloadCalendar();
}

// Wochenanzeige aktualisieren
function updateWeekDisplay() {
    const monday = getMondayOfWeek(currentDate);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    const dateDisplay = document.getElementById('currentWeekDisplay');
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const mondayString = monday.toLocaleDateString('de-DE', options);
    const sundayString = sunday.toLocaleDateString('de-DE', options);
    dateDisplay.textContent = `${mondayString} - ${sundayString}`;
}

// Kalender mit aktueller Woche neu laden
async function reloadCalendar() {
    await loadCategories();
    await loadEvents();
    renderCalendar();
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
    try {
        const response = await fetch('employers_ajax.php');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        employers = Array.isArray(data) ? data : [];
    } catch (error) {
        console.error('Fehler beim Laden der Mitarbeiter:', error);
        employers = [];
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

// Termine vom Server laden
async function loadEvents() {
    
    try {
        const monday = getMondayOfWeek(currentDate);
        const startDateParam = formatDateForAPI(monday);
        const response = await fetch(`event_week_ajax.php?start_date=${startDateParam}`);
        
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
    
    // Wochendaten abrufen
    const monday = getMondayOfWeek(currentDate);
    const weekDates = getWeekDates(monday);
    
    // Die Höhe des Ganztagsbereichs für jeden Tag berechnen
    const allDayHeights = calculateAllDayHeights(weekDates);
    currentAllDayHeights = allDayHeights; // Für die spätere Verwendung zwischenspeichern
    
    // Linke Zeitspalte erstellen
    const timeColumnLeft = createTimeColumn(allDayHeights);
    calendarDiv.appendChild(timeColumnLeft);
    
    // Tagesspalten erstellen
    weekDates.forEach((date, index) => {
        const isLastDay = index === weekDates.length - 1;
        const dayColumn = createDayColumn(date, index, isLastDay, allDayHeights);
        calendarDiv.appendChild(dayColumn);
    });
    
    // Rechte Zeitspalte erstellen
    const timeColumnRight = createTimeColumn(allDayHeights);
    calendarDiv.appendChild(timeColumnRight);
}

// Hilfsfunktion zum Ermitteln der aktuellen Kopfzeilenhöhe (Tageskopfzeile + Ganztagsbereich)
function getHeaderHeight() {
    if (currentAllDayHeights) {
        return DAY_HEADER_HEIGHT + currentAllDayHeights.maxHeight;
    }
    return DAY_HEADER_HEIGHT + ALL_DAY_HEIGHT;
}

// Die für den Ganztagsbereich jedes Tages benötigte Höhe berechnen
function calculateAllDayHeights(weekDates) {
    const allDayHeights = {};
    let maxAllDayEvents = 0; // Mit 0 beginnen
    
    // Termine nach Tag gruppieren
    weekDates.forEach((date, index) => {
        const dateStr = formatDateForAPI(date);
        const dayAllDayEvents = events.filter(e => {
            const eventEnd = e.date_to || e.date;
            return e.date <= dateStr && eventEnd >= dateStr && e.is_all_day;
        });
        const count = dayAllDayEvents.length;
        allDayHeights[index] = count;
        maxAllDayEvents = Math.max(maxAllDayEvents, count);
    });
    
    // Die benötigte Gesamthöhe berechnen
    // Jede Terminhöhe plus unteren Abstand berücksichtigen
    const calculatedHeight = (maxAllDayEvents * ALL_DAY_EVENT_HEIGHT) + ALL_DAY_BOTTOM_SPACING;
    
    // Wenn MIN_EVENTS_FOR_DYNAMIC_HEIGHT oder mehr Termine vorhanden sind, nicht durch das Mindestmaß ALL_DAY_HEIGHT begrenzen
    // damit nichts abgeschnitten wird und der Abstand korrekt ist
    const maxHeight = maxAllDayEvents >= MIN_EVENTS_FOR_DYNAMIC_HEIGHT ? calculatedHeight : Math.max(ALL_DAY_HEIGHT, calculatedHeight);
    
    return { perDay: allDayHeights, maxHeight: maxHeight };
}

// Zeitspalte mit Stunden erstellen
function createTimeColumn(allDayHeights) {
    const column = document.createElement('div');
    column.className = 'time-column';
    
    // Kopfzeile (muss zur Tageskopfzeile + Höhe des Ganztagsbereichs passen)
    const header = document.createElement('div');
    header.className = 'time-header';
    header.style.height = `${DAY_HEADER_HEIGHT + allDayHeights.maxHeight}px`;
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

// Tagesspalte mit Ganztagsbereich und Stunden erstellen
function createDayColumn(date, dayIndex, isLastDay = false, allDayHeights) {
    const column = document.createElement('div');
    column.className = 'employer-column'; // CSS-Klasse employer-column wiederverwenden
    column.dataset.dayIndex = dayIndex;
    column.dataset.date = formatDateForAPI(date);
    
    // Spaltenabstand per Margin anwenden, aber nicht für den letzten Tag
    if (COLUMN_GAP > 0 && !isLastDay) {
        column.style.marginRight = `${COLUMN_GAP}px`;
    }
    
    // Kopfzeile mit Tagesnamen
    const header = document.createElement('div');
    header.className = 'employer-header'; // Reuse employer-header CSS class
    header.style.height = `${DAY_HEADER_HEIGHT}px`;
    
    // Wochentag abrufen
    const dayOfWeek = DAYS_OF_WEEK[dayIndex];
    const dayOfMonth = date.getDate();
    const month = date.getMonth() + 1;
    
    // Prüfen, ob dies heute ist
    const today = new Date();
    const isToday = date.getDate() === today.getDate() && 
                    date.getMonth() === today.getMonth() && 
                    date.getFullYear() === today.getFullYear();
    
    header.textContent = `${dayOfWeek}, ${dayOfMonth}.${month}.`;
    
    // Heute mit einer anderen Farbe hervorheben
    if (isToday) {
        header.style.backgroundColor = TODAY_COLOR;
        header.style.color = getContrastingTextColor(TODAY_COLOR);
    } else {
        const dayColor = DAY_COLORS[dayIndex] || '#4a90e2';
        header.style.backgroundColor = dayColor;
        header.style.color = getContrastingTextColor(dayColor);
    }
    
    column.appendChild(header);
    
    // Ganztagsbereich (maximale Höhe über alle Tage verwenden)
    const allDaySection = document.createElement('div');
    allDaySection.className = 'all-day-section';
    allDaySection.style.height = `${allDayHeights.maxHeight}px`;
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
    // Zeitleiste alle 30 Sekunden aktualisieren
    setInterval(() => {
        updateTimeline();
    }, 30000);
}

function createTimelineElement() {
    const calendarGrid = document.getElementById('calendar');
    
    // Vorhandene Zeitleiste entfernen, falls vorhanden
    const existingTimeline = document.getElementById('timeline');
    if (existingTimeline) {
        existingTimeline.remove();
    }
    
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
    
    // Prüfen, ob heute in der aktuellen Woche liegt
    const monday = getMondayOfWeek(currentDate);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    
    if (todayStart < monday || todayStart > sunday) {
        // Heute liegt nicht in der aktuellen Woche, Zeitleiste ausblenden
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

// Terminblöcke für alle Tage rendern
function renderEvents() {
    // Termine nach Tag und Typ gruppieren (ganztägig vs. zeitgebunden)
    const monday = getMondayOfWeek(currentDate);
    const weekDates = getWeekDates(monday);
    
    weekDates.forEach((date, dayIndex) => {
        const dateStr = formatDateForAPI(date);
        const dayEvents = events.filter(e => {
            const eventEnd = e.date_to || e.date;
            return e.date <= dateStr && eventEnd >= dateStr;
        });
        
        const allDayEvents = dayEvents.filter(e => e.is_all_day);
        const timedEvents = dayEvents.filter(e => !e.is_all_day);
        
        renderAllDayEvents(dayIndex, allDayEvents);
        renderTimedEvents(dayIndex, timedEvents);
    });
}

// Ganztagstermine im Ganztagsbereich rendern
function renderAllDayEvents(dayIndex, allDayEvents) {
    const dayColumn = document.querySelector(`.employer-column[data-day-index="${dayIndex}"]`);
    
    if (!dayColumn || allDayEvents.length === 0) {
        return;
    }
    
    const allDaySection = dayColumn.querySelector('.all-day-section');
    
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
        const allDayTitle = event.title || cat.name;
        const allDayNames = getEmployerNames(event);
        eventBlock.innerHTML = allDayNames
            ? `<span class="event-title-text">${allDayTitle}</span><span class="event-employers"> | ${allDayNames}</span>`
            : `<span class="event-title-text">${allDayTitle}</span>`;
        
        // Tooltip mit Mitarbeiterinformationen hinzufügen
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
function renderTimedEvents(dayIndex, timedEvents) {
    const dayColumn = document.querySelector(`.employer-column[data-day-index="${dayIndex}"]`);
    
    if (!dayColumn || timedEvents.length === 0) {
        return;
    }
    
    // Überlappende Termine erkennen und gruppieren
    const eventGroups = detectOverlappingEvents(timedEvents);
    
    // Jede Gruppe rendern
    eventGroups.forEach(group => {
        renderEventGroup(dayColumn, group);
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
function renderEventGroup(dayColumn, eventGroup) {
    const groupSize = eventGroup.length;
    const eventWidth = (100 - (EVENT_PADDING * 2)) / groupSize;
    
    eventGroup.forEach((event, index) => {
        renderTimedEvent(dayColumn, event, index, groupSize, eventWidth);
    });
}

// Einen einzelnen zeitgebundenen Termin rendern
function renderTimedEvent(dayColumn, event, positionIndex, totalInGroup, eventWidth) {
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
    const employerNames = getEmployerNames(event);
    eventBlock.innerHTML = `
        <div class="event-title">${event.title || cat.name}</div>
        <div class="event-time">${timeStr}</div>
        ${employerNames ? `<div class="event-employers">${employerNames}</div>` : ''}
    `;
    
    // Tooltip mit Mitarbeiterinformationen hinzufügen
    addTooltipToEvent(eventBlock, event);
    
    // Klick-Handler zum Bearbeiten hinzufügen, wenn der Benutzer diesen Termin bearbeiten darf
    if (canEditEvent(event)) {
        eventBlock.classList.add('editable-event');
        eventBlock.addEventListener('click', (e) => {
            e.stopPropagation();
            openEditModal(event);
        });
    }
    
    dayColumn.appendChild(eventBlock);
}

// Einen kommagetrennten String der Mitarbeiternamen für einen Termin zurückgeben
function getEmployerNames(event) {
    if (Array.isArray(event.employer_ids) && event.employer_ids.length > 0) {
        return event.employer_ids.map(id => {
            const emp = employers.find(e => String(e.id) === String(id));
            return emp ? emp.name : '';
        }).filter(Boolean).join(', ');
    }
    const employer = employers.find(e => String(e.id) === String(event.employer_id));
    return employer ? employer.name : (event.employer_name || '');
}

// Tooltip mit Mitarbeiterinformationen zum Terminblock hinzufügen
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
        
        // Mitarbeiternamen in den Tooltip aufnehmen (aus der geladenen Mitarbeiterliste nachschlagen)
        const employerNames = getEmployerNames(event);
        const employeeInfo = employerNames ? `\nMitarbeiter: ${employerNames}` : '';
        const cat = getCategoryById(event.category_id);
        const tooltipText = `${event.title || cat.name}\n${timeInfo}\nKategorie: ${cat.name}${employeeInfo}`;
        
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
    document.getElementById('editEventDate').value = event.date || '';
    document.getElementById('editEventDateTo').value = event.date_to || event.date || '';
    document.getElementById('editEventTitle').value = event.title || '';
    document.getElementById('editEventIsAllDay').checked = !!event.is_all_day;
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

        const response = await fetch('event_week_ajax.php', {
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

    // Termine neu rendern
    document.querySelectorAll('.event-block').forEach(el => el.remove());
    renderEvents();
}

// Änderungen aus dem Bearbeitungsmodal per AJAX speichern und neu rendern
async function saveEventFromModal() {
    const id = document.getElementById('editEventId').value;
    const date = document.getElementById('editEventDate').value;
    const title = document.getElementById('editEventTitle').value.trim();
    const categoryId = parseInt(document.getElementById('editEventCategory').value, 10) || 0;
    const isAllDay = document.getElementById('editEventIsAllDay').checked;
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
        formData.append('start_time', isAllDay ? '' : startTime);
        formData.append('end_time', isAllDay ? '' : endTime);

        const response = await fetch('event_week_ajax.php', {
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

    // Den Termin im lokalen events-Array aktualisieren
    const monday = getMondayOfWeek(currentDate);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const sundayStr = formatDateForAPI(sunday);
    const mondayStr = formatDateForAPI(monday);

    const eventIndex = events.findIndex(e => String(e.id) === String(id));
    if (eventIndex !== -1) {
        const effectiveDateTo = dateTo || date;
        // Der Termin ist weiterhin in der aktuellen Woche, wenn sein Datumsbereich die Woche überlappt
        const stillInWeek = date <= sundayStr && effectiveDateTo >= mondayStr;
        if (!stillInWeek) {
            // Der Termin wurde aus der aktuellen Woche verschoben – aus der Ansicht entfernen
            events.splice(eventIndex, 1);
        } else {
            events[eventIndex] = {
                ...events[eventIndex],
                date,
                date_to: dateTo,
                title,
                category_id: categoryId,
                is_all_day: isAllDay,
                start_time: isAllDay ? '' : startTime,
                end_time: isAllDay ? '' : endTime
            };
        }
    }

    closeEditModal();

    // Termine neu rendern
    document.querySelectorAll('.event-block').forEach(el => el.remove());
    renderEvents();
}

// Das neue Termin-Modal öffnen
function openNewEventModal() {
    const modal = document.getElementById('newEventModal');
    if (!modal) return;

    // Mitarbeiter-Dropdown füllen
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

    // Datum mit dem Montag der aktuellen Woche vorausfüllen
    const monday = getMondayOfWeek(currentDate);
    document.getElementById('newEventDate').value = formatDateForAPI(monday);
    document.getElementById('newEventDateTo').value = formatDateForAPI(monday);
    document.getElementById('newEventTitle').value = '';
    document.getElementById('newEventIsAllDay').checked = false;
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

// Einen neuen Termin über event_week_ajax.php erstellen
async function createEventFromModal() {
    const employerSelect = document.getElementById('newEventEmployer');
    const employerIds = Array.from(employerSelect.selectedOptions).map(o => o.value);
    const date = document.getElementById('newEventDate').value;
    const title = document.getElementById('newEventTitle').value.trim();
    const categoryId = parseInt(document.getElementById('newEventCategory').value, 10) || 0;
    const isAllDay = document.getElementById('newEventIsAllDay').checked;
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
        formData.append('start_time', isAllDay ? '' : startTime);
        formData.append('end_time', isAllDay ? '' : endTime);

        const response = await fetch('event_week_ajax.php', {
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

        // Neuen Termin zum lokalen Array hinzufügen, wenn er die aktuelle Woche überlappt
        if (result.event) {
            const monday = getMondayOfWeek(currentDate);
            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            const mondayStr = formatDateForAPI(monday);
            const sundayStr = formatDateForAPI(sunday);
            const effectiveDateTo = result.event.date_to || result.event.date;

            if (result.event.date <= sundayStr && effectiveDateTo >= mondayStr) {
                events.push(result.event);
                document.querySelectorAll('.event-block').forEach(el => el.remove());
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
