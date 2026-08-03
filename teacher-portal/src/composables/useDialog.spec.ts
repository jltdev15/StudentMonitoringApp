import {useDialog} from './useDialog';

describe('useDialog', () => {
  it('opens and closes typed dialogs', () => {
    const dialog = useDialog<'delete'>();
    dialog.open('delete');
    expect(dialog.activeDialog.value).toBe('delete');
    dialog.close();
    expect(dialog.activeDialog.value).toBeNull();
  });
});
