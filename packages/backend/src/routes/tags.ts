import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";

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
      include: { groupTag: true },
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
      include: { groupTag: true },
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
tagsRouter.post("/cars/:carId/tags", authenticate, addCarTagHandler);
tagsRouter.delete(
  "/cars/:carId/tags/:tagId",
  authenticate,
  removeCarTagHandler,
);
