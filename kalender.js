// Configuration - Adjust these values to customize the calendar
const START_HOUR = 6;
const END_HOUR = 18;
const HOUR_HEIGHT = 60; // Height of each hour slot in pixels
const ALL_DAY_EVENT_HEIGHT = 25; // Height of each individual all-day event in pixels
const ALL_DAY_BASE_HEIGHT = 35; // Base height of the all-day section (for label and padding) in pixels
const ALL_DAY_EXTRA_SPACING = 15; // Extra spacing after all-day section when 3 or more events in pixels
const COLUMN_GAP = 0; // Gap between columns in pixels
const EMPLOYER_HEADER_HEIGHT = 60; // Height of employer name header in pixels
const SESSION_PADDING = 5; // Padding/margin from column edges for session blocks in pixels

// State
let employers = [];
let sessions = [];
let allDayHeights = {}; // Store calculated all-day section heights per employer

// Initialize calendar on page load
document.addEventListener('DOMContentLoaded', async () => {
    await loadEmployers();
    await loadSessions();
    calculateAllDayHeights();
    renderCalendar();
    renderSessions();
    initializeTimeline();
});

// Check if a session is an all-day event
function isAllDayEvent(session) {
    // A session is considered all-day if it spans the entire visible day
    // (starts at or before START_HOUR and ends at or after END_HOUR)
    
    // Sessions with missing time data are not considered all-day events
    if (!session.login_time || !session.logout_time) {
        return false;
    }
    
    const [loginHour, loginMinute] = session.login_time.split(':').map(Number);
    const [logoutHour, logoutMinute] = session.logout_time.split(':').map(Number);
    
    // Check if it spans the entire visible day or beyond
    return loginHour <= START_HOUR && logoutHour >= END_HOUR;
}

// Calculate all-day section heights for each employer
function calculateAllDayHeights() {
    allDayHeights = {};
    
    employers.forEach(employer => {
        // Count all-day events for this employer
        const allDayEvents = sessions.filter(session => 
            session.employer_id === employer.id && isAllDayEvent(session)
        );
        
        const eventCount = allDayEvents.length;
        let height = ALL_DAY_BASE_HEIGHT;
        
        if (eventCount > 0) {
            // Add height for each event
            height += eventCount * ALL_DAY_EVENT_HEIGHT;
            
            // Add extra spacing if 3 or more events
            if (eventCount >= 3) {
                height += ALL_DAY_EXTRA_SPACING;
            }
        }
        
        allDayHeights[employer.id] = height;
    });
}

// Get the all-day section height for an employer
function getAllDayHeight(employerId) {
    return allDayHeights[employerId] || ALL_DAY_BASE_HEIGHT;
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

// Load sessions from server
async function loadSessions() {
    try {
        const response = await fetch('session_ajax.php');
        
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

// Render the complete calendar
function renderCalendar() {
    const calendarDiv = document.getElementById('calendar');
    calendarDiv.innerHTML = '';
    
    // Create left time column
    const timeColumnLeft = createTimeColumn();
    calendarDiv.appendChild(timeColumnLeft);
    
    // Create employer columns
    employers.forEach((employer, index) => {
        const isLastEmployer = index === employers.length - 1;
        const employerColumn = createEmployerColumn(employer, isLastEmployer);
        calendarDiv.appendChild(employerColumn);
    });
    
    // Create right time column
    const timeColumnRight = createTimeColumn();
    calendarDiv.appendChild(timeColumnRight);
}

// Create time column with hours
function createTimeColumn() {
    const column = document.createElement('div');
    column.className = 'time-column';
    
    // Header (must match employer header + max all-day section height)
    // Use the maximum all-day height across all employers
    const maxAllDayHeight = Math.max(...Object.values(allDayHeights));
    const header = document.createElement('div');
    header.className = 'time-header';
    header.style.height = `${EMPLOYER_HEADER_HEIGHT + maxAllDayHeight}px`;
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
function createEmployerColumn(employer, isLastEmployer = false) {
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
    column.appendChild(header);
    
    // All-day section with dynamic height
    const allDayHeight = getAllDayHeight(employer.id);
    const allDaySection = document.createElement('div');
    allDaySection.className = 'all-day-section';
    allDaySection.style.height = `${allDayHeight}px`;
    allDaySection.dataset.employerId = employer.id;
    
    // Add label
    const label = document.createElement('div');
    label.className = 'all-day-label';
    label.textContent = 'Ganztägig';
    allDaySection.appendChild(label);
    
    // Add container for all-day events
    const eventsContainer = document.createElement('div');
    eventsContainer.className = 'all-day-events-container';
    allDaySection.appendChild(eventsContainer);
    
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
    
    // Calculate top position (header height + max all-day height + hour position)
    const maxAllDayHeight = Math.max(...Object.values(allDayHeights));
    const headerHeight = EMPLOYER_HEADER_HEIGHT + maxAllDayHeight;
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
        if (isAllDayEvent(session)) {
            renderAllDayEvent(session);
        } else {
            renderSessionBlock(session);
        }
    });
}

// Render an all-day event in the all-day section
function renderAllDayEvent(session) {
    const employerColumn = document.querySelector(`.employer-column[data-employer-id="${session.employer_id}"]`);
    
    if (!employerColumn) {
        console.warn(`Employer column not found for employer_id: ${session.employer_id}`);
        return;
    }
    
    const allDaySection = employerColumn.querySelector('.all-day-section');
    const eventsContainer = allDaySection.querySelector('.all-day-events-container');
    
    if (!eventsContainer) {
        console.warn(`All-day events container not found for employer_id: ${session.employer_id}`);
        return;
    }
    
    // Create all-day event block
    const eventBlock = document.createElement('div');
    eventBlock.className = 'all-day-event-block';
    eventBlock.style.height = `${ALL_DAY_EVENT_HEIGHT}px`;
    
    // Add event title or time info
    const eventTitle = document.createElement('div');
    eventTitle.className = 'all-day-event-title';
    eventTitle.textContent = 'Ganztägig';
    eventBlock.appendChild(eventTitle);
    
    // Add tooltip functionality
    addTooltipToAllDayEvent(eventBlock, session);
    
    eventsContainer.appendChild(eventBlock);
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
    
    // Use dynamic header height based on this employer's all-day section
    const allDayHeight = getAllDayHeight(session.employer_id);
    const headerHeight = EMPLOYER_HEADER_HEIGHT + allDayHeight;
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
        
        // Get the employer ID from the parent column
        const employerColumn = sessionBlock.closest('.employer-column');
        const employerId = employerColumn ? parseInt(employerColumn.dataset.employerId) : null;
        
        if (!employerId) return;
        
        // Recalculate position and height with current time
        const clampedLoginHour = Math.max(loginHour, START_HOUR);
        const clampedLoginMinute = loginHour < START_HOUR ? 0 : loginMinute;
        const clampedLogoutHour = Math.min(currentHour, END_HOUR);
        const clampedLogoutMinute = currentHour >= END_HOUR ? 0 : currentMinute;
        
        const loginFraction = (clampedLoginHour - START_HOUR) + (clampedLoginMinute / 60);
        const logoutFraction = (clampedLogoutHour - START_HOUR) + (clampedLogoutMinute / 60);
        
        // Use dynamic header height based on this employer's all-day section
        const allDayHeight = getAllDayHeight(employerId);
        const headerHeight = EMPLOYER_HEADER_HEIGHT + allDayHeight;
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

// Add tooltip to all-day event block
function addTooltipToAllDayEvent(eventBlock, session) {
    let tooltip = null;
    
    eventBlock.addEventListener('mouseenter', () => {
        const tooltipText = 'Ganztägiger Termin';
        
        // Create tooltip
        tooltip = document.createElement('div');
        tooltip.className = 'session-tooltip';
        tooltip.textContent = tooltipText;
        document.body.appendChild(tooltip);
        
        // Position tooltip near the cursor
        const rect = eventBlock.getBoundingClientRect();
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
    
    eventBlock.addEventListener('mouseleave', () => {
        if (tooltip) {
            tooltip.remove();
            tooltip = null;
        }
    });
}

