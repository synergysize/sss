# Blockchain Visualizer Update: Recursive Hierarchical Structure

## Version 25 Update

The latest update to the 3D Blockchain Visualizer implements a completely new visualization approach with a recursive, hierarchical 3D structure that creates a powerful representation of the wallet ecosystem.

### Key Features

1. **Central Core Node**
   - Massive white glowing sphere at the center (0, 0, 0) representing the core of the blockchain ecosystem
   - Gently pulsates to create a sense of life and energy

2. **Medium-Tier Branch Nodes**
   - 20 medium-sized spheres orbiting the core in a spherical formation
   - 10 green spheres representing Fartcoin branches
   - 10 blue spheres representing GoatToken branches
   - Positioned using golden-angle spiral placement for optimal distribution
   - Distance from core: ~8,000 units

3. **Wallet Nodes**
   - 2,000 small wallet nodes (1,000 green for Fartcoin, 1,000 blue for GoatToken)
   - Each medium branch node has 100 wallet nodes orbiting it
   - Positioned using golden-angle spiral for natural distribution
   - Distance from parent medium nodes: ~2,000 units
   - Size varies based on wallet balance (larger nodes = larger balances)
   - Brightness varies based on wallet balance (brighter nodes = larger balances)

4. **Animation & Movement**
   - Medium nodes gently orbit around the central core
   - Wallet nodes maintain their relative position to their parent medium node
   - All nodes have subtle oscillation for a dynamic, living appearance
   - Full 3D navigation with fly controls and jetpack for immersive exploration

### Technical Implementation

The new structure is implemented using:

1. **Spherical Fibonacci Distribution**
   - Uses the golden angle to evenly distribute points on a sphere
   - Creates visually pleasing and mathematically balanced patterns

2. **Hierarchical Animation System**
   - Parent-child relationship between medium nodes and wallet nodes
   - Coordinated movement preserves the structural relationships

3. **Dynamic Scaling**
   - Node size and brightness dynamically scaled based on wallet balance
   - Creates visual hierarchy and information encoding

### Visual Appearance

The complete visualization resembles a massive glass dandelion, molecular structure, or data galaxy with:

- Total span of approximately 50,000 units edge-to-edge
- Clear hierarchical organization with defined layers
- Color-coded nodes for easy identification of token types

This update provides a more intuitive, beautiful, and informative visualization of the blockchain data that highlights the relationships between wallets and tokens in a striking 3D representation.