import cv2

image = cv2.imread("images/input.jpeg")

gray_image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

cv2.imwrite("images/output.jpg", gray_image)

print("Image converted to grayscale successfully!")