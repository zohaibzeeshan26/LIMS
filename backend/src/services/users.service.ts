import bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from '../middlewares/error.middleware';

export interface CreateUserInput {
  fullName: string;
  email?: string;
  username?: string;
  employeeId: string;
  department: string;
  role: Role;
  assignedLab?: string | null;
  password: string;
  isActive?: boolean;
  mustChangePassword?: boolean;
}

export interface UpdateUserInput {
  fullName?: string;
  email?: string;
  username?: string;
  employeeId?: string;
  department?: string;
  role?: Role;
  assignedLab?: string | null;
  isActive?: boolean;
  mustChangePassword?: boolean;
  password?: string;
}

export class UsersService {
  async findAll() {
    return prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        employeeId: true,
        department: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        assignedLab: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            accessionedSamples: true,
            performedTests: true,
            calibrations: true,
          },
        },
      },
      orderBy: { fullName: 'asc' },
    });
  }

  async findOne(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        employeeId: true,
        department: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        assignedLab: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            accessionedSamples: true,
            performedTests: true,
            calibrations: true,
            submittedSamples: true,
            assignedSamples: true,
          },
        },
      },
    });

    if (!user) throw new AppError('User not found', 404);
    return user;
  }

  async create(data: CreateUserInput) {
    if (!data.fullName || !data.employeeId || !data.department || !data.role || !data.password) {
      throw new AppError('Full Name, Employee ID, Department, Role, and Password are required', 400);
    }

    if (data.password.length < 6) {
      throw new AppError('Password must be at least 6 characters long', 400);
    }

    const cleanEmployeeId = data.employeeId.trim().toUpperCase();
    const cleanUsername = data.username ? data.username.trim().toLowerCase() : null;

    let cleanEmail = data.email?.trim().toLowerCase();
    if (!cleanEmail) {
      const basePrefix = (cleanUsername || cleanEmployeeId || 'user')
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, '');
      cleanEmail = `${basePrefix}@citypharma.local`;
      let counter = 1;
      while (await prisma.user.findUnique({ where: { email: cleanEmail } })) {
        cleanEmail = `${basePrefix}${counter}@citypharma.local`;
        counter++;
      }
    } else {
      // Email uniqueness check
      const existingEmail = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });
      if (existingEmail) {
        throw new AppError(`User with email "${cleanEmail}" already exists`, 409);
      }
    }

    // Employee ID uniqueness check
    const existingEmployee = await prisma.user.findUnique({
      where: { employeeId: cleanEmployeeId },
    });
    if (existingEmployee) {
      throw new AppError(`User with Employee ID "${cleanEmployeeId}" already exists`, 409);
    }

    // Username uniqueness check if provided
    if (cleanUsername) {
      const existingUsername = await prisma.user.findUnique({
        where: { username: cleanUsername },
      });
      if (existingUsername) {
        throw new AppError(`User with username "${cleanUsername}" already exists`, 409);
      }
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const newUser = await prisma.user.create({
      data: {
        fullName: data.fullName.trim(),
        email: cleanEmail,
        username: cleanUsername,
        employeeId: cleanEmployeeId,
        department: data.department.trim(),
        role: data.role,
        assignedLab: data.assignedLab ? data.assignedLab.trim() : null,
        isActive: data.isActive !== undefined ? data.isActive : true,
        mustChangePassword: data.mustChangePassword !== undefined ? data.mustChangePassword : false,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        employeeId: true,
        department: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        assignedLab: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // 21 CFR Part 11 Audit Trail for User Creation
    const userIdentifier = newUser.username ? `@${newUser.username}` : newUser.employeeId;
    await prisma.auditTrail.create({
      data: {
        entityName: 'User',
        entityId: newUser.id,
        action: 'USER_CREATED',
        performedByName: 'Super Admin',
        role: 'SUPER_ADMIN',
        ipAddress: '127.0.0.1',
        reasonForChange: `Personnel ${newUser.fullName} (${userIdentifier}) provisioned with role ${newUser.role}`,
        diffPayload: JSON.stringify({
          eventType: 'USER_CREATED',
          details: `Provisioned staff user ${newUser.fullName} (${userIdentifier}) as ${newUser.role} in ${newUser.department}`,
          username: newUser.username,
          employeeId: newUser.employeeId,
          role: newUser.role,
          department: newUser.department,
        }),
      },
    }).catch(() => {});

    return newUser;
  }

  async update(id: string, data: UpdateUserInput) {
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new AppError('User not found', 404);
    }

    const updateData: any = {};

    if (data.fullName !== undefined) {
      updateData.fullName = data.fullName.trim();
    }

    if (data.email !== undefined) {
      const cleanEmail = data.email.trim().toLowerCase();
      if (cleanEmail !== existingUser.email) {
        const conflict = await prisma.user.findUnique({ where: { email: cleanEmail } });
        if (conflict) {
          throw new AppError(`Email "${cleanEmail}" is already assigned to another user`, 409);
        }
        updateData.email = cleanEmail;
      }
    }

    if (data.employeeId !== undefined) {
      const cleanEmployeeId = data.employeeId.trim().toUpperCase();
      if (cleanEmployeeId !== existingUser.employeeId) {
        const conflict = await prisma.user.findUnique({ where: { employeeId: cleanEmployeeId } });
        if (conflict) {
          throw new AppError(`Employee ID "${cleanEmployeeId}" is already assigned to another user`, 409);
        }
        updateData.employeeId = cleanEmployeeId;
      }
    }

    if (data.username !== undefined) {
      const cleanUsername = data.username ? data.username.trim().toLowerCase() : null;
      if (cleanUsername !== existingUser.username) {
        if (cleanUsername) {
          const conflict = await prisma.user.findUnique({ where: { username: cleanUsername } });
          if (conflict) {
            throw new AppError(`Username "${cleanUsername}" is already taken`, 409);
          }
        }
        updateData.username = cleanUsername;
      }
    }

    if (data.department !== undefined) {
      updateData.department = data.department.trim();
    }

    if (data.role !== undefined) {
      updateData.role = data.role;
    }

    if (data.assignedLab !== undefined) {
      updateData.assignedLab = data.assignedLab ? data.assignedLab.trim() : null;
    }

    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }

    if (data.mustChangePassword !== undefined) {
      updateData.mustChangePassword = data.mustChangePassword;
    }

    if (data.password && data.password.trim().length > 0) {
      if (data.password.trim().length < 6) {
        throw new AppError('Password must be at least 6 characters long', 400);
      }
      const salt = await bcrypt.genSalt(10);
      updateData.passwordHash = await bcrypt.hash(data.password.trim(), salt);
    }

    return prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        employeeId: true,
        department: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        assignedLab: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            accessionedSamples: true,
            performedTests: true,
            calibrations: true,
          },
        },
      },
    });
  }

  async updateRole(id: string, role: Role) {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('User not found', 404);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        employeeId: true,
        department: true,
        role: true,
        isActive: true,
        assignedLab: true,
        updatedAt: true,
      },
    });

    const userIdentifier = updated.username ? `@${updated.username}` : updated.employeeId;
    await prisma.auditTrail.create({
      data: {
        entityName: 'User',
        entityId: updated.id,
        action: 'USER_ROLE_UPDATED',
        performedByName: 'Super Admin',
        role: 'SUPER_ADMIN',
        ipAddress: '127.0.0.1',
        reasonForChange: `Role for ${updated.fullName} (${userIdentifier}) updated from ${existing.role} to ${role}`,
        diffPayload: JSON.stringify({
          eventType: 'USER_ROLE_UPDATED',
          details: `Role updated for ${updated.fullName} (${userIdentifier}): ${existing.role} → ${role}`,
          previousRole: existing.role,
          newRole: role,
        }),
      },
    }).catch(() => {});

    return updated;
  }

  async delete(id: string, requesterUserId?: string) {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('User not found', 404);
    }

    if (requesterUserId && id === requesterUserId) {
      throw new AppError('You cannot delete or deactivate your own account', 400);
    }

    try {
      await prisma.user.delete({
        where: { id },
      });

      return {
        success: true,
        deleted: true,
        deactivated: false,
        message: `User "${existing.fullName}" has been permanently deleted.`,
      };
    } catch (err: any) {
      // Prisma P2003: Foreign key constraint failure (e.g. historical tests, logs, or samples)
      if (err.code === 'P2003') {
        await prisma.user.update({
          where: { id },
          data: { isActive: false },
        });

        return {
          success: true,
          deleted: false,
          deactivated: true,
          message: `User "${existing.fullName}" possesses historical laboratory and audit trail records under 21 CFR Part 11 integrity rules. The account has been deactivated instead.`,
        };
      }
      throw err;
    }
  }
}

export const usersService = new UsersService();
