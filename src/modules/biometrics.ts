/**
 * Behavioral Biometrics Module
 * Tracks mouse trajectories, velocity, and keystroke flight times to detect humans vs bots.
 */

export const biometrics = {
  /**
   * Start tracking biometrics on the document or a specific element.
   * Returns an object to get the current human score (0-100) and stop tracking.
   */
  startTracking(el: HTMLElement | Document = document) {
    let mouseMoves = 0;
    let clickCount = 0;
    let keyPresses = 0;
    let lastMouseX = -1;
    let lastMouseY = -1;
    let lastMouseTime = 0;
    let lastKeyTime = 0;
    
    // Scores
    let trajectoryScore = 0; // Curve vs straight lines
    let velocityScore = 0;   // Human-like speed variations
    let flightTimeScore = 0; // Realistic typing delays

    const mouseHandler = (e: MouseEvent) => {
      const now = Date.now();
      if (lastMouseTime > 0) {
        const dx = e.clientX - lastMouseX;
        const dy = e.clientY - lastMouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const dt = now - lastMouseTime;
        
        if (dt > 0) {
          const velocity = dist / dt;
          
          // Humans rarely move in perfect straight lines or constant speeds.
          // Too fast or too constant = bot.
          if (velocity > 0.1 && velocity < 5) {
            velocityScore = Math.min(velocityScore + 1, 100);
          } else if (velocity > 10) {
            velocityScore = Math.max(velocityScore - 5, 0); // Unrealistic speed
          }

          // Trajectory logic (simplified approximation): if distance > 5 and time > 10
          if (dist > 5 && dt > 10) {
            trajectoryScore = Math.min(trajectoryScore + 1, 100);
          }
        }
      }
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      lastMouseTime = now;
      mouseMoves++;
    };

    const clickHandler = () => {
      clickCount++;
    };

    const keyHandler = () => {
      const now = Date.now();
      if (lastKeyTime > 0) {
        const dt = now - lastKeyTime;
        // Human typing is usually between 50ms and 800ms per key
        if (dt > 40 && dt < 1000) {
          flightTimeScore = Math.min(flightTimeScore + 2, 100);
        } else if (dt < 20) {
          flightTimeScore = Math.max(flightTimeScore - 10, 0); // Too fast!
        }
      }
      lastKeyTime = now;
      keyPresses++;
    };

    el.addEventListener('mousemove', mouseHandler as EventListener, { passive: true });
    el.addEventListener('click', clickHandler as EventListener, { passive: true });
    el.addEventListener('keydown', keyHandler as EventListener, { passive: true });

    return {
      /**
       * Returns a score from 0 to 100, where > 50 indicates high probability of human.
       */
      getHumanScore: (): number => {
        // If very little interaction, assume suspicious (low score)
        if (mouseMoves < 10 && keyPresses < 5) return 0;
        
        // Weight the available signals
        const totalSignals = (mouseMoves > 0 ? 1 : 0) + (keyPresses > 0 ? 1 : 0);
        if (totalSignals === 0) return 0;

        let combined = 0;
        if (mouseMoves > 0) {
          combined += (trajectoryScore * 0.5 + velocityScore * 0.5);
        }
        if (keyPresses > 0) {
          combined += flightTimeScore;
        }

        return Math.floor(Math.min(combined / totalSignals, 100));
      },
      
      /**
       * Returns detailed stats
       */
      getStats: () => ({
        mouseMoves,
        clickCount,
        keyPresses,
        trajectoryScore,
        velocityScore,
        flightTimeScore
      }),

      stop: () => {
        el.removeEventListener('mousemove', mouseHandler as EventListener);
        el.removeEventListener('click', clickHandler as EventListener);
        el.removeEventListener('keydown', keyHandler as EventListener);
      }
    };
  }
};
