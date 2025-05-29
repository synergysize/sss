// This is a wrapper for the main.js file
// Import necessary modules
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FlyControls } from 'three/examples/jsm/controls/FlyControls.js';

// Create a scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 20000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

// Set up renderer
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Set background color to deep space blue
scene.background = new THREE.Color(0x000815);

// Create sample objects to test visibility
function createTestObjects() {
  // Create a simple grid for reference
  const gridHelper = new THREE.GridHelper(2000, 20, 0xff0000, 0x444444);
  scene.add(gridHelper);
  
  // Add some test cubes of different colors
  const geometry = new THREE.BoxGeometry(200, 200, 200);
  
  // Red cube at origin
  const redMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const redCube = new THREE.Mesh(geometry, redMaterial);
  redCube.position.set(0, 0, 0);
  scene.add(redCube);
  
  // Green cube offset
  const greenMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  const greenCube = new THREE.Mesh(geometry, greenMaterial);
  greenCube.position.set(500, 200, -300);
  scene.add(greenCube);
  
  // Blue cube offset
  const blueMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
  const blueCube = new THREE.Mesh(geometry, blueMaterial);
  blueCube.position.set(-400, -200, 200);
  scene.add(blueCube);
  
  // Add some point lights
  const light1 = new THREE.PointLight(0xffffff, 1, 1000);
  light1.position.set(0, 300, 500);
  scene.add(light1);
  
  const light2 = new THREE.PointLight(0xffffff, 1, 1000);
  light2.position.set(500, 100, 0);
  scene.add(light2);
  
  return [redCube, greenCube, blueCube];
}

// Create the test objects
const testObjects = createTestObjects();

// Set initial camera position - position it to see all objects
// Positioned further back to ensure visibility
camera.position.set(0, 500, 1500);
camera.lookAt(0, 0, 0);
console.log('Initial camera position:', camera.position);
console.log('Initial camera position set:', camera.position);

// Detect if device is touch-based (mobile/tablet)
const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
console.log(`Device type detected: ${isTouchDevice ? 'Touch (Mobile/Tablet)' : 'Desktop'}`);

// Initialize appropriate controls based on device type
let controls;
let controlType;

if (isTouchDevice) {
  // Use OrbitControls for touch devices
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.rotateSpeed = 0.5;
  controls.screenSpacePanning = false;
  controls.minDistance = 100;
  controls.maxDistance = 5000;
  controlType = 'Orbit';
  console.log('Using OrbitControls for touch device');
} else {
  // Use FlyControls for desktop
  controls = new FlyControls(camera, renderer.domElement);
  controls.movementSpeed = 300;
  controls.dragToLook = true;
  controls.rollSpeed = 0.5;
  controlType = 'Fly';
  console.log('Using FlyControls for desktop');
}

// Set the target/lookAt point for OrbitControls
if (controlType === 'Orbit') {
  controls.target.set(0, 0, 0);
}

// Initial update
controls.update();

// Update controls instructions based on detected control type
const controlsElement = document.getElementById('controls');
if (controlsElement) {
  if (controlType === 'Fly') {
    controlsElement.innerHTML = '<p>WASD/Arrows: Move | Q/E: Roll | Drag: Look</p>';
  } else {
    controlsElement.innerHTML = '<p>Left Click: Rotate | Right Click: Pan | Scroll: Zoom</p>';
  }
}

// Handle window resize
window.addEventListener('resize', () => {
  // Update camera aspect
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Render loop
const clock = new THREE.Clock();

// Add counter to limit logging frequency (don't spam console)
let frameCounter = 0;
const logInterval = 60; // Log every 60 frames (approx. every 1 second at 60fps)

function animate() {
  requestAnimationFrame(animate);
  
  const delta = clock.getDelta();
  
  // Update controls - FlyControls requires delta, OrbitControls ignores it
  controls.update(delta);
  
  // Rotate the cubes for animation
  testObjects.forEach((cube, index) => {
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01 * (index + 1);
  });
  
  // Log camera position and control type periodically
  frameCounter++;
  if (frameCounter % logInterval === 0) {
    console.log(`Camera position: (${camera.position.x.toFixed(0)}, ${camera.position.y.toFixed(0)}, ${camera.position.z.toFixed(0)})`);
    console.log(`Active control type: ${controlType}`);
    
    // Reset counter to avoid potential overflow
    if (frameCounter > 1000) frameCounter = 0;
  }
  
  renderer.render(scene, camera);
}

animate();

// Display application state
console.log('Test application initialized with:', testObjects.length, 'test objects');