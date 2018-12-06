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
 * Get the top-level parser rule for the input string.
 *
 * @param {string} str - The input string.
 * @returns {string} Either canonicalGS1webURI or customGS1webURI depending on format.
 */
const getStartRule = str => str.includes('id.gs1.org') ? 'canonicalGS1webURI' : 'customGS1webURI';

/**
 * Run the apglib parser over the Digital Link string.
 *
 * @param {string} inputStr - The DigitalLink as a string.
 * @returns {boolean} true if the parser returns 'success', false otherwise.
 */
const validate = (inputStr) => {
  const startRule = getStartRule(inputStr);
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

/**
 * Extract text between two markers using a regex.
 *
 * @param {string} str - String to search.
 * @param {string} start - String immediately before the output.
 * @param {string} end - String immediately after the output.
 * @returns {string} String contained between start and end.
 */
const between = (str, start, end) => {
  let matches = str.match(`(?<=${start})(.*?)(?=${end})`);
  return matches ? matches[0] : '';
};

/**
 * Get a validation trace showing which parts of the input matched which rules.
 * If the last item has a remainder, that is the part that didn't match.
 *
 * @param {string} inputStr - The input string.
 * @returns {object[]} Array of objects describing the validation trace.
 */
const getTrace = (inputStr) => {
  const parser = new apglib.parser();
  parser.trace = new apglib.trace();

  const result = parser.parse(GRAMMAR, getStartRule(inputStr), apglib.utils.stringToChars(inputStr), []);
  const traceHtml = parser.trace.toHtmlPage('ascii', 'Parsing details:')
    .replace('display mode: ASCII', '');
  const rows = traceHtml.substring(traceHtml.indexOf('<table '), traceHtml.indexOf('</table>'))
    .split('<tr>')
    .filter(item => item.includes('&uarr;M'));
  const trace = rows.filter(row => row.includes('apg-match'))
    .map((row) => {
      const rule = row.match(/((?<=\()(.*?)(?=\)))/)[0];
      const sample = row.substring(row.indexOf(')'));
      const match = between(sample, 'match">', '<');
      const remainder = between(sample, 'remainder">', '<');
      return { rule, match, remainder };
    })
    .filter(item => item.match.length > 1);
  return { trace, success: result.success };
};

module.exports = {
  addQueryParams,
  assertPropertyType,
  assertStringPair,
  assignStringPair,
  validate,
  getTrace,
};
