// text-selection.js - Функционал для работы с выделением текста и его связыванием с аудио

// Глобальная переменная для отслеживания состояния
let textHighlighterState = {
    commentText: '',
    lastRegionData: null,
    initialized: false
};

// Инициализация обработчиков событий для работы с текстом
function initializeTextSelection() {
    console.log('Initializing text selection functionality...');
    
    // Проверяем, не инициализирован ли уже скрипт
    if (textHighlighterState.initialized) {
        console.log('Text selection already initialized');
        return;
    }
    
    // Находим контейнер с PDF текстом
    const pdfContent = document.querySelector('.pdf-content');
    if (!pdfContent) {
        console.warn('PDF content container not found');
        return;
    }
    
    // Сначала добавляем div для контейнера прокрутки, если его нет
    let pdfContentScroll = pdfContent.querySelector('.pdf-content-scroll');
    if (!pdfContentScroll) {
        // Получаем имеющийся pre элемент
        const preElement = pdfContent.querySelector('pre');
        if (!preElement) {
            console.warn('PDF content pre element not found');
            return;
        }
        
        // Создаем новый контейнер для прокрутки
        pdfContentScroll = document.createElement('div');
        pdfContentScroll.className = 'pdf-content-scroll';
        
        // Перемещаем pre элемент внутрь контейнера прокрутки
        preElement.parentNode.insertBefore(pdfContentScroll, preElement);
        pdfContentScroll.appendChild(preElement);
        
        // Добавляем id для pre элемента, если его нет
        if (!preElement.id) {
            preElement.id = 'pdfTextContent';
        }
    }
    
    // Преобразуем структуру заголовка, чтобы добавить кнопку копирования
    const h2Element = pdfContent.querySelector('h2');
    if (h2Element) {
        // Создаем контейнер для заголовка, если его еще нет
        let headerDiv = pdfContent.querySelector('.pdf-header');
        if (!headerDiv) {
            headerDiv = document.createElement('div');
            headerDiv.className = 'pdf-header';
            h2Element.parentNode.insertBefore(headerDiv, h2Element);
            headerDiv.appendChild(h2Element);
        }
        
        // Добавляем кнопку копирования текста
        const selectionControls = createSelectionControls();
        if (selectionControls) {
            headerDiv.appendChild(selectionControls);
        }
    } else {
        console.warn('PDF content h2 element not found');
    }
    
    // Интеграция с сохранением региона: следим за POST запросами
    setupSaveRegionWatcher();
    
    // Отмечаем, что инициализация выполнена
    textHighlighterState.initialized = true;
    console.log('Text selection functionality initialized');
}

// Создание элементов управления для выделения
function createSelectionControls() {
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'text-selection-controls';
    
    // Кнопка копирования текста
    const copyBtn = document.createElement('button');
    copyBtn.id = 'copyTextBtn';
    copyBtn.className = 'control-btn';
    copyBtn.innerHTML = 'Copy Text';
    copyBtn.title = 'Copy selected text';
    copyBtn.addEventListener('click', () => {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        
        if (selectedText) {
            // Копируем текст в буфер обмена
            navigator.clipboard.writeText(selectedText)
                .then(() => {
                    console.log('Text copied to clipboard:', selectedText);
                    copyBtn.innerHTML = 'Copied!';
                    setTimeout(() => {
                        copyBtn.innerHTML = 'Copy Text';
                    }, 2000);
                })
                .catch(err => {
                    console.error('Failed to copy text:', err);
                    // Запасной вариант для копирования, если API не поддерживается
                    fallbackCopy(selectedText);
                    copyBtn.innerHTML = 'Copied!';
                    setTimeout(() => {
                        copyBtn.innerHTML = 'Copy Text';
                    }, 2000);
                });
        } else {
            console.log('No text selected to copy');
        }
    });
    
    controlsDiv.appendChild(copyBtn);
    return controlsDiv;
}

// Запасной вариант для копирования текста
function fallbackCopy(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
        document.execCommand('copy');
    } catch (err) {
        console.error('Fallback copy failed:', err);
    }
    
    document.body.removeChild(textArea);
}

// Отслеживание отправки формы и AJAX-запросов для сохранения региона
function setupSaveRegionWatcher() {
    // Находим форму сохранения региона
    const saveRegionForm = document.querySelector('form[action*="save_region"]');
    if (saveRegionForm) {
        console.log('Found save region form');
        saveRegionForm.addEventListener('submit', handleSaveRegionForm);
    }
    
    // Следим за открытием и закрытием модального окна
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                const modal = document.querySelector('.modal');
                if (modal && modal.style.display === 'block') {
                    // Модальное окно открыто
                    console.log('Modal opened');
                    setupModalHandlers();
                } else if (modal && modal.style.display === 'none') {
                    // Модальное окно закрыто
                    console.log('Modal closed');
                    setTimeout(processLastSavedRegion, 300);
                }
            }
        });
    });
    
    const modal = document.querySelector('.modal');
    if (modal) {
        observer.observe(modal, { attributes: true });
        console.log('Observing modal visibility');
    }
    
    // Перехватываем AJAX-запросы для отслеживания сохранения региона
    const originalXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function() {
        this.addEventListener('load', function() {
            if (this.responseURL && this.responseURL.includes('/save_region')) {
                console.log('XHR save_region completed', this.status);
                if (this.status === 200) {
                    try {
                        const response = JSON.parse(this.responseText);
                        if (response.success) {
                            console.log('Region saved successfully, filename:', response.filename);
                            textHighlighterState.lastRegionData = {
                                filename: response.filename
                            };
                            setTimeout(processLastSavedRegion, 300);
                        }
                    } catch (e) {
                        console.error('Error parsing save_region response', e);
                    }
                }
            }
        });
        originalXHROpen.apply(this, arguments);
    };
    
    // Также следим за оригинальным fetch API
    const originalFetch = window.fetch;
    window.fetch = function() {
        const fetchPromise = originalFetch.apply(this, arguments);
        if (arguments[0] && arguments[0].includes && arguments[0].includes('/save_region')) {
            fetchPromise.then(response => {
                console.log('Fetch save_region completed', response.status);
                if (response.ok) {
                    response.clone().json().then(data => {
                        if (data.success) {
                            console.log('Region saved successfully via fetch, filename:', data.filename);
                            textHighlighterState.lastRegionData = {
                                filename: data.filename
                            };
                            setTimeout(processLastSavedRegion, 300);
                        }
                    }).catch(e => console.error('Error parsing fetch response', e));
                }
            });
        }
        return fetchPromise;
    };
}

// Обработчик отправки формы сохранения региона
function handleSaveRegionForm(event) {
    // Сохраняем текст комментария
    const commentField = document.querySelector('.modal textarea') || 
                         document.querySelector('.modal input[type="text"]');
    if (commentField) {
        textHighlighterState.commentText = commentField.value.trim();
        console.log('Saved comment text:', textHighlighterState.commentText);
    }
}

// Настройка обработчиков для модального окна
function setupModalHandlers() {
    // Находим поле комментария
    const commentField = document.querySelector('.modal textarea') || 
                        document.querySelector('.modal input[type="text"]');
    
    if (commentField) {
        // Следим за изменениями в поле комментария
        commentField.addEventListener('input', function() {
            textHighlighterState.commentText = this.value.trim();
        });
        
        // Находим кнопку сохранения
        const saveBtn = document.querySelector('.modal button') || 
                      document.querySelector('.modal .btn-save');
        
        if (saveBtn) {
            // Добавляем обработчик нажатия на кнопку
            saveBtn.addEventListener('click', function() {
                // Сохраняем текущий текст комментария
                textHighlighterState.commentText = commentField.value.trim();
                console.log('Save button clicked, comment:', textHighlighterState.commentText);
            });
        }
    }
}

// Обработка последнего сохраненного региона
function processLastSavedRegion() {
    // Получаем информацию о текущем аудио-фрагменте и его комментарии
    if (!textHighlighterState.commentText) {
        console.log('No comment text to highlight');
        return;
    }
    
    console.log('Processing saved region with comment:', textHighlighterState.commentText);
    
    // Получаем данные региона (из объекта state или из последних сохраненных данных)
    let regionData = null;
    
    if (window.state && window.state.selectedRegion && window.state.selectedRegion.data) {
        regionData = window.state.selectedRegion.data;
    } else if (textHighlighterState.lastRegionData) {
        regionData = textHighlighterState.lastRegionData;
    }
    
    if (!regionData) {
        console.warn('No region data found');
        return;
    }
    
    // Подсвечиваем текст в PDF
    highlightSavedText(textHighlighterState.commentText, regionData.filename);
    
    // Сбрасываем сохраненные данные
    textHighlighterState.commentText = '';
}

// Подсветка сохраненного текста и связывание с аудио-фрагментом
function highlightSavedText(text, fragmentName) {
    if (!text || !fragmentName) {
        console.warn('Missing text or fragment name for highlighting');
        return;
    }
    
    console.log(`Highlighting text "${text}" with fragment "${fragmentName}"`);
    
    const pdfContentText = document.getElementById('pdfTextContent') || 
                          document.querySelector('.pdf-content pre');
    
    if (!pdfContentText) {
        console.warn('PDF content text element not found');
        return;
    }
    
    // Получаем данные о временном интервале
    let startTime = 0;
    let endTime = 0;
    let timeInfoText = '';
    
    // Пытаемся найти временной интервал из соответствующего региона
    if (window.wavesurfer && window.wavesurfer.regions) {
        const regions = window.wavesurfer.regions.getRegions();
        const targetRegion = regions.find(r => r.data && r.data.filename === fragmentName);
        
        if (targetRegion) {
            startTime = targetRegion.start;
            endTime = targetRegion.end;
            
            // Форматируем время в понятный вид (мм:сс.мс)
            timeInfoText = `${formatTime(startTime)} - ${formatTime(endTime)}`;
            console.log('Found time interval:', timeInfoText);
        }
    }
    
    // Если мы не нашли время из региона, попробуем получить его из state
    if (!timeInfoText && window.state && window.state.selectedRegion) {
        startTime = window.state.selectedRegion.start;
        endTime = window.state.selectedRegion.end;
        timeInfoText = `${formatTime(startTime)} - ${formatTime(endTime)}`;
        console.log('Got time interval from state:', timeInfoText);
    }
    
    // Ищем вхождение текста в содержимом PDF
    const htmlContent = pdfContentText.innerHTML;
    // Экранируем спецсимволы в тексте для использования в регулярном выражении
    const escapedText = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Создаем уникальный ID для этого выделения
    const highlightId = 'highlight-' + Date.now();
    
    // Формируем всплывающую подсказку с именем фрагмента и временным интервалом
    const tooltipText = timeInfoText 
        ? `${fragmentName} (${timeInfoText})` 
        : fragmentName;
    
    // Заменяем текст на span с подсветкой и подписью
    // Используем replaceAll для замены всех вхождений
    let replacedHtml = htmlContent;
    const regex = new RegExp(escapedText, 'g');
    
    if (regex.test(htmlContent)) {
        replacedHtml = htmlContent.replace(regex, match => {
            return `<span id="${highlightId}" class="highlighted-text" data-fragment="${fragmentName}" data-time="${timeInfoText}" title="Audio fragment: ${tooltipText}">${match}</span>`;
        });
        
        pdfContentText.innerHTML = replacedHtml;
        
        // Добавляем обработчик клика для воспроизведения соответствующего фрагмента
        const highlightedSpan = document.getElementById(highlightId);
        if (highlightedSpan) {
            highlightedSpan.addEventListener('click', () => {
                // Проигрываем соответствующий аудио фрагмент
                console.log('Highlighted text clicked, should play fragment:', fragmentName);
                
                // Пытаемся найти соответствующий регион и воспроизвести его
                if (window.wavesurfer && window.wavesurfer.regions) {
                    const regions = window.wavesurfer.regions.getRegions();
                    const targetRegion = regions.find(r => r.data && r.data.filename === fragmentName);
                    
                    if (targetRegion) {
                        targetRegion.play();
                    } else {
                        // Если регион не найден, начинаем воспроизведение с текущей позиции
                        window.wavesurfer.play();
                    }
                }
            });
            
            console.log('Text highlighted and linked to audio fragment:', tooltipText);
        } else {
            console.warn('Highlighting span not found after insertion');
        }
    } else {
        console.warn('Text not found in PDF content:', text);
    }
}

// Функция форматирования времени в мм:сс.мс
function formatTime(time) {
    if (typeof time !== 'number') return '00:00.000';
    
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const milliseconds = Math.floor((time % 1) * 1000);
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}


// Запуск инициализации после загрузки страницы
document.addEventListener('DOMContentLoaded', () => {
    // Сначала пробуем запустить сразу
    initializeTextSelection();
    
    // Также пробуем с небольшой задержкой на случай, если другие скрипты еще загружаются
    setTimeout(initializeTextSelection, 1000);
    
    // И еще раз с большей задержкой для надежности
    setTimeout(initializeTextSelection, 3000);
});