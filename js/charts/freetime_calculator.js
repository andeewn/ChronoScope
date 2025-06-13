function initFreetimeCalculator() {
    const LOCAL_STORAGE_KEY_FREETIME = 'freetimeCalculatorInputs';

    const sleepTimeInput = document.getElementById('sleepTime');
    const sleepTimeValueSpan = document.getElementById('sleepTimeValue');
    const workSchoolTimeInput = document.getElementById('workSchoolTime');
    const workSchoolTimeValueSpan = document.getElementById('workSchoolTimeValue');
    const workSchoolDaysInput = document.getElementById('workSchoolDays');
    const workSchoolDaysValueSpan = document.getElementById('workSchoolDaysValue');
    const personalCareTimeInput = document.getElementById('personalCareTime');
    const personalCareTimeValueSpan = document.getElementById('personalCareTimeValue');
    const choresTimeInput = document.getElementById('choresTime');
    const choresTimeValueSpan = document.getElementById('choresTimeValue');

    const customActivityNameInput = document.getElementById('customActivityName');
    const customActivityTimeInput = document.getElementById('customActivityTime');
    const customActivityOccurrenceSelect = document.getElementById('customActivityOccurrence');
    const addCustomActivityBtn = document.getElementById('addCustomActivityBtn');
    const customActivitiesTableBody = document.getElementById('customActivitiesTableBody');

    const calculateFreetimeBtn = document.getElementById('calculateFreetimeBtn');
    const totalDailyCommittedTimeSpan = document.getElementById('totalDailyCommittedTime');
    const dailyFreetimeSpan = document.getElementById('dailyFreetime');
    const totalWeeklyFreetimeSpan = document.getElementById('totalWeeklyFreetime');

    const freetimePieChartCanvas = document.getElementById('freetimePieChart');
    const workdayPieChartCanvas = document.getElementById('workdayPieChart');
    const weekendPieChartCanvas = document.getElementById('weekendPieChart');

    let avgFreetimeChart, workdayChart, weekendChart;
    let customActivities = [];
    let editingActivityIndex = null; // To store the index of the activity being edited

    function formatHoursToHMS(totalHours) {
        const hours = Math.floor(Math.abs(totalHours));
        const minutes = Math.round((Math.abs(totalHours) - hours) * 60);
        const sign = totalHours < 0 ? "-" : "";
        return `${sign}${hours} hours ${minutes} minutes`;
    }

    function convertToAverageDailyHours(time, occurrence) {
        const workDays = parseInt(workSchoolDaysInput.value);
        const weekendDays = 7 - workDays;

        switch (occurrence) {
            case 'daily': return time;
            case 'weekdays': return (time * workDays) / 7;
            case 'weekends': return (time * weekendDays) / 7;
            default: return 0;
        }
    }

    function updateSliderValueDisplay(input, span, unit) {
        const value = parseFloat(input.value);
        if (unit === "hours") {
            span.textContent = `${value.toFixed(1)} hours`;
        } else if (unit === "days") {
            span.textContent = `${value} ${value === 1 ? "day" : "days"}`;
        }
        runAllCalculations();
    }

    [
        { input: sleepTimeInput, span: sleepTimeValueSpan, unit: "hours" },
        { input: workSchoolTimeInput, span: workSchoolTimeValueSpan, unit: "hours" },
        { input: personalCareTimeInput, span: personalCareTimeValueSpan, unit: "hours" },
        { input: choresTimeInput, span: choresTimeValueSpan, unit: "hours" },
        { input: workSchoolDaysInput, span: workSchoolDaysValueSpan, unit: "days" }
    ].forEach(item => {
        item.input.addEventListener('input', () => updateSliderValueDisplay(item.input, item.span, item.unit));
        updateSliderValueDisplay(item.input, item.span, item.unit);
    });

    // Handles Add or Update logic for custom activities
    addCustomActivityBtn.addEventListener('click', () => {
        const name = customActivityNameInput.value.trim();
        const time = parseFloat(customActivityTimeInput.value.replace(/\s/g, '').replace(',', '.'));
        const occurrence = customActivityOccurrenceSelect.value;

        if (!name || isNaN(time) || time <= 0) {
            alert('Please enter a valid name and a positive time for the custom activity.');
            return;
        }

        if (editingActivityIndex !== null) {
            // Update existing activity
            customActivities[editingActivityIndex] = { name, time, occurrence };
            editingActivityIndex = null; // Reset editing state
            addCustomActivityBtn.textContent = 'Add Custom Activity'; // Change button text back
        } else {
            // Add new activity
            customActivities.push({ name, time, occurrence });
        }
        saveInputsToLocalStorage(); // Save after adding/updating custom activity

        renderCustomActivities();
        runAllCalculations();
        customActivityNameInput.value = '';
        customActivityTimeInput.value = '';
        customActivityOccurrenceSelect.value = 'daily'; // Reset dropdown
        customActivityNameInput.focus();
    });

    function saveInputsToLocalStorage() {
        const inputValues = {
            sleepTime: sleepTimeInput.value,
            workSchoolTime: workSchoolTimeInput.value,
            workSchoolDays: workSchoolDaysInput.value,
            personalCareTime: personalCareTimeInput.value,
            choresTime: choresTimeInput.value,
            customActivities: customActivities
        };
        localStorage.setItem(LOCAL_STORAGE_KEY_FREETIME, JSON.stringify(inputValues));
    }

    function renderCustomActivities() {
        customActivitiesTableBody.innerHTML = '';
        customActivities.forEach((activity, index) => {
            const dailyAvg = convertToAverageDailyHours(activity.time, activity.occurrence);
            const row = customActivitiesTableBody.insertRow();
            row.innerHTML = `
                <td>${activity.name}</td>
                <td>${activity.time.toFixed(1)}</td>
                <td>${activity.occurrence.charAt(0).toUpperCase() + activity.occurrence.slice(1)}</td>
                <td>${dailyAvg.toFixed(2)}</td>
                <td class="actions-cell">
                    <button type="button" class="edit-activity-btn" data-index="${index}">✏️</button>
                    <button type="button" class="remove-expense-btn" data-index="${index}">❌</button>
                </td>
            `;
        });
    }
    
    // Event delegation for Edit and Remove buttons
    customActivitiesTableBody.addEventListener('click', function(event) {
        const target = event.target;
        if (target.classList.contains('edit-activity-btn')) {
            const index = parseInt(target.dataset.index);
            startEditActivity(index);
        } else if (target.classList.contains('remove-expense-btn')) { // Assuming same class for remove button styling
            const index = parseInt(target.dataset.index);
            removeActivity(index);
        }
    });

    function startEditActivity(index) {
        const activityToEdit = customActivities[index];
        if (!activityToEdit) return;

        customActivityNameInput.value = activityToEdit.name;
        customActivityTimeInput.value = activityToEdit.time.toFixed(1);
        customActivityOccurrenceSelect.value = activityToEdit.occurrence;

        editingActivityIndex = index;
        addCustomActivityBtn.textContent = 'Update Activity';
        customActivityNameInput.focus();
    }

    function removeActivity(index) {
        // If removing the item currently being edited, reset the form
        if (editingActivityIndex === index) {
            editingActivityIndex = null;
            addCustomActivityBtn.textContent = 'Add Custom Activity';
            customActivityNameInput.value = '';
            customActivityTimeInput.value = '';
            customActivityOccurrenceSelect.value = 'daily';
        } else if (editingActivityIndex !== null && index < editingActivityIndex) {
            // Adjust editing index if an earlier item is removed
            editingActivityIndex--;
        }

        customActivities.splice(index, 1);
        saveInputsToLocalStorage(); // Save after removing custom activity
        renderCustomActivities();
        runAllCalculations();
    }


    function runAllCalculations() {
        const totalHoursInDay = 24;

        const sleepHours = parseFloat(sleepTimeInput.value);
        const workSchoolTimeVal = parseFloat(workSchoolTimeInput.value);
        const workSchoolDaysVal = parseInt(workSchoolDaysInput.value);
        const personalCareHours = parseFloat(personalCareTimeInput.value);
        const choresHours = parseFloat(choresTimeInput.value);

        const avgDailyWorkSchoolHours = (workSchoolTimeVal * workSchoolDaysVal) / 7;
        let totalAvgCustomDailyHours = 0;
        customActivities.forEach(act => {
            totalAvgCustomDailyHours += convertToAverageDailyHours(act.time, act.occurrence);
        });
        const avgTotalDailyCommitted = sleepHours + avgDailyWorkSchoolHours + personalCareHours + choresHours + totalAvgCustomDailyHours;
        const avgDailyFreetime = totalHoursInDay - avgTotalDailyCommitted;

        totalDailyCommittedTimeSpan.textContent = formatHoursToHMS(avgTotalDailyCommitted);
        dailyFreetimeSpan.textContent = formatHoursToHMS(avgDailyFreetime);
        dailyFreetimeSpan.style.color = avgDailyFreetime < 0 ? 'red' : '';
        dailyFreetimeSpan.style.fontWeight = avgDailyFreetime < 0 ? 'bold' : '';

        const weeklySleepHours = sleepHours * 7;
        const weeklyWorkSchoolHours = workSchoolTimeVal * workSchoolDaysVal;
        const weeklyPersonalCareHours = personalCareHours * 7;
        const weeklyChoresHours = choresHours * 7;
        let totalActualCustomWeeklyHours = 0;
        customActivities.forEach(act => {
            switch (act.occurrence) {
                case 'daily': totalActualCustomWeeklyHours += act.time * 7; break;
                case 'weekdays': totalActualCustomWeeklyHours += act.time * workSchoolDaysVal; break;
                case 'weekends': totalActualCustomWeeklyHours += act.time * (7 - workSchoolDaysVal); break;
            }
        });
        const totalActualWeeklyCommitted = weeklySleepHours + weeklyWorkSchoolHours + weeklyPersonalCareHours + weeklyChoresHours + totalActualCustomWeeklyHours;
        totalWeeklyFreetimeSpan.textContent = formatHoursToHMS((totalHoursInDay * 7) - totalActualWeeklyCommitted);

        updatePieChartInstance(avgFreetimeChart, freetimePieChartCanvas, 'Average Daily Time Allocation', [
            sleepHours, avgDailyWorkSchoolHours, personalCareHours, choresHours, totalAvgCustomDailyHours, Math.max(0, avgDailyFreetime)
        ]);

        let workdayCustomHours = 0;
        customActivities.forEach(act => {
            if (act.occurrence === 'daily' || act.occurrence === 'weekdays') {
                workdayCustomHours += act.time;
            }
        });
        const workdayTotalCommitted = sleepHours + workSchoolTimeVal + personalCareHours + choresHours + workdayCustomHours;
        const workdayFreetime = totalHoursInDay - workdayTotalCommitted;
        updatePieChartInstance(workdayChart, workdayPieChartCanvas, 'Typical Work/School Day', [
            sleepHours, workSchoolTimeVal, personalCareHours, choresHours, workdayCustomHours, Math.max(0, workdayFreetime)
        ]);

        let weekendCustomHours = 0;
        customActivities.forEach(act => {
            if (act.occurrence === 'daily' || act.occurrence === 'weekends') {
                weekendCustomHours += act.time;
            }
        });
        const weekendTotalCommitted = sleepHours + personalCareHours + choresHours + weekendCustomHours;
        const weekendFreetime = totalHoursInDay - weekendTotalCommitted;
        updatePieChartInstance(weekendChart, weekendPieChartCanvas, 'Typical Weekend Day', [
            sleepHours, 0, personalCareHours, choresHours, weekendCustomHours, Math.max(0, weekendFreetime)
        ]);
        saveInputsToLocalStorage(); // Save at the end of all calculations
    }

    function updatePieChartInstance(chartInstance, canvasElement, title, dataValues) {
        const ctx = canvasElement.getContext('2d');
        const labels = ['Sleep', 'Work/School & Travel', 'Personal Care', 'Household Chores', 'Custom Activities', 'Freetime'];
        
        const chartData = {
            labels: labels,
            datasets: [{
                data: dataValues.map(val => Math.max(0, val)),
                backgroundColor: ['#A2D2FF', '#FFC8DD', '#BDE0FE', '#CDB4DB', '#A7E9AF', '#FFFACD'],
                hoverOffset: 4
            }]
        };

        const options = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${formatHoursToHMS(ctx.parsed)}` }},
                legend: { position: 'right' },
                title: { display: true, text: title }
            }
        };

        if (chartInstance) {
            chartInstance.data = chartData;
            chartInstance.options = options;
            chartInstance.update();
        } else {
            if (canvasElement.id === 'freetimePieChart') {
                avgFreetimeChart = new Chart(ctx, { type: 'pie', data: chartData, options: options });
            } else if (canvasElement.id === 'workdayPieChart') {
                workdayChart = new Chart(ctx, { type: 'pie', data: chartData, options: options });
            } else if (canvasElement.id === 'weekendPieChart') {
                weekendChart = new Chart(ctx, { type: 'pie', data: chartData, options: options });
            }
        }
    }

    function loadInputsFromLocalStorage() {
        const savedData = localStorage.getItem(LOCAL_STORAGE_KEY_FREETIME);
        if (savedData) {
            try {
                const loadedInputs = JSON.parse(savedData);

                // Set input values, falling back to current or default if necessary
                sleepTimeInput.value = loadedInputs.sleepTime || sleepTimeInput.value;
                workSchoolTimeInput.value = loadedInputs.workSchoolTime || workSchoolTimeInput.value;
                workSchoolDaysInput.value = loadedInputs.workSchoolDays || workSchoolDaysInput.value;
                personalCareTimeInput.value = loadedInputs.personalCareTime || personalCareTimeInput.value;
                choresTimeInput.value = loadedInputs.choresTime || choresTimeInput.value;

                // Manually update display spans to avoid triggering runAllCalculations multiple times
                sleepTimeValueSpan.textContent = `${parseFloat(sleepTimeInput.value).toFixed(1)} hours`;
                workSchoolTimeValueSpan.textContent = `${parseFloat(workSchoolTimeInput.value).toFixed(1)} hours`;
                const workDaysVal = parseInt(workSchoolDaysInput.value);
                workSchoolDaysValueSpan.textContent = `${workDaysVal} ${workDaysVal === 1 ? "day" : "days"}`;
                personalCareTimeValueSpan.textContent = `${parseFloat(personalCareTimeInput.value).toFixed(1)} hours`;
                choresTimeValueSpan.textContent = `${parseFloat(choresTimeInput.value).toFixed(1)} hours`;

                if (Array.isArray(loadedInputs.customActivities)) {
                    customActivities = loadedInputs.customActivities;
                }
            } catch (e) {
                console.error("Error parsing saved freetime data from localStorage:", e);
            }
        }
    }

    // Load saved data first.
    loadInputsFromLocalStorage();
    // Then render activities (which might have been loaded)
    renderCustomActivities();
    // Finally, run all calculations and update charts with potentially loaded data.
    runAllCalculations();

    customActivityTimeInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(',', '.');
        if (!/^\d*\.?\d*$/.test(value)) {
            e.target.value = value.slice(0, -1);
        }
    });
    
    calculateFreetimeBtn.addEventListener('click', runAllCalculations);
    customActivityTimeInput.addEventListener('change', runAllCalculations);
    customActivityOccurrenceSelect.addEventListener('change', runAllCalculations);
}
