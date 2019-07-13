import React, { Component, Fragment } from 'react';
import { connect } from 'react-redux';
import * as d3 from 'd3';

import Chart from '../../components/Charts/Chart';
import Input from '../../components/UI/Input/Input';
import Table from '../../components/UI/Table/Table';
import Button from '../../components/UI/Button/Button';

import * as actions from '../../store/actions';
import { updateObject, getDate, formCheckValidity } from '../../shared/utility';

import { statistic, filters, displays } from './Statistics.module.scss';

class Statistics extends Component {
	state = {
		filtersControls: {
			category: {
				elementType: 'check',
				elementConfig: {
					type: 'radio',
					placeholder: 'Categories',
					name: 'types',
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
				elementType: 'check',
				elementConfig: {
					type: 'radio',
					placeholder: 'Années',
					name: 'types',
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
		chartDatas: [
			{ 
				x: 'January', 
			  y: 0,
			  y2: 0,
			},
			{ 
				x: 'February', 
			  y: 0,
			  y2: 0,
			},
			{ 
				x: 'March', 
			  y: 0,
			  y2: 0,
			},
			{ 
				x: 'April', 
			  y: 0,
			  y2: 0,
			},
			{ 
				x: 'May', 
			  y: 0,
			  y2: 0,
			},
			{ 
				x: 'June', 
			  y: 0,
			  y2: 0,
			},
			{ 
				x: 'July', 
			  y: 0,
			  y2: 0,
			},
			{ 
				x: 'August', 
			  y: 0,
			  y2: 0,
			},
			{ 
				x: 'September', 
			  y: 0,
			  y2: 0,
			},
			{ 
				x: 'October', 
			  y: 0,
			  y2: 0,
			},
			{ 
				x: 'November', 
			  y: 0,
			  y2: 0,
			},
			{ 
				x: 'December', 
			  y: 0,
			  y2: 0,
			},
		]
,
		headings: {
			first: ['Month', 'Outcome', 'Income', 'Diff', 'Saving'],
			second: ['Category', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
		},
		selected: {
			years: getDate().currentYear,
			types: 'years',
			display: 'table',
		}
	}

	componentDidMount() {
		if (this.props.isAuth) {
			this.getFiltersYears(this.props.expenses);
		}
	}

	componentDidUpdate(prevProps, prevState) {
		if (this.state.selected !== prevState.selected) {
			this.setDatasAndTable(this.props.expenses, this.state.selected.years);
		}
	}

	getFiltersYears = (expenses) => {
		if (!expenses || !Object.keys(expenses).length) return;
		const years = Object.keys(expenses).map(expense => expense);
		const updatedFilters = this.state.filtersControls;

		years.forEach((year) => {
			updatedFilters[year] = {
				elementType: 'check',
				elementConfig: {
					type: 'radio',
					placeholder: year,
					name: 'years',
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

		this.setState({ filtersControls: updatedFilters });
		this.setDatasAndTable(this.props.expenses, this.state.selected.years);
	}

	inputChangedHandler = (event, controlName) => {
		const { target } = event;

		const updatedControls = updateObject(this.state.filtersControls, {
			[controlName]: updateObject(this.state.filtersControls[controlName], {
				...this.state.filtersControls[controlName],
				value: target.value,
				valid: formCheckValidity(target.value, this.state.filtersControls[controlName]),
				touched: true,
			})
		});

		const updatedSelected = updateObject(this.state.selected, {
			[target.name]: target.value
		});

		this.setState({ 
			selected: updatedSelected, 
			filtersControls: updatedControls,
		});
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

	setDatasAndTable = (expenses, year) => {
		if (!expenses || !Object.keys(expenses).length) return;
		const filtered = {
			years: this.filterByYears(expenses, year),
			categories: this.filterByCategories(expenses, year)
		}
		const updatedTable = filtered[this.state.selected.types];
		const updatedDatas = this.state.chartDatas.map(item => {
			let item2 = filtered.years.body.find(i2 => item.x === i2[0])
			return item2 ? { 
				x: item.x,
				y: item2[2],
				y2: item2[1],
			} : item
		})

		this.setState({ 
			table: updatedTable,
			chartDatas: updatedDatas,
		});
	}

	displayModeHandler = (event, displayName) => {
		if (this.state.selected.display === displayName) return;

		const displayed = updateObject(this.state.selected, {
			display: displayName
		});

		const isDisplayChart = displayName === 'chart'
		document.querySelectorAll('input[name="types"]').forEach(input => {
			isDisplayChart ? input.setAttribute('disabled', '') : input.removeAttribute('disabled')
		})

		this.setState({ selected: displayed });
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
					checked={ this.state.selected[elementConfig.name] === value }
					changed={ (event) => this.inputChangedHandler(event, formElement.id) } />
			)
		});

		const chart = <Chart datas={ this.state.chartDatas } container={ "#chartContainer" } />
		const table = <Table
								headings={ this.state.table.headings } 
								rows={ this.state.table.body } 
								footer={ this.state.table.footer } />
		const display = this.state.selected.display === 'table' ? table : chart;

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
					<div className="col-3 col-margin-1 card card--transparent">
						<div className={ displays }>
							<div>Affichage:</div>
							<Button
								btnType="button__grey"
								typeBtn="button"
								isActive={ this.state.selected.display === 'table' ? 'is__selected' : null }
								clicked={ (event) => this.displayModeHandler(event, 'table') }>Table</Button>
							<Button 
								isActive={ this.state.selected.display === 'chart' ? 'is__selected' : null } 
								btnType="button__grey"
								typeBtn="button"
								clicked={ (event) => this.displayModeHandler(event, 'chart') }>Chart</Button>
						</div>
					</div>
				</div>
				<div className="row">
					<div id="chartContainer" className="col-12 card">
						{ display }
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