document.addEventListener('DOMContentLoaded', function() {
    const entriesContainer = document.getElementById('entries-container');
    const addEntryButton = document.getElementById('addEntry');
    const form = document.getElementById('winnerForm');
    let entryCount = 0;

    // Set the API URL based on environment
    const API_URL = 'https://your-render-app-name.onrender.com'; // REPLACE with your actual Render URL

    // Function to create a new winner entry
    function createWinnerEntry() {
        const entryId = entryCount++;
        const entryDiv = document.createElement('div');
        entryDiv.className = 'winner-entry';
        entryDiv.dataset.id = entryId;

        entryDiv.innerHTML = `
            <div class="form-group">
                <label for="winner-${entryId}">Winner #${entryId + 1}</label>
                <input type="text" id="winner-${entryId}" name="winner-${entryId}" 
                    placeholder="Enter winner name and ID" required>
            </div>
            ${entryCount > 5 ? `<button type="button" class="remove-entry" data-id="${entryId}">Remove</button>` : ''}
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

    // Add initial 5 entries
    for (let i = 0; i < 5; i++) {
        createWinnerEntry();
    }

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
}); 