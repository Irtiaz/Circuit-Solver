import { CircuitPath, CircuitConnection, CircuitPoint } from "./Circuit"

export type LoggerT = (_: LoggerParamType) => void;

export const enum Action {
	MESH_DETECTION,
	KVL_MESH_SEQUENCE,
	EQUATION_PART_DETECTION,
	EQUATION_DETECTION,
	EQUATION_MANIPULATION,
	EQUATION_SOLUTION,
	INDIVIDUAL_COMPUTATION,
	VOLTAGE_COMPUTATION_PATH,
	VOLTAGE_PART_DETECTION
};

export type LoggerParamType = {
	action: Action.MESH_DETECTION;
	meshes: CircuitPath[];
} | {
	action: Action.KVL_MESH_SEQUENCE;
	meshIndex: number;
	sequence: CircuitPath;
} | {
	action: Action.EQUATION_PART_DETECTION;
	connection: CircuitConnection;
	positiveMeshCurrentIndex: number;
	negativeMeshCurrentIndex?: number;
} | {
	action: Action.EQUATION_DETECTION;
	equation: number[];
	equationIndex: number;
} | {
	action: Action.EQUATION_MANIPULATION;
	fromEquationNumber: number;
	subEquationNumber: number;
	factorNumerator: number;
	factorDenominator: number;
	resultEquationNumber: number;
	resultEquation: number[];
} | {
	action: Action.EQUATION_SOLUTION;
	equationNumber: number;
	variable: number;
	solution: number;
} | {
	action: Action.INDIVIDUAL_COMPUTATION;
	connection: CircuitConnection;
	meshCurrents: {
		index: number;
		polarity: "positive" | "negative",
		value: number;
	}[]
} | {
	action: Action.VOLTAGE_COMPUTATION_PATH;
	path: CircuitPath | null;
} | {
	action: Action.VOLTAGE_PART_DETECTION;
	source: CircuitPoint;
	sink: CircuitPoint;
	value: number;
};
