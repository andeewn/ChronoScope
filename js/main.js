document.addEventListener('DOMContentLoaded', function() {
    // Load the savings calculator HTML and its specific JavaScript
    loadChart('charts/savings_calculator.html', 'savingsCalculatorChartContainer', 'js/charts/savings_calculator.js');
    
    // Load the expenses calculator HTML and its specific JavaScript
    loadChart('charts/expenses_calculator.html', 'expensesCalculatorChartContainer', 'js/charts/expenses_calculator.js');

    // Load the true cost calculator HTML and its specific JavaScript
    loadChart('charts/true_cost_calculator.html', 'trueCostCalculatorChartContainer', 'js/charts/true_cost_calculator.js');

    // Example for adding another chart in the future:
    // loadChart('charts/another_chart.html', 'anotherChartPlaceholderId', 'js/charts/another_chart.js');
});

function loadChart(chartHtmlFile, containerId, chartJsFile) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container with ID '${containerId}' not found.`);
        return;
    }

    fetch(chartHtmlFile)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load ${chartHtmlFile}: ${response.statusText}`);
            }
            return response.text();
        })
        .then(html => {
            container.innerHTML = html;
            // After injecting HTML, we might need to execute scripts within that HTML.
            // For simple cases, if scripts are at the end of the loaded HTML, they might execute.
            // For more complex cases, or if scripts are in <head> or need specific timing,
            // a more robust script loading/execution mechanism might be needed.
            // For now, we assume scripts in the loaded HTML (like savings_calculator.js)
            // will be correctly referenced and will execute in context.
            // We need to ensure the script tag in the loaded HTML has the correct path.
            // e.g. <script src="../js/charts/savings_calculator.js"></script> if savings_calculator.html is in charts/
            
            // If a specific JavaScript file is provided for this chart, load it
            if (chartJsFile) {
                const script = document.createElement('script');
                script.src = chartJsFile;
                script.onload = () => {
                    // You could add a log or a callback here if needed after the script loads
                    console.log(`${chartJsFile} loaded successfully.`);
                    // If chart JS files define an init function, you could call it here, e.g.:
                    // if (typeof window.initSavingsCalculator === 'function') {
                    //     window.initSavingsCalculator();
                    // }
                };
                script.onerror = () => {
                    console.error(`Failed to load script: ${chartJsFile}`);
                };
                document.body.appendChild(script); // Append to body to ensure execution
            }
        })
        .catch(error => {
            console.error(`Error loading chart into ${containerId}:`, error);
            container.innerHTML = `<p style="color: red;">Error loading chart: ${error.message}</p>`;
        });
}
