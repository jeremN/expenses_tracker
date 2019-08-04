import React, { Component, Fragment } from 'react';
import { connect } from 'react-redux';
import axios from 'axios';

import ErrorHandler from '../../hoc/ErrorHandler/ErrorHandler';
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
		editControls: {
			amount: {
				elementType: 'input',
				elementConfig: {
					type: 'number',
					placeholder: '',
					step: '0.01',
				},
				value: '',
				touched: false
			}
		},
		table: {
			headings: null,
			body: null,
			footer: null
		},
		chartDatas: [
			{ 
				x: 'January', 
			  y: [0, 0],
			},
			{ 
				x: 'February', 
			  y: [0, 0],
			},
			{ 
				x: 'March', 
			  y: [0, 0],
			},
			{ 
				x: 'April', 
			  y: [0, 0],
			},
			{ 
				x: 'May', 
			  y: [0, 0],
			},
			{ 
				x: 'June', 
			  y: [0, 0],
			},
			{ 
				x: 'July', 
			  y: [0, 0],
			},
			{ 
				x: 'August', 
			  y: [0, 0],
			},
			{ 
				x: 'September', 
			  y: [0, 0],
			},
			{ 
				x: 'October', 
			  y: [0, 0],
			},
			{ 
				x: 'November', 
			  y: [0, 0],
			},
			{ 
				x: 'December', 
			  y: [0, 0],
			},
		],
		headings: {
			first: ['Month', 'Outcome', 'Income', 'Diff', 'Saving', 'Actions'],
			second: ['Category', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
		},
		selected: {
			years: getDate().currentYear,
			types: 'years',
			display: 'table',
		}, 
		currencies: {
			'euros': '€',
			'dollars': '$',
		}
	}

	componentDidMount() {
		if (this.props.isAuth) {
			this.getFiltersYears(this.props.expenses);
		}
	}

	componentDidUpdate(prevProps, prevState) {
		if (this.state.selected !== prevState.selected || this.props.expenses !== prevProps.expenses) {
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

	sortMonths = (months) => {
		const defaultMonthOrder = [...this.state.headings.second].splice(1, this.state.headings.second.length - 1);
		return Object.keys(months)
			.sort((a, b) => defaultMonthOrder.indexOf(a) - defaultMonthOrder.indexOf(b))
			.reduce((acc, monthName) => {
				return {...acc, [monthName]: months[monthName]}
			}, {});
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

	updateControls = (name, val, touch = false) => {
		const updatedControls = updateObject(this.state.editControls, {
			[name]: updateObject(this.state.editControls[name], {
				...this.state.editControls[name],
				value: val,
				touched: touch,
			})
		});
		this.setState({ editControls: updatedControls });
	}

	editSavingHandler = (event, controlName, currentIndex) => {
		const { target } = event;
		const rowId = target.closest('tr').id;
		const editedArray = [...this.state.table.body];
		const toEditRow = [...this.state.table.body[+rowId]];
		const { value: currentVal } = target;
		const editForm = [
			{
				id: controlName,
				config: {
					...this.state.editControls[controlName],
					value: currentVal
				}
			}
		];

		let editedRow = editForm.map((editElement) => {
			const { 
				elementType, 
				elementConfig, 
				touched, 
				value 
			} = editElement.config;

			return (
				<span key="editSaving">
					<Input 
						key={ editElement.id } 
						inputId={ editElement.id } 
						elementType={ elementType }
						elementConfig={ elementConfig }
						value={ value } 
						touched={ touched }
						changed={ (event) => this.editSavingHandler(event, editElement.id, currentIndex) } />
				</span>
			);
		});

		toEditRow.splice(4, 1, editedRow);
		editedArray.splice(+rowId, 1, toEditRow);

		this.setState({
			table: {
				headings: this.state.table.headings,
				body: editedArray,
				footer: this.state.table.footer
			}
		});
		this.updateControls(controlName, currentVal, false)
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
			headings: [],
			body: [],
		}

		const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
		const categories = this.setCategoriesArray(expenses, year);
		const items = this.setSortedByCategories(categories);

		filteredCategories.headings = this.state.headings.second.map((heading, index) => {
			if (index !== 0) {
				return `${heading} (${this.state.currencies[this.props.profile.currency]})`
			}
			return heading
		});

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
			headings: [],
			body: [],
			footer: []
		}

		const btnsGroup = this.switchBtnsGroups(false);
		const sortedMonths = this.sortMonths(expenses[year])
		const months = Object.keys(sortedMonths);
		const firstEntry = sortedMonths[months[0]];
		const lastEntry = sortedMonths[months[months.length - 1]];
		const totalSaved = +lastEntry.saved === 0 ? +firstEntry.saved : +lastEntry.saved - +firstEntry.saved;
		let totalIncome = 0;
		let totalOutcome = 0;

		filteredYear.headings = this.state.headings.first.map(heading => `${heading} (in ${this.state.currencies[this.props.profile.currency]})`);

		Object.keys(sortedMonths).forEach(expense => {
			totalIncome += +expenses[year][expense].income;
			totalOutcome += +expenses[year][expense].outcome;

			filteredYear.body.push([
				expense,
				expenses[year][expense].outcome ? expenses[year][expense].outcome : 0,
				expenses[year][expense].income ? expenses[year][expense].income : 0,
				+expenses[year][expense].income - +expenses[year][expense].outcome,
				expenses[year][expense].saved ? expenses[year][expense].saved : 0,
				btnsGroup
			]);
		});

		filteredYear.footer = [ '', parseFloat(totalOutcome).toFixed(2), parseFloat(totalIncome).toFixed(2), '', totalSaved, ''];
		return filteredYear;	
	}

	saveTableCell = (event) => {
		event.preventDefault();
		const { target } = event;
		const rowId = target.closest('tr').id;
		const { userId, token, currentKey, expenses } = this.props;
		const { 
			selected: {
				years,
			},
			editControls: {
				amount,
			}, 
			table: {
				body,
			},
		} = this.state;
		const monthName = body[rowId][0];
		const updatedExpenses = updateObject(expenses, {
			[years]: updateObject(expenses[years], {
				[monthName]: updateObject(expenses[years][monthName], {				
					...expenses[years][monthName],
					saved: +amount.value
				})
			})
		})

		this.props.onUpdateExpenses(userId, token, currentKey, updatedExpenses);
	}

	cancelEditCell = (event) => {
		this.setDatasAndTable(this.props.expenses, this.state.selected.years);
	}

	editTableCell = (event) => {
		const { target } = event;
		const rowId = target.closest('tr').id;
		this.switchEditMode(rowId);
	}

	switchEditMode = (rowId) => {
		const editedArray = [...this.state.table.body];
		const toEditRow = [...this.state.table.body[+rowId]];
		const updatedControls = this.state.editControls;
		const btnsGroup = this.switchBtnsGroups(true);
		let editForm = [];

		Object.keys(this.state.editControls).forEach((key) => {
			editForm.push({
				id: key,
				config: {
					...this.state.editControls[key],
					value: toEditRow[4],
				}
			});
			updatedControls[key] = {
				...this.state.editControls[key],
				value: toEditRow[4],
			}
		});

		let editedRow = editForm.map((editElement, index) => {
			const { 
				elementType, 
				elementConfig, 
				touched, 
				value 
			} = editElement.config;

			return (
				<span key="editSaving">
					<Input 
						key={ editElement.id } 
						inputId={ editElement.id } 
						elementType={ elementType }
						elementConfig={ elementConfig }
						value={ value } 
						touched={ touched }
						changed={ (event) => this.editSavingHandler(event, editElement.id, index) } />
				</span>
			);
		});

		toEditRow.splice(4, 1, editedRow);
		toEditRow.splice(5, 1, btnsGroup);
		editedArray.splice(+rowId, 1, toEditRow);

		this.setState({
			table: {
				headings: this.state.table.headings,
				body: editedArray
			},
			editControls: updatedControls,
		});
	}

	switchBtnsGroups = (edit = false) => {
		return (
			<span>
				<Button
					cssStyle={{ display: edit ? 'flex' : 'none' }} 
					btnType="button--td"
					attributes={ {'data-type': 'save'} } 
					clicked={ this.saveTableCell }>Save</Button>
				<Button
					cssStyle={{ display: edit ? 'flex' : 'none' }} 
					btnType="button--td"
					attributes={ {'data-type': 'cancel'} } 
					clicked={ this.cancelEditCell }>Cancel</Button>
				<Button
					cssStyle={{ display: !edit ? 'flex' : 'none' }} 
					btnType="button--td"
					attributes={ {'data-type': 'edit'} } 
					clicked={ this.editTableCell }>Edit saving</Button>
			</span>
		);
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
				y: [item2[2], item2[1]],
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

		const chart = <Chart datas={ this.state.chartDatas } container={ "#chartContainer" } chartSize={ [null, 400] } />
		const table = <Table
			headings={ this.state.table.headings } 
			rows={ this.state.table.body } 
			footer={ this.state.table.footer } 
			isLoading={ this.props.loading }/>
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
		profile: state.payload.profile,
	}
}

const mapDispatchToProps = dispatch => {
	return {
		onUpdateExpenses:(userId, token, key, datas) => dispatch(actions.updateExpenses(userId, token, key, datas)),
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(ErrorHandler(Statistics, axios));