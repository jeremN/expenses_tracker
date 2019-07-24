import React from 'react';

import { tooltip, tooltip__title } from './Tooltip.module.scss';

const Tooltip = (props) => {
	const transl =  `translate(${props.pos[0] }px, ${props.pos[1]}px)`;
	const css = {
		transform: transl
	}

	return (<div className={ tooltip } style={ css }>
			<p className={ tooltip__title }>{ props.title }</p>
			<ul>
				<li>income: { props.income } { props.unit }</li>
				<li>outcome: { props.outcome } { props.unit }</li>
			</ul>
		</div>
	);
}

export default Tooltip;