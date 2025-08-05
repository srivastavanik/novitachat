import { DecodedToken } from '../utils/jwt';

declare global {
  namespace Express {
    interface Request {
      user?: DecodedToken;
    }
  }
}

export {};
