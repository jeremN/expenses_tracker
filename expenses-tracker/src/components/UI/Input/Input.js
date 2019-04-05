import React from 'react';

import classes from './Input.module.scss';

const input = (props) => {
	let inputElement = null
	const inputClasses = [classes.InputElement];

	// if (props.invalid && props.shouldValidate && props.touched) {
	// 	inputClasses.push(classes.Invalid)
	// }

	switch(props.elementType) {
		case ('input'):
			inputElement = <input
				id={ props.inputId }
				className={ inputClasses.join(' ') }
				{ ...props.elementConfig }
				value={ props.value }
				onChange={ props.changed } />; 
			break;
		case ('select'):
			inputElement = <select
				className={ inputClasses.join(' ') }
				value={ props.value }
				onChange={ props.changed }>
				{ ...props.elementConfig.options.map(option => (
					<option
						key={ option.value }
						value={ option.value }>
					{ option.displayValue }
					</option>
				))} 
			</select>;
			break;
		default:
			inputElement = <input
				className={ inputClasses.join(' ') }
				{ ...props.elementConfig }
				value={ props.value }
				onChange={ props.changed } />; 
			break;
	}

	return (
		<div className={}>
			<label
				for={ props.inputId } 
				className={}>
				{ props.labelValue }
			</label>
			{ inputElement }
		</div>
	)
}