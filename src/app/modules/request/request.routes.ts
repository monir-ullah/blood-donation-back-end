import express from "express";
import { requestController } from "./request.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";
import validateRequest from "../../middlewares/validateRequest";
import { requestValidation } from "./request.validation";

const router = express.Router();

router.post(
  "/donation-request",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.USER),
  validateRequest(requestValidation.createRequest),
  requestController.createRequest
);

router.get(
  "/donation-request",
  auth(UserRole.USER),
  requestController.myDonationRequests
);

//Donation Requests Made By Me
router.get(
  "/donation-request-made-by-me",
  auth(UserRole.USER, UserRole.ADMIN),
  requestController.donationRequestsMadeByMe
);

router.put(
  "/donation-request/:id",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.USER),
  requestController.updateRequest
);

router.patch(
  "/update-my-donation-request/:id",
  auth(UserRole.ADMIN, UserRole.USER),
  validateRequest(requestValidation.updateMyBloodRequest),
  requestController.updateMyRequest
);

//Delete my Blood Request
router.delete(
  "/delete-my-donation-request/:id",
  auth(UserRole.ADMIN, UserRole.USER),
  requestController.deleteMyRequest
);

export const requestRoutes = router;
