import assert from 'node:assert/strict';
import test from 'node:test';
import { appPlace } from '../src/shared/config/navigation';

test('workspace pages read their workspace, project and work item from the plural address (D-084)', () => {
  assert.deepEqual(appPlace('/workspaces'), { isWorkspaces: true });
  assert.deepEqual(appPlace('/workspaces/aB3dE6gH9j'), { workspaceId: 'aB3dE6gH9j', workspaceSection: '' });
  assert.deepEqual(appPlace('/workspaces/aB3dE6gH9j/projects'), { workspaceId: 'aB3dE6gH9j', workspaceSection: '/projects' });
  assert.deepEqual(appPlace('/workspaces/aB3dE6gH9j/projects/xY7zQ1wE2r/work-items/kL9mN0pQ1s/edit'),
    { workspaceId: 'aB3dE6gH9j', projectId: 'xY7zQ1wE2r', itemId: 'kL9mN0pQ1s', isEditing: true });
  assert.deepEqual(appPlace('/workspaces/aB3dE6gH9j/projects/xY7zQ1wE2r/documents'),
    { workspaceId: 'aB3dE6gH9j', projectId: 'xY7zQ1wE2r', projectSection: 'documents' });
  assert.deepEqual(appPlace('/workspaces/aB3dE6gH9j/documents/설계-kL9mN0pQ1s/edit'), { workspaceId: 'aB3dE6gH9j', workspaceSection: '/documents' });
  assert.deepEqual(appPlace('/workspaces/aB3dE6gH9j/settings/projects/xY7zQ1wE2r/general'),
    { workspaceId: 'aB3dE6gH9j', settingsProjectId: 'xY7zQ1wE2r', settings: '/general' });
});
