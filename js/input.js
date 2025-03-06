let winners = [];
let raffleEntries = [];
let currentAdditionalWinners = 0;
let timerInterval;
let currentSessionId = '';
let currentPlanName = '';

// Load existing winners if any
function loadExistingWinners() {
    const savedWinners = localStorage.getItem('winners');
    if (savedWinners) {
        winners = JSON.parse(savedWinners);
        updateWinnersHistoryTable();
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Load any existing winners from localStorage
    loadExistingWinners();
    
    // Create the first winner entry
    createWinnerEntry(true);
    
    // Load available plans
    loadSavedPlans();
    
    // Setup event listeners
    document.getElementById('addEntry').addEventListener('click', function() {
        createWinnerEntry();
    });
    
    document.getElementById('winnerForm').addEventListener('submit', function(e) {
        e.preventDefault();
        selectWinner();
    });
    
    document.getElementById('exportCSV').addEventListener('click', function() {
        exportWinnersToCSV();
    });
    
    document.getElementById('clearData').addEventListener('click', function() {
        if (confirm('Are you sure you want to clear all winner data? This cannot be undone.')) {
            winners = [];
            localStorage.removeItem('winners');
            document.getElementById('winners-history-body').innerHTML = '';
            updateWinnerDisplay();
            updatePreview();
        }
    });
    
    document.getElementById('startTimer').addEventListener('click', function() {
        const minutes = parseInt(document.getElementById('timerMinutes').value);
        startTimer(minutes * 60);
    });
    
    document.getElementById('pauseTimer').addEventListener('click', function() {
        pauseTimer();
    });
    
    document.getElementById('resetTimer').addEventListener('click', function() {
        resetTimer();
    });
    
    // Plan and session selectors
    document.getElementById('planSelector').addEventListener('change', function() {
        loadPlanSessions(this.value);
    });
    
    document.getElementById('sessionSelector').addEventListener('change', function() {
        currentSessionId = this.value;
        document.getElementById('endSessionBtn').disabled = !this.value;
        updateTimerFromSession();
    });
    
    document.getElementById('endSessionBtn').addEventListener('click', function() {
        endCurrentSession();
    });
    
    // Set up a MutationObserver to watch for new elements in the winners history table
    const observerOptions = {
        childList: true,
        subtree: true
    };
    
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList' && mutation.target.id === 'winners-history-body') {
                // Add event listeners to new buttons
                setupWinnerControlButtons();
            }
        });
    });
    
    const winnersHistoryBody = document.getElementById('winners-history-body');
    observer.observe(winnersHistoryBody, observerOptions);
});

// Load saved plans from localStorage
function loadSavedPlans() {
    const planSelector = document.getElementById('planSelector');
    const savedPlans = JSON.parse(localStorage.getItem('savedPlans') || '[]');
    
    // Clear existing options except the placeholder
    while (planSelector.options.length > 1) {
        planSelector.remove(1);
    }
    
    // Add plans to selector
    savedPlans.forEach(plan => {
        const option = document.createElement('option');
        option.value = plan.name;
        option.textContent = `${plan.name} (${plan.date})`;
        planSelector.appendChild(option);
    });
    
    // Check if we have an active plan
    const activePlan = JSON.parse(localStorage.getItem('activePlan') || '{}');
    if (activePlan.name) {
        planSelector.value = activePlan.name;
        loadPlanSessions(activePlan.name);
    }
}

// Load sessions for the selected plan
function loadPlanSessions(planName) {
    if (!planName) return;
    
    currentPlanName = planName;
    const sessionSelector = document.getElementById('sessionSelector');
    sessionSelector.disabled = false;
    
    // Clear existing sessions
    while (sessionSelector.options.length > 1) {
        sessionSelector.remove(1);
    }
    
    // Get the plan
    const savedPlans = JSON.parse(localStorage.getItem('savedPlans') || '[]');
    const selectedPlan = savedPlans.find(plan => plan.name === planName);
    
    if (!selectedPlan || !selectedPlan.sessions) {
        alert('No sessions found for this plan');
        return;
    }
    
    // Add sessions to selector
    selectedPlan.sessions.forEach(session => {
        const option = document.createElement('option');
        option.value = session.id;
        option.textContent = `Session ${session.number} (${formatTimeForDisplay(session.startTime)} - ${formatTimeForDisplay(session.endTime)})`;
        sessionSelector.appendChild(option);
    });
    
    // If there's an active session in this plan, select it
    if (selectedPlan.activeSession) {
        sessionSelector.value = selectedPlan.activeSession;
        currentSessionId = selectedPlan.activeSession;
        document.getElementById('endSessionBtn').disabled = false;
        updateTimerFromSession();
    }
}

// Format time for display
function formatTimeForDisplay(timeString) {
    if (!timeString) return '';
    
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const isPM = hour >= 12;
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    
    return `${hour12}:${minutes} ${isPM ? 'PM' : 'AM'}`;
}

// Update timer from session settings
function updateTimerFromSession() {
    if (!currentPlanName || !currentSessionId) return;
    
    const savedPlans = JSON.parse(localStorage.getItem('savedPlans') || '[]');
    const plan = savedPlans.find(p => p.name === currentPlanName);
    
    if (plan && plan.masterTimer) {
        document.getElementById('timerMinutes').value = plan.masterTimer;
    }
}

// End current session and save data
function endCurrentSession() {
    if (!currentSessionId || !currentPlanName) {
        alert('No active session selected');
        return;
    }
    
    // Get current session details
    const savedPlans = JSON.parse(localStorage.getItem('savedPlans') || '[]');
    const plan = savedPlans.find(p => p.name === currentPlanName);
    const session = plan?.sessions?.find(s => s.id === currentSessionId);
    
    if (!session) {
        alert('Session not found');
        return;
    }
    
    // Filter winners for this session
    const sessionWinners = winners.filter(winner => winner.sessionId === currentSessionId);
    
    if (sessionWinners.length === 0) {
        if (!confirm('No winners are recorded for this session. End anyway?')) {
            return;
        }
    }
    
    // Save session data to CSV
    const sessionData = sessionWinners.map(winner => {
        return {
            name: winner.name,
            playerID: winner.playerID,
            prize: winner.prize,
            drawingTime: winner.drawingTime,
            session: `Session ${session.number}`,
            status: winner.claimed ? 'Claimed' : (winner.disqualified ? 'Disqualified' : 'Active')
        };
    });
    
    if (sessionData.length > 0) {
        // Create CSV content
        const headers = Object.keys(sessionData[0]);
        const csvContent = [
            headers.join(','),
            ...sessionData.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
        ].join('\n');
        
        // Save to file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `${plan.name}_Session${session.number}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    // Clear session and allow selection of another
    document.getElementById('sessionSelector').value = '';
    currentSessionId = '';
    document.getElementById('endSessionBtn').disabled = true;
    resetTimer();
    
    alert(`Session ${session.number} has been ended and data saved.`);
}

function createWinnerEntry(isRequired = false) {
    const container = document.getElementById('entries-container');
    const entryId = 'entry-' + Date.now();
    
    const entryDiv = document.createElement('div');
    entryDiv.className = 'winner-entry';
    entryDiv.id = entryId;
    
    entryDiv.innerHTML = `
        <div>
            <div class="form-group">
                <label for="${entryId}-name">Winner Name:</label>
                <input type="text" id="${entryId}-name" class="winner-name" ${isRequired ? 'required' : ''} placeholder="Enter name (optional)">
            </div>
            <div class="form-group">
                <label for="${entryId}-id">Unique ID:</label>
                <input type="text" id="${entryId}-id" class="winner-id" required placeholder="Enter ID number">
            </div>
        </div>
        ${!isRequired ? `<button type="button" class="remove-entry" onclick="removeEntry('${entryId}')">×</button>` : ''}
    `;
    
    container.appendChild(entryDiv);
    
    // Update preview when entry fields change
    entryDiv.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', updatePreview);
    });
}

// Function to remove an entry
window.removeEntry = function(entryId) {
    const entryElement = document.getElementById(entryId);
    if (entryElement) {
        entryElement.remove();
        updatePreview();
    }
};

function previewHeaderImage(input) {
    const preview = document.getElementById('imagePreview');
    const reader = new FileReader();
    
    reader.onload = function(e) {
        preview.innerHTML = `<img src="${e.target.result}" alt="Header preview">`;
        localStorage.setItem('casinoHeaderImage', e.target.result);
        updatePreview();
    };
    
    if (input.files && input.files[0]) {
        reader.readAsDataURL(input.files[0]);
    } else {
        preview.innerHTML = '';
        localStorage.removeItem('casinoHeaderImage');
        updatePreview();
    }
}

function updatePreview() {
    const previewContainer = document.getElementById('displayPreview');
    if (!previewContainer) return;
    
    // Get header image
    const headerImage = localStorage.getItem('casinoHeaderImage');
    
    // Get active winners (not claimed or disqualified)
    const activeWinners = winners.filter(w => !w.claimed && !w.disqualified);
    
    // Check if there are existing winners or form entries
    const entries = document.querySelectorAll('.winner-entry');
    const hasFormEntries = entries.length > 0;
    
    // Preview content
    let previewContent = '';
    
    // Add header image if available
    if (headerImage) {
        previewContent += `<div class="header-image"><img src="${headerImage}" alt="Header"></div>`;
    }
    
    // Add winners from form input fields (preview mode)
    if (hasFormEntries) {
        let winnerCards = '';
        let index = 1;
        
        entries.forEach(entry => {
            const nameInput = entry.querySelector('.winner-name');
            const idInput = entry.querySelector('.winner-id');
            
            if (idInput && idInput.value) {
                const name = nameInput ? nameInput.value : 'Anonymous';
                const id = idInput.value;
                
                winnerCards += `
                    <div class="winner-card">
                        <h2>Winner #${index}</h2>
                        <p class="winner-name">${name || 'Anonymous'}</p>
                        <p class="winner-id">${id}</p>
                        <p class="winner-session">Session: Default</p>
                    </div>
                `;
                index++;
            }
        });
        
        // Add existing active winners
        activeWinners.forEach(winner => {
            winnerCards += `
                <div class="winner-card">
                    <h2>Winner #${index}</h2>
                    <p class="winner-name">${winner.name || 'Anonymous'}</p>
                    <p class="winner-id">${winner.uniqueId || 'N/A'}</p>
                    <p class="winner-prize">${winner.prize || 'Prize'}</p>
                    <p class="winner-session">Session: ${winner.session || 'Default'}</p>
                </div>
            `;
            index++;
        });
        
        if (winnerCards) {
            previewContent += winnerCards;
        } else {
            previewContent += '<div class="placeholder">Waiting for winners to be added...</div>';
        }
    } else if (activeWinners.length > 0) {
        // If no form entries but we have active winners
        let index = 1;
        let winnerCards = '';
        
        activeWinners.forEach(winner => {
            winnerCards += `
                <div class="winner-card">
                    <h2>Winner #${index}</h2>
                    <p class="winner-name">${winner.name || 'Anonymous'}</p>
                    <p class="winner-id">${winner.uniqueId || 'N/A'}</p>
                    <p class="winner-prize">${winner.prize || 'Prize'}</p>
                    <p class="winner-session">Session: ${winner.session || 'Default'}</p>
                </div>
            `;
            index++;
        });
        
        previewContent += winnerCards;
    } else {
        previewContent += '<div class="placeholder">Waiting for winners to be added...</div>';
    }
    
    previewContainer.innerHTML = previewContent;
}

function startTimer(seconds) {
    // Clear existing timer if any
    clearInterval(timerInterval);
    
    // Set start time
    const startTime = Date.now();
    localStorage.setItem('timerStartTime', startTime);
    localStorage.setItem('timerSeconds', seconds);
    localStorage.setItem('timerRunning', 'true');
    
    updateTimerDisplay(seconds);
    
    // Set interval for timer update
    timerInterval = setInterval(() => {
        const currentTime = Date.now();
        const elapsedSeconds = Math.floor((currentTime - startTime) / 1000);
        const remainingSeconds = Math.max(0, seconds - elapsedSeconds);
        
        updateTimerDisplay(remainingSeconds);
        
        if (remainingSeconds <= 0) {
            clearInterval(timerInterval);
            localStorage.setItem('timerRunning', 'false');
        }
    }, 1000);
}

function pauseTimer() {
    clearInterval(timerInterval);
    localStorage.setItem('timerRunning', 'false');
    
    // Calculate remaining time
    const startTime = parseInt(localStorage.getItem('timerStartTime') || 0);
    const totalSeconds = parseInt(localStorage.getItem('timerSeconds') || 0);
    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    localStorage.setItem('timerSeconds', Math.max(0, totalSeconds - elapsedSeconds));
}

function resetTimer() {
    clearInterval(timerInterval);
    localStorage.setItem('timerRunning', 'false');
    
    const minutes = parseInt(document.getElementById('timerMinutes').value);
    const seconds = minutes * 60;
    
    localStorage.setItem('timerSeconds', seconds);
    updateTimerDisplay(seconds);
}

function updateTimerDisplay(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    
    const timeString = `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    
    document.getElementById('timer')?.textContent = timeString;
    
    // Update localStorage for the display page
    localStorage.setItem('timerDisplay', timeString);
}

function updateWinnersHistoryTable() {
    const tableBody = document.getElementById('winners-history-body');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    winners.forEach((winner, index) => {
        // Get session info
        let sessionText = 'N/A';
        if (winner.sessionId) {
            const savedPlans = JSON.parse(localStorage.getItem('savedPlans') || '[]');
            for (const plan of savedPlans) {
                const session = plan.sessions.find(s => s.id === winner.sessionId);
                if (session) {
                    sessionText = `${plan.name} - Session ${session.number}`;
                    break;
                }
            }
        }
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${winner.playerID || 'N/A'}</td>
            <td>${winner.name}</td>
            <td>${winner.prize || 'N/A'}</td>
            <td>${sessionText}</td>
            <td>
                <span class="status-badge ${winner.claimed ? 'status-claimed' : (winner.disqualified ? 'status-disqualified' : 'status-active')}">
                    ${winner.claimed ? 'Claimed' : (winner.disqualified ? 'Disqualified' : 'Active')}
                </span>
            </td>
            <td class="winner-actions">
                ${!winner.claimed && !winner.disqualified ? 
                    `<button class="claim-button" data-index="${index}">Claim</button>` : ''}
                ${!winner.claimed && !winner.disqualified ? 
                    `<button class="disqualify-button" data-index="${index}">Disqualify</button>` : ''}
                ${winner.claimed || winner.disqualified ? 
                    `<button class="unclaim-button" data-index="${index}">Reset Status</button>` : ''}
                <button class="remove-winner-button" data-index="${index}">Remove</button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Setup control buttons
    setupWinnerControlButtons();
}

// Setup event listeners for winner control buttons
function setupWinnerControlButtons() {
    // Claim buttons
    document.querySelectorAll('.claim-button').forEach(button => {
        button.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            claimWinner(index);
        });
    });
    
    // Disqualify buttons
    document.querySelectorAll('.disqualify-button').forEach(button => {
        button.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            disqualifyWinner(index);
        });
    });
    
    // Unclaim buttons
    document.querySelectorAll('.unclaim-button').forEach(button => {
        button.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            unclaimWinner(index);
        });
    });
    
    // Remove winner buttons
    document.querySelectorAll('.remove-winner-button').forEach(button => {
        button.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            removeWinner(index);
        });
    });
}

function claimWinner(index) {
    if (index < 0 || index >= winners.length) return;
    
    winners[index].claimed = true;
    winners[index].disqualified = false;
    
    // Save to localStorage
    localStorage.setItem('winners', JSON.stringify(winners));
    
    // Update the history table and display
    updateWinnersHistoryTable();
}

function disqualifyWinner(index) {
    if (index < 0 || index >= winners.length) return;
    
    winners[index].disqualified = true;
    winners[index].claimed = false;
    
    // Save to localStorage
    localStorage.setItem('winners', JSON.stringify(winners));
    
    // Update the history table and display
    updateWinnersHistoryTable();
}

function unclaimWinner(index) {
    if (index < 0 || index >= winners.length) return;
    
    winners[index].claimed = false;
    winners[index].disqualified = false;
    
    // Save to localStorage
    localStorage.setItem('winners', JSON.stringify(winners));
    
    // Update the history table and display
    updateWinnersHistoryTable();
}

function removeWinner(index) {
    if (confirm('Are you sure you want to remove this winner? This action cannot be undone.')) {
        winners.splice(index, 1);
        localStorage.setItem('winners', JSON.stringify(winners));
        updateWinnersHistoryTable();
        updateWinnerDisplay();
        updatePreview();
    }
}

function exportWinnersToCSV() {
    // Include all winners regardless of claimed or disqualified status
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Name,ID,Time,Session,Prize,Status\n";
    
    winners.forEach(winner => {
        const status = winner.claimed ? 'Claimed' : (winner.disqualified ? 'Disqualified' : 'Active');
        const row = [
            winner.name || 'Anonymous',
            winner.uniqueId || 'N/A',
            winner.timestamp || new Date().toLocaleString(),
            winner.session || 'Default',
            winner.prize || 'Prize',
            status
        ].map(value => `"${value}"`).join(',');
        
        csvContent += row + "\n";
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "casino_winners_" + new Date().toISOString().split('T')[0] + ".csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function selectWinner() {
    const entriesContainer = document.getElementById('entries-container');
    const entries = entriesContainer.querySelectorAll('.winner-entry');
    
    // Check if we have a session selected
    if (!currentSessionId) {
        alert('Please select a session before submitting winners');
        return;
    }
    
    // Process each entry
    entries.forEach(entry => {
        const nameInput = entry.querySelector('.winner-name');
        const prizeDrop = entry.querySelector('.winner-prize');
        const playerIdInput = entry.querySelector('.player-id');
        
        const name = nameInput.value.trim();
        const prize = prizeDrop ? prizeDrop.value : '';
        const playerID = playerIdInput ? playerIdInput.value.trim() : '';
        
        // Skip empty entries
        if (!name) return;
        
        // Create winner object
        const winner = {
            name: name,
            prize: prize,
            playerID: playerID,
            drawingTime: new Date().toISOString(),
            sessionId: currentSessionId,
            claimed: false,
            disqualified: false
        };
        
        // Add to winners array
        winners.push(winner);
    });
    
    // Save winners to localStorage
    localStorage.setItem('winners', JSON.stringify(winners));
    
    // Update display
    updateWinnersHistoryTable();
    updateWinnerDisplay();
    updatePreview();
    
    // Clear entries
    entriesContainer.innerHTML = '';
    createWinnerEntry(true);
}

function updateWinnerDisplay() {
    const displayContainer = document.getElementById('displayWinners');
    if (!displayContainer) return;
    
    displayContainer.innerHTML = '';
    
    // Get active winners (not claimed or disqualified)
    const activeWinners = winners.filter(w => !w.claimed && !w.disqualified);
    
    activeWinners.forEach(winner => {
        const winnerCard = document.createElement('div');
        winnerCard.className = 'winner-card';
        winnerCard.innerHTML = `
            <div class="winner-name">${winner.name || 'Anonymous'}</div>
            <div class="winner-id">${winner.uniqueId || 'N/A'}</div>
            <div class="winner-prize">${winner.prize || 'Prize'}</div>
        `;
        displayContainer.appendChild(winnerCard);
    });
} 