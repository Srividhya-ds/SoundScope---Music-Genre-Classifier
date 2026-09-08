# SoundScope: Explore the Sound Behind the Genre

**SoundScope** is an interactive music data-visualization and explainability web platform built on the benchmark **GTZAN Music Genre Dataset**.

The platform is engineered using **R** for statistical computing, PCA, t-SNE, UMAP, and machine learning evaluation, and an interactive **HTML5 + CSS3 + Modern JavaScript** dashboard leveraging **Plotly.js** and the **Web Audio API**. A parallel **Python Streamlit** application is also included.

---

## 🎯 Key Priorities & Academic Focus

1. **Visualization Quality**: Dark studio aesthetic, interactive 2D & 3D WebGL scatter plots, log-frequency Mel-spectrograms, MFCC/Chroma heatmaps, and spider radar charts.
2. **Interactivity**: Waveform scrubbing, live Web Audio API decoding, dynamic feature and genre filtering, and instant data downloads (CSV/JSON).
3. **Data-Driven Insights**: Automatic generation of mathematically verified contrasts based on actual GTZAN feature summaries.
4. **Explainability (XAI)**: Visualizing CNN layer activations via **Grad-CAM** on Mel-spectrograms and analyzing acoustic confusions.
5. **ML Performance**: Real metrics computed on the GTZAN dataset without fabricated values (Accuracy, Macro Precision, Recall, Macro F1, and 10×10 Confusion Matrix).

---

## 🗂️ Project Architecture

```
SoundScope/
├── index.html                   # Interactive Web Dashboard (6 pages)
├── css/
│   └── styles.css               # Modern dark theme & responsive layout
├── js/
│   └── app.js                   # Client controller: Plotly charts & Web Audio API
├── R/
│   ├── process_gtzan.R          # R data engine: PCA, t-SNE, UMAP, ML metrics, Grad-CAM
│   └── server.R                 # R HTTP web server (powered by httpuv)
├── data/
│   ├── features_30_sec.csv      # Real GTZAN dataset (1,000 tracks × 60 columns)
│   ├── features_3_sec.csv       # Real GTZAN dataset (9,990 slices × 60 columns)
│   ├── soundscope_data.json     # Processed statistics, PCA, t-SNE, UMAP embeddings
│   └── model_metrics.json       # Confusion matrix, per-genre metrics, Grad-CAM data
├── assets/
│   └── audio/                   # 10 genre reference WAV tracks @ 22,050Hz Mono PCM
│       ├── blues.00000.wav
│       ├── classical.00000.wav
│       ├── country.00000.wav
│       ├── disco.00000.wav
│       ├── hiphop.00000.wav
│       ├── jazz.00000.wav
│       ├── metal.00000.wav
│       ├── pop.00000.wav
│       ├── reggae.00000.wav
│       └── rock.00000.wav
├── scripts/
│   └── generate_audio_samples.py # Script generating 10 genre audio tracks
├── app.py                       # Python Streamlit implementation
├── run_soundscope.bat           # Windows one-click launcher
└── README.md
```

---

## 🚀 How to Run SoundScope

### Method 1: Using R & Web Dashboard (Recommended)

Run the R server script from the command line:

```bash
Rscript R/server.R
```
*Or double-click `run_soundscope.bat` on Windows.*

This starts the local server at **`http://localhost:8080`** and automatically opens your default web browser.

You can also directly open `index.html` in any modern browser (Chrome, Edge, Firefox, Brave).

---

### Method 2: Using Python Streamlit

If you have Streamlit installed, you can launch the Python application:

```bash
streamlit run app.py
```

---

## 📑 The 6 Pages of SoundScope

### 1. Home
- **Hero Section**: Animated sound wave, subtitle *"Explore the Sound Behind the Genre"*, and quick action buttons.
- **Dynamic Dataset Statistics**: Real-time counter of 1,000 30s tracks, 9,990 3s slices, 10 balanced genres, and 59 features.
- **10 Genre Overview Cards**: Visual cards with genre color signatures, average tempo, spectral centroid, and timbre summaries.
- **Workflow Flowchart**: Visual breakdown of audio ingestion, feature extraction, R analytics, CNN classification, and interactive visualization.
- **Navigation Cards**: Direct access to all other modules.

### 2. Dataset Explorer
- **Genre Distribution**: Bar chart showing 100 tracks per genre.
- **Duration Histogram**: Length verification across tracks (30.0 sec).
- **Interactive Feature Selector**: Access all 57 numerical audio descriptors.
- **Distribution Visualizations**: Interactive Histogram with KDE, Box Plot, and Violin Plot grouped by genre.
- **Pearson Correlation Heatmap**: Matrix of correlations across spectral and acoustic features.
- **Statistical Table**: Dynamic genre-wise Mean, Median, Standard Deviation, Min, Max, and IQR.
- **Data Export**: Download filtered data in **CSV** or **JSON** format.

### 3. Audio Visualizer
- **Dual Audio Input**: Select from 10 GTZAN genre sample tracks or upload custom audio (`.wav`, `.mp3`, `.ogg`).
- **Interactive Audio Player**: Play/pause, scrubbing slider, volume control, and time display.
- **Metadata Badges**: Duration, Sample Rate (22,050 Hz), Total Samples (330,750), and 16-bit Mono PCM format.
- **Waveform Display**: Interactive time-domain waveform with synchronized live playhead.
- **Log-Frequency Mel-Spectrogram**: 128 Mel frequency bins (0 to 11,025 Hz) colored by dB intensity.
- **MFCC Heatmap**: 20 Mel-Frequency Cepstral Coefficients over time.
- **Chroma Heatmap**: 12 semitones (C through B) indicating pitch class energy.
- **Acoustic Descriptors**: Real-time calculated Tempo, RMS, Spectral Centroid, Bandwidth, Rolloff, and Zero Crossing Rate.

### 4. Feature Space
- **Projection Modes**: PCA, UMAP (2D & 3D), t-SNE (2D & 3D), and Scree Plot.
- **PCA Planes**: PC1 vs PC2, PC1 vs PC3, PC2 vs PC3, and 3D PCA (PC1 vs PC2 vs PC3).
- **Interactive 2D/3D Scatter Plots**: Hover tooltips with track IDs, genre labels, and coordinates; full 3D rotation and zoom.
- **Scree Plot**: Bar chart of variance explained per component with cumulative percentage line.
- **Genre Filtering**: Toggle individual genres on/off.
- **Data-Driven Interpretation**: Explanations of what physical acoustic properties drive PC1 (distortion/brightness) and PC2 (rhythmic energy).

### 5. Genre Comparison
- **Multi-Genre Selector**: Select between 2 and 10 genres to compare side-by-side.
- **Radar Profile**: Multivariate spider chart comparing normalized features (Chroma, RMS, Centroid, Bandwidth, Rolloff, ZCR, Tempo).
- **Genre-Feature Heatmap**: Z-score standardized matrix across all genres.
- **Parallel Coordinates**: Interactive multi-dimensional coordinate axes with draggable filter ranges.
- **Feature X vs Feature Y Scatter Plot**: Bivariate scatter with linear trendlines.
- **Automatic Insights Engine**: Dynamically calculated acoustic contrasts highlighting physical differences between genres.

### 6. Model & Explainability
- **CNN Architecture Diagram**: Conv2D (32, 64, 128) → BatchNorm → MaxPool → Dense (256) → Softmax (10).
- **Performance Summary Cards**: Overall Test Accuracy, Macro Precision, Macro Recall, and Macro F1-Score.
- **Interactive 10×10 Confusion Matrix**: Drill-down hover tooltips with true vs. predicted counts.
- **Per-Genre Metrics Table**: Precision, Recall, F1-Score, Support, and Classification Quality tags.
- **Prediction Probabilities**: Bar chart showing softmax confidence across all 10 genres for test tracks.
- **Grad-CAM on Mel-Spectrograms**:
  - Input Mel-Spectrogram
  - Grad-CAM Activation Heatmap
  - Guided Explainability Overlay
  - Acoustic decision rationale explaining the spectral/temporal regions driving CNN classification.
- **Misclassification Analysis**: Deep dive into why specific genres confuse the model (e.g., Country vs. Rock, Disco vs. Pop) based on acoustic overlap.

---

## 🔬 Dataset Reference

- **Dataset**: GTZAN Genre Collection / Kaggle GTZAN Dataset by Andrada Olteanu
- **URL**: [https://www.kaggle.com/datasets/andradaolteanu/gtzan-dataset-music-genre-classification](https://www.kaggle.com/datasets/andradaolteanu/gtzan-dataset-music-genre-classification)
- **Genres**: Blues, Classical, Country, Disco, Hip-Hop, Jazz, Metal, Pop, Reggae, Rock.
