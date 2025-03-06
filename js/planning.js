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
    
    // Session template
    const sessionTemplate = document.getElementById('session-template');
    
    // State
    let sessionCount = 0;
    let prizeCount = 1;
    let currentPlan = {
        name: '',
        date: '',
        masterTimer: 5,
        prizes: [],
        sessions: []
    };
    
    // Initialize
    loadSavedPlansList();
    setCurrentDate();
    
    // Set current date in date picker
    function setCurrentDate() {
        const today = new Date();
        const formattedDate = today.toISOString().substr(0, 10);
        document.getElementById('promotionDate').value = formattedDate;
    }
    
    // Add new session
    function addSession() {
        const sessionId = sessionCount++;
        const sessionNumber = sessionCount;
        
        // Clone template
        const sessionContent = document.importNode(sessionTemplate.content, true);
        
        // Update template placeholders
        sessionContent.querySelector('.session-item').dataset.id = sessionId;
        sessionContent.querySelector('.session-header h3').textContent = `Session ${sessionNumber}`;
        
        // Add to DOM
        sessionsList.appendChild(sessionContent);
        
        // Add event listeners
        const sessionItem = sessionsList.querySelector(`.session-item[data-id="${sessionId}"]`);
        const removeBtn = sessionItem.querySelector('.remove-session');
        const assignPrizeBtn = sessionItem.querySelector('.assign-prize');
        
        removeBtn.addEventListener('click', function() {
            sessionItem.remove();
            updateTimeline();
        });
        
        assignPrizeBtn.addEventListener('click', function() {
            assignPrizeToSession(sessionId);
        });
        
        // Set default times
        setupDefaultTimes(sessionItem, sessionNumber);
        
        // Update timeline
        updateTimeline();
        
        return sessionId;
    }
    
    // Setup default times based on session number
    function setupDefaultTimes(sessionItem, sessionNumber) {
        const startTimeInput = sessionItem.querySelector('.session-start-time');
        const endTimeInput = sessionItem.querySelector('.session-end-time');
        
        // Set default times (1 hour sessions starting at 6 PM)
        const baseHour = 18; // 6 PM
        const startHour = baseHour + (sessionNumber - 1);
        const endHour = startHour + 1;
        
        startTimeInput.value = `${startHour.toString().padStart(2, '0')}:00`;
        endTimeInput.value = `${endHour.toString().padStart(2, '0')}:00`;
        
        // Add listeners for time changes
        startTimeInput.addEventListener('change', updateTimeline);
        endTimeInput.addEventListener('change', updateTimeline);
    }
    
    // Add new prize
    function addPrize() {
        const prizeItem = document.createElement('div');
        prizeItem.className = 'prize-item';
        prizeItem.dataset.id = prizeCount++;
        
        prizeItem.innerHTML = `
            <input type="text" placeholder="Prize name" class="prize-name">
            <input type="text" placeholder="Value" class="prize-value">
            <button type="button" class="remove-prize">×</button>
        `;
        
        prizeList.appendChild(prizeItem);
        
        const removeBtn = prizeItem.querySelector('.remove-prize');
        removeBtn.addEventListener('click', function() {
            prizeItem.remove();
        });
        
        return prizeItem;
    }
    
    // Assign prize to session
    function assignPrizeToSession(sessionId) {
        const sessionItem = document.querySelector(`.session-item[data-id="${sessionId}"]`);
        const prizesList = sessionItem.querySelector('.session-prizes-list');
        const winners = parseInt(sessionItem.querySelector('.session-winners').value);
        
        // Clear existing prizes
        prizesList.innerHTML = '';
        
        // Get available prizes
        const availablePrizes = Array.from(document.querySelectorAll('.prize-item')).map(item => {
            return {
                id: item.dataset.id,
                name: item.querySelector('.prize-name').value || 'Prize',
                value: item.querySelector('.prize-value').value || '$0'
            };
        });
        
        // Add prize selections
        for (let i = 0; i < winners; i++) {
            const prizeSelect = document.createElement('div');
            prizeSelect.className = 'prize-selection';
            
            prizeSelect.innerHTML = `
                <label>Winner #${i + 1} Prize:</label>
                <select class="prize-select" data-winner="${i}">
                    <option value="">Select a prize</option>
                    ${availablePrizes.map(prize => 
                        `<option value="${prize.id}">${prize.name} (${prize.value})</option>`
                    ).join('')}
                </select>
            `;
            
            prizesList.appendChild(prizeSelect);
        }
    }
    
    // Update timeline visualization
    function updateTimeline() {
        timelineView.innerHTML = '';
        
        const sessions = Array.from(document.querySelectorAll('.session-item'));
        
        if (sessions.length === 0) {
            timelineView.innerHTML = '<div class="timeline-placeholder">Sessions will be visualized here</div>';
            return;
        }
        
        // Find earliest and latest times
        let earliestTime = '23:59';
        let latestTime = '00:00';
        
        sessions.forEach(session => {
            const startTime = session.querySelector('.session-start-time').value;
            const endTime = session.querySelector('.session-end-time').value;
            
            if (startTime && startTime < earliestTime) earliestTime = startTime;
            if (endTime && endTime > latestTime) latestTime = endTime;
        });
        
        // Create timeline
        const timelinePeriod = document.createElement('div');
        timelinePeriod.className = 'timeline-period';
        timelinePeriod.innerHTML = `<div class="timeline-scale">
            <span class="timeline-start">${formatTime(earliestTime)}</span>
            <span class="timeline-end">${formatTime(latestTime)}</span>
        </div>`;
        
        const timelineSlots = document.createElement('div');
        timelineSlots.className = 'timeline-slots';
        
        // Add sessions to timeline
        sessions.forEach((session, idx) => {
            const startTime = session.querySelector('.session-start-time').value;
            const endTime = session.querySelector('.session-end-time').value;
            const sessionId = session.dataset.id;
            const numWinners = session.querySelector('.session-winners').value;
            
            if (startTime && endTime) {
                const [startHour, startMin] = startTime.split(':').map(Number);
                const [endHour, endMin] = endTime.split(':').map(Number);
                
                const [earliestHour, earliestMin] = earliestTime.split(':').map(Number);
                const [latestHour, latestMin] = latestTime.split(':').map(Number);
                
                // Calculate position and width percentages
                const totalMinutes = (latestHour * 60 + latestMin) - (earliestHour * 60 + earliestMin);
                const startMinutes = (startHour * 60 + startMin) - (earliestHour * 60 + earliestMin);
                const sessionDuration = (endHour * 60 + endMin) - (startHour * 60 + startMin);
                
                const leftPosition = (startMinutes / totalMinutes) * 100;
                const width = (sessionDuration / totalMinutes) * 100;
                
                const timelineSession = document.createElement('div');
                timelineSession.className = 'timeline-session';
                timelineSession.style.left = `${leftPosition}%`;
                timelineSession.style.width = `${width}%`;
                timelineSession.dataset.id = sessionId;
                
                timelineSession.innerHTML = `
                    <div class="timeline-session-label">Session ${idx + 1}</div>
                    <div class="timeline-session-time">${formatTime(startTime)} - ${formatTime(endTime)}</div>
                    <div class="timeline-session-winners">${numWinners} winners</div>
                `;
                
                timelineSlots.appendChild(timelineSession);
                
                // Add click event to highlight corresponding session
                timelineSession.addEventListener('click', function() {
                    document.querySelectorAll('.session-item').forEach(item => {
                        item.classList.remove('active');
                    });
                    document.querySelector(`.session-item[data-id="${sessionId}"]`).classList.add('active');
                    document.querySelector(`.session-item[data-id="${sessionId}"]`).scrollIntoView({ behavior: 'smooth' });
                });
            }
        });
        
        timelinePeriod.appendChild(timelineSlots);
        timelineView.appendChild(timelinePeriod);
    }
    
    // Format time for display
    function formatTime(timeString) {
        if (!timeString) return '';
        
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours);
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        
        return `${displayHour}:${minutes} ${period}`;
    }
    
    // Save current plan
    function savePlan() {
        // Gather promotion info
        currentPlan.name = document.getElementById('promotionName').value || 'Unnamed Promotion';
        currentPlan.date = document.getElementById('promotionDate').value;
        currentPlan.masterTimer = parseInt(document.getElementById('masterTimer').value) || 5;
        
        // Gather prizes
        currentPlan.prizes = Array.from(document.querySelectorAll('.prize-item')).map(item => {
            return {
                id: item.dataset.id,
                name: item.querySelector('.prize-name').value || 'Prize',
                value: item.querySelector('.prize-value').value || '$0'
            };
        });
        
        // Gather sessions
        currentPlan.sessions = Array.from(document.querySelectorAll('.session-item')).map((session, idx) => {
            const sessionId = session.dataset.id;
            const startTime = session.querySelector('.session-start-time').value;
            const endTime = session.querySelector('.session-end-time').value;
            const winnersCount = parseInt(session.querySelector('.session-winners').value) || 1;
            
            // Get prize assignments
            const prizeAssignments = Array.from(session.querySelectorAll('.prize-select')).map(select => {
                return {
                    winnerId: select.dataset.winner,
                    prizeId: select.value
                };
            });
            
            return {
                id: sessionId,
                number: idx + 1,
                startTime,
                endTime,
                winnersCount,
                prizeAssignments
            };
        });
        
        // Save to localStorage
        const savedPlans = JSON.parse(localStorage.getItem('casinoDrawingPlans') || '[]');
        const planKey = `plan_${Date.now()}`;
        
        savedPlans.push({
            key: planKey,
            name: currentPlan.name,
            date: currentPlan.date,
            timestamp: Date.now()
        });
        
        localStorage.setItem('casinoDrawingPlans', JSON.stringify(savedPlans));
        localStorage.setItem(planKey, JSON.stringify(currentPlan));
        
        alert(`Plan "${currentPlan.name}" saved successfully!`);
        loadSavedPlansList();
    }
    
    // Load saved plans list
    function loadSavedPlansList() {
        const savedPlans = JSON.parse(localStorage.getItem('casinoDrawingPlans') || '[]');
        
        // Clear options except the first one
        while (savedPlansSelect.options.length > 1) {
            savedPlansSelect.remove(1);
        }
        
        // Add saved plans to dropdown
        savedPlans.forEach(plan => {
            const option = document.createElement('option');
            option.value = plan.key;
            option.textContent = `${plan.name} (${new Date(plan.timestamp).toLocaleDateString()})`;
            savedPlansSelect.appendChild(option);
        });
    }
    
    // Load selected plan
    function loadPlan() {
        const planKey = savedPlansSelect.value;
        
        if (!planKey) {
            alert('Please select a plan to load');
            return;
        }
        
        try {
            const plan = JSON.parse(localStorage.getItem(planKey));
            
            if (!plan) {
                alert('Failed to load plan. The plan may have been deleted.');
                return;
            }
            
            // Confirm before loading
            if (!confirm(`Are you sure you want to load plan "${plan.name}"? This will overwrite your current work.`)) {
                return;
            }
            
            // Clear current plan
            clearPlan(false);
            
            // Set plan details
            document.getElementById('promotionName').value = plan.name;
            document.getElementById('promotionDate').value = plan.date;
            document.getElementById('masterTimer').value = plan.masterTimer;
            
            // Add prizes
            prizeList.innerHTML = '';
            plan.prizes.forEach(prize => {
                const prizeItem = addPrize();
                prizeItem.dataset.id = prize.id;
                prizeItem.querySelector('.prize-name').value = prize.name;
                prizeItem.querySelector('.prize-value').value = prize.value;
            });
            
            // Add sessions
            plan.sessions.forEach(session => {
                const sessionId = addSession();
                const sessionItem = document.querySelector(`.session-item[data-id="${sessionId}"]`);
                
                sessionItem.querySelector('.session-start-time').value = session.startTime;
                sessionItem.querySelector('.session-end-time').value = session.endTime;
                sessionItem.querySelector('.session-winners').value = session.winnersCount;
                
                // Assign prizes (if any)
                if (session.prizeAssignments && session.prizeAssignments.length > 0) {
                    assignPrizeToSession(sessionId);
                    
                    // Set selected prizes
                    session.prizeAssignments.forEach(assignment => {
                        const select = sessionItem.querySelector(`.prize-select[data-winner="${assignment.winnerId}"]`);
                        if (select) select.value = assignment.prizeId;
                    });
                }
            });
            
            updateTimeline();
            alert(`Plan "${plan.name}" loaded successfully!`);
            
            // Update current plan
            currentPlan = plan;
            
        } catch (error) {
            console.error('Error loading plan:', error);
            alert('An error occurred while loading the plan.');
        }
    }
    
    // Clear current plan
    function clearPlan(confirm = true) {
        if (confirm && !window.confirm('Are you sure you want to clear all plan data? This cannot be undone.')) {
            return;
        }
        
        // Reset form
        document.getElementById('promotionName').value = '';
        setCurrentDate();
        document.getElementById('masterTimer').value = 5;
        
        // Clear prizes
        prizeList.innerHTML = '';
        addPrize();
        
        // Clear sessions
        sessionsList.innerHTML = '';
        sessionCount = 0;
        
        // Clear timeline
        updateTimeline();
        
        // Reset plan
        currentPlan = {
            name: '',
            date: '',
            masterTimer: 5,
            prizes: [],
            sessions: []
        };
    }
    
    // Delete selected plan
    function deletePlan() {
        const planKey = savedPlansSelect.value;
        
        if (!planKey) {
            alert('Please select a plan to delete');
            return;
        }
        
        if (!confirm('Are you sure you want to delete this plan? This cannot be undone.')) {
            return;
        }
        
        try {
            // Remove from plans list
            const savedPlans = JSON.parse(localStorage.getItem('casinoDrawingPlans') || '[]');
            const updatedPlans = savedPlans.filter(plan => plan.key !== planKey);
            
            localStorage.setItem('casinoDrawingPlans', JSON.stringify(updatedPlans));
            localStorage.removeItem(planKey);
            
            loadSavedPlansList();
            alert('Plan deleted successfully');
            
        } catch (error) {
            console.error('Error deleting plan:', error);
            alert('An error occurred while deleting the plan.');
        }
    }
    
    // Event listeners
    addSessionBtn.addEventListener('click', addSession);
    addPrizeBtn.addEventListener('click', addPrize);
    savePlanBtn.addEventListener('click', savePlan);
    loadPlanBtn.addEventListener('click', loadPlan);
    clearPlanBtn.addEventListener('click', clearPlan);
    deletePlanBtn.addEventListener('click', deletePlan);
    
    // Initialize with one prize
    addPrize();
}); 