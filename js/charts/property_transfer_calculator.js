function initPropertyTransferCalculator() {
    const STORAGE_KEY = 'propertyTransferCalculatorInputs';

    // --- Helper Functions ---
    function formatNumber(num) {
        if (isNaN(num)) return "N/A";
        return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    }

    // Helper function to parse numbers that might have spaces
    function parseNumber(str) {
        if (typeof str !== 'string' || str.trim() === '') return NaN;
        return parseFloat(str.replace(/\s/g, ''));
    }

    // Function to handle input formatting
    function setupInputFormatting(inputId) {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('input', function (e) {
                // Remove non-digit characters except for the initial separator logic
                let value = e.target.value.replace(/[^\d]/g, '');
                if (value) {
                    // Format the number with spaces
                    e.target.value = value.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
                }
            });
        }
    }

    // Apply formatting to currency inputs
    setupInputFormatting('propertyMarketValue');
    setupInputFormatting('parentsOriginalAcquisitionCost');
    setupInputFormatting('hypotheticalTaxAssessmentValue');
    setupInputFormatting('considerationFromChild');

    const calculateBtn = document.getElementById('calculatePropertyTransfer');
    if (calculateBtn) {
        calculateBtn.addEventListener('click', () => {
            calculateAndDisplay();
            saveInputs(); // Save on calculation
        });
    } else {
        console.error("Calculate button not found for property transfer calculator.");
    }

    // --- Local Storage Functions ---
    function saveInputs() {
        const inputs = {
            propertyMarketValue: document.getElementById('propertyMarketValue').value,
            parentsOriginalAcquisitionCost: document.getElementById('parentsOriginalAcquisitionCost').value,
            hypotheticalTaxAssessmentValue: document.getElementById('hypotheticalTaxAssessmentValue').value,
            capitalGainsTaxRate: document.getElementById('capitalGainsTaxRate').value,
            considerationFromChild: document.getElementById('considerationFromChild').value,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(inputs));
        console.log('Property transfer inputs saved to localStorage.');
    }

    function loadInputs() {
        const savedInputs = localStorage.getItem(STORAGE_KEY);
        if (savedInputs) {
            const inputs = JSON.parse(savedInputs);
            document.getElementById('propertyMarketValue').value = inputs.propertyMarketValue || '';
            document.getElementById('parentsOriginalAcquisitionCost').value = inputs.parentsOriginalAcquisitionCost || '';
            document.getElementById('hypotheticalTaxAssessmentValue').value = inputs.hypotheticalTaxAssessmentValue || '';
            document.getElementById('capitalGainsTaxRate').value = inputs.capitalGainsTaxRate || '22';
            document.getElementById('considerationFromChild').value = inputs.considerationFromChild || '';
            console.log('Property transfer inputs loaded from localStorage.');
            
            // Trigger calculation with loaded data if essential fields are present
            if (inputs.propertyMarketValue && inputs.parentsOriginalAcquisitionCost && inputs.hypotheticalTaxAssessmentValue) {
                calculateAndDisplay();
            }
        }
    }

    function calculateAndDisplay() {
        const errorDiv = document.getElementById('propertyTransferError');
        errorDiv.textContent = ''; // Clear previous errors

        // 1. GET INPUT DATA
        const propertyMarketValue = parseNumber(document.getElementById('propertyMarketValue').value);
        const parentsOriginalAcquisitionCost = parseNumber(document.getElementById('parentsOriginalAcquisitionCost').value);
        const hypotheticalTaxAssessmentValue = parseNumber(document.getElementById('hypotheticalTaxAssessmentValue').value);
        const capitalGainsTaxRate = parseFloat(document.getElementById('capitalGainsTaxRate').value);
        const considerationFromChildStr = document.getElementById('considerationFromChild').value;
        const considerationFromChild = considerationFromChildStr.trim() === '' ? 0 : parseNumber(considerationFromChildStr);

        // 2. INPUT VALIDATION
        if (isNaN(propertyMarketValue) || isNaN(parentsOriginalAcquisitionCost) || isNaN(hypotheticalTaxAssessmentValue) || isNaN(capitalGainsTaxRate)) {
            errorDiv.textContent = "Please enter correct numerical values for all required fields.";
            return;
        }

        const capitalGainsTaxRateDecimal = capitalGainsTaxRate / 100;

        // 3. CALCULATIONS

        // CASE 1: Parents sell the property directly
        const calculateCapitalGainOnSale = propertyMarketValue - parentsOriginalAcquisitionCost;
        const calculateCapitalGainsTaxOnSale = calculateCapitalGainOnSale > 0 ? calculateCapitalGainOnSale * capitalGainsTaxRateDecimal : 0;
        const whatParentsReceiveAfterTax = propertyMarketValue - calculateCapitalGainsTaxOnSale;

        // CASE 2: Parents gift the property to the child
        let textForCapitalGainsTaxOnGift, whatParentsReceiveWithConsideration, childsFutureAcquisitionCost, summaryParentsReceiveGiftCase;

        if (considerationFromChild < hypotheticalTaxAssessmentValue) {
            // Gift case
            textForCapitalGainsTaxOnGift = "0 kr (Tax deferred)";
            whatParentsReceiveWithConsideration = formatNumber(considerationFromChild) + " kr";
            // According to continuity principle, child takes over parent's acquisition cost.
            childsFutureAcquisitionCost = formatNumber(parentsOriginalAcquisitionCost) + " kr"; 
            summaryParentsReceiveGiftCase = formatNumber(considerationFromChild) + " kr";
        } else {
            // Purchase case - This triggers tax for the parents as if it were a sale at the consideration price.
            const gainOnTransfer = considerationFromChild - parentsOriginalAcquisitionCost;
            const taxOnTransfer = gainOnTransfer > 0 ? gainOnTransfer * capitalGainsTaxRateDecimal : 0;
            textForCapitalGainsTaxOnGift = `Capital Gains Tax triggered: ${formatNumber(taxOnTransfer)} kr`;
            whatParentsReceiveWithConsideration = "Not classified as a gift (classified as a purchase)";
            childsFutureAcquisitionCost = `Child's acquisition cost is the consideration: ${formatNumber(considerationFromChild)} kr`;
            summaryParentsReceiveGiftCase = `Parents receive ${formatNumber(considerationFromChild - taxOnTransfer)} kr after tax.`;
        }

        // 4. PRESENTATION OF RESULTS
        document.getElementById('saleCapitalGain').textContent = formatNumber(calculateCapitalGainOnSale) + " kr";
        document.getElementById('saleCapitalGainsTax').textContent = formatNumber(calculateCapitalGainsTaxOnSale) + " kr";
        document.getElementById('saleParentsReceive').textContent = formatNumber(whatParentsReceiveAfterTax) + " kr";

        document.getElementById('giftCapitalGainsTax').textContent = textForCapitalGainsTaxOnGift;
        document.getElementById('giftParentsReceivePure').textContent = "0 kr";
        document.getElementById('giftParentsReceiveConsideration').textContent = whatParentsReceiveWithConsideration;
        document.getElementById('giftThreshold').textContent = formatNumber(hypotheticalTaxAssessmentValue) + " kr";
        document.getElementById('giftChildsAcquisitionCost').textContent = childsFutureAcquisitionCost;
        document.getElementById('giftSummaryParentsReceive').textContent = summaryParentsReceiveGiftCase;
    }

    // --- Initial Load ---
    loadInputs();
}
