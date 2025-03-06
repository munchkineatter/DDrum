document.addEventListener('DOMContentLoaded', function() {
    const winnersDisplay = document.getElementById('winners-display');
    const headerImageContainer = document.getElementById('headerImageContainer');
    const timerElement = document.getElementById('timer');
    
    // Set the API URL based on environment
    const API_URL = 'https://casino-drawing-system.onrender.com'; // Actual Render service URL
    
    // Add navigation at the top
    const container = document.querySelector('.container');
    const nav = document.createElement('div');
    nav.className = 'main-nav';
    
    nav.innerHTML = `
        <a href="index.html" class="nav-button">Drawing Page</a>
        <a href="planning.html" class="nav-button">Planning Page</a>
    `;
    
    // Insert after header
    const header = document.querySelector('header');
    header.after(nav);
    
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
        
        // Get winners from localStorage for offline support
        const localWinners = JSON.parse(localStorage.getItem('winners') || '[]');
        
        // Filter out claimed and disqualified winners
        const activeWinners = localWinners.filter(winner => !winner.claimed && !winner.disqualified);
        
        // Display placeholder if no active winners
        if (activeWinners.length === 0) {
            winnersDisplay.innerHTML = '<div class="placeholder">Waiting for winners to be announced...</div>';
            return;
        }
        
        // Format and display each winner
        activeWinners.forEach((winner, index) => {
            const winnerCard = document.createElement('div');
            winnerCard.className = 'winner-card';
            
            // Format the drawing time
            const drawingTime = winner.timestamp || new Date().toLocaleString();
            
            winnerCard.innerHTML = `
                <h2>Winner #${index + 1}</h2>
                <p class="winner-name">${winner.name || 'Anonymous'}</p>
                <p class="winner-id">${winner.uniqueId || 'N/A'}</p>
                <p class="winner-prize">${winner.prize || 'Prize'}</p>
                <p class="drawing-time">${drawingTime}</p>
                <p class="winner-session">Session: ${winner.session || 'Default'}</p>
            `;
            
            winnersDisplay.appendChild(winnerCard);
            
            // Adding a slight delay for animation effect
            setTimeout(() => {
                winnerCard.style.opacity = '1';
                winnerCard.style.transform = 'translateY(0)';
            }, 100 * index);
        });
        
        // Also try to fetch from API as a backup
        fetch(`${API_URL}/api/winners`)
            .then(response => response.json())
            .then(winnersData => {
                // If we already have local winners, don't display API winners
                if (localWinners.length > 0) return;
                
                if (winnersData.length === 0) {
                    if (activeWinners.length === 0) {
                        winnersDisplay.innerHTML = '<div class="placeholder">Waiting for winners to be announced...</div>';
                    }
                    return;
                }
                
                // Only if we don't have local winners, display API winners
                if (activeWinners.length === 0) {
                    winnersDisplay.innerHTML = ''; // Clear placeholder
                    
                    // Format and display each winner from API
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
                }
            })
            .catch(error => {
                console.error('Error fetching winners:', error);
                // Only show error if we don't have local winners
                if (activeWinners.length === 0) {
                    winnersDisplay.innerHTML = '<div class="placeholder">Error loading winners. Please try again later.</div>';
                }
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
    
    // Listen for storage events to update winners and timer
    window.addEventListener('storage', function(e) {
        if (e.key === 'winners' || e.key === 'casinoHeaderImage') {
            // Refresh winners display when winners data changes
            displayWinners();
        } else if (e.key === 'timerSeconds' || e.key === 'timerRunning' || e.key === 'timerStartTime' || e.key === 'timerDisplay') {
            // Only update the timer, not the winners list
            // Timer updates are already handled in initializeTimer()
        }
    });
}); 