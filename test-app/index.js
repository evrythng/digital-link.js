import { app, h } from 'hyperapp';

const DigitalLink = require('evrythng-gs1-dl-sdk');

const state = {
  url: '',
  jsonString: '',
  isValid: false,
};

const actions = {
  setUrl: url => state => ({ url }),
  setJsonString: jsonString => state => ({ jsonString }),
  setIsValid: isValid => state => ({ isValid }),
  doValidation: () => (state, actions) => {
    try {
      const dl = new DigitalLink(state.url);
      actions.setIsValid(dl.isValid());
      actions.setJsonString(dl.toJsonString());
    } catch (e) {
      console.log(e);
      actions.setIsValid(false);
      actions.setJsonString('');
    }
  },
};

const Paragraph = (props, children) => (
  <p class="paragraph" style={{ color: props.color }}>{children}</p>
);

const view = (state, actions) => (
  <div class="col-centered">
    <h1 class="title">Mini Digital Link Verifier</h1>
    <Paragraph>Enter your GS1 Digital Link below to see if it is valid.</Paragraph>
    <input type="text" class="input-url" value={state.url} oninput={(el) => {
      actions.setUrl(el.target.value);
      actions.doValidation();
    }}/>
    <Paragraph color={state.isValid === true ? 'limegreen' : 'red'}>
      {state.isValid === true ? 'Valid' : 'Invalid'}
    </Paragraph>

    <Paragraph color="#0002">{JSON.stringify(state)}</Paragraph>
  </div>
);

app(state, actions, view, document.getElementById('app'));
