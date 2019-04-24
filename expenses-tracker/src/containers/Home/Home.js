import React, { Component, Fragment } from 'react';
import { connect } from 'react-redux';

import Aux from '../../hoc/Auxiliary/Auxiliary';
import AddExpense from '../../components/AddExpenseForm/AddExpenseForm';
import Indicators from '../../components/Indicators/Indicators';
import Table from '../../components/UI/Table/Table';

import * as actions from '../../store/actions';
import axios from 'axios';

class Home extends Component {
	state = {
		indicators: [
			{
				title: 'Revenus du mois',
				value: 0.00,
				progression: '+5.2%',
				progressClass: 'is__positive'
			},
			{
				title: 'Dépense du mois',
				value: 0.00,
				progression: '-5.2%',
				progressClass: 'is__negative'
			},
			{
				title: 'Dépense du jour',
				value: 0.00,
				progression: '=',
				progressClass: 'is__stable'
			},
		],
		table: {
			headings: [
				'Catégorie',
				'Type',
				'Date',
				'Montant',
				'Actions'
			],
			body: [
				[
					'course',
					'outcome',
					'21/04/2019',
					'201.12',
					''
				],
				[
					'jeux',
					'outcome',
					'19/04/2019',
					'54.99',
					''
				]
			],
			footer: []
		}
	}

	render() {
		let dashboardContent = (
			<Fragment>
				<div className="row">
					<h1 className="content__title">Dashboard</h1>
					<AddExpense />
				</div>
				<div className="row">
					<div className="col-3">
						<Indicators kpis={ this.state.indicators } />
					</div>
					<div className="col-9">
						<Table headings={ this.state.table.headings } rows={ this.state.table.body } />
					</div>
				</div>
			</Fragment>
		)

		if (!this.props.isAuth) {
			dashboardContent = (
				<Fragment>
					Please login / register
				</Fragment>
			)
		}

		return (
			<Fragment>
				{ dashboardContent }
			</Fragment>
		)
	}
}

const mapStateToProps = state => {
	return {
		loading: state.auth.loading,
		isAuth: state.auth.token !== null,
	}
}


export default connect(mapStateToProps)(Home);