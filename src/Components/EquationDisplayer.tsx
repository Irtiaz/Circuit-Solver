import { nanoid } from "nanoid"
import { MathJax } from "better-react-mathjax"

import type { EquationSolutionInfo, Manipulation, Solution } from "./CircuitCalculator"

export const EquationDisplayer: React.FC<{equationSolutionInfo: EquationSolutionInfo}> = ({ equationSolutionInfo }) => {
	
	const { manipulations, solutions } = equationSolutionInfo;

	return (
		<div>
			{manipulations.length != 0 && <ManipulationDisplayer manipulations={manipulations}/>}
			<SolutionDisplayer solutions={solutions}/>
		</div>
	);
}

const ManipulationDisplayer: React.FC<{manipulations: Manipulation[]}> = ({ manipulations }) => {
	return (
		<div>
			Performing elimination to obtain all the mesh currents
			{manipulations.map(m => <div key={nanoid()}>
				<MathJax>
					{`\\( (${m.fromEquationNumber}) ${m.factorNumerator * m.factorDenominator < 0? "+" : "-"} \\frac{${Math.abs(m.factorNumerator)}}{${Math.abs(m.factorDenominator)}} \\times (${m.subEquationNumber}) \\Rightarrow \\)`}
				</MathJax>
				<MathJax>
					{`$$ \\Rightarrow ${equationToLatex(m.resultEquation)} \\tag{${m.resultEquationNumber}} $$`}
				</MathJax>
			</div>)}
		</div>
	);
}

const SolutionDisplayer: React.FC<{solutions: Solution[]}> = ({ solutions }) => {
	return (
		<div>
			{solutions.map(solution => <div key={nanoid()}>
				From <MathJax style={{display: "inline"}}>\(({solution.equationNumber})\Rightarrow\)</MathJax>
				<MathJax>{`$$\\boxed{I_{${solution.variable}} = ${solution.solution} A}$$`}</MathJax>
			</div>)}
		</div>
	);
}

export function equationToLatex(equation: number[]): string {
	let firstTime = true;
	let result = "";
	for (let i = 0; i < equation.length - 1; ++i) {
		if (equation[i] != 0) {
			
			if (equation[i] < 0 || !firstTime) result += equation[i] < 0? " - " : " + ";
			const value = Math.abs(equation[i]);
			if (value != 1) result += value;
			result += `I_{${i}}`;

			firstTime = false;
		}
	}

	if (result.length == 0) result = "0";
	result += ` = ${equation[equation.length - 1]}`;
	
	return result;
}
