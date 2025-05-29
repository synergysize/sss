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
let mediumNodes = [];
let coreSphere;
let pointTexture;
let clock, frameCounter, logInterval, initialCameraPosition;

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
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 200000);
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
  camera.position.set(0, 0, 80000);
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
    // Create stars randomly in a larger space to match the enhanced scale
    positions[i3] = (Math.random() - 0.5) * 200000;
    positions[i3 + 1] = (Math.random() - 0.5) * 200000;
    positions[i3 + 2] = (Math.random() - 0.5) * 200000;
    
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
      controls.maxDistance = 150000;
      controlType = 'Orbit';
      console.log("Using OrbitControls for touch device");
    } else {
      // Use FlyControls for desktop
      controls = new FlyControls(camera, renderer.domElement);
      controls.movementSpeed = 1500; // Increased for the larger scale
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
  
  // Create the core sphere geometry - 4× current size
  const geometry = new THREE.SphereGeometry(10000, 64, 64);
  
  // Create glowing material for the core
  const material = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 0.3,
    roughness: 0.2,
    metalness: 0.5,
    transparent: true,
    opacity: 0.9,
    clearcoat: 0.5
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

// Position generator for golden-angle spiral on a sphere
function sphericalFibonacciPosition(i, total, radius) {
  // Golden angle in radians
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  
  // Distribute points evenly on a sphere
  const y = 1 - (i / (total - 1)) * 2; // y goes from 1 to -1
  const radius_at_y = Math.sqrt(1 - y * y); // radius at y
  
  const theta = goldenAngle * i; // golden angle increment
  
  // Convert to Cartesian coordinates
  const x = Math.cos(theta) * radius_at_y;
  const z = Math.sin(theta) * radius_at_y;
  
  return {
    x: x * radius,
    y: y * radius,
    z: z * radius
  };
}

// Create medium-sized branch spheres around the core
function createMediumSpheres() {
  console.log("Creating medium spheres...");
  
  const totalSpheres = 20; // 10 green, 10 blue
  const mediumSpheres = [];
  
  for (let i = 0; i < totalSpheres; i++) {
    // Random distance from core to medium spheres between 8000-15000
    const coreRadius = 8000 + Math.random() * 7000;
    
    // Calculate position using spherical Fibonacci
    const pos = sphericalFibonacciPosition(i, totalSpheres, coreRadius);
    
    // Create the sphere geometry - 1/4 the size of center
    const geometry = new THREE.SphereGeometry(500, 32, 32);
    
    // Set color based on index (first 10 green, next 10 blue)
    const isFartcoin = i < 10;
    const color = isFartcoin ? 
      new THREE.Color(0.2, 0.8, 0.2) : // Green for Fartcoin
      new THREE.Color(0.2, 0.2, 0.8); // Blue for Goat
    
    // Create glowing material
    const material = new THREE.MeshPhysicalMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.8,
      roughness: 0.3,
      metalness: 0.7,
      transparent: true,
      opacity: 0.9,
      clearcoat: 0.3
    });
    
    // Create the mesh and position
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.set(pos.x, pos.y, pos.z);
    sphere.name = isFartcoin ? 'fartcoinBranch_' + i : 'goatBranch_' + (i - 10);
    
    // Store the original position and type
    sphere.userData = {
      originalPosition: new THREE.Vector3(pos.x, pos.y, pos.z),
      type: isFartcoin ? 'fartcoin' : 'goat',
      index: i,
      distanceFromCore: coreRadius
    };
    
    // Add to scene and collection
    scene.add(sphere);
    mediumSpheres.push(sphere);
  }
  
  console.log(`Created ${mediumSpheres.length} medium spheres`);
  return mediumSpheres;
}

// Create wallet nodes around medium spheres
function createWalletNodes(mediumSpheres) {
  console.log("Creating wallet nodes...");
  
  const walletNodes = [];
  const nodesPerMediumSphere = 100; // 100 wallet nodes per medium sphere
  
  // Get Fartcoin and Goat token data
  const fartcoinNodesCount = Math.min(1000, fartcoinHolders.length);
  const goatNodesCount = Math.min(1000, goatTokenHolders.length);
  
  console.log(`Using ${fartcoinNodesCount} Fartcoin nodes and ${goatNodesCount} Goat nodes`);
  
  // Create nodes for each medium sphere
  mediumSpheres.forEach((mediumSphere, mediumIndex) => {
    const isFartcoin = mediumSphere.userData.type === 'fartcoin';
    const data = isFartcoin ? fartcoinHolders : goatTokenHolders;
    const startIndex = mediumIndex % 10 * nodesPerMediumSphere;
    
    // Ensure we have enough data
    if (startIndex >= data.length) {
      console.warn(`Not enough data for ${isFartcoin ? 'Fartcoin' : 'Goat'} nodes starting at index ${startIndex}`);
      return;
    }
    
    // Create wallet nodes around this medium sphere
    for (let i = 0; i < nodesPerMediumSphere; i++) {
      const dataIndex = (startIndex + i) % data.length;
      const wallet = data[dataIndex];
      
      if (!wallet) {
        console.warn(`Missing wallet data at index ${dataIndex}`);
        continue;
      }
      
      // Random radius from parent medium sphere between 1500-3500
      const walletRadius = 1500 + Math.random() * 2000;
      
      // Calculate position using spherical Fibonacci
      const localPos = sphericalFibonacciPosition(i, nodesPerMediumSphere, walletRadius);
      
      // Translate to medium sphere's position
      const worldPos = {
        x: mediumSphere.position.x + localPos.x,
        y: mediumSphere.position.y + localPos.y,
        z: mediumSphere.position.z + localPos.z
      };
      
      // Determine node size based on wallet amount
      const amount = wallet.amount || 0;
      const normalizedAmount = Math.min(1, amount / 10000000); // Normalize between 0 and 1
      
      // Base size is 125 (1/4 of parent nodes)
      const baseSize = 125;
      // Allow some variation based on amount, but keep within 125 ± 50 range
      const size = baseSize + (normalizedAmount - 0.5) * 50;
      
      // Create geometry
      const geometry = new THREE.SphereGeometry(size, 16, 16);
      
      // Set color based on type (green for Fartcoin, blue for Goat)
      const baseColor = isFartcoin ? 
        new THREE.Color(0.1, 0.7, 0.1) : // Green for Fartcoin
        new THREE.Color(0.1, 0.1, 0.7); // Blue for Goat
      
      // Adjust brightness based on amount
      const brightnessAdjust = 0.3 + normalizedAmount * 0.7; // 0.3 to 1.0
      baseColor.multiplyScalar(brightnessAdjust);
      
      // Create glowing material
      const material = new THREE.MeshPhysicalMaterial({
        color: baseColor,
        emissive: baseColor,
        emissiveIntensity: 0.7,
        transparent: true,
        opacity: 0.9,
        clearcoat: 0.2
      });
      
      // Create the mesh and position
      const node = new THREE.Mesh(geometry, material);
      node.position.set(worldPos.x, worldPos.y, worldPos.z);
      node.name = `${isFartcoin ? 'fartcoin' : 'goat'}_wallet_${i}`;
      
      // Store metadata
      node.userData = {
        parentSphere: mediumSphere,
        originalPosition: new THREE.Vector3(worldPos.x, worldPos.y, worldPos.z),
        type: isFartcoin ? 'fartcoin' : 'goat',
        address: wallet.address,
        amount: amount,
        normalizedAmount: normalizedAmount,
        distanceFromParent: walletRadius
      };
      
      // Add to scene and collection
      scene.add(node);
      walletNodes.push(node);
    }
  });
  
  console.log(`Created ${walletNodes.length} wallet nodes`);
  return walletNodes;
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
    
    if (fartcoinHolders.length === 0 || goatTokenHolders.length === 0) {
      console.error("ERROR: Missing wallet data for visualization!");
      return false;
    }
    
    // Create the hierarchical structure
    // 1. Medium spheres orbiting the core
    mediumNodes = createMediumSpheres();
    
    // 2. Wallet nodes orbiting the medium spheres
    walletNodes = createWalletNodes(mediumNodes);
    
    // Position camera to view the entire structure - pulling back for the enhanced scale
    camera.position.set(0, 0, 80000);
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
    controls.movementSpeed = 1500 * controls.jetpackBoostFactor;
  } else {
    controls.movementSpeed = 1500;
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
    const pulseScale = 1.0 + Math.sin(Date.now() * 0.0003) * 0.05;
    coreSphere.scale.set(pulseScale, pulseScale, pulseScale);
  }
  
  // Animate medium spheres with gentle rotation around core
  mediumNodes.forEach((node, i) => {
    if (node && node.userData && node.userData.originalPosition) {
      const origPos = node.userData.originalPosition;
      const time = Date.now() * 0.00003;
      const rotationSpeed = 0.1 + (i % 5) * 0.02; // Varied speeds
      
      // Rotate around the y-axis
      const angle = time * rotationSpeed;
      const x = origPos.x * Math.cos(angle) - origPos.z * Math.sin(angle);
      const z = origPos.x * Math.sin(angle) + origPos.z * Math.cos(angle);
      
      // Apply to position
      node.position.set(x, origPos.y, z);
    }
  });
  
  // Animate wallet nodes with gentle oscillation
  walletNodes.forEach((node, i) => {
    if (node && node.userData && node.userData.originalPosition && node.userData.parentSphere) {
      // Get parent medium sphere's current position
      const parentPos = node.userData.parentSphere.position;
      const origLocalPos = node.userData.originalPosition.clone().sub(node.userData.parentSphere.userData.originalPosition);
      
      // Apply a gentle oscillation based on time
      const time = Date.now() * 0.0001;
      const oscillationFactor = 0.03 + node.userData.normalizedAmount * 0.02;
      
      // Calculate oscillation
      const offsetX = Math.sin(time + i * 0.1) * oscillationFactor * origLocalPos.length();
      const offsetY = Math.cos(time + i * 0.2) * oscillationFactor * origLocalPos.length();
      const offsetZ = Math.sin(time + i * 0.3) * oscillationFactor * origLocalPos.length();
      
      // Rotate local position to match parent's rotation
      const localPos = origLocalPos.clone();
      
      // Apply to position (relative to parent's current position)
      node.position.set(
        parentPos.x + localPos.x + offsetX,
        parentPos.y + localPos.y + offsetY,
        parentPos.z + localPos.z + offsetZ
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
}

// Start the visualization
async function init() {
  console.log("Starting visualization...");
  
  // Initialize settings
  initSettings();
  
  // Set up the scene and renderer
  initScene();
  
  // Set up controls
  setupControls();
  
  // Set up event listeners
  setupEventListeners();
  
  // Set up the visualization after data is loaded
  const success = await setupVisualization();
  
  if (success) {
    console.log("Visualization initialized successfully!");
    
    // Set version counter in UI
    const versionElement = document.getElementById('version-counter');
    if (versionElement) {
      versionElement.textContent = 'v26';
    }
    
    // Start animation loop
    animate();
    
  } else {
    console.error("Failed to initialize visualization!");
  }
}

// Start the application
init();