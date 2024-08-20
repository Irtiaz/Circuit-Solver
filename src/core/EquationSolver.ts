import { Action, LoggerParamType } from "./Logger"

export function solveEquations(equations: number[][], logger: (_: LoggerParamType) => void): number[] {
	if (!verifyGaussianMatrixDimensions(equations)) throw new Error("Equation matrix is not a valid gaussian Matrix. The dimension has to be m x (m + 1)");

	let equationNumberMap: number[] = [];
	let equationCounter = equations.length;

	for (let i = 0; i < equations.length; ++i) equationNumberMap.push(i);

	for (let pivot = 0; pivot < equations.length; ++pivot) {
		const replacingEquation = gaussianMatrixRearrangeAt(equations, pivot);
		
		if (replacingEquation != pivot) {
			equationNumberMap[pivot] = replacingEquation;
			equationNumberMap[replacingEquation] = pivot;
		}

		if (equations[pivot][pivot] == 0) throw new Error("Cannot solve: more equations, less variables");

		for (let nextEquationIndex = pivot + 1; nextEquationIndex < equations.length; ++nextEquationIndex) {
			const factorNumerator = equations[nextEquationIndex][pivot];
			const factorDenominator = equations[pivot][pivot];
			const factor = factorNumerator / factorDenominator;

			if (factorNumerator == 0) continue;

			subtractRow(equations, nextEquationIndex, pivot, factor);
			logger({
				action: Action.EQUATION_MANIPULATION,
				fromEquationNumber: equationNumberMap[nextEquationIndex],
				subEquationNumber: equationNumberMap[pivot],
				factorNumerator: factorNumerator,
				factorDenominator: factorDenominator,
				resultEquationNumber: equationCounter,
				resultEquation: equations[nextEquationIndex]
			});

			equationNumberMap[nextEquationIndex] = equationCounter++;
		}

	}

	const solutions = new Array(equations.length);

	for (let equationIndex = equations.length - 1; equationIndex >= 0; --equationIndex) {
		solutions[equationIndex] = equations[equationIndex][equations[equationIndex].length - 1];
		for (let variableIndex = equationIndex + 1; variableIndex < equations[equationIndex].length - 1; ++variableIndex) {
			solutions[equationIndex] -= equations[equationIndex][variableIndex] * solutions[variableIndex];
		}
		solutions[equationIndex] /= equations[equationIndex][equationIndex];

		logger({
			action: Action.EQUATION_SOLUTION,
			equationNumber: equationNumberMap[equationIndex],
			variable: equationIndex,
			solution: solutions[equationIndex]
		});
	}

	return solutions;
}

function subtractRow(matrix: number[][], fromRow: number, subRow: number, subMultiplier: number): void {
	if (matrix[fromRow].length != matrix[subRow].length) throw new Error("Cannot subtract rows of different size");
	
	for (let entryIndex = 0; entryIndex < matrix[fromRow].length; ++entryIndex) {
		matrix[fromRow][entryIndex] -= matrix[subRow][entryIndex] * subMultiplier;
	}
}

function gaussianMatrixRearrangeAt(matrix: number[][], position: number): number {
	let largestMagnitude = -1;
	let winnerRowIndex = -1;

	for (let rowIndex = position; rowIndex < matrix.length; ++rowIndex) {
		const magnitude = Math.abs(matrix[rowIndex][position]);
		if (magnitude > largestMagnitude) {
			largestMagnitude = magnitude;
			winnerRowIndex = rowIndex;
		}
	}

	if (winnerRowIndex != position) swapRows(matrix, position, winnerRowIndex);

	return winnerRowIndex;
}

function swapRows(matrix: any[][], row1: number, row2: number): void {
	if (matrix[row1].length != matrix[row2].length) throw new Error("Cannot swap rows if their length is not equal");
	for (let entryIndex = 0; entryIndex < matrix[row1].length; ++entryIndex) {
				const temporary = matrix[row1][entryIndex];
				matrix[row1][entryIndex] = matrix[row2][entryIndex]
				matrix[row2][entryIndex] = temporary;
	}
}

function verifyGaussianMatrixDimensions(matrix: any[][]): boolean {
	for (const row of matrix) {
		if (row.length != matrix.length + 1) return false;
	}
	return true;
}

export function printEquation(equation: number[], equationNumber: number) {
	let equationString = "";
	for (let coefficientIndex = 0; coefficientIndex < equation.length - 1; ++coefficientIndex) {
		const coefficient = equation[coefficientIndex];
		equationString += (coefficient >= 0? "+" : "") + coefficient + `I${coefficientIndex} `;
	}
	equationString += "= " + equation[equation.length - 1] + " ............. " + `(${equationNumber})`;
	console.log(equationString);
}
