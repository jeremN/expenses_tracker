import React, { Component } from 'react';
import { connect } from 'react-redux';
import { Redirect } from 'react-router-dom';

import Input from '../../components/UI/Input/Input';
import Button from '../../components/UI/Button/Button';

import * as actions from '../../store/actions'

class Auth extends Component {
	state = {
		controls: {
			email: {
				elementType: 'input',
				elementConfig: {
					type: 'email',
					placeholder: 'Email'
				},
				value: '',
				validation: {
					required: true,
					isEmail: true
				},
				valid: false,
				touched: false
			},
			password: {
				elementType: 'input',
				elementConfig: {
					type: 'password',
					placeholder: 'Mot de passe'
				},
				value: '',
				validation: {
					required: true,
					minLength: 6
				},
				valid: false,
				touched: false
			}
		},
		isSignUp: true
	}

	inputChangedHandler = (event, controlName) => {}

	switchAuthModeHandler = () => {}

	submitHandler = (event) => {
		event.preventDefault();
		const { email, password } = this.state.controls
		this.props.onAuth(email.value, password.value)
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
				touched
			} = formElement.config

			return (
				<Input
					key = { formElement.id }
					elementType = { elementType }
					elementConfig = { elementConfig }
					value = { value }
					invalid = { !valid }
					shouldValidate = { validation }
					touched = { touched }
					changed = { (event) => this.inputChangedHandler(event, formElement.id)} />
			)
		});

		let errorMessage = null;
		if (this.props.error) {
			errorMessage = (
				<p>{ this.props.error.message }</p>
			)
		}

		let authRedirect = null;
		if (this.props.isAuth) {
			authRedirect = <Redirect to={ this.props.authRedirectPath } />
		}

		return (
			<div id="auth" className={ form }>
				{ authRedirect }
				<form onSubmit={ this.submitHandler }>
					<h1>Se connecter</h1>
					{ form }
					<Button btnType="button--blue">Envoyer</Button>
				</form>
			</div>
		);
	}
}

const mapStateToProps = state => {
	return {
		loading: state.auth.loading,
		error: state.auth.error,
		isAuth: state.auth.token !== null,
		authRedirectPath: state.auth.authRedirectPath
	}
}

const mapDispatchToProps = dispatch => {
	return {
		onAuth: (email, password, isSignUp) => dispatch(actions.auth(email, password, isSignUp)),
		onSetAuthRedirectPath: () =>  dispatch(actions.setAuthRedirectPath('/'))
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(Auth);