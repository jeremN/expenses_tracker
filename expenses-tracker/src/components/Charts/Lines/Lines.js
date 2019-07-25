import React, { Fragment } from 'react';

const Lines = (props) => {
	const { 
		xVal, 
		yVal, 
		height, 
		width, 
		scales: {
			xScale,
			yScale,
			xScaleB,
		},
		margins: {
			left,
			right,
		},
		data, 
	} = props

	const colors = ['#78e08f', '#e55039'];

	const paths = (
		data.map((d, i) => {})
	);

	return (
		<Fragment>
			{ paths }	
		</Fragment>
	)
}

export default Lines;