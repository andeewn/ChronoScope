// This script will be loaded after charts/true_cost_calculator.html is injected into index.html

if (typeof Chart === 'undefined') {
    console.error('Chart.js is not loaded. Make sure it is included in index.html.');
} else {
    initializeTrueCostCalculator();
}

function initializeTrueCostCalculator() {
    const LOCAL_STORAGE_KEY_TRUE_COST = 'trueCostCalculatorInputs';

    const itemPriceEl = document.getElementById('itemPrice');
    const downPaymentEl = document.getElementById('downPayment');
    const loanInterestRateEl = document.getElementById('loanInterestRate');
    const loanTermYearsEl = document.getElementById('loanTermYears');
    const investmentInterestRateEl = document.getElementById('investmentInterestRate');
    const calculateBtn = document.getElementById('calculateTrueCostBtn');

    const directPurchasePriceOutEl = document.getElementById('directPurchasePrice');
    const totalCostIfFinancedOutEl = document.getElementById('totalCostIfFinanced');
    const totalLoanInterestPaidOutEl = document.getElementById('totalLoanInterestPaid');
    const potentialValueIfInvestedOutEl = document.getElementById('potentialValueIfInvested');
    const potentialInvestmentGainOutEl = document.getElementById('potentialInvestmentGain'); // Added this line
    
    const trueCostChartCanvas = document.getElementById('trueCostChart');
    let trueCostChartInstance = null;

    if (!calculateBtn || !itemPriceEl || !downPaymentEl) { // Check a few key elements
        console.warn("True Cost calculator elements not immediately found. Retrying in a moment...");
        setTimeout(initializeTrueCostCalculator, 100); // Retry initialization
        return;
    }
    
    calculateBtn.addEventListener('click', calculateAndDisplayTrueCost);

    // Helper function for OUTPUT currency formatting (e.g., 1 234 567 kr)
    function formatCurrency(number) {
        const num = Number(number);
        if (isNaN(num)) return '0 kr';
        const roundedNum = Math.round(num);
        return `${new Intl.NumberFormat('sv-SE').format(roundedNum)} kr`;
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

    // Add event listeners for input formatting for Item Price and Down Payment
    [itemPriceEl, downPaymentEl].forEach(el => {
        el.addEventListener('input', (e) => {
            const rawValue = e.target.value.replace(/\s/g, '');
            if (/^\d*$/.test(rawValue)) {
                const caretPosition = e.target.selectionStart;
                const oldValueLength = e.target.value.length;
                e.target.value = formatForInputDisplay(rawValue);
                const newValueLength = e.target.value.length;
                if (caretPosition !== null) {
                    e.target.setSelectionRange(caretPosition + (newValueLength - oldValueLength), caretPosition + (newValueLength - oldValueLength));
                }
            } else {
                e.target.value = formatForInputDisplay(rawValue.replace(/\D/g, ''));
            }
        });
        el.addEventListener('blur', (e) => {
            e.target.value = formatForInputDisplay(e.target.value.replace(/\s/g, ''));
        });
        // Format initial values
        el.value = formatForInputDisplay(el.value);
    });

    function saveInputsToLocalStorage() {
        const inputValues = {
            itemPrice: parseInputFormattedValue(itemPriceEl.value),
            downPayment: parseInputFormattedValue(downPaymentEl.value),
            loanInterestRate: loanInterestRateEl.value,
            loanTermYears: loanTermYearsEl.value,
            investmentInterestRate: investmentInterestRateEl.value
        };
        localStorage.setItem(LOCAL_STORAGE_KEY_TRUE_COST, JSON.stringify(inputValues));
    }

    function calculateAndDisplayTrueCost() {
        const itemPrice = parseInputFormattedValue(itemPriceEl.value);
        const downPayment = parseInputFormattedValue(downPaymentEl.value);
        const annualLoanInterestRate = parseFloat(loanInterestRateEl.value) / 100;
        const loanTermYears = parseInt(loanTermYearsEl.value);
        const annualInvestmentInterestRate = parseFloat(investmentInterestRateEl.value) / 100;

        if (isNaN(itemPrice) || itemPrice <= 0 ||
            isNaN(downPayment) || downPayment < 0 ||
            isNaN(annualLoanInterestRate) || annualLoanInterestRate < 0 ||
            isNaN(loanTermYears) || loanTermYears <= 0 ||
            isNaN(annualInvestmentInterestRate) || annualInvestmentInterestRate < 0) {
            alert('Please enter valid positive numbers for all fields. Down payment can be zero.');
            return;
        }

        if (downPayment > itemPrice) {
            alert('Down payment cannot exceed the item price.');
            return;
        }

        saveInputsToLocalStorage(); // Save valid inputs

        // 1. Direct Purchase Price
        const directPurchasePrice = itemPrice;

        // 2. Cost with Loan
        const loanPrincipal = itemPrice - downPayment;
        let totalCostIfFinanced = itemPrice; // Start with item price (includes downpayment)
        let totalLoanInterestPaid = 0;

        if (loanPrincipal > 0 && annualLoanInterestRate > 0) {
            const monthlyLoanInterestRate = annualLoanInterestRate / 12;
            const numberOfLoanPayments = loanTermYears * 12;
            
            // Monthly payment M = P * [r(1+r)^n] / [(1+r)^n - 1]
            // If interest rate is 0, monthly payment is P/n
            let monthlyPayment;
            if (monthlyLoanInterestRate === 0) {
                monthlyPayment = loanPrincipal / numberOfLoanPayments;
            } else {
                 monthlyPayment = loanPrincipal * 
                                (monthlyLoanInterestRate * Math.pow(1 + monthlyLoanInterestRate, numberOfLoanPayments)) / 
                                (Math.pow(1 + monthlyLoanInterestRate, numberOfLoanPayments) - 1);
            }

            const totalAmountPaidForLoan = monthlyPayment * numberOfLoanPayments;
            totalLoanInterestPaid = totalAmountPaidForLoan - loanPrincipal;
            totalCostIfFinanced = downPayment + totalAmountPaidForLoan; // Down payment + total paid for loan part
        } else if (loanPrincipal > 0 && annualLoanInterestRate === 0) { // Loan exists but 0% interest
            totalLoanInterestPaid = 0;
            totalCostIfFinanced = itemPrice; // No interest, so just item price
        } else { // No loan needed (itemPrice === downPayment) or loanPrincipal is 0
            totalLoanInterestPaid = 0;
            totalCostIfFinanced = itemPrice;
        }


        // 3. Potential Value if Invested (Opportunity Cost)
        // Investment amount is the full item price, period is loan term years
        const investmentPeriodYears = loanTermYears;
        let potentialValueIfInvested = itemPrice; // Start with the principal
        if (annualInvestmentInterestRate > 0) {
             potentialValueIfInvested = itemPrice * Math.pow(1 + annualInvestmentInterestRate, investmentPeriodYears);
        }
       

        // Calculate Potential Gain
        const potentialInvestmentGain = potentialValueIfInvested - directPurchasePrice;

        // Update Output Area
        directPurchasePriceOutEl.textContent = formatCurrency(directPurchasePrice);
        totalCostIfFinancedOutEl.textContent = formatCurrency(totalCostIfFinanced);
        totalLoanInterestPaidOutEl.textContent = formatCurrency(totalLoanInterestPaid);
        potentialValueIfInvestedOutEl.textContent = formatCurrency(potentialValueIfInvested);
        potentialInvestmentGainOutEl.textContent = formatCurrency(potentialInvestmentGain); // Added this line

        // Render Chart
        renderTrueCostChart([
            Math.round(directPurchasePrice), 
            Math.round(totalCostIfFinanced), 
            Math.round(potentialValueIfInvested)
        ]);
    }

    function renderTrueCostChart(dataValues) {
        if (trueCostChartInstance) {
            trueCostChartInstance.destroy();
        }
        const ctx = trueCostChartCanvas.getContext('2d');
        trueCostChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Direct Purchase', 'Cost if Financed', 'Potential if Invested'],
                datasets: [{
                    label: 'Cost Comparison (kr)',
                    data: dataValues,
                    backgroundColor: [
                        '#A2D2FF', // Pastel Blue
                        '#FFC8DD', // Pastel Pink
                        '#C1E1C1'  // Pastel Green (new, or choose from existing like #BDE0FE)
                    ],
                    borderColor: [
                        '#A2D2FF',
                        '#FFC8DD',
                        '#C1E1C1'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return formatCurrency(value).replace(' kr', '');
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false // Bar chart often doesn't need a legend for single dataset
                    },
                    tooltip: {
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
                }
            }
        });
    }

    // Add event listeners to all input fields to trigger recalculation on change
    const allInputs = [itemPriceEl, downPaymentEl, loanInterestRateEl, loanTermYearsEl, investmentInterestRateEl];
    allInputs.forEach(inputEl => {
        inputEl.addEventListener('input', calculateAndDisplayTrueCost);
    });
    
    // Format initial input values that need it
    // This will be done *after* attempting to load from localStorage,
    // so it acts as a fallback for first-time use or if localStorage is empty.
    // The load function will handle formatting if data is loaded.

    function loadInputsFromLocalStorage() {
        const savedData = localStorage.getItem(LOCAL_STORAGE_KEY_TRUE_COST);
        if (savedData) {
            try {
                const loadedInputs = JSON.parse(savedData);

                // Set input values, formatting where necessary
                itemPriceEl.value = formatForInputDisplay(loadedInputs.itemPrice || itemPriceEl.value);
                downPaymentEl.value = formatForInputDisplay(loadedInputs.downPayment || downPaymentEl.value);
                loanInterestRateEl.value = loadedInputs.loanInterestRate || loanInterestRateEl.value;
                loanTermYearsEl.value = loadedInputs.loanTermYears || loanTermYearsEl.value;
                investmentInterestRateEl.value = loadedInputs.investmentInterestRate || investmentInterestRateEl.value;

                // No need to call calculateAndDisplayTrueCost here, it's called after this.
                return true; // Indicate that data was loaded
            } catch (e) {
                console.error("Error parsing saved true cost data from localStorage:", e);
                return false; // Indicate error or no data loaded
            }
        }
        return false; // Indicate no data loaded
    }

    const dataLoaded = loadInputsFromLocalStorage();

    // Format initial input values if no data was loaded from localStorage
    // and they were not formatted by the load function.
    if (!dataLoaded) {
        [itemPriceEl, downPaymentEl].forEach(el => {
            // Only format if the value hasn't been set by default HTML values already
            // or if it's not empty. This avoids formatting an empty string which might result in "0".
            // The original loop `el.value = formatForInputDisplay(el.value);` was fine.
            // Let's ensure it only runs if not loaded, to prevent double formatting if defaults were "0"
            if (el.value) { // Check if there's a default value to format
                 el.value = formatForInputDisplay(el.value);
            }
        });
    }

    // Perform an initial calculation if default values are present and valid
    // This will use loaded values if dataLoaded is true, or default/formatted values otherwise.
    if (itemPriceEl.value && loanInterestRateEl.value && loanTermYearsEl.value && investmentInterestRateEl.value) {
        // Check if the itemPrice has content. parseInputFormattedValue will return NaN for empty or non-numeric after format.
        const priceForCheck = parseInputFormattedValue(itemPriceEl.value);
        if (!isNaN(priceForCheck) && priceForCheck > 0) { // Ensure there's a valid price to calculate with
            calculateAndDisplayTrueCost();
        }
    }
}
