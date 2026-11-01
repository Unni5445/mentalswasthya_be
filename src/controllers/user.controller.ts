import { Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import ApiResponse from '../utils/ApiResponse';
import { User, AuditLog } from '../models';
import * as streakService from '../services/streak.service';

const sanitizeUser = (user: any) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  org: user.org,
  mobile: user.mobile || null,
  designation: user.designation || null,
  photoUrl: user.photoUrl || user.avatar || null,
  avatar: user.photoUrl || user.avatar || null,
  appStartOption: user.appStartOption,
  weeklyOff: user.weeklyOff && user.weeklyOff.length ? user.weeklyOff : ['SUN'],
  isActive: user.isActive,
  isEmailVerified: user.isEmailVerified,
  hasCompletedTour: user.hasCompletedTour ?? false,
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
    const {
      name,
      mobile,
      designation,
      photoUrl,
      avatar,
      weeklyOff,
      appStartOption,
      currentPassword,
      newPassword,
      hasCompletedTour,
    } = req.body;

    const user = await User.findById(userId).select('+password').populate('org');
    if (!user) {
      res.status(404).json(new ApiResponse(404, null, 'User not found'));
      return;
    }

    if (name && typeof name === 'string' && name.trim()) {
      user.name = name.trim();
    }

    if (mobile !== undefined) {
      user.mobile = typeof mobile === 'string' ? mobile.trim() : null;
    }

    if (designation !== undefined) {
      user.designation = typeof designation === 'string' ? designation.trim() : null;
    }

    if (photoUrl !== undefined || avatar !== undefined) {
      const img = (photoUrl !== undefined ? photoUrl : avatar) || null;
      user.photoUrl = img;
      user.avatar = img;
    }

    if (Array.isArray(weeklyOff)) {
      const validDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
      const filtered = weeklyOff.map((d: any) => String(d).toUpperCase().trim()).filter((d) => validDays.includes(d));
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

    if (typeof hasCompletedTour === 'boolean') {
      user.hasCompletedTour = hasCompletedTour;
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

      await AuditLog.create({
        actor: user._id,
        org: user.org?._id || null,
        action: 'password_change',
        targetModel: 'User',
        targetId: user._id,
      });
    }

    await user.save();

    await AuditLog.create({
      actor: user._id,
      org: user.org?._id || null,
      action: 'user_updated',
      targetModel: 'User',
      targetId: user._id,
      meta: {
        updatedFields: Object.keys(req.body).filter((k) => k !== 'currentPassword' && k !== 'newPassword'),
      },
    });

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

  static uploadPhoto = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json(new ApiResponse(404, null, 'User not found'));
      return;
    }

    if (!req.file) {
      res.status(400).json(new ApiResponse(400, null, 'No photo file provided'));
      return;
    }

    const photoUrl = `/uploads/profiles/${req.file.filename}`;
    user.photoUrl = photoUrl;
    user.avatar = photoUrl;
    await user.save({ validateBeforeSave: false });

    await AuditLog.create({
      actor: user._id,
      org: user.org?._id || null,
      action: 'user_updated',
      targetModel: 'User',
      targetId: user._id,
      meta: { field: 'photoUrl', value: photoUrl },
    });

    res.status(200).json(
      new ApiResponse(
        200,
        {
          photoUrl,
          avatar: photoUrl,
          user: sanitizeUser(user),
        },
        'Profile photo uploaded successfully'
      )
    );
  });

  static deleteAccount = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user._id;
    const { password } = req.body;

    if (!password) {
      res.status(400).json(new ApiResponse(400, null, 'Password is required to delete your account'));
      return;
    }

    const user = await User.findById(userId).select('+password');
    if (!user) {
      res.status(404).json(new ApiResponse(404, null, 'User not found'));
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(400).json(new ApiResponse(400, null, 'Incorrect password. Account deletion aborted.'));
      return;
    }

    user.isActive = false;
    user.refreshToken = null;
    await user.softDelete();

    await AuditLog.create({
      actor: userId,
      org: user.org || null,
      action: 'user_deleted',
      targetModel: 'User',
      targetId: userId,
    });

    res.status(200).json(new ApiResponse(200, null, 'Account deleted successfully'));
  });

  static getStreak = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user._id;
    const streak = await streakService.getStreak(userId);
    res.status(200).json(new ApiResponse(200, streak, 'Streak retrieved successfully'));
  });
}

export default UserController;
