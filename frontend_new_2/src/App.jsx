import { useEffect, useState } from 'react';
import './App.css';

const API_URL = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const gradeDefaults = { brightness: 100, contrast: 100, saturation: 100, warmth: 0 };
const gradePresets = [
  { label: 'Original', values: gradeDefaults },
  { label: 'Cinematic', values: { brightness: 88, contrast: 122, saturation: 88, warmth: 8 } },
  { label: 'Bright', values: { brightness: 118, contrast: 108, saturation: 112, warmth: 0 } },
  { label: 'Warm', values: { brightness: 105, contrast: 105, saturation: 112, warmth: 28 } },
  { label: 'Vivid', values: { brightness: 105, contrast: 116, saturation: 150, warmth: 0 } },
  { label: 'Matte', values: { brightness: 108, contrast: 82, saturation: 82, warmth: 12 } },
];

const navItems = [
  { label: 'Overview', path: '/' },
  { label: 'Grayscale', path: '/studio/grayscale' },
  { label: 'AI Colorize', path: '/studio/colorize' },
  { label: 'How it works', path: '/how-it-works' },
  { label: 'About', path: '/about' },
];

function App() {
  const [path, setPath] = useState(window.location.pathname);
  const [mode, setMode] = useState(path.includes('colorize') ? 'colorize' : 'grayscale');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [result, setResult] = useState('');
  const [grading, setGrading] = useState(gradeDefaults);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pixelforge-history') || '[]'); } catch { return []; }
  });

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    const next = path.includes('colorize') ? 'colorize' : 'grayscale';
    setMode(next);
  }, [path]);

  useEffect(() => {
    localStorage.setItem('pixelforge-history', JSON.stringify(history.slice(0, 12)));
  }, [history]);

  function navigate(next) {
    if (next !== path) window.history.pushState({}, '', next);
    setPath(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setError('');
  }

  function clearImage() {
    if (preview) URL.revokeObjectURL(preview);
    if (result) URL.revokeObjectURL(result);
    setFile(null); setPreview(''); setResult(''); setError('');
    setGrading(gradeDefaults);
  }

  function handleFile(selected) {
    if (!selected) return;
    if (!selected.type.startsWith('image/')) return setError('Please choose a valid image file.');
    if (selected.size > 10 * 1024 * 1024) return setError('Please choose an image that is 10 MB or smaller.');
    if (preview) URL.revokeObjectURL(preview);
    if (result) URL.revokeObjectURL(result);
    setFile(selected); setPreview(URL.createObjectURL(selected)); setResult(''); setError('');
    setGrading(gradeDefaults);
  }

  async function processImage() {
    if (!file) return setError('Upload an image before starting.');
    const body = new FormData(); body.append('file', file);
    setLoading(true); setError(''); setResult('');
    setGrading(gradeDefaults);
    try {
      const endpoint = mode === 'grayscale' ? '/convert-to-grayscale' : '/colorize';
      const response = await fetch(`${API_URL}${endpoint}`, { method: 'POST', body });
      if (!response.ok) {
        let message = 'Something went wrong while processing your image.';
        try { message = (await response.json()).detail || message; } catch { /* response was not JSON */ }
        throw new Error(message);
      }
      const url = URL.createObjectURL(await response.blob());
      setResult(url);
      setHistory(old => [{ id: Date.now(), name: file.name, mode, date: new Date().toLocaleString(), size: file.size }, ...old].slice(0, 12));
    } catch (err) {
      setError(err.message === 'Failed to fetch' ? 'Could not reach FastAPI. Start the backend and try again.' : err.message);
    } finally { setLoading(false); }
  }

  const filterStyle = `brightness(${grading.brightness}%) contrast(${grading.contrast}%) saturate(${grading.saturation}%) sepia(${grading.warmth}%)`;

  async function downloadGradedImage() {
    if (!result) return;
    try {
      const image = new Image();
      image.src = result;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.filter = `brightness(${grading.brightness}%) contrast(${grading.contrast}%) saturate(${grading.saturation}%) sepia(${grading.warmth}%)`;
      ctx.drawImage(image, 0, 0);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Could not export this image.');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = downloadName; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (err) { setError(err.message || 'Could not download the graded image.'); }
  }

  const page = path === '/' ? 'home' : path.startsWith('/studio') ? 'studio' : path === '/how-it-works' ? 'guide' : path === '/history' ? 'history' : 'about';
  const activeMode = mode === 'grayscale';
  const downloadName = `${mode}-${file?.name.replace(/\.[^.]+$/, '') || 'image'}.png`;

  return <div className="site-shell">
    <header className="topbar">
      <button className="brand" onClick={() => navigate('/')} aria-label="PixelForge home"><span className="brand-mark">P</span><span>pixel<span className="brand-light">forge</span></span></button>
      <nav className="main-nav" aria-label="Main navigation">
        {navItems.map(item => <button key={item.path} className={path === item.path || (item.path.startsWith('/studio') && path === item.path) ? 'nav-link active' : 'nav-link'} onClick={() => navigate(item.path)}>{item.label}</button>)}
      </nav>
      <button className="top-cta" onClick={() => navigate('/studio/grayscale')}>Open studio <span>↗</span></button>
    </header>

    {page === 'home' && <>
      <main>
        <section className="hero home-hero">
          <div className="hero-copy"><div className="eyebrow"><span className="eyebrow-line"/> CREATIVE IMAGE LAB <span className="eyebrow-line"/></div>
            <h1>Give every image<br/>a <em>new perspective.</em></h1>
            <p className="hero-description">A simple space to transform your photographs. Strip color back to its essentials or bring timeless black-and-white moments to life with AI.</p>
            <div className="hero-actions"><button className="primary-btn" onClick={() => navigate('/studio/grayscale')}>Start creating <span>→</span></button><button className="text-btn" onClick={() => navigate('/how-it-works')}>See how it works <span>↗</span></button></div>
            <div className="hero-proof"><span className="proof-icon">✳</span><span>Two transformations. One creative studio.</span><span className="proof-separator"/> <span>JPEG · PNG · WEBP</span></div>
          </div>
          <div className="hero-art"><div className="art-glow"/><div className="art-frame art-back"><img src="/images/golden-retriever-tongue-out.jpg" alt="Color photograph example"/></div><div className="art-frame art-front"><img src="/images/golden-retriever-tongue-out.jpg" alt="Black and white photograph example"/></div><div className="art-caption"><span className="caption-dot"/> COLOR / MONOCHROME <span>01 — 02</span></div><div className="floating-stamp">MAKE<br/>IT<br/><b>YOUR</b><br/>OWN</div></div>
        </section>
        <section className="feature-section"><div className="section-heading"><div><div className="eyebrow left">THE TOOLKIT</div><h2>One studio. <em>Two ways to create.</em></h2></div><p>Choose a direction and let PixelForge handle the pixels.</p></div>
          <div className="feature-grid">
            <article className="feature-card grayscale-card"><div className="feature-top"><span>01 / TONE</span><span>↗</span></div><div className="feature-visual mono-visual"><div className="visual-sun"/><div className="visual-hill hill-one"/><div className="visual-hill hill-two"/></div><div className="feature-content"><h3>Grayscale conversion</h3><p>Find the shape, texture and emotion in every frame. Convert color images into clean monochrome.</p><button className="card-link" onClick={() => navigate('/studio/grayscale')}>Explore grayscale <span>→</span></button></div></article>
            <article className="feature-card color-card"><div className="feature-top"><span>02 / COLOR</span><span>↗</span></div><div className="feature-visual color-visual"><div className="color-orb orb-one"/><div className="color-orb orb-two"/><div className="color-orb orb-three"/><div className="color-wave"/></div><div className="feature-content"><h3>AI photo colorization</h3><p>Reimagine old memories. Our pretrained colorization model estimates natural-looking colors.</p><button className="card-link" onClick={() => navigate('/studio/colorize')}>Explore AI colorize <span>→</span></button></div></article>
          </div>
        </section>
        <section className="bottom-banner"><div><div className="eyebrow left">READY WHEN YOU ARE</div><h2>Your next transformation<br/><em>starts with one image.</em></h2></div><button className="primary-btn" onClick={() => navigate('/studio/grayscale')}>Enter the studio <span>→</span></button></section>
      </main>
    </>}

    {page === 'studio' && <main className="inner-page studio-page">
      <div className="page-intro"><div><div className="eyebrow left">PIXELFORGE / STUDIO</div><h1>Make the image <em> yours.</em></h1><p>Upload a photo, choose a transformation, and preview your result.</p></div><div className="api-pill"><span/> LOCAL API WORKSPACE</div></div>
      <div className="studio-tabs"><button className={activeMode ? 'studio-tab selected' : 'studio-tab'} onClick={() => { setMode('grayscale'); navigate('/studio/grayscale'); }}><span>◐</span> Grayscale</button><button className={!activeMode ? 'studio-tab selected' : 'studio-tab'} onClick={() => { setMode('colorize'); navigate('/studio/colorize'); }}><span>✳</span> AI Colorize</button></div>
      <div className="studio-layout"><section className="studio-panel upload-panel"><div className="panel-title"><div><span className="micro-label">STEP 01</span><h2>{activeMode ? 'Remove the color.' : 'Bring color back.'}</h2><p>{activeMode ? 'Turn your photograph into timeless monochrome.' : 'Let AI estimate colors for your black-and-white photo.'}</p></div><span className="panel-number">01</span></div>
        <label className={`upload-zone ${file ? 'has-file' : ''}`} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]); }}><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => handleFile(e.target.files?.[0])}/>{preview ? <img className="upload-preview" src={preview} alt="Selected upload preview"/> : <><span className="upload-symbol">↑</span><strong>Drop your image here</strong><span>or <u>browse files</u> from your device</span><small>JPEG, PNG or WEBP · UP TO 10 MB</small></>}</label>
        {file && <div className="selected-file"><span className="file-type">IMG</span><div><strong>{file.name}</strong><small>{(file.size / 1024).toFixed(0)} KB · Ready to process</small></div><button onClick={clearImage} aria-label="Remove image">×</button></div>}
        <button className="primary-btn process-btn" disabled={!file || loading} onClick={processImage}>{loading ? <><span className="spinner"/> Processing image…</> : <>{activeMode ? 'Convert to grayscale' : 'Colorize with AI'} <span>→</span></>}</button>
        <p className="privacy-hint"><span>♢</span> Images are sent to your local FastAPI server for processing.</p>
      </section>
      <section className="studio-panel result-panel"><div className="panel-title"><div><span className="micro-label">STEP 02</span><h2>Before & after.</h2><p>Your transformation will appear here.</p></div><span className="panel-number">02</span></div>
        <div className="result-grid"><div className="result-tile"><div className="tile-label">ORIGINAL <span>01</span></div>{preview ? <img src={preview} alt="Original image"/> : <div className="result-empty"><span>▧</span><small>Original image preview</small></div>}</div><div className="result-tile"><div className="tile-label">{activeMode ? 'GRAYSCALE' : 'AI COLORIZED'} <span>02</span></div>{result ? <img src={result} style={{ filter: filterStyle }} alt="Processed result"/> : <div className="result-empty"><span>✳</span><small>Processed result preview</small></div>}</div></div>
        {error && <div className="error-box" role="alert">{error}</div>}{result && <><div className="grading-panel"><div className="grading-heading"><div><span className="micro-label">STEP 03 · COLOR GRADING</span><h3>Set the mood of your image.</h3><p>Darken, lighten, tune contrast and color before exporting.</p></div><button className="reset-grade" onClick={() => setGrading(gradeDefaults)}>↺ Reset all</button></div>
          <div className="grade-presets" aria-label="Color grading presets">{gradePresets.map(preset => <button key={preset.label} className={JSON.stringify(grading) === JSON.stringify(preset.values) ? 'preset-chip active' : 'preset-chip'} onClick={() => setGrading(preset.values)}>{preset.label}</button>)}</div><div className="grading-controls">{[{ key: 'brightness', label: 'Brightness', min: 30, max: 170, unit: '%', value: grading.brightness }, { key: 'contrast', label: 'Contrast', min: 50, max: 160, unit: '%', value: grading.contrast }, { key: 'saturation', label: 'Saturation', min: 0, max: 200, unit: '%', value: grading.saturation }, { key: 'warmth', label: 'Warmth', min: 0, max: 100, unit: '%', value: grading.warmth }].map(control => <label className="grade-control" key={control.key}><span><strong>{control.label}</strong><output>{control.value}{control.unit}</output></span><input type="range" min={control.min} max={control.max} value={control.value} onChange={e => setGrading(old => ({ ...old, [control.key]: Number(e.target.value) }))}/><small>{control.key === 'brightness' ? 'Darker' : control.key === 'contrast' ? 'Soft' : control.key === 'saturation' ? 'Muted' : 'Neutral'} <span>{control.key === 'brightness' ? 'Lighter' : control.key === 'contrast' ? 'Punchy' : control.key === 'saturation' ? 'Vivid' : 'Warmer'}</span></small></label>)}</div><div className="brightness-quick"><span>Quick light adjustment</span><div><button onClick={() => setGrading(old => ({ ...old, brightness: Math.max(30, old.brightness - 15) }))}>− Darken</button><button onClick={() => setGrading(old => ({ ...old, brightness: Math.min(170, old.brightness + 15) }))}>+ Lighten</button></div></div></div><div className="success-row"><span><i/> Graded image ready to export</span><button className="download-btn" onClick={downloadGradedImage}>↓ Download graded PNG</button></div></>}
        {!result && !error && <div className="result-footnote"><span>✦</span> {activeMode ? 'A clean grayscale version, preserving the details of your original.' : 'AI-generated colors are estimates, not a recovery of the exact original colors.'}</div>}
      </section></div>
      <div className="studio-note"><span>TIP / 01</span> For best results, use a clear image with good lighting and visible details.</div>
    </main>}

    {page === 'guide' && <main className="inner-page guide-page"><div className="eyebrow left">A LITTLE LESS MYSTERY</div><h1>From upload to <em>transformation.</em></h1><p className="page-lead">A straightforward workflow, powered by a lightweight React interface and your local Python API.</p><div className="steps-grid"><article><span>01</span><div className="step-art upload-art">↑</div><h2>Choose an image</h2><p>Upload a JPEG, PNG or WEBP image up to 10 MB. Your original stays available for comparison.</p></article><article><span>02</span><div className="step-art process-art">✳</div><h2>Pick your process</h2><p>Choose grayscale conversion or AI colorization. PixelForge sends the image to the matching FastAPI endpoint.</p></article><article><span>03</span><div className="step-art result-art">↓</div><h2>Preview & download</h2><p>See the processed image beside your original, then download the result as a PNG.</p></article></div><div className="tech-strip"><div><span className="micro-label">UNDER THE HOOD</span><h2>Built with practical tools.</h2></div><div className="tech-tags"><span>React</span><span>Vite</span><span>FastAPI</span><span>Python</span><span>OpenCV</span><span>Caffe colorization model</span></div></div></main>}

    {page === 'about' && <main className="inner-page about-page"><div className="eyebrow left">ABOUT PIXELFORGE</div><h1>Thoughtful tools for<br/><em>everyday creativity.</em></h1><p className="page-lead">PixelForge is an image transformation project built to make two useful photo workflows accessible in one clean workspace.</p><div className="about-card"><div className="about-mark">P</div><div><span className="micro-label">THE IDEA</span><h2>Keep it simple. Make it useful.</h2><p>Convert color images to grayscale using image processing, or colorize black-and-white photographs using a pretrained deep learning model. The frontend is designed around clear steps, immediate previews and easy downloads.</p></div></div><div className="about-disclaimer"><strong>A note on AI colorization</strong><p>The model predicts plausible colors based on learned visual patterns. It cannot know the exact historical colors of an image, so results should be treated as artistic estimates.</p></div></main>}

    {page === 'history' && <main className="inner-page history-page"><div className="eyebrow left">YOUR RECENT WORK</div><h1>Transformation <em>history.</em></h1><p className="page-lead">Recent results are kept in this browser for quick reference.</p>{history.length ? <div className="history-list">{history.map(item => <div className="history-item" key={item.id}><div className="history-thumb">IMG</div><div className="history-meta"><strong>{item.name}</strong><span>{item.mode === 'grayscale' ? 'Grayscale conversion' : 'AI colorization'} · {item.date}</span></div><span className="history-status">DONE</span></div>)}</div> : <div className="history-empty"><span>◷</span><h2>No transformations yet</h2><p>Your recent work will show up here after you process an image.</p><button className="primary-btn" onClick={() => navigate('/studio/grayscale')}>Open studio <span>→</span></button></div>}</main>}

    <footer className="site-footer"><button className="footer-brand" onClick={() => navigate('/')}>P<span>ixelForge</span></button><span>IMAGE TRANSFORMATION STUDIO</span><div><button onClick={() => navigate('/how-it-works')}>How it works</button><button onClick={() => navigate('/about')}>About</button><button onClick={() => navigate('/history')}>History</button></div><small>© 2026 PIXELFORGE</small></footer>
  </div>;
}

export default App;
