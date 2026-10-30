# PixelForge Color Grading

The Studio now includes post-processing controls that work on the processed output from either Grayscale or AI Colorize.

## Controls
- Brightness: darken or lighten the output (30%–170%).
- Contrast: soften or strengthen tonal contrast (50%–160%).
- Saturation: mute or intensify colors (0%–200%).
- Warmth: apply a warmer sepia tone (0%–100%).
- Presets: Original, Cinematic, Bright, Warm, Vivid, and Matte.
- Quick actions: Darken and Lighten in 15-point increments.
- Reset all: restore neutral grading values.

The preview uses the selected grading values immediately. **Download graded PNG** renders those same values onto a canvas and exports the adjusted pixels, so the downloaded file includes the grading rather than only the preview styling.

## Install / run
From the frontend directory:

```powershell
npm install
npm run dev
```

To create a production build:

```powershell
npm run build
```

The feature is frontend post-processing; it does not require changes to the FastAPI endpoints or the AI colorization model.
