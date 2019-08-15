import React from 'react';

import ButtonGroup from '../components/UI/ButtonGroup/ButtonGroup';

export const renderButtonGroup = (clickedProps, groupArray, edit = false) => {
	const stylesProps = {
		onEdit: { display: edit ? 'flex' : 'none' },
		notEdit: { display: !edit ? 'flex' : 'none' },
	}

	const btnsGroup = groupArray.map((btn) => {
		return {
			...btn,
			styles: stylesProps[btn.styles],
			onClick: clickedProps[btn.content],
		}
	});

	return (<ButtonGroup btns={ btnsGroup }/>)
}
