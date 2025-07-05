function initHousePurchaseCalculator() {
    const calculateBtn = document.getElementById('hpc-calculate-btn');
    if (calculateBtn) {
        if (!calculateBtn.dataset.listenerAttached) {
            calculateBtn.addEventListener('click', calculateHousePurchase);
            calculateBtn.dataset.listenerAttached = 'true';
        }
    }

    // Add formatting to number inputs
    ['hpc-purchase-price', 'hpc-down-payment', 'hpc-existing-mortgage-deeds', 'hpc-household-income', 'hpc-community-fee', 'hpc-insurance'].forEach(id => {
        const input = document.getElementById(id);
        if (input && !input.dataset.listenerAttached) {
            input.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\s/g, '').replace(/[^0-9]/g, '');
                e.target.value = formatNumber(value);
            });
            input.dataset.listenerAttached = 'true';
        }
    });
}

// The main script will call this function after loading the HTML.
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHousePurchaseCalculator);
} else {
    // DOM is already ready, check if the container is there
    if (document.getElementById('hpc-calculate-btn')) {
        initHousePurchaseCalculator();
    }
}

function formatNumber(num) {
    if (!num) return "";
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function parseFormattedNumber(str) {
    return parseInt(str.replace(/\s/g, ''), 10) || 0;
}

function calculateHousePurchase() {
    // --- STEG 1: FASTA VÄRDEN OCH KONSTANTER ---
    const LAGFART_PROCENT = 0.015;
    const LAGFART_ADMIN_AVGIFT = 825;
    const PANTBREV_PROCENT = 0.02;
    const PANTBREV_ADMIN_AVGIFT = 375;
    const FASTIGHETSAVGIFT_MAX = 9525;
    const MORA_RENHÅLLNING_ÅRSAVGIFT = 2531;
    const MORA_VA_FAST_ÅRSAVGIFT = 7869.50;
    const MORA_VA_RÖRLIG_AVGIFT_PER_M3 = 46.20;
    const MORA_SOTNING_STANDARD_ÅRSAVGIFT = 431;
    const RÄNTEAVDRAG_GRÄNS = 100000;
    const RÄNTEAVDRAG_LÅG_SATS = 0.30;
    const RÄNTEAVDRAG_HÖG_SATS = 0.21;

    // --- STEG 2: ANVÄNDARINPUT ---
    const input = {
        köpeskilling: parseFormattedNumber(document.getElementById('hpc-purchase-price').value),
        kontantinsats: parseFormattedNumber(document.getElementById('hpc-down-payment').value),
        befintligaPantbrev: parseFormattedNumber(document.getElementById('hpc-existing-mortgage-deeds').value),
        hushålletsBruttoårsinkomst: parseFormattedNumber(document.getElementById('hpc-household-income').value),
        beräknadRäntaProcent: parseFloat(document.getElementById('hpc-interest-rate').value),
        beräknadÅrligElförbrukning_kWh: parseInt(document.getElementById('hpc-electricity-usage').value),
        elpris_per_kWh: parseFloat(document.getElementById('hpc-electricity-price').value),
        beräknadÅrligVattenförbrukning_m3: parseInt(document.getElementById('hpc-water-usage').value),
        årsavgiftSamfällighet: parseFormattedNumber(document.getElementById('hpc-community-fee').value),
        försäkring: parseFormattedNumber(document.getElementById('hpc-insurance').value)
    };

    // --- STEG 3: HUVUDFUNKTION FÖR BERÄKNING ---
    const resultat = beräknaHuskalkyl(input);

    // --- STEG 4: PRESENTERA SVARET ---
    displayResults(resultat);
}

function beräknaHuskalkyl(inputData) {
    const {
        köpeskilling,
        kontantinsats,
        befintligaPantbrev,
        hushålletsBruttoårsinkomst,
        beräknadRäntaProcent,
        beräknadÅrligElförbrukning_kWh,
        elpris_per_kWh,
        beräknadÅrligVattenförbrukning_m3,
        årsavgiftSamfällighet,
        försäkring
    } = inputData;

    // --- A. BERÄKNA ENGÅNGSKOSTNADER ---
    const lånbehov = köpeskilling - kontantinsats;
    const lagfartKostnad = (köpeskilling * 0.015) + 825;
    const nyttPantbrevsBehov = lånbehov - befintligaPantbrev;
    let pantbrevsKostnad = 0;
    if (nyttPantbrevsBehov > 0) {
        pantbrevsKostnad = (nyttPantbrevsBehov * 0.02) + 375;
    }
    const totalEngångskostnad = kontantinsats + lagfartKostnad + pantbrevsKostnad;

    // --- B. BERÄKNA ÅRLIGA DRIFTSKOSTNADER ---
    const uppvärmningOchEl = beräknadÅrligElförbrukning_kWh * elpris_per_kWh;
    const vattenOchAvlopp = 7869.50 + (beräknadÅrligVattenförbrukning_m3 * 46.20);
    const renhållning = 2531;
    const fastighetsavgift = Math.min(köpeskilling * 0.0075, 9525);
    const underhållsbudget = köpeskilling * 0.01;
    const övrigt = 431 + årsavgiftSamfällighet;
    const totalÅrligDriftskostnad = uppvärmningOchEl + vattenOchAvlopp + renhållning + fastighetsavgift + försäkring + underhållsbudget + övrigt;

    // --- C. BERÄKNA LÅNEKOSTNADER ---
    const årligRäntekostnad = lånbehov * (beräknadRäntaProcent / 100);
    const belåningsgrad = lånbehov / köpeskilling;
    const skuldkvot = lånbehov / hushålletsBruttoårsinkomst;
    let amorteringskravProcent = 0;
    if (belåningsgrad > 0.7) {
        amorteringskravProcent = 0.02;
    } else if (belåningsgrad > 0.5) {
        amorteringskravProcent = 0.01;
    }
    if (skuldkvot > 4.5) {
        amorteringskravProcent += 0.01;
    }
    const årligAmortering = lånbehov * amorteringskravProcent;

    // --- D. BERÄKNA RÄNTEAVDRAG ---
    let årligtRänteavdrag;
    if (årligRäntekostnad <= 100000) {
        årligtRänteavdrag = årligRäntekostnad * 0.30;
    } else {
        const del1 = 100000 * 0.30;
        const del2 = (årligRäntekostnad - 100000) * 0.21;
        årligtRänteavdrag = del1 + del2;
    }

    // --- E. SAMMANSTÄLL RESULTAT ---
    const totalÅrligBoendekostnad = totalÅrligDriftskostnad + årligRäntekostnad + årligAmortering;
    const boendekostnadNetto = totalÅrligBoendekostnad - årligtRänteavdrag;

    return {
        engångskostnader: {
            "Kontantinsats": kontantinsats,
            "Lagfart": lagfartKostnad,
            "Nya pantbrev": pantbrevsKostnad,
            "SUMMA (att ha på banken)": totalEngångskostnad
        },
        månadskostnader: {
            "Drift (el, VA, sopor, försäkring m.m.)": totalÅrligDriftskostnad / 12,
            "Räntekostnad (före avdrag)": årligRäntekostnad / 12,
            "Amortering (sparande i boendet)": årligAmortering / 12,
            "BRUTTOKOSTNAD / MÅNAD": totalÅrligBoendekostnad / 12,
            "Ränteavdrag (skattereduktion)": -årligtRänteavdrag / 12,
            "NETTOKOSTNAD / MÅNAD": boendekostnadNetto / 12
        }
    };
}

function displayResults(resultat) {
    const oneTimeTable = document.getElementById('hpc-one-time-costs-table');
    const monthlyTable = document.getElementById('hpc-monthly-costs-table');
    const resultsContainer = document.getElementById('hpc-results-container');

    oneTimeTable.innerHTML = '';
    monthlyTable.innerHTML = '';

    for (const [key, value] of Object.entries(resultat.engångskostnader)) {
        const row = oneTimeTable.insertRow();
        const cell1 = row.insertCell(0);
        const cell2 = row.insertCell(1);
        cell1.textContent = key;
        cell2.textContent = `${formatNumber(Math.round(value))} kr`;
        if (key.startsWith("SUMMA")) {
            row.classList.add("summary-row");
        }
    }

    for (const [key, value] of Object.entries(resultat.månadskostnader)) {
         if (key.startsWith("---")) {
            const row = monthlyTable.insertRow();
            const cell1 = row.insertCell(0);
            cell1.colSpan = 2;
            cell1.innerHTML = '<hr>';
        } else {
            const row = monthlyTable.insertRow();
            const cell1 = row.insertCell(0);
            const cell2 = row.insertCell(1);
            cell1.textContent = key;
            cell2.textContent = `${formatNumber(Math.round(value))} kr`;
             if (key.startsWith("BRUTTO") || key.startsWith("NETTO")) {
                row.classList.add("summary-row");
            }
        }
    }

    resultsContainer.style.display = 'block';
}
