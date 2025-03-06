let winners = [];
let raffleEntries = [];
let currentAdditionalWinners = 0;
let timerInterval;

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
    
    document.getElementById('pauseTimer').addEventListener('click', pauseTimer);
    document.getElementById('resetTimer').addEventListener('click', resetTimer);
    
    // Add navigation buttons at the top of the container
    const container = document.querySelector('.container');
    const nav = document.createElement('div');
    nav.className = 'main-nav';
    
    nav.innerHTML = `
        <a href="index.html" class="nav-button active">Drawing Page</a>
        <a href="display.html" target="_blank" class="nav-button">Display Page</a>
        <a href="planning.html" class="nav-button">Planning Page</a>
    `;
    
    container.querySelector('header').appendChild(nav);
    
    // Add winners history table to the page
    const winnersHistorySection = document.createElement('div');
    winnersHistorySection.className = 'winners-history';
    winnersHistorySection.innerHTML = `
        <h2>Winners History</h2>
        <table class="winners-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>ID</th>
                    <th>Drawing Time</th>
                    <th>Session</th>
                    <th>Prize</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody id="winners-history-body">
            </tbody>
        </table>
    `;
    
    document.querySelector('.container').appendChild(winnersHistorySection);
    
    // Update any existing winners in the history table
    updateWinnersHistoryTable();
    
    // Initial preview update
    updatePreview();
});

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
        const row = document.createElement('tr');
        
        const status = winner.claimed ? 'claimed' : (winner.disqualified ? 'disqualified' : 'active');
        const statusText = status.charAt(0).toUpperCase() + status.slice(1);
        
        row.innerHTML = `
            <td>${winner.name || 'Anonymous'}</td>
            <td>${winner.uniqueId || 'N/A'}</td>
            <td>${winner.timestamp || new Date().toLocaleString()}</td>
            <td>${winner.session || 'Default'}</td>
            <td>${winner.prize || 'Prize'}</td>
            <td><span class="status-badge status-${status}">${statusText}</span></td>
            <td class="winner-actions">
                ${!winner.claimed && !winner.disqualified ? 
                  `<button class="claim-button" data-index="${index}">Claim</button>
                   <button class="disqualify-button" data-index="${index}">Disqualify</button>` : 
                  `<button class="unclaim-button" data-index="${index}">Unclaim</button>`}
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Add event listeners to the new buttons
    document.querySelectorAll('.claim-button').forEach(button => {
        button.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            claimWinner(index);
        });
    });
    
    document.querySelectorAll('.disqualify-button').forEach(button => {
        button.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            disqualifyWinner(index);
        });
    });
    
    document.querySelectorAll('.unclaim-button').forEach(button => {
        button.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            unclaimWinner(index);
        });
    });
    
    // Also update the display
    updateWinnerDisplay();
    updatePreview();
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
    // Gather information from form
    const entries = document.querySelectorAll('.winner-entry');
    entries.forEach(entry => {
        const nameInput = entry.querySelector('.winner-name');
        const idInput = entry.querySelector('.winner-id');
        
        if (idInput && idInput.value) {
            const displayName = nameInput ? nameInput.value : 'Anonymous';
            const uniqueId = idInput.value;
            
            // Get the active session and prize from planning data if available
            const activePlan = JSON.parse(localStorage.getItem('activePlan')) || {};
            const activeSession = activePlan.activeSession || 'Default';
            const prizes = activePlan.prizes || [];
            
            // Find an available prize for this session
            let prize = "Prize";
            if (prizes.length > 0) {
                const availablePrizes = prizes.filter(p => !p.assigned);
                if (availablePrizes.length > 0) {
                    prize = availablePrizes[0].name;
                    // Mark this prize as assigned
                    const prizeIndex = prizes.findIndex(p => p.name === prize && !p.assigned);
                    if (prizeIndex !== -1) {
                        prizes[prizeIndex].assigned = true;
                    }
                }
            }
            
            // Add more info to the winner object
            const winner = {
                name: displayName,
                uniqueId: uniqueId,
                timestamp: new Date().toLocaleString(),
                session: activeSession,
                prize: prize,
                claimed: false,
                disqualified: false
            };
            
            winners.push(winner);
            
            // Update the planning data if we assigned a prize
            if (activePlan && prizes.length > 0) {
                activePlan.prizes = prizes;
                localStorage.setItem('activePlan', JSON.stringify(activePlan));
            }
        }
    });
    
    // Clear inputs after submission (except the first required one)
    entries.forEach((entry, index) => {
        if (index > 0) {
            entry.remove();
        } else {
            entry.querySelector('.winner-name').value = '';
            entry.querySelector('.winner-id').value = '';
        }
    });
    
    // Save winners to localStorage
    localStorage.setItem('winners', JSON.stringify(winners));
    
    // Update the history table
    updateWinnersHistoryTable();
    
    // Create a new empty winner entry
    createWinnerEntry(true);
    
    // Update the preview
    updatePreview();
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