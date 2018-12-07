const {
  addQueryParams, assertPropertyType, assertStringPair, assignStringPair, validate, getTrace,
} = require('./util');

/**
 * Attempt to populate internal data fields from a Digital Link in URL format.
 *
 * @param {object} dl - The DigitalLink (this).
 * @param {string} str - String input containing Digital Link.
 */
const decode = (dl, str) => {
  if (!str.includes('http') || !str.includes('://')) {
    throw new Error('String input must contain http(s) protocol');
  }

  if (str.split('/').length < 5 || str.split('/')[4].length === 0) {
    throw new Error('Must contain at least the identifier');
  }

  // http(s)://domain.xyz
  dl.domain = str.substring(0, str.indexOf('/', str.indexOf('://') + 3));
  str = str.substring(dl.domain.length);

  // /first/identifier
  const segments = (str.includes('?') ? str.substring(0, str.indexOf('?')) : str)
    .split('/')
    .filter(p => p.length);
  dl.identifier[segments.shift()] = segments.shift();

  // /x/y until query
  while(segments.length) {
    dl.keyQualifiers[segments.shift()] = segments.shift();
  }

  // ?x=y...
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
const encode = (dl) => {
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
 * @param {(object|string)} opts - Optional construction object or string.
 */
const DigitalLink = (opts) => {
  // Model should only be manipulated through getters and setters
  const model = Symbol('model');
  const result = {
    [model]: {
      domain: '',
      identifier: {},
      keyQualifiers: {},
      attributes: {},
    },
  };

  if (typeof opts === 'object') {
    // Domain and identifier are required
    assertPropertyType(opts, 'domain', 'string');
    result[model].domain = opts.domain;
    assertPropertyType(opts, 'identifier', 'object');
    result[model].identifier = opts.identifier;

    // The rest are optional
    if (opts.keyQualifiers) {
      assertPropertyType(opts, 'keyQualifiers', 'object');
      result[model].keyQualifiers = opts.keyQualifiers;
    }

    if (opts.attributes) {
      assertPropertyType(opts, 'attributes', 'object');
      result[model].attributes = opts.attributes;
    }
  }

  if (typeof opts === 'string') {
    decode(result[model], opts);
  }

  result.setDomain = (domain) => {
    if (typeof domain !== 'string') {
      throw new Error('domain must be a string');
    }

    result[model].domain = domain;
    return result;
  };

  result.setIdentifier = (key, value) => {
    assertStringPair(key, value);
    result[model].identifier = { [key]: value };
    return result;
  };

  result.setKeyQualifier = (key, value) => {
    assignStringPair(result[model], 'keyQualifiers', key, value);
    return result;
  };
  
  result.setAttribute = (key, value) => {
    assignStringPair(result[model], 'attributes', key, value);
    return result;
  };
  
  result.getDomain = () => result[model].domain;
  result.getIdentifier = () => result[model].identifier;
  result.getKeyQualifier = key => result[model].keyQualifiers[key];
  result.getKeyQualifiers = () => result[model].keyQualifiers;
  result.getAttribute = key => result[model].attributes[key];
  result.getAttributes = () => result[model].attributes;
  result.toUrlString = () => encode(result[model]);
  result.toJsonString = () => JSON.stringify(result[model]);
  result.isValid = () => validate(result.toUrlString());
  result.getValidationTrace = () => getTrace(result.toUrlString());

  return result;
};

module.exports = {
  DigitalLink,
}