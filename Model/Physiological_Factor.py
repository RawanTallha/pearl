from ultralytics import YOLO
import cv2
import numpy as np
import matplotlib.pyplot as plt
import time
import os
from collections import deque

# Load your custom model
model_path = 'Model/best (5).pt'  
model = YOLO(model_path)
print("Model loaded successfully!")

class FatigueCalculator:
    def __init__(self, frame_rate=30):
        self.frame_rate = frame_rate
        self.eye_states = deque(maxlen=180 * frame_rate) 
        self.yawn_states = deque(maxlen=180 * frame_rate)
        self.consecutive_eye_closed = 0
        
        # Paper thresholds
        self.PERCLOS_VERY_TIRED = 0.24
        self.PERCLOS_GETTING_TIRED = 0.15
        self.FOM_THRESHOLD = 0.16
        self.EYE_CLOSURE_CRITICAL = 5.0  # seconds

        # debug info
        self.debug_info = {}
    
    def update_metrics(self, eye_closed, yawning, detected_classes=None):
        """Update PERCLOS and FOM calculations"""
        self.eye_states.append(eye_closed)
        self.yawn_states.append(yawning)
        
        # Track consecutive eye closure
        if eye_closed:
            self.consecutive_eye_closed += 1
        else:
            self.consecutive_eye_closed = 0

        # debug info
        self.debug_info = {
            'current_eye_closed': eye_closed,
            'current_yawning': yawning,
            'consecutive_frames': self.consecutive_eye_closed,
            'total_eye_frames': sum(self.eye_states),
            'total_yawn_frames': sum(self.yawn_states),
            'window_size': len(self.eye_states),
            'detected_classes': detected_classes or []
        }
        
        # Debug output
        print(f"EYE DEBUG: closed={eye_closed}, consecutive={self.consecutive_eye_closed}")
        if detected_classes:
            print(f"YOLO DETECTIONS: {detected_classes}")
    
    def calculate_perclos(self):
        """Calculate PERCLOS over the window"""
        if len(self.eye_states) == 0:
            return 0.0
        return sum(self.eye_states) / len(self.eye_states)
    

    def calculate_fom(self):
        """Better FOM that doesn't overcount continuous yawns"""
        if len(self.yawn_states) < 30:
            return 0.0
        
        # Count yawn EVENTS with minimum duration between them
        yawn_events = 0
        consecutive_yawn_frames = 0
        prev_was_yawn = False
        
        for current_yawn in self.yawn_states:
            if current_yawn:
                consecutive_yawn_frames += 1
                if not prev_was_yawn:
                    # Start of new yawn event
                    yawn_events += 1
            else:
                consecutive_yawn_frames = 0
                
            prev_was_yawn = current_yawn
        
        # Ensure reasonable time window (minimum 10 seconds)
        window_seconds = max(len(self.yawn_states) / self.frame_rate, 10.0)
        fom_per_minute = (yawn_events / window_seconds) * 60
        
        print(f"FOM DEBUG: {yawn_events} yawn events in {window_seconds:.1f}s = {fom_per_minute:.2f} yawns/min")
        return fom_per_minute


    def get_continuous_eye_closure(self):
        """Get continuous eye closure time in seconds"""
        return self.consecutive_eye_closed / self.frame_rate
    
    def calculate_fatigue_level(self):
        """Calculate fatigue level based on paper's rules"""
        perclos = self.calculate_perclos()
        fom = self.calculate_fom()
        continuous_closure = self.get_continuous_eye_closure()
        
        # Add hysteresis - once you enter a level, harder to leave it
        if hasattr(self, 'current_level'):
        # If currently in HIGH level, need lower threshold to drop down
            if self.current_level == "VERY TIRED":
                if perclos < 0.20 and fom < 0.12:  # Lower thresholds to leave
                    self.current_level = "GETTING TIRED"
            # If currently in MEDIUM level
            elif self.current_level == "GETTING TIRED":
                if perclos > 0.22 or fom > 0.15:  # Go up easily
                    self.current_level = "VERY TIRED"
                elif perclos < 0.12 and fom < 0.10:  # Go down with lower threshold
                    self.current_level = "NORMAL"
        else:
            self.current_level = "NORMAL"

        # Debug the calculations
        print(f"DEBUG: PERCLOS={perclos:.3f}, FOM={fom:.3f}, Continuous={continuous_closure:.1f}s")
        print(f"DEBUG: Eye frames: {self.debug_info['total_eye_frames']}/{self.debug_info['window_size']}")
        print(f"DEBUG: Yawn frames: {self.debug_info['total_yawn_frames']}/{self.debug_info['window_size']}")

        # Level 1: Very Tired - Pathway A (Critical)
        if continuous_closure >= self.EYE_CLOSURE_CRITICAL:
            print("🚨 CRITICAL ALERT TRIGGERED!")
            return "VERY TIRED", 90, f"CRITICAL: Eyes closed {continuous_closure:.1f}s!"
        
        # Level 1: Very Tired - Pathway B (Combined)
        if perclos > self.PERCLOS_VERY_TIRED or fom > self.FOM_THRESHOLD:
            return "VERY TIRED", 75, "High fatigue detected"
        
        # Level 2: Getting Tired
        if (self.PERCLOS_GETTING_TIRED <= perclos <= self.PERCLOS_VERY_TIRED) or fom > self.FOM_THRESHOLD:
            return "GETTING TIRED", 50, "Early fatigue signs"
        
        # Level 3: Normal
        return "NORMAL", 25, "No fatigue detected"

def simple_mar_calculation(face_region):
    """More conservative MAR calculation"""
    try:
        gray = cv2.cvtColor(face_region, cv2.COLOR_BGR2GRAY)
        mouth_region = gray[gray.shape[0]//2:, :]
        mouth_contrast = np.std(mouth_region)
        
        # MUCH more conservative threshold
        mar = min(mouth_contrast / 50.0, 1.0)  # Increased denominator
        
        return mar > 0.8  # Increased threshold - only obvious yawns
    except:
        return False

def test_critical_alert():
    """Test if critical eye closure alert works"""
    test_calc = FatigueCalculator(frame_rate=10)  # Lower frame rate for testing
    
    print("Testing critical alert...")
    print("Simulating eyes closed for 6 seconds...")
    
    # Simulate 6 seconds of eye closure (60 frames at 10 FPS)
    for i in range(60):
        test_calc.update_metrics(eye_closed=True, yawning=False, detected_classes=["Eyes_closed"])
        level, score, msg = test_calc.calculate_fatigue_level()
        if level == "VERY TIRED" and score == 90:
            print(f"✅ CRITICAL ALERT WORKED: {msg}")
            return True
    
    print("❌ Critical alert failed")
    return False

# Comment out the test for now to avoid the error
# test_critical_alert()

def live_monitoring():
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

if __name__ == "__main__":
    live_monitoring()