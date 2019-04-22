import React from 'react';
import { NavLink } from 'react-router-dom';

import { Link, Link__active } from './NavigationItems.module.scss';

const navigationItem = (props) => (
	<li className="">
		<NavLink
			to={ props.link }
			exact={ props.exact }
			activeClassName={ Link__active }
			className={ Link, props.itemClass }>
			{ props.children }
		</NavLink>
	</li>
);

export default navigationItem;