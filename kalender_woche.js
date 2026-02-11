// Configuration - Adjust these values to customize the calendar
const START_HOUR = 6;
const END_HOUR = 18;
const HOUR_HEIGHT = 60; // Height of each hour slot in pixels
const ALL_DAY_HEIGHT = 60; // Minimum height of the all-day appointments section in pixels
const ALL_DAY_EVENT_HEIGHT = 30; // Height of each individual all-day event in pixels
const ALL_DAY_BOTTOM_SPACING = 10; // Adjustable spacing after the last all-day entry in pixels
const COLUMN_GAP = 0; // Gap between columns in pixels
const DAY_HEADER_HEIGHT = 40; // Height of day name header in pixels
const EVENT_PADDING = 2; // Padding/margin from column edges for event blocks in pixels

// State
let events = [];
let currentAllDayHeights = null; // Cache for all-day heights
let currentDate = new Date(); // Current selected date (we'll calculate Monday of this week)

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
        const dayAllDayEvents = events.filter(
            e => e.date === dateStr && e.is_all_day
        );
        const count = dayAllDayEvents.length;
        allDayHeights[index] = count;
        maxAllDayEvents = Math.max(maxAllDayEvents, count);
    });
    
    // Calculate the total height needed (at least ALL_DAY_HEIGHT for the section)
    // Add ALL_DAY_BOTTOM_SPACING to ensure proper spacing after last all-day event
    const calculatedHeight = (maxAllDayEvents * ALL_DAY_EVENT_HEIGHT) + ALL_DAY_BOTTOM_SPACING;
    const maxHeight = Math.max(ALL_DAY_HEIGHT, calculatedHeight);
    
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
        header.style.backgroundColor = '#2ecc71';
        header.style.color = '#ffffff';
    } else {
        header.style.backgroundColor = '#4a90e2';
        header.style.color = '#ffffff';
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
        const dayEvents = events.filter(e => e.date === dateStr);
        
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
    
    dayColumn.appendChild(eventBlock);
}

// Add tooltip to event block with employee info
function addTooltipToEvent(eventBlock, event) {
    let tooltip = null;
    
    eventBlock.addEventListener('mouseenter', () => {
        const timeInfo = event.is_all_day 
            ? 'Ganztägig' 
            : `${event.start_time} - ${event.end_time}`;
        
        // Include employee name in tooltip
        const employeeInfo = event.employer_name ? `\nMitarbeiter: ${event.employer_name}` : '';
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
