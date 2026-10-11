import { Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import ApiResponse from '../utils/ApiResponse';
import { User } from '../models';
import * as streakService from '../services/streak.service';

const sanitizeUser = (user: any) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  org: user.org,
  appStartOption: user.appStartOption,
  weeklyOff: user.weeklyOff && user.weeklyOff.length ? user.weeklyOff : ['SUN'],
  isActive: user.isActive,
  isEmailVerified: user.isEmailVerified,
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

class UserController {
  static getProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user._id;
    const user = await User.findById(userId).populate('org');

    if (!user) {
      res.status(404).json(new ApiResponse(404, null, 'User not found'));
      return;
    }

    const streak = await streakService.getStreak(userId);

    res.status(200).json(
      new ApiResponse(
        200,
        {
          user: sanitizeUser(user),
          streak,
        },
        'Profile retrieved successfully'
      )
    );
  });

  static updateProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user._id;
    const { name, weeklyOff, appStartOption, currentPassword, newPassword } = req.body;

    const user = await User.findById(userId).select('+password').populate('org');
    if (!user) {
      res.status(404).json(new ApiResponse(404, null, 'User not found'));
      return;
    }

    if (name && typeof name === 'string' && name.trim()) {
      user.name = name.trim();
    }

    if (Array.isArray(weeklyOff)) {
      const validDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
      const filtered = weeklyOff.map((d: any) => String(d).toUpperCase().trim()).filter(d => validDays.includes(d));
      user.weeklyOff = filtered.length > 0 ? filtered : ['SUN'];
    } else if (typeof weeklyOff === 'string' && weeklyOff.trim()) {
      const validDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
      const upper = weeklyOff.toUpperCase().trim();
      if (validDays.includes(upper)) {
        user.weeklyOff = [upper];
      }
    }

    if (appStartOption && ['first_login_of_day', 'every_login', 'manual'].includes(appStartOption)) {
      user.appStartOption = appStartOption;
    }

    // Optional change password
    if (newPassword) {
      if (!currentPassword) {
        res.status(400).json(new ApiResponse(400, null, 'Current password is required to set a new password'));
        return;
      }

      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        res.status(400).json(new ApiResponse(400, null, 'Current password does not match'));
        return;
      }

      if (newPassword.length < 8) {
        res.status(400).json(new ApiResponse(400, null, 'New password must be at least 8 characters long'));
        return;
      }

      user.password = newPassword;
      user.refreshToken = null;
    }

    await user.save();

    const streak = await streakService.getStreak(userId);

    res.status(200).json(
      new ApiResponse(
        200,
        {
          user: sanitizeUser(user),
          streak,
        },
        'Profile updated successfully'
      )
    );
  });

  static getStreak = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user._id;
    const streak = await streakService.getStreak(userId);
    res.status(200).json(new ApiResponse(200, streak, 'Streak retrieved successfully'));
  });
}

export default UserController;
