from io import BytesIO

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from PIL import Image, UnidentifiedImageError

from services.image_service import convert_to_grayscale
from services.colorization_service import colorize_image

app = FastAPI(title="Image Converter API", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}


@app.get("/")
def home():
    return {"message": "Image Converter API is running", "features": ["grayscale", "colorization"]}


async def read_valid_image(file: UploadFile) -> bytes:
    """Validate upload type, size, and image integrity before processing."""
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=415,
            detail="Only JPEG, PNG, and WEBP images are supported.",
        )

    contents = await file.read(MAX_FILE_SIZE + 1)
    if not contents:
        raise HTTPException(status_code=400, detail="Empty file.")
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="Image must be 10 MB or smaller.")

    try:
        with Image.open(BytesIO(contents)) as uploaded_image:
            if uploaded_image.format not in ALLOWED_FORMATS:
                raise HTTPException(status_code=415, detail="Unsupported image format.")
            uploaded_image.verify()
    except HTTPException:
        raise
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise HTTPException(status_code=400, detail="Invalid or corrupted image.") from exc

    return contents


@app.post("/convert-to-grayscale")
async def convert_to_grayscale_api(file: UploadFile = File(...)):
    contents = await read_valid_image(file)
    try:
        converted_image = convert_to_grayscale(contents)
    except (ValueError, OSError) as exc:
        raise HTTPException(status_code=400, detail="Invalid or corrupted image.") from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail="An unexpected server error occurred.") from exc
    return Response(content=converted_image, media_type="image/png")


@app.post("/colorize")
async def colorize_api(file: UploadFile = File(...)):
    """Colorize a grayscale or black-and-white image using the pretrained AI model."""
    contents = await read_valid_image(file)
    try:
        converted_image = colorize_image(contents)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except (ValueError, OSError) as exc:
        raise HTTPException(status_code=400, detail="Invalid image or colorization failed.") from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="AI colorization failed. Check that model files are valid and OpenCV DNN is supported.",
        ) from exc
    return Response(content=converted_image, media_type="image/png")
