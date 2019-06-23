import React, { Fragment } from 'react';

import { Header, Header__list, Header__item } from './Header.module.scss';
import NavigationItem from '../Navigation/NavigationItems/NavigationItems';

const header = (props) => {
	const loggedMenu = (
		<Fragment>
			<NavigationItem link="/stats" itemClass={ Header__item }>Stats</NavigationItem>
			<NavigationItem link="/profile" itemClass={ Header__item }>Profil</NavigationItem>
			<NavigationItem link="/logout" itemClass={ Header__item }>Logout</NavigationItem>
		</Fragment>
	);

	const registerMenu = (
		<NavigationItem link="/auth" itemClass={ Header__item }>Login</NavigationItem>
	);

	return (
		<header className={ Header }>
			<ul className={ Header__list }>
				<NavigationItem itemClass={ Header__item } link="/" exact>Home</NavigationItem> 
				{ !props.isAuth 
					?  registerMenu 
					:  loggedMenu
				}
			</ul>
		</header>
	);
}

export default header;