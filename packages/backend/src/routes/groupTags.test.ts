import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextFunction } from "express";
import "../middleware/auth.js";

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    groupMember: { findUnique: vi.fn() },
    groupTag: {
      findMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { prisma } from "../lib/prisma.js";
import { makeRes, makeReq, asRes } from "./test-utils.js";
import {
  getGroupTagsHandler,
  createGroupTagHandler,
  updateGroupTagHandler,
  deleteGroupTagHandler,
} from "./groupTags.js";

const mockMemberFindUnique = vi.mocked(prisma.groupMember.findUnique);
const mockTagFindMany = vi.mocked(prisma.groupTag.findMany);
const mockTagCreate = vi.mocked(prisma.groupTag.create);
const mockTagFindFirst = vi.mocked(prisma.groupTag.findFirst);
const mockTagUpdate = vi.mocked(prisma.groupTag.update);
const mockTagDelete = vi.mocked(prisma.groupTag.delete);

const adminMembership = { role: "admin" };
const memberMembership = { role: "member" };

describe("GET /:groupId/tags", () => {
  let mockRes: ReturnType<typeof makeRes>;
  let mockNext: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRes = makeRes();
    mockNext = vi.fn();
  });

  it("returns tags for a group member", async () => {
    mockMemberFindUnique.mockResolvedValue(memberMembership as never);
    const tags = [
      { id: "tag-1", label: "Retard", groupId: "group-1" },
      { id: "tag-2", label: "VIP", groupId: "group-1" },
    ];
    mockTagFindMany.mockResolvedValue(tags as never);

    const req = makeReq({
      params: { groupId: "group-1" },
      user: { userId: "user-1" },
    });

    await getGroupTagsHandler(req, asRes(mockRes), mockNext);

    expect(mockRes.json).toHaveBeenCalledWith({ tags });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("returns 403 for non-members", async () => {
    mockMemberFindUnique.mockResolvedValue(null as never);

    const req = makeReq({
      params: { groupId: "group-1" },
      user: { userId: "user-outsider" },
    });

    await getGroupTagsHandler(req, asRes(mockRes), mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403 }),
    );
  });
});

describe("POST /:groupId/tags", () => {
  let mockRes: ReturnType<typeof makeRes>;
  let mockNext: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRes = makeRes();
    mockNext = vi.fn();
  });

  it("creates a tag as admin", async () => {
    mockMemberFindUnique.mockResolvedValue(adminMembership as never);
    const createdTag = { id: "tag-new", groupId: "group-1", label: "Retard" };
    mockTagCreate.mockResolvedValue(createdTag as never);

    const req = makeReq({
      params: { groupId: "group-1" },
      body: { label: "Retard" },
      user: { userId: "user-admin" },
    });

    await createGroupTagHandler(req, asRes(mockRes), mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith({ tag: createdTag });
  });

  it("returns 403 for non-admin members", async () => {
    mockMemberFindUnique.mockResolvedValue(memberMembership as never);

    const req = makeReq({
      params: { groupId: "group-1" },
      body: { label: "Retard" },
      user: { userId: "user-member" },
    });

    await createGroupTagHandler(req, asRes(mockRes), mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403 }),
    );
  });

  it("returns 403 for non-members", async () => {
    mockMemberFindUnique.mockResolvedValue(null as never);

    const req = makeReq({
      params: { groupId: "group-1" },
      body: { label: "Retard" },
      user: { userId: "user-outsider" },
    });

    await createGroupTagHandler(req, asRes(mockRes), mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403 }),
    );
  });

  it("returns 409 for duplicate tag labels", async () => {
    mockMemberFindUnique.mockResolvedValue(adminMembership as never);
    mockTagCreate.mockRejectedValue({ code: "P2002" } as never);

    const req = makeReq({
      params: { groupId: "group-1" },
      body: { label: "Retard" },
      user: { userId: "user-admin" },
    });

    await createGroupTagHandler(req, asRes(mockRes), mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 409 }),
    );
  });

  it("trims whitespace from label", async () => {
    mockMemberFindUnique.mockResolvedValue(adminMembership as never);
    mockTagCreate.mockResolvedValue({ id: "tag-new" } as never);

    const req = makeReq({
      params: { groupId: "group-1" },
      body: { label: "  Retard  " },
      user: { userId: "user-admin" },
    });

    await createGroupTagHandler(req, asRes(mockRes), mockNext);

    expect(mockTagCreate).toHaveBeenCalledWith({
      data: { groupId: "group-1", label: "Retard" },
    });
  });
});

describe("PATCH /:groupId/tags/:tagId", () => {
  let mockRes: ReturnType<typeof makeRes>;
  let mockNext: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRes = makeRes();
    mockNext = vi.fn();
  });

  it("updates a tag as admin", async () => {
    mockMemberFindUnique.mockResolvedValue(adminMembership as never);
    mockTagFindFirst.mockResolvedValue({
      id: "tag-1",
      groupId: "group-1",
    } as never);
    const updated = { id: "tag-1", label: "En retard" };
    mockTagUpdate.mockResolvedValue(updated as never);

    const req = makeReq({
      params: { groupId: "group-1", tagId: "tag-1" },
      body: { label: "En retard" },
      user: { userId: "user-admin" },
    });

    await updateGroupTagHandler(req, asRes(mockRes), mockNext);

    expect(mockRes.json).toHaveBeenCalledWith({ tag: updated });
  });

  it("returns 404 if tag does not exist", async () => {
    mockMemberFindUnique.mockResolvedValue(adminMembership as never);
    mockTagFindFirst.mockResolvedValue(null as never);

    const req = makeReq({
      params: { groupId: "group-1", tagId: "tag-nonexistent" },
      body: { label: "New" },
      user: { userId: "user-admin" },
    });

    await updateGroupTagHandler(req, asRes(mockRes), mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404 }),
    );
  });

  it("returns 403 for non-admin", async () => {
    mockMemberFindUnique.mockResolvedValue(memberMembership as never);

    const req = makeReq({
      params: { groupId: "group-1", tagId: "tag-1" },
      body: { label: "New" },
      user: { userId: "user-member" },
    });

    await updateGroupTagHandler(req, asRes(mockRes), mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403 }),
    );
  });

  it("returns 409 for duplicate label on update", async () => {
    mockMemberFindUnique.mockResolvedValue(adminMembership as never);
    mockTagFindFirst.mockResolvedValue({ id: "tag-1" } as never);
    mockTagUpdate.mockRejectedValue({ code: "P2002" } as never);

    const req = makeReq({
      params: { groupId: "group-1", tagId: "tag-1" },
      body: { label: "Existing" },
      user: { userId: "user-admin" },
    });

    await updateGroupTagHandler(req, asRes(mockRes), mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 409 }),
    );
  });
});

describe("DELETE /:groupId/tags/:tagId", () => {
  let mockRes: ReturnType<typeof makeRes>;
  let mockNext: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRes = makeRes();
    mockNext = vi.fn();
  });

  it("deletes a tag as admin", async () => {
    mockMemberFindUnique.mockResolvedValue(adminMembership as never);
    mockTagFindFirst.mockResolvedValue({ id: "tag-1" } as never);
    mockTagDelete.mockResolvedValue({} as never);

    const req = makeReq({
      params: { groupId: "group-1", tagId: "tag-1" },
      user: { userId: "user-admin" },
    });

    await deleteGroupTagHandler(req, asRes(mockRes), mockNext);

    expect(mockRes.json).toHaveBeenCalledWith({ message: "Tag supprimé" });
    expect(mockTagDelete).toHaveBeenCalledWith({ where: { id: "tag-1" } });
  });

  it("returns 404 if tag does not exist", async () => {
    mockMemberFindUnique.mockResolvedValue(adminMembership as never);
    mockTagFindFirst.mockResolvedValue(null as never);

    const req = makeReq({
      params: { groupId: "group-1", tagId: "tag-nonexistent" },
      user: { userId: "user-admin" },
    });

    await deleteGroupTagHandler(req, asRes(mockRes), mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404 }),
    );
  });

  it("returns 403 for non-admin", async () => {
    mockMemberFindUnique.mockResolvedValue(memberMembership as never);

    const req = makeReq({
      params: { groupId: "group-1", tagId: "tag-1" },
      user: { userId: "user-member" },
    });

    await deleteGroupTagHandler(req, asRes(mockRes), mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403 }),
    );
  });
});
