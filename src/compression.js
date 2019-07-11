const GS1DigitalLinkToolkit = require('../lib/GS1DigitalLinkToolkit');

const toolkit = new GS1DigitalLinkToolkit();

/**
 * Get the stem of a URI.
 *
 * @param {string} uri - The URI.
 * @returns {string} The URI stem.
 */
const getUriStem = uri => uri.split('/').slice(0, 3).join('/');

/**
 * Use GS1DigitalLinkToolkit to compress a URI string.
 *
 * @param {string} uri - The URI to compress.
 * @returns {string} The equivalent compressed URI.
 */
const compressWebUri = (uri) => {
  const useShortText = true;
  const uncompressedPrimary = false;
  const useOptimisations = true;
  const compressOtherKeyValuePairs = true;

  return toolkit.compressGS1DigitalLink(
    uri,
    useShortText,
    getUriStem(uri),
    uncompressedPrimary,
    useOptimisations,
    compressOtherKeyValuePairs
  );
};

/**
 * Use GS1DigitalLinkToolkit to decompress a URI string.
 *
 * @param {string} uri - The URI to decompress.
 * @param {boolean} [useShortText] - Set to true to use short AI names, eg. 'gtin' instead of '01'.
 * @returns {string} The equivalent decompressed URI.
 */
const decompressWebUri = (uri, useShortText = false) =>
  toolkit.decompressGS1DigitalLink(uri, useShortText, getUriStem(uri));

/**
 * Detect whether a URI string is compressed or not.
 *
 * @param {string} uri - The URI.
 * @returns {boolean} true if the URI is compressed, false otherwise.
 */
const isCompressedWebUri = (uri) => {
  const data = toolkit.analyseURI(uri);
  return ['fully', 'partially'].some(p => data.detected.includes(p));
};

module.exports = {
  compressWebUri,
  decompressWebUri,
  isCompressedWebUri,
};
