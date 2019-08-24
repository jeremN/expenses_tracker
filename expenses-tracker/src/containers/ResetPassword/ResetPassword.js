import React, { Component } from 'react';
import { connect } from 'react-redux';
import { Redirect } from 'react-router-dom';
import { withTranslation } from 'react-i18next';
import { CSSTransition } from 'react-transition-group';

import Input from '../../components/UI/Input/Input';
import Button from '../../components/UI/Button/Button';

import * as classes from './ResetPassword.module.scss';

import * as actions from '../../store/actions'
import { updateObject, formCheckValidity } from '../../shared/utility';

class ResetPassword extends Component {
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
		},
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

	submitHandler = (event) => {
		event.preventDefault();
		const { email } = this.state.controls
		this.props.onReset(email.value)
	}

	render() {
		const { t } = this.props;
		const animationTiming = {
			appear: 350,
			enter: 350,
			exit: 350,
		};
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
					labelValue={ t(label) }
					invalid={ !valid }
					shouldValidate={ validation }
					touched={ touched }
					changed={ (event) => this.inputChangedHandler(event, formElement.id)} />
			);
		});

		let errorMessage = null;
		if (this.props.error) {
			errorMessage = (
				<p style={{ fontSize: '1.2rem', color: '#FE525E' }}>{ this.props.error.message }</p>
			)
		}

  	let homeRedirect = null;
  	if (this.props.isAuth) {
  		homeRedirect = <Redirect to="/" />
  	}

		return (
			<div className={ classes.Authenticate }>
		    <CSSTransition 
	        in={ true }
	        timeout={ animationTiming }
					classNames={{
						appear: classes.formAppear,
						appearActive: classes.formAppearActive,
            enter: classes.formEnter,
            enterActive: classes.formEnterActive,
            exit: classes.formExit,
            exitActive: classes.formExitActive
	        }} 
	        mountOnEnter
	        unmountOnExit
	        appear>						
					<div id="auth" className={ classes.Login }>
						{ homeRedirect }
						<form className="form" onSubmit={ this.submitHandler }>
							<div className="form__title">					
								<h1>{ t('RecoverPasswordTitle') }</h1>
							</div>
	        		{ form }
							<Button 
								btnType="button__blue"
								typeBtn="submit">{ t('SendEMailPassword') }</Button>
							{ errorMessage }
						</form>
					</div>
				</CSSTransition>
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
		onReset: (email, password, isSignUp) => dispatch(actions.auth(email, password, isSignUp)),
		onSetAuthRedirectPath: () =>  dispatch(actions.setAuthRedirectPath('/'))
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(withTranslation()(ResetPassword));