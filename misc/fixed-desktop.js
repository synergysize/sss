import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { initializeData, fartcoinHolders, goatTokenHolders, sharedHolders } from './dataLoader.js';
import { sharedPoints, fartcoinPoints, goatTokenPoints, generateAllPoints } from './positionMapper.js';

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
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 20000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

// CRITICAL: Set renderer size before anything else
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Set background color to deep space blue
scene.background = new THREE.Color(0x000815);

// Add strong lighting for better visibility
const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(1, 1, 1).normalize();
scene.add(directionalLight);

// Add debug helpers for orientation
const axesHelper = new THREE.AxesHelper(300);
scene.add(axesHelper);
const gridHelper = new THREE.GridHelper(2000, 20, 0xff0000, 0xffffff);
scene.add(gridHelper);

// Define boxCenter at global scope with a default value
let boxCenter = new THREE.Vector3(0, 0, 0);

// Create starfield background
function createStarfield() {
  const geometry = new THREE.BufferGeometry();
  const starCount = 2000;
  const positions = new Float32Array(starCount * 3);
  const sizes = new Float32Array(starCount);
  
  // Create stars at random positions with random sizes
  for (let i = 0; i < starCount; i++) {
    const i3 = i * 3;
    // Random position in a large sphere around the scene
    const radius = 5000 + Math.random() * 10000;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    
    positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i3 + 2] = radius * Math.cos(phi);
    
    // Random sizes between 1 and 5
    sizes[i] = 1 + Math.random() * 4;
  }
  
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  
  // Star material with soft glow
  const starMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 2,
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending
  });
  
  // Create stars and add to scene
  const stars = new THREE.Points(geometry, starMaterial);
  stars.name = 'starfield';
  scene.add(stars);
  
  return stars;
}

// Add starfield to the scene
const starfield = createStarfield();

// Initial camera setup - safe starting position
camera.position.set(0, 0, 3000);
camera.lookAt(0, 0, 0);

// Always use OrbitControls for both desktop and mobile
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.1;
controls.rotateSpeed = 0.5;
controls.screenSpacePanning = true;
controls.minDistance = 500;
controls.maxDistance = 30000;
const controlType = 'Orbit';

// Set the target/lookAt point for OrbitControls
controls.target.set(0, 0, 0);

// Initial update
controls.update();

// Initialize and prepare visualization data
// We need to properly handle the async data loading
async function initAndGeneratePoints() {
  console.log('Starting async data initialization');
  await initializeData();
  console.log('Data initialized, generating points');
  generateAllPoints();
  console.log('Points generated, creating visualization');
  createVisualization();
}

// Start the initialization process
initAndGeneratePoints();

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
  
  console.log(`Creating ${pointsArray.length} sprites for ${groupName}`);
  
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
    const baseScale = point.amount ? (Math.log(point.amount) * 10) : 200;
    const scale = Math.max(200, baseScale * 3);
    sprite.scale.set(scale, scale, 1);
    
    // Add to group
    group.add(sprite);
  });
  
  // Add the group to the scene
  scene.add(group);
  console.log(`Added ${group.children.length} sprites for ${groupName} to scene`);
  
  return group;
}

// Create the visualization after data is loaded
function createVisualization() {
  // Data verification - check that wallet data was loaded successfully
  if (sharedPoints.length === 0 || fartcoinPoints.length === 0 || goatTokenPoints.length === 0) {
    console.error('ERROR: Missing wallet data for visualization!');
  } else {
    console.log('Wallet data loaded successfully:',
      `${sharedPoints.length} shared wallets,`,
      `${fartcoinPoints.length} Fartcoin wallets,`,
      `${goatTokenPoints.length} Goat Token wallets`);
  }

  // Create all wallet point clouds
  if (sharedPoints.length > 0 && fartcoinPoints.length > 0 && goatTokenPoints.length > 0) {
    // Create point clouds for each dataset
    const sharedGroup = createWalletPointCloud(sharedPoints, 'sharedWallets', 0xffffff);
    const fartcoinGroup = createWalletPointCloud(fartcoinPoints, 'fartcoinWallets', 0x00ff00);
    const goatTokenGroup = createWalletPointCloud(goatTokenPoints, 'goatTokenWallets', 0x0000ff);
    
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
        console.log(`Adding ${group.name} with ${group.children.length} sprites to bounding box`);
        group.children.forEach(sprite => {
          if (sprite && sprite.position) {
            boundingBox.expandByPoint(sprite.position);
          }
        });
      }
    };
    
    // Add all wallet groups to the bounding box
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
    
    // Calculate camera distance
    const cameraDistance = Math.max(3000, maxDim * 2.5);
    
    // Position the camera to fit the bounding box
    camera.position.set(
      boxCenter.x, 
      boxCenter.y + maxDim * 0.5,
      boxCenter.z + cameraDistance
    );
    
    // Look at the center of the wallet cloud
    camera.lookAt(boxCenter);
    
    // Update controls target
    controls.target.copy(boxCenter);
    controls.update();
    
    // Add test sphere at origin for debugging
    const testSphere = new THREE.Mesh(
      new THREE.SphereGeometry(200, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true })
    );
    testSphere.position.set(0, 0, 0);
    scene.add(testSphere);
    
    // Add another test sphere at boxCenter
    const centerSphere = new THREE.Mesh(
      new THREE.SphereGeometry(200, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true })
    );
    centerSphere.position.copy(boxCenter);
    scene.add(centerSphere);
    
  } else {
    console.error('Error: Missing wallet data for visualization.');
  }
}

// Update controls instructions
const controlsElement = document.getElementById('controls');
if (controlsElement) {
  controlsElement.innerHTML = '<p>Left Click: Rotate | Right Click: Pan | Scroll: Zoom</p>';
}

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Render loop
const clock = new THREE.Clock();
let frameCounter = 0;
const logInterval = 60;

// Store initial camera position and target for recovery
const initialCameraPosition = camera.position.clone();
const initialCameraTarget = boxCenter.clone();

function animate() {
  requestAnimationFrame(animate);
  
  const delta = clock.getDelta();
  
  // Update controls
  controls.update();
  
  // Subtle starfield rotation
  if (starfield) {
    starfield.rotation.y += delta * 0.01;
    starfield.rotation.x += delta * 0.005;
  }
  
  // Periodic logging
  frameCounter++;
  if (frameCounter % logInterval === 0) {
    console.log(`Camera position: (${camera.position.x.toFixed(0)}, ${camera.position.y.toFixed(0)}, ${camera.position.z.toFixed(0)})`);
    
    // Check for invalid camera position
    if (isNaN(camera.position.x) || isNaN(camera.position.y) || isNaN(camera.position.z)) {
      console.warn('Invalid camera position detected, resetting to initial position');
      camera.position.copy(initialCameraPosition);
      controls.target.copy(initialCameraTarget);
      controls.update();
    }
    
    if (frameCounter > 1000) frameCounter = 0;
  }
  
  // Render the scene
  renderer.render(scene, camera);
}

animate();