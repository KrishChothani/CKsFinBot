/** @format */

import { identityService } from "../services/identity.service.js";
import { User } from "../models/user.model.js";

export async function register(req, res, next) {
  try {
    const { fullName, email, userName, password, phone, role, firmId } = req.body;
    const result = await identityService.registerUser({
      fullName,
      email,
      userName,
      password,
      phone,
      role,
      firmId,
    });

    res.status(201).json({
      success: true,
      statusCode: 201,
      message: "User registered successfully.",
      data: {
        user: {
          _id: result.user._id,
          fullName: result.user.fullName,
          email: result.user.email,
          userName: result.user.userName,
          role: result.user.role,
          firm: result.user.firm,
        },
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, userName, password } = req.body;
    const identifier = email || userName;
    const result = await identityService.loginUser({ identifier, password });

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Login successful.",
      data: {
        user: {
          _id: result.user._id,
          fullName: result.user.fullName,
          email: result.user.email,
          userName: result.user.userName,
          role: result.user.role,
          firm: result.user.firm,
        },
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Refresh token is required.",
      });
    }

    const decoded = identityService.verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded._id);
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({
        success: false,
        statusCode: 401,
        message: "Invalid or expired refresh token.",
      });
    }

    const tokens = identityService.generateTokens(user);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Token refreshed successfully.",
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getCurrentUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        statusCode: 401,
        message: "Missing Bearer token.",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = identityService.verifyAccessToken(token);
    const user = await User.findById(decoded._id).select("-password -refreshToken");

    if (!user) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "User not found.",
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
}

export default {
  register,
  login,
  refresh,
  getCurrentUser,
};

