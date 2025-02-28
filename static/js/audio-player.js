// audio-player.js - Управление аудио с использованием WaveSurfer.js

import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline.esm.js';
import { wavesurfer, regionsPlugin, state, controls, setButtonsDisabled, formatTime } from './main.js';

// Настройка аудио плеера с использованием WaveSurfer
export async function setupAudioPlayer() {
    try {
        console.log('Setting up audio player...');
        
        // Добавляем обработчики для кнопок управления
        if (controls.playBtn) {
            controls.playBtn.addEventListener('click', () => {
                if (window.wavesurfer) {
                    window.wavesurfer.playPause();
                    state.isPlaying = !state.isPlaying;
                }
            });
        }

        if (controls.stopBtn) {
            controls.stopBtn.addEventListener('click', () => {
                if (window.wavesurfer) {
                    window.wavesurfer.stop();
                    state.isPlaying = false;
                }
            });
        }

        // Обновляем время воспроизведения
        window.wavesurfer.on('audioprocess', () => {
            if (controls.timer) {
                const currentTime = window.wavesurfer.getCurrentTime();
                const duration = window.wavesurfer.getDuration();
                controls.timer.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
            }
        });

        // Обработка окончания воспроизведения
        window.wavesurfer.on('finish', () => {
            state.isPlaying = false;
            if (controls.timer) {
                const duration = window.wavesurfer.getDuration();
                controls.timer.textContent = `${formatTime(duration)} / ${formatTime(duration)}`;
            }
        });

        console.log('Audio player setup complete');
        
    } catch (error) {
        console.error('Error setting up audio player:', error);
        throw error;
    }
}

// Воспроизведение
export function play() {
    const ws = window.wavesurfer;
    if (!ws || !state.audioLoaded) return;
    
    ws.play();
    state.isPlaying = true;
}

// Пауза
export function pause() {
    const ws = window.wavesurfer;
    if (!ws || !state.isPlaying) return;
    
    ws.pause();
    state.isPlaying = false;
}

// Остановка (переход к началу и пауза)
export function stop() {
    const ws = window.wavesurfer;
    if (!ws) return;
    
    ws.stop();
    state.isPlaying = false;
    controls.timer.textContent = `00:00:000 / ${formatTime(ws.getDuration())}`;
}

// Воспроизведение региона
export function playRegion(region) {
    if (!region) return;
    
    state.selectedRegion = region;
    
    // Устанавливаем текущую позицию в начало региона
    window.wavesurfer.setTime(region.start);
    
    // Начинаем воспроизведение
    play();
    
    // Добавляем обработчик для отслеживания конца региона
    const checkEndInterval = setInterval(() => {
        if (!state.isPlaying || !window.wavesurfer) {
            clearInterval(checkEndInterval);
            return;
        }
        
        const currentTime = window.wavesurfer.getCurrentTime();
        if (currentTime >= region.end) {
            pause();
            clearInterval(checkEndInterval);
        }
    }, 10);
}

// Переход к определенному времени
export function seekTo(time) {
    if (!window.wavesurfer || !state.audioLoaded) return;
    window.wavesurfer.setTime(time);
}