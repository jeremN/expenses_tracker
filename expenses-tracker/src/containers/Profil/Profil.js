import React, { Component, Fragment } from 'react';
import { connect } from 'react-redux';
import { withTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { CSSTransition } from 'react-transition-group';

import Input from '../../components/UI/Input/Input';
import Card from '../../components/UI/Card/Card';
import Button from '../../components/UI/Button/Button';

import * as actions from '../../store/actions';
import { updateObject, formCheckValidity } from '../../shared/utility';
import classes from './Profil.module.scss';

class Profile extends Component {
	state = {
		controls: {
			name: {
				elementType: 'input',
				elementConfig: {
					type: 'text',
					placeholder: 'PROFIL_Pseudo'
				},
				label: 'PROFIL_Pseudo',
				value: this.props.profile.name,
				labelSmall: '',
				valid: false,
				touched: false
			},
			email: {
				elementType: 'input',
				elementConfig: {
					type: 'email',
					placeholder: 'Email'
				},
				label: 'Email',
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
					placeholder: 'PROFIL_NewPassword'
				},
				label: 'PROFIL_NewPassword',
				value: '',
				labelSmall: '',
				valid: false,
				touched: false
			},
			devise: {
				elementType: 'select',
				elementConfig: {
					type: '',
					placeholder: 'PROFIL_Currency',
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
				label: 'PROFIL_Currency',
				value: this.props.profile.currency,
				touched: false
			},
			language: {
				elementType: 'select',
				elementConfig: {
					type: '',
					placeholder: 'PROFIL_Language',
					options: [
						{
							value: 'initial',
							displayValue: 'Choisir un type'
						},
						{
							value: 'fr',
							displayValue: 'Français'
						},
						{
							value: 'en',
							displayValue: 'English'
						}
					]
				},
				label: 'PROFIL_Language',
				value: this.props.profile.lang,
				touched: false
			}		
		}
	}

	componentDidMount() {
		if (this.props.isAuth && !this.props.profile) {		
			this.props.getUserDatas(this.props.userId, this.props.token);
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

	translateElement = (el) => {
		const { t } = this.props
		return t(el)
	}

	submitFormHandler = (event) => {
		event.preventDefault();
		const { name, email, newPassword, devise, language } = this.state.controls;
		const { userId, token, currentKey, profile } = this.props;
		const datas = { ...profile };
		let isUpdatedEmail = false;
		let isUpdatedPassword = false;

		if (name.value !== profile.name) datas.name = name.value;
		if (email.value !== profile.email) { 
			datas.email = email.value;
			isUpdatedEmail = true;
		}
		if (language.value !== profile.lang) {
			datas.lang = language.value;
			i18n.changeLanguage(language.value);
			localStorage.setItem('expensesTracker__Lang', JSON.stringify({ lang: language.value }));
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
				labelAfter,
			} = formElement.config

			const elConfig = { 
				...elementConfig,
				placeholder: t(elementConfig.placeholder)
			}

			return (
				<Input
					key={ formElement.id }
					elementType={ elementType }
					elementConfig={ elConfig }
					value={ value }
					labelValue={ t(label) }
					labelSmall={ !labelSmall ? labelSmall : t(labelSmall) }
					invalid={ !valid }
					shouldValidate={ validation }
					labelAfter= { labelAfter }
					touched={ touched }
					changed={ (event) => this.inputChangedHandler(event, formElement.id) } />
			)
		});

		const illustration = (
			<Fragment>
				<svg 
					xmlns="http://www.w3.org/2000/svg" 
					id="fe80fb2b-bcaf-407e-919b-306adc32f78b" 
					data-name="Layer 1" 
					viewBox="0 0 1032 741.75278"
					width="100%">
					<title>profile</title>
					<line y1="741.25278" x2="166" y2="741.25278" fill="none" stroke="#3f3d56" strokeMiterlimit="10"/>
					<rect x="243" y="127.75278" width="737" height="499" rx="19.39764" fill="#f2f2f2"/>
					<rect x="220.5" y="96.25278" width="737" height="499" rx="19.39764" fill="none" stroke="#3f3d56" strokeMiterlimit="10"/>
					<line x1="220.5" y1="144.09298" x2="957.5" y2="144.09298" fill="none" stroke="#3f3d56" strokeMiterlimit="10"/>
					<rect x="661" y="256.25278" width="201" height="31" rx="7.09252" fill="#0042d1" opacity="0.3"/>
					<rect x="622.5" y="342.25278" width="278" height="25" rx="7.09252" fill="#0042d1" opacity="0.3"/>
					<rect x="622.5" y="410.25278" width="278" height="25" rx="7.09252" fill="#0042d1" opacity="0.3"/>
					<rect x="622.5" y="478.25278" width="278" height="25" rx="7.09252" fill="#0042d1" opacity="0.3"/>
					<rect x="671" y="246.25278" width="201" height="31" rx="7.09252" fill="none" stroke="#3f3d56" strokeMiterlimit="10"/>
					<rect x="632.5" y="332.25278" width="278" height="25" rx="7.09252" fill="none" stroke="#3f3d56" strokeMiterlimit="10"/>
					<rect x="632.5" y="400.25278" width="278" height="25" rx="7.09252" fill="none" stroke="#3f3d56" strokeMiterlimit="10"/>
					<rect x="632.5" y="468.25278" width="278" height="25" rx="7.09252" fill="none" stroke="#3f3d56" strokeMiterlimit="10"/>
					<circle cx="276.5" cy="126.25278" r="15" fill="#0042d1" opacity="0.3"/>
					<circle cx="318.5" cy="126.25278" r="15" fill="#0042d1" opacity="0.3"/>
					<circle cx="360.5" cy="126.25278" r="15" fill="#0042d1" opacity="0.3"/>
					<circle cx="282.5" cy="120.25278" r="15" fill="none" stroke="#3f3d56" strokeMiterlimit="10"/>
					<circle cx="324.5" cy="120.25278" r="15" fill="none" stroke="#3f3d56" strokeMiterlimit="10"/>
					<circle cx="366.5" cy="120.25278" r="15" fill="none" stroke="#3f3d56" strokeMiterlimit="10"/>
					<path d="M537.854,653.37916c-2.51135-11.56848-3.17724-27.36932-2.33252-38.36047,0,0-12.69836-55.78644-22.68994-60.99133l-.00305.003c-.153.19678-5.00195,6.55383-5.61706,26.22443-.62452,19.98284-7.69971,33.09655-7.69971,33.09655s2.28955,24.90766.98047,40.02777Z" transform="translate(-84.5 -79.12639)" fill="#0042d1"/>
					<path d="M630.22827,298.37916H399.77173A23.77169,23.77169,0,0,0,376,322.15083V629.6075a23.77168,23.77168,0,0,0,23.77173,23.77166h80.855c-2.7002-11.19934-6.057-28.69067-2.65735-40.85241l-.00159-.008.0022.00525c.15869-.56757.32727-1.12738.51611-1.67047a63.49747,63.49747,0,0,0,2.29175-24.35407,50.6095,50.6095,0,0,0,0-21.23175c-2.4978-11.65564-4.24634-23.10522-4.24634-23.10522s-1.377-15.40234-.1748-24.84424c.02661-.2074.05762-.404.08667-.60541-.42432-.09655-.66235-.15228-.66235-.15228s3.53881-16.02789,4.78759-26.22748c.29493-2.40783.683-5.46032,1.10315-8.71478a20.93993,20.93993,0,0,1-3.3927-.86035c-11.24035-3.9549-14.779-39.75751-14.779-39.75751V429.656s-3.74683-17.38092,9.36694-25.08258c12.62793-7.41644,17.66968-9.44617,18.02613-9.58643.09619-.06878.19018-.13128.28833-.20727a11.06127,11.06127,0,0,0,3.28967-4.23371q.02619-.42873.01233-.85211c-.21326-4.06665-3.04419-7.76507-5.73047-10.99225q-3.43653-4.12857-6.87341-8.25726a8.07194,8.07194,0,0,1-1.77027-2.86487,6.604,6.604,0,0,1-.187-1.80389q-.00275-.33691.004-.673.056-3.07836.16724-6.15545c.06445-1.79224.51562-4.05353,2.27075-4.42182.91284-.19159,2.12109.14246,2.60364-.65576a1.56534,1.56534,0,0,0,.11682-1.06054c-.00586.02661-.00733.05444-.015.0805-.00586-.03339-.01159-.06695-.01782-.09985a22.43656,22.43656,0,0,1-.65051-4.38636,5.84207,5.84207,0,0,1,.282-1.96984c1.01672-2.97516,4.51782-4.196,7.61133-4.75727,3.09375-.56134,6.56653-1.04425,8.5083-3.51709a26.9506,26.9506,0,0,1,1.68884-2.37384,6.62979,6.62979,0,0,1,3.16589-1.59674,17.49792,17.49792,0,0,1,11.50623,1.02118c1.49646.68286,2.99963,1.60248,4.64124,1.49841,1.70507-.108,3.16162-1.3081,4.84509-1.60009,2.71911-.47156,5.31872,1.56567,6.65869,3.97827a9.85108,9.85108,0,0,1,1.23279,5.02313,6.912,6.912,0,0,1-1.76416,4.74109c-1.17017,1.24145-2.91626,2.09418-3.4021,3.72955-.198.66565-.152,1.38257-.32691,2.05457-.02185.084-.05737.16241-.08606.24365.03211.04169.06714.08112.09888.123a21.231,21.231,0,0,1-10.33215,33.01928c-.00794.21058-.01624.42133-.01514.63306a9.173,9.173,0,0,0,2.8396,7.0647l18.54724,7.606s11.16565-1.3534,15.19495,15.30957a28.82628,28.82628,0,0,1,.68982,8.45746c-.14636,2.51251.19507,6.93573,3.05725,12.66,4.57934,9.15881,3.53857,30.18237-5.82837,32.26392-8.87231,1.97161-12.32361,1.14331-12.66382,1.05023l-.02014.3681c.14612,3.94489,1.55029,37.969,6.64758,42.086,1.40955,1.13849,1.14026,1.90753-.01635,2.42578l.0028.00336s.0094.21856.03113.612c.15308,2.48846.93994,11.96472,4.35254,17.357,3.956,6.24457,3.54077,42.25739,3.54077,42.25739l2.70386,21.23181s-1.66419,13.11371,0,15.4024c.94556,1.29785,2.09057,21.40351,2.905,38.56964h69.53027A23.77168,23.77168,0,0,0,654,629.6075V322.15083A23.77169,23.77169,0,0,0,630.22827,298.37916Z" transform="translate(-84.5 -79.12639)" fill="#0042d1"/>
					<rect x="267.5" y="192.25278" width="278" height="355" rx="23.77165" fill="none" stroke="#3f3d56" strokeMiterlimit="10"/>
					<path d="M185.32419,400.757S176,398,174,401s2.72669,24.7477,2.72669,24.7477l20.54589,1.24859-7.17022-18.10653Z" transform="translate(-84.5 -79.12639)" fill="#2f2e41"/>
					<path d="M113.44417,579.34709s18.69466,41.04232,4.29762,39.753-19.98395-39.753-19.98395-39.753Z" transform="translate(-84.5 -79.12639)" fill="#a0616a"/>
					<path d="M235.71128,575.07127s-8.20129,44.34751,5.45523,39.61078,9.76437-43.40874,9.76437-43.40874Z" transform="translate(-84.5 -79.12639)" fill="#a0616a"/>
					<path d="M181.34664,390.46647s-.21488,20.6286,7.73573,21.703-4.51251,12.03335-4.51251,12.03335l-14.18216,2.79346L149.974,425.49212l-9.025-11.60359s15.90121-7.52084,9.025-30.9429Z" transform="translate(-84.5 -79.12639)" fill="#a0616a"/>
					<path d="M181.34664,390.46647s-.21488,20.6286,7.73573,21.703-4.51251,12.03335-4.51251,12.03335l-14.18216,2.79346L149.974,425.49212l-9.025-11.60359s15.90121-7.52084,9.025-30.9429Z" transform="translate(-84.5 -79.12639)" opacity="0.1"/>
					<path d="M217.87645,564.95005s10.09942,21.703,2.14881,89.82036c0,0,2.3637,24.0667.42977,28.5792s-17.83515,65.75367-17.83515,65.75367-20.41371,4.5125-23.20717-9.025c0,0,2.79346-19.33931,2.57857-22.34765s4.51251-35.88516,4.51251-35.88516l-9.66966-63.60485-7.306,57.37329s0,16.54586-2.36369,20.19884,0,77.14236,0,77.14236,6.66132,11.17383-3.4381,11.38871-19.12443-.21488-19.984-7.306-1.28929-14.18216-3.4381-18.47979-4.94227-53.50543-4.29762-70.69593-14.18216-105.50669-9.45478-114.74659S217.87645,564.95005,217.87645,564.95005Z" transform="translate(-84.5 -79.12639)" fill="#2f2e41"/>
					<circle cx="85.8877" cy="293.29006" r="25.78575" fill="#a0616a"/>
					<path d="M144.60195,414.31829s15.68633,11.60359,38.46374,2.3637c0,0,7.52084-3.653,6.8762-9.2399s15.68633,44.91018,15.68633,44.91018l16.54586,87.88643-.85953,35.88517s-7.306-3.653-30.08337,4.51251-59.95187-9.2399-59.95187-9.2399l1.28929-92.18405,1.28928-53.72031,3.4381-11.81847S139.015,410.45043,144.60195,414.31829Z" transform="translate(-84.5 -79.12639)" fill="#f2f2f2"/>
					<path d="M182.06324,399.89323s3.79591-.61662,7.44889,5.18517,12.24823,9.45477,12.24823,9.45477,20.84348,1.28929,23.85182,12.46312,10.52918,26.43039,14.18216,54.57983,10.95894,73.05963,12.03335,76.71261-1.50417,14.8268,1.50417,18.2649-21.27325,3.4381-21.27325,3.4381-2.14881-17.62026-3.653-17.62026-1.0744,11.81847.42977,20.41372-10.95895,0-10.95895,0-9.66965-39.32327-18.90955-74.77867S184.355,452.99692,186.074,445.04631s6.44644-30.728,3.00834-32.87683S182.06324,399.89323,182.06324,399.89323Z" transform="translate(-84.5 -79.12639)" fill="#2f2e41"/>
					<path d="M151.07551,399.87428s-5.614,3.05531-19.7962,13.15473-23.85182,17.83514-23.85182,17.83514-5.58691,4.29762-9.025,29.86849S87.22865,552.48693,90.237,560.8673s4.08275,13.32264,3.00834,18.26491,22.56253,4.72739,22.99229,3.653-.64464-20.6286.42977-21.05836,6.87619,11.60359,7.9506,21.703,13.53752,18.05,16.331,18.05,17.1905-58.23282,17.40538-97.98585-4.72739-73.2745-8.38037-78.00189S151.07551,399.87428,151.07551,399.87428Z" transform="translate(-84.5 -79.12639)" fill="#2f2e41"/>
					<path d="M188.86748,751.03721s1.71905-4.72739,7.73573-3.22322,10.09942-3.86786,10.09942-3.86786,3.22322-.42977,1.0744,3.653-3.86786,6.8762-3.86786,6.8762,12.89288,29.43873,4.51251,36.52981-18.05,2.79346-18.05,2.79346-9.45477-6.66132-9.025-24.28159c0,0-.42976-5.58691-5.58691-14.61192s-9.025-22.77741-2.79346-25.356,7.83546-2.67436,7.83546-2.67436-2.916,13.33721,4.61624,17.99776Z" transform="translate(-84.5 -79.12639)" fill="#3f3d56"/>
					<path d="M148.89957,784.3438s-5.15715-9.66966,3.4381-10.74406,17.83515-1.71905,17.40538,2.79345-1.50417,11.38871-1.50417,11.38871l1.50417,4.94227s.42977,12.24823,1.93393,13.7524,9.66966,14.397-7.73572,14.397-22.56253-1.93393-21.05836-6.01667,1.93393-24.28158,1.93393-24.28158Z" transform="translate(-84.5 -79.12639)" fill="#3f3d56"/>
					<path d="M162.22221,351.78785s12.03335,3.22322,18.26491,4.51251,5.58691-2.3637,5.58691-2.3637,8.16549,1.07441,7.73572.21488,3.4381-5.372-1.0744-10.52918-3.22322-9.025-3.22322-9.025h-3.86786l-1.07441-1.50417h-6.01668s-4.5125-1.71905-16.331,0-27.93456,2.14881-29.22385,9.2399-7.95061,15.90121-5.58691,19.98395,15.90121,20.84348,17.1905,27.93456,7.30933,8.66659,7.09277,4.22585-6.23325-19.91218-1.0761-20.55682S164.5859,360.16822,162.22221,351.78785Z" transform="translate(-84.5 -79.12639)" fill="#2f2e41"/>
					<path d="M1019.38065,86.58377a22.982,22.982,0,0,0-19.80994,13.851c-4.9535,11.97382,1.42449,26.03885,10.999,34.77028s21.87358,13.72225,33.04831,20.28234c15.00952,8.81128,28.4968,21.04282,36.00691,36.74386s8.30888,35.15009-.51891,50.14991c-8.1937,13.9224-23.09255,22.2549-37.30219,29.9397" transform="translate(-84.5 -79.12639)" fill="none" stroke="#3f3d56" strokeMiterlimit="10"/><ellipse cx="947.5" cy="8.5" rx="17.5" ry="8.5" fill="#0042d1"/><ellipse cx="961.5" cy="64.5" rx="17.5" ry="8.5" fill="#0042d1"/><ellipse cx="929.5" cy="73.5" rx="17.5" ry="8.5" fill="#0042d1"/><ellipse cx="979.5" cy="120.5" rx="17.5" ry="8.5" fill="#0042d1"/><ellipse cx="1014.5" cy="120.5" rx="17.5" ry="8.5" fill="#0042d1"/>
				</svg>		
			</Fragment>
		)

		const profil = (
			<Fragment>
				<div className="row">
					<h1 className="content__title">{ t('PROFIL_ProfilH1') }</h1>
				</div>
				<div className={ `row ${classes.profil__row}` }>
					<div className="col-3">
						<CSSTransition
							in={ true }
			        timeout={ 350 }
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
							<Card classes={ classes.profil__form }>
								<form>
								<h2 className="isLike__h5">{ t('PROFIL_ProfilH2') }</h2>
									{ form }
									<div className="row">
										<Button 
											btnType="button__blue"
											typeBtn="submit"
											clicked={ this.submitFormHandler }>{ t('PROFIL_Confirm') }</Button>
									</div>
								</form>
							</Card>
						</CSSTransition>
					</div>
					<CSSTransition
							in={ true }
			        timeout={ 250 }
							classNames={{
								appear: classes.imgAppear,
								appearActive: classes.imgAppearActive,
		            enter: classes.imgEnter,
		            enterActive: classes.imgEnterActive,
		            exit: classes.imgExit,
		            exitActive: classes.imgExitActive
			        }} 
			        mountOnEnter
			        unmountOnExit
			        appear>
						{ illustration }
					</CSSTransition>
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

export default connect(mapStateToProps, mapDispatchToProps)(withTranslation()(Profile));