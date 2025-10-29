/** @format */

import { AsyncHandler } from "../Utils/AsyncHandler.js";
import { ApiError } from "../Utils/ApiError.js";
import { User } from "../Models/user.model.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import mongoose from "mongoose";
// import { User } from '../Models/user.model.js';
const LOGIN_USER_MAIL_TEMPLET = (link) => ({
  subject: "Verify Your Email - Welcome to CKsFinBot!",
  text: "Welcome to CKsFinBot! Please verify your email.",
  html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff;">
  <div style="text-align: center;">
    <img src="https://res.cloudinary.com/krishchothani/image/upload/v1748430624/3_ckgvod.png" alt="CKsFinBot" style="height: 60px; margin-bottom: 20px;" />
    <h2 style="color: #333;">Welcome to <span style="color: #4CAF50;">CKsFinBot</span> 👋</h2>
  </div>
  <p style="color: #555; font-size: 16px;">
    We're excited to have you on board. Before we get started, please verify your email address so we can ensure it's really you.
  </p>
  <div style="text-align: center; margin: 30px 0;">
    <a href="${link}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
      Verify My Email
    </a>
  </div>
</div>
`,
});
const RESET_PASSWORD_MAIL_TEMPLATE = (link) => ({
  subject: "CKsFinBot Password Reset Instructions",
  text: `We received a password reset request. Use this link within 15 minutes:\n${link}\n\nIf you didn't request this, please ignore this email.`,
  html: `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width">
  </head>
  <body style="margin:0;padding:30px 0;background:#f9f9f9;">
    <div style="max-width:600px;margin:auto;background:#fff;border-radius:8px;padding:30px;">
      <div style="text-align:center;margin-bottom:20px;">
        <img src="https://res.cloudinary.com/krishchothani/image/upload/v1748430624/3_ckgvod.png" 
             alt="CKsFinBot" 
             width="120" 
             style="height:auto;">
      </div>
      <p style="color:#555;line-height:1.6;font-size:16px;">
        Please click the button below to reset your password:
      </p>
      <div style="text-align:center;margin:25px 0;">
        <a href="${link}" 
           style="background:#4CAF50;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">
          Reset Password
        </a>
      </div>
      <p style="color:#777;font-size:14px;">
        This link expires in 15 minutes. If you didn't request this, no action is needed.
      </p>
      <div style="color:#666;font-size:12px;text-align:center;margin-top:30px;">
        <p>CKsFinBot Team</p>
      </div>
    </div>
  </body>
  </html>
  `,
});

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateREfreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (err) {
    throw new ApiError(
      500,
      "Something went wrong while generating access token and refresh token"
    );
  }
};

const registerUser = AsyncHandler(async (req, res) => {
  const { fullName, email, userName, password } = req.body;

  if (
    [fullName, email, userName, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUser = await User.findOne({
    $or: [{ userName }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User already exists");
  }

  const user = await User.create({
    fullName,
    email,
    password,
    userName: userName.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "something went wrong while register the user");
  }

  const token = jwt.sign({ email }, process.env.JWT_SECRET, {
    expiresIn: "30m",
  });
  const verifyLink = `https://cksfinbot.vercel.app/verify-email?token=${token}`;
  const loginEmailTemplate = LOGIN_USER_MAIL_TEMPLET(verifyLink);
  const send_email = await sendMail(email, loginEmailTemplate);

  console.log("send_email", send_email);
  if (!send_email) {
    throw new ApiError(500, "something went wrong while sending the email");
  }

  return res
    .status(201)
    .json(
      new ApiResponse(
        200,
        createdUser,
        "USer registration completed successfully"
      )
    );
});

const loginUser = AsyncHandler(async (req, res) => {
  const { email, userName, password } = req.body;
  console.log("login req body", req.body);
  if (!email && !userName) {
    throw new ApiError(400, "username or email is required");
  }

  const user = await User.findOne({
    $or: [{ userName }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    console.error("Password is not valid");
    throw new ApiError(401, "Password is not valid");
  }
  // console.log(req.body);

  if (!user.verified) {
    console.log("verify your google account");
    throw new ApiError("404", "Verify your google account.");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedInUSer = await User.findById(user._id).select(
    "-password -refreshToken "
  );

  console.log(loggedInUSer);

  const options = {
    httpOnly: true,
    secure: true,
    sameSite: "None",
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUSer,
          accessToken,
          refreshToken,
        },
        "User logged in successfully"
      )
    );
});

const logoutUser = AsyncHandler(async (req, res) => {
  User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
    sameSite: "None",
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = AsyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
      sameSite: "Strict", // You might also want to add this for security
    };

    const { accessToken, newrefreshToken } =
      await generateAccessAndRefreshToken(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newrefreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            accessToken,
            refreshToken: newrefreshToken,
          },
          "Access token refreshed successfully"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

// const changeCurrentPassword = AsyncHandler(async (req, res) => {
//   const { oldPassword, newPassword } = req.body;

//   const user = await User.findById(req.user?._id);

//   const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

//   if (!isPasswordCorrect) {
//     throw new ApiError(400, "Invalid Old Password");
//   }

//   user.password = newPassword;
//   await user.save({ validateBeforeSave: false });

//   return res
//     .status(200)
//     .json(new ApiResponse(200, {}, "Password changed successfully"));
// });

const sendResetPasswordEmail = AsyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(404, "User not found with this email");
  }

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
    expiresIn: "15m",
  });
  const resetLink = `https://cksfinbot.vercel.app/reset-password?token=${token}`;
  const resetEmailTemplate = RESET_PASSWORD_MAIL_TEMPLATE(resetLink);
  // Use your sendMail utility here
  const send_email = await sendMail(email, resetEmailTemplate);
  if (!send_email) {
    throw new ApiError(401, "Failed to send email for reset password");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, null, "Password reset email sent"));
});
const resetPassword = AsyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  console.log("---------------------------------------------------------");
  console.log(token, newPassword);
  console.log("---------------------------------------------------------");

  if (!token || !newPassword) {
    throw new ApiError(400, "Token and new password are required");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: true });

    return res
      .status(200)
      .json(new ApiResponse(200, null, "Password has been reset successfully"));
  } catch (error) {
    throw new ApiError(401, "Invalid or expired token");
  }
});

const getCurrentUser = AsyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "current user fetch successfully"));
});

const updateaccountDetails = AsyncHandler(async (req, res) => {
  const { fullName, email } = req.body;

  if (!fullName && !email) {
    throw new ApiError(400, "All fields are required");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName: fullName,
        email: email,
      },
    },
    { new: true }
  ).select("-password");

  return res.status(200).json(new ApiResponse(200, user, "Account Details"));
});

const resendEmailVerification = AsyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(404, "Please Enter the Email Id.");
  }
  const user = await User.findOne({ email: email });

  if (!user) {
    throw new ApiError(404, "Email Id Is not Found.");
  }
  const token = jwt.sign({ email }, process.env.JWT_SECRET, {
    expiresIn: "30m",
  });
  const verifyLink = `https://cksfinbot.vercel.app/verify-email?token=${token}`;
  const loginEmailTemplate = LOGIN_USER_MAIL_TEMPLET(verifyLink);
  const send_email = await sendMail(email, loginEmailTemplate);
  // const send_email = await sendMail(email);
  console.log(send_email);
  if (!send_email) {
    throw new ApiError(500, "something went wrong while sending the email");
  }

  return res
    .status(201)
    .json(
      new ApiResponse(
        200,
        send_email,
        "Email Send Successfully on Given EmailId"
      )
    );
});

const sendMail = async (emailId, htmlContent) => {
  console.log("emailId", emailId, htmlContent);
  try {
    const token = jwt.sign({ emailId }, process.env.JWT_SECRET);
    const verifyLink = `https://cksfinbot.vercel.app/verify-email?token=${token}`;
    const auth = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: "krishchothani259@gmail.com",
        pass: "dofsbprmfxdfljbe",
      },
    });
    const receiver = {
      from: '"CKsFinBot" <krishchothani259@gmail.com>',
      to: emailId,
      ...htmlContent,
    };

    return new Promise((resolve, reject) => {
      auth.sendMail(receiver, (err, email_res) => {
        if (err) {
          console.log("Error:", err);
          reject(new Error("Email sending failed"));
        } else {
          console.log("Email Sent:", email_res);
          resolve(email_res);
        }
      });
    });
    console.log(
      "-----------------------------------successfully send mail-------------------------------"
    );
  } catch (error) {
    throw new ApiError(500, "Something went wrong while sending the email");
  }
};
const verifyEmail = AsyncHandler(async (req, res) => {
  try {
    const { token } = req.query;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // console.log()
    console.log("---------------decoded------------------", decoded);
    const data = await User.findOneAndUpdate(
      { email: decoded.email },
      { $set: { verified: true } },
      { new: true }
    );
    console.log("verified", data);

    return res.status(200).json("Email verified successfully");
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while verifying Email Address"
    );
  }
});

const healthCheck = AsyncHandler(async (req, res) => {
  console.log("health check called");
  const userId = req.user._id;
  const user = await User.findById(userId).select("-password"); // exclude password
  console.log("user", user);
  if (!user) {
    return res.status(404).json(new ApiResponse(404, null, "User not found"));
  }
  const showstatus = {
    status: "OK",
    user,
    message: "Server is up and running",
  };
  return res
    .status(200)
    .json(new ApiResponse(200, showstatus, "Account Details"));
});

const getAllLawyers = AsyncHandler(async (req, res) => {
  const currentUserId = req.user._id;
  console.log(currentUserId);
  const { page = 1, limit = 100 } = req.query;

  // Fetch all active and verified users except the current user
  const users = await User.find({
    _id: { $ne: currentUserId }, // Exclude current user
    verified: true,
  })
    .select("fullName userName email")
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ fullName: 1 });

  const total = await User.countDocuments({
    _id: { $ne: currentUserId },
    isActive: true,
    isVerified: true,
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        users,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
          totalUsers: total,
        },
      },
      "Lawyers retrieved successfully"
    )
  );
});
// Get user profile by ID (for profile view)
const getUserProfile = AsyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user ID");
  }

  const user = await User.findOne({
    _id: userId,
  }).select("-password -refreshToken");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // You might want to include additional profile information here
  // like cases worked on, team memberships, etc.

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User profile retrieved successfully"));
});

const getMyId = AsyncHandler(async (req, res) => {
  console.log("wdskds");
  const userId = req.user._id;

  return res.status(200).json(new ApiResponse(200, userId, "User id sent"));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  // changeCurrentPassword,
  getCurrentUser,
  updateaccountDetails,
  verifyEmail,
  healthCheck,
  resendEmailVerification,
  sendResetPasswordEmail,
  resetPassword,
  getAllLawyers,
  getUserProfile,
  getMyId,
};
