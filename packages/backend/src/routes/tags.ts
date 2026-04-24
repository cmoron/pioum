import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";
import { TAG_REACTION_INCLUDE } from "../lib/prismaSelects.js";

export const tagsRouter = Router();

export const MAX_TAGS = 3;
export const MAX_FREE_TEXT_LENGTH = 50;

const addTagSchema = z
  .object({
    groupTagId: z.string().optional(),
    freeText: z
      .string()
      .max(MAX_FREE_TEXT_LENGTH)
      .transform((s) => s.trim())
      .optional(),
  })
  .refine(
    (data) =>
      (data.groupTagId && !data.freeText) ||
      (!data.groupTagId && data.freeText),
    { message: "Provide either groupTagId or freeText, not both" },
  );

// Add a tag to a passenger participation
export async function addPassengerTagHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const passengerId = req.params.passengerId as string;
    const { groupTagId, freeText } = addTagSchema.parse(req.body);

    const passenger = await prisma.passenger.findUnique({
      where: { id: passengerId },
      include: { session: true, tags: true },
    });

    if (!passenger) {
      throw new AppError(404, "Participation not found");
    }

    // Only the participant can add tags to their own participation
    if (passenger.userId !== req.user!.userId) {
      throw new AppError(
        403,
        "Tu ne peux ajouter des tags qu'à ta propre participation",
      );
    }

    // Check max tags
    if (passenger.tags.length >= MAX_TAGS) {
      throw new AppError(400, `Maximum ${MAX_TAGS} tags par participation`);
    }

    // If groupTagId, verify it belongs to the session's group
    if (groupTagId) {
      const groupTag = await prisma.groupTag.findFirst({
        where: { id: groupTagId, groupId: passenger.session.groupId },
      });
      if (!groupTag) {
        throw new AppError(404, "Tag prédéfini introuvable dans ce groupe");
      }

      // Check for duplicate predefined tag
      const duplicate = passenger.tags.find((t) => t.groupTagId === groupTagId);
      if (duplicate) {
        throw new AppError(400, "Ce tag est déjà ajouté");
      }
    }

    const tag = await prisma.passengerTag.create({
      data: { passengerId, groupTagId, freeText },
      include: {
        groupTag: true,
        reactions: TAG_REACTION_INCLUDE,
      },
    });

    res.status(201).json({ tag });
  } catch (error) {
    next(error);
  }
}

// Remove a tag from a passenger participation
export async function removePassengerTagHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const passengerId = req.params.passengerId as string;
    const tagId = req.params.tagId as string;

    const passenger = await prisma.passenger.findUnique({
      where: { id: passengerId },
    });

    if (!passenger) {
      throw new AppError(404, "Participation not found");
    }

    if (passenger.userId !== req.user!.userId) {
      throw new AppError(403, "Tu ne peux supprimer que tes propres tags");
    }

    const tag = await prisma.passengerTag.findFirst({
      where: { id: tagId, passengerId },
    });

    if (!tag) {
      throw new AppError(404, "Tag not found");
    }

    await prisma.passengerTag.delete({ where: { id: tagId } });

    res.json({ message: "Tag supprimé" });
  } catch (error) {
    next(error);
  }
}

// Add a tag to a car
export async function addCarTagHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const carId = req.params.carId as string;
    const { groupTagId, freeText } = addTagSchema.parse(req.body);

    const car = await prisma.car.findUnique({
      where: { id: carId },
      include: { session: true, tags: true },
    });

    if (!car) {
      throw new AppError(404, "Car not found");
    }

    // Only the driver can add tags to their car
    if (car.driverId !== req.user!.userId) {
      throw new AppError(
        403,
        "Tu ne peux ajouter des tags qu'à ta propre voiture",
      );
    }

    // Check max tags
    if (car.tags.length >= MAX_TAGS) {
      throw new AppError(400, `Maximum ${MAX_TAGS} tags par voiture`);
    }

    // If groupTagId, verify it belongs to the session's group
    if (groupTagId) {
      const groupTag = await prisma.groupTag.findFirst({
        where: { id: groupTagId, groupId: car.session.groupId },
      });
      if (!groupTag) {
        throw new AppError(404, "Tag prédéfini introuvable dans ce groupe");
      }

      // Check for duplicate predefined tag
      const duplicate = car.tags.find((t) => t.groupTagId === groupTagId);
      if (duplicate) {
        throw new AppError(400, "Ce tag est déjà ajouté");
      }
    }

    const tag = await prisma.carTag.create({
      data: { carId, groupTagId, freeText },
      include: {
        groupTag: true,
        reactions: TAG_REACTION_INCLUDE,
      },
    });

    res.status(201).json({ tag });
  } catch (error) {
    next(error);
  }
}

// Remove a tag from a car
export async function removeCarTagHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const carId = req.params.carId as string;
    const tagId = req.params.tagId as string;

    const car = await prisma.car.findUnique({
      where: { id: carId },
    });

    if (!car) {
      throw new AppError(404, "Car not found");
    }

    if (car.driverId !== req.user!.userId) {
      throw new AppError(
        403,
        "Tu ne peux supprimer que les tags de ta propre voiture",
      );
    }

    const tag = await prisma.carTag.findFirst({
      where: { id: tagId, carId },
    });

    if (!tag) {
      throw new AppError(404, "Tag not found");
    }

    await prisma.carTag.delete({ where: { id: tagId } });

    res.json({ message: "Tag supprimé" });
  } catch (error) {
    next(error);
  }
}

// --- Reaction handlers ---

const reactionSchema = z.object({
  emoji: z.string().min(1).max(8),
});

// Toggle reaction on a passenger tag
export async function togglePassengerTagReactionHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tagId = req.params.tagId as string;
    const { emoji } = reactionSchema.parse(req.body);
    const userId = req.user!.userId;

    // Find the tag and its group context
    const tag = await prisma.passengerTag.findUnique({
      where: { id: tagId },
      include: { passenger: { include: { session: true } } },
    });

    if (!tag) {
      throw new AppError(404, "Tag not found");
    }

    // Verify user is a member of the group
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId: tag.passenger.session.groupId,
        },
      },
    });

    if (!membership) {
      throw new AppError(403, "Tu dois être membre du groupe pour réagir");
    }

    // Check existing reaction
    const existing = await prisma.passengerTagReaction.findUnique({
      where: { passengerTagId_userId: { passengerTagId: tagId, userId } },
    });

    if (existing && existing.emoji === emoji) {
      // Same emoji → toggle off
      await prisma.passengerTagReaction.delete({ where: { id: existing.id } });
      res.json({ reaction: null });
    } else if (existing) {
      // Different emoji → replace
      const reaction = await prisma.passengerTagReaction.update({
        where: { id: existing.id },
        data: { emoji },
      });
      res.json({ reaction: { id: reaction.id, userId, emoji } });
    } else {
      // New reaction
      const reaction = await prisma.passengerTagReaction.create({
        data: { passengerTagId: tagId, userId, emoji },
      });
      res.json({ reaction: { id: reaction.id, userId, emoji } });
    }
  } catch (error) {
    next(error);
  }
}

// Toggle reaction on a car tag
export async function toggleCarTagReactionHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tagId = req.params.tagId as string;
    const { emoji } = reactionSchema.parse(req.body);
    const userId = req.user!.userId;

    // Find the tag and its group context
    const tag = await prisma.carTag.findUnique({
      where: { id: tagId },
      include: { car: { include: { session: true } } },
    });

    if (!tag) {
      throw new AppError(404, "Tag not found");
    }

    // Verify user is a member of the group
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId: tag.car.session.groupId,
        },
      },
    });

    if (!membership) {
      throw new AppError(403, "Tu dois être membre du groupe pour réagir");
    }

    // Check existing reaction
    const existing = await prisma.carTagReaction.findUnique({
      where: { carTagId_userId: { carTagId: tagId, userId } },
    });

    if (existing && existing.emoji === emoji) {
      // Same emoji → toggle off
      await prisma.carTagReaction.delete({ where: { id: existing.id } });
      res.json({ reaction: null });
    } else if (existing) {
      // Different emoji → replace
      const reaction = await prisma.carTagReaction.update({
        where: { id: existing.id },
        data: { emoji },
      });
      res.json({ reaction: { id: reaction.id, userId, emoji } });
    } else {
      // New reaction
      const reaction = await prisma.carTagReaction.create({
        data: { carTagId: tagId, userId, emoji },
      });
      res.json({ reaction: { id: reaction.id, userId, emoji } });
    }
  } catch (error) {
    next(error);
  }
}

// --- Route registration ---

tagsRouter.post(
  "/passengers/:passengerId/tags",
  authenticate,
  addPassengerTagHandler,
);
tagsRouter.delete(
  "/passengers/:passengerId/tags/:tagId",
  authenticate,
  removePassengerTagHandler,
);
tagsRouter.put(
  "/passenger-tags/:tagId/reaction",
  authenticate,
  togglePassengerTagReactionHandler,
);
tagsRouter.post("/cars/:carId/tags", authenticate, addCarTagHandler);
tagsRouter.delete(
  "/cars/:carId/tags/:tagId",
  authenticate,
  removeCarTagHandler,
);
tagsRouter.put(
  "/car-tags/:tagId/reaction",
  authenticate,
  toggleCarTagReactionHandler,
);
