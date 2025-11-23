import jwt from "jsonwebtoken";

export const signAccessToken = (user) => {
  const expiresIn = process.env.ACCESS_TOKEN_EXPIRES || "15m";
  return jwt.sign({ id: user._id.toString(), role: user.role }, process.env.JWT_SECRET, { expiresIn });
};

export const signRefreshToken = (user) => {
  const expiresIn = process.env.REFRESH_TOKEN_EXPIRES || "7d";
  return jwt.sign({ id: user._id.toString() }, process.env.JWT_REFRESH_SECRET, { expiresIn });
};

export const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

export const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
};
