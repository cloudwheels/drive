const Reference = require('../../../../lib/stateView/revisions/Reference');

describe('Reference', () => {
  let rawReference;
  let reference;

  beforeEach(() => {
    rawReference = {
      blockHash: 'b8ae412cdeeb4bb39ec496dec34495ecccaf74f9fa9eaa712c77a03eb1994e75',
      blockHeight: 1,
      stHash: '17jasdjk129uasd8asd023098SD09023jll123jlasd90823jklD',
      hash: '123981as90d01309ad09123',
    };

    reference = new Reference(rawReference);
  });

  describe('#toJSON', () => {
    it('should return Reference as a plain object', () => {
      const result = reference.toJSON();

      expect(result).to.deep.equal(rawReference);
    });
  });
});
