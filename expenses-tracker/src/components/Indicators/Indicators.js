import React, { Fragment } from 'react';
import { withTranslation } from 'react-i18next';
import { TransitionGroup, CSSTransition } from 'react-transition-group';

import Indicator from './Indicator/Indicator';
import classes from './Indicator.module.scss';

const indicators = (props) => {
	const { t } = props;
	let indicatorsElements = props.kpis.map((kpi, index) => {
		return (		
			<CSSTransition
				key={ `kpi-${index}` }
				mountOnEnter
				in={ true }
				classNames={{
					appear: classes.indicatorAppear,
					appearActive: classes.indicatorAppearActive,
          enter: classes.indicatorEnter,
          enterActive: classes.indicatorEnterActive,
          exit: classes.indicatorExit,
          exitActive: classes.indicatorExitActive
        }}					
        timeout={ 350 }
				appear
				unmountOnExit>	
			<Indicator 
				key={ `kpi-${index}` }
				title={ t(kpi.title) }
			  value={ kpi.value }
			  currency="€"
			  progression={ kpi.progression }
			  progressClass={ kpi.progressClass } />
			</CSSTransition>	
		)
	})

	return (
		<Fragment>
			<TransitionGroup>
				{ indicatorsElements }
			</TransitionGroup>
		</Fragment>
	); 
}

export default withTranslation()(indicators);