export interface SensorData {
  timestamp: number;
  value: number;
}

export interface SensorReadings {
  ph: SensorData[];
  moisture: SensorData[];
  co2: SensorData[];
  humidity: SensorData[];
  temperature: SensorData[];
}

export interface CurrentSensorValues {
  ph: number;
  moisture: number;
  co2: number;
  humidity: number;
  temperature: number;
}

export interface MLModelInfo {
  name?: string;
  version?: string;
  accuracy: number;
  lastTrainedDate: string;
  batchStartDate?: string;           // e.g. "2026-03-07"
  status: 'active' | 'inactive' | 'training';
  predictions: {
    fruitingReadiness: number;       // raw score, not a percentage
    estimatedHarvestDate: string;    // may be "Delayed" — never parse as Date
    healthScore: number;
    label?: string;                  // "Good" | "Fair" | "Bad"
    labelIndex?: number;             // 0=Good, 1=Fair, 2=Bad
    timestamp?: string;              // "2026-03-08 11:52:15.608185"
  };
  features?: string[];
  description?: string;
}

// Raw shape written by the firmware to Firebase /robotArm
export interface RobotArmRaw {
  currentPlot?: number;
  lastAction?: string;
  targetPlot?: number;
  commandTimestamp?: number;
  status?: {          // firmware writes status as a nested object
    currentPlot?: number;
    lastAction?: string;
    state?: string;   // "idle" | "moving" | "operating" | "homing" etc.
  } | string;         // tolerate if firmware changes it back to a string
  command?: {
    action?: string;
    targetPlot?: number;
    timestamp?: number;
  };
}

// Normalised view used by the UI
export interface RobotArmPosition {
  currentPlot: number;
  state: 'idle' | 'moving' | 'operating' | 'homing' | string;
  lastAction: string;
  targetPlot: number;
}

export interface Plot {
  id: number;
  name: string;
  status: 'active' | 'inactive';
  lastVisited: string;
}

export interface SensorControlCommand {
  sensorType: 'ph' | 'moisture' | 'co2' | 'humidity' | 'temperature';
  action: 'read' | 'calibrate';
  timestamp: number;
}

export interface LightControl {
  intensity: number;
  isAuto: boolean;
  status: 'on' | 'off';
}

export interface HumidifierControl {
  /** 'on' | 'off' — current actuator state */
  status: 'on' | 'off';
}

export interface Alert {
  id: string;
  type: 'warning' | 'error' | 'info' | 'success' | 'pest';
  message: string;
  timestamp: number;
  acknowledged: boolean;
  image?: string;
  false_alarm?: boolean;
}
