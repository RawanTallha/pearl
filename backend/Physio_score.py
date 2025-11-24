from collections import deque

class PhysioScore:
    def __init__(self, frame_rate=30):
        self.frame_rate = frame_rate
        # 30-second window for demo (instead of 3 minutes)
        window_seconds = 30
        window_frames = window_seconds * frame_rate
        
        self.eye_states = deque(maxlen=window_frames) 
        self.yawn_states = deque(maxlen=window_frames)
        self.droopy_eyelids_states = deque(maxlen=window_frames)
        self.droopy_face_states = deque(maxlen=window_frames)
        self.consecutive_eye_closed = 0
        self.consecutive_droopy_face = 0
        
        # debug info
        self.debug_info = {}
    
    def update_vision_metrics(self, eye_closed, yawning, droopy_eyelids=False, droopy_face=False):
        """Update PERCLOS and FOM calculations"""
        self.eye_states.append(eye_closed)
        self.yawn_states.append(yawning)
        self.droopy_eyelids_states.append(droopy_eyelids)
        self.droopy_face_states.append(droopy_face)
        
        # Track consecutive eye closure
        if eye_closed:
            self.consecutive_eye_closed += 1
        else:
            self.consecutive_eye_closed = 0
            
        # Track consecutive droopy face (for 5-second rule)
        if droopy_face:
            self.consecutive_droopy_face += 1
        else:
            self.consecutive_droopy_face = 0

        # debug info
        self.debug_info = {
            'current_eye_closed': eye_closed,
            'current_yawning': yawning,
            'current_droopy_eyelids': droopy_eyelids,
            'current_droopy_face': droopy_face,
            'consecutive_frames': self.consecutive_eye_closed,
            'consecutive_droopy_face_frames': self.consecutive_droopy_face,
            'total_eye_frames': sum(self.eye_states),
            'total_yawn_frames': sum(self.yawn_states),
            'total_droopy_eyelids_frames': sum(self.droopy_eyelids_states),
            'total_droopy_face_frames': sum(self.droopy_face_states),
            'window_size': len(self.eye_states)
        }
    
    def calculate_perclos(self):
        """Calculate PERCLOS over the window"""
        if len(self.eye_states) == 0:
            return 0.0
        return sum(self.eye_states) / len(self.eye_states)
    
    def calculate_fom(self):
        """Calculate FOM over the window"""
        if len(self.yawn_states) < 30:
            return 0.0
        
        # Count yawn EVENTS with minimum duration between them
        yawn_events = 0
        prev_was_yawn = False
        
        for current_yawn in self.yawn_states:
            if current_yawn and not prev_was_yawn:
                yawn_events += 1
            prev_was_yawn = current_yawn
        
        # Ensure reasonable time window (minimum 10 seconds)
        window_seconds = max(len(self.yawn_states) / self.frame_rate, 10.0)
        fom_per_minute = (yawn_events / window_seconds) * 60
        
        return fom_per_minute

    def get_continuous_eye_closure(self):
        """Get continuous eye closure time in seconds"""
        return self.consecutive_eye_closed / self.frame_rate
    
    def get_continuous_droopy_face(self):
        """Get continuous droopy face time in seconds"""
        return self.consecutive_droopy_face / self.frame_rate
    
    def get_droopy_eyelids_frequency(self):
        """Get frequency of droopy eyelids"""
        if len(self.droopy_eyelids_states) == 0:
            return 0.0
        return sum(self.droopy_eyelids_states) / len(self.droopy_eyelids_states)
    
    def get_droopy_face_frequency(self):
        """Get frequency of droopy face"""
        if len(self.droopy_face_states) == 0:
            return 0.0
        return sum(self.droopy_face_states) / len(self.droopy_face_states)
    
    def get_physio_scores(self):
        """Return all physiological scores"""
        return {
            'perclos': self.calculate_perclos(),
            'fom': self.calculate_fom(),
            'continuous_closure_sec': self.get_continuous_eye_closure(),
            'continuous_droopy_face_sec': self.get_continuous_droopy_face(),
            'droopy_eyelids_frequency': self.get_droopy_eyelids_frequency(),
            'droopy_face_frequency': self.get_droopy_face_frequency(),
            'debug_info': self.debug_info
        }