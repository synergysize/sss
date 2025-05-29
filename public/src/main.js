import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FlyControls } from 'three/examples/jsm/controls/FlyControls.js';
import { initializeData, fartcoinHolders, goatTokenHolders, sharedHolders } from './dataLoader.js';
import { sharedPoints, fartcoinPoints, goatTokenPoints, generateAllPoints } from './positionMapper.js';
import tooltipFix from './tooltipFix.js';
import WalletTooltip from './walletTooltip.js';
import directTooltipFix, { createTooltipIfMissing, showTooltip, hideTooltip, updateTooltipContent } from './directTooltipFix.js';

// V31 - Added emojis, enhanced starfield, and constellations
console.log("Starting 3D Blockchain Visualizer v33 with 💨 and 🐐 tokens");

// Create a point texture for better visibility
function createPointTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.9)');
  gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.7)');
  gradient.addColorStop(0.8, 'rgba(255, 255, 255, 0.3)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// Create the point sprite texture
const pointTexture = createPointTexture();

// Initialize the scene, camera, and renderer
const scene = new THREE.Scene();
// Increase far clipping plane to accommodate the larger visualization
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 50000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

// CRITICAL: Set renderer size before anything else
renderer.setSize(window.innerWidth, window.innerHeight);
// Limit pixel ratio for better performance with 200 points per node
const limitedPixelRatio = Math.min(window.devicePixelRatio, 1.5);
renderer.setPixelRatio(limitedPixelRatio);
document.body.appendChild(renderer.domElement);

// Set background color to deep space blue
scene.background = new THREE.Color(0x000815);

// Add strong lighting for better visibility
const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
scene.add(ambientLight);

// Add version display in top-right corner
const versionDisplay = document.createElement('div');
versionDisplay.style.position = 'absolute';
versionDisplay.style.top = '10px';
versionDisplay.style.right = '10px';
versionDisplay.style.color = 'white';
versionDisplay.style.opacity = '0.3';
versionDisplay.style.fontSize = '16px';
versionDisplay.style.fontFamily = 'Arial, sans-serif';
versionDisplay.innerHTML = 'v33';
document.body.appendChild(versionDisplay);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(1, 1, 1).normalize();
scene.add(directionalLight);

// Debug helpers removed for production

// Define boxCenter at global scope with a default value
let boxCenter = new THREE.Vector3(0, 0, 0);

// Setup raycaster for hover interactions with massively boosted threshold
const raycaster = new THREE.Raycaster();
// DEBUG v30: Even more dramatically increase the precision for sprites to ensure we can hit them
raycaster.params.Sprite = { threshold: 200 }; // Increased from 50 to 200 for extremely forgiving hover detection
raycaster.params.Points = { threshold: 20 }; // Increase Points threshold too just in case
console.log('DEBUG v30: Raycaster initialized with extremely high sprite threshold:', raycaster.params.Sprite.threshold);
const mouse = new THREE.Vector2();
let hoveredObject = null;
let hoveredOriginalScale = null;
let hoveredOriginalColor = null;
const hoverScaleFactor = 1.5; // How much to scale up on hover
const hoverBrightnessFactor = 1.3; // How much to brighten on hover

// We'll get the tooltip element with a delay to ensure DOM is ready
let tooltip = null;

// Function to get tooltip element using our direct fix
function getTooltipElement() {
  // Use the direct tooltip fix to create or get the tooltip
  tooltip = createTooltipIfMissing();
  console.log('Tooltip element found/created:', tooltip !== null);
  
  // Make sure tooltip is invisible initially but ready to be shown
  if (tooltip) {
    tooltip.style.display = 'none';
    tooltip.style.zIndex = '10000'; // Ensure high z-index
    tooltip.style.backgroundColor = 'rgba(0, 10, 30, 0.95)'; // Darker, more opaque background
    tooltip.style.border = '2px solid rgba(100, 200, 255, 0.8)'; // Brighter border
    tooltip.style.boxShadow = '0 0 15px rgba(0, 100, 255, 0.7)'; // Stronger glow effect
    console.log('Set tooltip to hidden initially with improved visibility settings');
  }
}

// Get tooltip immediately and also with a slight delay to ensure DOM is ready
getTooltipElement();
setTimeout(getTooltipElement, 500);

// Track mouse position for raycasting
function onMouseMove(event) {
  // Calculate mouse position in normalized device coordinates
  // (-1 to +1) for both components
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  
  // Debug: Log mouse coordinates occasionally
  if (Math.random() < 0.01) { // Only log 1% of events to avoid flooding
    console.log(`Mouse position: (${mouse.x.toFixed(2)}, ${mouse.y.toFixed(2)})`);
  }
  
  // Update tooltip position to follow mouse
  if (tooltip) {
    // Position tooltip with offset from cursor
    tooltip.style.left = (event.clientX + 15) + 'px';
    tooltip.style.top = (event.clientY + 15) + 'px';
    
    // If tooltip is visible, make sure it stays visible
    if (tooltip.style.display === 'block' && hoveredObject) {
      // Re-apply wallet data if available
      if (hoveredObject.userData && hoveredObject.userData.walletData) {
        updateTooltipContent(tooltip, hoveredObject.userData.walletData);
      }
    }
  } else {
    // Try to get tooltip again if not found
    console.warn('Tooltip element not found in the DOM during mouse move, recreating it');
    tooltip = createTooltipIfMissing();
  }
}

// Add mouse move listener
window.addEventListener('mousemove', onMouseMove, false);

// Create starfield background
function createStarfield() {
  // Create multiple star layers for a more immersive effect
  const starGroup = new THREE.Group();
  starGroup.name = 'enhancedStarfield';
  
  // Create distant background stars (larger count, smaller size)
  const bgGeometry = new THREE.BufferGeometry();
  const bgStarCount = 8000; // 4x more stars than before
  const bgPositions = new Float32Array(bgStarCount * 3);
  const bgSizes = new Float32Array(bgStarCount);
  const bgColors = new Float32Array(bgStarCount * 3);
  
  // Create background stars at random positions with varying colors
  for (let i = 0; i < bgStarCount; i++) {
    const i3 = i * 3;
    // Random position in a large sphere around the scene (360° coverage)
    const radius = 20000 + Math.random() * 10000; // More distant backdrop
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    
    bgPositions[i3] = radius * Math.sin(phi) * Math.cos(theta);
    bgPositions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    bgPositions[i3 + 2] = radius * Math.cos(phi);
    
    // Random sizes between 0.5 and 2.5 for background stars
    bgSizes[i] = 0.5 + Math.random() * 2;
    
    // Vary star colors between white, blue, and light purple
    const colorChoice = Math.random();
    if (colorChoice > 0.7) {
      // Bluish stars (30%)
      bgColors[i3] = 0.7 + Math.random() * 0.3; // R
      bgColors[i3 + 1] = 0.8 + Math.random() * 0.2; // G
      bgColors[i3 + 2] = 1.0; // B
    } else if (colorChoice > 0.4) {
      // Whitish stars (30%)
      bgColors[i3] = 0.9 + Math.random() * 0.1; // R
      bgColors[i3 + 1] = 0.9 + Math.random() * 0.1; // G
      bgColors[i3 + 2] = 0.9 + Math.random() * 0.1; // B
    } else {
      // Purple-ish stars (40%)
      bgColors[i3] = 0.7 + Math.random() * 0.3; // R
      bgColors[i3 + 1] = 0.4 + Math.random() * 0.3; // G
      bgColors[i3 + 2] = 0.9 + Math.random() * 0.1; // B
    }
  }
  
  bgGeometry.setAttribute('position', new THREE.BufferAttribute(bgPositions, 3));
  bgGeometry.setAttribute('size', new THREE.BufferAttribute(bgSizes, 1));
  bgGeometry.setAttribute('color', new THREE.BufferAttribute(bgColors, 3));
  
  // Background star material with colors
  const bgStarMaterial = new THREE.PointsMaterial({
    size: 2,
    transparent: true,
    opacity: 0.8,
    vertexColors: true,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending
  });
  
  // Create background stars and add to group
  const bgStars = new THREE.Points(bgGeometry, bgStarMaterial);
  bgStars.name = 'backgroundStars';
  starGroup.add(bgStars);
  
  // Create Milky Way galaxy band
  const galaxyGeometry = new THREE.BufferGeometry();
  const galaxyStarCount = 5000;
  const galaxyPositions = new Float32Array(galaxyStarCount * 3);
  const galaxySizes = new Float32Array(galaxyStarCount);
  const galaxyColors = new Float32Array(galaxyStarCount * 3);
  
  // Create a band that wraps around like a galaxy
  for (let i = 0; i < galaxyStarCount; i++) {
    const i3 = i * 3;
    
    // Create a disk-like distribution for the galaxy band
    const radius = 15000 + Math.random() * 7000;
    const theta = Math.random() * Math.PI * 2;
    
    // Add some thickness to the galactic plane
    const height = (Math.random() - 0.5) * 2000;
    
    galaxyPositions[i3] = radius * Math.cos(theta);
    galaxyPositions[i3 + 1] = height; // Small vertical spread
    galaxyPositions[i3 + 2] = radius * Math.sin(theta);
    
    // Larger sizes for galaxy dust
    galaxySizes[i] = 2 + Math.random() * 5;
    
    // Beautiful nebula colors: purples, blues and hints of teal
    const nebulaChoice = Math.random();
    if (nebulaChoice > 0.7) {
      // Purple hues
      galaxyColors[i3] = 0.6 + Math.random() * 0.3; // R
      galaxyColors[i3 + 1] = 0.3 + Math.random() * 0.2; // G
      galaxyColors[i3 + 2] = 0.8 + Math.random() * 0.2; // B
    } else if (nebulaChoice > 0.4) {
      // Blue hues
      galaxyColors[i3] = 0.2 + Math.random() * 0.2; // R
      galaxyColors[i3 + 1] = 0.4 + Math.random() * 0.3; // G
      galaxyColors[i3 + 2] = 0.8 + Math.random() * 0.2; // B
    } else {
      // Teal/cyan hues
      galaxyColors[i3] = 0.1 + Math.random() * 0.2; // R
      galaxyColors[i3 + 1] = 0.6 + Math.random() * 0.3; // G
      galaxyColors[i3 + 2] = 0.7 + Math.random() * 0.3; // B
    }
  }
  
  galaxyGeometry.setAttribute('position', new THREE.BufferAttribute(galaxyPositions, 3));
  galaxyGeometry.setAttribute('size', new THREE.BufferAttribute(galaxySizes, 1));
  galaxyGeometry.setAttribute('color', new THREE.BufferAttribute(galaxyColors, 3));
  
  // Galaxy material with soft glow
  const galaxyMaterial = new THREE.PointsMaterial({
    size: 3,
    transparent: true,
    opacity: 0.7,
    vertexColors: true,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending
  });
  
  // Create galaxy band and add to group
  const galaxyBand = new THREE.Points(galaxyGeometry, galaxyMaterial);
  galaxyBand.name = 'galaxyBand';
  starGroup.add(galaxyBand);
  
  // Add the starfield group to the scene
  scene.add(starGroup);
  
  // Create constellations (will be implemented in a separate function)
  createConstellations(starGroup);
  
  return starGroup;
}

// Create the abstract constellations
function createConstellations(starGroup) {
  // Create array to store all constellation groups
  const constellations = [];
  
  // Create several abstract geometric constellations at extreme distance
  const constellationTypes = [
    'triangle', 'square', 'pentagon', 'hexagon', 'circle'
  ];
  
  // Create constellations positioned all around the sky at extreme distance
  constellationTypes.forEach((type, index) => {
    // Create a constellation at an extreme distance
    const constellation = createAbstractConstellation(type, index);
    constellation.name = `constellation_${type}`;
    constellation.userData = { 
      isConstellation: true,
      constellationType: type,
      lastPulseTime: 0,
      shouldPulse: false,
      dimIntensity: 0.2 + Math.random() * 0.1, // Base dim intensity
      baseOpacity: 0.1 + Math.random() * 0.05,  // Base opacity when not pulsing
      twinkling: false
    };
    
    // Position constellations at extreme distances in different directions
    // Convert index to an angle for positioning
    const azimuth = (index / constellationTypes.length) * Math.PI * 2;
    const elevation = Math.random() * Math.PI - Math.PI/2;
    const distance = 1000000 + Math.random() * 500000; // Extreme distance
    
    // Convert spherical coordinates to cartesian
    constellation.position.set(
      distance * Math.cos(elevation) * Math.cos(azimuth),
      distance * Math.sin(elevation),
      distance * Math.cos(elevation) * Math.sin(azimuth)
    );
    
    starGroup.add(constellation);
    constellations.push(constellation);
  });
  
  // Schedule random twinkling for all constellations together
  setInterval(() => {
    // Only twinkle occasionally (10% chance every check)
    if (Math.random() > 0.9) { 
      // Make all constellations twinkle together
      constellations.forEach(constellation => {
        constellation.userData.shouldPulse = true;
        constellation.userData.lastPulseTime = 0;
      });
    }
  }, 12000); // Check every 12 seconds
}

// Create an abstract constellation
function createAbstractConstellation(type, index) {
  const group = new THREE.Group();
  
  // Number of stars in the constellation
  let numStars;
  let radius = 1000 + Math.random() * 500; // Base size of constellation pattern
  let starPositions = [];
  
  // Create different geometric patterns based on type
  switch(type) {
    case 'triangle':
      numStars = 3;
      for (let i = 0; i < numStars; i++) {
        const angle = (i / numStars) * Math.PI * 2;
        starPositions.push(new THREE.Vector3(
          radius * Math.cos(angle),
          radius * Math.sin(angle),
          0
        ));
      }
      // Add a center star
      starPositions.push(new THREE.Vector3(0, 0, 0));
      break;
      
    case 'square':
      numStars = 4;
      for (let i = 0; i < numStars; i++) {
        const angle = (i / numStars) * Math.PI * 2 + Math.PI/4;
        starPositions.push(new THREE.Vector3(
          radius * Math.cos(angle),
          radius * Math.sin(angle),
          0
        ));
      }
      // Add crossing lines
      starPositions.push(new THREE.Vector3(0, 0, 0));
      break;
      
    case 'pentagon':
      numStars = 5;
      for (let i = 0; i < numStars; i++) {
        const angle = (i / numStars) * Math.PI * 2 - Math.PI/2;
        starPositions.push(new THREE.Vector3(
          radius * Math.cos(angle),
          radius * Math.sin(angle),
          0
        ));
      }
      break;
      
    case 'hexagon':
      numStars = 6;
      for (let i = 0; i < numStars; i++) {
        const angle = (i / numStars) * Math.PI * 2;
        starPositions.push(new THREE.Vector3(
          radius * Math.cos(angle),
          radius * Math.sin(angle),
          0
        ));
      }
      break;
      
    case 'circle':
      numStars = 8;
      for (let i = 0; i < numStars; i++) {
        const angle = (i / numStars) * Math.PI * 2;
        starPositions.push(new THREE.Vector3(
          radius * Math.cos(angle),
          radius * Math.sin(angle),
          0
        ));
      }
      break;
      
    default:
      // Random star cluster as fallback
      numStars = 5 + Math.floor(Math.random() * 5);
      for (let i = 0; i < numStars; i++) {
        starPositions.push(new THREE.Vector3(
          (Math.random() - 0.5) * radius * 2,
          (Math.random() - 0.5) * radius * 2,
          (Math.random() - 0.5) * radius * 0.5
        ));
      }
  }
  
  // Generate random but appealing constellation color
  // Use color variations that look like real stars
  const colorChoices = [
    0xccffff, // Blue-white
    0xffffcc, // Yellow-white
    0xffddcc, // Orange-white
    0xffcccc, // Red-white
    0xccccff  // Blue-white (another shade)
  ];
  
  const constellationColor = colorChoices[index % colorChoices.length];
  
  // Create stars that appear very dim by default
  starPositions.forEach((position, i) => {
    // Make stars very small due to extreme distance
    const star = createBrightStar(constellationColor, 2 + Math.random() * 2);
    star.position.copy(position);
    
    // Make them very dim initially
    star.material.opacity = 0.15 + Math.random() * 0.1;
    
    star.userData = { 
      index: i, 
      isConstellationStar: true,
      baseOpacity: star.material.opacity, // Store the base opacity for animations
      baseSize: star.scale.x // Store the base size for animations
    };
    group.add(star);
  });
  
  // Create lines connecting the stars
  let lineConnections = [];
  
  // Create different line patterns based on type
  switch(type) {
    case 'triangle':
      lineConnections = [[0, 1], [1, 2], [2, 0], [0, 3], [1, 3], [2, 3]];
      break;
      
    case 'square':
      lineConnections = [[0, 1], [1, 2], [2, 3], [3, 0], [0, 2], [1, 3]];
      break;
      
    case 'pentagon':
      lineConnections = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0]];
      // Add some internal lines for visual interest
      if (Math.random() > 0.5) {
        lineConnections.push([0, 2], [0, 3]);
      } else {
        lineConnections.push([1, 3], [1, 4]);
      }
      break;
      
    case 'hexagon':
      lineConnections = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0]];
      // Add some internal lines for visual interest
      lineConnections.push([0, 3], [1, 4], [2, 5]);
      break;
      
    case 'circle':
      // Connect in a circle
      for (let i = 0; i < numStars; i++) {
        lineConnections.push([i, (i + 1) % numStars]);
      }
      // Add some cross lines for visual interest
      if (Math.random() > 0.5) {
        lineConnections.push([0, 4], [1, 5], [2, 6], [3, 7]);
      } else {
        lineConnections.push([0, 2], [2, 4], [4, 6], [6, 0]);
      }
      break;
      
    default:
      // Connect stars in a sequence plus some random connections
      for (let i = 0; i < numStars - 1; i++) {
        lineConnections.push([i, i + 1]);
      }
      // Add a few random connections
      for (let i = 0; i < Math.min(3, numStars - 2); i++) {
        const from = Math.floor(Math.random() * numStars);
        let to = Math.floor(Math.random() * numStars);
        // Ensure we don't connect a point to itself
        while (to === from) {
          to = Math.floor(Math.random() * numStars);
        }
        lineConnections.push([from, to]);
      }
  }
  
  // Create connecting lines (very dim)
  lineConnections.forEach(([fromIndex, toIndex]) => {
    // Make sure indexes are valid
    if (fromIndex < starPositions.length && toIndex < starPositions.length) {
      const from = starPositions[fromIndex];
      const to = starPositions[toIndex];
      
      // Create very dim connecting lines
      const lineMaterial = new THREE.LineBasicMaterial({ 
        color: constellationColor, 
        transparent: true, 
        opacity: 0.05, // Very dim
        blending: THREE.AdditiveBlending
      });
      
      const lineGeometry = new THREE.BufferGeometry().setFromPoints([from, to]);
      const line = new THREE.Line(lineGeometry, lineMaterial);
      line.userData = { 
        isConstellationLine: true,
        baseOpacity: 0.05 // Store the base opacity for animations
      };
      group.add(line);
    }
  });
  
  return group;
}



// Helper function to create a bright star
function createBrightStar(color = 0xffffff, size = 5) {
  const starMaterial = new THREE.SpriteMaterial({
    map: createStarTexture(),
    color: color,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending
  });
  
  const star = new THREE.Sprite(starMaterial);
  star.scale.set(size * 30, size * 30, 1); // Make stars bigger for constellations
  return star;
}

// Create a star-shaped texture for the constellation stars
function createStarTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  
  const context = canvas.getContext('2d');
  
  // Create a radial gradient for the star glow
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.1, 'rgba(255, 255, 255, 0.9)');
  gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.4)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  
  // Add a star shape in the center
  context.beginPath();
  for (let i = 0; i < 5; i++) {
    const outerRadius = 24;
    const innerRadius = 12;
    
    const outerX = 32 + outerRadius * Math.cos((i * 2 * Math.PI / 5) - Math.PI/2);
    const outerY = 32 + outerRadius * Math.sin((i * 2 * Math.PI / 5) - Math.PI/2);
    
    const innerX = 32 + innerRadius * Math.cos(((i + 0.5) * 2 * Math.PI / 5) - Math.PI/2);
    const innerY = 32 + innerRadius * Math.sin(((i + 0.5) * 2 * Math.PI / 5) - Math.PI/2);
    
    if (i === 0) {
      context.moveTo(outerX, outerY);
    } else {
      context.lineTo(outerX, outerY);
    }
    
    context.lineTo(innerX, innerY);
  }
  context.closePath();
  
  context.fillStyle = 'rgba(255, 255, 255, 0.9)';
  context.fill();
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// Create a glow texture for the constellation background
function createGlowTexture(size = 64, color = 'rgba(255, 255, 255, 0.5)') {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  
  const context = canvas.getContext('2d');
  
  // Create a radial gradient for the glow
  const gradient = context.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// Update constellation animations (twinkling effect)
function updateConstellationAnimations(delta) {
  // Find all constellations in the scene
  const constellations = [];
  
  // Find all objects with names starting with "constellation_"
  scene.traverse(object => {
    if (object.name && object.name.startsWith('constellation_')) {
      constellations.push(object);
    }
  });
  
  // Process each constellation's animation
  constellations.forEach(constellation => {
    if (constellation && constellation.userData.shouldPulse) {
      constellation.userData.lastPulseTime += delta;
      const pulseTime = constellation.userData.lastPulseTime;
      const pulseDuration = 2.0; // Shorter pulse duration for twinkling
      
      if (pulseTime <= pulseDuration) {
        // Calculate pulse intensity (peak at middle of duration)
        // Use sin wave for smooth pulsing
        const pulseIntensity = Math.sin((pulseTime / pulseDuration) * Math.PI);
        
        // Apply subtle twinkling effect to stars and lines
        constellation.children.forEach(child => {
          if (child.userData.isConstellationStar) {
            // Get the base values stored when the star was created
            const baseOpacity = child.userData.baseOpacity || 0.15;
            const baseSize = child.userData.baseSize || child.scale.x;
            
            // Increase brightness and slightly increase size of stars
            child.material.opacity = baseOpacity + (0.3 * pulseIntensity);
            
            // Extract the base color components
            const color = new THREE.Color(child.material.color.getHex());
            
            // Slightly adjust color to make it brighter
            child.material.color.setRGB(
              Math.min(1.0, color.r + 0.2 * pulseIntensity),
              Math.min(1.0, color.g + 0.2 * pulseIntensity),
              Math.min(1.0, color.b + 0.2 * pulseIntensity)
            );
            
            // Slightly increase size
            const pulseScale = baseSize * (1 + pulseIntensity * 0.3);
            child.scale.set(pulseScale, pulseScale, 1);
          } else if (child.userData.isConstellationLine) {
            // Get the base opacity stored when the line was created
            const baseOpacity = child.userData.baseOpacity || 0.05;
            
            // Increase opacity of connecting lines
            child.material.opacity = baseOpacity + (0.1 * pulseIntensity);
          }
        });
      } else {
        // Reset after pulse is complete
        constellation.userData.shouldPulse = false;
        
        // Reset all elements to their base state
        constellation.children.forEach(child => {
          if (child.userData.isConstellationStar) {
            // Reset to original opacity and size
            child.material.opacity = child.userData.baseOpacity || 0.15;
            const baseSize = child.userData.baseSize || child.scale.x;
            child.scale.set(baseSize, baseSize, 1);
            
            // Reset to original color
            const originalColor = new THREE.Color(child.material.color.getHex());
            child.material.color.set(originalColor);
          } else if (child.userData.isConstellationLine) {
            // Reset to original opacity
            child.material.opacity = child.userData.baseOpacity || 0.05;
          }
        });
        
        // Occasionally continue the twinkling with a short delay
        if (Math.random() > 0.7) {
          setTimeout(() => {
            constellation.userData.shouldPulse = true;
            constellation.userData.lastPulseTime = 0;
          }, 500 + Math.random() * 1000);
        }
      }
    }
  });
}

// Add starfield to the scene
const starfield = createStarfield();

// Create 3D tooltip for wallet data
const walletTooltip = new WalletTooltip(scene, camera);
console.log('3D wallet tooltip initialized');

// Initial camera setup - increased distance for better view of larger visualization
camera.position.set(0, 0, 5000); // Increased from 3000 to 5000 to fit the larger visualization
camera.lookAt(0, 0, 0);

// Detect if device is touch-based (mobile/tablet)
const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;

// Console element not needed in production
const consoleElement = document.getElementById('console');
if (consoleElement) {
  consoleElement.style.display = 'none';
}

// Initialize appropriate controls based on device type
let controls;
let controlType;
// Track shift key state for jetpack
let shiftKeyPressed = false;

// Add event listeners for shift key (for jetpack control)
window.addEventListener('keydown', function(event) {
  if (event.code === 'ShiftLeft') {
    shiftKeyPressed = true;
  }
});

window.addEventListener('keyup', function(event) {
  if (event.code === 'ShiftLeft') {
    shiftKeyPressed = false;
  }
});

try {
  if (isTouchDevice) {
    // Use OrbitControls for touch devices
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.rotateSpeed = 0.5;
    controls.screenSpacePanning = false;
    controls.minDistance = 1000; // Increased from 500 to 1000 for better viewing with more points
    controls.maxDistance = 50000; // Increased from 30000 to 50000 to match camera far clip plane
    controlType = 'Orbit';
    
    if (consoleElement) {
      consoleElement.innerHTML += '<p>Created OrbitControls for touch device</p>';
    }
  } else {
    // Use FlyControls for desktop
    controls = new FlyControls(camera, renderer.domElement);
    controls.movementSpeed = 400;  // Increased movement speed from 200 to 400
    controls.rollSpeed = Math.PI / 6;  // Set roll speed as specified
    controls.dragToLook = true;  // Mouse drag to look around
    controls.autoForward = false;  // Don't move forward automatically
    
    // Additional physics properties for desktop
    controls.velocity = new THREE.Vector3(0, 0, 0); // Current velocity vector
    controls.damping = 0.2; // Reduced damping for smoother inertia (was 0.5)
    controls.gravity = 0.5; // Half gravity for floating effect
    
    // Jetpack fuel system
    controls.jetpackFuel = 250; // Full tank = 250 units (2.5x the original 100)
    controls.jetpackMaxFuel = 250; // 2.5x the original maximum
    controls.jetpackActive = false;
    controls.jetpackEnabled = true; // Enabled when fuel > 0
    controls.jetpackRefillRate = 0.8; // Refill rate when not using jetpack
    controls.jetpackDrainRate = 1.2; // Drain rate when using jetpack
    controls.jetpackMinFuelToReactivate = 25; // Minimum fuel needed to reactivate (scaled up from 10)
    controls.jetpackBoostFactor = 2.5; // How much faster than normal speed
    
    // Show the fuel meter UI for desktop
    const fuelMeterContainer = document.getElementById('fuel-meter-container');
    if (fuelMeterContainer) {
      fuelMeterContainer.style.display = 'block';
      console.log('Fuel meter UI initialized for desktop controls');
    } else {
      console.error('Fuel meter container not found in the DOM');
    }
    
    controlType = 'Fly';
    
    if (consoleElement) {
      consoleElement.innerHTML += '<p>Created FlyControls for desktop</p>';
    }
  }
} catch (error) {
  console.error('Error creating controls:', error);
  if (consoleElement) {
    consoleElement.innerHTML += `<p style="color:red">Error creating controls: ${error.message}</p>`;
  }
}

// Set the target/lookAt point for OrbitControls
if (controlType === 'Orbit') {
  controls.target.set(0, 0, 0);
}

// Initial update
if (controlType === 'Fly') {
  const delta = 0.01; // Small initial delta for first update
  controls.update(delta);
} else {
  controls.update();
}

// Initialize and prepare visualization data
initializeData();
generateAllPoints();

// Make sure our tooltip fix is applied when the document is ready
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM fully loaded - ensuring tooltip is ready');
  tooltip = createTooltipIfMissing();
  console.log('Tooltip ready status:', tooltip !== null);
});

// Data verification - check that wallet data was loaded successfully
if (sharedPoints.length === 0 || fartcoinPoints.length === 0 || goatTokenPoints.length === 0) {
  console.error('ERROR: Missing wallet data for visualization!');
}

// Function to create a Level 2 cluster forming a hollow sphere around a Level 1 wallet
function createLevel2Cluster(parentPosition, parentScale, parentColor, parentWalletData) {
  // Create a group to hold the hollow spherical shell
  const sphericalShellGroup = new THREE.Group();
  
  // Create central parent node that will sit at the center of the sphere
  const centralNodeMaterial = new THREE.SpriteMaterial({
    map: pointTexture,
    color: parentColor, // Use parent color for visibility
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending
  });
  
  const centralNode = new THREE.Sprite(centralNodeMaterial);
  centralNode.scale.set(parentScale * 0.5, parentScale * 0.5, 1); // Make center node visible
  centralNode.position.set(0, 0, 0); // Center point of the sphere
  
  // Set userdata including the fact this is a parent node (Level 1 Wallet)
  centralNode.userData = { 
    isLevel1Wallet: true,
    walletData: parentWalletData
  };
  
  sphericalShellGroup.add(centralNode);
  
  // Define the number of wallet points to distribute on the sphere - increased to 200 per spec
  const numPoints = 200; // Increased from ~10-12 to 200 for full dataset visualization
  
  // Optimize hollow sphere size to prevent overlap between adjacent spheres
  const shellRadius = parentScale * 2.8; // Reduced from 3.0 to 2.8 to prevent sphere overlap
  // We're reducing the shell radius slightly while increasing parent node spacing,
  // which will result in distinct separation between the hollow spheres
  
  // Create evenly distributed points on the sphere surface using Fibonacci sphere distribution
  // This algorithm produces a more uniform distribution for larger point counts
  for (let i = 0; i < numPoints; i++) {
    // Use Fibonacci sphere distribution for perfectly even spacing across the sphere surface
    // This works better than previous approach for 200 points
    const phi = Math.acos(1 - 2 * (i + 0.5) / numPoints);
    const theta = Math.PI * 2 * i * (1 + Math.sqrt(5)); // Golden ratio-based angle
    
    // Convert spherical coordinates to Cartesian coordinates
    const x = shellRadius * Math.sin(phi) * Math.cos(theta);
    const z = shellRadius * Math.sin(phi) * Math.sin(theta);
    const yPos = shellRadius * Math.cos(phi);
    
    // Create wallet node material with adjusted opacity for larger point count
    const walletNodeMaterial = new THREE.SpriteMaterial({
      map: pointTexture,
      color: new THREE.Color(parentColor).lerp(new THREE.Color(0xffffff), 0.3), // Slightly lighter version
      transparent: true,
      opacity: 0.7, // Reduced from 0.8 to prevent visual crowding with 200 points
      blending: THREE.AdditiveBlending
    });
    
    // Create the wallet sprite
    const walletNode = new THREE.Sprite(walletNodeMaterial);
    const walletScale = parentScale * 0.18; // Further reduced from 0.2 to 0.18 for better differentiation between spheres
    walletNode.scale.set(walletScale, walletScale, 1);
    walletNode.position.set(x, yPos, z);
    
    // Add to shell group
    sphericalShellGroup.add(walletNode);
    
    // Store original position, wallet data, and set isLevel1Wallet=false to mark this as a child node
    walletNode.userData = {
      originalPosition: new THREE.Vector3(x, yPos, z),
      shellRadius: shellRadius,
      originalScale: walletScale,
      originalColor: walletNodeMaterial.color.getStyle(),
      isLevel1Wallet: false, // Explicitly mark as NOT a Level 1 wallet
      walletData: parentWalletData // Copy wallet data from parent
    };
  }
  
  // Position the entire shell group at parent position
  sphericalShellGroup.position.copy(parentPosition);
  
  return sphericalShellGroup;
}

// Function to create a wallet point cloud with sprites
function createWalletPointCloud(pointsArray, groupName, color = 0xffffff) {
  // Create a group to hold all sprites
  const group = new THREE.Group();
  group.name = groupName;
  
  // Check if we have valid points
  if (!pointsArray || pointsArray.length === 0) {
    console.error(`No points available for ${groupName}`);
    return group;
  }
  
  // Level 2 clusters container (for performance management)
  const level2Group = new THREE.Group();
  level2Group.name = `${groupName}_level2`;
  
  // Create a sprite for each point
  pointsArray.forEach((point, index) => {
    if (isNaN(point.x) || isNaN(point.y) || isNaN(point.z)) {
      console.warn(`Skipping invalid point at index ${index}`);
      return; // Skip invalid points
    }
    
    // Enhanced material with glow effect
    const material = new THREE.SpriteMaterial({
      map: pointTexture,
      color: point.color || color,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });
    
    const sprite = new THREE.Sprite(material);
    
    // Position the sprite
    sprite.position.set(point.x, point.y, point.z);
    
    // Calculate scale based on amount, with minimum scale to ensure visibility
    const baseScale = point.totalHolding ? (Math.log(point.totalHolding) * 10) : 200;
    const scale = Math.max(200, baseScale * 3);
    sprite.scale.set(scale, scale, 1);
    
    // Store wallet data in userData for raycasting and hover effects
    sprite.userData = { 
      isLevel1Wallet: true, 
      parentIndex: index,
      walletData: {
        address: point.address,
        fartAmount: point.fartAmount || 0,
        goatAmount: point.goatAmount || 0,
        totalHolding: point.totalHolding || 0,
        walletType: point.walletType || 'unknown'
      },
      originalScale: scale,
      originalColor: point.color
    };
    
    // Add to group
    group.add(sprite);
    
    // Add Level 2 clusters for each Level 1 wallet
    // Now supporting all parent nodes to handle the full dataset
    // For Fartcoin and Goat, we need to handle 1000+ points each, plus 76 shared
    const level2Cluster = createLevel2Cluster(
      sprite.position.clone(),
      scale,
      point.color || color,
      point.walletData || {  // Pass the wallet data to be shared with child nodes
        address: point.address,
        fartAmount: point.fartAmount || 0,
        goatAmount: point.goatAmount || 0
      }
    );
      
      // Store reference to parent for orbit animation
      level2Cluster.userData = { 
        parentIndex: index,
        shellRadius: scale * 2.8, // Adjusted from 3.0 to 2.8 to prevent hollow sphere overlap
        rotationSpeed: 0.05 + Math.random() * 0.10, // Reduced from 0.1-0.25 to 0.05-0.15 for smoother animation with 200 points
        parentSprite: sprite,
        rotationAxis: new THREE.Vector3(
          Math.random() - 0.5, 
          Math.random() - 0.5, 
          Math.random() - 0.5
        ).normalize(), // Random rotation axis for more interesting movement
        walletData: sprite.userData.walletData // Copy wallet data from parent
      };
      
      level2Group.add(level2Cluster);
  });
  
  // Add the main group to the scene
  scene.add(group);
  
  // Add the Level 2 clusters group to the scene
  scene.add(level2Group);
  
  return { mainGroup: group, level2Group: level2Group };
}

// Create all wallet point clouds
if (sharedPoints.length > 0 && fartcoinPoints.length > 0 && goatTokenPoints.length > 0) {
  // Create point clouds for each dataset with Level 2 recursion
  const sharedGroups = createWalletPointCloud(sharedPoints, 'sharedWallets', 0xffffff);
  const fartcoinGroups = createWalletPointCloud(fartcoinPoints, 'fartcoinWallets', 0x00ff00);
  const goatTokenGroups = createWalletPointCloud(goatTokenPoints, 'goatTokenWallets', 0x0000ff);
  
  // Extract main groups for bounding box calculation
  const sharedGroup = sharedGroups.mainGroup;
  const fartcoinGroup = fartcoinGroups.mainGroup;
  const goatTokenGroup = goatTokenGroups.mainGroup;
  
  // Store Level 2 groups for animation updates
  const level2Groups = [
    sharedGroups.level2Group,
    fartcoinGroups.level2Group,
    goatTokenGroups.level2Group
  ];
  
  // Calculate bounding box for camera positioning
  const boundingBox = new THREE.Box3();
  
  // Initialize with empty but valid volume
  boundingBox.set(
    new THREE.Vector3(-1, -1, -1),
    new THREE.Vector3(1, 1, 1)
  );
  
  // Function to safely add sprites to bounding box
  const addGroupToBoundingBox = (group) => {
    if (group && group.children && group.children.length > 0) {
      group.children.forEach(sprite => {
        if (sprite && sprite.position) {
          boundingBox.expandByPoint(sprite.position);
        }
      });
    }
  };
  
  // Add all wallet groups to the bounding box (only main Level 1 groups)
  addGroupToBoundingBox(sharedGroup);
  addGroupToBoundingBox(fartcoinGroup);
  addGroupToBoundingBox(goatTokenGroup);
  
  // Get bounding box center and size
  boxCenter = boundingBox.getCenter(new THREE.Vector3());
  const boxSize = boundingBox.getSize(new THREE.Vector3());
  
  // Ensure minimum dimensions
  const maxDim = Math.max(
    Math.max(1, boxSize.x),
    Math.max(1, boxSize.y),
    Math.max(1, boxSize.z)
  );
  
  // Calculate camera distance - increased to accommodate 200 points per node
  const cameraDistance = Math.max(5000, maxDim * 3.0);
  
  // Position the camera to fit the bounding box
  camera.position.set(
    boxCenter.x, 
    boxCenter.y + maxDim * 0.5,
    boxCenter.z + cameraDistance
  );
  
  // Look at the center of the wallet cloud
  camera.lookAt(boxCenter);
  
  // Update controls target for OrbitControls
  if (controlType === 'Orbit') {
    controls.target.copy(boxCenter);
    controls.update();
  } else if (controlType === 'Fly') {
    // For FlyControls, just make sure camera is looking at the target
    camera.lookAt(boxCenter);
    controls.update(0.01);
  }
  
  // Debug test spheres removed for production
  
} else {
  console.error('Error: Missing wallet data for visualization.');
}

// Update controls instructions based on detected control type
const controlsElement = document.getElementById('controls');
if (controlsElement) {
  if (controlType === 'Fly') {
    controlsElement.innerHTML = '<p>WASD to move, drag mouse to look around<br>HOLD LEFT SHIFT to activate jetpack boost</p>';
  } else {
    controlsElement.innerHTML = '<p>Drag to rotate, pinch to zoom</p>';
  }
}

// Handle window resize
window.addEventListener('resize', () => {
  // Update camera aspect
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  
  // Reset any active hover state on resize
  if (hoveredObject) {
    // Restore original scale
    hoveredObject.scale.set(
      hoveredObject.userData.originalScale, 
      hoveredObject.userData.originalScale, 
      1
    );
    
    // Restore original color
    if (hoveredObject.material) {
      hoveredObject.material.color.set(hoveredObject.userData.originalColor);
    }
    
    hoveredObject = null;
    
    // Hide tooltip using our direct fix
    if (tooltip) {
      hideTooltip(tooltip);
      console.log('HTML tooltip hidden with direct fix');
    }
  }
  
  // Check if device type changed (e.g., orientation change might affect detection)
  const currentIsTouchDevice = window.matchMedia('(pointer: coarse)').matches;
  const expectedControlType = currentIsTouchDevice ? 'Orbit' : 'Fly';
  
  // If control type doesn't match the current device type, reload to reinitialize
  if (controlType !== expectedControlType) {
    location.reload();
  }
});

// Render loop
const clock = new THREE.Clock();
clock.start(); // Explicitly start the clock
let frameCounter = 0;
const logInterval = 60;

// Store initial camera position and target for recovery
const initialCameraPosition = camera.position.clone();
const initialCameraTarget = boxCenter.clone();

function animate() {
  requestAnimationFrame(animate);
  
  const delta = clock.getDelta();
  
  // Animate constellation pulsing
  updateConstellationAnimations(delta);
  
  // Update 3D tooltip position
  walletTooltip.update();
  
  // Handle hover animation for better visibility
  if (hoveredObject && hoveredObject.userData.pulseAnimation) {
    hoveredObject.userData.pulseTime += delta;
    // More extreme pulsing - 5x to 8x original size
    const pulseScale = hoveredObject.userData.originalScale * (5 + Math.sin(hoveredObject.userData.pulseTime * 8) * 3);
    hoveredObject.scale.set(pulseScale, pulseScale, 1);
    
    // Also pulse the brightness with more extreme values and different color
    if (hoveredObject.material) {
      // Use bright yellow/white for maximum visibility
      const pulseIntensity = 1.5 + Math.sin(hoveredObject.userData.pulseTime * 8) * 0.5;
      hoveredObject.material.color.setRGB(
        1.0, // Always full red
        1.0, // Always full green
        Math.min(1, 0.7 + Math.sin(hoveredObject.userData.pulseTime * 16) * 0.3) // Pulsing blue
      );
    }
  }
  
  // Update controls based on control type
  if (controlType === 'Fly') {
    // Custom physics for FlyControls on desktop
    
    // Get keyboard state
    const moveForward = controls.moveState.forward > 0;
    // Use ShiftLeft instead of spacebar (which was mapped to moveState.up)
    const jetpackKeyPressed = shiftKeyPressed;
    
    // Update jetpack fuel
    const fuelLevelElement = document.getElementById('fuel-level');
    
    // Handle jetpack fuel logic
    if (jetpackKeyPressed && controls.jetpackEnabled && controls.jetpackFuel > 0) {
      // Only activate jetpack when Left Shift is held AND we have fuel
      controls.jetpackActive = true;
      
      // Drain fuel
      controls.jetpackFuel = Math.max(0, controls.jetpackFuel - controls.jetpackDrainRate * delta * 60);
      
      // Log jetpack activation
      if (frameCounter % logInterval === 0) {
        console.log(`Jetpack active: ${controls.jetpackActive}, Fuel: ${controls.jetpackFuel.toFixed(1)}/${controls.jetpackMaxFuel}`);
      }
      
      // Disable jetpack if fuel depleted
      if (controls.jetpackFuel <= 0) {
        controls.jetpackEnabled = false;
        controls.jetpackActive = false;
        console.log('Jetpack disabled: Out of fuel');
      }
    } else {
      // Deactivate jetpack when Left Shift is released
      if (controls.jetpackActive) {
        console.log('Jetpack deactivated');
      }
      controls.jetpackActive = false;
      
      // Recharge fuel when not using jetpack
      if (controls.jetpackFuel < controls.jetpackMaxFuel) {
        controls.jetpackFuel = Math.min(
          controls.jetpackMaxFuel, 
          controls.jetpackFuel + controls.jetpackRefillRate * delta * 60
        );
        
        // Log fuel recharge
        if (frameCounter % logInterval === 0) {
          console.log(`Recharging fuel: ${controls.jetpackFuel.toFixed(1)}/${controls.jetpackMaxFuel}`);
        }
        
        // Re-enable jetpack if fuel reaches minimum threshold
        if (!controls.jetpackEnabled && controls.jetpackFuel >= controls.jetpackMinFuelToReactivate) {
          controls.jetpackEnabled = true;
          console.log('Jetpack re-enabled: Sufficient fuel');
        }
      }
    }
    
    // Update fuel meter UI
    if (fuelLevelElement) {
      const fuelPercentage = (controls.jetpackFuel / controls.jetpackMaxFuel) * 100;
      fuelLevelElement.style.width = `${fuelPercentage}%`;
      
      // Change color based on fuel level
      if (fuelPercentage < 20) {
        fuelLevelElement.style.backgroundColor = '#cc2222'; // Red when low
      } else if (fuelPercentage < 50) {
        fuelLevelElement.style.backgroundColor = '#cccc22'; // Yellow when medium
      } else {
        fuelLevelElement.style.backgroundColor = '#22cc22'; // Green when high
      }
    }
    
    // Get the camera's forward direction
    const forwardVector = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    
    // Calculate movement from FlyControls' internal state
    let movement = new THREE.Vector3();
    
    // Apply standard FlyControls update for basic movement
    controls.update(delta);
    
    // Handle jetpack mechanics with spacebar
    if (controls.jetpackActive && controls.jetpackEnabled) {
      // Get the camera's forward direction for jetpack thrust
      const jetpackThrustVector = forwardVector.clone();
      
      // Apply strong forward thrust in the camera's direction when jetpack is active
      // Multiply by the boost factor to make it significantly faster
      const jetpackSpeed = controls.movementSpeed * controls.jetpackBoostFactor;
      movement.add(
        jetpackThrustVector.multiplyScalar(jetpackSpeed * delta)
      );
      
      // Debug logging for jetpack thrust
      if (frameCounter % logInterval === 0) {
        console.log(`Applying jetpack thrust: speed=${jetpackSpeed}, direction=(${jetpackThrustVector.x.toFixed(2)}, ${jetpackThrustVector.y.toFixed(2)}, ${jetpackThrustVector.z.toFixed(2)})`);
      }
    }
    
    // Apply momentum and damping for zero-gravity drift
    // Only apply normal WASD movement if jetpack is not active
    if (!controls.jetpackActive && (
        controls.moveState.forward || controls.moveState.back || 
        controls.moveState.left || controls.moveState.right ||
        controls.moveState.up || controls.moveState.down)) {
      
      // If keys are pressed and jetpack is not active, add their effect to velocity
      if (controls.moveState.forward) 
        movement.add(forwardVector.clone().multiplyScalar(controls.movementSpeed * delta));
      if (controls.moveState.back) 
        movement.add(forwardVector.clone().multiplyScalar(-controls.movementSpeed * delta));
        
      // Right vector
      const rightVector = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
      if (controls.moveState.right) 
        movement.add(rightVector.clone().multiplyScalar(controls.movementSpeed * delta));
      if (controls.moveState.left) 
        movement.add(rightVector.clone().multiplyScalar(-controls.movementSpeed * delta));
      
      // Up/down movement (using R/F keys)
      const upVector = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
      // Process normal up/down movement (R/F keys)
      if (controls.moveState.up) 
        movement.add(upVector.clone().multiplyScalar(controls.movementSpeed * delta));
      if (controls.moveState.down) 
        movement.add(upVector.clone().multiplyScalar(-controls.movementSpeed * delta));
    }
    
    // Always add the current movement to velocity, whether from jetpack or WASD
    controls.velocity.add(movement);
    
    // Apply light inertia - gradual slowdown when jetpack turns off
    // Lower damping means more inertia (slower slowdown)
    controls.velocity.multiplyScalar(1 - (controls.damping * delta));
    
    // Apply half-gravity pullback - slowly pull down in world-space Y axis
    // This simulates a floating feel in low-gravity
    if (!controls.moveState.up && !controls.moveState.down) {
      // Only apply gravity when not explicitly moving up/down
      controls.velocity.y -= controls.gravity * delta;
    }
    
    // Apply velocity to camera position for actual movement
    camera.position.add(controls.velocity.clone().multiplyScalar(delta));
    
    // Log physics state for debugging
    if (frameCounter % logInterval === 0) {
      console.log(`Physics: velocity=(${controls.velocity.x.toFixed(2)}, ${controls.velocity.y.toFixed(2)}, ${controls.velocity.z.toFixed(2)}), damping=${controls.damping}, gravity=${controls.gravity}`);
    }
    
  } else {
    // OrbitControls just needs regular update
    controls.update();
  }
  
  // Subtle starfield rotation
  if (starfield) {
    starfield.rotation.y += delta * 0.01;
    starfield.rotation.x += delta * 0.005;
  }
  
  // Update Level 2 cluster orbits
  if (typeof level2Groups !== 'undefined') {
    level2Groups.forEach(group => {
      if (group && group.children) {
        group.children.forEach(cluster => {
          if (cluster && cluster.userData) {
            // Get parent reference and orbit data
            const parentSprite = cluster.userData.parentSprite;
            
            if (parentSprite) {
              // For hollow spherical shells, we maintain the sphere structure
              // and rotate the entire sphere around its center (the parent node)
              
              // Get parent position and rotation data
              const parentPos = parentSprite.position;
              
              // Apply rotation to the entire spherical shell group
              // This maintains the hollow sphere structure while animating
              
              // Create rotation quaternion based on time and random axis
              const rotationSpeed = cluster.userData.rotationSpeed;
              const rotationAxis = cluster.userData.rotationAxis;
              
              // Apply incremental rotation to the entire group
              cluster.rotateOnAxis(rotationAxis, delta * rotationSpeed);
              
              // Update the center position to follow the parent node
              cluster.position.set(
                parentPos.x,
                parentPos.y,
                parentPos.z
              );
              
              // No need to update individual wallet positions as they are fixed
              // relative to the sphere center and rotate with the whole group
              
              // Add slight rotation to the entire cluster
              cluster.rotation.z += delta * 0.1;
            }
          }
        });
      }
    });
  }
  
  // Check for invalid camera position (but without excessive logging)
  frameCounter++;
  if (frameCounter % logInterval === 0) {
    // Check for invalid camera position
    if (isNaN(camera.position.x) || isNaN(camera.position.y) || isNaN(camera.position.z)) {
      camera.position.copy(initialCameraPosition);
      
      if (controlType === 'Orbit') {
        controls.target.copy(initialCameraTarget);
      } else {
        camera.lookAt(initialCameraTarget);
      }
      
      if (controlType === 'Fly') {
        controls.update(delta);
      } else {
        controls.update();
      }
    }
    
    if (frameCounter > 1000) frameCounter = 0;
  }
  
  // Perform raycasting for hover detection
  raycaster.setFromCamera(mouse, camera);
  
  // Debug: Log raycaster status every few frames
  if (frameCounter % 120 === 0) {
    console.log(`Raycaster origin: (${raycaster.ray.origin.x.toFixed(2)}, ${raycaster.ray.origin.y.toFixed(2)}, ${raycaster.ray.origin.z.toFixed(2)})`);
    console.log(`Raycaster direction: (${raycaster.ray.direction.x.toFixed(2)}, ${raycaster.ray.direction.y.toFixed(2)}, ${raycaster.ray.direction.z.toFixed(2)})`);
  }
  
  // Create array of all point clouds to raycast against
  const pointGroups = [];
  
  // Add all wallet groups to raycasting targets
  const sharedGroup = scene.getObjectByName('sharedWallets');
  const fartcoinGroup = scene.getObjectByName('fartcoinWallets');
  const goatTokenGroup = scene.getObjectByName('goatTokenWallets');
  
  // Debug: Log group existence
  if (frameCounter % 120 === 0) {
    console.log(`Wallet groups found: shared=${!!sharedGroup}, fartcoin=${!!fartcoinGroup}, goat=${!!goatTokenGroup}`);
  }
  
  if (sharedGroup) pointGroups.push(sharedGroup);
  if (fartcoinGroup) pointGroups.push(fartcoinGroup);
  if (goatTokenGroup) pointGroups.push(goatTokenGroup);
  
  // Get wallet points to test against
  let allWalletPoints = [];
  pointGroups.forEach(group => {
    if (group && group.children) {
      allWalletPoints = allWalletPoints.concat(group.children);
    }
  });
  
  // DEBUG v30: Include ALL wallet points in hover detection, regardless of type
  // Previously we were filtering out Level 1 wallet nodes, but that might be part of the hover issue
  let filteredWalletPoints = allWalletPoints;
  
  // Keep track of how many points would have been filtered out for debugging
  let levelOneWallets = allWalletPoints.filter(point => point.userData?.isLevel1Wallet);
  let smallWalletPoints = allWalletPoints.filter(point => !point.userData?.isLevel1Wallet);

  // Debug: Log wallet points count with more details
  if (frameCounter % 120 === 0) {
    console.log(`DEBUG v30: Raycast targets: All ${allWalletPoints.length} wallet points (${levelOneWallets.length} Level 1 wallets, ${smallWalletPoints.length} small wallet points)`);
    console.log(`DEBUG v30: Previously would have included only ${smallWalletPoints.length} points`);
  }
  
  // Get camera distance to scene center for distance check
  const cameraDistanceToCenter = camera.position.length();
  const maxInteractionDistance = 50000; // Increased from 10000 to 50000 to allow hover from farther away
  
  // Perform raycast - temporarily remove distance restriction to debug hover issues
  let intersects = [];
  // DEBUG v30: Removed distance check to ensure hover works regardless of camera position
  intersects = raycaster.intersectObjects(filteredWalletPoints, false);
  
  // Debug log distance and if distance would have blocked hover
  if (frameCounter % 60 === 0) {
    console.log(`DEBUG v30: Camera distance: ${cameraDistanceToCenter.toFixed(2)}, would hover be disabled? ${cameraDistanceToCenter > maxInteractionDistance}`);
  }
  
  // DEBUG v30: Enhanced logging for hover debugging
  if (frameCounter % 60 === 0) {
    console.log(`Camera distance to center: ${cameraDistanceToCenter.toFixed(2)}, max interaction: ${maxInteractionDistance}`);
    console.log(`Hover enabled: Always enabled for debugging in v30 (would be ${cameraDistanceToCenter <= maxInteractionDistance} with distance check)`);
    
    if (intersects.length > 0) {
      console.log(`DEBUG v30: Found ${intersects.length} intersections with wallet points`);
      // Log details of the first 3 intersections
      for (let i = 0; i < Math.min(3, intersects.length); i++) {
        const obj = intersects[i].object;
        console.log(`DEBUG v30: Intersection ${i+1}: distance=${intersects[i].distance.toFixed(2)}, ` +
                   `type=${obj.userData?.isLevel1Wallet ? 'Level 1 Wallet' : 'Small Wallet Point'}, ` +
                   `has wallet data: ${!!obj.userData?.walletData}, ` +
                   `material: ${!!obj.material}, ` +
                   `visible: ${!!obj.visible}`);
      }
    } else {
      console.log(`DEBUG v30: NO INTERSECTIONS FOUND with ${filteredWalletPoints.length} wallet points`);
      console.log(`DEBUG v30: Raycaster params:`, raycaster.params);
    }
  }
  
  // Handle tooltip and hover effects
  if (intersects.length > 0) {
    const object = intersects[0].object;
    
    // Only process if the object has wallet data
    if (object.userData && object.userData.walletData) {
      // Debug: Log wallet data found
      if (frameCounter % 30 === 0) {
        console.log('Found wallet data in intersection:', object.userData.walletData);
      }
      
      // If hovering over a new object
      if (hoveredObject !== object) {
        console.log('Hovering over new wallet:', object.userData.walletData.address);
        
        // Reset previous hover state
        if (hoveredObject) {
          console.log('Resetting previous hover state');
          
          // Restore original scale and color
          hoveredObject.scale.set(
            hoveredObject.userData.originalScale, 
            hoveredObject.userData.originalScale, 
            1
          );
          
          // Restore original color
          if (hoveredObject.material) {
            console.log(`Restoring original color: ${hoveredObject.userData.originalColor}`);
            hoveredObject.material.color.set(hoveredObject.userData.originalColor);
          } else {
            console.warn('Previous hovered object has no material');
          }
        }
        
        // Set new hovered object
        hoveredObject = object;
        console.log('Set new hovered object');
        
        // Scale up and brighten the hovered object - make it MUCH larger for visibility
        const newScale = object.userData.originalScale * 3; // Increased from 1.5 to 3 for better visibility
        console.log(`Scaling up to: ${newScale} (original: ${object.userData.originalScale})`);
        object.scale.set(newScale, newScale, 1);
        
        // Add pulsing animation for extra visibility
        object.userData.pulseAnimation = true;
        object.userData.pulseTime = 0;
        
        // Brighten the color
        if (object.material) {
          console.log('Brightening the color of hovered object');
          
          // Store original color if not already stored
          if (!object.userData.storedOriginalColor) {
            object.userData.storedOriginalColor = object.material.color.clone();
            console.log('Stored original color');
          }
          
          // Create brighter version of the original color
          const origColor = new THREE.Color(object.userData.originalColor);
          console.log(`Original color: r=${origColor.r.toFixed(2)}, g=${origColor.g.toFixed(2)}, b=${origColor.b.toFixed(2)}`);
          
          const brighterColor = new THREE.Color(
            Math.min(1, origColor.r * hoverBrightnessFactor),
            Math.min(1, origColor.g * hoverBrightnessFactor),
            Math.min(1, origColor.b * hoverBrightnessFactor)
          );
          console.log(`Brighter color: r=${brighterColor.r.toFixed(2)}, g=${brighterColor.g.toFixed(2)}, b=${brighterColor.b.toFixed(2)}`);
          
          // Apply brighter color
          object.material.color.copy(brighterColor);
          console.log('Applied brighter color');
        } else {
          console.warn('Hovered object has no material');
        }
        
        // Show both the HTML tooltip and 3D tooltip for redundancy
        console.log('Showing wallet tooltips (HTML and 3D)');
        const walletData = object.userData.walletData;
        
        // Log the data for debugging
        console.log(`Wallet Data: Address=${walletData.address}, Fart=${walletData.fartAmount}, Goat=${walletData.goatAmount}`);
        
        // Show HTML tooltip with our direct fix
        if (tooltip) {
          // Get mouse position from event
          const mouseX = event?.clientX || (mouse.x + 1) * window.innerWidth / 2;
          const mouseY = event?.clientY || (1 - mouse.y) * window.innerHeight / 2;
          
          // Show the HTML tooltip
          showTooltip(tooltip, mouseX, mouseY, walletData);
          console.log('HTML tooltip shown with direct fix');
        } else {
          console.error('HTML tooltip element still missing, trying to recreate');
          tooltip = createTooltipIfMissing();
        }
        
        // Also show 3D tooltip with wallet data as backup
        walletTooltip.show(walletData, object.position.clone());
      }
    }
  } else if (hoveredObject) {
    // No longer hovering over anything, reset state
    console.log('No longer hovering over anything, resetting state');
    
    // Restore original scale
    hoveredObject.scale.set(
      hoveredObject.userData.originalScale, 
      hoveredObject.userData.originalScale, 
      1
    );
    
    // Restore original color
    if (hoveredObject.material) {
      console.log(`Restoring original color on hover end: ${hoveredObject.userData.originalColor}`);
      hoveredObject.material.color.set(hoveredObject.userData.originalColor);
    } else {
      console.warn('Hovered object has no material when trying to restore color');
    }
    
    // Clear hovered object
    hoveredObject = null;
    console.log('Cleared hovered object reference');
    
    // Hide both tooltips
    console.log('Hiding both tooltips');
    walletTooltip.hide();
    
    // Also hide HTML tooltip with our direct fix
    if (tooltip) {
      hideTooltip(tooltip);
      console.log('HTML tooltip hidden on hover end');
    }
  }
  
  // Render the scene
  renderer.render(scene, camera);
}

animate();