import { app, h } from 'hyperapp';

const DigitalLink = require('evrythng-gs1-dl-sdk');

const state = {
  url: 'https://example.com/01/38464783647346',
  jsonString: '',
  isValid: true,
  trace: {},
};

const actions = {
  setUrl: url => state => ({ url }),
  setJsonString: jsonString => state => ({ jsonString }),
  setIsValid: isValid => state => ({ isValid }),
  setTrace: trace => state => ({ trace }),
  doValidation: () => (state, actions) => {
    try {
      const dl = new DigitalLink(state.url);
      actions.setIsValid(dl.isValid());
      actions.setJsonString(dl.toJsonString());
      actions.setTrace(dl.getValidationTrace().trace);
    } catch (e) {
      console.log(e);
      actions.setIsValid(false);
      actions.setJsonString('');
      actions.setTrace([]);
    }
  },
};

const Paragraph = (props, children) => <div class="paragraph">{children}</div>;

const TraceView = ({ trace }) => {
  if (!trace.length) {
    return;
  }

  return (
    <div class="trace-wrapper">
      <table>
        <tr><th>Step</th><th>Rule</th><th>Matched</th><th>Remainder</th></tr>
        {trace.map((item, i) => {
          return (
            <tr class="trace-item">
              <td>{i + 1}</td><td>{item.rule}</td><td>{item.match}</td><td>{item.remainder}</td>
            </tr>
          );
        })}
      </table>
    </div>
  );
};

const view = (state, actions) => (
  <div class="col-centered">
    <h1 class="title">Example Digital Link Verifier</h1>
    <Paragraph>Enter your GS1 Digital Link below to see if it is valid.</Paragraph>
    <input type="text" class="input-url" value={state.url} 
      style={{ borderBottom: `solid 4px ${state.isValid === true ? 'limegreen' : 'red'}` }}
      oninput={(el) => {
        actions.setUrl(el.target.value);
        actions.doValidation();
      }}/>
    <Paragraph>
      Powered by the <a href="https://github.com/evrythng/evrythng-gs1-dl-sdk" target="_blank">
        evrythng-gs1-dl-sdk
      </a> SDK.
    </Paragraph>

    <TraceView trace={state.trace}/>

    <textarea class="state-view">{state.jsonString}</textarea>
  </div>
);

app(state, actions, view, document.getElementById('app'));
