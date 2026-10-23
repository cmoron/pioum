import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GroupSettingsModal } from "./GroupSettingsModal";
import * as apiModule from "../lib/api";

vi.mock("../lib/api", () => ({
  api: {
    getAvatars: vi.fn(),
    getGroupTags: vi.fn(),
  },
}));

const group = {
  id: "g-1",
  name: "Les Musclés",
  avatarId: null,
} as unknown as apiModule.Group;

describe("GroupSettingsModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiModule.api.getAvatars).mockResolvedValue({ avatars: [] });
    vi.mocked(apiModule.api.getGroupTags).mockResolvedValue({ tags: [] });
  });

  it("stays open and shows the error when saving fails", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("Nom déjà pris"));
    const onClose = vi.fn();
    render(
      <GroupSettingsModal
        group={group}
        onSave={onSave}
        onDelete={vi.fn()}
        onClose={onClose}
      />,
    );

    const input = screen.getByLabelText("Nom du groupe");
    await userEvent.clear(input);
    await userEvent.type(input, "Autre nom");
    await userEvent.click(screen.getByText("Sauvegarder"));

    expect(await screen.findByText("Nom déjà pris")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
