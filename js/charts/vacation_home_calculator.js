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

// Main calculation function, made global for access from main.js
function calculateVacationHomeFinances() {
    // 1. Get Input Values
    const purchasePrice = parseFormattedNumber(document.getElementById('purchasePrice').value);
    const downPaymentPercentage = parseFloat(document.getElementById('downPaymentPercentage').value) / 100;
    const annualPriceIncrease = parseFloat(document.getElementById('annualPriceIncrease').value) / 100;
    const livingArea = parseFloat(document.getElementById('livingArea').value);
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
}

// Event listener setup function
function setupVacationHomeListeners() {
    const calculateBtn = document.getElementById('calculateVacationHome');
    if (calculateBtn && !calculateBtn.dataset.listenerAttached) { // Prevent attaching multiple listeners
        calculateBtn.addEventListener('click', calculateVacationHomeFinances);
        calculateBtn.dataset.listenerAttached = 'true';
    }

    const currencyInputs = [
        'purchasePrice', 'avgWeeklyRentalPrice', 'operatingCosts',
        'insuranceCost', 'propertyFee', 'inspectionCost', 'bankAdminFees'
    ];

    currencyInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input && !input.dataset.listenerAttached) { // Prevent attaching multiple listeners
            input.addEventListener('input', formatCurrencyInput);
            formatCurrencyInput.call(input); // Format on load if there's a default value
            input.dataset.listenerAttached = 'true';
        }
    });
}

// Call setup listeners and initial calculation when the script is loaded
document.addEventListener('DOMContentLoaded', setupVacationHomeListeners);
document.addEventListener('DOMContentLoaded', calculateVacationHomeFinances); // Initial calculation on page load
