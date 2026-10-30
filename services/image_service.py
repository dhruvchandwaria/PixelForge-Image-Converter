import cv2
import numpy as np


def convert_to_grayscale(image_bytes: bytes) -> bytes:
    image_array = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

    if image is None:
        raise ValueError("Invalid image file")

    gray_image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    success, encoded_image = cv2.imencode(".png", gray_image)

    if not success:
        raise ValueError("Image conversion failed")

    return encoded_image.tobytes()