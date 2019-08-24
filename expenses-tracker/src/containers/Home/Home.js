import React, { Component, Fragment } from 'react';
import { connect } from 'react-redux';
import axios from 'axios';
import moment from 'moment';
import { withTranslation } from 'react-i18next';
import { CSSTransition } from 'react-transition-group';

import ErrorHandler from '../../hoc/ErrorHandler/ErrorHandler';
import AddExpense from '../../components/AddExpenseForm/AddExpenseForm';
import Indicators from '../../components/Indicators/Indicators';
import Table from '../../components/UI/Table/Table';
import Input from '../../components/UI/Input/Input';
import Loader from '../../components/UI/Loader/Loader';

import * as actions from '../../store/actions';
import { updateObject, getDate } from '../../shared/utility';
import { renderButtonGroup } from '../../shared/functions';
import { hasDatesChanged } from '../../shared/procedure';

import './Home.module.scss';

class Home extends Component {
	state = {
		indicators: [
			{
				title: 'HOME_kpiIncomeTitle',
				value: 0.00,
				progression: '+5.2%',
				progressClass: 'is__positive',
				type: 'income',
			},
			{
				title: 'HOME_kpiExpenseTitle',
				value: 0.00,
				progression: '-5.2%',
				progressClass: 'is__negative',
				type: 'outcome',
			},		
		],
		table: {
			headings: [],
			body: null,
			footer: [], 
		},
		editControls: {
			category: {
				elementType: 'input',
				elementConfig: {
					type: 'text',
					placeholder: ''
				},
				value: '',
				touched: false
			},
			type: {
				elementType: 'select',
				elementConfig: {
					type: '',
					placeholder: '',
					options: [
						{
							value: 'initial',
							displayValue: 'Choisir un type'
						},
						{
							value: 'outcome',
							displayValue: 'Expense'
						},
						{
							value: 'income',
							displayValue: 'Income'
						}
					]
				},
				value: '',
				touched: false
			},
			date: {
				elementType: 'input',
				elementConfig: {
					type: 'date',
					placeholder: ''
				},
				value: '',
				touched: false
			},
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
		modal: {
			show: false,
			title: '',
			content: '',
			footer: '',
		},
		btnGroup: [
			{
				styles: 'onEdit',
				type: 'button--td',
				attr: {'data-type': 'save'},
				onClick: null,
				content: 'Save'
			}, {
				styles: 'onEdit',
				type: 'button--td',
				attr: {'data-type': 'cancel'},
				onClick: null,
				content: 'Cancel'
			}, {
				styles: 'notEdit',
				type: 'button--td',
				attr: {'data-type': 'edit'},
				onClick: null,
				content: 'Edit'
			}, {
				styles: 'notEdit',
				type: 'button--td',
				attr: {'data-type': 'delete'},
				onClick: null,
				content: 'Delete'
			},
		],
		hasEmptyTable: false,
	}

	componentDidMount() {
		if (this.props.isAuth) {		
			this.props.getUserDatas(this.props.userId, this.props.token);
		}
	}

	componentDidUpdate(prevProps) {
		if (this.props.canVerifyDatas !== prevProps.canVerifyDatas && this.props.canVerifyDatas) {
			this.verifyDates();
		}
		if (this.props.currentExpenses !== prevProps.currentExpenses) {
			this.switchDataMode(this.props.currentExpenses);
			this.calculateTotals(this.props.currentExpenses);
		}
	}

	verifyDates = () => {
		const { userId, token, currentKey } = this.props
		const formattedObj = hasDatesChanged({
			categories: this.props.categories,
			currentExpenses: this.props.currentExpenses,
			expenses: this.props.expenses,
			notif: this.props.notif,
		});

		if (formattedObj.formattedExp) {		
			this.props.onUpdateNotifs(userId, token, currentKey, formattedObj.formattedNotif);
			this.props.onUpdateExpenses(userId, token, currentKey, formattedObj.formattedExp, 'monthlyUpdate');
			this.props.onUpdateCurrentExpense(userId, token, currentKey, formattedObj.currentExp);
			this.props.onUpdateCategories(userId, token, currentKey, formattedObj.formattedCat);
		}

		this.props.verifyDatesHandler(false);
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

	inputChangedHandler = (event, name, currentIndex) => {
		const { t } = this.props; 
		const { target } = event;
		const rowId = target.closest('tr').id
		const editedArray = [...this.state.table.body[rowId]];
		const updatedArray = [...this.state.table.body];
		const { value: currentVal } = target;
		const editForm = [
			{
				id: name,
				config: {
					...this.state.editControls[name],
					value: currentVal
				}
			}
		];
		
		let editedRow = editForm.map((editElement) => {
			const { 
				elementType, 
				elementConfig, 
				touched, 
			} = editElement.config;

			return (
				<Input 
					key={ editElement.id } 
					inputId={ editElement.id } 
					elementType={ elementType }
					elementConfig={ elementConfig }
					value={ currentVal } 
					touched={ touched }
					changed={ (event) => this.inputChangedHandler(event, editElement.id, currentIndex) } />
			);
		});

		editedArray.splice(+currentIndex, 1, editedRow[0]);
		updatedArray.splice(+rowId, 1, editedArray);

		this.setState({
			table: {
				headings: [...t('HOME_tHeading', { returnObjects: true })],
				body: updatedArray
		 	}
		});
		this.updateControls(name, currentVal, false)
	}

	switchEditMode = (rowId) => {
		const { t } = this.props;
		const clickedProps = {
			Save: this.saveTableRow,
			Cancel: this.cancelEditRow,
			Edit: this.editTableRow,
			Delete: this.deleteTableRow,
		}
		const editedArray = [...this.state.table.body];
		const toEditRow = [...this.state.table.body[+rowId]];
		const updatedControls = this.state.editControls;
		const btnsGroup = renderButtonGroup(clickedProps, this.state.btnGroup, true);
		let editForm = [];

		Object.keys(this.state.editControls).forEach((key, index) => {
			editForm.push({
				id: key,
				config: {
					...this.state.editControls[key],
					value: toEditRow[index],
				}
			});
			updatedControls[key] = {
				...this.state.editControls[key],
				value: toEditRow[index],
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
				<Input 
					key={ editElement.id } 
					inputId={ editElement.id } 
					elementType={ elementType }
					elementConfig={ elementConfig }
					value={ value } 
					touched={ touched }
					changed={ (event) => this.inputChangedHandler(event, editElement.id, index) } />
			);
		});

		editedRow.push(btnsGroup);
		editedArray.splice(+rowId, 1, editedRow);

		this.setState({
			table: {
				headings: [...t('HOME_tHeading', { returnObjects: true })],
				body: editedArray
			},
			editControls: updatedControls,
		});
	}

	switchDataMode = (data) => {
		const { t } = this.props; 
		let tBody = [];

		if (data) {
			const clickedProps = {
				Save: this.saveTableRow,
				Cancel: this.cancelEditRow,
				Edit: this.editTableRow,
				Delete: this.deleteTableRow,
			}
			const btnsGroup = renderButtonGroup(clickedProps, this.state.btnGroup, false);

			const arr = Object.keys(data).map(expense => {
				return Object.keys(data[expense]).map(current => data[expense][current]);
			});

			if (arr[0][0].length && arr[0][0] !== ' ') {
				arr[0][0].forEach((key, index) => {
					tBody.push([
						key.category,
						key.type,
						key.date,
						key.value,
						btnsGroup
					]);
				});
				this.setState({
					table: {
						headings: [...t('HOME_tHeading', { returnObjects: true })],
						body: tBody
					},
					hasEmptyTable: false,
				});
			} else {
				this.setState({ hasEmptyTable: true })
			}
		}
	}

	saveTableRow = (event) => {
		event.preventDefault();
		const dates = getDate();
		const { target } = event;
		const rowId = target.closest('tr').id;
		const { userId, token, currentKey } = this.props;
		const { category, date, type, amount } = this.state.editControls;
		const newDatas = {
			category: category.value, 
			type: type.value, 
			date: date.value, 
			value: amount.value,
		};
		const updatedArray = [...this.props.currentExpenses[dates.currentYear][dates.currentMonth]];
		updatedArray.splice(rowId, 1, newDatas);
		const updatedExpenses = {
			[dates.currentYear]: {
				[dates.currentMonth]: updatedArray
			}
		};
		this.props.onUpdateCurrentExpense(userId, token, currentKey, updatedExpenses);
	}

	cancelEditRow = (event) => {
		this.switchDataMode(this.props.currentExpenses);
	}

	editTableRow = (event) => {
		const { target } = event;
		const rowId = target.closest('tr').id;
		this.switchEditMode(rowId);
	}

	deleteTableRow = (event) => {
		event.preventDefault();
		const dates = getDate();
		const { target } = event;
		const rowId = target.closest('tr').id;
		const { userId, token, currentKey } = this.props;
		let updatedArray = [...this.props.currentExpenses[dates.currentYear][dates.currentMonth]];
		updatedArray.splice(rowId, 1);

		if (!updatedArray.length) updatedArray = " "
		const updatesExpenses = {
			[dates.currentYear]: {
				[dates.currentMonth]: updatedArray
			}
		};
		this.props.onUpdateCurrentExpense(userId, token, currentKey, updatesExpenses);
	}

	calculateTotals = (currentExpenses) => {
		if (!currentExpenses) return
		const dates = getDate()
		const currentExp = currentExpenses[dates.currentYear][dates.currentMonth];
		const updatedTotal = {
			income: 0,
			outcome: 0,
		}
		if (Array.isArray(currentExp)) currentExp.forEach(exp => updatedTotal[exp.type] += +exp.value);
		this.updateIndicators(updatedTotal);
	}

	updateIndicators = (total) => {
		const currentIndicators = [...this.state.indicators];
		const lastMonth = moment().subtract(1, 'months').format('MMMM');
		const currentExpYear = Object.keys(this.props.currentExpenses)
		const lastMonthExpense = this.props.expenses[currentExpYear][lastMonth]

		const updatedIndicators = currentIndicators.map((indicator) => {
			const currentVal = parseFloat(total[indicator.type]).toFixed(2);
			const prevVal = parseFloat(lastMonthExpense ? lastMonthExpense[indicator.type] : 0).toFixed(2);
			const percentage = parseFloat(this.getVariation(prevVal, currentVal)).toFixed(2);
			const variation = Math.sign(percentage);

			indicator.value = currentVal;
			indicator.progression = `${percentage}%`;
			indicator.progressClass = this.getVariationClasse(indicator.type, variation);

			return indicator;
		});

		this.setState({ indicators: updatedIndicators });
	}

	getVariationClasse = (type, variation) => {
		const variationClasses = {
			'-1': 'is__negative',
			'1': 'is__positive',
			'0': 'is__stable',
		}

		return variationClasses[type === 'income' ? variation : -(variation)]
	}

	getVariation = (firstVal, secondVal) => {
		return (secondVal - firstVal) / firstVal * 100 || 0;
	}

	handleErrors = (error) => {

	}

	render() {
		const { t } = this.props;

		let dashboardContent = (
			<Fragment>
				<Loader />
			</Fragment>
		);

		const emptyTableIllustration = (
			<CSSTransition
				in={ true }
        timeout={ 250 }
				classNames={{
					appear: 'imgAppear',
					appearActive: 'imgAppearActive',
          enter: 'imgEnter',
          enterActive: 'imgEnterActive',
          exit: 'imgExit',
          exitActive: 'imgExitActive'
        }} 
        mountOnEnter
        unmountOnExit
        appear>			
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
			</CSSTransition>
		);

		if (!this.props.isAuth) {
			dashboardContent = (
				<Fragment>
					<h1>{ t('Welcome') }</h1>
					<CSSTransition
							in={ true }
			        timeout={ 250 }
							classNames={{
								appear: 'imgAppear',
								appearActive: 'imgAppearActive',
		            enter: 'imgEnter',
		            enterActive: 'imgEnterActive',
		            exit: 'imgExit',
		            exitActive: 'imgExitActive'
			        }} 
			        mountOnEnter
			        unmountOnExit
			        appear>
						<svg 
							xmlns="http://www.w3.org/2000/svg"
							id="cb7db7bb-371f-430c-ab8e-9f8547f8cfe6" 
							data-name="Layer 1" 
							width="45%"
							viewBox="0 0 1130 868.1">
							<defs>
								<linearGradient 
									id="be60935f-ac8f-4117-88a8-c3e19524f342" 
									x1="340.5" 
									y1="874.69" 
									x2="340.5" 
									y2="452.37" 
									gradientUnits="userSpaceOnUse">
									<stop offset="0" 
										stopColor="gray" 
										stopOpacity="0.25"/>
									<stop offset="0.54" 
										stopColor="gray" 
										stopOpacity="0.12"/>
									<stop offset="1" 
										stopColor="gray" 
										stopOpacity="0.1"/>
								</linearGradient>
							</defs>
							<title>Dashboard App</title>
							<path d="M1143.14,213.61a231.21,231.21,0,0,0-44.83-60.38l-621.86-5.18,512-60.79A337.39,337.39,0,0,0,884.57,69.84C835.28,36.19,771.93,16,702.83,16c-62,0-119.33,16.29-166.07,43.93-39.72-17.3-85-27.11-133.11-27.11-138.17,0-253.3,80.9-279.13,188.19Z" transform="translate(-35 -15.95)" fill="#0042d1" opacity="0.1"/>
							<path d="M1165,303.59a197,197,0,0,0-19.38-84.92L67.86,314.31a209.54,209.54,0,0,0-25.25,53.91l333.75,42.06L35,440.94C45.27,562.4,168.43,658.3,318.88,658.3c75.73,0,144.54-24.3,195.53-63.93,51.15,40.38,120.62,65.21,197.17,65.21,113.57,0,211.6-54.67,257.25-133.71,91.58-24.58,162.72-86.28,187.07-163.47L733.83,307.06H1165C1165,305.9,1165,304.75,1165,303.59Z" transform="translate(-35 -15.95)" fill="#0042d1" opacity="0.1"/>
							<ellipse cx="499.98" cy="855.15" rx="289.98" ry="12.94" fill="#0042d1" opacity="0.1"/>
							<path d="M707.09,848.34v7.82H475.84v-6.35a76,76,0,0,0,5.23-140.37H705.52a76,76,0,0,0,1.57,138.9Z" transform="translate(-35 -15.95)" fill="#c8cad7"/>
							<path d="M705.52,709.44a76.11,76.11,0,0,0-42,50.39H523.08a76.13,76.13,0,0,0-42-50.39Z" transform="translate(-35 -15.95)" opacity="0.1"/>
							<path d="M211,669.6v43.9c0,24.24,17.74,43.89,39.63,43.89H931.05c21.89,0,39.63-19.65,39.63-43.89V669.6Z" transform="translate(-35 -15.95)" fill="#c8cad7"/>
							<path d="M707.09,848.34v7.82H475.84v-6.35a76,76,0,0,0,17.83-9.5H692.91A76.39,76.39,0,0,0,707.09,848.34Z" transform="translate(-35 -15.95)" opacity="0.1"/>
							<rect x="364.42" y="826.8" width="384.09" height="23.17" rx="9.5" ry="9.5" fill="#c8cad7"/>
							<path d="M970.68,188.57A39.62,39.62,0,0,0,931.05,149H250.66A39.62,39.62,0,0,0,211,188.57V678.14H970.68Z" transform="translate(-35 -15.95)" fill="#474157"/>
							<path d="M950,206.25V626.92a19.5,19.5,0,0,1-19.51,19.51H251.27a19.5,19.5,0,0,1-19.51-19.51V206.25a19.51,19.51,0,0,1,19.51-19.51H930.44A19.51,19.51,0,0,1,950,206.25Z" transform="translate(-35 -15.95)" fill="#4c4c78"/>
							<circle cx="555.85" cy="151.89" r="9.15" fill="#fff"/>
							<circle cx="555.85" cy="699.38" r="22.56" fill="#fff"/>
							<path d="M383.53,196.5V646.43H251.27a19.5,19.5,0,0,1-19.51-19.51V206.25l.71-2.65,1.9-7.1Z" transform="translate(-35 -15.95)" fill="#fff"/>
							<polygon points="365.5 187.65 365.5 228.15 196.76 228.15 196.76 190.3 197.47 187.65 365.5 187.65" fill="#4c4c78"/>
							<path d="M950,206.25H231.76a19.5,19.5,0,0,1,19.51-19.5H930.44A19.5,19.5,0,0,1,950,206.25Z" transform="translate(-35 -15.95)" fill="#c8cad7"/>
							<circle cx="216.27" cy="180.55" r="4.88" fill="#ededf4"/>
							<circle cx="230.9" cy="180.55" r="4.88" fill="#ededf4"/>
							<circle cx="245.53" cy="180.55" r="4.88" fill="#ededf4"/>
							<rect x="221.98" y="205.48" width="101.33" height="9.33" fill="#0042d1"/>
							<rect x="221.98" y="250.98" width="101.33" height="9.33" fill="#0042d1" opacity="0.5"/>
							<rect x="221.98" y="283.15" width="101.33" height="9.33" fill="#0042d1" opacity="0.5"/>
							<rect x="221.98" y="315.32" width="101.33" height="9.33" fill="#0042d1" opacity="0.5"/>
							<rect x="221.98" y="347.48" width="101.33" height="9.33" fill="#0042d1" opacity="0.5"/>
							<rect x="221.98" y="379.65" width="101.33" height="9.33" fill="#0042d1" opacity="0.5"/>
							<rect x="221.98" y="411.82" width="101.33" height="9.33" fill="#0042d1" opacity="0.5"/>
							<rect x="221.98" y="443.98" width="101.33" height="9.33" fill="#0042d1" opacity="0.5"/>
							<rect x="431.49" y="239.79" width="449.01" height="1.5" fill="#dce0ed" opacity="0.5"/>
							<rect x="431.49" y="274.62" width="449.01" height="1.5" fill="#dce0ed" opacity="0.5"/>
							<rect x="431.49" y="309.46" width="449.01" height="1.5" fill="#dce0ed" opacity="0.5"/>
							<rect x="431.49" y="344.29" width="449.01" height="1.5" fill="#dce0ed" opacity="0.5"/>
							<rect x="431.49" y="379.12" width="449.01" height="1.5" fill="#dce0ed" opacity="0.5"/>
							<polygon points="880.51 380.61 430.94 380.61 430.94 312.11 472.17 332.43 514.84 338.21 552.28 326.92 597.45 291.89 620.17 278.77 636.78 275.57 652.67 276.42 678.81 289.33 714.33 311.96 742.21 315.55 764.32 307.93 811.17 269.55 835.09 261.02 860.12 264.89 880.51 276.66 880.51 380.61" fill="#0042d1" opacity="0.5"/>
							<path d="M544.3,354.18c-40.48,0-77.9-24.76-78.36-25.08l1.11-1.66c.58.39,58.16,38.49,107.09,19.4C592,339.89,604.68,329.06,617,318.6c12.83-10.93,24.95-21.26,41.46-25.74,19-5.13,39.65-.48,55.38,12.44,13.44,11.05,40.22,28.8,68.51,23.49,14.42-2.7,26.58-13.24,39.45-24.39C846.44,283,872,260.91,916.09,292.63l-1.17,1.62c-42.85-30.79-67.76-9.21-91.84,11.66-13.08,11.34-25.44,22-40.39,24.85-29.1,5.45-56.44-12.64-70.15-23.91-15.23-12.52-35.26-17-53.58-12.05-16.09,4.36-28,14.54-40.69,25.32-12.41,10.57-25.25,21.51-43.4,28.59A83.88,83.88,0,0,1,544.3,354.18Z" transform="translate(-35 -15.95)" fill="#0042d1"/>
							<circle cx="647.55" cy="275.37" r="11.13" fill="#0042d1"/>
							<path d="M403.62,533.19c-15.21-8.76-21-10.93-21-10.94l-.31-.22a12.66,12.66,0,0,1-3.84-4.85c0-.35,0-.7,0-1v.1c.25-4.64,3.54-8.85,6.67-12.53q4-4.71,8-9.41A9.19,9.19,0,0,0,395.2,491a7.49,7.49,0,0,0,.22-2c0-.28,0-.55,0-.82,0-2.34-.11-4.68-.19-7-.08-2.05-.6-4.62-2.65-5-1.06-.22-2.46.16-3-.75a1.68,1.68,0,0,1-.14-1.21s0,.06,0,.09a.52.52,0,0,1,0-.11,27.65,27.65,0,0,0,.76-4.81,6.9,6.9,0,0,0-.33-2.43c-1.19-3.39-5.26-4.78-8.86-5.42s-7.64-1.19-9.9-4a32.74,32.74,0,0,0-2-2.71,7.88,7.88,0,0,0-3.69-1.82,20.72,20.72,0,0,0-13.38,1.17c-1.74.78-3.49,1.82-5.4,1.71s-3.68-1.5-5.64-1.83c-3.16-.54-6.19,1.79-7.75,4.54a11,11,0,0,0-1.43,5.35c0,.1,0,.21,0,.31h0a7.86,7.86,0,0,0,2.06,5.46c1.36,1.42,3.39,2.39,4,4.25.23.76.18,1.58.38,2.34,0,.1.06.19.09.29l-.11.13a23.77,23.77,0,0,0-5,14.62,24.26,24.26,0,0,0,17,23c0,.23,0,.47,0,.72a10.34,10.34,0,0,1-3.3,8.05l-21.58,8.66s-13-1.54-17.68,17.45a32.16,32.16,0,0,0-.8,9.63c.17,2.87-.23,7.91-3.56,14.43-5.33,10.44-4.12,34.39,6.78,36.76,10.29,2.24,14.32,1.31,14.74,1.2l0,.42c-.17,4.5-1.8,43.26-7.73,48-1.65,1.29-1.34,2.17,0,2.76,0,0,0,.25,0,.7-.18,2.84-1.1,13.63-5.07,19.78C307.48,690,308,731,308,731l-3.14,24.19s1.93,14.94,0,17.55c-1.73,2.33-4,57.61-4.52,69.59h-.2a5.83,5.83,0,0,0-4.66,2.84C292.9,849.31,284,856.94,284,856.94c-1.93,2.75-9.09,5.38-12.87,6.62a8.25,8.25,0,0,0-1.46.63,7.68,7.68,0,0,0-3.25,3.42,3.66,3.66,0,0,0-.34,2.85c1,2.37,21.07,4,26.15,1.66,4-1.86,19.84-4.32,26.42-5.28a5.42,5.42,0,0,0,4.7-4.7,3.1,3.1,0,0,0-.6-2.35h0c-1.26-1.56-1.91-5.82-2.2-8.6a5.85,5.85,0,0,0,1.48-.88,63.09,63.09,0,0,1,3.63-25.38c4.84-12.8,6.3-36.52,5.09-51.94,0,0,14.77-63.57,26.4-69.5h0c.18.22,5.82,7.46,6.54,29.88.72,22.77,8.95,37.71,8.95,37.71s-3.63,38.66,0,53.13L367.87,847a7.39,7.39,0,0,1-.57-.52s.14.64.34,1.65l-.1.48.2.05c.54,2.85,1.34,7.82,1,10.74-.19,1.67-.65,3.94-1,6.18-.5,3.51-.64,6.92,1.21,7.66,3,1.22,20.83,2.89,23.86-1a5.61,5.61,0,0,0,.88-5.86,6,6,0,0,0-.88-1.49s-4.73-7.73-3.39-13.18a4,4,0,0,0-.57-3.12A161.08,161.08,0,0,1,393,823c3-11.41,9.42-36.43,4.72-52.89h0c-.18-.64-.38-1.28-.6-1.9a71,71,0,0,1-2.67-27.75,56.41,56.41,0,0,1,0-24.19C397.33,703,399.36,690,399.36,690s1.6-17.55.2-28.31l-.09-.69.76-.17s-4.11-18.26-5.57-29.88c-.34-2.75-.79-6.22-1.28-9.93a26.22,26.22,0,0,0,3.95-1c13.08-4.51,17.19-45.31,17.19-45.31V561.77S418.88,542,403.62,533.19Zm-97.43,315-.64-.34h0Z" transform="translate(-35 -15.95)" fill="url(#be60935f-ac8f-4117-88a8-c3e19524f342)"/>
							<path d="M395.73,768.6c5.67,16.31-1,42.78-4,54.6a165.7,165.7,0,0,0-4,26,55,55,0,0,1-20.8-.48l5-24.34c-3.54-14.42,0-52.95,0-52.95s-8-14.9-8.74-37.59c-.7-22.33-6.2-29.55-6.38-29.78h0C345.38,710,331,773.33,331,773.33c1.18,15.36-.24,39-5,51.77a64.05,64.05,0,0,0-3.55,25.29c-1.65,1.39-3.95,1.63-6.43,1.23-6.75-1.09-14.84-6.91-14.84-6.91s2.6-69,4.49-71.62,0-17.49,0-17.49l3.07-24.11s-.47-40.89,4-48c3.88-6.13,4.77-16.89,4.95-19.71,0-.45,0-.7,0-.7l6.84-8.19s66.19-5,71.15,0c1.22,1.22,2,4,2.42,7.48,1.36,10.72-.2,28.21-.2,28.21s-2,13-4.82,26.23a57.4,57.4,0,0,0,0,24.11A72,72,0,0,0,395.73,768.6Z" transform="translate(-35 -15.95)" fill="#65617d"/>
							<path d="M391.59,872.25c-2.95,3.9-20.32,2.25-23.28,1-1.81-.75-1.67-4.14-1.18-7.64.31-2.23.76-4.5.94-6.15.48-4.26-1.41-12.89-1.41-12.89s3.9,4.14,4.84,0a4.5,4.5,0,0,1,3.37-3.2,8.84,8.84,0,0,1,6.14.38c3.07,1.33,8.19,4.17,7.27,8-1.3,5.43,3.31,13.13,3.31,13.13a5.93,5.93,0,0,1,.86,1.49A5.67,5.67,0,0,1,391.59,872.25Z" transform="translate(-35 -15.95)" fill="#a27772"/>
							<path d="M391.59,872.25c-2.95,3.9-20.32,2.25-23.28,1-1.81-.75-1.67-4.14-1.18-7.64,1.86.87,5,1.6,10.32,1.11a28.9,28.9,0,0,1,3.72-.12,85.06,85.06,0,0,0,11.28-.22A5.67,5.67,0,0,1,391.59,872.25Z" transform="translate(-35 -15.95)" opacity="0.1"/>
							<path d="M331,773.33c1.18,15.36-.24,39-5,51.77a64.05,64.05,0,0,0-3.55,25.29c-1.65,1.39-3.95,1.63-6.43,1.23,1.43-10,7.5-52.93,11.4-86.86,4.43-38.65,25.17-65.24,25.17-65.24l4.14,4.55C345.38,710,331,773.33,331,773.33Z" transform="translate(-35 -15.95)" opacity="0.1"/>
							<path d="M384.5,524.9l-2.89,14.18-14.13,23.76-17.43-7.45s-23.7-24.82-8.81-28.36a13.13,13.13,0,0,0,4.95-2.2c2.92-2.21,3.84-5.41,3.86-8.55a26.29,26.29,0,0,0-2.42-10.17l30.49-9.57a48.52,48.52,0,0,0-2.19,12.35c-.23,8.3,2.85,12.4,5.38,14.35A9.06,9.06,0,0,0,384.5,524.9Z" transform="translate(-35 -15.95)" fill="#fbbebe"/>
							<path d="M378.12,496.54a48.52,48.52,0,0,0-2.19,12.35,24.1,24.1,0,0,1-25.88,7.39,26.29,26.29,0,0,0-2.42-10.17Z" transform="translate(-35 -15.95)" opacity="0.1"/>
							<path d="M381.61,492.64a24.11,24.11,0,1,1-24.11-24.11A24.05,24.05,0,0,1,381.61,492.64Z" transform="translate(-35 -15.95)" fill="#fbbebe"/>
							<path d="M384.5,524.9l-2.89,14.18-14.13,23.76-17.43-7.45s-23.7-24.82-8.81-28.36a13.13,13.13,0,0,0,4.95-2.2c-2.69,7.39,8.41,22.76,8.41,22.76,1.29,1.9,4.26.71,4.26.71,7.14-1.08,20.31-21.64,22.45-25.06A9.06,9.06,0,0,0,384.5,524.9Z" transform="translate(-35 -15.95)" opacity="0.1"/>
							<path d="M398.15,662.39c-4.2,1-27.42,6.09-36.22,4.81-9.69-1.42-28.54-2.36-28.54-2.36s-12,.64-15.68-1c0-.45,0-.7,0-.7l6.84-8.19s66.19-5,71.15,0C397,656.13,397.7,658.9,398.15,662.39Z" transform="translate(-35 -15.95)" opacity="0.1"/>
							<path d="M354.6,548.3s-12.47-17.27-7.77-24l-21.07,8.64s-12.68-1.54-17.25,17.38a33,33,0,0,0-.79,9.61c.17,2.85-.22,7.87-3.47,14.37-5.2,10.4-4,34.28,6.62,36.64s14.42,1.18,14.42,1.18-1.42,43.26-7.56,48.22,15.67,3.78,15.67,3.78,18.84,1,28.53,2.37,36.87-5,36.87-5-4-18.2-5.44-29.78-4.72-36.24-4.72-36.24l24.11-32.66s4.25-19.74-10.64-28.48-20.5-10.9-20.5-10.9-15,24.37-22.76,25.55C358.85,549,355.89,550.2,354.6,548.3Z" transform="translate(-35 -15.95)" fill="#ff748e"/>
							<path d="M326.94,555.16s-.23,7.8,1.19,10.87,6.61,20.09,6.61,20.09H322.93s6.38-6.85,5.91-10.16S326.94,555.16,326.94,555.16Z" transform="translate(-35 -15.95)" opacity="0.1"/>
							<path d="M361.93,614s-26.1-6.38-28.53-11.81-9.14-17.61-9.14-17.61l2.75-3.71,12.7,10s15.13,12,22.22,13.24S361.93,614,361.93,614Z" transform="translate(-35 -15.95)" fill="#fbbebe"/>
							<path d="M361.93,614s-26.1-6.38-28.53-11.81-9.14-17.61-9.14-17.61l2.75-3.71,12.7,10s15.13,12,22.22,13.24S361.93,614,361.93,614Z" transform="translate(-35 -15.95)" opacity="0.05"/>
							<path d="M384.5,583.29v14.16h-2.28a66.24,66.24,0,0,0-32.14,8.32l-4.26,2.36-1.15.64-7.33-16.5,6.86-6.15.35,0c1.68.16,8.93.76,12-.27s6.55-4.14,15.14-1.94c4.24,1.08,7.85,5.83,12,4.35Z" transform="translate(-35 -15.95)" fill="#fbbebe"/>
							<path d="M407.31,557.52l4.73,5.32v12.88s-4,40.66-16.78,45.15-35.55-2.6-35.55-2.6-5.89-15.6-3.14-16.55,24.34-6.64,24.34-6.64-.31-23.85,4.42-30.94c0,0-3.07-22.22,7.56-22.69S407.31,557.52,407.31,557.52Z" transform="translate(-35 -15.95)" opacity="0.1"/>
							<path d="M408,557.52l4.73,5.32v12.88s-4,40.66-16.79,45.15-35.54-2.6-35.54-2.6-5.89-15.6-3.14-16.55,24.33-6.64,24.33-6.64-.3-23.85,4.43-30.94c0,0-3.08-22.22,7.56-22.69S408,557.52,408,557.52Z" transform="translate(-35 -15.95)" fill="#ff748e"/>
							<path d="M375,502.88a9.31,9.31,0,0,0-.54-4.6,3.53,3.53,0,0,0-3.74-2.16c-2,.47-2.9,3.1-4.88,3.73-1.67.53-3.5-.65-4.3-2.21a11.3,11.3,0,0,1-.82-5.14c0-2,0-3.95,0-5.93,0-2.15-.07-4.47-1.4-6.16-1.65-2.1-5.52-3-8.1-2.93a6.87,6.87,0,0,0-4.63,1.86,6,6,0,0,1-4.87,1.74,4.21,4.21,0,0,1-3.39-2.94.24.24,0,0,1,0-.08,24.11,24.11,0,1,1,35.86,32A66.79,66.79,0,0,0,375,502.88Z" transform="translate(-35 -15.95)" opacity="0.1"/>
							<path d="M341.71,480.37a4.24,4.24,0,0,1-3.4-2.94c-.19-.76-.14-1.58-.37-2.33-.55-1.86-2.53-2.83-3.86-4.24-2.66-2.82-2.49-7.47-.61-10.87,1.53-2.74,4.48-5.05,7.57-4.52,1.91.34,3.56,1.7,5.5,1.82s3.57-.92,5.27-1.7a19.84,19.84,0,0,1,13.06-1.16,7.56,7.56,0,0,1,3.6,1.81,30.59,30.59,0,0,1,1.92,2.7c2.2,2.81,6.15,3.36,9.66,4s7.49,2,8.64,5.41c.77,2.24,0,4.67-.41,7a2,2,0,0,0,.09,1.45c.55.91,1.92.53,3,.74,2,.42,2.5,3,2.57,5q.14,3.48.19,7a9,9,0,0,1-.2,2.59,9.17,9.17,0,0,1-2,3.25l-7.81,9.38c-3.46,4.16-7.13,9-6.44,14.37-1.64.73-3.58-.68-4.12-2.4s-.11-3.56.26-5.32a65.36,65.36,0,0,0,1.23-9.23,9.34,9.34,0,0,0-.54-4.61,3.54,3.54,0,0,0-3.75-2.16c-2,.47-2.89,3.1-4.87,3.73-1.67.54-3.5-.65-4.3-2.21a11.43,11.43,0,0,1-.82-5.14v-5.93c0-2.15-.07-4.47-1.4-6.16-1.64-2.1-5.52-3-8.1-2.93a6.87,6.87,0,0,0-4.63,1.86A6,6,0,0,1,341.71,480.37Z" transform="translate(-35 -15.95)" fill="#7c5c5c"/>
							<path d="M347.15,554.57l7.41,30.4S360.39,584.94,347.15,554.57Z" transform="translate(-35 -15.95)" opacity="0.1"/>
							<path d="M372.45,549.48s-9.7,15.88-5.91,32.29l1.8.13S365.12,574.3,372.45,549.48Z" transform="translate(-35 -15.95)" opacity="0.1"/>
							<path d="M378.59,639.31s11.9-3.94,12.77,5.2C391.36,644.51,389.11,638.24,378.59,639.31Z" transform="translate(-35 -15.95)" opacity="0.1"/>
							<path d="M344.2,586.83s-2.36,16.55,1.89,23.17a51.94,51.94,0,0,1-20.8,2.83l-1.42-26Z" transform="translate(-35 -15.95)" opacity="0.1"/>
							<path d="M345.82,608.13l-1.15.64-7.33-16.5,6.86-6.15h.35v0C344.44,586.92,342.53,601.13,345.82,608.13Z" transform="translate(-35 -15.95)" opacity="0.1"/>
							<path d="M344.2,586.12s-2.36,16.55,1.89,23.17a51.94,51.94,0,0,1-20.8,2.83l-8.27-26Z" transform="translate(-35 -15.95)" fill="#ff748e"/>
							<path d="M323.75,862.19a5.34,5.34,0,0,1-4.59,4.68c-6.41,1-21.88,3.4-25.78,5.26-5,2.37-24.58.71-25.53-1.65a3.75,3.75,0,0,1,.34-2.85,7.79,7.79,0,0,1,4.59-4c3.7-1.24,10.68-3.85,12.56-6.59,0,0,8.7-7.62,11.18-11.73a5.66,5.66,0,0,1,4.55-2.83c2.07-.1,4.37.95,5.32,5.48,0,0,11.34,6.47,14.41.8,0,0,.47,8.71,2.35,11.1h0A3.13,3.13,0,0,1,323.75,862.19Z" transform="translate(-35 -15.95)" fill="#a27772"/>
							<path d="M323.75,862.19a5.34,5.34,0,0,1-4.59,4.68c-6.41,1-21.88,3.4-25.78,5.26-5,2.37-24.58.71-25.53-1.65a3.75,3.75,0,0,1,.34-2.85,7.57,7.57,0,0,1,3.17-3.4c3.2,2.12,10.3,4.2,25.92,1.76,14.9-2.33,22.27-4.61,25.87-6.16h0A3.13,3.13,0,0,1,323.75,862.19Z" transform="translate(-35 -15.95)" opacity="0.1"/>
							<g opacity="0.1">
								<path d="M388.25,475.67a.5.5,0,0,0,0-.12,21.55,21.55,0,0,0,.73-5.36,33.89,33.89,0,0,1-.73,4.3A2.62,2.62,0,0,0,388.25,475.67Z" transform="translate(-35 -15.95)"/>
								<path d="M374.46,497.79a7,7,0,0,1,.58,2.7,8.11,8.11,0,0,0-.58-3.76,3.55,3.55,0,0,0-3.75-2.17c-2,.47-2.89,3.11-4.87,3.74-1.67.53-3.5-.66-4.3-2.22a11.17,11.17,0,0,1-.82-5.14c0-2,0-3.95,0-5.92,0-2.15-.07-4.47-1.4-6.16-1.65-2.11-5.52-3-8.11-2.94a6.83,6.83,0,0,0-4.62,1.87,6,6,0,0,1-4.87,1.73,4.19,4.19,0,0,1-3.4-2.94c-.2-.76-.14-1.57-.37-2.33-.55-1.86-2.53-2.82-3.86-4.23a7.78,7.78,0,0,1-2-5,8.09,8.09,0,0,0,2,6.06c1.33,1.41,3.31,2.38,3.86,4.24.23.75.17,1.57.37,2.33a4.23,4.23,0,0,0,3.4,2.94,6,6,0,0,0,4.87-1.74A6.93,6.93,0,0,1,351.2,477c2.59-.08,6.46.84,8.11,2.94,1.33,1.69,1.39,4,1.4,6.16,0,2,0,3.95,0,5.92a11.19,11.19,0,0,0,.82,5.15c.8,1.56,2.63,2.74,4.3,2.21,2-.63,2.85-3.26,4.87-3.74A3.57,3.57,0,0,1,374.46,497.79Z" transform="translate(-35 -15.95)"/>
								<path d="M393.89,491.28a9.3,9.3,0,0,1-2,3.26q-3.92,4.68-7.81,9.37c-3.28,3.95-6.76,8.52-6.51,13.56.24-4.62,3.46-8.82,6.51-12.49l7.81-9.38a9.26,9.26,0,0,0,2-3.25,9,9,0,0,0,.2-2.6A6.48,6.48,0,0,1,393.89,491.28Z" transform="translate(-35 -15.95)"/>
								<path d="M373.51,515.89a5.58,5.58,0,0,1-.24-1.27,6.33,6.33,0,0,0,.24,2.33c.53,1.72,2.48,3.13,4.12,2.4,0-.35-.07-.7-.08-1C375.93,519,374,517.57,373.51,515.89Z" transform="translate(-35 -15.95)"/>
							</g>
							<path d="M295,847.42s2.47,4.34,11.43.51" transform="translate(-35 -15.95)" opacity="0.1"/>
							<path d="M370.65,848.46s7.73,9.09,17.46,3" transform="translate(-35 -15.95)" opacity="0.1"/>
							<path d="M393.13,740.94s-5.46,3.41-5.64,5.36,2.82-1.42,2.82-1.42Z" transform="translate(-35 -15.95)" opacity="0.1"/>
							<path d="M395.28,767.08a11.33,11.33,0,0,1-6.72,2.62c-4.08.18-3.74,5.5-1.07,3.9S395.28,767.08,395.28,767.08Z" transform="translate(-35 -15.95)" opacity="0.1"/>
							<path d="M396.32,770.49s-2.62,12.86-4.75,10.38" transform="translate(-35 -15.95)" opacity="0.1"/>
							<g opacity="0.5">
								<rect x="471.17" y="458.65" width="66" height="14" fill="#dce0ed"/>
								<rect x="622.72" y="458.65" width="66" height="14" fill="#dce0ed"/>
								<rect x="774.27" y="458.65" width="66" height="14" fill="#dce0ed"/>
							</g>
							<ellipse cx="952.73" cy="801.29" rx="26.93" ry="4.55" fill="#0042d1" opacity="0.1"/>
							<ellipse cx="115.22" cy="858.74" rx="26.93" ry="4.55" fill="#0042d1" opacity="0.1"/>
							<ellipse cx="893.79" cy="850.05" rx="40.21" ry="6.8" fill="#0042d1"/>
							<path d="M945.41,854.89a11.64,11.64,0,0,0,3.83-5.79c.5-2.3-.48-5.05-2.67-5.89-2.46-.94-5.09.76-7.09,2.49s-4.27,3.68-6.88,3.32a10.5,10.5,0,0,0,3.24-9.81,4.08,4.08,0,0,0-.9-2c-1.37-1.46-3.84-.84-5.48.31-5.2,3.66-6.65,10.72-6.68,17.08-.52-2.29-.08-4.68-.09-7s-.66-5-2.64-6.23a8,8,0,0,0-4-.94c-2.34-.09-4.95.14-6.54,1.85-2,2.13-1.47,5.69.25,8s4.36,3.8,6.77,5.42a15.13,15.13,0,0,1,4.84,4.61,4.81,4.81,0,0,1,.35.83h14.66A41.11,41.11,0,0,0,945.41,854.89Z" transform="translate(-35 -15.95)" fill="#0042d1"/>
							<path d="M151.45,807.19s5.5,7.19-2.53,18-14.65,20-12,26.77c0,0,12.12-20.15,22-20.43S162.3,819.31,151.45,807.19Z" transform="translate(-35 -15.95)" fill="#0042d1"/>
							<path d="M151.45,807.19a9,9,0,0,1,1.13,2.26c9.62,11.3,14.74,21.85,5.49,22.11-8.61.25-18.94,15.65-21.42,19.54a9.24,9.24,0,0,0,.29.89s12.12-20.15,22-20.43S162.3,819.31,151.45,807.19Z" transform="translate(-35 -15.95)" opacity="0.1"/>
							<path d="M161.66,816.35c0,2.53-.28,4.58-.63,4.58s-.63-2-.63-4.58.35-1.34.7-1.34S161.66,813.82,161.66,816.35Z" transform="translate(-35 -15.95)" fill="#ffd037"/>
							<path d="M165.17,819.37c-2.22,1.21-4.16,1.94-4.32,1.63s1.49-1.54,3.71-2.75,1.35-.33,1.51,0S167.39,818.16,165.17,819.37Z" transform="translate(-35 -15.95)" fill="#ffd037"/>
							<path d="M122.44,807.19s-5.5,7.19,2.53,18,14.65,20,12,26.77c0,0-12.11-20.15-22-20.43S111.59,819.31,122.44,807.19Z" transform="translate(-35 -15.95)" fill="#0042d1"/>
							<path d="M122.44,807.19a9,9,0,0,0-1.13,2.26c-9.62,11.3-14.74,21.85-5.49,22.11,8.61.25,18.94,15.65,21.42,19.54a7.16,7.16,0,0,1-.3.89s-12.11-20.15-22-20.43S111.59,819.31,122.44,807.19Z" transform="translate(-35 -15.95)" opacity="0.1"/>
							<path d="M112.22,816.35c0,2.53.29,4.58.64,4.58s.63-2,.63-4.58-.35-1.34-.7-1.34S112.22,813.82,112.22,816.35Z" transform="translate(-35 -15.95)" fill="#ffd037"/>
							<path d="M108.72,819.37c2.22,1.21,4.15,1.94,4.32,1.63s-1.49-1.54-3.71-2.75-1.35-.33-1.52,0S106.5,818.16,108.72,819.37Z" transform="translate(-35 -15.95)" fill="#ffd037"/>
							<path d="M114,851.05s15.36-.48,20-3.77,23.63-7.24,24.78-1.95,23.08,26.29,5.74,26.43-40.29-2.7-44.91-5.51S114,851.05,114,851.05Z" transform="translate(-35 -15.95)" fill="#a8a8a8"/>
							<path d="M164.79,869.92c-17.34.14-40.3-2.7-44.92-5.51-3.51-2.15-4.92-9.84-5.38-13.38l-.52,0s1,12.38,5.6,15.2,27.57,5.65,44.91,5.51c5,0,6.73-1.82,6.64-4.46C170.42,868.9,168.51,869.89,164.79,869.92Z" transform="translate(-35 -15.95)" opacity="0.2"/>
							<path d="M501.5,572.37c0-20.44,16.63-36.14,37.08-36.14h.29v-9.3h-.29c-25.58,0-46.38,19.87-46.38,45.44a46.26,46.26,0,0,0,15.89,34.9l6.59-6.59A37,37,0,0,1,501.5,572.37Z" transform="translate(-35 -15.95)" fill="#0042d1"/>
							<path d="M539.8,526.94v9.3a37.07,37.07,0,1,1-24.19,65.37L509,608.2a46.36,46.36,0,1,0,30.78-81.26Z" transform="translate(-35 -15.95)" fill="#0042d1" opacity="0.5"/>
							<path d="M843.8,535.76c20.44,0,36.14,16.63,36.14,37.08,0,.09,0,.19,0,.29h9.3c0-.1,0-.2,0-.29,0-25.57-19.87-46.38-45.44-46.38a46.24,46.24,0,0,0-34.9,15.89l6.59,6.59A37,37,0,0,1,843.8,535.76Z" transform="translate(-35 -15.95)" fill="#0042d1" opacity="0.5"/>
							<path d="M889.23,574.06h-9.3a37.07,37.07,0,1,1-65.37-24.19L808,543.28a46.36,46.36,0,1,0,81.26,30.78Z" transform="translate(-35 -15.95)" fill="#0042d1"/>
							<path d="M709,529.66l-1.85,9.26c13.61,5.49,22.31,18.83,22.31,34.38a37.07,37.07,0,1,1-51.93-33.95L673.41,531A46.36,46.36,0,1,0,738.8,573.3C738.8,553.23,726.92,536.11,709,529.66Z" transform="translate(-35 -15.95)" fill="#0042d1" opacity="0.5"/>
							<path d="M693.59,535.69a32.38,32.38,0,0,1,12.91,2.68l1.85-9.25a40.9,40.9,0,0,0-14.76-2.73,46.17,46.17,0,0,0-19,4.09l4.16,8.33A36.69,36.69,0,0,1,693.59,535.69Z" transform="translate(-35 -15.95)" fill="#0042d1"/>
						</svg>
					</CSSTransition>			
				</Fragment>
			)
		}

		if (this.props.isAuth && this.props.currentExpenses) {
			dashboardContent = (
				<Fragment>
					<div className="row">
						<div className="col-3">					
							<h1 className="content__title" style={{ textAlign: 'left' }}>{ t('HOME_HomeH1') }</h1>
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
						{ this.state.hasEmptyTable
							? (<div className="content__emptyTable">
									<h2>{ t('HOME_EmptyTable') }</h2>
									{ emptyTableIllustration }
								</div>)
							: (<Table
								headings={ this.state.table.headings } 
								rows={ this.state.table.body } />)
						}
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
		loading: state.payload.loading,
		isAuth: state.auth.token !== null,
		token: state.auth.token,
		userId: state.auth.userId,
		currentExpenses: state.payload.currentExpenses,
		currentKey: state.payload.currentKey,
		expenses: state.payload.expenses,
		categories: state.payload.categories,
		notif: state.payload.notif,
		canVerifyDatas: state.payload.canVerifyDatas,
		loadType: state.payload.loadType,
	}
}

const mapDispatchToProps = dispatch => {
	return {
		getUserDatas: (userId, token) => dispatch(actions.getUserData(userId, token)),
		onUpdateCurrentExpense: (userId, token, key, datas) => dispatch(actions.updateCurrentExpenses(userId, token, key, datas)),
		onUpdateExpenses: (userId, token, key, datas) => dispatch(actions.updateExpenses(userId, token, key, datas)),
		onUpdateCategories: (userId, token, key, datas) => dispatch(actions.updateCategories(userId, token, key, datas)),
		onUpdateNotifs: (userId, token, key, datas) =>  dispatch(actions.updateNotifications(userId, token, key, datas)),
		verifyDatesHandler: (verified) => dispatch(actions.isDatasVerified(verified)),
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(withTranslation()(ErrorHandler(Home, axios)));