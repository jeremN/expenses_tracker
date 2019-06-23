import React, { Component } from 'react';
import * as d3 from 'd3';

import './Axis.module.scss';

class Axis extends Component {
	componentDidMount() {
		this.renderAxis();
	}

	componentDidUpdate() {
		this.renderAxis();
	}

	renderAxis = () => {
		const axisType = `axis${this.props.orient}`;
		const axis = d3[`axis${this.props.orient}`]()
			.scale(this.props.scale)
			.tickSize(-this.props.tickSize)
			.ticks([4]);

		d3.select(this.axisElement).call(axis);
	}

	render() {

		return (
			<g 
				className={ `chart__axis chart__axis__${this.props.orient}` } 
				ref={ (el) => { this.axisElement = el; } }
				transform={ this.props.translate } />
		);
	}
}

export default Axis;