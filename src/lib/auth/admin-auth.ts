import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import Admin from '@/lib/models/Admin';
import dbConnect from '@/lib/mongoose';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-change-in-production';

export interface AdminAuthResult {
  success: boolean;
  admin?: any;
  error?: string;
}

export async function verifyAdmin(request: NextRequest): Promise<AdminAuthResult> {
  try {
    await dbConnect();

    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { success: false, error: 'No authorization token provided' };
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;

      const admin = await Admin.findById(decoded.adminId);
      if (!admin || !admin.isActive) {
        return { success: false, error: 'Admin not found or inactive' };
      }

      // Serialize the admin object to remove MongoDB-specific methods
      const serializedAdmin = {
        _id: admin._id.toString(),
        email: admin.email,
        name: admin.name,
        role: admin.role,
        isActive: admin.isActive,
        invitedBy: admin.invitedBy,
        invitationToken: admin.invitationToken,
        invitationExpires: admin.invitationExpires,
        createdAt: admin.createdAt,
        updatedAt: admin.updatedAt,
        lastLogin: admin.lastLogin,
      };

      return { success: true, admin: serializedAdmin };
    } catch (jwtError) {
      return { success: false, error: 'Invalid or expired token' };
    }
  } catch (error) {
    console.error('Error verifying admin:', error);
    return { success: false, error: 'Authentication error' };
  }
}

export async function authenticateAdmin(email: string, password: string): Promise<AdminAuthResult> {
  try {
    await dbConnect();

    // Special case for system admin
    console.log('Checking system admin:', email, 'vs', process.env.SYSTEM_ADMIN_EMAIL);
    if (email === process.env.SYSTEM_ADMIN_EMAIL) {
      console.log('Email matches, checking password');
      if (password === process.env.SYSTEM_ADMIN_PASSWORD) {
        // Check if system admin exists, if not create it
        let systemAdmin = await Admin.findOne({ email: process.env.SYSTEM_ADMIN_EMAIL });

        if (!systemAdmin) {
          systemAdmin = await Admin.create({
            email: process.env.SYSTEM_ADMIN_EMAIL,
            name: 'System Administrator',
            password: await hashPassword(process.env.SYSTEM_ADMIN_PASSWORD!),
            role: 'system_admin',
            isActive: true
          });
        }

        // Serialize the admin object
        const serializedSystemAdmin = {
          _id: systemAdmin._id.toString(),
          email: systemAdmin.email,
          name: systemAdmin.name,
          role: systemAdmin.role,
          isActive: systemAdmin.isActive,
          invitedBy: systemAdmin.invitedBy,
          invitationToken: systemAdmin.invitationToken,
          invitationExpires: systemAdmin.invitationExpires,
          createdAt: systemAdmin.createdAt,
          updatedAt: systemAdmin.updatedAt,
          lastLogin: systemAdmin.lastLogin,
        };

        return { success: true, admin: serializedSystemAdmin };
      }
      return { success: false, error: 'Invalid credentials' };
    }

    // Regular admin authentication
    const admin = await Admin.findOne({ email: email.toLowerCase(), isActive: true });
    if (!admin) {
      return { success: false, error: 'Admin not found' };
    }

    const isValidPassword = await verifyPassword(password, admin.password);
    if (!isValidPassword) {
      return { success: false, error: 'Invalid credentials' };
    }

    // Update last login
    await Admin.findByIdAndUpdate(admin._id, { lastLogin: new Date() });

    // Serialize the admin object
    const serializedAdmin = {
      _id: admin._id.toString(),
      email: admin.email,
      name: admin.name,
      role: admin.role,
      isActive: admin.isActive,
      invitedBy: admin.invitedBy,
      invitationToken: admin.invitationToken,
      invitationExpires: admin.invitationExpires,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt,
      lastLogin: admin.lastLogin,
    };

    return { success: true, admin: serializedAdmin };
  } catch (error) {
    console.error('Error authenticating admin:', error);
    return { success: false, error: 'Authentication error' };
  }
}

export function generateAdminToken(adminId: string, role?: string): string {
  return jwt.sign(
    { adminId, type: 'admin', role: role || 'admin' },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

export async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import('bcrypt');
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  const bcrypt = await import('bcrypt');
  return bcrypt.compare(password, hashedPassword);
}

export function canInviteAdmins(adminRole: string): boolean {
  return adminRole === 'system_admin' || adminRole === 'super_admin';
}

export function canManageAdmins(adminRole: string): boolean {
  return adminRole === 'system_admin' || adminRole === 'super_admin';
}

export function canSetSuperAdmin(adminRole: string): boolean {
  return adminRole === 'system_admin';
}

export function canRemoveSuperAdmin(adminRole: string): boolean {
  return adminRole === 'system_admin';
}

export function canDemoteSuperAdmin(adminRole: string): boolean {
  return adminRole === 'system_admin';
}

export function canDeleteAdmin(currentAdminRole: string, targetAdminRole: string): boolean {
  // System admin can delete anyone
  if (currentAdminRole === 'system_admin') {
    return true;
  }

  // Super admin can only delete regular admins
  if (currentAdminRole === 'super_admin') {
    return targetAdminRole === 'admin';
  }

  // Regular admins cannot delete anyone
  return false;
}

export function canPromoteToSuperAdmin(currentAdminRole: string): boolean {
  return currentAdminRole === 'system_admin';
}

export function canDemoteFromSuperAdmin(currentAdminRole: string): boolean {
  return currentAdminRole === 'system_admin';
}

export function canManageSpecificAdmin(currentAdmin: any, targetAdminId: string, targetAdminRole: string): boolean {
  // Cannot manage yourself
  if (currentAdmin._id.toString() === targetAdminId) {
    return false;
  }

  // System admin can manage anyone (except themselves, handled above)
  if (currentAdmin.role === 'system_admin') {
    return true;
  }

  // Super admin can only manage regular admins
  if (currentAdmin.role === 'super_admin') {
    return targetAdminRole === 'admin';
  }

  // Regular admins cannot manage anyone
  return false;
}