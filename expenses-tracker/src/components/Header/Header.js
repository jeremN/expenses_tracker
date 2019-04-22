import React from 'react';

import { Header, Header__list, Header__item } from './Header.module.scss';
import NavigationItem from '../Navigation/NavigationItems/NavigationItems';

const header = (props) => (
	<header className={ Header }>
		<ul className={ Header__list }>
			<NavigationItem itemClass={ Header__item } link="/" exact>Home</NavigationItem> 
			{ !props.isAuth 
				?  <NavigationItem link="/auth" itemClass={ Header__item }>Login</NavigationItem> 
				:  <NavigationItem link="/logout" itemClass={ Header__item }>Logout</NavigationItem> 
			}
		</ul>
	</header>
);

export default header;