const {
  addQueryParams, assertPropertyType, assertStringPair, assignStringPair, validateUrl, validateRule,
  getTrace, generateStatsHtml, generateTraceHtml, generateResultsHtml,
} = require('./util');
const { compressWebUri, decompressWebUri, isCompressedWebUri } = require('./compression');

/**
 * Individual parser rules that can be run with `testRule()`.
 */
const Rules = {
  gtin: 'gtin-value',
  itip: 'itip-value',
  gmn: 'gmn-value',
  cpid: 'cpid-value',
  shipTo: 'shipTo-value',
  billTo: 'billTo-value',
  purchasedFrom: 'purchasedFrom-value',
  shipFor: 'shipFor-value',
  gln: 'gln-value',
  payTo: 'payTo-value',
  glnProd: 'glnProd-value',
  gsrnp: 'gsrnp-value',
  gsrn: 'gsrn-value',
  gcn: 'gcn-value',
  sscc: 'sscc-value',
  gdti: 'gdti-value',
  ginc: 'ginc-value',
  gsin: 'gsin-value',
  grai: 'grai-value',
  giai: 'giai-value',
  cpv: 'cpv-value',
  lot: 'lot-value',
  ser: 'ser-value',
  cpsn: 'cpsn-value',
  glnx: 'glnx-value',
  refno: 'refno-value',
  srin: 'srin-value',
  customGS1webURI: 'customGS1webURI',
  canonicalGS1webURI: 'canonicalGS1webURI',
};

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
 * Options include:
 *   decompress - Set to true to attempt decompression of the input string.
 *
 * @param {(object|string)} [input] - Optional input construction object or string.
 * @param {object} [opts] - Optional options (see above).
 */
const DigitalLink = (input, opts = {}) => {
  // Model should only be manipulated through getters and setters to ensure types are correct
  const model = Symbol('model');
  const result = {
    [model]: {
      domain: '',
      identifier: {},
      keyQualifiers: {},
      attributes: {},
    },
  };

  if (typeof input === 'object') {
    // Domain and identifier are required
    assertPropertyType(input, 'domain', 'string');
    result[model].domain = input.domain;
    assertPropertyType(input, 'identifier', 'object');
    result[model].identifier = input.identifier;

    // The rest are optional
    if (input.keyQualifiers) {
      assertPropertyType(input, 'keyQualifiers', 'object');
      result[model].keyQualifiers = input.keyQualifiers;
    }

    if (input.attributes) {
      assertPropertyType(input, 'attributes', 'object');
      result[model].attributes = input.attributes;
    }
  }

  if (typeof input === 'string') {
    if (opts.decompress && isCompressedWebUri(input)) {
      input = decompressWebUri(input);
    }

    decode(result[model], input);
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

  result.toWebUriString = () => encode(result[model]);
  result.toCompressedWebUriString = () => compressWebUri(result.toWebUriString());
  result.toJsonString = () => JSON.stringify(result[model]);
  result.isValid = () => validateUrl(result.toWebUriString());
  result.getValidationTrace = () => getTrace(result.toWebUriString());

  return result;
};

/**
 * Test a single parser rule for a given value, such as a GTIN.
 * Available rules are found in `Rules` object of this library.
 *
 * @param {string} rule - A rule from the `Rules` object.
 * @param {string} value - The value to validate.
 * @returns {boolean} true if the value passes against the rule.
 */
const testRule = (rule, value) => {
  if (!Object.keys(Rules).some(p => Rules[p] === rule)) {
    throw new Error(`Invalid rule: ${rule}`);
  }

  return validateRule(rule, value);
};

module.exports = {
  DigitalLink,
  Utils: {
    Rules,
    testRule,
    generateStatsHtml,
    generateTraceHtml,
    generateResultsHtml,
    compressWebUri,
    decompressWebUri,
    isCompressedWebUri,
  },
};
