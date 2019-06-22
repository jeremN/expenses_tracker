import React from 'react';

import Card from '../../UI/Card/Card';

import styles from './Indicator.module.scss';

const indicator = (props) => (
	<Card classes={ styles.c__indicator }> 
		<small className={ styles.c__indicator__title }>{ props.title }</small>
		<h2 className={ styles.c__indicator__value }>
			{ props.value }
			<b>{ props.currency }</b>
			&nbsp;<span className={ styles[props.progressClass] }>{ props.progression }</span>
		</h2>
	</Card>
);

export default indicator;