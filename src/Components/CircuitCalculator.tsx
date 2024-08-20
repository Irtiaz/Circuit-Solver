import { CircuitConnection, CircuitGraph, CircuitPath, CircuitPoint } from "../core/Circuit"
import { MeshInfoPrinter } from "./MeshInfoPrinter"
import { EquationDisplayer } from "./EquationDisplayer"
import { CurrentPrinter } from "./CurrentPrinter"
import { VoltagePrinter, hashCode } from "./VoltagePrinter"
import { QuestionGroup } from "./QuestionGroup"
import { QuestionType } from "./Question"
import { Action } from "../core/Logger"
import { useEffect, useState, useRef } from "react"
import { nanoid } from "nanoid"

import type { LoggerParamType } from "../core/Logger"
import type { Query } from "./Question"

interface Props {
	graph: CircuitGraph;
}

export interface MeshInfo {
	index: number;
	sequence: CircuitPath;
	parts: MeshPart[];
	equation: number[];
}

export interface EquationSolutionInfo {
	manipulations: Manipulation[];
	solutions: Solution[];
};

export interface Manipulation {
	fromEquationNumber: number;
	subEquationNumber: number;
	factorNumerator: number;
	factorDenominator: number;
	resultEquationNumber: number;
	resultEquation: number[];
}

interface MeshPart {
	connection: CircuitConnection;
	positiveMeshCurrentIndex: number;
	negativeMeshCurrentIndex?: number;
}

export interface Solution {
	equationNumber: number;
	variable: number;
	solution: number;
}

export interface CurrentComputation {
	meshCurrents: {
		index: number;
		polarity: "positive" | "negative",
		value: number;
	}[];
	printedFrom: CircuitPoint[];
}

export const CircuitCalculator: React.FC<Props> = ({ graph }) => {
	const [meshInfos, setMeshInfos] = useState<MeshInfo[]>([]);
	const [equationSolutionInfos, setEquationSolutionInfos] = useState<EquationSolutionInfo>({manipulations: [], solutions: []});

	const [queries, setQueries] = useState<Query[]>([]);
	const currentComputations = useRef(new Map<CircuitConnection, CurrentComputation>());
	const printedVoltages = useRef(new Map<string, number>());

	useEffect(() => {
		const events: LoggerParamType[] = [];

		graph.calculateAllCurrents(param => {
			if (param.action == Action.EQUATION_DETECTION || param.action == Action.EQUATION_MANIPULATION || param.action == Action.EQUATION_SOLUTION) {
				events.push(JSON.parse(JSON.stringify(param)));
			}
			else events.push(param);
		});

		if (events.length == 0) return;

		const meshInfosTemp: MeshInfo[] = [];
		const manipulations: Manipulation[] = [];
		const solutions: Solution[] = [];
		const computations = new Map<CircuitConnection, CurrentComputation>();

		for (let i = 0; i < events.length; ++i) {
			const event = events[i];
			if (event.action == Action.KVL_MESH_SEQUENCE) {
				const sequenceEvent = event;
				const meshParts: MeshPart[] = [];
				let j;
				for (j = i + 1; events[j].action != Action.EQUATION_DETECTION; ++j) {
					const partEvent = events[j];
					if (partEvent.action != Action.EQUATION_PART_DETECTION) throw new Error("Impossible!! Mesh sequence event was not followed by part detections!");
					if (partEvent.connection.component) meshParts.push({
						connection: partEvent.connection,
						positiveMeshCurrentIndex: partEvent.positiveMeshCurrentIndex,
						negativeMeshCurrentIndex: partEvent.negativeMeshCurrentIndex
					});
				}
				const equationEvent = events[j];
				if (equationEvent.action != Action.EQUATION_DETECTION) throw new Error("Impossible!! Equation detection event was not in the end");
				const meshInfo: MeshInfo = {
					index: sequenceEvent.meshIndex,
					sequence: sequenceEvent.sequence,
					parts: meshParts,
					equation: equationEvent.equation
				};

				meshInfosTemp.push(meshInfo);
			}
			
			else if (event.action == Action.EQUATION_MANIPULATION) {
				manipulations.push({
					fromEquationNumber: event.fromEquationNumber,
					subEquationNumber: event.subEquationNumber,
					factorNumerator: event.factorNumerator,
					factorDenominator: event.factorDenominator,
					resultEquationNumber: event.resultEquationNumber,
					resultEquation: event.resultEquation
				});
			}
			
			else if (event.action == Action.EQUATION_SOLUTION) {
				solutions.push({
					equationNumber: event.equationNumber,
					variable: event.variable,
					solution: event.solution
				});
			}

			else if (event.action == Action.INDIVIDUAL_COMPUTATION) {
				computations.set(event.connection, {
					meshCurrents: event.meshCurrents,
					printedFrom: []
				});
			}
		}

		setMeshInfos(meshInfosTemp);
		setEquationSolutionInfos({
			manipulations: manipulations,
			solutions: solutions
		});
		
		currentComputations.current = computations;
		resetVoltageMap();

	}, [graph]);


	function handleQueries(queries: Query[]) {
		const copyOfComputations = new Map<CircuitConnection, CurrentComputation>();

		for (const key of Array.from(currentComputations.current.keys())) {
			const computation = currentComputations.current.get(key);
			if (!computation) throw new Error("Impossible! a map key does not exist in a map");
			copyOfComputations.set(key, {
				meshCurrents: computation.meshCurrents,
				printedFrom: []
			});
		}

		currentComputations.current = copyOfComputations;

		setQueries(queries);
		resetVoltageMap();
	}

	function resetVoltageMap() {
		printedVoltages.current = new Map<string, number>();
		const newPrintedVoltages = new Map<string, number>();
		for (const connection of graph.connections) {
			const points = connection.points;
			if (connection.component === null) {
				newPrintedVoltages.set(hashCode(points), 0);
				newPrintedVoltages.set(hashCode([points[1], points[0]]), 0);
			}
			else if (connection.component.kind === "Battery") {
				newPrintedVoltages.set(hashCode(points), connection.component.value);
			}
		}
		printedVoltages.current = newPrintedVoltages;
	}


	return (
		<>
			{meshInfos.length != 0 && <MeshInfoPrinter meshInfos={meshInfos} connections={graph.connections} />}
			{equationSolutionInfos.solutions.length != 0 && <EquationDisplayer equationSolutionInfo={equationSolutionInfos} />}
			<QuestionGroup graph={graph} handleQueries={handleQueries} />
			{queries.length !== 0 && 
			<div>
				Solutions:
			<ol>
				{queries.map(query => query.type === QuestionType.CURRENT? 
					<li key={nanoid()}><CurrentPrinter graph={graph} currentComputations={currentComputations} points={[graph.points[query.pointIndices[0]], graph.points[query.pointIndices[1]]]} forcePrint={true} /></li> : 
					<li key={nanoid()}><VoltagePrinter graph={graph} currentComputations={currentComputations} printedVoltages={printedVoltages} points={[graph.points[query.pointIndices[0]], graph.points[query.pointIndices[1]]]} forcePrint={true} /></li>)}
			</ol>
			</div>
			}
		</>

	);
}
