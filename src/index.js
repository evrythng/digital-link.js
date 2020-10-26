'use strict';

const IDENTIFIER_LIST = require('./data/identifier-list.json');
const {
  addQueryParams,
  assertPropertyType,
  assertStringPair,
  assignStringPair,
  validateUrl,
  validateRule,
  getTrace,
  generateStatsHtml,
  generateTraceHtml,
  generateResultsHtml,
  getIdentifierIndex,
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

  // http(s)://domain.xyz
  dl.domain = str.substring(0, str.indexOf('/', str.indexOf('://') + 3));
  str = str.substring(dl.domain.length);

  // without this, https://example.com//01/01234567/ is considered as a valid DL
  if (str.includes('//')) {
    throw new Error("String can't contains // (except for 'http(s)://')");
  }

  // /first/identifier
  const segments = (str.includes('?') ? str.substring(0, str.indexOf('?')) : str)
    .split('/')
    .filter(p => p.length);

  // let's find the identifier to know where the domain stops and where are the keyQualifiers

  const endPath = [];
  const afterIdentifier = [];
  const indexIdentifier = getIdentifierIndex(segments);

  if (indexIdentifier === -1) {
    throw new Error('Must contain at least the identifier');
  } else {
    for (let i = 0; i < indexIdentifier; i += 1) {
      endPath.push(segments[i]);
    }

    dl.identifier[segments[indexIdentifier]] = segments[indexIdentifier + 1];

    for (let i = indexIdentifier + 2; i < segments.length; i += 1) {
      afterIdentifier.push(segments[i]);
    }
  }

  if (endPath.length) dl.domain = `${dl.domain}/${endPath.join('/')}`;

  // /x/y until query
  while (afterIdentifier.length) {
    const key = afterIdentifier.shift();
    dl.keyQualifiers[key] = afterIdentifier.shift();
    dl.keyQualifiersOrder.push(key);
  }

  // ?x=y...
  if (str.includes('?')) {
    str
      .substring(str.indexOf('?') + 1)
      .split('&')
      .forEach(pair => {
        const [key, value] = pair.split('=');
        dl.attributes[key] = value;
      });
  }
};

/**
 * Extract from idenfier-list.json the list of key Qualifiers and their 'weight' according to their order.
 *
 * @param {string} identifierCode - The identifier of the digital link
 * @returns {Map} A map that contains all the possible key qualifiers and their weights. Example : { '10': 1, '21': 0, '22': 2, cpv: 0, lot: 1, ser: 2 }
 */
const getKeyQualifierWeights = identifierCode => {
  try {
    const identifier = IDENTIFIER_LIST.find(item => item.code === identifierCode);

    const keyQualifiersWeight = new Map();

    for (let i = 0; i < identifier.keyQualifiers.length; i += 1)
      keyQualifiersWeight[identifier.keyQualifiers[i]] = i;

    for (let i = 0; i < identifier.keyQualifiersName.length; i += 1)
      keyQualifiersWeight[identifier.keyQualifiersName[i]] = i;

    return keyQualifiersWeight;
  } catch (e) {
    return {};
  }
};

/**
 * Concatenate all the DigitalLink's properties into a GS1 Digital Link string.
 *
 * @param {object} dl - The DigitalLink (this).
 * @returns {string} The Digital Link in string form.
 */
const encode = dl => {
  let result = dl.domain;

  // Identifier
  const idKey = Object.keys(dl.identifier)[0];
  result += `/${idKey}/${dl.identifier[idKey]}`;

  // Key qualifiers
  if (dl.keyQualifiers) {
    if (dl.sortKeyQualifiers) {
      const keyQualifiersWeight = getKeyQualifierWeights(idKey);
      // The key qualifiers have to be added in a special order so I need to sort them and then add them to the string
      Object.keys(dl.keyQualifiers)
        .sort((a, b) => {
          return keyQualifiersWeight[a] - keyQualifiersWeight[b];
        })
        .forEach(key => {
          result += `/${key}/${dl.keyQualifiers[key]}`;
        });
    } else {
      Object.entries(dl.keyQualifiersOrder).forEach(entry => {
        // eslint-disable-next-line no-unused-vars
        const [index, value] = entry;
        result += `/${value}/${dl.keyQualifiers[value]}`;
      });
    }
  }

  // Data Attributes
  if (Object.keys(dl.attributes).length) {
    result = addQueryParams(`${result}?`, dl.attributes);
  }

  return result;
};

/**
 *
 * @param {string} webUriString - the webUriString of the DL that has to be validated
 * @param {string} domain - the domain of the DL that has to be validated
 * @returns {boolean} if the DL is valid or not
 */
const isValid = (webUriString, domain) => {
  // If my DL is something like this : https://example.com/my/custom/path/01/01234567890128/21/12345/10/4512
  // I need to send this to the validateURL function : https://example.com/01/01234567890128/21/12345/10/4512
  // Otherwise, the DL will never be validated since the custom path (/my/custom/path) is not handled by the grammar file.
  const domainWithoutProtocol = domain.replace('https://', '').replace('http://', '');

  const splitDomain = domainWithoutProtocol.split('/');

  if (splitDomain.length > 1) {
    // It has a custom path
    splitDomain.shift(); // [ 'my', 'custom', 'path' ]
    const customPath = `/${splitDomain.join('/')}`; // /my/custom/path
    return validateUrl(webUriString.replace(customPath, ''));
  }

  // It doesn't have a custom path
  return validateUrl(webUriString);
};

/**
 * Construct a DigitalLink either from object params, a string, or built using
 * the available setters.
 *
 * @param {(object|string)} [input] - Optional input construction object or string.
 * @returns {object} The DigitalLink instance with populated data.
 */
const DigitalLink = input => {
  // Model should only be manipulated through getters and setters to ensure types are correct
  const model = Symbol('model');
  const result = {
    [model]: {
      domain: '',
      identifier: {},
      keyQualifiers: {},
      attributes: {},
      sortKeyQualifiers: false,
      keyQualifiersOrder: [],
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
      Object.keys(input.keyQualifiers).forEach(key => {
        result[model].keyQualifiersOrder.push(key);
      });
    }

    if (input.attributes) {
      assertPropertyType(input, 'attributes', 'object');
      result[model].attributes = input.attributes;
    }
  }

  if (typeof input === 'string') {
    decode(result[model], isCompressedWebUri(input) ? decompressWebUri(input) : input);
  }

  result.setDomain = domain => {
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
    result[model].keyQualifiersOrder.push(key);
    return result;
  };

  result.setAttribute = (key, value) => {
    assignStringPair(result[model], 'attributes', key, value);
    return result;
  };

  result.setSortKeyQualifiers = value => {
    if (typeof value !== 'boolean') {
      throw new Error('SortKeyQualifiers must be a boolean');
    }

    result[model].sortKeyQualifiers = value;
    return result;
  };

  result.getDomain = () => result[model].domain;
  result.getIdentifier = () => result[model].identifier;
  result.getKeyQualifier = key => result[model].keyQualifiers[key];
  result.getKeyQualifiers = () => result[model].keyQualifiers;
  result.getAttribute = key => result[model].attributes[key];
  result.getAttributes = () => result[model].attributes;
  result.getSortKeyQualifiers = () => result[model].sortKeyQualifiers;

  result.toWebUriString = () => encode(result[model]);
  result.toCompressedWebUriString = () => compressWebUri(result.toWebUriString());
  result.toJsonString = () => JSON.stringify(result[model]);
  result.isValid = () => isValid(result.toWebUriString(), result.getDomain());
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
    getIdentifierIndex,
  },
};
