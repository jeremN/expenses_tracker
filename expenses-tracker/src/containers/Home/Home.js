import React, { Component, Fragment } from 'react';
import { connect } from 'react-redux';

import AddExpense from '../../components/AddExpenseForm/AddExpenseForm';
import Indicators from '../../components/Indicators/Indicators';
import Table from '../../components/UI/Table/Table';
import Button from '../../components/UI/Button/Button';
import Input from '../../components/UI/Input/Input';
import Modal from '../../components/UI/Modal/Modal';

import * as actions from '../../store/actions';
import { updateObject, getDate } from '../../shared/utility';
import { hasDatesChanged } from '../../shared/procedure';

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
							displayValue: 'Dépense'
						},
						{
							value: 'income',
							displayValue: 'Revenu'
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
			show: true,
			title: 'Test modal',
			content: '',
			footer: '',
		},
	}

	componentDidMount() {
		if (this.props.isAuth) {		
			this.props.getUserDatas(this.props.userId, this.props.token);
			console.info(this.props.currentExpenses)
		}
	}

	componentDidUpdate(prevProps) {
		if (this.props.canVerifyDatas !== prevProps.canVerifyDatas && this.props.canVerifyDatas) {
			this.verifyDates();
		}
		if (this.props.currentExpenses !== prevProps.currentExpenses) {
			this.switchDataMode(this.props.currentExpenses);
		}
	}

	verifyDates = () => {
		const dates = getDate();
		const { userId, token, currentKey } = this.props
		const data = {
			categories: this.props.categories,
			currentExpenses: this.props.currentExpenses,
			expenses: this.props.expenses
		}
		const { 
			expenses: formattedExp, 
			categories: formattedCat 
		} = hasDatesChanged(data);	


		if (formattedExp) {		
			const currentExp = {
				[dates.currentYear]: {
					[dates.currentMonth]: ' '
				}
			};
			const updatedExp = this.hasExistingEntries(formattedExp)
			console.info(updatedExp, formattedExp, formattedCat)
			// this.props.onUpdateExpenses(userId, token, currentKey, formattedExp);
			// this.props.onUpdateCurrentExpense(userId, token, currentKey, currentExp);
			// this.props.onUpdateCategories(userId, token, currentKey, formattedCat);
		}
		this.props.verifyDatesHandler(false);
	}

	hasExistingEntries = (newProps) => {
		const currentProps = this.props.expenses;
		const props = newProps;
		let summedProps;
		
		if (Object.keys(currentProps).length) {
			summedProps = Object.keys(currentProps).forEach(year => {
				return Object.keys(currentProps[year]).forEach(month => {
					if (Object.keys(props).includes(year) && Object.keys(props[year]).includes(month)) {
						const { 
							income: newIncome, 
							diff: newDiff, 
							saved: newSaved, 
							outcome: newOutcome, 
							categories: newCat, 
						} = props[year][month];
						const { 
							income: oldIncome, 
							diff: oldDiff, 
							saved: oldSaved, 
							outcome: oldOutcome, 
							categories: oldCat, 
						} = currentProps[year][month];

						return {
							income: oldIncome + newIncome,
							outcome: oldOutcome + newOutcome,
							diff: oldDiff + newDiff,
							saved: oldSaved + newSaved,
							categories: this.sumCategories(oldCat, newCat),
						}
					}
				});
			});
		}
	}

	sumCategories = (oldCat, newCat) => {
		const mergedCat = [...oldCat, ...newCat];
		const updatedCat = mergeCat.
		console.info(mergedCat)
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
				headings: this.state.table.headings,
				body: updatedArray
		 	}
		});
		this.updateControls(name, currentVal, false)
	}

	switchBtnsGroups = (edit = false) => {
		return (
			<span>
				<Button
					cssStyle={{ display: edit ? 'flex' : 'none' }} 
					btnType="button--td"
					attributes={ {'data-type': 'save'} } 
					clicked={ this.saveTableRow }>Save</Button>
				<Button
					cssStyle={{ display: edit ? 'flex' : 'none' }} 
					btnType="button--td"
					attributes={ {'data-type': 'cancel'} } 
					clicked={ this.cancelEditRow }>Cancel</Button>
				<Button
					cssStyle={{ display: !edit ? 'flex' : 'none' }} 
					btnType="button--td"
					attributes={ {'data-type': 'edit'} } 
					clicked={ this.editTableRow }>Edit</Button>
				<Button
					cssStyle={{ display: !edit ? 'flex' : 'none' }} 
					btnType="button--td"
					attributes={ {'data-type': 'delete'} } 
					clicked={ this.deleteTableRow }>Delete</Button>
			</span>
		);
	}

	switchEditMode = (rowId) => {
		const editedArray = [...this.state.table.body];
		const toEditRow = [...this.state.table.body[+rowId]];
		const updatedControls = this.state.editControls;
		const btnsGroup = this.switchBtnsGroups(true);
		let editForm = []

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
				headings: this.state.table.headings,
				body: editedArray
			},
			editControls: updatedControls,
		});
	}

	switchDataMode = (data) => {
		let tBody = [];

		if (data) {
			const btnsGroup = this.switchBtnsGroups(false);

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
			}

			this.setState({
				table: {
					headings: this.state.table.headings,
					body: tBody
				}
			});
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
		const updatedArray = [...this.props.currentExpenses[dates.currentYear][dates.currentMonth]];
		updatedArray.splice(rowId, 1);
		const updatesExpenses = {
			[dates.currentYear]: {
				[dates.currentMonth]: updatedArray
			}
		};
		this.props.onUpdateCurrentExpense(userId, token, currentKey, updatesExpenses);
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
				<Modal show={ !this.state.modal.show } modalTitle={ this.state.modal.title } />
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
		canVerifyDatas: state.payload.canVerifyDatas,
	}
}

const mapDispatchToProps = dispatch => {
	return {
		getUserDatas: (userId, token) => dispatch(actions.getUserData(userId, token)),
		onUpdateCurrentExpense: (userId, token, key, datas) => dispatch(actions.updateCurrentExpenses(userId, token, key, datas)),
		onUpdateExpenses: (userId, token, key, datas) => dispatch(actions.updateExpenses(userId, token, key, datas)),
		onUpdateCategories: (userId, token, key, datas) => dispatch(actions.updateCategories(userId, token, key, datas)),
		verifyDatesHandler: (verified) => dispatch(actions.isDatasVerified(verified)),
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(Home);