import { ref, onValue, set, push, update, query, limitToLast } from 'firebase/database';
import { database } from '../config/firebase';
import {
  SensorData,
  CurrentSensorValues,
  MLModelInfo,
  RobotArmPosition,
  RobotArmRaw,
  Plot,
  SensorControlCommand,
  LightControl,
  HumidifierControl,
  Alert
} from '../types';

// Sensor Data Services
export const subscribeSensorData = (
  sensorType: string,
  callback: (data: SensorData[]) => void
) => {
  const sensorRef = ref(database, `sensors/${sensorType}/history`);
  return onValue(sensorRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      const dataArray = Object.values(data) as SensorData[];
      callback(dataArray.slice(-50)); // Last 50 readings
    } else {
      callback([]);
    }
  });
};

export const subscribeCurrentSensorValues = (
  callback: (data: CurrentSensorValues) => void
) => {
  const sensorRef = ref(database, 'sensors/current');
  return onValue(sensorRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      callback(data);
    } else {
      callback({
        ph: 0,
        moisture: 0,
        co2: 0,
        humidity: 0,
        temperature: 0
      });
    }
  });
};

export const writeSensorReading = async (
  sensorType: string,
  value: number
) => {
  const historyRef = ref(database, `sensors/${sensorType}/history`);
  const newReadingRef = push(historyRef);
  await set(newReadingRef, {
    timestamp: Date.now(),
    value
  });

  const currentRef = ref(database, `sensors/current/${sensorType}`);
  await set(currentRef, value);
};

// Camera Frame Service
export const subscribeCameraFrame = (
  callback: (data: string) => void
) => {
  const cameraRef = ref(database, 'camera/frame');
  return onValue(cameraRef, (snapshot) => {
    const data = snapshot.val();
    callback(data || '');
  });
};

// ML Model Services
export const subscribeMLModelInfo = (
  callback: (data: MLModelInfo | null) => void
) => {
  const modelRef = ref(database, 'mlModel');
  return onValue(modelRef, (snapshot) => {
    callback(snapshot.val());
  });
};

export const updateMLModelStatus = async (status: 'active' | 'inactive' | 'training') => {
  const statusRef = ref(database, 'mlModel/status');
  await set(statusRef, status);
};

export const updateMLModelPredictions = async (predictions: MLModelInfo['predictions']) => {
  const predictionsRef = ref(database, 'mlModel/predictions');
  await set(predictionsRef, predictions);
};

// Robot Arm Services

/**
 * Normalise the raw Firebase /robotArm node into a clean RobotArmPosition.
 *
 * Actual Firebase shape (written by the firmware):
 * {
 *   status: {
 *     currentPlot: 3,
 *     lastAction: "Moving to Plot 1",
 *     state: "moving"          // "idle" | "moving" | "operating" | "homing"
 *   },
 *   command: { action, targetPlot, timestamp }
 * }
 * Note: top-level currentPlot / lastAction may also be present in some
 * firmware versions — we handle both.
 */
const normaliseRobotArm = (raw: RobotArmRaw): RobotArmPosition => {
  // Resolve state string — handle both object and legacy string forms
  let state: string = 'idle';
  if (raw.status) {
    if (typeof raw.status === 'string') {
      state = raw.status;
    } else if (typeof raw.status === 'object' && raw.status.state) {
      state = raw.status.state;
    }
  }

  // currentPlot: prefer status sub-object (where firmware writes it), fallback to top-level
  const currentPlot =
    (typeof raw.status === 'object' && raw.status?.currentPlot != null
      ? raw.status.currentPlot
      : null) ??
    (raw.currentPlot != null ? raw.currentPlot : null) ??
    0;

  // lastAction: prefer status sub-object, fallback to top-level
  const lastAction =
    (typeof raw.status === 'object' && raw.status?.lastAction
      ? raw.status.lastAction
      : null) ??
    (raw.lastAction ? raw.lastAction : null) ??
    'No recent action';

  // targetPlot: from command node, fallback to currentPlot
  const targetPlot =
    (typeof raw.command === 'object' && raw.command?.targetPlot != null
      ? raw.command.targetPlot
      : null) ??
    raw.targetPlot ??
    currentPlot;

  return { currentPlot, state, lastAction, targetPlot };
};

export const subscribeRobotArmPosition = (
  callback: (data: RobotArmPosition | null) => void
) => {
  const robotRef = ref(database, 'robotArm');
  return onValue(robotRef, (snapshot) => {
    const raw: RobotArmRaw | null = snapshot.val();
    if (raw) {
      callback(normaliseRobotArm(raw));
    } else {
      callback(null);
    }
  });
};

export const moveRobotToPlot = async (plotId: number) => {
  const commandRef = ref(database, 'robotArm/command');
  await set(commandRef, {
    action: 'move',
    targetPlot: plotId,
    timestamp: Date.now(),
  });
};

export const updateRobotStatus = async (status: 'idle' | 'moving' | 'operating') => {
  const commandRef = ref(database, 'robotArm/command');
  await set(commandRef, {
    action: status === 'idle' ? 'stop' : status,
    targetPlot: 0,
    timestamp: Date.now(),
  });
};

// Plot Services
export const subscribePlots = (callback: (data: Plot[]) => void) => {
  const plotsRef = ref(database, 'plots');
  return onValue(plotsRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      callback(Object.values(data));
    } else {
      callback([]);
    }
  });
};

export const initializePlots = async (numberOfPlots: number) => {
  const plotsRef = ref(database, 'plots');
  const plots: Record<string, Plot> = {};
  for (let i = 1; i <= numberOfPlots; i++) {
    plots[`plot_${i}`] = {
      id: i,
      name: `Plot ${i}`,
      status: 'active',
      lastVisited: new Date().toISOString()
    };
  }
  await set(plotsRef, plots);
};

// Sensor Control Commands
export const sendSensorCommand = async (command: SensorControlCommand) => {
  const commandsRef = ref(database, 'commands/sensors');
  const newCommandRef = push(commandsRef);
  await set(newCommandRef, {
    ...command,
    timestamp: Date.now()
  });
};

export const triggerSensorReading = async (
  sensorType: 'ph' | 'moisture' | 'co2' | 'humidity' | 'temperature'
) => {
  await sendSensorCommand({
    sensorType,
    action: 'read',
    timestamp: Date.now()
  });
};

// Light Control Services
export const subscribeLightControl = (callback: (data: LightControl | null) => void) => {
  const lightRef = ref(database, 'lightControl');
  return onValue(lightRef, (snapshot) => {
    callback(snapshot.val());
  });
};

export const updateLightControl = async (control: Partial<LightControl>) => {
  const lightRef = ref(database, 'lightControl');
  await update(lightRef, control);
};

// Alert Services — only subscribes to the 20 most recent entries server-side
export const subscribeAlerts = (callback: (data: Alert[]) => void) => {
  const alertsRef = query(ref(database, 'alerts'), limitToLast(20));
  return onValue(alertsRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      callback(Object.entries(data)
        .filter(([id]) => id !== 'latest')
        .map(([id, alert]) => ({
          ...(alert as Alert),
          id
        })));
    } else {
      callback([]);
    }
  });
};

export const subscribeLatestSystemStatus = (callback: (data: { status: string, time: string } | null) => void) => {
  const latestRef = ref(database, 'alerts/latest');
  return onValue(latestRef, (snapshot) => {
    callback(snapshot.val());
  });
};

export const acknowledgeAlert = async (alertId: string) => {
  const alertRef = ref(database, `alerts/${alertId}/acknowledged`);
  await set(alertRef, true);
};

export const markFalseAlarm = async (alertId: string) => {
  const falseAlarmRef = ref(database, `alerts/${alertId}/false_alarm`);
  await set(falseAlarmRef, true);
};

export const createAlert = async (alert: Omit<Alert, 'id' | 'timestamp' | 'acknowledged'>) => {
  const alertsRef = ref(database, 'alerts');
  const newAlertRef = push(alertsRef);
  await set(newAlertRef, {
    ...alert,
    timestamp: Date.now(),
    acknowledged: false
  });
};

// ML Model Retrain
export const requestModelRetrain = async () => {
  const retrainRef = ref(database, 'mlModel/retrainRequest');
  await set(retrainRef, {
    requestedAt: Date.now(),
    status: 'pending'
  });
  // Also set model status to 'training'
  const statusRef = ref(database, 'mlModel/status');
  await set(statusRef, 'training');
};

// Light Control - Auto Mode (persisted to Firebase)
export const updateLightAutoMode = async (isAuto: boolean) => {
  const lightRef = ref(database, 'lightControl/isAuto');
  await set(lightRef, isAuto);
};

// Firebase connection status
export const subscribeConnectionStatus = (callback: (connected: boolean) => void) => {
  const connectedRef = ref(database, '.info/connected');
  return onValue(connectedRef, (snapshot) => {
    callback(snapshot.val() === true);
  });
};

// ─── Humidifier Control Services ─────────────────────────────────────────────

/** Subscribe to /humidifier in real-time */
export const subscribeHumidifierControl = (
  callback: (data: HumidifierControl | null) => void
) => {
  const humRef = ref(database, 'humidifier');
  return onValue(humRef, (snapshot) => {
    callback(snapshot.val());
  });
};

/** Manually set humidifier on or off */
export const updateHumidifierControl = async (
  control: Partial<HumidifierControl>
) => {
  const humRef = ref(database, 'humidifier');
  await update(humRef, control);
};

/**
 * Pest response: turn humidifier ON, wait 3 seconds, then turn it OFF.
 * App-side timer — one pulse per new pest alert, regardless of manual state.
 * so firmware stays in control.
 */
export const pulseHumidifierForPest = async () => {
  const humRef = ref(database, 'humidifier');
  await update(humRef, { status: 'on' });
  await new Promise<void>((resolve) => setTimeout(resolve, 3000));
  await update(humRef, { status: 'off' });
};
