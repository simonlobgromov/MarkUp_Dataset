# Audio Dataset Markup Tool

A web application for audio dataset annotation and segmentation. This tool allows you to upload audio files, visualize them as waveforms, select specific segments, and save them with annotations.

## Features

- Upload and visualize audio files (.mp3, .wav, .ogg, m4a)
- Optional PDF upload for reference text
- Interactive waveform visualization with WaveSurfer.js
- Create and manage audio regions/segments
- Save selected segments with annotations
- Export segments as separate audio files
- Keyboard shortcuts for efficient workflow

## Screenshot

![Audio Dataset Markup Tool](screenshot.png)

## Requirements

- Python 3.7+
- Node.js 14+
- FFmpeg (for audio processing)

## Installation

### 1. Clone the repository

```bash
git clone git@github.com:simonlobgromov/MarkUp_Dataset.git
cd MarkUp_Dataset
```

### 2. Set up Python environment

Create and activate a virtual environment:

```bash
# Linux/macOS
python -m venv venv
source venv/bin/activate


Install Python dependencies:

```bash
pip install -r requirements.txt
```

### 3. Install FFmpeg

#### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install ffmpeg
```

#### macOS (using Homebrew)

```bash
brew install ffmpeg
```

#### Windows

1. Download FFmpeg from [the official website](https://ffmpeg.org/download.html)
2. Extract the downloaded ZIP file to a location on your computer
3. Add the FFmpeg `bin` folder to your system PATH

### 4. Install Node.js dependencies

```bash
npm install
```

## Usage

### Start the application

```bash
python app.py
```

The application will start on http://localhost:8000. You can access it in your web browser.

### Workflow

1. Upload an audio file on the homepage (optionally include a PDF with transcript)
2. Use the waveform visualizer to select regions of interest
3. Annotate and save selected regions
4. Access saved segments from the application

### Keyboard Shortcuts

- **Space**: Play/pause audio
- **Esc**: Clear selection or close modal
- **Enter**: Play selected region
- **Delete**: Remove selected region (unsaved only)
- **Ctrl+S**: Save selected region
- **Left Arrow**: Navigate backward
- **Right Arrow**: Navigate forward
- **Shift + Arrow Keys**: Navigate in larger increments

## Project Structure

- `/static` - CSS and JavaScript files
- `/templates` - HTML templates
- `/uploads` - Uploaded audio and PDF files
- `/fragments` - Saved audio segments
- `app.py` - Main Flask application

## Development

### Building JavaScript

If you make changes to the JavaScript files, you can build them with:

```bash
npm run build
```

### Environment Variables

You can customize the application behavior by creating a `.env` file in the project root:

```
UPLOAD_FOLDER=uploads
OUTPUT_FOLDER=fragments
DEBUG=True
PORT=8000
```

## Troubleshooting

### Audio Not Playing

Make sure your browser supports the audio format you're trying to play. If using Chrome, it should support most common audio formats.

### WaveSurfer Issues

If you encounter issues with the waveform visualization:

1. Check the browser console for errors
2. Ensure your audio file is not corrupted
3. Try a different audio file format

### Region Selection Not Working

If region selection is not working:

1. Click the "Enable Selection" button
2. Click and drag on the waveform
3. Make sure JavaScript is enabled in your browser

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
