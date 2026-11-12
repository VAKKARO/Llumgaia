/**
 * EL LENGUAJE DE LAS PIEDRAS — TRIGAIA (Interactive Mobile Experience)
 * Multidisciplinary Core: Full-Stack Technologist + Mobile UX + Multimedia Narrative
 */

(function () {
  'use strict';

  // --- 1. RUNE DATA & ENCHANTED FREQUENCIES ---
  const RUNES = {
    none: { id: 'none', imageSelector: '#layer-base', hotspotSelector: null, baseFreq: 261.63 },
    conexion: { id: 'conexion', imageSelector: '#layer-conexion', hotspotSelector: '#hotspot-conexion', baseFreq: 370.0 },
    renovacion: { id: 'renovacion', imageSelector: '#layer-renovacion', hotspotSelector: '#hotspot-renovacion', baseFreq: 440.0 },
    dragon: { id: 'dragon', imageSelector: '#layer-dragon', hotspotSelector: '#hotspot-dragon', baseFreq: 293.66 },
    cuidado: { id: 'cuidado', imageSelector: '#layer-cuidado', hotspotSelector: '#hotspot-cuidado', baseFreq: 329.63 }
  };

  const RUNE_KEYS = ['conexion', 'renovacion', 'dragon', 'cuidado'];

  // --- 2. STATE ---
  let currentState = 'none';
  let isAwakened = false;
  let currentScene = 1; // 1 = Stones, 2 = Trigaia
  let audioEnabled = true;
  let audioCtx = null;
  let wordValidated = false;
  let eggChargeLevel = 0; // 0 = empty, 1 = half, 2 = full
  let isDragonFlying = false;
  let dragonAnimFrame = 1;
  let dragonTimer = null;
  let dragonTrajectoryId = null;

  // --- 3. DOM ELEMENTS ---
  const viewport = document.getElementById('mobile-viewport');
  const soundToggleBtn = document.getElementById('sound-toggle');
  const btnBackScene1 = document.getElementById('btn-back-scene1');
  const portalFlash = document.getElementById('portal-flash');

  // Scene 1 Elements
  const sceneStones = document.getElementById('scene-stones');
  const actionBtn = document.getElementById('btn-action');
  const layers = document.querySelectorAll('.altar-layer');
  const hotspots = document.querySelectorAll('.rune-hotspot');
  const altarContainer = document.getElementById('altar-container');
  const canvas = document.getElementById('ambient-canvas');

  // Scene 2 Elements (Trigaia)
  const sceneTrigaia = document.getElementById('scene-trigaia');
  const eggContainer = document.getElementById('egg-container');
  const chargeBarContainer = document.getElementById('charge-bar-container');
  const barEmpty = document.getElementById('bar-empty');
  const barHalf = document.getElementById('bar-half');
  const barFull = document.getElementById('bar-full');
  const dragonFlightStage = document.getElementById('dragon-flight-stage');
  const dragonSprite = document.getElementById('dragon-sprite');

  // Scroll Modal Elements
  const scrollModal = document.getElementById('scroll-modal');
  const scrollCard = document.querySelector('.scroll-card');
  const scrollForm = document.getElementById('scroll-form');
  const ancestralInput = document.getElementById('ancestral-word-input');
  const scrollCloseBtn = document.getElementById('scroll-close-btn');
  const scrollFeedback = document.getElementById('scroll-feedback');

  // --- 4. PRELOAD ASSETS ---
  const dragonFrames = [];
  for (let i = 1; i <= 10; i++) {
    const img = new Image();
    img.src = `assets/dragon/frame-${i}.png`;
    dragonFrames.push(img);
  }

  // Finale Audio
  const finaleAudio = new Audio('assets/audio-finale.mp3');
  finaleAudio.preload = 'auto';

  // --- 5. WEB AUDIO SYNTHESIZER ---
  function initAudio() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioCtx = new AudioContext();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playMagicalChime(baseFreq, isAwaken = false) {
    if (!audioEnabled) return;
    initAudio();
    if (!audioCtx) return;

    const now = audioCtx.currentTime;
    const masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0.7, now);
    masterGain.connect(audioCtx.destination);

    const noteMultipliers = isAwaken ? [1, 1.25, 1.5, 1.875, 2.25] : [1, 1.5, 2.0, 2.76];

    noteMultipliers.forEach((mult, index) => {
      const freq = baseFreq * mult;
      const noteDelay = index * 0.045;
      const noteTime = now + noteDelay;

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = index % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);

      const lfo = audioCtx.createOscillator();
      const lfoGain = audioCtx.createGain();
      lfo.frequency.setValueAtTime(5.2, noteTime);
      lfoGain.gain.setValueAtTime(freq * 0.008, noteTime);
      lfo.connect(osc.frequency);
      lfo.start(noteTime);
      lfo.stop(noteTime + 2.2);

      gain.gain.setValueAtTime(0.0001, noteTime);
      gain.gain.linearRampToValueAtTime(0.14 / (index * 0.5 + 1), noteTime + 0.035);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 2.0);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(noteTime);
      osc.stop(noteTime + 2.2);
    });

    if (isAwaken) {
      const drone = audioCtx.createOscillator();
      const droneGain = audioCtx.createGain();
      drone.type = 'sine';
      drone.frequency.setValueAtTime(baseFreq * 0.5, now);

      droneGain.gain.setValueAtTime(0.0001, now);
      droneGain.gain.linearRampToValueAtTime(0.12, now + 0.2);
      droneGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);

      drone.connect(droneGain);
      droneGain.connect(masterGain);

      drone.start(now);
      drone.stop(now + 3.0);
    }
  }

  function playChargeSound(level) {
    if (!audioEnabled) return;
    initAudio();
    if (!audioCtx) return;

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    const freqs = [220, 330, 440];
    const targetFreq = freqs[level] || 440;

    osc.frequency.setValueAtTime(targetFreq * 0.8, now);
    osc.frequency.exponentialRampToValueAtTime(targetFreq * 1.5, now + 0.8);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 1.3);
  }

  function triggerHaptic(type = 'light') {
    if ('vibrate' in navigator) {
      if (type === 'light') navigator.vibrate(18);
      else if (type === 'medium') navigator.vibrate([25, 30, 25]);
      else if (type === 'heavy') navigator.vibrate([35, 50, 40]);
    }
  }

  // --- 6. RIPPLE MICROINTERACTION ---
  function createRipple(e, targetEl) {
    const rect = targetEl.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'touch-ripple';

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const size = Math.max(rect.width, rect.height) * 1.3;
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${clientX - rect.left}px`;
    ripple.style.top = `${clientY - rect.top}px`;

    targetEl.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  }

  // --- 7. SCENE 1: RUNE LOGIC ---
  function setRune(runeKey) {
    if (!RUNES[runeKey]) return;
    currentState = runeKey;
    const rune = RUNES[runeKey];

    layers.forEach(layer => layer.classList.remove('active'));
    const targetLayer = document.querySelector(rune.imageSelector);
    if (targetLayer) {
      targetLayer.classList.add('active');
    }

    hotspots.forEach(h => h.classList.remove('active'));
    if (rune.hotspotSelector) {
      const targetHotspot = document.querySelector(rune.hotspotSelector);
      if (targetHotspot) {
        targetHotspot.classList.add('active');
      }
    }

    playMagicalChime(rune.baseFreq, false);
    triggerHaptic('light');

    if (runeKey !== 'none') {
      spawnRuneBurst(runeKey);
    }
  }

  // --- 8. SCENE TRANSITIONS ---
  function transitionToTrigaia() {
    if (currentScene === 2) return;
    currentScene = 2;

    portalFlash.classList.add('flash-active');
    playMagicalChime(261.63, true);
    triggerHaptic('heavy');

    setTimeout(() => {
      viewport.classList.add('trigaia-mode');
      sceneStones.classList.add('hidden');
      sceneStones.classList.remove('scene-active');

      sceneTrigaia.classList.remove('hidden');
      sceneTrigaia.classList.add('scene-active');

      btnBackScene1.classList.remove('hidden');
      portalFlash.classList.remove('flash-active');
    }, 450);
  }

  function transitionToScene1() {
    if (currentScene === 1) return;
    currentScene = 1;

    // Detener y sacar el sonido al volver al menú principal
    try {
      finaleAudio.pause();
      finaleAudio.currentTime = 0;
    } catch (e) {
      console.log('Audio stop handled', e);
    }

    // Resetear estados
    if (dragonTimer) clearInterval(dragonTimer);
    if (dragonTrajectoryId) cancelAnimationFrame(dragonTrajectoryId);
    isDragonFlying = false;
    wordValidated = false;
    eggChargeLevel = 0;

    dragonFlightStage.classList.add('hidden');
    chargeBarContainer.classList.add('hidden');
    chargeBarContainer.classList.remove('bar-full-active');
    barEmpty.classList.add('active');
    barHalf.classList.remove('active');
    barFull.classList.remove('active');
    eggContainer.style.opacity = '1';

    portalFlash.classList.add('flash-active');
    triggerHaptic('medium');

    setTimeout(() => {
      viewport.classList.remove('trigaia-mode');
      sceneTrigaia.classList.add('hidden');
      sceneTrigaia.classList.remove('scene-active');

      sceneStones.classList.remove('hidden');
      sceneStones.classList.add('scene-active');

      btnBackScene1.classList.add('hidden');
      portalFlash.classList.remove('flash-active');
    }, 350);
  }

  // --- 9. SCENE 2: SCROLL & WORD VALIDATION ---
  function openScrollModal() {
    if (wordValidated || isDragonFlying) return;
    scrollModal.classList.remove('hidden');
    ancestralInput.value = '';
    scrollFeedback.classList.remove('visible');
    setTimeout(() => {
      ancestralInput.focus();
    }, 250);
    playMagicalChime(370.0, false);
    triggerHaptic('light');
  }

  function closeScrollModal() {
    scrollModal.classList.add('hidden');
    ancestralInput.blur();
  }

  function validateAncestralWord() {
    const rawVal = ancestralInput.value || '';
    const cleanWord = rawVal.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    if (cleanWord === 'conexion') {
      wordValidated = true;
      eggChargeLevel = 0;

      scrollFeedback.textContent = '¡El Vínculo Ancestral Responde!';
      scrollFeedback.style.color = '#1b7a42';
      scrollFeedback.classList.add('visible');

      playMagicalChime(440.0, true);
      triggerHaptic('heavy');

      setTimeout(() => {
        closeScrollModal();

        // Mostrar la barra vacía debajo de TRIGAIA lista para cargarse al hacer click
        chargeBarContainer.classList.remove('hidden');
        barEmpty.classList.add('active');
        barHalf.classList.remove('active');
        barFull.classList.remove('active');
        playChargeSound(0);
        triggerHaptic('medium');
      }, 700);
    } else {
      scrollCard.classList.add('shake');
      scrollFeedback.textContent = 'La palabra no resuena con el huevo ancestral...';
      scrollFeedback.style.color = '#8a2222';
      scrollFeedback.classList.add('visible');

      triggerHaptic('medium');
      setTimeout(() => {
        scrollCard.classList.remove('shake');
      }, 500);
    }
  }

  // --- 10. CARGA INTERACTIVA AL HACER CLICK EN EL HUEVO O EN LA BARRA ---
  function handleEggChargeClick(e) {
    // Si la palabra aún no ha sido validada, abre el pergamino
    if (!wordValidated) {
      openScrollModal();
      return;
    }

    // Si el dragón ya está volando, no hace nada
    if (isDragonFlying) return;

    createRipple(e, eggContainer);

    // CLICK 1: La barra se carga al 50%
    if (eggChargeLevel === 0) {
      eggChargeLevel = 1;
      barEmpty.classList.remove('active');
      barHalf.classList.add('active');
      playChargeSound(1);
      triggerHaptic('medium');
      spawnEggEnergyParticles();
    }
    // CLICK 2: La barra se carga al 100% y despierta el dragón
    else if (eggChargeLevel === 1) {
      eggChargeLevel = 2;
      barHalf.classList.remove('active');
      barFull.classList.add('active');
      chargeBarContainer.classList.add('bar-full-active');
      playChargeSound(2);
      triggerHaptic('heavy');
      spawnEggEnergyParticles();

      // Cuando se llena, aparece el dragón volando con el sonido final
      setTimeout(() => {
        triggerDragonAwakening();
      }, 750);
    }
  }

  function triggerDragonAwakening() {
    isDragonFlying = true;

    portalFlash.classList.add('flash-active');
    eggContainer.style.opacity = '0';
    chargeBarContainer.classList.add('hidden');

    // Reproducir el sonido final subido por el usuario
    if (audioEnabled) {
      try {
        finaleAudio.currentTime = 0;
        finaleAudio.play().catch(e => console.log('Audio autoplay handled:', e));
      } catch (err) {
        console.log('Audio play error:', err);
      }
    }

    triggerHaptic('heavy');

    setTimeout(() => {
      portalFlash.classList.remove('flash-active');
    }, 450);

    // Iniciar sprite y vuelo del dragón
    dragonFlightStage.classList.remove('hidden');

    dragonAnimFrame = 1;
    clearInterval(dragonTimer);
    dragonTimer = setInterval(() => {
      dragonAnimFrame = (dragonAnimFrame % 10) + 1;
      dragonSprite.src = `assets/dragon/frame-${dragonAnimFrame}.png`;
    }, 95);

    animateDragonTrajectory();
  }

  function animateDragonTrajectory() {
    const startTime = performance.now();
    const duration = 12000;

    function frame(now) {
      const elapsed = now - startTime;
      const progress = (elapsed % duration) / duration;

      const xPct = 50 + Math.sin(progress * Math.PI * 2) * 36;
      const yPct = 34 + Math.cos(progress * Math.PI * 2 * 1.5) * 14;

      const velocityX = Math.cos(progress * Math.PI * 2);
      const angle = velocityX * 14;

      const scaleX = velocityX >= 0 ? 1 : -1;
      const scaleBase = 1.05 + Math.sin(progress * Math.PI * 4) * 0.12;

      dragonSprite.style.left = `${xPct}%`;
      dragonSprite.style.top = `${yPct}%`;
      dragonSprite.style.transform = `translate(-50%, -50%) scale(${scaleBase * scaleX}, ${scaleBase}) rotate(${angle}deg)`;

      if (Math.random() > 0.4) {
        spawnDragonTrail(xPct, yPct);
      }

      dragonTrajectoryId = requestAnimationFrame(frame);
    }

    dragonTrajectoryId = requestAnimationFrame(frame);
  }

  function spawnEggEnergyParticles() {
    const rect = eggContainer.getBoundingClientRect();
    const vRect = viewport.getBoundingClientRect();
    const cx = rect.left - vRect.left + rect.width / 2;
    const cy = rect.top - vRect.top + rect.height / 2;

    for (let i = 0; i < 24; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3.5 + 1.5;
      particles.push({
        x: cx,
        y: cy,
        speedX: Math.cos(angle) * speed,
        speedY: Math.sin(angle) * speed,
        size: Math.random() * 3.2 + 1.6,
        opacity: 1,
        life: 1,
        colorType: 'teal',
        update() {
          this.x += this.speedX;
          this.y += this.speedY;
          this.speedX *= 0.94;
          this.speedY *= 0.94;
          this.life -= 0.025;
          this.opacity = this.life;
        },
        draw() {
          if (this.life <= 0) return;
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(180, 255, 245, ${this.opacity})`;
          ctx.shadowColor = 'rgba(100, 245, 226, 0.95)';
          ctx.shadowBlur = 10;
          ctx.fill();
        }
      });
    }
  }

  function spawnDragonTrail(pctX, pctY) {
    const vW = viewport.clientWidth;
    const vH = viewport.clientHeight;
    const x = (pctX / 100) * vW + (Math.random() - 0.5) * 30;
    const y = (pctY / 100) * vH + (Math.random() - 0.5) * 20;

    particles.push({
      x: x,
      y: y,
      speedX: (Math.random() - 0.5) * 0.8,
      speedY: Math.random() * 0.8 + 0.3,
      size: Math.random() * 2.8 + 1.2,
      opacity: 0.9,
      life: 1,
      colorType: Math.random() > 0.4 ? 'teal' : 'amber',
      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life -= 0.035;
        this.opacity = this.life;
      },
      draw() {
        if (this.life <= 0) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        if (this.colorType === 'teal') {
          ctx.fillStyle = `rgba(160, 255, 242, ${this.opacity})`;
          ctx.shadowColor = 'rgba(100, 245, 226, 0.9)';
        } else {
          ctx.fillStyle = `rgba(255, 215, 120, ${this.opacity})`;
          ctx.shadowColor = 'rgba(255, 200, 80, 0.85)';
        }
        ctx.shadowBlur = 8;
        ctx.fill();
      }
    });
  }

  // --- 11. EVENT LISTENERS ---
  actionBtn.addEventListener('click', (e) => {
    createRipple(e, actionBtn);
    transitionToTrigaia();
  });

  hotspots.forEach(hotspot => {
    hotspot.addEventListener('click', (e) => {
      e.stopPropagation();
      createRipple(e, hotspot);
      const runeKey = hotspot.dataset.rune;
      if (runeKey === 'center') {
        transitionToTrigaia();
      } else if (runeKey) {
        setRune(runeKey);
      }
    });
  });

  // Click en el HUEVO o en la BARRA DE CARGA para cargarlo paso a paso
  eggContainer.addEventListener('click', handleEggChargeClick);
  chargeBarContainer.addEventListener('click', handleEggChargeClick);

  scrollForm.addEventListener('submit', (e) => {
    e.preventDefault();
    validateAncestralWord();
  });

  ancestralInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      validateAncestralWord();
    }
  });

  ancestralInput.addEventListener('input', () => {
    scrollFeedback.classList.remove('visible');
  });

  scrollCloseBtn.addEventListener('click', () => {
    closeScrollModal();
  });

  // Botón Volver al Menú Principal (Escena 1)
  btnBackScene1.addEventListener('click', () => {
    transitionToScene1();
  });

  // Botón de alternar sonido
  if (soundToggleBtn) {
    soundToggleBtn.addEventListener('click', () => {
      audioEnabled = !audioEnabled;
      soundToggleBtn.classList.toggle('muted', !audioEnabled);
      if (!audioEnabled) {
        try { finaleAudio.pause(); } catch (e) {}
      } else {
        initAudio();
        if (isDragonFlying) {
          try { finaleAudio.play().catch(e => {}); } catch (e) {}
        } else {
          playMagicalChime(440, false);
        }
      }
    });
  }

  // Swipe in Scene 1
  let touchStartX = 0;
  let touchStartY = 0;
  altarContainer.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  altarContainer.addEventListener('touchend', (e) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    const deltaY = e.changedTouches[0].clientY - touchStartY;

    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4) {
      const currentIndex = RUNE_KEYS.indexOf(currentState);
      if (deltaX < 0) {
        const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % RUNE_KEYS.length;
        setRune(RUNE_KEYS[nextIndex]);
      } else {
        const prevIndex = currentIndex <= 0 ? RUNE_KEYS.length - 1 : currentIndex - 1;
        setRune(RUNE_KEYS[prevIndex]);
      }
    }
  }, { passive: true });

  // --- 12. 60FPS AMBIENT CANVAS & PARTICLES ---
  let ctx = canvas.getContext('2d');
  let width, height;
  const particles = [];
  const PARTICLE_COUNT = 30;

  function resizeCanvas() {
    width = canvas.width = viewport.clientWidth;
    height = canvas.height = viewport.clientHeight;
  }
  window.addEventListener('resize', resizeCanvas);

  class Mote {
    constructor() {
      this.reset(true);
    }

    reset(initial = false) {
      this.x = Math.random() * width;
      this.y = initial ? Math.random() * height : height + 10;
      this.size = Math.random() * 2.2 + 1.1;
      this.speedY = -(Math.random() * 0.42 + 0.14);
      this.speedX = (Math.random() - 0.5) * 0.35;
      this.opacity = Math.random() * 0.55 + 0.2;
      this.pulseSpeed = Math.random() * 0.03 + 0.01;
      this.pulse = Math.random() * Math.PI;
      this.colorType = Math.random() > 0.35 ? 'amber' : 'teal';
    }

    update() {
      this.y += this.speedY;
      this.x += this.speedX + Math.sin(this.pulse) * 0.2;
      this.pulse += this.pulseSpeed;

      if (this.y < -10 || this.x < -10 || this.x > width + 10) {
        this.reset();
      }
    }

    draw() {
      const alpha = this.opacity * (0.6 + 0.4 * Math.sin(this.pulse));
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);

      if (this.colorType === 'teal') {
        ctx.fillStyle = `rgba(100, 233, 214, ${alpha})`;
        ctx.shadowColor = 'rgba(100, 233, 214, 0.7)';
      } else {
        ctx.fillStyle = `rgba(245, 176, 65, ${alpha})`;
        ctx.shadowColor = 'rgba(245, 176, 65, 0.6)';
      }
      ctx.shadowBlur = 5;
      ctx.fill();
    }
  }

  function spawnRuneBurst(runeKey) {
    const hotspot = document.querySelector(`.hotspot-${runeKey}`);
    if (!hotspot) return;
    const rect = hotspot.getBoundingClientRect();
    const vRect = viewport.getBoundingClientRect();
    const targetX = rect.left - vRect.left + rect.width / 2;
    const targetY = rect.top - vRect.top + rect.height / 2;

    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3.2 + 1.2;
      particles.push({
        x: targetX,
        y: targetY,
        speedX: Math.cos(angle) * speed,
        speedY: Math.sin(angle) * speed,
        size: Math.random() * 2.8 + 1.4,
        opacity: 0.9,
        life: 1,
        colorType: 'teal',
        update() {
          this.x += this.speedX;
          this.y += this.speedY;
          this.speedX *= 0.93;
          this.speedY *= 0.93;
          this.life -= 0.024;
          this.opacity = this.life;
        },
        draw() {
          if (this.life <= 0) return;
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(180, 255, 245, ${this.opacity})`;
          ctx.shadowColor = 'rgba(100, 245, 226, 0.95)';
          ctx.shadowBlur = 8;
          ctx.fill();
        }
      });
    }
  }

  function initParticles() {
    resizeCanvas();
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(new Mote());
    }

    function animate() {
      ctx.clearRect(0, 0, width, height);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update();
        p.draw();
        if (p.life !== undefined && p.life <= 0) {
          particles.splice(i, 1);
        }
      }

      requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  }

  // Initialize
  document.addEventListener('DOMContentLoaded', () => {
    initParticles();
    setRune('none');
    actionBtn.classList.add('pulsing');
  });

})();
