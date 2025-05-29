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
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 20000);
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
  
  // Set initial camera position
  camera.position.set(0, 0, 3000);
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
      controls.movementSpeed = 400;
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

// Set up the visualization after data is loaded
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
    
    const cameraDistance = Math.max(5000, maxDim * 2.2);
    
    console.log(`Bounding box: center=(${boxCenter.x.toFixed(2)}, ${boxCenter.y.toFixed(2)}, ${boxCenter.z.toFixed(2)}), size=(${boxSize.x.toFixed(2)}, ${boxSize.y.toFixed(2)}, ${boxSize.z.toFixed(2)})`);
    console.log(`Setting camera at distance ${cameraDistance.toFixed(2)}`);
    
    // Position camera
    camera.position.set(
      boxCenter.x, 
      boxCenter.y + maxDim * 0.5,
      boxCenter.z + cameraDistance
    );
    
    camera.lookAt(boxCenter);
    
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
    
    // Change color based on fuel level
    if (fuelPercentage < 20) {
      fuelLevelElement.style.backgroundColor = '#cc2222'; // Red when low
    } else if (fuelPercentage < 50) {
      fuelLevelElement.style.backgroundColor = '#cccc22'; // Yellow when medium
    } else {
      fuelLevelElement.style.backgroundColor = '#22cc22'; // Green when high
    }
  }
  
  // Handle jetpack thrust
  if (controls.jetpackActive && controls.jetpackEnabled) {
    const forwardVector = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const jetpackThrustVector = forwardVector.clone();
    const jetpackSpeed = controls.movementSpeed * controls.jetpackBoostFactor;
    
    controls.velocity.add(
      jetpackThrustVector.multiplyScalar(jetpackSpeed * delta)
    );
  }
  
  // Apply physics
  controls.velocity.multiplyScalar(1 - (controls.damping * delta));
  
  // Apply gravity if not moving up/down
  if (!controls.moveState.up && !controls.moveState.down) {
    controls.velocity.y -= controls.gravity * delta;
  }
  
  // Apply velocity to camera position
  camera.position.add(controls.velocity.clone().multiplyScalar(delta));
}

// Update Level 2 cluster orbits
function updateLevel2Clusters(delta) {
  if (level2Groups && level2Groups.length > 0) {
    level2Groups.forEach(group => {
      if (group && group.children) {
        group.children.forEach(cluster => {
          if (cluster && cluster.userData) {
            const parentSprite = cluster.userData.parentSprite;
            
            if (parentSprite) {
              // Update orbit angle
              cluster.userData.orbitAngle += cluster.userData.orbitSpeed * delta;
              
              // Calculate new position in orbit
              const orbitRadius = cluster.userData.orbitRadius;
              const angle = cluster.userData.orbitAngle;
              
              // Calculate orbit position with slight random wobble
              const offsetX = Math.cos(angle) * orbitRadius;
              const offsetY = Math.sin(angle) * orbitRadius;
              const offsetZ = Math.sin(angle * 0.7) * orbitRadius * 0.3;
              
              // Set position relative to parent wallet
              cluster.position.set(
                parentSprite.position.x + offsetX,
                parentSprite.position.y + offsetY,
                parentSprite.position.z + offsetZ
              );
              
              // Add slight rotation to the entire cluster
              cluster.rotation.z += delta * 0.1;
            }
          }
        });
      }
    });
  }
}

// Reset camera if position becomes invalid
function resetCamera() {
  camera.position.copy(initialCameraPosition);
  
  if (controlType === 'Orbit') {
    controls.target.copy(boxCenter);
  } else {
    camera.lookAt(boxCenter);
  }
  
  if (controlType === 'Fly') {
    controls.update(0.01);
  } else {
    controls.update();
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
  frameCounter++;
  if (frameCounter % logInterval === 0) {
    if (isNaN(camera.position.x) || isNaN(camera.position.y) || isNaN(camera.position.z)) {
      resetCamera();
    }
    
    if (frameCounter > 1000) frameCounter = 0;
  }
  
  // Render the scene
  renderer.render(scene, camera);
}

// Main initialization function
async function init() {
  console.log("Starting 3D Blockchain Visualizer v20");
  
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