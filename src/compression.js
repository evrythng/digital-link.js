const GS1DigitalLinkToolkit = require('../lib/GS1DigitalLinkToolkit');

const toolkit = new GS1DigitalLinkToolkit();

const getUriStem = uri => uri.split('/').slice(0, 3).join('/');

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

const decompressWebUri = (uri) => {
  const useShortText = true;

  return toolkit.decompressGS1DigitalLink(uri, useShortText, getUriStem(uri));
};

module.exports = {
  compressWebUri,
  decompressWebUri,
};
