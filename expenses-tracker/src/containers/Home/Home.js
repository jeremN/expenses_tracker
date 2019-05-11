import React, { Component, Fragment } from 'react';
import { connect } from 'react-redux';

import AddExpense from '../../components/AddExpenseForm/AddExpenseForm';
import Indicators from '../../components/Indicators/Indicators';
import Table from '../../components/UI/Table/Table';
import Button from '../../components/UI/Button/Button';

import * as actions from '../../store/actions';
import { updateObject, getDate } from '../../shared/utility';

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
			footer: [], 
		},
		currentYear: new Date(),

	}

	componentDidUpdate(prevProps) {
		if (this.props.currentExpenses !== prevProps.currentExpenses) {
			this.processTableBodyData(this.props.currentExpenses);
		}
	}

	processTableBodyData = (data) => {
		let tBody = [];
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

		if (data) {
			const arr = Object.keys(data).map(expense => {
				return Object.keys(data[expense]).map(current => data[expense][current]);
			});

			arr[0][0].forEach((key, index) => {
				tBody.push([
					key.category,
					key.type,
					key.date,
					key.value,
					btnsGroup
				]);
			});
		}

		this.setState({
			table: {
				headings: this.state.table.headings,
				body: tBody
			}
		});
	}

	updateTableRow = (event) => {
		const { target } = event
		const rowId = target.closest('tr').id
		console.info(rowId)
	}

	deleteTableRow = (event) => {
		event.preventDefault();
		const dates = getDate();
		const { target } = event;
		const rowId = target.closest('tr').id;
		const { userId, token, key } = this.props;
		const updatedArray = [...this.props.currentExpenses[dates.currentYear][dates.currentMonth]];
		updatedArray.splice(rowId, 1);
		const updatesExpenses = {
			[dates.currentYear]: {
				[dates.currentMonth]: updatedArray
			}
		};
		this.props.onDeleteExpense(userId, token, key, updatesExpenses);
	}

	render() {
		let dashboardContent = (
			<Fragment>
				<p>Loading...</p>
			</Fragment>
		)

		if (!this.props.isAuth) {
			dashboardContent = (
				<Fragment>
					Please login / register
				</Fragment>
			)
		}

		if (!this.props.loading && this.props.isAuth) {
			dashboardContent = (
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
							<Table
								headings={ this.state.table.headings } 
								rows={ this.state.table.body } />
						</div>
					</div>
				</Fragment>
			);		
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
		loading: state.user.loading,
		isAuth: state.auth.token !== null,
		token: state.auth.token,
		userId: state.auth.userId,
		currentExpenses: state.user.currentExpenses
	}
}

const mapDispatchToProps = dispatch => {
	return {
		onDeleteExpense: (userId, token, key, datas) => dispatch(actions.updateExpense(userId, token, key, datas))
	}
}


export default connect(mapStateToProps, mapDispatchToProps)(Home);