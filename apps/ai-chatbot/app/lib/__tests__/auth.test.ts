import {
  createSessionToken,
  hashPassword,
  validateLoginInput,
  validateRegisterInput,
  verifyPassword,
  verifySessionToken,
} from '../auth';

describe('auth helpers', () => {
  describe('hashPassword / verifyPassword', () => {
    it('hashes and verifies a password', async () => {
      const hash = await hashPassword('secret123');
      expect(hash).toContain(':');
      await expect(verifyPassword('secret123', hash)).resolves.toBe(true);
      await expect(verifyPassword('wrong', hash)).resolves.toBe(false);
    });
  });

  describe('session token', () => {
    it('creates and verifies a token', () => {
      const token = createSessionToken('user-1');
      expect(verifySessionToken(token)).toBe('user-1');
      expect(verifySessionToken('user-1.deadbeef')).toBeNull();
      expect(verifySessionToken('invalid')).toBeNull();
    });
  });

  describe('validateRegisterInput', () => {
    it('accepts valid input', () => {
      expect(
        validateRegisterInput({
          name: 'Alice',
          email: 'alice@example.com',
          password: 'password1',
        }),
      ).toBeNull();
    });

    it('rejects short password', () => {
      expect(
        validateRegisterInput({
          name: 'Alice',
          email: 'alice@example.com',
          password: 'short',
        }),
      ).toMatch(/password/);
    });

    it('rejects invalid email', () => {
      expect(
        validateRegisterInput({
          name: 'Alice',
          email: 'not-an-email',
          password: 'password1',
        }),
      ).toMatch(/email/);
    });
  });

  describe('validateLoginInput', () => {
    it('requires email and password', () => {
      expect(validateLoginInput({})).toMatch(/email/);
      expect(validateLoginInput({ email: 'a@b.com', password: '' })).toMatch(
        /password/,
      );
    });
  });
});
