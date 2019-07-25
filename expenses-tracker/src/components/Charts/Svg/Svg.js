import React from 'react';

const SvgContainer = (props) => {
	return (
		<svg 
			id={ props.id }
			className={ props.classes }
			height={ props.height }
			width={ props.width }
			viewBox={ `0 0 ${props.width} ${props.height}` }
			{ ...props.svgConfig }>
			<g transform={ `translate(${props.left}, ${props.top})` }>
				{ props.children }
			</g>
		</svg>
	);
}

export default SvgContainer;