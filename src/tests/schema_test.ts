import * as assert from 'power-assert';

import schema from '../schema';

describe('schema', () => {
  it('exports all module elements', () => {
    assert(schema.modifyOptions);
    assert(schema.mutations);
    assert(schema.mutationText);
    assert(schema.queries);
    assert(schema.queryText);
    assert(schema.resolvers);
    assert(schema.schema);
  });
});
