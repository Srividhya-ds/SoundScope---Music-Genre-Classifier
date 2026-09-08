"""
SoundScope: Explore the Sound Behind the Genre
Interactive Music Data-Visualization Platform for GTZAN Dataset
Streamlit Implementation
"""

import os
import json
import pandas as pd
import numpy as np
import streamlit as st
import plotly.express as px
import plotly.graph_objects as go

# 1. Page Configuration & Theme
st.set_page_config(
    page_title="SoundScope — GTZAN Music Analytics",
    page_icon="🎵",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for dark aesthetic
st.markdown("""
<style>
    .main { background-color: #0b0f19; color: #f9fafb; }
    .stMetric { background-color: rgba(17, 24, 39, 0.8); padding: 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08); }
    .hero-box {
        background: linear-gradient(135deg, rgba(30, 27, 75, 0.7) 0%, rgba(17, 24, 39, 0.9) 100%);
        border: 1px solid rgba(99, 102, 241, 0.3);
        border-radius: 12px;
        padding: 30px;
        margin-bottom: 25px;
    }
</style>
""", unsafe_allow_html=True)

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
AUDIO_DIR = os.path.join(os.path.dirname(__file__), "assets", "audio")

GENRE_COLORS = {
    "blues": "#3b82f6", "classical": "#8b5cf6", "country": "#f59e0b",
    "disco": "#ec4899", "hiphop": "#d946ef", "jazz": "#10b981",
    "metal": "#ef4444", "pop": "#06b6d4", "reggae": "#84cc16", "rock": "#f97316"
}

@st.cache_data
def load_data():
    csv_path = os.path.join(DATA_DIR, "features_30_sec.csv")
    json_path = os.path.join(DATA_DIR, "soundscope_data.json")
    metrics_path = os.path.join(DATA_DIR, "model_metrics.json")
    
    df = pd.read_csv(csv_path) if os.path.exists(csv_path) else None
    
    soundscope_json = None
    if os.path.exists(json_path):
        with open(json_path, "r") as f:
            soundscope_json = json.load(f)
            
    model_json = None
    if os.path.exists(metrics_path):
        with open(metrics_path, "r") as f:
            model_json = json.load(f)
            
    return df, soundscope_json, model_json

df, soundscope_data, model_metrics = load_data()

# Sidebar Navigation
st.sidebar.markdown("### 🎵 SoundScope Navigation")
page = st.sidebar.radio(
    "Go to",
    ["Home", "Dataset Explorer", "Audio Visualizer", "Feature Space", "Genre Comparison", "Model & Explainability"],
    index=0
)
st.sidebar.markdown("---")
st.sidebar.markdown("**GTZAN Dataset**: 1,000 Tracks · 10 Genres · 59 Features")

# ==============================================================================
# PAGE 1: HOME
# ==============================================================================
if page == "Home":
    st.markdown("""
    <div class="hero-box">
        <h1 style="color: #ffffff; margin-bottom: 8px;">SoundScope: Explore the Sound Behind the Genre</h1>
        <p style="font-size: 1.15rem; color: #cbd5e1; margin-bottom: 0;">
            An interactive data visualization platform exploring the acoustic morphology, dimensional topology, 
            and explainable neural activations of the benchmark GTZAN music genre dataset.
        </p>
    </div>
    """, unsafe_allow_html=True)
    
    # Dataset statistics calculated dynamically
    col1, col2, col3, col4, col5 = st.columns(5)
    col1.metric("Total Tracks (30s)", f"{len(df):,}" if df is not None else "1,000")
    col2.metric("3s Audio Slices", "9,990")
    col3.metric("Music Genres", f"{df['label'].nunique()}" if df is not None else "10")
    col4.metric("Extracted Features", f"{len(df.columns) - 2}" if df is not None else "59")
    col5.metric("Sample Rate", "22,050 Hz")
    
    st.markdown("---")
    st.markdown("### 🎼 10 Genre Overview")
    g_cols = st.columns(5)
    genres = sorted(df['label'].unique()) if df is not None else list(GENRE_COLORS.keys())
    
    for i, g in enumerate(genres):
        with g_cols[i % 5]:
            sub = df[df['label'] == g] if df is not None else None
            avg_tempo = f"{sub['tempo'].mean():.1f} BPM" if sub is not None else "120 BPM"
            avg_cent = f"{int(sub['spectral_centroid_mean'].mean()):,} Hz" if sub is not None else "2,000 Hz"
            st.markdown(f"""
            <div style="background:rgba(17,24,39,0.8); border-left: 4px solid {GENRE_COLORS.get(g, '#fff')}; padding:14px; border-radius:8px; margin-bottom:14px; border: 1px solid rgba(255,255,255,0.06);">
                <h4 style="color:{GENRE_COLORS.get(g, '#fff')}; margin-bottom:4px; text-transform:capitalize;">{g}</h4>
                <div style="font-size:0.8rem; color:#9ca3af;">100 Tracks</div>
                <div style="font-size:0.75rem; color:#cbd5e1; margin-top:6px;">Tempo: <b>{avg_tempo}</b></div>
                <div style="font-size:0.75rem; color:#cbd5e1;">Centroid: <b>{avg_cent}</b></div>
            </div>
            """, unsafe_allow_html=True)
            
    st.markdown("---")
    st.markdown("### 🔄 SoundScope Workflow")
    st.markdown("""
    1. **Raw Audio Ingestion**: 1,000 GTZAN clips @ 22,050Hz Mono PCM (30s duration)
    2. **Spectral Processing**: STFT, 128 Mel Filterbanks, Chroma 12, MFCC 1–20
    3. **R Statistical Modeling**: Summary distributions, PCA, 2D/3D t-SNE, 2D/3D UMAP
    4. **CNN & Grad-CAM**: Conv2D multi-genre classification and layer activation explainability
    5. **Interactive Exploration**: Visual analytics across feature spaces and acoustic contrasts
    """)

# ==============================================================================
# PAGE 2: DATASET EXPLORER
# ==============================================================================
elif page == "Dataset Explorer":
    st.markdown("## 📊 GTZAN Dataset Explorer")
    st.markdown("Investigate feature distributions, genre balance, duration validation, and correlations.")
    
    num_cols = [c for c in df.columns if c not in ["filename", "length", "label"]] if df is not None else []
    
    c1, c2 = st.columns([2, 1])
    with c1:
        sel_feat = st.selectbox("Select Feature to Explore", num_cols, index=num_cols.index("spectral_centroid_mean") if "spectral_centroid_mean" in num_cols else 0)
    with c2:
        plot_type = st.selectbox("Distribution Plot Type", ["Violin Plot", "Box Plot", "Histogram"], index=0)
        
    col_a, col_b = st.columns(2)
    with col_a:
        st.markdown("#### Genre Class Balance")
        fig_dist = px.bar(df['label'].value_counts().reset_index(), x='label', y='count', color='label',
                          color_discrete_map=GENRE_COLORS, title="100 Tracks per Genre (Perfect Balance)")
        fig_dist.update_layout(showlegend=False, paper_bgcolor="transparent", plot_bgcolor="transparent", font=dict(color="#9ca3af"))
        st.plotly_chart(fig_dist, use_container_width=True)
        
    with col_b:
        st.markdown("#### Duration Verification")
        fig_dur = px.histogram(df, x="length", title="Audio Track Lengths (Fixed 30.0 sec)", color_discrete_sequence=["#06b6d4"])
        fig_dur.update_layout(paper_bgcolor="transparent", plot_bgcolor="transparent", font=dict(color="#9ca3af"))
        st.plotly_chart(fig_dur, use_container_width=True)
        
    st.markdown(f"#### Feature Distribution across Genres: `{sel_feat}`")
    if plot_type == "Violin Plot":
        fig_f = px.violin(df, x="label", y=sel_feat, color="label", color_discrete_map=GENRE_COLORS, box=True, points="all")
    elif plot_type == "Box Plot":
        fig_f = px.box(df, x="label", y=sel_feat, color="label", color_discrete_map=GENRE_COLORS, points="outliers")
    else:
        fig_f = px.histogram(df, x=sel_feat, color="label", color_discrete_map=GENRE_COLORS, barmode="overlay", opacity=0.7)
        
    fig_f.update_layout(paper_bgcolor="transparent", plot_bgcolor="transparent", font=dict(color="#9ca3af"), showlegend=False)
    st.plotly_chart(fig_f, use_container_width=True)
    
    st.markdown("#### Correlation Heatmap (Key Acoustic Descriptors)")
    key_feats = ["chroma_stft_mean", "rms_mean", "spectral_centroid_mean", "spectral_bandwidth_mean", "rolloff_mean", "zero_crossing_rate_mean", "tempo", "mfcc1_mean", "mfcc2_mean", "mfcc3_mean"]
    cor_mat = df[key_feats].corr()
    fig_corr = px.imshow(cor_mat, color_continuous_scale="RdBu_r", zmin=-1, zmax=1)
    fig_corr.update_layout(paper_bgcolor="transparent", plot_bgcolor="transparent", font=dict(color="#9ca3af"))
    st.plotly_chart(fig_corr, use_container_width=True)
    
    st.markdown("#### Genre-Wise Statistical Summary")
    summary_df = df.groupby("label")[sel_feat].agg(["count", "mean", "median", "std", "min", "max"]).reset_index()
    st.dataframe(summary_df, use_container_width=True)
    
    csv_data = summary_df.to_csv(index=False).encode('utf-8')
    st.download_button("Download Filtered Statistics (CSV)", csv_data, f"gtzan_{sel_feat}_summary.csv", "text/csv")

# ==============================================================================
# PAGE 3: AUDIO VISUALIZER
# ==============================================================================
elif page == "Audio Visualizer":
    st.markdown("## 🎧 Audio Visualizer")
    st.markdown("Listen to authentic GTZAN genre tracks or upload custom audio. Inspect waveforms, Mel-spectrograms, MFCCs, and Chroma.")
    
    genres = ["blues", "classical", "country", "disco", "hiphop", "jazz", "metal", "pop", "reggae", "rock"]
    sel_genre = st.selectbox("Select GTZAN Track", genres, index=0)
    audio_file_path = os.path.join(AUDIO_DIR, f"{sel_genre}.00000.wav")
    
    uploaded_file = st.file_uploader("Or Upload Custom Audio (WAV / MP3 / OGG)", type=["wav", "mp3", "ogg"])
    
    c1, c2 = st.columns([1, 1])
    with c1:
        st.markdown("#### Audio Playback")
        if uploaded_file is not None:
            st.audio(uploaded_file)
            st.info(f"Custom track loaded: {uploaded_file.name}")
        elif os.path.exists(audio_file_path):
            with open(audio_file_path, "rb") as f:
                st.audio(f.read(), format="audio/wav")
            st.caption(f"Playing GTZAN sample: `{sel_genre}.00000.wav` (15s @ 22,050 Hz)")
            
    with c2:
        st.markdown("#### Acoustic Descriptors")
        g_stats = soundscope_data["genre_summaries"][sel_genre] if soundscope_data else {}
        st.write(f"- **Tempo**: {g_stats.get('tempo', {}).get('mean', 120.0):.1f} BPM")
        st.write(f"- **RMS Energy**: {g_stats.get('rms_mean', {}).get('mean', 0.12):.4f}")
        st.write(f"- **Spectral Centroid**: {int(g_stats.get('spectral_centroid_mean', {}).get('mean', 2000))} Hz")
        st.write(f"- **Spectral Rolloff**: {int(g_stats.get('rolloff_mean', {}).get('mean', 4000))} Hz")
        st.write(f"- **Zero Crossing Rate**: {g_stats.get('zero_crossing_rate_mean', {}).get('mean', 0.08):.4f}")

    st.markdown("#### Mel-Spectrogram (dB)")
    if model_metrics and "gradcam" in model_metrics and sel_genre in model_metrics["gradcam"]:
        spec = np.array(model_metrics["gradcam"][sel_genre]["mel_spectrogram"])
        fig_spec = px.imshow(spec, origin="lower", color_continuous_scale="Viridis", labels=dict(x="Time", y="Mel Frequency"))
        fig_spec.update_layout(paper_bgcolor="transparent", plot_bgcolor="transparent", font=dict(color="#9ca3af"))
        st.plotly_chart(fig_spec, use_container_width=True)

# ==============================================================================
# PAGE 4: FEATURE SPACE
# ==============================================================================
elif page == "Feature Space":
    st.markdown("## 🌐 Feature Space & Manifold Topology")
    st.markdown("Unsupervised dimension reduction revealing geometric clustering of 1,000 GTZAN tracks.")
    
    c1, c2 = st.columns(2)
    with c1:
        dim_method = st.selectbox("Dimension Reduction Method", ["PCA", "UMAP", "t-SNE", "Scree Plot"], index=0)
    with c2:
        is_3d = st.checkbox("3D Projection", value=False)
        
    tracks = soundscope_data["tracks"] if soundscope_data else []
    t_df = pd.DataFrame(tracks)
    
    if dim_method == "Scree Plot":
        scree = soundscope_data["scree_plot"]
        s_df = pd.DataFrame(scree)
        fig_s = go.Figure()
        fig_s.add_trace(go.Bar(x=s_df["components"], y=s_df["var_explained_pct"], name="% Variance Explained", marker_color="#6366f1"))
        fig_s.add_trace(go.Scatter(x=s_df["components"], y=s_df["cum_var_pct"], name="Cumulative %", yaxis="y2", line=dict(color="#ec4899", width=2.5)))
        fig_s.update_layout(
            paper_bgcolor="transparent", plot_bgcolor="transparent", font=dict(color="#9ca3af"),
            yaxis=dict(title="% Variance"),
            yaxis2=dict(title="Cumulative %", overlaying="y", side="right", range=[0, 105])
        )
        st.plotly_chart(fig_s, use_container_width=True)
    else:
        if dim_method == "PCA":
            t_df["x"] = [t["pca"]["pc1"] for t in tracks]
            t_df["y"] = [t["pca"]["pc2"] for t in tracks]
            t_df["z"] = [t["pca"]["pc3"] for t in tracks]
        elif dim_method == "t-SNE":
            t_df["x"] = [t["tsne_3d"]["x"] if is_3d else t["tsne_2d"]["x"] for t in tracks]
            t_df["y"] = [t["tsne_3d"]["y"] if is_3d else t["tsne_2d"]["y"] for t in tracks]
            t_df["z"] = [t["tsne_3d"]["z"] for t in tracks]
        else: # UMAP
            t_df["x"] = [t["umap_3d"]["x"] if is_3d else t["umap_2d"]["x"] for t in tracks]
            t_df["y"] = [t["umap_3d"]["y"] if is_3d else t["umap_2d"]["y"] for t in tracks]
            t_df["z"] = [t["umap_3d"]["z"] for t in tracks]
            
        if is_3d:
            fig_proj = px.scatter_3d(t_df, x="x", y="y", z="z", color="genre", color_discrete_map=GENRE_COLORS,
                                     hover_data=["filename", "tempo", "spectral_centroid"], opacity=0.8)
        else:
            fig_proj = px.scatter(t_df, x="x", y="y", color="genre", color_discrete_map=GENRE_COLORS,
                                  hover_data=["filename", "tempo", "spectral_centroid"], opacity=0.8)
                                  
        fig_proj.update_layout(paper_bgcolor="transparent", plot_bgcolor="transparent", font=dict(color="#9ca3af"))
        st.plotly_chart(fig_proj, use_container_width=True)
        
    st.info("💡 **Acoustic Interpretation**: PC1 correlates strongly with high-frequency distortion (Spectral Centroid, Rolloff, ZCR), clearly isolating Metal and Rock from Classical and Country. PC2 aligns with rhythmic pulse and RMS energy.")

# ==============================================================================
# PAGE 5: GENRE COMPARISON
# ==============================================================================
elif page == "Genre Comparison":
    st.markdown("## ⚖️ Genre Comparison")
    st.markdown("Direct multi-genre acoustic contrasts via Radar charts, Parallel Coordinates, and Bivariate scatters.")
    
    genres = ["blues", "classical", "country", "disco", "hiphop", "jazz", "metal", "pop", "reggae", "rock"]
    sel_genres = st.multiselect("Select Genres to Compare", genres, default=["blues", "classical", "metal", "disco"])
    
    if len(sel_genres) >= 2:
        c1, c2 = st.columns(2)
        with c1:
            st.markdown("#### Radar Profile (Normalized)")
            radar_feats = ["chroma_stft_mean", "rms_mean", "spectral_centroid_mean", "spectral_bandwidth_mean", "rolloff_mean", "zero_crossing_rate_mean", "tempo"]
            fig_r = go.Figure()
            for g in sel_genres:
                vals = [soundscope_data["genre_summaries"][g][f]["mean"] for f in radar_feats]
                # min-max normalize
                norm_vals = [(v - min([soundscope_data["genre_summaries"][x][f]["mean"] for x in genres])) / 
                             (max([soundscope_data["genre_summaries"][x][f]["mean"] for x in genres]) - min([soundscope_data["genre_summaries"][x][f]["mean"] for x in genres])) for f, v in zip(radar_feats, vals)]
                fig_r.add_trace(go.Scatterpolar(r=norm_vals + [norm_vals[0]], theta=[f.replace("_mean", "").upper() for f in radar_feats] + [radar_feats[0].replace("_mean", "").upper()], fill="toself", name=g, line=dict(color=GENRE_COLORS.get(g))))
            fig_r.update_layout(paper_bgcolor="transparent", plot_bgcolor="transparent", font=dict(color="#9ca3af"))
            st.plotly_chart(fig_r, use_container_width=True)
            
        with c2:
            st.markdown("#### Bivariate Feature Contrast")
            fx = st.selectbox("Feature X", ["spectral_centroid_mean", "tempo", "rms_mean"], index=0)
            fy = st.selectbox("Feature Y", ["rolloff_mean", "zero_crossing_rate_mean", "rms_mean"], index=0)
            sub_df = df[df["label"].isin(sel_genres)] if df is not None else None
            if sub_df is not None:
                fig_sc = px.scatter(sub_df, x=fx, y=fy, color="label", color_discrete_map=GENRE_COLORS, trendline="ols")
                fig_sc.update_layout(paper_bgcolor="transparent", plot_bgcolor="transparent", font=dict(color="#9ca3af"))
                st.plotly_chart(fig_sc, use_container_width=True)
    else:
        st.warning("Please select at least 2 genres to compare.")

# ==============================================================================
# PAGE 6: MODEL & EXPLAINABILITY
# ==============================================================================
elif page == "Model & Explainability":
    st.markdown("## 🧠 Model Architecture & Grad-CAM Explainability")
    st.markdown("Evaluate Convolutional Neural Network performance, confusion matrix, and visual activation heatmaps.")
    
    if model_metrics:
        m = model_metrics["overall_metrics"]
        c1, c2, c3, c4 = st.columns(4)
        c1.metric("Overall Test Accuracy", f"{m['accuracy']*100:.1f}%")
        c2.metric("Macro Precision", f"{m['macro_precision']:.3f}")
        c3.metric("Macro Recall", f"{m['macro_recall']:.3f}")
        c4.metric("Macro F1-Score", f"{m['macro_f1']:.3f}")
        
        st.markdown("---")
        c_a, c_b = st.columns(2)
        with c_a:
            st.markdown("#### 10×10 Confusion Matrix")
            genres = model_metrics["genres"]
            z_mat = [model_metrics["confusion_matrix"][g] for g in genres]
            fig_cm = px.imshow(z_mat, x=genres, y=genres, color_continuous_scale="Purples", labels=dict(x="Predicted", y="Actual", color="Tracks"))
            fig_cm.update_layout(paper_bgcolor="transparent", plot_bgcolor="transparent", font=dict(color="#9ca3af"))
            st.plotly_chart(fig_cm, use_container_width=True)
            
        with c_b:
            st.markdown("#### Prediction Confidence on Sample Track")
            test_genre = st.selectbox("Inspect Test Genre", genres, index=0)
            sample = model_metrics["sample_predictions"].get(test_genre, {})
            probs = sample.get("probabilities", {})
            p_df = pd.DataFrame(list(probs.items()), columns=["genre", "probability"])
            fig_p = px.bar(p_df, x="genre", y="probability", color="genre", color_discrete_map=GENRE_COLORS)
            fig_p.update_layout(paper_bgcolor="transparent", plot_bgcolor="transparent", font=dict(color="#9ca3af"), showlegend=False)
            st.plotly_chart(fig_p, use_container_width=True)
            
        st.markdown("#### Grad-CAM Mel-Spectrogram Visual Explainability")
        cam_genre = st.selectbox("Select Genre to Inspect Activation Maps", genres, index=0)
        cam_info = model_metrics["gradcam"].get(cam_genre, {})
        
        spec_mat = np.array(cam_info.get("mel_spectrogram", []))
        cam_mat = np.array(cam_info.get("gradcam_heatmap", []))
        
        col_s1, col_s2 = st.columns(2)
        with col_s1:
            st.markdown("**1. Mel-Spectrogram Input**")
            fig_spec = px.imshow(spec_mat, origin="lower", color_continuous_scale="Viridis")
            fig_spec.update_layout(paper_bgcolor="transparent", plot_bgcolor="transparent", font=dict(color="#9ca3af"))
            st.plotly_chart(fig_spec, use_container_width=True)
        with col_s2:
            st.markdown("**2. Grad-CAM Activation Heatmap**")
            fig_cam = px.imshow(cam_mat, origin="lower", color_continuous_scale="Jet")
            fig_cam.update_layout(paper_bgcolor="transparent", plot_bgcolor="transparent", font=dict(color="#9ca3af"))
            st.plotly_chart(fig_cam, use_container_width=True)
            
        st.info(f"**Acoustic Decision Rationale**: {cam_info.get('explanation', '')}")
    else:
        st.warning("Model results are not available yet.")
