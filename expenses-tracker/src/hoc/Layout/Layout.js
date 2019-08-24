import React, { Component, Fragment } from 'react';
import { connect } from 'react-redux';
import { withTranslation } from 'react-i18next';
import { TransitionGroup, CSSTransition } from 'react-transition-group';

import * as actions from '../../store/actions';

import Header from '../../components/Header/Header';
import classes from './Layout.module.scss';
import { Header__list__item, Header__list, Header__item__withBubble, Header__bubble } from '../../components/Header/Header.module.scss';

class Layout extends Component {
	state = {
		username: '',
		updateList: [],	
		showList: false,
	}

	componentDidUpdate(prevProps, prevState) {
		if (this.props.profile !== prevProps.profile && this.props.profile) {
			this.setState({ username: this.props.profile.name });
		}

		if (this.props.notif !== prevProps.notif && this.props.notif.length) {
			this.setState({ updateList: this.props.notif });
		}
	}

	showListHandler = () => {
		this.setState({ showList: !this.state.showList });
	}

	clearListHandler = () => {
		const { userId, token, currentKey } = this.props

		this.setState({ 
			showList: !this.state.showList, 
			updateList: [],
		});

		if (this.props.notif && Array.isArray(this.props.notif)) this.props.onUpdateNotifs(userId, token, currentKey, false);
	}

	render() {	
		const { t } = this.props;
		let userProps = (<ul className={ Header__list }></ul>);		
		let updatesList = null;
		let updatesNumber = null;

		if (this.state.updateList.length) {
			updatesNumber = (
				<div className={ Header__bubble }>{ this.state.updateList.length }</div>
			);
		}

		if (this.state.showList && this.state.updateList.length) {
			updatesList = (
				<Fragment>
					<TransitionGroup component="ul" className={ classes.updated__list }>
					{ this.state.updateList.map((item, index) => (
						<CSSTransition
							key={ `item-${index}` }
							mountOnEnter
							in={ true }
							classNames={{
								appear: classes.itemAppear,
								appearActive: classes.itemAppearActive,
			          enter: classes.itemEnter,
			          enterActive: classes.itemEnterActive,
			          exit: classes.itemExit,
			          exitActive: classes.itemExitActive
			        }}					
			        timeout={ 350 }
							appear
							unmountOnExit>
						<li key={ index }>
								<sup>{ item }</sup>
								<span>{ t('SAVE_Month') }</span>
							</li>
						</CSSTransition>
						))
					}
					</TransitionGroup>
				</Fragment>
			);		
		}

		if (this.props.isAuth) {
			userProps = (
				<ul className={ Header__list }>
					<li 
						className={ [Header__list__item, Header__item__withBubble].join(' ') }
						onMouseEnter ={ this.showListHandler }
						onMouseLeave={ this.clearListHandler }>
						<svg xmlns="http://www.w3.org/2000/svg" 
							width="80" 
							height="80" 
							aria-hidden="true" 
							focusable="false" 
							data-prefix="far" 
							data-icon="bell" 
							role="img" 
							viewBox="0 0 448 512">
							<path fill="currentColor" d="M439.39 362.29c-19.32-20.76-55.47-51.99-55.47-154.29 0-77.7-54.48-139.9-127.94-155.16V32c0-17.67-14.32-32-31.98-32s-31.98 14.33-31.98 32v20.84C118.56 68.1 64.08 130.3 64.08 208c0 102.3-36.15 133.53-55.47 154.29-6 6.45-8.66 14.16-8.61 21.71.11 16.4 12.98 32 32.1 32h383.8c19.12 0 32-15.6 32.1-32 .05-7.55-2.61-15.27-8.61-21.71zM67.53 368c21.22-27.97 44.42-74.33 44.53-159.42 0-.2-.06-.38-.06-.58 0-61.86 50.14-112 112-112s112 50.14 112 112c0 .2-.06.38-.06.58.11 85.1 23.31 131.46 44.53 159.42H67.53zM224 512c35.32 0 63.97-28.65 63.97-64H160.03c0 35.35 28.65 64 63.97 64z"/>
						</svg>
						{ updatesNumber }
						{ updatesList }
					</li>
					<li className={ Header__list__item }>
						{ t('Hello') } { this.state.username }
					</li>
				</ul>		
			);
		}


		return (
			<Fragment>
				<Header isAuth={ this.props.isAuth }>
					{ userProps }
				</Header>
				<main className={ classes.dashboard__content }>
					{ this.props.children }
				</main>
			</Fragment>
		)
	}
}

const mapStateToProps = state => {
	return {
		isAuth: state.auth.token !== null,
		token: state.auth.token,
		userId: state.auth.userId,
		currentKey: state.payload.currentKey,
		profile: state.payload.profile,
		notif: state.payload.notif,
	}
}

const mapDispatchToProps = dispatch => {
	return {
		onUpdateNotifs: (userId, token, key, datas) =>  dispatch(actions.updateNotifications(userId, token, key, datas)),
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(withTranslation()(Layout));