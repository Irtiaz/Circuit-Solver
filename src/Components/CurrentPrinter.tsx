import { CircuitGraph, CircuitConnection, CircuitPoint } from "../core/Circuit"
import { MutableRefObject } from "react"
import { MathJax } from "better-react-mathjax"

import type { CurrentComputation } from "./CircuitCalculator"

interface Props {
	graph: CircuitGraph;
	currentComputations: MutableRefObject<Map<CircuitConnection, CurrentComputation>>;
	points: [CircuitPoint, CircuitPoint];
	forcePrint?: boolean;
}

export const CurrentPrinter: React.FC<Props> = ({ graph, currentComputations, points, forcePrint }) => {
	const currentName = getCurrentName(points);

	const connection = graph.connections.filter(connection => connection.points.includes(points[0]) && connection.points.includes(points[1]))[0];
	const computation = currentComputations.current.get(connection);
	if (!computation) throw new Error(`Could not find computation for ${connection.toString()}`);

	const { meshCurrents, printedFrom } = computation;
	const flipped = connection.points[0] !== points[0];
	const value = !flipped? connection.getCurrent() : -connection.getCurrent();

	if (printedFrom.includes(points[0])) {
		if (forcePrint) return <MathJax>\({currentName} = {value} A\)</MathJax>;
		return <></>
	};

	computation.printedFrom.push(points[0]);
	currentComputations.current.set(connection, computation);

	if (printedFrom.includes(points[1])) {
		const reverseCurrentName = getCurrentName(points.slice().reverse());
		return (
			<div>
				<MathJax>
					{`\\( ${currentName} = -${reverseCurrentName} = ${value}  A\\)`}
				</MathJax>
			</div>
		);
	}

	if (meshCurrents.length === 0) {
		return (
			<div>
				There is no mesh current in <MathJax style={{display: "inline"}}>\({currentName}\)</MathJax>, so <MathJax style={{display: "inline"}}>\({currentName} = 0 A\)</MathJax>
			</div>
		);
	}


	const modifiedMeshCurrents = meshCurrents.map(current => ({
		name: `I_{${current.index}}`,
		value: current.value,
		positive: (current.polarity === "positive") !== flipped
	}));

	let nameString = "";
	for (let i = 0; i < modifiedMeshCurrents.length; ++i) {
		const { name, positive } = modifiedMeshCurrents[i];
		if (i != 0 || !positive) nameString += positive? "+" : "-";
		nameString += name;
		nameString += " ";
	}

	let valueString = "";
	for (let i = 0; i < modifiedMeshCurrents.length; ++i) {
		const { value, positive } = modifiedMeshCurrents[i];
		if (i != 0 || !positive) valueString += positive? "+" : "-";
		valueString += value < 0? `(${value})` : value;
		valueString += " ";
	}

	if (modifiedMeshCurrents.length > 1) valueString = `\\{${valueString}\\}`;
	valueString += " A";

	return (
		<div>
			<MathJax>
				{`\\( ${currentName} = ${nameString} = ${valueString} = ${value} A \\)`}
			</MathJax>
		</div>
	);
}

function getCurrentName(points: CircuitPoint[]): string {
	return `I_{${points[0].toString()}${points[1].toString()}}`;
}
