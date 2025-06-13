const THEME_KEY = 'selected-theme';

function applyTheme(theme) {
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

function toggleTheme() {
    const isDarkMode = document.body.classList.contains('dark-mode');
    const newTheme = isDarkMode ? 'light' : 'dark';
    applyTheme(newTheme);
    localStorage.setItem(THEME_KEY, newTheme);
    console.log(`Theme changed to ${newTheme} and saved to localStorage.`);
}

// Make toggleTheme globally accessible for the button
window.toggleTheme = toggleTheme;

function initializeTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme) {
        applyTheme(savedTheme);
        console.log(`Applied saved theme: ${savedTheme}`);
    } else {
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const defaultTheme = prefersDark ? 'dark' : 'light';
        applyTheme(defaultTheme);
        console.log(`Applied default theme based on system preference: ${defaultTheme}`);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    initializeTheme(); // Initialize theme first
    loadSidebar();
    setupThemeSwitcher(); // Moved from loadSidebar
    setupClearAllDataButton(); // Moved from loadSidebar
    setupHamburgerMenu(); // Moved from loadSidebar

    // Open sidebar by default on desktop
    if (window.innerWidth >= 769) {
        document.body.classList.add('sidebar-open');
    }

    // Handle responsive sidebar behavior on resize
    window.addEventListener('resize', function() {
        if (window.innerWidth >= 769) {
            document.body.classList.add('sidebar-open');
        } else {
            document.body.classList.remove('sidebar-open');
        }
    });
});

let activeChartContainerId = null;
const loadedChartScripts = {}; // Keep track of loaded chart-specific JS SCRIPT FILES to prevent re-adding script tags

function loadSidebar() {
    const sidebarContainer = document.getElementById('sidebarContainer');
    if (!sidebarContainer) {
        console.error("Sidebar container 'sidebarContainer' not found.");
        return;
    }

    fetch('sidebar.html')
        .then(response => {
            if (!response.ok) throw new Error(`Failed to load sidebar.html: ${response.statusText}`);
            return response.text();
        })
        .then(html => {
            sidebarContainer.innerHTML = html;
            setupNavigation();

            const firstLink = document.querySelector('#sidebarContainer .sidebar-link');
            if (firstLink) {
                firstLink.click(); 
            }
        })
        .catch(error => {
            console.error("Error loading sidebar:", error);
            sidebarContainer.innerHTML = `<p style="color: red;">Error loading sidebar: ${error.message}</p>`;
        });
}

function setupNavigation() {
    const links = document.querySelectorAll('#sidebarContainer .sidebar-link');
    links.forEach(link => {
        link.addEventListener('click', function(event) {
            event.preventDefault();
            
            const targetContainerId = this.dataset.chartTarget;
            const chartHtmlFile = this.dataset.chartHtml;
            const chartJsFile = this.dataset.chartJs;

            displayChart(targetContainerId, chartHtmlFile, chartJsFile);

            links.forEach(l => l.classList.remove('active'));
            this.classList.add('active');

            // Always close sidebar on mobile when a link is clicked
            if (window.innerWidth < 769) {
                document.body.classList.remove('sidebar-open');
            }
        });
    });
}

function displayChart(containerId, chartHtmlFile, chartJsFile) {
    if (activeChartContainerId && activeChartContainerId !== containerId) {
        const oldContainer = document.getElementById(activeChartContainerId);
        if (oldContainer) {
            oldContainer.style.display = 'none';
            oldContainer.classList.remove('active');
        }
    }

    const targetContainer = document.getElementById(containerId);
    if (!targetContainer) {
        console.error(`Target container with ID '${containerId}' not found.`);
        return;
    }

    targetContainer.style.display = 'block'; 
    targetContainer.classList.add('active'); 
    activeChartContainerId = containerId;

    if (!targetContainer.dataset.chartLoaded) {
        loadChartContent(chartHtmlFile, containerId, chartJsFile, (success) => {
            if (success) {
                targetContainer.dataset.chartLoaded = "true"; 
                console.log(`Content and script for ${containerId} processed, marked as loaded.`);
            } else {
                console.error(`Failed to fully load content for ${containerId}.`);
            }
        });
    } else {
        console.log(`${containerId} was already loaded. Ensuring it's visible.`);
        // If charts need re-initialization upon re-display (e.g., Chart.js instances),
        // that logic would need to be callable from here, perhaps by finding and calling
        // a specific init function associated with the chart if its JS is already loaded.
        // For now, we assume making the container visible is enough.
    }
}

function loadChartContent(chartHtmlFile, containerId, chartJsFile, onProcessedCallback) {
    const container = document.getElementById(containerId);
    if (!container) { 
        console.error(`Container with ID '${containerId}' not found for content loading.`);
        if (onProcessedCallback) onProcessedCallback(false);
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
            
            if (chartJsFile) {
                // Check if the SCRIPT FILE itself has already been added to the DOM
                if (!loadedChartScripts[chartJsFile]) {
                    const script = document.createElement('script');
                    script.src = chartJsFile;
                    script.onload = () => {
                        console.log(`${chartJsFile} loaded successfully.`);
                        loadedChartScripts[chartJsFile] = true; // Mark script file as loaded
                        
                        // Check if the loaded script defines a global initialization function
                        // and call it if the container is active
                        if (chartJsFile.includes('freetime_calculator.js') && typeof initFreetimeCalculator === 'function') {
                            initFreetimeCalculator();
                            console.log('initFreetimeCalculator called.');
                        } else if (chartJsFile.includes('vacation_home_calculator.js')) {
                            if (typeof setupVacationHomeListeners === 'function') {
                                setupVacationHomeListeners(); // Setup listeners after HTML is loaded
                                console.log('setupVacationHomeListeners called.');
                            }
                            if (typeof calculateVacationHomeFinances === 'function') {
                                calculateVacationHomeFinances(); // Initial calculation
                                console.log('calculateVacationHomeFinances called.');
                            }
                        } else if (chartJsFile.includes('property_transfer_calculator.js') && typeof initPropertyTransferCalculator === 'function') {
                            initPropertyTransferCalculator();
                            console.log('initPropertyTransferCalculator called.');
                        }
                        // Add similar checks for other chart initializers if they are refactored
                        // to use explicit init functions.

                        if (onProcessedCallback) onProcessedCallback(true);
                    };
                    script.onerror = () => {
                        console.error(`Failed to load script: ${chartJsFile}`);
                        if (onProcessedCallback) onProcessedCallback(false);
                    };
                    document.body.appendChild(script);
                } else {
                    // Script file was already added. If chart needs re-init, it's more complex.
                    console.log(`${chartJsFile} script tag was already added. Chart might need manual re-initialization if not visible.`);
                    // For now, assume if script tag is there, its initial run configured the chart.
                    // The displayChart function handles visibility.
                    if (onProcessedCallback) onProcessedCallback(true); // Consider it processed for now.
                }
            } else {
                 // No specific JS file to load for this chart HTML
                if (onProcessedCallback) onProcessedCallback(true);
            }
        })
        .catch(error => {
            console.error(`Error loading chart HTML content into ${containerId}:`, error);
            container.innerHTML = `<p style="color: red;">Error loading chart HTML: ${error.message}</p>`;
            if (onProcessedCallback) onProcessedCallback(false);
        });
}

function setupHamburgerMenu() {
    const hamburgerButton = document.getElementById('hamburgerMenu');
    if (hamburgerButton) {
        hamburgerButton.addEventListener('click', function() {
            document.body.classList.toggle('sidebar-open');
        });
    } else {
        console.error("Hamburger menu button 'hamburgerMenu' not found.");
    }
}

function setupThemeSwitcher() {
    const themeSwitcherButton = document.getElementById('themeSwitcherButton');
    if (themeSwitcherButton) {
        themeSwitcherButton.addEventListener('click', function() {
            window.toggleTheme(); // Calls the existing global function

            // Optionally, update button text after theme toggle
            // This provides immediate feedback to the user on the button itself.
            // For example:
            // const isDarkMode = document.body.classList.contains('dark-mode');
            // this.textContent = isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode';
        });
    } else {
        console.error("Theme switcher button 'themeSwitcherButton' not found.");
    }
}

function setupClearAllDataButton() {
    const clearAllBtn = document.getElementById('clearAllSavedDataBtn');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to clear all saved data for all calculators? This action cannot be undone.')) {
                const keysToRemove = [
                    'savingsCalculatorInput',
                    'expensesCalculatorExpensesList',
                    'expensesCalculatorProjectionYears',
                    'freetimeCalculatorInputs',
                    'trueCostCalculatorInputs',
                    'vacationHomeCalculatorInputs',
                    'propertyTransferCalculatorInputs'
                    // Add any other keys if new calculators are added
                ];
                keysToRemove.forEach(key => {
                    localStorage.removeItem(key);
                    console.log('Removed:', key);
                });
                alert('All saved calculator data has been cleared. You may need to reload the page or the active calculator to see the changes.');
            }
        });
    } else {
        console.warn("Clear All Saved Data button 'clearAllSavedDataBtn' not found during setup.");
    }
}
