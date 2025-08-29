import { Router } from "express";
import { sendMail } from "../mail/index.js";
import { FiveDigit, FourDigit } from "../utils/index.js";
import multer from "../multer/index.js";
import axios from "axios";
import jwt from "jsonwebtoken";
import user from "../helper/user.js";
import fs from "fs";
import FormData from "form-data";
import { airtelSMSConfig } from "../config/airtelSMS.js";

const router = Router();

const CheckLogged = (req, res, next) => {
  const { token = null } = req?.cookies;

  jwt.verify(token, process.env.JWT_SECRET, async (err, decode) => {
    if (decode?._id?.length === 24) {
      try {
        let userData = await user.get_user(decode?._id);

        if (userData) {
          if (req?.query?.next) {
            req.query.userId = userData?._id?.toString?.();
            req.query.email = userData?.email?.toLowerCase?.();
            next();
          } else {
            res.status(208).json({
              status: 208,
              message: "Already Logged",
              data: userData,
            });
          }
        }
      } catch (err) {
        console.log(err);
        if (req?.query?.next) {
          res.clearCookie("token").status(405).json({
            status: 405,
            message: "User Not Logged",
          });
        } else {
          res.clearCookie("token");
          next();
        }
      }
    } else {
      console.log(err ? `Error : ${err?.name}` : "Something Went Wrong");

      if (req?.query?.next) {
        res.clearCookie("token").status(405).json({
          status: 405,
          message: "User Not Logged",
        });
      } else {
        res.clearCookie("token");
        next();
      }
    }
  });
};

// Helper function to send OTP via Airtel SMS
const sendOTPviaSMS = async (phoneNumber, message, otp) => {
  try {
    let url = airtelSMSConfig.baseURL + '/api/v1/send-sms';
    let basicAuth = Buffer.from(`${airtelSMSConfig.authUsername}:${airtelSMSConfig.authPassword}`).toString('base64');
    
    let requestBody = new FormData();
    requestBody.append('customerId', airtelSMSConfig.customerId);
    requestBody.append('destinationAddress', phoneNumber);
    requestBody.append('sourceAddress', airtelSMSConfig.sourceAddress);
    requestBody.append('messageType', airtelSMSConfig.messageType);
    requestBody.append('entityId', airtelSMSConfig.entityId);
    requestBody.append('message', message);
    requestBody.append('dltTemplateId', airtelSMSConfig.dltTemplateId);
    requestBody.append('otp', otp);

    let response = await axios.post(url, requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${basicAuth}`,
      }
    });
    return response.data;
  } catch (err) {
    console.error(`AIRTEL SMS ERROR: ${err.response ? JSON.stringify(err.response.data) : err.message}`);
    throw new Error("Failed to send SMS");
  }
};

router.get("/checkLogged", CheckLogged, (req, res) => {
  res.status(405).json({
    status: 405,
    message: "User not logged",
  });
});

router.post("/register", CheckLogged, async (req, res) => {
  let { name, email, number } = req.body;
  
  if (number?.length === 10 && name) {
    var validRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;

    if (email?.match(validRegex)) {
      email = email?.toLowerCase?.();
      
      // Generate 4-digit OTP
      let otp = FourDigit();
      
      try {
        // Register request in database
        let response = await user.register_request({
          email: `${email}_register`,
          number,
          secret: otp,
        });

        if (response) {
          // Send OTP via Airtel SMS
          const message = `Your MML Live registration verification code is: ${otp}`;
          await sendOTPviaSMS(number, message, otp);
          
          res.status(200).json({
            status: 200,
            message: "Register OTP sent to your phone",
            data: {
              otp: true,
            },
          });
        }
      } catch (err) {
        if (err?.status) {
          res.status(err.status).json(err);
        } else {
          res.status(500).json({
            status: 500,
            message: err.message || "Failed to send OTP",
          });
        }
      }
    } else {
      res.status(422).json({
        status: 422,
        message: "Enter valid email",
      });
    }
  } else {
    res.status(422).json({
      status: 422,
      message: "Enter correct data.",
    });
  }
});

router.post("/register-verify", CheckLogged, async (req, res) => {
  let { email, name, number, OTP } = req.body;

  email = email?.toLowerCase?.();

  if (number?.length === 10) {
    if (email && OTP) {
      let response;
      try {
        response = await user.register_verify({
          email: `${email}_register`,
          number,
          name,
          secret: OTP,
        });
      } catch (err) {
        if (err?.status) {
          res.status(err.status).json(err);
        } else {
          res.status(500).json({
            status: 500,
            message: err,
          });
        }
      } finally {
        if (response) {
          res.status(200).json({
            status: 200,
            message: "Register Completed",
          });
        }
      }
    } else {
      res.status(422).json({
        status: 422,
        message: "Wrong Verification Details",
      });
    }
  } else {
    res.status(422).json({
      status: 422,
      message: "Enter correct data.",
    });
  }
});

router.get("/login-google", CheckLogged, async (req, res) => {
  let { google = null } = req.query;

  let response;

  try {
    let googleCheck = await axios.get(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: {
          Authorization: `Bearer ${google}`,
        },
      }
    );

    if (googleCheck?.data?.email) {
      response = await user.getUserByEmail(
        googleCheck.data.email?.toLowerCase?.()
      );
    } else {
      res.status(500).json({
        status: 500,
        message: "Something Wrong",
      });
    }
  } catch (err) {
    if (err?.status) {
      res.status(err.status).json(err);
    } else {
      res.status(500).json({
        status: 500,
        message: err,
      });
    }
  } finally {
    if (response?._id) {
      let token = jwt.sign(
        {
          _id: response._id,
        },
        process.env.JWT_SECRET,
        {
          expiresIn: "24h",
        }
      );

      res
        .status(200)
        .cookie("token", token, {
          httpOnly: true,
          expires: new Date(Date.now() + 86400000),
        })
        .json({
          status: 200,
          message: "Success",
          data: response,
        });
    }
  }
});

router.post("/login-otp", CheckLogged, async (req, res) => {
  let { email, number } = req?.body;

  email = email?.toLowerCase?.();

  if (email && number?.length === 10) {
    // Generate 4-digit OTP
    let otp = FourDigit();

    try {
      let response = await user.login_request({
        email: `${email}_login`,
        secret: otp,
      });

      if (response) {
        // Send OTP via Airtel SMS
        const message = `Your MML Live login verification code is: ${otp}`;
        await sendOTPviaSMS(number, message, otp);

        res.status(200).json({
          status: 200,
          message: "Login OTP sent to your phone",
        });
      }
    } catch (err) {
      if (err?.status) {
        res.status(err.status).json(err);
      } else {
        res.status(500).json({
          status: 500,
          message: err.message || "Failed to send OTP",
        });
      }
    }
  } else {
    res.status(422).json({
      status: 422,
      message: "Enter Email and Phone Number",
    });
  }
});

router.post("/login-verify", CheckLogged, async (req, res) => {
  let { email, OTP } = req?.body;

  email = email?.toLowerCase?.();

  if (email && OTP) {
    let response;
    try {
      response = await user.login_verify(`${email}_login`, OTP);
    } catch (err) {
      if (err?.status) {
        res.status(err.status).json(err);
      } else {
        res.status(500).json({
          status: 500,
          message: err,
        });
      }
    } finally {
      if (response?._id) {
        let token = jwt.sign(
          {
            _id: response._id,
          },
          process.env.JWT_SECRET,
          {
            expiresIn: "24h",
          }
        );

        res
          .status(200)
          .cookie("token", token, {
            httpOnly: true,
            expires: new Date(Date.now() + 86400000),
          })
          .json({
            status: 200,
            message: "Success",
            data: response,
          });
      }
    }
  } else {
    res.status(422).json({
      status: 422,
      message: "Enter Required Fields",
    });
  }
});

router.post(
  "/edit-profile-otp",
  (req, res, next) => {
    req.query.next = true;
    next();
  },
  CheckLogged,
  async (req, res) => {
    // Generate 4-digit OTP
    let otp = FourDigit();
    let userData;

    try {
      userData = await user.get_user(req?.query?.userId);
      
      let response = await user.edit_request(otp, req?.query?.userId, req?.body);

      if (response) {
        // Send OTP via Airtel SMS
        const message = `Your MML Live profile edit verification code is: ${otp}`;
        await sendOTPviaSMS(userData.number, message, otp);

        res.status(200).json({
          status: 200,
          message: "Profile Edit OTP sent to your phone",
          data: {
            otp: true,
          },
        });
      }
    } catch (err) {
      if (err?.status) {
        res.status(err.status).json(err);
      } else {
        res.status(500).json({
          status: 500,
          message: err.message || "Failed to send OTP",
        });
      }
    }
  }
);

router.put(
  "/edit-profile-verify",
  (req, res, next) => {
    req.query.next = true;
    next();
  },
  CheckLogged,
  async (req, res) => {
    try {
      let response = await user.edit_profile(req?.body, req?.query?.userId);

      if (response) {
        res.status(200).json({
          status: 200,
          message: "Success",
        });
      }
    } catch (err) {
      if (err?.status) {
        res.status(err.status).json(err);
      } else {
        res.status(500).json({
          status: 500,
          message: err,
        });
      }
    }
  }
);

router.delete(
  "/remove-avatar",
  (req, res, next) => {
    req.query.next = true;
    next();
  },
  CheckLogged,
  async (req, res) => {
    try {
      let response = await user.remove_avatar(req?.query?.userId);

      if (response?.modifiedCount) {
        fs.unlink(`./files/profiles/${req?.query?.userId}.png`, (err) => {
          console.log(`Error When Delete Avatar : ${err}`);
        });

        res.status(200).json({
          status: 200,
          message: "Success",
        });
      }
    } catch (err) {
      res.status(500).json({
        status: 500,
        message: "Failed",
      });
    }
  }
);

router.put(
  "/change-avatar",
  (req, res, next) => {
    req.query.next = true;
    next();
  },
  CheckLogged,
  multer.profile.single("avatar"),
  async (req, res) => {
    try {
      let response = await user.change_avatar(
        req?.file?.filename,
        req?.query?.userId
      );

      if (response) {
        res.status(200).json({
          status: 200,
          message: "Success",
        });
      }
    } catch (err) {
      res.status(500).json({
        status: 500,
        message: err,
      });
    }
  }
);

router.get("/logout", (req, res) => {
  res.clearCookie("token").status(200).json({
    status: 200,
    message: "Logout",
  });
});

export default router;
