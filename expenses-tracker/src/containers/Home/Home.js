import React, { Component, Fragment } from 'react';
import { connect } from 'react-redux';

import AddExpense from '../../components/AddExpenseForm/AddExpenseForm';
import Indicators from '../../components/Indicators/Indicators';
import Table from '../../components/UI/Table/Table';
import Button from '../../components/UI/Button/Button';
import Input from '../../components/UI/Input/Input';

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
			value: {
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
	}

	componentDidUpdate(prevProps) {
		if (this.props.currentExpenses !== prevProps.currentExpenses) {
			this.switchDataMode(this.props.currentExpenses);
		}
	}

	updateControls = (name, val, touch) => {
		const updatedControls = updateObject(this.state.editControls, {
			[name]: updateObject(this.state.editControls[name], {
				...this.state.editControls[name],
				value: val,
				touched: touch
			})
		});
		this.setState({ editControls: updatedControls });
	}

	updateTableBodyInputs = () => {

	}

	inputChangedHandler = (event, name) => {
		const { target } = event;
		this.updateControls(name, target.value);
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
		const currentControls = this.state.editControls;
		const btnsGroup = this.switchBtnsGroups(true);
		let editForm = []
		
		Object.keys(currentControls).forEach((key, index) => {
			editForm.push({
				id: key,
				config: {
					...this.state.editControls[key],
					value: toEditRow[index],
				}
			});
			this.updateControls(key, toEditRow[index]);
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
					elementType={ elementType }
					elementConfig={ elementConfig }
					value={ value } 
					touched={ touched }
					changed={ (event) => this.inputChangedHandler(event, editElement.id) } />
			);
		});

		editedRow.push(btnsGroup);
		editedArray.splice(+rowId, 1, editedRow);

		this.setState({
			table: {
				headings: this.state.table.headings,
				body: editedArray
			}
		});
	}

	switchDataMode = (data) => {
		let tBody = [];

		if (data) {
			const btnsGroup = this.switchBtnsGroups(false);

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

	saveTableRow = (event) => {
		event.preventDefault();
		const dates = getDate();
		const { target } = event;
		const rowId = target.closest('tr').id;
		const { userId, token, currentKey } = this.props;
		const { category, date, type, value } = this.state.editControls;
		const newArray = [category.value, type.value, date.value, value.value];
		const updatedArray = [...this.props.currentExpenses[dates.currentYear][dates.currentMonth]];
		updatedArray.splice(rowId, 1, newArray);
		const updatesExpenses = {
			[dates.currentYear]: {
				[dates.currentMonth]: updatedArray
			}
		};
		this.props.onUpdateExpense(userId, token, currentKey, updatesExpenses);
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
		this.props.onUpdateExpense(userId, token, currentKey, updatesExpenses);
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
		currentExpenses: state.user.currentExpenses,
		currentKey: state.user.currentKey
	}
}

const mapDispatchToProps = dispatch => {
	return {
		onUpdateExpense: (userId, token, key, datas) => dispatch(actions.updateExpense(userId, token, key, datas))
	}
}


export default connect(mapStateToProps, mapDispatchToProps)(Home);