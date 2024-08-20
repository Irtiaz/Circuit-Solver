import { solveEquations } from "./EquationSolver"

import { LoggerT, Action, LoggerParamType } from "./Logger"

export class CircuitPoint {
	readonly x: number;
	readonly y: number;
	readonly symbol: string;

	constructor(x: number, y: number, symbol: string) {
		this.x = x;
		this.y = y;
		this.symbol = symbol;
	}

	public clone(): CircuitPoint {
		return new CircuitPoint(this.x, this.y, this.symbol);
	}

	public equals(other: CircuitPoint): boolean {
		return other.x == this.x && other.y == this.y && other.symbol == this.symbol;
	}

	public toString(): string {
		// return `(${this.x}, ${this.y})`
		return this.symbol;
	}

	public squareDistanceFrom(x: number, y: number): number {
		return (x - this.x) * (x - this.x) + (y - this.y) * (y - this.y);
	}
}

export class CircuitComponent {
	readonly kind: "Battery" | "Resistance";
	readonly value: number;

	constructor(kind: "Battery" | "Resistance", value: number) {
		this.kind = kind;
		this.value = value;
	}

	public clone(): CircuitComponent {
		return new CircuitComponent(this.kind, this.value);
	}

	public equals(other: CircuitComponent | null): boolean {
		if (other == null) {
			return false;
		}
		return other.kind == this.kind && other.value == this.value;
	}

	public revequals(other: CircuitComponent | null): boolean {
		if (other == null) {
			return false;
		}
		return other.kind == this.kind && other.value == (other.kind == "Battery"? -this.value: this.value);
	}
}

export class CircuitConnection {
	readonly points: [CircuitPoint, CircuitPoint];
	readonly component: CircuitComponent | null;
	readonly instanceId: number;
	static classId: number = 0;

	readonly currentSinkNodeInMesh: Map<number, CircuitPoint>;
	private current = 0;
	private voltage = 0;

	constructor(point1: CircuitPoint, point2: CircuitPoint, component: CircuitComponent | null) {
		this.points = [point1, point2];
		this.component = component;
		this.instanceId = CircuitConnection.classId;
		CircuitConnection.classId++;

		this.currentSinkNodeInMesh = new Map<number, CircuitPoint>();
		
		if (this.component == null) this.voltage = 0;
		else if (this.component.kind == "Battery") this.voltage = this.component.value;
	}

	public static alignedConnection(connection: CircuitConnection, source: CircuitPoint): CircuitConnection {
		let comp = connection.component? connection.component.clone() : null;

		if (source.equals(connection.points[0])) return new CircuitConnection(connection.points[0].clone(), connection.points[1].clone(), comp);
		if (connection.component == null || comp == null) return new CircuitConnection(connection.points[1].clone(), connection.points[0].clone(), null);
		if (connection.component.kind == "Battery") comp = new CircuitComponent(comp.kind, -comp.value);
		return new CircuitConnection(connection.points[1].clone(), connection.points[0].clone(), comp);
	}

	public equals(other: CircuitConnection): boolean {
		if (other.points[0].equals(this.points[0]) && other.points[1].equals(this.points[1])) {
			return !other.component || other.component.equals(this.component);
		}
		if (other.points[0].equals(this.points[1]) && other.points[1].equals(this.points[0])) {
			return !other.component || other.component.revequals(this.component);
		}
		return false;
	}

	public toString(): string {
		// return `${this.points[0].toString()} -> ${this.points[1].toString()}`;
		return `${this.points[0].toString()}${this.points[1].toString()}`;
	}

	public goesThroughCoordinate(x: number, y: number): boolean {
		const p1 = this.points[0];
		const p2 = this.points[1];
		return (p2.y - p1.y) * (x - p1.x) == (y - p1.y) * (p2.x - p1.x) && ((x - p1.x) * (x - p2.x) < 0 || (y - p1.y) * (y - p2.y) < 0);
	}

	public squareDistanceFrom(x: number, y: number): number {
		const d1 = this.points[0].squareDistanceFrom(x, y);
		const d2 = this.points[1].squareDistanceFrom(x, y);

		const dotProduct = (this.points[1].x - this.points[0].x) * (x - this.points[0].x) + (this.points[1].y - this.points[0].y) * (y - this.points[0].y);
		const d = this.points[0].squareDistanceFrom(this.points[1].x, this.points[1].y);
		const projection = dotProduct * dotProduct / d;
		const perpendicular = d1 - projection;

		if (dotProduct < 0) return d1;
		else return projection < d? perpendicular : d2;
	}

	public setCurrentAndCalculateVoltage(current: number): void {
		this.current = current;
		if (this.component == null || this.component.kind == "Battery") return;
		this.voltage = this.current * this.component.value;
	}

	public getCurrent(): number {
		return this.current;
	}

	public getVoltage(): number {
		return this.voltage;
	}

	public getNeighbor(source: CircuitPoint): CircuitPoint {
		if (this.points[0].equals(source)) {
			return this.points[1];
		} else if (this.points[1].equals(source)) {
			return this.points[0];
		} else {
			throw new Error("source not in connection");
		}
	}

	public getCommonPoint(connection: CircuitConnection): CircuitPoint {
		if (this.points[0].equals(connection.points[0])) {
			return this.points[0];
		}
		if (this.points[1].equals(connection.points[0])) {
			return this.points[1];
		}
		if (this.points[0].equals(connection.points[1])) {
			return this.points[0];
		}
		if (this.points[1].equals(connection.points[1])) {
			return this.points[1];
		}
		throw new Error("No common point");
	}
}

export class CircuitPath {
	points: CircuitPoint[];
	connections: CircuitConnection[];

	constructor(source: CircuitPoint, connection: CircuitConnection) {
		this.points = [source, connection.getNeighbor(source)];
		this.connections = [connection];
	}

	public appendConnection(connection: CircuitConnection): void {
		const commonPoint = this.connections[this.connections.length - 1].getCommonPoint(connection);
		const neighborPoint = connection.getNeighbor(commonPoint);
		this.points.push(neighborPoint);
		this.connections.push(connection);
	}

	public prependConnection(connection: CircuitConnection): void {
		const commonPoint = this.connections[0].getCommonPoint(connection);
		const neighborPoint = connection.getNeighbor(commonPoint);
		this.points.unshift(neighborPoint)
		this.connections.unshift(connection);
	}

	private getArea(): number {
		const points = this.points;
		let area = 0;
		for (let i = 0; i < points.length; ++i) {
			area += points[i].x * points[i + 1].y - points[i + 1].x * points[i].y;
		}
		area /= 2;
		return area;
	}

	public getCentroid(): {x: number, y: number} {
		const points = this.points;

		let x = 0;
		let y = 0;

		for (let i = 0; i < points.length; ++i) {
			const factor = points[i].x * points[i + 1].y - points[i + 1].x * points[i].y;
			x += (points[i].x + points[i + 1].x) * factor;
			y += (points[i].y + points[i + 1].y) * factor;
		}

		const area = this.getArea();
		x /= 6 * area;
		y /= 6 * area;

		return { x, y };
	}

	public onlyMeetsAtStartAndEnd(path: CircuitPath): boolean {
		if (!this.points[0].equals(path.points[0])) {
			return false;
		}
		if (!this.points[this.points.length - 1].equals(path.points[path.points.length - 1])) {
			return false;
		}

		if (this.equals(path)) {
			return false;
		}


		for (const p1 of this.points.slice(1, this.points.length - 1)) {
			for (const p2 of path.points.slice(1, path.points.length - 1)) {
				if (p1.equals(p2)) {
					return false;
				}
			}
		}
		return true;
	}

	public static unwrapCycle(cycle: CircuitPath, startConnectionIndex: number, startPoint: CircuitPoint): CircuitPath {
		const c = CircuitPath.rotatedCycle(cycle, startConnectionIndex);
		if (c.points[0].equals(startPoint)) {
			return c;
		}
		else return CircuitPath.rotatedCycle(CircuitPath.reversedPath(cycle), startConnectionIndex);
	}

	private static rotatedCycle(cycle: CircuitPath, startIndex: number): CircuitPath {
		const rotated = new CircuitPath(cycle.points[startIndex], cycle.connections[startIndex]);
		for (let i = 1; i < cycle.connections.length; i++) {
			const index = (startIndex + i) % cycle.connections.length;
			rotated.appendConnection(cycle.connections[index]);
		}
		return rotated;
	}

	public static uniqueRotatedCycle(cycle: CircuitPath): CircuitPath {
		let indexOfMinInstanceId = 0;
		let minInstanceId = CircuitConnection.classId;
		for (let i = 0; i < cycle.connections.length; i++) {
			if (cycle.connections[i].instanceId < minInstanceId) {
				minInstanceId = cycle.connections[i].instanceId;
				indexOfMinInstanceId = i;
			}
		}

		return CircuitPath.rotatedCycle(cycle, indexOfMinInstanceId);
	}

	public static reversedPath(path: CircuitPath): CircuitPath {
		const reversed = new CircuitPath(path.points[path.points.length - 1], path.connections[path.connections.length - 1])
		for (let i = path.connections.length - 2; i >= 0; i--) {
			reversed.appendConnection(path.connections[i]);
		}
		return reversed;
	}

	public equals(path: CircuitPath): boolean {
		if (this.points.length != path.points.length) {
			return false;
		}
		for (let i = 0; i < this.connections.length; i++) {
			if (!this.points[i].equals(path.points[i])) {
				return false;
			}
			if (!this.connections[i].equals(path.connections[i])) {
				return false;
			}
		}
		return true;
	}

	public indexOf(connection: CircuitConnection): number {
		for (let i = 0; i < this.connections.length; ++i) {
			if (this.connections[i].equals(connection)) return i;
		}
		return -1;
	}

	public pushToListIfNotExists(paths: CircuitPath[]): void {
		const rotated = CircuitPath.uniqueRotatedCycle(this);
		const revrotated = CircuitPath.uniqueRotatedCycle(CircuitPath.reversedPath(this));
		for (const p of paths) {
			if (p.equals(rotated) || p.equals(revrotated)) {
				return;
			}
		}
		paths.push(rotated);
	}

	public toString(): string {
		let str = '';
		// str += `${this.points[0].toString()} -> ${this.points[1].toString()}`;
		str += `${this.points[0].toString()}${this.points[1].toString()}`;
		for (let i = 2; i < this.points.length; i++) {
			// str += ` -> ${this.points[i].toString()}`;
			str += `${this.points[i].toString()}`;
		}
		return str;
	}

	public static concatedPath(path1: CircuitPath, path2: CircuitPath): CircuitPath {
		const path = new CircuitPath(path1.points[0], path1.connections[0]);
		for (let i = 1; i < path1.connections.length; i++) {
			path.appendConnection(path1.connections[i]);
		}
		for (const c of path2.connections) {
			path.appendConnection(c);
		}
		return path;
	}

	public static createCycle(path1: CircuitPath, path2: CircuitPath): CircuitPath {
		if (!path1.onlyMeetsAtStartAndEnd(path2)) {
			throw new Error(`Can not create cycle with ${path1.toString()} and ${path2.toString()}`);
		}
		return CircuitPath.concatedPath(path1, CircuitPath.reversedPath(path2));
	}

	public pointIsOutside(point: CircuitPoint): boolean {
		let numberOfCrossing = 0;
		for (const c of this.connections) {
			const pointA = c.points[0];
			const pointB = c.points[1];

			if ((point.x - pointA.x) * (point.x - pointB.x) <= 0 && (point.y - pointA.y) * (point.y - pointB.y) <= 0) {
				if ((point.y - pointA.y) * (pointB.x - pointA.x) == (pointB.y - pointA.y) * (point.x - pointA.x)) {
					return false;
				}
			}

			if (pointA.x <= point.x && pointB.x <= point.x) {
				continue;
			}

			if (!(pointA.y > point.y && pointB.y <= point.y || pointB.y > point.y && pointA.y <= point.y)) {
				continue;
			}

			numberOfCrossing++;
		}
		return numberOfCrossing % 2 == 0;
	}

	public isMesh(points: CircuitPoint[], connections: CircuitConnection[]): boolean {
		const unusedConnections = connections.filter(c1 => this.connections.filter(c2 => c2.equals(c1)).length == 0);
		for (const connection of unusedConnections) {
			if (connection.points.filter(p1 => this.points.filter(p2 => p2.equals(p1)).length != 0).length == 2) {
				return false;
			}
		}
		const unusedPoints = points.filter(p1 => this.points.filter(p2 => p2.equals(p1)).length == 0);
		for (const point of unusedPoints) {
			if (!this.pointIsOutside(point)) {
				return false;
			}
		}
		return true;
	}
	public numberOfResistors(): number {
		let n = 0;
		for (const c of this.connections) {
			if (c.component?.kind == "Resistance") n++;
		}
		return n;
	}
}


export class CircuitGraph {
	readonly points: CircuitPoint[];
	readonly connections: CircuitConnection[];
	readonly connectionToNeighbor: Map<CircuitPoint, CircuitConnection[]>;

	private currentIsCalculated = false;

	constructor() {
		this.points = [];
		this.connections = [];
		this.connectionToNeighbor = new Map<CircuitPoint, CircuitConnection[]>();
	}

	private getPointOrNull(point: CircuitPoint): CircuitPoint | null{
		for (const p of this.points) {
			if (p.equals(point)) {
				return p;
			}
		}
		return null;
	}

	private getPointOrPush(point: CircuitPoint): CircuitPoint {
		const gotPoint = this.getPointOrNull(point);
		if (gotPoint) {
			return gotPoint;
		} else {
			this.points.push(point);
			return point;
		}
	}

	private addDirectedEdge(source: CircuitPoint, connection: CircuitConnection): void {
		const connections = this.connectionToNeighbor.get(source);
		if (connections) {
			connections.push(connection);
		} else {
			this.connectionToNeighbor.set(source, [connection]);
		}
	}

	public addConnection(connection: CircuitConnection): void {
		const pointA = this.getPointOrPush(connection.points[0]);
		const pointB = this.getPointOrPush(connection.points[1]);
		const connectionWithAB = new CircuitConnection(pointA, pointB, connection.component);
		this.addDirectedEdge(pointA, connectionWithAB);
		this.addDirectedEdge(pointB, connectionWithAB);

		for (const c of this.connections) {
			if (c.equals(connectionWithAB)) {
				return;
			}
		}
		this.connections.push(connectionWithAB);

		this.currentIsCalculated = false;
	}

	private findAllPathsUtil(source: CircuitPoint, sink: CircuitPoint, visited: Set<CircuitPoint>): CircuitPath[] {
		if (source.equals(sink)) {
			return [];
		}
		const paths: CircuitPath[] = [];
		visited.add(source);
		for (const neighborEdge of this.connectionToNeighbor.get(source) || []) {
			const neighbor = neighborEdge.getNeighbor(source);
			if (visited.has(neighbor)) {
				continue;
			}
			if (neighbor.equals(sink)) {
				paths.push(new CircuitPath(source, neighborEdge));
			} else {
				const pathsFromNeighbor = this.findAllPathsUtil(neighbor, sink, visited);
				for (const path of pathsFromNeighbor) {
					path.prependConnection(neighborEdge);
					paths.push(path);
				}
			}
		}
		visited.delete(source);
		return paths;
	}


	public findAllPaths(source: CircuitPoint, sink: CircuitPoint): CircuitPath[] {
		const pointA = this.getPointOrNull(source);
		const pointB = this.getPointOrNull(sink);
		if (!pointA || !pointB) {
			console.log(source.toString() + " " + sink.toString());
			throw new Error("Points not found in graph");
		}
		return this.findAllPathsUtil(pointA, pointB, new Set<CircuitPoint>());
	}


	public findAllCyclesWith(pointA: CircuitPoint, pointB: CircuitPoint): CircuitPath[] {
		const paths = this.findAllPaths(pointA, pointB);
		const cycles: CircuitPath[] = []
		for (const path1 of paths) {
			for (const path2 of paths) {
				if (path1.onlyMeetsAtStartAndEnd(path2)) {
					const cycle = CircuitPath.createCycle(path1, path2);
					cycle.pushToListIfNotExists(cycles);
				}
			}
		}
		return cycles;
	}

	public findAllCycles(): CircuitPath[] {
		const cycles: CircuitPath[] = [];
		for (const pointA of this.points) {
			for (const pointB of this.points) {
				const cyclesWithAB = this.findAllCyclesWith(pointA, pointB);
				for (const cycle of cyclesWithAB || []) {
					cycle.pushToListIfNotExists(cycles);
				}
			}
		}
		return cycles;
	}

	public findAllMeshes(logger: LoggerT): CircuitPath[] {
		const meshes = this.findAllCycles().filter(cycle => cycle.isMesh(this.points, this.connections));
		logger({
			action: Action.MESH_DETECTION,
			meshes: meshes
		});
		return meshes;
	}

	public generateEquations(logger: LoggerT): number[][] {
		const meshes = this.findAllMeshes(logger);
		const  equations: number[][] = [];
		for (let i = 0; i < meshes.length; ++i) {
			equations.push(new Array(meshes.length + 1).fill(0));
		}
		const visited = new Set<number>();

		while (true) {
			let missingIndex = -1;
			for (let i = 0; i < meshes.length; ++i) {
				if (!visited.has(i)) {
					missingIndex = i;
					break;
				}
			}

			if (missingIndex >= 0) this.generateEquationsFrom(meshes, missingIndex, equations, 0, meshes[missingIndex].connections[0].points[0], visited, logger);
			else break;
		}

		return equations;
	}

	private generateEquationsFrom(meshes: CircuitPath[], meshIndex: number, equations: number[][], connectionStartIndex: number, startPoint: CircuitPoint, visited: Set<number>, logger: LoggerT): void {
		if (visited.has(meshIndex)) throw new Error("Attempting to visit an already visited mesh");
		
		visited.add(meshIndex);

		const nextCalls: {meshIndex: number, connectionStartIndex: number, startPoint: CircuitPoint}[] = [];

		const mesh = meshes[meshIndex];
		const unwrappedCycle = CircuitPath.unwrapCycle(mesh, connectionStartIndex, startPoint);

		logger({
			action: Action.KVL_MESH_SEQUENCE,
			meshIndex: meshIndex,
			sequence: unwrappedCycle,
		});

		for (let connectionIndex = 0; connectionIndex < unwrappedCycle.connections.length; ++connectionIndex) {
			const connection = unwrappedCycle.connections[connectionIndex];
			connection.currentSinkNodeInMesh.set(meshIndex, unwrappedCycle.points[connectionIndex + 1]);

			let intersectingMeshIndex = -1;
			let intersectingConnectionIndex = -1;

			for (let otherMeshIndex = 0; otherMeshIndex < meshes.length; ++otherMeshIndex) {
				if (otherMeshIndex == meshIndex) continue;
				const otherMesh = meshes[otherMeshIndex];
				const indexOfConnection = otherMesh.indexOf(connection);
				if (indexOfConnection >= 0) {
					intersectingMeshIndex = otherMeshIndex;
					intersectingConnectionIndex = indexOfConnection;
					break;
				}
			}

			if (intersectingMeshIndex >= 0) {
				nextCalls.push({meshIndex: intersectingMeshIndex, connectionStartIndex: intersectingConnectionIndex, startPoint: unwrappedCycle.points[connectionIndex + 1]});
			}
			
			if (connection.component) {
				if (connection.component.kind == "Battery") {
					if (unwrappedCycle.points[connectionIndex + 1].equals(connection.points[0])) equations[meshIndex][meshes.length] += connection.component.value;
					else equations[meshIndex][meshes.length] -= connection.component.value;
				}
				else {
					equations[meshIndex][meshIndex] += connection.component.value;
					if (intersectingMeshIndex >= 0) equations[meshIndex][intersectingMeshIndex] -= connection.component.value;
				}
			}

			logger({
				action: Action.EQUATION_PART_DETECTION,
				connection: CircuitConnection.alignedConnection(connection, unwrappedCycle.points[connectionIndex]),
				positiveMeshCurrentIndex: meshIndex,
				negativeMeshCurrentIndex: intersectingMeshIndex >= 0? intersectingMeshIndex : undefined
			});
		}

		logger({
			action: Action.EQUATION_DETECTION,
			equation: equations[meshIndex],
			equationIndex: meshIndex
		});

		for (const nextCall of nextCalls) {
			if (!visited.has(nextCall.meshIndex)) this.generateEquationsFrom(meshes, nextCall.meshIndex, equations, nextCall.connectionStartIndex, nextCall.startPoint, visited, logger);
		}
	}
	
	public calculateAllCurrents(logger: LoggerT): void {
		if (this.currentIsCalculated) return;

		const meshEquations = this.generateEquations(logger);
		const meshCurrents = solveEquations(meshEquations, logger);
		
		for (const connection of this.connections) {
			const loggerMeshCurrents: {index: number, polarity: "positive" | "negative", value: number}[] = [];
			let totalCurrent = 0;
			for (const meshIndex of Array.from(connection.currentSinkNodeInMesh.keys())) {
				const meshCurrent = meshCurrents[meshIndex];
				const currentSinkNodeInMesh = connection.currentSinkNodeInMesh.get(meshIndex);

				if (!currentSinkNodeInMesh) throw new Error("Impossible! a map key does not exist in a map!!");
				if (currentSinkNodeInMesh.equals(connection.points[1])) totalCurrent += meshCurrent;
				else totalCurrent -= meshCurrent;

				loggerMeshCurrents.push({
					index: meshIndex,
					polarity: currentSinkNodeInMesh.equals(connection.points[1])? "positive": "negative",
					value: meshCurrents[meshIndex]
				});
			}
			connection.setCurrentAndCalculateVoltage(totalCurrent);

			logger({
				action: Action.INDIVIDUAL_COMPUTATION,
				connection: connection,
				meshCurrents: loggerMeshCurrents
			});
		}
		
		this.currentIsCalculated = true;
	}

	public shortestPath(pointA: CircuitPoint, pointB: CircuitPoint): CircuitPath | null {
		const paths = this.findAllPaths(pointA, pointB);
		if (paths.length == 0) return null;
		return paths.reduce((p, acm) => p.numberOfResistors() < acm.numberOfResistors()? p : acm, paths[0]);
	}

	public voltageBetween(pointA: CircuitPoint, pointB: CircuitPoint, logger: LoggerT): number {
		const path = this.shortestPath(pointA, pointB);
		
		logger({
			action: Action.VOLTAGE_COMPUTATION_PATH,
			path: path
		});
		if (!path) return NaN;

		this.calculateAllCurrents(logger);
		let voltage = 0;
		for (let i = 0; i < path.connections.length; i++) {
			let v = 0;
			const comp = path.connections[i].component;
			if (comp) {
				v = comp.kind == "Battery"? comp.value: path.connections[i].getCurrent() * comp.value;
				if (!path.points[i].equals(path.connections[i].points[0])) v *= -1;
			}
			logger({
				action: Action.VOLTAGE_PART_DETECTION,
				source: path.points[i],
				sink: path.points[i+1],
				value: v
			});
			voltage += v;
		}
		return voltage;
	}
}
