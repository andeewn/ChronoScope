const LOCAL_STORAGE_KEY_VACATION_HOME = 'vacationHomeCalculatorInputs';

// Helper functions (can be global or part of a module pattern)
function formatCurrencyInput() {
    let value = this.value.replace(/\s/g, ''); // Remove existing spaces
    if (value) {
        // Convert to number, then format with spaces as thousand separators
        this.value = parseFloat(value).toLocaleString('sv-SE').replace(/,/g, ' ');
    }
}

function parseFormattedNumber(str) {
    return parseFloat(str.replace(/\s/g, '').replace(',', '.'));
}

function formatSEK(amount) {
    return `${Math.round(amount).toLocaleString('sv-SE').replace(/,/g, ' ')} SEK`;
}

function saveInputsToLocalStorage() {
    const inputIds = [
        'purchasePrice', 'downPaymentPercentage', 'annualPriceIncrease',
        'interestRate', 'amortizationRequirement', 'avgWeeklyRentalPrice',
        'numRentalWeeks', 'operatingCosts', 'insuranceCost',
        'maintenanceCostPercentage', 'propertyFee', 'inspectionCost',
        'bankAdminFees', 'analysisPeriodYears'
    ];
    const inputValues = {};
    inputIds.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            inputValues[id] = element.value;
        }
    });
    localStorage.setItem(LOCAL_STORAGE_KEY_VACATION_HOME, JSON.stringify(inputValues));
}

function loadInputsFromLocalStorage() {
    const savedData = localStorage.getItem(LOCAL_STORAGE_KEY_VACATION_HOME);
    const allInputIds = [
        'purchasePrice', 'downPaymentPercentage', 'annualPriceIncrease',
        'interestRate', 'amortizationRequirement', 'avgWeeklyRentalPrice',
        'numRentalWeeks', 'operatingCosts', 'insuranceCost',
        'maintenanceCostPercentage', 'propertyFee', 'inspectionCost',
        'bankAdminFees', 'analysisPeriodYears'
    ];
    const currencyInputIds = [
        'purchasePrice', 'avgWeeklyRentalPrice', 'operatingCosts',
        'insuranceCost', 'propertyFee', 'inspectionCost', 'bankAdminFees'
    ];

    if (savedData) {
        try {
            const loadedInputs = JSON.parse(savedData);
            allInputIds.forEach(id => {
                const element = document.getElementById(id);
                if (element && loadedInputs[id] !== undefined) {
                    element.value = loadedInputs[id];
                }
            });

            // After setting all values, format the currency inputs
            currencyInputIds.forEach(id => {
                const element = document.getElementById(id);
                if (element && element.value) { // Check if element exists and has a value to format
                    formatCurrencyInput.call(element);
                }
            });
            return true; // Data loaded and processed
        } catch (e) {
            console.error("Error parsing saved vacation home data from localStorage:", e);
            return false; // Error occurred
        }
    }
    return false; // No data found
}

// Main calculation function, made global for access from main.js
function calculateVacationHomeFinances() {
    saveInputsToLocalStorage(); // Save inputs at the beginning
    // 1. Get Input Values
    const purchasePrice = parseFormattedNumber(document.getElementById('purchasePrice').value);
    const downPaymentPercentage = parseFloat(document.getElementById('downPaymentPercentage').value) / 100;
    const annualPriceIncrease = parseFloat(document.getElementById('annualPriceIncrease').value) / 100;
    const interestRate = parseFloat(document.getElementById('interestRate').value) / 100;
    const amortizationRequirement = parseFloat(document.getElementById('amortizationRequirement').value) / 100;
    const avgWeeklyRentalPrice = parseFormattedNumber(document.getElementById('avgWeeklyRentalPrice').value);
    const numRentalWeeks = parseFloat(document.getElementById('numRentalWeeks').value);
    const operatingCosts = parseFormattedNumber(document.getElementById('operatingCosts').value);
    const insuranceCost = parseFormattedNumber(document.getElementById('insuranceCost').value);
    const maintenanceCostPercentage = parseFloat(document.getElementById('maintenanceCostPercentage').value) / 100;
    const propertyFee = parseFormattedNumber(document.getElementById('propertyFee').value);
    const inspectionCost = parseFormattedNumber(document.getElementById('inspectionCost').value);
    const bankAdminFees = parseFormattedNumber(document.getElementById('bankAdminFees').value);
    const analysisPeriodYears = parseInt(document.getElementById('analysisPeriodYears').value);

    // --- Calculations ---

    // Initial Costs at Purchase
    const downPayment = purchasePrice * downPaymentPercentage;
    const loanAmount = purchasePrice - downPayment;
    const stampDuty = purchasePrice * 0.015; // 1.5% of purchase price
    const mortgageDeed = loanAmount * 0.02; // 2% of new loan amount
    const totalInitialCost = downPayment + stampDuty + mortgageDeed + inspectionCost + bankAdminFees;

    document.getElementById('initialDownPayment').textContent = formatSEK(downPayment);
    document.getElementById('initialStampDuty').textContent = formatSEK(stampDuty);
    document.getElementById('initialMortgageDeed').textContent = formatSEK(mortgageDeed);
    document.getElementById('initialInspectionCost').textContent = formatSEK(inspectionCost);
    document.getElementById('initialBankAdminFees').textContent = formatSEK(bankAdminFees);
    document.getElementById('totalInitialCost').textContent = formatSEK(totalInitialCost);

    // Potential Annual Rental Income
    const grossRentalIncome = avgWeeklyRentalPrice * numRentalWeeks;
    const standardDeduction = 40000;
    const deductionRight = grossRentalIncome * 0.20; // 20% deduction right
    const taxableIncome = Math.max(0, grossRentalIncome - standardDeduction - deductionRight);
    const taxOnRentalIncome = taxableIncome * 0.30; // 30% tax
    const netRentalIncome = grossRentalIncome - taxOnRentalIncome;

    document.getElementById('grossRentalIncome').textContent = formatSEK(grossRentalIncome);
    document.getElementById('taxOnRentalIncome').textContent = formatSEK(taxOnRentalIncome);
    document.getElementById('netRentalIncome').textContent = formatSEK(netRentalIncome);

    // Annual Ongoing Costs (First Year)
    const firstYearInterest = loanAmount * interestRate;
    const firstYearAmortization = loanAmount * amortizationRequirement;
    const firstYearMaintenance = purchasePrice * maintenanceCostPercentage;
    const firstYearTotalAnnualCosts = firstYearInterest + firstYearAmortization + propertyFee + operatingCosts + insuranceCost + firstYearMaintenance;

    document.getElementById('firstYearInterest').textContent = formatSEK(firstYearInterest);
    document.getElementById('firstYearAmortization').textContent = formatSEK(firstYearAmortization);
    document.getElementById('firstYearPropertyFee').textContent = formatSEK(propertyFee);
    document.getElementById('firstYearOperatingCosts').textContent = formatSEK(operatingCosts);
    document.getElementById('firstYearInsurance').textContent = formatSEK(insuranceCost);
    document.getElementById('firstYearMaintenance').textContent = formatSEK(firstYearMaintenance);
    document.getElementById('firstYearTotalAnnualCosts').textContent = formatSEK(firstYearTotalAnnualCosts);

    // Annual Net Result (Operations)
    const annualNetResult = netRentalIncome - firstYearTotalAnnualCosts;
    document.getElementById('annualNetResult').textContent = formatSEK(annualNetResult);

    // Break-even Analysis
    const rentalWeeksBreakEven = firstYearTotalAnnualCosts / avgWeeklyRentalPrice;
    document.getElementById('rentalWeeksBreakEven').textContent = `${Math.round(rentalWeeksBreakEven * 10) / 10} weeks`; // One decimal place

    let recoupYears = 'N/A';
    if (annualNetResult > 0) {
        recoupYears = Math.ceil(totalInitialCost / annualNetResult);
        recoupYears = `${recoupYears} years`;
    }
    document.getElementById('recoupYears').textContent = recoupYears;

    // Ten-Year Overview & Final Summary
    let currentLoanBalance = loanAmount;
    let currentPropertyValue = purchasePrice;
    let cumulativeOperationalResult = 0;
    const overviewTableBody = document.getElementById('vacationHomeOverviewTable').querySelector('tbody');
    overviewTableBody.innerHTML = ''; // Clear previous results

    for (let year = 1; year <= analysisPeriodYears; year++) {
        const annualInterest = currentLoanBalance * interestRate;
        const annualAmortization = currentLoanBalance * amortizationRequirement;
        const annualMaintenance = purchasePrice * maintenanceCostPercentage; // Maintenance based on original purchase price
        const totalAnnualCosts = annualInterest + annualAmortization + propertyFee + operatingCosts + insuranceCost + annualMaintenance;

        const annualOperationalResult = netRentalIncome - totalAnnualCosts;
        cumulativeOperationalResult += annualOperationalResult;

        currentLoanBalance = Math.max(0, currentLoanBalance - annualAmortization); // Loan balance decreases with amortization
        currentPropertyValue *= (1 + annualPriceIncrease);

        const row = overviewTableBody.insertRow();
        row.insertCell().textContent = year;
        row.insertCell().textContent = formatSEK(totalAnnualCosts);
        row.insertCell().textContent = formatSEK(netRentalIncome);
        row.insertCell().textContent = formatSEK(annualOperationalResult);
        row.insertCell().textContent = formatSEK(cumulativeOperationalResult);
        row.insertCell().textContent = formatSEK(currentPropertyValue);
    }

    document.getElementById('totalOperationalResult').textContent = formatSEK(cumulativeOperationalResult);
    document.getElementById('finalPropertyValue').textContent = formatSEK(currentPropertyValue);
    const overallFinancialOutcome = cumulativeOperationalResult + (currentPropertyValue - purchasePrice); // Operational result + property appreciation
    document.getElementById('overallFinancialOutcome').textContent = formatSEK(overallFinancialOutcome);

    // --- Chart Rendering ---
    const ctx = document.getElementById('vacationHomeChart').getContext('2d');

    // Destroy existing chart if it exists
    if (vacationHomeChart) {
        vacationHomeChart.destroy();
    }

    const years = [];
    const propertyValues = [];
    const loanBalances = [];
    const cumulativeResults = [];

    // Re-run the loop to collect data for the chart
    let chartCurrentLoanBalance = loanAmount;
    let chartCurrentPropertyValue = purchasePrice;
    let chartCumulativeOperationalResult = 0;

    for (let year = 1; year <= analysisPeriodYears; year++) {
        years.push(`Year ${year}`);

        const annualInterest = chartCurrentLoanBalance * interestRate;
        const annualAmortization = chartCurrentLoanBalance * amortizationRequirement;
        const annualMaintenance = purchasePrice * maintenanceCostPercentage;
        const totalAnnualCosts = annualInterest + annualAmortization + propertyFee + operatingCosts + insuranceCost + annualMaintenance;

        const annualOperationalResult = netRentalIncome - totalAnnualCosts;
        chartCumulativeOperationalResult += annualOperationalResult;

        chartCurrentLoanBalance = Math.max(0, chartCurrentLoanBalance - annualAmortization);
        chartCurrentPropertyValue *= (1 + annualPriceIncrease);

        propertyValues.push(chartCurrentPropertyValue);
        loanBalances.push(chartCurrentLoanBalance);
        cumulativeResults.push(chartCumulativeOperationalResult);
    }

    vacationHomeChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: years,
            datasets: [
                {
                    label: 'Estimated Property Value (SEK)',
                    data: propertyValues,
                    borderColor: '#A2D2FF', // Pastel blue
                    backgroundColor: 'rgba(162, 210, 255, 0.2)',
                    fill: false,
                    tension: 0.1
                },
                {
                    label: 'Remaining Loan Balance (SEK)',
                    data: loanBalances,
                    borderColor: '#FFC8DD', // Pastel pink
                    backgroundColor: 'rgba(255, 200, 221, 0.2)',
                    fill: false,
                    tension: 0.1
                },
                {
                    label: 'Cumulative Net Result (SEK)',
                    data: cumulativeResults,
                    borderColor: '#B0E0E6', // Pastel light blue
                    backgroundColor: 'rgba(176, 224, 230, 0.2)',
                    fill: false,
                    tension: 0.1
                },
                {
                    label: 'Total Initial Investment (SEK)',
                    data: Array(analysisPeriodYears).fill(totalInitialCost), // Horizontal line
                    borderColor: '#CCCCCC', // Grey
                    borderDash: [5, 5], // Dashed line
                    backgroundColor: 'transparent',
                    fill: false,
                    pointRadius: 0 // No points for this line
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Vacation Home Financial Projection'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += formatSEK(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Year'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Amount (SEK)'
                    },
                    ticks: {
                        callback: function(value) {
                            return formatSEK(value);
                        }
                    }
                }
            }
        }
    });
}

let vacationHomeChart; // Declare chart variable globally

// Event listener setup function
function setupVacationHomeListeners() {
    const allInputs = [
        'purchasePrice', 'downPaymentPercentage', 'annualPriceIncrease',
        'interestRate', 'amortizationRequirement', 'avgWeeklyRentalPrice',
        'numRentalWeeks', 'operatingCosts', 'insuranceCost',
        'maintenanceCostPercentage', 'propertyFee', 'inspectionCost',
        'bankAdminFees', 'analysisPeriodYears'
    ];

    allInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input && !input.dataset.listenerAttached) { // Prevent attaching multiple listeners
            input.addEventListener('input', function() {
                // For currency inputs, format first then calculate
                if (['purchasePrice', 'avgWeeklyRentalPrice', 'operatingCosts',
                     'insuranceCost', 'propertyFee', 'inspectionCost', 'bankAdminFees'].includes(id)) {
                    formatCurrencyInput.call(this);
                }
                calculateVacationHomeFinances();
            });
            input.dataset.listenerAttached = 'true';
        }
    });

    // Initial formatting for currency inputs on load
    // This is now conditional based on whether data was loaded.
    // If dataLoaded is true, loadInputsFromLocalStorage handled formatting.
    if (!dataLoaded) {
        const currencyInputsIds = [ // Renamed to avoid conflict
            'purchasePrice', 'avgWeeklyRentalPrice', 'operatingCosts',
            'insuranceCost', 'propertyFee', 'inspectionCost', 'bankAdminFees'
        ];
        currencyInputsIds.forEach(id => {
            const input = document.getElementById(id);
            if (input && input.value) { // Check if input exists and has a value
                formatCurrencyInput.call(input);
            }
        });
    }
}

// Call setup listeners and initial calculation when the script is loaded
let dataLoaded = false; // Variable to track if data was loaded
document.addEventListener('DOMContentLoaded', () => {
    dataLoaded = loadInputsFromLocalStorage(); // Load first
    setupVacationHomeListeners();          // Then setup listeners (which now conditionally formats)
    calculateVacationHomeFinances();       // Then calculate with loaded/default values
});
