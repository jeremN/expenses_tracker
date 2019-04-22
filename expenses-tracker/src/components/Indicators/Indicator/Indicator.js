import React from 'react';

import Card from '../../UI/Card/Card';

import { 
	c__indicator, 
	c__indicator__title, 
	c__indicator__value,
} from './Indicator.module.scss';

const indicator = (props) => (
	<Card classes={ c__indicator }> 
		<small className={ c__indicator__title }>{ props.title }</small>
		<h2 className={ c__indicator__value }>
			{ props.value }
			<b>{ props.currency }</b>
			&nbsp;<span className={ props.progressClass }>{ props.progression }</span>
		</h2>
	</Card>
);

export default indicator;