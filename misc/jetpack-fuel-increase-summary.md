# Jetpack Fuel Capacity Increase (v5)

## Changes Implemented

1. **Increased Fuel Capacity**
   - Increased the jetpack fuel from 100 to 250 units (2.5x increase)
   - Updated the maximum fuel capacity from 100 to 250 units
   - Scaled the minimum fuel threshold for reactivation from 10 to 25 units

2. **Benefits**
   - Significantly longer flight time with the jetpack
   - More exploration capability before needing to recharge
   - Improved user experience with less frequent fuel depletion

3. **Technical Details**
   - Maintained the same fuel drain rate (1.2 units per tick)
   - Maintained the same refill rate (0.8 units per tick)
   - Only the capacity values were modified, preserving all other behavior

4. **Version Tracking**
   - Updated version number to v5 for deployment verification

## Implementation Notes

This change provides users with 2.5 times more flight duration while maintaining the same recharge mechanics. The minimum fuel threshold for reactivation has been proportionally increased to maintain the same percentage-based threshold.

All other aspects of the jetpack system remain unchanged:
- Left Shift key for activation
- Increased forward speed when active
- Gradual slowdown after release
- Fuel visual indicator in the corner
- Console logging for debugging