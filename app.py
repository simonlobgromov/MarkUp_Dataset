from flask import Flask, render_template, request, redirect, url_for, send_from_directory, jsonify, flash, session
import os
import pypdf
import subprocess
import json
from datetime import datetime
import glob

app = Flask(__name__)
app.secret_key = 'audio_dataset_markup_secret_key'  # Секретный ключ для сессий и flash-сообщений
UPLOAD_FOLDER = 'uploads'
OUTPUT_FOLDER = 'fragments'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['OUTPUT_FOLDER'] = OUTPUT_FOLDER

# Создаем необходимые директории, если их нет
for folder in [UPLOAD_FOLDER, OUTPUT_FOLDER]:
    if not os.path.exists(folder):
        os.makedirs(folder)

# Создаем директорию для JavaScript модулей, если её нет
JS_FOLDER = os.path.join('static', 'js')
if not os.path.exists(JS_FOLDER):
    os.makedirs(JS_FOLDER)

@app.route('/', methods=['GET', 'POST'])
def index():
    # Передаем текущий год для отображения в футере
    current_year = datetime.now().year
    
    if request.method == 'POST':
        # Проверяем наличие имени пользователя
        username = request.form.get('username')
        if not username:
            return render_template('index.html', error="Введите имя пользователя", current_year=current_year)
        
        # Сохраняем имя пользователя в сессии
        session['username'] = username
        
        if 'audio' not in request.files:
            return render_template('index.html', error="Не выбран аудио файл", current_year=current_year)
        
        audio_file = request.files['audio']
        pdf_file = request.files.get('pdf')
        
        if audio_file.filename == '':
            return render_template('index.html', error="Не выбран аудио файл", current_year=current_year)
            
        # Проверка расширений файлов
        allowed_audio = {'mp3', 'wav', 'ogg', 'm4a'}
        allowed_pdf = {'pdf'}
        
        if not ('.' in audio_file.filename and 
                audio_file.filename.rsplit('.', 1)[1].lower() in allowed_audio):
            return render_template('index.html', error="Неверный формат аудио файла", current_year=current_year)

        if pdf_file and pdf_file.filename != '':
            if not ('.' in pdf_file.filename and 
                    pdf_file.filename.rsplit('.', 1)[1].lower() in allowed_pdf):
                return render_template('index.html', error="Неверный формат PDF файла", current_year=current_year)

        try:
            # Сохраняем аудио файл
            audio_path = os.path.join(app.config['UPLOAD_FOLDER'], audio_file.filename)
            audio_file.save(audio_path)

            pdf_filename = None
            if pdf_file and pdf_file.filename != '':
                # Сохраняем PDF файл
                pdf_path = os.path.join(app.config['UPLOAD_FOLDER'], pdf_file.filename)
                pdf_file.save(pdf_path)
                pdf_filename = pdf_file.filename

            return redirect(url_for('audio_view', 
                                   audio_filename=audio_file.filename,
                                   pdf_filename=pdf_filename))
        except Exception as e:
            return render_template('index.html', error=f"Ошибка при загрузке файлов: {str(e)}", current_year=current_year)

    return render_template('index.html', current_year=current_year)

@app.route('/audio_view')
def audio_view():
    audio_filename = request.args.get('audio_filename')
    pdf_filename = request.args.get('pdf_filename')
    
    # Проверяем, есть ли имя пользователя в сессии
    username = session.get('username')
    if not username:
        flash('Пожалуйста, введите ваше имя перед началом работы с аудио', 'warning')
        return redirect(url_for('index'))

    # Проверка на существование аудиофайла
    audio_path = os.path.join(app.config['UPLOAD_FOLDER'], audio_filename)
    if not os.path.exists(audio_path):
        flash('Аудио файл не найден', 'error')
        return redirect(url_for('index'))

    pdf_text = None
    if pdf_filename:
        pdf_path = os.path.join(app.config['UPLOAD_FOLDER'], pdf_filename)
        if os.path.exists(pdf_path):
            try:
                with open(pdf_path, 'rb') as file:
                    reader = pypdf.PdfReader(file)
                    pdf_text = "".join([page.extract_text() for page in reader.pages])
            except Exception as e:
                flash(f'Ошибка при чтении PDF: {str(e)}', 'warning')

    # Передаем текущий год для отображения в футере
    current_year = datetime.now().year
    
    return render_template('audio_view.html', 
                           audio_filename=audio_filename, 
                           pdf_text=pdf_text, 
                           username=username,
                           current_year=current_year)

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    """Функция для доступа к загруженным файлам"""
    response = send_from_directory(app.config['UPLOAD_FOLDER'], filename)
    response.headers['Accept-Ranges'] = 'bytes'  # Enable partial content
    return response

@app.route('/fragments/<filename>')
def fragment_file(filename):
    """Функция для доступа к сохраненным фрагментам"""
    return send_from_directory(app.config['OUTPUT_FOLDER'], filename)

@app.route('/save_region', methods=['POST'])
def save_region():
    try:
        data = request.json
        audio_filename = data.get('audio_filename')
        start = data.get('start')
        end = data.get('end')
        comment = data.get('comment', '')
        username = data.get('username') or session.get('username', 'Anonymous')
        
        # Проверка входных данных
        if not audio_filename or start is None or end is None:
            return jsonify({'success': False, 'error': 'Неверные входные данные'})
        
        # Формируем имя нового файла
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        base_name = os.path.splitext(audio_filename)[0]
        extension = os.path.splitext(audio_filename)[1]
        new_filename = f"{base_name}_{timestamp}{extension}"
        
        # Полные пути к файлам
        input_path = os.path.join(app.config['UPLOAD_FOLDER'], audio_filename)
        output_path = os.path.join(app.config['OUTPUT_FOLDER'], new_filename)
        
        # Используем FFmpeg для обрезки аудио
        start_sec = start
        duration = end - start
        
        cmd = [
            'ffmpeg',
            '-i', input_path,
            '-ss', str(start_sec),
            '-t', str(duration),
            '-acodec', 'copy',
            output_path
        ]
        
        # Выполняем команду
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        stdout, stderr = process.communicate()
        
        if process.returncode != 0:
            return jsonify({'success': False, 'error': 'Ошибка FFmpeg: ' + stderr.decode('utf-8')})
        
        # Сохраняем информацию о фрагменте в JSON-файл вместе с именем пользователя
        metadata_filename = f"{base_name}_{timestamp}.json"
        metadata_path = os.path.join(app.config['OUTPUT_FOLDER'], metadata_filename)
        
        metadata = {
            'original_file': audio_filename,
            'start_time': start,
            'end_time': end,
            'duration': duration,
            'comment': comment,
            'timestamp': timestamp,
            'output_file': new_filename,
            'username': username
        }
        
        with open(metadata_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, ensure_ascii=False, indent=4)
        
        # Сохраняем комментарий в отдельный файл, если он есть
        if comment:
            comment_filename = f"{base_name}_{timestamp}.txt"
            comment_path = os.path.join(app.config['OUTPUT_FOLDER'], comment_filename)
            
            with open(comment_path, 'w', encoding='utf-8') as f:
                f.write(comment)
        
        return jsonify({'success': True, 'filename': new_filename})
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/get_saved_regions', methods=['GET'])
def get_saved_regions():
    try:
        audio_filename = request.args.get('audio_filename')
        
        if not audio_filename:
            return jsonify({'success': False, 'error': 'Не указано имя аудиофайла'})
        
        base_name = os.path.splitext(audio_filename)[0]
        
        # Ищем все JSON-файлы, относящиеся к этому аудиофайлу
        metadata_files = glob.glob(os.path.join(app.config['OUTPUT_FOLDER'], f"{base_name}_*.json"))
        
        regions = []
        for metadata_file in metadata_files:
            with open(metadata_file, 'r', encoding='utf-8') as f:
                metadata = json.load(f)
                
                # Проверяем, что это метаданные для указанного аудиофайла
                if metadata.get('original_file') == audio_filename:
                    regions.append({
                        'start': metadata.get('start_time'),
                        'end': metadata.get('end_time'),
                        'comment': metadata.get('comment', ''),
                        'filename': metadata.get('output_file'),
                        'username': metadata.get('username', 'Anonymous')
                    })
        
        return jsonify({'success': True, 'regions': regions})
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

# Добавьте этот новый маршрут в app.py

@app.route('/get_fragment_data', methods=['GET'])
def get_fragment_data():
    try:
        filename = request.args.get('filename')
        if not filename:
            return jsonify({'success': False, 'error': 'Не указано имя файла фрагмента'})
        
        # Извлекаем базовое имя файла без расширения
        base_name = os.path.splitext(filename)[0]
        
        # Формируем имя JSON-файла
        json_filename = f"{base_name}.json"
        json_path = os.path.join(app.config['OUTPUT_FOLDER'], json_filename)
        
        # Проверяем, существует ли JSON-файл
        if not os.path.exists(json_path):
            return jsonify({'success': False, 'error': 'Метаданные фрагмента не найдены'})
        
        # Загружаем JSON-данные
        with open(json_path, 'r', encoding='utf-8') as f:
            fragment_data = json.load(f)
            
        return jsonify({
            'success': True, 
            'fragment': fragment_data
        })
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

if __name__ == '__main__':
    app.run(debug=True, port=8000)