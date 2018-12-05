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

describe('DigitalLink', () => {
  let dl1, dl2, dl3;

  describe('Exports', () => {
    it('should export a constructor function', () => {
      expect(DigitalLink).to.be.a('function');

      const construct = () => new DigitalLink();
      expect(construct).to.not.throw();
    });
  });

  describe('Construction', () => {
    it('should construct using setters', () => {
      const construct = () => {
        dl1 = new DigitalLink();
        dl1.setDomain(DATA.domain);
        dl1.setIdentifier(DATA.identifier.key, DATA.identifier.value);
        dl1.setKeyQualifier(DATA.serialQualifier.key, DATA.serialQualifier.value);
        dl1.setKeyQualifier(DATA.batchQualifier.key, DATA.batchQualifier.value);
        dl1.setAttribute(DATA.bestBeforeAttribute.key, DATA.bestBeforeAttribute.value);
        dl1.setAttribute(DATA.customAttribute.key, DATA.customAttribute.value);
      };

      expect(construct).to.not.throw();
    });

    it('should construct from an options object', () => {
      const construct = () => {
        dl2 = new DigitalLink({
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
      };

      expect(construct).to.not.throw();
    });

    it('should construct from a valid input URL', () => {
      const construct = () => {
        dl3 = new DigitalLink(DATA.result);
      };

      expect(construct).to.not.throw();
    });

    it('should throw for a missing protocol', () => {
      const construct = () => new DigitalLink('badurl');

      expect(construct).to.throw();
    });

    it('should throw for missing domain or identifier', () => {
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

    it('should produce the correct full string', () => {
      expect(dl1.toString()).to.equal(DATA.result);
    });

    it('should produce the same regardless of construction method', () => {
      expect(dl1.toString()).to.equal(dl2.toString());
      expect(dl1.toString()).to.equal(dl3.toString());
    });
  });

  describe('Getters', () => {
    it('should return the domain', () => {
      expect(dl1.getDomain()).to.equal(DATA.domain);
    });

    it('should return the identifier', () => {
      const identifier = dl1.getIdentifier();
      const [idKey] = Object.keys(identifier);
      
      expect(idKey).to.equal(DATA.identifier.key);
      expect(identifier[idKey]).to.equal(DATA.identifier.value);
    });

    it('should return the key qualifiers', () => {
      const value = dl1.getKeyQualifier(DATA.batchQualifier.key);
      
      expect(value).to.equal(DATA.batchQualifier.value);
    });

    it('should return the attributes', () => {
      let value = dl1.getAttribute(DATA.bestBeforeAttribute.key);
      expect(value).to.equal(DATA.bestBeforeAttribute.value);
      value = dl1.getAttribute(DATA.customAttribute.key);
      expect(value).to.equal(DATA.customAttribute.value);
    });
  });

  describe('Validation', () => {
    it('should validate using the grammar', () => {
      expect(dl1.isValid()).to.equal(true);
    });
  });
});
