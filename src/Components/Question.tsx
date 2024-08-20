import { CircuitGraph } from "../core/Circuit"
import { nanoid } from "nanoid"
import { MathJax } from "better-react-mathjax"

export interface Query {
	type: QuestionType;
	pointIndices: [number, number];
}

interface Props {
	graph: CircuitGraph;
	interactive: boolean;
	type: QuestionType;
	point1Index: number;
	point2Index: number;
	setType: (type: QuestionType) => void;
	setPoint1Index: (index: number) => void;
	setPoint2Index: (index: number) => void;
}

export enum QuestionType {
	VOLTAGE,
	CURRENT
};

export const Question: React.FC<Props> = ({ graph, interactive, type, point1Index, point2Index, setType, setPoint1Index, setPoint2Index }) => {
	const point1 = graph.points[point1Index];
	const connectionsFromPoint1 = graph.connectionToNeighbor.get(point1);

	if (!connectionsFromPoint1) throw new Error(`${point1.toString()} is somehow not connected to any other point!`);
	const neighborIndices = connectionsFromPoint1.map(connection => graph.points.indexOf(connection.getNeighbor(point1)));

	return (
		<>
			{interactive && 
			<select value={type} onChange={event => setType(parseInt(event.target.value) as unknown as QuestionType)}>
				<option value={QuestionType.VOLTAGE}>Voltage</option>
				<option value={QuestionType.CURRENT}>Current</option>
			</select>}

			{interactive && type === QuestionType.CURRENT && <>
				From
				<select value={point1Index} onChange={event => setPoint1Index(parseInt(event.target.value))}>
					{graph.points.map((point, index) => <option key={nanoid()} value={index}>{point.toString()}</option>)}
				</select>
				to
				<select value={point2Index} onChange={event => setPoint2Index(parseInt(event.target.value))}>
					{neighborIndices.map(index => <option key={nanoid()} value={index}>{graph.points[index].toString()}</option>)}
				</select>
			</>}

			{interactive && type === QuestionType.VOLTAGE && <>
				Between
				<select value={point1Index} onChange={event => setPoint1Index(parseInt(event.target.value))}>
					{graph.points.map((point, index) => <option key={nanoid()} value={index}>{point.toString()}</option>)}
				</select>
				And
				<select value={point2Index} onChange={event => setPoint2Index(parseInt(event.target.value))}>
					{graph.points.filter((_, index) => index !== point1Index).map(point => <option key={nanoid()} value={graph.points.indexOf(point)}>{point.toString()}</option>)}
				</select>
			</>}

			<MathJax style={{display: "inline"}}>
				{`\\( ${type === QuestionType.VOLTAGE? "V" : "I"}_{${graph.points[point1Index].toString()}${graph.points[point2Index].toString()}} = ? \\)`}
			</MathJax>

		</>
	);
}
