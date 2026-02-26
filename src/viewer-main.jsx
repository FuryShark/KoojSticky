import React from 'react';
import ReactDOM from 'react-dom/client';
import ViewerApp from './components/Viewer/ViewerApp';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('viewer-root')).render(
  <React.StrictMode>
    <ViewerApp />
  </React.StrictMode>
);
