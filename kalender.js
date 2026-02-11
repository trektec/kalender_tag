// Configuration - Adjust these values to customize the calendar
const START_HOUR = 6;
const END_HOUR = 18;
const HOUR_HEIGHT = 60; // Height of each hour slot in pixels
const ALL_DAY_HEIGHT = 60; // Minimum height of the all-day appointments section in pixels
const ALL_DAY_EVENT_HEIGHT = 30; // Height of each individual all-day event in pixels
const ALL_DAY_BOTTOM_SPACING = 10; // Adjustable spacing after the last all-day entry in pixels
const COLUMN_GAP = 0; // Gap between columns in pixels
const EMPLOYER_HEADER_HEIGHT = 60; // Height of employer name header in pixels
const SESSION_PADDING = 5; // Padding/margin from column edges for session blocks in pixels
const EVENT_PADDING = 2; // Padding/margin from column edges for event blocks in pixels

// State
let employers = [];
let sessions = [];
let events = [];
let currentAllDayHeights = null; // Cache for all-day heights
let currentDate = new Date(); // Current selected date

// Initialize calendar on page load
document.addEventListener('DOMContentLoaded', async () => {
    setupNavigationHandlers();
    updateDateDisplay();
    await loadEmployers();
    await loadSessions();
    await loadEvents();
    renderCalendar();
    renderSessions();
    renderEvents();
    initializeTimeline();
});

// Setup navigation button handlers
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

// Change current date by days offset
async function changeDay(daysOffset) {
    currentDate = new Date(currentDate.getTime());
    currentDate.setDate(currentDate.getDate() + daysOffset);
    updateDateDisplay();
    await reloadCalendar();
}

// Set current date to today
async function setToday() {
    currentDate = new Date();
    updateDateDisplay();
    await reloadCalendar();
}

// Update the date display
function updateDateDisplay() {
    const dateDisplay = document.getElementById('currentDateDisplay');
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateString = currentDate.toLocaleDateString('de-DE', options);
    dateDisplay.textContent = dateString;
}

// Reload calendar with current date
async function reloadCalendar() {
    await loadEmployers();
    await loadSessions();
    await loadEvents();
    renderCalendar();
    renderSessions();
    renderEvents();
    updateTimeline();
}

// Format date for API calls (YYYY-MM-DD)
function formatDateForAPI(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
            { id: 1, name: 'Max Mustermann', department: 'Vertrieb', color: '#4a90e2' },
            { id: 2, name: 'Anna Schmidt', department: 'Marketing', color: '#e74c3c' },
            { id: 3, name: 'Peter Weber', department: 'IT', color: '#2ecc71' }
        ];
    }
}

// Load sessions from server
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

// Load events from server
async function loadEvents() {
    try {
        const dateParam = formatDateForAPI(currentDate);
        const response = await fetch(`event_ajax.php?date=${dateParam}`);
        
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

// Render the complete calendar
function renderCalendar() {
    const calendarDiv = document.getElementById('calendar');
    calendarDiv.innerHTML = '';
    
    // Calculate all-day section heights for each employer
    const allDayHeights = calculateAllDayHeights();
    currentAllDayHeights = allDayHeights; // Cache for later use
    
    // Create left time column
    const timeColumnLeft = createTimeColumn(allDayHeights);
    calendarDiv.appendChild(timeColumnLeft);
    
    // Create employer columns
    employers.forEach((employer, index) => {
        const isLastEmployer = index === employers.length - 1;
        const employerColumn = createEmployerColumn(employer, isLastEmployer, allDayHeights);
        calendarDiv.appendChild(employerColumn);
    });
    
    // Create right time column
    const timeColumnRight = createTimeColumn(allDayHeights);
    calendarDiv.appendChild(timeColumnRight);
}

// Helper function to get the current header height (employer header + all-day section)
function getHeaderHeight() {
    if (currentAllDayHeights) {
        return EMPLOYER_HEADER_HEIGHT + currentAllDayHeights.maxHeight;
    }
    return EMPLOYER_HEADER_HEIGHT + ALL_DAY_HEIGHT;
}

// Calculate the height needed for all-day section for each employer
function calculateAllDayHeights() {
    const allDayHeights = {};
    let maxAllDayEvents = 0; // Start with 0
    
    // Group events by employer
    employers.forEach(employer => {
        const employerAllDayEvents = events.filter(
            e => e.employer_id === employer.id && e.is_all_day
        );
        const count = employerAllDayEvents.length;
        allDayHeights[employer.id] = count;
        maxAllDayEvents = Math.max(maxAllDayEvents, count);
    });
    
    // Calculate the total height needed (at least ALL_DAY_HEIGHT for the section)
    // Add ALL_DAY_BOTTOM_SPACING to ensure proper spacing after last all-day event
    const calculatedHeight = (maxAllDayEvents * ALL_DAY_EVENT_HEIGHT) + ALL_DAY_BOTTOM_SPACING;
    const maxHeight = Math.max(ALL_DAY_HEIGHT, calculatedHeight);
    
    return { perEmployer: allDayHeights, maxHeight: maxHeight };
}

// Create time column with hours
function createTimeColumn(allDayHeights) {
    const column = document.createElement('div');
    column.className = 'time-column';
    
    // Header (must match employer header + all-day section height)
    const header = document.createElement('div');
    header.className = 'time-header';
    header.style.height = `${EMPLOYER_HEADER_HEIGHT + allDayHeights.maxHeight}px`;
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
function createEmployerColumn(employer, isLastEmployer = false, allDayHeights) {
    const column = document.createElement('div');
    column.className = 'employer-column';
    column.dataset.employerId = employer.id;
    
    // Apply column gap via margin, but not for the last employer
    if (COLUMN_GAP > 0 && !isLastEmployer) {
        column.style.marginRight = `${COLUMN_GAP}px`;
    }
    
    // Employer name header
    const header = document.createElement('div');
    header.className = 'employer-header';
    header.style.height = `${EMPLOYER_HEADER_HEIGHT}px`;
    header.textContent = employer.name;
    // Apply employer color if available
    if (employer.color) {
        header.style.backgroundColor = employer.color;
    }
    column.appendChild(header);
    
    // All-day section (use max height across all employers)
    const allDaySection = document.createElement('div');
    allDaySection.className = 'all-day-section';
    allDaySection.style.height = `${allDayHeights.maxHeight}px`;
    // Don't set any default text - leave empty when no all-day events
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
    // Update timeline and active sessions every 30 seconds
    setInterval(() => {
        updateTimeline();
        updateActiveSessions();
    }, 30000);
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
    const headerHeight = getHeaderHeight();
    const topPosition = headerHeight + (totalHoursFraction * HOUR_HEIGHT);
    
    // Update timeline position
    const timeline = document.getElementById('timeline');
    const timeIndicator = document.getElementById('timeline-indicator');
    
    if (timeline && timeIndicator) {
        timeline.style.display = 'block';
        timeline.style.top = `${topPosition}px`;
        
        // Format time as HH:MM
        timeIndicator.textContent = formatTime(currentHour, currentMinute);
    }
}

// Helper function to format time as HH:MM
function formatTime(hour, minute) {
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

// Render session blocks for all employees
function renderSessions() {
    sessions.forEach(session => {
        renderSessionBlock(session);
    });
}

// Render a single session block
function renderSessionBlock(session) {
    const employerColumn = document.querySelector(`.employer-column[data-employer-id="${session.employer_id}"]`);
    
    if (!employerColumn) {
        console.warn(`Employer column not found for employer_id: ${session.employer_id}`);
        return;
    }
    
    // Parse login time
    const [loginHour, loginMinute] = session.login_time.split(':').map(Number);
    
    // Calculate if session is currently active (no logout time)
    const isActive = !session.logout_time || session.logout_time === '';
    
    // Parse logout time or use current time for active sessions
    let logoutHour, logoutMinute;
    if (isActive) {
        const now = new Date();
        logoutHour = now.getHours();
        logoutMinute = now.getMinutes();
    } else {
        [logoutHour, logoutMinute] = session.logout_time.split(':').map(Number);
    }
    
    // Check if session is within visible calendar hours (any overlap)
    // Session is visible if it ends after START_HOUR and starts before END_HOUR
    if (logoutHour < START_HOUR || loginHour >= END_HOUR) {
        return; // Session outside visible hours
    }
    
    // Clamp times to visible range
    const clampedLoginHour = Math.max(loginHour, START_HOUR);
    const clampedLoginMinute = loginHour < START_HOUR ? 0 : loginMinute;
    const clampedLogoutHour = Math.min(logoutHour, END_HOUR);
    const clampedLogoutMinute = logoutHour >= END_HOUR ? 0 : logoutMinute;
    
    // Calculate position and height
    const loginFraction = (clampedLoginHour - START_HOUR) + (clampedLoginMinute / 60);
    const logoutFraction = (clampedLogoutHour - START_HOUR) + (clampedLogoutMinute / 60);
    
    const headerHeight = getHeaderHeight();
    const topPosition = headerHeight + (loginFraction * HOUR_HEIGHT);
    const sessionHeight = (logoutFraction - loginFraction) * HOUR_HEIGHT;
    
    // Create session block element
    const sessionBlock = document.createElement('div');
    sessionBlock.className = isActive ? 'session-block active-session' : 'session-block';
    sessionBlock.style.top = `${topPosition}px`;
    sessionBlock.style.height = `${sessionHeight}px`;
    sessionBlock.style.left = `${SESSION_PADDING}px`;
    sessionBlock.style.right = `${SESSION_PADDING}px`;
    
    // Format time display
    const loginTimeStr = formatTime(loginHour, loginMinute);
    const logoutTimeStr = isActive ? 'jetzt' : formatTime(logoutHour, logoutMinute);
    
    sessionBlock.innerHTML = `
        <div class="session-time">${loginTimeStr}</div>
        <div class="session-time">${logoutTimeStr}</div>
    `;
    
    // Store session data on the element for updates
    sessionBlock.dataset.loginTime = loginTimeStr;
    sessionBlock.dataset.logoutTime = logoutTimeStr;
    sessionBlock.dataset.isActive = isActive;
    // Session ID is stored only for active sessions to support future updates
    if (isActive) {
        sessionBlock.dataset.sessionId = session.id;
    }
    
    // Add tooltip functionality
    addTooltipToSession(sessionBlock, loginTimeStr, logoutTimeStr);
    
    employerColumn.appendChild(sessionBlock);
}

// Update active sessions to reflect current time
function updateActiveSessions() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Find all active session blocks
    const activeSessions = document.querySelectorAll('.session-block.active-session');
    
    activeSessions.forEach(sessionBlock => {
        const loginTime = sessionBlock.dataset.loginTime;
        if (!loginTime) return;
        
        const [loginHour, loginMinute] = loginTime.split(':').map(Number);
        
        // Check if current time is within visible calendar hours
        if (currentHour < START_HOUR || currentHour >= END_HOUR) {
            return; // Don't update if outside calendar hours
        }
        
        // Recalculate position and height with current time
        const clampedLoginHour = Math.max(loginHour, START_HOUR);
        const clampedLoginMinute = loginHour < START_HOUR ? 0 : loginMinute;
        const clampedLogoutHour = Math.min(currentHour, END_HOUR);
        const clampedLogoutMinute = currentHour >= END_HOUR ? 0 : currentMinute;
        
        const loginFraction = (clampedLoginHour - START_HOUR) + (clampedLoginMinute / 60);
        const logoutFraction = (clampedLogoutHour - START_HOUR) + (clampedLogoutMinute / 60);
        
        const headerHeight = getHeaderHeight();
        const topPosition = headerHeight + (loginFraction * HOUR_HEIGHT);
        const sessionHeight = (logoutFraction - loginFraction) * HOUR_HEIGHT;
        
        // Update the block's position and height
        sessionBlock.style.top = `${topPosition}px`;
        sessionBlock.style.height = `${sessionHeight}px`;
        
        // Update the logout time display
        const timeElements = sessionBlock.querySelectorAll('.session-time');
        if (timeElements.length === 2) {
            timeElements[1].textContent = 'jetzt';
        }
        
        // Update tooltip data
        sessionBlock.dataset.logoutTime = 'jetzt';
    });
}

// Add tooltip to session block
function addTooltipToSession(sessionBlock, loginTimeStr, logoutTimeStr) {
    let tooltip = null;
    
    sessionBlock.addEventListener('mouseenter', () => {
        // Get current tooltip text from dataset
        const loginTime = sessionBlock.dataset.loginTime;
        const logoutTime = sessionBlock.dataset.logoutTime;
        const tooltipText = `${loginTime} bis ${logoutTime}`;
        
        // Create tooltip
        tooltip = document.createElement('div');
        tooltip.className = 'session-tooltip';
        tooltip.textContent = tooltipText;
        document.body.appendChild(tooltip);
        
        // Position tooltip near the cursor
        const rect = sessionBlock.getBoundingClientRect();
        tooltip.style.left = `${rect.left + rect.width / 2}px`;
        tooltip.style.top = `${rect.top - 30}px`;
        tooltip.style.transform = 'translateX(-50%)';
        
        // Show tooltip after a brief delay
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

// Render event blocks for all employees
function renderEvents() {
    // Group events by employer and type (all-day vs timed)
    const eventsByEmployer = {};
    
    events.forEach(event => {
        if (!eventsByEmployer[event.employer_id]) {
            eventsByEmployer[event.employer_id] = {
                allDay: [],
                timed: []
            };
        }
        
        if (event.is_all_day) {
            eventsByEmployer[event.employer_id].allDay.push(event);
        } else {
            eventsByEmployer[event.employer_id].timed.push(event);
        }
    });
    
    // Render events for each employer
    Object.keys(eventsByEmployer).forEach(employerId => {
        renderAllDayEvents(employerId, eventsByEmployer[employerId].allDay);
        renderTimedEvents(employerId, eventsByEmployer[employerId].timed);
    });
}

// Render all-day events in the all-day section
function renderAllDayEvents(employerId, allDayEvents) {
    const employerColumn = document.querySelector(`.employer-column[data-employer-id="${employerId}"]`);
    
    if (!employerColumn || allDayEvents.length === 0) {
        return;
    }
    
    const allDaySection = employerColumn.querySelector('.all-day-section');
    
    if (!allDaySection) {
        return;
    }
    
    // Stack events vertically - each event takes full width with proper margins
    allDayEvents.forEach((event, index) => {
        const eventBlock = document.createElement('div');
        eventBlock.className = 'event-block all-day-event';
        eventBlock.style.backgroundColor = event.color;
        eventBlock.style.height = `${ALL_DAY_EVENT_HEIGHT}px`;
        eventBlock.style.top = `${index * ALL_DAY_EVENT_HEIGHT}px`;
        // Remove inline width and left styles to let CSS handle margins properly
        eventBlock.textContent = event.title || event.category;
        
        // Add tooltip
        addTooltipToEvent(eventBlock, event);
        
        allDaySection.appendChild(eventBlock);
    });
}

// Render timed events in the hour slots
function renderTimedEvents(employerId, timedEvents) {
    const employerColumn = document.querySelector(`.employer-column[data-employer-id="${employerId}"]`);
    
    if (!employerColumn || timedEvents.length === 0) {
        return;
    }
    
    // Detect overlapping events and group them
    const eventGroups = detectOverlappingEvents(timedEvents);
    
    // Render each group
    eventGroups.forEach(group => {
        renderEventGroup(employerColumn, group);
    });
}

// Detect overlapping events and return groups
function detectOverlappingEvents(events) {
    // Sort events by start time
    const sortedEvents = [...events].sort((a, b) => {
        return timeToMinutes(a.start_time) - timeToMinutes(b.start_time);
    });
    
    const groups = [];
    
    sortedEvents.forEach(event => {
        // Find a group where this event overlaps
        let addedToGroup = false;
        
        for (let group of groups) {
            // Check if event overlaps with any event in the group
            const overlaps = group.some(groupEvent => {
                return eventsOverlap(event, groupEvent);
            });
            
            if (overlaps) {
                group.push(event);
                addedToGroup = true;
                break;
            }
        }
        
        // If no overlap found, create a new group
        if (!addedToGroup) {
            groups.push([event]);
        }
    });
    
    return groups;
}

// Check if two events overlap
function eventsOverlap(event1, event2) {
    const start1 = timeToMinutes(event1.start_time);
    const end1 = timeToMinutes(event1.end_time);
    const start2 = timeToMinutes(event2.start_time);
    const end2 = timeToMinutes(event2.end_time);
    
    return start1 < end2 && start2 < end1;
}

// Convert time string (HH:MM) to minutes since midnight
function timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

// Render a group of overlapping events side by side
function renderEventGroup(employerColumn, eventGroup) {
    const groupSize = eventGroup.length;
    const eventWidth = (100 - (EVENT_PADDING * 2)) / groupSize;
    
    eventGroup.forEach((event, index) => {
        renderTimedEvent(employerColumn, event, index, groupSize, eventWidth);
    });
}

// Render a single timed event
function renderTimedEvent(employerColumn, event, positionIndex, totalInGroup, eventWidth) {
    // Parse start and end times
    const [startHour, startMinute] = event.start_time.split(':').map(Number);
    const [endHour, endMinute] = event.end_time.split(':').map(Number);
    
    // Check if event is within visible calendar hours
    if (endHour < START_HOUR || startHour >= END_HOUR) {
        return; // Event outside visible hours
    }
    
    // Clamp times to visible range
    const clampedStartHour = Math.max(startHour, START_HOUR);
    const clampedStartMinute = startHour < START_HOUR ? 0 : startMinute;
    const clampedEndHour = Math.min(endHour, END_HOUR);
    const clampedEndMinute = endHour >= END_HOUR ? 0 : endMinute;
    
    // Calculate position and height
    const startFraction = (clampedStartHour - START_HOUR) + (clampedStartMinute / 60);
    const endFraction = (clampedEndHour - START_HOUR) + (clampedEndMinute / 60);
    
    const headerHeight = getHeaderHeight();
    const topPosition = headerHeight + (startFraction * HOUR_HEIGHT);
    const eventHeight = (endFraction - startFraction) * HOUR_HEIGHT;
    
    // Calculate left position based on position in group
    const leftPosition = EVENT_PADDING + (eventWidth * positionIndex);
    
    // Create event block element
    const eventBlock = document.createElement('div');
    eventBlock.className = 'event-block timed-event';
    eventBlock.style.backgroundColor = event.color;
    eventBlock.style.top = `${topPosition}px`;
    eventBlock.style.height = `${eventHeight}px`;
    eventBlock.style.left = `${leftPosition}%`;
    eventBlock.style.width = `${eventWidth}%`;
    
    // Add event content
    const timeStr = `${event.start_time}-${event.end_time}`;
    eventBlock.innerHTML = `
        <div class="event-title">${event.title || event.category}</div>
        <div class="event-time">${timeStr}</div>
    `;
    
    // Add tooltip
    addTooltipToEvent(eventBlock, event);
    
    employerColumn.appendChild(eventBlock);
}

// Add tooltip to event block
function addTooltipToEvent(eventBlock, event) {
    let tooltip = null;
    
    eventBlock.addEventListener('mouseenter', () => {
        const timeInfo = event.is_all_day 
            ? 'Ganztägig' 
            : `${event.start_time} - ${event.end_time}`;
        
        const tooltipText = `${event.title || event.category}\n${timeInfo}\nKategorie: ${event.category}`;
        
        // Create tooltip
        tooltip = document.createElement('div');
        tooltip.className = 'event-tooltip';
        tooltip.style.whiteSpace = 'pre-line';
        tooltip.textContent = tooltipText;
        document.body.appendChild(tooltip);
        
        // Position tooltip near the cursor
        const rect = eventBlock.getBoundingClientRect();
        tooltip.style.left = `${rect.left + rect.width / 2}px`;
        tooltip.style.top = `${rect.top - 10}px`;
        tooltip.style.transform = 'translate(-50%, -100%)';
        
        // Show tooltip after a brief delay
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

