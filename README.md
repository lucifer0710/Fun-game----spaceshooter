# 🚀 Space Shooter  
[![Made With JavaScript](https://img.shields.io/badge/Made%20With-JavaScript-F7DF1E?logo=javascript&logoColor=black)]()  
[![HTML5 Canvas](https://img.shields.io/badge/HTML5-Canvas-E34F26?logo=html5&logoColor=white)]()  
[![CSS3 Styled](https://img.shields.io/badge/Styled%20With-CSS3-1572B6?logo=css3&logoColor=white)]()   
[![Status](https://img.shields.io/badge/Status-Active-brightgreen)]()

A fast-paced arcade space shooter built with vanilla JavaScript and HTML5 Canvas. Battle waves of alien enemies, collect power-ups, and face off against massive dreadnought bosses!

## 🎮 Features

- **Intense Combat**: Smooth shooting mechanics with player-fired bullets and enemy projectiles
- **Enemy Variety**: Face small agile fighters and medium-sized ships with tracking weapons
- **Epic Boss Battles**: Encounter massive dreadnoughts every 500 points with increasing difficulty
- **Power-Up System**: 
  - ✚ **Heal** - Restore 30 hull integrity
  - 🛡️ **Shield** - Temporary invulnerability
  - ⚡ **Rapid Fire** - Increased fire rate with spread shots
- **Dynamic Audio**: Procedurally generated sound effects using Web Audio API
- **Visual Effects**: Particle systems, screen shake, explosions, and animated UI messages
- **Progressive Difficulty**: Boss health scales with your score

## 🕹️ Controls

- **Arrow Keys**: Move your ship
- **Spacebar**: Fire weapons
- **Mouse**: Navigate menus

## 🎯 Gameplay

- Destroy enemies to earn points
- Every 500 points triggers a boss encounter
- Avoid enemy fire and collisions
- Collect power-ups dropped by destroyed enemies
- Survive as long as possible and maximize your score

## 📦 File Structure

```
space-shooter/
│
├── index.html          # Main HTML structure
├── style.css           # All styling and animations
├── game.js             # Complete game engine and logic
└── README.md           # This file
```

## 🚀 Getting Started

1. **Clone or download** the repository
2. **Open `index.html`** in a modern web browser
3. **Click "INITIALIZE"** to start playing
4. Use arrow keys to move and spacebar to shoot

No build process or dependencies required - just open and play!

## 🎨 Technical Highlights

- Pure vanilla JavaScript (no frameworks)
- HTML5 Canvas rendering with custom sprite drawing
- Web Audio API for dynamic sound generation
- Smooth 60 FPS gameplay loop
- Collision detection system
- Particle and visual effects engine
- Responsive HUD with animated health bars

## 🎵 Audio System

All sound effects are generated in real-time using the Web Audio API:
- **Shoot**: Triangle wave with frequency sweep
- **Enemy Fire**: Sawtooth wave descent
- **Explosions**: Filtered white noise
- **Power-ups**: Ascending sine wave

## 🏆 Scoring

- Small Fighter: **20 points**
- Medium Ship: **50 points**
- Dreadnought Boss: **100 points**

## 🛠️ Browser Compatibility

Tested and working in:
- Chrome/Edge (recommended)
- Firefox
- Safari

Requires a browser with HTML5 Canvas and Web Audio API support.

---
**Enjoy the game and aim for the high score! 🌟**
