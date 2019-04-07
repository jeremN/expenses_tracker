import React from 'react';
import { NavLink } from 'react-router-dom';

const navigationItem = (props) => (
	<li className="">
		<NavLink
			to={ props.link }
			exact={ props.exact }
			activeClassName={}>
			{ props.children }
		</NavLink>
	</li>
);

export default navigationItem;