import React, { Component, Fragment } from 'react'
import { connect } from 'react-redux';
import { withTranslation } from 'react-i18next';
import { CSSTransition } from 'react-transition-group';

import Input from '../UI/Input/Input';
import Button from '../UI/Button/Button';
import Autocomplete from '../Autocomplete/Autocomplete';

import * as actions from '../../store/actions';
import classes from './AddExpenseForm.module.scss';
import { updateObject, formCheckValidity, getDate } from '../../shared/utility';

class AddExpense extends Component {
	state = {
		controls: {
			category: {
				elementType: 'input',
				elementConfig: {
					type: 'text',
					placeholder: 'Category'
				},
				label: 'Category',
				value: '',
				labelSmall: 'Required',
				validation: {
					required: true,
				},
				valid: false,
				touched: false,
				withSuggest: true,
			},
			date: {
				elementType: 'input',
				elementConfig: {
					type: 'date',
					placeholder: ''
				},
				label: 'Date',
				labelSmall: 'Required',
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
					placeholder: 'ChooseType',
					options: [
						{
							value: 'initial',
							displayValue: 'ChooseType'
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
				label: 'Type',
				value: '',
				labelSmall: 'Required',
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
				label: 'Amount',
				value: '',
				labelSmall: 'Required',
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

	inputChangedHandler = (event, controlName, val) => {
		const { target } = event;
		const updatedControls = updateObject(this.state.controls, {
			[controlName]: updateObject(this.state.controls[controlName], {
				...this.state.controls[controlName],
				value: !val ? target.value : val,
				valid: formCheckValidity(target.value, this.state.controls[controlName]),
				touched: true,
			})
		});

		this.setState({ controls: updatedControls });
	}

	inputClickedHandler = (event, controlName) => {

	}

	render() {
		const { t } = this.props;
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
				labelSmall,
				withSuggest,
			} = formElement.config

			return (
				<Input
					key={ formElement.id }
					elementType={ elementType }
					elementConfig={ elementConfig }
					value={ value }
					labelValue={ t(label) }
					labelSmall={ t(labelSmall) }
					invalid={ !valid }
					shouldValidate={ validation }
					touched={ touched }
					changed={ (event) => this.inputChangedHandler(event, formElement.id) } >
					{ withSuggest 
						? (
								<Autocomplete 
									elId={ formElement.id }
									userInput={ value } 
									clicked={ this.inputChangedHandler } 
									suggest={ this.props.categories } />
							) 
						: '' 
					}
				</Input>
			)
		});

		return (
			<Fragment>
				<CSSTransition
					mountOnEnter
					in={ true }
					classNames={{
						appear: classes.titleAppear,
						appearActive: classes.titleAppearActive,
            enter: classes.titleEnter,
            enterActive: classes.titleEnterActive,
            exit: classes.titleExit,
            exitActive: classes.titleExitActive
	        }}					
	        timeout={ 250 }
					appear
					unmountOnExit>
					<h2 className="isLike__h4">{ t('HOME_HomeH2') }</h2>
				</CSSTransition>
				<CSSTransition
					mountOnEnter
					in={ true }
	        timeout={ 450 }
					classNames={{
						appear: classes.cardAppear,
						appearActive: classes.cardAppearActive,
            enter: classes.cardEnter,
            enterActive: classes.cardEnterActive,
            exit: classes.cardExit,
            exitActive: classes.cardExitActive
	        }}					
					appear
					unmountOnExit>
					<form id="addExpense" className={ classes.addExpense }>
						{ form }
						<Button 
							btnType="button__blue"
							typeBtn="submit"
							clicked={ this.submitExpenseHandler }>{ t('Add') }</Button>
					</form>
				</CSSTransition>
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
		currentKey: state.payload.currentKey, 
		categories: state.payload.categories,
	}
}

const mapDispatchToProps = dispatch => {
	return {
		onAddNewExpense: (userId, token, key, data) => dispatch(actions.updateCurrentExpenses(userId, token, key, data))
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(withTranslation()(AddExpense));