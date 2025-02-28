// regions-handler.js - Handle regions (selected fragments)

// Get state and controls from the global scope
let dragSelectionEnabled = false;

// Generate random color for regions
const randomColor = (opacity = 0.5) => {
    const random = (min, max) => Math.random() * (max - min) + min;
    return `rgba(${random(0, 255)}, ${random(0, 255)}, ${random(0, 255)}, ${opacity})`;
};

// Format time display
function formatTime(time) {
    if (!time && time !== 0) return '00:00:000';
    
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const milliseconds = Math.floor((time % 1) * 1000);
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${milliseconds.toString().padStart(3, '0')}`;
}

// Set up regions functionality
function setupRegions() {
    if (!window.wavesurfer || !window.regionsPlugin) {
        console.error('WaveSurfer or regions plugin not initialized');
        return;
    }
    
    console.log('Setting up regions handler...');
    
    // Set up event handlers for regions
    const regions = window.regionsPlugin;
    
    regions.on('region-created', (region) => {
        console.log('Region created:', region);
        handleRegionCreated(region);
    });
    
    regions.on('region-updated', (region) => {
        console.log('Region updated:', region);
        updateSelectionInfo(region);
    });
    
    regions.on('region-clicked', (region, e) => {
        e.stopPropagation(); // prevent click on the waveform
        window.state.selectedRegion = region;
        updateSelectionInfo(region);
        
        // Highlight the clicked region
        if (window.regionsPlugin.getRegions().length > 1) {
            // If there are multiple regions, highlight the current one
            window.regionsPlugin.getRegions().forEach(r => {
                if (r === region) {
                    // Make current region brighter
                    const regionColor = region.color.replace(/,[^,]+\)/, ', 0.5)');
                    r.setOptions({ color: regionColor });
                } else if (!r.data || !r.data.saved) {
                    // Make unsaved regions more transparent
                    const regionColor = r.color.replace(/,[^,]+\)/, ', 0.2)');
                    r.setOptions({ color: regionColor });
                }
            });
        }
    });
    
    // Set up buttons for working with regions
    const createSelectionBtn = document.getElementById('createSelectionBtn');
    const clearSelectionBtn = document.getElementById('clearSelectionBtn');
    
    if (createSelectionBtn) {
        createSelectionBtn.addEventListener('click', toggleDragSelection);
    }
    
    if (clearSelectionBtn) {
        clearSelectionBtn.addEventListener('click', clearRegions);
    }
    
    console.log('Regions handler setup complete');
}

// Enable/disable selection mode
function toggleDragSelection() {
    if (!window.wavesurfer || !window.regionsPlugin) return;
    
    dragSelectionEnabled = !dragSelectionEnabled;
    
    if (dragSelectionEnabled) {
        window.regionsPlugin.enableDragSelection({
            color: 'rgba(212, 255, 0, 0.3)',
            snap: false
        });
        
        const createSelectionBtn = document.getElementById('createSelectionBtn');
        const selectionInfoText = document.getElementById('selectionInfoText');
        
        if (createSelectionBtn) {
            createSelectionBtn.textContent = 'Disable Selection';
            createSelectionBtn.classList.add('active');
        }
        
        if (selectionInfoText) {
            selectionInfoText.textContent = 'Click and drag to select a fragment';
        }
        
        console.log('Drag selection enabled');
    } else {
        window.regionsPlugin.disableDragSelection();
        
        const createSelectionBtn = document.getElementById('createSelectionBtn');
        
        if (createSelectionBtn) {
            createSelectionBtn.textContent = 'Enable Selection';
            createSelectionBtn.classList.remove('active');
        }
        
        updateSelectionInfo();
        
        console.log('Drag selection disabled');
    }
}

// Clear all unsaved regions
function clearRegions() {
    if (!window.wavesurfer || !window.regionsPlugin) return;
    
    // Remove only unsaved regions
    window.regionsPlugin.getRegions().forEach(region => {
        if (!region.data || !region.data.saved) {
            region.remove();
        }
    });
    
    window.state.selectedRegion = null;
    
    const selectionInfoText = document.getElementById('selectionInfoText');
    if (selectionInfoText) {
        selectionInfoText.textContent = 'Select a fragment to save';
    }
    
    console.log('Unsaved regions cleared');
}

// Handle new region creation
function handleRegionCreated(region) {
    window.state.hasSelection = true;
    window.state.selectedRegion = region;
    
    // If the region has no defined end (marker), set one
    if (region.end === undefined || region.end === region.start) {
        region.end = region.start + 1; // Set default length of 1 second
        region.update({ end: region.end });
    }
    
    updateSelectionInfo(region);
}

// Update selection information
function updateSelectionInfo(region = null) {
    const selectionInfoText = document.getElementById('selectionInfoText');
    if (!selectionInfoText) return;
    
    if (region) {
        const duration = region.end - region.start;
        selectionInfoText.textContent = `Selected fragment: ${formatTime(region.start)} - ${formatTime(region.end)} (duration: ${formatTime(duration)})`;
    } else if (window.state && window.state.selectedRegion) {
        const duration = window.state.selectedRegion.end - window.state.selectedRegion.start;
        selectionInfoText.textContent = `Selected fragment: ${formatTime(window.state.selectedRegion.start)} - ${formatTime(window.state.selectedRegion.end)} (duration: ${formatTime(duration)})`;
    } else if (window.wavesurfer && window.regionsPlugin) {
        const regions = window.regionsPlugin.getRegions();
        if (regions.length > 0) {
            // Take the last created region
            const lastRegion = regions[regions.length - 1];
            window.state.selectedRegion = lastRegion;
            const duration = lastRegion.end - lastRegion.start;
            selectionInfoText.textContent = `Selected fragment: ${formatTime(lastRegion.start)} - ${formatTime(lastRegion.end)} (duration: ${formatTime(duration)})`;
        } else {
            selectionInfoText.textContent = 'Select a fragment to save';
        }
    } else {
        selectionInfoText.textContent = 'Select a fragment to save';
    }
}

// Create a new region programmatically
function createRegion(start, end, options = {}) {
    if (!window.wavesurfer || !window.regionsPlugin) return null;
    
    const defaultOptions = {
        color: randomColor(0.3),
        drag: true,
        resize: true
    };
    
    const region = window.regionsPlugin.addRegion({
        start: start,
        end: end,
        ...defaultOptions,
        ...options
    });
    
    window.state.selectedRegion = region;
    window.state.hasSelection = true;
    updateSelectionInfo(region);
    
    return region;
}

// Initialize the regions functionality when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // We can't set up regions immediately because WaveSurfer might not be ready
    // Instead, we'll wait for WaveSurfer to be ready
    const checkWaveSurfer = setInterval(() => {
        if (window.wavesurfer && window.regionsPlugin) {
            clearInterval(checkWaveSurfer);
            window.wavesurfer.on('ready', () => {
                setupRegions();
            });
        }
    }, 100);
});