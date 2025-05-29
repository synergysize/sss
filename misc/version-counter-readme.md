# Version Counter Feature

## Overview
A version counter has been added to the 3D Blockchain Visualizer to provide visual commit tracking. This feature allows for easy verification of successful deployments and tracking of application updates.

## Implementation Details

### UI Component
- A minimal version indicator appears in the top-right corner of the screen
- Styled with low opacity to be non-intrusive
- Displays the current version number with a "v" prefix (e.g., "v2")

### Update Process
- A helper script (`increment-version.sh`) automates version number increments
- The version number should be incremented with each new commit
- The version counter is part of the DOM and always visible, making it easy to verify which version is deployed

### Benefits
- Provides immediate visual feedback when a new version is deployed
- Helps troubleshoot deployment issues
- Allows users and developers to reference specific versions
- Creates a visual history of the application's evolution

For detailed usage instructions, please see `version-counter-guide.md`.