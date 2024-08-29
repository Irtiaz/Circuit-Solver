import { CircuitDrawer } from "./Components/CircuitDrawer"
import { CircuitCalculator } from "./Components/CircuitCalculator"
import { CircuitConnection, CircuitPoint, CircuitComponent, CircuitGraph } from "./core/Circuit"
import { useState, useRef } from "react"
import "./App.css"

type ToolType = "Wire" | "Resistance" | "Battery" | "Delete";
export interface Coordinate {
	x: number;
	y: number;
};

const App: React.FC<{}> = () => {
	const [tool, setTool] = useState<ToolType>("Wire");
	const [connections, setConnections] = useState<CircuitConnection[]>([]);
	const [showGrid, setShowGrid] = useState(true);

	const [circuitGraph, setCircuitGraph] = useState<CircuitGraph | null>(null);

	const [lastRemoved, setLastRemoved] = useState<CircuitConnection | null>(null);

	const usedNames = useRef(new Set<string>());

	function getNextName(): string {
		for (let letter = "A"; letter !== "Z"; letter = String.fromCharCode(letter.charCodeAt(0) + 1)) {
			if (!usedNames.current.has(letter)) {
				usedNames.current.add(letter);
				return letter;
			}
		}

		throw new Error("All the letters in the alphabet are taken already");
	}

	function handleAddEvent(coordinates: [Coordinate, Coordinate]): void {
		let component: CircuitComponent | null = null;
		if (tool !== "Wire") {
			const value = parseInt(prompt("Value (in " + (tool === "Resistance"? "Ω)" : "V)")) || "");
			if (!isNaN(value)) {
				component = new CircuitComponent(tool === "Resistance"? "Resistance" : "Battery", value);
			}
			else return;
		}

		const copyOfConnections = connections.slice();

		for (let i = copyOfConnections.length - 1; i >= 0; --i) {
			const connection = copyOfConnections[i];
			for (const coordinate of coordinates) {
				if (connection.goesThroughCoordinate(coordinate.x, coordinate.y)) {
					copyOfConnections.splice(i, 1);
					const splitPoint = createPoint(coordinate, copyOfConnections);
					if (Math.abs(coordinate.x - connection.points[0].x) <= Math.abs(coordinate.x - connection.points[1].x)) {
						const wire = new CircuitConnection(connection.points[0], splitPoint, null);
						const restComponent = new CircuitConnection(splitPoint, connection.points[1], connection.component !== null? connection.component.clone() : null);
						copyOfConnections.push(wire);
						copyOfConnections.push(restComponent);
					}
					else {
						const wire = new CircuitConnection(splitPoint, connection.points[1], null);
						const restComponent = new CircuitConnection(connection.points[0], splitPoint, connection.component !== null? connection.component.clone() : null);
						copyOfConnections.push(wire);
						copyOfConnections.push(restComponent);
					}
				}
			}
		}

		const connection = new CircuitConnection(createPoint(coordinates[0], copyOfConnections), createPoint(coordinates[1], copyOfConnections), component);
		copyOfConnections.push(connection);
		setConnections(copyOfConnections);

		setLastRemoved(null);
	}

	function handleDeleteEvent(connection: CircuitConnection): void {
		setLastRemoved(connection);

		const copyOfConnections = connections.slice();
		for (let i = copyOfConnections.length - 1; i >= 0; --i) {
			if (copyOfConnections[i] === connection) {
				copyOfConnections.splice(i, 1);

				for (const point of connection.points) {
					let foundInOtherConnections = false;
					for (const otherConnection of copyOfConnections) {
						if (otherConnection.points[0].equals(point) || otherConnection.points[1].equals(point)) {
							foundInOtherConnections = true;
							break;
						}
					}
					if (!foundInOtherConnections) usedNames.current.delete(point.symbol);
				}

				setConnections(copyOfConnections);
				return;
			}
		}
	}

	function createPoint(coordinate: Coordinate, connections: CircuitConnection[]): CircuitPoint {
		for (const connection of connections) {
			for (const point of connection.points) {
				if (point.x === coordinate.x && point.y === coordinate.y) return point;
			}
		}

		return new CircuitPoint(coordinate.x, coordinate.y, getNextName());
	}

	function handleSubmission(): void {
		if (!circuitGraph) {
			setShowGrid(false);

			const graph = new CircuitGraph();
			for (const connection of connections) {
				graph.addConnection(connection);
			}

			setCircuitGraph(graph);
		}

		else {
			setShowGrid(true);
			setCircuitGraph(null);
		}
	}

	return (
		<div className="App">

			{!circuitGraph && <div style={{marginBottom: "1em"}}>
				<div style={{display: "inline", marginRight: "1em"}}>
					{toolButton("Wire", tool, setTool)}
					{toolButton("Resistance", tool, setTool)}
					{toolButton("Battery", tool, setTool)}
					{toolButton("Delete", tool, setTool)}
				</div>
				<div style={{display: "inline", marginRight: "1em"}}>
					{connections.length > 0 && <button onClick={() => handleDeleteEvent(connections[connections.length - 1])} className={"remove-button"}>Remove last connection</button>}
					{lastRemoved && <button className={"bring-back-button"} onClick={() => {
						const copyOfConnections = connections.slice();
						copyOfConnections.push(lastRemoved);
						
						for (const point of lastRemoved.points) {
							usedNames.current.add(point.symbol);
						}

						setConnections(copyOfConnections);
						setLastRemoved(null);
					}}>Undo removal</button>}
				</div>
				<input type="checkbox" checked={showGrid} onChange={() => setShowGrid(!showGrid)}/>Show grid
			</div>}
			
			<CircuitDrawer 
				interactive={!circuitGraph}
				showGrid={showGrid}
				connectionMode={!circuitGraph && tool === "Delete"}
				connections={connections}
				handleAddEvent={handleAddEvent}
				handleDeleteEvent={handleDeleteEvent}
			/>

			<button className={!circuitGraph? "submit-button" : "primary-button"} onClick={() => handleSubmission()}>
				{!circuitGraph? "Calculate" : "Edit"}
			</button>

			{circuitGraph && <CircuitCalculator graph={circuitGraph} />}

		</div>
	);
}

function toolButton(tool: ToolType, currentTool: ToolType, setTool: (tool: ToolType) => void): JSX.Element{
	return <button style={tool === currentTool? {backgroundColor: "rgb(0, 105, 217)", color: "white", cursor: "pointer"} : {cursor: "pointer"}} onClick={() => setTool(tool)}>{tool}</button>
}

export default App;
