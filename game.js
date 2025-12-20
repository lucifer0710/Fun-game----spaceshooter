// === AUDIO SYSTEM ===
const AudioSys = {
  ctx: null,
  init() { if(!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); },
  play(id) {
    if(!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const comp = this.ctx.createDynamicsCompressor();
    comp.connect(this.ctx.destination);
    gain.connect(comp);

    if(id === 'shoot') {
      osc.type = 'triangle'; osc.frequency.setValueAtTime(800, t);
      osc.frequency.exponentialRampToValueAtTime(100, t+0.1);
      gain.gain.setValueAtTime(0.05, t); gain.gain.linearRampToValueAtTime(0, t+0.1);
      osc.connect(gain); osc.start(t); osc.stop(t+0.1);
    } else if(id === 'enemyShoot') {
      osc.type = 'sawtooth'; osc.frequency.setValueAtTime(300, t);
      osc.frequency.linearRampToValueAtTime(50, t+0.2);
      gain.gain.setValueAtTime(0.05, t); gain.gain.linearRampToValueAtTime(0, t+0.2);
      osc.connect(gain); osc.start(t); osc.stop(t+0.2);
    } else if(id === 'explode') {
      const buf = this.ctx.createBuffer(1, this.ctx.sampleRate*0.5, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
      const src = this.ctx.createBufferSource(); src.buffer = buf;
      const f = this.ctx.createBiquadFilter(); f.type='lowpass'; f.frequency.value=800;
      src.connect(f); f.connect(gain);
      gain.gain.setValueAtTime(0.3, t); gain.gain.exponentialRampToValueAtTime(0.01, t+0.4);
      src.start(t);
    } else if(id === 'powerup') {
      osc.type='sine'; osc.frequency.setValueAtTime(600, t); osc.frequency.linearRampToValueAtTime(1200, t+0.2);
      gain.gain.setValueAtTime(0.1, t); gain.gain.linearRampToValueAtTime(0, t+0.2);
      osc.connect(gain); osc.start(t); osc.stop(t+0.2);
    }
  }
};

// === GAME ENGINE ===
const cvs = document.getElementById('gameCanvas');
const ctx = cvs.getContext('2d');
const W = cvs.width;
const H = cvs.height;

const Game = {
  active: false,
  score: 0,
  nextBoss: 500,
  frames: 0,
  shake: 0,
  
  player: null,
  bullets: [],
  eBullets: [],
  enemies: [],
  powerups: [],
  parts: [],
  stars: [],
  boss: null,
  
  keys: {},

  start() {
    AudioSys.init();
    if(AudioSys.ctx && AudioSys.ctx.state === 'suspended') AudioSys.ctx.resume();
    
    this.active = true;
    this.score = 0;
    this.nextBoss = 500;
    this.frames = 0;
    
    this.player = { 
      x: W/2, y: H-100, w: 50, h: 60, 
      hp: 100, maxHp: 100, 
      vx: 0, vy: 0, 
      shootT: 0, iframes: 0,
      shield: 0, fireMod: 0
    };

    this.bullets=[]; this.eBullets=[]; this.enemies=[]; this.powerups=[]; this.parts=[]; this.boss=null;
    this.initStars();
    
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('gameOverScreen').classList.add('hidden');
    document.getElementById('bossHud').style.opacity = 0;
    document.getElementById('warningLayer').style.display = 'none';
    
    window.onkeydown = e => this.keys[e.code] = true;
    window.onkeyup = e => this.keys[e.code] = false;
    
    this.loop();
  },

  initStars() {
    this.stars = [];
    for(let i=0; i<100; i++) this.stars.push({x:Math.random()*W, y:Math.random()*H, s:Math.random()*2+0.5, a:Math.random()});
  },

  loop() {
    if(!this.active) return;
    this.update();
    this.draw();
    requestAnimationFrame(() => this.loop());
  },

  update() {
    this.frames++;
    const p = this.player;

    // Player Move
    if(this.keys['ArrowLeft']) p.vx -= 1;
    if(this.keys['ArrowRight']) p.vx += 1;
    if(this.keys['ArrowUp']) p.vy -= 1;
    if(this.keys['ArrowDown']) p.vy += 1;
    p.vx *= 0.92; p.vy *= 0.92;
    p.x = Math.max(30, Math.min(W-30, p.x + p.vx));
    p.y = Math.max(50, Math.min(H-50, p.y + p.vy));

    // Timers
    if(p.shootT > 0) p.shootT--;
    if(p.iframes > 0) p.iframes--;
    if(p.shield > 0) p.shield--;
    if(p.fireMod > 0) p.fireMod--;
    if(this.shake > 0) this.shake--;

    // Shoot
    if(this.keys['Space'] && p.shootT <= 0) {
      AudioSys.play('shoot');
      const rate = p.fireMod > 0 ? 3 : 7;
      p.shootT = rate;
      this.bullets.push({x:p.x, y:p.y-30, vx:0, vy:-15, c:'#38bdf8', w:4, h:20});
      if(p.fireMod>0) {
        this.bullets.push({x:p.x-15, y:p.y-10, vx:-1, vy:-14, c:'#38bdf8', w:3, h:15});
        this.bullets.push({x:p.x+15, y:p.y-10, vx:1, vy:-14, c:'#38bdf8', w:3, h:15});
      }
    }

    // Spawning
    if(!this.boss && this.score >= this.nextBoss) this.spawnBoss();
    
    if(!this.boss) {
      if(this.frames % 45 === 0) this.spawnEnemy('small');
      
      // Limit Medium ships to 2 on screen
      if(this.frames % 80 === 0) {
        const medCount = this.enemies.filter(e => e.type === 'medium').length;
        if(medCount < 2) this.spawnEnemy('medium');
      }
    }

    // Updates
    this.updateEntities();
    this.checkCollisions();
    this.updateUI();
  },

  spawnBoss() {
    this.enemies.forEach(e => this.explode(e.x, e.y, '#ef4444'));
    this.enemies = [];
    document.getElementById('bossHud').style.opacity = 1;
    document.getElementById('warningLayer').style.display = 'block';
    this.spawnMsg("DREADNOUGHT DETECTED", "#ef4444");
    this.boss = {
      x: W/2, y: -200, w: 260, h: 220,
      hp: 1500 + this.score, maxHp: 1500 + this.score,
      state: 'enter', vx: 2, shootT: 0, flash: 0
    };
  },

  spawnEnemy(type) {
    if(type === 'small') {
      this.enemies.push({
        type: 'small', x: Math.random()*(W-60)+30, y: -50,
        w: 40, h: 40, hp: 3, vx: (Math.random()-0.5)*4, vy: 5,
        flash: 0, score: 20
      });
    } else {
      this.enemies.push({
        type: 'medium', x: Math.random()*(W-100)+50, y: -80,
        w: 70, h: 70, hp: 12, vx: (Math.random()-0.5), vy: 2,
        flash: 0, score: 50, shootT: 0
      });
    }
  },

  updateEntities() {
    this.stars.forEach(s => {
      s.y += s.s * (this.boss ? 4 : 1);
      if(s.y > H) { s.y = 0; s.x = Math.random()*W; }
    });

    this.bullets.forEach(b => { b.x+=b.vx; b.y+=b.vy; });
    this.bullets = this.bullets.filter(b => b.y > -50);
    this.eBullets.forEach(b => { b.x+=b.vx; b.y+=b.vy; });
    this.eBullets = this.eBullets.filter(b => b.y < H+50);

    this.enemies.forEach(e => {
      e.x+=e.vx; e.y+=e.vy; if(e.flash>0)e.flash--;
      if(e.x<30||e.x>W-30)e.vx*=-1;
      
      if(e.type === 'medium') {
        e.shootT++;
        if(e.shootT > 100) {
          e.shootT=0; AudioSys.play('enemyShoot');
          const dx=this.player.x-e.x, dy=this.player.y-e.y, dist=Math.sqrt(dx*dx+dy*dy);
          this.eBullets.push({x:e.x, y:e.y+30, vx:(dx/dist)*5, vy:(dy/dist)*5, c:'#f59e0b', s:6});
        }
      }
    });
    this.enemies = this.enemies.filter(e => e.y < H+100 && e.hp > 0);

    if(this.boss) {
      const b = this.boss;
      if(b.flash>0) b.flash--;
      if(b.state==='enter') { b.y+=1.5; if(b.y>150) b.state='fight'; }
      else {
        b.x+=b.vx; if(b.x<150||b.x>W-150) b.vx*=-1;
        b.shootT++;
        if(b.shootT > 45) {
          b.shootT=0; AudioSys.play('enemyShoot');
          for(let i=-1; i<=1; i++) this.eBullets.push({x:b.x+i*60, y:b.y+80, vx:i*1.5, vy:7, c:'#ef4444', s:8});
        }
      }
    }

    this.powerups.forEach(p => p.y+=2);
    this.powerups = this.powerups.filter(p => p.y < H+50);
    this.parts.forEach(p => { p.x+=p.vx; p.y+=p.vy; p.life--; });
    this.parts = this.parts.filter(p => p.life > 0);
  },

  checkCollisions() {
    const p = this.player;

    // Bullets hit Enemies
    this.bullets.forEach(b => {
      if(b.dead) return;
      this.enemies.forEach(e => {
        if(this.rect(b, e)) {
          e.hp--; e.flash=2; b.dead=true; this.sparks(b.x, b.y, '#fff');
          if(e.hp<=0) this.kill(e);
        }
      });
      if(this.boss && this.rect(b, this.boss)) {
        this.boss.hp-=10; this.boss.flash=2; b.dead=true; this.sparks(b.x, b.y, '#ef4444');
      }
    });
    this.bullets = this.bullets.filter(b => !b.dead);

    // Boss Death
    if(this.boss && this.boss.hp <= 0) {
      this.explode(this.boss.x, this.boss.y, '#ef4444', 60);
      this.boss=null; this.score+=100; this.nextBoss=this.score+500;
      document.getElementById('bossHud').style.opacity=0;
      document.getElementById('warningLayer').style.display='none';
      this.spawnMsg("DREADNOUGHT DESTROYED", '#22c55e');
      p.hp = Math.min(100, p.hp+50);
    }

    // Player hit
    if(p.iframes<=0 && p.shield<=0) {
      this.enemies.forEach(e => {
        if(this.rect(p, e)) { this.damage(20); e.hp=0; this.explode(e.x, e.y, '#f59e0b'); }
      });
      this.eBullets.forEach(b => {
        if(Math.hypot(p.x-b.x, p.y-b.y) < p.w/2) { this.damage(15); b.dead=true; }
      });
      this.eBullets = this.eBullets.filter(b => !b.dead);
    }

    // Powerups
    this.powerups.forEach((pu, i) => {
      if(Math.hypot(p.x-pu.x, p.y-pu.y)<35) {
        AudioSys.play('powerup');
        if(pu.type==='heal') { p.hp=Math.min(100, p.hp+30); this.spawnMsg("REPAIRED", pu.c); }
        if(pu.type==='shield') { p.shield=600; this.spawnMsg("SHIELDED", pu.c); }
        if(pu.type==='speed') { p.fireMod=300; this.spawnMsg("RAPID FIRE", pu.c); }
        this.powerups.splice(i,1);
      }
    });
  },

  kill(e) {
    this.score+=e.score; 
    this.explode(e.x, e.y, e.type==='medium'?'#f59e0b':'#ef4444');
    const chance = e.type === 'medium' ? 0.4 : 0.15;
    if(Math.random() < chance) {
      const t=['heal','shield','speed'][Math.floor(Math.random()*3)];
      const c = t==='heal'?'#22c55e':(t==='shield'?'#3b82f6':'#f59e0b');
      const s = t==='heal'?'✚':(t==='shield'?'🛡️':'⚡');
      this.powerups.push({x:e.x, y:e.y, type:t, c:c, s:s});
    }
  },

  damage(n) {
    AudioSys.play('explode'); p=this.player; p.hp-=n; p.iframes=40; this.shake=20;
    this.sparks(p.x, p.y, '#ef4444', 20);
    if(p.hp<=0) {
      this.active=false;
      document.getElementById('finalScore').innerText = this.score;
      document.getElementById('gameOverScreen').classList.remove('hidden');
    }
  },

  rect(r1, r2) {
    return r1.x < r2.x+r2.w/2 && r1.x+r1.w/2 > r2.x-r2.w/2 &&
           r1.y < r2.y+r2.h/2 && r1.y+r1.h/2 > r2.y-r2.h/2;
  },

  explode(x, y, c, n=15) {
    AudioSys.play('explode');
    for(let i=0;i<n;i++) this.parts.push({x:x, y:y, vx:(Math.random()-0.5)*8, vy:(Math.random()-0.5)*8, life:30+Math.random()*20, c:c, s:Math.random()*4});
  },
  
  sparks(x, y, c, n=5) {
    for(let i=0;i<n;i++) this.parts.push({x:x, y:y, vx:(Math.random()-0.5)*5, vy:(Math.random()-0.5)*5, life:10, c:c, s:1.5});
  },

  spawnMsg(t, c) {
    const el = document.createElement('div'); el.className='float-msg'; el.innerText=t; el.style.color=c;
    document.getElementById('gameContainer').appendChild(el); setTimeout(()=>el.remove(),1200);
  },

  updateUI() {
    document.getElementById('scoreVal').innerText = this.score;
    document.getElementById('nextBossVal').innerText = this.nextBoss;
    document.getElementById('hpFill').style.width = this.player.hp + '%';
    if(this.boss) document.getElementById('bossHpFill').style.width = (this.boss.hp/this.boss.maxHp*100)+'%';
  },

  // === RENDERING (Visuals from Image) ===
  draw() {
    ctx.fillStyle = '#050510'; ctx.fillRect(0,0,W,H);
    ctx.save();
    if(this.shake>0) ctx.translate((Math.random()-0.5)*this.shake, (Math.random()-0.5)*this.shake);

    // Stars
    this.stars.forEach(s => {
      ctx.fillStyle = `rgba(255,255,255,${s.a})`;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.s, 0, Math.PI*2); ctx.fill();
    });

    // Bullets
    this.bullets.forEach(b => {
      ctx.fillStyle = b.c; ctx.shadowBlur=10; ctx.shadowColor=b.c;
      ctx.fillRect(b.x-b.w/2, b.y, b.w, b.h); ctx.shadowBlur=0;
    });
    this.eBullets.forEach(b => {
      ctx.fillStyle = b.c; ctx.shadowBlur=10; ctx.shadowColor=b.c;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.s, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
    });

    // Powerups
    this.powerups.forEach(p => {
      ctx.shadowBlur=15; ctx.shadowColor=p.c; ctx.fillStyle=p.c;
      ctx.beginPath(); ctx.arc(p.x, p.y, 18, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
      ctx.fillStyle='#fff'; ctx.font="20px Arial"; ctx.textAlign="center"; ctx.fillText(p.s, p.x, p.y+7);
    });

    // Enemies
    this.enemies.forEach(e => {
      ctx.save(); ctx.translate(e.x, e.y);
      if(e.flash>0) ctx.filter = 'brightness(2)';

      if(e.type === 'small') {
        // Red/Yellow Fighter (Top Row, 2nd)
        // Wings (Red)
        const grad = ctx.createLinearGradient(-20, 0, 20, 0);
        grad.addColorStop(0, '#7f1d1d'); grad.addColorStop(0.5, '#ef4444'); grad.addColorStop(1, '#7f1d1d');
        ctx.fillStyle = grad;
        ctx.beginPath(); 
        ctx.moveTo(0, 20); ctx.lineTo(20, 0); ctx.lineTo(15, -10); 
        ctx.lineTo(0, -5); ctx.lineTo(-15, -10); ctx.lineTo(-20, 0); 
        ctx.closePath(); ctx.fill();
        // Yellow accents
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-5, 5); ctx.lineTo(-5, -5); ctx.fill();
        ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(5, 5); ctx.lineTo(5, -5); ctx.fill();
        // Cockpit
        ctx.fillStyle = '#3b82f6'; ctx.beginPath(); ctx.arc(0, -5, 3, 0, Math.PI*2); ctx.fill();
      } 
      else {
        // Yellow/Orange Round Ship (Middle Row, 2nd)
        // Main Body (Yellow/Gold)
        const grad = ctx.createRadialGradient(0, -5, 5, 0, 0, 35);
        grad.addColorStop(0, '#fcd34d'); grad.addColorStop(1, '#d97706');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(0, 0, 35, 0, Math.PI*2); ctx.fill();
        // Metal Ring
        ctx.strokeStyle = '#92400e'; ctx.lineWidth = 4; ctx.stroke();
        // Core
        ctx.fillStyle = '#0ea5e9'; ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI*2); ctx.fill();
        // Front Prongs
        ctx.fillStyle = '#b45309'; 
        ctx.fillRect(-25, 20, 10, 15); ctx.fillRect(15, 20, 10, 15);
      }
      ctx.restore();
    });

    // Boss (Red/Pink Alien Ship - Bottom Right)
    if(this.boss) {
      const b = this.boss;
      ctx.save(); ctx.translate(b.x, b.y);
      if(b.flash>0) ctx.filter='brightness(2)';
      
      const grad = ctx.createLinearGradient(0, -80, 0, 80);
      grad.addColorStop(0, '#831843'); grad.addColorStop(0.5, '#db2777'); grad.addColorStop(1, '#831843');
      ctx.fillStyle = grad;
      
      // Organic Shape
      ctx.beginPath();
      ctx.moveTo(0, 80); // Bottom tip
      ctx.bezierCurveTo(60, 60, 100, 0, 80, -60); // Right side
      ctx.bezierCurveTo(40, -40, -40, -40, -80, -60); // Top
      ctx.bezierCurveTo(-100, 0, -60, 60, 0, 80); // Left side
      ctx.fill();
      
      // Core (Glowing Red)
      ctx.shadowBlur=30; ctx.shadowColor='#f43f5e';
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(0, -20, 20, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;
      
      // Side Pods
      ctx.fillStyle='#500724';
      ctx.beginPath(); ctx.ellipse(-90, -20, 15, 30, 0, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(90, -20, 15, 30, 0, 0, Math.PI*2); ctx.fill();
      
      ctx.restore();
    }

    // Player (White/Blue Fighter - Top Right)
    const p = this.player;
    if(p.iframes % 6 < 3) {
      ctx.save(); ctx.translate(p.x, p.y);
      
      // Shield
      if(p.shield>0) {
        ctx.strokeStyle=`rgba(56, 189, 248, ${Math.random()*0.5+0.5})`;
        ctx.lineWidth=3; ctx.beginPath(); ctx.arc(0,0,45,0,Math.PI*2); ctx.stroke();
      }

      // Exhaust
      const fire = Math.random()*20+20;
      const fGrad = ctx.createLinearGradient(0, 25, 0, 25+fire);
      fGrad.addColorStop(0, '#0ea5e9'); fGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = fGrad;
      ctx.beginPath(); ctx.moveTo(-8, 25); ctx.lineTo(8, 25); ctx.lineTo(0, 25+fire); ctx.fill();

      // Wings (White/Grey)
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath(); 
      ctx.moveTo(0, 10);
      ctx.lineTo(25, 10); ctx.lineTo(25, -20); // R Wing
      ctx.lineTo(10, 0); 
      ctx.lineTo(-10, 0); 
      ctx.lineTo(-25, -20); ctx.lineTo(-25, 10); // L Wing
      ctx.closePath();
      ctx.fill();
      
      // Fuselage (White/Cyan)
      const bGrad = ctx.createLinearGradient(-10, 0, 10, 0);
      bGrad.addColorStop(0, '#cbd5e1'); bGrad.addColorStop(0.5, '#ffffff'); bGrad.addColorStop(1, '#cbd5e1');
      ctx.fillStyle = bGrad;
      ctx.beginPath(); ctx.moveTo(0, -35); ctx.lineTo(8, 20); ctx.lineTo(-8, 20); ctx.fill();
      
      // Cockpit (Blue Glass)
      ctx.fillStyle = '#06b6d4'; 
      ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(4, 5); ctx.lineTo(-4, 5); ctx.fill();

      ctx.restore();
    }

    // Particles
    this.parts.forEach(pt => {
      ctx.fillStyle=pt.c; ctx.globalAlpha=pt.life/30;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.s, 0, Math.PI*2); ctx.fill();
    });
    ctx.globalAlpha=1;
    ctx.restore();
  }
};