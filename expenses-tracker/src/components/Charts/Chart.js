import React, { Component } from 'react';
import * as d3 from 'd3';

import Axes from './Axes';
import Bars from './Bar';
import SvgContainer from './Svg';
import GroupedBars from './GroupedBar';

class Chart extends Component {
	state = {
		datas: [],
		dimension: [],
		scales: {
			xScale: null,
			yScale: null,
		},
	}

	componentDidMount() {
		this.setState({ datas: this.props.datas });
	}

	componentDidUpdate(prevProps, prevState) {
		if (this.state.datas !== prevState.datas) {

		}
	}

	getSvgProps = () => {
		
	}

	getScales = () => {}

	getMaxY = (array) => {

	}

	render() {
		const { datas } = this.state
		const margins = {
			top: 50,
			right: 50,
			bottom: 50,
			left: 50,
		}
		const parentContainer = document.querySelector(this.props.container);
		const width = this.props.chartSize[0] || parentContainer.offsetWidth;
		const height = this.props.chartSize[1] || parentContainer.offsetHeigh;
		const sWidth = +width - margins.left - margins.right;
		const sHeight = +height - margins.top - margins.bottom;

		const xScale = d3.scaleBand()
			.domain(datas.map(({ x }) => x))
			.range([0, sWidth])
			.padding(0.1);

		const xScaleB = d3.scaleBand()
			.domain(datas.map(({ x }) => x))
			.rangeRound([0, xScale.bandwidth()])
			.padding(0.05);


		const yScale = d3.scaleLinear()
			.rangeRound([sHeight, 0])
			.domain([0, d3.max(datas.map(({ y }) => y).flat())])
			.nice();

		return (
			<SvgContainer width={ width } height={ height } left={ margins.left } top={ margins.top }>
				<Axes 
					scales={ { xScale, yScale } }
					margins={ margins } 
					width={ sWidth } 
					height={ sHeight } />
				<GroupedBars 
					data={ this.state.datas }
					width={ xScale.bandwidth() }
					height={ sHeight } 
					margins={ margins }
					scales={ { xScale, yScale, xScaleB } } />
			</SvgContainer>
		);
	}

}

export default Chart;