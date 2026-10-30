"""Pretrained OpenCV DNN image colorization service.

Uses the Colorful Image Colorization model by Zhang, Isola and Efros.
Model weights are downloaded separately with download_colorization_model.py.
"""
from __future__ import annotations

import threading
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
MODEL_DIR = ROOT / "models"
PROTO_PATH = MODEL_DIR / "colorization_deploy_v2.prototxt"
WEIGHTS_PATH = MODEL_DIR / "colorization_release_v2.caffemodel"
POINTS_PATH = MODEL_DIR / "pts_in_hull.npy"

_net = None
_net_lock = threading.Lock()


def _load_model():
    """Load and initialize the pretrained network once per process."""
    global _net
    if _net is not None:
        return _net

    missing = [str(p) for p in (PROTO_PATH, WEIGHTS_PATH, POINTS_PATH) if not p.is_file()]
    if missing:
        raise FileNotFoundError(
            "AI colorization model files are missing. Run "
            "'python download_colorization_model.py' from the project root. "
            "Missing: " + ", ".join(missing)
        )

    net = cv2.dnn.readNetFromCaffe(str(PROTO_PATH), str(WEIGHTS_PATH))
    points = np.load(str(POINTS_PATH)).astype(np.float32)
    if points.shape != (313, 2):
        raise ValueError(f"Unexpected color-bin file shape: {points.shape}; expected (313, 2).")

    # Configure the model's 313-bin annealed-mean decoder.
    net.getLayer(net.getLayerId("class8_ab")).blobs = [
        points.transpose().reshape(2, 313, 1, 1)
    ]
    net.getLayer(net.getLayerId("conv8_313_rh")).blobs = [
        np.full((1, 313), 2.606, dtype=np.float32)
    ]
    _net = net
    return _net


def colorize_image(image_bytes: bytes) -> bytes:
    """Colorize image bytes and return a PNG byte string."""
    image_array = np.frombuffer(image_bytes, dtype=np.uint8)
    image_bgr = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
    if image_bgr is None:
        raise ValueError("Invalid image file")

    height, width = image_bgr.shape[:2]
    if height < 2 or width < 2:
        raise ValueError("Image dimensions must be at least 2 × 2 pixels.")

    # The model predicts plausible colors; it cannot recover historically exact colors.
    image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
    image_lab = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2LAB)
    lightness = image_lab[:, :, 0]
    lightness_small = cv2.resize(lightness, (224, 224), interpolation=cv2.INTER_AREA)
    network_input = lightness_small.astype(np.float32) - 50.0

    # OpenCV's DNN Net object is not safe for concurrent setInput/forward calls.
    with _net_lock:
        net = _load_model()
        net.setInput(cv2.dnn.blobFromImage(network_input))
        predicted_ab = net.forward()[0].transpose((1, 2, 0))

    predicted_ab = cv2.resize(predicted_ab, (width, height), interpolation=cv2.INTER_CUBIC)
    output_lab = np.concatenate((lightness[:, :, np.newaxis], predicted_ab), axis=2)
    output_rgb = np.clip(cv2.cvtColor(output_lab, cv2.COLOR_LAB2RGB), 0.0, 1.0)
    output_bgr = cv2.cvtColor((output_rgb * 255.0).round().astype(np.uint8), cv2.COLOR_RGB2BGR)

    success, encoded = cv2.imencode(".png", output_bgr)
    if not success:
        raise ValueError("AI colorization could not encode the result.")
    return encoded.tobytes()
