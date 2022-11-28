import { xmlToJXml } from '../../src/utils/xmlHelper';

describe('xmlHelper', () => {
  it('xmlToJXml', () => {
    expect(xmlToJXml('<demo />')).toBe({ name: 'demo', attr: {}, vals: [] });
  });
});
