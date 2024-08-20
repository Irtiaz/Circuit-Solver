import { CircuitPath, CircuitConnection } from "../core/Circuit"
import { CircuitDrawer } from "./CircuitDrawer"
import { equationToLatex } from "./EquationDisplayer"
import type { MeshInfo } from "./CircuitCalculator"
import { nanoid } from "nanoid"
import { MathJax } from "better-react-mathjax"
import React from "react"

interface Props {
	connections: CircuitConnection[];
	meshInfos: MeshInfo[];
}

export const MeshInfoPrinter: React.FC<Props> = ({ connections, meshInfos }) => {
	
	meshInfos.sort((a, b) => a.index - b.index);

	return (
		<div>
			<CircuitDrawer 
				interactive={false}
				showGrid={false}
				connectionMode={false}
				connections={connections}
				meshInfos={meshInfos.map(info => ({index: info.index, points: info.sequence.points}))}
			/>

			{meshInfos.map(meshInfo => <SingleMeshInfoPrinter key={nanoid()} meshInfo={meshInfo}/>)}
			
		</div>
	);
}

const SingleMeshInfoPrinter: React.FC<{meshInfo: MeshInfo}> = ({ meshInfo }) => {
	return (
		<div style={{marginBottom: "2em"}}>
			<span style={{marginRight: "0.5em"}}>Applying KVL in mesh {meshInfo.index} in sequence <MathJax style={{display: "inline"}}>\({meshInfo.sequence.toString()}\)</MathJax></span>
			<MathJax style={{display: "inline"}}>\(\Rightarrow\)</MathJax>
			{meshInfo.parts.map((part, index) => <React.Fragment key={nanoid()}>{part.connection.component && <MathJax style={{display: "inline"}}>
				{"\\(" + (part.connection.component.kind == "Battery"? ((part.connection.component.value > 0 && index != 0? "+" : "") + part.connection.component.value) : 
																																							 ((index == 0? "" : "+") + part.connection.component.value + (part.negativeMeshCurrentIndex != undefined? `(I_{${part.positiveMeshCurrentIndex}} - I_{${part.negativeMeshCurrentIndex}})` : `I_{${part.positiveMeshCurrentIndex}}`))
				 ) + "\\)"}
			</MathJax>}</React.Fragment>)}
			<MathJax style={{display: "inline"}}> \(=0\)</MathJax>
			<br />
			<MathJax style={{display: "inline"}}>{`$$\\Rightarrow ${equationToLatex(meshInfo.equation)} \\tag{${meshInfo.index}}$$`}</MathJax>
		</div>
	);
}

