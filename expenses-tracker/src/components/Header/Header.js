import React, { Fragment } from 'react';
import { withTranslation } from 'react-i18next';

import { Header, Header__list, Header__list__item } from './Header.module.scss';
import NavigationItem from '../Navigation/NavigationItems/NavigationItems';

const header = (props) => {
	const { t } = props;

	const loggedMenu = (
		<Fragment>
			<NavigationItem link="/stats" itemClass={ Header__list__item }>{ t('Stats') }</NavigationItem>
			<NavigationItem link="/profil" itemClass={ Header__list__item }>{ t('Profil') }</NavigationItem>
			<NavigationItem link="/logout" itemClass={ Header__list__item }>{ t('Logout') }</NavigationItem>
		</Fragment>
	);

	const registerMenu = (<NavigationItem link="/auth" itemClass={ Header__list__item }>{ t('LogSign') }</NavigationItem>);

	return (
		<header className={ Header }>
			<ul className={ Header__list }>
				<NavigationItem itemClass={ Header__list__item } link="/" exact>{ t('Home') }</NavigationItem> 
				{ !props.isAuth ? registerMenu : loggedMenu }
			</ul>
			{ props.children || '' }
		</header>
	);
}

export default withTranslation()(header);