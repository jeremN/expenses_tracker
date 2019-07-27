import React, { Component, Fragment } from 'react';
import { connect } from 'react-redux';

import Input from '../../components/UI/Input/Input';
import Card from '../../components/UI/Card/Card';
import Button from '../../components/UI/Button/Button';

import * as actions from '../../store/actions';
import { updateObject, getDate, formCheckValidity } from '../../shared/utility';
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
					placeholder: 'Your email'
				},
				label: 'Your email',
				value: '',
				labelSmall: '',
				valid: false,
				touched: false
			},			
			password: {
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
			},			
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
				value: '',
				touched: false
			},		
		}
	}

	componentDidMount() {
		if (this.props.isAuth) {		
			this.props.getUserDatas(this.props.userId, this.props.token);
		}
	}

	componentDidUpdate(prevProps) {
		if (this.props.profile !== prevProps.profile) {
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
		const { name } = this.state.controls;
		const { userId, token, currentKey, profile } = this.props;
		let datas = { ...profile,
			name: name.value,
		};
		this.props.onUpdateProfile(userId, token, currentKey, datas);
	}

	cancelSubmitFormHandler = (event) => {}

	render() {
		const formElementsArray = [];
		console.info(this.props.profile)

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
		<div className="row">
			<div className="col-6 col-margin-3">
				<Card classes={ profil__form }>
					{ form }
					<div className="row">
						<Button 
							btnType="button__blue"
							typeBtn="submit"
							clicked={ this.submitFormHandler }>Changer</Button>
					</div>
				</Card>
			</div>
		</div>);

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
		getUserDatas: (userId, token) => dispatch(actions.getUserData(userId, token)),
		onUpdateProfile: (userId, token, key, datas) => dispatch(actions.updateProfile(userId, token, key, datas)),
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(Profile);