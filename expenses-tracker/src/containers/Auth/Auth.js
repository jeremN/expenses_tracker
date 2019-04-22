import React, { Component } from 'react';
import { connect } from 'react-redux';
import { Redirect } from 'react-router-dom';

import Input from '../../components/UI/Input/Input';
import Button from '../../components/UI/Button/Button';

import { Login } from './Auth.module.scss';

import * as actions from '../../store/actions'
import { updateObject, formCheckValidity } from '../../shared/utility';

class Auth extends Component {
	state = {
		controls: {
			email: {
				elementType: 'input',
				elementConfig: {
					type: 'email',
					placeholder: 'Email'
				},
				label: 'Email',
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
				label: 'Mot de passe',
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

	componentDidMount() {
		if (this.props.authRedirectPath !== '/' || this.props.isAuth) {
			this.props.onSetAuthRedirectPath()
		}
	}

	inputChangedHandler = (event, controlName) => {
		const { target } = event
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

	switchAuthModeHandler = () => {
		this.setState(prevState => {
			return { isSignUp: !prevState.isSignUp }
		});
	}

	submitHandler = (event) => {
		event.preventDefault();
		const { email, password } = this.state.controls
		this.props.onAuth(email.value, password.value, this.state.isSignUp)
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
			} = formElement.config

			return (
				<Input
					key={ formElement.id }
					elementType={ elementType }
					elementConfig={ elementConfig }
					value={ value }
					labelValue={ label }
					invalid={ !valid }
					shouldValidate={ validation }
					touched={ touched }
					changed={ (event) => this.inputChangedHandler(event, formElement.id)} />
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
			<div id="auth" className={ Login }>
				{ authRedirect }
				<form className="form" onSubmit={ this.submitHandler }>
					<h1>{ !this.state.isSignUp ? 'Se connecter' : 'Inscription' }</h1>
					{ form }
					<Button 
						btnType="button__blue"
						typeBtn="submit">Envoyer</Button>
					<Button 
						btnType="button__transparent" 
						clicked={ this.switchAuthModeHandler }>{ !this.state.isSignUp ? 'Créer un compte' : 'Se connecter' }</Button>
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