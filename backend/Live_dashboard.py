from ultralytics import YOLO
import cv2
import numpy as np
import matplotlib.pyplot as plt
import time
import os
from collections import deque

from backend.Fatigue_calc import FatigueCalculator

# This becomes much simpler - just display the results
def update_display(level, score, metrics):
    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    
    fatigue_calc = FatigueCalculator()
    
    # Matplotlib setup for popup window
    plt.ion()
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 6))
    
    # Left: Camera feed
    img_display = ax1.imshow(np.zeros((480, 640, 3), dtype=np.uint8))
    ax1.axis('off')
    ax1.set_title('Live Camera Feed')
    
    # Right: Fatigue metrics
    ax2.axis('off')
    ax2.set_title('Fatigue Analysis', fontsize=16, weight='bold')
    
    # Text elements for metrics
    metrics_text = ax2.text(0.1, 0.9, "", transform=ax2.transAxes, fontsize=12, 
                           verticalalignment='top', fontfamily='monospace')
    alert_text = ax2.text(0.5, 0.5, "", transform=ax2.transAxes, fontsize=16, 
                         weight='bold', ha='center', color='green')
    
    try:
        frame_count = 0
        while plt.fignum_exists(fig.number):
            ret, frame = cap.read()
            if not ret:
                break
            
            # Run YOLO inference
            results = model(frame, conf=0.4)
            annotated_frame = results[0].plot()
            
            # Extract detections for fatigue calculation
            eye_closed = False
            yawning = False
            detected_classes = []

            if results[0].boxes is not None:
                classes = results[0].boxes.cls.cpu().numpy()
                confidences = results[0].boxes.conf.cpu().numpy()
                detected_classes = [results[0].names[int(cls)] for cls in classes]
                
                for cls, conf in zip(classes, confidences):
                    class_name = results[0].names[int(cls)]
                    
                    if class_name == 'Eyes_closed' and conf > 0.4:
                        eye_closed = True
                    elif class_name == 'Yawning' and conf > 0.4:
                        yawning = True
            
            # Update fatigue metrics with detected classes for debugging
            fatigue_calc.update_metrics(eye_closed, yawning, detected_classes)
            level, score, alert_msg = fatigue_calc.calculate_fatigue_level()
            
            # Update display
            rgb_frame = cv2.cvtColor(annotated_frame, cv2.COLOR_BGR2RGB)
            img_display.set_data(rgb_frame)
            
            # Update metrics text
            metrics_str = f"""
FATIGUE LEVEL: {level}
SCORE: {score}/100
PERCLOS: {fatigue_calc.calculate_perclos():.3f}
FOM: {fatigue_calc.calculate_fom():.3f}
Continuous Eye Closure: {fatigue_calc.get_continuous_eye_closure():.1f}s
Frame: {frame_count}
            """
            metrics_text.set_text(metrics_str)
            
            # Update alert with color coding
            if level == "VERY TIRED":
                alert_text.set_text("🚨 " + alert_msg)
                alert_text.set_color('red')
                ax2.set_facecolor('#FFE6E6')  # Light red background
            elif level == "GETTING TIRED":
                alert_text.set_text("⚠️ " + alert_msg)
                alert_text.set_color('orange')
                ax2.set_facecolor('#FFF4E6')  # Light orange background
            else:
                alert_text.set_text("✅ " + alert_msg)
                alert_text.set_color('green')
                ax2.set_facecolor('#E6FFE6')  # Light green background
            
            fig.canvas.draw()
            fig.canvas.flush_events()
            
            frame_count += 1
            time.sleep(0.03)
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        plt.ioff()
        cap.release()
        plt.close()
        print("Monitoring stopped")
    pass