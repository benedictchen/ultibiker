# UltiBiker - No Mock/Fake Code Policy

## 🚫 Strict Policy: NO MOCK OR FAKE CODE

**UltiBiker is a real-world cycling sensor data aggregation platform. We maintain a strict policy against any form of mock, fake, demo, or simulated code.**

### ❌ Prohibited Code Types

The following types of code are **NEVER ALLOWED** in this codebase:

#### Mock Sensors
- Mock sensor managers
- Fake device discovery
- Simulated sensor readings
- Dummy hardware interfaces

#### Fake Data
- Generated heart rate data
- Artificial power meter readings
- Simulated cadence/speed values
- Test sensor data streams

#### Demo/Development Code
- Demo devices for presentations
- Development-only sensor simulation
- Preview/placeholder sensor data
- Training mode with fake metrics

#### Test Doubles in Production
- Mock services in production builds
- Stub implementations in runtime
- Fake API responses for real endpoints
- Development flags that enable fake data

### ✅ What IS Allowed

#### Test Code (Test Directory Only)
- Unit test mocks using test frameworks
- Integration test stubs in `/tests/` directory
- Test doubles for isolated testing
- **But NEVER in production code paths**

#### Error Simulation
- Network error simulation for resilience testing
- Hardware failure testing scenarios
- Permission denial testing
- **But NEVER fake successful sensor data**

### 🎯 Rationale

#### Data Integrity
- Cycling performance data must be authentic
- Training metrics require real physiological readings
- Athletic performance tracking demands accuracy
- Fake data corrupts analytical insights

#### User Trust
- Athletes rely on accurate data for training
- Coaches need real metrics for athlete development
- Performance analysis requires authentic readings
- Any fake data destroys credibility

#### Product Authenticity
- UltiBiker is positioned as a serious training tool
- Professional cyclists and teams are target users
- Data accuracy is our core value proposition
- Fake data is fundamentally incompatible with our mission

### 🔧 Implementation Requirements

#### Hardware Requirements
- **ANT+ sensors require ANT+ USB stick**
- **Bluetooth sensors require BLE 4.0+ adapter**
- **Real cycling sensors** (heart rate, power, cadence, speed)
- **Physical hardware must be present and functional**

#### Development Process
- All sensor integration must use real hardware
- Testing requires actual sensor devices
- Development environments need physical sensors
- No shortcuts with simulated hardware

#### Code Reviews
- All code must be reviewed for mock/fake implementations
- Any simulation code triggers immediate rejection
- Pull requests with mock data are automatically declined
- Documentation must emphasize real hardware requirements

### 🚨 Violation Consequences

#### Immediate Actions
- Code containing mock/fake implementations is immediately removed
- Pull requests with fake data are rejected without review
- Documentation emphasizing fake capabilities is corrected
- Environment variables enabling mock mode are deleted

#### Long-term Measures
- Codebase audits to ensure no mock code exists
- Documentation updates to emphasize real hardware requirements
- User warnings about hardware requirements
- Clear messaging that fake sensors are not supported

### 📋 Compliance Checklist

Before any code merge, verify:

- [ ] No mock sensor implementations
- [ ] No fake data generation
- [ ] No development-only simulation features
- [ ] No environment flags for fake modes
- [ ] All sensor code requires real hardware
- [ ] Error messages guide users to real hardware
- [ ] Documentation emphasizes hardware requirements
- [ ] No demo/test devices in production paths

### 🔍 Code Audit Commands

Use these commands to verify no mock code exists:

```bash
# Search for mock/fake patterns
grep -r -i "mock" src/ --exclude-dir=tests
grep -r -i "fake" src/ --exclude-dir=tests
grep -r -i "demo" src/ --exclude-dir=tests
grep -r -i "simulate" src/ --exclude-dir=tests

# Search for test-only patterns in production
grep -r "isDev\|isTest\|NODE_ENV.*test" src/
grep -r "MOCK_\|FAKE_\|DEMO_" src/

# Verify all sensor managers require real hardware
find src/sensors -name "*.ts" -exec grep -l "real\|hardware\|physical" {} \;
```

### 📖 Alternative Solutions

#### For Development Without Hardware
- **Use existing test suite** - comprehensive unit and integration tests
- **Borrow/purchase real sensors** - invest in actual hardware
- **Partner with sensor manufacturers** - get development units
- **Use sensor manufacturer APIs** - if available for testing

#### For Demonstrations
- **Use real sensors during demos** - authentic experience
- **Show recorded sessions** - replay actual cycling data
- **Use manufacturer demo units** - real hardware in demo mode
- **Partner with cycling teams** - access to professional setups

### 📞 Support

If you encounter pressure to add mock/fake code:

1. **Refer to this policy document**
2. **Emphasize data integrity requirements**
3. **Suggest alternative testing approaches**
4. **Contact project leads for clarification**

### 📅 Policy Updates

This policy is reviewed quarterly and updated as needed. Any changes require:

- Team consensus on data integrity requirements
- Documentation updates across all relevant files
- Code audits to ensure compliance
- User communication about any requirement changes

---

**Remember: UltiBiker's value comes from real, accurate cycling sensor data. Fake data undermines everything we stand for.**