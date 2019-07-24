import React, { Fragment } from 'react';

const GroupedBar = (props) => {

	const { 
		height, 
		scales: {
			xScale,
			yScale,
			xScaleB,
		},
		margins: {
			left,
			top,
		},
		data,
		hovered, 
	} = props

	const colors = ['#78e08f', '#e55039'];

	const groupBar = (
		data.map(({ x, y }, i) =>
			<g
				key={ `${x}-${i}` }
				width={ xScale.bandwidth() }
				transform={ `translate(${(xScale.bandwidth() * i + xScale(x)) / 2 + left}, 0)` }>
				{ y.map((value, index) => 
						<rect
							key={ `${x}-${index === 0 ? 'income' : 'outcome'}` }
							x={ xScaleB(x) + index * xScaleB.bandwidth() - 6}
							y={ yScale(value) }
							height={ height - yScale(value) }
							width={ xScaleB.bandwidth() }
							fill={ colors[index] } 
							onMouseOver={ hovered }
							data-x={ x }
							data-inc={ y[0] }
							data-out={ y[1] }/>
					)
				}
			</g>
		)
	);

	return ( 
		<g className={ 'grouped__bar' }>
			{ groupBar }
		</g>
	);
}

export default GroupedBar;
