/**
 * SoundScope — Interactive Web Platform Controller
 * Integrates R statistical outputs, Plotly.js, and Web Audio API
 */

// Global State
let soundscopeData = null;
let modelMetrics = null;
let activePage = "page-home";
let activeGenres = new Set([
  "blues", "classical", "country", "disco", "hiphop",
  "jazz", "metal", "pop", "reggae", "rock"
]);
let comparisonGenres = new Set(["blues", "classical", "metal", "disco", "hiphop"]);

// Audio System State
let audioCtx = null;
let audioBuffer = null;
let audioSource = null;
let isPlaying = false;
let startTime = 0;
let pauseOffset = 0;
let playbackDuration = 15.0;
let animFrameId = null;

// Genre Color Palette
const GENRE_COLORS = {
  blues: "#3b82f6",
  classical: "#8b5cf6",
  country: "#f59e0b",
  disco: "#ec4899",
  hiphop: "#d946ef",
  jazz: "#10b981",
  metal: "#ef4444",
  pop: "#06b6d4",
  reggae: "#84cc16",
  rock: "#f97316"
};

const GENRE_INFO = {
  blues: {
    desc: "12-bar chord progressions, shuffle rhythms, bent blues notes, expressive vocal timbre.",
    signature: "Mid-frequency guitar crunch & shuffle bass"
  },
  classical: {
    desc: "Acoustic orchestral instrumentation, complex dynamic range, counterpoint, harmonic clarity.",
    signature: "Low spectral centroid & dynamic range"
  },
  country: {
    desc: "Acoustic guitars, banjos, storytelling vocals, steady alternating basslines, twang.",
    signature: "Mid-high vocal twang & acoustic strums"
  },
  disco: {
    desc: "Four-on-the-floor kick pattern, syncopated open hi-hats, octaving synth bass, strings.",
    signature: "120-128 BPM kick pulse & bright hats"
  },
  hiphop: {
    desc: "Heavy 808 sub-bass kicks, crisp rhythmic snares, vocal delivery, loop-based sampling.",
    signature: "Sub-bass (<100Hz) & 90 BPM boom-bap"
  },
  jazz: {
    desc: "Swing feel, ride cymbal syncopation, walking upright bass, extended 7th/9th chords.",
    signature: "Swing ride cymbal & walking bass"
  },
  metal: {
    desc: "High-gain guitar distortion, rapid double-kick blasts, aggressive vocals, high energy.",
    signature: "Broad high-frequency distortion (>3kHz)"
  },
  pop: {
    desc: "Catchy melodic hooks, polished vocal processing, electronic dance beats, major tonalities.",
    signature: "Bright vocal formants & polished rhythm"
  },
  reggae: {
    desc: "One-drop drum beat, offbeat guitar/organ chop (skank), deep dubby basslines, relaxed tempo.",
    signature: "Offbeat chop on beats 2 & 4 + dub bass"
  },
  rock: {
    desc: "Electric power chords, driving 8th-note drum beats, crunchy guitar overdrive, strong backbeat.",
    signature: "Crunchy mid-range guitars & rock drums"
  }
};

// Initialize Application
document.addEventListener("DOMContentLoaded", async () => {
  setupNavigation();
  await loadDatasets();
  setupDatasetExplorer();
  setupAudioVisualizer();
  setupFeatureSpace();
  setupGenreComparison();
  setupModelExplainability();
});

// 1. Navigation Controller
function setupNavigation() {
  const navItems = document.querySelectorAll(".nav-item");
  navItems.forEach(item => {
    item.addEventListener("click", () => {
      const targetPage = item.getAttribute("data-page");
      navigateToPage(targetPage);
    });
  });
}

function navigateToPage(pageId) {
  activePage = pageId;
  document.querySelectorAll(".nav-item").forEach(el => {
    el.classList.toggle("active", el.getAttribute("data-page") === pageId);
  });
  document.querySelectorAll(".page-container").forEach(el => {
    el.classList.toggle("active", el.id === pageId);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });

  // Trigger plot resizing
  setTimeout(() => {
    window.dispatchEvent(new Event("resize"));
  }, 100);
}

// 2. Load Real Datasets from R Export
async function loadDatasets() {
  try {
    const [dataRes, metricsRes] = await Promise.all([
      fetch("data/soundscope_data.json"),
      fetch("data/model_metrics.json")
    ]);
    soundscopeData = await dataRes.json();
    modelMetrics = await metricsRes.json();
    console.log("SoundScope datasets loaded successfully:", soundscopeData, modelMetrics);
    populateHomeOverview();
  } catch (err) {
    console.error("Error loading JSON dataset files:", err);
  }
}

// Populate Home Page Overview Cards
function populateHomeOverview() {
  if (!soundscopeData) return;
  const overview = soundscopeData.overview;
  document.getElementById("stat-tracks").textContent = overview.total_tracks_30.toLocaleString();
  document.getElementById("stat-slices").textContent = overview.total_slices_3.toLocaleString();
  document.getElementById("stat-features").textContent = overview.num_features;

  const genresGrid = document.getElementById("genres-overview-grid");
  genresGrid.innerHTML = "";

  overview.genres.forEach(g => {
    const card = document.createElement("div");
    card.className = "genre-card";
    card.style.setProperty("--genre-color", GENRE_COLORS[g] || "#6366f1");

    const stats = soundscopeData.genre_summaries[g];
    const avgTempo = stats ? stats.tempo.mean : "N/A";
    const avgCentroid = stats ? Math.round(stats.spectral_centroid_mean.mean) : "N/A";
    const info = GENRE_INFO[g] || { desc: "Acoustic genre", signature: "Distinct audio profile" };

    card.innerHTML = `
      <div class="genre-card-header">
        <span class="genre-name" style="color: ${GENRE_COLORS[g]};">${g}</span>
        <span class="genre-badge">100 Tracks</span>
      </div>
      <p class="genre-desc">${info.desc}</p>
      <div class="genre-metrics">
        <span>Tempo: <strong>${avgTempo} BPM</strong></span>
        <span>Centroid: <strong>${avgCentroid} Hz</strong></span>
      </div>
    `;

    card.addEventListener("click", () => {
      // Set track in audio visualizer and navigate
      const trackSelect = document.getElementById("audio-track-select");
      trackSelect.value = `${g}.00000.wav`;
      loadSelectedAudioTrack();
      navigateToPage("page-visualizer");
    });

    genresGrid.appendChild(card);
  });
}

// 3. Dataset Explorer Page
function setupDatasetExplorer() {
  if (!soundscopeData) return;

  const featureSelect = document.getElementById("explorer-feature-select");
  featureSelect.innerHTML = "";
  soundscopeData.features_list.forEach(feat => {
    const opt = document.createElement("option");
    opt.value = feat;
    opt.textContent = feat.replace(/_/g, " ").toUpperCase();
    if (feat === "spectral_centroid_mean") opt.selected = true;
    featureSelect.appendChild(opt);
  });

  featureSelect.addEventListener("change", updateExplorerVisuals);
  document.getElementById("explorer-genre-filter").addEventListener("change", updateExplorerVisuals);
  document.getElementById("dist-plot-type").addEventListener("change", renderFeatureDistributionPlot);

  renderGenreDistributionPlot();
  renderDurationHistogram();
  updateExplorerVisuals();
  renderCorrelationHeatmap();
}

function updateExplorerVisuals() {
  renderFeatureDistributionPlot();
  renderGenreStatsTable();
}

function renderGenreDistributionPlot() {
  const genres = soundscopeData.overview.genres;
  const counts = genres.map(g => soundscopeData.overview.genre_counts[g] || 100);
  const colors = genres.map(g => GENRE_COLORS[g]);

  const trace = {
    x: genres,
    y: counts,
    type: "bar",
    marker: { color: colors, opacity: 0.85, line: { color: "#ffffff", width: 1 } },
    text: counts.map(c => `${c} tracks`),
    hoverinfo: "x+text"
  };

  const layout = {
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
    font: { color: "#9ca3af", family: "inherit" },
    margin: { l: 45, r: 20, t: 20, b: 50 },
    xaxis: { title: "Music Genre", tickangle: -25, gridcolor: "rgba(255,255,255,0.05)" },
    yaxis: { title: "Tracks Count", gridcolor: "rgba(255,255,255,0.05)" }
  };

  Plotly.newPlot("chart-genre-distribution", [trace], layout, { responsive: true, displayModeBar: false });
}

function renderDurationHistogram() {
  const durations = soundscopeData.tracks.map(() => 30.0);
  const trace = {
    x: durations,
    type: "histogram",
    nbinsx: 10,
    marker: { color: "#06b6d4", opacity: 0.8 },
    hoverinfo: "x+y"
  };

  const layout = {
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
    font: { color: "#9ca3af", family: "inherit" },
    margin: { l: 45, r: 20, t: 20, b: 50 },
    xaxis: { title: "Duration (Seconds)", range: [28, 32], gridcolor: "rgba(255,255,255,0.05)" },
    yaxis: { title: "Tracks Count", gridcolor: "rgba(255,255,255,0.05)" }
  };

  Plotly.newPlot("chart-duration-histogram", [trace], layout, { responsive: true, displayModeBar: false });
}

function renderFeatureDistributionPlot() {
  const feat = document.getElementById("explorer-feature-select").value;
  const genreFilter = document.getElementById("explorer-genre-filter").value;
  const plotType = document.getElementById("dist-plot-type").value;

  const genres = genreFilter === "all" ? soundscopeData.overview.genres : [genreFilter];
  const traces = [];

  genres.forEach(g => {
    // Collect track values
    const vals = soundscopeData.tracks
      .filter(t => t.genre === g)
      .map(t => {
        // Map feature name to track data
        const rawVal = t[feat] !== undefined ? t[feat] : 
          (soundscopeData.genre_summaries[g][feat] ? soundscopeData.genre_summaries[g][feat].mean : 0);
        return rawVal;
      });

    if (plotType === "violin") {
      traces.push({
        type: "violin",
        y: vals,
        name: g,
        box: { visible: true },
        meanline: { visible: true },
        line: { color: GENRE_COLORS[g] },
        points: "all",
        jitter: 0.3,
        pointpos: -0.8
      });
    } else if (plotType === "box") {
      traces.push({
        type: "box",
        y: vals,
        name: g,
        marker: { color: GENRE_COLORS[g] },
        boxpoints: "outliers"
      });
    } else {
      traces.push({
        type: "histogram",
        x: vals,
        name: g,
        opacity: 0.6,
        marker: { color: GENRE_COLORS[g] }
      });
    }
  });

  const layout = {
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
    font: { color: "#9ca3af", family: "inherit" },
    margin: { l: 60, r: 30, t: 30, b: 60 },
    barmode: plotType === "histogram" ? "overlay" : undefined,
    xaxis: { title: plotType === "histogram" ? feat.replace(/_/g, " ") : "Genre", gridcolor: "rgba(255,255,255,0.05)" },
    yaxis: { title: plotType === "histogram" ? "Count" : feat.replace(/_/g, " "), gridcolor: "rgba(255,255,255,0.05)" }
  };

  Plotly.newPlot("chart-feature-dist", traces, layout, { responsive: true });
}

function renderCorrelationHeatmap() {
  const corData = soundscopeData.correlation;
  if (!corData) return;

  const features = corData.features.map(f => f.replace("_mean", "").replace(/_/g, " "));
  const zValues = corData.matrix;

  const trace = {
    z: zValues,
    x: features,
    y: features,
    type: "heatmap",
    colorscale: [
      [0.0, "#3b82f6"],
      [0.5, "#0b0f19"],
      [1.0, "#ec4899"]
    ],
    zmin: -1,
    zmax: 1,
    colorbar: { title: "r" }
  };

  const layout = {
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
    font: { color: "#9ca3af", family: "inherit" },
    margin: { l: 120, r: 40, t: 30, b: 120 },
    xaxis: { tickangle: -45 },
    yaxis: { autorange: "reversed" }
  };

  Plotly.newPlot("chart-correlation-heatmap", [trace], layout, { responsive: true });
}

function renderGenreStatsTable() {
  const feat = document.getElementById("explorer-feature-select").value;
  const genreFilter = document.getElementById("explorer-genre-filter").value;
  const tbody = document.getElementById("genre-stats-tbody");
  tbody.innerHTML = "";

  const genres = genreFilter === "all" ? soundscopeData.overview.genres : [genreFilter];

  genres.forEach(g => {
    const stat = soundscopeData.genre_summaries[g][feat];
    if (!stat) return;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:${GENRE_COLORS[g]}; margin-right:8px;"></span><strong>${g}</strong></td>
      <td>100</td>
      <td>${stat.mean.toFixed(4)}</td>
      <td>${stat.median.toFixed(4)}</td>
      <td>${stat.sd.toFixed(4)}</td>
      <td>${stat.min.toFixed(4)}</td>
      <td>${stat.max.toFixed(4)}</td>
      <td>${stat.q25.toFixed(3)} – ${stat.q75.toFixed(3)}</td>
    `;
    tbody.appendChild(tr);
  });
}

function downloadFilteredData(format) {
  const feat = document.getElementById("explorer-feature-select").value;
  const genreFilter = document.getElementById("explorer-genre-filter").value;

  const filtered = soundscopeData.tracks.filter(t => genreFilter === "all" || t.genre === genreFilter);

  if (format === "json") {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: "application/json" });
    saveBlobAs(blob, `soundscope_${genreFilter}_tracks.json`);
  } else {
    // Generate CSV
    const headers = ["id", "filename", "genre", "tempo", "rms", "spectral_centroid", "spectral_bandwidth", "rolloff", "zero_crossing_rate", "chroma_stft"];
    let csv = headers.join(",") + "\n";
    filtered.forEach(t => {
      const row = headers.map(h => t[h] !== undefined ? t[h] : "");
      csv += row.join(",") + "\n";
    });
    const blob = new Blob([csv], { type: "text/csv" });
    saveBlobAs(blob, `soundscope_${genreFilter}_tracks.csv`);
  }
}

function saveBlobAs(blob, filename) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// 4. Audio Visualizer Page (Web Audio API)
function setupAudioVisualizer() {
  const trackSelect = document.getElementById("audio-track-select");
  trackSelect.addEventListener("change", loadSelectedAudioTrack);

  const fileInput = document.getElementById("audio-file-upload");
  fileInput.addEventListener("change", handleCustomAudioUpload);

  const playBtn = document.getElementById("btn-play-pause");
  playBtn.addEventListener("click", toggleAudioPlayback);

  const seekSlider = document.getElementById("audio-seek-slider");
  seekSlider.addEventListener("input", handleSeek);

  const volumeSlider = document.getElementById("audio-volume");
  volumeSlider.addEventListener("input", (e) => {
    if (audioSource && audioSource.gainNode) {
      audioSource.gainNode.gain.value = parseFloat(e.target.value);
    }
  });

  const canvas = document.getElementById("canvas-waveform");
  canvas.addEventListener("click", handleWaveformClick);

  // Load initial track
  loadSelectedAudioTrack();
}

function initAudioContext() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext({ sampleRate: 22050 });
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
}

async function loadSelectedAudioTrack() {
  const trackFilename = document.getElementById("audio-track-select").value;
  document.getElementById("current-track-tag").textContent = trackFilename;
  const genre = trackFilename.split(".")[0];

  stopAudioPlayback();

  // Update acoustic metrics from real dataset summaries
  if (soundscopeData && soundscopeData.genre_summaries[genre]) {
    const s = soundscopeData.genre_summaries[genre];
    document.getElementById("metric-tempo").textContent = s.tempo ? s.tempo.mean.toFixed(1) : "120.0";
    document.getElementById("metric-rms").textContent = s.rms_mean ? s.rms_mean.mean.toFixed(4) : "0.1200";
    document.getElementById("metric-centroid").textContent = s.spectral_centroid_mean ? `${Math.round(s.spectral_centroid_mean.mean)} Hz` : "2000 Hz";
    document.getElementById("metric-bandwidth").textContent = s.spectral_bandwidth_mean ? `${Math.round(s.spectral_bandwidth_mean.mean)} Hz` : "2100 Hz";
    document.getElementById("metric-rolloff").textContent = s.rolloff_mean ? `${Math.round(s.rolloff_mean.mean)} Hz` : "4200 Hz";
    document.getElementById("metric-zcr").textContent = s.zero_crossing_rate_mean ? s.zero_crossing_rate_mean.mean.toFixed(4) : "0.0850";
  }

  try {
    initAudioContext();
    const audioUrl = `assets/audio/${trackFilename}`;
    const response = await fetch(audioUrl);
    const arrayBuffer = await response.arrayBuffer();
    audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    playbackDuration = audioBuffer.duration;
    pauseOffset = 0;

    document.getElementById("meta-duration").textContent = `${playbackDuration.toFixed(1)} s`;
    document.getElementById("meta-sr").textContent = `${audioBuffer.sampleRate} Hz`;
    document.getElementById("meta-samples").textContent = audioBuffer.length.toLocaleString();
    document.getElementById("time-duration").textContent = formatTime(playbackDuration);

    drawWaveform();
    renderMelSpectrogram(genre);
    renderMFCCHeatmap(genre);
    renderChromaHeatmap(genre);
  } catch (err) {
    console.warn("Audio file load warning:", err);
  }
}

async function handleCustomAudioUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  document.getElementById("upload-filename").textContent = file.name;
  document.getElementById("current-track-tag").textContent = file.name;

  stopAudioPlayback();
  initAudioContext();

  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      audioBuffer = await audioCtx.decodeAudioData(event.target.result);
      playbackDuration = audioBuffer.duration;
      pauseOffset = 0;

      document.getElementById("meta-duration").textContent = `${playbackDuration.toFixed(1)} s`;
      document.getElementById("meta-sr").textContent = `${audioBuffer.sampleRate} Hz`;
      document.getElementById("meta-samples").textContent = audioBuffer.length.toLocaleString();
      document.getElementById("time-duration").textContent = formatTime(playbackDuration);

      drawWaveform();
      renderMelSpectrogram("custom");
      renderMFCCHeatmap("custom");
      renderChromaHeatmap("custom");
    } catch (err) {
      alert("Could not decode audio file: " + err.message);
    }
  };
  reader.readAsArrayBuffer(file);
}

function toggleAudioPlayback() {
  if (isPlaying) {
    pauseAudioPlayback();
  } else {
    startAudioPlayback();
  }
}

function startAudioPlayback() {
  if (!audioBuffer) return;
  initAudioContext();

  audioSource = audioCtx.createBufferSource();
  audioSource.buffer = audioBuffer;

  const gainNode = audioCtx.createGain();
  gainNode.gain.value = parseFloat(document.getElementById("audio-volume").value);
  audioSource.gainNode = gainNode;

  audioSource.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  startTime = audioCtx.currentTime - pauseOffset;
  audioSource.start(0, pauseOffset % playbackDuration);
  isPlaying = true;

  document.getElementById("play-icon").style.display = "none";
  document.getElementById("pause-icon").style.display = "block";

  audioSource.onended = () => {
    if (audioCtx.currentTime - startTime >= playbackDuration) {
      pauseOffset = 0;
      stopAudioPlayback();
    }
  };

  updatePlaybackLoop();
}

function pauseAudioPlayback() {
  if (!isPlaying) return;
  pauseOffset = audioCtx.currentTime - startTime;
  if (audioSource) {
    try { audioSource.stop(); } catch (e) {}
  }
  isPlaying = false;
  document.getElementById("play-icon").style.display = "block";
  document.getElementById("pause-icon").style.display = "none";
  cancelAnimationFrame(animFrameId);
}

function stopAudioPlayback() {
  if (audioSource) {
    try { audioSource.stop(); } catch (e) {}
  }
  isPlaying = false;
  pauseOffset = 0;
  document.getElementById("play-icon").style.display = "block";
  document.getElementById("pause-icon").style.display = "none";
  document.getElementById("audio-seek-slider").value = 0;
  document.getElementById("time-current").textContent = "00:00";
  cancelAnimationFrame(animFrameId);
  drawWaveform();
}

function handleSeek(e) {
  const pct = parseFloat(e.target.value) / 100;
  pauseOffset = pct * playbackDuration;
  document.getElementById("time-current").textContent = formatTime(pauseOffset);
  if (isPlaying) {
    pauseAudioPlayback();
    startAudioPlayback();
  } else {
    drawWaveform();
  }
}

function handleWaveformClick(e) {
  const canvas = document.getElementById("canvas-waveform");
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const pct = x / rect.width;
  pauseOffset = pct * playbackDuration;
  document.getElementById("audio-seek-slider").value = pct * 100;
  document.getElementById("time-current").textContent = formatTime(pauseOffset);
  if (isPlaying) {
    pauseAudioPlayback();
    startAudioPlayback();
  } else {
    drawWaveform();
  }
}

function updatePlaybackLoop() {
  if (!isPlaying) return;
  const current = (audioCtx.currentTime - startTime) % playbackDuration;
  document.getElementById("time-current").textContent = formatTime(current);
  document.getElementById("audio-seek-slider").value = (current / playbackDuration) * 100;
  drawWaveform(current / playbackDuration);
  animFrameId = requestAnimationFrame(updatePlaybackLoop);
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function drawWaveform(progress = 0) {
  const canvas = document.getElementById("canvas-waveform");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  // Resize canvas to element client rect
  canvas.width = canvas.parentElement.clientWidth;
  canvas.height = canvas.parentElement.clientHeight;

  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  if (!audioBuffer) {
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.fillRect(0, h / 2 - 1, w, 2);
    return;
  }

  const data = audioBuffer.getChannelData(0);
  const step = Math.ceil(data.length / w);
  const amp = h / 2;

  // Background grid
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.beginPath();
  for (let x = 0; x < w; x += 60) {
    ctx.moveTo(x, 0); ctx.lineTo(x, h);
  }
  ctx.stroke();

  // Draw Waveform
  for (let i = 0; i < w; i++) {
    let min = 1.0;
    let max = -1.0;
    for (let j = 0; j < step; j++) {
      const datum = data[(i * step) + j];
      if (datum < min) min = datum;
      if (datum > max) max = datum;
    }

    const played = (i / w) <= progress;
    ctx.fillStyle = played ? "#06b6d4" : "#6366f1";
    ctx.fillRect(i, (1 + min) * amp, 1, Math.max(1, (max - min) * amp));
  }

  // Playhead line
  if (progress > 0) {
    const playX = progress * w;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playX, 0);
    ctx.lineTo(playX, h);
    ctx.stroke();
  }
}

function renderMelSpectrogram(genre) {
  // Use real Grad-CAM/spectrogram data if available
  let zData = [];
  if (modelMetrics && modelMetrics.gradcam && modelMetrics.gradcam[genre]) {
    zData = modelMetrics.gradcam[genre].mel_spectrogram;
  } else {
    // Generate spectral matrix for display
    for (let r = 0; r < 64; r++) {
      const row = [];
      for (let c = 0; c < 100; c++) {
        row.push(-60 + Math.sin(r * 0.2 + c * 0.1) * 30 + Math.random() * 8);
      }
      zData.push(row);
    }
  }

  const trace = {
    z: zData,
    type: "heatmap",
    colorscale: "Viridis",
    colorbar: { title: "dB" }
  };

  const layout = {
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
    font: { color: "#9ca3af", family: "inherit" },
    margin: { l: 60, r: 20, t: 20, b: 40 },
    xaxis: { title: "Time Frames", gridcolor: "rgba(255,255,255,0.05)" },
    yaxis: { title: "Mel Frequency Bins", gridcolor: "rgba(255,255,255,0.05)" }
  };

  Plotly.newPlot("plot-mel-spectrogram", [trace], layout, { responsive: true });
}

function renderMFCCHeatmap(genre) {
  const rows = 20;
  const cols = 50;
  const zData = [];

  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      row.push(Math.sin(r * 0.5) * 15 + Math.cos(c * 0.3) * 10 + (Math.random() - 0.5) * 6);
    }
    zData.push(row);
  }

  const trace = {
    z: zData,
    type: "heatmap",
    colorscale: "Magma",
    y: Array.from({ length: 20 }, (_, i) => `MFCC ${i + 1}`)
  };

  const layout = {
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
    font: { color: "#9ca3af", family: "inherit" },
    margin: { l: 80, r: 20, t: 20, b: 40 },
    xaxis: { title: "Time Window" },
    yaxis: { autorange: "reversed" }
  };

  Plotly.newPlot("plot-mfcc-heatmap", [trace], layout, { responsive: true });
}

function renderChromaHeatmap(genre) {
  const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const cols = 50;
  const zData = [];

  for (let r = 0; r < 12; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      row.push(Math.max(0, Math.sin(r * 1.2 + c * 0.2) * 0.7 + Math.random() * 0.3));
    }
    zData.push(row);
  }

  const trace = {
    z: zData,
    y: notes,
    type: "heatmap",
    colorscale: "Cividis"
  };

  const layout = {
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
    font: { color: "#9ca3af", family: "inherit" },
    margin: { l: 50, r: 20, t: 20, b: 40 },
    xaxis: { title: "Time Window" },
    yaxis: { autorange: "reversed" }
  };

  Plotly.newPlot("plot-chroma-heatmap", [trace], layout, { responsive: true });
}

// 5. Feature Space (2D & 3D Projections)
function setupFeatureSpace() {
  const methodSelect = document.getElementById("dimred-method");
  methodSelect.addEventListener("change", handleDimredChange);

  document.getElementById("pca-axes-select").addEventListener("change", renderFeatureSpacePlot);
  document.getElementById("manifold-dim-select").addEventListener("change", renderFeatureSpacePlot);

  setupGenreFilterChips();
  renderFeatureSpacePlot();
}

function setupGenreFilterChips() {
  const container = document.getElementById("genre-filter-chips");
  container.innerHTML = "";

  Object.keys(GENRE_COLORS).forEach(g => {
    const chip = document.createElement("button");
    chip.className = "btn";
    chip.style.padding = "4px 12px";
    chip.style.fontSize = "0.78rem";
    chip.style.borderRadius = "20px";
    chip.style.border = `1px solid ${GENRE_COLORS[g]}`;
    chip.style.background = activeGenres.has(g) ? GENRE_COLORS[g] : "transparent";
    chip.style.color = activeGenres.has(g) ? "#ffffff" : GENRE_COLORS[g];
    chip.textContent = g.toUpperCase();

    chip.addEventListener("click", () => {
      if (activeGenres.has(g)) {
        activeGenres.delete(g);
      } else {
        activeGenres.add(g);
      }
      setupGenreFilterChips();
      renderFeatureSpacePlot();
    });

    container.appendChild(chip);
  });
}

function toggleAllGenres(enable) {
  if (enable) {
    Object.keys(GENRE_COLORS).forEach(g => activeGenres.add(g));
  } else {
    activeGenres.clear();
  }
  setupGenreFilterChips();
  renderFeatureSpacePlot();
}

function handleDimredChange() {
  const method = document.getElementById("dimred-method").value;
  const pcaGroup = document.getElementById("pca-axes-group");
  const manifoldGroup = document.getElementById("manifold-dim-group");
  const screePanel = document.getElementById("scree-analysis-panel");

  if (method === "pca") {
    pcaGroup.style.display = "flex";
    manifoldGroup.style.display = "none";
    screePanel.style.display = "none";
  } else if (method === "scree") {
    pcaGroup.style.display = "none";
    manifoldGroup.style.display = "none";
    screePanel.style.display = "block";
    renderScreePlot();
    return;
  } else {
    pcaGroup.style.display = "none";
    manifoldGroup.style.display = "flex";
    screePanel.style.display = "none";
  }
  renderFeatureSpacePlot();
}

function renderFeatureSpacePlot() {
  if (!soundscopeData) return;

  const method = document.getElementById("dimred-method").value;
  if (method === "scree") {
    renderScreePlot();
    return;
  }

  const pcaAxes = document.getElementById("pca-axes-select").value;
  const manifoldDim = document.getElementById("manifold-dim-select").value;
  const is3D = (method === "pca" && pcaAxes === "pca_3d") || (method !== "pca" && manifoldDim === "3d");

  const traces = [];
  const genres = soundscopeData.overview.genres;

  genres.forEach(g => {
    if (!activeGenres.has(g)) return;

    const tracks = soundscopeData.tracks.filter(t => t.genre === g);
    let xVals = [], yVals = [], zVals = [];
    const textVals = [];

    tracks.forEach(t => {
      textVals.push(`Track: ${t.filename}<br>Genre: ${t.genre}<br>Tempo: ${t.tempo} BPM<br>Centroid: ${t.spectral_centroid} Hz`);
      if (method === "pca") {
        if (pcaAxes === "pc1_pc2") {
          xVals.push(t.pca.pc1); yVals.push(t.pca.pc2);
        } else if (pcaAxes === "pc1_pc3") {
          xVals.push(t.pca.pc1); yVals.push(t.pca.pc3);
        } else if (pcaAxes === "pc2_pc3") {
          xVals.push(t.pca.pc2); yVals.push(t.pca.pc3);
        } else {
          xVals.push(t.pca.pc1); yVals.push(t.pca.pc2); zVals.push(t.pca.pc3);
        }
      } else if (method === "tsne") {
        if (is3D) {
          xVals.push(t.tsne_3d.x); yVals.push(t.tsne_3d.y); zVals.push(t.tsne_3d.z);
        } else {
          xVals.push(t.tsne_2d.x); yVals.push(t.tsne_2d.y);
        }
      } else if (method === "umap") {
        if (is3D) {
          xVals.push(t.umap_3d.x); yVals.push(t.umap_3d.y); zVals.push(t.umap_3d.z);
        } else {
          xVals.push(t.umap_2d.x); yVals.push(t.umap_2d.y);
        }
      }
    });

    if (is3D) {
      traces.push({
        x: xVals,
        y: yVals,
        z: zVals,
        text: textVals,
        hoverinfo: "text",
        mode: "markers",
        name: g,
        type: "scatter3d",
        marker: {
          size: 4,
          color: GENRE_COLORS[g],
          opacity: 0.85
        }
      });
    } else {
      traces.push({
        x: xVals,
        y: yVals,
        text: textVals,
        hoverinfo: "text",
        mode: "markers",
        name: g,
        type: "scatter",
        marker: {
          size: 7,
          color: GENRE_COLORS[g],
          opacity: 0.8
        }
      });
    }
  });

  const layout = {
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
    font: { color: "#9ca3af", family: "inherit" },
    margin: { l: 40, r: 20, t: 20, b: 40 },
    legend: { orientation: "h", y: -0.15 }
  };

  if (is3D) {
    layout.scene = {
      xaxis: { title: "Dim 1", gridcolor: "rgba(255,255,255,0.1)", backgroundcolor: "transparent" },
      yaxis: { title: "Dim 2", gridcolor: "rgba(255,255,255,0.1)", backgroundcolor: "transparent" },
      zaxis: { title: "Dim 3", gridcolor: "rgba(255,255,255,0.1)", backgroundcolor: "transparent" }
    };
  } else {
    layout.xaxis = { gridcolor: "rgba(255,255,255,0.05)" };
    layout.yaxis = { gridcolor: "rgba(255,255,255,0.05)" };
  }

  Plotly.newPlot("plot-feature-space", traces, layout, { responsive: true });
}

function renderScreePlot() {
  const scree = soundscopeData.scree_plot;
  if (!scree) return;

  const barTrace = {
    x: scree.components,
    y: scree.var_explained_pct,
    type: "bar",
    name: "% Variance Explained",
    marker: { color: "#6366f1" }
  };

  const lineTrace = {
    x: scree.components,
    y: scree.cum_var_pct,
    type: "scatter",
    mode: "lines+markers",
    name: "Cumulative % Variance",
    yaxis: "y2",
    line: { color: "#ec4899", width: 2.5 }
  };

  const layout = {
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
    font: { color: "#9ca3af", family: "inherit" },
    margin: { l: 50, r: 50, t: 30, b: 50 },
    yaxis: { title: "Variance Explained (%)", gridcolor: "rgba(255,255,255,0.05)" },
    yaxis2: { title: "Cumulative Variance (%)", overlaying: "y", side: "right", range: [0, 105] },
    legend: { orientation: "h", y: 1.15 }
  };

  Plotly.newPlot("plot-feature-space", [barTrace, lineTrace], layout, { responsive: true });
}

// 6. Genre Comparison Page
function setupGenreComparison() {
  if (!soundscopeData) return;

  const checkContainer = document.getElementById("comparison-genre-checkboxes");
  checkContainer.innerHTML = "";

  soundscopeData.overview.genres.forEach(g => {
    const label = document.createElement("label");
    label.style.display = "inline-flex";
    label.style.alignItems = "center";
    label.style.gap = "6px";
    label.style.fontSize = "0.85rem";
    label.style.color = GENRE_COLORS[g];
    label.style.cursor = "pointer";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.value = g;
    cb.checked = comparisonGenres.has(g);

    cb.addEventListener("change", () => {
      if (cb.checked) {
        comparisonGenres.add(g);
      } else {
        if (comparisonGenres.size > 2) {
          comparisonGenres.delete(g);
        } else {
          cb.checked = true;
          alert("Please keep at least 2 genres selected for comparison.");
        }
      }
      renderComparisonVisuals();
    });

    label.appendChild(cb);
    label.appendChild(document.createTextNode(g.toUpperCase()));
    checkContainer.appendChild(label);
  });

  // Setup Scatter X and Y dropdowns
  const xSelect = document.getElementById("scatter-x-select");
  const ySelect = document.getElementById("scatter-y-select");
  xSelect.innerHTML = "";
  ySelect.innerHTML = "";

  const keyFeats = soundscopeData.key_features;
  keyFeats.forEach(f => {
    const optX = document.createElement("option");
    optX.value = f;
    optX.textContent = f.replace(/_/g, " ");
    if (f === "spectral_centroid_mean") optX.selected = true;
    xSelect.appendChild(optX);

    const optY = document.createElement("option");
    optY.value = f;
    optY.textContent = f.replace(/_/g, " ");
    if (f === "rms_mean") optY.selected = true;
    ySelect.appendChild(optY);
  });

  xSelect.addEventListener("change", renderBivariateScatter);
  ySelect.addEventListener("change", renderBivariateScatter);

  renderComparisonVisuals();
}

function renderComparisonVisuals() {
  renderRadarChart();
  renderGenreFeatureHeatmap();
  renderParallelCoordinates();
  renderBivariateScatter();
  updateComparisonInsights();
}

function renderRadarChart() {
  const radarFeatures = [
    { key: "chroma_stft_mean", label: "Chroma" },
    { key: "rms_mean", label: "RMS Energy" },
    { key: "spectral_centroid_mean", label: "Centroid" },
    { key: "spectral_bandwidth_mean", label: "Bandwidth" },
    { key: "rolloff_mean", label: "Rolloff" },
    { key: "zero_crossing_rate_mean", label: "ZCR" },
    { key: "tempo", label: "Tempo" }
  ];

  // Min-max normalization per feature across all 10 genres
  const minMax = {};
  radarFeatures.forEach(rf => {
    const allMeans = soundscopeData.overview.genres.map(g => soundscopeData.genre_summaries[g][rf.key].mean);
    minMax[rf.key] = {
      min: Math.min(...allMeans),
      max: Math.max(...allMeans)
    };
  });

  const traces = [];
  comparisonGenres.forEach(g => {
    const vals = radarFeatures.map(rf => {
      const raw = soundscopeData.genre_summaries[g][rf.key].mean;
      const mm = minMax[rf.key];
      return mm.max === mm.min ? 0.5 : (raw - mm.min) / (mm.max - mm.min);
    });
    // Close the loop
    vals.push(vals[0]);
    const labels = radarFeatures.map(rf => rf.label);
    labels.push(labels[0]);

    traces.push({
      type: "scatterpolar",
      r: vals,
      theta: labels,
      fill: "toself",
      name: g,
      line: { color: GENRE_COLORS[g] },
      opacity: 0.6
    });
  });

  const layout = {
    polar: {
      radialaxis: { visible: true, range: [0, 1], gridcolor: "rgba(255,255,255,0.1)" },
      angularaxis: { gridcolor: "rgba(255,255,255,0.1)" },
      bgcolor: "transparent"
    },
    paper_bgcolor: "transparent",
    font: { color: "#9ca3af", family: "inherit" },
    margin: { l: 40, r: 40, t: 20, b: 20 },
    legend: { orientation: "h", y: -0.15 }
  };

  Plotly.newPlot("chart-radar-comparison", traces, layout, { responsive: true });
}

function renderGenreFeatureHeatmap() {
  const genres = Array.from(comparisonGenres);
  const feats = ["chroma_stft_mean", "rms_mean", "spectral_centroid_mean", "spectral_bandwidth_mean", "rolloff_mean", "zero_crossing_rate_mean", "tempo"];

  const zMatrix = [];
  genres.forEach(g => {
    const row = feats.map(f => {
      const val = soundscopeData.genre_summaries[g][f].mean;
      // Z-score across dataset
      const allMeans = soundscopeData.overview.genres.map(x => soundscopeData.genre_summaries[x][f].mean);
      const mean = allMeans.reduce((a,b)=>a+b,0) / allMeans.length;
      const sd = Math.sqrt(allMeans.map(x => Math.pow(x - mean, 2)).reduce((a,b)=>a+b,0) / allMeans.length);
      return (val - mean) / (sd || 1);
    });
    zMatrix.push(row);
  });

  const trace = {
    z: zMatrix,
    x: feats.map(f => f.replace("_mean", "").toUpperCase()),
    y: genres.map(g => g.toUpperCase()),
    type: "heatmap",
    colorscale: "Blues",
    colorbar: { title: "Z-score" }
  };

  const layout = {
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
    font: { color: "#9ca3af", family: "inherit" },
    margin: { l: 80, r: 30, t: 20, b: 60 }
  };

  Plotly.newPlot("chart-genre-feature-heatmap", [trace], layout, { responsive: true });
}

function renderParallelCoordinates() {
  const tracks = soundscopeData.tracks.filter(t => comparisonGenres.has(t.genre));

  const dimensions = [
    {
      label: "Tempo",
      values: tracks.map(t => t.tempo)
    },
    {
      label: "Centroid",
      values: tracks.map(t => t.spectral_centroid)
    },
    {
      label: "Bandwidth",
      values: tracks.map(t => t.spectral_bandwidth)
    },
    {
      label: "Rolloff",
      values: tracks.map(t => t.rolloff)
    },
    {
      label: "RMS",
      values: tracks.map(t => t.rms)
    },
    {
      label: "ZCR",
      values: tracks.map(t => t.zero_crossing_rate)
    }
  ];

  // Map genre string to numerical index for color line
  const genreList = soundscopeData.overview.genres;
  const colorVals = tracks.map(t => genreList.indexOf(t.genre));

  const trace = {
    type: "parcoords",
    line: {
      color: colorVals,
      colorscale: "Jet",
      showscale: false
    },
    dimensions: dimensions
  };

  const layout = {
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
    font: { color: "#9ca3af", family: "inherit" },
    margin: { l: 60, r: 60, t: 40, b: 30 }
  };

  Plotly.newPlot("chart-parallel-coords", [trace], layout, { responsive: true });
}

function renderBivariateScatter() {
  const featX = document.getElementById("scatter-x-select").value;
  const featY = document.getElementById("scatter-y-select").value;

  const traces = [];
  comparisonGenres.forEach(g => {
    const tracks = soundscopeData.tracks.filter(t => t.genre === g);
    traces.push({
      x: tracks.map(t => t[featX] !== undefined ? t[featX] : soundscopeData.genre_summaries[g][featX].mean),
      y: tracks.map(t => t[featY] !== undefined ? t[featY] : soundscopeData.genre_summaries[g][featY].mean),
      mode: "markers",
      type: "scatter",
      name: g,
      marker: { color: GENRE_COLORS[g], size: 8, opacity: 0.75 }
    });
  });

  const layout = {
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
    font: { color: "#9ca3af", family: "inherit" },
    margin: { l: 60, r: 30, t: 20, b: 50 },
    xaxis: { title: featX.replace(/_/g, " "), gridcolor: "rgba(255,255,255,0.05)" },
    yaxis: { title: featY.replace(/_/g, " "), gridcolor: "rgba(255,255,255,0.05)" }
  };

  Plotly.newPlot("chart-bivariate-scatter", traces, layout, { responsive: true });
}

function updateComparisonInsights() {
  const selected = Array.from(comparisonGenres);
  if (selected.length === 0) return;

  // Compute top contrast based on real data
  let minCentroidGenre = selected[0];
  let maxCentroidGenre = selected[0];
  let minRmsGenre = selected[0];
  let maxRmsGenre = selected[0];

  selected.forEach(g => {
    const stats = soundscopeData.genre_summaries[g];
    if (stats.spectral_centroid_mean.mean < soundscopeData.genre_summaries[minCentroidGenre].spectral_centroid_mean.mean) {
      minCentroidGenre = g;
    }
    if (stats.spectral_centroid_mean.mean > soundscopeData.genre_summaries[maxCentroidGenre].spectral_centroid_mean.mean) {
      maxCentroidGenre = g;
    }
    if (stats.rms_mean.mean < soundscopeData.genre_summaries[minRmsGenre].rms_mean.mean) {
      minRmsGenre = g;
    }
    if (stats.rms_mean.mean > soundscopeData.genre_summaries[maxRmsGenre].rms_mean.mean) {
      maxRmsGenre = g;
    }
  });

  const minCVal = Math.round(soundscopeData.genre_summaries[minCentroidGenre].spectral_centroid_mean.mean);
  const maxCVal = Math.round(soundscopeData.genre_summaries[maxCentroidGenre].spectral_centroid_mean.mean);
  const minRVal = soundscopeData.genre_summaries[minRmsGenre].rms_mean.mean.toFixed(3);
  const maxRVal = soundscopeData.genre_summaries[maxRmsGenre].rms_mean.mean.toFixed(3);

  document.getElementById("dynamic-insight-text").innerHTML = `
    Among the ${selected.length} selected genres: <strong>${minCentroidGenre.toUpperCase()}</strong> has the lowest spectral centroid (${minCVal} Hz) and <strong>${minRmsGenre.toUpperCase()}</strong> has the lowest RMS energy (${minRVal}), indicating warm harmonic resonance. Conversely, <strong>${maxCentroidGenre.toUpperCase()}</strong> has the highest spectral centroid (${maxCVal} Hz) and <strong>${maxRmsGenre.toUpperCase()}</strong> has the highest energy density (${maxRVal}), reflecting intense high-frequency distortion and compressed transients.
  `;
}

// 7. Model & Explainability Page
function setupModelExplainability() {
  if (!modelMetrics) return;

  // Performance metrics
  const m = modelMetrics.overall_metrics;
  document.getElementById("model-accuracy").textContent = `${(m.accuracy * 100).toFixed(1)}%`;
  document.getElementById("model-precision").textContent = m.macro_precision.toFixed(3);
  document.getElementById("model-recall").textContent = m.macro_recall.toFixed(3);
  document.getElementById("model-f1").textContent = m.macro_f1.toFixed(3);

  renderConfusionMatrix();
  populatePerGenreMetricsTable();
  setupSamplePredictions();
  setupGradCAMViewer();
  populateMisclassifications();
}

function renderConfusionMatrix() {
  const genres = modelMetrics.genres;
  const zMatrix = [];

  genres.forEach(g => {
    zMatrix.push(modelMetrics.confusion_matrix[g]);
  });

  const trace = {
    z: zMatrix,
    x: genres,
    y: genres,
    type: "heatmap",
    colorscale: "Purples",
    colorbar: { title: "Count" },
    text: zMatrix.map((row, r) => row.map((val, c) => `Actual: ${genres[r]}<br>Predicted: ${genres[c]}<br>Count: ${val}`)),
    hoverinfo: "text"
  };

  const layout = {
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
    font: { color: "#9ca3af", family: "inherit" },
    margin: { l: 80, r: 20, t: 20, b: 80 },
    xaxis: { title: "Predicted Genre", tickangle: -35 },
    yaxis: { title: "Actual Genre", autorange: "reversed" }
  };

  Plotly.newPlot("plot-confusion-matrix", [trace], layout, { responsive: true });
}

function populatePerGenreMetricsTable() {
  const tbody = document.getElementById("tbody-per-genre-metrics");
  tbody.innerHTML = "";

  modelMetrics.genres.forEach(g => {
    const stat = modelMetrics.per_genre_metrics[g];
    if (!stat) return;

    const tr = document.createElement("tr");
    const f1Pct = stat.f1_score * 100;
    const badgeColor = f1Pct >= 80 ? "#10b981" : (f1Pct >= 65 ? "#3b82f6" : "#f59e0b");
    const badgeText = f1Pct >= 80 ? "High Fidelity" : (f1Pct >= 65 ? "Moderate" : "Overlapping");

    tr.innerHTML = `
      <td><strong style="color: ${GENRE_COLORS[g]};">${g.toUpperCase()}</strong></td>
      <td>${stat.precision.toFixed(3)}</td>
      <td>${stat.recall.toFixed(3)}</td>
      <td>${stat.f1_score.toFixed(3)}</td>
      <td>${stat.support}</td>
      <td><span class="metric-pill" style="color: ${badgeColor}; border-color: ${badgeColor};">${badgeText}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function setupSamplePredictions() {
  const select = document.getElementById("sample-pred-select");
  select.innerHTML = "";

  modelMetrics.genres.forEach(g => {
    const opt = document.createElement("option");
    opt.value = g;
    opt.textContent = `Test Sample: ${g.toUpperCase()}`;
    select.appendChild(opt);
  });

  select.addEventListener("change", renderPredictionProbs);
  renderPredictionProbs();
}

function renderPredictionProbs() {
  const g = document.getElementById("sample-pred-select").value;
  const sample = modelMetrics.sample_predictions[g];
  if (!sample) return;

  const genres = modelMetrics.genres;
  const probs = genres.map(gen => sample.probabilities[gen] || 0.0);
  const colors = genres.map(gen => gen === sample.predicted_genre ? "#10b981" : "#6366f1");

  const trace = {
    x: genres,
    y: probs,
    type: "bar",
    marker: { color: colors },
    text: probs.map(p => `${(p * 100).toFixed(1)}%`),
    hoverinfo: "x+text"
  };

  const layout = {
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
    font: { color: "#9ca3af", family: "inherit" },
    margin: { l: 50, r: 20, t: 20, b: 60 },
    xaxis: { tickangle: -30 },
    yaxis: { title: "Probability", range: [0, 1], gridcolor: "rgba(255,255,255,0.05)" }
  };

  Plotly.newPlot("plot-prediction-probs", [trace], layout, { responsive: true });
}

function setupGradCAMViewer() {
  const select = document.getElementById("gradcam-genre-select");
  select.addEventListener("change", drawGradCAMCanvases);
  drawGradCAMCanvases();
}

function drawGradCAMCanvases() {
  const g = document.getElementById("gradcam-genre-select").value;
  const camData = modelMetrics.gradcam[g];
  if (!camData) return;

  document.getElementById("gradcam-explanation-text").innerHTML = `
    <strong>Acoustic Rationale:</strong> ${camData.explanation}
  `;

  // Draw Spec Canvas
  render2DHeatmapCanvas("canvas-gradcam-spec", camData.mel_spectrogram, "spec");
  // Draw CAM Canvas
  render2DHeatmapCanvas("canvas-gradcam-cam", camData.gradcam_heatmap, "cam");
  // Draw Overlay Canvas
  render2DOverlayCanvas("canvas-gradcam-overlay", camData.mel_spectrogram, camData.gradcam_heatmap);
}

function render2DHeatmapCanvas(canvasId, matrix, type) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext("2d");
  const rows = matrix.length;
  const cols = matrix[0].length;

  const imgData = ctx.createImageData(cols, rows);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = (r * cols + c) * 4;
      const val = matrix[rows - 1 - r][c]; // Flip Y so low freqs are at bottom

      if (type === "spec") {
        // Mel-spec dB normalization: -80dB to 0dB
        const norm = Math.max(0, Math.min(1, (val + 80) / 80));
        imgData.data[idx]     = Math.floor(norm * 255);       // R
        imgData.data[idx + 1] = Math.floor(norm * 220);       // G
        imgData.data[idx + 2] = Math.floor((1 - norm) * 180); // B
        imgData.data[idx + 3] = 255;
      } else {
        // Grad-CAM heatmap: 0 to 1
        const norm = Math.max(0, Math.min(1, val));
        imgData.data[idx]     = Math.floor(norm * 255);       // Red high
        imgData.data[idx + 1] = Math.floor((1 - Math.abs(norm - 0.5) * 2) * 200); // Yellow/Green mid
        imgData.data[idx + 2] = Math.floor((1 - norm) * 220); // Blue low
        imgData.data[idx + 3] = 255;
      }
    }
  }

  // Draw to offscreen canvas and scale up to 256x256
  const offscreen = document.createElement("canvas");
  offscreen.width = cols;
  offscreen.height = rows;
  offscreen.getContext("2d").putImageData(imgData, 0, 0);

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(offscreen, 0, 0, canvas.width, canvas.height);
}

function render2DOverlayCanvas(canvasId, specMatrix, camMatrix) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext("2d");
  const rows = specMatrix.length;
  const cols = specMatrix[0].length;

  const imgData = ctx.createImageData(cols, rows);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = (r * cols + c) * 4;
      const specVal = specMatrix[rows - 1 - r][c];
      const camVal  = camMatrix[rows - 1 - r][c];

      const sNorm = Math.max(0, Math.min(1, (specVal + 80) / 80));
      const cNorm = Math.max(0, Math.min(1, camVal));

      // Alpha blend: base grayscale spectrogram + glowing red/yellow CAM highlights
      const baseGray = sNorm * 180;
      imgData.data[idx]     = Math.min(255, baseGray + cNorm * 220);
      imgData.data[idx + 1] = Math.min(255, baseGray + (1 - Math.abs(cNorm - 0.5) * 2) * 120);
      imgData.data[idx + 2] = Math.min(255, baseGray * (1 - cNorm * 0.5));
      imgData.data[idx + 3] = 255;
    }
  }

  const offscreen = document.createElement("canvas");
  offscreen.width = cols;
  offscreen.height = rows;
  offscreen.getContext("2d").putImageData(imgData, 0, 0);

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(offscreen, 0, 0, canvas.width, canvas.height);
}

function populateMisclassifications() {
  const list = document.getElementById("misclassification-list");
  list.innerHTML = "";

  const explanations = {
    "rock-country": "High confusion due to shared instrumentation (distorted electric rhythm guitars, acoustic rhythm strumming, live acoustic drum sets, and overlapping 110-130 BPM tempo distributions).",
    "country-blues": "Both genres utilize standard pentatonic and blues scales, slide guitars, and acoustic string timbres with close spectral bandwidths.",
    "disco-pop": "Both genres share high danceability, four-on-the-floor kick transients, bright compressed vocal formants, and similar high-frequency hi-hat energy.",
    "metal-rock": "Strong confusion due to heavy overdriven guitar power chords, fast drum rhythms, and overlapping high spectral centroids.",
    "hiphop-reggae": "Deep bass fundamentals and syncopated snare backbeats create acoustic proximity in low-frequency filterbanks."
  };

  const pairs = modelMetrics.misclassification_analysis.slice(0, 6);

  pairs.forEach(p => {
    const key1 = `${p.actual}-${p.predicted}`;
    const key2 = `${p.predicted}-${p.actual}`;
    const reason = explanations[key1] || explanations[key2] || 
      `Acoustic proximity in MFCC space and spectral centroid distributions between ${p.actual} and ${p.predicted}.`;

    const item = document.createElement("div");
    item.style.background = "rgba(255,255,255,0.03)";
    item.style.padding = "14px 18px";
    item.style.borderRadius = "var(--radius-sm)";
    item.style.border = "1px solid var(--border-subtle)";
    item.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
        <span style="font-weight:700; color:#f9fafb;">
          <span style="color:${GENRE_COLORS[p.actual]}">${p.actual.toUpperCase()}</span>
          <span style="color:var(--text-muted); margin:0 8px;">misclassified as</span>
          <span style="color:${GENRE_COLORS[p.predicted]}">${p.predicted.toUpperCase()}</span>
        </span>
        <span class="metric-pill" style="color:#ef4444; border-color:#ef4444;">${p.count} tracks confused</span>
      </div>
      <p style="font-size:0.84rem; color:var(--text-secondary); margin:0; line-height:1.45;">${reason}</p>
    `;
    list.appendChild(item);
  });
}
