# Version Counter Guide

A visual version counter has been added to the 3D Blockchain Visualizer to track commits and verify successful deployments.

## Purpose

The version counter serves as a quick visual reference to:

1. Confirm which version of the code is currently deployed
2. Verify that new commits have been successfully deployed
3. Track the number of updates made to the application

## Location

The version counter appears in the top-right corner of the screen with low opacity to minimize visual distraction.

## Incrementing the Version

Each time a new commit is made, follow these steps:

1. Run the increment script before committing:
   ```bash
   ./increment-version.sh
   ```

2. Add the modified index.html file to your commit:
   ```bash
   git add public/index.html
   ```

3. Complete your commit and push as usual:
   ```bash
   git commit -m "Your commit message"
   git push origin main
   ```

## Verification

When the site is deployed, check that the version number in the top-right corner matches what you expect. This provides immediate visual confirmation that your changes have been deployed successfully.

## Manual Update

If you need to manually update the version number, edit the `public/index.html` file and change the number in the div with id `version-counter`.