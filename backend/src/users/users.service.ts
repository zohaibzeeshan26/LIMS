import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
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
    const user = await this.prisma.user.findUnique({
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

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(data: {
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
  }) {
    if (!data.fullName || !data.employeeId || !data.department || !data.role || !data.password) {
      throw new BadRequestException('Full Name, Employee ID, Department, Role, and Password are required');
    }

    if (data.password.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters long');
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
      while (await this.prisma.user.findUnique({ where: { email: cleanEmail } })) {
        cleanEmail = `${basePrefix}${counter}@citypharma.local`;
        counter++;
      }
    } else {
      const existingEmail = await this.prisma.user.findUnique({ where: { email: cleanEmail } });
      if (existingEmail) throw new ConflictException(`User with email "${cleanEmail}" already exists`);
    }

    const existingEmp = await this.prisma.user.findUnique({ where: { employeeId: cleanEmployeeId } });
    if (existingEmp) throw new ConflictException(`User with Employee ID "${cleanEmployeeId}" already exists`);

    if (cleanUsername) {
      const existingUser = await this.prisma.user.findUnique({ where: { username: cleanUsername } });
      if (existingUser) throw new ConflictException(`User with username "${cleanUsername}" already exists`);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const createdUser = await this.prisma.user.create({
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
    await this.prisma.auditTrail.create({
      data: {
        entityName: 'User',
        entityId: createdUser.id,
        action: 'USER_CREATED',
        performedByName: 'QC System Administrator',
        role: 'ADMIN',
        reasonForChange: `New user provisioned: ${createdUser.fullName} (@${createdUser.username || createdUser.employeeId}) as ${createdUser.role} in ${createdUser.department}`,
        diffPayload: JSON.stringify({
          fullName: createdUser.fullName,
          username: createdUser.username,
          employeeId: createdUser.employeeId,
          role: createdUser.role,
          department: createdUser.department,
          assignedLab: createdUser.assignedLab,
        }),
      },
    }).catch(() => {});

    return createdUser;
  }

  async update(id: string, data: any) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('User not found');

    const updateData: any = {};
    if (data.fullName !== undefined) updateData.fullName = data.fullName.trim();
    if (data.email !== undefined) {
      const cleanEmail = data.email.trim().toLowerCase();
      if (cleanEmail !== existing.email) {
        const conflict = await this.prisma.user.findUnique({ where: { email: cleanEmail } });
        if (conflict) throw new ConflictException(`Email "${cleanEmail}" already exists`);
        updateData.email = cleanEmail;
      }
    }
    if (data.employeeId !== undefined) {
      const cleanEmp = data.employeeId.trim().toUpperCase();
      if (cleanEmp !== existing.employeeId) {
        const conflict = await this.prisma.user.findUnique({ where: { employeeId: cleanEmp } });
        if (conflict) throw new ConflictException(`Employee ID "${cleanEmp}" already exists`);
        updateData.employeeId = cleanEmp;
      }
    }
    if (data.username !== undefined) {
      const cleanUser = data.username ? data.username.trim().toLowerCase() : null;
      if (cleanUser && cleanUser !== existing.username) {
        const conflict = await this.prisma.user.findUnique({ where: { username: cleanUser } });
        if (conflict) throw new ConflictException(`Username "${cleanUser}" already exists`);
      }
      updateData.username = cleanUser;
    }
    if (data.department !== undefined) updateData.department = data.department.trim();
    if (data.role !== undefined) updateData.role = data.role;
    if (data.assignedLab !== undefined) updateData.assignedLab = data.assignedLab ? data.assignedLab.trim() : null;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.mustChangePassword !== undefined) updateData.mustChangePassword = data.mustChangePassword;
    if (data.password && data.password.trim().length > 0) {
      if (data.password.trim().length < 6) throw new BadRequestException('Password must be at least 6 characters long');
      const salt = await bcrypt.genSalt(10);
      updateData.passwordHash = await bcrypt.hash(data.password.trim(), salt);
    }

    return this.prisma.user.update({
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
      },
    });
  }

  async updateRole(id: string, role: Role) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
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

    // 21 CFR Part 11 Audit Trail for Role Update
    await this.prisma.auditTrail.create({
      data: {
        entityName: 'User',
        entityId: updated.id,
        action: 'USER_ROLE_UPDATED',
        performedByName: 'QC System Administrator',
        role: 'ADMIN',
        reasonForChange: `Role for user ${updated.fullName} (@${updated.username || updated.employeeId}) updated from ${existing.role} to ${role}`,
        diffPayload: JSON.stringify({
          previousRole: existing.role,
          newRole: role,
          user: updated.fullName,
        }),
      },
    }).catch(() => {});

    return updated;
  }

  async delete(id: string, requesterUserId?: string) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('User not found');

    if (requesterUserId && id === requesterUserId) {
      throw new BadRequestException('You cannot delete or deactivate your own account');
    }

    try {
      await this.prisma.user.delete({ where: { id } });
      return {
        success: true,
        deleted: true,
        deactivated: false,
        message: `User "${existing.fullName}" has been permanently deleted.`,
      };
    } catch (err: any) {
      if (err.code === 'P2003') {
        await this.prisma.user.update({
          where: { id },
          data: { isActive: false },
        });
        return {
          success: true,
          deleted: false,
          deactivated: true,
          message: `User "${existing.fullName}" has associated laboratory records under 21 CFR Part 11 integrity rules. The account has been deactivated instead.`,
        };
      }
      throw err;
    }
  }
}
