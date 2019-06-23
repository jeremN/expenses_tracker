import React, { Component } from 'react';
import * as d3 from 'd3';

import Axes from './Axes';
import Bars from './Bar';

class Chart extends Component {
	state = {
		datas: [
			{
				x: 'Janvier',
				y: 160,
			}, {
				x: 'Février',
				y: 1000,
			}, {
				x: 'Mars',
				y: 16,
			}, {
				x: 'Avril',
				y: 568,
			}, {
				x: 'Mai',
				y: 1789,
			}, {
				x: 'Juin',
				y: 346,
			}, {
				x: 'Juillet',
				y: 24,
			}, {
				x: 'Août',
				y: 754,
			}, {
				x: 'Septembre',
				y: 839,
			}, {
				x: 'Octobre',
				y: 210,
			}, {
				x: 'Novembre',
				y: 365,
			}, {
				x: 'Décembre',
				y: 869,
			},
		],
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
		const width = 800;
		const height = 400;

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