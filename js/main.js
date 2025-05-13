document.addEventListener('DOMContentLoaded', function() {
    loadSidebar();
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
            setupHamburgerMenu();

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
