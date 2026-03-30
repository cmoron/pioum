import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextFunction } from "express";
import "../middleware/auth.js";

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    passenger: { findUnique: vi.fn() },
    car: { findUnique: vi.fn() },
    groupTag: { findFirst: vi.fn() },
    passengerTag: { create: vi.fn(), findFirst: vi.fn(), delete: vi.fn() },
    carTag: { create: vi.fn(), findFirst: vi.fn(), delete: vi.fn() },
  },
}));

import { prisma } from "../lib/prisma.js";
import { makeRes, makeReq, asRes } from "./test-utils.js";
import {
  addPassengerTagHandler,
  removePassengerTagHandler,
  addCarTagHandler,
  removeCarTagHandler,
} from "./tags.js";

const mockPassengerFindUnique = vi.mocked(prisma.passenger.findUnique);
const mockCarFindUnique = vi.mocked(prisma.car.findUnique);
const mockGroupTagFindFirst = vi.mocked(prisma.groupTag.findFirst);
const mockPassengerTagCreate = vi.mocked(prisma.passengerTag.create);
const mockPassengerTagFindFirst = vi.mocked(prisma.passengerTag.findFirst);
const mockPassengerTagDelete = vi.mocked(prisma.passengerTag.delete);
const mockCarTagCreate = vi.mocked(prisma.carTag.create);
const mockCarTagFindFirst = vi.mocked(prisma.carTag.findFirst);
const mockCarTagDelete = vi.mocked(prisma.carTag.delete);

describe("POST /passengers/:passengerId/tags", () => {
  let mockRes: ReturnType<typeof makeRes>;
  let mockNext: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRes = makeRes();
    mockNext = vi.fn();
  });

  it("adds a free text tag to own participation", async () => {
    mockPassengerFindUnique.mockResolvedValue({
      id: "p-1",
      userId: "user-1",
      session: { groupId: "group-1" },
      tags: [],
    } as never);
    const createdTag = {
      id: "pt-1",
      freeText: "En retard",
      groupTag: null,
    };
    mockPassengerTagCreate.mockResolvedValue(createdTag as never);

    const req = makeReq({
      params: { passengerId: "p-1" },
      body: { freeText: "En retard" },
      user: { userId: "user-1" },
    });

    await addPassengerTagHandler(req, asRes(mockRes), mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith({ tag: createdTag });
  });

  it("adds a predefined group tag to own participation", async () => {
    mockPassengerFindUnique.mockResolvedValue({
      id: "p-1",
      userId: "user-1",
      session: { groupId: "group-1" },
      tags: [],
    } as never);
    mockGroupTagFindFirst.mockResolvedValue({
      id: "gt-1",
      groupId: "group-1",
    } as never);
    const createdTag = {
      id: "pt-1",
      groupTagId: "gt-1",
      groupTag: { id: "gt-1", label: "VIP" },
    };
    mockPassengerTagCreate.mockResolvedValue(createdTag as never);

    const req = makeReq({
      params: { passengerId: "p-1" },
      body: { groupTagId: "gt-1" },
      user: { userId: "user-1" },
    });

    await addPassengerTagHandler(req, asRes(mockRes), mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith({ tag: createdTag });
  });

  it("returns 404 if participation not found", async () => {
    mockPassengerFindUnique.mockResolvedValue(null as never);

    const req = makeReq({
      params: { passengerId: "p-nonexistent" },
      body: { freeText: "Test" },
      user: { userId: "user-1" },
    });

    await addPassengerTagHandler(req, asRes(mockRes), mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404 }),
    );
  });

  it("returns 403 when adding tag to another user's participation", async () => {
    mockPassengerFindUnique.mockResolvedValue({
      id: "p-1",
      userId: "user-other",
      session: { groupId: "group-1" },
      tags: [],
    } as never);

    const req = makeReq({
      params: { passengerId: "p-1" },
      body: { freeText: "Test" },
      user: { userId: "user-1" },
    });

    await addPassengerTagHandler(req, asRes(mockRes), mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403 }),
    );
  });

  it("returns 400 when exceeding max tags (3)", async () => {
    mockPassengerFindUnique.mockResolvedValue({
      id: "p-1",
      userId: "user-1",
      session: { groupId: "group-1" },
      tags: [{ id: "t1" }, { id: "t2" }, { id: "t3" }],
    } as never);

    const req = makeReq({
      params: { passengerId: "p-1" },
      body: { freeText: "Fourth tag" },
      user: { userId: "user-1" },
    });

    await addPassengerTagHandler(req, asRes(mockRes), mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400 }),
    );
  });

  it("returns 404 if predefined group tag not found in group", async () => {
    mockPassengerFindUnique.mockResolvedValue({
      id: "p-1",
      userId: "user-1",
      session: { groupId: "group-1" },
      tags: [],
    } as never);
    mockGroupTagFindFirst.mockResolvedValue(null as never);

    const req = makeReq({
      params: { passengerId: "p-1" },
      body: { groupTagId: "gt-wrong" },
      user: { userId: "user-1" },
    });

    await addPassengerTagHandler(req, asRes(mockRes), mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404 }),
    );
  });

  it("returns 400 for duplicate predefined tag", async () => {
    mockPassengerFindUnique.mockResolvedValue({
      id: "p-1",
      userId: "user-1",
      session: { groupId: "group-1" },
      tags: [{ id: "pt-1", groupTagId: "gt-1" }],
    } as never);
    mockGroupTagFindFirst.mockResolvedValue({
      id: "gt-1",
      groupId: "group-1",
    } as never);

    const req = makeReq({
      params: { passengerId: "p-1" },
      body: { groupTagId: "gt-1" },
      user: { userId: "user-1" },
    });

    await addPassengerTagHandler(req, asRes(mockRes), mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400 }),
    );
  });

  it("rejects when both groupTagId and freeText are provided", async () => {
    const req = makeReq({
      params: { passengerId: "p-1" },
      body: { groupTagId: "gt-1", freeText: "Also text" },
      user: { userId: "user-1" },
    });

    await addPassengerTagHandler(req, asRes(mockRes), mockNext);

    // Zod validation error passed to next
    expect(mockNext).toHaveBeenCalled();
  });

  it("rejects when neither groupTagId nor freeText are provided", async () => {
    const req = makeReq({
      params: { passengerId: "p-1" },
      body: {},
      user: { userId: "user-1" },
    });

    await addPassengerTagHandler(req, asRes(mockRes), mockNext);

    expect(mockNext).toHaveBeenCalled();
  });
});

describe("DELETE /passengers/:passengerId/tags/:tagId", () => {
  let mockRes: ReturnType<typeof makeRes>;
  let mockNext: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRes = makeRes();
    mockNext = vi.fn();
  });

  it("removes own tag", async () => {
    mockPassengerFindUnique.mockResolvedValue({
      id: "p-1",
      userId: "user-1",
    } as never);
    mockPassengerTagFindFirst.mockResolvedValue({
      id: "pt-1",
      passengerId: "p-1",
    } as never);
    mockPassengerTagDelete.mockResolvedValue({} as never);

    const req = makeReq({
      params: { passengerId: "p-1", tagId: "pt-1" },
      user: { userId: "user-1" },
    });

    await removePassengerTagHandler(req, asRes(mockRes), mockNext);

    expect(mockRes.json).toHaveBeenCalledWith({ message: "Tag supprimé" });
    expect(mockPassengerTagDelete).toHaveBeenCalledWith({
      where: { id: "pt-1" },
    });
  });

  it("returns 403 when removing another user's tag", async () => {
    mockPassengerFindUnique.mockResolvedValue({
      id: "p-1",
      userId: "user-other",
    } as never);

    const req = makeReq({
      params: { passengerId: "p-1", tagId: "pt-1" },
      user: { userId: "user-1" },
    });

    await removePassengerTagHandler(req, asRes(mockRes), mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403 }),
    );
  });

  it("returns 404 if passenger not found", async () => {
    mockPassengerFindUnique.mockResolvedValue(null as never);

    const req = makeReq({
      params: { passengerId: "p-nonexistent", tagId: "pt-1" },
      user: { userId: "user-1" },
    });

    await removePassengerTagHandler(req, asRes(mockRes), mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404 }),
    );
  });

  it("returns 404 if tag not found", async () => {
    mockPassengerFindUnique.mockResolvedValue({
      id: "p-1",
      userId: "user-1",
    } as never);
    mockPassengerTagFindFirst.mockResolvedValue(null as never);

    const req = makeReq({
      params: { passengerId: "p-1", tagId: "pt-nonexistent" },
      user: { userId: "user-1" },
    });

    await removePassengerTagHandler(req, asRes(mockRes), mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404 }),
    );
  });
});

describe("POST /cars/:carId/tags", () => {
  let mockRes: ReturnType<typeof makeRes>;
  let mockNext: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRes = makeRes();
    mockNext = vi.fn();
  });

  it("adds a free text tag to own car", async () => {
    mockCarFindUnique.mockResolvedValue({
      id: "car-1",
      driverId: "user-1",
      session: { groupId: "group-1" },
      tags: [],
    } as never);
    const createdTag = { id: "ct-1", freeText: "Coffre plein", groupTag: null };
    mockCarTagCreate.mockResolvedValue(createdTag as never);

    const req = makeReq({
      params: { carId: "car-1" },
      body: { freeText: "Coffre plein" },
      user: { userId: "user-1" },
    });

    await addCarTagHandler(req, asRes(mockRes), mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith({ tag: createdTag });
  });

  it("adds a predefined group tag to own car", async () => {
    mockCarFindUnique.mockResolvedValue({
      id: "car-1",
      driverId: "user-1",
      session: { groupId: "group-1" },
      tags: [],
    } as never);
    mockGroupTagFindFirst.mockResolvedValue({
      id: "gt-1",
      groupId: "group-1",
    } as never);
    const createdTag = {
      id: "ct-1",
      groupTagId: "gt-1",
      groupTag: { id: "gt-1", label: "Détour" },
    };
    mockCarTagCreate.mockResolvedValue(createdTag as never);

    const req = makeReq({
      params: { carId: "car-1" },
      body: { groupTagId: "gt-1" },
      user: { userId: "user-1" },
    });

    await addCarTagHandler(req, asRes(mockRes), mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(201);
  });

  it("returns 404 if car not found", async () => {
    mockCarFindUnique.mockResolvedValue(null as never);

    const req = makeReq({
      params: { carId: "car-nonexistent" },
      body: { freeText: "Test" },
      user: { userId: "user-1" },
    });

    await addCarTagHandler(req, asRes(mockRes), mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404 }),
    );
  });

  it("returns 403 when not the driver", async () => {
    mockCarFindUnique.mockResolvedValue({
      id: "car-1",
      driverId: "user-other",
      session: { groupId: "group-1" },
      tags: [],
    } as never);

    const req = makeReq({
      params: { carId: "car-1" },
      body: { freeText: "Test" },
      user: { userId: "user-1" },
    });

    await addCarTagHandler(req, asRes(mockRes), mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403 }),
    );
  });

  it("returns 400 when exceeding max tags (3)", async () => {
    mockCarFindUnique.mockResolvedValue({
      id: "car-1",
      driverId: "user-1",
      session: { groupId: "group-1" },
      tags: [{ id: "t1" }, { id: "t2" }, { id: "t3" }],
    } as never);

    const req = makeReq({
      params: { carId: "car-1" },
      body: { freeText: "Fourth" },
      user: { userId: "user-1" },
    });

    await addCarTagHandler(req, asRes(mockRes), mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400 }),
    );
  });

  it("returns 400 for duplicate predefined tag on car", async () => {
    mockCarFindUnique.mockResolvedValue({
      id: "car-1",
      driverId: "user-1",
      session: { groupId: "group-1" },
      tags: [{ id: "ct-1", groupTagId: "gt-1" }],
    } as never);
    mockGroupTagFindFirst.mockResolvedValue({
      id: "gt-1",
      groupId: "group-1",
    } as never);

    const req = makeReq({
      params: { carId: "car-1" },
      body: { groupTagId: "gt-1" },
      user: { userId: "user-1" },
    });

    await addCarTagHandler(req, asRes(mockRes), mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400 }),
    );
  });
});

describe("DELETE /cars/:carId/tags/:tagId", () => {
  let mockRes: ReturnType<typeof makeRes>;
  let mockNext: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRes = makeRes();
    mockNext = vi.fn();
  });

  it("removes own car tag", async () => {
    mockCarFindUnique.mockResolvedValue({
      id: "car-1",
      driverId: "user-1",
    } as never);
    mockCarTagFindFirst.mockResolvedValue({
      id: "ct-1",
      carId: "car-1",
    } as never);
    mockCarTagDelete.mockResolvedValue({} as never);

    const req = makeReq({
      params: { carId: "car-1", tagId: "ct-1" },
      user: { userId: "user-1" },
    });

    await removeCarTagHandler(req, asRes(mockRes), mockNext);

    expect(mockRes.json).toHaveBeenCalledWith({ message: "Tag supprimé" });
    expect(mockCarTagDelete).toHaveBeenCalledWith({ where: { id: "ct-1" } });
  });

  it("returns 403 when not the driver", async () => {
    mockCarFindUnique.mockResolvedValue({
      id: "car-1",
      driverId: "user-other",
    } as never);

    const req = makeReq({
      params: { carId: "car-1", tagId: "ct-1" },
      user: { userId: "user-1" },
    });

    await removeCarTagHandler(req, asRes(mockRes), mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403 }),
    );
  });

  it("returns 404 if car not found", async () => {
    mockCarFindUnique.mockResolvedValue(null as never);

    const req = makeReq({
      params: { carId: "car-nonexistent", tagId: "ct-1" },
      user: { userId: "user-1" },
    });

    await removeCarTagHandler(req, asRes(mockRes), mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404 }),
    );
  });

  it("returns 404 if tag not found", async () => {
    mockCarFindUnique.mockResolvedValue({
      id: "car-1",
      driverId: "user-1",
    } as never);
    mockCarTagFindFirst.mockResolvedValue(null as never);

    const req = makeReq({
      params: { carId: "car-1", tagId: "ct-nonexistent" },
      user: { userId: "user-1" },
    });

    await removeCarTagHandler(req, asRes(mockRes), mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404 }),
    );
  });
});
