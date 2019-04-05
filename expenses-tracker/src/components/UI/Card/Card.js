import React from 'react';

import { Card } from './Card.module.scss';

const card = (props) => {
	return (
		<div className={ Card, ...props.classes.join(' ')}>
			{ props.children }
		</div>
	);
}

export default card;