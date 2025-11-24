from ultralytics import YOLO
import cv2
import numpy as np
import matplotlib.pyplot as plt
import time
import os

# Import our modules
from Physio_score import PhysioScore
from Fatigue_calc import FatigueCalculator

# Load your custom model
model_path = 'Model/best (5).pt'  
model = YOLO(model_path)
print("Model loaded successfully!")

def extract_detections(results):
    """Extract detections from YOLO results"""
    eye_closed = False
    yawning = False
    droopy_eyelids = False
    droopy_face = False
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
            elif class_name == 'dropping eye lids' and conf > 0.3:
                droopy_eyelids = True
            elif class_name == 'dropping face' and conf > 0.3:
                droopy_face = True
    
    return eye_closed, yawning, droopy_eyelids, droopy_face, detected_classes

def live_monitoring():
    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    
    physio = PhysioScore()
    fatigue_calc = FatigueCalculator()
    
    # Matplotlib setup with better layout
    plt.ion()
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 6))
    
    # Camera feed
    img_display = ax1.imshow(np.zeros((480, 640, 3), dtype=np.uint8))
    ax1.axis('off')
    ax1.set_title('Live Camera Feed', fontsize=14, weight='bold')
    
    # Fatigue analysis panel - CLEAN LAYOUT
    ax2.axis('off')
    ax2.set_title('Fatigue Analysis', fontsize=16, weight='bold', pad=20)
    
    # Create separate text elements for different sections
    status_text = ax2.text(0.05, 0.85, "", transform=ax2.transAxes, fontsize=14, 
                          verticalalignment='top', fontfamily='monospace', weight='bold')
    
    vision_text = ax2.text(0.05, 0.65, "", transform=ax2.transAxes, fontsize=10,
                          verticalalignment='top', fontfamily='monospace')
    
    other_text = ax2.text(0.05, 0.35, "", transform=ax2.transAxes, fontsize=10,
                         verticalalignment='top', fontfamily='monospace')
    
    frame_text = ax2.text(0.05, 0.15, "", transform=ax2.transAxes, fontsize=9,
                         verticalalignment='top', fontfamily='monospace', style='italic')
    
    # Alert message (centered and prominent)
    alert_text = ax2.text(0.5, 0.92, "", transform=ax2.transAxes, fontsize=13, 
                         weight='bold', ha='center', va='top', wrap=True)
    
    try:
        frame_count = 0
        while plt.fignum_exists(fig.number):
            ret, frame = cap.read()
            if not ret:
                break
            
            # Run YOLO inference
            results = model(frame, conf=0.4)
            annotated_frame = results[0].plot()
            
            # Extract detections
            eye_closed, yawning, droopy_eyelids, droopy_face, detected_classes = extract_detections(results)
            
            # Update physiological scores
            physio.update_vision_metrics(eye_closed, yawning, droopy_eyelids, droopy_face)
            physio_scores = physio.get_physio_scores()
            
            # Calculate fatigue level
            level, score, alert_msg = fatigue_calc.calculate_fatigue_level(physio_scores, frame_count)

            # Update display
            rgb_frame = cv2.cvtColor(annotated_frame, cv2.COLOR_BGR2RGB)
            img_display.set_data(rgb_frame)
            
            # SPLIT TEXT INTO MULTIPLE SECTIONS - NO OVERLAP
            status_str = f"FATIGUE LEVEL: {level}\nSCORE: {score}/100"
            status_text.set_text(status_str)
            
            vision_str = f"""VISION FACTORS:
PERCLOS: {physio_scores['perclos']:.3f}
FOM: {physio_scores['fom']:.3f}
Droopy Eyelids: {physio_scores['droopy_eyelids_frequency']:.3f}
Eye Closure: {physio_scores['continuous_closure_sec']:.1f}s"""
            vision_text.set_text(vision_str)
            
            other_str = f"""OTHER FACTORS:
Reaction Time: 0.85
Voice Patterns: 0.90
History: 0.80
Sleep: 6.5 hours
Alerts: {fatigue_calc.previous_alerts_count}"""
            other_text.set_text(other_str)
            
            frame_str = f"Frame: {frame_count}"
            frame_text.set_text(frame_str)
            
            # Alert message (shorter to prevent overlap)
            short_alert = alert_msg
            if len(alert_msg) > 50:
                short_alert = alert_msg[:47] + "..."
            alert_text.set_text(short_alert)
            
            # Update alert colors
            if level == "HIGH FATIGUE":
                alert_text.set_color('red')
                ax2.set_facecolor('#FFE6E6')
                status_text.set_color('red')
            elif level == "EARLY FATIGUE":
                alert_text.set_color('orange')
                ax2.set_facecolor('#FFF4E6')
                status_text.set_color('orange')
            else:
                alert_text.set_color('green')
                ax2.set_facecolor('#E6FFE6')
                status_text.set_color('green')
            
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

if __name__ == "__main__":
    live_monitoring()