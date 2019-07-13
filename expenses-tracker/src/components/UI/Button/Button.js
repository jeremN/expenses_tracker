import React from 'react';

import classes from './Button.module.scss';

const button = (props) => (
	<button
		type={ !props.typeBtn ? 'button' : props.typeBtn }
		className={ [classes.button, classes[props.btnType], classes[props.isActive]].join(' ') }
		style={ props.cssStyle ? { ...props.cssStyle } : null }
		disabled={ props.disabled }
		onClick={ props.clicked }>
		{ props.children }
	</button>
);

export default button;