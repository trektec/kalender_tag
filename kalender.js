// Configuration
const START_HOUR = 6;
const END_HOUR = 18;
let HOUR_HEIGHT = 60; // Default height in pixels

// State
let employers = [];

// Initialize calendar on page load
document.addEventListener('DOMContentLoaded', async () => {
    setupHourHeightControl();
    await loadEmployers();
    renderCalendar();
});

// Setup hour height control
function setupHourHeightControl() {
    const slider = document.getElementById('hourHeight');
    const valueDisplay = document.getElementById('hourHeightValue');
    
    slider.addEventListener('input', (e) => {
        HOUR_HEIGHT = parseInt(e.target.value);
        valueDisplay.textContent = HOUR_HEIGHT;
        updateHourHeights();
    });
}

// Load employers from server
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
        // Use sample data for demonstration
        employers = [
            { id: 1, name: 'Max Mustermann' },
            { id: 2, name: 'Anna Schmidt' },
            { id: 3, name: 'Peter Weber' }
        ];
    }
}

// Render the complete calendar
function renderCalendar() {
    const calendarDiv = document.getElementById('calendar');
    calendarDiv.innerHTML = '';
    
    // Create time column
    const timeColumn = createTimeColumn();
    calendarDiv.appendChild(timeColumn);
    
    // Create employer columns
    employers.forEach(employer => {
        const employerColumn = createEmployerColumn(employer);
        calendarDiv.appendChild(employerColumn);
    });
}

// Create time column with hours
function createTimeColumn() {
    const column = document.createElement('div');
    column.className = 'time-column';
    
    // Header
    const header = document.createElement('div');
    header.className = 'time-header';
    header.textContent = 'Zeit';
    column.appendChild(header);
    
    // Hours
    for (let hour = START_HOUR; hour <= END_HOUR; hour++) {
        const timeSlot = document.createElement('div');
        timeSlot.className = 'time-slot';
        timeSlot.style.height = `${HOUR_HEIGHT}px`;
        timeSlot.textContent = `${hour}:00`;
        column.appendChild(timeSlot);
    }
    
    return column;
}

// Create employer column with all-day section and hours
function createEmployerColumn(employer) {
    const column = document.createElement('div');
    column.className = 'employer-column';
    column.dataset.employerId = employer.id;
    
    // Employer name header
    const header = document.createElement('div');
    header.className = 'employer-header';
    header.textContent = employer.name;
    column.appendChild(header);
    
    // All-day section
    const allDaySection = document.createElement('div');
    allDaySection.className = 'all-day-section';
    allDaySection.textContent = 'Ganztägig';
    column.appendChild(allDaySection);
    
    // Hour slots
    for (let hour = START_HOUR; hour <= END_HOUR; hour++) {
        const hourSlot = document.createElement('div');
        hourSlot.className = 'hour-slot';
        hourSlot.style.height = `${HOUR_HEIGHT}px`;
        hourSlot.dataset.hour = hour;
        column.appendChild(hourSlot);
    }
    
    return column;
}

// Update hour heights when slider changes
function updateHourHeights() {
    // Update time slots
    const timeSlots = document.querySelectorAll('.time-slot');
    timeSlots.forEach(slot => {
        slot.style.height = `${HOUR_HEIGHT}px`;
    });
    
    // Update hour slots
    const hourSlots = document.querySelectorAll('.hour-slot');
    hourSlots.forEach(slot => {
        slot.style.height = `${HOUR_HEIGHT}px`;
    });
}
