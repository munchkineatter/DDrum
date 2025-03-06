document.addEventListener('DOMContentLoaded', function() {
    const entriesContainer = document.getElementById('entries-container');
    const addEntryButton = document.getElementById('addEntry');
    const form = document.getElementById('winnerForm');
    let entryCount = 0;

    // Set the API URL based on environment
    const API_URL = 'https://casino-drawing-system.onrender.com'; // Actual Render service URL

    // Function to create a new winner entry
    function createWinnerEntry(isRequired = false) {
        const entryId = entryCount++;
        const entryDiv = document.createElement('div');
        entryDiv.className = 'winner-entry';
        entryDiv.dataset.id = entryId;

        entryDiv.innerHTML = `
            <div class="form-group">
                <label for="winner-${entryId}">Winner #${entryId + 1} ${isRequired ? '*' : '(optional)'}</label>
                <input type="text" id="winner-${entryId}" name="winner-${entryId}" 
                    placeholder="Enter winner name and ID" ${isRequired ? 'required' : ''}>
            </div>
            ${entryId > 0 ? `<button type="button" class="remove-entry" data-id="${entryId}">Remove</button>` : ''}
        `;

        entriesContainer.appendChild(entryDiv);
        
        // Add event listener for the remove button if it exists
        const removeButton = entryDiv.querySelector('.remove-entry');
        if (removeButton) {
            removeButton.addEventListener('click', function() {
                entriesContainer.removeChild(entryDiv);
            });
        }
    }

    // Add only one required entry initially
    createWinnerEntry(true); // First entry is required

    // Add event listener for the Add Winner button
    addEntryButton.addEventListener('click', createWinnerEntry);

    // Function to handle header image
    function previewHeaderImage(input) {
        const preview = document.getElementById('imagePreview');
        const file = input.files[0];
        
        if (file) {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                // Display preview
                preview.innerHTML = `<img src="${e.target.result}" alt="Header preview">`;
                
                // Store image in localStorage (as base64)
                localStorage.setItem('casinoHeaderImage', e.target.result);
                
                // Update the display preview
                updatePreview();
            }
            
            reader.readAsDataURL(file);
        }
    }

    // Make previewHeaderImage globally accessible
    window.previewHeaderImage = previewHeaderImage;

    // Function to update preview
    function updatePreview() {
        const previewContainer = document.getElementById('displayPreview');
        let previewHTML = '';
        
        // Add header image if it exists
        const headerImage = localStorage.getItem('casinoHeaderImage');
        if (headerImage) {
            previewHTML += `<div class="header-image"><img src="${headerImage}" alt="Header"></div>`;
        }
        
        // Add timer display
        previewHTML += `<div class="timer" id="previewTimer">05:00</div>`;
        
        // Fetch latest winners for the preview
        fetch(`${API_URL}/api/winners`)
            .then(response => response.json())
            .then(winners => {
                if (winners.length > 0) {
                    const recentWinners = winners.slice(-3); // Get last 3 winners
                    
                    recentWinners.forEach((winner, index) => {
                        previewHTML += `
                            <div class="winner-card">
                                <h2>Winner #${index + 1}</h2>
                                <p>${winner.winnerText}</p>
                            </div>
                        `;
                    });
                } else {
                    previewHTML += '<div class="placeholder">No winners yet</div>';
                }
                
                previewContainer.innerHTML = previewHTML;
            })
            .catch(error => {
                console.error('Error fetching winners:', error);
                previewHTML += '<div class="placeholder">Error loading winners</div>';
                previewContainer.innerHTML = previewHTML;
            });
    }

    // Timer functions
    let timerInterval;
    let timerSeconds = 5 * 60; // Default 5 minutes
    let timerRunning = false;

    function startTimer(seconds) {
        if (seconds) timerSeconds = seconds;
        
        clearInterval(timerInterval);
        timerRunning = true;
        
        localStorage.setItem('timerSeconds', timerSeconds);
        localStorage.setItem('timerRunning', true);
        localStorage.setItem('timerStartTime', Date.now());
        
        updateTimerDisplay();
    }

    function pauseTimer() {
        clearInterval(timerInterval);
        timerRunning = false;
        localStorage.setItem('timerRunning', false);
        localStorage.setItem('timerSeconds', timerSeconds);
    }

    function resetTimer() {
        clearInterval(timerInterval);
        timerRunning = false;
        timerSeconds = 5 * 60; // Reset to 5 minutes
        
        localStorage.setItem('timerSeconds', timerSeconds);
        localStorage.setItem('timerRunning', false);
        
        updateTimerDisplay();
    }

    function updateTimerDisplay() {
        const minutes = Math.floor(timerSeconds / 60);
        const seconds = timerSeconds % 60;
        
        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Update preview timer
        const previewTimer = document.getElementById('previewTimer');
        if (previewTimer) {
            previewTimer.textContent = timeString;
        }
        
        localStorage.setItem('timerDisplay', timeString);
    }

    // Add event listeners for timer controls
    document.getElementById('startTimer').addEventListener('click', function() {
        const minutes = parseInt(document.getElementById('timerMinutes').value);
        startTimer(minutes * 60);
    });

    document.getElementById('pauseTimer').addEventListener('click', pauseTimer);
    document.getElementById('resetTimer').addEventListener('click', resetTimer);

    // Form submission
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const winners = [];
        const timestamp = new Date();
        
        // Collect all winner entries
        document.querySelectorAll('.winner-entry').forEach(entry => {
            const entryId = entry.dataset.id;
            
            winners.push({
                winnerText: document.getElementById(`winner-${entryId}`).value,
                drawingTime: timestamp.toISOString(),
            });
        });
        
        // Send winners to the API
        fetch(`${API_URL}/api/winners`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(winners)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Start the timer
            startTimer(5 * 60); // 5 minutes in seconds
            
            // Update the preview
            updatePreview();
            
            // Navigate to the display page
            alert('Winners submitted successfully! Opening display page...');
            window.open('display.html', '_blank');
        })
        .catch(error => {
            console.error('Error submitting winners:', error);
            alert('Error submitting winners. Please try again.');
        });
    });

    // CSV Export
    document.getElementById('exportCSV').addEventListener('click', function() {
        fetch(`${API_URL}/api/winners`)
            .then(response => response.json())
            .then(winners => {
                if (winners.length === 0) {
                    alert('No data to export');
                    return;
                }
                
                // Create CSV content
                let csvContent = 'Winner,Drawing Time\n';
                
                winners.forEach(winner => {
                    const formattedDate = new Date(winner.drawingTime).toLocaleString();
                    csvContent += `"${winner.winnerText}","${formattedDate}"\n`;
                });
                
                // Create download link
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                
                link.setAttribute('href', url);
                link.setAttribute('download', 'casino_winners.csv');
                link.style.visibility = 'hidden';
                
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            })
            .catch(error => {
                console.error('Error fetching winners for export:', error);
                alert('Error exporting data. Please try again.');
            });
    });

    // Clear data
    document.getElementById('clearData').addEventListener('click', function() {
        if (confirm('Are you sure you want to clear all winner data? This cannot be undone.')) {
            fetch(`${API_URL}/api/winners`, {
                method: 'DELETE',
            })
            .then(response => response.json())
            .then(data => {
                updatePreview();
                alert('All winner data has been cleared.');
            })
            .catch(error => {
                console.error('Error clearing data:', error);
                alert('Error clearing data. Please try again.');
            });
        }
    });

    // Initial preview update
    updatePreview();

    // Add navigation buttons at the top of the container
    const container = document.querySelector('.container');
    const nav = document.createElement('div');
    nav.className = 'main-nav';
    
    nav.innerHTML = `
        <a href="index.html" class="nav-button">Drawing Page</a>
        <a href="planning.html" class="nav-button">Planning Page</a>
    `;
    
    container.prepend(nav);
    
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
});

// Add these new functions for winner status management

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
    // ... existing code ...
    
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
    
    // ... existing code (for download) ...
}

// Modify the selectWinner function to add session and prize info
function selectWinner() {
    // ... existing code ...
    
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
    
    // ... existing code ...
    
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
    
    // ... existing code ...
    
    // Update the history table
    updateWinnersHistoryTable();
    
    // ... existing code ...
}

// Update the updateWinnerDisplay function to handle claimed and disqualified winners
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