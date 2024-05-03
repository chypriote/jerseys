import './bootstrap.js';
import './vendor/barecss/css/bare.min.css';
import './styles/app.css';

// "optin" - No turbo forms unless you insist. Use data-turbo="true" to enable turbo on individual forms.
// @see https://stackoverflow.com/a/76286583/633864
Turbo.setFormMode('optin') // "on" | "off" | "optin"
