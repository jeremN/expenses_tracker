import React, { Component, Fragment } from 'react';
import * as d3 from 'd3';

class Axis extends Component {
	componentDidMount() {
		this.renderAxis();
	}

	componentDidUpdate() {
		this.renderAxis();
	}

	renderAxis = () => {
		const axis = d3[`axis${this.props.orient}`]()
			.scale(this.props.scale)
			.tickSize(-this.props.tickSize)
			.ticks(6);

		d3.select(this.axisElement).call(axis);
	}

	render() {

		return (
			<Fragment>
				<g 
					className={ `chart__axis chart__axis__${this.props.orient}` } 
					ref={ (el) => { this.axisElement = el; } }
					transform={ this.props.translate } />
			</Fragment>
		);
	}
}

export default Axis;