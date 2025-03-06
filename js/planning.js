document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const sessionsList = document.getElementById('sessions-list');
    const addSessionBtn = document.getElementById('add-session');
    const prizeList = document.getElementById('prize-list');
    const addPrizeBtn = document.getElementById('add-prize');
    const savePlanBtn = document.getElementById('save-plan');
    const loadPlanBtn = document.getElementById('load-plan');
    const clearPlanBtn = document.getElementById('clear-plan');
    const deletePlanBtn = document.getElementById('delete-plan');
    const savedPlansSelect = document.getElementById('saved-plans-select');
    const timelineView = document.getElementById('timeline-view');
    
    // Bulk session creation elements
    const bulkStartTime = document.getElementById('bulk-start-time');
    const bulkEndTime = document.getElementById('bulk-end-time');
    const intervalValue = document.getElementById('interval-value');
    const intervalUnit = document.getElementById('interval-unit');
    const winnersPerSession = document.getElementById('winners-per-session');
    const createSessionsBtn = document.getElementById('create-sessions');
    
    // Session template
    const sessionTemplate = document.getElementById('session-template');
    
    // State
    let sessionCount = 0;
    let prizeCount = 1;
    let currentPlan = {
        name: '',
        date: '',
        activeSession: '',
        masterTimer: 5,
        sessions: [],
        prizes: []
    };
    
    // Set current date
    setCurrentDate();
    
    // Load saved plans list
    loadSavedPlansList();
    
    // Event listeners
    addSessionBtn.addEventListener('click', addSession);
    addPrizeBtn.addEventListener('click', addPrize);
    savePlanBtn.addEventListener('click', savePlan);
    loadPlanBtn.addEventListener('click', loadPlan);
    clearPlanBtn.addEventListener('click', () => clearPlan(true));
    deletePlanBtn.addEventListener('click', deletePlan);
    createSessionsBtn.addEventListener('click', createBulkSessions);
    
    // Set promotion name for display header
    document.getElementById('promotionName').addEventListener('input', function() {
        const name = this.value;
        currentPlan.name = name;
        
        // Update active plan with new name
        const activePlan = JSON.parse(localStorage.getItem('activePlan') || '{}');
        activePlan.name = name;
        localStorage.setItem('activePlan', JSON.stringify(activePlan));
    });
    
    // Set current date in date picker
    function setCurrentDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('promotionDate').value = today;
        currentPlan.date = today;
    }
    
    // Add a new session
    function addSession() {
        sessionCount++;
        const sessionId = 'session-' + Date.now();
        
        const fragment = document.createRange().createContextualFragment(
            sessionTemplate.innerHTML
                .replace(/{{id}}/g, sessionId)
                .replace(/{{number}}/g, sessionCount)
        );
        
        sessionsList.appendChild(fragment);
        
        const sessionItem = sessionsList.querySelector(`[data-id="${sessionId}"]`);
        
        // Set up event listeners for this session
        setupSessionEvents(sessionItem, sessionId);
        
        // Set default times based on session number
        setupDefaultTimes(sessionItem, sessionCount);
        
        // Update timeline
        updateTimeline();
        
        return sessionId;
    }
    
    // Create bulk sessions
    function createBulkSessions() {
        const startTime = bulkStartTime.value;
        const endTime = bulkEndTime.value;
        const interval = parseInt(intervalValue.value) || 60;
        const unit = intervalUnit.value;
        const winners = parseInt(winnersPerSession.value) || 1;
        
        if (!startTime || !endTime) {
            alert('Please set both start and end times');
            return;
        }
        
        // Convert times to minutes since midnight
        const startMinutes = timeToMinutes(startTime);
        const endMinutes = timeToMinutes(endTime);
        
        if (startMinutes >= endMinutes) {
            alert('End time must be after start time');
            return;
        }
        
        // Calculate interval in minutes
        const intervalMinutes = unit === 'hours' ? interval * 60 : interval;
        
        // Clear existing sessions if user confirms
        if (sessionsList.childElementCount > 0) {
            if (confirm('This will replace all existing sessions. Continue?')) {
                sessionsList.innerHTML = '';
                sessionCount = 0;
            } else {
                return;
            }
        }
        
        // Create sessions at regular intervals
        let currentTime = startMinutes;
        let sessionIds = [];
        
        while (currentTime < endMinutes) {
            const sessionStart = minutesToTime(currentTime);
            const sessionEnd = minutesToTime(Math.min(currentTime + intervalMinutes, endMinutes));
            
            // Create a new session
            const sessionId = addSession();
            sessionIds.push(sessionId);
            
            // Set the times and winners
            const sessionItem = sessionsList.querySelector(`[data-id="${sessionId}"]`);
            sessionItem.querySelector('.session-start-time').value = sessionStart;
            sessionItem.querySelector('.session-end-time').value = sessionEnd;
            sessionItem.querySelector('.session-winners').value = winners;
            
            // Move to next interval
            currentTime += intervalMinutes;
        }
        
        // Update timeline
        updateTimeline();
        
        return sessionIds;
    }
    
    // Convert time string (HH:MM) to minutes since midnight
    function timeToMinutes(timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return (hours * 60) + minutes;
    }
    
    // Convert minutes since midnight to time string (HH:MM)
    function minutesToTime(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }
    
    // Set up event listeners for a session
    function setupSessionEvents(sessionItem, sessionId) {
        // Remove session button
        sessionItem.querySelector('.remove-session').addEventListener('click', function() {
            sessionItem.remove();
            updateTimeline();
        });
        
        // Time and winners inputs
        const timeInputs = sessionItem.querySelectorAll('input[type="time"], .session-winners');
        timeInputs.forEach(input => {
            input.addEventListener('change', updateTimeline);
        });
        
        // Assign prize button
        sessionItem.querySelector('.assign-prize').addEventListener('click', function() {
            assignPrizeToSession(sessionId);
        });
    }
    
    // Set default times based on session number
    function setupDefaultTimes(sessionItem, sessionNumber) {
        // Base times on session number - default 1 hour apart
        const baseHour = 10 + Math.floor((sessionNumber - 1) / 2);
        const startTime = `${baseHour.toString().padStart(2, '0')}:00`;
        const endTime = `${(baseHour + 1).toString().padStart(2, '0')}:00`;
        
        sessionItem.querySelector('.session-start-time').value = startTime;
        sessionItem.querySelector('.session-end-time').value = endTime;
    }
    
    // Add a new prize
    function addPrize() {
        prizeCount++;
        
        const prizeItem = document.createElement('div');
        prizeItem.className = 'prize-item';
        prizeItem.innerHTML = `
            <input type="text" placeholder="Prize name" class="prize-name">
            <input type="text" placeholder="Value" class="prize-value">
            <button type="button" class="remove-prize">×</button>
            <button type="button" class="repeat-prize-button">Apply to all sessions</button>
        `;
        
        prizeList.appendChild(prizeItem);
        
        // Setup remove button
        prizeItem.querySelector('.remove-prize').addEventListener('click', function() {
            prizeItem.remove();
        });
        
        // Setup repeat prize button
        prizeItem.querySelector('.repeat-prize-button').addEventListener('click', function() {
            const prizeName = prizeItem.querySelector('.prize-name').value;
            const prizeValue = prizeItem.querySelector('.prize-value').value;
            
            if (!prizeName) {
                alert('Please enter a prize name first');
                return;
            }
            
            // Apply this prize to all sessions
            const sessions = document.querySelectorAll('.session-item');
            if (confirm(`Apply "${prizeName}" to all ${sessions.length} sessions?`)) {
                sessions.forEach(session => {
                    const sessionId = session.getAttribute('data-id');
                    const prizesList = session.querySelector('.session-prizes-list');
                    
                    // Create prize selection item
                    const prizeSelectionItem = document.createElement('div');
                    prizeSelectionItem.className = 'prize-selection';
                    prizeSelectionItem.innerHTML = `
                        <span>${prizeName} ${prizeValue ? `($${prizeValue})` : ''}</span>
                        <button type="button" class="remove-prize">×</button>
                    `;
                    
                    // Add remove button event
                    prizeSelectionItem.querySelector('.remove-prize').addEventListener('click', function() {
                        prizeSelectionItem.remove();
                    });
                    
                    prizesList.appendChild(prizeSelectionItem);
                });
                
                alert(`Prize "${prizeName}" has been applied to all sessions`);
            }
        });
    }
    
    // Assign prize to a session
    function assignPrizeToSession(sessionId) {
        const sessionItem = document.querySelector(`.session-item[data-id="${sessionId}"]`);
        if (!sessionItem) return;
        
        const prizeItems = document.querySelectorAll('#prize-list .prize-item');
        if (prizeItems.length === 0) {
            alert('Please add prizes first');
            return;
        }
        
        // Build prizes list
        let prizesOptions = [];
        prizeItems.forEach(item => {
            const name = item.querySelector('.prize-name').value;
            const value = item.querySelector('.prize-value').value;
            
            if (name) {
                prizesOptions.push({ name, value });
            }
        });
        
        if (prizesOptions.length === 0) {
            alert('Please add at least one prize with a name');
            return;
        }
        
        // Ask user to select a prize
        const prizeIndex = prompt(
            `Select a prize to assign (1-${prizesOptions.length}):\n` +
            prizesOptions.map((prize, i) => 
                `${i + 1}. ${prize.name} ${prize.value ? `($${prize.value})` : ''}`
            ).join('\n')
        );
        
        if (!prizeIndex) return;
        
        const selectedIndex = parseInt(prizeIndex) - 1;
        if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= prizesOptions.length) {
            alert('Invalid selection');
            return;
        }
        
        const selectedPrize = prizesOptions[selectedIndex];
        
        // Add prize to session
        const sessionPrizesList = sessionItem.querySelector('.session-prizes-list');
        const prizeSelectionItem = document.createElement('div');
        prizeSelectionItem.className = 'prize-selection';
        prizeSelectionItem.innerHTML = `
            <span>${selectedPrize.name} ${selectedPrize.value ? `($${selectedPrize.value})` : ''}</span>
            <button type="button" class="remove-prize">×</button>
        `;
        
        // Add remove button event
        prizeSelectionItem.querySelector('.remove-prize').addEventListener('click', function() {
            prizeSelectionItem.remove();
        });
        
        sessionPrizesList.appendChild(prizeSelectionItem);
    }
    
    // Update timeline visualization
    function updateTimeline() {
        const sessionItems = document.querySelectorAll('.session-item');
        
        // Clear timeline
        timelineView.innerHTML = '';
        
        if (sessionItems.length === 0) {
            timelineView.innerHTML = '<div class="timeline-placeholder">Sessions will be visualized here</div>';
            return;
        }
        
        // Find earliest and latest times
        let earliestMinutes = 24 * 60;
        let latestMinutes = 0;
        
        sessionItems.forEach(session => {
            const startTime = session.querySelector('.session-start-time').value;
            const endTime = session.querySelector('.session-end-time').value;
            
            if (startTime) {
                const minutes = timeToMinutes(startTime);
                earliestMinutes = Math.min(earliestMinutes, minutes);
            }
            
            if (endTime) {
                const minutes = timeToMinutes(endTime);
                latestMinutes = Math.max(latestMinutes, minutes);
            }
        });
        
        // Ensure we have valid time range
        if (earliestMinutes >= latestMinutes) {
            timelineView.innerHTML = '<div class="timeline-placeholder">Please set valid time ranges for sessions</div>';
            return;
        }
        
        // Add padding to time range
        earliestMinutes = Math.max(0, earliestMinutes - 30);
        latestMinutes = Math.min(24 * 60, latestMinutes + 30);
        
        // Create timeline period
        const timelinePeriod = document.createElement('div');
        timelinePeriod.className = 'timeline-period';
        
        // Add scale markers
        const timelineScale = document.createElement('div');
        timelineScale.className = 'timeline-scale';
        
        // Calculate how many hours to show
        const totalHours = Math.ceil((latestMinutes - earliestMinutes) / 60);
        const startHour = Math.floor(earliestMinutes / 60);
        
        for (let i = 0; i <= totalHours; i++) {
            const hour = startHour + i;
            const marker = document.createElement('span');
            marker.textContent = `${hour}:00`;
            timelineScale.appendChild(marker);
        }
        
        timelinePeriod.appendChild(timelineScale);
        
        // Create slots container
        const timelineSlots = document.createElement('div');
        timelineSlots.className = 'timeline-slots';
        
        // Add session blocks to timeline
        sessionItems.forEach(session => {
            const sessionId = session.getAttribute('data-id');
            const startTime = session.querySelector('.session-start-time').value;
            const endTime = session.querySelector('.session-end-time').value;
            const winners = session.querySelector('.session-winners').value || '1';
            
            if (!startTime || !endTime) return;
            
            const startMinutes = timeToMinutes(startTime);
            const endMinutes = timeToMinutes(endTime);
            
            if (startMinutes >= endMinutes) return;
            
            // Calculate position and width
            const totalTimelineMinutes = latestMinutes - earliestMinutes;
            const left = ((startMinutes - earliestMinutes) / totalTimelineMinutes) * 100;
            const width = ((endMinutes - startMinutes) / totalTimelineMinutes) * 100;
            
            // Create session block
            const sessionBlock = document.createElement('div');
            sessionBlock.className = 'timeline-session';
            sessionBlock.style.left = `${left}%`;
            sessionBlock.style.width = `${width}%`;
            
            // Get session number
            const sessionNumber = session.querySelector('.session-header h3').textContent.replace('Session ', '');
            
            sessionBlock.innerHTML = `
                <div class="timeline-session-label">Session ${sessionNumber}</div>
                <div class="timeline-session-time">${formatTime(startTime)} - ${formatTime(endTime)}</div>
                <div class="timeline-session-winners">${winners} winner${winners > 1 ? 's' : ''}</div>
            `;
            
            // Highlight when clicked
            sessionBlock.addEventListener('click', function() {
                // Remove active class from all sessions
                document.querySelectorAll('.session-item').forEach(s => s.classList.remove('active'));
                // Add active class to this session
                session.classList.add('active');
                session.scrollIntoView({ behavior: 'smooth', block: 'center' });
            });
            
            timelineSlots.appendChild(sessionBlock);
        });
        
        timelinePeriod.appendChild(timelineSlots);
        timelineView.appendChild(timelinePeriod);
    }
    
    // Format time for display (convert 24h to 12h format)
    function formatTime(timeString) {
        if (!timeString) return '';
        
        const [hours, minutes] = timeString.split(':');
        let hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        
        hour = hour % 12;
        hour = hour ? hour : 12; // Convert 0 to 12
        
        return `${hour}:${minutes} ${ampm}`;
    }
    
    // Save current plan
    function savePlan() {
        const planName = document.getElementById('promotionName').value;
        if (!planName) {
            alert('Please enter a promotion name');
            return;
        }
        
        // Gather promotion details
        currentPlan.name = planName;
        currentPlan.date = document.getElementById('promotionDate').value;
        currentPlan.masterTimer = parseInt(document.getElementById('masterTimer').value) || 5;
        
        // Gather sessions
        currentPlan.sessions = [];
        document.querySelectorAll('.session-item').forEach(session => {
            const sessionId = session.getAttribute('data-id');
            const sessionNumber = session.querySelector('.session-header h3').textContent.replace('Session ', '');
            const startTime = session.querySelector('.session-start-time').value;
            const endTime = session.querySelector('.session-end-time').value;
            const winners = parseInt(session.querySelector('.session-winners').value) || 1;
            
            // Gather prizes
            const prizes = [];
            session.querySelectorAll('.prize-selection').forEach(prizeSelection => {
                const prizeText = prizeSelection.querySelector('span').textContent;
                // Extract name and value from text
                let name = prizeText;
                let value = '';
                
                const valueMatch = prizeText.match(/\(\$([^)]+)\)/);
                if (valueMatch) {
                    name = prizeText.replace(valueMatch[0], '').trim();
                    value = valueMatch[1];
                }
                
                prizes.push({
                    name,
                    value,
                    assigned: false
                });
            });
            
            currentPlan.sessions.push({
                id: sessionId,
                number: sessionNumber,
                startTime,
                endTime,
                winners,
                prizes
            });
        });
        
        // Gather prizes
        currentPlan.prizes = [];
        document.querySelectorAll('#prize-list .prize-item').forEach(prizeItem => {
            const name = prizeItem.querySelector('.prize-name').value;
            const value = prizeItem.querySelector('.prize-value').value;
            
            if (name) {
                currentPlan.prizes.push({
                    name,
                    value,
                    assigned: false
                });
            }
        });
        
        // Save to localStorage
        const savedPlans = JSON.parse(localStorage.getItem('casinoDrawingPlans') || '{}');
        savedPlans[planName] = currentPlan;
        localStorage.setItem('casinoDrawingPlans', JSON.stringify(savedPlans));
        
        // Save as active plan
        localStorage.setItem('activePlan', JSON.stringify(currentPlan));
        
        // Update saved plans list
        loadSavedPlansList();
        
        alert(`Plan "${planName}" saved successfully`);
    }
    
    // Load saved plans list
    function loadSavedPlansList() {
        const savedPlans = JSON.parse(localStorage.getItem('casinoDrawingPlans') || '{}');
        const planNames = Object.keys(savedPlans);
        
        // Clear select options
        savedPlansSelect.innerHTML = '<option value="">Select a saved plan</option>';
        
        // Add options for each saved plan
        planNames.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            savedPlansSelect.appendChild(option);
        });
    }
    
    // Load plan
    function loadPlan() {
        const planName = savedPlansSelect.value;
        if (!planName) {
            alert('Please select a plan to load');
            return;
        }
        
        const savedPlans = JSON.parse(localStorage.getItem('casinoDrawingPlans') || '{}');
        if (!savedPlans[planName]) {
            alert(`Plan "${planName}" not found`);
            return;
        }
        
        // Confirm if we have unsaved changes
        if (document.querySelectorAll('.session-item').length > 0 ||
            document.querySelectorAll('#prize-list .prize-item').length > 1) {
            if (!confirm('This will overwrite any unsaved changes. Continue?')) {
                return;
            }
        }
        
        // Clear current plan
        clearPlan(false);
        
        // Load plan data
        currentPlan = savedPlans[planName];
        
        // Set promotion details
        document.getElementById('promotionName').value = currentPlan.name;
        document.getElementById('promotionDate').value = currentPlan.date || '';
        document.getElementById('masterTimer').value = currentPlan.masterTimer || 5;
        
        // Add prizes
        prizeList.innerHTML = ''; // Clear prizes
        if (currentPlan.prizes && currentPlan.prizes.length > 0) {
            currentPlan.prizes.forEach(prize => {
                const prizeItem = document.createElement('div');
                prizeItem.className = 'prize-item';
                prizeItem.innerHTML = `
                    <input type="text" placeholder="Prize name" class="prize-name" value="${prize.name}">
                    <input type="text" placeholder="Value" class="prize-value" value="${prize.value}">
                    <button type="button" class="remove-prize">×</button>
                    <button type="button" class="repeat-prize-button">Apply to all sessions</button>
                `;
                
                prizeList.appendChild(prizeItem);
                
                // Setup remove button
                prizeItem.querySelector('.remove-prize').addEventListener('click', function() {
                    prizeItem.remove();
                });
                
                // Setup repeat prize button
                prizeItem.querySelector('.repeat-prize-button').addEventListener('click', function() {
                    const prizeName = prizeItem.querySelector('.prize-name').value;
                    const prizeValue = prizeItem.querySelector('.prize-value').value;
                    
                    if (!prizeName) {
                        alert('Please enter a prize name first');
                        return;
                    }
                    
                    // Apply this prize to all sessions
                    const sessions = document.querySelectorAll('.session-item');
                    if (confirm(`Apply "${prizeName}" to all ${sessions.length} sessions?`)) {
                        sessions.forEach(session => {
                            const sessionId = session.getAttribute('data-id');
                            const prizesList = session.querySelector('.session-prizes-list');
                            
                            // Create prize selection item
                            const prizeSelectionItem = document.createElement('div');
                            prizeSelectionItem.className = 'prize-selection';
                            prizeSelectionItem.innerHTML = `
                                <span>${prizeName} ${prizeValue ? `($${prizeValue})` : ''}</span>
                                <button type="button" class="remove-prize">×</button>
                            `;
                            
                            // Add remove button event
                            prizeSelectionItem.querySelector('.remove-prize').addEventListener('click', function() {
                                prizeSelectionItem.remove();
                            });
                            
                            prizesList.appendChild(prizeSelectionItem);
                        });
                        
                        alert(`Prize "${prizeName}" has been applied to all sessions`);
                    }
                });
            });
        } else {
            // Add at least one empty prize
            addPrize();
        }
        
        // Add sessions
        sessionsList.innerHTML = ''; // Clear sessions
        sessionCount = 0;
        
        if (currentPlan.sessions && currentPlan.sessions.length > 0) {
            currentPlan.sessions.forEach(session => {
                sessionCount++;
                const sessionId = session.id || ('session-' + Date.now() + sessionCount);
                
                const fragment = document.createRange().createContextualFragment(
                    sessionTemplate.innerHTML
                        .replace(/{{id}}/g, sessionId)
                        .replace(/{{number}}/g, session.number || sessionCount)
                );
                
                sessionsList.appendChild(fragment);
                
                const sessionItem = sessionsList.querySelector(`[data-id="${sessionId}"]`);
                
                // Set up event listeners for this session
                setupSessionEvents(sessionItem, sessionId);
                
                // Set session details
                sessionItem.querySelector('.session-start-time').value = session.startTime || '';
                sessionItem.querySelector('.session-end-time').value = session.endTime || '';
                sessionItem.querySelector('.session-winners').value = session.winners || 1;
                
                // Add prizes to session
                const prizesList = sessionItem.querySelector('.session-prizes-list');
                if (session.prizes && session.prizes.length > 0) {
                    session.prizes.forEach(prize => {
                        const prizeSelectionItem = document.createElement('div');
                        prizeSelectionItem.className = 'prize-selection';
                        prizeSelectionItem.innerHTML = `
                            <span>${prize.name} ${prize.value ? `($${prize.value})` : ''}</span>
                            <button type="button" class="remove-prize">×</button>
                        `;
                        
                        // Add remove button event
                        prizeSelectionItem.querySelector('.remove-prize').addEventListener('click', function() {
                            prizeSelectionItem.remove();
                        });
                        
                        prizesList.appendChild(prizeSelectionItem);
                    });
                }
            });
        }
        
        // Update timeline
        updateTimeline();
        
        // Set as active plan
        localStorage.setItem('activePlan', JSON.stringify(currentPlan));
        
        alert(`Plan "${planName}" loaded successfully`);
    }
    
    // Clear plan
    function clearPlan(confirm = true) {
        if (confirm && !window.confirm('Are you sure you want to clear all plan data?')) {
            return;
        }
        
        // Clear promotion details
        document.getElementById('promotionName').value = '';
        document.getElementById('promotionDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('masterTimer').value = 5;
        
        // Clear sessions
        sessionsList.innerHTML = '';
        sessionCount = 0;
        
        // Clear prizes but keep one empty prize
        prizeList.innerHTML = '';
        prizeCount = 0;
        addPrize();
        
        // Clear timeline
        updateTimeline();
        
        // Reset current plan
        currentPlan = {
            name: '',
            date: '',
            activeSession: '',
            masterTimer: 5,
            sessions: [],
            prizes: []
        };
    }
    
    // Delete plan
    function deletePlan() {
        const planName = savedPlansSelect.value;
        if (!planName) {
            alert('Please select a plan to delete');
            return;
        }
        
        if (!confirm(`Are you sure you want to delete the plan "${planName}"?`)) {
            return;
        }
        
        // Delete from localStorage
        const savedPlans = JSON.parse(localStorage.getItem('casinoDrawingPlans') || '{}');
        if (savedPlans[planName]) {
            delete savedPlans[planName];
            localStorage.setItem('casinoDrawingPlans', JSON.stringify(savedPlans));
            
            // Update saved plans list
            loadSavedPlansList();
            
            alert(`Plan "${planName}" deleted successfully`);
        } else {
            alert(`Plan "${planName}" not found`);
        }
    }
}); 