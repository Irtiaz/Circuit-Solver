import Sketch from "react-p5"
import p5Types from "p5"

import { CircuitConnection, CircuitPoint } from "../core/Circuit"

import type { Coordinate } from "../App"

interface MeshInfo {
	index: number;
	points: CircuitPoint[];
}

interface Props {
	interactive: boolean;
	showGrid: boolean;
	connectionMode: boolean;
	connections: CircuitConnection[];
	handleAddEvent?: (points: [Coordinate, Coordinate]) => void;
	handleDeleteEvent?: (connection: CircuitConnection) => void;

	meshInfos?: MeshInfo[];
}

export const CircuitDrawer: React.FC<Props> = ({ interactive, showGrid, connectionMode, connections, handleAddEvent, handleDeleteEvent, meshInfos }) => {
	const gridSpacing = 20;

	let selectedPoint: p5Types.Vector | null = null;

	function setup(p5: p5Types, canvasParentRef: Element): void {
		p5.createCanvas(800, 600).parent(canvasParentRef);
		p5.textAlign(p5.CENTER, p5.CENTER);
	}

	function draw(p5: p5Types): void {
		p5.background(255);

		if (showGrid) drawGrid(p5, gridSpacing);

		renderConnections(connections, gridSpacing, connectionMode? getNearbyConnection(connections, p5) : null, p5);

		if (interactive) {
			const highlightedPoint = connectionMode? null : getNearbyPoint(p5, gridSpacing);
			if (highlightedPoint) highlightPoint(p5, highlightedPoint);
			if (selectedPoint) highlightPoint(p5, selectedPoint);
		}

		if (meshInfos) {
			renderMeshes(meshInfos, p5);
		}

	}

	function mousePressed(p5: p5Types): void {
		if (isMouseInside(p5) && interactive) {

			if (!connectionMode) {
				const nearbyPoint = getNearbyPoint(p5, gridSpacing);
				if (nearbyPoint) {
					if (!selectedPoint) selectedPoint = nearbyPoint;
					else {
						if (handleAddEvent) handleAddEvent([{x: selectedPoint.x, y: selectedPoint.y}, {x: nearbyPoint.x, y: nearbyPoint.y}]);
						selectedPoint = null;
					}
				}
			}

			else {
				const nearestConnection = getNearbyConnection(connections, p5);
				if (nearestConnection && handleDeleteEvent) handleDeleteEvent(nearestConnection);
			}
		}
	}

	function keyPressed(p5: p5Types): void {
		if (p5.keyCode === p5.ESCAPE) selectedPoint = null;
	}

	return <Sketch setup={setup} draw={draw} mousePressed={mousePressed} keyPressed={keyPressed}/>
}

function getNearbyPoint(p5: p5Types, gridSpacing: number): p5Types.Vector | null {
	return isMouseInside(p5)? p5.createVector(
		Math.round(p5.mouseX / gridSpacing) * gridSpacing,
		Math.round(p5.mouseY / gridSpacing) * gridSpacing
	) : null;
}

function getNearbyConnection(connections: CircuitConnection[], p5: p5Types): CircuitConnection | null {
	if (!isMouseInside(p5) || connections.length === 0) return null;
	let nearest: CircuitConnection = connections[0];
	let smallestSquareDistance = connections[0].squareDistanceFrom(p5.mouseX, p5.mouseY);
	for (let i = 1; i < connections.length; ++i) {
		const squareDistance = connections[i].squareDistanceFrom(p5.mouseX, p5.mouseY);
		if (squareDistance < smallestSquareDistance) {
			smallestSquareDistance = squareDistance;
			nearest = connections[i];
		}
	}
	return nearest;
}

function isMouseInside(p5: p5Types): boolean {
	return p5.mouseX >= 0 && p5.mouseX <= p5.width && p5.mouseY >= 0 && p5.mouseY <= p5.height;
}

function renderLabels(connections: CircuitConnection[], p5: p5Types): void {
	p5.textSize(15);
	for (const connection of connections) {
		const p1 = pointToVector(connection.points[0], p5);
		const p2 = pointToVector(connection.points[1], p5);

		label(connection.points[0].symbol, connections, connection, p1.x, p1.y - 20, p5);
		label(connection.points[1].symbol, connections, connection, p2.x, p2.y - 20, p5);
	}
}

function renderConnections(connections: CircuitConnection[], gridSpacing: number, nearestConnection: CircuitConnection | null, p5: p5Types): void {
	for (const connection of connections) {
		const p1 = pointToVector(connection.points[0], p5);
		const p2 = pointToVector(connection.points[1], p5);
		const length = p5Types.Vector.dist(p1, p2);

		const segment = p5Types.Vector.sub(p2, p1);

		p5.push();
		p5.translate(p1.x, p1.y);
		p5.rotate(segment.heading());

		p5.stroke(0);
		p5.fill(0);
		p5.circle(0, 0, 8);
		p5.circle(length, 0, 8);

		if (connection === nearestConnection) p5.stroke(255, 0, 0);
		else p5.stroke(0);

		if (connection.component === null) {
			p5.strokeWeight(2);
			p5.line(0, 0, length, 0);
			p5.strokeWeight(1);
		}

		else {
			if (connection.component.kind === "Battery") {
				const componentLength = gridSpacing / 2;
				const remainingWire = length - gridSpacing;
				p5.strokeWeight(2);
				p5.line(0, 0, remainingWire / 2, 0);
				p5.line(remainingWire / 2, 10, remainingWire / 2, -10);
				p5.line(remainingWire / 2 + componentLength, 5, remainingWire / 2 + componentLength, -5);
				p5.line(remainingWire / 2 + componentLength, 0, length, 0);
			}

			else {
				const componentLength = gridSpacing;
				const numberOfSpikes = 3;
				const spikeDistance = componentLength / numberOfSpikes;
				const spikeLength = 10;

				const remainingWire = length - gridSpacing;
				p5.strokeWeight(2);
				p5.line(0, 0, remainingWire / 2, 0);

				for (let spike = 0; spike < numberOfSpikes; ++spike) {
					const startX = spike === 0?  remainingWire / 2 : remainingWire / 2  + spike * spikeDistance;
					p5.line(startX, spike === 0? 0 : -spikeLength, startX + spikeDistance / 2, spikeLength);
					p5.line(startX + spikeDistance / 2, spikeLength, startX + spikeDistance, spike === numberOfSpikes - 1? 0 : -spikeLength);
				}

				p5.line(remainingWire / 2 + componentLength, 0, length, 0);
			}

			p5.fill(0);
			p5.noStroke();
			p5.textSize(18);
			p5.text(`${connection.component.value} ${connection.component.kind === "Battery"? "V" : "Ω"}`, length / 2, -15);
		}

		p5.pop();
	}

	renderLabels(connections, p5);
}

function pointToVector(point: CircuitPoint, p5: p5Types): p5Types.Vector {
	return p5.createVector(point.x, point.y);
}

function label(name: string, connections: CircuitConnection[], connection: CircuitConnection, x: number, y: number, p5: p5Types): void {
	let foundBefore = false;
	for (const other of connections) {
		if (other.equals(connection)) break;
		for (const point of other.points) {
			if (point.symbol === name) {
				foundBefore = true;
				break;
			}
		}
		if (foundBefore) break;
	}
	if (!foundBefore) {
		p5.fill(255, 0, 0);
		p5.stroke(255, 0, 0);
		p5.text(name, x, y + 10);
	}
}

function renderMeshes(meshInfos: MeshInfo[], p5: p5Types) {
	p5.stroke(0);
	for (const {index, points} of meshInfos) {
		const centerCoordinate = getCentroid(points);
		const center = p5.createVector(centerCoordinate.x, centerCoordinate.y);

		const meshCurrentTextSize = 18;
		const meshCurrentCircleRadius = meshCurrentTextSize * 1.1;

		p5.stroke(0);
		p5.noFill();
		p5.circle(center.x, center.y, meshCurrentCircleRadius * 2);

		const arrowLength = 8;
		const arrowWidth = 5;
		p5.stroke(0);
		p5.fill(0);
		p5.push();
		p5.translate(center.x, center.y);
		p5.triangle(0, meshCurrentCircleRadius + arrowWidth, 0, meshCurrentCircleRadius - arrowWidth, areClockwise(points)? arrowLength : -arrowLength, meshCurrentCircleRadius); 
		p5.pop();

		p5.fill(0, 0, 255);
		p5.noStroke();
		p5.textSize(meshCurrentTextSize);
		p5.text(index, center.x, center.y);
	}
}


function getArea(points: CircuitPoint[]): number {
	let area = 0;
	for (let i = 0; i < points.length - 1; ++i) {
		area += points[i].x * points[i + 1].y - points[i + 1].x * points[i].y;
	}
	area /= 2;
	return area;
}

function getCentroid(points: CircuitPoint[]): {x: number, y: number} {
	let x = 0;
	let y = 0;

	for (let i = 0; i < points.length - 1; ++i) {
		const factor = points[i].x * points[i + 1].y - points[i + 1].x * points[i].y;
		x += (points[i].x + points[i + 1].x) * factor;
		y += (points[i].y + points[i + 1].y) * factor;
	}

	const area = getArea(points);
	x /= 6 * area;
	y /= 6 * area;

	return { x, y };
}

function areClockwise(points: CircuitPoint[]): boolean {

	for (let i = 0; i < points.length - 2; ++i) {
		const v1 = {x: points[i + 1].x - points[i].x, y: points[i + 1].y - points[i].y};
		const v2 = {x: points[i + 2].x - points[i + 1].x, y: points[i + 2].y - points[i + 1].y};

		const crossProduct = v1.x * v2.y - v2.x * v1.y;
		if (crossProduct < 0) return true;
		else if (crossProduct > 0) return false;
	}

	throw new Error("Impossible! a mesh has to be either clockwise or anticlockwise. It can't be neither");
}

function drawGrid(p5: p5Types, gridSpacing: number): void {
	for (let x = 0; x < p5.width; x += gridSpacing) {
		for (let y = 0; y < p5.height; y += gridSpacing) {
			p5.fill(220);
			p5.stroke(0);
			p5.circle(x, y, 3);
		}
	}
}

function highlightPoint(p5: p5Types, point: p5Types.Vector): void {
	p5.stroke(0);
	p5.fill(255, 0, 0);
	p5.circle(point.x, point.y, 7);
}
