import React, { Component } from 'react';
import { Route, Switch, withRouter, Redirect } from 'react-router-dom';
import { connect } from 'react-redux';

import Layout from './hoc/Layout/Layout';
import Auth from './containers/Auth/Auth';
import Logout from './containers/Auth/Logout/Logout';
import Home from './containers/Home/Home';
import Stats from './containers/Statistics/Statistics';
import Profile from './containers/Profil/Profil';
import NotFound from './components/NotFound/NotFound';

import * as actions from './store/actions';
import './App.scss';

class App extends Component {
  componentDidMount() {
    this.props.onTryAutoSignup();
  }

  render() {
    let routes = (
      <Switch>
        <Route path="/auth" component={ Auth } />
        <Route path="/" exact component={ Home } />
        <Redirect to="/" />
      </Switch>
    );

    if (this.props.isAuth) {
      routes = (
        <Switch>
          <Route path="/auth" component={ Auth } />
          <Route path="/logout" component={ Logout } />
          <Route path="/" exact component={ Home } />
          <Route path="/stats" exact component={ Stats } />
          <Route path="/profil" exact component={ Profile } />
          <Route path="" component={ NotFound } />
          <Redirect to="/" />
        </Switch>
      );
    }

    return (
      <div className="dashboard">
        <Layout>
          { routes }
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
