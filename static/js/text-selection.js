// text-selection.js - Функционал для работы с выделением текста и его связыванием с аудио

// Глобальная переменная для отслеживания состояния
let textHighlighterState = {
    commentText: '',
    lastRegionData: null,
    initialized: false,
    selectedText: ''
};

// Делаем состояние доступным глобально
window.textHighlighterState = textHighlighterState;

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
    
    // Добавляем обработчик выделения текста
    const pdfTextContent = document.getElementById('pdfTextContent') || 
                          document.querySelector('.pdf-content pre');
    
    if (pdfTextContent) {
        // Обработчик события выделения текста
        pdfTextContent.addEventListener('mouseup', function() {
            const selection = window.getSelection();
            const selectedText = selection.toString().trim();
            
            if (selectedText) {
                console.log('Text selected:', selectedText);
                textHighlighterState.selectedText = selectedText;
                
                // Если модальное окно открыто, автоматически заполняем поле комментария
                const commentField = document.querySelector('.modal textarea') || 
                                    document.querySelector('.modal input[type="text"]');
                
                if (commentField && document.querySelector('.modal').style.display === 'block') {
                    if (!commentField.value.trim()) {
                        commentField.value = selectedText;
                        textHighlighterState.commentText = selectedText;
                    }
                }
            }
        });
        
        console.log('Added text selection handler to PDF content');
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
        // Получаем выделенный текст при открытии модального окна
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        
        // Сохраняем выделенный текст в состоянии
        if (selectedText) {
            textHighlighterState.selectedText = selectedText;
            
            // Если поле комментария пустое, заполняем его выделенным текстом
            if (!commentField.value.trim()) {
                commentField.value = selectedText;
                textHighlighterState.commentText = selectedText;
            }
        }
        
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
                
                // Добавляем выделенный текст к данным региона
                if (window.selectedRegion && textHighlighterState.selectedText) {
                    if (!window.selectedRegion.data) {
                        window.selectedRegion.data = {};
                    }
                    window.selectedRegion.data.selectedText = textHighlighterState.selectedText;
                    console.log('Added selected text to region data:', textHighlighterState.selectedText);
                }
            });
        }
    }
}

// Обработка последнего сохраненного региона
function processLastSavedRegion() {
    // Получаем информацию о текущем аудио-фрагменте и его комментарии
    console.log('Processing saved region');
    
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
    
    // Определяем текст для подсветки
    // Приоритет: 1) selectedText из данных региона, 2) commentText из состояния
    const textToHighlight = regionData.selectedText || textHighlighterState.commentText;
    
    if (!textToHighlight) {
        console.warn('No text to highlight');
        return;
    }
    
    console.log('Highlighting text:', textToHighlight, 'for region:', regionData.filename);
    
    // Подсвечиваем текст в PDF
    highlightSavedText(textToHighlight, regionData.filename);
    
    // Сбрасываем сохраненные данные
    textHighlighterState.commentText = '';
}

// Подсветка сохраненного текста и связывание с аудио-фрагментом
function highlightSavedText(text, fragmentName) {
    if (!text) {
        console.warn('No text provided for highlighting');
        return;
    }
    
    if (!fragmentName) {
        console.warn('No fragment name provided for highlighting');
        return;
    }
    
    console.log('Attempting to highlight text:', text, 'for fragment:', fragmentName);
    
    // Получаем элемент с содержимым PDF
    const pdfContentText = document.getElementById('pdfTextContent') || 
                          document.querySelector('.pdf-content pre');
    
    if (!pdfContentText) {
        console.warn('PDF content text element not found');
        return;
    }
    
    // Получаем данные о временном интервале
    let startTime = 0;
    let endTime = 0;
    let duration = 0;
    
    // Сначала попробуем получить данные от сервера
    fetch(`/get_fragment_data?filename=${encodeURIComponent(fragmentName)}`)
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Используем данные из JSON
            startTime = data.fragment.start_time;
            endTime = data.fragment.end_time;
            duration = data.fragment.duration;
            
            // Проверяем, есть ли в данных selected_text, и если есть, используем его вместо переданного текста
            const selectedText = data.fragment.selected_text;
            if (selectedText && selectedText.trim()) {
                console.log('Using selected_text from server data instead of comment:', selectedText);
                text = selectedText;
            }
            
            console.log(`Got time data from server: start=${startTime}, end=${endTime}, duration=${duration}`);
            
            // Теперь у нас есть правильные временные метки, можем продолжить выделение текста
            completeHighlighting();
        } else {
            // Если не удалось получить данные от сервера, попробуем найти в регионах
            console.warn("Could not get fragment data from server, trying regions...");
            findInRegions();
        }
    })
    .catch(error => {
        console.error("Error fetching fragment data:", error);
        findInRegions();
    });
    
    // Функция для поиска временных меток в регионах WaveSurfer
    function findInRegions() {
        let foundRegion = false;
        
        // Пытаемся найти временной интервал из соответствующего региона
        if (window.wavesurfer && window.regionsPlugin) {
            const regions = window.regionsPlugin.getRegions();
            console.log("Available regions:", regions.length);
            
            // Сначала ищем регион по имени файла
            const targetRegion = regions.find(r => r.data && r.data.filename === fragmentName);
            
            if (targetRegion) {
                console.log("Found region by filename:", targetRegion);
                startTime = targetRegion.start;
                endTime = targetRegion.end;
                duration = endTime - startTime;
                foundRegion = true;
                
                // Проверяем, есть ли в данных selected_text, и если есть, используем его
                if (targetRegion.data && targetRegion.data.selectedText) {
                    console.log('Using selectedText from region data:', targetRegion.data.selectedText);
                    text = targetRegion.data.selectedText;
                }
            } else {
                // Если не найден по имени файла, попробуем найти по комментарию или selected_text
                const regionByText = regions.find(r => {
                    return r.data && (
                        (r.data.comment && r.data.comment.includes(text)) || 
                        (r.data.selectedText && r.data.selectedText.includes(text))
                    );
                });
                
                if (regionByText) {
                    console.log("Found region by text content:", regionByText);
                    startTime = regionByText.start;
                    endTime = regionByText.end;
                    duration = endTime - startTime;
                    foundRegion = true;
                    
                    // Используем selectedText из найденного региона, если он есть
                    if (regionByText.data && regionByText.data.selectedText) {
                        console.log('Using selectedText from found region:', regionByText.data.selectedText);
                        text = regionByText.data.selectedText;
                    }
                }
            }
        }
        
        // Если мы не нашли время из региона, попробуем еще один способ
        if (!foundRegion && window.state && window.state.savedRegions) {
            const savedRegion = window.state.savedRegions.find(r => r.filename === fragmentName);
            if (savedRegion) {
                startTime = savedRegion.start;
                endTime = savedRegion.end;
                duration = endTime - startTime;
                foundRegion = true;
                console.log("Found in saved regions:", savedRegion);
                
                // Используем selected_text из сохраненного региона, если он есть
                if (savedRegion.selected_text) {
                    console.log('Using selected_text from saved region:', savedRegion.selected_text);
                    text = savedRegion.selected_text;
                }
            }
        }
        
        // Продолжаем с выделением текста
        completeHighlighting();
    }
    
    // Функция для завершения выделения текста с найденными временными метками
    function completeHighlighting() {
        console.log(`Final time values: start=${startTime}, end=${endTime}, duration=${duration}`);
        
        // Формируем текст подсказки с временными кодами
        const tooltipText = `Selected fragment: ${formatTime(startTime)} - ${formatTime(endTime)} (duration: ${formatTime(duration)})`;
        
        // Ищем вхождение текста в содержимом PDF
        const htmlContent = pdfContentText.innerHTML;
        
        // Создаем уникальный ID для этого выделения
        const highlightId = 'highlight-' + Date.now();
        
        // Пытаемся найти текст в содержимом PDF с разными стратегиями
        let found = false;
        let replacedHtml = htmlContent;
        
        // Стратегия 1: Точное совпадение
        if (!found) {
            try {
                // Экранируем спецсимволы в тексте для использования в регулярном выражении
                const escapedText = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(escapedText, 'g');
                
                if (regex.test(htmlContent)) {
                    console.log('Found exact text match');
                    replacedHtml = htmlContent.replace(regex, match => {
                        found = true;
                        return createHighlightSpan(match, highlightId, fragmentName, startTime, endTime, duration, tooltipText);
                    });
                }
            } catch (e) {
                console.warn('Error in exact match strategy:', e);
            }
        }
        
        // Стратегия 2: Поиск по частям текста (если текст длинный)
        if (!found && text.length > 15) {
            try {
                console.log('Trying partial text match');
                // Разбиваем текст на части и ищем значимый фрагмент
                const words = text.split(/\s+/);
                
                // Берем первые несколько слов (до 5) для поиска
                if (words.length >= 3) {
                    const searchPhrase = words.slice(0, Math.min(5, words.length)).join(' ');
                    const escapedPhrase = searchPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const phraseRegex = new RegExp(escapedPhrase, 'g');
                    
                    if (phraseRegex.test(htmlContent)) {
                        console.log('Found partial text match with phrase:', searchPhrase);
                        replacedHtml = htmlContent.replace(phraseRegex, match => {
                            found = true;
                            return createHighlightSpan(match, highlightId, fragmentName, startTime, endTime, duration, tooltipText);
                        });
                    }
                }
            } catch (e) {
                console.warn('Error in partial match strategy:', e);
            }
        }
        
        // Стратегия 3: Поиск по отдельным словам (если предыдущие стратегии не сработали)
        if (!found && text.length > 10) {
            try {
                console.log('Trying individual word match');
                const words = text.split(/\s+/).filter(word => word.length > 4);
                
                // Сортируем слова по длине (более длинные слова обычно более уникальны)
                words.sort((a, b) => b.length - a.length);
                
                // Пробуем найти самые длинные слова
                for (let i = 0; i < Math.min(3, words.length); i++) {
                    const word = words[i];
                    const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const wordRegex = new RegExp(`\\b${escapedWord}\\b`, 'g');
                    
                    if (wordRegex.test(htmlContent)) {
                        console.log('Found word match with:', word);
                        replacedHtml = htmlContent.replace(wordRegex, match => {
                            found = true;
                            return createHighlightSpan(match, highlightId, fragmentName, startTime, endTime, duration, tooltipText);
                        });
                        break; // Прекращаем поиск, если нашли совпадение
                    }
                }
            } catch (e) {
                console.warn('Error in word match strategy:', e);
            }
        }
        
        // Если нашли совпадение, обновляем HTML
        if (found) {
            pdfContentText.innerHTML = replacedHtml;
            
            // Добавляем обработчик клика для воспроизведения соответствующего фрагмента
            const highlightedSpan = document.getElementById(highlightId);
            if (highlightedSpan) {
                highlightedSpan.addEventListener('click', () => {
                    console.log('Highlighted text clicked, playing fragment with times:', 
                                startTime, endTime, duration);
                    
                    // Пытаемся найти соответствующий регион и воспроизвести его
                    if (window.wavesurfer && window.regionsPlugin) {
                        // Получаем регионы из плагина
                        const regions = window.regionsPlugin.getRegions();
                        
                        // Сначала пробуем найти по имени файла
                        let targetRegion = regions.find(r => r.data && r.data.filename === fragmentName);
                        
                        // Если не найден, пробуем найти по времени
                        if (!targetRegion) {
                            targetRegion = regions.find(r => {
                                const startDiff = Math.abs(r.start - startTime);
                                const endDiff = Math.abs(r.end - endTime);
                                return startDiff < 0.1 && endDiff < 0.1; // допуск 0.1 секунды
                            });
                        }
                        
                        if (targetRegion) {
                            targetRegion.play();
                        } else {
                            // Если регион не найден, но у нас есть времена, используем их напрямую
                            // Перемещаемся к началу фрагмента
                            window.wavesurfer.setTime(startTime);
                            
                            // Запускаем воспроизведение
                            window.wavesurfer.play();
                            
                            // Останавливаем воспроизведение, когда достигнем конца фрагмента
                            const checkInterval = setInterval(() => {
                                const currentTime = window.wavesurfer.getCurrentTime();
                                if (currentTime >= endTime) {
                                    window.wavesurfer.pause();
                                    clearInterval(checkInterval);
                                }
                            }, 100);
                        }
                    }
                });
                
                console.log('Text highlighted and linked to audio fragment with tooltip:', tooltipText);
            } else {
                console.warn('Highlighting span not found after insertion');
            }
        } else {
            console.warn('Text not found in PDF content:', text);
        }
    }
    
    // Вспомогательная функция для создания span с подсветкой
    function createHighlightSpan(text, id, fragmentName, startTime, endTime, duration, tooltip) {
        return `<span id="${id}" class="highlighted-text" 
                    data-fragment="${fragmentName}" 
                    data-start="${startTime}" 
                    data-end="${endTime}" 
                    data-duration="${duration}"
                    data-tooltip="${tooltip}">${text}</span>`;
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