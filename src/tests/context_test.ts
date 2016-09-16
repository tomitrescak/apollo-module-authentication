import * as assert from 'power-assert';
import { wrapOptions } from '../context';

describe('context', () => {
  it('wraps user model into context', () => {
    const connection = {};
    const graphQLoptions = {};

    const result = wrapOptions(connection, graphQLoptions);
    assert(result().context.user, 'User was initialised');
  });
});
