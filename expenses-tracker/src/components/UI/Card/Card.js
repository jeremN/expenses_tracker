import React from 'react';

import { Card } from './Card.module.scss';

const card = (props) => {
	const cardClasses = ([Card, props.classes])
	return (
		<div className={ cardClasses.join(' ') }>
			{ props.children }
		</div>
	);
}

export default card;