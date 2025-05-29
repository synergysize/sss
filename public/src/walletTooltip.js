/**
 * walletTooltip.js - A standalone tooltip solution for wallet data
 * 
 * This creates a visible floating tooltip that isn't dependent on HTML elements
 * but is drawn directly on the canvas.
 */

import * as THREE from 'three';

class WalletTooltip {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.visible = false;
    this.walletData = null;
    this.position = new THREE.Vector3();
    this.offset = new THREE.Vector3(0, 200, 0);
    this.linkArea = null; // Store the clickable area for the address link
    
    // Create sprite for the tooltip background
    const tooltipTexture = this.createTooltipTexture();
    this.tooltipMaterial = new THREE.SpriteMaterial({
      map: tooltipTexture,
      transparent: true,
      opacity: 0.9,
      depthTest: false,
      depthWrite: false
    });
    
    this.tooltipSprite = new THREE.Sprite(this.tooltipMaterial);
    this.tooltipSprite.scale.set(400, 200, 1);
    this.tooltipSprite.visible = false;
    this.tooltipSprite.userData.clickable = true; // Mark as clickable for raycaster
    this.scene.add(this.tooltipSprite);
    
    // Set up click event listener for handling address link clicks
    this.setupClickHandler();
    
    console.log('Created 3D wallet tooltip');
  }
  
  setupClickHandler() {
    // Create click event listener for the canvas
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.addEventListener('click', (event) => {
        if (!this.visible || !this.linkArea || !this.walletData) return;
        
        // Convert mouse position to tooltip-relative coordinates
        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        
        // Get tooltip position in screen space
        const tooltipScreenPos = this.tooltipSprite.position.clone().project(this.camera);
        const tooltipX = (tooltipScreenPos.x + 1) * rect.width / 2;
        const tooltipY = (-tooltipScreenPos.y + 1) * rect.height / 2;
        
        // Check if click is within the link area
        const relativeX = mouseX - (tooltipX - this.tooltipSprite.scale.x / 2);
        const relativeY = mouseY - (tooltipY - this.tooltipSprite.scale.y / 2);
        
        if (
          relativeX >= this.linkArea.x && 
          relativeX <= this.linkArea.x + this.linkArea.width &&
          relativeY >= this.linkArea.y && 
          relativeY <= this.linkArea.y + this.linkArea.height
        ) {
          // Open Solscan link in a new tab
          window.open(this.linkArea.url, '_blank');
          console.log('Opening Solscan link:', this.linkArea.url);
        }
      });
      console.log('Set up click handler for wallet address links');
    } else {
      console.error('Canvas not found for click handler setup');
    }
  }
  
  createTooltipTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    
    const context = canvas.getContext('2d');
    
    // Draw background
    context.fillStyle = 'rgba(0, 10, 30, 0.9)';
    context.strokeStyle = 'rgba(100, 200, 255, 0.8)';
    context.lineWidth = 4;
    context.beginPath();
    context.roundRect(10, 10, canvas.width - 20, canvas.height - 20, 15);
    context.fill();
    context.stroke();
    
    // No title text as per the requirements
    
    // Add placeholder text
    context.fillStyle = '#ffffff';
    context.font = '16px Monospace';
    context.fillText('Address: 0x000...000', 30, 80);
    context.fillStyle = '#88ff88';
    context.fillText('Fartcoin: 0', 30, 110);
    context.fillStyle = '#8888ff';
    context.fillText('Goat: 0', 30, 140);
    context.fillStyle = '#ffffff';
    context.font = 'bold 16px Arial';
    context.fillText('Total Value: 0', 30, 180);
    
    // Create texture
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    // Store context for updates
    this.canvasContext = context;
    this.canvas = canvas;
    
    return texture;
  }
  
  updateTooltipContent(walletData) {
    if (!walletData) return;
    
    const context = this.canvasContext;
    
    // Clear the previous content
    context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw background
    context.fillStyle = 'rgba(0, 10, 30, 0.9)';
    context.strokeStyle = 'rgba(100, 200, 255, 0.8)';
    context.lineWidth = 4;
    context.beginPath();
    context.roundRect(10, 10, this.canvas.width - 20, this.canvas.height - 20, 15);
    context.fill();
    context.stroke();
    
    // No title text as per the requirements
    
    // Format address
    const address = walletData.address;
    const shortAddress = address.length > 12 
      ? `${address.substring(0, 8)}...${address.substring(address.length-4)}` 
      : address;
    
    // Format values
    const fartAmountFormatted = walletData.fartAmount.toLocaleString(undefined, {
      maximumFractionDigits: 2
    });
    
    const goatAmountFormatted = walletData.goatAmount.toLocaleString(undefined, {
      maximumFractionDigits: 2
    });
    
    const totalAmountFormatted = (walletData.fartAmount + walletData.goatAmount).toLocaleString(undefined, {
      maximumFractionDigits: 2
    });
    
    // Add wallet data with solscan link styling (underlined text)
    context.fillStyle = '#aaccff';
    context.font = '16px Monospace';
    
    // Draw wallet address with underline to indicate it's clickable
    const addressText = `Address: ${shortAddress}`;
    context.fillText(addressText, 30, 80);
    
    // Draw underline to indicate this is a link
    const addressTextWidth = context.measureText(addressText).width;
    context.beginPath();
    context.moveTo(30, 83);
    context.lineTo(30 + addressTextWidth, 83);
    context.strokeStyle = '#aaccff';
    context.lineWidth = 1;
    context.stroke();
    
    // Store link data for click handling
    this.linkArea = {
      x: 30,
      y: 65,
      width: addressTextWidth,
      height: 20,
      url: `https://solscan.io/account/${address}`
    };
    
    context.fillStyle = '#88ff88';
    context.fillText(`Fartcoin: ${fartAmountFormatted}`, 30, 110);
    context.fillStyle = '#8888ff';
    context.fillText(`Goat: ${goatAmountFormatted}`, 30, 140);
    context.fillStyle = '#ffffff';
    context.font = 'bold 16px Arial';
    context.fillText(`Total Value: ${totalAmountFormatted}`, 30, 180);
    
    // Update texture
    this.tooltipMaterial.map.needsUpdate = true;
  }
  
  show(walletData, worldPosition) {
    this.walletData = walletData;
    this.position.copy(worldPosition);
    this.updateTooltipContent(walletData);
    this.tooltipSprite.visible = true;
    this.visible = true;
    console.log('Showing 3D tooltip');
  }
  
  hide() {
    this.tooltipSprite.visible = false;
    this.visible = false;
    console.log('Hiding 3D tooltip');
  }
  
  update() {
    if (!this.visible) return;
    
    // Position tooltip to follow target position in world space
    // but offset to the right side
    
    // Get position in screen space
    const screenPosition = this.position.clone().project(this.camera);
    
    // Add offset to the right
    screenPosition.x += 0.2;
    
    // Convert back to world space
    const worldPosition = screenPosition.clone().unproject(this.camera);
    
    // Set tooltip position
    this.tooltipSprite.position.copy(worldPosition);
    
    // Position at the same distance as camera
    const cameraDistance = this.camera.position.distanceTo(this.position);
    const direction = worldPosition.clone().sub(this.camera.position).normalize();
    this.tooltipSprite.position.copy(this.camera.position).add(direction.multiplyScalar(cameraDistance * 0.8));
  }
}

export default WalletTooltip;