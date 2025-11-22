class FatigueCalculator:
    def __init__(self):
        self.current_level = "NORMAL"
        self.startup_frames = 0
        
    def calculate_fatigue_level(self, physio_scores, current_frame_count):
        """Calculate fatigue level with startup calibration"""
        self.startup_frames += 1
        
        if self.startup_frames < 90:  
            return "CALIBRATING", 25, f"Calibrating... {90 - self.startup_frames} frames left"
        
        perclos = physio_scores['perclos']
        fom = physio_scores['fom']
        continuous_closure = physio_scores['continuous_closure_sec']
        continuous_droopy_face = physio_scores['continuous_droopy_face_sec']
        droopy_eyelids_frequency = physio_scores['droopy_eyelids_frequency']

        # MOCK DATA for other factors 
        reaction_score = 0.85 
        voice_score = 0.90    
        history_score = 0.80   
        sleep_hours = 6.5     
        
        # COMBINE ALL FACTORS with weights
        fatigue_score = (
            0.30 * self._normalize_perclos(perclos) +           # Vision - eyes (30%)
            0.20 * self._normalize_fom(fom) +                   # Vision - yawning (20%)
            0.15 * self._normalize_droopy(droopy_eyelids_frequency) + # Droopy eyelids (15%)
            0.10 * reaction_score +                             # Reaction time (10%)
            0.10 * voice_score +                                # Voice patterns (10%)
            0.08 * history_score +                              # Historical data (8%)
            0.03 * self._normalize_sleep(sleep_hours)           # Sleep quality (3%)
        )

        # Debug
        # print(f"DEBUG: PERCLOS={perclos:.3f}, FOM={fom:.3f}, EyeClosure={continuous_closure:.1f}s, DroopyFace={continuous_droopy_face:.1f}s, DroopyEyelids={droopy_eyelids_frequency:.3f}")
        print(f"DEBUG: PERCLOS={perclos:.3f}, FOM={fom:.3f}, EyeClosure={continuous_closure:.1f}s")
        print(f"DEBUG: DroopyEyelids={droopy_eyelids_frequency:.3f}, Reaction={reaction_score:.2f}")
        print(f"DEBUG: Voice={voice_score:.2f}, History={history_score:.2f}, Sleep={sleep_hours}h")
        print(f"DEBUG: COMBINED FATIGUE SCORE: {fatigue_score:.3f}")

        if fatigue_score > 0.70:
            return "HIGH FATIGUE", int(fatigue_score * 100), "Severe fatigue - Multiple factors detected"
        elif fatigue_score > 0.50:
            return "EARLY FATIGUE", int(fatigue_score * 100), "Moderate fatigue - Monitor closely"
        else:
            return "NORMAL", int(fatigue_score * 100), "Normal - All factors within range"
    
    def _normalize_perclos(self, perclos):
        """Convert PERCLOS to 0-1 fatigue score (higher = more fatigue)"""
        return min(perclos / 0.5, 1.0)  # Cap at 0.5 (50% eye closure)
    
    def _normalize_fom(self, fom):
        """Convert FOM to 0-1 fatigue score"""
        return min(fom / 0.8, 1.0)  # Cap at 0.8 (48 yawns/hour)
    
    def _normalize_droopy(self, droopy_freq):
        """Convert droopy frequency to 0-1 fatigue score"""
        return min(droopy_freq / 0.8, 1.0)  # Cap at 0.8 (80% frequency)
    
    def _normalize_shift_hours(self, hours):
        """Convert shift hours to 0-1 fatigue score (longer = more fatigue)"""
        return min(hours / 10.0, 1.0)  # 10-hour shift = max fatigue
    
    def _normalize_sleep(self, sleep_hours):
        """Convert sleep hours to 0-1 fatigue score (less sleep = more fatigue)"""
        if sleep_hours >= 8: return 0.0
        elif sleep_hours >= 6: return 0.3
        elif sleep_hours >= 4: return 0.6
        else: return 1.0

        # ONLY BASED ON PERCLOS AND FOM
        # # LEVEL 1: HIGH FATIGUE (Red) - Only for SEVERE, DANGEROUS states
        # if (continuous_closure >= 10.0 or
        #     continuous_droopy_face >= 20.0 or
        #     perclos > 0.40 or
        #     fom > 0.30 or
        #     droopy_eyelids_frequency > 0.6):
        #     return "HIGH FATIGUE", 75, "Severe fatigue - Supervisor alert"
        
        # # LEVEL 2: EARLY FATIGUE (Orange) - Moderate signs for monitoring
        # if (continuous_closure >= 5.0 or
        #     continuous_droopy_face >= 10.0 or
        #     perclos > 0.25 or
        #     fom > 0.20 or
        #     droopy_eyelids_frequency > 0.3):
        #     return "EARLY FATIGUE", 50, "Moderate fatigue - Monitor closely"
        
        # # LEVEL 3: NORMAL (Green) - Normal ATC operation
        # return "NORMAL", 25, "Normal - No fatigue detected"