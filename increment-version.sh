#!/bin/bash

# This script increments the version number in index.html

# Get the current version number
CURRENT_VERSION=$(grep -o 'v[0-9]\+' public/index.html | sed 's/v//')

# Increment the version number
NEW_VERSION=$((CURRENT_VERSION + 1))

# Update the version number in index.html
sed -i "s/v$CURRENT_VERSION/v$NEW_VERSION/" public/index.html

echo "Version incremented from v$CURRENT_VERSION to v$NEW_VERSION"