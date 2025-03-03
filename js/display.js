document.addEventListener('DOMContentLoaded', function() {
    const winnersDisplay = document.getElementById('winners-display');
    const headerImageContainer = document.getElementById('headerImageContainer');
    const timerElement = document.getElementById('timer');
    
    // Set the API URL based on environment
    const API_URL = 'https://casino-drawing-api.onrender.com'; // REPLACE with your actual Render URL when deployed
    
    // Function to display winners
    function displayWinners() {
        // Clear any existing content
        winnersDisplay.innerHTML = '';
        
        // Display header image if available
        const headerImage = localStorage.getItem('casinoHeaderImage');
        if (headerImage && headerImageContainer) {
            headerImageContainer.innerHTML = `<img src="${headerImage}" alt="Header">`;
        } else {
            headerImageContainer.innerHTML = '';
        }
        
        // Retrieve winners data from API
        fetch(`${API_URL}/api/winners`)
            .then(response => response.json())
            .then(winnersData => {
                if (winnersData.length === 0) {
                    winnersDisplay.innerHTML = '<div class="placeholder">Waiting for winners to be announced...</div>';
                    return;
                }
                
                // Format and display each winner
                winnersData.forEach((winner, index) => {
                    const winnerCard = document.createElement('div');
                    winnerCard.className = 'winner-card';
                    
                    // Format the drawing time
                    const drawingDate = new Date(winner.drawingTime);
                    const formattedDate = drawingDate.toLocaleString();
                    
                    winnerCard.innerHTML = `
                        <h2>Winner #${index + 1}</h2>
                        <p>${winner.winnerText}</p>
                        <p class="drawing-time">${formattedDate}</p>
                    `;
                    
                    winnersDisplay.appendChild(winnerCard);
                    
                    // Adding a slight delay for animation effect
                    setTimeout(() => {
                        winnerCard.style.opacity = '1';
                        winnerCard.style.transform = 'translateY(0)';
                    }, 100 * index);
                });
            })
            .catch(error => {
                console.error('Error fetching winners:', error);
                winnersDisplay.innerHTML = '<div class="placeholder">Error loading winners. Please try again later.</div>';
            });
    }
    
    // Initialize and manage timer
    function initializeTimer() {
        if (!timerElement) return;
        
        // Get timer state from localStorage
        const timerRunning = localStorage.getItem('timerRunning') === 'true';
        let timerSeconds = parseInt(localStorage.getItem('timerSeconds') || 300);
        const timerStartTime = parseInt(localStorage.getItem('timerStartTime') || 0);
        
        if (timerRunning && timerStartTime) {
            // Calculate elapsed time
            const currentTime = Date.now();
            const elapsedSeconds = Math.floor((currentTime - timerStartTime) / 1000);
            timerSeconds = Math.max(0, timerSeconds - elapsedSeconds);
        }
        
        updateDisplayTimer(timerSeconds);
        
        if (timerRunning && timerSeconds > 0) {
            startDisplayTimer(timerSeconds);
        }
        
        // Listen for timer updates
        window.addEventListener('storage', function(e) {
            if (e.key === 'timerDisplay') {
                timerElement.textContent = e.newValue;
            } else if (e.key === 'timerRunning') {
                const running = e.newValue === 'true';
                if (running) {
                    startDisplayTimer(parseInt(localStorage.getItem('timerSeconds') || 0));
                } else {
                    clearInterval(displayTimerInterval);
                }
            }
        });
    }
    
    let displayTimerInterval;
    
    function startDisplayTimer(seconds) {
        clearInterval(displayTimerInterval);
        
        let remaining = seconds;
        
        displayTimerInterval = setInterval(() => {
            remaining--;
            
            if (remaining <= 0) {
                clearInterval(displayTimerInterval);
                remaining = 0;
                
                // Timer finished effect
                timerElement.classList.add('timer-finished');
            }
            
            updateDisplayTimer(remaining);
        }, 1000);
    }
    
    function updateDisplayTimer(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        
        const timeString = `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        
        if (timerElement) {
            timerElement.textContent = timeString;
        }
    }
    
    // Initial display
    displayWinners();
    initializeTimer();
    
    // Auto-refresh winners every 10 seconds
    setInterval(displayWinners, 10000);
}); 