# UltiBiker MVP - User Interface Design

## 🌐 Web Interface Navigation

```
🌐 ULTIBIKER MVP - WEB INTERFACE

┌─────────────────────────────────────────────────────────────────────────┐
│  🚴 UltiBiker MVP                                    [📡 Devices] [📊 Data] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  TAB 1: 📡 DEVICE CONNECTION         TAB 2: 📊 LIVE DATA FEED            │
│  • Scan for sensors                  • Real-time sensor dashboard        │
│  • Pair/Unpair devices              • Live charts and metrics           │
│  • Device role identification       • Raw data stream                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## 📡 Tab 1: Device Connection Interface

```
📡 DEVICE CONNECTION SCREEN
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 🚴 UltiBiker MVP                            [📡 Devices] [📊 Data]              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│ 🔍 SCAN FOR DEVICES                    [🔄 Scanning...] [⏹️ Stop]              │
│                                                                                 │
│ ┌─────────────────────────────────────┐   ┌───────────────────────────────────┐ │
│ │        📋 DETECTED DEVICES          │   │       ✅ CONNECTED DEVICES        │ │
│ │                                     │   │                                   │ │
│ │ 📡 ANT+ Devices:                    │   │ 💓 Wahoo TICKR (Heart Rate)      │ │
│ │ • Garmin HRM-Pro                    │   │    Status: Connected ✅           │ │
│ │   💓 Heart Rate Monitor     [+Add]  │   │    Signal: Strong 📶             │ │
│ │                                     │   │                          [❌ Remove] │
│ │ • Stages Power Meter                │   │                                   │ │
│ │   ⚡ Power Sensor          [+Add]  │   │ ⚡ Stages Gen3 (Power)           │ │
│ │                                     │   │    Status: Connected ✅           │ │
│ │ 📶 Bluetooth Devices:               │   │    Signal: Good 📶               │ │
│ │ • Wahoo RPM                         │   │                          [❌ Remove] │
│ │   🔄 Cadence Sensor        [+Add]  │   │                                   │ │
│ │                                     │   │ 🚴 Tacx Neo (Smart Trainer)     │ │
│ │ • Tacx Neo 2T                       │   │    Status: Connected ✅           │ │
│ │   🚴 Smart Trainer         [+Add]  │   │    Signal: Excellent 📶          │ │
│ │                                     │   │                          [❌ Remove] │
│ │                                     │   │                                   │ │
│ └─────────────────────────────────────┘   └───────────────────────────────────┘ │
│                                                                                 │
│ 📊 Device Status:                                                               │
│ • ANT+ Stick: Connected ✅                                                      │
│ • Bluetooth: Enabled ✅                                                         │
│ • Total Devices: 3 connected                                                   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Device Connection Features

#### 🔍 Device Discovery
- **Real-time Scanning**: Continuous discovery of ANT+ and BLE devices
- **Auto-identification**: Automatic detection of device types and capabilities
- **Signal Strength**: Visual indicators for connection quality
- **Device Icons**: Intuitive symbols for different sensor types

#### 📱 Device Management
- **One-click Pairing**: Simple [+Add] buttons to connect devices
- **Easy Removal**: [❌ Remove] buttons to disconnect/unpair
- **Connection Status**: Real-time status indicators
- **Device Persistence**: Remembered devices between sessions

#### 🏷️ Device Type Icons
```
💓 Heart Rate Monitors    (ANT+ & BLE)
⚡ Power Meters          (ANT+ & BLE) 
🔄 Cadence Sensors       (ANT+ & BLE)
📏 Speed Sensors         (ANT+ & BLE)
🚴 Smart Trainers        (ANT+ & BLE)
🎯 Multi-sensors         (Speed + Cadence)
```

## 📊 Tab 2: Live Data Dashboard

```
📊 LIVE SENSOR DATA SCREEN
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 🚴 UltiBiker MVP                            [📡 Devices] [📊 Data]              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│ 🔴 LIVE DATA FEED - Connected Devices: 5                    ⏱️  12:34:56       │
│                                                                                 │
│ ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐        │
│ │   💓 HEART RATE     │ │    ⚡ POWER        │ │   🔄 CADENCE        │        │
│ │                     │ │                     │ │                     │        │
│ │ 🏆 165 BPM (Chest)  │ │     280 WATTS       │ │     92 RPM          │        │
│ │ 📱 162 BPM (Watch)  │ │   ████████████▓░    │ │   ██████▓░░░░       │        │
│ │   ████████▓░░       │ │   FTP: 320W         │ │   Optimal Range     │        │
│ │   85% Max HR        │ │                     │ │                     │        │
│ │                     │ │ Device: Stages Gen3 │ │ Device: Wahoo RPM   │        │
│ │ Chest: Wahoo TICKR  │ │ Signal: Good 📶     │ │ Signal: Strong 📶   │        │
│ │ Watch: Apple Watch  │ │                     │ │                     │        │
│ │ Signals: 📶📶       │ │                     │ │                     │        │
│ └─────────────────────┘ └─────────────────────┘ └─────────────────────┘        │
│                                                                                 │
│ ┌─────────────────────────────────────────────────────────────────────────────┐ │
│ │                        📈 REAL-TIME CHARTS                                  │ │
│ │                                                                             │ │
│ │ Heart Rate (BPM)    ┌─────────────────────────────────────────────────┐    │ │
│ │ 180 ┤               │                                          /\     │    │ │
│ │ 170 ┤               │ ━━ Chest Strap (165)           /\   /  \    │    │ │
│ │ 160 ┤               │ ┅┅ Apple Watch (162)     /\   /  \_/    \   │    │ │
│ │ 150 ┤               │                    /\   /  \_/           \  │    │ │
│ │ 140 ┤               │              /\   /  \_/                  \_│    │ │
│ │     └───────────────┴─────────────────────────────────────────────────┘    │ │
│ │      0    10   20   30   40   50   60  Time (seconds)                      │ │
│ │                                                                             │ │
│ │ 🔍 Chart Legend: ━━ Primary (Chest)  ┅┅ Secondary (Watch)  📊 Show/Hide   │ │
│ └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│ 📋 RAW DATA STREAM                                           [⏸️ Pause] [📁 Save] │
│ ┌─────────────────────────────────────────────────────────────────────────────┐ │
│ │ 12:34:56 │ HR1: 165 HR2: 162 │ Power: 280W │ Cadence: 92 │ Speed: 35.2 │ ✅ │ │
│ │ 12:34:55 │ HR1: 164 HR2: 161 │ Power: 275W │ Cadence: 91 │ Speed: 35.0 │ ✅ │ │
│ │ 12:34:54 │ HR1: 166 HR2: 163 │ Power: 285W │ Cadence: 93 │ Speed: 35.4 │ ✅ │ │
│ │ 12:34:53 │ HR1: 165 HR2: 162 │ Power: 280W │ Cadence: 92 │ Speed: 35.2 │ ✅ │ │
│ └─────────────────────────────────────────────────────────────────────────────┘ │
│ 📝 Data Labels: HR1=Chest Strap, HR2=Apple Watch                              │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Live Dashboard Features

#### 📊 Metric Cards
- **Large Numbers**: Primary metrics prominently displayed
- **Multiple Sensor Display**: Show overlapping sensors simultaneously (e.g., two heart rate readings)
- **Visual Hierarchy**: Primary sensor prominently displayed, secondary sensors clearly labeled
- **Progress Bars**: Visual representation of intensity zones
- **Context Info**: Training zones, FTP percentages, optimal ranges
- **Device Attribution**: Clear labeling of which sensor provides each metric
- **Signal Quality**: Real-time connection strength for each device

#### 📈 Real-time Charts
- **Live Updates**: Charts update every second with new data
- **Multiple Sensor Lines**: Display overlapping sensors with different line styles
- **Clear Legend**: Visual distinction between sensors (solid/dashed lines, different colors)
- **Interactive Legend**: Click to show/hide individual sensor data
- **Time Windows**: Configurable display duration (30s, 60s, 5min)
- **Smooth Animation**: Fluid transitions for new data points
- **Sensor Selection**: Toggle visibility of individual sensors

#### 📋 Data Stream
- **Raw Feed**: All sensor data with timestamps from all devices
- **Multiple Sensor Columns**: Clear labeling for overlapping sensor types (HR1, HR2, etc.)
- **Device Attribution**: Hover/tooltip shows full device names
- **Pause/Resume**: Control data collection
- **Export Options**: Save data for external analysis with full device attribution
- **Status Indicators**: Connection health per data point for each device

## 🎨 Visual Design System

### Color Coding
```
💓 Heart Rate:    Red (#FF6B6B)      - Cardiovascular focus
⚡ Power:        Orange (#FF922B)    - Energy/intensity  
🔄 Cadence:      Blue (#4DABF7)     - Rhythm/tempo
📏 Speed:        Green (#51CF66)    - Performance/progress
🚴 Trainer:      Purple (#9775FA)   - Equipment/resistance
```

### Signal Strength Indicators
```
📶 Excellent    (4 bars) - Strong connection, no dropouts
📶 Good         (3 bars) - Stable connection, occasional drops  
📶 Fair         (2 bars) - Unstable connection, frequent drops
📶 Poor         (1 bar)  - Weak connection, data loss likely
❌ No Signal    (0 bars) - Disconnected or out of range
```

### Status Indicators
```
✅ Connected     - Device paired and streaming data
🔄 Connecting    - Attempting to establish connection
⚠️  Warning      - Connection issues, intermittent data
❌ Error         - Connection failed or device unavailable
⏸️  Paused       - Data collection temporarily stopped
```

## 📱 Responsive Design

### Desktop Layout (Primary)
- Full side-by-side panels for device management
- Large metric cards with detailed information
- Multi-line charts with extended time periods
- Comprehensive data stream view

### Tablet Layout (iPad)
- Stacked panels that can be swiped between
- Medium-sized metric cards (2x2 grid)
- Simplified charts with touch interactions
- Condensed data stream with essential info

### Mobile Layout (Future)
- Single-panel navigation with tabs
- Large touch targets for metric cards
- Swipeable chart views
- Minimal data stream for performance

## 🔄 User Interaction Flows

### Device Connection Flow
```
1. User clicks "Scan" → 
2. Real-time device discovery →
3. Click "+Add" on detected device →
4. Device connects & moves to connected list →
5. Automatic data streaming begins
```

### Data Viewing Flow
```
1. Switch to Data tab →
2. View live metrics in cards →
3. Monitor real-time charts →
4. Check raw data stream →
5. Optional: Pause/export data
```

### Session Management
```
1. Automatic session start when first device connects →
2. Continuous data collection and storage →
3. User can pause/resume as needed →
4. Session automatically saved on disconnect
```

## 🛠️ Implementation Details

### Frontend Technology
- **Vanilla JavaScript**: Lightweight, no framework overhead
- **Bootstrap 5**: Responsive grid system and components
- **Chart.js**: Real-time data visualization
- **Socket.io Client**: WebSocket connection for live updates
- **CSS Grid/Flexbox**: Modern layout techniques

### Real-time Updates
- **WebSocket Connection**: Persistent connection to server
- **Event-driven Updates**: Push notifications for new data
- **Efficient Rendering**: Only update changed elements
- **Error Handling**: Graceful degradation for connection issues

This UI design prioritizes simplicity, clarity, and real-time feedback - essential for cyclists who need immediate access to their performance data during training sessions.