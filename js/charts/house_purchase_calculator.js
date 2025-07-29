// Self-executing function to avoid polluting the global scope
(() => {
    // Check if the calculator's container is on the page
    if (!document.getElementById('hpc-calculate-btn')) {
        // If not, it means this script is loaded on a page without this specific calculator.
        // This can happen if the script is loaded globally but the HTML for it is not present.
        return;
    }

    // --- Constants ---
    const LAGFART_PROCENT = 0.015;
    const LAGFART_ADMIN_AVGIFT = 825;
    const PANTBREV_PROCENT = 0.02;
    const PANTBREV_ADMIN_AVGIFT = 375;
    const FASTIGHETSAVGIFT_MAX_ÅR = 9525; // For income year 2024

    // --- DOM Elements ---
    const calculateBtn = document.getElementById('hpc-calculate-btn');
    const resultsSection = document.getElementById('hpc-results');
    let wealthChart = null;
    let costBreakdownChart = null;

    // --- DOM Elements for Dynamic Operating Costs ---
    const expenseNameEl = document.getElementById('hpc-expenseName');
    const expenseCostEl = document.getElementById('hpc-expenseCost');
    const expenseOccurrenceEl = document.getElementById('hpc-expenseOccurrence');
    const addExpenseBtn = document.getElementById('hpc-addExpenseBtn');
    const currentExpensesTableBodyEl = document.getElementById('hpc-currentExpensesTableBody');
    const totalAnnualCostEl = document.getElementById('hpc-total-annual-operating-cost');
    const totalMonthlyCostEl = document.getElementById('hpc-total-monthly-operating-cost');

    // --- State for Dynamic Costs ---
    let operatingExpenses = [];
    let editingExpenseId = null;
    const LOCAL_STORAGE_KEY_HPC_EXPENSES = 'hpcOperatingExpenses';


    // --- Input Formatting ---
    const formatNumberInput = (e) => {
        let value = e.target.value.replace(/\s/g, '');
        if (!isNaN(value) && value.length > 0) {
            e.target.value = parseInt(value, 10).toLocaleString('sv-SE');
        }
    };

    const formatCurrencyForInput = (value) => {
        const num = parseInt(String(value).replace(/\s/g, ''), 10);
        if (isNaN(num)) return '';
        return new Intl.NumberFormat('sv-SE').format(num);
    };

    document.getElementById('hpc-purchase-price').addEventListener('input', formatNumberInput);
    document.getElementById('hpc-existing-deeds').addEventListener('input', formatNumberInput);
    document.getElementById('hpc-gross-income').addEventListener('input', formatNumberInput);
    expenseCostEl.addEventListener('input', (e) => {
        e.target.value = formatCurrencyForInput(e.target.value);
    });


    // --- Helper Functions ---
    const parseFormattedNumber = (str) => {
        if (typeof str !== 'string') str = String(str);
        return parseFloat(str.replace(/\s/g, '').replace(',', '.')) || 0;
    };

    const formatCurrency = (num) => {
        return Math.round(num).toLocaleString('sv-SE');
    };

    // --- Main Calculation Logic ---
    const calculateAll = () => {
        // 1. Get all input values
        const totalAnnualOperatingCost = operatingExpenses.reduce((sum, exp) => sum + exp.annualCost, 0);

        const indata = {
            köpeskilling: parseFormattedNumber(document.getElementById('hpc-purchase-price').value),
            bolåneandelProcent: parseFloat(document.getElementById('hpc-loan-percentage').value),
            befintligaPantbrev: parseFormattedNumber(document.getElementById('hpc-existing-deeds').value),
            antagenRäntaProcent: parseFloat(document.getElementById('hpc-interest-rate').value),
            hushålletsBruttoårsinkomst: parseFormattedNumber(document.getElementById('hpc-gross-income').value),
            totalMånadsdrift: totalAnnualOperatingCost / 12,
            // sparande_underhållsfond_månad: parseFloat(document.getElementById('hpc-maintenance-fund').value), // This is now part of dynamic costs
            kostnad_överlåtelsebesiktning: parseFloat(document.getElementById('hpc-inspection-cost').value),
            kostnad_bankavgifter: parseFloat(document.getElementById('hpc-bank-fees').value),
            kostnad_flytt_och_städ: parseFloat(document.getElementById('hpc-moving-cost').value),
            antagenÅrligVärdeökningProcent: parseFloat(document.getElementById('hpc-value-increase').value),
            antalÅrFörPrognos: parseInt(document.getElementById('hpc-projection-years').value, 10),
            driftskostnadsökningProcent: parseFloat(document.getElementById('hpc-operating-cost-increase').value)
        };

        // A. Calculate one-time costs
        const engångskostnader = beräknaEngångskostnader(indata);
        const bolånebelopp = engångskostnader.beräknatBolån;

        // B. Calculate loan costs
        const lånekostnader = beräknaLånekostnader(bolånebelopp, indata);

        // C. Calculate total monthly cost
        const totalMånadskostnad = beräknaTotalMånadskostnad(lånekostnader, indata);

        // D. Calculate wealth projection
        const förmögenhetsprognos = beräknaFörmögenhetsutveckling(lånekostnader.årligAmortering, indata);

        // E. Display results
        displayResults(engångskostnader, totalMånadskostnad, förmögenhetsprognos);
    };

    // --- Calculation Helper Functions (from pseudocode) ---

    function beräknaEngångskostnader(indata) {
        const bolånebelopp = indata.köpeskilling * (indata.bolåneandelProcent / 100);
        const kontantinsats = indata.köpeskilling - bolånebelopp;
        const kostnadLagfart = (indata.köpeskilling * LAGFART_PROCENT) + LAGFART_ADMIN_AVGIFT;
        
        let behovAvNyaPantbrev = bolånebelopp - indata.befintligaPantbrev;
        if (behovAvNyaPantbrev < 0) behovAvNyaPantbrev = 0;
        
        const kostnadNyaPantbrev = (behovAvNyaPantbrev * PANTBREV_PROCENT) + PANTBREV_ADMIN_AVGIFT;
        const summaÖvrigaAvgifter = indata.kostnad_överlåtelsebesiktning + indata.kostnad_bankavgifter + indata.kostnad_flytt_och_städ;
        const totaltInitialtKassaUtlägg = kontantinsats + kostnadLagfart + kostnadNyaPantbrev + summaÖvrigaAvgifter;

        return {
            beräknatBolån: bolånebelopp,
            kontantinsats: kontantinsats,
            kostnadLagfart: kostnadLagfart,
            kostnadNyaPantbrev: kostnadNyaPantbrev,
            summaÖvrigaAvgifter: summaÖvrigaAvgifter,
            totaltInitialtKassaUtlägg: totaltInitialtKassaUtlägg
        };
    }

    function beräknaÅrligAmortering(aktuellSkuld, köpeskilling, bruttoårsinkomst) {
        // Amortization rules are based on the original purchase price and income.
        const belåningsgrad = aktuellSkuld / köpeskilling;
        const skuldkvot = aktuellSkuld / bruttoårsinkomst;
        let amorteringsprocent = 0;

        if (belåningsgrad > 0.7) {
            amorteringsprocent = 0.02;
        } else if (belåningsgrad > 0.5) {
            amorteringsprocent = 0.01;
        }

        if (skuldkvot > 4.5) {
            amorteringsprocent += 0.01;
        }

        return aktuellSkuld * amorteringsprocent;
    }

    function beräknaLånekostnader(bolånebelopp, indata) {
        const årligBruttoräntekostnad = bolånebelopp * (indata.antagenRäntaProcent / 100);
        
        const räntekostnadUppTill100k = Math.min(årligBruttoräntekostnad, 100000);
        const avdrag30procent = räntekostnadUppTill100k * 0.30;
        
        let räntekostnadÖver100k = årligBruttoräntekostnad - 100000;
        if (räntekostnadÖver100k < 0) räntekostnadÖver100k = 0;
        const avdrag21procent = räntekostnadÖver100k * 0.21;
        
        const totalÅrligSkattereduktion = avdrag30procent + avdrag21procent;
        
        // Calculate initial amortization for the summary box
        const årligAmortering = beräknaÅrligAmortering(bolånebelopp, indata.köpeskilling, indata.hushålletsBruttoårsinkomst);
        
        return {
            årligBruttoräntekostnad: årligBruttoräntekostnad,
            totalÅrligSkattereduktion: totalÅrligSkattereduktion,
            årligNettoräntekostnad: årligBruttoräntekostnad - totalÅrligSkattereduktion,
            årligAmortering: årligAmortering, // Initial amortization
            månatligNettoräntekostnad: (årligBruttoräntekostnad - totalÅrligSkattereduktion) / 12,
            månatligAmortering: årligAmortering / 12
        };
    }

    function beräknaTotalMånadskostnad(lånekostnader, indata) {
        const fastighetsavgift_månad = Math.min(indata.köpeskilling * 0.0075, FASTIGHETSAVGIFT_MAX_ÅR) / 12;
        
        const summaDriftskostnader_månad = indata.totalMånadsdrift + fastighetsavgift_månad;
                                    
        const totalMånadskostnad = lånekostnader.månatligNettoräntekostnad + lånekostnader.månatligAmortering +
                                 summaDriftskostnader_månad;

        return {
            "Nettoräntekostnad": lånekostnader.månatligNettoräntekostnad,
            "Amortering": lånekostnader.månatligAmortering,
            "Summa drift, avgifter, försäkring": summaDriftskostnader_månad,
            "TOTAL MÅNATLIG BOENDEKOSTNAD": totalMånadskostnad
        };
    }

    function beräknaFörmögenhetsutveckling(initialAmortering, indata) {
        const prognosLista = [];
        const kostnadsutveckling = [];
        let aktuelltVärde = indata.köpeskilling;
        let aktuellSkuld = indata.köpeskilling * (indata.bolåneandelProcent / 100);

        // New logic for operating cost increase
        const driftskostnadsökningFaktor = 1 + (indata.driftskostnadsökningProcent / 100);
        let aktuellÅrligDriftskostnad = indata.totalMånadsdrift * 12; // Start with the initial annual cost

        const fastighetsavgift_årlig = Math.min(indata.köpeskilling * 0.0075, FASTIGHETSAVGIFT_MAX_ÅR);

        for (let år = 1; år <= indata.antalÅrFörPrognos; år++) {
            // --- Cost calculations for the current year ---
            const årligBruttoräntekostnad = aktuellSkuld * (indata.antagenRäntaProcent / 100);
            const räntekostnadUppTill100k = Math.min(årligBruttoräntekostnad, 100000);
            const avdrag30procent = räntekostnadUppTill100k * 0.30;
            let räntekostnadÖver100k = årligBruttoräntekostnad - 100000;
            if (räntekostnadÖver100k < 0) räntekostnadÖver100k = 0;
            const avdrag21procent = räntekostnadÖver100k * 0.21;
            const totalÅrligSkattereduktion = avdrag30procent + avdrag21procent;
            const månatligNettoräntekostnad = (årligBruttoräntekostnad - totalÅrligSkattereduktion) / 12;
            
            const årligAmorteringFörÅret = beräknaÅrligAmortering(aktuellSkuld, indata.köpeskilling, indata.hushålletsBruttoårsinkomst);
            const månatligAmortering = årligAmorteringFörÅret / 12;

            // Calculate current year's operating cost
            const totalDriftOchAvgifterMånad = (aktuellÅrligDriftskostnad + fastighetsavgift_årlig) / 12;

            kostnadsutveckling.push({
                år: år,
                nettoränta: månatligNettoräntekostnad,
                amortering: månatligAmortering,
                drift: totalDriftOchAvgifterMånad,
                underhåll: 0 // This is now part of dynamic costs
            });

            // --- Wealth calculations for the next year ---
            aktuelltVärde *= (1 + (indata.antagenÅrligVärdeökningProcent / 100));
            aktuellSkuld -= årligAmorteringFörÅret;
            if (aktuellSkuld < 0) aktuellSkuld = 0;

            const nettoförmögenhet = aktuelltVärde - aktuellSkuld;

            prognosLista.push({
                år: år,
                husetsVärde: Math.round(aktuelltVärde),
                kvarvarandeSkuld: Math.round(aktuellSkuld),
                årligAmortering: Math.round(årligAmorteringFörÅret),
                nettoförmögenhetIBoendet: Math.round(nettoförmögenhet)
            });

            // --- Update operating cost for the NEXT year ---
            aktuellÅrligDriftskostnad *= driftskostnadsökningFaktor;
        }
        return { prognosLista, kostnadsutveckling };
    }

    // --- Display Functions ---
    function displayResults(engångskostnader, totalMånadskostnad, prognosData) {
        const { prognosLista, kostnadsutveckling } = prognosData;
        resultsSection.style.display = 'block';

        // Display one-time costs
        document.getElementById('hpc-total-initial-outlay').textContent = formatCurrency(engångskostnader.totaltInitialtKassaUtlägg);
        document.getElementById('hpc-down-payment').textContent = formatCurrency(engångskostnader.kontantinsats);
        document.getElementById('hpc-legal-costs').textContent = formatCurrency(engångskostnader.kostnadLagfart + engångskostnader.kostnadNyaPantbrev);
        document.getElementById('hpc-other-fees').textContent = formatCurrency(engångskostnader.summaÖvrigaAvgifter);

        // Display initial monthly costs
        const totalMonthly = totalMånadskostnad["TOTAL MÅNATLIG BOENDEKOSTNAD"];
        const totalYearly = totalMonthly * 12;
        document.getElementById('hpc-total-monthly-cost').textContent = formatCurrency(totalMonthly);
        document.getElementById('hpc-total-yearly-cost').textContent = formatCurrency(totalYearly);
        document.getElementById('hpc-net-interest-cost').textContent = formatCurrency(totalMånadskostnad.Nettoräntekostnad);
        document.getElementById('hpc-amortization-cost').textContent = formatCurrency(totalMånadskostnad.Amortering);
        document.getElementById('hpc-operating-costs').textContent = formatCurrency(totalMånadskostnad["Summa drift, avgifter, försäkring"]);
        document.getElementById('hpc-maintenance-saving').textContent = "Ingår i drift"; // Updated text

        // Display projection table
        const tableBody = document.querySelector('#hpc-projection-table tbody');
        tableBody.innerHTML = '';
        prognosLista.forEach(item => {
            const row = `<tr>
                <td>${item.år}</td>
                <td>${formatCurrency(item.husetsVärde)} kr</td>
                <td>${formatCurrency(item.kvarvarandeSkuld)} kr</td>
                <td>${formatCurrency(item.årligAmortering)} kr</td>
                <td>${formatCurrency(item.nettoförmögenhetIBoendet)} kr</td>
            </tr>`;
            tableBody.innerHTML += row;
        });

        // Display charts
        updateWealthChart(prognosLista);
        updateCostBreakdownChart(kostnadsutveckling);
    }

    function updateWealthChart(prognos) {
        const ctx = document.getElementById('hpc-wealth-chart').getContext('2d');
        const labels = prognos.map(p => `År ${p.år}`);
        const houseValueData = prognos.map(p => p.husetsVärde);
        const debtData = prognos.map(p => p.kvarvarandeSkuld);
        const netWealthData = prognos.map(p => p.nettoförmögenhetIBoendet);

        if (wealthChart) {
            wealthChart.destroy();
        }

        wealthChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Husets Värde (kr)',
                    data: houseValueData,
                    borderColor: 'hsl(207, 100%, 75%)', // #A2D2FF
                    backgroundColor: 'hsla(207, 100%, 75%, 0.2)',
                    fill: true,
                    tension: 0.1
                }, {
                    label: 'Kvarvarande Skuld (kr)',
                    data: debtData,
                    borderColor: 'hsl(340, 100%, 87%)', // #FFC8DD
                    backgroundColor: 'hsla(340, 100%, 87%, 0.2)',
                    fill: false,
                    tension: 0.1
                }, {
                    label: 'Nettoförmögenhet i Boendet (kr)',
                    data: netWealthData,
                    borderColor: 'hsl(210, 100%, 87%)', // #BDE0FE
                    backgroundColor: 'hsla(210, 100%, 87%, 0.5)',
                    fill: true,
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: false,
                        ticks: {
                            callback: function(value, index, values) {
                                return formatCurrency(value) + ' kr';
                            }
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += formatCurrency(context.parsed.y) + ' kr';
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }

    function updateCostBreakdownChart(kostnadsutveckling) {
        const ctx = document.getElementById('hpc-cost-breakdown-chart').getContext('2d');
        const labels = kostnadsutveckling.map(k => `År ${k.år}`);

        if (costBreakdownChart) {
            costBreakdownChart.destroy();
        }

        costBreakdownChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Nettoräntekostnad',
                        data: kostnadsutveckling.map(k => k.nettoränta),
                        backgroundColor: 'hsl(207, 100%, 85%)', // Lighter blue
                    },
                    {
                        label: 'Amortering',
                        data: kostnadsutveckling.map(k => k.amortering),
                        backgroundColor: 'hsl(340, 100%, 90%)', // Lighter pink
                    },
                    {
                        label: 'Drift & Avgifter',
                        data: kostnadsutveckling.map(k => k.drift),
                        backgroundColor: 'hsl(189, 100%, 85%)', // Lighter cyan
                    },
                    // {
                    //     label: 'Underhållssparande',
                    //     data: kostnadsutveckling.map(k => k.underhåll),
                    //     backgroundColor: 'hsl(50, 100%, 85%)', // Lighter yellow
                    // }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        stacked: true,
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return formatCurrency(value) + ' kr';
                            }
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += formatCurrency(context.parsed.y) + ' kr';
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }

    // --- Event Listener ---
    calculateBtn.addEventListener('click', calculateAll);
    addExpenseBtn.addEventListener('click', handleAddOrUpdateExpense);
    currentExpensesTableBodyEl.addEventListener('click', handleTableActions);


    // --- Dynamic Operating Cost Functions ---

    function handleAddOrUpdateExpense() {
        const name = expenseNameEl.value.trim();
        const cost = parseFormattedNumber(expenseCostEl.value);
        const occurrence = expenseOccurrenceEl.value;

        if (!name) {
            alert('Vänligen fyll i ett giltigt namn på kostnaden.');
            return;
        }
        if (isNaN(cost) || cost <= 0) {
            alert('Vänligen fyll i en positiv siffra för kostnaden.');
            return;
        }
        if (!occurrence) {
            alert('Vänligen välj ett intervall för kostnaden.');
            return;
        }

        const annualCost = calculateAnnualCost(cost, occurrence);

        if (editingExpenseId !== null) {
            const expense = operatingExpenses.find(exp => exp.id === editingExpenseId);
            if (!expense) {
                alert('Kostnaden kunde inte hittas för uppdatering. Försök igen.');
                editingExpenseId = null;
                addExpenseBtn.textContent = 'Lägg till kostnad';
                resetExpenseForm();
                return;
            }
            expense.name = name;
            expense.cost = cost;
            expense.occurrence = occurrence;
            expense.annualCost = annualCost;
            editingExpenseId = null;
            addExpenseBtn.textContent = 'Lägg till kostnad';
        } else {
            const newExpense = { id: Date.now(), name, cost, occurrence, annualCost };
            operatingExpenses.push(newExpense);
        }

        resetExpenseForm();
        updateExpensesDisplay();
        saveExpensesToLocalStorage();
        calculateAll(); // Recalculate everything when an expense changes
    }

    function handleTableActions(event) {
        const target = event.target;
        if (target.classList.contains('hpc-edit-btn')) {
            const id = parseInt(target.dataset.id, 10);
            const expense = operatingExpenses.find(exp => exp.id === id);
            expenseNameEl.value = expense.name;
            expenseCostEl.value = formatCurrencyForInput(expense.cost);
            expenseOccurrenceEl.value = expense.occurrence;
            editingExpenseId = id;
            addExpenseBtn.textContent = 'Uppdatera kostnad';
        } else if (target.classList.contains('hpc-remove-btn')) {
            const id = parseInt(target.dataset.id, 10);
            operatingExpenses = operatingExpenses.filter(exp => exp.id !== id);
            updateExpensesDisplay();
            saveExpensesToLocalStorage();
            calculateAll(); // Recalculate everything
        }
    }

    function calculateAnnualCost(cost, occurrence) {
        switch (occurrence) {
            case 'daily': return cost * 365;
            case 'weekly': return cost * 52;
            case 'monthly': return cost * 12;
            case 'quarterly': return cost * 4;
            case 'yearly': return cost;
            default: return 0;
        }
    }

    function resetExpenseForm() {
        expenseNameEl.value = '';
        expenseCostEl.value = '';
        expenseOccurrenceEl.value = 'monthly';
        expenseNameEl.focus();
    }

    function updateExpensesDisplay() {
        currentExpensesTableBodyEl.innerHTML = '';
        let totalAnnual = 0;

        // Helper to escape text for textContent
        function createCell(row, text) {
            const cell = row.insertCell();
            cell.textContent = text;
        }

        operatingExpenses.forEach(exp => {
            const row = currentExpensesTableBodyEl.insertRow();
            createCell(row, exp.name); // Safe: textContent escapes
            createCell(row, formatCurrency(exp.cost));
            createCell(row, exp.occurrence.charAt(0).toUpperCase() + exp.occurrence.slice(1));
            createCell(row, formatCurrency(exp.annualCost));
            // Action buttons
            const actionCell = row.insertCell();
            const editBtn = document.createElement('button');
            editBtn.className = 'hpc-edit-btn';
            editBtn.dataset.id = exp.id;
            editBtn.textContent = '✏️';
            const removeBtn = document.createElement('button');
            removeBtn.className = 'hpc-remove-btn';
            removeBtn.dataset.id = exp.id;
            removeBtn.textContent = '❌';
            actionCell.appendChild(editBtn);
            actionCell.appendChild(removeBtn);
            totalAnnual += exp.annualCost;
        });

        totalAnnualCostEl.textContent = formatCurrency(totalAnnual) + ' kr';
        totalMonthlyCostEl.textContent = formatCurrency(totalAnnual / 12) + ' kr';
    }

    function saveExpensesToLocalStorage() {
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY_HPC_EXPENSES, JSON.stringify(operatingExpenses));
        } catch (e) {
            console.error('Kunde inte spara kostnader till localStorage:', e);
            // Optionally show a user message here
        }
    }

    function loadExpensesFromLocalStorage() {
        let saved = null;
        try {
            saved = localStorage.getItem(LOCAL_STORAGE_KEY_HPC_EXPENSES);
        } catch (e) {
            console.error('Kunde inte läsa kostnader från localStorage:', e);
            // Optionally show a user message here
            return;
        }
        if (saved) {
            try {
                operatingExpenses = JSON.parse(saved);
                updateExpensesDisplay();
            } catch (e) {
                console.error('Fel vid tolkning av sparade kostnader:', e);
                // Optionally show a user message here
            }
        }
    }

    // --- Initial Load ---
    loadExpensesFromLocalStorage();
    calculateAll();
})();
