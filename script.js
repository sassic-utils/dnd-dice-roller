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
const rollTotalDisplay = document.getElementById('roll-total');

// App State
let selectedDice = null;
let userName = '';
let rollHistory = [];
let diceCount = 1;
let userId = null;

// Check for saved user and history in localStorage
const initializeFromLocalStorage = () => {
    const savedUserName = localStorage.getItem('dndDiceRollerUserName');
    const savedHistory = localStorage.getItem('dndDiceRollerHistory');
    const savedUserId = localStorage.getItem('dndDiceRollerUserId');
    
    if (savedUserName) {
        userName = savedUserName;
        userNameInput.value = userName;
    }
    
    if (savedUserId) {
        userId = savedUserId;
    } else {
        // Generate a unique user ID if not present
        userId = 'user_' + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('dndDiceRollerUserId', userId);
    }
    
    if (savedHistory) {
        try {
            rollHistory = JSON.parse(savedHistory);
            updateHistoryDisplay();
        } catch (e) {
            console.error('Error loading history from localStorage:', e);
            rollHistory = [];
        }
    }
};

// Save state to localStorage
const saveToLocalStorage = () => {
    localStorage.setItem('dndDiceRollerUserName', userName);
    localStorage.setItem('dndDiceRollerHistory', JSON.stringify(rollHistory));
    localStorage.setItem('dndDiceRollerUserId', userId);
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
        if (item.userId === userId) {
            historyItem.classList.add('my-roll');
        }
        
        // Format result based on whether it's a single die or multiple dice
        let resultDisplay;
        if (Array.isArray(item.result)) {
            resultDisplay = `
                <div class="roll-value">
                    <span class="roll-individual">${item.result.join(', ')}</span>
                    <span class="roll-total">Total: ${item.total}</span>
                </div>
            `;
        } else {
            resultDisplay = `<div class="roll-value">${item.result}</div>`;
        }
        
        historyItem.innerHTML = `
            <div class="roll-info">
                <span class="roll-user">${item.user || 'Anonymous'}</span>
                <span class="roll-dice">rolled ${item.dice}</span>
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
userNameInput.addEventListener('change', () => {
    userName = userNameInput.value.trim();
    saveToLocalStorage();
});

// Handle roll button click
rollButton.addEventListener('click', () => {
    if (!selectedDice) return;
    
    // Create dice rolling animation
    diceResult.textContent = '...';
    rollTotalDisplay.textContent = '';
    rollButton.disabled = true;
    
    // Small delay to show rolling animation
    setTimeout(() => {
        // Get the number of dice
        const count = parseInt(diceCountInput.value) || 1;
        
        // Roll the dice
        let result, total, individualResults;
        
        if (count === 1) {
            result = rollDice(selectedDice);
            diceResult.textContent = result;
            rollTotalDisplay.textContent = '';
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
        
        // Create history entry
        const historyEntry = {
            user: userName || 'Anonymous',
            userId: userId,
            dice: count === 1 ? `D${selectedDice}` : `${count}D${selectedDice}`,
            result: count === 1 ? result : individualResults,
            total: count === 1 ? result : total,
            timestamp: new Date().toISOString()
        };
        
        // Add to history locally
        rollHistory.unshift(historyEntry); // Add to beginning of array
        
        // Limit local history to last 50 rolls
        if (rollHistory.length > 50) {
            rollHistory.pop();
        }
        
        // Update history display
        updateHistoryDisplay();
        
        // Save to local storage
        saveToLocalStorage();
        
        // Re-enable roll button
        rollButton.disabled = false;
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
        diceCountInput.value = count;
        updateDiceTypeDisplay();
    }
});

increaseDiceBtn.addEventListener('click', () => {
    let count = parseInt(diceCountInput.value) || 1;
    if (count < 20) { // Limit to 20 dice
        count++;
        diceCountInput.value = count;
        updateDiceTypeDisplay();
    }
});

diceCountInput.addEventListener('change', () => {
    let count = parseInt(diceCountInput.value) || 1;
    
    // Enforce limits
    if (count < 1) count = 1;
    if (count > 20) count = 20;
    
    diceCountInput.value = count;
    updateDiceTypeDisplay();
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

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    initializeFromLocalStorage();
});
