import assert from 'node:assert/strict';
import test from 'node:test';
import { parseInboxSearch } from '../src/pages/workspace/inbox/model/search';
test('inbox addresses preserve a selected notice independently of its list page', () => {
  assert.deepEqual(parseInboxSearch({ notice: 'SJvoi0S3I0', filter: 'unread' }), { notice: 'SJvoi0S3I0', filter: 'unread' });
  assert.deepEqual(parseInboxSearch({ notice: '../other', project: 'EJM8AKkJqa', item: 'ueHioHy5Gd', filter: 'all' }), { notice: undefined, filter: undefined });
});
