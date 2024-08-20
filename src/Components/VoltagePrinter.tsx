import { CircuitGraph, CircuitPoint, CircuitConnection } from "../core/Circuit"
import { CurrentPrinter } from "./CurrentPrinter"
import { MutableRefObject } from "react"
import { MathJax } from "better-react-mathjax"
import { nanoid } from "nanoid"

import type { CurrentComputation } from "./CircuitCalculator"

interface Props {
	graph: CircuitGraph;
	printedVoltages: MutableRefObject<Map<string, number>>;
	currentComputations: MutableRefObject<Map<CircuitConnection, CurrentComputation>>;
	points: [CircuitPoint, CircuitPoint];
	forcePrint: boolean;
};


export const VoltagePrinter: React.FC<Props> = ({ graph, printedVoltages, points, currentComputations, forcePrint }) => {
	const hash = hashCode(points);
	const name = getVoltageName(points);
	const previouslyPrintedValue = printedVoltages.current.get(hash);

	if (previouslyPrintedValue !== undefined) {
		if (forcePrint) return <MathJax>\({name} =  {previouslyPrintedValue} V\)</MathJax>;
		return <></>;
	}
	

	const reversePrintedVoltage = printedVoltages.current.get(hashCode([points[1], points[0]]));
	if (reversePrintedVoltage !== undefined) {
		const voltage = -reversePrintedVoltage;
		printedVoltages.current.set(hash, voltage);
		const reverseName = getVoltageName([points[1], points[0]]);

		return (
			<div>
				<MathJax>
					{`\\( ${name} = -${reverseName} = ${voltage} V  \\)`}
				</MathJax>
			</div>
		);
	}

	const shortestPath = graph.shortestPath(points[0], points[1]);

	if (shortestPath === null) return <MathJax>\({name}\) is not defined since there is no direct path</MathJax>;
	
	let nameString = "";
	let valueString = "";
	let voltage = 0;
	for (let i = 0; i < shortestPath.points.length - 1; ++i) {
		const connection = shortestPath.connections[i];
		const partName = getVoltageName([shortestPath.points[i], shortestPath.points[i + 1]]);
		nameString += partName;
		if (i !== shortestPath.points.length - 2) nameString += " + ";

		let partVoltage = 0;
		if (connection.component) {
			partVoltage = connection.component.kind === "Battery"? connection.component.value : connection.getCurrent() * connection.component.value;
			if (connection.points[0].equals(shortestPath.points[i + 1])) partVoltage *= -1;
		}
		voltage += partVoltage;
		
		let partString = "" + partVoltage;
		if (partVoltage < 0) partString = partString = `(${partString})`;
		valueString += partString;

		if (i !== shortestPath.points.length - 2) valueString += " + ";
	}

	if (shortestPath.connections.length > 1) valueString = `\\{${valueString}\\}`;
	valueString += " V";

	if (shortestPath.connections.length > 1) printedVoltages.current.set(hashCode(points), voltage);

	return (
		<div>
			Adding all the voltage drops in path <MathJax style={{display: "inline"}}>\({shortestPath.toString()}\)</MathJax> will give us <MathJax style={{display: "inline"}}>\({name}\)</MathJax>

			{shortestPath.connections.map((connection, index) => <VoltagePartPrinter
				key={nanoid()}
				graph={graph}
				connection={connection}
				flipped={connection.points[0].equals(shortestPath.points[index + 1])}
				printedVoltages={printedVoltages}
				currentComputations={currentComputations}
			/>)}

			<MathJax>
				{`\\( ${name} = ${nameString} = ${valueString} = ${voltage} V \\)`}
			</MathJax>

		</div>
	);
}

interface PartProps {
	graph: CircuitGraph;
	connection: CircuitConnection;
	flipped: boolean;
	printedVoltages: MutableRefObject<Map<string, number>>;
	currentComputations: MutableRefObject<Map<CircuitConnection, CurrentComputation>>;
}

const VoltagePartPrinter: React.FC<PartProps> = ({ graph, connection, flipped, printedVoltages, currentComputations }) => {
	const temp = connection.points.slice();
	if (flipped) temp.reverse();

	const points = temp as unknown as [CircuitPoint, CircuitPoint];

	const hash = hashCode(points);
	const previouslyPrintedValue = printedVoltages.current.get(hash);
	if (previouslyPrintedValue !== undefined) return <></>;

	const name = getVoltageName(points);

	const reversePrintedVoltage = printedVoltages.current.get(hashCode([points[1], points[0]]));
	if (reversePrintedVoltage !== undefined) {
		const voltage = -reversePrintedVoltage;
		printedVoltages.current.set(hash, voltage);
		const reverseName = getVoltageName([points[1], points[0]]);

		return (
			<div>
				<MathJax>
					{`\\( ${name} = -${reverseName} = ${voltage} V  \\)`}
				</MathJax>
			</div>
		);
	}

	if (connection.component === null) throw new Error("The voltage of a wire was not previously known!");
	if (connection.component.kind === "Battery") throw new Error("The voltage (flipped or not) of a battery should have been already handled");
	
	const current = flipped? -connection.getCurrent() : connection.getCurrent();
	const voltage = current * connection.component.value;
	printedVoltages.current.set(hashCode(points), voltage);

	return (
		<div>
			<CurrentPrinter graph={graph} currentComputations={currentComputations} points={points} />
			<MathJax>
				{`\\( ${name} = ${connection.component.value} \\times ${getCurrentName(points)} = ${voltage} V  \\)`}
			</MathJax>
		</div>
	);
}

export function hashCode(points: [CircuitPoint, CircuitPoint]): string {
	return `${points[0].toString()}-${points[1].toString()}`;
}

function getVoltageName(points: [CircuitPoint, CircuitPoint]): string {
	return `V_{${points[0].toString()}${points[1].toString()}}`;
}

function getCurrentName(points: [CircuitPoint, CircuitPoint]): string {
	return `I_{${points[0].toString()}${points[1].toString()}}`;
}
