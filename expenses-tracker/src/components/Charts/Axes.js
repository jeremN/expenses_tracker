import React from 'react';
import * as d3 from 'd3';

import Axis from './Axis';

const Axes = (props) => {
	const { 
		height,
		width,
		scales, 
		margins,
	} = props;

	const xProps = {
		orient: 'Bottom',
		scale: scales.xScale,
		translate: `translate(0, ${height})`,
		tickSize: height,
	}

	const yProps = {
		orient: 'Left',
		scale: scales.yScale,
		translate: `translate(0, 0)`,
		tickSize: width,
	}

	return (
		<g transform={ `translate(${margins.left}, ${margins.top})` }>
			<Axis {...xProps} />
			<Axis {...yProps} />
		</g>
	);
}

export default Axes;