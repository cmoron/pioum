import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TagBadge } from "./TagBadge";

describe("TagBadge", () => {
  it("renders group tag label", () => {
    const tag = {
      id: "pt-1",
      passengerId: "p-1",
      groupTagId: "gt-1",
      groupTag: { id: "gt-1", groupId: "g-1", label: "Musique", createdAt: "" },
    };
    render(<TagBadge tag={tag} />);
    expect(screen.getByText("Musique")).toBeInTheDocument();
  });

  it("renders free text tag", () => {
    const tag = {
      id: "pt-2",
      passengerId: "p-1",
      freeText: "Détour gare",
    };
    render(<TagBadge tag={tag} />);
    expect(screen.getByText("Détour gare")).toBeInTheDocument();
  });

  it("shows remove button when onRemove is provided", () => {
    const tag = { id: "pt-1", passengerId: "p-1", freeText: "Test" };
    render(<TagBadge tag={tag} onRemove={() => {}} />);
    expect(screen.getByTitle("Supprimer le tag")).toBeInTheDocument();
  });

  it("does not show remove button when onRemove is not provided", () => {
    const tag = { id: "pt-1", passengerId: "p-1", freeText: "Test" };
    render(<TagBadge tag={tag} />);
    expect(screen.queryByTitle("Supprimer le tag")).not.toBeInTheDocument();
  });

  it("calls onRemove when remove button is clicked", () => {
    const onRemove = vi.fn();
    const tag = { id: "pt-1", passengerId: "p-1", freeText: "Test" };
    render(<TagBadge tag={tag} onRemove={onRemove} />);

    fireEvent.click(screen.getByTitle("Supprimer le tag"));
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it("displays aggregated reaction chips", () => {
    const tag = {
      id: "pt-1",
      passengerId: "p-1",
      freeText: "Test",
      reactions: [
        { id: "r-1", userId: "user-1", emoji: "👍" },
        { id: "r-2", userId: "user-2", emoji: "👍" },
        { id: "r-3", userId: "user-3", emoji: "❤️" },
      ],
    };
    render(<TagBadge tag={tag} currentUserId="user-1" />);
    // Should show both emojis
    expect(screen.getByText("👍")).toBeInTheDocument();
    expect(screen.getByText("❤️")).toBeInTheDocument();
    // 👍 has count 2
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("highlights the current user's reaction", () => {
    const tag = {
      id: "pt-1",
      passengerId: "p-1",
      freeText: "Test",
      reactions: [{ id: "r-1", userId: "user-1", emoji: "👍" }],
    };
    const { container } = render(<TagBadge tag={tag} currentUserId="user-1" />);
    const reactionBtn = container.querySelector("button.bg-primary-200");
    expect(reactionBtn).toBeInTheDocument();
  });

  it("opens emoji picker on click when onReact is provided", () => {
    const tag = { id: "pt-1", passengerId: "p-1", freeText: "Test" };
    render(<TagBadge tag={tag} onReact={async () => {}} />);

    // Click the tag label area to open picker
    fireEvent.click(screen.getByText("Test"));
    expect(screen.getByTestId("emoji-picker")).toBeInTheDocument();
  });

  it("does not open emoji picker when onReact is not provided", () => {
    const tag = { id: "pt-1", passengerId: "p-1", freeText: "Test" };
    render(<TagBadge tag={tag} />);

    fireEvent.click(screen.getByText("Test"));
    expect(screen.queryByTestId("emoji-picker")).not.toBeInTheDocument();
  });

  it("calls onReact when an emoji is picked", async () => {
    const onReact = vi.fn().mockResolvedValue(undefined);
    const tag = { id: "pt-1", passengerId: "p-1", freeText: "Test" };
    render(<TagBadge tag={tag} onReact={onReact} />);

    // Open picker
    fireEvent.click(screen.getByText("Test"));
    // Pick an emoji
    fireEvent.click(screen.getByText("👍"));

    await waitFor(() => {
      expect(onReact).toHaveBeenCalledWith("👍");
    });
  });

  it("opens the reactors popover when clicking an existing reaction chip", () => {
    const tag = {
      id: "pt-1",
      passengerId: "p-1",
      freeText: "Test",
      reactions: [
        {
          id: "r-1",
          userId: "user-1",
          emoji: "👍",
          user: { id: "user-1", name: "Alice" },
        },
      ],
    };
    render(<TagBadge tag={tag} currentUserId="user-1" onReact={async () => {}} />);

    fireEvent.click(screen.getByText("👍"));

    expect(screen.getByTestId("reactors-popover")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("calls onReact when clicking your own name in the reactors popover", async () => {
    const onReact = vi.fn().mockResolvedValue(undefined);
    const tag = {
      id: "pt-1",
      passengerId: "p-1",
      freeText: "Test",
      reactions: [
        {
          id: "r-1",
          userId: "user-1",
          emoji: "👍",
          user: { id: "user-1", name: "Alice" },
        },
        {
          id: "r-2",
          userId: "user-2",
          emoji: "👍",
          user: { id: "user-2", name: "Bob" },
        },
      ],
    };
    render(<TagBadge tag={tag} currentUserId="user-1" onReact={onReact} />);

    fireEvent.click(screen.getByText("👍"));
    // Alice is current user → clicking her row removes her reaction
    fireEvent.click(screen.getByText("Alice"));

    await waitFor(() => {
      expect(onReact).toHaveBeenCalledWith("👍");
    });
  });

  it("does not call onReact when clicking another user's name in the reactors popover", () => {
    const onReact = vi.fn().mockResolvedValue(undefined);
    const tag = {
      id: "pt-1",
      passengerId: "p-1",
      freeText: "Test",
      reactions: [
        {
          id: "r-1",
          userId: "user-2",
          emoji: "👍",
          user: { id: "user-2", name: "Bob" },
        },
      ],
    };
    render(<TagBadge tag={tag} currentUserId="user-1" onReact={onReact} />);

    fireEvent.click(screen.getByText("👍"));
    fireEvent.click(screen.getByText("Bob"));

    expect(onReact).not.toHaveBeenCalled();
  });
});
