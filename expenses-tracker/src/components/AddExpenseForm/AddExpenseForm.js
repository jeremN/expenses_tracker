import React, { Component } from 'react'
import { connect } from 'react-redux';

import Input from '../UI/Input/Input';
import Button from '../UI/Button/Button';
import Card from '../UI/Card/Card';

import { addExpense } from './AddExpenseForm.module.scss';

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
					changed={ (event) => this.inputChangedHandler(event, formElement.id)} />
			)
		});

		return (
			<form id="addExpense" className={ addExpense }>
				{ form }
				<Button 
					btnType="button__blue"
					typeBtn="submit">Ajouter</Button>
			</form>
		);
	}
}

export default AddExpense;