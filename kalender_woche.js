// Configuration - Adjust these values to customize the calendar
const START_HOUR = 6;
const END_HOUR = 18;

// User configuration - set CURRENT_USER_ID to the ID of the logged-in user (null = not logged in)
// Set IS_SUPERUSER to true to allow editing all events regardless of ownership
const CURRENT_USER_ID = null;
const IS_SUPERUSER = false;
const HOUR_HEIGHT = 60; // Height of each hour slot in pixels
const ALL_DAY_HEIGHT = 60; // Minimum height of the all-day appointments section in pixels
const ALL_DAY_EVENT_HEIGHT = 30; // Height of each individual all-day event in pixels
const ALL_DAY_BOTTOM_SPACING = 10; // Adjustable spacing after the last all-day entry in pixels
const MIN_EVENTS_FOR_DYNAMIC_HEIGHT = 3; // Minimum number of all-day events to use dynamic height without minimum constraint
const COLUMN_GAP = 0; // Gap between columns in pixels
const DAY_HEADER_HEIGHT = 40; // Height of day name header in pixels
const EVENT_PADDING = 2; // Padding/margin from column edges for event blocks in pixels

// Day header colors – one entry per weekday (index 0 = Monday … 6 = Sunday)
const DAY_COLORS = [
    '#4a90e2', // Montag
    '#4a90e2', // Dienstag
    '#4a90e2', // Mittwoch
    '#4a90e2', // Donnerstag
    '#4a90e2', // Freitag
    '#4a90e2', // Samstag
    '#4a90e2', // Sonntag
];
// Color for the header of today's column
const TODAY_COLOR = '#2ecc71';

// State
let employers = [];
let events = [];
let currentAllDayHeights = null; // Cache for all-day heights
let currentDate = new Date(); // Current selected date (we'll calculate Monday of this week)

const CATEGORY_LABELS_BY_ID = {
    1: 'Intern',
    2: 'Extern',
    3: 'Krank',
    4: 'Urlaub'
};

function normalizeKatid(value) {
    const katid = Number.parseInt(value, 10);
    return Number.isInteger(katid) && katid >= 1 && katid <= 4 ? katid : 1;
}

function getCategoryLabel(katid) {
    return CATEGORY_LABELS_BY_ID[normalizeKatid(katid)];
}

// Days of week in German
const DAYS_OF_WEEK = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
const DAYS_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

// Helper function to validate hex color format
function isValidHexColor(color) {
    return /^#[0-9A-Fa-f]{6}$/.test(color);
}

// Helper function to calculate luminance of a color
function getLuminance(hexColor) {
    // Convert hex to RGB
    const r = parseInt(hexColor.substring(1, 3), 16) / 255;
    const g = parseInt(hexColor.substring(3, 5), 16) / 255;
    const b = parseInt(hexColor.substring(5, 7), 16) / 255;
    
    // Apply gamma correction
    const rsRGB = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
    const gsRGB = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
    const bsRGB = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
    
    // Calculate luminance
    return 0.2126 * rsRGB + 0.7152 * gsRGB + 0.0722 * bsRGB;
}

// Helper function to get contrasting text color (white or black)
function getContrastingTextColor(hexColor) {
    const luminance = getLuminance(hexColor);
    // Use white text for dark backgrounds, black text for light backgrounds
    return luminance > 0.5 ? '#000000' : '#ffffff';
}

// Get Monday of the week for a given date
function getMondayOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
}

// Get array of dates for the week (Monday to Sunday)
function getWeekDates(mondayDate) {
    const dates = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(mondayDate);
        date.setDate(mondayDate.getDate() + i);
        dates.push(date);
    }
    return dates;
}

// Initialize calendar on page load
document.addEventListener('DOMContentLoaded', async () => {
    setupNavigationHandlers();
    updateWeekDisplay();
    await loadEmployers();
    await loadEvents();
    renderCalendar();
    renderEvents();
    initializeTimeline();
});

// Setup navigation button handlers
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

// Change current date by days offset
async function changeWeek(daysOffset) {
    currentDate = new Date(currentDate.getTime());
    currentDate.setDate(currentDate.getDate() + daysOffset);
    updateWeekDisplay();
    await reloadCalendar();
}

// Set current date to this week
async function setThisWeek() {
    currentDate = new Date();
    updateWeekDisplay();
    await reloadCalendar();
}

// Update the week display
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

// Reload calendar with current week
async function reloadCalendar() {
    await loadEvents();
    renderCalendar();
    renderEvents();
    createTimelineElement(); // Recreate timeline element after calendar is re-rendered
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

// Load events from server
async function loadEvents() {
    const calendarDiv = document.getElementById('calendar');
    
    try {
        const monday = getMondayOfWeek(currentDate);
        const startDateParam = formatDateForAPI(monday);
        const response = await fetch(`event_week_ajax.php?start_date=${startDateParam}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        events = Array.isArray(data)
            ? data.map(event => {
                const katid = normalizeKatid(event.katid);
                return {
                    ...event,
                    katid,
                    category: event.category || getCategoryLabel(katid)
                };
            })
            : [];
        
    } catch (error) {
        console.error('Fehler beim Laden der Events:', error);
        events = [];
    }
}

// Render the complete calendar
function renderCalendar() {
    const calendarDiv = document.getElementById('calendar');
    calendarDiv.innerHTML = '';
    
    // Get week dates
    const monday = getMondayOfWeek(currentDate);
    const weekDates = getWeekDates(monday);
    
    // Calculate all-day section heights for each day
    const allDayHeights = calculateAllDayHeights(weekDates);
    currentAllDayHeights = allDayHeights; // Cache for later use
    
    // Create left time column
    const timeColumnLeft = createTimeColumn(allDayHeights);
    calendarDiv.appendChild(timeColumnLeft);
    
    // Create day columns
    weekDates.forEach((date, index) => {
        const isLastDay = index === weekDates.length - 1;
        const dayColumn = createDayColumn(date, index, isLastDay, allDayHeights);
        calendarDiv.appendChild(dayColumn);
    });
    
    // Create right time column
    const timeColumnRight = createTimeColumn(allDayHeights);
    calendarDiv.appendChild(timeColumnRight);
}

// Helper function to get the current header height (day header + all-day section)
function getHeaderHeight() {
    if (currentAllDayHeights) {
        return DAY_HEADER_HEIGHT + currentAllDayHeights.maxHeight;
    }
    return DAY_HEADER_HEIGHT + ALL_DAY_HEIGHT;
}

// Calculate the height needed for all-day section for each day
function calculateAllDayHeights(weekDates) {
    const allDayHeights = {};
    let maxAllDayEvents = 0; // Start with 0
    
    // Group events by day
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
    
    // Calculate the total height needed
    // Account for each event height plus bottom spacing
    const calculatedHeight = (maxAllDayEvents * ALL_DAY_EVENT_HEIGHT) + ALL_DAY_BOTTOM_SPACING;
    
    // When there are MIN_EVENTS_FOR_DYNAMIC_HEIGHT or more events, don't constrain by ALL_DAY_HEIGHT minimum
    // to ensure nothing is cut off and there's proper spacing
    const maxHeight = maxAllDayEvents >= MIN_EVENTS_FOR_DYNAMIC_HEIGHT ? calculatedHeight : Math.max(ALL_DAY_HEIGHT, calculatedHeight);
    
    return { perDay: allDayHeights, maxHeight: maxHeight };
}

// Create time column with hours
function createTimeColumn(allDayHeights) {
    const column = document.createElement('div');
    column.className = 'time-column';
    
    // Header (must match day header + all-day section height)
    const header = document.createElement('div');
    header.className = 'time-header';
    header.style.height = `${DAY_HEADER_HEIGHT + allDayHeights.maxHeight}px`;
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

// Create day column with all-day section and hours
function createDayColumn(date, dayIndex, isLastDay = false, allDayHeights) {
    const column = document.createElement('div');
    column.className = 'employer-column'; // Reuse employer-column CSS class
    column.dataset.dayIndex = dayIndex;
    column.dataset.date = formatDateForAPI(date);
    
    // Apply column gap via margin, but not for the last day
    if (COLUMN_GAP > 0 && !isLastDay) {
        column.style.marginRight = `${COLUMN_GAP}px`;
    }
    
    // Day name header
    const header = document.createElement('div');
    header.className = 'employer-header'; // Reuse employer-header CSS class
    header.style.height = `${DAY_HEADER_HEIGHT}px`;
    
    // Get day of week
    const dayOfWeek = DAYS_OF_WEEK[dayIndex];
    const dayOfMonth = date.getDate();
    const month = date.getMonth() + 1;
    
    // Check if this is today
    const today = new Date();
    const isToday = date.getDate() === today.getDate() && 
                    date.getMonth() === today.getMonth() && 
                    date.getFullYear() === today.getFullYear();
    
    header.textContent = `${dayOfWeek}, ${dayOfMonth}.${month}.`;
    
    // Highlight today with a different color
    if (isToday) {
        header.style.backgroundColor = TODAY_COLOR;
        header.style.color = getContrastingTextColor(TODAY_COLOR);
    } else {
        const dayColor = DAY_COLORS[dayIndex] || '#4a90e2';
        header.style.backgroundColor = dayColor;
        header.style.color = getContrastingTextColor(dayColor);
    }
    
    column.appendChild(header);
    
    // All-day section (use max height across all days)
    const allDaySection = document.createElement('div');
    allDaySection.className = 'all-day-section';
    allDaySection.style.height = `${allDayHeights.maxHeight}px`;
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
    setInterval(() => {
        updateTimeline();
    }, 30000);
}

function createTimelineElement() {
    const calendarGrid = document.getElementById('calendar');
    
    // Remove existing timeline if present
    const existingTimeline = document.getElementById('timeline');
    if (existingTimeline) {
        existingTimeline.remove();
    }
    
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
    if (currentHour < START_HOUR || currentHour > END_HOUR) {
        // Hide timeline if outside calendar hours
        const timeline = document.getElementById('timeline');
        if (timeline) {
            timeline.style.display = 'none';
        }
        return;
    }
    
    // Check if today is within the current week
    const monday = getMondayOfWeek(currentDate);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    
    if (todayStart < monday || todayStart > sunday) {
        // Today is not in the current week, hide timeline
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

// Render event blocks for all days
function renderEvents() {
    // Group events by day and type (all-day vs timed)
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

// Render all-day events in the all-day section
function renderAllDayEvents(dayIndex, allDayEvents) {
    const dayColumn = document.querySelector(`.employer-column[data-day-index="${dayIndex}"]`);
    
    if (!dayColumn || allDayEvents.length === 0) {
        return;
    }
    
    const allDaySection = dayColumn.querySelector('.all-day-section');
    
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
        eventBlock.textContent = event.title || event.category;
        
        // Add tooltip with employee info
        addTooltipToEvent(eventBlock, event);
        
        // Add edit click handler if user can edit this event
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

// Render timed events in the hour slots
function renderTimedEvents(dayIndex, timedEvents) {
    const dayColumn = document.querySelector(`.employer-column[data-day-index="${dayIndex}"]`);
    
    if (!dayColumn || timedEvents.length === 0) {
        return;
    }
    
    // Detect overlapping events and group them
    const eventGroups = detectOverlappingEvents(timedEvents);
    
    // Render each group
    eventGroups.forEach(group => {
        renderEventGroup(dayColumn, group);
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
function renderEventGroup(dayColumn, eventGroup) {
    const groupSize = eventGroup.length;
    const eventWidth = (100 - (EVENT_PADDING * 2)) / groupSize;
    
    eventGroup.forEach((event, index) => {
        renderTimedEvent(dayColumn, event, index, groupSize, eventWidth);
    });
}

// Render a single timed event
function renderTimedEvent(dayColumn, event, positionIndex, totalInGroup, eventWidth) {
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
    
    // Add tooltip with employee info
    addTooltipToEvent(eventBlock, event);
    
    // Add edit click handler if user can edit this event
    if (canEditEvent(event)) {
        eventBlock.classList.add('editable-event');
        eventBlock.addEventListener('click', (e) => {
            e.stopPropagation();
            openEditModal(event);
        });
    }
    
    dayColumn.appendChild(eventBlock);
}

// Add tooltip to event block with employee info
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
        
        // Include employee name(s) in tooltip (look up from loaded employers list)
        let employerNames;
        if (Array.isArray(event.employer_ids) && event.employer_ids.length > 0) {
            employerNames = event.employer_ids.map(id => {
                const emp = employers.find(e => String(e.id) === String(id));
                return emp ? emp.name : '';
            }).filter(Boolean).join(', ');
        } else {
            const employer = employers.find(e => String(e.id) === String(event.employer_id));
            employerNames = employer ? employer.name : (event.employer_name || '');
        }
        const employeeInfo = employerNames ? `\nMitarbeiter: ${employerNames}` : '';
        const tooltipText = `${event.title || event.category}\n${timeInfo}\nKategorie: ${event.category}${employeeInfo}`;
        
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

// Check if the current user can edit a given event
function canEditEvent(event) {
    if (IS_SUPERUSER) return true;
    if (CURRENT_USER_ID === null || CURRENT_USER_ID === undefined) return false;
    return String(event.user_id) === String(CURRENT_USER_ID);
}

// Open the event edit modal for a given event
function openEditModal(event) {
    const modal = document.getElementById('eventEditModal');
    if (!modal) return;

    // Populate fields
    document.getElementById('editEventId').value = event.id;
    document.getElementById('editEventDate').value = event.date || '';
    document.getElementById('editEventDateTo').value = event.date_to || event.date || '';
    document.getElementById('editEventTitle').value = event.title || '';
    const editKatid = normalizeKatid(event.katid);
    document.getElementById('editEventCategory').value = String(editKatid);
    document.getElementById('editEventColor').value = event.color || '#4a90e2';
    document.getElementById('editEventIsAllDay').checked = !!event.is_all_day;
    document.getElementById('editEventStartTime').value = event.start_time || '';
    document.getElementById('editEventEndTime').value = event.end_time || '';
    toggleTimeFields(!event.is_all_day);

    modal.style.display = 'flex';
}

// Close the event edit modal
function closeEditModal() {
    const modal = document.getElementById('eventEditModal');
    if (modal) modal.style.display = 'none';
}

// Toggle time input fields based on all-day checkbox
function toggleTimeFields(show) {
    const timeFields = document.getElementById('editEventTimeFields');
    if (timeFields) timeFields.style.display = show ? 'grid' : 'none';
    const dateToField = document.getElementById('editEventDateToField');
    if (dateToField) dateToField.style.display = show ? 'none' : 'block';
}

// Delete the event currently shown in the modal
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

    // Remove the event from the local events array
    const eventIndex = events.findIndex(e => String(e.id) === String(id));
    if (eventIndex !== -1) {
        events.splice(eventIndex, 1);
    }

    closeEditModal();

    // Re-render events
    document.querySelectorAll('.event-block').forEach(el => el.remove());
    renderEvents();
}

// Save changes from the edit modal via AJAX and re-render
async function saveEventFromModal() {
    const id = document.getElementById('editEventId').value;
    const date = document.getElementById('editEventDate').value;
    const title = document.getElementById('editEventTitle').value.trim();
    const katid = normalizeKatid(document.getElementById('editEventCategory').value);
    const category = getCategoryLabel(katid);
    const color = document.getElementById('editEventColor').value;
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
        formData.append('katid', String(katid));
        formData.append('category', category);
        formData.append('color', color);
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

    // Update the event in the local events array
    const monday = getMondayOfWeek(currentDate);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const sundayStr = formatDateForAPI(sunday);
    const mondayStr = formatDateForAPI(monday);

    const eventIndex = events.findIndex(e => String(e.id) === String(id));
    if (eventIndex !== -1) {
        const effectiveDateTo = dateTo || date;
        // Event is still in the current week if its date range overlaps the week
        const stillInWeek = date <= sundayStr && effectiveDateTo >= mondayStr;
        if (!stillInWeek) {
            // Event moved outside current week – remove from view
            events.splice(eventIndex, 1);
        } else {
            events[eventIndex] = {
                ...events[eventIndex],
                date,
                date_to: dateTo,
                title,
                katid,
                category,
                color,
                is_all_day: isAllDay,
                start_time: isAllDay ? '' : startTime,
                end_time: isAllDay ? '' : endTime
            };
        }
    }

    closeEditModal();

    // Re-render events
    document.querySelectorAll('.event-block').forEach(el => el.remove());
    renderEvents();
}

// Open the new event modal
function openNewEventModal() {
    const modal = document.getElementById('newEventModal');
    if (!modal) return;

    // Populate employer dropdown
    const employerSelect = document.getElementById('newEventEmployer');
    employerSelect.innerHTML = '';
    employers.forEach(emp => {
        const option = document.createElement('option');
        option.value = emp.id;
        option.textContent = emp.name;
        employerSelect.appendChild(option);
    });

    // Pre-fill date with the current week's Monday
    const monday = getMondayOfWeek(currentDate);
    document.getElementById('newEventDate').value = formatDateForAPI(monday);
    document.getElementById('newEventDateTo').value = formatDateForAPI(monday);
    document.getElementById('newEventTitle').value = '';
    document.getElementById('newEventCategory').value = '1';
    document.getElementById('newEventColor').value = '#4a90e2';
    document.getElementById('newEventIsAllDay').checked = false;
    document.getElementById('newEventStartTime').value = '';
    document.getElementById('newEventEndTime').value = '';
    toggleNewEventTimeFields(true);

    modal.style.display = 'flex';
}

// Close the new event modal
function closeNewEventModal() {
    const modal = document.getElementById('newEventModal');
    if (modal) modal.style.display = 'none';
}

// Toggle time input fields in the new event modal
function toggleNewEventTimeFields(show) {
    const timeFields = document.getElementById('newEventTimeFields');
    if (timeFields) timeFields.style.display = show ? 'grid' : 'none';
    const dateToField = document.getElementById('newEventDateToField');
    if (dateToField) dateToField.style.display = show ? 'none' : 'block';
}

// Create a new event via event_week_ajax.php
async function createEventFromModal() {
    const employerSelect = document.getElementById('newEventEmployer');
    const employerIds = Array.from(employerSelect.selectedOptions).map(o => o.value);
    const date = document.getElementById('newEventDate').value;
    const title = document.getElementById('newEventTitle').value.trim();
    const katid = normalizeKatid(document.getElementById('newEventCategory').value);
    const category = getCategoryLabel(katid);
    const color = document.getElementById('newEventColor').value;
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
        formData.append('katid', String(katid));
        formData.append('category', category);
        formData.append('color', color);
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

        // Add new event to local array if it overlaps the current week
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

// Wire up modal events after the DOM is ready
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

    // Close modal when clicking the backdrop
    const modal = document.getElementById('eventEditModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeEditModal();
        });
    }

    // New Event modal controls
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
