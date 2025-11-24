import time
class FatigueCalculator:
    def __init__(self):
        self.current_level = "NORMAL"
        self.startup_frames = 0
        self.previous_alerts_count = 0
        self.alert_history = []
        self.level_persistence_timer = time.time()
        self.current_stable_level = "NORMAL"
        
    def calculate_fatigue_level(self, physio_scores, current_frame_count):
        """Calculate fatigue level with balanced weights and persistence"""
        self.startup_frames += 1
        
        if self.startup_frames < 30:
            return "CALIBRATING", 25, f"Calibrating... {30 - self.startup_frames} frames left"
        
        # Extract physiological factors
        perclos = physio_scores['perclos']
        fom = physio_scores['fom']
        continuous_closure = physio_scores['continuous_closure_sec']
        continuous_droopy_face = physio_scores['continuous_droopy_face_sec']
        droopy_eyelids_frequency = physio_scores['droopy_eyelids_frequency']

        # MOCK DATA for other factors
        reaction_time_ms = 280
        reaction_score = self._normalize_reaction_time(reaction_time_ms)
        voice_score = 0.75
        history_score = 0.70
        sleep_hours = 5.5
        previous_alerts = self._get_previous_alerts_count()

        # STEP 1: Calculate equation-based score with BALANCED WEIGHTS
        fatigue_score = (
            0.25 * self._normalize_perclos(perclos) +           # PERCLOS (25%)
            0.20 * self._normalize_fom(fom) +                   # FOM (20%)
            0.15 * self._normalize_droopy(droopy_eyelids_frequency) + # Droopy eyelids (15%)
            0.15 * reaction_score +                             # Reaction time (15%)
            0.10 * voice_score +                                # Voice patterns (10%)
            0.10 * history_score +                              # Historical data (10%)
            0.05 * self._normalize_sleep(sleep_hours)           # Sleep quality (5%)
        )

        # Debug info
        print(f"DEBUG: PERCLOS={perclos:.3f}, FOM={fom:.3f}, EyeClosure={continuous_closure:.1f}s")
        print(f"DEBUG: DroopyEyelids={droopy_eyelids_frequency:.3f}, Reaction={reaction_time_ms}ms")
        print(f"DEBUG: Sleep={sleep_hours}h, PreviousAlerts={previous_alerts}")
        print(f"DEBUG: EQUATION SCORE: {fatigue_score:.3f}")

        # STEP 2: Apply rule-based classification
        rule_based_level = self._rule_based_classification(
            perclos, fom, continuous_closure, droopy_eyelids_frequency,
            sleep_hours, reaction_time_ms, previous_alerts
        )
        
        print(f"DEBUG: RULE-BASED LEVEL: {rule_based_level}")

        # STEP 3: Hybrid decision with PERSISTENCE
        final_level, confidence = self._hybrid_decision_with_persistence(
            fatigue_score, rule_based_level, continuous_closure
        )
        
        # Update alert history (only for actual fatigue states, not during persistence)
        if final_level != "NORMAL" or rule_based_level != "NORMAL":
            self._update_alert_history(final_level)
        
        # Generate appropriate message
        alert_message = self._get_alert_message(final_level, rule_based_level, fatigue_score)

        return final_level, int(fatigue_score * 100), alert_message
    
    def _rule_based_classification(self, perclos, fom, eye_closure, droopy_eyelids, sleep, reaction_ms, alerts):
        """Rule-based classification with GRADUAL alert escalation"""
        
        # HIGH FATIGUE Rules (IMMEDIATE DANGER - no persistence needed)
        if (eye_closure > 10.0 or                         # Emergency eye closure - immediate!
            perclos > 0.24 or fom > 0.16 or               # Critical thresholds
            droopy_eyelids > 0.8 or                       # Severe droopy eyelids
            sleep < 2 or reaction_ms > 500 or             # Critical history factors
            alerts >= 3):             
            return "HIGH FATIGUE"
    
        # EARLY FATIGUE Rules with GRADUAL escalation
        elif ((0.15 <= perclos <= 0.24) or fom > 0.16 or  # Research paper early signs
              droopy_eyelids > 0.5 or                     # Moderate droopy eyelids
              (2 <= sleep < 4) or                         # Insufficient sleep
              (350 < reaction_ms <= 500 or
               alerts >= 1 )):                # Impaired reaction
            return "EARLY FATIGUE"
        
        # Alert persistence - only escalate after sustained alerts
        elif alerts >= 4:                                 # More conservative: 4+ alerts
            return "HIGH FATIGUE"
        elif alerts >= 2:                                 # Moderate persistence
            return "EARLY FATIGUE"
    
        # NORMAL - No concerning signs
        else:
            return "NORMAL"
    
    def _hybrid_decision_with_persistence(self, equation_score, rule_level, eye_closure):
        """Hybrid decision with time-based persistence to prevent rapid jumps"""
        current_time = time.time()
        time_since_last_change = current_time - self.level_persistence_timer
        
        # Proposed level based on current assessment
        if rule_level == "HIGH FATIGUE":
            proposed_level = "HIGH FATIGUE"
        elif rule_level == "EARLY FATIGUE":
            if equation_score > 0.65:  
                proposed_level = "HIGH FATIGUE"
            else:
                proposed_level = "EARLY FATIGUE"
        else:  # NORMAL rules
            if equation_score > 0.70:
                proposed_level = "HIGH FATIGUE"
            elif equation_score > 0.50:  # Lowered threshold for early fatigue
                proposed_level = "EARLY FATIGUE"
            else:
                proposed_level = "NORMAL"
        
        # EMERGENCY OVERRIDE: Immediate escalation for critical safety issues
        if eye_closure > 10.0 or rule_level == "HIGH FATIGUE":
            self.current_stable_level = proposed_level
            self.level_persistence_timer = current_time
            return proposed_level, "HIGH"
        
        # PERSISTENCE LOGIC: Require sustained signals before changing levels
        if proposed_level != self.current_stable_level:
            # Different time requirements based on direction
            if proposed_level == "HIGH FATIGUE":
                required_time = 5.0  # 5 seconds of sustained high fatigue
            elif proposed_level == "EARLY FATIGUE":
                required_time = 3.0  # 3 seconds of sustained early fatigue
            else:  # Returning to normal
                required_time = 10.0  # 10 seconds of normal to reset
            
            if time_since_last_change >= required_time:
                self.current_stable_level = proposed_level
                self.level_persistence_timer = current_time
                return proposed_level, "HIGH"
            else:
                # Return current stable level while waiting for persistence
                return self.current_stable_level, "MEDIUM"
        else:
            # No change needed
            self.level_persistence_timer = current_time
            return proposed_level, "HIGH"
    
    def _update_alert_history(self, current_level):
        """Track alert history with cooldown to prevent spam"""
        current_time = time.time()
        
        # Only count new alerts if enough time has passed (2-second cooldown)
        if (not self.alert_history or 
            current_time - self.alert_history[-1][1] > 2.0):
            
            if current_level != "NORMAL":
                self.alert_history.append((current_level, current_time))
                
                # Keep only alerts from last 5 minutes (instead of 10)
                self.alert_history = [alert for alert in self.alert_history 
                                    if current_time - alert[1] < 300]
                self.previous_alerts_count = len(self.alert_history)
    
    def _get_previous_alerts_count(self):
        """Get previous alerts count"""
        return self.previous_alerts_count
    
    def _get_alert_message(self, final_level, rule_level, equation_score):
        """Generate alert messages"""
        if final_level == "HIGH FATIGUE":
            if rule_level == "HIGH FATIGUE":
                return "CRITICAL: Immediate safety risk"
            else:
                return "HIGH: Sustained fatigue detected"
        
        elif final_level == "EARLY FATIGUE":
            return "MODERATE: Early fatigue signs"
        
        else:
            return "NORMAL: All factors within safe limits"
    
    # Normalization functions (adjusted for better balance)
    def _normalize_perclos(self, perclos):
        return min(perclos / 0.3, 1.0)
    
    def _normalize_fom(self, fom):
        return min(fom / 0.2, 1.0)
    
    def _normalize_droopy(self, droopy_freq):
        return min(droopy_freq / 1.0, 1.0)
    
    def _normalize_reaction_time(self, reaction_ms):
        if reaction_ms <= 250:
            return 0.0
        elif reaction_ms >= 500:
            return 1.0
        else:
            return (reaction_ms - 250) / 250.0
    
    def _normalize_sleep(self, sleep_hours):
        if sleep_hours >= 8: return 0.0
        elif sleep_hours >= 7: return 0.1
        elif sleep_hours >= 6: return 0.3
        elif sleep_hours >= 5: return 0.5
        elif sleep_hours >= 4: return 0.7
        else: return 0.9