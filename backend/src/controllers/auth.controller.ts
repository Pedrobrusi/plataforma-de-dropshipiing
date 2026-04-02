import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../types';
import { AppError } from '../middleware/errorHandler.middleware';
import logger from '../utils/logger';

const prisma = new PrismaClient();

function generateTokens(userId: string, email: string, role: string) {
  const secret = process.env.JWT_SECRET || 'fallback-secret';
  const refreshSecret = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret';

  const accessToken = jwt.sign(
    { userId, email, role },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  const refreshToken = jwt.sign(
    { userId, email, role },
    refreshSecret,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );

  return { accessToken, refreshToken };
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password, name } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError('Email já cadastrado', 409);
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        id: uuidv4(),
        email,
        password: hashedPassword,
        name,
      },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    const { accessToken, refreshToken } = generateTokens(user.id, user.email, user.role);

    logger.info(`Novo usuário registrado: ${user.email}`);

    res.status(201).json({
      success: true,
      data: { user, accessToken, refreshToken },
      message: 'Usuário criado com sucesso',
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      throw new AppError('Credenciais inválidas', 401);
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new AppError('Credenciais inválidas', 401);
    }

    const { accessToken, refreshToken } = generateTokens(user.id, user.email, user.role);

    logger.info(`Login: ${user.email}`);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken: token } = req.body;
    if (!token) throw new AppError('Refresh token obrigatório', 400);

    const refreshSecret = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret';
    const decoded = jwt.verify(token, refreshSecret) as { userId: string; email: string; role: string };

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user || !user.isActive) throw new AppError('Usuário não encontrado', 404);

    const tokens = generateTokens(user.id, user.email, user.role);

    res.json({ success: true, data: tokens });
  } catch (error) {
    next(error);
  }
}

export async function getProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { stores: true } },
      },
    });

    if (!user) throw new AppError('Usuário não encontrado', 404);

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, password } = req.body;
    const updateData: { name?: string; password?: string } = {};

    if (name) updateData.name = name;
    if (password) updateData.password = await bcrypt.hash(password, 12);

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: updateData,
      select: { id: true, email: true, name: true, role: true, updatedAt: true },
    });

    res.json({ success: true, data: user, message: 'Perfil atualizado' });
  } catch (error) {
    next(error);
  }
}

export async function logout(req: AuthRequest, res: Response): Promise<void> {
  logger.info(`Logout: ${req.user?.email}`);
  res.json({ success: true, message: 'Logout realizado com sucesso' });
}
