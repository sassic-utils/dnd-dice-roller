// DOM Elements
const userNameInput = document.getElementById('user-name');
const diceButtons = document.querySelectorAll('.dice-btn');
const rollButton = document.getElementById('roll-btn');
const diceResult = document.getElementById('dice-result');
const diceType = document.getElementById('dice-type');
const historyList = document.getElementById('history-list');
const diceCountInput = document.getElementById('dice-count');
const decreaseDiceBtn = document.getElementById('decrease-dice');
const increaseDiceBtn = document.getElementById('increase-dice');
const countPresetButtons = document.querySelectorAll('.count-btn');
const rollTotalDisplay = document.getElementById('roll-total');
const showAllBtn = document.getElementById('show-all-btn');
const showMineBtn = document.getElementById('show-mine-btn');
const loadingIndicator = document.getElementById('loading-indicator');

// App State
let selectedDice = null;
let userName = '';
let rollHistory = [];
let diceCount = 1;
let userId = null;
let showOnlyMyRolls = false;
let subscription = null;

function setDiceCount(nextCount) {
    let count = parseInt(nextCount) || 1;
    if (count < 1) count = 1;
    if (count > 20) count = 20;
    diceCountInput.value = count;
    updateDiceTypeDisplay();
    updateCountPresetActiveState();
}

function updateCountPresetActiveState() {
    const current = parseInt(diceCountInput.value) || 1;
    countPresetButtons.forEach(btn => {
        const btnCount = parseInt(btn.dataset.count);
        btn.classList.toggle('active', btnCount === current);
    });
}

// Initialize app and load data from Supabase
const initialize = async () => {
    // Get saved user data
    const savedUserName = localStorage.getItem('dndDiceRollerUserName');
    const savedUserId = localStorage.getItem('supabaseUserId');
    
    if (savedUserName) {
        userName = savedUserName;
        userNameInput.value = userName;
    }
    
    // Set up real-time subscription
    setupRealtimeSubscription();
    
    // Load initial history data
    await loadRollHistory();

    // Sync preset button state with the current input value
    updateCountPresetActiveState();
};

// Save user name to localStorage
const saveUserName = () => {
    localStorage.setItem('dndDiceRollerUserName', userName);
};

// Load roll history from Supabase
const loadRollHistory = async () => {
    // Show loading indicator
    loadingIndicator.classList.remove('hidden');
    historyList.innerHTML = '';
    
    try {
        // Fetch rolls based on filter
        let data;
        if (showOnlyMyRolls && userId) {
            data = await window.supabaseAPI.fetchUserRolls(userId);
        } else {
            data = await window.supabaseAPI.fetchAllRolls();
        }
        
        // Update local history array
        rollHistory = data;
        
        // Update the display
        updateHistoryDisplay();
    } catch (error) {
        console.error('Error loading roll history:', error);
        historyList.innerHTML = '<div class="no-history">Failed to load history</div>';
    } finally {
        // Hide loading indicator
        loadingIndicator.classList.add('hidden');
    }
};

// Set up real-time subscription to new rolls
const setupRealtimeSubscription = () => {
    // Clean up existing subscription if present
    if (subscription) {
        subscription.unsubscribe();
    }
    
    // Set up new subscription
    subscription = window.supabaseAPI.subscribeToRolls(newRoll => {
        // Check if this is a new roll we don't have yet
        const isNewRoll = !rollHistory.some(roll => roll.id === newRoll.id);
        
        if (isNewRoll) {
            // If showing only my rolls, check if this is my roll
            if (showOnlyMyRolls && newRoll.user_id !== userId) {
                return; // Skip this roll if we're only showing my rolls
            }
            
            // Fetch the complete roll data with user info
            loadRollHistory();
        }
    });
};

// Update the display of the history list
const updateHistoryDisplay = () => {
    // Clear the list
    historyList.innerHTML = '';
    
    if (rollHistory.length === 0) {
        historyList.innerHTML = '<div class="no-history">No rolls yet</div>';
        return;
    }
    
    // Add each history item
    rollHistory.forEach(item => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        
        // Add a special class if this is the current user's roll
        if (item.user_id === userId) {
            historyItem.classList.add('my-roll');
        }
        
        // Get the user name from the nested users object
        const userName = item.users ? item.users.user_name : 'Anonymous';
        
        // Format result based on whether it's a single die or multiple dice
        let resultDisplay;
        if (Array.isArray(item.results) && item.results.length > 1) {
            resultDisplay = `
                <div class="roll-value">
                    <span class="roll-individual">${item.results.join(', ')}</span>
                    <span class="roll-total">Total: ${item.total}</span>
                </div>
            `;
        } else {
            const result = Array.isArray(item.results) ? item.results[0] : item.results;
            resultDisplay = `<div class="roll-value">${result}</div>`;
        }
        
        // Format timestamp
        const timestamp = new Date(item.created_at).toLocaleString();
        
        historyItem.innerHTML = `
            <div class="roll-info">
                <span class="roll-user">${userName}</span>
                <span class="roll-dice">rolled ${item.dice_type}</span>
                <span class="roll-time">${timestamp}</span>
            </div>
            ${resultDisplay}
        `;
        
        historyList.appendChild(historyItem);
    });
    
    // Scroll to the bottom of the history list
    historyList.scrollTop = historyList.scrollHeight;
};

// Roll the dice
const rollDice = (sides, count = 1) => {
    if (count === 1) {
        return Math.floor(Math.random() * sides) + 1;
    }
    
    const results = [];
    let total = 0;
    
    for (let i = 0; i < count; i++) {
        const roll = Math.floor(Math.random() * sides) + 1;
        results.push(roll);
        total += roll;
    }
    
    return { results, total };
};

// Handle dice selection
diceButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Remove active class from all buttons
        diceButtons.forEach(btn => btn.classList.remove('active'));
        
        // Add active class to clicked button
        button.classList.add('active');
        
        // Set selected dice
        selectedDice = parseInt(button.dataset.dice);
        
        // Update dice type display with count
        updateDiceTypeDisplay();
        
        // Enable roll button
        rollButton.disabled = false;
    });
});

// Handle user name input
userNameInput.addEventListener('input', async () => {
    userName = userNameInput.value.trim();
    saveUserName();
    
    // If user has already made rolls, update their name in Supabase
    if (userId) {
        try {
            await window.supabaseAPI.updateUserName(userId, userName);
        } catch (error) {
            console.error('Error updating user name:', error);
        }
    }
});

// Handle roll button click
rollButton.addEventListener('click', async () => {
    if (!selectedDice) return;
    
    // Create dice rolling animation
    diceResult.textContent = '...';
    rollTotalDisplay.textContent = '';
    rollButton.disabled = true;
    
    // Small delay to show rolling animation
    setTimeout(async () => {
        try {
            userName = userNameInput.value.trim();
            saveUserName();

            // Get the number of dice
            const count = parseInt(diceCountInput.value) || 1;
            
            // Roll the dice
            let result, total, individualResults;
            
            if (count === 1) {
                result = rollDice(selectedDice);
                diceResult.textContent = result;
                rollTotalDisplay.textContent = '';
                individualResults = [result];
                total = result;
            } else {
                const rollResults = rollDice(selectedDice, count);
                individualResults = rollResults.results;
                total = rollResults.total;
                
                // For multiple dice, format results to fit better
                if (count <= 6) {
                    // For fewer dice, just join with commas
                    diceResult.textContent = individualResults.join(', ');
                } else {
                    // For more dice, use a more compact format
                    diceResult.textContent = individualResults.slice(0, 3).join(', ') + 
                                          '... ' + 
                                          individualResults.slice(-3).join(', ');
                }
                
                // Show the total
                rollTotalDisplay.textContent = `Total: ${total}`;
            }
            
            // Format dice type string
            const diceTypeStr = count === 1 ? `D${selectedDice}` : `${count}D${selectedDice}`;
            
            // Make sure user exists in Supabase
            if (!userId) {
                userId = await window.supabaseAPI.getOrCreateUser(userName || 'Anonymous');
                if (!userId) {
                    throw new Error('Failed to create or get user');
                }
            }
            
            // Store roll in Supabase
            await window.supabaseAPI.storeRoll(
                userId,
                diceTypeStr,
                count,
                individualResults,
                total
            );
            
            // Explicitly refresh the history immediately instead of waiting for the real-time subscription
            await loadRollHistory();
            
        } catch (error) {
            console.error('Error storing roll:', error);
            
            // Show error message to user
            const errorToast = document.createElement('div');
            errorToast.className = 'error-toast';
            errorToast.textContent = 'Failed to save roll. Check your connection.';
            document.body.appendChild(errorToast);
            
            // Remove after 3 seconds
            setTimeout(() => {
                errorToast.remove();
            }, 3000);
        } finally {
            // Re-enable roll button
            rollButton.disabled = false;
        }
    }, 500);
});

// Add a keyboard shortcut: Press Enter to roll if a dice is selected
document.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !rollButton.disabled) {
        rollButton.click();
    }
});

// Add a small animation when rolling the dice
rollButton.addEventListener('mousedown', () => {
    if (!rollButton.disabled) {
        diceResult.classList.add('rolling');
    }
});

rollButton.addEventListener('animationend', () => {
    diceResult.classList.remove('rolling');
});

// Handle dice count buttons
decreaseDiceBtn.addEventListener('click', () => {
    let count = parseInt(diceCountInput.value) || 1;
    if (count > 1) {
        count--;
        setDiceCount(count);
    }
});

increaseDiceBtn.addEventListener('click', () => {
    let count = parseInt(diceCountInput.value) || 1;
    if (count < 20) { // Limit to 20 dice
        count++;
        setDiceCount(count);
    }
});

diceCountInput.addEventListener('change', () => {
    setDiceCount(diceCountInput.value);
});

countPresetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        setDiceCount(btn.dataset.count);
    });
});

// Update the dice type display with count
function updateDiceTypeDisplay() {
    if (selectedDice) {
        const count = parseInt(diceCountInput.value) || 1;
        diceType.textContent = count === 1 ? `D${selectedDice}` : `${count}D${selectedDice}`;
    } else {
        diceType.textContent = 'Select a dice to roll';
    }
}

// Set up history toggle buttons
showAllBtn.addEventListener('click', () => {
    showAllBtn.classList.add('active');
    showMineBtn.classList.remove('active');
    showOnlyMyRolls = false;
    loadRollHistory(); // Reload history with new filter
});

showMineBtn.addEventListener('click', () => {
    showMineBtn.classList.add('active');
    showAllBtn.classList.remove('active');
    showOnlyMyRolls = true;
    loadRollHistory(); // Reload history with new filter
});

// Add style for error toast
const style = document.createElement('style');
style.textContent = `
    .error-toast {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background-color: #ff5252;
        color: white;
        padding: 10px 20px;
        border-radius: 4px;
        z-index: 1000;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
        animation: fadeIn 0.3s, fadeOut 0.3s 2.7s;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; transform: translate(-50%, 20px); }
        to { opacity: 1; transform: translate(-50%, 0); }
    }
    
    @keyframes fadeOut {
        from { opacity: 1; transform: translate(-50%, 0); }
        to { opacity: 0; transform: translate(-50%, 20px); }
    }
`;
document.head.appendChild(style);

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    // Set a loading message while initializing
    historyList.innerHTML = '<div class="no-history">Loading...</div>';
    
    // Initialize the app
    initialize().catch(error => {
        console.error('Error initializing app:', error);
        historyList.innerHTML = '<div class="no-history">Failed to connect to database. Check your connection.</div>';
    });
});
