// This script will be loaded after charts/expenses_calculator.html is injected into index.html

if (typeof Chart === 'undefined') {
    console.error('Chart.js is not loaded. Make sure it is included in index.html.');
    // Potentially load Chart.js dynamically here if not present, or show a more user-friendly message.
} else {
    initializeExpensesCalculator();
}

function initializeExpensesCalculator() {
    const LOCAL_STORAGE_KEY_EXPENSES = 'expensesCalculatorExpensesList';
    const LOCAL_STORAGE_KEY_PROJECTION = 'expensesCalculatorProjectionYears';

    const expenseNameEl = document.getElementById('expenseName');
    const expenseCostEl = document.getElementById('expenseCost');
    const expenseOccurrenceEl = document.getElementById('expenseOccurrence');
    const addExpenseBtn = document.getElementById('addExpenseBtn');
    
    const projectionYearsEl = document.getElementById('projectionYears');
    const calculateProjectionBtn = document.getElementById('calculateProjectionBtn');

    const projectionYearsValueDisplay = document.getElementById('projectionYearsValue'); // Now an input type="number"

    const currentExpensesTableBodyEl = document.getElementById('currentExpensesTableBody');
    const totalListedAnnualExpensesEl = document.getElementById('totalListedAnnualExpenses');
    const totalListedMonthlyExpensesEl = document.getElementById('totalListedMonthlyExpenses'); // Added for monthly total
    const totalListedWeeklyExpensesEl = document.getElementById('totalListedWeeklyExpenses');   // Added for weekly total
    const totalListedDailyExpensesEl = document.getElementById('totalListedDailyExpenses');     // Added for daily total
    
    const expensesChartCanvas = document.getElementById('expensesChart');
    const expensesYearlyBreakdownTableBodyEl = document.getElementById('expensesYearlyBreakdownTableBody');
    let expensesChartInstance = null;
    let editingExpenseId = null; // Track the ID of the expense being edited

    let expenses = []; // Array to store {id, name, cost, occurrence, annualCost}

    // Check if elements are loaded, retry if not (robustness for dynamic content loading)
    if (!addExpenseBtn || !calculateProjectionBtn || !expensesChartCanvas) {
        console.warn("Expenses calculator elements not immediately found. Retrying in a moment...");
        setTimeout(initializeExpensesCalculator, 150); // Retry initialization shortly
        return;
    }

    // --- Reusable Helper Functions (adapted from savings_calculator.js) ---
    function formatCurrency(number) {
        const num = Number(number);
        if (isNaN(num)) return '0 kr';
        const roundedNum = Math.round(num);
        return new Intl.NumberFormat('sv-SE').format(roundedNum) + ' kr';
    }

    function formatForInputDisplay(value) {
        const num = parseInt(String(value).replace(/\s/g, ''), 10);
        if (isNaN(num)) return '';
        return new Intl.NumberFormat('sv-SE').format(num);
    }

    function parseInputFormattedValue(value) {
        return parseFloat(String(value).replace(/\s/g, '').replace(',', '.')); // Handle comma as decimal if any
    }

    // Input formatting for expenseCostEl
    expenseCostEl.addEventListener('input', (e) => {
        const rawValue = e.target.value.replace(/\s/g, '');
        if (/^\d*([.,]\d*)?$/.test(rawValue)) { // Allow digits and one decimal point/comma
            const caretPosition = e.target.selectionStart;
            const oldValueLength = e.target.value.length;
            
            // Temporarily remove formatting to correctly place caret
            let unformattedOldValue = e.target.value.substring(0, caretPosition).replace(/\s/g, '');
            
            e.target.value = formatForInputDisplay(rawValue.split('.')[0]) + (rawValue.includes('.') ? '.' + rawValue.split('.')[1] : '');
            e.target.value = formatForInputDisplay(rawValue.split(',')[0]) + (rawValue.includes(',') ? ',' + rawValue.split(',')[1] : '');


            // Attempt to restore caret position more accurately
            let newFormattedValue = e.target.value;
            let newCaretPos = caretPosition;
            // This is tricky with dynamic formatting. A simpler approach might be needed if issues persist.
            // For now, basic adjustment:
            if (newFormattedValue.length > oldValueLength) {
                newCaretPos += (newFormattedValue.length - oldValueLength);
            } else if (newFormattedValue.length < oldValueLength) {
                newCaretPos -= (oldValueLength - newFormattedValue.length);
            }
             // Ensure caret doesn't go out of bounds
            newCaretPos = Math.max(0, Math.min(newCaretPos, newFormattedValue.length));

            // Count spaces before original caret
            let spacesBeforeOldCaret = 0;
            for(let i=0; i < caretPosition; i++) {
                if(e.target.value[i] === ' ') spacesBeforeOldCaret++;
            }
            
            // Count spaces in new value up to the length of unformatted old value
            let spacesInNewUpToOldLength = 0;
            let currentLength = 0;
            let newPosCandidate = 0;
            for(let i=0; i < newFormattedValue.length && currentLength < unformattedOldValue.length; i++) {
                if(newFormattedValue[i] !== ' ') currentLength++;
                if(newFormattedValue[i] === ' ') spacesInNewUpToOldLength++;
                newPosCandidate = i + 1;
            }
            
            e.target.setSelectionRange(newPosCandidate, newPosCandidate);


        } else {
            e.target.value = formatForInputDisplay(rawValue.replace(/[^\d]/g, '')); // Remove non-digits
        }
    });
    expenseCostEl.addEventListener('blur', (e) => {
        const numericValue = parseInputFormattedValue(e.target.value);
        if (!isNaN(numericValue)) {
            e.target.value = formatForInputDisplay(Math.round(numericValue)); // Round to whole number on blur
        } else {
            e.target.value = '';
        }
    });
     if(expenseCostEl.value) expenseCostEl.value = formatForInputDisplay(expenseCostEl.value);


    // --- Event Listeners ---
    addExpenseBtn.addEventListener('click', handleAddOrUpdateExpense); // Renamed for clarity
    calculateProjectionBtn.addEventListener('click', calculateAndDisplayProjection);
    currentExpensesTableBodyEl.addEventListener('click', handleTableActions); // Handles both Edit and Delete
    // Set initial display value for the number input
    if (projectionYearsEl && projectionYearsValueDisplay) {
        projectionYearsValueDisplay.value = projectionYearsEl.value;
    }

    // Add event listener to the projectionYears slider (range input)
    projectionYearsEl.addEventListener('input', () => {
        if (projectionYearsValueDisplay) {
            projectionYearsValueDisplay.value = projectionYearsEl.value; // Update number input
        }
        saveProjectionYearsToLocalStorage(); // Save on slider change
        // Trigger recalculation if there are expenses
        if (expenses.length > 0) {
            calculateAndDisplayProjection();
        } else {
             // Clear projection if no expenses
            if (expensesChartInstance) expensesChartInstance.destroy();
            expensesYearlyBreakdownTableBodyEl.innerHTML = '';
        }
    });

    // Add event listener to the projectionYearsValue (number input)
    projectionYearsValueDisplay.addEventListener('input', () => {
        let inputValue = projectionYearsValueDisplay.value.trim();
        let newValue;

        if (inputValue === '') {
            newValue = 1; // Default to 1 if input is empty
        } else {
            newValue = parseInt(inputValue, 10);
        }
        
        const min = parseInt(projectionYearsEl.min, 10);
        const max = parseInt(projectionYearsEl.max, 10);

        if (isNaN(newValue) || newValue < min || newValue > max) {
            // If invalid (not a number, or outside min/max range),
            // revert the input box to the current slider value,
            // and ensure slider value is within bounds (default to 1 if it was invalid)
            let currentSliderValue = parseInt(projectionYearsEl.value, 10);
            if (isNaN(currentSliderValue) || currentSliderValue < min || currentSliderValue > max) {
                currentSliderValue = 1; // Fallback if slider itself is somehow invalid
            }
            projectionYearsValueDisplay.value = currentSliderValue;
            projectionYearsEl.value = currentSliderValue; // Ensure slider is also consistent
            // No alert, just silently correct to 1 or current valid slider value
        } else {
            // Update the slider's value
            projectionYearsEl.value = newValue;
            // The slider's 'input' event listener will handle updating the display and recalculation.
            // However, if the value was set programmatically, the 'input' event might not fire consistently.
            // So, explicitly call calculation here if needed, or ensure the slider's event handles it.
            // For now, let's rely on the slider's event listener to trigger the calculation.
            // If the slider's value is set programmatically, its 'input' event should fire.
            // If not, we might need to call calculateAndDisplayProjection() directly here.
            // Let's test this first.
        }
        saveProjectionYearsToLocalStorage(); // Save on number input change (after validation)

        // Always trigger recalculation if there are expenses, as the value might have changed
        // or been corrected. This ensures the chart/table updates.
        if (expenses.length > 0) {
            calculateAndDisplayProjection();
        } else {
            // Clear projection if no expenses
            if (expensesChartInstance) expensesChartInstance.destroy();
            expensesYearlyBreakdownTableBodyEl.innerHTML = '';
        }
    });

    // --- Core Functions ---
    function handleTableActions(event) {
        if (event.target.classList.contains('remove-expense-btn')) {
            const expenseIdToRemove = parseInt(event.target.dataset.id);
            handleDeleteExpense(expenseIdToRemove);
        } else if (event.target.classList.contains('edit-expense-btn')) {
            const expenseIdToEdit = parseInt(event.target.dataset.id);
            handleStartEditExpense(expenseIdToEdit);
        }
    }

    function handleStartEditExpense(expenseId) {
        const expenseToEdit = expenses.find(exp => exp.id === expenseId);
        if (!expenseToEdit) return;

        expenseNameEl.value = expenseToEdit.name;
        expenseCostEl.value = formatForInputDisplay(expenseToEdit.cost); // Format for display
        expenseOccurrenceEl.value = expenseToEdit.occurrence;

        editingExpenseId = expenseId;
        addExpenseBtn.textContent = 'Update Expense';
        expenseNameEl.focus();
    }

    function handleAddOrUpdateExpense() { // Renamed and modified
        const name = expenseNameEl.value.trim();
        const costString = expenseCostEl.value;
        const occurrence = expenseOccurrenceEl.value;

        if (!name) {
            alert('Please enter an expense name.');
            expenseNameEl.focus();
            return;
        }
        const cost = parseInputFormattedValue(costString);
        if (isNaN(cost) || cost <= 0) {
            alert('Please enter a valid positive cost for the expense.');
            expenseCostEl.focus();
            return;
        }

        const annualCost = calculateAnnualCost(cost, occurrence);

        if (editingExpenseId !== null) {
            // --- Update existing expense ---
            const expenseIndex = expenses.findIndex(exp => exp.id === editingExpenseId);
            if (expenseIndex > -1) {
                expenses[expenseIndex].name = name;
                expenses[expenseIndex].cost = cost;
                expenses[expenseIndex].occurrence = occurrence;
                expenses[expenseIndex].annualCost = annualCost;
            }
            editingExpenseId = null; // Reset editing state
            addExpenseBtn.textContent = 'Add Expense'; // Change button text back
        } else {
            // --- Add new expense ---
            const newExpense = {
                id: Date.now(), // Simple unique ID
                name: name,
                cost: cost,
                occurrence: occurrence,
                annualCost: annualCost
            };
            expenses.push(newExpense);
        }

        updateCurrentExpensesDisplay(); // Refresh table and totals
        saveExpensesListToLocalStorage(); // Save expenses list
        // Clear form fields after add or update
        expenseNameEl.value = '';
        expenseCostEl.value = '';
        expenseOccurrenceEl.value = 'monthly'; // Reset dropdown
        expenseNameEl.focus(); // Focus back on name field

        // Immediately recalculate projection if years are set and expenses exist
        if (parseInt(projectionYearsEl.value) > 0 && expenses.length > 0) {
            calculateAndDisplayProjection();
        } else if (expenses.length === 0) {
             // Clear projection if no expenses left
            if (expensesChartInstance) expensesChartInstance.destroy();
            expensesYearlyBreakdownTableBodyEl.innerHTML = '';
        }
    }

    function calculateAnnualCost(cost, occurrence) {
        switch (occurrence) {
            case 'daily': return cost * 365;
            case 'weekday': return cost * 260; // Approx 52 weeks * 5 days
            case 'weekly': return cost * 52;
            case 'monthly': return cost * 12;
            case 'quarterly': return cost * 4;
            case 'yearly': return cost;
            default: return 0;
        }
    }

    function updateCurrentExpensesDisplay() {
        currentExpensesTableBodyEl.innerHTML = ''; // Clear existing rows
        let totalAnnual = 0;
        if (expenses.length === 0) {
            const row = currentExpensesTableBodyEl.insertRow();
            const cell = row.insertCell();
            cell.colSpan = 5; // Keep 5 columns: Name, Cost, Occurrence, Annual Cost, Actions
            cell.textContent = 'No expenses added yet.';
            cell.style.textAlign = 'center';
        } else {
            expenses.forEach(exp => {
                const row = currentExpensesTableBodyEl.insertRow();
                row.insertCell().textContent = exp.name;
                row.insertCell().textContent = formatCurrency(exp.cost).replace(' kr', ''); // Cost per occurrence
                row.insertCell().textContent = exp.occurrence.charAt(0).toUpperCase() + exp.occurrence.slice(1);
                row.insertCell().textContent = formatCurrency(exp.annualCost).replace(' kr', '');
                
                const removeBtn = document.createElement('button');
                removeBtn.textContent = 'Remove';
                removeBtn.classList.add('remove-expense-btn');
                removeBtn.textContent = '❌'; // Use Cross Mark icon
                removeBtn.dataset.id = exp.id;
                removeBtn.style.marginLeft = '5px'; // Add some space between buttons

                const editBtn = document.createElement('button');
                editBtn.textContent = '✏️'; // Use Pencil icon
                editBtn.classList.add('edit-expense-btn');
                editBtn.dataset.id = exp.id;

                const actionsCell = row.insertCell();
                actionsCell.appendChild(editBtn);
                actionsCell.appendChild(removeBtn);

                totalAnnual += exp.annualCost;
            });
        }
        // Calculate and display all totals
        const totalMonthly = totalAnnual / 12;
        const totalWeekly = totalAnnual / 52; 
        const totalDaily = totalAnnual / 365; // Calculate daily total

        totalListedAnnualExpensesEl.textContent = formatCurrency(totalAnnual);
        totalListedMonthlyExpensesEl.textContent = formatCurrency(totalMonthly); // Update monthly total display
        totalListedWeeklyExpensesEl.textContent = formatCurrency(totalWeekly);   // Update weekly total display
        totalListedDailyExpensesEl.textContent = formatCurrency(totalDaily);     // Update daily total display
    }

    function handleDeleteExpense(expenseIdToRemove) { // Modified to accept ID directly
        // If deleting the item currently being edited, reset the form
        if (editingExpenseId === expenseIdToRemove) {
            editingExpenseId = null;
            addExpenseBtn.textContent = 'Add Expense';
            expenseNameEl.value = '';
            expenseCostEl.value = '';
            expenseOccurrenceEl.value = 'monthly';
        }

        expenses = expenses.filter(exp => exp.id !== expenseIdToRemove);
        updateCurrentExpensesDisplay(); // Refresh table and totals
        saveExpensesListToLocalStorage(); // Save expenses list

        // Immediately recalculate projection if years are set and expenses exist
        if (parseInt(projectionYearsEl.value) > 0 && expenses.length > 0) {
             calculateAndDisplayProjection(); // Recalculate if something was projected
        } else if (expenses.length === 0) {
            // Clear projection if no expenses left
            if (expensesChartInstance) expensesChartInstance.destroy();
            expensesYearlyBreakdownTableBodyEl.innerHTML = '';
        }
    }

    function calculateAndDisplayProjection() {
        const years = parseInt(projectionYearsEl.value);
        if (isNaN(years) || years <= 0) {
            alert('Please enter a valid positive number of years for projection.');
            projectionYearsEl.focus();
            // Clear previous projection if years are invalid
            if (expensesChartInstance) expensesChartInstance.destroy();
            expensesYearlyBreakdownTableBodyEl.innerHTML = '';
            return;
        }
        if (expenses.length === 0) {
            alert('Please add at least one expense before calculating a projection.');
            // Clear previous projection if no expenses
            if (expensesChartInstance) expensesChartInstance.destroy();
            expensesYearlyBreakdownTableBodyEl.innerHTML = '';
            return;
        }

        updateExpensesChart(years);
        updateExpensesYearlyBreakdownTable(years);
    }
    
    const chartColors = [ // Predefined colors for chart datasets
        'rgba(255, 99, 132, 0.7)', 'rgba(54, 162, 235, 0.7)', 'rgba(255, 206, 86, 0.7)',
        'rgba(75, 192, 192, 0.7)', 'rgba(153, 102, 255, 0.7)', 'rgba(255, 159, 64, 0.7)',
        'rgba(199, 199, 199, 0.7)', 'rgba(83, 102, 255, 0.7)', 'rgba(40, 159, 64, 0.7)',
        'rgba(210, 99, 132, 0.7)' 
    ];

    function updateExpensesChart(projectionYears) {
        const labels = [];
        for (let i = 1; i <= projectionYears; i++) {
            labels.push(`Year ${i}`);
        }

        // Calculate cumulative annual costs for each expense
        const cumulativeDatasets = expenses.map((exp, index) => {
            const cumulativeData = [];
            let currentCumulative = 0;
            for (let i = 0; i < projectionYears; i++) {
                currentCumulative += exp.annualCost;
                cumulativeData.push(currentCumulative);
            }
            return {
                label: exp.name,
                data: cumulativeData, // Use cumulative data
                backgroundColor: chartColors[index % chartColors.length], // Cycle through colors
                borderColor: chartColors[index % chartColors.length].replace('0.7', '1'), // Solid border
                borderWidth: 1, // Keep border for the line on top of the area
                fill: true,     // This is key for area chart
                tension: 0.1,   // Optional: for slightly curved lines, 0 for straight
                pointRadius: 0  // Optional: to hide points on the line
            };
        });

        if (expensesChartInstance) {
            expensesChartInstance.destroy();
        }
        const ctx = expensesChartCanvas.getContext('2d');
        expensesChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: cumulativeDatasets // Use cumulative datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Cumulative Expense Projection (Stacked Area)' // Update title
                    },
                    tooltip: {
                        mode: 'index', 
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += formatCurrency(context.parsed.y);
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        stacked: true,
                        title: {
                            display: true,
                            text: 'Year'
                        }
                    },
                    y: {
                        stacked: true, // Crucial for stacked area
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Cumulative Expenses (kr)' // Update Y-axis title
                        },
                        ticks: {
                            callback: function(value) {
                                return formatCurrency(value).replace(' kr', ''); // Format Y-axis ticks
                            }
                        }
                    }
                },
                interaction: { // Good for area charts
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });
    }

    function updateExpensesYearlyBreakdownTable(projectionYears) {
        expensesYearlyBreakdownTableBodyEl.innerHTML = ''; // Clear previous results
        
        let cumulativeTotal = 0; // Track cumulative total for the table
        for (let year = 1; year <= projectionYears; year++) {
            let totalExpensesThisYear = 0;
            expenses.forEach(exp => {
                totalExpensesThisYear += exp.annualCost; // Still need annual total for table row
            });
            cumulativeTotal += totalExpensesThisYear; // Add annual total to cumulative

            const row = expensesYearlyBreakdownTableBodyEl.insertRow();
            row.insertCell().textContent = year;
            // Display cumulative total in the table
            row.insertCell().textContent = formatCurrency(cumulativeTotal); 
        }
    }
    
    // Initial call to set up the "Current Added Expenses" table (e.g., show "No expenses added yet.")
    updateCurrentExpensesDisplay();

    // --- LocalStorage Save Functions ---
    function saveExpensesListToLocalStorage() {
        localStorage.setItem(LOCAL_STORAGE_KEY_EXPENSES, JSON.stringify(expenses));
    }

    function saveProjectionYearsToLocalStorage() {
        localStorage.setItem(LOCAL_STORAGE_KEY_PROJECTION, projectionYearsEl.value);
    }

    // --- LocalStorage Load Functions ---
    function loadExpensesListFromLocalStorage() {
        const savedExpensesData = localStorage.getItem(LOCAL_STORAGE_KEY_EXPENSES);
        if (savedExpensesData) {
            try {
                const savedExpenses = JSON.parse(savedExpensesData);
                if (Array.isArray(savedExpenses)) {
                    expenses = savedExpenses;
                    // Ensure annualCost is calculated for loaded expenses if not stored
                    // or if it might need recalculation due to logic changes.
                    // For now, assuming stored expenses are complete.
                    // If expenses objects change structure, migration logic might be needed here.
                }
            } catch (e) {
                console.error("Error parsing saved expenses from localStorage:", e);
                // Optionally clear the corrupted data: localStorage.removeItem(LOCAL_STORAGE_KEY_EXPENSES);
            }
        }
        // Always update display, even if loading failed and expenses is empty or default
        updateCurrentExpensesDisplay();
    }

    function loadProjectionYearsFromLocalStorage() {
        const savedYears = localStorage.getItem(LOCAL_STORAGE_KEY_PROJECTION);
        if (savedYears) {
            const yearsValue = parseInt(savedYears, 10);
            const min = parseInt(projectionYearsEl.min, 10);
            const max = parseInt(projectionYearsEl.max, 10);

            if (!isNaN(yearsValue) && yearsValue >= min && yearsValue <= max) {
                projectionYearsEl.value = yearsValue;
                if (projectionYearsValueDisplay) {
                    projectionYearsValueDisplay.value = yearsValue;
                }
            } else {
                console.warn("Saved projection years are out of valid range. Using default.");
                // Optionally, update display to default slider value if saved one is invalid
                if (projectionYearsValueDisplay) {
                     projectionYearsValueDisplay.value = projectionYearsEl.value;
                }
            }
        }
    }

    // Load saved data on initialization
    loadExpensesListFromLocalStorage(); // This will call updateCurrentExpensesDisplay
    loadProjectionYearsFromLocalStorage();

    // Initial calculation if there are loaded expenses and valid projection years
    if (expenses.length > 0 && projectionYearsEl.value && parseInt(projectionYearsEl.value) > 0) {
        calculateAndDisplayProjection();
    }
}
