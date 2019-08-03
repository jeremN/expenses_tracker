import React, { Component, Fragment } from 'react'
import { connect } from 'react-redux';

import Input from '../UI/Input/Input';
import Button from '../UI/Button/Button';

import * as actions from '../../store/actions';
import { addExpense } from './AddExpenseForm.module.scss';
import { updateObject, formCheckValidity, getDate } from '../../shared/utility';

class AddExpense extends Component {
	state = {
		controls: {
			category: {
				elementType: 'input',
				elementConfig: {
					type: 'text',
					placeholder: 'Categorie'
				},
				label: 'Categorie',
				value: '',
				labelSmall: 'requis',
				validation: {
					required: true,
				},
				valid: false,
				touched: false
			},
			date: {
				elementType: 'input',
				elementConfig: {
					type: 'date',
					placeholder: ''
				},
				label: 'Date',
				labelSmall: 'requis',
				value: '',
				validation: {
					required: true,
				},
				valid: false,
				touched: false
			},
			type: {
				elementType: 'select',
				elementConfig: {
					type: '',
					placeholder: 'Choisir un type',
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
				label: 'Type',
				value: '',
				labelSmall: 'requis',
				validation: {
					required: true,
				},
				valid: false,
				touched: false
			},
			values: {
				elementType: 'input',
				elementConfig: {
					type: 'number',
					placeholder: '',
					step: '0.01',
				},
				label: 'Montant',
				value: '',
				labelSmall: 'requis',
				validation: {
					required: true,
				},
				valid: false,
				touched: false
			},
		},
	}

	submitExpenseHandler = (event) => {
		event.preventDefault();
		let datas = {};
		const { category, date, type, values } = this.state.controls;
		const { userId, token, currentKey } = this.props;
		const actualDate = getDate()
		if (!this.props.currentExpenses) {
			datas = {
				[actualDate.currentYear]: {
					[actualDate.currentMonth]: []
				}
			};
		} else {
			datas = this.props.currentExpenses;
		}

		if (!Array.isArray(datas[actualDate.currentYear][actualDate.currentMonth])) {
			datas[actualDate.currentYear][actualDate.currentMonth] = []
		}

		datas[actualDate.currentYear][actualDate.currentMonth].push({
			type: type.value,
			category: category.value,
			value: values.value,
			date: date.value
		});

		this.props.onAddNewExpense(userId, token, currentKey, datas);
		const resetControlsValues = {} 
		Object.keys(this.state.controls).forEach(controlName => {
			resetControlsValues[controlName] = {
				...this.state.controls[controlName],
				value: '',
				valid: false,
				touched: false,
			}
		});

		this.setState({ controls: resetControlsValues });
	}

	inputChangedHandler = (event, controlName) => {
		const { target } = event;
		const updatedControls = updateObject(this.state.controls, {
			[controlName]: updateObject(this.state.controls[controlName], {
				...this.state.controls[controlName],
				value: target.value,
				valid: formCheckValidity(target.value, this.state.controls[controlName]),
				touched: true,
			})
		});
		this.setState({ controls: updatedControls });
	}

	render() {
		const formElementsArray = [];

		for (let key in this.state.controls) {
			formElementsArray.push({
				id: key,
				config: this.state.controls[key]
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
				labelSmall
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
					touched={ touched }
					changed={ (event) => this.inputChangedHandler(event, formElement.id) } />
			)
		});

		return (
			<Fragment>
				<h2 className="isLike__h4">Ajouter une dépense ou un revenu</h2>
				<form id="addExpense" className={ addExpense }>
					{ form }
					<Button 
						btnType="button__blue"
						typeBtn="submit"
						clicked={ this.submitExpenseHandler }>Ajouter</Button>
				</form>
			</Fragment>
		);
	}
}

const mapStateToProps = state => {
	return {
		loading: state.auth.loading,
		token: state.auth.token,
		userId: state.auth.userId,
		currentExpenses: state.payload.currentExpenses,
		currentKey: state.payload.currentKey
	}
}

const mapDispatchToProps = dispatch => {
	return {
		onAddNewExpense: (userId, token, key, data) => dispatch(actions.updateCurrentExpenses(userId, token, key, data))
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(AddExpense);