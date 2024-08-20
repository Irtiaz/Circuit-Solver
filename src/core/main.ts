import { CircuitGraph, CircuitConnection, CircuitPoint, CircuitComponent } from "./Circuit"
import { printEquation } from "./EquationSolver"

import { Action, LoggerParamType, LoggerT } from "./Logger"

import { inspect } from "util";
function deeplog(stuff: any): void {
	console.log(inspect(stuff, false, null, false));
}

function logger(param: LoggerParamType): void {
	if (param.action == Action.MESH_DETECTION) {
		console.log("Detected meshes - ");
		for (let meshIndex = 0; meshIndex < param.meshes.length; ++meshIndex) {
			console.log(`Mesh ${meshIndex} => ${param.meshes[meshIndex].toString()}`);
		}
		return;
	}
	
	if (param.action == Action.KVL_MESH_SEQUENCE) {
		console.log(`Traversing mesh ${param.meshIndex} in sequence ${param.sequence.toString()}`);
		return;
	}

	if (param.action == Action.EQUATION_PART_DETECTION) {
		const { connection, positiveMeshCurrentIndex, negativeMeshCurrentIndex } = param;
		let string = `Moving from ${connection.points[0].toString()} to ${connection.points[1].toString()}: `;
		if (connection.component == null) string += " a wire";
		else if (connection.component.kind == "Battery") {
			string += `${connection.component.value}`;
		}
		else if (connection.component.kind == "Resistance") {
			const currentString = negativeMeshCurrentIndex != undefined? `(I${positiveMeshCurrentIndex} - I${negativeMeshCurrentIndex})` : `I${positiveMeshCurrentIndex}`;
			string += `${connection.component.value}${currentString}`;
		}
		console.log(string);
		return;
	}

	if (param.action == Action.EQUATION_DETECTION) {
		const { equation, equationIndex } = param;
		let string = "";
		for (let i = 0; i < equation.length - 1; ++i) {
			if (equation[i] == 0) continue;
			if (string.length != 0) {
				if (equation[i] > 0) string += " + ";
				else string += " - ";
				string += `${Math.abs(equation[i])}I${i}`;
			}
			else {
				string += `${equation[i]}I${i}`;
			}
			
		}
		string += ` = ${equation[equation.length - 1]} ... ... ... (${equationIndex})`;
		console.log(string);
		return;
	}

	if (param.action == Action.EQUATION_MANIPULATION) {
		const { fromEquationNumber, subEquationNumber, factorNumerator, factorDenominator, resultEquationNumber, resultEquation } = param;

		console.log(`(${fromEquationNumber}) - ${factorNumerator}/${factorDenominator} * (${subEquationNumber}) => (${resultEquationNumber})`);
		printEquation(resultEquation, resultEquationNumber);

		return;
	}

	if (param.action == Action.EQUATION_SOLUTION) {
		const { equationNumber, variable, solution } = param;
		console.log(`From (${equationNumber}), I${variable} = ${solution}`);
		return;
	}

	if (param.action == Action.INDIVIDUAL_COMPUTATION) {
		const { connection, meshCurrents } = param;
		let string = `For ${connection.toString()}, `;

		let currentString = "current: ";
		for (const {index, polarity} of param.meshCurrents) {
			if (polarity == "positive") currentString += "+";
			else currentString += "-";
			currentString += `I${index}`;
		}
		currentString += ` = ${connection.getCurrent()}`;

		let voltageString = "voltage: ";
		if (connection.component == null || connection.component.kind == "Battery") voltageString += `${connection.getVoltage()} V`;
		else voltageString += `${connection.getCurrent()} x ${connection.component.value}V = ${connection.getVoltage()} V`;
		string += "\n" + currentString + "\n" + voltageString;
		console.log(string);

		return;
	}

	if (param.action == Action.VOLTAGE_COMPUTATION_PATH) {
		if (!param.path) console.log("Disconnected nodes have undefined voltage difference");
		else console.log(`Walking in ${param.path.toString()}`);
		return;
	}

	if (param.action == Action.VOLTAGE_PART_DETECTION) {
		console.log(`Voltage drop from ${param.source.toString()} to ${param.sink.toString()} is ${param.value} V`);
		return;
	}
}


function main() {
	const graph = new CircuitGraph();
	const connections: CircuitConnection[] = [
		new CircuitConnection(new CircuitPoint(-1, -1, 'A'), new CircuitPoint(0, -1, 'B'), null),
		new CircuitConnection(new CircuitPoint(0, -1, 'B'), new CircuitPoint(1, -1, 'C'), new CircuitComponent("Battery", 10)),
		new CircuitConnection(new CircuitPoint(1, -1, 'C'), new CircuitPoint(1, 0, 'D'), null),
		new CircuitConnection(new CircuitPoint(1, 0, 'D'), new CircuitPoint(1, 1, 'E'), null),
		new CircuitConnection(new CircuitPoint(1, 1, 'E'), new CircuitPoint(0, 1, 'F'), new CircuitComponent("Resistance", 2)),
		new CircuitConnection(new CircuitPoint(0, 1, 'F'), new CircuitPoint(-1, 1, 'G'), new CircuitComponent("Resistance", 1)),
		new CircuitConnection(new CircuitPoint(-1, 1, 'G'), new CircuitPoint(-1, 0, 'H'), null),
		new CircuitConnection(new CircuitPoint(-1, 0, 'H'), new CircuitPoint(-1, -1, 'A'), null),
		new CircuitConnection(new CircuitPoint(0, 0, 'I'), new CircuitPoint(0, -1, 'B'), null),
		new CircuitConnection(new CircuitPoint(0, 0, 'I'), new CircuitPoint(-1, 0, 'H'), new CircuitComponent("Resistance", 2)),
		new CircuitConnection(new CircuitPoint(0, 0, 'I'), new CircuitPoint(0, 1, 'F'), new CircuitComponent("Resistance", 5)),
		new CircuitConnection(new CircuitPoint(0, 0, 'I'), new CircuitPoint(1, 0, 'D'), new CircuitComponent("Resistance", 4))
	];
	/*
	const connections: CircuitConnection[] = [
		new CircuitConnection(new CircuitPoint(0, 0), new CircuitPoint(1, 0), new CircuitComponent("Battery", 6)),
		new CircuitConnection(new CircuitPoint(1, 0), new CircuitPoint(1, 1), null),
		new CircuitConnection(new CircuitPoint(1, 1), new CircuitPoint(0, 1), new CircuitComponent("Resistance", 2)),
		new CircuitConnection(new CircuitPoint(0, 1), new CircuitPoint(0, 0), null),
		new CircuitConnection(new CircuitPoint(1, 0), new CircuitPoint(2, 0), new CircuitComponent("Resistance", 10)),
		new CircuitConnection(new CircuitPoint(2, 0), new CircuitPoint(3, 0), new CircuitComponent("Battery", 8)),
		new CircuitConnection(new CircuitPoint(3, 0), new CircuitPoint(3, 1), null),
		new CircuitConnection(new CircuitPoint(3, 1), new CircuitPoint(2, 1), new CircuitComponent("Resistance", 4)),
		new CircuitConnection(new CircuitPoint(2, 1), new CircuitPoint(2, 0), null),
	];
	*/
	
	for (const connection of connections) {
		graph.addConnection(connection);
	}

	graph.calculateAllCurrents(logger);
	console.log(graph.voltageBetween(new CircuitPoint(-1, -1, 'A'), new CircuitPoint(1, 1, 'E'), logger));
}


if (typeof require !== 'undefined' && require.main === module) {
	main();
}
