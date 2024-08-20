import { Question, QuestionType } from "./Question"
import { CircuitGraph } from "../core/Circuit"
import { useState } from "react"
import { nanoid } from "nanoid"

import type { Query } from "./Question"

interface Props {
	graph: CircuitGraph;
	handleQueries: (queries: Query[]) => void;
}

export const QuestionGroup: React.FC<Props> = ({ graph, handleQueries }) => {
	const [queries, setQueries] = useState<Query[]>([]);
	const [interactive, setInteractive] = useState<boolean>(true);
	
	function setType(type: QuestionType, index: number) {
		const copyOfQueries = queries.slice();
		copyOfQueries[index].type = type;
		
		if (type === QuestionType.CURRENT) {
			const pointIndex = copyOfQueries[index].pointIndices[0];

			const point = graph.points[pointIndex];
			const connectionsFromPoint = graph.connectionToNeighbor.get(point);

			if (!connectionsFromPoint) throw new Error(`${point.toString()} is somehow not connected to any other point!`);
			const neighborIndices = connectionsFromPoint.map(connection => graph.points.indexOf(connection.getNeighbor(point)));

			if (!neighborIndices.includes(copyOfQueries[index].pointIndices[1])) {
				copyOfQueries[index].pointIndices[1] = neighborIndices[0];
			}
		}

		setQueries(copyOfQueries);
	}

	function setPointIndex(pointIndex: number, indexInPointsTuple: number, queryIndex: number) {
		const copyOfQueries = queries.slice();
		copyOfQueries[queryIndex].pointIndices[indexInPointsTuple] = pointIndex;

		if (copyOfQueries[queryIndex].type === QuestionType.CURRENT) {
			const point = graph.points[pointIndex];
			const connectionsFromPoint = graph.connectionToNeighbor.get(point);

			if (!connectionsFromPoint) throw new Error(`${point.toString()} is somehow not connected to any other point!`);
			const neighborIndices = connectionsFromPoint.map(connection => graph.points.indexOf(connection.getNeighbor(point)));

			if (!neighborIndices.includes(copyOfQueries[queryIndex].pointIndices[1 - indexInPointsTuple])) {
				copyOfQueries[queryIndex].pointIndices[1 - indexInPointsTuple] = neighborIndices[0];
			}
		}

		else if (copyOfQueries[queryIndex].pointIndices[1 - indexInPointsTuple] === pointIndex) {
			copyOfQueries[queryIndex].pointIndices[1 - indexInPointsTuple] = pointIndex === 0? 1 : 0;
		}

		setQueries(copyOfQueries);
	}

	function handleDelete(index: number) {
		const copyOfQueries = queries.slice();
		copyOfQueries.splice(index, 1);
		setQueries(copyOfQueries);
	}

	function handleToggle() {
		if (interactive) handleQueries(queries);
		setInteractive(!interactive);
	}

	return (
		<div>
			<ol>
				{queries.map((query, index) =>
				<li key={nanoid()}>
					<Question
						graph={graph}
						interactive={interactive}
						type={query.type}
						point1Index={query.pointIndices[0]}
						point2Index={query.pointIndices[1]}
						setType={type => setType(type, index)}
						setPoint1Index={point1Index => setPointIndex(point1Index, 0, index)}
						setPoint2Index={point2Index => setPointIndex(point2Index, 1, index)}
					/>
					{interactive && <button className="delete-button" onClick={() => handleDelete(index)}>Delete</button>}
				</li>)}
			</ol>

			{interactive && <button className="primary-button" onClick={() => {
				const copyOfQueries = queries.slice();
				copyOfQueries.push({
					type: QuestionType.VOLTAGE,
					pointIndices: [0, 1]
				});
				setQueries(copyOfQueries);
			}}>Add query</button>}
			
			{queries.length !== 0 && <button onClick={handleToggle} className={interactive? "submit-button" : "primary-button"}>{interactive? "Submit" : "Edit"}</button>}

		</div>
	);
}
