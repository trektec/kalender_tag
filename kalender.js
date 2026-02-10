// Configuration - Adjust these values to customize the calendar
const START_HOUR = 6;
const END_HOUR = 18;
const HOUR_HEIGHT = 60; // Height of each hour slot in pixels
const ALL_DAY_HEIGHT = 60; // Height of the all-day appointments section in pixels
const COLUMN_GAP = 0; // Gap between columns in pixels
const EMPLOYER_HEADER_HEIGHT = 60; // Height of employer name header in pixels

// State
let employers = [];

// Initialize calendar on page load
document.addEventListener('DOMContentLoaded', async () => {
    await loadEmployers();
    renderCalendar();
    initializeTimeline();
});

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
    
    // Header (must match employer header + all-day section height)
    const header = document.createElement('div');
    header.className = 'time-header';
    header.style.height = `${EMPLOYER_HEADER_HEIGHT + ALL_DAY_HEIGHT}px`;
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
    
    // Apply column gap via margin
    if (COLUMN_GAP > 0) {
        column.style.marginRight = `${COLUMN_GAP}px`;
    }
    
    // Employer name header
    const header = document.createElement('div');
    header.className = 'employer-header';
    header.style.height = `${EMPLOYER_HEADER_HEIGHT}px`;
    header.textContent = employer.name;
    column.appendChild(header);
    
    // All-day section
    const allDaySection = document.createElement('div');
    allDaySection.className = 'all-day-section';
    allDaySection.style.height = `${ALL_DAY_HEIGHT}px`;
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

// Timeline functionality
function initializeTimeline() {
    createTimelineElement();
    updateTimeline();
    // Update timeline every 30 seconds
    setInterval(updateTimeline, 30000);
}

function createTimelineElement() {
    const calendarGrid = document.getElementById('calendar');
    
    // Create timeline container
    const timelineContainer = document.createElement('div');
    timelineContainer.className = 'timeline-container';
    timelineContainer.id = 'timeline';
    
    // Create time indicator (left side with white text)
    const timeIndicator = document.createElement('div');
    timeIndicator.className = 'timeline-indicator';
    timeIndicator.id = 'timeline-indicator';
    
    // Create red line (spans across columns)
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
    
    // Check if current time is within calendar hours
    if (currentHour < START_HOUR || currentHour >= END_HOUR) {
        // Hide timeline if outside calendar hours
        const timeline = document.getElementById('timeline');
        if (timeline) {
            timeline.style.display = 'none';
        }
        return;
    }
    
    // Calculate position
    const hoursSinceStart = currentHour - START_HOUR;
    const minutesFraction = currentMinute / 60;
    const totalHoursFraction = hoursSinceStart + minutesFraction;
    
    // Calculate top position (header height + all-day height + hour position)
    const headerHeight = EMPLOYER_HEADER_HEIGHT + ALL_DAY_HEIGHT;
    const topPosition = headerHeight + (totalHoursFraction * HOUR_HEIGHT);
    
    // Update timeline position
    const timeline = document.getElementById('timeline');
    const timeIndicator = document.getElementById('timeline-indicator');
    
    if (timeline && timeIndicator) {
        timeline.style.display = 'block';
        timeline.style.top = `${topPosition}px`;
        
        // Format time as HH:MM
        const timeString = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
        timeIndicator.textContent = timeString;
    }
}

