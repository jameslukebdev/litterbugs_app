import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const source = readFileSync(
  new URL('../CleanupSubmissionScreen.js', import.meta.url),
  'utf8',
);

describe('cleanup submission keyboard behavior', () => {
  it('reveals focused cleanup fields above the keyboard', () => {
    expect(source).toContain('const submissionScrollRef = useRef(null);');
    expect(source).toContain('const submissionScrollOffsetRef = useRef(0);');
    expect(source).toContain('const keyboardFrame = Keyboard.metrics();');
    expect(source).toContain('const overlap = screenY + height + 16 - keyboardFrame.screenY;');
    expect(source).toContain('if (overlap <= 0) return;');
    expect(source).not.toContain('submissionScrollRef.current?.scrollToEnd');
    expect(source).not.toContain('scrollResponderScrollNativeHandleToKeyboard');
    expect(source).toContain('ref={submissionScrollRef}');
    expect(source).toContain('onFocus={() => revealCleanupEntryField(descriptionInputRef)}');
    expect(source).toContain("behavior={Platform.OS === 'ios' ? 'padding' : undefined}");
    expect(source).toContain('keyboardVerticalOffset={90}');
    expect(source).not.toContain('automaticallyAdjustKeyboardInsets');
  });

  it('does not add unnecessary space beneath the review button', () => {
    expect(source).toContain('paddingBottom: Math.max(insets.bottom, 16)');
    expect(source).not.toContain('paddingBottom: Math.max(insets.bottom, 24) + 24');
  });

  it('keeps the cleanup description multiline', () => {
    const descriptionInputStart = source.indexOf('accessibilityLabel="Cleanup description"');
    const descriptionInput = source.slice(descriptionInputStart - 500, descriptionInputStart + 100);

    expect(descriptionInputStart).toBeGreaterThan(-1);
    expect(descriptionInput).toContain('multiline');
    expect(descriptionInput).not.toContain('onSubmitEditing');
  });
});
