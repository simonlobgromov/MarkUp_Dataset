// storage.js - Сохранение и загрузка фрагментов

import { state, controls, formatTime, randomColor } from './main.js';
import { updateSelectionInfo } from './regions-handler.js';

// Инициализация модуля хранения
export function setupStorage() {
    // Настройка кнопки сохранения фрагмента
    controls.saveSelectionBtn.addEventListener('click', showSaveDialog);

    // Настройка модального окна
    controls.closeBtn.addEventListener('click', closeModal);
    controls.saveCommentBtn.addEventListener('click', saveRegion);
    
    // Закрытие модального окна при клике вне его
    window.addEventListener('click', (event) => {
        if (event.target === controls.modal) {
            closeModal();
        }
    });
    
    // Если аудиофайл загружен, загружаем сохраненные фрагменты
    if (window.appData && window.appData.audioFilename) {
        window.wavesurfer.on('ready', () => {
            loadSavedRegions(window.appData.audioFilename);
        });
    }
    
    console.log('Storage module initialized');
}

// Отображение диалога для сохранения фрагмента
function showSaveDialog() {
    if (!state.selectedRegion && (!window.wavesurfer || !window.wavesurfer.regions)) {
        alert('Сначала необходимо выделить фрагмент');
        return;
    }
    
    // Если нет выбранного региона, но есть несохраненные регионы, выбираем последний созданный
    if (!state.selectedRegion) {
        const regions = window.wavesurfer.regions.getRegions().filter(r => !r.data || !r.data.saved);
        if (regions.length > 0) {
            state.selectedRegion = regions[regions.length - 1];
        } else {
            alert('Сначала необходимо выделить фрагмент');
            return;
        }
    }
    
    // Проверяем, не пересекается ли выделение с уже сохраненными фрагментами
    const region = state.selectedRegion;
    const intersection = state.savedRegions.find(savedRegion => 
        (savedRegion.start <= region.start && savedRegion.end >= region.start) || 
        (savedRegion.start <= region.end && savedRegion.end >= region.end) ||
        (region.start <= savedRegion.start && region.end >= savedRegion.end)
    );
    
    if (intersection) {
        if (!confirm('Выделенный фрагмент пересекается с уже сохраненным. Продолжить?')) {
            return;
        }
    }
    
    // Открываем модальное окно для комментария
    controls.modal.style.display = 'block';
    controls.commentText.value = region.data && region.data.comment ? region.data.comment : '';
    controls.commentText.focus();
}

// Закрытие модального окна
function closeModal() {
    controls.modal.style.display = 'none';
}

// Сохранение фрагмента
function saveRegion() {
    if (!state.selectedRegion) return;
    
    const region = state.selectedRegion;
    const comment = controls.commentText.value.trim();
    
    // Создаем данные для запроса
    const data = {
        audio_filename: window.appData.audioFilename,
        start: region.start,
        end: region.end,
        comment: comment
    };
    
    // Отправляем запрос на сервер
    fetch('/save_region', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Обновляем данные региона, помечая его как сохраненный
            region.setOptions({
                color: 'rgba(46, 204, 113, 0.4)', // зеленый цвет для сохраненных регионов
                data: {
                    saved: true,
                    comment: comment,
                    filename: data.filename
                },
                drag: false,  // Запрещаем перемещение сохраненных регионов
                resize: false // Запрещаем изменение размера сохраненных регионов
            });
            
            // Добавляем метку с комментарием
            if (comment) {
                region.setContent(comment.length > 20 ? comment.substring(0, 17) + '...' : comment);
            } else {
                region.setContent('Сохранено');
            }
            
            // Добавляем новый фрагмент в список сохраненных
            state.savedRegions.push({
                start: region.start,
                end: region.end,
                comment: comment,
                filename: data.filename,
                region: region
            });
            
            alert(`Фрагмент успешно сохранен: ${data.filename}`);
            closeModal();
            
            // Снимаем выделение с текущего региона
            state.selectedRegion = null;
            updateSelectionInfo();
        } else {
            alert('Ошибка при сохранении фрагмента: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Ошибка:', error);
        alert('Произошла ошибка при сохранении фрагмента');
    });
}

// Загрузка сохраненных фрагментов
export async function loadSavedRegions(audioFilename) {
    try {
        const response = await fetch(`/get_saved_regions?audio_filename=${encodeURIComponent(audioFilename)}`);
        const data = await response.json();
        
        if (data.success) {
            state.savedRegions = [];
            
            // Для каждого сохраненного фрагмента создаем регион
            data.regions.forEach(savedRegion => {
                const region = window.wavesurfer.regions.addRegion({
                    start: savedRegion.start,
                    end: savedRegion.end,
                    color: 'rgba(46, 204, 113, 0.4)', // зеленый цвет для сохраненных регионов
                    data: {
                        saved: true,
                        comment: savedRegion.comment,
                        filename: savedRegion.filename
                    },
                    drag: false,  // Запрещаем перемещение сохраненных регионов
                    resize: false // Запрещаем изменение размера сохраненных регионов
                });
                
                // Добавляем метку с комментарием
                if (savedRegion.comment) {
                    region.setContent(savedRegion.comment.length > 20 ? savedRegion.comment.substring(0, 17) + '...' : savedRegion.comment);
                } else {
                    region.setContent('Сохранено');
                }
                
                // Добавляем в список сохраненных регионов
                state.savedRegions.push({
                    start: savedRegion.start,
                    end: savedRegion.end,
                    comment: savedRegion.comment,
                    filename: savedRegion.filename,
                    region: region
                });
            });
            
            console.log(`Загружено ${state.savedRegions.length} сохраненных фрагментов`);
        } else {
            console.error('Ошибка при загрузке сохраненных фрагментов:', data.error);
        }
    } catch (error) {
        console.error('Ошибка при загрузке сохраненных фрагментов:', error);
    }
}

// Получить сохраненный фрагмент по времени
export function getRegionAtTime(time) {
    if (!state.savedRegions || state.savedRegions.length === 0) return null;
    
    return state.savedRegions.find(region => 
        time >= region.start && time <= region.end
    );
}

// Получить все сохраненные фрагменты
export function getAllRegions() {
    return state.savedRegions || [];
}