// ===== 开屏画面控制 =====
class SplashScreen {
  constructor() {
    this.splash = document.getElementById('splashScreen');
    this.progressBar = document.getElementById('splashProgressBar');
    this.statusText = document.getElementById('splashStatus');
    this.skipBtn = document.getElementById('splashSkip');
    this.particlesCanvas = document.getElementById('splashParticles');
    this.progress = 0;
    this.particles = [];
    this.animationId = null;
    this.init();
  }

  init() {
    this.initParticles();
    if (this.skipBtn) {
      this.skipBtn.addEventListener('click', () => this.finish());
    }
    this.startLoading();
    this.animateParticles();
  }

  initParticles() {
    if (!this.particlesCanvas) return;
    const ctx = this.particlesCanvas.getContext('2d');
    this.particlesCanvas.width = window.innerWidth;
    this.particlesCanvas.height = window.innerHeight;
    for (let i = 0; i < 60; i++) {
      this.particles.push({
        x: Math.random() * this.particlesCanvas.width,
        y: Math.random() * this.particlesCanvas.height,
        size: Math.random() * 3 + 1,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.5) * 0.5,
        color: Math.random() > 0.5 ? '#FE2C55' : '#25F4EE',
        opacity: Math.random() * 0.5 + 0.2
      });
    }
  }

  animateParticles() {
    if (!this.particlesCanvas) return;
    const ctx = this.particlesCanvas.getContext('2d');
    ctx.clearRect(0, 0, this.particlesCanvas.width, this.particlesCanvas.height);

    this.particles.forEach(p => {
      p.x += p.speedX;
      p.y += p.speedY;
      if (p.x < 0 || p.x > this.particlesCanvas.width) p.speedX *= -1;
      if (p.y < 0 || p.y > this.particlesCanvas.height) p.speedY *= -1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.opacity;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
      gradient.addColorStop(0, p.color);
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.globalAlpha = p.opacity * 0.3;
      ctx.fill();
    });

    ctx.globalAlpha = 1;
    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const dx = this.particles[i].x - this.particles[j].x;
        const dy = this.particles[i].y - this.particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(this.particles[i].x, this.particles[i].y);
          ctx.lineTo(this.particles[j].x, this.particles[j].y);
          ctx.strokeStyle = this.particles[i].color;
          ctx.globalAlpha = (1 - dist / 120) * 0.15;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
    this.animationId = requestAnimationFrame(() => this.animateParticles());
  }

  startLoading() {
    const stages = [
      { progress: 15, status: '正在初始化...', duration: 400 },
      { progress: 30, status: '加载核心模块...', duration: 500 },
      { progress: 45, status: '检查 Java 环境...', duration: 400 },
      { progress: 60, status: '加载版本列表...', duration: 500 },
      { progress: 75, status: '初始化模组中心...', duration: 400 },
      { progress: 85, status: '启动 AI 引擎...', duration: 500 },
      { progress: 95, status: '准备就绪...', duration: 300 },
      { progress: 100, status: '欢迎使用 MAL', duration: 400 }
    ];

    let currentStage = 0;
    const runStage = () => {
      if (currentStage >= stages.length) {
        setTimeout(() => this.finish(), 500);
        return;
      }
      const stage = stages[currentStage];
      this.animateProgress(stage.progress, stage.duration);
      this.statusText.textContent = stage.status;
      currentStage++;
      setTimeout(runStage, stage.duration + 100);
    };
    setTimeout(runStage, 500);
  }

  animateProgress(target, duration) {
    const start = this.progress;
    const change = target - start;
    const startTime = performance.now();
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      this.progress = start + change * easeProgress;
      this.progressBar.style.width = this.progress + '%';
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }

  finish() {
    if (this.splash.classList.contains('fade-out')) return;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.splash.classList.add('fade-out');
    setTimeout(() => {
      this.splash.style.display = 'none';
      const mainApp = document.getElementById('mainApp');
      if (mainApp) {
        mainApp.classList.remove('hidden');
      }
    }, 600);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new SplashScreen();
});
