import React, { Component, Fragment } from 'react';
import { connect } from 'react-redux';

import Input from '../../components/UI/Input/Input';
import Card from '../../components/UI/Card/Card';
import Button from '../../components/UI/Button/Button';

import * as actions from '../../store/actions';
import { updateObject, formCheckValidity } from '../../shared/utility';
import { profil__form } from './Profil.module.scss';

class Profile extends Component {
	state = {
		controls: {
			name: {
				elementType: 'input',
				elementConfig: {
					type: 'text',
					placeholder: this.props.profile.name
				},
				label: 'Your name',
				value: this.props.profile.name,
				labelSmall: '',
				valid: false,
				touched: false
			},
			email: {
				elementType: 'input',
				elementConfig: {
					type: 'email',
					placeholder: this.props.profile.email
				},
				label: 'Your email',
				value: this.props.profile.email,
				labelSmall: '',
				valid: false,
				touched: false
			},			
			/* password: {
				elementType: 'input',
				elementConfig: {
					type: 'password',
					placeholder: 'Your password'
				},
				label: 'Your password',
				value: '',
				labelSmall: '',
				valid: false,
				touched: false
			}, */	
			newPassword: {
				elementType: 'input',
				elementConfig: {
					type: 'password',
					placeholder: 'Your new password'
				},
				label: 'Your new password',
				value: '',
				labelSmall: '',
				valid: false,
				touched: false
			},
			devise: {
				elementType: 'select',
				elementConfig: {
					type: '',
					placeholder: 'Devise',
					options: [
						{
							value: 'initial',
							displayValue: 'Choisir un type'
						},
						{
							value: 'euros',
							displayValue: 'Euros (€)'
						},
						{
							value: 'dollars',
							displayValue: 'Dollars ($)'
						}
					]
				},
				label: 'Devise',
				value: this.props.profile.currency,
				touched: false
			},		
		}
	}

	componentDidUpdate(prevProps, prevState) {
		if (this.props.profile !== prevProps.profile) {
			this.setState({ controls: this.state.controls });
		}
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

	submitFormHandler = (event) => {
		event.preventDefault();
		const { name, email, newPassword, devise } = this.state.controls;
		const { userId, token, currentKey, profile } = this.props;
		const datas = { ...profile };
		let isUpdatedEmail = false;
		let isUpdatedPassword = false;

		if (name.value !== profile.name) datas.name = name.value;
		if (email.value !== profile.email) { 
			datas.email = email.value;
			isUpdatedEmail = true;
		}
		if (newPassword.value !== '') isUpdatedPassword = true;
		if (devise.value !== profile.currency) datas.currency = devise.value;

		if (isUpdatedEmail) {
			this.props.onUpdateEmail(userId, token, currentKey, email.value, datas);
			isUpdatedEmail = false;
		} else if (isUpdatedPassword) {
			this.props.onUpdatePassword(userId, token, currentKey, newPassword.value, datas);
			isUpdatedPassword = false;
			this.setState({ 
				controls: {
					newPassword: {
						value: ''
					}
				},
			})
		} else {
			this.props.onUpdateProfile(userId, token, currentKey, datas);
		}
	}

	cancelSubmitFormHandler = (event) => {}

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

		const profil = (
			<Fragment>
				<div className="row">
					<h1 className="content__title">Your informations</h1>
				</div>
				<div className="row">
					<div className="col-6 col-margin-3">
						<Card classes={ profil__form }>
							<form>
							<h2 className="isLike__h5">Edit my informations</h2>
								{ form }
								<div className="row">
									<Button 
										btnType="button__blue"
										typeBtn="submit"
										clicked={ this.submitFormHandler }>Changer</Button>
								</div>
							</form>
						</Card>
					</div>
				</div>
			</Fragment>
		);

		return (
			<Fragment>{ profil }</Fragment>
		);
	}
}

const mapStateToProps = state => {
	return {
		loading: state.payload.loading,
		isAuth: state.auth.token !== null,
		token: state.auth.token,
		userId: state.auth.userId,
		currentKey: state.payload.currentKey,
		profile: state.payload.profile,
	}
}

const mapDispatchToProps = dispatch => {
	return {
		onUpdateProfile: (userId, token, key, datas) => dispatch(actions.updateProfile(userId, token, key, datas)),
		onUpdateEmail: (userId, token, key, newEmail, datas) => dispatch(actions.updateUserEmail(userId, token, key, newEmail, datas)),
		onUpdatePassword: (userId, token, key, newPassword, datas) => dispatch(actions.updateUserPassword(userId, token, key, newPassword, datas)),
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(Profile);