import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";

export const groupTagsRouter = Router();

const createGroupTagSchema = z.object({
  label: z
    .string()
    .min(1)
    .max(50)
    .transform((s) => s.trim()),
});

const updateGroupTagSchema = z.object({
  label: z
    .string()
    .min(1)
    .max(50)
    .transform((s) => s.trim()),
});

// Get all tags for a group
export async function getGroupTagsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const groupId = req.params.groupId as string;

    // Verify membership
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: req.user!.userId,
          groupId,
        },
      },
    });

    if (!membership) {
      throw new AppError(403, "Not a member of this group");
    }

    const tags = await prisma.groupTag.findMany({
      where: { groupId },
      orderBy: { createdAt: "asc" },
    });

    res.json({ tags });
  } catch (error) {
    next(error);
  }
}

// Create a tag for a group (admin only)
export async function createGroupTagHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const groupId = req.params.groupId as string;
    const { label } = createGroupTagSchema.parse(req.body);

    // Verify admin
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: req.user!.userId,
          groupId,
        },
      },
    });

    if (!membership || membership.role !== "admin") {
      throw new AppError(403, "Admin access required");
    }

    const tag = await prisma.groupTag.create({
      data: { groupId, label },
    });

    res.status(201).json({ tag });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return next(new AppError(409, "Ce tag existe déjà dans ce groupe"));
    }
    next(error);
  }
}

// Update a group tag (admin only)
export async function updateGroupTagHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const groupId = req.params.groupId as string;
    const tagId = req.params.tagId as string;
    const { label } = updateGroupTagSchema.parse(req.body);

    // Verify admin
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: req.user!.userId,
          groupId,
        },
      },
    });

    if (!membership || membership.role !== "admin") {
      throw new AppError(403, "Admin access required");
    }

    const tag = await prisma.groupTag.findFirst({
      where: { id: tagId, groupId },
    });

    if (!tag) {
      throw new AppError(404, "Tag not found");
    }

    const updated = await prisma.groupTag.update({
      where: { id: tagId },
      data: { label },
    });

    res.json({ tag: updated });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return next(new AppError(409, "Ce tag existe déjà dans ce groupe"));
    }
    next(error);
  }
}

// Delete a group tag (admin only)
export async function deleteGroupTagHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const groupId = req.params.groupId as string;
    const tagId = req.params.tagId as string;

    // Verify admin
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: req.user!.userId,
          groupId,
        },
      },
    });

    if (!membership || membership.role !== "admin") {
      throw new AppError(403, "Admin access required");
    }

    const tag = await prisma.groupTag.findFirst({
      where: { id: tagId, groupId },
    });

    if (!tag) {
      throw new AppError(404, "Tag not found");
    }

    // Cascade delete will remove PassengerTag/CarTag references
    await prisma.groupTag.delete({
      where: { id: tagId },
    });

    res.json({ message: "Tag supprimé" });
  } catch (error) {
    next(error);
  }
}

groupTagsRouter.get("/:groupId/tags", authenticate, getGroupTagsHandler);
groupTagsRouter.post("/:groupId/tags", authenticate, createGroupTagHandler);
groupTagsRouter.patch(
  "/:groupId/tags/:tagId",
  authenticate,
  updateGroupTagHandler,
);
groupTagsRouter.delete(
  "/:groupId/tags/:tagId",
  authenticate,
  deleteGroupTagHandler,
);
