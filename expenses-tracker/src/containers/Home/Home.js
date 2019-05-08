import React, { Component, Fragment } from 'react';
import { connect } from 'react-redux';

import AddExpense from '../../components/AddExpenseForm/AddExpenseForm';
import Indicators from '../../components/Indicators/Indicators';
import Table from '../../components/UI/Table/Table';
import Button from '../../components/UI/Button/Button';

import * as actions from '../../store/actions';
import { updateObject } from '../../shared/utility';

import './Home.module.scss';

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
			body: null,
			footer: []
		}
	}

	componentDidMount() {
		this.processTableBodyData()
	}

	processTableBodyData() {
		console.info(this.props.currentExpenses)
		const btnsGroup = (
			<span>
				<Button 
					btnType="button--td"
					attributes={ {'data-type': 'edit'} } 
					clicked={ this.updateTableRow }>Editer</Button>
				<Button 
					btnType="button--td"
					attributes={ {'data-type': 'delete'} } 
					clicked={ this.deleteTableRow }>Supprimer</Button>
			</span>
		);
		const tBody = this.props.currentExpenses.map(expense => {
			console.info(expense)
			expense.push(btnsGroup)
		});

		console.info(tBody);

		this.setState({ 
			table: {
				headings: this.state.table.headings,
				body: tBody 
			}
		});
	}

	updateTableRow(event) {
		const { target } = event
		const rowId = target.closest('tr').id
		console.info(rowId)
	}

	deleteTableRow(event) {
		const { target } = event
		const rowId = target.closest('tr').id
		const { type } = target.dataset
		console.info(rowId, type)
	}

	render() {
		let dashboardContent = (
			<Fragment>
				<div className="row">
					<div className="col-3">					
						<h1 className="content__title">Dashboard</h1>
					</div>
					<div className="col-9">
						<AddExpense />
					</div>
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
		token: state.auth.token,
		userId: state.auth.userId,
		currentExpenses: state.user.currentExpenses
	}
}

const mapDispatchToProps = dispatch => {
	return {
		onFetchUserData: (userId, token) => dispatch(actions.getUserData(userId, token))
	}
}


export default connect(mapStateToProps, mapDispatchToProps)(Home);