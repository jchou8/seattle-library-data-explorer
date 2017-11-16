import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import registerServiceWorker from './registerServiceWorker';

// Styling
import 'bootstrap/dist/css/bootstrap.css';
import 'react-widgets/dist/css/react-widgets.css';

// Localization for month picker
import Moment from 'moment';
import momentLocalizer from 'react-widgets-moment';

Moment.locale('en');
momentLocalizer();

ReactDOM.render(<App />, document.getElementById('root'));
registerServiceWorker();
