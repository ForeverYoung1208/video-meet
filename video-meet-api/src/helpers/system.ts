import * as bcrypt from 'bcryptjs';

export const encodePassword = async (passwordRaw: string): Promise<string> => {
  const b = process.env['BCRYPT_SALT_ROUNDS'];
  const salt = await bcrypt.genSalt(Number(b));
  return await bcrypt.hash(passwordRaw, salt);
};

export const checkPassword = async (
  password: string,
  hashedPassword: string,
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};
