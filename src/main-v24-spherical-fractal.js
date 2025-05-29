import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FlyControls } from 'three/examples/jsm/controls/FlyControls.js';
import { initializeData, fartcoinHolders, goatTokenHolders, sharedHolders } from './dataLoader.js';

// Global variables
let scene, camera, renderer;
let controls, controlType;
let starfield;
let boxCenter = new THREE.Vector3(0, 0, 0);
let shiftKeyPressed = false;
let walletNodes = [];
let coreSphere;
let pointTexture;
let clock, frameCounter, logInterval, initialCameraPosition;
let composer, bloomPass;

// Initialize settings
function initSettings() {
  console.log("Initializing settings...");
  clock = new THREE.Clock();
  frameCounter = 0;
  logInterval = 60;
}

// Initialize Three.js scene
function initScene() {
  console.log("Initializing scene...");
  
  // Create scene, camera and renderer
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 100000);
  renderer = new THREE.WebGLRenderer({ antialias: true });
  
  // Set up renderer
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  document.body.appendChild(renderer.domElement);
  
  // Set background color - darker for better contrast with glowing elements
  scene.background = new THREE.Color(0x000205);
  
  // Add lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
  scene.add(ambientLight);
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(1, 1, 1).normalize();
  scene.add(directionalLight);
  
  // Create point texture
  pointTexture = createPointTexture();
  
  // Create starfield
  starfield = createStarfield();
  
  // Set initial camera position - far away from the galaxy
  camera.position.set(0, 0, 70000);
  camera.lookAt(0, 0, 0);
  
  // Store initial camera position for recovery
  initialCameraPosition = camera.position.clone();
  
  console.log("Scene initialized");
}

// Create a point texture for sprites
function createPointTexture() {
  console.log("Creating point texture...");
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.9)');
  gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.7)');
  gradient.addColorStop(0.8, 'rgba(255, 255, 255, 0.3)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// Create starfield background
function createStarfield() {
  console.log("Creating starfield...");
  const geometry = new THREE.BufferGeometry();
  const starCount = 20000;
  const positions = new Float32Array(starCount * 3);
  const sizes = new Float32Array(starCount);
  
  for (let i = 0; i < starCount; i++) {
    const i3 = i * 3;
    // Create stars randomly in a 100,000³ unit cube - larger to match the scale of our visualization
    positions[i3] = (Math.random() - 0.5) * 100000;
    positions[i3 + 1] = (Math.random() - 0.5) * 100000;
    positions[i3 + 2] = (Math.random() - 0.5) * 100000;
    
    sizes[i] = 1 + Math.random() * 4;
  }
  
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  
  const starMaterial = new THREE.PointsMaterial({
    color: 0xe0e8ff, // Bluish-white color
    size: 2,
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending
  });
  
  const stars = new THREE.Points(geometry, starMaterial);
  stars.name = 'starfield';
  scene.add(stars);
  
  return stars;
}

// Set up controls based on device type
function setupControls() {
  console.log("Setting up controls...");
  const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
  
  try {
    if (isTouchDevice) {
      // Use OrbitControls for touch devices
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.1;
      controls.rotateSpeed = 0.5;
      controls.screenSpacePanning = false;
      controls.minDistance = 3000;
      controls.maxDistance = 80000;
      controlType = 'Orbit';
      console.log("Using OrbitControls for touch device");
    } else {
      // Use FlyControls for desktop
      controls = new FlyControls(camera, renderer.domElement);
      controls.movementSpeed = 800; // Increased for the larger scale
      controls.rollSpeed = Math.PI / 6;
      controls.dragToLook = true;
      controls.autoForward = false;
      
      // Additional physics properties
      controls.velocity = new THREE.Vector3(0, 0, 0);
      controls.damping = 0.2;
      controls.gravity = 0.5;
      
      // Jetpack fuel system
      controls.jetpackFuel = 250;
      controls.jetpackMaxFuel = 250;
      controls.jetpackActive = false;
      controls.jetpackEnabled = true;
      controls.jetpackRefillRate = 0.8;
      controls.jetpackDrainRate = 1.2;
      controls.jetpackMinFuelToReactivate = 25;
      controls.jetpackBoostFactor = 2.5;
      
      // Show the fuel meter UI for desktop
      const fuelMeterContainer = document.getElementById('fuel-meter-container');
      if (fuelMeterContainer) {
        fuelMeterContainer.style.display = 'block';
      }
      
      controlType = 'Fly';
      console.log("Using FlyControls for desktop");
    }
  } catch (error) {
    console.error('Error creating controls:', error);
  }
  
  // Set the target/lookAt point for OrbitControls
  if (controlType === 'Orbit') {
    controls.target.set(0, 0, 0);
  }
  
  // Initial update
  if (controlType === 'Fly') {
    const delta = 0.01;
    controls.update(delta);
  } else {
    controls.update();
  }
  
  // Update controls instructions
  const controlsElement = document.getElementById('controls');
  if (controlsElement) {
    if (controlType === 'Fly') {
      controlsElement.innerHTML = '<p>WASD to move, drag mouse to look around<br>HOLD LEFT SHIFT to activate jetpack boost</p>';
    } else {
      controlsElement.innerHTML = '<p>Drag to rotate, pinch to zoom</p>';
    }
  }
  
  console.log("Controls setup complete");
}

// Set up event listeners
function setupEventListeners() {
  console.log("Setting up event listeners...");
  
  // Shift key events for jetpack
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
  
  // Window resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    const currentIsTouchDevice = window.matchMedia('(pointer: coarse)').matches;
    const expectedControlType = currentIsTouchDevice ? 'Orbit' : 'Fly';
    
    if (controlType !== expectedControlType) {
      location.reload();
    }
  });
  
  console.log("Event listeners set up");
}

// Create central core sphere
function createCoreSphere() {
  console.log("Creating central core sphere...");
  
  // Create the core sphere geometry
  const geometry = new THREE.SphereGeometry(2000, 64, 64);
  
  // Create glowing material for the core
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 0.8,
    roughness: 0.2,
    metalness: 0.5,
    transparent: true,
    opacity: 0.9
  });
  
  // Create the mesh and position at origin
  coreSphere = new THREE.Mesh(geometry, material);
  coreSphere.position.set(0, 0, 0);
  coreSphere.name = 'coreSphere';
  
  // Add to scene
  scene.add(coreSphere);
  
  console.log("Core sphere created");
  return coreSphere;
}

// Create the wallet nodes in a spherical fractal pattern
function createSphericalFractalNodes(walletData, type) {
  console.log(`Creating spherical fractal nodes for ${type}...`);
  
  const nodes = [];
  const totalPoints = walletData.length;
  const layerCount = 6; // Number of concentric layers in the fractal
  const pointsPerLayer = Math.ceil(totalPoints / layerCount);
  
  // Set the golden angle for Fibonacci spiral pattern
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  
  walletData.forEach((wallet, i) => {
    // Calculate which layer this node belongs to
    const layer = Math.floor(i / pointsPerLayer);
    
    // Calculate radius based on layer (inner layers for shared wallets)
    const baseRadius = (type === 'shared') ? 3000 : 15000;
    const radius = baseRadius + layer * 3000;
    
    // Calculate spherical coordinates using Fibonacci spiral distribution
    const theta = i * goldenAngle;
    const phi = Math.acos(1 - 2 * (i % pointsPerLayer) / pointsPerLayer);
    
    // Convert to Cartesian coordinates
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);
    
    // Set colors based on wallet type
    let color, size;
    
    if (type === 'shared') {
      // White for shared wallets
      const brightness = Math.min(255, Math.floor(200 + (wallet.fartAmount + wallet.goatAmount) / 1000000));
      color = new THREE.Color(brightness/255, brightness/255, brightness/255);
      size = 200; // Larger size for inner shared nodes
    } else if (type === 'fartcoin') {
      // Green for Fartcoin wallets
      const brightness = Math.min(200, Math.floor(50 + wallet.amount / 1000000));
      color = new THREE.Color(0.1, (brightness + 55)/255, 0.1);
      size = 150;
    } else { // goatToken
      // Blue for Goat Token wallets
      const brightness = Math.min(200, Math.floor(50 + wallet.amount / 1000000));
      color = new THREE.Color(0.1, 0.1, (brightness + 55)/255);
      size = 150;
    }
    
    // Create glowing sphere for each wallet
    const geometry = new THREE.SphereGeometry(size, 16, 16);
    const material = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.8
    });
    
    const node = new THREE.Mesh(geometry, material);
    node.position.set(x, y, z);
    node.userData = {
      type: type,
      address: wallet.address,
      amount: wallet.amount || (wallet.fartAmount + wallet.goatAmount),
      originalPosition: new THREE.Vector3(x, y, z)
    };
    
    // Add to scene
    scene.add(node);
    nodes.push(node);
  });
  
  console.log(`Created ${nodes.length} ${type} nodes`);
  return nodes;
}

// Set up the visualization after data is loaded
async function setupVisualization() {
  try {
    // Wait for data to be loaded
    console.log("Loading wallet data...");
    await initializeData();
    console.log("Wallet data loaded successfully");
    
    // Create the massive central core
    createCoreSphere();
    
    // Verify we have wallet data
    console.log(`Wallet data: Shared=${sharedHolders.length}, Fartcoin=${fartcoinHolders.length}, Goat=${goatTokenHolders.length}`);
    
    if (sharedHolders.length === 0 || fartcoinHolders.length === 0 || goatTokenHolders.length === 0) {
      console.error("ERROR: Missing wallet data for visualization!");
      return false;
    }
    
    // Create wallet nodes for each type
    const sharedNodes = createSphericalFractalNodes(sharedHolders, 'shared');
    const fartcoinNodes = createSphericalFractalNodes(fartcoinHolders, 'fartcoin');
    const goatTokenNodes = createSphericalFractalNodes(goatTokenHolders, 'goatToken');
    
    // Combine all nodes for animation purposes
    walletNodes = [...sharedNodes, ...fartcoinNodes, ...goatTokenNodes];
    
    // Position camera to view the entire structure
    camera.position.set(0, 0, 70000);
    camera.lookAt(0, 0, 0);
    
    // Update controls
    if (controlType === 'Orbit') {
      controls.target.set(0, 0, 0);
      controls.update();
    } else {
      camera.lookAt(0, 0, 0);
      controls.update(0.01);
    }
    
    console.log("Visualization setup complete!");
    return true;
    
  } catch (error) {
    console.error("ERROR setting up visualization:", error);
    return false;
  }
}

// Handle jetpack functionality
function handleJetpack(delta) {
  const jetpackKeyPressed = shiftKeyPressed;
  const fuelLevelElement = document.getElementById('fuel-level');
  
  // Handle jetpack fuel logic
  if (jetpackKeyPressed && controls.jetpackEnabled && controls.jetpackFuel > 0) {
    controls.jetpackActive = true;
    
    // Drain fuel
    controls.jetpackFuel = Math.max(0, controls.jetpackFuel - controls.jetpackDrainRate * delta * 60);
    
    // Disable jetpack if fuel depleted
    if (controls.jetpackFuel <= 0) {
      controls.jetpackEnabled = false;
      controls.jetpackActive = false;
    }
  } else {
    controls.jetpackActive = false;
    
    // Recharge fuel when not using jetpack
    if (controls.jetpackFuel < controls.jetpackMaxFuel) {
      controls.jetpackFuel = Math.min(
        controls.jetpackMaxFuel, 
        controls.jetpackFuel + controls.jetpackRefillRate * delta * 60
      );
      
      // Re-enable jetpack if fuel reaches minimum threshold
      if (!controls.jetpackEnabled && controls.jetpackFuel > controls.jetpackMinFuelToReactivate) {
        controls.jetpackEnabled = true;
      }
    }
  }
  
  // Apply jetpack boost effect
  if (controls.jetpackActive) {
    controls.movementSpeed = 800 * controls.jetpackBoostFactor;
  } else {
    controls.movementSpeed = 800;
  }
  
  // Update fuel meter UI
  if (fuelLevelElement) {
    const fuelPercentage = (controls.jetpackFuel / controls.jetpackMaxFuel) * 100;
    fuelLevelElement.style.width = `${fuelPercentage}%`;
    
    // Change color based on fuel level
    if (fuelPercentage < 20) {
      fuelLevelElement.style.backgroundColor = '#ff3333'; // Red when low
    } else if (fuelPercentage < 50) {
      fuelLevelElement.style.backgroundColor = '#ffaa22'; // Orange when medium
    } else {
      fuelLevelElement.style.backgroundColor = '#22cc22'; // Green when high
    }
  }
}

// Animate the scene
function animate() {
  requestAnimationFrame(animate);
  
  // Increment frame counter
  frameCounter++;
  
  // Get delta time
  const delta = clock.getDelta();
  
  // Apply gentle breathing animation to core sphere
  if (coreSphere) {
    const pulseScale = 1.0 + Math.sin(Date.now() * 0.0005) * 0.05;
    coreSphere.scale.set(pulseScale, pulseScale, pulseScale);
  }
  
  // Animate wallet nodes with gentle oscillation
  walletNodes.forEach((node, i) => {
    if (node && node.userData && node.userData.originalPosition) {
      // Apply a gentle oscillation based on time
      const origPos = node.userData.originalPosition;
      const time = Date.now() * 0.0001;
      const distance = origPos.length();
      
      // Scale oscillation based on distance from center (more pronounced further out)
      const oscillationFactor = 0.005 * (distance / 5000);
      
      // Calculate oscillation
      const offsetX = Math.sin(time + i * 0.1) * oscillationFactor * distance;
      const offsetY = Math.cos(time + i * 0.2) * oscillationFactor * distance;
      const offsetZ = Math.sin(time + i * 0.3) * oscillationFactor * distance;
      
      // Apply to position
      node.position.set(
        origPos.x + offsetX,
        origPos.y + offsetY,
        origPos.z + offsetZ
      );
    }
  });
  
  // Handle jetpack functionality
  if (controlType === 'Fly') {
    handleJetpack(delta);
  }
  
  // Update controls
  if (controlType === 'Fly') {
    controls.update(delta);
  } else if (controlType === 'Orbit') {
    controls.update();
  }
  
  // Render the scene
  renderer.render(scene, camera);
  
  // Performance logging (once every N frames)
  if (frameCounter % logInterval === 0) {
    console.log(`FPS: ${Math.round(1 / delta)}, Camera position: (${camera.position.x.toFixed(0)}, ${camera.position.y.toFixed(0)}, ${camera.position.z.toFixed(0)})`);
  }
}

// Initialize and start the visualization
async function init() {
  // Set version counter
  const versionCounter = document.getElementById('version-counter');
  if (versionCounter) {
    versionCounter.textContent = 'v24';
  }
  
  // Initialize core components
  initSettings();
  initScene();
  setupControls();
  setupEventListeners();
  
  // Set up visualization data
  const success = await setupVisualization();
  
  if (success) {
    // Start animation loop
    animate();
  } else {
    console.error("Failed to initialize visualization!");
  }
}

// Start the application
init();