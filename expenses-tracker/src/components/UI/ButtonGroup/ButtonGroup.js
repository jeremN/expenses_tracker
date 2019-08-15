import React from 'react';
import { withTranslation } from 'react-i18next';

import Button from '../Button/Button';

const ButtonGroup = (props) => {
	const { t } = props;
	let btnsGroup = props.btns.map((btn, index) => {
		return (
			<Button
				key={ `btn-${btn.content}-${index}` }
				cssStyle={ btn.styles }
				btnType={ btn.type }
				attributes={ btn.attr }
				clicked={ btn.onClick }>
				{ t(btn.content) }
			</Button>
		);
	});

	return (
		<span>
			{ btnsGroup }
		</span>
	);
}

export default withTranslation()(ButtonGroup);