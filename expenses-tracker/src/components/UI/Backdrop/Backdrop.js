import React from 'react';

import { backdrop } from './Backdrop.module.scss';

const backdrop = (props) => (
		props.show 
			? <div 
					className={ backdrop }
					onClick={ props.cliked }>
				</div>
			: null
);

export default backdrop;