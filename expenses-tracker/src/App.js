import React, { Component } from 'react';
import { Route, Switch, withRouter, Redirect } from 'react-router-dom';
import { connect } from 'react-redux';

import routes from './routes';
import Layout from './hoc/Layout/Layout';

import * as actions from './store/actions';
import './App.scss';

class App extends Component {
  componentDidMount() {
    this.props.onTryAutoSignup();
  }

  render() {
    let appRoutes = (
      <Switch>
        { routes.map((route, index) => {
            let routeComp = (
              <Route 
                key={ index } 
                path={ route.path } 
                component={ route.component } 
                exact={ route.exact } />
            );

            if (this.props.isAuth && route.display === ('isAuth' || 'always')) {
              return routeComp;
            } else if (!this.props.isAuth && route.display === ('notAuth' || 'always')) {
              return routeComp;
            }
            return routeComp;
        } )}
        <Redirect to="/" />
      </Switch>
    );

    return (
      <div className="dashboard">
        <Layout>
          { appRoutes }
        </Layout>
      </div>
    );
  }
}

const mapStateToProps = state => {
  return {
    isAuth: state.auth.token !== null
  }
}

const mapDispatchToProps = dispatch => {
  return {
    onTryAutoSignup: () => dispatch(actions.authCheckState())
  }
}

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(App));
