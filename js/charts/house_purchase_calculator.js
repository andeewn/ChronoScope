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

    // --- Input Formatting ---
    const formatNumberInput = (e) => {
        let value = e.target.value.replace(/\s/g, '');
        if (!isNaN(value) && value.length > 0) {
            e.target.value = parseInt(value, 10).toLocaleString('sv-SE');
        }
    };

    document.getElementById('hpc-purchase-price').addEventListener('input', formatNumberInput);
    document.getElementById('hpc-existing-deeds').addEventListener('input', formatNumberInput);
    document.getElementById('hpc-gross-income').addEventListener('input', formatNumberInput);

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
        const indata = {
            köpeskilling: parseFormattedNumber(document.getElementById('hpc-purchase-price').value),
            bolåneandelProcent: parseFloat(document.getElementById('hpc-loan-percentage').value),
            befintligaPantbrev: parseFormattedNumber(document.getElementById('hpc-existing-deeds').value),
            antagenRäntaProcent: parseFloat(document.getElementById('hpc-interest-rate').value),
            hushålletsBruttoårsinkomst: parseFormattedNumber(document.getElementById('hpc-gross-income').value),
            drift_uppvärmning_månad: parseFloat(document.getElementById('hpc-heating').value),
            drift_hushållsel_månad: parseFloat(document.getElementById('hpc-electricity').value),
            drift_vatten_avlopp_månad: parseFloat(document.getElementById('hpc-water-sewage').value),
            drift_renhållning_månad: parseFloat(document.getElementById('hpc-waste').value),
            drift_sotning_månad: parseFloat(document.getElementById('hpc-sweeping').value),
            drift_bredband_tv_månad: parseFloat(document.getElementById('hpc-broadband').value),
            försäkring_villaförsäkring_månad: parseFloat(document.getElementById('hpc-insurance').value),
            tomträttsavgäld_månad: parseFloat(document.getElementById('hpc-leasehold').value),
            samfällighetsavgift_månad: parseFloat(document.getElementById('hpc-community-fee').value),
            sparande_underhållsfond_månad: parseFloat(document.getElementById('hpc-maintenance-fund').value),
            kostnad_överlåtelsebesiktning: parseFloat(document.getElementById('hpc-inspection-cost').value),
            kostnad_bankavgifter: parseFloat(document.getElementById('hpc-bank-fees').value),
            kostnad_flytt_och_städ: parseFloat(document.getElementById('hpc-moving-cost').value),
            antagenÅrligVärdeökningProcent: parseFloat(document.getElementById('hpc-value-increase').value),
            antalÅrFörPrognos: parseInt(document.getElementById('hpc-projection-years').value, 10)
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

    function beräknaLånekostnader(bolånebelopp, indata) {
        const årligBruttoräntekostnad = bolånebelopp * (indata.antagenRäntaProcent / 100);
        
        const räntekostnadUppTill100k = Math.min(årligBruttoräntekostnad, 100000);
        const avdrag30procent = räntekostnadUppTill100k * 0.30;
        
        let räntekostnadÖver100k = årligBruttoräntekostnad - 100000;
        if (räntekostnadÖver100k < 0) räntekostnadÖver100k = 0;
        const avdrag21procent = räntekostnadÖver100k * 0.21;
        
        const totalÅrligSkattereduktion = avdrag30procent + avdrag21procent;
        
        const belåningsgrad = bolånebelopp / indata.köpeskilling;
        const skuldkvot = bolånebelopp / indata.hushålletsBruttoårsinkomst;
        let amorteringsprocent = 0;
        
        if (belåningsgrad > 0.7) {
            amorteringsprocent = 0.02;
        } else if (belåningsgrad > 0.5) {
            amorteringsprocent = 0.01;
        }
        
        if (skuldkvot > 4.5) {
            amorteringsprocent += 0.01;
        }
        
        const årligAmortering = bolånebelopp * amorteringsprocent;
        
        return {
            årligBruttoräntekostnad: årligBruttoräntekostnad,
            totalÅrligSkattereduktion: totalÅrligSkattereduktion,
            årligNettoräntekostnad: årligBruttoräntekostnad - totalÅrligSkattereduktion,
            årligAmortering: årligAmortering,
            månatligNettoräntekostnad: (årligBruttoräntekostnad - totalÅrligSkattereduktion) / 12,
            månatligAmortering: årligAmortering / 12
        };
    }

    function beräknaTotalMånadskostnad(lånekostnader, indata) {
        const fastighetsavgift_månad = Math.min(indata.köpeskilling * 0.0075, FASTIGHETSAVGIFT_MAX_ÅR) / 12;
        
        const summaDriftskostnader_månad = indata.drift_uppvärmning_månad + indata.drift_hushållsel_månad +
                                    indata.drift_vatten_avlopp_månad + indata.drift_renhållning_månad +
                                    indata.drift_sotning_månad + indata.drift_bredband_tv_månad +
                                    indata.försäkring_villaförsäkring_månad + indata.tomträttsavgäld_månad +
                                    indata.samfällighetsavgift_månad + fastighetsavgift_månad;
                                    
        const totalMånadskostnad = lånekostnader.månatligNettoräntekostnad + lånekostnader.månatligAmortering +
                                 summaDriftskostnader_månad + indata.sparande_underhållsfond_månad;

        return {
            "Nettoräntekostnad": lånekostnader.månatligNettoräntekostnad,
            "Amortering": lånekostnader.månatligAmortering,
            "Summa drift, avgifter, försäkring": summaDriftskostnader_månad,
            "Sparande till underhåll": indata.sparande_underhållsfond_månad,
            "TOTAL MÅNATLIG BOENDEKOSTNAD": totalMånadskostnad
        };
    }

    function beräknaFörmögenhetsutveckling(årligAmortering, indata) {
        const prognosLista = [];
        let aktuelltVärde = indata.köpeskilling;
        let aktuellSkuld = indata.köpeskilling * (indata.bolåneandelProcent / 100);

        for (let år = 1; år <= indata.antalÅrFörPrognos; år++) {
            aktuelltVärde *= (1 + (indata.antagenÅrligVärdeökningProcent / 100));
            aktuellSkuld -= årligAmortering;
            if (aktuellSkuld < 0) aktuellSkuld = 0;

            const nettoförmögenhet = aktuelltVärde - aktuellSkuld;

            prognosLista.push({
                år: år,
                husetsVärde: Math.round(aktuelltVärde),
                kvarvarandeSkuld: Math.round(aktuellSkuld),
                nettoförmögenhetIBoendet: Math.round(nettoförmögenhet)
            });
        }
        return prognosLista;
    }

    // --- Display Functions ---
    function displayResults(engångskostnader, totalMånadskostnad, prognos) {
        resultsSection.style.display = 'block';

        // Display one-time costs
        document.getElementById('hpc-total-initial-outlay').textContent = formatCurrency(engångskostnader.totaltInitialtKassaUtlägg);
        document.getElementById('hpc-down-payment').textContent = formatCurrency(engångskostnader.kontantinsats);
        document.getElementById('hpc-legal-costs').textContent = formatCurrency(engångskostnader.kostnadLagfart + engångskostnader.kostnadNyaPantbrev);
        document.getElementById('hpc-other-fees').textContent = formatCurrency(engångskostnader.summaÖvrigaAvgifter);

        // Display monthly costs
        document.getElementById('hpc-total-monthly-cost').textContent = formatCurrency(totalMånadskostnad["TOTAL MÅNATLIG BOENDEKOSTNAD"]);
        document.getElementById('hpc-net-interest-cost').textContent = formatCurrency(totalMånadskostnad.Nettoräntekostnad);
        document.getElementById('hpc-amortization-cost').textContent = formatCurrency(totalMånadskostnad.Amortering);
        document.getElementById('hpc-operating-costs').textContent = formatCurrency(totalMånadskostnad["Summa drift, avgifter, försäkring"]);
        document.getElementById('hpc-maintenance-saving').textContent = formatCurrency(totalMånadskostnad["Sparande till underhåll"]);

        // Display projection table
        const tableBody = document.querySelector('#hpc-projection-table tbody');
        tableBody.innerHTML = '';
        prognos.forEach(item => {
            const row = `<tr>
                <td>${item.år}</td>
                <td>${formatCurrency(item.husetsVärde)} kr</td>
                <td>${formatCurrency(item.kvarvarandeSkuld)} kr</td>
                <td>${formatCurrency(item.nettoförmögenhetIBoendet)} kr</td>
            </tr>`;
            tableBody.innerHTML += row;
        });

        // Display chart
        updateChart(prognos);
    }

    function updateChart(prognos) {
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
                    borderColor: '#A2D2FF',
                    backgroundColor: 'rgba(162, 210, 255, 0.2)',
                    fill: true,
                    tension: 0.1
                }, {
                    label: 'Kvarvarande Skuld (kr)',
                    data: debtData,
                    borderColor: '#FFC8DD',
                    backgroundColor: 'rgba(255, 200, 221, 0.2)',
                    fill: false,
                    tension: 0.1
                }, {
                    label: 'Nettoförmögenhet i Boendet (kr)',
                    data: netWealthData,
                    borderColor: '#BDE0FE',
                    backgroundColor: 'rgba(189, 224, 254, 0.5)',
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

    // --- Event Listener ---
    calculateBtn.addEventListener('click', calculateAll);

    // --- Initial Calculation on Load ---
    calculateAll();
})();
