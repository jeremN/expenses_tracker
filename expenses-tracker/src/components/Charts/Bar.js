import React, { Component } from 'react';
import * as d3 from 'd3';

class Bars extends Component {
	render() {
		const { 
			scales, 
			margins,
			height,
			data,
		} = this.props;
		const { xScale, yScale } = scales;

		const bars = (
			data.map(d => 
				<rect 
					key={ d.x }
					x={ xScale(d.x) }
					y={ yScale(d.y) }
					height={ yScale(0) - yScale(d.y) }
					width={ xScale.bandwidth() }
					fill={ '#3498db' } />
			)
		);

		return (
			<g transform={ `translate(${margins.left}, ${margins.top})` }>{ bars }</g>
		);
	}
}

export default Bars