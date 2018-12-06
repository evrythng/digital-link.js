const {
  addQueryParams, assertPropertyType, assertStringPair, assignStringPair, validate,
} = require('./util');

/**
 * Attempt to populate internal data fields from a Digital Link in URL format.
 *
 * @param {object} dl - The DigitalLink (this).
 * @param {string} str - String input containing Digital Link.
 */
const constructFromString = (dl, str) => {
  // http(s)://domain
  if (!str.includes('http') || !str.includes('://')) {
    throw new Error('String input must contain http(s) protocol');
  }

  let start = str.indexOf('://') + 3;
  let end = str.indexOf('/', start);
  dl.domain = str.substring(0, end > -1 ? end : str.length);

  if (end === -1) {
    throw new Error('Must contain at least an identifier');
  }
  
  // /first/identifier
  start = str.indexOf('/', start) + 1;
  end = str.indexOf('/', start);
  const idName = str.substring(start, end);
  start = str.indexOf('/', end) + 1;
  end = str.indexOf('/', start);
  dl.identifier[idName] = end > -1 ? str.substring(start, end) : str.substring(start);
  
  // /x/y until query
  let segments = str.substring(str.indexOf('?') + 1)
    .split('/')
    .filter(item => item.length);
  while (segments.length > 0) {
    dl.keyQualifiers[segments.shift()] = segments.shift();
  }

  // ?x=y... attributes
  if (str.includes('?')) {
    str.substring(str.indexOf('?') + 1)
      .split('&')
      .forEach((pair) => {
        const [key, value] = pair.split('=');
        dl.attributes[key] = value;
      });
  }
};

/**
 * Concatenate all the DigitalLink's properties into a GS1 Digital Link string.
 *
 * @param {object} dl - The DigitalLink (this).
 * @returns {string} The Digital Link in string form.
 */
const buildString = (dl) => {
  let result = dl.domain;

  // Identifier
  const idKey = Object.keys(dl.identifier)[0];
  result += `/${idKey}/${dl.identifier[idKey]}`;

  // Key qualifiers
  if (dl.keyQualifiers) {
    Object.keys(dl.keyQualifiers).forEach((key) => {
      result += `/${key}/${dl.keyQualifiers[key]}`;
    });
  }

  // Data Attributes
  if (Object.keys(dl.attributes).length) {
    result = addQueryParams(`${result}?`, dl.attributes);
  }

  return result;
};

/**
 * Construct a DigitalLink either from object params, a string, or built using
 * the available setters.
 *
 * @constructor
 * @param {(object|string)} opts - Optional construction object or string.
 */
function DigitalLink (opts) {
  // Model should only be manipulated through getters and setters
  const _model = {
    domain: '',
    identifier: {},
    keyQualifiers: {},
    attributes: {},
  };

  if (typeof opts === 'object') {
    // Domain and identifier are required
    assertPropertyType(opts, 'domain', 'string');
    _model.domain = opts.domain;
    assertPropertyType(opts, 'identifier', 'object');
    _model.identifier = opts.identifier;

    // The rest are optional
    if (opts.keyQualifiers) {
      assertPropertyType(opts, 'keyQualifiers', 'object');
      _model.keyQualifiers = opts.keyQualifiers;
    }

    if (opts.attributes) {
      assertPropertyType(opts, 'attributes', 'object');
      _model.attributes = opts.attributes;
    }
  }

  if (typeof opts === 'string') {
    constructFromString(_model, opts);
  }

  this.setDomain = (domain) => {
    if (typeof domain !== 'string') {
      throw new Error('domain must be a string');
    }

    _model.domain = domain;
    return this;
  };

  this.setIdentifier = (key, value) => {
    assertStringPair(key, value);
    _model.identifier = { [key]: value };
    return this;
  };

  this.setKeyQualifier = (key, value) => {
    assignStringPair(_model, 'keyQualifiers', key, value);
    return this;
  };
  
  this.setAttribute = (key, value) => {
    assignStringPair(_model, 'attributes', key, value);
    return this;
  };
  
  this.getDomain = () => _model.domain;
  
  this.getIdentifier = () => _model.identifier;
  
  this.getKeyQualifier = key => _model.keyQualifiers[key];

  this.getKeyQualifiers = () => _model.keyQualifiers;
  
  this.getAttribute = key => _model.attributes[key];

  this.getAttributes = () => _model.attributes;
  
  this.toString = () => buildString(_model);
  
  this.isValid = () => validate(this.toString());
};

module.exports = DigitalLink;
