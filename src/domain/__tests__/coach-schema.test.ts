import { parseCoachResponse } from '../coach-schema';

const ids = ['sketching', 'journaling', 'rhythm', 'stretching'];
const good = {
  suggestions: [
    { hobbyId: 'sketching', reason: 'Fits.', starterTask: 'Draw a cup', steps: ['Look', 'Draw'] },
    { hobbyId: 'journaling', reason: 'Fits.', starterTask: 'Write a page', steps: ['Write'] },
    { hobbyId: 'rhythm', reason: 'Fits.', starterTask: 'Clap', steps: ['Clap'] },
  ],
};

test('accepts three valid, distinct suggestions', () => {
  expect(parseCoachResponse(good, ids)).toHaveLength(3);
});

test.each([
  ['not an object', 'oops'],
  ['two suggestions', { suggestions: good.suggestions.slice(0, 2) }],
  ['unknown hobby id', { suggestions: [{ ...good.suggestions[0], hobbyId: 'skydiving' }, ...good.suggestions.slice(1)] }],
  ['duplicate id', { suggestions: [good.suggestions[0], good.suggestions[0], good.suggestions[2]] }],
  ['empty reason', { suggestions: [{ ...good.suggestions[0], reason: ' ' }, ...good.suggestions.slice(1)] }],
  ['too many steps', { suggestions: [{ ...good.suggestions[0], steps: ['a', 'b', 'c', 'd', 'e', 'f'] }, ...good.suggestions.slice(1)] }],
  ['overlong text', { suggestions: [{ ...good.suggestions[0], reason: 'x'.repeat(281) }, ...good.suggestions.slice(1)] }],
])('rejects %s', (_, data) => {
  expect(parseCoachResponse(data, ids)).toBeNull();
});

