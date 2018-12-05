const apglib = require('apg-lib');
const { grammarObject } = require('./grammar');

const GRAMMAR = new grammarObject();

/**
 * Add query param string pairs to the string result so far.
 *
 * @param {string} result - The DigitalLink string equivalent so far.
 * @param {object} attributes - Object of attributes, either GS1 or custom.
 * @returns {string} Reduced string containing the new attribute pairs.
 */
const addQueryParams = (result, attributes) => Object.keys(attributes).reduce((res, key) => {
  return res.concat(`${(res.endsWith('?') ? '' : '&')}${key}=${attributes[key]}`);
}, result);

/**
 * Run the apglib parser over the Digital Link string.
 *
 * @param {string} inputStr - The DigitalLink as a string.
 * @returns {boolean} true if the parser returns 'success', false otherwise.
 */
const validate = (inputStr) => {
  const startRule = inputStr.includes('id.gs1.org') ? 'canonicalGS1webURI' : 'customGS1webURI';
  const parser = new apglib.parser();
  const result = parser.parse(GRAMMAR, startRule, apglib.utils.stringToChars(inputStr), []);
  return result.success;
};

/**
 * Throw an error if key and value are not strings.
 *
 * @param {string} key - The key to check.
 * @param {string} value - The value to check.
 */
const assertStringPair = (key, value) => {
  if (typeof key !== 'string' || typeof value !== 'string') {
    throw new Error('key and value must be strings');
  }
};

/**
 * Throw an error if object property is not of a certain type.
 *
 * @param {object} dl - The DigitalLink.
 * @param {string} key - The key to check.
 * @param {string} type - The type to check key against.
 */
const assertPropertyType = (dl, key, type) => {
  if (!dl[key] || typeof dl[key] !== type) {
    throw new Error(`${key} must be ${type}`);
  }
};

/**
 * Type check and assign a key-value pair to the specified object.
 *
 * @param {object} dl - The DigitalLink.
 * @param {string} prop - Name of the DigitalLink property to modify.
 * @param {string} key - The key to assign.
 * @param {string} value - The value to assign to key.
 */
const assignStringPair = (dl, prop, key, value) => {
  assertStringPair(key, value);
  dl[prop][key] = value;
};

module.exports = {
  addQueryParams,
  assertPropertyType,
  assertStringPair,
  assignStringPair,
  validate,
};
