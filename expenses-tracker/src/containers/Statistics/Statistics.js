import React, { Component, Fragment } from 'react';
import { connect } from 'react-redux';
import axios from 'axios';
import { withTranslation } from 'react-i18next';

import ErrorHandler from '../../hoc/ErrorHandler/ErrorHandler';
import Chart from '../../components/Charts/Chart';
import Input from '../../components/UI/Input/Input';
import Table from '../../components/UI/Table/Table';
import Button from '../../components/UI/Button/Button';

import * as actions from '../../store/actions';
import { updateObject, getDate, formCheckValidity } from '../../shared/utility';
import { renderButtonGroup } from '../../shared/functions';

import { statistic, filters, displays } from './Statistics.module.scss';

class Statistics extends Component {
	state = {
		filtersControls: {
			category: {
				elementType: 'check',
				elementConfig: {
					type: 'radio',
					placeholder: 'STATS_FilterCat',
					name: 'types',
				},
				label: 'STATS_FilterCat',
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
					placeholder: 'STATS_FilterYear',
					name: 'types',
				},
				label: 'STATS_FilterYear',
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
			  in: 0,
			  out: 0,
			},
			{ 
				x: 'February', 
			  in: 0,
			  out: 0,
			},
			{ 
				x: 'March', 
			  in: 0,
			  out: 0,
			},
			{ 
				x: 'April', 
			  in: 0,
			  out: 0,
			},
			{ 
				x: 'May', 
			  in: 0,
			  out: 0,
			},
			{ 
				x: 'June', 
			  in: 0,
			  out: 0,
			},
			{ 
				x: 'July', 
			  in: 0,
			  out: 0,
			},
			{ 
				x: 'August', 
			  in: 0,
			  out: 0,
			},
			{ 
				x: 'September', 
			  in: 0,
			  out: 0,
			},
			{ 
				x: 'October', 
			  in: 0,
			  out: 0,
			},
			{ 
				x: 'November', 
			  in: 0,
			  out: 0,
			},
			{ 
				x: 'December', 
			  in: 0,
			  out: 0,
			},
		],
		headings: {
			first: 'STATS_ByYearTHead',
			second: 'STATS_ByCatTHead'
		},
		selected: {
			years: getDate().currentYear,
			types: 'years',
			display: 'table',
		}, 
		currencies: {
			'euros': '€',
			'dollars': '$',
		},
		monthOrder: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
		sortedMonths: [],
		btnGroup: [
			{
				styles: 'onEdit',
				type: 'button--td',
				attr: {'data-type': 'save'},
				onClick: null,
				content: 'Save',
			}, {
				styles: 'onEdit',
				type: 'button--td',
				attr: {'data-type': 'cancel'},
				onClick: null,
				content: 'Cancel',
			}, {
				styles: 'notEdit',
				type: 'button--td',
				attr: {'data-type': 'edit'},
				onClick: null,
				content: 'STATS_EditSaving',
			},
		]
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
		const defaultMonthOrder = [...this.state.monthOrder];

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
				month: expense
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
		const { t } = this.props;
		const filteredCategories = {
			headings: [],
			body: [],
		}
		const months = [...this.state.monthOrder];
		const categories = this.setCategoriesArray(expenses, year);
		const items = this.setSortedByCategories(categories);

		filteredCategories.headings = [...t(this.state.headings.second, { returnObjects: true })].map((heading, index) => {
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
		const { t } = this.props;
		const filteredYear = {
			headings: [],
			body: [],
			footer: []
		}
		const clikedProps = {
			Save: this.saveTableCell,
			Cancel: this.cancelEditCell,
			STATS_EditSaving: this.editTableCell,
		}

		const btnsGroup = renderButtonGroup(clikedProps, this.state.btnGroup, false);
		const sortedMonths = this.sortMonths(expenses[year]);

		this.setState({ sortedMonths: sortedMonths });

		const months = Object.keys(sortedMonths);
		const firstEntry = sortedMonths[months[0]];
		const lastEntry = sortedMonths[months[months.length - 1]];
		const totalSaved = !lastEntry ? 0 : +lastEntry.saved === 0 ? +firstEntry.saved : +lastEntry.saved - +firstEntry.saved;
		let totalIncome = 0;
		let totalOutcome = 0;
		filteredYear.headings = [...t(this.state.headings.first, { returnObjects: true })].map(heading => `${heading} (${this.state.currencies[this.props.profile.currency]})`);

		Object.keys(sortedMonths).forEach(expense => {
			const income = +expenses[year][expense].income || 0
			const outcome = +expenses[year][expense].outcome || 0
			totalIncome += income;
			totalOutcome += outcome;
			
			filteredYear.body.push([
				t(expense),
				outcome,
				income,
				+income - +outcome,
				expenses[year][expense].saved || 0,
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
		} = this.state;

		const monthName = Object.keys(this.state.sortedMonths)[rowId];
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
		const clikedProps = {
			Save: this.saveTableCell,
			Cancel: this.cancelEditCell,
			STATS_EditSaving: this.editTableCell,
		}
		const btnsGroup = renderButtonGroup(clikedProps, this.state.btnGroup, true);
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

	setDatasAndTable = (expenses, year) => {
		const { t } = this.props;
		if (!expenses || !Object.keys(expenses).length) return;

		const filtered = {
			years: this.filterByYears(expenses, year),
			categories: this.filterByCategories(expenses, year)
		}
		const updatedTable = filtered[this.state.selected.types];
		const updatedDatas = this.state.chartDatas.map(item => {
			let item2 = filtered.years.body.find(i2 => t(item.x) === i2[0])

			return { 
				[t('Month')]: t(item.x),
				[t('Income')]: item2 ? item2[1] : 0,
				[t('Outcome')]: item2 ? item2[2] : 0,
			}
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
		const { t } = this.props;
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
					labelValue={ t(label) }
					labelSmall={ labelSmall }
					invalid={ !valid }
					shouldValidate={ validation }
					labelAfter= { labelAfter }
					touched={ touched }
					checked={ this.state.selected[elementConfig.name] === value }
					changed={ (event) => this.inputChangedHandler(event, formElement.id) } />
			)
		});

		const chart = <Chart datas={ this.state.chartDatas } container={ "#chartContainer" } chartSize={ [null, 500] } />
		const table = <Table
			headings={ this.state.table.headings } 
			rows={ this.state.table.body } 
			footer={ this.state.table.footer } />
		let display = null;
		
		const emptyTableIllustration = (
				<div className="content__emptyTable">
					<h2>{ t('STATS_EmptyTable') }</h2>
					<svg 
						xmlns="http://www.w3.org/2000/svg" 
						id="ada6f7ae-8394-4767-8700-18704e9e9034" 
						data-name="Layer 1" 
						width="974" 
						height="805.02" 
						viewBox="0 0 974 805.02">
						<title>note list</title>
						<path d="M1087,816.24v5a19.11,19.11,0,0,1-20.91,19c-39.15-3.72-78.12-10.64-117.4-9.43-72.42,2.21-145.44,31.83-215.54,13.53-19.77-5.16-39.32-14.13-59.66-12.2-18.25,1.73-34.49,12.05-52.17,16.89C567.55,863.79,512.8,826.49,457.06,828c-36.74,1-71.92,18.89-108.62,16.9-21.27-1.14-41.53-8.92-62.28-13.71-51.66-11.94-104.86-5.27-158.09-1.13A14,14,0,0,1,113,816.13v-4.28a14,14,0,0,1,14-14l940.92-.76A19.11,19.11,0,0,1,1087,816.24Z" transform="translate(-113 -47.49)" fill="#3f3d56"/>
						<path d="M1087,816.24v5a19.11,19.11,0,0,1-20.91,19c-39.15-3.72-78.12-10.64-117.4-9.43-72.42,2.21-145.44,31.83-215.54,13.53-19.77-5.16-39.32-14.13-59.66-12.2-18.25,1.73-34.49,12.05-52.17,16.89C567.55,863.79,512.8,826.49,457.06,828c-36.74,1-71.92,18.89-108.62,16.9-21.27-1.14-41.53-8.92-62.28-13.71-51.66-11.94-104.86-5.27-158.09-1.13A14,14,0,0,1,113,816.13v-4.28a14,14,0,0,1,14-14l940.92-.76A19.11,19.11,0,0,1,1087,816.24Z" transform="translate(-113 -47.49)" opacity="0.1"/>
						<path d="M1087,807.1v5a20.39,20.39,0,0,1-.11,2.08,19.11,19.11,0,0,1-20.8,17c-39.15-3.73-78.12-10.65-117.4-9.44-72.42,2.22-145.44,31.84-215.54,13.53-19.77-5.16-39.32-14.13-59.66-12.2-18.25,1.73-34.49,12.05-52.17,16.9-53.77,14.72-108.52-22.58-164.26-21.08-36.74,1-71.92,18.89-108.62,16.91-21.27-1.15-41.53-8.92-62.28-13.72-51.65-11.93-104.86-5.26-158.09-1.12a14,14,0,0,1-14.86-11.5A13.7,13.7,0,0,1,113,807v-4.28a14,14,0,0,1,14-14l235.83-.19,481.81-.4,223.28-.18A19.11,19.11,0,0,1,1087,807.1Z" transform="translate(-113 -47.49)" fill="#3f3d56"/>
						<path d="M856.59,791c0,2.21-4.36,4.33-12.4,6.32C812,805.27,721,811,613.59,811c-105.67,0-195.58-5.55-229-13.31-9-2.09-14-4.34-14-6.69,0-.82.6-1.63,1.78-2.43l481.81-.4C855.77,789.1,856.59,790,856.59,791Z" transform="translate(-113 -47.49)" opacity="0.1"/>
						<g opacity="0.5">
							<rect x="552" width="402" height="121" rx="19.03" fill="#36334a"/>
							<rect x="601" y="26" width="93" height="21" fill="#6c63ff"/>
							<rect x="601" y="60" width="285" height="11" fill="#6c63ff" opacity="0.3"/>
							<rect x="601" y="84" width="114" height="11" fill="#6c63ff" opacity="0.3"/>
						</g>
						<g opacity="0.5">
							<rect x="48" y="98.51" width="402" height="121" rx="19.03" fill="#36334a"/>
							<rect x="97" y="124.51" width="93" height="21" fill="#36334a"/>
							<rect x="97" y="158.51" width="285" height="11" fill="#36334a"/>
							<rect x="97" y="182.51" width="114" height="11" fill="#36334a"/>
							<rect x="48" y="98.51" width="402" height="121" rx="19.03" fill="#36334a"/>
							<rect x="97" y="124.51" width="93" height="21" fill="#6c63ff"/>
							<rect x="97" y="158.51" width="285" height="11" fill="#6c63ff" opacity="0.3"/>
							<rect x="97" y="182.51" width="114" height="11" fill="#6c63ff" opacity="0.3"/>
						</g>
						<rect x="667.58" y="211.54" width="10.31" height="85.02" rx="2.29" fill="#3f3d56"/>
						<rect x="324.76" y="144.93" width="5.79" height="27.99" rx="1.5" fill="#3f3d56"/>
						<rect x="324.55" y="196.17" width="6.52" height="48.72" rx="1.69" fill="#3f3d56"/>
						<rect x="324.65" y="261.94" width="6.21" height="49.14" rx="1.61" fill="#3f3d56"/>
						<rect x="328.04" y="52.43" width="345.1" height="701.37" rx="35.69" fill="#3f3d56"/>
						<rect x="467.3" y="73.38" width="48.19" height="9.79" rx="2.54" fill="#e6e8ec"/>
						<circle cx="528.33" cy="78.27" r="5.55" fill="#e6e8ec"/>
						<path d="M764.83,145.6v610A27.41,27.41,0,0,1,737.42,783H489.76a27.41,27.41,0,0,1-27.41-27.4v-610a27.41,27.41,0,0,1,27.41-27.41h37.06V123a22.58,22.58,0,0,0,22.57,22.57h126A22.57,22.57,0,0,0,697.91,123v-4.76h39.51A27.41,27.41,0,0,1,764.83,145.6Z" transform="translate(-113 -47.49)" fill="#36334a"/>
						<rect x="358" y="129" width="31" height="4" fill="#3f3d56"/>
						<rect x="358" y="136" width="31" height="4" fill="#3f3d56"/>
						<rect x="358" y="143" width="31" height="4" fill="#3f3d56"/>
						<rect x="358" y="129" width="31" height="4" fill="#3f3d56"/>
						<rect x="358" y="136" width="31" height="4" fill="#3f3d56"/>
						<rect x="358" y="143" width="31" height="4" fill="#3f3d56"/>
						<path d="M750.66,186.49h-.91l-.35-.29a7.61,7.61,0,0,0,1.78-4.89,7.44,7.44,0,1,0-7.4,7.48,7.73,7.73,0,0,0,4.88-1.78l.34.29v.92l5.74,5.75,1.72-1.72Zm-6.88,0a5.18,5.18,0,1,1,5.16-5.18A5.15,5.15,0,0,1,743.78,186.49Z" transform="translate(-113 -47.49)" fill="#3f3d56"/>
						<rect x="358" y="200" width="93" height="21" fill="#6c63ff"/>
						<rect x="358" y="234" width="285" height="11" fill="#6c63ff" opacity="0.3"/>
						<rect x="358" y="258" width="114" height="11" fill="#6c63ff" opacity="0.3"/>
						<rect x="358" y="444" width="93" height="21" fill="#6c63ff"/>
						<rect x="358" y="478" width="285" height="11" fill="#6c63ff" opacity="0.3"/>
						<rect x="358" y="502" width="114" height="11" fill="#6c63ff" opacity="0.3"/>
						<rect x="358" y="566" width="93" height="21" fill="#6c63ff"/>
						<rect x="358" y="600" width="285" height="11" fill="#6c63ff" opacity="0.3"/>
						<rect x="358" y="624" width="114" height="11" fill="#6c63ff" opacity="0.3"/>
						<circle cx="592" cy="676" r="34" fill="#6c63ff"/>
						<path d="M722.33,720.81v16.43a1.25,1.25,0,0,1-1.25,1.25h-33.5a1.25,1.25,0,0,1-1.25-1.25V711.07a1.25,1.25,0,0,1,1.25-1.25h23.31" transform="translate(-113 -47.49)" fill="none" stroke="#fff" strokeLinecap="round" strokeMiterlimit="10"/>
						<line x1="579.67" y1="672" x2="602.33" y2="672" fill="none" stroke="#fff" strokeLinecap="round" strokeMiterlimit="10"/>
						<line x1="580" y1="676.67" x2="602.67" y2="676.67" fill="none" stroke="#fff" strokeLinecap="round" strokeMiterlimit="10"/>
						<line x1="580.33" y1="681.33" x2="603" y2="681.33" fill="none" stroke="#fff" strokeLinecap="round" strokeMiterlimit="10"/>
						<line x1="605" y1="661" x2="605" y2="672.33" fill="none" stroke="#f0f" strokeMiterlimit="10"/>
						<line x1="610.67" y1="666.67" x2="599.33" y2="666.67" fill="none" stroke="#f0f" strokeMiterlimit="10"/>
						<line x1="605" y1="661" x2="605" y2="672.33" fill="none" stroke="#fff" strokeLinecap="round" strokeMiterlimit="10"/>
						<line x1="610.67" y1="666.67" x2="599.33" y2="666.67" fill="none" stroke="#fff" strokeLinecap="round" strokeMiterlimit="10"/>
						<path d="M1001.6,792.66c3-5.51-.4-12.27-4.29-17.18s-8.61-10-8.51-16.29c.15-9,9.7-14.31,17.33-19.09a84,84,0,0,0,15.56-12.51,22.8,22.8,0,0,0,4.78-6.4c1.58-3.52,1.54-7.52,1.44-11.37q-.51-19.26-1.91-38.49" transform="translate(-113 -47.49)" fill="none" stroke="#3f3d56" strokeMiterlimit="10" strokeWidth="4"/>
						<path d="M1040.51,670.63a14,14,0,0,0-7-11.5l-3.14,6.22.1-7.53a14.22,14.22,0,0,0-4.63-.56,14,14,0,1,0,14.68,13.37Z" transform="translate(-113 -47.49)" fill="#57b894"/>
						<path d="M1015.48,765.62a14,14,0,1,1,.68-11.3l-8.77,7.13,9.65-2.23A14,14,0,0,1,1015.48,765.62Z" transform="translate(-113 -47.49)" fill="#57b894"/>
						<path d="M1008.55,738.37a14,14,0,0,1-4.45-27.53l-.08,5.78,3.18-6.29h0a14,14,0,0,1,14.67,13.36,13.84,13.84,0,0,1-.6,4.79A14,14,0,0,1,1008.55,738.37Z" transform="translate(-113 -47.49)" fill="#57b894"/>
						<path d="M1042.62,715.7a14,14,0,1,1,6.21-26.27l-2.48,6.8,5.1-4.9A14,14,0,0,1,1056,701a13.79,13.79,0,0,1-.35,3.87A14,14,0,0,1,1042.62,715.7Z" transform="translate(-113 -47.49)" fill="#57b894"/>
						<path d="M1038.62,674.37c-3.24.35-6.39,1.36-9.64,1.56s-6.82-.57-8.88-3.1c-1.1-1.36-1.66-3.08-2.59-4.57a10,10,0,0,0-3.54-3.33,14,14,0,1,0,26.24,9.32Q1039.42,674.28,1038.62,674.37Z" transform="translate(-113 -47.49)" opacity="0.1"/>
						<path d="M1042.62,715.7a14,14,0,0,1-13.35-20,10.37,10.37,0,0,1,2.82,2.82c1,1.51,1.61,3.26,2.78,4.64,2.19,2.57,5.92,3.41,9.31,3.26s6.66-1.12,10-1.43c.47,0,.94-.07,1.42-.08A14,14,0,0,1,1042.62,715.7Z" transform="translate(-113 -47.49)" opacity="0.1"/>
						<path d="M1008.55,738.37a14,14,0,0,1-13.46-19.76,11.48,11.48,0,0,1,3,2.85c1.09,1.54,1.77,3.32,3.05,4.74,2.37,2.63,6.35,3.56,9.93,3.48s6.83-.93,10.28-1.2A14,14,0,0,1,1008.55,738.37Z" transform="translate(-113 -47.49)" opacity="0.1"/>
						<path d="M1015.48,765.62a14,14,0,0,1-25.59-11.45,13.84,13.84,0,0,1,3.08,2.75c1.34,1.62,2.22,3.47,3.76,5,2.87,2.82,7.5,4,11.63,4.09A60,60,0,0,0,1015.48,765.62Z" transform="translate(-113 -47.49)" opacity="0.1"/>
						<path d="M980.43,786.31s11.08-.34,14.42-2.72,17-5.21,17.86-1.4,16.65,19,4.15,19.06-29.06-1.94-32.4-4S980.43,786.31,980.43,786.31Z" transform="translate(-113 -47.49)" fill="#656380"/>
						<path d="M1017.08,799.93c-12.51.1-29.06-1.95-32.39-4-2.54-1.55-3.55-7.09-3.89-9.65h-.37s.7,8.94,4,11,19.89,4.07,32.4,4c3.61,0,4.85-1.31,4.78-3.21C1021.14,799.19,1019.77,799.9,1017.08,799.93Z" transform="translate(-113 -47.49)" opacity="0.2"/>
						<path d="M755,378.52v82.94a19,19,0,0,1-19,19H462.35v-121H736A19,19,0,0,1,755,378.52Z" transform="translate(-113 -47.49)" fill="#3f3d56"/>
						<rect x="208" y="295" width="402" height="121" rx="19.03" fill="#f2f2f2"/>
						<rect x="208" y="295" width="402" height="121" rx="19.03" fill="#f2f2f2"/>
						<rect x="257" y="321" width="93" height="21" fill="#6c63ff"/>
						<rect x="257" y="355" width="285" height="11" fill="#6c63ff" opacity="0.3"/>
						<rect x="257" y="379" width="114" height="11" fill="#6c63ff" opacity="0.3"/>
						<circle cx="92.34" cy="246.84" r="35.75" fill="#3f3d56"/>
						<path d="M184.6,572.43c3.69,25.89-.81,52.29-7.82,77.48-1.31,4.69-2.72,9.42-5.17,13.63s-5.86,7.83-8.74,11.79c-6,8.26-9.52,18-12.81,27.64a779.65,779.65,0,0,0-22.82,81.32,5.57,5.57,0,0,0,0,3.47c.87,2,3.51,2.26,5.68,2.25l28.06-.15c1-1.92-.85-4-2-5.84-4-6.22-.16-14.3,3.37-20.81a223.74,223.74,0,0,0,19.78-50c1.92-7.33,3.48-14.82,6.6-21.73,3.77-8.38,9.68-15.59,14.48-23.43,5.58-9.11,9.65-19,13.69-28.93,5.64-13.78,11.33-27.73,13.55-42.45,2.09-13.82,1.06-27.9-.3-41.81a2.64,2.64,0,0,0-3.06-3l-37.65-1.94c-7.76-.4-9.6-2.1-8.42,5.52C181.84,561.13,183.78,566.67,184.6,572.43Z" transform="translate(-113 -47.49)" fill="#3f3d56"/>
						<path d="M184.6,572.43c3.69,25.89-.81,52.29-7.82,77.48-1.31,4.69-2.72,9.42-5.17,13.63s-5.86,7.83-8.74,11.79c-6,8.26-9.52,18-12.81,27.64a779.65,779.65,0,0,0-22.82,81.32,5.57,5.57,0,0,0,0,3.47c.87,2,3.51,2.26,5.68,2.25l28.06-.15c1-1.92-.85-4-2-5.84-4-6.22-.16-14.3,3.37-20.81a223.74,223.74,0,0,0,19.78-50c1.92-7.33,3.48-14.82,6.6-21.73,3.77-8.38,9.68-15.59,14.48-23.43,5.58-9.11,9.65-19,13.69-28.93,5.64-13.78,11.33-27.73,13.55-42.45,2.09-13.82,1.06-27.9-.3-41.81a2.64,2.64,0,0,0-3.06-3l-37.65-1.94c-7.76-.4-9.6-2.1-8.42,5.52C181.84,561.13,183.78,566.67,184.6,572.43Z" transform="translate(-113 -47.49)" opacity="0.1"/>
						<path d="M192,509.48c-7.65,11-15.67,23.66-13.13,36.83,1.93,10,9.55,17.75,16.74,25,28.74,28.86,57,60.92,66.78,100.47,2.52,10.22,3.74,20.71,5.91,31,3.94,18.7,11,36.58,18,54.35l18.72,47.38a28.36,28.36,0,0,0,27.1-18c-2.46-.19-5.67-2.57-7.11-4.57-8-11.07-9.64-25.31-11.69-38.81-2.27-14.92-5.3-29.72-8.34-44.51L291.58,633.2c-1.55-7.55-3.1-15.11-5.12-22.54-7.82-28.83-22.64-56-24.93-85.81-.34-4.38-.55-9.19-3.52-12.44-3.12-3.43-8.24-4-12.87-4.27C226.41,506.9,210.25,505.07,192,509.48Z" transform="translate(-113 -47.49)" fill="#3f3d56"/>
						<path d="M141.47,783.62a29.86,29.86,0,0,0-6.22-.8,12.92,12.92,0,0,0-10.16,5.55,25.25,25.25,0,0,0-2.73,6l-2.71,7.78c-.8,2.28-1.58,4.91-.39,7A7.42,7.42,0,0,0,122.9,812c6.56,2.92,13.95,3.08,21.1,3.78,6.94.68,13.82,1.9,20.67,3.19,2.36.44,4.71.89,7.1,1.13,5.34.54,10.72,0,16.06-.48l5.51-.53a19.84,19.84,0,0,0,5.42-1,6.83,6.83,0,0,0,4-3.59c1.36-3.37-1.56-7.36-5.13-8-1.45-.29-2.95-.16-4.42-.35a20.88,20.88,0,0,1-4.84-1.45c-7.05-2.77-14.17-5.57-20.37-9.93-1.72-1.21-3.52-2.9-3.33-5a10.19,10.19,0,0,1,.89-2.59,9.46,9.46,0,0,0,.08-6.69c-.34-.92-1-1.89-1.93-2-2.64-.32-2.32,3.53-2.71,5-.53,2-1.49,2.18-3.37,2C152.23,784.91,146.83,784.64,141.47,783.62Z" transform="translate(-113 -47.49)" fill="#f2f2f2"/>
						<path d="M299.34,810.45a17.65,17.65,0,0,0,3.82,10.75,8.36,8.36,0,0,0,2.72,2.19,10.92,10.92,0,0,0,4.95.79,40.05,40.05,0,0,0,13.89-2.81,39.7,39.7,0,0,1,4.8-1.81,53.88,53.88,0,0,1,6.24-.9c8.27-1.19,15.53-6.07,23.52-8.54a49.45,49.45,0,0,0,7-2.3c3.16-1.49,5.72-4,8.23-6.43a19.89,19.89,0,0,0,3.78-4.52c1.47-2.74,1.56-6,1.62-9.1a2.59,2.59,0,0,0-.24-1.41,2.1,2.1,0,0,0-.9-.71c-2.43-1.2-5.31-.6-8-.13-9.72,1.73-19.67,1.41-29.54,1.09a4.29,4.29,0,0,1-4.54-2.59l-3.75-6c-1.07-1.72-2.77-3.69-4.71-3.1-1.55.47-2.18,2.37-2.12,4s.56,3.25.25,4.84a6.61,6.61,0,0,1-3.2,4.16,20.44,20.44,0,0,1-5,1.92c-5.52,1.56-11.94,3.33-16.21,7.39C298.86,800.15,299.15,806.6,299.34,810.45Z" transform="translate(-113 -47.49)" fill="#f2f2f2"/>
						<path d="M297.4,413.75a23.17,23.17,0,0,0,5.46-5.94,24.21,24.21,0,0,0,2.33-8.21l1.57-9.92c.87-5.47,1.89-11.26,5.54-15.43s10.92-5.66,14.63-1.54c1.62,1.79,2.26,4.25,2.66,6.64a48.34,48.34,0,0,1-11.82,40c-4.49,4.92-10,8.83-14.75,13.48-4.14,4-7.73,8.59-11.55,12.94A159.42,159.42,0,0,1,260,473.27c.14-7.44,1.09-15.42,0-22.81-.81-5.34-3-8.22,2.17-11.71C274.17,430.59,286.28,423.21,297.4,413.75Z" transform="translate(-113 -47.49)" fill="#fbbebe"/>
						<path d="M196.56,340.57c-.39,5.32-2.6,10.76-7,13.83q18.69,6.54,36.87,14.42c-2.34-2.25-3.05-5.7-3.16-8.94-.31-8.47,2.62-16.8,6.9-24.1a5.85,5.85,0,0,0,1.13-3.18c-.14-2.36-2.94-3.45-5.24-4a128.86,128.86,0,0,0-23.92-3.47c-3.45-.11-7.54-1.2-6.76,3.19C196.12,332.42,196.87,336.42,196.56,340.57Z" transform="translate(-113 -47.49)" fill="#fbbebe"/>
						<circle cx="107.66" cy="266.7" r="29.23" fill="#fbbebe"/>
						<path d="M249.6,393.14a35.36,35.36,0,0,0-3.71-6.22c-5.3-7.61-10.74-15.21-17.54-21.51a109.19,109.19,0,0,0-16.65-12.23,37.79,37.79,0,0,0-10.42-5,40.77,40.77,0,0,0-6.69-.91l-7.59-.62a6.21,6.21,0,0,0-2,.06c-2.06.52-3,3.08-2.56,5.15s2,3.75,3.38,5.32c.34,15.49-6.55,30.77-7.48,46.24-1.63,27,14.88,52.21,16.2,79.28a8.55,8.55,0,0,1-.38,3.63c-.22.56-.55,1.07-.8,1.62-.78,1.7-.75,3.63-.89,5.5a27.94,27.94,0,0,1-8.23,17.62,12.23,12.23,0,0,0,4.64,3.54c3.19,1.39,7,1.51,10.39,2.48,8.84,2.58,17.9,5.18,27.09,4.63a23.9,23.9,0,0,0,2.09-7.87c1.3-.81,2.8.92,3,2.44s-.09,3.29,1,4.39,2.47.93,3.8.76c5.61-.71,11-2.6,16.5-3.87s11.38-1.88,16.73-.06c1.08-1.37.62-3.4-.26-4.9s-2.13-2.82-2.63-4.49a10.08,10.08,0,0,1-.32-2.95c0-8.55,1.76-17.19.09-25.58-.49-2.46-1.27-4.86-1.77-7.33-1-4.79-.85-9.73-.72-14.62s-.46-10.18-.56-15.14a48.29,48.29,0,0,0-.4-6.13c-.34-2.13-1-4.21-1.18-6.36-.54-5.46,1.66-10.88,1.33-16.36C262.51,405.33,252.84,400.81,249.6,393.14Z" transform="translate(-113 -47.49)" fill="#ff6584"/>
						<path d="M183.63,389.22c-7.08,18.78-10.54,38.7-14,58.48l-8,46.46c-2.27,13.13-4.55,26.34-4.46,39.66,0,3.74.24,7.55-.74,11.16-1.28,4.74-4.46,8.69-6.87,13a42.78,42.78,0,0,0-4.6,28.93c.82,4.15,3.06,8.86,7.27,9.34,3.46.38,6.45-2.37,8.47-5.21,4.64-6.51,6.94-14.37,9-22.11a500.11,500.11,0,0,0,13.87-77.09,75.06,75.06,0,0,1,1.39-9.8,69.54,69.54,0,0,1,3.38-9.76q4.59-11.38,9.19-22.76c7.07-17.53,14.18-35.14,23.89-51.36-9.6-2.76-19.59-6-29.19-8.73C189.46,388.61,186.49,389.1,183.63,389.22Z" transform="translate(-113 -47.49)" fill="#fbbebe"/>
						<path d="M200.27,403.46c-6.72-1.45-13.67-1-20.53-1.17a4.43,4.43,0,0,1-2.76-.72c-1.39-1.19-.8-3.42-.1-5.11l3.32-8a11.64,11.64,0,0,1,2.66-4.42c1.69-1.5,4.07-1.87,6.31-2.14,7.29-.84,14.79-1.12,21.86.85s13.72,6.45,16.88,13.08c1.32,2.76,1.93,6.24.18,8.75-2.6,3.73-8.43,7.9-12.78,5.86C210.1,408,206.11,404.73,200.27,403.46Z" transform="translate(-113 -47.49)" fill="#ff6584"/>
						<path d="M236,268.79a29.52,29.52,0,0,0-16.28,4.69,35.75,35.75,0,0,0-35.1-8.22A20.43,20.43,0,1,0,161,288.91,35.75,35.75,0,1,0,229.57,309a32,32,0,0,0,6.41.65c14.1,0,25.54-9.15,25.54-20.43S250.08,268.79,236,268.79Z" transform="translate(-113 -47.49)" fill="#3f3d56"/>
						<path d="M241.09,299.43a31.1,31.1,0,0,1-6.41-.65A35.57,35.57,0,0,1,230,309.07a32.11,32.11,0,0,0,6,.58c13.18,0,24-8,25.39-18.24C256.7,296.29,249.35,299.43,241.09,299.43Z" transform="translate(-113 -47.49)" opacity="0.1"/>
						<path d="M200.23,325a35.8,35.8,0,0,1-34.18-46.28,20.43,20.43,0,0,1-16.89-20.12,20.09,20.09,0,0,1,.33-3.66,20.43,20.43,0,0,0,11.46,34,35.75,35.75,0,0,0,68.29,21.18A35.68,35.68,0,0,1,200.23,325Z" transform="translate(-113 -47.49)" opacity="0.1"/>
					</svg>
				</div>
		);

		if ((this.state.table.body && !this.state.table.body.length) || !this.state.table.body) {
			display = emptyTableIllustration
		} else {
			display = this.state.selected.display === 'table' ? table : chart;
		}
		const statContent = (
			<div className={ statistic }>
				<div className="row">
					<h1 className="content__title">{ t('STATS_StatsH1') }</h1>
				</div>
				<div className="row">
					<div className="col-8 form--inline card card--transparent">
						<div className={ filters }>
							<div>{ t('STATS_Filter') }:</div>
							{ form }
						</div>
					</div>
					<div className="col-3 col-margin-1 card card--transparent">
						<div className={ displays }>
							<div>{ t('STATS_Display') }:</div>
							<Button
								btnType="button__grey"
								typeBtn="button"
								isActive={ this.state.selected.display === 'table' ? 'is__selected' : null }
								clicked={ (event) => this.displayModeHandler(event, 'table') }>{ t('STATS_DisplayTable') }</Button>
							<Button 
								isActive={ this.state.selected.display === 'chart' ? 'is__selected' : null } 
								btnType="button__grey"
								typeBtn="button"
								clicked={ (event) => this.displayModeHandler(event, 'chart') }>{ t('STATS_DisplayChart') }</Button>
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

export default connect(mapStateToProps, mapDispatchToProps)(withTranslation()(ErrorHandler(Statistics, axios)));