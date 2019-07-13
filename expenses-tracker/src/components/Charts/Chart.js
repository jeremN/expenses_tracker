import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import * as d3 from 'd3';

import Axes from './Axes';
import Bars from './Bar';

class Chart extends Component {
	state = {
		datas: [],
	}

	componentDidMount() {
		this.setState({ datas: this.props.datas });
	}

	getSvgProps = () => {
		console.info(this)
	}

	render() {
		const { datas } = this.state
		const margins = {
			top: 50,
			right: 50,
			bottom: 50,
			left: 50,
		}
		const maxValue = Math.max(...datas.map(d => d.y));
		const parentContainer = document.querySelector(this.props.container);
		const width = parentContainer ? parentContainer.offsetWidth : this.props.chartSize[0];
		const height = parentContainer ? parentContainer.offsetHeight : this.props.chartSize[1];

		const sWidth = width - margins.left - margins.right;
		const sHeight = height - margins.top - margins.bottom;

		const xScale = d3.scaleBand()
			.padding(0.5)
			.domain(datas.map(d => d.x))
			.range([0, sWidth]);

		const yScale = d3.scaleLinear()
			.domain([0, maxValue])
			.range([sHeight, 0])
			.nice();
		
		return (
			<svg width={ width } height={ height }>
				<Axes 
					scales={ { xScale, yScale } }
					margins={ margins } 
					width={ sWidth } 
					height={ sHeight } />
				<Bars
					scales={ { xScale, yScale } }
					data={ this.state.datas } 
					margins={ margins } 
					maxValue={ maxValue } 
					height={ height } />
			</svg>
		);
	}

}

export default Chart;