// This script will be loaded after charts/savings_calculator.html is injected into index.html

// Ensure Chart.js is loaded before trying to use it
if (typeof Chart === 'undefined') {
    console.error('Chart.js is not loaded. Make sure it is included in index.html.');
} else {
    initializeSavingsCalculator();
}

function initializeSavingsCalculator() {
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

    // Add event listeners for input formatting
    [initialSavingsEl, monthlySavingsEl].forEach(el => {
        el.addEventListener('input', (e) => {
            const rawValue = e.target.value.replace(/\s/g, '');
            if (/^\d*$/.test(rawValue)) { // Only allow digits
                const caretPosition = e.target.selectionStart;
                const oldValueLength = e.target.value.length;
                e.target.value = formatForInputDisplay(rawValue);
                const newValueLength = e.target.value.length;
                // Adjust caret position after formatting
                if (caretPosition !== null) {
                    e.target.setSelectionRange(caretPosition + (newValueLength - oldValueLength), caretPosition + (newValueLength - oldValueLength));
                }
            } else {
                 // If not all digits (after removing spaces), revert to previous valid numeric part
                e.target.value = formatForInputDisplay(rawValue.replace(/\D/g, ''));
            }
        });
        el.addEventListener('blur', (e) => {
            e.target.value = formatForInputDisplay(e.target.value.replace(/\s/g, ''));
        });
        // Format initial values
        el.value = formatForInputDisplay(el.value);
    });


    function calculateAndDisplaySavings() {
        const initialSavings = parseInputFormattedValue(initialSavingsEl.value);
        const monthlySavings = parseInputFormattedValue(monthlySavingsEl.value);
        const currentAgeInput = currentAgeEl.value.trim();
        let currentAge = null;
        if (currentAgeInput !== "") {
            currentAge = parseInt(currentAgeInput, 10);
            if (isNaN(currentAge) || currentAge < 0) {
                alert('Please enter a valid positive number for Current Age, or leave it empty.');
                return; // Or treat as null and proceed
            }
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
    // Also re-format input field values on load
    [initialSavingsEl, monthlySavingsEl].forEach(el => { // currentAgeEl is not formatted this way
        el.value = formatForInputDisplay(el.value);
    });
    if (initialSavingsEl.value && monthlySavingsEl.value && annualInterestRateEl.value && numberOfYearsEl.value) {
        calculateAndDisplaySavings();
    }
}
