// This script will be loaded after charts/savings_calculator.html is injected into index.html

// Ensure Chart.js is loaded before trying to use it
if (typeof Chart === 'undefined') {
    console.error('Chart.js is not loaded. Make sure it is included in index.html.');
} else {
    initializeSavingsCalculator();
}

function initializeSavingsCalculator() {
    const LOCAL_STORAGE_KEY = 'savingsCalculatorInput';

    const initialSavingsEl = document.getElementById('initialSavings');
    const monthlySavingsEl = document.getElementById('monthlySavings');
    const currentAgeEl = document.getElementById('currentAge'); // New age input
    const annualInterestRateEl = document.getElementById('annualInterestRate');
    const numberOfYearsEl = document.getElementById('numberOfYears');
    const calculateBtn = document.getElementById('calculateSavingsBtn');

    const totalContributionsEl = document.getElementById('totalContributions');
    const totalInterestEl = document.getElementById('totalInterest');
    const totalFutureValueEl = document.getElementById('totalFutureValue');
    const yearlyBreakdownTableBodyEl = document.getElementById('yearlyBreakdownTableBody');
    const savingsChartCanvas = document.getElementById('savingsChart');
    let savingsChartInstance = null;

    // New elements for slider value display
    const initialSavingsValueDisplay = document.getElementById('initialSavingsValue');
    const monthlySavingsValueDisplay = document.getElementById('monthlySavingsValue');
    const currentAgeValueDisplay = document.getElementById('currentAgeValue');
    const annualInterestRateValueDisplay = document.getElementById('annualInterestRateValue');
    const numberOfYearsValueDisplay = document.getElementById('numberOfYearsValue');

    if (!calculateBtn) {
        // console.error('Calculate button not found. The script might be running before the HTML is fully loaded or the ID is incorrect.');
        // This can happen if main.js loads this script before the HTML from fetch is fully processed.
        // A common solution is to wrap this in a DOMContentLoaded or ensure script is loaded via onload callback.
        // Since main.js now loads this script with an onload, this should be less of an issue.
        // We can add a small delay or a more robust check if elements are not found.
        // For now, let's assume main.js handles the timing.
        // If elements are still not found, it means the IDs in savings_calculator.html are different.
        console.warn("Savings calculator elements not immediately found. This might be a timing issue or ID mismatch. Retrying in a moment...");
        setTimeout(initializeSavingsCalculator, 100); // Retry initialization shortly
        return;
    }
    
    calculateBtn.addEventListener('click', calculateAndDisplaySavings);

    // Helper function for OUTPUT currency formatting (e.g., 1 234 567 kr)
    function formatCurrency(number) {
        const num = Number(number);
        if (isNaN(num)) return '0 kr'; // Handle potential NaN inputs gracefully
        const roundedNum = Math.round(num);
        // 'sv-SE' uses space as thousand separator.
        const formattedInteger = new Intl.NumberFormat('sv-SE').format(roundedNum); 
        return `${formattedInteger} kr`;
    }

    // Helper function to format number for INPUT field display (e.g., 1 234 567)
    function formatForInputDisplay(value) {
        const num = parseInt(String(value).replace(/\s/g, ''), 10);
        if (isNaN(num)) return '';
        return new Intl.NumberFormat('sv-SE').format(num);
    }

    // Helper function to parse formatted INPUT value to number
    function parseInputFormattedValue(value) {
        return parseFloat(String(value).replace(/\s/g, ''));
    }

    // Helper function to parse formatted INPUT value to number - RETAINED FOR NOW, but not used by new sliders
    // function parseInputFormattedValue(value) {
    //     return parseFloat(String(value).replace(/\s/g, ''));
    // }

    // REMOVED: Old input formatting logic for initialSavingsEl and monthlySavingsEl
    // [initialSavingsEl, monthlySavingsEl].forEach(el => { ... });


    function loadInputFromLocalStorage() {
        const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedData) {
            const inputValues = JSON.parse(savedData);

            initialSavingsEl.value = inputValues.initialSavings || '10000'; // Default if missing
            monthlySavingsEl.value = inputValues.monthlySavings || '500';
            currentAgeEl.value = inputValues.currentAge || '30';
            annualInterestRateEl.value = inputValues.annualInterestRate || '5';
            numberOfYearsEl.value = inputValues.numberOfYears || '10';

            // Update display spans
            if (initialSavingsValueDisplay) initialSavingsValueDisplay.textContent = formatCurrency(initialSavingsEl.value);
            if (monthlySavingsValueDisplay) monthlySavingsValueDisplay.textContent = formatCurrency(monthlySavingsEl.value);
            if (currentAgeValueDisplay) currentAgeValueDisplay.textContent = currentAgeEl.value + ' years';
            if (annualInterestRateValueDisplay) annualInterestRateValueDisplay.textContent = annualInterestRateEl.value + '%';
            if (numberOfYearsValueDisplay) numberOfYearsValueDisplay.textContent = numberOfYearsEl.value + ' years';

            calculateAndDisplaySavings(); // Recalculate with loaded values
        }
    }

    function saveInputToLocalStorage() {
        const inputValues = {
            initialSavings: initialSavingsEl.value,
            monthlySavings: monthlySavingsEl.value,
            currentAge: currentAgeEl.value,
            annualInterestRate: annualInterestRateEl.value,
            numberOfYears: numberOfYearsEl.value,
        };
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(inputValues));
    }

    function calculateAndDisplaySavings() {
        const initialSavings = parseFloat(initialSavingsEl.value); // Changed from parseInputFormattedValue
        const monthlySavings = parseFloat(monthlySavingsEl.value); // Changed from parseInputFormattedValue
        
        // Save input values to local storage
        saveInputToLocalStorage();

        let currentAge = parseInt(currentAgeEl.value, 10);
        if (currentAge === 0) { // Treat 0 as "not provided"
            currentAge = null;
        } else if (isNaN(currentAge) || currentAge < 0) { // Should not happen with slider
            alert('Current Age is invalid.'); // Simplified message
            return;
        }

        const annualInterestRate = parseFloat(annualInterestRateEl.value) / 100;
        const numberOfYears = parseInt(numberOfYearsEl.value);

        if (isNaN(initialSavings) || isNaN(monthlySavings) || isNaN(annualInterestRate) || isNaN(numberOfYears) || initialSavings < 0 || monthlySavings < 0 || annualInterestRate < 0 || numberOfYears <= 0) {
            alert('Please enter valid numbers for Initial Savings, Monthly Savings, Interest Rate, and Years. Savings and Interest cannot be negative. Years must be positive.');
            return;
        }
        // Allow monthly savings to be 0 if initial savings is present
        if (initialSavings === 0 && monthlySavings <= 0) {
            alert('Please enter a positive value for Initial Savings or Monthly Savings.');
            return;
        }


        let currentBalance = initialSavings; // Start with initial savings
        let overallTotalContributions = 0; // Only tracks periodic contributions
        let overallTotalInterest = 0;
        
        const yearlyData = [];
        const chartLabels = [];
        const chartEndingBalances = [];
        const chartEndingBalancesNoInterest = []; // For the 0% interest line
        const cumulativeInterestByYear = []; // For tooltip display

        let currentBalanceNoInterest = initialSavings; // Separate balance for 0% interest calculation
        let runningTotalInterestForTooltip = 0; // Accumulator for tooltip

        yearlyBreakdownTableBodyEl.innerHTML = ''; // Clear previous results

        for (let year = 1; year <= numberOfYears; year++) {
            // Calculation with actual interest
            const startingBalanceForYear = currentBalance;
            const contributionsThisYear = monthlySavings * 12;
            const balanceAfterContributions = startingBalanceForYear + contributionsThisYear;
            const interestEarnedThisYear = balanceAfterContributions * annualInterestRate;
            const endingBalanceForYear = balanceAfterContributions + interestEarnedThisYear;

            overallTotalContributions += contributionsThisYear; // This is the same for both scenarios
            overallTotalInterest += interestEarnedThisYear; // Specific to actual interest scenario
            currentBalance = endingBalanceForYear;

            // Calculation for 0% interest line
            // startingBalanceForYearNoInterest is currentBalanceNoInterest
            const contributionsThisYearNoInterest = monthlySavings * 12; // Same contributions
            const balanceAfterContributionsNoInterest = currentBalanceNoInterest + contributionsThisYearNoInterest;
            // const interestEarnedThisYearNoInterest = 0; // By definition for this line
            const endingBalanceForYearNoInterest = balanceAfterContributionsNoInterest; // No interest added
            currentBalanceNoInterest = endingBalanceForYearNoInterest;

            // Accumulate interest for tooltip
            runningTotalInterestForTooltip += interestEarnedThisYear;
            cumulativeInterestByYear.push(Math.round(runningTotalInterestForTooltip));

            yearlyData.push({
                year,
                startingBalance: startingBalanceForYear,
                contributions: contributionsThisYear,
                interest: interestEarnedThisYear,
                endingBalance: endingBalanceForYear
            });

            let yearLabel = `Year ${year}`;
            if (currentAge !== null) {
                yearLabel += ` (Age ${currentAge + year})`; 
            }
            chartLabels.push(yearLabel);
            chartEndingBalances.push(Math.round(endingBalanceForYear)); // Round for chart data
            chartEndingBalancesNoInterest.push(Math.round(endingBalanceForYearNoInterest)); // Round for 0% interest line

            // Populate table row
            const row = yearlyBreakdownTableBodyEl.insertRow();
            row.insertCell().textContent = year;
            // row.insertCell().textContent = formatCurrency(startingBalanceForYear); // Removed Starting Balance
            row.insertCell().textContent = formatCurrency(contributionsThisYear);
            row.insertCell().textContent = formatCurrency(interestEarnedThisYear);
            row.insertCell().textContent = formatCurrency(endingBalanceForYear);
        }

        totalContributionsEl.textContent = formatCurrency(overallTotalContributions);
        totalInterestEl.textContent = formatCurrency(overallTotalInterest);
        totalFutureValueEl.textContent = formatCurrency(currentBalance);

        renderChart(chartLabels, 
                    chartEndingBalances.map(val => parseFloat(val)), 
                    chartEndingBalancesNoInterest.map(val => parseFloat(val)),
                    cumulativeInterestByYear); // Pass cumulative interest data
    }

    function renderChart(labels, dataWithInterest, dataNoInterest, cumulativeInterestData) {
        if (savingsChartInstance) {
            savingsChartInstance.destroy();
        }
        const ctx = savingsChartCanvas.getContext('2d');
        savingsChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Savings Growth (kr)', // Actual interest
                        data: dataWithInterest,
                        borderColor: '#A2D2FF', // Pastel Blue
                        backgroundColor: 'rgba(144, 238, 144, 0.5)', // Light Green fill (semi-transparent) for area
                        tension: 0.1,
                        fill: 1, // Fill to dataset at index 1 (the 0% interest line)
                        order: 0 
                    },
                    {
                        label: 'Growth with 0% Interest (kr)', // 0% interest line
                        data: dataNoInterest,
                        borderColor: '#FFC8DD', // Pastel Pink
                        backgroundColor: 'rgba(255, 200, 221, 0.1)', // Optional faint fill for this line itself
                        tension: 0.1,
                        fill: false, // This line itself does not fill, or fill to origin: 'origin'
                        order: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                // Format Y-axis ticks
                                return formatCurrency(value).replace(' kr', ''); // Remove currency for cleaner axis
                            }
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || ''; // e.g., "Savings Growth (kr)"
                                let tooltipLabel = context.dataset.label || '';
                                if (tooltipLabel) {
                                    if (!tooltipLabel.includes('(kr)')) {
                                        tooltipLabel = tooltipLabel.replace('($)', '(kr)');
                                    }
                                    tooltipLabel += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    tooltipLabel += formatCurrency(context.parsed.y);
                                }

                                // If hovering the main dataset (index 0), add cumulative interest
                                if (context.datasetIndex === 0 && cumulativeInterestData && cumulativeInterestData[context.dataIndex] !== undefined) {
                                    const interestSoFar = cumulativeInterestData[context.dataIndex];
                                    tooltipLabel += `\nInterest Earned: ${formatCurrency(interestSoFar)}`;
                                }
                                return tooltipLabel;
                            }
                        }
                    }
                }
            }
        });
    }
    
    // Perform an initial calculation if default values are present and valid
    // REMOVED: Old re-formatting of initialSavingsEl and monthlySavingsEl on load
    // [initialSavingsEl, monthlySavingsEl].forEach(el => { ... });

    // Set initial display values for ALL sliders
    if (initialSavingsEl && initialSavingsValueDisplay) {
        initialSavingsValueDisplay.textContent = formatCurrency(initialSavingsEl.value);
    }
    if (monthlySavingsEl && monthlySavingsValueDisplay) {
        monthlySavingsValueDisplay.textContent = formatCurrency(monthlySavingsEl.value);
    }
    if (currentAgeEl && currentAgeValueDisplay) {
        currentAgeValueDisplay.textContent = currentAgeEl.value + ' years';
    }
    if (annualInterestRateEl && annualInterestRateValueDisplay) {
        annualInterestRateValueDisplay.textContent = annualInterestRateEl.value + '%';
    }
    if (numberOfYearsEl && numberOfYearsValueDisplay) {
        numberOfYearsValueDisplay.textContent = numberOfYearsEl.value + ' years';
    }

    // Add event listeners to all input fields to trigger recalculation on change
    const allInputs = [initialSavingsEl, monthlySavingsEl, currentAgeEl, annualInterestRateEl, numberOfYearsEl];
    allInputs.forEach(inputEl => {
        inputEl.addEventListener('input', () => {
            if (inputEl.type === 'range') {
                if (inputEl.id === 'initialSavings' && initialSavingsValueDisplay) {
                    initialSavingsValueDisplay.textContent = formatCurrency(inputEl.value);
                } else if (inputEl.id === 'monthlySavings' && monthlySavingsValueDisplay) {
                    monthlySavingsValueDisplay.textContent = formatCurrency(inputEl.value);
                } else if (inputEl.id === 'currentAge' && currentAgeValueDisplay) {
                    currentAgeValueDisplay.textContent = inputEl.value + ' years';
                } else if (inputEl.id === 'annualInterestRate' && annualInterestRateValueDisplay) {
                    annualInterestRateValueDisplay.textContent = inputEl.value + '%';
                } else if (inputEl.id === 'numberOfYears' && numberOfYearsValueDisplay) {
                    numberOfYearsValueDisplay.textContent = inputEl.value + ' years';
                }
            }
            calculateAndDisplaySavings();
        });
    });

    // Perform an initial calculation if default values are present and valid
    // Load saved data first, which might trigger a calculation.
    // Then, if no saved data, this will run with defaults.
    loadInputFromLocalStorage();

    // If loadInputFromLocalStorage did not find data and thus did not call calculateAndDisplaySavings,
    // this existing logic will perform the initial calculation with default HTML values.
    // If data WAS loaded, calculateAndDisplaySavings was already called, so this might be redundant
    // but harmless as it would just recalculate with the same (loaded) values.
    // To avoid double calculation if data is loaded, loadInputFromLocalStorage could return a boolean,
    // and this call could be conditional. For now, keeping it simple.
    if (initialSavingsEl.value && monthlySavingsEl.value && annualInterestRateEl.value && numberOfYearsEl.value) {
        // Check if data was loaded to prevent double calculation.
        // A simple way: if localStorage had data, the first calculation is already done.
        // This check is imperfect because default values might match saved values.
        // A more robust way would be for loadInputFromLocalStorage to return true if it loaded and calculated.
        if (!localStorage.getItem(LOCAL_STORAGE_KEY)) {
             calculateAndDisplaySavings();
        }
    }

    const clearDataBtn = document.getElementById('clearSavingsDataBtn');
    if (clearDataBtn) {
        clearDataBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to clear saved data for the Savings Calculator?')) {
                localStorage.removeItem(LOCAL_STORAGE_KEY);
                alert('Saved data for the Savings Calculator has been cleared. Input fields will be reset to defaults.');

                // Reset input fields to their default values
                initialSavingsEl.value = '10000';
                monthlySavingsEl.value = '500';
                currentAgeEl.value = '30';
                annualInterestRateEl.value = '5';
                numberOfYearsEl.value = '10';

                // Update display spans for sliders
                if (initialSavingsValueDisplay) initialSavingsValueDisplay.textContent = formatCurrency(initialSavingsEl.value);
                if (monthlySavingsValueDisplay) monthlySavingsValueDisplay.textContent = formatCurrency(monthlySavingsEl.value);
                if (currentAgeValueDisplay) currentAgeValueDisplay.textContent = currentAgeEl.value + ' years';
                if (annualInterestRateValueDisplay) annualInterestRateValueDisplay.textContent = annualInterestRateEl.value + '%';
                if (numberOfYearsValueDisplay) numberOfYearsValueDisplay.textContent = numberOfYearsEl.value + ' years';

                // Recalculate and update chart with default values
                calculateAndDisplaySavings();
            }
        });
    }
}
