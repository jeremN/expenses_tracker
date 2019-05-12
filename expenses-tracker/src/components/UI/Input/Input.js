import React from 'react';

import classes, { form__field } from './Input.module.scss';

const input = (props) => {
	let inputElement = null
	const inputClasses = [classes.InputElement];

	if (props.invalid && props.shouldValidate && props.touched) {
		inputClasses.push(classes.Invalid)
	}

	switch(props.elementType) {
		case ('input'):
			inputElement = <input
				id={ props.inputId }
				className={ form__field }
				{ ...props.elementConfig }
				value={ props.value }
				onChange={ props.changed } />; 
			break;

		case ('select'):
			inputElement = <select
				className={ form__field }
				value={ props.value }
				onChange={ props.changed }>
				{ props.elementConfig.options.map(option => (
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
				className={ form__field }
				{ ...props.elementConfig }
				value={ props.value }
				onChange={ props.changed } />; 
			break;
	}

	const labelSmall = (
		<small>({ props.labelSmall })</small>
	)

	const label = props.labelValue ? (
			<label
				htmlFor={ props.inputId } 
				className={ classes.form__label }>
				{ props.labelValue } { labelSmall }
			</label>
			) : null;

	return (
		<div className={ classes.form__group }>
			{ label }
			{ inputElement }
			<div className={ classes.form__errorMsg }>
				{ props.errorMsg }
			</div>
		</div>
	)
}

export default input;