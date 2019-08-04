import React, { Component, Fragment } from 'react';

import Modal from '../../components/UI/Modal/Modal';

const ErrorHandler = (WrappedComponent, axios) => {
	return class extends Component {
		state = {
			error: null,
			title: '',
			content: '',
			footer: '',
		}

    componentWillMount () {
      this.reqInterceptor = axios.interceptors.request.use(req => {
        this.setState({ error: null });
        return req;
      });
      this.resInterceptor = axios.interceptors.response.use(res => res, error => {
      	console.error(error, error.response)
        this.setState({ 
        	error: true,
        	title: error.response.data.error,
        	content: error.response.data.code,
        });
        return Promise.reject(error);
      });
    }

    componentWillUnmount () {
      axios.interceptors.request.eject( this.reqInterceptor );
      axios.interceptors.response.eject( this.resInterceptor );
    }

    errorConfirmedHandler = () => {
      this.setState({ 
      	error: false,
      	title: '',
      	content: '',
      	footer: '',
      });
    }

    render () {
      return (
        <Fragment>
          <Modal
            show={ this.state.error }
            onModalClosed={ () => this.errorConfirmedHandler() }
            title={ this.state.title }
            content={ this.state.content }
            footer={ this.state.footer } />
          <WrappedComponent {...this.props} />
        </Fragment>
      );
    }
	}
}

export default ErrorHandler;