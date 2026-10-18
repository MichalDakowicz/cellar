import { manipulateAsync } from 'expo-image-manipulator';
import { launchImageLibraryAsync } from 'expo-image-picker';
import { pickPicture } from './pickPicture';
import { PICTURE_MAX_CHARS } from '@/lib/entryPicture';

jest.mock('expo-image-manipulator', () => ({ manipulateAsync: jest.fn(), SaveFormat: { PNG: 'png', JPEG: 'jpeg' } }));
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));
const manipulate = jest.mocked(manipulateAsync);
const pick = jest.mocked(launchImageLibraryAsync);
const output = (base64 = 'AAAA') => ({ uri: 'encoded', width: 1080, height: 2400, base64 });

beforeEach(() => {
  jest.resetAllMocks();
  pick.mockResolvedValue({ canceled: false, assets: [{ uri: 'original', width: 1080, height: 2400 }] });
});

it('preserves a screenshot as full-resolution PNG when it fits', async () => {
  manipulate.mockResolvedValue(output());
  const picture = await pickPicture();
  expect(picture?.data).toBe('data:image/png;base64,AAAA');
  expect(manipulate.mock.calls[0]).toEqual(['original', [], { compress: 1, format: 'png', base64: true }]);
  expect(manipulate).toHaveBeenCalledTimes(2);
});

it('tries high-quality JPEG from the original when PNG exceeds the budget', async () => {
  manipulate.mockResolvedValueOnce(output('A'.repeat(PICTURE_MAX_CHARS))).mockResolvedValue(output());
  const picture = await pickPicture();
  expect(picture?.data).toBe('data:image/jpeg;base64,AAAA');
  expect(manipulate.mock.calls[1]).toEqual(['original', [], { compress: 0.95, format: 'jpeg', base64: true }]);
  expect(manipulate).toHaveBeenCalledTimes(3);
});

it('returns null when the picker is canceled', async () => {
  pick.mockResolvedValue({ canceled: true, assets: null });
  expect(await pickPicture()).toBeNull();
  expect(manipulate).not.toHaveBeenCalled();
});
