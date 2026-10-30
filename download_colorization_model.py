
"""Download pretrained OpenCV image-colorization model files."""

from pathlib import Path
from urllib.request import Request, urlopen
import shutil

MODEL_DIR = Path(__file__).resolve().parent / "models"
MODEL_DIR.mkdir(parents=True, exist_ok=True)

FILES = {
    "colorization_deploy_v2.prototxt": (
        "https://mirror.opencv.ai/colorization_release_v2.caffemodel"
        "colorization/models/colorization_deploy_v2.prototxt",
        9000,
    ),
    "colorization_release_v2.caffemodel": (
        "https://mirror.opencv.ai/colorization_release_v2.caffemodel",
        50_000_000,
    ),
    "pts_in_hull.npy": (
        "https://raw.githubusercontent.com/richzhang/colorization/caffe/"
        "colorization/resources/pts_in_hull.npy",
        1_000,
    ),
}


def download(filename, url, minimum_size):
    destination = MODEL_DIR / filename
    temporary = destination.with_suffix(destination.suffix + ".part")

    if destination.exists() and destination.stat().st_size >= minimum_size:
        print(f"Already present: {filename} ({destination.stat().st_size:,} bytes)")
        return

    print(f"Downloading {filename} ...")
    request = Request(
        url,
        headers={"User-Agent": "Mozilla/5.0"},
    )

    try:
        with urlopen(request, timeout=60) as response:
            with temporary.open("wb") as output:
                shutil.copyfileobj(response, output)

        size = temporary.stat().st_size
        if size < minimum_size:
            raise RuntimeError(
                f"Downloaded file is too small ({size:,} bytes)."
            )

        temporary.replace(destination)
        print(f"Saved {filename} ({size:,} bytes)")

    except Exception:
        temporary.unlink(missing_ok=True)
        raise


if __name__ == "__main__":
    for filename, (url, minimum_size) in FILES.items():
        try:
            download(filename, url, minimum_size)
        except Exception as error:
            print(f"\nFailed to download {filename}: {error}")
            print("No valid model file was installed for this download.")
            raise SystemExit(1)

    print("\nAll model files downloaded. You can now test colorization.")
