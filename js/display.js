document.addEventListener('DOMContentLoaded', function() {
    const winnersDisplay = document.getElementById('winners-display');
    const headerContainer = document.getElementById('headerImageContainer');
    const timer = document.getElementById('timer');
    const promotionHeader = document.getElementById('promotionHeader');
    
    let timerInterval;
    let activePlan = null;
    let winnersUnsubscribe = null; // Store the unsubscribe function for Firestore listener
    
    // Initialize by loading active plan and winners
    initializeDisplay();
    
    // Set up real-time listener for winners
    function initializeDisplay() {
        // Try to get active plan first
        getActivePlan().then(plan => {
            if (plan) {
                activePlan = plan;
                updateHeader(plan.name);
                
                // Set timer to plan's master timer
                if (plan.masterTimer) {
                    initializeTimer(plan.masterTimer * 60);
                } else {
                    initializeTimer(300); // Default 5 minutes
                }
                
                // If there's an active session, highlight that in the display
                if (plan.activeSession) {
                    const activeSession = plan.sessions.find(s => s.id === plan.activeSession);
                    if (activeSession) {
                        const sessionInfo = document.createElement('div');
                        sessionInfo.className = 'session-info';
                        sessionInfo.innerHTML = `
                            <p>Current Session: ${activeSession.number} 
                            (${formatTimeForDisplay(activeSession.startTime)} - ${formatTimeForDisplay(activeSession.endTime)})</p>
                        `;
                        winnersDisplay.appendChild(sessionInfo);
                    }
                }
            }
        });
        
        // Set up real-time listener for winners
        setupWinnersListener();
        
        // Check for a saved header image
        const headerImage = localStorage.getItem('casinoHeaderImage');
        if (headerImage) {
            headerContainer.innerHTML = `<img src="${headerImage}" alt="Header">`;
        }
    }
    
    // Get active plan from Firebase
    async function getActivePlan() {
        try {
            return await firebasePlans.getActivePlan();
        } catch (error) {
            console.error('Error getting active plan:', error);
            return null;
        }
    }
    
    // Set up real-time listener for winners
    function setupWinnersListener() {
        // If there's an existing listener, unsubscribe first
        if (winnersUnsubscribe) {
            winnersUnsubscribe();
        }
        
        // Create the Firestore query to listen for winner updates
        const winnersRef = db.collection('winners');
        
        // Set up the listener
        winnersUnsubscribe = winnersRef.onSnapshot(snapshot => {
            const winners = [];
            
            snapshot.forEach(doc => {
                winners.push(doc.data());
            });
            
            // Only show active winners (not claimed or disqualified)
            const activeWinners = winners.filter(w => !w.claimed && !w.disqualified);
            
            // If we have an active session, filter to just that session's winners
            if (activePlan && activePlan.activeSession) {
                const sessionWinners = activeWinners.filter(w => w.sessionId === activePlan.activeSession);
                displayWinners(sessionWinners);
            } else {
                displayWinners(activeWinners);
            }
        }, error => {
            console.error('Error listening for winners:', error);
        });
    }
    
    // Display winners on the page
    function displayWinners(winners) {
        // Clear current display
        winnersDisplay.innerHTML = '';
        
        // Add session info if we have an active plan with active session
        if (activePlan && activePlan.activeSession) {
            const activeSession = activePlan.sessions.find(s => s.id === activePlan.activeSession);
            if (activeSession) {
                const sessionInfo = document.createElement('div');
                sessionInfo.className = 'session-info';
                sessionInfo.innerHTML = `
                    <p>Current Session: ${activeSession.number} 
                    (${formatTimeForDisplay(activeSession.startTime)} - ${formatTimeForDisplay(activeSession.endTime)})</p>
                `;
                winnersDisplay.appendChild(sessionInfo);
            }
        }
        
        // If no winners, show placeholder
        if (winners.length === 0) {
            winnersDisplay.innerHTML += '<div class="placeholder">Waiting for winners to be announced...</div>';
            return;
        }
        
        // Add each winner
        winners.forEach(winner => {
            const card = document.createElement('div');
            card.className = 'winner-card';
            
            const name = winner.name || 'Winner';
            const playerId = winner.playerID || '';
            const prize = winner.prize || '';
            
            card.innerHTML = `
                <h2>${name}</h2>
                ${playerId ? `<p class="player-id">ID: ${playerId}</p>` : ''}
                ${prize ? `<p class="prize">Prize: ${prize}</p>` : ''}
            `;
            
            winnersDisplay.appendChild(card);
        });
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
    
    // Update header with promotion name
    function updateHeader(name) {
        if (name) {
            promotionHeader.textContent = name;
        }
    }
    
    // Initialize timer
    function initializeTimer(seconds) {
        updateDisplayTimer(seconds);
        
        // Listen for timer updates from the input page
        db.collection('config').doc('timer').onSnapshot(doc => {
            if (doc.exists) {
                const timerData = doc.data();
                if (timerData.isRunning) {
                    startDisplayTimer(timerData.seconds);
                } else {
                    if (timerInterval) {
                        clearInterval(timerInterval);
                        timerInterval = null;
                    }
                    updateDisplayTimer(timerData.seconds);
                }
            }
        });
    }
    
    // Start timer
    function startDisplayTimer(seconds) {
        // Clear existing interval if any
        if (timerInterval) {
            clearInterval(timerInterval);
        }
        
        let remainingSeconds = seconds;
        updateDisplayTimer(remainingSeconds);
        
        timerInterval = setInterval(function() {
            remainingSeconds--;
            
            if (remainingSeconds <= 0) {
                clearInterval(timerInterval);
                timerInterval = null;
                timer.classList.add('timer-finished');
                
                // Add blinking animation
                timer.style.animation = 'blink 1s infinite';
            }
            
            updateDisplayTimer(remainingSeconds);
        }, 1000);
    }
    
    // Update timer display
    function updateDisplayTimer(seconds) {
        // Ensure seconds is not negative
        seconds = Math.max(0, seconds);
        
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        
        timer.textContent = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
        
        // Remove timer-finished class and animation if seconds > 0
        if (seconds > 0 && timer.classList.contains('timer-finished')) {
            timer.classList.remove('timer-finished');
            timer.style.animation = '';
        }
    }
}); 