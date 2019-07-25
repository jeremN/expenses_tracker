import React, { Fragment } from 'react';

import Axis from './Axis';

const Axes = (props) => {
	const { 
		height,
		width,
		scales, 
	} = props;

	const xProps = {
		orient: 'Bottom',
		scale: scales.xScale,
		translate: `translate(0, ${height})`,
		tickSize: 4,
	}

	const yProps = {
		orient: 'Left',
		scale: scales.yScale,
		translate: `translate(0, 0)`,
		tickSize: width,
	}

	return (
		<Fragment>
			<Axis {...xProps} />
			<Axis {...yProps} />
		</Fragment>
	);
}

export default Axes;