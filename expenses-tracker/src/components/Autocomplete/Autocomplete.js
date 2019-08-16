import React, { Component, Fragment } from 'react';

import { suggestList, suggestList__item } from './Autocomplete.module.scss';

class Autocomplete extends Component {

	state = {
		suggestions: [],
		activeSuggestion: 0,
		filteredSuggestions: [],
		showSuggestions: false,
		userInput: '',
	}

	componentDidMount() {
		if (this.props.suggest.length) {
			this.setState({ suggestions: this.props.suggest });
		}
	}

	componentDidUpdate(prevProps) {
		if (this.props.suggest !== prevProps.suggest) {
			this.setState({ suggestions: this.props.suggest });
		}
		if (this.props.userInput !== prevProps.userInput) {
			this.onChangeHandler()
		}
	}

	onChangeHandler = () => {
		const { suggestions, userInput } = this.state;
		const filteredSuggestions = suggestions.filter(suggestion => suggestion.toLowerCase().indexOf(userInput.toLowerCase()) > -1);
		
		this.setState({ 
			filteredSuggestions: filteredSuggestions,
			showSuggestions: true,
			activeSuggestion: 0,
			userInput: this.props.userInput,
		});
	}

	onClickHandler = (evt, string) => {
		this.props.clicked(evt, this.props.elId, string)
		this.setState({
			showSuggestions: false,
			filteredSuggestions: [],
			userInput: string,
			activeSuggestion: 0,
		});
	}

	onKeyDownHandler = (evt) => {
		const { filteredSuggestions, activeSuggestion } = this.state;
		const { keyCode } = evt

		switch(keyCode) {
			case 13: 
				this.setState({
					activeSuggestion: 0,
					showSuggestions: false,
					userInput: filteredSuggestions[activeSuggestion],
				});
				break;
			case 38:
				if (activeSuggestion === 0) return; 
				this.setState({ activeSuggestion: activeSuggestion - 1 });
				break;
			case 40:
			  if(activeSuggestion - 1 === filteredSuggestions.length) return;
			  this.setState({ activeSuggestion: activeSuggestion + 1 }); 
				break;
			default:
				return;
		}
	}

	render() {
		let suggested = '';

		if (this.state.showSuggestions) {
			suggested = (
				<ul className={ suggestList }>
					{ this.state.filteredSuggestions.map((suggestion, index) => {
						return (
							<li
								className={ suggestList__item }
								value={ suggestion }
								key={ suggestion }
								onClick={ (event) => this.onClickHandler(event, suggestion) }>
								{ suggestion }
							</li>
						);
					})}
				</ul>
			);
		}

		return (
			<Fragment>
				{ suggested }
			</Fragment>
		)
	}
}

export default Autocomplete;