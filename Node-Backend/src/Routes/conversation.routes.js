/** @format */

import { Router } from "express";
import {
  getAllConversations,
  getConversationById,
  createConversation,
  createChatMessage,
  deleteConversation,
  updateConversationFeature,
  updateConversationTitle,
  updateDraftContent,
  suggestImprovement,
} from "../Controllers/conversation.controller.js";
import { verifyJWT } from "../Middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

// Root conversation routes
router.route("/").get(getAllConversations).post(createConversation);

// AI suggestion route (placed before :conversationId parameter)
router.route("/suggest-improvement").post(suggestImprovement);

// Document draft persistence route
router.route("/:conversationId/draft").put(updateDraftContent);

// Messages route
router.route("/:conversationId/messages").post(createChatMessage);

// Conversation metadata routes
router.route("/:conversationId/feature").patch(updateConversationFeature);
router.route("/:conversationId/title").patch(updateConversationTitle);

// Single conversation CRUD
router
  .route("/:conversationId")
  .get(getConversationById)
  .delete(deleteConversation);

export default router;
