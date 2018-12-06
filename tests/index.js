const { expect } = require('chai');
const DigitalLink = require('../');

const DATA = {
  domain: 'https://gs1.evrythng.com',
  identifier: {
    key: '01',
    value: '9780345418913',
  },
  serialQualifier: {
    key: '21',
    value: '58943',
  },
  batchQualifier: {
    key: '10',
    value: '38737643',
  },
  bestBeforeAttribute: {
    key: '15',
    value: '230911',
  },
  customAttribute: {
    key: 'thngId',
    value: 'U5mQKGDpnymBwQwRakyBqeYh',
  },
  result: 'https://gs1.evrythng.com/01/9780345418913/10/38737643/21/58943?15=230911&thngId=U5mQKGDpnymBwQwRakyBqeYh',
};

const createSetterDL = () => {
  const dl = new DigitalLink();
  dl.setDomain(DATA.domain);
  dl.setIdentifier(DATA.identifier.key, DATA.identifier.value);
  dl.setKeyQualifier(DATA.serialQualifier.key, DATA.serialQualifier.value);
  dl.setKeyQualifier(DATA.batchQualifier.key, DATA.batchQualifier.value);
  dl.setAttribute(DATA.bestBeforeAttribute.key, DATA.bestBeforeAttribute.value);
  dl.setAttribute(DATA.customAttribute.key, DATA.customAttribute.value);
  return dl;
};

const createObjectDL = () => new DigitalLink({
  domain: DATA.domain,
  identifier: { [DATA.identifier.key]: DATA.identifier.value },
  keyQualifiers: {
    [DATA.batchQualifier.key]: DATA.batchQualifier.value,
    [DATA.serialQualifier.key]: DATA.serialQualifier.value,
  },
  attributes: {
    [DATA.bestBeforeAttribute.key]: DATA.bestBeforeAttribute.value,
    [DATA.customAttribute.key]: DATA.customAttribute.value,
  },
});

const createStringDL = () => new DigitalLink(DATA.result);

const createChainedDL = () => new DigitalLink()
  .setDomain(DATA.domain)
  .setIdentifier(DATA.identifier.key, DATA.identifier.value)
  .setKeyQualifier(DATA.serialQualifier.key, DATA.serialQualifier.value)
  .setKeyQualifier(DATA.batchQualifier.key, DATA.batchQualifier.value)
  .setAttribute(DATA.bestBeforeAttribute.key, DATA.bestBeforeAttribute.value)
  .setAttribute(DATA.customAttribute.key, DATA.customAttribute.value);

describe('DigitalLink', () => {
  describe('Exports', () => {
    it('should export a constructor function', () => {
      expect(DigitalLink).to.be.a('function');
      expect(() => new DigitalLink()).to.not.throw();
    });
  });

  describe('Construction', () => {
    it('should construct using setters', () => {
      expect(createSetterDL).to.not.throw();
    });

    it('should construct from an options object', () => {
      expect(createObjectDL).to.not.throw();
    });

    it('should construct from a valid input URL', () => {
      expect(createStringDL).to.not.throw();
    });

    it('should construct using chained setters', () => {
      expect(createChainedDL).to.not.throw();
    });

    it('should throw for a missing protocol', () => {
      expect(() => new DigitalLink('badurl')).to.throw();
    });

    it('should throw for missing identifier (object)', () => {
      const construct = () => {
        new DigitalLink({
          keyQualifiers: {
            [DATA.batchQualifier.key]: DATA.batchQualifier.value,
            [DATA.serialQualifier.key]: DATA.serialQualifier.value,
          },
        });
      };

      expect(construct).to.throw();
    });

    it('should throw for missing identifier (string)', () => {
      expect(() => new DigitalLink(DATA.domain)).to.throw();
    });

    it('should generate the correct full string', () => {
      expect(createSetterDL().toString()).to.equal(DATA.result);
    });

    it('should build from string - domain + identifier', () => {
      const dl = new DigitalLink('https://gs1.evrythng.com/01/9780345418913');

      expect(dl.getDomain()).to.equal(DATA.domain);
      expect(dl.getIdentifier()).to.deep.equal({ '01': '9780345418913' });
    });

    it('should build from string - domain + identifier + 1 key qualifier', () => {
      const dl = new DigitalLink('https://gs1.evrythng.com/01/9780345418913/10/38737643');

      expect(dl.getDomain()).to.equal(DATA.domain);
      expect(dl.getIdentifier()).to.deep.equal({ '01': '9780345418913' });
      expect(dl.getKeyQualifier('10')).to.equal('38737643');
    });

    it('should produce the same regardless of construction method', () => {
      const setterDl = createSetterDL();
      expect(setterDl.toString()).to.equal(createObjectDL().toString());
      expect(setterDl.toString()).to.equal(createStringDL().toString());
    });
  });

  describe('Getters', () => {
    it('should return the domain', () => {
      expect(createSetterDL().getDomain()).to.equal(DATA.domain);
    });

    it('should return the identifier', () => {
      const identifier = createSetterDL().getIdentifier();
      const [idKey] = Object.keys(identifier);
      
      expect(idKey).to.equal(DATA.identifier.key);
      expect(identifier[idKey]).to.equal(DATA.identifier.value);
    });

    it('should return the key qualifier', () => {
      const value = createSetterDL().getKeyQualifier(DATA.batchQualifier.key);
      
      expect(value).to.equal(DATA.batchQualifier.value);
    });

    it('should return all key qualifiers', () => {
      const value = createSetterDL().getKeyQualifiers();
      const expected = {
        [DATA.serialQualifier.key]: DATA.serialQualifier.value,
        [DATA.batchQualifier.key]: DATA.batchQualifier.value,
      };
      
      expect(value).to.deep.equal(expected);
    });

    it('should return the attributes', () => {
      const setterDl = createSetterDL();

      let value = setterDl.getAttribute(DATA.bestBeforeAttribute.key);
      expect(value).to.equal(DATA.bestBeforeAttribute.value);
      
      value = setterDl.getAttribute(DATA.customAttribute.key);
      expect(value).to.equal(DATA.customAttribute.value);
    });

    it('should return all attributes', () => {
      const value = createSetterDL().getAttributes();
      const expected = {
        [DATA.bestBeforeAttribute.key]: DATA.bestBeforeAttribute.value,
        [DATA.customAttribute.key]: DATA.customAttribute.value,
      };
      
      expect(value).to.deep.equal(expected);
    });
  });

  describe('Validation', () => {
    it('should validate using the grammar', () => {
      expect(createSetterDL().isValid()).to.equal(true);
    });
  });
});
