# # # from ultralytics import YOLO

# # # # Load a custom YOLOv8 model from a specified path
# # # model = YOLO('C:/Users/Asus/OneDrive/Documents/Fikrathon/Models/best.pt')

# # # # Perform inference on an image
# # # results = model(source=0, show=True, conf=0.4, save=True)


from ultralytics import YOLO
import cv2
import numpy as np
import matplotlib.pyplot as plt
import time
import os

# Load the model with correct path
model_path = 'Model/best (1).pt'
print(f"Loading model from: {model_path}")

if not os.path.exists(model_path):
    print("Error: Model file not found!")
    exit(1)

model = YOLO(model_path)
print("Model loaded successfully!")
print(f"Classes: {model.names}")

# Initialize webcam
cap = cv2.VideoCapture(0)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

print("Starting live webcam inference... Press 'q' to stop or close the window")

# Set up matplotlib for live display
plt.ion()
fig, ax = plt.subplots(figsize=(12, 8))
img_display = ax.imshow(np.zeros((480, 640, 3), dtype=np.uint8))
ax.axis('off')
ax.set_title('Live Drowsiness Detection - Close window to stop')

try:
    frame_count = 0
    while plt.fignum_exists(fig.number):  # Run as long as the window is open
        ret, frame = cap.read()
        if not ret:
            print("Failed to grab frame")
            break
        
        # Run inference
        results = model(frame, conf=0.4)
        
        # Get annotated frame with bounding boxes
        annotated_frame = results[0].plot()
        
        # Convert BGR to RGB for matplotlib
        rgb_frame = cv2.cvtColor(annotated_frame, cv2.COLOR_BGR2RGB)
        
        # Update the display
        img_display.set_data(rgb_frame)
        fig.canvas.draw()
        fig.canvas.flush_events()
        
        frame_count += 1
        if frame_count % 30 == 0:  # Print every 30 frames
            print(f"Processed {frame_count} frames...")
        
        # Control frame rate
        time.sleep(0.03)  # ~30 FPS
        
except KeyboardInterrupt:
    print("\nStopped by user (Ctrl+C)")
except Exception as e:
    print(f"Error: {e}")
finally:
    # Cleanup
    plt.ioff()
    cap.release()
    plt.close()
    print("Webcam released and display closed")