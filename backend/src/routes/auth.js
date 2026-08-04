import { Router } from 'express';
import * as userRepository from '../repositories/userRepository.js';
import { comparePassword } from '../utils/password.js';
import { signUserToken } from '../utils/jwt.js';

const router = Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      return res.status(422).json({
        error: 'validation_error',
        message: 'Email and password are required and must be strings',
      });
    }

    const user = await userRepository.findByEmail(email);

    if (!user) {
      return res.status(401).json({
        error: 'invalid_credentials',
        message: 'Invalid email or password',
      });
    }

    const isPasswordValid = await comparePassword(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'invalid_credentials',
        message: 'Invalid email or password',
      });
    }

    const token = signUserToken({ sub: user.id, role: user.role });

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[Auth Route Error]', error);
    return res.status(500).json({
      error: 'internal_error',
      message: 'An unexpected error occurred during login',
    });
  }
});

export default router;
