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
let renderCount = 0;
let testGeometry, testMaterial, testMesh;

// AUDIT: Add console logging wrapper with categories
function auditLog(category, message, data = null) {
  const timestamp = new Date().toISOString().substring(11, 23);
  const formattedMessage = `[AUDIT:${timestamp}][${category}] ${message}`;
  
  if (data) {
    console.log(formattedMessage, data);
  } else {
    console.log(formattedMessage);
  }
  
  // Also output to on-screen console if available
  const consoleDiv = document.getElementById('console');
  if (consoleDiv) {
    consoleDiv.style.display = 'block';
    const logEntry = document.createElement('div');
    logEntry.textContent = formattedMessage + (data ? ' ' + JSON.stringify(data) : '');
    consoleDiv.appendChild(logEntry);
    
    // Limit the number of log entries
    while (consoleDiv.children.length > 30) {
      consoleDiv.removeChild(consoleDiv.firstChild);
    }
    
    // Auto-scroll to bottom
    consoleDiv.scrollTop = consoleDiv.scrollHeight;
  }
}

// Initialize settings
function initSettings() {
  auditLog('INIT', "Initializing settings...");
  clock = new THREE.Clock();
  frameCounter = 0;
  logInterval = 30; // Log more frequently for audit
  
  // Make console visible for audit
  const consoleDiv = document.getElementById('console');
  if (consoleDiv) {
    consoleDiv.style.display = 'block';
  }
  
  auditLog('INIT', "Settings initialized");
}

// Initialize Three.js scene
function initScene() {
  auditLog('SCENE', "Initializing scene...");
  
  // Create scene, camera and renderer
  scene = new THREE.Scene();
  auditLog('SCENE', "Scene created", { id: scene.id });
  
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 20000);
  auditLog('CAMERA', "Camera created", { 
    fov: camera.fov, 
    aspect: camera.aspect, 
    near: camera.near, 
    far: camera.far 
  });
  
  try {
    auditLog('RENDERER', "Creating WebGL renderer...");
    renderer = new THREE.WebGLRenderer({ antialias: true });
    
    // AUDIT: Log WebGL capabilities
    const gl = renderer.getContext();
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const vendorInfo = debugInfo ? {
      vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
      renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
    } : "WebGL debug info not available";
    
    auditLog('RENDERER', "WebGL renderer created", { 
      vendor: vendorInfo,
      precision: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
      maxTextures: gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS)
    });
  } catch (error) {
    auditLog('RENDERER', "ERROR creating WebGL renderer", { error: error.message });
    return;
  }
  
  // Set up renderer
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  auditLog('RENDERER', "Renderer configured", { 
    width: window.innerWidth, 
    height: window.innerHeight, 
    pixelRatio: window.devicePixelRatio,
    isWebGL2: renderer.capabilities.isWebGL2,
    maxTextures: renderer.capabilities.maxTextures
  });
  
  document.body.appendChild(renderer.domElement);
  auditLog('RENDERER', "Canvas element added to DOM");
  
  // Set background color
  scene.background = new THREE.Color(0x000815);
  auditLog('SCENE', "Scene background set", { 
    color: scene.background.getHexString() 
  });
  
  // Add lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
  scene.add(ambientLight);
  auditLog('SCENE', "Ambient light added", { 
    intensity: ambientLight.intensity 
  });
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
  directionalLight.position.set(1, 1, 1).normalize();
  scene.add(directionalLight);
  auditLog('SCENE', "Directional light added", { 
    intensity: directionalLight.intensity,
    position: directionalLight.position
  });
  
  // Create point texture
  pointTexture = createPointTexture();
  
  // Create starfield
  starfield = createStarfield();
  
  // AUDIT: Add test geometry that should be visible on both desktop and mobile
  testGeometry = new THREE.BoxGeometry(100, 100, 100);
  testMaterial = new THREE.MeshBasicMaterial({ 
    color: 0xff00ff, 
    wireframe: true 
  });
  testMesh = new THREE.Mesh(testGeometry, testMaterial);
  testMesh.position.set(0, 0, 0);
  scene.add(testMesh);
  auditLog('SCENE', "Test geometry added", { 
    type: "BoxGeometry",
    position: testMesh.position
  });
  
  // Set initial camera position
  camera.position.set(0, 0, 3000);
  camera.lookAt(0, 0, 0);
  auditLog('CAMERA', "Initial camera position set", { 
    position: camera.position,
    lookAt: new THREE.Vector3(0, 0, 0)
  });
  
  // Store initial camera position for recovery
  initialCameraPosition = camera.position.clone();
  
  auditLog('SCENE', "Scene initialized with child count", { 
    childCount: scene.children.length 
  });
}

// Create a point texture for sprites
function createPointTexture() {
  auditLog('SPRITES', "Creating point texture...");
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
  auditLog('SPRITES', "Point texture created");
  return texture;
}

// Create starfield background
function createStarfield() {
  auditLog('SCENE', "Creating starfield...");
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
  
  auditLog('SCENE', "Starfield created and added to scene", { 
    starCount,
    name: stars.name
  });
  
  return stars;
}

// Set up controls based on device type
function setupControls() {
  auditLog('CONTROLS', "Setting up controls...");
  
  // AUDIT: More detailed device detection
  const userAgent = navigator.userAgent;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
  const isMobileViewport = window.innerWidth < 768;
  
  auditLog('DEVICE', "Device detection results", { 
    userAgent,
    isMobile,
    isTouchDevice,
    isMobileViewport,
    width: window.innerWidth,
    height: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio
  });
  
  try {
    if (isTouchDevice) {
      // AUDIT: Mobile branch
      auditLog('DEVICE', "MOBILE BRANCH SELECTED: Using OrbitControls");
      
      // Use OrbitControls for touch devices
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.1;
      controls.rotateSpeed = 0.5;
      controls.screenSpacePanning = false;
      controls.minDistance = 500;
      controls.maxDistance = 30000;
      controlType = 'Orbit';
      
      auditLog('CONTROLS', "OrbitControls initialized with parameters", {
        enableDamping: controls.enableDamping,
        dampingFactor: controls.dampingFactor,
        rotateSpeed: controls.rotateSpeed,
        minDistance: controls.minDistance,
        maxDistance: controls.maxDistance
      });
    } else {
      // AUDIT: Desktop branch
      auditLog('DEVICE', "DESKTOP BRANCH SELECTED: Using FlyControls");
      
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
      
      auditLog('CONTROLS', "FlyControls initialized with parameters", {
        movementSpeed: controls.movementSpeed,
        rollSpeed: controls.rollSpeed,
        dragToLook: controls.dragToLook,
        autoForward: controls.autoForward,
        damping: controls.damping
      });
      
      // Show the fuel meter UI for desktop
      const fuelMeterContainer = document.getElementById('fuel-meter-container');
      if (fuelMeterContainer) {
        fuelMeterContainer.style.display = 'block';
        auditLog('CONTROLS', "Fuel meter UI displayed");
      }
      
      controlType = 'Fly';
    }
  } catch (error) {
    auditLog('CONTROLS', "ERROR creating controls", { error: error.message, stack: error.stack });
  }
  
  // Set the target/lookAt point for OrbitControls
  if (controlType === 'Orbit') {
    controls.target.set(0, 0, 0);
    auditLog('CONTROLS', "OrbitControls target set", { target: controls.target });
  }
  
  // Initial update
  try {
    if (controlType === 'Fly') {
      const delta = 0.01;
      controls.update(delta);
      auditLog('CONTROLS', "FlyControls initial update", { delta });
    } else {
      controls.update();
      auditLog('CONTROLS', "OrbitControls initial update");
    }
  } catch (error) {
    auditLog('CONTROLS', "ERROR during initial controls update", { error: error.message });
  }
  
  // Update controls instructions
  const controlsElement = document.getElementById('controls');
  if (controlsElement) {
    if (controlType === 'Fly') {
      controlsElement.innerHTML = '<p>WASD to move, drag mouse to look around<br>HOLD LEFT SHIFT to activate jetpack boost</p>';
    } else {
      controlsElement.innerHTML = '<p>Drag to rotate, pinch to zoom</p>';
    }
    auditLog('CONTROLS', "Controls instructions updated for", { controlType });
  }
  
  auditLog('CONTROLS', "Controls setup complete");
}

// Set up event listeners
function setupEventListeners() {
  auditLog('CONTROLS', "Setting up event listeners...");
  
  // Shift key events for jetpack
  window.addEventListener('keydown', function(event) {
    if (event.code === 'ShiftLeft') {
      shiftKeyPressed = true;
      auditLog('CONTROLS', "Shift key pressed", { shiftKeyPressed });
    }
  });
  
  window.addEventListener('keyup', function(event) {
    if (event.code === 'ShiftLeft') {
      shiftKeyPressed = false;
      auditLog('CONTROLS', "Shift key released", { shiftKeyPressed });
    }
  });
  
  // AUDIT: Track all key and mouse events
  window.addEventListener('keydown', function(event) {
    auditLog('CONTROLS', "Key down event", { 
      key: event.key, 
      code: event.code 
    });
  });
  
  window.addEventListener('mousedown', function(event) {
    auditLog('CONTROLS', "Mouse down event", { 
      button: event.button, 
      clientX: event.clientX, 
      clientY: event.clientY 
    });
  });
  
  // Window resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    const currentIsTouchDevice = window.matchMedia('(pointer: coarse)').matches;
    const expectedControlType = currentIsTouchDevice ? 'Orbit' : 'Fly';
    
    auditLog('DEVICE', "Window resize detected", {
      width: window.innerWidth,
      height: window.innerHeight,
      currentIsTouchDevice,
      expectedControlType,
      currentControlType: controlType
    });
    
    if (controlType !== expectedControlType) {
      auditLog('DEVICE', "Control type mismatch after resize, reloading page");
      location.reload();
    }
  });
  
  auditLog('CONTROLS', "Event listeners set up");
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
  // Count of clusters updated
  let updatedClusters = 0;
  
  level2Groups.forEach(group => {
    if (group && group.children) {
      group.children.forEach(cluster => {
        if (cluster.userData && cluster.userData.orbitAngle !== undefined) {
          cluster.userData.orbitAngle += delta * cluster.userData.orbitSpeed;
          
          // Get parent position from userData
          const parentSprite = cluster.userData.parentSprite;
          if (parentSprite && !parentSprite.userData.isHidden) {
            updatedClusters++;
          }
        }
      });
    }
  });
  
  // Log update every few frames
  if (frameCounter % 120 === 0) {
    auditLog('SCENE', "Updated Level 2 clusters", { count: updatedClusters });
  }
}

// Reset camera to initial position
function resetCamera() {
  auditLog('CAMERA', "Resetting camera position", {
    from: camera.position.clone(),
    to: initialCameraPosition
  });
  
  camera.position.copy(initialCameraPosition);
  camera.lookAt(boxCenter);
  
  if (controlType === 'Orbit') {
    controls.target.copy(boxCenter);
    controls.update();
  }
}

// Create wallet point clouds
function createWalletPointCloud(pointsArray, groupName, color = 0xffffff) {
  auditLog('SPRITES', `Creating point cloud for ${groupName}...`, { 
    pointCount: pointsArray ? pointsArray.length : 0 
  });
  
  // Create a group to hold all sprites
  const group = new THREE.Group();
  group.name = groupName;
  
  // Check if we have valid points
  if (!pointsArray || pointsArray.length === 0) {
    auditLog('SPRITES', `No points available for ${groupName}`);
    return { mainGroup: group, level2Group: new THREE.Group() };
  }
  
  // Level 2 clusters container
  const level2Group = new THREE.Group();
  level2Group.name = `${groupName}_level2`;
  
  // Create a sprite for each point
  let validSpriteCount = 0;
  let invalidSpriteCount = 0;
  
  pointsArray.forEach((point, index) => {
    if (isNaN(point.x) || isNaN(point.y) || isNaN(point.z)) {
      invalidSpriteCount++;
      if (invalidSpriteCount < 10) {
        auditLog('SPRITES', `Skipping invalid point at index ${index}`, { point });
      }
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
  
  auditLog('SPRITES', `Created sprites for ${groupName}`, {
    valid: validSpriteCount,
    invalid: invalidSpriteCount,
    level2Count: level2Group.children.length
  });
  
  // Add groups to scene - THIS IS CRITICAL!
  scene.add(group);
  scene.add(level2Group);
  
  auditLog('SCENE', `Added ${groupName} groups to scene`, {
    groupChildCount: group.children.length,
    level2ChildCount: level2Group.children.length,
    totalSceneChildren: scene.children.length
  });
  
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
      auditLog('CONTROLS', "Jetpack fuel depleted", { fuel: 0 });
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
        auditLog('CONTROLS', "Jetpack re-enabled", { fuel: controls.jetpackFuel });
      }
    }
  }
  
  // Update fuel meter UI
  if (fuelLevelElement) {
    const fuelPercentage = (controls.jetpackFuel / controls.jetpackMaxFuel) * 100;
    fuelLevelElement.style.width = `${fuelPercentage}%`;
    
    // Change color based on fuel level
    if (fuelPercentage < 20) {
      fuelLevelElement.style.backgroundColor = '#ff3333';
    } else if (fuelPercentage < 50) {
      fuelLevelElement.style.backgroundColor = '#ffaa33';
    } else {
      fuelLevelElement.style.backgroundColor = '#22cc22';
    }
  }
  
  // Log jetpack status periodically
  if (frameCounter % 60 === 0) {
    auditLog('CONTROLS', "Jetpack status", {
      active: controls.jetpackActive,
      enabled: controls.jetpackEnabled,
      fuel: controls.jetpackFuel.toFixed(1),
      keyPressed: jetpackKeyPressed
    });
  }
}

// Set up the visualization after data is loaded
async function setupVisualization() {
  try {
    // Wait for data to be loaded
    auditLog('DATA', "Loading wallet data...");
    await initializeData();
    auditLog('DATA', "Wallet data loaded successfully", {
      fartcoinHolders: fartcoinHolders ? fartcoinHolders.length : 0,
      goatTokenHolders: goatTokenHolders ? goatTokenHolders.length : 0,
      sharedHolders: sharedHolders ? sharedHolders.length : 0
    });
    
    // Generate points from wallet data
    auditLog('DATA', "Generating 3D points from wallet data...");
    generateAllPoints();
    
    // Verify we have point data
    auditLog('DATA', "Points generated", {
      sharedPoints: sharedPoints ? sharedPoints.length : 0, 
      fartcoinPoints: fartcoinPoints ? fartcoinPoints.length : 0, 
      goatTokenPoints: goatTokenPoints ? goatTokenPoints.length : 0
    });
    
    if (sharedPoints.length === 0 || fartcoinPoints.length === 0 || goatTokenPoints.length === 0) {
      auditLog('DATA', "ERROR: Missing wallet data for visualization!");
      return false;
    }
    
    // Create point clouds
    auditLog('SPRITES', "Creating wallet sprites...");
    const sharedGroups = createWalletPointCloud(sharedPoints, 'sharedWallets', 0xffffff);
    const fartcoinGroups = createWalletPointCloud(fartcoinPoints, 'fartcoinWallets', 0x00ff00);
    const goatTokenGroups = createWalletPointCloud(goatTokenPoints, 'goatTokenWallets', 0x0000ff);
    
    // Store Level 2 groups for animation
    level2Groups = [
      sharedGroups.level2Group,
      fartcoinGroups.level2Group,
      goatTokenGroups.level2Group
    ];
    
    auditLog('SCENE', "Level 2 groups stored for animation", {
      count: level2Groups.length,
      totalChildren: level2Groups.reduce((acc, group) => acc + (group ? group.children.length : 0), 0)
    });
    
    // Calculate bounding box for camera positioning
    auditLog('CAMERA', "Calculating camera position...");
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
    
    auditLog('CAMERA', "Bounding box calculated", {
      center: {
        x: boxCenter.x.toFixed(2),
        y: boxCenter.y.toFixed(2),
        z: boxCenter.z.toFixed(2)
      },
      size: {
        x: boxSize.x.toFixed(2),
        y: boxSize.y.toFixed(2),
        z: boxSize.z.toFixed(2)
      },
      maxDimension: maxDim.toFixed(2),
      cameraDistance: cameraDistance.toFixed(2)
    });
    
    // Position camera
    camera.position.set(
      boxCenter.x, 
      boxCenter.y + maxDim * 0.5,
      boxCenter.z + cameraDistance
    );
    
    camera.lookAt(boxCenter);
    
    auditLog('CAMERA', "Camera positioned", {
      position: {
        x: camera.position.x.toFixed(2),
        y: camera.position.y.toFixed(2),
        z: camera.position.z.toFixed(2)
      },
      lookingAt: {
        x: boxCenter.x.toFixed(2),
        y: boxCenter.y.toFixed(2),
        z: boxCenter.z.toFixed(2)
      },
      matrix: camera.matrix.elements.map(e => e.toFixed(2))
    });
    
    // Update controls
    if (controlType === 'Orbit') {
      controls.target.copy(boxCenter);
      controls.update();
      auditLog('CONTROLS', "OrbitControls target updated", {
        target: {
          x: controls.target.x.toFixed(2),
          y: controls.target.y.toFixed(2),
          z: controls.target.z.toFixed(2)
        }
      });
    } else {
      camera.lookAt(boxCenter);
      controls.update(0.01);
      auditLog('CONTROLS', "FlyControls updated with camera lookAt");
    }
    
    auditLog('SCENE', "Visualization setup complete!");
    return true;
    
  } catch (error) {
    auditLog('SCENE', "ERROR setting up visualization", { 
      error: error.message,
      stack: error.stack
    });
    return false;
  }
}

// Animation loop
function animate() {
  // AUDIT: Log frame request
  const frameId = requestAnimationFrame(animate);
  if (frameCounter % 60 === 0) {
    auditLog('RENDER', "Animation frame requested", { 
      frameId, 
      totalFrames: frameCounter 
    });
  }
  
  const delta = clock.getDelta();
  
  // Update controls
  try {
    if (controlType === 'Fly') {
      // Handle jetpack controls
      handleJetpack(delta);
      controls.update(delta);
      
      if (frameCounter % 30 === 0) {
        auditLog('CONTROLS', "FlyControls updated", { 
          delta,
          cameraPosition: {
            x: camera.position.x.toFixed(1),
            y: camera.position.y.toFixed(1),
            z: camera.position.z.toFixed(1)
          }
        });
      }
    } else {
      controls.update();
      
      if (frameCounter % 30 === 0) {
        auditLog('CONTROLS', "OrbitControls updated", { 
          cameraPosition: {
            x: camera.position.x.toFixed(1),
            y: camera.position.y.toFixed(1),
            z: camera.position.z.toFixed(1)
          }
        });
      }
    }
  } catch (error) {
    auditLog('CONTROLS', "ERROR updating controls", { error: error.message });
  }
  
  // Subtle starfield rotation
  if (starfield) {
    starfield.rotation.y += delta * 0.01;
    starfield.rotation.x += delta * 0.005;
  }
  
  // Update test mesh rotation for visibility test
  if (testMesh) {
    testMesh.rotation.x += delta * 0.5;
    testMesh.rotation.y += delta * 0.3;
  }
  
  // Update Level 2 cluster orbits
  updateLevel2Clusters(delta);
  
  // Check for invalid camera position
  frameCounter++;
  if (frameCounter % logInterval === 0) {
    if (isNaN(camera.position.x) || isNaN(camera.position.y) || isNaN(camera.position.z)) {
      auditLog('CAMERA', "Invalid camera position detected, resetting", {
        position: camera.position
      });
      resetCamera();
    }
    
    // AUDIT: Log scene status periodically
    auditLog('SCENE', "Scene status", {
      childCount: scene.children.length,
      frame: frameCounter,
      controlType,
      visible: renderer.info.render.frame,
      triangles: renderer.info.render.triangles,
      calls: renderer.info.render.calls
    });
    
    if (frameCounter > 1000) frameCounter = 0;
  }
  
  // AUDIT: Render with detailed logging
  try {
    renderer.render(scene, camera);
    renderCount++;
    
    if (frameCounter % logInterval === 0) {
      auditLog('RENDER', "Scene rendered", {
        count: renderCount,
        memory: renderer.info.memory,
        objects: scene.children.length
      });
    }
  } catch (error) {
    auditLog('RENDER', "ERROR rendering scene", {
      error: error.message,
      stack: error.stack
    });
  }
}

// Main initialization function
async function init() {
  auditLog('INIT', "Starting 3D Blockchain Visualizer v19 (AUDIT)");
  
  // Initialize settings
  initSettings();
  
  // Initialize scene and camera
  initScene();
  
  // Set up controls
  setupControls();
  
  // Set up event listeners
  setupEventListeners();
  
  // Set up visualization
  auditLog('INIT', "Setting up visualization...");
  const success = await setupVisualization();
  
  if (success) {
    auditLog('INIT', "Starting animation loop");
    clock.start();
    animate();
  } else {
    auditLog('INIT', "Failed to set up visualization");
  }
}

// Update version counter in UI
const versionCounter = document.getElementById('version-counter');
if (versionCounter) {
  versionCounter.innerText = 'v19';
  auditLog('INIT', "Version counter set to v19");
}

// Start the application
init();