import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FlyControls } from 'three/examples/jsm/controls/FlyControls.js';
import { initializeData, fartcoinHolders, goatTokenHolders, sharedHolders } from './dataLoader.js';
import { sharedPoints, fartcoinPoints, goatTokenPoints, generateAllPoints } from './positionMapper.js';

// Global variables
let scene, camera, renderer;
let controls, controlType;
let starfield;
let boxCenter = new THREE.Vector3(0, 0, 0);
let shiftKeyPressed = false;
let level2Groups = [];
let pointTexture;
let clock, frameCounter, logInterval, initialCameraPosition;

// CAMERA BOUNDARY SETTINGS - ADJUSTED FOR V21
const CAMERA_CONSTRAINTS = {
  farClippingPlane: 100000,  // Keep far clipping plane from v20
  initialPosition: new THREE.Vector3(0, 200, 1000),
  maxDistance: 50000,        // Maximum distance from scene center
  resetDistance: 30000,      // Distance at which camera gets reset
  checkInterval: 30          // Check boundary every N frames
};

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
  
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, CAMERA_CONSTRAINTS.farClippingPlane);
  renderer = new THREE.WebGLRenderer({ antialias: true });
  
  // Set up renderer
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  document.body.appendChild(renderer.domElement);
  
  // Set background color
  scene.background = new THREE.Color(0x000815);
  
  // Add lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
  scene.add(ambientLight);
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
  directionalLight.position.set(1, 1, 1).normalize();
  scene.add(directionalLight);
  
  // Create point texture
  pointTexture = createPointTexture();
  
  // Create starfield
  starfield = createStarfield();
  
  // Set a reasonable initial camera position
  camera.position.copy(CAMERA_CONSTRAINTS.initialPosition);
  camera.lookAt(0, 0, 0);
  
  // Store initial camera position for recovery
  initialCameraPosition = camera.position.clone();
  
  console.log("Scene initialized");
}

// Create a point texture for sprites
function createPointTexture() {
  console.log("Creating point texture...");
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

// Create starfield background
function createStarfield() {
  console.log("Creating starfield...");
  const geometry = new THREE.BufferGeometry();
  const starCount = 2000;
  const positions = new Float32Array(starCount * 3);
  const sizes = new Float32Array(starCount);
  
  for (let i = 0; i < starCount; i++) {
    const i3 = i * 3;
    const radius = 5000 + Math.random() * 10000;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    
    positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i3 + 2] = radius * Math.cos(phi);
    
    sizes[i] = 1 + Math.random() * 4;
  }
  
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  
  const starMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
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
      controls.minDistance = 500;
      controls.maxDistance = 30000;
      controlType = 'Orbit';
      console.log("Using OrbitControls for touch device");
    } else {
      // Use FlyControls for desktop
      controls = new FlyControls(camera, renderer.domElement);
      
      controls.movementSpeed = 300;
      controls.rollSpeed = Math.PI / 6;
      controls.dragToLook = true;
      controls.autoForward = false;
      
      // Additional physics properties
      controls.velocity = new THREE.Vector3(0, 0, 0);
      controls.damping = 0.3;
      controls.gravity = 0.5;
      
      controls.boundaryRadius = CAMERA_CONSTRAINTS.maxDistance;
      
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
  
  // Home key to reset camera position
  window.addEventListener('keydown', function(event) {
    if (event.code === 'Home') {
      resetCamera();
      console.log("Camera position reset via Home key");
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

// Function to create Level 2 clusters
function createLevel2Cluster(parentPosition, parentScale, parentColor) {
  const miniClusterGroup = new THREE.Group();
  
  // Create central mini-node
  const centralNodeMaterial = new THREE.SpriteMaterial({
    map: pointTexture,
    color: new THREE.Color(parentColor).lerp(new THREE.Color(0x333333), 0.7),
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending
  });
  
  const centralNode = new THREE.Sprite(centralNodeMaterial);
  centralNode.scale.set(parentScale * 0.546, parentScale * 0.546, 1);
  centralNode.position.set(0, 0, 0);
  miniClusterGroup.add(centralNode);
  
  // Create orbiting smaller spheres
  for (let i = 0; i < 30; i++) {
    const radius = parentScale * 0.273;
    const theta = i * (Math.PI * 2 / 30);
    const phi = Math.PI / 2 + (Math.random() * 0.5 - 0.25);
    
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);
    
    const miniSphereMaterial = new THREE.SpriteMaterial({
      map: pointTexture,
      color: new THREE.Color(parentColor).lerp(new THREE.Color(0xffffff), 0.5),
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending
    });
    
    const miniSphere = new THREE.Sprite(miniSphereMaterial);
    const miniScale = parentScale * 0.2184;
    miniSphere.scale.set(miniScale, miniScale, 1);
    miniSphere.position.set(x, y, z);
    
    miniClusterGroup.add(miniSphere);
  }
  
  miniClusterGroup.position.copy(parentPosition);
  
  return miniClusterGroup;
}

// Update Level 2 cluster positions
function updateLevel2Clusters(delta) {
  level2Groups.forEach(group => {
    if (group && group.children) {
      group.children.forEach(cluster => {
        if (cluster.userData && cluster.userData.orbitAngle !== undefined) {
          cluster.userData.orbitAngle += delta * cluster.userData.orbitSpeed;
          
          // Get parent position from userData
          const parentSprite = cluster.userData.parentSprite;
          if (parentSprite && !parentSprite.userData.isHidden) {
            // Update position to orbit around parent
            const orbitRadius = cluster.userData.orbitRadius;
            const orbitAngle = cluster.userData.orbitAngle;
            
            const offsetX = Math.cos(orbitAngle) * orbitRadius;
            const offsetZ = Math.sin(orbitAngle) * orbitRadius;
            
            cluster.position.x = parentSprite.position.x + offsetX;
            cluster.position.z = parentSprite.position.z + offsetZ;
          }
        }
      });
    }
  });
}

// Enhanced reset camera function to ensure good viewing position
function resetCamera() {
  console.log("Resetting camera to safe position");
  
  // Reset to initial position
  camera.position.copy(initialCameraPosition);
  
  // Always look at the center of the scene
  if (controlType === 'Orbit') {
    controls.target.copy(boxCenter);
    controls.update();
  } else {
    camera.lookAt(boxCenter);
    
    // Reset velocity to prevent continued movement
    if (controls.velocity) {
      controls.velocity.set(0, 0, 0);
    }
    
    controls.update(0.01);
  }
  
  console.log("Camera reset complete");
}

// Function to check if camera is too far from scene center
function checkCameraBoundary() {
  if (controlType !== 'Fly') return false; // Only apply to FlyControls
  
  const distanceToCenter = camera.position.distanceTo(boxCenter);
  
  if (distanceToCenter > CAMERA_CONSTRAINTS.resetDistance) {
    console.log(`Camera too far (${distanceToCenter.toFixed(0)} units). Resetting position.`);
    return true;
  }
  
  return false;
}

// Create wallet point clouds
function createWalletPointCloud(pointsArray, groupName, color = 0xffffff) {
  console.log(`Creating point cloud for ${groupName} with ${pointsArray.length} points...`);
  
  // Create a group to hold all sprites
  const group = new THREE.Group();
  group.name = groupName;
  
  // Check if we have valid points
  if (!pointsArray || pointsArray.length === 0) {
    console.error(`No points available for ${groupName}`);
    return { mainGroup: group, level2Group: new THREE.Group() };
  }
  
  // Level 2 clusters container
  const level2Group = new THREE.Group();
  level2Group.name = `${groupName}_level2`;
  
  // Create a sprite for each point
  let validSpriteCount = 0;
  
  pointsArray.forEach((point, index) => {
    if (isNaN(point.x) || isNaN(point.y) || isNaN(point.z)) {
      console.warn(`Skipping invalid point at index ${index}`);
      return;
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
    
    // Calculate scale based on amount
    const baseScale = point.amount ? (Math.log(point.amount) * 10) : 200;
    const scale = Math.max(260, baseScale * 3.9);
    sprite.scale.set(scale, scale, 1);
    sprite.userData = { isLevel1Wallet: true, parentIndex: index };
    
    // Add to group
    group.add(sprite);
    validSpriteCount++;
    
    // Add Level 2 clusters for each Level 1 wallet (capped to 500)
    if (index < 500) {
      const level2Cluster = createLevel2Cluster(
        sprite.position.clone(),
        scale,
        point.color || color
      );
      
      level2Cluster.userData = { 
        parentIndex: index,
        orbitRadius: scale * 1.092,
        orbitSpeed: 0.2 + Math.random() * 0.3,
        orbitAngle: Math.random() * Math.PI * 2,
        parentSprite: sprite
      };
      
      level2Group.add(level2Cluster);
    }
  });
  
  console.log(`Created ${validSpriteCount} valid sprites for ${groupName}`);
  
  // Add groups to scene - THIS IS CRITICAL!
  scene.add(group);
  scene.add(level2Group);
  
  console.log(`Added ${groupName} group to scene with ${group.children.length} sprites`);
  
  return { mainGroup: group, level2Group: level2Group };
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
      if (!controls.jetpackEnabled && controls.jetpackFuel >= controls.jetpackMinFuelToReactivate) {
        controls.jetpackEnabled = true;
      }
    }
  }
  
  // Update fuel meter UI
  if (fuelLevelElement) {
    const fuelPercentage = (controls.jetpackFuel / controls.jetpackMaxFuel) * 100;
    fuelLevelElement.style.width = `${fuelPercentage}%`;
    
    // Color-code the fuel meter based on level
    if (fuelPercentage > 60) {
      fuelLevelElement.style.backgroundColor = '#22cc22'; // Green
    } else if (fuelPercentage > 30) {
      fuelLevelElement.style.backgroundColor = '#cccc22'; // Yellow
    } else {
      fuelLevelElement.style.backgroundColor = '#cc2222'; // Red
    }
  }
  
  // Apply jetpack physics to FlyControls
  if (controls.velocity && controlType === 'Fly') {
    if (controls.jetpackActive) {
      // Boost forward movement
      controls.movementSpeed = 300 * controls.jetpackBoostFactor;
      
      // Add visual feedback for jetpack activation
      if (frameCounter % 5 === 0) {
        const jetpackActive = document.getElementById('fuel-meter-container');
        if (jetpackActive) {
          jetpackActive.style.backgroundColor = 'rgba(40, 120, 255, 0.8)';
          setTimeout(() => {
            jetpackActive.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
          }, 100);
        }
      }
    } else {
      // Normal movement speed
      controls.movementSpeed = 300;
    }
  }
}

// Update fuel UI to match actual fuel level
function updateFuelUI() {
  const fuelLevelElement = document.getElementById('fuel-level');
  if (!fuelLevelElement) return;
  
  const fuelPercentage = (controls.jetpackFuel / controls.jetpackMaxFuel) * 100;
  fuelLevelElement.style.width = `${fuelPercentage}%`;
  
  // Color-code based on fuel level
  if (fuelPercentage > 60) {
    fuelLevelElement.style.backgroundColor = '#22cc22'; // Green
  } else if (fuelPercentage > 30) {
    fuelLevelElement.style.backgroundColor = '#cccc22'; // Yellow
  } else {
    fuelLevelElement.style.backgroundColor = '#cc2222'; // Red
  }
}

// Setup visualization of wallet data
async function setupVisualization() {
  try {
    // Wait for data to be loaded
    console.log("Loading wallet data...");
    await initializeData();
    console.log("Wallet data loaded successfully");
    
    // Generate points from wallet data
    console.log("Generating 3D points from wallet data...");
    generateAllPoints();
    
    // Verify we have point data
    console.log(`Points generated: Shared=${sharedPoints.length}, Fartcoin=${fartcoinPoints.length}, Goat=${goatTokenPoints.length}`);
    
    if (sharedPoints.length === 0 || fartcoinPoints.length === 0 || goatTokenPoints.length === 0) {
      console.error("ERROR: Missing wallet data for visualization!");
      return false;
    }
    
    // Create point clouds
    console.log("Creating wallet sprites...");
    const sharedGroups = createWalletPointCloud(sharedPoints, 'sharedWallets', 0xffffff);
    const fartcoinGroups = createWalletPointCloud(fartcoinPoints, 'fartcoinWallets', 0x00ff00);
    const goatTokenGroups = createWalletPointCloud(goatTokenPoints, 'goatTokenWallets', 0x0000ff);
    
    // Store Level 2 groups for animation
    level2Groups = [
      sharedGroups.level2Group,
      fartcoinGroups.level2Group,
      goatTokenGroups.level2Group
    ];
    
    // Calculate bounding box for camera positioning
    console.log("Calculating camera position...");
    const boundingBox = new THREE.Box3();
    boundingBox.set(
      new THREE.Vector3(-1, -1, -1),
      new THREE.Vector3(1, 1, 1)
    );
    
    // Add groups to bounding box
    [sharedGroups.mainGroup, fartcoinGroups.mainGroup, goatTokenGroups.mainGroup].forEach(group => {
      if (group && group.children.length > 0) {
        group.children.forEach(sprite => {
          if (sprite && sprite.position) {
            boundingBox.expandByPoint(sprite.position);
          }
        });
      }
    });
    
    // Get bounding box center and size
    boxCenter = boundingBox.getCenter(new THREE.Vector3());
    const boxSize = boundingBox.getSize(new THREE.Vector3());
    
    // Calculate camera distance
    const maxDim = Math.max(
      Math.max(1, boxSize.x),
      Math.max(1, boxSize.y),
      Math.max(1, boxSize.z)
    );
    
    // Limit camera distance to be within far clipping plane
    const cameraDistance = Math.min(
      CAMERA_CONSTRAINTS.maxDistance * 0.5,
      Math.max(5000, maxDim * 2.2)
    );
    
    console.log(`Bounding box: center=(${boxCenter.x.toFixed(2)}, ${boxCenter.y.toFixed(2)}, ${boxCenter.z.toFixed(2)}), size=(${boxSize.x.toFixed(2)}, ${boxSize.y.toFixed(2)}, ${boxSize.z.toFixed(2)})`);
    console.log(`Setting camera at distance ${cameraDistance.toFixed(2)}`);
    
    // Position camera more conservatively
    camera.position.set(
      boxCenter.x, 
      boxCenter.y + Math.min(maxDim * 0.3, 500),  // Reduced vertical offset
      boxCenter.z + cameraDistance
    );
    
    camera.lookAt(boxCenter);
    
    // Store this position as the initial camera position for resets
    initialCameraPosition = camera.position.clone();
    
    // Update controls
    if (controlType === 'Orbit') {
      controls.target.copy(boxCenter);
      controls.update();
    } else {
      camera.lookAt(boxCenter);
      controls.update(0.01);
    }
    
    console.log("Visualization setup complete!");
    return true;
    
  } catch (error) {
    console.error("ERROR setting up visualization:", error);
    return false;
  }
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  
  const delta = clock.getDelta();
  
  // Update controls
  if (controlType === 'Fly') {
    // Handle jetpack controls
    handleJetpack(delta);
    controls.update(delta);
    
    // Check camera position boundary every N frames
    frameCounter++;
    if (frameCounter % CAMERA_CONSTRAINTS.checkInterval === 0) {
      // Check if camera is too far from center
      if (checkCameraBoundary()) {
        resetCamera();
      }
      
      // Reset counter periodically to prevent overflow
      if (frameCounter > 1000) frameCounter = 0;
    }
  } else {
    controls.update();
  }
  
  // Subtle starfield rotation
  if (starfield) {
    starfield.rotation.y += delta * 0.01;
    starfield.rotation.x += delta * 0.005;
  }
  
  // Update Level 2 cluster orbits
  updateLevel2Clusters(delta);
  
  // Check for invalid camera position
  if (isNaN(camera.position.x) || isNaN(camera.position.y) || isNaN(camera.position.z)) {
    resetCamera();
  }
  
  // Render the scene
  renderer.render(scene, camera);
}

// Main initialization function
async function init() {
  console.log("Starting 3D Blockchain Visualizer v21");
  
  // Initialize settings
  initSettings();
  
  // Initialize scene and camera
  initScene();
  
  // Set up controls
  setupControls();
  
  // Set up event listeners
  setupEventListeners();
  
  // Set up visualization
  console.log("Setting up visualization...");
  const success = await setupVisualization();
  
  if (success) {
    console.log("Starting animation loop");
    clock.start();
    animate();
  } else {
    console.error("Failed to set up visualization");
  }
}

// Start the application
init();