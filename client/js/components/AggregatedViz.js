import React from 'react'

import Sunburst from './Sunburst';
import TextualAggregated from './TextualAggregated';
import hierarchicalAggregated from '../finance/hierarchicalAggregated.js';

/*

interface AggregatedViZProps{
    M52Instruction: M52Instruction
    aggregatedInstruction : AggregatedInstruction
}

*/
export default function({aggregatedHierarchical, aggregatedSelectedNodes, onSliceSelected}){
    return React.createElement('div', {},
        React.createElement('h1', {}, aggregatedHierarchical.name),
        React.createElement(Sunburst, {
            hierarchicalData: aggregatedHierarchical, 
            selectedNodes: aggregatedSelectedNodes,
            donutWidth: 55, outerRadius: 120,
            onSliceSelected
        })
    );
}