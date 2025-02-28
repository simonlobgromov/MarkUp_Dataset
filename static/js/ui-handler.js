// ui-handler.js - Обработка взаимодействия с пользовательским интерфейсом

import { state, controls } from './main.js';
import { seekTo } from './audio-player.js';
import { createRegion, updateSelectionInfo, getSelectedRegion, playSelectedRegion } from './regions-handler.js';
import { getRegionAtTime } from './storage.js';

// Настройка обработчиков UI
export function setupUI() {
    console.log('Setting up UI handlers...');
    
    // Ждем загрузки WaveSurfer
    if (!window.wavesurfer) {
        console.error('WaveSurfer not initialized');
        return;
    }
    
    // Обработка клика по волновой форме
    window.wavesurfer.on('click', handleWaveformClick);
    
    // Обработка двойного клика для создания маркера
    window.wavesurfer.on('dblclick', handleDoubleClick);
    
    // Обработка клавиш
    document.addEventListener('keydown', handleKeyDown);
    
    // Обработка взаимодействия с PDF текстом (если есть)
    setupPdfTextInteraction();
    
    console.log('UI handlers setup complete');
}

// Обработка клика по волновой форме
function handleWaveformClick(time, event) {
    // Если был клик по региону, не обрабатываем его как клик по волновой форме
    if (event.target.classList.contains('wavesurfer-region')) return;
    
    // Проверяем, попал ли клик в сохраненный фрагмент
    const region = getRegionAtTime(time);
    if (region) {
        // Если клик по сохраненному фрагменту, выделяем этот регион
        if (region.region) {
            state.selectedRegion = region.region;
            updateSelectionInfo(region.region);
        }
    } else {
        // Обычный клик - перемещение позиции воспроизведения
        seekTo(time);
    }
}

// Обработка двойного клика для создания маркера
function handleDoubleClick(time, event) {
    // Предотвращаем создание маркера, если был двойной клик по региону
    if (event.target.classList.contains('wavesurfer-region')) return;
    
    // Создаем регион (маркер) в месте двойного клика
    const endTime = time + 1.0; // По умолчанию создаем регион длительностью 1 секунда
    createRegion(time, endTime);
}

// Обработка нажатия клавиш
function handleKeyDown(event) {
    // Space - play/pause
    if (event.code === 'Space') {
        event.preventDefault();
        if (state.isPlaying) {
            window.wavesurfer.pause();
            state.isPlaying = false;
        } else {
            window.wavesurfer.play();
            state.isPlaying = true;
        }
    }
    
    // Esc - очистка выделения или закрытие модального окна
    if (event.code === 'Escape') {
        event.preventDefault();
        
        // Если открыто модальное окно, закрываем его
        if (controls.modal.style.display === 'block') {
            controls.modal.style.display = 'none';
            return;
        }
        
        // Очищаем выбранный регион
        const region = getSelectedRegion();
        if (region && !region.data?.saved) {
            region.remove();
            state.selectedRegion = null;
            updateSelectionInfo();
        }
    }
    
    // Delete - удаление выбранного региона
    if (event.code === 'Delete') {
        event.preventDefault();
        
        const region = getSelectedRegion();
        if (region && !region.data?.saved) {
            region.remove();
            state.selectedRegion = null;
            updateSelectionInfo();
        }
    }
    
    // Enter - воспроизведение выбранного региона
    if (event.code === 'Enter') {
        event.preventDefault();
        playSelectedRegion();
    }
    
    // Ctrl + S - сохранение выбранного региона
    if (event.code === 'KeyS' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        
        if (getSelectedRegion()) {
            controls.saveSelectionBtn.click();
        }
    }
    
    // Стрелки влево/вправо для навигации по аудио
    if (event.code === 'ArrowLeft') {
        event.preventDefault();
        const currentTime = window.wavesurfer.getCurrentTime();
        const newTime = Math.max(0, currentTime - (event.shiftKey ? 5 : 1));
        seekTo(newTime);
    }
    
    if (event.code === 'ArrowRight') {
        event.preventDefault();
        const currentTime = window.wavesurfer.getCurrentTime();
        const duration = window.wavesurfer.getDuration();
        const newTime = Math.min(duration, currentTime + (event.shiftKey ? 5 : 1));
        seekTo(newTime);
    }
}

// Настройка взаимодействия с PDF текстом
function setupPdfTextInteraction() {
    const pdfTextContent = document.getElementById('pdf-text-content');
    if (!pdfTextContent) return;
    
    // Обработка выделения текста
    pdfTextContent.addEventListener('mouseup', () => {
        const selection = window.getSelection();
        if (selection.toString().trim() !== '') {
            console.log('Selected text:', selection.toString());
            
            // Можно добавить привязку выделенного текста к текущему региону
            if (state.selectedRegion) {
                const region = state.selectedRegion;
                const selectedText = selection.toString().trim();
                
                // Обновляем данные региона, добавляя выделенный текст
                const regionData = region.data || {};
                region.setOptions({
                    data: {
                        ...regionData,
                        selectedText: selectedText
                    }
                });
                
                // Если регион уже имеет контент, добавляем текст в его описание
                // В противном случае, устанавливаем выделенный текст как содержимое
                if (region.element && region.element.textContent) {
                    controls.commentText.value = selectedText;
                } else {
                    region.setContent(selectedText.length > 20 ? selectedText.substring(0, 17) + '...' : selectedText);
                }
                
                console.log('Text associated with region:', selectedText);
            }
        }
    });
}