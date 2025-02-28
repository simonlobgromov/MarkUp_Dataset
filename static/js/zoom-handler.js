// zoom-handler.js - Управление масштабированием и навигацией по аудио

import { state, controls } from './main.js';

// Минимальное и максимальное значение масштаба
const MIN_ZOOM = 10;
const MAX_ZOOM = 200;
const ZOOM_STEP = 20;

// Настройка обработчиков для масштабирования
export function setupZoom() {
    // Обработчики для кнопок масштабирования
    controls.zoomInBtn.addEventListener('click', zoomIn);
    controls.zoomOutBtn.addEventListener('click', zoomOut);
    controls.resetZoomBtn.addEventListener('click', resetZoom);
    
    // Обработчик для колеса мыши (прокрутка для масштабирования)
    controls.waveformContainer.addEventListener('wheel', handleMouseWheel, { passive: false });
    
    console.log('Zoom module initialized');
}

// Увеличение масштаба
export function zoomIn() {
    if (!window.wavesurfer) return;
    
    state.currentZoom = Math.min(MAX_ZOOM, state.currentZoom + ZOOM_STEP);
    window.wavesurfer.zoom(state.currentZoom);
    console.log('Zoomed in to:', state.currentZoom);
}

// Уменьшение масштаба
export function zoomOut() {
    if (!window.wavesurfer) return;
    
    state.currentZoom = Math.max(MIN_ZOOM, state.currentZoom - ZOOM_STEP);
    window.wavesurfer.zoom(state.currentZoom);
    console.log('Zoomed out to:', state.currentZoom);
}

// Сброс масштаба
export function resetZoom() {
    if (!window.wavesurfer) return;
    
    state.currentZoom = 50; // значение по умолчанию
    window.wavesurfer.zoom(state.currentZoom);
    console.log('Zoom reset');
}

// Обработчик колеса мыши для масштабирования
function handleMouseWheel(event) {
    if (!window.wavesurfer) return;
    
    // Предотвращаем стандартную прокрутку страницы
    event.preventDefault();
    
    // Определяем направление прокрутки
    if (event.deltaY < 0) {
        // Прокрутка вверх - увеличение масштаба
        zoomIn();
    } else {
        // Прокрутка вниз - уменьшение масштаба
        zoomOut();
    }
}

// Устанавливаем конкретный уровень масштаба
export function setZoom(level) {
    if (!window.wavesurfer) return;
    
    // Ограничиваем значение в допустимом диапазоне
    state.currentZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, level));
    window.wavesurfer.zoom(state.currentZoom);
    console.log('Zoom set to:', state.currentZoom);
}