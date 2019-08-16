import React, { Component, Fragment } from 'react';
import { withTranslation } from 'react-i18next';

import {
	ResponsiveContainer,
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
} from 'recharts';

import { chart__wrapper } from './Charts.module.scss';

class Chart extends Component {
	state = {
		datas: [],
	} 

	componentDidMount() {
		this.setState({ datas: this.props.datas });
	}

	render() {
		const { t } = this.props;
		const parentContainer = document.querySelector(this.props.container);
		const width = this.props.chartSize[0] || parentContainer.offsetWidth;
		const height = this.props.chartSize[1] || parentContainer.offsetHeigh;
		const colors = ['#78e08f', '#e55039'];
		console.info(width, height)

		const barChart = (
			<ResponsiveContainer	
				className={ chart__wrapper }			
				width={ width }
				height={ height }>
				<BarChart
					data={ this.state.datas } 
					margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
					<CartesianGrid strokeDasharray="3 3" />
					<XAxis dataKey={ t('Month') } />
					<YAxis />
					<Tooltip />
					<Legend />
					<Bar dataKey={ t('Income') } fill={ colors[0] } />
					<Bar dataKey={ t('Outcome') } fill={ colors[1] } />
				</BarChart>
			</ResponsiveContainer>
		);

		return (
			<Fragment>
				{ barChart }
			</Fragment>
		);
	}

}

export default withTranslation()(Chart);