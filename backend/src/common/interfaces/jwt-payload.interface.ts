import { Role } from '@prisma/client';

export interface JwtPayload {
  sub: string;       // user id
  email: string;
  roles: Role[];
  pageAccess: string[] | null;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  roles: Role[];
  pageAccess: string[] | null;
}
