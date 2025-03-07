let winners = [];
let raffleEntries = [];
let currentAdditionalWinners = 0;
let timerInterval;
let currentSessionId = '';
let currentPlanName = '';

// Status message element
const statusMessage = document.createElement('div');
statusMessage.className = 'status-message';
statusMessage.style.display = 'none';

// Load existing winners from Firebase
async function loadExistingWinners() {
    try {
        statusMessage.textContent = "Loading winners...";
        statusMessage.style.display = "block";
        
        const loadedWinners = await firebaseWinners.getAllWinners();
        
        if (loadedWinners && loadedWinners.length > 0) {
            winners = loadedWinners;
            updateWinnersHistoryTable();
            statusMessage.textContent = `${winners.length} winners loaded`;
        } else {
            statusMessage.textContent = "No winners found in database";
        }
        
        setTimeout(() => {
            statusMessage.style.display = "none";
        }, 3000);
    } catch (error) {
        console.error("Error loading winners:", error);
        statusMessage.textContent = "Error loading winners from database";
        setTimeout(() => {
            statusMessage.style.display = "none";
        }, 3000);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Add status message to the container
    document.querySelector('.winners-history').appendChild(statusMessage);
    
    // Load any existing winners from Firebase
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
            clearAllWinners();
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

// Load saved plans from Firebase
async function loadSavedPlans() {
    try {
        const planSelector = document.getElementById('planSelector');
        
        // Clear existing options except the placeholder
        while (planSelector.options.length > 1) {
            planSelector.remove(1);
        }
        
        statusMessage.textContent = "Loading plans...";
        statusMessage.style.display = "block";
        
        // Get plans from Firebase
        const savedPlans = await firebasePlans.getAllPlans();
        
        // Add plans to selector
        if (savedPlans && savedPlans.length > 0) {
            savedPlans.forEach(plan => {
                const option = document.createElement('option');
                option.value = plan.name;
                option.textContent = `${plan.name} (${plan.date})`;
                planSelector.appendChild(option);
            });
            
            statusMessage.textContent = `${savedPlans.length} plans loaded`;
        } else {
            statusMessage.textContent = "No plans found";
        }
        
        setTimeout(() => {
            statusMessage.style.display = "none";
        }, 3000);
        
        // Check if we have an active plan
        const activePlan = await firebasePlans.getActivePlan();
        
        if (activePlan) {
            planSelector.value = activePlan.name;
            loadPlanSessions(activePlan.name);
        }
    } catch (error) {
        console.error("Error loading plans:", error);
        statusMessage.textContent = "Error loading plans from database";
        setTimeout(() => {
            statusMessage.style.display = "none";
        }, 3000);
    }
}

// Load sessions for the selected plan
async function loadPlanSessions(planName) {
    if (!planName) return;
    
    currentPlanName = planName;
    const sessionSelector = document.getElementById('sessionSelector');
    sessionSelector.disabled = false;
    
    // Clear existing sessions
    while (sessionSelector.options.length > 1) {
        sessionSelector.remove(1);
    }
    
    try {
        statusMessage.textContent = "Loading sessions...";
        statusMessage.style.display = "block";
        
        // Get the plan from Firebase
        const selectedPlan = await firebasePlans.getPlan(planName);
        
        if (!selectedPlan || !selectedPlan.sessions) {
            alert('No sessions found for this plan');
            statusMessage.textContent = "No sessions found for this plan";
            setTimeout(() => {
                statusMessage.style.display = "none";
            }, 3000);
            return;
        }
        
        // Add sessions to selector
        selectedPlan.sessions.forEach(session => {
            const option = document.createElement('option');
            option.value = session.id;
            option.textContent = `Session ${session.number} (${formatTimeForDisplay(session.startTime)} - ${formatTimeForDisplay(session.endTime)})`;
            sessionSelector.appendChild(option);
        });
        
        statusMessage.textContent = `${selectedPlan.sessions.length} sessions loaded`;
        setTimeout(() => {
            statusMessage.style.display = "none";
        }, 3000);
        
        // If there's an active session in this plan, select it
        if (selectedPlan.activeSession) {
            sessionSelector.value = selectedPlan.activeSession;
            currentSessionId = selectedPlan.activeSession;
            document.getElementById('endSessionBtn').disabled = false;
            updateTimerFromSession();
            
            // Refresh any winner entry forms to update prize options
            const entriesContainer = document.getElementById('entries-container');
            const hasEntries = entriesContainer.querySelectorAll('.winner-entry').length > 0;
            
            if (hasEntries) {
                // Save any data in the existing entries
                const entryData = [];
                entriesContainer.querySelectorAll('.winner-entry').forEach(entry => {
                    const nameInput = entry.querySelector('.winner-name');
                    const playerIdInput = entry.querySelector('.player-id');
                    
                    if (nameInput) {
                        entryData.push({
                            name: nameInput.value,
                            playerId: playerIdInput ? playerIdInput.value : ''
                        });
                    }
                });
                
                // Clear and recreate entries
                entriesContainer.innerHTML = '';
                
                if (entryData.length > 0) {
                    // Recreate entries with the saved data
                    entryData.forEach((data, index) => {
                        createWinnerEntry(index === 0);
                        const entries = entriesContainer.querySelectorAll('.winner-entry');
                        const lastEntry = entries[entries.length - 1];
                        
                        if (lastEntry) {
                            const nameInput = lastEntry.querySelector('.winner-name');
                            const playerIdInput = lastEntry.querySelector('.player-id');
                            
                            if (nameInput) nameInput.value = data.name;
                            if (playerIdInput) playerIdInput.value = data.playerId;
                        }
                    });
                } else {
                    // Create a default entry
                    createWinnerEntry(true);
                }
            }
            
            // Update preview with new session info
            updatePreview();
        }
    } catch (error) {
        console.error("Error loading sessions:", error);
        statusMessage.textContent = "Error loading sessions from database";
        setTimeout(() => {
            statusMessage.style.display = "none";
        }, 3000);
    }
}

// Clear all winners from Firebase
async function clearAllWinners() {
    try {
        statusMessage.textContent = "Clearing winners...";
        statusMessage.style.display = "block";
        
        // Clear winners from Firebase
        await firebaseWinners.clearAllWinners();
        
        // Clear local winners array
        winners = [];
        
        // Update UI
        updateWinnersHistoryTable();
        updateWinnerDisplay();
        updatePreview();
        
        statusMessage.textContent = "All winners cleared successfully";
        setTimeout(() => {
            statusMessage.style.display = "none";
        }, 3000);
    } catch (error) {
        console.error("Error clearing winners:", error);
        statusMessage.textContent = "Error clearing winners from database";
        setTimeout(() => {
            statusMessage.style.display = "none";
        }, 3000);
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
async function updateTimerFromSession() {
    if (!currentPlanName || !currentSessionId) return;
    
    try {
        // Get the plan from Firebase
        const plan = await firebasePlans.getPlan(currentPlanName);
        
        if (plan && plan.masterTimer) {
            document.getElementById('timerMinutes').value = plan.masterTimer;
        }
    } catch (error) {
        console.error("Error updating timer from session:", error);
    }
}

// End current session and save data
async function endCurrentSession() {
    if (!currentSessionId || !currentPlanName) {
        alert('No active session selected');
        return;
    }
    
    try {
        // Get current session details
        const plan = await firebasePlans.getPlan(currentPlanName);
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
        
        // Update plan in Firebase to remove active session
        plan.activeSession = '';
        await firebasePlans.savePlan(plan);
        await firebasePlans.setActivePlan(plan);
        
        statusMessage.textContent = `Session ${session.number} has been ended and data saved.`;
        statusMessage.style.display = "block";
        setTimeout(() => {
            statusMessage.style.display = "none";
        }, 3000);
    } catch (error) {
        console.error("Error ending session:", error);
        statusMessage.textContent = "Error ending session";
        statusMessage.style.display = "block";
        setTimeout(() => {
            statusMessage.style.display = "none";
        }, 3000);
    }
}

function createWinnerEntry(isRequired = false) {
    const container = document.getElementById('entries-container');
    const entryId = 'entry-' + Date.now();
    
    const entryDiv = document.createElement('div');
    entryDiv.className = 'winner-entry';
    entryDiv.id = entryId;
    
    // Get prizes from current plan
    let prizeOptions = '<option value="">Select a prize</option>';
    
    if (currentPlanName) {
        const savedPlans = JSON.parse(localStorage.getItem('savedPlans') || '[]');
        const selectedPlan = savedPlans.find(plan => plan.name === currentPlanName);
        
        if (selectedPlan && selectedPlan.prizes && selectedPlan.prizes.length > 0) {
            selectedPlan.prizes.forEach(prize => {
                const displayValue = prize.value ? ` ($${prize.value})` : '';
                prizeOptions += `<option value="${prize.name}">${prize.name}${displayValue}</option>`;
            });
        }
        
        // Also check for session-specific prizes
        if (currentSessionId && selectedPlan.sessions) {
            const currentSession = selectedPlan.sessions.find(s => s.id === currentSessionId);
            if (currentSession && currentSession.prizes && currentSession.prizes.length > 0) {
                // Add session prizes that aren't already in the dropdown
                currentSession.prizes.forEach(prizeText => {
                    // Extract prize name from text which might contain value in parentheses
                    const prizeName = prizeText.replace(/\s*\([^)]*\)\s*$/, '').trim();
                    if (!prizeOptions.includes(`value="${prizeName}"`)) {
                        prizeOptions += `<option value="${prizeName}">${prizeText}</option>`;
                    }
                });
            }
        }
    }
    
    entryDiv.innerHTML = `
        <div>
            <div class="form-group">
                <label for="${entryId}-name">Winner Name:</label>
                <input type="text" id="${entryId}-name" class="winner-name" ${isRequired ? 'required' : ''} placeholder="Enter winner name">
            </div>
            <div class="form-group">
                <label for="${entryId}-id">Player ID:</label>
                <input type="text" id="${entryId}-id" class="player-id" placeholder="Enter player ID (optional)">
            </div>
            <div class="form-group">
                <label for="${entryId}-prize">Prize:</label>
                <select id="${entryId}-prize" class="winner-prize">
                    ${prizeOptions}
                </select>
            </div>
        </div>
        ${!isRequired ? `<button type="button" class="remove-entry" onclick="removeEntry('${entryId}')">×</button>` : ''}
    `;
    
    container.appendChild(entryDiv);
    
    // Update preview when entry fields change
    entryDiv.querySelectorAll('input, select').forEach(input => {
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
    const entries = document.querySelectorAll('.winner-entry');
    
    // Clear preview
    previewContainer.innerHTML = '';
    
    // If no entries, show placeholder
    if (entries.length === 0) {
        previewContainer.innerHTML = '<div class="placeholder">Waiting for winners to be added...</div>';
        return;
    }
    
    // Add session information if available
    if (currentPlanName && currentSessionId) {
        const sessionInfo = document.createElement('div');
        sessionInfo.className = 'session-info';
        
        const savedPlans = JSON.parse(localStorage.getItem('savedPlans') || '[]');
        const plan = savedPlans.find(p => p.name === currentPlanName);
        
        if (plan) {
            const session = plan.sessions.find(s => s.id === currentSessionId);
            if (session) {
                sessionInfo.innerHTML = `
                    <h3>${plan.name}</h3>
                    <p>Session ${session.number} (${formatTimeForDisplay(session.startTime)} - ${formatTimeForDisplay(session.endTime)})</p>
                `;
                previewContainer.appendChild(sessionInfo);
            }
        }
    }
    
    // Get header image if available
    const headerImage = localStorage.getItem('casinoHeaderImage');
    if (headerImage) {
        const imgContainer = document.createElement('div');
        imgContainer.className = 'header-image';
        imgContainer.innerHTML = `<img src="${headerImage}" alt="Header Image">`;
        previewContainer.appendChild(imgContainer);
    }
    
    // Add winner cards
    entries.forEach(entry => {
        const nameInput = entry.querySelector('.winner-name');
        const playerIdInput = entry.querySelector('.player-id');
        const prizeSelect = entry.querySelector('.winner-prize');
        
        if (nameInput && (nameInput.value.trim() || (prizeSelect && prizeSelect.value))) {
            const card = document.createElement('div');
            card.className = 'winner-card';
            
            const name = nameInput.value.trim() || 'Winner';
            const playerId = playerIdInput ? playerIdInput.value.trim() : '';
            const prize = prizeSelect ? prizeSelect.options[prizeSelect.selectedIndex].text : '';
            
            card.innerHTML = `
                <h2>${name}</h2>
                ${playerId ? `<p class="player-id">ID: ${playerId}</p>` : ''}
                ${prize ? `<p class="prize">Prize: ${prize}</p>` : ''}
                <p class="drawing-time">Drawing Time: ${new Date().toLocaleTimeString()}</p>
            `;
            
            previewContainer.appendChild(card);
        }
    });
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

async function claimWinner(index) {
    try {
        const winner = winners[index];
        
        statusMessage.textContent = "Updating winner status...";
        statusMessage.style.display = "block";
        
        // Update in Firebase
        await firebaseWinners.updateWinnerStatus(winner.drawingTime, {
            claimed: true,
            disqualified: false
        });
        
        // Update locally
        winner.claimed = true;
        winner.disqualified = false;
        
        // Update UI
        updateWinnersHistoryTable();
        updateWinnerDisplay();
        updatePreview();
        
        statusMessage.textContent = "Winner status updated to Claimed";
        setTimeout(() => {
            statusMessage.style.display = "none";
        }, 3000);
    } catch (error) {
        console.error("Error claiming winner:", error);
        statusMessage.textContent = "Error updating winner status";
        setTimeout(() => {
            statusMessage.style.display = "none";
        }, 3000);
    }
}

async function disqualifyWinner(index) {
    try {
        const winner = winners[index];
        
        statusMessage.textContent = "Updating winner status...";
        statusMessage.style.display = "block";
        
        // Update in Firebase
        await firebaseWinners.updateWinnerStatus(winner.drawingTime, {
            claimed: false,
            disqualified: true
        });
        
        // Update locally
        winner.claimed = false;
        winner.disqualified = true;
        
        // Update UI
        updateWinnersHistoryTable();
        updateWinnerDisplay();
        updatePreview();
        
        statusMessage.textContent = "Winner status updated to Disqualified";
        setTimeout(() => {
            statusMessage.style.display = "none";
        }, 3000);
    } catch (error) {
        console.error("Error disqualifying winner:", error);
        statusMessage.textContent = "Error updating winner status";
        setTimeout(() => {
            statusMessage.style.display = "none";
        }, 3000);
    }
}

async function unclaimWinner(index) {
    try {
        const winner = winners[index];
        
        statusMessage.textContent = "Updating winner status...";
        statusMessage.style.display = "block";
        
        // Update in Firebase
        await firebaseWinners.updateWinnerStatus(winner.drawingTime, {
            claimed: false,
            disqualified: false
        });
        
        // Update locally
        winner.claimed = false;
        winner.disqualified = false;
        
        // Update UI
        updateWinnersHistoryTable();
        updateWinnerDisplay();
        updatePreview();
        
        statusMessage.textContent = "Winner status reset to Active";
        setTimeout(() => {
            statusMessage.style.display = "none";
        }, 3000);
    } catch (error) {
        console.error("Error resetting winner status:", error);
        statusMessage.textContent = "Error updating winner status";
        setTimeout(() => {
            statusMessage.style.display = "none";
        }, 3000);
    }
}

async function removeWinner(index) {
    if (confirm('Are you sure you want to remove this winner? This action cannot be undone.')) {
        try {
            const winner = winners[index];
            
            statusMessage.textContent = "Removing winner...";
            statusMessage.style.display = "block";
            
            // Delete from Firebase
            await firebaseWinners.deleteWinner(winner.drawingTime);
            
            // Remove from local array
            winners.splice(index, 1);
            
            // Update UI
            updateWinnersHistoryTable();
            updateWinnerDisplay();
            updatePreview();
            
            statusMessage.textContent = "Winner removed successfully";
            setTimeout(() => {
                statusMessage.style.display = "none";
            }, 3000);
        } catch (error) {
            console.error("Error removing winner:", error);
            statusMessage.textContent = "Error removing winner from database";
            setTimeout(() => {
                statusMessage.style.display = "none";
            }, 3000);
        }
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

async function selectWinner() {
    const entriesContainer = document.getElementById('entries-container');
    const entries = entriesContainer.querySelectorAll('.winner-entry');
    
    // Check if we have a session selected
    if (!currentSessionId) {
        alert('Please select a session before submitting winners');
        return;
    }
    
    try {
        statusMessage.textContent = "Saving winners...";
        statusMessage.style.display = "block";
        
        // Track if we actually added any winners
        let winnersAdded = 0;
        
        // Process each entry
        for (const entry of entries) {
            const nameInput = entry.querySelector('.winner-name');
            const prizeDrop = entry.querySelector('.winner-prize');
            const playerIdInput = entry.querySelector('.player-id');
            
            const name = nameInput.value.trim();
            const prize = prizeDrop ? prizeDrop.value : '';
            const playerID = playerIdInput ? playerIdInput.value.trim() : '';
            
            // Skip empty entries
            if (!name) continue;
            
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
            
            // Save winner to Firebase
            await firebaseWinners.saveWinner(winner);
            
            // Add to local winners array
            winners.push(winner);
            winnersAdded++;
        }
        
        // Update display
        updateWinnersHistoryTable();
        updateWinnerDisplay();
        updatePreview();
        
        // Clear entries
        entriesContainer.innerHTML = '';
        createWinnerEntry(true);
        
        if (winnersAdded > 0) {
            statusMessage.textContent = `${winnersAdded} winner(s) saved successfully`;
        } else {
            statusMessage.textContent = "No winners were added";
        }
        
        setTimeout(() => {
            statusMessage.style.display = "none";
        }, 3000);
    } catch (error) {
        console.error("Error saving winners:", error);
        statusMessage.textContent = "Error saving winners to database";
        setTimeout(() => {
            statusMessage.style.display = "none";
        }, 3000);
    }
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