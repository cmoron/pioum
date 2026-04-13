import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TagEditor } from "./TagEditor";
import * as apiModule from "../lib/api";

vi.mock("../lib/api", () => ({
  api: {
    getGroupTags: vi.fn(),
  },
}));

const mockGroupTags = [
  { id: "gt-1", groupId: "g-1", label: "Musique", createdAt: "" },
  { id: "gt-2", groupId: "g-1", label: "Silence", createdAt: "" },
];

describe("TagEditor", () => {
  const onAdd = vi.fn();
  const onRemove = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiModule.api.getGroupTags).mockResolvedValue({
      tags: mockGroupTags,
    });
    onAdd.mockResolvedValue(undefined);
    onRemove.mockResolvedValue(undefined);
  });

  it("renders existing tags with remove buttons", () => {
    const tags = [{ id: "pt-1", passengerId: "p-1", freeText: "Mon tag" }];
    render(
      <TagEditor tags={tags} groupId="g-1" onAdd={onAdd} onRemove={onRemove} />,
    );
    expect(screen.getByText("Mon tag")).toBeInTheDocument();
    expect(screen.getByTitle("Supprimer le tag")).toBeInTheDocument();
  });

  it("shows add button when under max tags", () => {
    render(
      <TagEditor tags={[]} groupId="g-1" onAdd={onAdd} onRemove={onRemove} />,
    );
    expect(screen.getByTitle("Ajouter un tag")).toBeInTheDocument();
  });

  it("hides add button when at max tags (3)", () => {
    const tags = [
      { id: "pt-1", passengerId: "p-1", freeText: "Tag 1" },
      { id: "pt-2", passengerId: "p-1", freeText: "Tag 2" },
      { id: "pt-3", passengerId: "p-1", freeText: "Tag 3" },
    ];
    render(
      <TagEditor tags={tags} groupId="g-1" onAdd={onAdd} onRemove={onRemove} />,
    );
    expect(screen.queryByTitle("Ajouter un tag")).not.toBeInTheDocument();
  });

  it("opens popover and loads group tags on click", async () => {
    render(
      <TagEditor tags={[]} groupId="g-1" onAdd={onAdd} onRemove={onRemove} />,
    );

    await userEvent.click(screen.getByTitle("Ajouter un tag"));

    await waitFor(() => {
      expect(apiModule.api.getGroupTags).toHaveBeenCalledWith("g-1");
    });
    expect(screen.getByText("Musique")).toBeInTheDocument();
    expect(screen.getByText("Silence")).toBeInTheDocument();
  });

  it("filters out already-used group tags", async () => {
    const tags = [
      {
        id: "pt-1",
        passengerId: "p-1",
        groupTagId: "gt-1",
        groupTag: mockGroupTags[0],
      },
    ];
    render(
      <TagEditor tags={tags} groupId="g-1" onAdd={onAdd} onRemove={onRemove} />,
    );

    await userEvent.click(screen.getByTitle("Ajouter un tag"));

    await waitFor(() => {
      expect(screen.getByText("Silence")).toBeInTheDocument();
    });
    // Musique should not be shown as a selectable option (already used)
    const musicButtons = screen.getAllByText("Musique");
    // One is the existing tag badge, none should be a selectable button
    expect(musicButtons).toHaveLength(1);
  });

  it("calls onAdd with groupTagId when a predefined tag is selected", async () => {
    render(
      <TagEditor tags={[]} groupId="g-1" onAdd={onAdd} onRemove={onRemove} />,
    );

    await userEvent.click(screen.getByTitle("Ajouter un tag"));

    await waitFor(() => {
      expect(screen.getByText("Musique")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText("Musique"));
    expect(onAdd).toHaveBeenCalledWith({ groupTagId: "gt-1" });
  });

  it("calls onAdd with freeText when free text is submitted", async () => {
    render(
      <TagEditor tags={[]} groupId="g-1" onAdd={onAdd} onRemove={onRemove} />,
    );

    await userEvent.click(screen.getByTitle("Ajouter un tag"));

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("Ex: musique, détour..."),
      ).toBeInTheDocument();
    });

    await userEvent.type(
      screen.getByPlaceholderText("Ex: musique, détour..."),
      "Détour gare",
    );
    await userEvent.click(screen.getByText("OK"));
    expect(onAdd).toHaveBeenCalledWith({ freeText: "Détour gare" });
  });

  it("calls onRemove when a tag remove button is clicked", async () => {
    const tags = [{ id: "pt-1", passengerId: "p-1", freeText: "Mon tag" }];
    render(
      <TagEditor tags={tags} groupId="g-1" onAdd={onAdd} onRemove={onRemove} />,
    );

    await userEvent.click(screen.getByTitle("Supprimer le tag"));
    expect(onRemove).toHaveBeenCalledWith("pt-1");
  });
});
