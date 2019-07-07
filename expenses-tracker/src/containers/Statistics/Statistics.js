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
			footer: null
		},
		headings: {
			first: ['Month', 'Outcome', 'Income', 'Diff', 'Saving'],
			second: ['Category', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
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
				elementConfig: {
					...this.state.filtersControls[controlName].elementConfig,
					checked: true,
				},
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

		this.displayTable(this.props.expenses, this.state.selected.year);
	}

	monthCategoryOutput = (array, string) => {
    let val = 0;
    for( let key in array ) {
      if( string === array[key].month ) {
          val = array[key].value;
      }
    }
    return val;
	}

	setCategoriesArray = (expenses, year) => {
		const categories = [];

		Object.keys(expenses[year]).forEach(expense => {
			categories.push({
				cats: expenses[year][expense].categories,
				month: expense,
			})
		});

		return categories;
	}

	setSortedByCategories = (array) => {
    return array.reduce( (item, next) => {
      let cat = '';
      let value = '';

      for( let key in next.cats ) {
        cat = next.cats[key].name;
        value = next.cats[key].value;

        if( !item[cat] ) {
            item[cat] = [];
        }
        item[cat].push({
            month: next.month,
            value: value
        })
      }
      return item;
    }, {}); 
	}

	filterByCategories = (expenses, year) => {
		const filteredCategories = {
			headings: [...this.state.headings.second],
			body: [],
		}
		const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
		const categories = this.setCategoriesArray(expenses, year);
		const items = this.setSortedByCategories(categories);

    Object.keys(items).forEach(item => {
    	const val = months.map(month => this.monthCategoryOutput(items[item], month));
    	filteredCategories.body.push([
    		item,
    		...val
    	]);
    });

		return filteredCategories;	
  }

	filterByYears = (expenses, year) => {
		const filteredYear = {
			headings: [...this.state.headings.first],
			body: [],
			footer: []
		}

		const months = Object.keys(expenses[year]);
		const firstEntry = expenses[year][months[0]];
		const lastEntry = expenses[year][months[months.length - 1]];
		const totalSaved = +lastEntry.saved - +firstEntry.saved;
		let totalIncome = 0;
		let totalOutcome = 0;

		Object.keys(expenses[year]).forEach(expense => {
			totalIncome += +expenses[year][expense].income;
			totalOutcome += +expenses[year][expense].outcome;

			filteredYear.body.push([
				expense,
				expenses[year][expense].outcome ? expenses[year][expense].outcome : 0,
				expenses[year][expense].income ? expenses[year][expense].income : 0,
				+expenses[year][expense].income - +expenses[year][expense].outcome,
				expenses[year][expense].saved ? expenses[year][expense].saved : 0,
			]);
		});

		filteredYear.footer = [ '', totalOutcome, totalIncome, '', totalSaved];
		return filteredYear;	
	}

	displayTable = (expenses, year) => {
		if (!expenses || !Object.keys(expenses).length) return;
		const filtered = {
			year: this.filterByYears(expenses, year),
			categories: this.filterByCategories(expenses, year)
		}
		const updatedTable = filtered[this.state.selected.type];
		console.info(filtered[this.state.selected.type])

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
								rows={ this.state.table.body } 
								footer={ this.state.table.footer } />

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