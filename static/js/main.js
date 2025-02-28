// main.js - Main file that initializes all application components

// Global variables
let wavesurfer = null;
let regionsPlugin = null;

// Application state
const state = {
    isPlaying: false,
    hasSelection: false,
    selectedRegion: null,
    savedRegions: [],
    currentZoom: 50,
    audioLoaded: false
};

// Controls
const controls = {
    waveform: document.querySelector('#waveform'),
    playBtn: document.querySelector('#playBtn'),
    createSelectionBtn: document.querySelector('#createSelectionBtn'),
    clearSelectionBtn: document.querySelector('#clearSelectionBtn')
};

// Generate random color for regions
const randomColor = () => {
    const random = (min, max) => Math.random() * (max - min) + min;
    return `rgba(${random(0, 255)}, ${random(0, 255)}, ${random(0, 255)}, 0.5)`;
};

// Format time display
function formatTime(time) {
    if (!time && time !== 0) return '00:00:000';
    
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const milliseconds = Math.floor((time % 1) * 1000);
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${milliseconds.toString().padStart(3, '0')}`;
}

// Initialize application
async function initApp() {
    console.log('Initializing application...');
    
    try {
        // Create WaveSurfer instance
        wavesurfer = WaveSurfer.create({
            container: '#waveform',
            waveColor: '#4F4A85',
            progressColor: '#383351',
            cursorColor: '#383351',
            barWidth: 2,
            barRadius: 3,
            cursorWidth: 1,
            height: 150
        });

        // Add Timeline plugin
        const timelinePlugin = wavesurfer.registerPlugin(WaveSurfer.TimelinePlugin.create({
            container: '#timeline'
        }));

        // Add Regions plugin
        regionsPlugin = wavesurfer.registerPlugin(WaveSurfer.RegionsPlugin.create());
        
        // Save global reference
        window.wavesurfer = wavesurfer;
        window.regionsPlugin = regionsPlugin;

        // WaveSurfer events
        wavesurfer.on('ready', () => {
            console.log('WaveSurfer is ready');
            state.audioLoaded = true;
            updateTimer();
        });

        wavesurfer.on('audioprocess', updateTimer);
        wavesurfer.on('finish', onPlaybackFinish);
        wavesurfer.on('error', onError);

        // Set up region events
        setupRegionEvents();

        // Load audio
        await wavesurfer.load(window.appData.audioUrl);

        // Set up event listeners
        setupEventListeners();

        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Error initializing application:', error);
        alert('Error initializing application: ' + error.message);
    }
}

// Set up region events
function setupRegionEvents() {
    let activeRegion = null;

    regionsPlugin.on('region-in', (region) => {
        console.log('region-in', region);
        activeRegion = region;
    });

    regionsPlugin.on('region-out', (region) => {
        console.log('region-out', region);
        if (activeRegion === region) {
            activeRegion = null;
        }
    });

    regionsPlugin.on('region-clicked', (region, e) => {
        e.stopPropagation();
        activeRegion = region;
        region.play();
        region.setOptions({ color: randomColor() });
    });

    regionsPlugin.on('region-updated', (region) => {
        console.log('Updated region', region);
    });

    // Reset active region on waveform click
    wavesurfer.on('interaction', () => {
        activeRegion = null;
    });
}

// Set up event listeners for buttons
function setupEventListeners() {
    controls.playBtn?.addEventListener('click', () => {
        wavesurfer.playPause();
        state.isPlaying = !state.isPlaying;
    });

    controls.createSelectionBtn?.addEventListener('click', () => {
        regionsPlugin.enableDragSelection({
            color: 'rgba(255, 0, 0, 0.1)'
        });
    });

    controls.clearSelectionBtn?.addEventListener('click', () => {
        regionsPlugin.clearRegions();
    });

    // Play region on click
    wavesurfer.on('region-click', (region, e) => {
        e.stopPropagation();
        region.play();
    });
}

// Update timer
function updateTimer() {
    const timer = document.querySelector('#timer');
    if (!timer) return;
    
    const current = wavesurfer.getCurrentTime();
    const duration = wavesurfer.getDuration();
    timer.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
}

// Handle playback finish
function onPlaybackFinish() {
    state.isPlaying = false;
    updateTimer();
}

// Handle errors
function onError(error) {
    console.error('WaveSurfer error:', error);
    alert('Error: ' + error.message);
}

// Start application on DOMContentLoaded
document.addEventListener('DOMContentLoaded', initApp);