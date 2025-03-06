document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const sessionsGrid = document.getElementById('sessions-grid');
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
        
        // Create a grid item container for the session
        const gridItem = document.createElement('div');
        gridItem.className = 'session-grid-item';
        gridItem.appendChild(fragment);
        
        sessionsGrid.appendChild(gridItem);
        
        const sessionItem = gridItem.querySelector(`[data-id="${sessionId}"]`);
        
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
        if (sessionsGrid.childElementCount > 0) {
            if (confirm('This will replace all existing sessions. Continue?')) {
                sessionsGrid.innerHTML = '';
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
            const sessionItem = document.querySelector(`[data-id="${sessionId}"]`);
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
            // Remove the grid item that contains the session
            const gridItem = sessionItem.closest('.session-grid-item');
            if (gridItem) {
                gridItem.remove();
            } else {
                sessionItem.remove();
            }
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
    
    // Update timeline with numbered sessions
    function updateTimeline() {
        timelineView.innerHTML = '';
        
        // Create timeline scale
        const timelineScale = document.createElement('div');
        timelineScale.className = 'timeline-scale';
        timelineView.appendChild(timelineScale);
        
        // Create timeline slots
        const timelineSlots = document.createElement('div');
        timelineSlots.className = 'timeline-slots';
        timelineView.appendChild(timelineSlots);
        
        // Get all sessions and sort by start time
        const sessions = Array.from(document.querySelectorAll('.session-item'));
        if (sessions.length === 0) {
            timelineView.innerHTML = '<div class="timeline-placeholder">Sessions will be visualized here</div>';
            return;
        }
        
        // Process each session
        const sessionData = sessions.map(session => {
            const sessionId = session.getAttribute('data-id');
            const startTimeInput = session.querySelector('.session-start-time');
            const endTimeInput = session.querySelector('.session-end-time');
            const winnersInput = session.querySelector('.session-winners');
            
            const startTime = startTimeInput.value || '09:00';
            const endTime = endTimeInput.value || '10:00';
            const winners = parseInt(winnersInput.value) || 1;
            
            // Get session number from the header
            const sessionHeader = session.querySelector('.session-header h3').textContent;
            const sessionNumber = sessionHeader.replace('Session ', '').trim();
            
            return {
                id: sessionId,
                number: sessionNumber,
                startTime: startTime,
                endTime: endTime,
                winners: winners,
                startMinutes: timeToMinutes(startTime),
                endMinutes: timeToMinutes(endTime)
            };
        }).sort((a, b) => a.startMinutes - b.startMinutes);
        
        // Update current plan sessions data
        currentPlan.sessions = sessionData;
        
        // Find earliest and latest times
        const earliestMinutes = Math.min(...sessionData.map(s => s.startMinutes));
        const latestMinutes = Math.max(...sessionData.map(s => s.endMinutes));
        
        // Create timeline scale
        const hours = {};
        for (let i = Math.floor(earliestMinutes / 60); i <= Math.ceil(latestMinutes / 60); i++) {
            hours[i] = `${i}:00`;
        }
        
        Object.entries(hours).forEach(([hour, label]) => {
            const hourMarker = document.createElement('div');
            hourMarker.className = 'timeline-hour';
            hourMarker.textContent = label;
            hourMarker.style.left = `${((parseInt(hour) * 60 - earliestMinutes) / (latestMinutes - earliestMinutes)) * 100}%`;
            timelineScale.appendChild(hourMarker);
        });
        
        // Create session blocks on the timeline
        sessionData.forEach(session => {
            const sessionBlock = document.createElement('div');
            sessionBlock.className = 'timeline-session';
            sessionBlock.setAttribute('data-id', session.id);
            
            const blockWidth = ((session.endMinutes - session.startMinutes) / (latestMinutes - earliestMinutes)) * 100;
            const blockLeft = ((session.startMinutes - earliestMinutes) / (latestMinutes - earliestMinutes)) * 100;
            
            sessionBlock.style.width = `${blockWidth}%`;
            sessionBlock.style.left = `${blockLeft}%`;
            
            // Add session details to block
            sessionBlock.innerHTML = `
                <div class="timeline-session-label">Session ${session.number}</div>
                <div class="timeline-session-time">${formatTime(session.startTime)} - ${formatTime(session.endTime)}</div>
                <div class="timeline-session-winners">${session.winners} winner${session.winners !== 1 ? 's' : ''}</div>
            `;
            
            timelineSlots.appendChild(sessionBlock);
            
            // Add click event to highlight corresponding session in the list
            sessionBlock.addEventListener('click', () => {
                document.querySelectorAll('.session-item').forEach(s => {
                    s.classList.remove('active');
                });
                document.querySelector(`.session-item[data-id="${session.id}"]`).classList.add('active');
                
                // Set as active session
                currentPlan.activeSession = session.id;
                
                // Update active plan with active session
                const activePlan = JSON.parse(localStorage.getItem('activePlan') || '{}');
                activePlan.activeSession = session.id;
                localStorage.setItem('activePlan', JSON.stringify(activePlan));
            });
        });
    }
    
    // Format time for display
    function formatTime(timeString) {
        if (!timeString) return '';
        
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours);
        const isPM = hour >= 12;
        const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        
        return `${hour12}:${minutes} ${isPM ? 'PM' : 'AM'}`;
    }
    
    // Save the current plan
    function savePlan() {
        const promotionName = document.getElementById('promotionName').value.trim();
        const promotionDate = document.getElementById('promotionDate').value;
        const masterTimer = parseInt(document.getElementById('masterTimer').value) || 5;
        
        if (!promotionName) {
            alert('Please enter a promotion name');
            return;
        }
        
        // Get all prizes
        const prizeItems = Array.from(document.querySelectorAll('.prize-item'));
        const prizes = prizeItems.map(item => {
            const name = item.querySelector('.prize-name').value.trim();
            const value = item.querySelector('.prize-value').value.trim();
            
            if (name) {
                return {
                    name: name,
                    value: value
                };
            }
            return null;
        }).filter(prize => prize !== null);
        
        // Get all sessions
        const sessions = Array.from(document.querySelectorAll('.session-item')).map(session => {
            const sessionId = session.getAttribute('data-id');
            const sessionHeader = session.querySelector('.session-header h3').textContent;
            const sessionNumber = sessionHeader.replace('Session ', '').trim();
            const startTime = session.querySelector('.session-start-time').value;
            const endTime = session.querySelector('.session-end-time').value;
            const winners = parseInt(session.querySelector('.session-winners').value) || 1;
            
            // Get prizes assigned to this session
            const prizeAssignments = Array.from(session.querySelectorAll('.session-prizes-list .prize-selection')).map(prize => {
                const prizeText = prize.querySelector('span').textContent;
                return prizeText;
            });
            
            return {
                id: sessionId,
                number: sessionNumber,
                startTime: startTime,
                endTime: endTime,
                winners: winners,
                prizes: prizeAssignments
            };
        });
        
        // Create plan object
        const plan = {
            name: promotionName,
            date: promotionDate,
            masterTimer: masterTimer,
            prizes: prizes,
            sessions: sessions,
            activeSession: currentPlan.activeSession
        };
        
        // Save as active plan and to saved plans
        localStorage.setItem('activePlan', JSON.stringify(plan));
        
        // Get existing saved plans
        const savedPlans = JSON.parse(localStorage.getItem('savedPlans') || '[]');
        
        // Check if plan with same name already exists
        const existingPlanIndex = savedPlans.findIndex(p => p.name === plan.name);
        
        if (existingPlanIndex >= 0) {
            if (confirm(`A plan named "${plan.name}" already exists. Do you want to replace it?`)) {
                savedPlans[existingPlanIndex] = plan;
            } else {
                return;
            }
        } else {
            savedPlans.push(plan);
        }
        
        // Save updated plans list
        localStorage.setItem('savedPlans', JSON.stringify(savedPlans));
        
        // Update saved plans dropdown
        loadSavedPlansList();
        
        alert(`Plan "${plan.name}" saved successfully!`);
    }
    
    // Load saved plans into dropdown
    function loadSavedPlansList() {
        const savedPlans = JSON.parse(localStorage.getItem('savedPlans') || '[]');
        const savedPlansSelect = document.getElementById('saved-plans-select');
        
        // Clear existing options except the placeholder
        while (savedPlansSelect.options.length > 1) {
            savedPlansSelect.remove(1);
        }
        
        // Add plans as options
        savedPlans.forEach(plan => {
            const option = document.createElement('option');
            option.value = plan.name;
            option.textContent = `${plan.name} (${plan.date})`;
            savedPlansSelect.appendChild(option);
        });
    }
    
    // Load plan
    function loadPlan() {
        const selectedPlanName = document.getElementById('saved-plans-select').value;
        
        if (!selectedPlanName) {
            alert('Please select a plan to load');
            return;
        }
        
        // Get saved plans
        const savedPlans = JSON.parse(localStorage.getItem('savedPlans') || '[]');
        const selectedPlan = savedPlans.find(plan => plan.name === selectedPlanName);
        
        if (!selectedPlan) {
            alert('Could not find the selected plan');
            return;
        }
        
        // Clear current plan
        clearPlan(false);
        
        // Load plan data
        document.getElementById('promotionName').value = selectedPlan.name;
        document.getElementById('promotionDate').value = selectedPlan.date;
        document.getElementById('masterTimer').value = selectedPlan.masterTimer || 5;
        
        // Load prizes
        prizeList.innerHTML = '';
        if (selectedPlan.prizes && selectedPlan.prizes.length > 0) {
            selectedPlan.prizes.forEach(prize => {
                const prizeItem = document.createElement('div');
                prizeItem.className = 'prize-item';
                prizeItem.innerHTML = `
                    <input type="text" placeholder="Prize name" class="prize-name" value="${prize.name || ''}">
                    <input type="text" placeholder="Value" class="prize-value" value="${prize.value || ''}">
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
                    }
                });
            });
        } else {
            // Add a default prize item if none exist
            addPrize();
        }
        
        // Set prize count
        prizeCount = selectedPlan.prizes ? selectedPlan.prizes.length : 1;
        
        // Load sessions
        sessionsGrid.innerHTML = '';
        if (selectedPlan.sessions && selectedPlan.sessions.length > 0) {
            sessionCount = 0;
            
            selectedPlan.sessions.forEach(session => {
                sessionCount++;
                const sessionId = session.id || `session-${Date.now()}-${sessionCount}`;
                
                const fragment = document.createRange().createContextualFragment(
                    sessionTemplate.innerHTML
                        .replace(/{{id}}/g, sessionId)
                        .replace(/{{number}}/g, session.number || sessionCount)
                );
                
                // Create a grid item container for the session
                const gridItem = document.createElement('div');
                gridItem.className = 'session-grid-item';
                gridItem.appendChild(fragment);
                
                sessionsGrid.appendChild(gridItem);
                
                const sessionItem = gridItem.querySelector(`[data-id="${sessionId}"]`);
                
                // Set session values
                sessionItem.querySelector('.session-start-time').value = session.startTime || '';
                sessionItem.querySelector('.session-end-time').value = session.endTime || '';
                sessionItem.querySelector('.session-winners').value = session.winners || 1;
                
                // Add prizes to session
                const prizesList = sessionItem.querySelector('.session-prizes-list');
                if (session.prizes && session.prizes.length > 0) {
                    session.prizes.forEach(prizeText => {
                        const prizeSelectionItem = document.createElement('div');
                        prizeSelectionItem.className = 'prize-selection';
                        prizeSelectionItem.innerHTML = `
                            <span>${prizeText}</span>
                            <button type="button" class="remove-prize">×</button>
                        `;
                        
                        // Add remove button event
                        prizeSelectionItem.querySelector('.remove-prize').addEventListener('click', function() {
                            prizeSelectionItem.remove();
                        });
                        
                        prizesList.appendChild(prizeSelectionItem);
                    });
                }
                
                // Set up event listeners for this session
                setupSessionEvents(sessionItem, sessionId);
            });
        }
        
        // Set active session
        currentPlan.activeSession = selectedPlan.activeSession || '';
        
        // Update timeline
        updateTimeline();
        
        // Set as active plan
        localStorage.setItem('activePlan', JSON.stringify(selectedPlan));
        
        alert(`Plan "${selectedPlan.name}" loaded successfully!`);
    }
    
    // Clear plan
    function clearPlan(confirm = true) {
        if (confirm && !window.confirm('Are you sure you want to clear all plan data?')) {
            return;
        }
        
        // Reset form
        document.getElementById('promotionName').value = '';
        setCurrentDate();
        document.getElementById('masterTimer').value = '5';
        
        // Clear prizes
        prizeList.innerHTML = '';
        addPrize();
        
        // Clear sessions
        sessionsGrid.innerHTML = '';
        sessionCount = 0;
        
        // Reset timeline
        timelineView.innerHTML = '<div class="timeline-placeholder">Sessions will be visualized here</div>';
        
        // Reset current plan state
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
        const savedPlans = JSON.parse(localStorage.getItem('savedPlans') || '[]');
        const updatedPlans = savedPlans.filter(plan => plan.name !== planName);
        localStorage.setItem('savedPlans', JSON.stringify(updatedPlans));
        
        // Update saved plans list
        loadSavedPlansList();
        
        alert(`Plan "${planName}" deleted successfully`);
    }
}); 