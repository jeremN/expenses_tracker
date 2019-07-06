import React, { Component, Fragment } from 'react';
import { connect } from 'react-redux';
import * as d3 from 'd3';

import Chart from '../../components/Charts/Chart';
import Input from '../../components/UI/Input/Input';
import Table from '../../components/UI/Table/Table';

import * as actions from '../../store/actions';
import { updateObject, getDate, formCheckValidity } from '../../shared/utility';

import { statistic, filters } from './Statistics.module.scss';

class Statistics extends Component {
	state = {
		filtersControls: {
			category: {
				elementType: 'input',
				elementConfig: {
					type: 'radio',
					placeholder: 'Categories',
					name: 'typesFilter'
				},
				label: 'Categories',
				value: 'categories',
				labelAfter: true,
				validation: {
					required: false,
				},
				valid: false,
				touched: false
			},
			years: {
				elementType: 'input',
				elementConfig: {
					type: 'radio',
					placeholder: 'Années',
					name: 'typesFilter',
					checked: true,
				},
				label: 'Années',
				value: 'years',
				labelAfter: true,
				validation: {
					required: false,
				},
				valid: false,
				touched: false
			},
		},
		table: {
			headings: null,
			body: null,
		},
		headings: {
			first: ['Month', 'Outcome', 'Income', 'Saving'],
			second: ['Category', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec']
		},
		selected: {
			year: '',
			type: '',
			display: ''
		}
	}

	componentDidMount() {
		if (this.props.isAuth) {
			this.getFiltersYears(this.props.expenses);
		}
	}

	componentDidUpdate(prevProps, prevState) {
		if (this.state.selected !== prevState.selected) {
			this.displayTable(this.props.expenses, this.state.selected.year);
		}
	}

	getFiltersYears = (expenses) => {
		if (!expenses || !Object.keys(expenses).length) return;
		const years = Object.keys(expenses).map(expense => expense);
		const updatedFilters = this.state.filtersControls;

		years.forEach((year) => {
			updatedFilters[year] = {
				elementType: 'input',
				elementConfig: {
					type: 'radio',
					placeholder: year,
					name: 'yearsFilter',
					checked: year === getDate().currentYear ? true : false,
				},
				label: year,
				labelAfter: true,
				value: year,
				validation: {
					required: false,
				},
				valid: false,
				touched: false
			}
		});

		this.setState({ 
			filtersControls: updatedFilters,
			selected: {
				year: getDate().currentYear,
				type: 'year',
				display: 'table',
			} 
		});
	}

	inputChangedHandler = (event, controlName) => {
		const { target } = event;
		const filtered = {
			typesFilter: 'type',
			yearsFilter: 'year',
		}

		const updatedControls = updateObject(this.state.filtersControls, {
			[controlName]: updateObject(this.state.filtersControls[controlName], {
				...this.state.filtersControls[controlName],
				value: target.value,
				valid: formCheckValidity(target.value, this.state.filtersControls[controlName]),
				touched: true,
			})
		});

		const updatedSelected = updateObject(this.state.selected, {
			[filtered[target.name]]: target.value
		});

		this.setState({ 
			filtersControls: updatedControls,
			selected: updatedSelected, 
		});
	}

	displayTable = (expenses, year) => {
		if (!expenses || !Object.keys(expenses).length) return;
		let tBody = []; 
		let tHead = null;

		if (this.state.selected.type === 'year') {
			tHead = this.state.headings.first;

			Object.keys(expenses[year]).forEach(expense => {
				tBody.push([
					expense,
					expenses[year][expense].outcome ? expenses[year][expense].outcome : 0,
					expenses[year][expense].income ? expenses[year][expense].income : 0,
					expenses[year][expense].saved ? expenses[year][expense].saved : 0,
				]);
			});
		} else {

		}

		const updatedTable = {
			headings: tHead,
			body: tBody
		}

		this.setState({ table: updatedTable });
	}

	render() {
		const formElementsArray = [];

		for (let key in this.state.filtersControls) {
			formElementsArray.push({
				id: key,
				config: this.state.filtersControls[key]
			});
		}

		let form = formElementsArray.map(formElement => {
			const {
				elementType, 
				elementConfig, 
				value, 
				valid, 
				validation, 
				touched,
				label,
				labelSmall,
				labelAfter,
			} = formElement.config

			return (
				<Input
					key={ formElement.id }
					elementType={ elementType }
					elementConfig={ elementConfig }
					value={ value }
					labelValue={ label }
					labelSmall={ labelSmall }
					invalid={ !valid }
					shouldValidate={ validation }
					labelAfter= { labelAfter }
					touched={ touched }
					changed={ (event) => this.inputChangedHandler(event, formElement.id) } />
			)
		});

		const chart = <Chart />
		const table = <Table
								headings={ this.state.table.headings } 
								rows={ this.state.table.body } />


		const statContent = (
			<div className={ statistic }>
				<div className="row">
					<h1 className="content__title">Statistics</h1>
				</div>
				<div className="row">
					<div className="col-8 form--inline card card--transparent">
						<div className={ filters }>
							<div>Trier par:</div>
							{ form }
						</div>
					</div>
					<div className="col-4 card card--transparent">
						
					</div>
				</div>
				<div className="row">
					<div className="col-12 card">
						{ table }
					</div>
				</div>
			</div>
		);

		return (
			<Fragment>{ statContent }</Fragment>
		);
	}
}

const mapStateToProps = state => {
	return {
		loading: state.payload.loading,
		isAuth: state.auth.token !== null,
		token: state.auth.token,
		userId: state.auth.userId,
		currentExpenses: state.payload.currentExpenses,
		currentKey: state.payload.currentKey,
		expenses: state.payload.expenses,
		categories: state.payload.categories,
		canVerifyDatas: state.payload.canVerifyDatas,
	}
}

const mapDispatchToProps = dispatch => {
	return {
		getUserDatas: (userId, token) => dispatch(actions.getUserData(userId, token)),
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(Statistics);